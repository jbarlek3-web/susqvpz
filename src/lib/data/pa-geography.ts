import type { County } from "@/lib/types";

/**
 * Authoritative mapping of York County 2-digit district codes to their governing municipality.
 * In York County PA, every parcel number (PIDN) begins with its 2-digit district code.
 * (e.g., District 49 = Warrington Township; District 54 = York Township).
 */
export const YORK_DISTRICT_TO_MUNI: Record<string, string> = {
  "10": "York City",
  "20": "Carroll Township",
  "21": "Chanceford Township",
  "22": "Codorus Township",
  "23": "Conewago Township",
  "24": "Dover Township",
  "25": "East Hopewell Township",
  "26": "East Manchester Township",
  "27": "Fairview Township",
  "28": "Fawn Township",
  "29": "Franklin Township",
  "30": "Heidelberg Township",
  "31": "Hellam Township",
  "32": "Hopewell Township",
  "33": "Jackson Township",
  "34": "Lower Chanceford Township",
  "35": "Lower Windsor Township",
  "36": "Manchester Township",
  "37": "Manheim Township",
  "38": "Monaghan Township",
  "39": "Newberry Township",
  "40": "North Codorus Township",
  "41": "North Hopewell Township",
  "42": "Paradise Township",
  "43": "Peach Bottom Township",
  "44": "Penn Township",
  "45": "Shrewsbury Township",
  "46": "Springettsbury Township",
  "47": "Springfield Township",
  "48": "Spring Garden Township",
  "49": "Warrington Township",
  "50": "Washington Township",
  "51": "West Manchester Township",
  "52": "West Manheim Township",
  "53": "Windsor Township",
  "54": "York Township",
  "55": "Cross Roads Borough",
  "56": "Dallastown Borough",
  "57": "Delta Borough",
  "58": "Dillsburg Borough",
  "59": "Dover Borough",
  "60": "East Prospect Borough",
  "61": "Fawn Grove Borough",
  "62": "Felton Borough",
  "63": "Franklintown Borough",
  "64": "Glen Rock Borough",
  "65": "Goldsboro Borough",
  "66": "Hallam Borough",
  "67": "Hanover Borough",
  "72": "Jacobus Borough",
  "73": "Jefferson Borough",
  "74": "Lewisberry Borough",
  "75": "Loganville Borough",
  "76": "Manchester Borough",
  "77": "Mount Wolf Borough",
  "78": "New Freedom Borough",
  "79": "New Salem Borough",
  "80": "North York Borough",
  "81": "Railroad Borough",
  "82": "Red Lion Borough",
  "83": "Seven Valleys Borough",
  "84": "Shrewsbury Borough",
  "85": "Spring Grove Borough",
  "86": "Stewartstown Borough",
  "88": "West York Borough",
  "89": "Windsor Borough",
  "90": "Winterstown Borough",
  "91": "Wrightsville Borough",
  "92": "Yoe Borough",
  "93": "Yorkana Borough",
};

/**
 * Mapping of key South Central PA ZIP codes to governing municipalities and counties.
 */
