import type { County, Parcel } from "@/lib/types";

export type DevelopmentObjective =
  | "subdivision"
  | "single_family"
  | "townhome"
  | "commercial"
  | "lot_split";

export interface FeasibilityPillarScore {
  name: string;
  score: number; // 0 to 100
  status: "pass" | "warning" | "fail";
  summary: string;
  details: string[];
}

export interface DiligenceTask {
  id: string;
  category: "Zoning & SALDO" | "Environmental" | "Civil & Soils" | "Utilities" | "Legal & Title";
  task: string;
  priority: "high" | "medium" | "standard";
  reason: string;
}

export interface ParcelFeasibilityAssessment {
  parcel: Parcel;
  objective: DevelopmentObjective;
  compositeScore: number; // 0 to 100
  verdict: "Proceed" | "Proceed with Conditions" | "Hold / High Risk";
  verdictVariant: "success" | "warning" | "destructive";
  verdictBadge: string;
  verdictExplanation: string;
  
  // Land Yield & Physical Geometry
  grossAcres: number;
  netDevelopableAcres: number;
  deductionPct: number;
  estimatedLots: number;
  grossDensityUa: number;
  netDensityUa: number;

  // 4 Pillars of Feasibility
  pillars: {
    zoning: FeasibilityPillarScore;
    civil: FeasibilityPillarScore;
    utilities: FeasibilityPillarScore;
    financial: FeasibilityPillarScore;
  };

  // Residual Land Valuation & Financial Pro Forma
  financials: {
    finishedHomeAsp: number;
    lotToBaseRatioPct: number;
    finishedLotValue: number;
    horizontalCostPerLot: number;
    softCostPerLot: number;
    carryCostPerLot: number;
    targetMarginPct: number;
    maxAllowableOfferPerLot: number;
    maxAllowableOfferTotal: number;
    currentAssessedOrAsking: number;
    spreadAmount: number; // MAO - Asking (positive = underpriced, negative = overpriced)
    spreadPct: number;
    verdict: "Favorable" | "Equitable" | "Overpriced";
  };

  fatalFlaws: string[];
  diligenceChecklist: DiligenceTask[];
  approvalTimeline: {
    minorMonths: string;
    majorMonths: string;
    governingBody: string;
    countyPlanningCommission: string;
  };
}

export const OBJECTIVE_LABELS: Record<DevelopmentObjective, { title: string; desc: string }> = {
  subdivision: {
    title: "Residential Subdivision",
    desc: "Multi-lot single-family detached community with new streets and infrastructure.",
  },
  townhome: {
    title: "Townhome / Medium Density",
    desc: "Attached residential townhomes or multi-family clusters.",
  },
  single_family: {
    title: "Single-Family Infill",
    desc: "By-right 1–2 residential homes on existing road frontage.",
  },
  lot_split: {
    title: "Minor Lot Split",
    desc: "Subdivision of 1 into 2–3 parcels with minimal public improvements.",
  },
  commercial: {
    title: "Commercial / Mixed-Use",
    desc: "Retail, office, or upper-floor residential mixed-use project.",
  },
};

// Regional cost benchmarks for South Central PA (York, Cumberland, Dauphin, Lancaster)
export const COUNTY_BENCHMARKS: Record<
  County,
  {
    avgAsp: number;
    baseSiteworkPerLot: number;
    softCostPercent: number;
    countyPlanning: string;
    karstRiskHigh: boolean;
  }
> = {
  Cumberland: {
    avgAsp: 425_000,
    baseSiteworkPerLot: 55_000,
    softCostPercent: 12,
    countyPlanning: "Cumberland County Planning Commission (CCPC)",
    karstRiskHigh: true, // Great Valley carbonate formation
  },
  Dauphin: {
    avgAsp: 395_000,
    baseSiteworkPerLot: 52_000,
    softCostPercent: 12,
    countyPlanning: "Dauphin County Planning Commission (DCPC)",
    karstRiskHigh: false,
  },
  Lancaster: {
    avgAsp: 440_000,
    baseSiteworkPerLot: 58_000,
    softCostPercent: 14,
    countyPlanning: "Lancaster County Planning Commission (Places2040)",
    karstRiskHigh: true, // Conestoga limestone plain
  },
  York: {
    avgAsp: 375_000,
    baseSiteworkPerLot: 50_000,
    softCostPercent: 11,
    countyPlanning: "York County Planning Commission (YCPC)",
    karstRiskHigh: true, // Springettsbury/Spring Garden valley
  },
};

