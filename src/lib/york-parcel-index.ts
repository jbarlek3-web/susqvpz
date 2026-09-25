/**
 * Search over the York County assessment roll (Parcels_.xlsx).
 * Tuple layout is written by scripts/build-york-parcel-index.py.
 *   0 pidn, 1 address, 2 owner, 3 acres, 4 class, 5 luc, 6 school,
 *   7 land, 8 building, 9 assessed, 10 saleDate, 11 salePrice,
 *   12 yearBuilt, 13 livingArea, 14 deed, 15 utility, 16 style,
 *   17 mail, 18 district
 */

const DIRECTIONS: Record<string, string> = {
  NORTH: "N",
  SOUTH: "S",
  EAST: "E",
  WEST: "W",
  N: "N",
  S: "S",
  E: "E",
  W: "W",
};

const SUFFIXES: Record<string, string> = {
  STREET: "ST",
  ST: "ST",
  ROAD: "RD",
  RD: "RD",
  AVENUE: "AVE",
  AVE: "AVE",
  DRIVE: "DR",
  DR: "DR",
  LANE: "LN",
  LN: "LN",
  COURT: "CT",
  CT: "CT",
  BOULEVARD: "BLVD",
  BLVD: "BLVD",
  CIRCLE: "CIR",
  CIR: "CIR",
  TERRACE: "TER",
  TER: "TER",
  PLACE: "PL",
  PL: "PL",
  HIGHWAY: "HWY",
  HWY: "HWY",
  PARKWAY: "PKWY",
  PKWY: "PKWY",
  PIKE: "PIKE",
  WAY: "WAY",
  ALLEY: "ALY",
  ALY: "ALY",
  TRAIL: "TRL",
  TRL: "TRL",
  RUN: "RUN",
};

const CLASS_LABELS: Record<string, string> = {
  R: "Residential",
  F: "Farm",
  C: "Commercial",
  E: "Exempt",
  I: "Industrial",
  A: "Agricultural",
  U: "Utility",
};

const NON_YORK =
  /\b(cumberland|dauphin|camp hill|harrisburg|carlisle|mechanicsburg|hershey|lemoyne|enola|shippensburg|lancaster county)\b/i;

const STREET_SUFFIX =
  /\b(st|street|rd|road|ave|avenue|dr|drive|ln|lane|ct|court|blvd|boulevard|way|pike|cir|circle|ter|terrace|pkwy|hwy|highway)\b/i;

export type ParcelRow = {
  pidn: string;
  address: string;
  owner: string;
  acres: number;
  classCode: string;
  luc: string;
  school: string;
  land: number;
  building: number;
  assessed: number;
  saleDate: string;
  salePrice: number;
  yearBuilt: number;
  livingArea: number;
  deed: string;
  utility: string;
  style: string;
  mail: string;
  district: string;
  addrKey: string;
  ownerKey: string;
};

export type ParcelIndex = {
  rows: ParcelRow[];
  byPidn: Map<string, number>;
  byAddr: Map<string, number[]>;
  byHouse: Map<string, number[]>;
};

export type ScoredMatch = {
  row: ParcelRow;
  score: number;
};

export type ParcelDecision =
  | { kind: "exact"; row: ParcelRow }
  | { kind: "ambiguous"; matches: ScoredMatch[] }
  | { kind: "none" };

export type YorkParcelSuggestion = {
  pidn: string;
  address: string;
  owner: string;
  acres: number;
  assessed: number | null;
  classLabel: string | null;
};

export type AssessmentParcelInfo = {
  pidn: string | null;
  address: string | null;
  owner: string | null;
  acres: number | null;
  class: string | null;
  school: string | null;
  landUse: string | null;
  assessed: number | null;
  landValue: number | null;
  buildingValue: number | null;
  saleDate: string | null;
  salePrice: number | null;
  yearBuilt: number | null;
  livingArea: number | null;
  deed: string | null;
  utility: string | null;
  style: string | null;
  mailAddress: string | null;
  source: "assessment-roll";
};