export const REGIONAL_ZIP_TO_LOCATION: Record<string, { county: County; municipality: string }> = {
  // York County ZIPs
  "17365": { county: "York", municipality: "Warrington Township" }, // Wellsville PO
  "17019": { county: "York", municipality: "Carroll Township" }, // Dillsburg PO
  "17315": { county: "York", municipality: "Dover Township" }, // Dover PO
  "17339": { county: "York", municipality: "Fairview Township" }, // Lewisberry PO
  "17319": { county: "York", municipality: "Newberry Township" }, // Etters PO
  "17313": { county: "York", municipality: "York Township" }, // Dallastown PO
  "17356": { county: "York", municipality: "Red Lion Borough" }, // Red Lion PO
  "17331": { county: "York", municipality: "Penn Township" }, // Hanover PO
  "17362": { county: "York", municipality: "Jackson Township" }, // Spring Grove PO
  "17361": { county: "York", municipality: "Shrewsbury Township" }, // Shrewsbury PO
  "17349": { county: "York", municipality: "Shrewsbury Township" }, // New Freedom PO
  "17363": { county: "York", municipality: "Hopewell Township" }, // Stewartstown PO
  "17327": { county: "York", municipality: "Glen Rock Borough" }, // Glen Rock PO
  "17370": { county: "York", municipality: "Wrightsville Borough" }, // Wrightsville PO
  "17347": { county: "York", municipality: "East Manchester Township" }, // Mount Wolf PO
  "17318": { county: "York", municipality: "Manchester Township" }, // Emigsville PO
  "17364": { county: "York", municipality: "West Manheim Township" }, // Hanover / West Manheim
  "17401": { county: "York", municipality: "York City" },
  "17402": { county: "York", municipality: "Springettsbury Township" },
  "17403": { county: "York", municipality: "Spring Garden Township" },
  "17404": { county: "York", municipality: "West Manchester Township" },
  "17406": { county: "York", municipality: "Hellam Township" },
  "17408": { county: "York", municipality: "West Manchester Township" },

  // Cumberland County ZIPs
  "17011": { county: "Cumberland", municipality: "Camp Hill Borough" },
  "17012": { county: "Cumberland", municipality: "East Pennsboro Township" },
  "17013": { county: "Cumberland", municipality: "Carlisle Borough" },
  "17015": { county: "Cumberland", municipality: "South Middleton Township" },
  "17050": { county: "Cumberland", municipality: "Silver Spring Township" }, // Mechanicsburg PO
  "17055": { county: "Cumberland", municipality: "Upper Allen Township" }, // Mechanicsburg PO
  "17025": { county: "Cumberland", municipality: "East Pennsboro Township" }, // Enola PO
  "17070": { county: "Cumberland", municipality: "Lower Allen Township" }, // New Cumberland PO
  "17257": { county: "Cumberland", municipality: "Shippensburg Borough" },
  "17065": { county: "Cumberland", municipality: "South Middleton Township" }, // Mount Holly Springs PO
  "17007": { county: "Cumberland", municipality: "South Middleton Township" }, // Boiling Springs PO
  "17072": { county: "Cumberland", municipality: "Newville Borough" },
  "17241": { county: "Cumberland", municipality: "Hopewell Township" }, // Newburg PO

  // Dauphin County ZIPs
  "17033": { county: "Dauphin", municipality: "Derry Township" }, // Hershey PO
  "17036": { county: "Dauphin", municipality: "Derry Township" }, // Hummelstown PO
  "17057": { county: "Dauphin", municipality: "Lower Swatara Township" }, // Middletown PO
  "17101": { county: "Dauphin", municipality: "Harrisburg City" },
  "17102": { county: "Dauphin", municipality: "Harrisburg City" },
  "17103": { county: "Dauphin", municipality: "Harrisburg City" },
  "17104": { county: "Dauphin", municipality: "Harrisburg City" },
  "17109": { county: "Dauphin", municipality: "Lower Paxton Township" },
  "17110": { county: "Dauphin", municipality: "Susquehanna Township" },
  "17111": { county: "Dauphin", municipality: "Swatara Township" },
  "17112": { county: "Dauphin", municipality: "Lower Paxton Township" },
  "17113": { county: "Dauphin", municipality: "Steelton Borough" },
  "17061": { county: "Dauphin", municipality: "Millersburg Borough" },
  "17032": { county: "Dauphin", municipality: "Halifax Township" },
  "17018": { county: "Dauphin", municipality: "Middle Paxton Township" }, // Dauphin PO
  "17028": { county: "Dauphin", municipality: "Washington Township" }, // Elizabethville PO
  "17048": { county: "Dauphin", municipality: "Lykens Borough" },
  "17080": { county: "Dauphin", municipality: "Williamstown Borough" },

  // Lancaster County ZIPs
  "17543": { county: "Lancaster", municipality: "Warwick Township" }, // Lititz PO
  "17522": { county: "Lancaster", municipality: "Ephrata Township" }, // Ephrata PO
  "17552": { county: "Lancaster", municipality: "Mount Joy Township" }, // Mount Joy PO
  "17551": { county: "Lancaster", municipality: "Manor Township" }, // Millersville PO
  "17512": { county: "Lancaster", municipality: "Columbia Borough" },
  "17545": { county: "Lancaster", municipality: "Rapho Township" }, // Manheim PO
  "17022": { county: "Lancaster", municipality: "Elizabethtown Borough" },
  "17601": { county: "Lancaster", municipality: "Manheim Township" }, // Lancaster PO
  "17602": { county: "Lancaster", municipality: "Lancaster City" },
  "17603": { county: "Lancaster", municipality: "Lancaster Township" },
  "17579": { county: "Lancaster", municipality: "Strasburg Township" },
  "17557": { county: "Lancaster", municipality: "Earl Township" }, // New Holland PO
  "17540": { county: "Lancaster", municipality: "Upper Leacock Township" }, // Leola PO
  "17566": { county: "Lancaster", municipality: "Quarryville Borough" },
  "17538": { county: "Lancaster", municipality: "East Hempfield Township" }, // Landisville PO
};

