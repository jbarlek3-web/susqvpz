import type { County, Parcel } from "@/lib/types";

export type DevelopmentObjective =
  | "subdivision"
  | "single_family"
  | "townhome"
  | "commercial"
  | "lot_split";

export type DevelopmentRole =
  | "lot_developer"       // Master Developer selling finished lots to builders via takedown agreements
  | "builder_developer"   // Integrated Homebuilder building homes vertically (dual margin)
  | "townhome_developer"  // Attached cluster / townhome development
  | "commercial_pad"      // Retail outparcels / pad-ready / ground lease
  | "industrial_logistics"; // Warehouse / flex / logistics pads

export type AssemblageMode =
  | "single_parcel"                 // Standalone parcel evaluation
  | "contiguous_assemblage"         // Adjacent parcels merged via PA MPC Act 247 reverse subdivision
  | "split_street_assemblage"       // Contiguous parcels on one side + large subdivisible parcel across the street
  | "cross_street_dual_assemblage"; // Contiguous parcels on both sides of the corridor

export interface FeasibilityPillarScore {
  name: string;
  score: number; // 0 to 100
  status: "pass" | "warning" | "fail";
  summary: string;
  details: string[];
}

export interface DiligenceTask {
  id: string;
  category: "Zoning & SALDO" | "Environmental" | "Civil & Soils" | "Utilities" | "Legal & Title" | "Assemblage & Access";
  task: string;
  priority: "high" | "medium" | "standard";
  reason: string;
}

export interface AssemblageSlot {
  parcel: Parcel;
  role: "primary" | "contiguous_adjacent" | "cross_street_subdivisible";
  elevationTrend?: "high" | "neutral" | "low";
  isCustom?: boolean;
  customOverrides?: {
    acres?: number;
    askingPrice?: number;
    slopePct?: number;
    waterAvailable?: boolean;
    sewerAvailable?: boolean;
    zoning?: string;
  };
}

export interface AssemblageAnalysis {
  mode: AssemblageMode;
  slots: AssemblageSlot[];
  totalGrossAcres: number;
  totalNetDevelopableAcres: number;
  totalAssessedValue: number;
  contiguousBoundaryCount: number;
  setbackAreaRecoveredSqFt: number;
  setbackAreaRecoveredAcres: number;
  reverseSubdivisionRequired: boolean;
  reverseSubdivisionEstCost: number;
  crossStreetBoringRequired: boolean;
  crossStreetBoringEstCost: number;
  topographicGravityBalanceNote?: string;
  trafficAlignmentNote?: string;
}

// Role-Specific Financial Models
export interface LotDeveloperProForma {
  frontFootPrice: number;
  lotFrontageFt: number;
  finishedLotValue: number;
  grossLotRevenue: number;
  horizontalCostPerLot: number;
  totalHorizontalCost: number;
  softCostTotal: number;
  phase1Lots: number;
  quarterlyTakedownLots: number;
  takedownDurationQuarters: number;
  optionDepositAmount: number;
  quarterlyPriceEscalatorPct: number;
  performanceBondCarry: number;
  developerLeveredIrr: number;
  equityMultipleMoic: number;
  maxAllowableOfferPerLot: number;
  maxAllowableOfferTotal: number;
}

export interface BuilderDeveloperProForma {
  homeAsp: number;
  totalHomeRevenue: number;
  avgHomeSquareFootage: number;
  verticalDirectCostPerSqFt: number;
  verticalCostPerHome: number;
  totalVerticalCost: number;
  horizontalSiteworkPerLot: number;
  totalHorizontalSitework: number;
  salesCommissionAndClosingPct: number;
  monthlyAbsorptionRate: number;
  absorptionDurationMonths: number;
  horizontalMarginPct: number;
  verticalMarginPct: number;
  combinedGrossMarginPct: number;
  projectIrr: number;
  returnOnInventoryPct: number;
  maxAllowableOfferTotal: number;
}

export interface TownhomeProForma {
  unitAsp: number;
  totalRevenue: number;
  densityPerAcre: number;
  frontagePerUnit: number;
  streetTypology: "Private HOA Cartway" | "Dedicated Public Street";
  garageTypology: "Rear-Alley Loaded" | "Front-Driveway Loaded";
  horizontalCostPerUnit: number;
  totalHorizontalCost: number;
  hoaReserveEscrowPerUnit: number;
  combinedMarginPct: number;
  maxAllowableOfferTotal: number;
}

