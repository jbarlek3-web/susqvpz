import assert from "node:assert/strict";
import test from "node:test";
import {
  assessmentParcel,
  buildParcelIndex,
  decideParcelQuery,
  normalizeAddress,
  pidnCandidates,
  searchParcelRecords,
} from "./york-parcel-index.ts";
import { loadYorkParcelIndex } from "./york-parcel-index.server.ts";

const george = [
  "0100101000100",
  "1 S GEORGE ST",
  "BGSII LLC",
  0.048,
  "C",
  "371",
  "028",
  32600,
  474520,
  507120,
  "2024-11-22",
  1300000,
  1900,
  4290,
  "2855/6617",
  "All Public",
  "",
  "29 S DUKE ST, YORK PA 17401-1401",
  "01",
];

const northGeorge = [
  "0100101000300",
  "1 N GEORGE ST",
  "NORTH GEORGE HOLDINGS",
  0.05,
  "C",
  "371",
  "028",
  10000,
  20000,
  30000,
  "",
  0,
  0,
  0,
  "",
  "",
  "",
  "",
  "01",
];

test("normalizes street words onto the assessment-roll address", () => {
  assert.equal(normalizeAddress("1 South George Street"), "1 S GEORGE ST");
  assert.equal(normalizeAddress("1 S. George St., York, PA 17401"), "1 S GEORGE ST");
});

test("rebuilds a dashed York PIN into the 13-digit PIDN", () => {
  assert.deepEqual(pidnCandidates("01-001-01-000100"), ["0100101000100"]);
  assert.deepEqual(pidnCandidates("010010100010000000"), ["0100101000100"]);
  assert.deepEqual(pidnCandidates("01-001-01-0029A0"), ["01001010029A0"]);
});

test("fixture roll matches one address and refuses a different direction", () => {
  const index = buildParcelIndex([george, northGeorge]);
  const exact = decideParcelQuery(index, "1 South George Street");
  assert.equal(exact.kind, "exact");
  if (exact.kind === "exact") {
    assert.equal(exact.row.owner, "BGSII LLC");
    assert.equal(exact.row.pidn, "0100101000100");
    const loaded = assessmentParcel(exact.row);
    assert.equal(loaded.assessed, 507120);
    assert.equal(loaded.class, "Commercial (C)");
    assert.equal(loaded.source, "assessment-roll");
  }

  const ambiguous = decideParcelQuery(index, "1 George");
  assert.equal(ambiguous.kind, "ambiguous");
  assert.equal(decideParcelQuery(index, "1042 Market Street, Camp Hill").kind, "none");

  const byPin = searchParcelRecords(index, "01-001-01-000100");
  assert.equal(byPin[0]?.row.owner, "BGSII LLC");
  assert.equal(byPin[0]?.score, 100);
});

test("york assessment file resolves a PIN and keeps duplicate addresses apart", async () => {
  const index = await loadYorkParcelIndex();
  assert.ok(index.rows.length > 100000);
  const badPins = index.rows.filter((row) => row.pidn && !/^[A-Z0-9]{13}$/.test(row.pidn)).length;
  assert.equal(badPins, 0);

  const byPin = decideParcelQuery(index, "0100101000100");
  assert.equal(byPin.kind, "exact");
  if (byPin.kind === "exact") {
    assert.equal(byPin.row.owner, "BGSII LLC");
    assert.equal(byPin.row.address, "1 S GEORGE ST");
    assert.equal(byPin.row.assessed, 507120);
  }

  const dashed = decideParcelQuery(index, "01-001-01-000100");
  assert.equal(dashed.kind, "exact");
  if (dashed.kind === "exact") assert.equal(dashed.row.pidn, "0100101000100");

  const letter = decideParcelQuery(index, "01001010029A0");
  assert.equal(letter.kind, "exact");
  if (letter.kind === "exact") {
    assert.equal(letter.row.address, "42 S DUKE ST");
    assert.equal(letter.row.owner, "MALONE GILBERT & CHARLOTTE H");
  }

  const street = decideParcelQuery(index, "1 South George Street");
  assert.equal(street.kind, "ambiguous");
  if (street.kind === "ambiguous") {
    assert.ok(street.matches.some((match) => match.row.owner === "BGSII LLC"));
    assert.ok(street.matches.some((match) => match.row.pidn === "86000020092B0"));
  }
});
