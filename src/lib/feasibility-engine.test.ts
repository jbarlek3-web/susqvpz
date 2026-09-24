import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  assessParcelFeasibility,
  type AssemblageConfig,
} from "./feasibility/feasibility-engine.ts";
import { PARCELS } from "./data/parcels.ts";

describe("Feasibility Assessment Engine", () => {
  it("computes feasibility score, lot yield, and MAO for a standard parcel", () => {
    const parcel = PARCELS.find((p) => p.county === "Cumberland") ?? PARCELS[0]!;
    const assessment = assessParcelFeasibility(parcel, "subdivision");

    assert.ok(assessment.compositeScore >= 0 && assessment.compositeScore <= 100);
    assert.ok(assessment.estimatedLots >= 1);
    assert.ok(assessment.financials.maxAllowableOfferTotal > 0);
    assert.ok(assessment.pillars.zoning.score >= 0);
    assert.ok(assessment.pillars.civil.score >= 0);
    assert.ok(assessment.pillars.utilities.score >= 0);
    assert.ok(assessment.pillars.financial.score >= 0);
    assert.ok(assessment.diligenceChecklist.length >= 4);
    assert.ok(assessment.approvalTimeline.governingBody.length > 0);
  });

  it("adjusts yield and deductions for steep slopes", () => {
    const steepParcel = {
      ...PARCELS[0]!,
      slopePct: 18,
    };
    const assessment = assessParcelFeasibility(steepParcel, "subdivision");
    assert.ok(assessment.fatalFlaws.some((f) => f.includes("Slope exceeds 15%")));
    assert.ok(assessment.pillars.civil.score < 75);
  });

  it("handles all 4 counties with regional benchmark costs", () => {
    const counties = ["Cumberland", "Dauphin", "Lancaster", "York"] as const;
    for (const county of counties) {
      const p = PARCELS.find((item) => item.county === county);
      if (p) {
        const assessment = assessParcelFeasibility(p, "subdivision");
        assert.equal(assessment.parcel.county, county);
        assert.ok(assessment.approvalTimeline.countyPlanningCommission.includes(county));
      }
    }
  });

  it("supports single-family infill and minor lot split objectives", () => {
    const p = PARCELS[0]!;
    const single = assessParcelFeasibility(p, "single_family");
    assert.equal(single.estimatedLots, 1);

    const split = assessParcelFeasibility(p, "lot_split");
    assert.ok(split.estimatedLots <= 3);
  });

  it("underwrites Master Lot Developer with builder takedowns and front-foot pricing", () => {
    const p = PARCELS.find((item) => item.county === "Lancaster") ?? PARCELS[0]!;
    const assessment = assessParcelFeasibility(p, "subdivision", undefined, "lot_developer");

    assert.equal(assessment.role, "lot_developer");
    const proForma = assessment.roleProForma.lotDeveloper;
    assert.ok(proForma);
    assert.ok(proForma.frontFootPrice > 1000);
    assert.ok(proForma.finishedLotValue > 50000);
    assert.ok(proForma.phase1Lots >= 1);
    assert.ok(proForma.quarterlyTakedownLots >= 1);
    assert.ok(proForma.optionDepositAmount > 0);
    assert.equal(proForma.quarterlyPriceEscalatorPct, 0.75);
    assert.ok(proForma.developerLeveredIrr >= 20);
    assert.ok(proForma.equityMultipleMoic >= 1.5);
  });

  it("underwrites Integrated Builder-Developer with dual margin capture", () => {
    const p = PARCELS.find((item) => item.county === "Cumberland") ?? PARCELS[0]!;
    const assessment = assessParcelFeasibility(p, "subdivision", undefined, "builder_developer");

    assert.equal(assessment.role, "builder_developer");
    const proForma = assessment.roleProForma.builderDeveloper;
    assert.ok(proForma);
    assert.ok(proForma.totalHomeRevenue > 0);
    assert.ok(proForma.verticalDirectCostPerSqFt > 100);
    assert.ok(proForma.combinedGrossMarginPct >= 30);
    assert.equal(proForma.horizontalMarginPct, 14);
    assert.equal(proForma.verticalMarginPct, 20);
    assert.ok(proForma.monthlyAbsorptionRate > 0);
  });

  it("underwrites Commercial and Industrial pad developers with appropriate metrics", () => {
    const p = PARCELS.find((item) => item.acres >= 5) ?? PARCELS[0]!;
    
    // Commercial Pad
    const commAssessment = assessParcelFeasibility(p, "commercial", undefined, "commercial_pad");
    assert.equal(commAssessment.role, "commercial_pad");
    const commProForma = commAssessment.roleProForma.commercialPad;
    assert.ok(commProForma);
    assert.ok(commProForma.outparcelsCount >= 1);
    assert.ok(commProForma.avgPadPrice >= 500000);
    assert.ok(commProForma.groundLeaseCapRate > 5);

    // Industrial Logistics
    const indAssessment = assessParcelFeasibility(p, "commercial", undefined, "industrial_logistics");
    assert.equal(indAssessment.role, "industrial_logistics");
    const indProForma = indAssessment.roleProForma.industrialLogistics;
    assert.ok(indProForma);
    assert.ok(indProForma.potentialBuildingSqFt > 10000);
    assert.equal(indProForma.truckCourtDepthFt, 165);
    assert.equal(indProForma.fireFlowGpmRequired, 2000);
  });

  it("calculates Contiguous Parcel Assemblage with PA MPC Act 247 setback recovery", () => {
    const p1 = PARCELS[0]!;
    const p2 = PARCELS[1]!;

    const config: AssemblageConfig = {
      mode: "contiguous_assemblage",
      slots: [
        { parcel: p1, role: "primary", elevationTrend: "neutral" },
        { parcel: p2, role: "contiguous_adjacent", elevationTrend: "neutral" },
      ],
    };

    const assessment = assessParcelFeasibility(p1, "subdivision", undefined, "lot_developer", config);

    assert.equal(assessment.assemblage.mode, "contiguous_assemblage");
    assert.equal(assessment.assemblage.contiguousBoundaryCount, 1);
    assert.ok(assessment.assemblage.setbackAreaRecoveredSqFt > 0);
    assert.ok(assessment.assemblage.reverseSubdivisionRequired);
    assert.ok(assessment.assemblage.reverseSubdivisionEstCost > 0);
    // Verifies PA MPC Act 247 Reverse Subdivision task is added to diligence checklist
    assert.ok(assessment.diligenceChecklist.some((task) => task.id === "dd-reverse-subdivision"));
  });

  it("calculates Split-Street Assemblage with directional boring and elevation balancing", () => {
    const p1 = PARCELS[0]!;
    const p2 = PARCELS[1]!;

    const config: AssemblageConfig = {
      mode: "split_street_assemblage",
      slots: [
        { parcel: p1, role: "primary", elevationTrend: "high" },
        { parcel: p2, role: "cross_street_subdivisible", elevationTrend: "low" },
      ],
    };

    const assessment = assessParcelFeasibility(p1, "subdivision", undefined, "lot_developer", config);

    assert.equal(assessment.assemblage.mode, "split_street_assemblage");
    assert.ok(assessment.assemblage.crossStreetBoringRequired);
    assert.ok(assessment.assemblage.crossStreetBoringEstCost > 0);
    assert.ok(assessment.assemblage.topographicGravityBalanceNote?.includes("High Elevation"));
    assert.ok(assessment.diligenceChecklist.some((task) => task.id === "dd-penndot-uop"));
    assert.ok(assessment.diligenceChecklist.some((task) => task.id === "dd-cross-drainage-easement"));
  });

  it("calculates contiguous assemblage with custom user overrides on acreage and asking price", () => {
    const p1 = PARCELS[0]!;
    const p2 = PARCELS[1]!;

    const config: AssemblageConfig = {
      mode: "contiguous_assemblage",
      slots: [
        { parcel: p1, role: "primary", elevationTrend: "neutral" },
        {
          parcel: p2,
          role: "contiguous_adjacent",
          elevationTrend: "neutral",
          isCustom: true,
          customOverrides: {
            acres: 5.5,
            askingPrice: 320_000,
            slopePct: 5,
          },
        },
      ],
    };

    const assessment = assessParcelFeasibility(p1, "subdivision", undefined, "lot_developer", config);
    const expectedAcres = Number((p1.acres + 5.5).toFixed(2));
    assert.equal(assessment.grossAcres, expectedAcres);
    assert.equal(assessment.assemblage.totalGrossAcres, expectedAcres);
    assert.equal(assessment.assemblage.totalAssessedValue, (p1.assessed || 120_000) + 320_000);
  });

  it("calculates exact setback recovery area when custom boundary depth and setback width are specified", () => {
    const p1 = PARCELS[0]!;
    const p2 = PARCELS[1]!;

    const config: AssemblageConfig = {
      mode: "contiguous_assemblage",
      slots: [
        { parcel: p1, role: "primary", elevationTrend: "neutral" },
        { parcel: p2, role: "contiguous_adjacent", elevationTrend: "neutral" },
      ],
      customBoundaryDepthFt: 400,
      customInternalSetbackFt: 25,
    };

    const assessment = assessParcelFeasibility(p1, "subdivision", undefined, "lot_developer", config);
    // 1 boundary * 400 ft * (25 * 2) = 20,000 sq ft
    assert.equal(assessment.assemblage.setbackAreaRecoveredSqFt, 20_000);
    assert.equal(assessment.assemblage.setbackAreaRecoveredAcres, Number((20_000 / 43560).toFixed(2)));
  });
});