/**
 * Mapping of common postal towns, borough names, and landmarks to their governing municipality and county.
 */
export const REGIONAL_TOWN_TO_LOCATION: Record<string, { county: County; municipality: string }> = {
  // Warrington / Wellsville
  wellsville: { county: "York", municipality: "Warrington Township" },
  warrington: { county: "York", municipality: "Warrington Township" },
  "fox run": { county: "York", municipality: "Warrington Township" },

  // York County towns
  dillsburg: { county: "York", municipality: "Carroll Township" },
  dover: { county: "York", municipality: "Dover Township" },
  lewisberry: { county: "York", municipality: "Fairview Township" },
  etters: { county: "York", municipality: "Newberry Township" },
  dallastown: { county: "York", municipality: "York Township" },
  "red lion": { county: "York", municipality: "Red Lion Borough" },
  hanover: { county: "York", municipality: "Penn Township" },
  "spring grove": { county: "York", municipality: "Jackson Township" },
  shrewsbury: { county: "York", municipality: "Shrewsbury Township" },
  "new freedom": { county: "York", municipality: "Shrewsbury Township" },
  stewartstown: { county: "York", municipality: "Hopewell Township" },
  "glen rock": { county: "York", municipality: "Glen Rock Borough" },
  wrightsville: { county: "York", municipality: "Wrightsville Borough" },
  springettsbury: { county: "York", municipality: "Springettsbury Township" },
  "spring garden": { county: "York", municipality: "Spring Garden Township" },
  "west manchester": { county: "York", municipality: "West Manchester Township" },
  "east manchester": { county: "York", municipality: "East Manchester Township" },
  "fairview township": { county: "York", municipality: "Fairview Township" },
  newberry: { county: "York", municipality: "Newberry Township" },
  hellam: { county: "York", municipality: "Hellam Township" },
  windsor: { county: "York", municipality: "Windsor Township" },
  chanceford: { county: "York", municipality: "Chanceford Township" },

  // Cumberland County towns
  "camp hill": { county: "Cumberland", municipality: "Camp Hill Borough" },
  carlisle: { county: "Cumberland", municipality: "Carlisle Borough" },
  mechanicsburg: { county: "Cumberland", municipality: "Silver Spring Township" },
  hampden: { county: "Cumberland", municipality: "Hampden Township" },
  "silver spring": { county: "Cumberland", municipality: "Silver Spring Township" },
  "upper allen": { county: "Cumberland", municipality: "Upper Allen Township" },
  "lower allen": { county: "Cumberland", municipality: "Lower Allen Township" },
  "east pennsboro": { county: "Cumberland", municipality: "East Pennsboro Township" },
  enola: { county: "Cumberland", municipality: "East Pennsboro Township" },
  shippensburg: { county: "Cumberland", municipality: "Shippensburg Borough" },
  "new cumberland": { county: "Cumberland", municipality: "Lower Allen Township" },
  "south middleton": { county: "Cumberland", municipality: "South Middleton Township" },
  "north middleton": { county: "Cumberland", municipality: "North Middleton Township" },
  "boiling springs": { county: "Cumberland", municipality: "South Middleton Township" },
  "mount holly springs": { county: "Cumberland", municipality: "South Middleton Township" },
  dickinson: { county: "Cumberland", municipality: "Dickinson Township" },
  middlesex: { county: "Cumberland", municipality: "Middlesex Township" },
  monroe: { county: "Cumberland", municipality: "Monroe Township" },

  // Dauphin County towns
  harrisburg: { county: "Dauphin", municipality: "Harrisburg City" },
  hershey: { county: "Dauphin", municipality: "Derry Township" },
  hummelstown: { county: "Dauphin", municipality: "Derry Township" },
  derry: { county: "Dauphin", municipality: "Derry Township" },
  swatara: { county: "Dauphin", municipality: "Swatara Township" },
  "lower paxton": { county: "Dauphin", municipality: "Lower Paxton Township" },
  susquehanna: { county: "Dauphin", municipality: "Susquehanna Township" },
  middletown: { county: "Dauphin", municipality: "Lower Swatara Township" },
  "lower swatara": { county: "Dauphin", municipality: "Lower Swatara Township" },
  steelton: { county: "Dauphin", municipality: "Steelton Borough" },
  "middle paxton": { county: "Dauphin", municipality: "Middle Paxton Township" },
  "west hanover": { county: "Dauphin", municipality: "West Hanover Township" },
  "south hanover": { county: "Dauphin", municipality: "South Hanover Township" },
  "east hanover": { county: "Dauphin", municipality: "East Hanover Township" },
  halifax: { county: "Dauphin", municipality: "Halifax Township" },
  millersburg: { county: "Dauphin", municipality: "Millersburg Borough" },

  // Lancaster County towns
  lancaster: { county: "Lancaster", municipality: "Lancaster Township" },
  "lancaster city": { county: "Lancaster", municipality: "Lancaster City" },
  manheim: { county: "Lancaster", municipality: "Manheim Township" },
  "manheim township": { county: "Lancaster", municipality: "Manheim Township" },
  lititz: { county: "Lancaster", municipality: "Warwick Township" },
  warwick: { county: "Lancaster", municipality: "Warwick Township" },
  ephrata: { county: "Lancaster", municipality: "Ephrata Township" },
  "east hempfield": { county: "Lancaster", municipality: "East Hempfield Township" },
  "west hempfield": { county: "Lancaster", municipality: "West Hempfield Township" },
  "mount joy": { county: "Lancaster", municipality: "Mount Joy Township" },
  millersville: { county: "Lancaster", municipality: "Manor Township" },
  columbia: { county: "Lancaster", municipality: "Columbia Borough" },
  elizabethtown: { county: "Lancaster", municipality: "Elizabethtown Borough" },
  manor: { county: "Lancaster", municipality: "Manor Township" },
  "east lampeter": { county: "Lancaster", municipality: "East Lampeter Township" },
  "west lampeter": { county: "Lancaster", municipality: "West Lampeter Township" },
  strasburg: { county: "Lancaster", municipality: "Strasburg Township" },
  "new holland": { county: "Lancaster", municipality: "Earl Township" },
  salisbury: { county: "Lancaster", municipality: "Salisbury Township" },
};