function textAt(tuple: unknown[], index: number) {
  const value = tuple[index];
  return typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
}

function numAt(tuple: unknown[], index: number) {
  const value = tuple[index];
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function normalizeAddress(raw: string) {
  const stripped = stripLocality(raw);
  const tokens = stripped
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!tokens.length) return "";
  if (/^\d/.test(tokens[0]) && tokens[1] && DIRECTIONS[tokens[1]]) {
    tokens[1] = DIRECTIONS[tokens[1]];
  }
  const last = tokens[tokens.length - 1];
  if (tokens.length > 1 && SUFFIXES[last]) tokens[tokens.length - 1] = SUFFIXES[last];
  return tokens.join(" ");
}

export function normalizeOwner(raw: string) {
  return raw
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function stripLocality(raw: string) {
  const parts = raw.split(",");
  if (parts.length === 1) return raw.replace(/\b\d{5}(?:-\d{4})?\s*$/, "").trim();
  const rest = parts.slice(1).join(" ");
  if (/\b(pa|pennsylvania|york|cumberland|dauphin|lancaster|\d{5})\b/i.test(rest)) {
    return parts[0].trim();
  }
  return raw.trim();
}

export function pidnCandidates(raw: string) {
  const out: string[] = [];
  const compact = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (/^[A-Z0-9]{13}$/.test(compact)) out.push(compact);
  if (compact.length > 13 && compact.endsWith("00000")) out.push(compact.slice(0, 13));

  const parts = raw
    .toUpperCase()
    .split(/[^A-Z0-9]+/)
    .filter(Boolean);
  if (parts.length >= 4 && parts.every((part) => /^[A-Z0-9]+$/.test(part))) {
    const district = parts[0].padStart(2, "0");
    const block = parts[1].padStart(3, "0");
    const map = parts[2].padStart(2, "0");
    let parcel = parts[3];
    if (parts.length >= 5) {
      parcel = `${parts[3].padStart(4, "0")}${parts[4].padStart(2, "0")}`;
    } else if (parcel.length <= 4) {
      parcel = `${parcel.padStart(4, "0")}00`;
    } else if (parcel.length < 6) {
      parcel = parcel.padStart(6, "0");
    } else {
      parcel = parcel.slice(0, 6);
    }
    const pidn = `${district}${block}${map}${parcel}`;
    if (/^[A-Z0-9]{13}$/.test(pidn)) out.push(pidn);
  }
  return [...new Set(out)];
}

export function assessmentClassLabel(code: string) {
  const cleaned = code.trim().toUpperCase();
  if (!cleaned) return null;
  const name = CLASS_LABELS[cleaned];
  return name ? `${name} (${cleaned})` : cleaned;
}

export function tupleToRow(tuple: unknown[]): ParcelRow | null {
  const pidn = textAt(tuple, 0);
  const address = textAt(tuple, 1);
  const owner = textAt(tuple, 2);
  if (!pidn && !address && !owner) return null;
  return {
    pidn,
    address,
    owner,
    acres: numAt(tuple, 3),
    classCode: textAt(tuple, 4),
    luc: textAt(tuple, 5),
    school: textAt(tuple, 6),
    land: numAt(tuple, 7),
    building: numAt(tuple, 8),
    assessed: numAt(tuple, 9),
    saleDate: textAt(tuple, 10),
    salePrice: numAt(tuple, 11),
    yearBuilt: numAt(tuple, 12),
    livingArea: numAt(tuple, 13),
    deed: textAt(tuple, 14),
    utility: textAt(tuple, 15),
    style: textAt(tuple, 16),
    mail: textAt(tuple, 17),
    district: textAt(tuple, 18),
    addrKey: normalizeAddress(address),
    ownerKey: normalizeOwner(owner),
  };
}

export function buildParcelIndex(tuples: unknown[][]): ParcelIndex {
  const rows: ParcelRow[] = [];
  const byPidn = new Map<string, number>();
  const byAddr = new Map<string, number[]>();
  const byHouse = new Map<string, number[]>();

  for (const tuple of tuples) {
    const row = tupleToRow(tuple);
    if (!row) continue;
    const index = rows.length;
    rows.push(row);
    if (row.pidn) byPidn.set(row.pidn, index);
    if (row.addrKey) {
      const list = byAddr.get(row.addrKey);
      if (list) list.push(index);
      else byAddr.set(row.addrKey, [index]);
      const house = row.addrKey.split(" ")[0];
      if (/^\d/.test(house)) {
        const houses = byHouse.get(house);
        if (houses) houses.push(index);
        else byHouse.set(house, [index]);
      }
    }
  }

  return { rows, byPidn, byAddr, byHouse };
}

function addressScore(queryKey: string, rowKey: string) {
  if (!queryKey || !rowKey) return 0;
  if (queryKey === rowKey) return 96;
  const queryTokens = queryKey.split(" ");
  const rowTokens = rowKey.split(" ");
  if (queryTokens.length >= 2 && rowTokens.length >= 2 && /^\d/.test(queryTokens[0])) {
    if (queryTokens[0] !== rowTokens[0]) return 0;
    const dirs = new Set(["N", "S", "E", "W"]);
    let queryIndex = 1;
    let rowIndex = 1;
    const queryDir = dirs.has(queryTokens[1]) ? queryTokens[1] : null;
    const rowDir = dirs.has(rowTokens[1]) ? rowTokens[1] : null;
    if (queryDir && rowDir && queryDir !== rowDir) return 0;
    if (queryDir) queryIndex = 2;
    if (rowDir) rowIndex = 2;
    const queryStreet = queryTokens.slice(queryIndex).join(" ");
    const rowStreet = rowTokens.slice(rowIndex).join(" ");
    if (!queryStreet || !rowStreet) return 50;
    if (queryStreet === rowStreet) return queryDir ? 92 : 88;
    if (rowStreet.startsWith(queryStreet) || queryStreet.startsWith(rowStreet)) {
      return queryDir ? 90 : 80;
    }
    if (rowStreet.includes(queryStreet)) return 72;
    return 0;
  }
  if (queryKey.length >= 4 && queryTokens.length === 1) {
    if (rowTokens.includes(queryKey) && !SUFFIXES[queryKey]) return 68;
  }
  if (queryKey.length >= 5 && rowKey.includes(queryKey) && queryTokens.length > 1) return 58;
  return 0;
}

function ownerScore(queryKey: string, ownerKey: string) {
  if (!queryKey || !ownerKey || queryKey.length < 4) return 0;
  if (queryKey === ownerKey) return 86;
  if (ownerKey.startsWith(queryKey)) return 70;
  if (queryKey.length >= 5 && ownerKey.includes(queryKey)) return 62;
  return 0;
}

function looksLikePin(raw: string) {
  if (STREET_SUFFIX.test(raw)) return false;
  const digits = raw.replace(/\D/g, "");
  if (digits.length >= 6 && digits.length >= raw.replace(/\s/g, "").length - 4) return true;
  return /^\d{2}[-\s.]\d/.test(raw.trim());
}

export function searchParcelRecords(index: ParcelIndex, raw: string, limit = 8): ScoredMatch[] {
  const query = raw.trim();
  if (query.length < 2 || NON_YORK.test(query)) return [];

  const queryKey = normalizeAddress(query);
  const ownerKey = normalizeOwner(stripLocality(query));
  const pinOnly = looksLikePin(query) && !/[A-Za-z]/.test(query);
  const best = new Map<number, number>();

  const consider = (rowIndex: number, score: number) => {
    if (score < 50) return;
    const prev = best.get(rowIndex) ?? 0;
    if (score > prev) best.set(rowIndex, score);
  };

  if (looksLikePin(query) || pinOnly) {
    let exactPin = false;
    for (const pidn of pidnCandidates(query)) {
      const rowIndex = index.byPidn.get(pidn);
      if (rowIndex != null) {
        consider(rowIndex, 100);
        exactPin = true;
      }
    }
    const digits = query.replace(/\D/g, "");
    if (!exactPin && digits.length >= 8 && digits.length < 13) {
      for (const [pidn, rowIndex] of index.byPidn) {
        if (pidn.startsWith(digits)) consider(rowIndex, 94);
      }
    }
  }

  const exact = queryKey ? index.byAddr.get(queryKey) : undefined;
  if (exact) {
    for (const rowIndex of exact) consider(rowIndex, 96);
  }

  if (!pinOnly && queryKey) {
    const house = /^\d/.test(queryKey) ? queryKey.split(" ")[0] : "";
    if (house) {
      const bucket = index.byHouse.get(house) ?? [];
      for (const rowIndex of bucket) {
        consider(rowIndex, addressScore(queryKey, index.rows[rowIndex].addrKey));
      }
    } else {
      for (let rowIndex = 0; rowIndex < index.rows.length; rowIndex += 1) {
        consider(rowIndex, addressScore(queryKey, index.rows[rowIndex].addrKey));
      }
    }
    for (let rowIndex = 0; rowIndex < index.rows.length; rowIndex += 1) {
      consider(rowIndex, ownerScore(ownerKey, index.rows[rowIndex].ownerKey));
    }
  }

  return [...best.entries()]
    .map(([rowIndex, score]) => ({ row: index.rows[rowIndex], score }))
    .sort((a, b) => b.score - a.score || a.row.address.localeCompare(b.row.address))
    .slice(0, limit);
}

export function decideParcelQuery(index: ParcelIndex, raw: string): ParcelDecision {
  const matches = searchParcelRecords(index, raw, 8);
  if (!matches.length) return { kind: "none" };
  const top = matches[0];
  const second = matches[1]?.score ?? 0;
  // A full PIN or exact street address outranks a partial or owner hit.
  // Two equal top scores stay ambiguous so the search list can show both.
  if (top.score >= 96 && second < top.score) return { kind: "exact", row: top.row };
  if (top.score >= 90 && second <= top.score - 12) return { kind: "exact", row: top.row };
  if (top.score >= 84 && second < 60) return { kind: "exact", row: top.row };
  return { kind: "ambiguous", matches };
}

export function toSuggestions(matches: ScoredMatch[]): YorkParcelSuggestion[] {
  return matches.map((match) => ({
    pidn: match.row.pidn,
    address: match.row.address,
    owner: match.row.owner,
    acres: match.row.acres,
    assessed: match.row.assessed > 0 ? match.row.assessed : null,
    classLabel: assessmentClassLabel(match.row.classCode),
  }));
}

function positive(value: number, minimum = 0) {
  return value > minimum ? value : null;
}

export function assessmentParcel(row: ParcelRow): AssessmentParcelInfo {
  return {
    pidn: row.pidn || null,
    address: row.address || null,
    owner: row.owner || null,
    acres: row.acres > 0 ? row.acres : null,
    class: assessmentClassLabel(row.classCode),
    school: row.school || null,
    landUse: row.luc || null,
    assessed: positive(row.assessed),
    landValue: positive(row.land),
    buildingValue: positive(row.building),
    saleDate: row.saleDate || null,
    salePrice: positive(row.salePrice, 1),
    yearBuilt: positive(row.yearBuilt),
    livingArea: positive(row.livingArea),
    deed: row.deed && row.deed !== "/" ? row.deed : null,
    utility: row.utility || null,
    style: row.style || null,
    mailAddress: row.mail || null,
    source: "assessment-roll",
  };
}

export function ambiguousParcelMessage(query: string, matches: ScoredMatch[]) {
  const examples = matches
    .slice(0, 3)
    .map((match) => `${match.row.address || "No site address"} (${match.row.pidn})`)
    .join("; ");
  return `More than one York County parcel matches “${query.trim()}”. Choose one from the list, or search the full address or PIN. Closest: ${examples}`;
}