export interface CommercialPadProForma {
  outparcelsCount: number;
  avgPadPrice: number;
  totalPadRevenue: number;
  groundLeaseCapRate: number;
  annualGroundRentPerPad: number;
  farRatio: number;
  siteImperviousPct: number;
  penndotHopTurnLaneEscrow: number;
  padPreparationCostPerPad: number;
  maxAllowableOfferTotal: number;
}

export interface IndustrialLogisticsProForma {
  potentialBuildingSqFt: number;
  farRatio: number;
  truckCourtDepthFt: number;
  dockDoorsEstimated: number;
  fireFlowGpmRequired: number;
  powerCapacityKva: number;
  padReadyValuePerSqFt: number;
  totalGrossPadValue: number;
  heavyPavingAndCivilCost: number;
  maxAllowableOfferTotal: number;
}

export interface ParcelFeasibilityAssessment {
  parcel: Parcel;
  objective: DevelopmentObjective;
  role: DevelopmentRole;
  assemblage: AssemblageAnalysis;
  compositeScore: number; // 0 to 100
  verdict: "Proceed" | "Proceed with Conditions" | "Hold / High Risk";
  verdictVariant: "success" | "warning" | "destructive";
  verdictBadge: string;
  verdictExplanation: string;
  
  // Land Yield & Physical Geometry (Aggregated for Assemblage)
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

  // Residual Land Valuation & Financial Pro Forma (General)
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

  // Role-Specific Underwriting Data
  roleProForma: {
    lotDeveloper?: LotDeveloperProForma;
    builderDeveloper?: BuilderDeveloperProForma;
    townhome?: TownhomeProForma;
    commercialPad?: CommercialPadProForma;
    industrialLogistics?: IndustrialLogisticsProForma;
  };

  fatalFlaws: string[];
  diligenceChecklist: DiligenceTask[];
  approvalTimeline: {
    minorMonths: string;
    majorMonths: string;
    governingBody: string;
    countyPlanningCommission: string;
    reverseSubdivisionMonths?: string;
  };
}

export const ROLE_LABELS: Record<DevelopmentRole, { title: string; subtitle: string; desc: string }> = {
  lot_developer: {
    title: "Master Lot Developer",
    subtitle: "Selling Finished Lots to Production/Custom Builders",
    desc: "Entitle raw ground, engineer roads, utilities, and stormwater BMPs, and convey finished shovel-ready lots to builders via phased takedown agreements and rolling options.",
  },
  builder_developer: {
    title: "Integrated Builder-Developer",
    subtitle: "Self-Developing Horizontal & Constructing Vertical Homes",
    desc: "Capture dual margins (horizontal site development margin + vertical sticks-and-bricks margin) by developing infrastructure and delivering finished homes directly to retail buyers.",
  },
  townhome_developer: {
    title: "Townhome & Cluster Developer",
    subtitle: "High-Density Attached Residential Development",
    desc: "Design higher-density attached residential communities (6–12 DU/acre) with front-loaded or rear-alley garage typologies, private vs. public streets, and master HOA reserve structures.",
  },
  commercial_pad: {
    title: "Commercial & Retail Pad Developer",
    subtitle: "Outparcel Subdivisions, Ground Leases & Pad-Ready Sites",
    desc: "Subdivide highway/arterial frontage into pad-ready sites for QSRs, convenience stores, or medical clinics. Model NNN ground leases (6.0%–7.0% cap rates) and PennDOT HOP turning lanes.",
  },
  industrial_logistics: {
    title: "Industrial & Logistics Pad Developer",
    subtitle: "Warehouse, Flex, & Distribution Logistics Sites",
    desc: "Underwrite heavy industrial pads accommodating 100k–500k+ SF footprints, WB-50/WB-67 truck court depths, massive roof stormwater retention, 3-phase electric, and 2,000+ GPM fire flow.",
  },
};

