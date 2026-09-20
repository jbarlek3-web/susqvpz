import type { County } from "../types.ts";
import type {
  BuilderTier,
  CostBreakdown,
  HouseDesignSpec,
  RenovationBreakdown,
  RenovationScope,
  SubdivisionConfig,
} from "./types.ts";

export const BUILDER_TIER_DETAILS: Record<
  BuilderTier,
  {
    name: string;
    description: string;
    targetHardCostPerSqft: string;
    referenceBuilders: string;
    procurementAdvantage: string;
    baseSqftRates: { 1: number; 2: number; 3: number; 4: number };
    foundationMultiplier: number;
    framingPerSqft: number;
    exteriorMultiplier: number;
    interiorBasePerSqft: number;
    mepPerSqft: number;
    garageBase: number;
    porchBase: number;
    aspMultiplier: number;
  }
> = {
  publicProduction: {
    name: "Public National Production Builder",
    description:
      "High-volume national builders with direct manufacturer supply and offsite prefabrication (SEC 10-K benchmark).",
    targetHardCostPerSqft: "$75 - $95 / SF",
    referenceBuilders: "Ryan Homes (NVR), D.R. Horton, Lennar",
    procurementAdvantage:
      "15%-25% direct mill discounts, 6%-12% volume rebates, panelized plant assembly, 0% raw land risk via lot options.",
    baseSqftRates: { 1: 98, 2: 85, 3: 104, 4: 118 },
    foundationMultiplier: 0.65,
    framingPerSqft: 28,
    exteriorMultiplier: 0.68,
    interiorBasePerSqft: 20,
    mepPerSqft: 22,
    garageBase: 12_000,
    porchBase: 9_000,
    aspMultiplier: 0.88,
  },
  regionalSemiCustom: {
    name: "Regional Semi-Custom Builder",
    description:
      "Established Mid-Atlantic regional builders offering curated architectural selections and local trade stability.",
    targetHardCostPerSqft: "$130 - $165 / SF",
    referenceBuilders: "Landmark Homes, EGStoltzfus, Keystone Custom, Berks Homes",
    procurementAdvantage:
      "Regional pro-dealer wholesale pricing, production framing crews, hybrid self-developed and optioned lot inventory.",
    baseSqftRates: { 1: 168, 2: 152, 3: 172, 4: 192 },
    foundationMultiplier: 1.0,
    framingPerSqft: 48,
    exteriorMultiplier: 1.0,
    interiorBasePerSqft: 32,
    mepPerSqft: 34,
    garageBase: 18_500,
    porchBase: 14_000,
    aspMultiplier: 1.0,
  },
  customArchitectural: {
    name: "Custom Architectural Builder",
    description:
      "Bespoke high-end custom general contractors building one-of-a-kind architect-designed luxury estates.",
    targetHardCostPerSqft: "$210 - $295+ / SF",
    referenceBuilders: "Musser Home Builders, Custom Creations, Ironstone Homes, Costa",
    procurementAdvantage:
      "Bespoke craftsman trades, 2x6 advanced framing, continuous on-site supervision, spot lot / client land custom builds.",
    baseSqftRates: { 1: 245, 2: 222, 3: 255, 4: 285 },
    foundationMultiplier: 1.45,
    framingPerSqft: 72,
    exteriorMultiplier: 1.55,
    interiorBasePerSqft: 56,
    mepPerSqft: 48,
    garageBase: 28_000,
    porchBase: 22_000,
    aspMultiplier: 1.52,
  },
};

export function calculateRenovationCost(
  totalSqft: number,
  county: County,
  scope: RenovationScope = "moderate",
): RenovationBreakdown {
  const countyInfo = COUNTY_COST_FACTORS[county] ?? COUNTY_COST_FACTORS.York;
  const loc = countyInfo.multiplier;

  let scopeName = "Moderate Whole-Home Remodel";
  let baseRate = 115;
  let demoPct = 0.12;
  let mepPct = 0.24;
  let drywallPct = 0.18;
  let finishesPct = 0.2;
  let kitchenBathPct = 0.16;
  let permitContingencyPct = 0.1;

  if (scope === "cosmetic") {
    scopeName = "Cosmetic Refresh (Surfaces, Paint, Trim & Fixtures)";
    baseRate = 48;
    demoPct = 0.08;
    mepPct = 0.12;
    drywallPct = 0.15;
    finishesPct = 0.35;
    kitchenBathPct = 0.18;
    permitContingencyPct = 0.12;
  } else if (scope === "fullGut") {
    scopeName = "Full Gut Renovation to Studs (New MEP, Insulation & Drywall)";
    baseRate = 185;
    demoPct = 0.16;
    mepPct = 0.28;
    drywallPct = 0.18;
    finishesPct = 0.18;
    kitchenBathPct = 0.12;
    permitContingencyPct = 0.08;
  }

  const costPerSqft = Math.round(baseRate * loc);
  const totalRenovationCost = Math.round(totalSqft * costPerSqft);

  return {
    scope,
    scopeName,
    costPerSqft,
    totalRenovationCost,
    demolitionCost: Math.round(totalRenovationCost * demoPct),
    mechanicalElectricalPlumbingCost: Math.round(totalRenovationCost * mepPct),
    drywallAndInsulationCost: Math.round(totalRenovationCost * drywallPct),
    finishesAndFlooringCost: Math.round(totalRenovationCost * finishesPct),
    kitchenAndBathCost: Math.round(totalRenovationCost * kitchenBathPct),
    permitsAndContingencyCost: Math.round(totalRenovationCost * permitContingencyPct),
  };
}