export function assessParcelFeasibility(
  parcel: Parcel,
  objective: DevelopmentObjective = "subdivision",
  customOverrides?: {
    customAsp?: number;
    customSiteworkPerLot?: number;
    customTargetLots?: number;
    customAskingPrice?: number;
  },
): ParcelFeasibilityAssessment {
  const benchmark = COUNTY_BENCHMARKS[parcel.county] ?? COUNTY_BENCHMARKS.Cumberland;
  const fatalFlaws: string[] = [];

  // --- 1. PHYSICAL DEDUCTIONS & LOT YIELD ---
  let rowPct = 0.12; // 12% standard roads/ROW
  let stormPct = 0.08; // 8% stormwater BMP basins (PA DEP Chapter 102)
  let openPct = 0.10; // 10% municipal open space dedication
  let undevPct = 0.05; // slope & environmental buffers

  if (parcel.slopePct > 15) {
    undevPct += 0.20;
  } else if (parcel.slopePct > 8) {
    undevPct += 0.08;
  }

  const floodAE = parcel.flood["5"] === "AE" || parcel.flood["3"] === "AE" || parcel.flood["1"] === "AE";
  if (floodAE) {
    undevPct += 0.15;
    fatalFlaws.push("Portion of tract is mapped in FEMA 100-Year Flood Hazard (Zone AE).");
  }

  if (objective === "single_family" || objective === "lot_split") {
    rowPct = 0.02;
    stormPct = 0.03;
    openPct = 0.0;
  }

  const totalDeductionPct = Math.min(0.65, rowPct + stormPct + openPct + undevPct);
  const netDevelopableAcres = Math.max(0.1, parcel.acres * (1 - totalDeductionPct));

  // Determine estimated lots based on zoning and objective
  let baseDensity = parcel.densityUa || 2.5;
  if (objective === "townhome") baseDensity = Math.max(8, baseDensity * 2.5);
  if (objective === "commercial") baseDensity = Math.max(12, baseDensity * 3);
  if (objective === "lot_split") baseDensity = Math.min(2, Math.floor(parcel.acres));
  if (objective === "single_family") baseDensity = 1;

  let estimatedLots = customOverrides?.customTargetLots ?? Math.max(1, Math.floor(netDevelopableAcres * baseDensity));
  if (objective === "lot_split") {
    estimatedLots = Math.min(3, Math.max(2, Math.floor(parcel.acres)));
  }

  const grossDensityUa = estimatedLots / Math.max(parcel.acres, 0.1);
  const netDensityUa = estimatedLots / Math.max(netDevelopableAcres, 0.1);

  // --- 2. PILLAR 1: ZONING & SALDO VIABILITY ---
  const zoningDetails: string[] = [];
  let zoningScore = 85;

  const isPermitted = parcel.permittedUses.some((u) => {
    const l = u.toLowerCase();
    if (objective === "commercial") return l.includes("retail") || l.includes("office") || l.includes("commercial");
    if (objective === "townhome") return l.includes("multi") || l.includes("town") || l.includes("attached");
    return l.includes("single") || l.includes("dwelling") || l.includes("residential");
  });

  if (isPermitted) {
    zoningDetails.push(`Target use is permitted by-right under ${parcel.zoning} (${parcel.zoningName}).`);
  } else {
    zoningScore -= 30;
    zoningDetails.push(`Requires Conditional Use or Special Exception from Zoning Hearing Board.`);
  }

  zoningDetails.push(`Max allowable lot coverage: ${parcel.maxCoverage}%. Maximum building height: ${parcel.maxHeight} ft.`);
  zoningDetails.push(`Minimum setbacks: Front ${parcel.setbacks.front}ft, Side ${parcel.setbacks.side}ft, Rear ${parcel.setbacks.rear}ft.`);
  
  if (parcel.historic) {
    zoningScore -= 15;
    zoningDetails.push(`Historic district designation: Demolition or exterior alterations require HARB review.`);
  }

  const zoningPillar: FeasibilityPillarScore = {
    name: "Zoning & Entitlement",
    score: Math.max(0, Math.min(100, zoningScore)),
    status: zoningScore >= 75 ? "pass" : zoningScore >= 55 ? "warning" : "fail",
    summary: isPermitted ? "By-Right Permitted Use" : "Special Exception / Board Relief Required",
    details: zoningDetails,
  };

  // --- 3. PILLAR 2: SITE CIVIL & ENVIRONMENTAL ---
  const civilDetails: string[] = [];
  let civilScore = 90;

  if (parcel.slopePct > 15) {
    civilScore -= 35;
    civilDetails.push(`Severe steep slopes (${parcel.slopePct}%). Requires mass grading, retaining structures, and steep-slope municipal waiver.`);
    fatalFlaws.push(`Slope exceeds 15% (${parcel.slopePct}% grade), triggering municipal steep slope conservation restrictions.`);
  } else if (parcel.slopePct > 8) {
    civilScore -= 15;
    civilDetails.push(`Moderate slopes (${parcel.slopePct}%). Standard benching and erosion control required.`);
  } else {
    civilDetails.push(`Gentle terrain (${parcel.slopePct}% slope). Highly favorable for standard grading and shallow foundations.`);
  }

  if (floodAE) {
    civilScore -= 30;
    civilDetails.push("FEMA Zone AE 100-year floodplain mapped on tract. Building pad elevation certificates and floodway buffers mandatory.");
  } else {
    civilDetails.push("FEMA Zone X (minimal flood hazard). No mandatory flood insurance or elevation certificate hurdles.");
  }

  if (benchmark.karstRiskHigh) {
    civilScore -= 10;
    civilDetails.push(`High karst limestone formation prevalent in ${parcel.county} County. Infiltration basins require geotechnical test pits and sinkhole remediation escrow.`);
  }

  if (parcel.acres >= 1.0) {
    civilDetails.push("Tract disturbance exceeds 1.0 acre: PA DEP Chapter 102 NPDES Phase II General Permit required.");
  }

  const civilPillar: FeasibilityPillarScore = {
    name: "Civil & Environmental",
    score: Math.max(0, Math.min(100, civilScore)),
    status: civilScore >= 75 ? "pass" : civilScore >= 55 ? "warning" : "fail",
    summary: civilScore >= 75 ? "Standard Earthwork" : "Complex Grading / Flood Constraints",
    details: civilDetails,
  };

  // --- 4. PILLAR 3: UTILITIES & INFRASTRUCTURE ---
  const utilDetails: string[] = [];
  let utilScore = 85;

  const waterAvail = parcel.utilities.water.toLowerCase().includes("available");
  const sewerReview = parcel.utilities.sewer.toLowerCase().includes("review") || parcel.utilities.sewer.toLowerCase().includes("req");

  utilDetails.push(`Water Service: ${parcel.utilities.water}`);
  utilDetails.push(`Sanitary Sewer: ${parcel.utilities.sewer}`);
  utilDetails.push(`Electric & Gas: ${parcel.utilities.electric}; ${parcel.utilities.gas}`);

  if (!waterAvail) {
    utilScore -= 15;
    utilDetails.push("Public water not verified at frontage. Off-site main extension or on-lot well yield testing required.");
  }

  if (sewerReview) {
    utilScore -= 20;
    utilDetails.push("Sanitary sewer connection subject to municipal authority Act 537 capacity reservation review and EDUs allocation.");
  }

  if (parcel.aadt > 12000) {
    utilDetails.push(`Frontage on high-traffic corridor (${parcel.aadt.toLocaleString()} AADT). PennDOT Highway Occupancy Permit (HOP) and sight distance survey required.`);
  }

  const utilPillar: FeasibilityPillarScore = {
    name: "Utilities & Infrastructure",
    score: Math.max(0, Math.min(100, utilScore)),
    status: utilScore >= 75 ? "pass" : utilScore >= 55 ? "warning" : "fail",
    summary: !sewerReview && waterAvail ? "Public Water & Sewer Available" : "Act 537 / Utility Review Required",
    details: utilDetails,
  };

  // --- 5. PILLAR 4: FINANCIAL PRO FORMA & RESIDUAL LAND VALUE (MAO) ---
  const asp = customOverrides?.customAsp ?? benchmark.avgAsp;
  const lotToBaseRatio = 0.22; // 22% finished lot value ratio
  const finishedLotValue = Math.round(asp * lotToBaseRatio);

  let siteworkCostPerLot = customOverrides?.customSiteworkPerLot ?? benchmark.baseSiteworkPerLot;
  if (parcel.slopePct > 15) siteworkCostPerLot += 18_000;
  else if (parcel.slopePct > 8) siteworkCostPerLot += 8_000;
  if (floodAE) siteworkCostPerLot += 6_000;

  const softCostPerLot = Math.round(finishedLotValue * (benchmark.softCostPercent / 100));
  const carryCostPerLot = Math.round(finishedLotValue * 0.05); // 5% carry & financing
  const targetMarginPct = 0.20; // 20% builder/developer margin
  const marginPerLot = Math.round(finishedLotValue * targetMarginPct);

  // Maximum Allowable Offer per lot = FLV - Sitework - Soft - Carry - Margin
  const rawMaoPerLot = finishedLotValue - siteworkCostPerLot - softCostPerLot - carryCostPerLot - marginPerLot;
  const maxAllowableOfferPerLot = Math.max(5_000, rawMaoPerLot);
  const maxAllowableOfferTotal = maxAllowableOfferPerLot * estimatedLots;

  const currentAssessedOrAsking = customOverrides?.customAskingPrice ?? Math.max(parcel.assessed, 120_000);
  const spreadAmount = maxAllowableOfferTotal - currentAssessedOrAsking;
  const spreadPct = Math.round((spreadAmount / Math.max(currentAssessedOrAsking, 1)) * 100);

  let financialScore = 80;
  if (spreadPct > 10) financialScore = 95;
  else if (spreadPct >= -15) financialScore = 78;
  else if (spreadPct >= -35) financialScore = 60;
  else financialScore = 40;

  const financialDetails: string[] = [
    `Projected Finished Home ASP: $${asp.toLocaleString()} (Finished Lot Value: $${finishedLotValue.toLocaleString()} @ 22%).`,
    `Site civil & horizontal development: $${siteworkCostPerLot.toLocaleString()} / lot ($${(siteworkCostPerLot * estimatedLots).toLocaleString()} total).`,
    `Soft costs, engineering & permitting: $${softCostPerLot.toLocaleString()} / lot (${benchmark.softCostPercent}%).`,
    `Maximum Allowable Offer (MAO): $${maxAllowableOfferTotal.toLocaleString()} ($${maxAllowableOfferPerLot.toLocaleString()}/lot) based on 20% target margin.`,
    `Current Assessed/Asking: $${currentAssessedOrAsking.toLocaleString()} (${spreadAmount >= 0 ? `Underpriced by $${spreadAmount.toLocaleString()} (+${spreadPct}%)` : `Overpriced by $${Math.abs(spreadAmount).toLocaleString()} (${spreadPct}%)`}).`,
  ];

  const financialPillar: FeasibilityPillarScore = {
    name: "Residual Financials",
    score: Math.max(0, Math.min(100, financialScore)),
    status: financialScore >= 75 ? "pass" : financialScore >= 55 ? "warning" : "fail",
    summary: spreadPct >= -15 ? "Profitable Land Budget" : "Requires Land Price Negotiation",
    details: financialDetails,
  };

  // --- COMPOSITE SCORING & VERDICT ---
  const compositeScore = Math.round(
    zoningPillar.score * 0.30 +
    civilPillar.score * 0.25 +
    utilPillar.score * 0.20 +
    financialPillar.score * 0.25
  );

  let verdict: "Proceed" | "Proceed with Conditions" | "Hold / High Risk";
  let verdictVariant: "success" | "warning" | "destructive";
  let verdictBadge: string;
  let verdictExplanation: string;

  if (compositeScore >= 80 && fatalFlaws.length === 0) {
    verdict = "Proceed";
    verdictVariant = "success";
    verdictBadge = "GREEN LIGHT · FAVORABLE FEASIBILITY";
    verdictExplanation = "Site presents straightforward entitlement path, low civil complexity, and strong residual margin.";
  } else if (compositeScore >= 60 && fatalFlaws.length <= 1) {
    verdict = "Proceed with Conditions";
    verdictVariant = "warning";
    verdictBadge = "YELLOW LIGHT · CONDITIONAL VIABILITY";
    verdictExplanation = "Viable acquisition contingent upon utility Act 537 confirmation, stormwater design, and price alignment.";
  } else {
    verdict = "Hold / High Risk";
    verdictVariant = "destructive";
    verdictBadge = "RED LIGHT · SIGNIFICANT RISK";
    verdictExplanation = "Severe constraints detected (steep slopes, flood hazard, sewer limitation, or adverse residual land value).";
  }

  // --- DUE DILIGENCE CHECKLIST GENERATION ---
  const diligenceChecklist: DiligenceTask[] = [
    {
      id: "dd-zoning-verify",
      category: "Zoning & SALDO",
      task: `Verify ${parcel.zoning} zoning classification & SALDO submittal deadline with ${parcel.municipality} zoning officer.`,
      priority: "high",
      reason: "Confirm whether by-right sketch plan or conditional use hearing is required before incurring engineering costs.",
    },
    {
      id: "dd-act537",
      category: "Utilities",
      task: "Submit sewer capacity inquiry / Act 537 Planning Module reservation to municipal authority.",
      priority: sewerReview ? "high" : "medium",
      reason: "Ensure wastewater treatment plant has unallocated EDUs available for connection.",
    },
    {
      id: "dd-soils-karst",
      category: "Civil & Soils",
      task: benchmark.karstRiskHigh
        ? "Perform subsurface geotechnical borings & geophysical survey for carbonate sinkhole voids."
        : "Conduct preliminary test pits and infiltration testing for stormwater management basins.",
      priority: benchmark.karstRiskHigh ? "high" : "medium",
      reason: "PA DEP Chapter 102 post-construction stormwater regulations require verified soil infiltration rates.",
    },
    {
      id: "dd-env-phase1",
      category: "Environmental",
      task: "Order Phase I Environmental Site Assessment (ESA) and wetland field reconnaissance.",
      priority: floodAE ? "high" : "standard",
      reason: "Identify historical contamination, buried agricultural chemicals, or unmapped hydric soils.",
    },
    {
      id: "dd-survey-alta",
      category: "Legal & Title",
      task: "Commission boundary, topographic, and ALTA/NSPS land title survey.",
      priority: "standard",
      reason: "Locate unrecorded utility easements, boundary encroachments, and exact right-of-way line.",
    },
  ];

  if (parcel.aadt > 12000) {
    diligenceChecklist.push({
      id: "dd-penndot-hop",
      category: "Utilities",
      task: "Prepare PennDOT Highway Occupancy Permit (HOP) application & sight distance analysis.",
      priority: "high",
      reason: "Tract abuts state arterial corridor; driveway connection approval is mandatory.",
    });
  }

  // --- APPROVAL TIMELINES ---
  const approvalTimeline = {
    minorMonths: "2 to 3 months (Minor subdivision / 1–3 lots)",
    majorMonths: "6 to 14 months (Preliminary & Final Major SALDO approval)",
    governingBody: `${parcel.municipality} Board of Supervisors / Borough Council`,
    countyPlanningCommission: benchmark.countyPlanning,
  };

  return {
    parcel,
    objective,
    compositeScore,
    verdict,
    verdictVariant,
    verdictBadge,
    verdictExplanation,
    grossAcres: parcel.acres,
    netDevelopableAcres: Number(netDevelopableAcres.toFixed(2)),
    deductionPct: Math.round(totalDeductionPct * 100),
    estimatedLots,
    grossDensityUa: Number(grossDensityUa.toFixed(2)),
    netDensityUa: Number(netDensityUa.toFixed(2)),
    pillars: {
      zoning: zoningPillar,
      civil: civilPillar,
      utilities: utilPillar,
      financial: financialPillar,
    },
    financials: {
      finishedHomeAsp: asp,
      lotToBaseRatioPct: Math.round(lotToBaseRatio * 100),
      finishedLotValue,
      horizontalCostPerLot: siteworkCostPerLot,
      softCostPerLot,
      carryCostPerLot,
      targetMarginPct: Math.round(targetMarginPct * 100),
      maxAllowableOfferPerLot,
      maxAllowableOfferTotal,
      currentAssessedOrAsking,
      spreadAmount,
      spreadPct,
      verdict: spreadPct > 10 ? "Favorable" : spreadPct >= -15 ? "Equitable" : "Overpriced",
    },
    fatalFlaws,
    diligenceChecklist,
    approvalTimeline,
  };
}
