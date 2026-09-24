import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { assessParcelFeasibility } from "./feasibility/feasibility-engine.ts";
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
});