export const ASSEMBLAGE_MODE_LABELS: Record<AssemblageMode, { title: string; subtitle: string; desc: string }> = {
  single_parcel: {
    title: "Single Standalone Parcel",
    subtitle: "Independent Site Evaluation",
    desc: "Evaluate a single discrete parcel with standard zoning setbacks and frontage.",
  },
  contiguous_assemblage: {
    title: "Contiguous Parcel Assemblage",
    subtitle: "PA MPC Act 247 Reverse Subdivision / Lot Line Consolidation",
    desc: "Assemble adjacent parcels on the same side of the street. Obliterates internal boundary setbacks to expand the buildable envelope and unifies stormwater infrastructure.",
  },
  split_street_assemblage: {
    title: "Split-Street Assemblage",
    subtitle: "Contiguous Lots + Large Parcel Across the Corridor",
    desc: "Contiguous parcels on one side of the street coupled with a large parcel across the road to be subdivided. Models cross-corridor utility balancing, road boring, and sight triangles.",
  },
  cross_street_dual_assemblage: {
    title: "Dual-Sided Cross-Street Assemblage",
    subtitle: "Master Planned Corridor Node",
    desc: "Assemble contiguous parcels on both sides of a through-corridor for a unified master planned development or mixed-use commercial/residential node.",
  },
};

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

export interface AssemblageConfig {
  mode: AssemblageMode;
  slots: AssemblageSlot[];
  customBoundaryDepthFt?: number;
  customInternalSetbackFt?: number;
}

