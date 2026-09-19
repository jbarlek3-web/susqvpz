import assert from "node:assert/strict";
import test from "node:test";
import directoryRows from "./data/pa-county-planning-directory.json" with { type: "json" };
import zoningSourceRows from "./data/pa-county-zoning-source-urls.json" with { type: "json" };

const PA_COUNTY_PLANNING_DIRECTORY = directoryRows;

test("Pennsylvania county directory contains all 4 unique counties", () => {
  assert.equal(PA_COUNTY_PLANNING_DIRECTORY.length, 4);
  assert.equal(new Set(PA_COUNTY_PLANNING_DIRECTORY.map((entry) => entry.county)).size, 4);
});

test("county zoning source URLs are deduplicated to 3 counties", () => {
  assert.equal(zoningSourceRows.length, 3);
  assert.equal(new Set(zoningSourceRows.map((entry) => entry.county)).size, 3);
});

test("every directory entry contains only department identification and URL fields", () => {
  for (const entry of PA_COUNTY_PLANNING_DIRECTORY) {
    assert.deepEqual(Object.keys(entry).sort(), ["county", "departmentName", "departmentUrl"]);
    assert.match(entry.departmentUrl, /^https?:\/\//);
  }
});

test("the four core Field ACQ counties are present", () => {
  for (const county of ["Cumberland", "Dauphin", "Lancaster", "York"]) {
    assert.ok(PA_COUNTY_PLANNING_DIRECTORY.some((entry) => entry.county === county));
  }
});