/**
 * Detects whether an input string is likely a Parcel ID / APN rather than a street address.
 */
export function isLikelyApnOrPin(input: string): boolean {
  const clean = input.trim();
  if (clean.length < 3) return false;

  // Internal mock parcel IDs (p-1042, p-hampden, etc.)
  if (/^p-[a-z0-9-]+$/i.test(clean)) return true;

  // York County standard PIN (e.g. 49-000-05-0013.00-00000, 49-05-13, 4900005001300)
  if (/^\d{2}[-\s.]\w+/i.test(clean)) return true;

  // Multi-segment hyphenated or dotted parcel numbers (e.g. 21-14-1234-567, 390-12345-0)
  if (/^[A-Za-z0-9]+[-.][A-Za-z0-9]+[-.][A-Za-z0-9]+/i.test(clean)) return true;

  // Pure digits of 6 to 18 characters (e.g. 4900005001300, 21141234567)
  if (/^\d{6,18}$/.test(clean)) return true;

  // Check if string contains standard street type suffixes
  const hasStreetSuffix = /\b(st|street|rd|road|ave|avenue|dr|drive|ln|lane|ct|court|blvd|boulevard|way|ter|terrace|cir|circle|pkwy|hwy|highway|pike)\b/i.test(clean);
  if (!hasStreetSuffix && /[0-9]/.test(clean) && /[-_./]/.test(clean)) {
    return true;
  }

  return false;
}

/**
 * Normalizes an APN/PIN to clean alphanumeric uppercase string.
 */