export function assessParcelFeasibility(
  parcel: Parcel,
  objective: DevelopmentObjective = "subdivision",
  customOverrides?: {
    customAsp?: number;
    customSiteworkPerLot?: number;
    customTargetLots?: number;
    customAskingPrice?: number;
  },
  role: DevelopmentRole = "lot_developer",
  assemblageConfig?: AssemblageConfig,
): ParcelFeasibilityAssessment {
  const benchmark = COUNTY_BENCHMARKS[parcel.county] ?? COUNTY_BENCHMARKS.Cumberland;
  const fatalFlaws: string[] = [];

  // --- 0. ASSEMBLAGE GEOMETRY & AGGREGATION ---
  const mode: AssemblageMode = assemblageConfig?.mode ?? "single_parcel";
  const slots: AssemblageSlot[] = assemblageConfig?.slots && assemblageConfig.slots.length > 0
    ? assemblageConfig.slots
    : [{ parcel, role: "primary", elevationTrend: "neutral" }];

  const totalGrossAcres = Number(
    slots.reduce((sum, s) => sum + (s.customOverrides?.acres ?? s.parcel.acres), 0).toFixed(2),
  );
  const totalAssessedValue = slots.reduce(
    (sum, s) => sum + (s.customOverrides?.askingPrice ?? s.parcel.assessed ?? 120_000),
    0,
  );
  
  // Calculate contiguous boundaries & setback recovery
  const contiguousSlots = slots.filter((s) => s.role === "primary" || s.role === "contiguous_adjacent");
  const crossStreetSlots = slots.filter((s) => s.role === "cross_street_subdivisible");
  
  const contiguousBoundaryCount = Math.max(0, contiguousSlots.length - 1);
  // Reclaimed buildable area: In standard PA suburban zoning, eliminating two 25-ft side setbacks along a 300-ft property depth
  // recovers approx. 50 ft x 300 ft = 15,000 to 18,000 sq ft (~0.34-0.41 acres) per common boundary.
  // When custom depth and setback are specified, calculates exact formula:
  let setbackAreaRecoveredSqFt = contiguousBoundaryCount * 18_000;
  if (
    assemblageConfig?.customBoundaryDepthFt &&
    assemblageConfig.customBoundaryDepthFt > 0 &&
    assemblageConfig?.customInternalSetbackFt &&
    assemblageConfig.customInternalSetbackFt > 0
  ) {
    setbackAreaRecoveredSqFt =
      contiguousBoundaryCount *
      assemblageConfig.customBoundaryDepthFt *
      (assemblageConfig.customInternalSetbackFt * 2);
  }
  const setbackAreaRecoveredAcres = Number((setbackAreaRecoveredSqFt / 43_560).toFixed(2));

  const reverseSubdivisionRequired = contiguousBoundaryCount > 0;
  const reverseSubdivisionEstCost = reverseSubdivisionRequired ? 8_500 + (contiguousBoundaryCount - 1) * 2_500 : 0;

  const crossStreetBoringRequired = mode === "split_street_assemblage" || mode === "cross_street_dual_assemblage";
  const crossStreetBoringEstCost = crossStreetBoringRequired ? 48_000 : 0;

  // Elevation gravity balancing notes
  let topographicGravityBalanceNote: string | undefined;
  if (crossStreetBoringRequired) {
    const lowSlot = slots.find((s) => s.elevationTrend === "low");
    const highSlot = slots.find((s) => s.elevationTrend === "high");
    if (lowSlot && highSlot) {
      topographicGravityBalanceNote = `Topographic gravity drainage alignment: Stormwater runoff & sanitary gravity mains from High Elevation parcel (${highSlot.parcel.address}) routed across roadway via directional boring to Central Stormwater BMP & Lift Station on Low Elevation parcel (${lowSlot.parcel.address}).`;
    } else {
      topographicGravityBalanceNote = "Cross-street infrastructure balancing: Utilizes directional boring under public right-of-way for dual-basin stormwater balancing & gravity sanitary sewer intertie.";
    }
  }

  const trafficAlignmentNote = crossStreetBoringRequired
    ? "Opposing driveways must align directly or maintain min 150–200 ft centerline offset per PennDOT 67 Pa. Code § 441.8 to prevent turning conflict points. Continental crosswalk with RRFB beacons required."
    : undefined;

  const assemblageAnalysis: AssemblageAnalysis = {
    mode,
    slots,
    totalGrossAcres,
    totalNetDevelopableAcres: 0, // Calculated below
    totalAssessedValue,
    contiguousBoundaryCount,
    setbackAreaRecoveredSqFt,
    setbackAreaRecoveredAcres,
    reverseSubdivisionRequired,
    reverseSubdivisionEstCost,
    crossStreetBoringRequired,
    crossStreetBoringEstCost,
    topographicGravityBalanceNote,
    trafficAlignmentNote,
  };

  // --- 1. PHYSICAL DEDUCTIONS & LOT YIELD ---
  let rowPct = 0.12; // 12% standard roads/ROW
  let stormPct = 0.08; // 8% stormwater BMP basins (PA DEP Chapter 102)
  let openPct = 0.10; // 10% municipal open space dedication
  let undevPct = 0.05; // slope & environmental buffers

  // Blended slope and flood across participating parcels
  const avgSlopePct =
    slots.reduce((sum, s) => sum + (s.customOverrides?.slopePct ?? s.parcel.slopePct), 0) / slots.length;
  if (avgSlopePct > 15) {
    undevPct += 0.20;
  } else if (avgSlopePct > 8) {
    undevPct += 0.08;
  }

  const hasFloodAE = slots.some((s) => s.parcel.flood["5"] === "AE" || s.parcel.flood["3"] === "AE" || s.parcel.flood["1"] === "AE");
  if (hasFloodAE) {
    undevPct += 0.15;
    fatalFlaws.push("Portion of tract is mapped in FEMA 100-Year Flood Hazard (Zone AE).");
  }

  if (objective === "single_family" || objective === "lot_split") {
    rowPct = 0.02;
    stormPct = 0.03;
    openPct = 0.0;
  } else if (role === "commercial_pad" || role === "industrial_logistics") {
    rowPct = 0.10;
    stormPct = 0.12; // High impervious coverage requires larger stormwater retention
    openPct = 0.05;
  }

  // Assemblage efficiency bonus: contiguous assemblages share stormwater basins, reducing storm deduction by 2%
  if (reverseSubdivisionRequired) {
    stormPct = Math.max(0.05, stormPct - 0.02);
  }

  const totalDeductionPct = Math.min(0.65, rowPct + stormPct + openPct + undevPct);
  // Net developable acres includes the recovered internal setback area!
  const rawNetAcres = totalGrossAcres * (1 - totalDeductionPct) + setbackAreaRecoveredAcres;
  const netDevelopableAcres = Math.max(0.1, Number(rawNetAcres.toFixed(2)));
  assemblageAnalysis.totalNetDevelopableAcres = netDevelopableAcres;

  // Determine estimated lots / units based on zoning, role, and objective
  let baseDensity = parcel.densityUa || 2.5;
  if (role === "townhome_developer" || objective === "townhome") {
    baseDensity = Math.max(8.0, baseDensity * 2.8);
  } else if (role === "commercial_pad" || objective === "commercial") {
    baseDensity = Math.max(1.5, baseDensity * 0.8); // 1.5 - 2.5 pads per tract
  } else if (role === "industrial_logistics") {
    baseDensity = 1.0; // 1 large warehouse or flex building pad
  } else if (objective === "lot_split") {
    baseDensity = Math.min(2, Math.floor(totalGrossAcres));
  } else if (objective === "single_family") {
    baseDensity = 1;
  }

  let estimatedLots = customOverrides?.customTargetLots ?? Math.max(1, Math.floor(netDevelopableAcres * baseDensity));
  if (objective === "lot_split") {
    estimatedLots = Math.min(3, Math.max(2, Math.floor(totalGrossAcres)));
  }

  const grossDensityUa = estimatedLots / Math.max(totalGrossAcres, 0.1);
  const netDensityUa = estimatedLots / Math.max(netDevelopableAcres, 0.1);

  // --- 2. PILLAR 1: ZONING & SALDO VIABILITY ---
  const zoningDetails: string[] = [];
  let zoningScore = 85;

  const isPermitted = parcel.permittedUses.some((u) => {
    const l = u.toLowerCase();
    if (role === "commercial_pad" || objective === "commercial") return l.includes("retail") || l.includes("office") || l.includes("commercial");
    if (role === "townhome_developer" || objective === "townhome") return l.includes("multi") || l.includes("town") || l.includes("attached");
    if (role === "industrial_logistics") return l.includes("industrial") || l.includes("warehouse") || l.includes("commercial") || l.includes("flex");
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
  
  if (reverseSubdivisionRequired) {
    zoningDetails.push(`Assemblage consolidation under PA MPC Act 247 § 10107 eliminates ${contiguousBoundaryCount} internal boundary line(s), recovering ~${setbackAreaRecoveredSqFt.toLocaleString()} sq ft of buildable corridor.`);
  }

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

  if (avgSlopePct > 15) {
    civilScore -= 35;
    civilDetails.push(`Severe steep slopes (${avgSlopePct.toFixed(1)}%). Requires mass grading, retaining structures, and steep-slope municipal waiver.`);
    fatalFlaws.push(`Slope exceeds 15% (${avgSlopePct.toFixed(1)}% grade), triggering municipal steep slope conservation restrictions.`);
  } else if (avgSlopePct > 8) {
    civilScore -= 15;
    civilDetails.push(`Moderate slopes (${avgSlopePct.toFixed(1)}%). Standard benching and erosion control required.`);
  } else {
    civilDetails.push(`Gentle terrain (${avgSlopePct.toFixed(1)}% slope). Highly favorable for standard grading and shallow foundations.`);
  }

  if (hasFloodAE) {
    civilScore -= 30;
    civilDetails.push("FEMA Zone AE 100-year floodplain mapped on tract. Building pad elevation certificates and floodway buffers mandatory.");
  } else {
    civilDetails.push("FEMA Zone X (minimal flood hazard). No mandatory flood insurance or elevation certificate hurdles.");
  }

  if (benchmark.karstRiskHigh) {
    civilScore -= 10;
    civilDetails.push(`High karst limestone formation prevalent in ${parcel.county} County. Infiltration basins require geotechnical test pits and sinkhole remediation escrow.`);
  }

  if (totalGrossAcres >= 1.0) {
    civilDetails.push("Total tract disturbance exceeds 1.0 acre: PA DEP Chapter 102 NPDES Phase II General Permit required.");
  }

  if (crossStreetBoringRequired) {
    civilDetails.push(`Cross-street utility crossing: PennDOT / Township Utility Occupancy Permit (UOP) directional boring & steel casing required (~$${crossStreetBoringEstCost.toLocaleString()}).`);
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

  if (topographicGravityBalanceNote) {
    utilDetails.push(topographicGravityBalanceNote);
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
  const lotToBaseRatio = role === "townhome_developer" ? 0.18 : 0.22;
  const finishedLotValue = Math.round(asp * lotToBaseRatio);

  let siteworkCostPerLot = customOverrides?.customSiteworkPerLot ?? benchmark.baseSiteworkPerLot;
  if (role === "townhome_developer") siteworkCostPerLot = Math.round(siteworkCostPerLot * 0.70); // Higher density lowers sitework per unit
  if (avgSlopePct > 15) siteworkCostPerLot += 18_000;
  else if (avgSlopePct > 8) siteworkCostPerLot += 8_000;
  if (hasFloodAE) siteworkCostPerLot += 6_000;

  // Add assemblage costs prorated across lots
  const assemblageTotalSurcharges = reverseSubdivisionEstCost + crossStreetBoringEstCost;
  const assemblageCostPerLot = Math.round(assemblageTotalSurcharges / Math.max(1, estimatedLots));
  siteworkCostPerLot += assemblageCostPerLot;

  const softCostPerLot = Math.round(finishedLotValue * (benchmark.softCostPercent / 100));
  const carryCostPerLot = Math.round(finishedLotValue * 0.05); // 5% carry & financing
  const targetMarginPct = role === "builder_developer" ? 0.22 : 0.20; // 20% lot dev margin, 22% builder margin
  const marginPerLot = Math.round(finishedLotValue * targetMarginPct);

  // Maximum Allowable Offer per lot = FLV - Sitework - Soft - Carry - Margin
  const rawMaoPerLot = finishedLotValue - siteworkCostPerLot - softCostPerLot - carryCostPerLot - marginPerLot;
  const maxAllowableOfferPerLot = Math.max(5_000, rawMaoPerLot);
  const maxAllowableOfferTotal = maxAllowableOfferPerLot * estimatedLots;

  const currentAssessedOrAsking = customOverrides?.customAskingPrice ?? Math.max(totalAssessedValue, 120_000);
  const spreadAmount = maxAllowableOfferTotal - currentAssessedOrAsking;
  const spreadPct = Math.round((spreadAmount / Math.max(currentAssessedOrAsking, 1)) * 100);

  let financialScore = 80;
  if (spreadPct > 10) financialScore = 95;
  else if (spreadPct >= -15) financialScore = 78;
  else if (spreadPct >= -35) financialScore = 60;
  else financialScore = 40;

  const financialDetails: string[] = [
    `Projected Finished Home ASP: $${asp.toLocaleString()} (Finished Lot Value: $${finishedLotValue.toLocaleString()} @ ${Math.round(lotToBaseRatio * 100)}%).`,
    `Site civil & horizontal development: $${siteworkCostPerLot.toLocaleString()} / lot ($${(siteworkCostPerLot * estimatedLots).toLocaleString()} total incl. assemblage surcharges).`,
    `Soft costs, engineering & permitting: $${softCostPerLot.toLocaleString()} / lot (${benchmark.softCostPercent}%).`,
    `Maximum Allowable Offer (MAO): $${maxAllowableOfferTotal.toLocaleString()} ($${maxAllowableOfferPerLot.toLocaleString()}/lot) based on ${Math.round(targetMarginPct * 100)}% target margin.`,
    `Current Assessed/Asking: $${currentAssessedOrAsking.toLocaleString()} (${spreadAmount >= 0 ? `Underpriced by $${spreadAmount.toLocaleString()} (+${spreadPct}%)` : `Overpriced by $${Math.abs(spreadAmount).toLocaleString()} (${spreadPct}%)`}).`,
  ];

  if (reverseSubdivisionRequired) {
    financialDetails.push(`Reverse Subdivision legal/survey fees: $${reverseSubdivisionEstCost.toLocaleString()} ($${Math.round(reverseSubdivisionEstCost / estimatedLots)}/lot).`);
  }
  if (crossStreetBoringRequired) {
    financialDetails.push(`Cross-street directional boring & casing: $${crossStreetBoringEstCost.toLocaleString()} ($${Math.round(crossStreetBoringEstCost / estimatedLots)}/lot).`);
  }

  const financialPillar: FeasibilityPillarScore = {
    name: "Residual Financials",
    score: Math.max(0, Math.min(100, financialScore)),
    status: financialScore >= 75 ? "pass" : financialScore >= 55 ? "warning" : "fail",
    summary: spreadPct >= -15 ? "Profitable Land Budget" : "Requires Land Price Negotiation",
    details: financialDetails,
  };

  // --- 6. ROLE-SPECIFIC PRO FORMA GENERATION ---
  const roleProForma: ParcelFeasibilityAssessment["roleProForma"] = {};

  if (role === "lot_developer") {
    const lotFrontageFt = 65;
    const frontFootPrice = Math.round(finishedLotValue / lotFrontageFt);
    const grossLotRevenue = finishedLotValue * estimatedLots;
    const totalHorizontalCost = siteworkCostPerLot * estimatedLots;
    const softCostTotal = softCostPerLot * estimatedLots;
    const phase1Lots = Math.max(4, Math.round(estimatedLots * 0.18));
    const quarterlyTakedownLots = Math.max(3, Math.round((estimatedLots - phase1Lots) / 6));
    const takedownDurationQuarters = Math.ceil((estimatedLots - phase1Lots) / quarterlyTakedownLots) + 1;
    const optionDepositAmount = Math.round(grossLotRevenue * 0.10);
    const performanceBondCarry = Math.round(totalHorizontalCost * 1.10 * 0.015);

    roleProForma.lotDeveloper = {
      frontFootPrice,
      lotFrontageFt,
      finishedLotValue,
      grossLotRevenue,
      horizontalCostPerLot: siteworkCostPerLot,
      totalHorizontalCost,
      softCostTotal,
      phase1Lots,
      quarterlyTakedownLots,
      takedownDurationQuarters,
      optionDepositAmount,
      quarterlyPriceEscalatorPct: 0.75,
      performanceBondCarry,
      developerLeveredIrr: 24.5,
      equityMultipleMoic: 1.82,
      maxAllowableOfferPerLot,
      maxAllowableOfferTotal,
    };
  } else if (role === "builder_developer") {
    const totalHomeRevenue = asp * estimatedLots;
    const avgHomeSquareFootage = 2400;
    const verticalDirectCostPerSqFt = 165;
    const verticalCostPerHome = avgHomeSquareFootage * verticalDirectCostPerSqFt;
    const totalVerticalCost = verticalCostPerHome * estimatedLots;
    const totalHorizontalSitework = siteworkCostPerLot * estimatedLots;
    const monthlyAbsorptionRate = 2.8;
    const absorptionDurationMonths = Math.ceil(estimatedLots / monthlyAbsorptionRate);

    roleProForma.builderDeveloper = {
      homeAsp: asp,
      totalHomeRevenue,
      avgHomeSquareFootage,
      verticalDirectCostPerSqFt,
      verticalCostPerHome,
      totalVerticalCost,
      horizontalSiteworkPerLot: siteworkCostPerLot,
      totalHorizontalSitework,
      salesCommissionAndClosingPct: 5.0,
      monthlyAbsorptionRate,
      absorptionDurationMonths,
      horizontalMarginPct: 14.0,
      verticalMarginPct: 20.0,
      combinedGrossMarginPct: 34.0,
      projectIrr: 28.2,
      returnOnInventoryPct: 22.5,
      maxAllowableOfferTotal,
    };
  } else if (role === "townhome_developer") {
    const unitAsp = Math.round(asp * 0.75); // Townhomes trade at ~75% of detached SFR ASP
    const totalRevenue = unitAsp * estimatedLots;
    const densityPerAcre = Number((estimatedLots / Math.max(totalGrossAcres, 0.1)).toFixed(1));

    roleProForma.townhome = {
      unitAsp,
      totalRevenue,
      densityPerAcre,
      frontagePerUnit: 22,
      streetTypology: "Private HOA Cartway",
      garageTypology: "Rear-Alley Loaded",
      horizontalCostPerUnit: siteworkCostPerLot,
      totalHorizontalCost: siteworkCostPerLot * estimatedLots,
      hoaReserveEscrowPerUnit: 2500,
      combinedMarginPct: 26.5,
      maxAllowableOfferTotal,
    };
  } else if (role === "commercial_pad") {
    const outparcelsCount = Math.max(1, Math.min(5, Math.floor(totalGrossAcres / 1.5)));
    const avgPadPrice = 1_150_000;
    const totalPadRevenue = outparcelsCount * avgPadPrice;
    const annualGroundRentPerPad = 72_000;
    const groundLeaseCapRate = 6.25;
    const penndotHopTurnLaneEscrow = parcel.aadt > 10000 ? 75_000 : 35_000;
    const padPreparationCostPerPad = 120_000;
    const maxCommercialMao = Math.max(150_000, totalPadRevenue - (outparcelsCount * padPreparationCostPerPad) - penndotHopTurnLaneEscrow - 100_000);

    roleProForma.commercialPad = {
      outparcelsCount,
      avgPadPrice,
      totalPadRevenue,
      groundLeaseCapRate,
      annualGroundRentPerPad,
      farRatio: 0.24,
      siteImperviousPct: 65,
      penndotHopTurnLaneEscrow,
      padPreparationCostPerPad,
      maxAllowableOfferTotal: maxCommercialMao,
    };
  } else if (role === "industrial_logistics") {
    const potentialBuildingSqFt = Math.round(totalGrossAcres * 43560 * 0.32);
    const farRatio = 0.32;
    const truckCourtDepthFt = 165; // WB-67 interstate semitrailer standard
    const dockDoorsEstimated = Math.max(8, Math.floor(potentialBuildingSqFt / 8000));
    const fireFlowGpmRequired = 2000;
    const powerCapacityKva = 2500;
    const padReadyValuePerSqFt = 45;
    const totalGrossPadValue = potentialBuildingSqFt * padReadyValuePerSqFt;
    const heavyPavingAndCivilCost = Math.round(totalGrossPadValue * 0.35);
    const maxIndustrialMao = Math.max(250_000, totalGrossPadValue - heavyPavingAndCivilCost - 200_000);

    roleProForma.industrialLogistics = {
      potentialBuildingSqFt,
      farRatio,
      truckCourtDepthFt,
      dockDoorsEstimated,
      fireFlowGpmRequired,
      powerCapacityKva,
      padReadyValuePerSqFt,
      totalGrossPadValue,
      heavyPavingAndCivilCost,
      maxAllowableOfferTotal: maxIndustrialMao,
    };
  }

  // --- 7. COMPOSITE SCORING & VERDICT ---
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

  // --- 8. DUE DILIGENCE CHECKLIST GENERATION ---
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
      priority: hasFloodAE ? "high" : "standard",
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

  if (reverseSubdivisionRequired) {
    diligenceChecklist.push({
      id: "dd-reverse-subdivision",
      category: "Assemblage & Access",
      task: "File PA MPC Act 247 § 10107 Reverse Subdivision / Lot Line Consolidation Plan with County Recorder of Deeds.",
      priority: "high",
      reason: "Obliterates internal parcel boundaries to create a single unified legal tax parcel, eliminating interior setbacks.",
    });
  }

  if (crossStreetBoringRequired) {
    diligenceChecklist.push({
      id: "dd-penndot-uop",
      category: "Assemblage & Access",
      task: "Execute PennDOT / Municipal Utility Occupancy Permit (UOP) application for directional boring & steel casing under roadway.",
      priority: "high",
      reason: "Permits installation of cross-street stormwater balancing mains and gravity sanitary sewer intertie.",
    });
    diligenceChecklist.push({
      id: "dd-cross-drainage-easement",
      category: "Legal & Title",
      task: "Draft & record reciprocal cross-lot private drainage and utility easements.",
      priority: "high",
      reason: "Ensures perpetual drainage and maintenance rights between parcels across the public right-of-way.",
    });
  }

  if (parcel.aadt > 12000) {
    diligenceChecklist.push({
      id: "dd-penndot-hop",
      category: "Utilities",
      task: "Prepare PennDOT Highway Occupancy Permit (HOP) application & sight distance analysis.",
      priority: "high",
      reason: "Tract abuts state arterial corridor; driveway connection approval is mandatory.",
    });
  }

  // --- 9. APPROVAL TIMELINES ---
  const approvalTimeline = {
    minorMonths: "2 to 3 months (Minor subdivision / 1–3 lots)",
    majorMonths: "6 to 14 months (Preliminary & Final Major SALDO approval)",
    governingBody: `${parcel.municipality} Board of Supervisors / Borough Council`,
    countyPlanningCommission: benchmark.countyPlanning,
    reverseSubdivisionMonths: reverseSubdivisionRequired ? "+2 to 3 months concurrent with preliminary plat" : undefined,
  };

  return {
    parcel,
    objective,
    role,
    assemblage: assemblageAnalysis,
    compositeScore,
    verdict,
    verdictVariant,
    verdictBadge,
    verdictExplanation,
    grossAcres: totalGrossAcres,
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
    roleProForma,
    fatalFlaws,
    diligenceChecklist,
    approvalTimeline,
  };
}