export const COUNTY_COST_FACTORS: Record<
  County,
  {
    multiplier: number;
    name: string;
    rawLandAcreCost: number;
    baseHomeSaleComp: number;
    permitFeeFactor: number;
  }
> = {
  York: {
    multiplier: 0.98,
    name: "York County (South Central PA Base)",
    rawLandAcreCost: 48_000,
    baseHomeSaleComp: 435_000,
    permitFeeFactor: 0.95,
  },
  Cumberland: {
    multiplier: 1.04,
    name: "Cumberland County (I-81 / West Shore Corridor)",
    rawLandAcreCost: 68_000,
    baseHomeSaleComp: 495_000,
    permitFeeFactor: 1.05,
  },
  Dauphin: {
    multiplier: 1.02,
    name: "Dauphin County (Harrisburg Capital / Hershey Metro)",
    rawLandAcreCost: 58_000,
    baseHomeSaleComp: 465_000,
    permitFeeFactor: 1.02,
  },
  Lancaster: {
    multiplier: 1.06,
    name: "Lancaster County (Prime Farmland & Suburban Growth)",
    rawLandAcreCost: 78_000,
    baseHomeSaleComp: 540_000,
    permitFeeFactor: 1.08,
  },
};

export function calculateDevelopmentCost(
  subdivision: SubdivisionConfig,
  spec: HouseDesignSpec,
  overrides?: {
    customRawLandCost?: number;
    customTargetSalePrice?: number;
    customFinishTier?: "standard" | "upgraded" | "luxury";
    builderTier?: BuilderTier;
    renovationScope?: RenovationScope;
  },
): CostBreakdown {
  const countyInfo = COUNTY_COST_FACTORS[subdivision.county] ?? COUNTY_COST_FACTORS.York;
  const loc = countyInfo.multiplier;
  const builderTier: BuilderTier = overrides?.builderTier ?? "regionalSemiCustom";
  const tierConfig = BUILDER_TIER_DETAILS[builderTier];

  // 1. Raw Land Acquisition
  const landCostPerAcre = overrides?.customRawLandCost ?? countyInfo.rawLandAcreCost;
  const landAcquisitionCost = Math.round(subdivision.grossAcres * landCostPerAcre);

  // 2. Slope & Topography Multiplier
  let slopeEarthworkMultiplier = 1.0;
  if (subdivision.slopePct > 15) {
    slopeEarthworkMultiplier = 2.0; // PA SALDO steep slope conservation & benching
  } else if (subdivision.slopePct > 8) {
    slopeEarthworkMultiplier = 1.45;
  } else if (subdivision.slopePct > 4) {
    slopeEarthworkMultiplier = 1.2;
  }

  // 3. Karst & Pond Surcharge
  // Karst limestone requires impermeable geosynthetic clay liner (GCL) + riprap
  const karstLinerCost =
    subdivision.karstRisk === "High"
      ? 95_000
      : subdivision.karstRisk === "Moderate"
        ? 55_000
        : 18_000;

  // 4. Horizontal Civil Site Work Costs
  const earthworkGradingCost = Math.round(
    subdivision.grossAcres * 11_500 * slopeEarthworkMultiplier * loc,
  );

  // Central Stormwater Retention Pond (Excavation, liner, concrete spillway, aerator fountain, littoral shelf)
  const basePondCost = Math.round(
    (subdivision.pondAcreage * 125_000 + karstLinerCost + 28_000) * loc,
  );
  const stormwaterPondCost = Math.max(135_000, basePondCost);

  // Roadway Paving (Subbase, 4" asphalt binder, 1.5" wearing course per PA SALDO)
  // Approx $210 / linear foot
  const roadwayPavingCost = Math.round(subdivision.roadLengthLinearFt * 210 * loc);

  // Concrete Curbs & Sidewalks (5ft wide sidewalk both sides + ADA ramps)
  // Approx $85 / linear foot of roadway
  const curbsAndSidewalksCost = Math.round(subdivision.roadLengthLinearFt * 85 * loc);

  // Central Walking Trail circling the pond + Park Benches + Overlook Deck
  const walkingTrailAndAmenitiesCost = Math.round(
    (subdivision.pondRadiusFt * 2 * Math.PI * 45 + 32_000) * loc,
  );

  // Wet Utilities: Water distribution main ($95/LF) + Sanitary sewer ($140/LF) + Storm drainage RC pipe ($155/LF)
  const waterSewerInfrastructureCost = Math.round(
    subdivision.roadLengthLinearFt * (95 + 140 + 155) * loc,
  );

  // Dry Utilities: Underground electric (PPL/Met-Ed), gas (UGI/Columbia), telecom fiber ($75/LF)
  const dryUtilitiesTrenchingCost = Math.round(subdivision.roadLengthLinearFt * 75 * loc);

  // Landscaping: Street trees (1 per 40ft per PA SALDO), sodding, pond emergent wetland plants, perimeter buffer
  const streetTreeCount = Math.max(12, Math.round(subdivision.roadLengthLinearFt / 40));
  const landscapingStreetTreesCost = Math.round(
    (streetTreeCount * 650 + subdivision.grossAcres * 4_200 + 25_000) * loc,
  );

  // Civil Engineering, PA DEP NPDES Phase II, E&S plan, PennDOT HOP, and municipal escrow
  const civilEngineeringAndPermitsCost = Math.round(
    (85_000 + subdivision.totalLots * 3_200) * countyInfo.permitFeeFactor * loc,
  );

  const totalHorizontalCost =
    earthworkGradingCost +
    stormwaterPondCost +
    roadwayPavingCost +
    curbsAndSidewalksCost +
    walkingTrailAndAmenitiesCost +
    waterSewerInfrastructureCost +
    dryUtilitiesTrenchingCost +
    landscapingStreetTreesCost +
    civilEngineeringAndPermitsCost;

  const horizontalCostPerLot = Math.round(totalHorizontalCost / Math.max(1, subdivision.totalLots));

  // 5. Vertical Spec Home Construction
  // Exterior facade adders scaled by builder tier
  let facadeAdder = 0;
  if (spec.facadeMaterial === "stone") facadeAdder = Math.round(22 * tierConfig.exteriorMultiplier);
  else if (spec.facadeMaterial === "brick") facadeAdder = Math.round(16 * tierConfig.exteriorMultiplier);
  else if (spec.facadeMaterial === "boardAndBatten") facadeAdder = Math.round(9 * tierConfig.exteriorMultiplier);
  else if (spec.facadeMaterial === "stucco") facadeAdder = Math.round(12 * tierConfig.exteriorMultiplier);

  // Roof material adders
  let roofAdder = 0;
  if (spec.roofMaterial === "slate") roofAdder = Math.round(15 * tierConfig.exteriorMultiplier);
  else if (spec.roofMaterial === "standingSeam") roofAdder = Math.round(12 * tierConfig.exteriorMultiplier);

  // Interior finish tier adder
  let interiorAdder = 0;
  const finishTier = overrides?.customFinishTier ?? "upgraded";
  if (finishTier === "luxury") {
    interiorAdder = Math.round(28 * (builderTier === "publicProduction" ? 0.7 : builderTier === "customArchitectural" ? 1.4 : 1.0));
  } else if (finishTier === "upgraded") {
    interiorAdder = Math.round(14 * (builderTier === "publicProduction" ? 0.7 : builderTier === "customArchitectural" ? 1.3 : 1.0));
  } else {
    interiorAdder = 0;
  }

  // Garage adder
  const garageCost = spec.garageBays * tierConfig.garageBase;

  // Porch, Patio, Balcony & Turret adders
  const porchCost = spec.hasPorch ? tierConfig.porchBase : 0;
  const patioCost = spec.hasPatio ? Math.round(11_500 * tierConfig.exteriorMultiplier) : 0;
  const balconyCost = spec.hasBalcony && spec.stories >= 2 ? Math.round(9_500 * tierConfig.exteriorMultiplier) : 0;
  const turretCost = spec.hasBayTurret ? Math.round(16_000 * tierConfig.exteriorMultiplier) : 0;

  const foundationRate = Math.round(38 * tierConfig.foundationMultiplier);
  const singleHomeFoundationCost = Math.round(
    (spec.sqftPerStory * foundationRate + (spec.stories > 2 ? 8_000 * tierConfig.foundationMultiplier : 0)) * loc,
  );
  const singleHomeFramingCost = Math.round(spec.totalSqft * tierConfig.framingPerSqft * loc);
  const singleHomeExteriorFinishesCost = Math.round(
    (spec.totalSqft * (Math.round(22 * tierConfig.exteriorMultiplier) + facadeAdder + roofAdder) +
      garageCost +
      porchCost +
      balconyCost +
      turretCost) *
      loc,
  );
  const singleHomeInteriorFinishesCost = Math.round(spec.totalSqft * (tierConfig.interiorBasePerSqft + interiorAdder) * loc);
  const singleHomeMEPCost = Math.round(spec.totalSqft * tierConfig.mepPerSqft * loc);

  const singleHomeTotalCost =
    singleHomeFoundationCost +
    singleHomeFramingCost +
    singleHomeExteriorFinishesCost +
    singleHomeInteriorFinishesCost +
    singleHomeMEPCost +
    patioCost;

  const singleHomeCostPerSqft = Math.round(singleHomeTotalCost / Math.max(1, spec.totalSqft));
  const allHomesVerticalCost = singleHomeTotalCost * subdivision.totalLots;

  // 6. Total Development Cost & Underwriting Pro Forma
  const totalDevelopmentCost = landAcquisitionCost + totalHorizontalCost + allHomesVerticalCost;

  // Projected sale price per home based on size, stories, finishes, and county market comps
  let projectedSalePricePerHome: number;
  if (overrides?.customTargetSalePrice && overrides.customTargetSalePrice > 0) {
    projectedSalePricePerHome = Math.round(overrides.customTargetSalePrice);
  } else {
    const baselineComp = Math.round(countyInfo.baseHomeSaleComp * tierConfig.aspMultiplier);
    const sqftAdjustment = (spec.totalSqft - 2600) * Math.round(145 * tierConfig.aspMultiplier);
    const storyBonus = (spec.stories - 2) * Math.round(35_000 * tierConfig.aspMultiplier);
    const finishBonus =
      finishTier === "luxury"
        ? Math.round(55_000 * tierConfig.aspMultiplier)
        : finishTier === "upgraded"
          ? Math.round(22_000 * tierConfig.aspMultiplier)
          : 0;
    const pondViewBonus = 25_000; // Premium for central subdivision retention pond views
    projectedSalePricePerHome = Math.round(
      baselineComp + sqftAdjustment + storyBonus + finishBonus + pondViewBonus,
    );
  }

  const grossDevelopmentValue = projectedSalePricePerHome * subdivision.totalLots;
  const netDeveloperProfit = grossDevelopmentValue - totalDevelopmentCost;
  const developerMarginPct = Number(
    ((netDeveloperProfit / Math.max(1, grossDevelopmentValue)) * 100).toFixed(1),
  );
  const returnOnCostPct = Number(
    ((netDeveloperProfit / Math.max(1, totalDevelopmentCost)) * 100).toFixed(1),
  );

  // Standard underwriting: 65% Construction Loan-to-Cost (LTC), 35% Equity
  const equityRequired = Math.round(totalDevelopmentCost * 0.35);
  const equityMultiple = Number(
    ((netDeveloperProfit + equityRequired) / Math.max(1, equityRequired)).toFixed(2),
  );
  const breakevenPricePerHome = Math.round(
    totalDevelopmentCost / Math.max(1, subdivision.totalLots),
  );

  const renovation = calculateRenovationCost(
    spec.totalSqft,
    subdivision.county,
    overrides?.renovationScope ?? "moderate",
  );

  return {
    locationFactor: loc,
    locationName: countyInfo.name,
    builderTier,
    builderTierName: tierConfig.name,
    renovation,
    landAcquisitionCost,
    landCostPerAcre,
    earthworkGradingCost,
    stormwaterPondCost,
    roadwayPavingCost,
    curbsAndSidewalksCost,
    walkingTrailAndAmenitiesCost,
    waterSewerInfrastructureCost,
    dryUtilitiesTrenchingCost,
    landscapingStreetTreesCost,
    civilEngineeringAndPermitsCost,
    totalHorizontalCost,
    horizontalCostPerLot,
    singleHomeFoundationCost,
    singleHomeFramingCost,
    singleHomeExteriorFinishesCost,
    singleHomeInteriorFinishesCost,
    singleHomeMEPCost,
    singleHomeTotalCost,
    singleHomeCostPerSqft,
    allHomesVerticalCost,
    totalDevelopmentCost,
    projectedSalePricePerHome,
    grossDevelopmentValue,
    netDeveloperProfit,
    developerMarginPct,
    returnOnCostPct,
    equityRequired,
    equityMultiple,
    breakevenPricePerHome,
  };
}