export function normalizeApn(raw: string): string {
  return (raw || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/**
 * Parses any APN/PIN and extracts York County district and search candidate queries.
 */
export function parseApnCandidates(input: string): {
  normalized: string;
  yorkDistrict: string | null;
  yorkMunicipality: string | null;
  sqlClauses: string[];
} {
  const clean = input.trim().toUpperCase();
  const normalized = normalizeApn(clean);
  const sqlClauses: string[] = [];
  let yorkDistrict: string | null = null;
  let yorkMunicipality: string | null = null;

  // Check if starts with a 2-digit district code
  const districtMatch = clean.match(/^(\d{2})[-.\s]/) || (normalized.length >= 6 ? normalized.match(/^(\d{2})/) : null);
  if (districtMatch && districtMatch[1] in YORK_DISTRICT_TO_MUNI) {
    yorkDistrict = districtMatch[1];
    yorkMunicipality = YORK_DISTRICT_TO_MUNI[yorkDistrict];
  }

  // Exact 13-digit York PIDN match
  if (normalized.length === 13) {
    sqlClauses.push(`PIDN = '${normalized}'`);
  }
  // Standard 18-char York PIN ending with -00000 leasehold (e.g. 490000500130000000)
  else if (normalized.length >= 14 && normalized.endsWith("00000")) {
    const p13 = normalized.slice(0, 13);
    sqlClauses.push(`PIDN = '${p13}'`);
  }

  // Structured multi-part parsing (e.g. 49-000-05-0013.00 or 49-05-13)
  const parts = clean.split(/[-.\s]+/).filter(Boolean);
  if (parts.length >= 2 && yorkDistrict) {
    if (parts.length === 3) {
      // e.g. 49-05-13
      const map = parts[1].padStart(2, "0");
      const pNum = parts[2];
      sqlClauses.push(`DISTRICT = '${yorkDistrict}' AND MAP = '${map}' AND PARCEL LIKE '%${pNum}%'`);
      sqlClauses.push(`PIDN LIKE '${yorkDistrict}%${map}%${pNum}%'`);
    } else {
      const nonZero = parts.filter((p) => p !== "000" && p !== "00" && p !== "00000");
      if (nonZero.length > 0) {
        sqlClauses.push(`PIDN LIKE '%${nonZero.join("%")}%'`);
      }
    }
  }

  // Fallbacks: exact or partial PIDN match
  if (normalized.length >= 4) {
    sqlClauses.push(`PIDN = '${normalized}'`);
    sqlClauses.push(`PIDN LIKE '%${normalized}%'`);
    if (normalized.length >= 7) {
      sqlClauses.push(`PIDN LIKE '${normalized.slice(0, 7)}%'`);
    }
  }

  return {
    normalized,
    yorkDistrict,
    yorkMunicipality,
    sqlClauses: Array.from(new Set(sqlClauses)),
  };
}

/**
 * Intelligently resolves the true Pennsylvania municipality and county from any
 * street address, postal town, ZIP code, or parcel number query.
 */
export function detectCountyAndMuni(input: string): { county: County; municipality: string } {
  const text = (input || "").toLowerCase().trim();

  // 1. If it's an APN/PIN with York County district code
  if (isLikelyApnOrPin(text)) {
    const apnInfo = parseApnCandidates(text);
    if (apnInfo.yorkMunicipality) {
      return {
        county: "York",
        municipality: apnInfo.yorkMunicipality,
      };
    }
  }

  // 2. Check 5-digit ZIP code in input
  const zipMatch = text.match(/\b(17\d{3})\b/);
  if (zipMatch && zipMatch[1] in REGIONAL_ZIP_TO_LOCATION) {
    return REGIONAL_ZIP_TO_LOCATION[zipMatch[1]];
  }

  // 3. Check exact postal town or borough names (longer phrases first)
  const townKeys = Object.keys(REGIONAL_TOWN_TO_LOCATION).sort((a, b) => b.length - a.length);
  for (const town of townKeys) {
    const regex = new RegExp(`\\b${town}\\b`, "i");
    if (regex.test(text)) {
      return REGIONAL_TOWN_TO_LOCATION[town];
    }
  }

  // 4. Broad County detection if explicit county name is stated
  if (/cumberland/i.test(text)) {
    return { county: "Cumberland", municipality: "Silver Spring Township" };
  }
  if (/dauphin/i.test(text)) {
    return { county: "Dauphin", municipality: "Lower Paxton Township" };
  }
  if (/lancaster/i.test(text)) {
    return { county: "Lancaster", municipality: "Manheim Township" };
  }
  if (/york/i.test(text)) {
    return { county: "York", municipality: "York Township" };
  }

  // Default fallback
  return { county: "York", municipality: "Warrington Township" };
}
