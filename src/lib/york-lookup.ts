import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { findDistrict, prettyMuni, type YorkZoningDistrict } from "@/lib/data/york-zoning";
import { authMiddleware } from "@/lib/auth/middleware";
import { requirePro } from "@/lib/entitlement.server";
import { consumeRateLimit } from "@/lib/rate-limit.server";
import { getParcel } from "@/lib/data/parcels";
import {
  isLikelyApnOrPin,
  detectCountyAndMuni,
  YORK_DISTRICT_TO_MUNI,
} from "@/lib/data/pa-geography";
import {
  ambiguousParcelMessage,
  assessmentParcel,
  decideParcelQuery,
  searchParcelRecords,
  toSuggestions,
  type ParcelRow,
  type YorkParcelSuggestion,
} from "@/lib/york-parcel-index";

export type { YorkParcelSuggestion };

const CENSUS = "https://geocoding.geo.census.gov/geocoder/locations/onelineaddress";
const PARCELS =
  "https://arcweb1.ycpc.org/server/rest/services/OPEN_DATA/Parcels/FeatureServer/0/query";
const ZONING = "https://arcweb1.ycpc.org/server/rest/services/OPEN_DATA/Zoning/MapServer/0/query";

export type YorkLookup = {
  matchedAddress: string;
  lat: number;
  lng: number;
  /** False when the assessment record is known but could not be placed on the map. */
  placed?: boolean;
  parcel: {
    pidn: string | null;
    address: string | null;
    owner: string | null;
    acres: number | null;
    class: string | null;
    school: string | null;
    landUse: string | null;
    assessed?: number | null;
    landValue?: number | null;
    buildingValue?: number | null;
    saleDate?: string | null;
    salePrice?: number | null;
    yearBuilt?: number | null;
    livingArea?: number | null;
    deed?: string | null;
    utility?: string | null;
    style?: string | null;
    mailAddress?: string | null;
    source?: "assessment-roll" | "gis" | "demo";
  } | null;
  zoning: {
    municipality: string | null;
    municipalityPretty: string | null;
    zcode: string | null;
    zname: string | null;
    ztype: string | null;
    gcode: string | null;
    gname: string | null;
    join: string | null;
  } | null;
  district: YorkZoningDistrict | null;
};

async function jsonOrNull(url: string) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8_000) });
    if (!res.ok) return null;
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function attrs(json: Record<string, unknown> | null): Record<string, unknown> | null {
  const features = json?.features as Array<{ attributes?: Record<string, unknown> }> | undefined;
  return features?.[0]?.attributes ?? null;
}

function computeCentroid(geometry: unknown): { lat: number; lng: number } | null {
  const geom = geometry as { rings?: number[][][] } | undefined;
  if (!geom?.rings || !Array.isArray(geom.rings) || geom.rings.length === 0) {
    return null;
  }
  const ring = geom.rings[0];
  if (!Array.isArray(ring) || ring.length === 0) return null;
  let sumX = 0;
  let sumY = 0;
  let count = 0;
  for (const pt of ring) {
    if (Array.isArray(pt) && pt.length >= 2) {
      sumX += pt[0];
      sumY += pt[1];
      count++;
    }
  }
  if (count === 0) return null;
  return { lng: sumX / count, lat: sumY / count };
}

function pointGeom(lng: number, lat: number) {
  return encodeURIComponent(JSON.stringify({ x: lng, y: lat, spatialReference: { wkid: 4326 } }));
}

async function queryYcpcParcelsByWhere(whereClause: string) {
  const url = `${PARCELS}?where=${encodeURIComponent(whereClause)}&outFields=PIDN,PROPADR,OWNER_FULL,ACRES,CLASS,SCHOOL_DIS,LUC,DISTRICT&returnGeometry=true&outSR=4326&f=json`;
  return await jsonOrNull(url);
}

async function zoningAt(lng: number, lat: number) {
  const zoningUrl = `${ZONING}?geometry=${pointGeom(lng, lat)}&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects&outFields=MUNI_NAME,DISTRICT,ZCODE,ZNAME,ZTYPE,GEN_ZCODE,GEN_ZNAME,JOIN_FIELD&returnGeometry=false&f=json`;
  return attrs(await jsonOrNull(zoningUrl));
}

async function censusPoint(address: string) {
  const withState = /,\s*PA\b/i.test(address) ? address : `${address}, York County, PA`;
  const geoUrl = `${CENSUS}?address=${encodeURIComponent(withState)}&benchmark=Public_AR_Current&vintage=Current_Current&format=json`;
  const geo = await jsonOrNull(geoUrl);
  const match = (
    geo as {
      result?: {
        addressMatches?: Array<{
          coordinates?: { x: number; y: number };
          addressComponents?: { state?: string };
        }>;
      };
    }
  )?.result?.addressMatches?.[0];
  if (!match?.coordinates) return null;
  const state = (match.addressComponents?.state ?? "").toUpperCase();
  if (state && state !== "PA") return null;
  return { lat: match.coordinates.y, lng: match.coordinates.x };
}

/** Assessment-roll attributes win. GIS is used only to place the parcel and read zoning. */
async function lookupFromAssessment(row: ParcelRow): Promise<YorkLookup> {
  let lat = 0;
  let lng = 0;
  let placed = false;
  let zoning: Record<string, unknown> | null = null;

  if (/^[A-Z0-9]{13}$/.test(row.pidn)) {
    const res = await queryYcpcParcelsByWhere(`PIDN = '${row.pidn}'`);
    const feats = res?.features as Array<{ geometry?: unknown }> | undefined;
    const centroid = feats?.[0] ? computeCentroid(feats[0].geometry) : null;
    if (centroid) {
      lat = centroid.lat;
      lng = centroid.lng;
      placed = true;
      zoning = await zoningAt(lng, lat);
    }
  }

  if (!placed && row.address) {
    const point = await censusPoint(row.address);
    if (point) {
      lat = point.lat;
      lng = point.lng;
      placed = true;
      zoning = await zoningAt(lng, lat);
    }
  }

  const muni = zoning ? String(zoning.MUNI_NAME ?? "") : "";
  const zcode = zoning ? String(zoning.ZCODE ?? "") : "";
  const join = zoning ? String(zoning.JOIN_FIELD ?? "") : "";
  const district = muni ? findDistrict(muni, zcode, join) : null;
  const place = muni ? prettyMuni(muni) : null;

  return {
    matchedAddress: row.address
      ? `${row.address}${place ? `, ${place}` : ""}, York County, PA`
      : row.pidn,
    lat,
    lng,
    placed,
    parcel: assessmentParcel(row),
    zoning: zoning
      ? {
          municipality: muni || null,
          municipalityPretty: place,
          zcode: zcode || null,
          zname: zoning.ZNAME != null ? String(zoning.ZNAME) : null,
          ztype: zoning.ZTYPE != null ? String(zoning.ZTYPE) : null,
          gcode: zoning.GEN_ZCODE != null ? String(zoning.GEN_ZCODE) : null,
          gname: zoning.GEN_ZNAME != null ? String(zoning.GEN_ZNAME) : null,
          join: join || null,
        }
      : null,
    district,
  };
}

export const searchYorkParcels = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => z.object({ q: z.string().min(2).max(160) }).parse(input))
  .handler(async ({ data, context }): Promise<{ ok: true; matches: YorkParcelSuggestion[] }> => {
    await requirePro();
    await consumeRateLimit({
      action: "parcel-lookup",
      subject: context.userId,
      max: 120,
      windowSeconds: 60,
    });
    try {
      const { loadYorkParcelIndex } = await import("@/lib/york-parcel-index.server");
      const index = await loadYorkParcelIndex();
      return { ok: true, matches: toSuggestions(searchParcelRecords(index, data.q.trim(), 8)) };
    } catch (error) {
      console.error("[york-parcels] search failed", error);
      return { ok: true, matches: [] };
    }
  });

export const lookupYorkAddress = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => z.object({ q: z.string().min(3).max(160) }).parse(input))
  .handler(
    async ({
      data,
      context,
    }): Promise<{ ok: true; result: YorkLookup } | { ok: false; error: string }> => {
      await requirePro();
      await consumeRateLimit({
        action: "parcel-lookup",
        subject: context.userId,
        max: 120,
        windowSeconds: 60,
      });

      const q = data.q.trim();

      // 1. Check local pre-seeded parcels first (supports exact or normalized APN & ID)
      const local = getParcel(q);
      if (local) {
        const district = findDistrict(local.municipality, local.zoning);
        return {
          ok: true,
          result: {
            matchedAddress: `${local.address}, ${local.municipality}, ${local.county} County, PA`,
            lat: local.lat,
            lng: local.lng,
            parcel: {
              pidn: local.apn,
              address: local.address,
              owner: local.owner,
              acres: local.acres,
              class: "Commercial/Residential",
              school: null,
              landUse: local.zoningName,
            },
            zoning: {
              municipality: local.municipality,
              municipalityPretty: local.municipality,
              zcode: local.zoning,
              zname: local.zoningName,
              ztype: "R",
              gcode: "R",
              gname: local.zoningName,
              join: null,
            },
            district,
          },
        };
      }

      // York assessment roll (Parcels_.xlsx) is the authority for owner, address,
      // acres, and assessed value. Fuzzy GIS LIKE queries stay the fallback.
      try {
        const { loadYorkParcelIndex } = await import("@/lib/york-parcel-index.server");
        const index = await loadYorkParcelIndex();
        const decision = decideParcelQuery(index, q);
        if (decision.kind === "ambiguous") {
          return { ok: false, error: ambiguousParcelMessage(q, decision.matches) };
        }
        if (decision.kind === "exact") {
          return { ok: true, result: await lookupFromAssessment(decision.row) };
        }
      } catch (error) {
        console.error("[york-parcels] assessment lookup failed", error);
      }

      let matchedFeature: {
        attributes: Record<string, unknown>;
        geometry?: unknown;
      } | null = null;
      let matchedCentroid: { lat: number; lng: number } | null = null;

      // 2. If input is likely an APN / Parcel PIN, search YCPC Parcel FeatureServer by PIN
      const cleanUpper = q.toUpperCase();
      const digitsOnly = cleanUpper.replace(/[^A-Z0-9]/g, "");

      if (isLikelyApnOrPin(q)) {
        // Tier 1: Exact 13-digit PIDN (or sliced 18-char York PIN ending in 00000)
        let target13: string | null = null;
        if (digitsOnly.length === 13) {
          target13 = digitsOnly;
        } else if (digitsOnly.length >= 14 && digitsOnly.endsWith("00000")) {
          target13 = digitsOnly.slice(0, 13);
        }

        if (target13) {
          const res = await queryYcpcParcelsByWhere(`PIDN = '${target13}'`);
          const feats = res?.features as Array<{ attributes: Record<string, unknown>; geometry?: unknown }> | undefined;
          if (feats && feats.length > 0) {
            matchedFeature = feats[0];
            matchedCentroid = computeCentroid(matchedFeature.geometry);
          }
        }

        // Tier 2: Structured District/Map/Parcel (e.g. 49-05-13 or 49-000-05-0013)
        if (!matchedFeature) {
          const parts = cleanUpper.split(/[-.\s]+/).filter(Boolean);
          if (parts.length >= 2 && /^\d{1,2}$/.test(parts[0])) {
            const dist = parts[0].padStart(2, "0");
            if (parts.length === 3) {
              const map = parts[1].padStart(2, "0");
              const pNum = parts[2];
              const res = await queryYcpcParcelsByWhere(
                `DISTRICT = '${dist}' AND MAP = '${map}' AND PARCEL LIKE '%${pNum}%'`,
              );
              const feats = res?.features as Array<{ attributes: Record<string, unknown>; geometry?: unknown }> | undefined;
              if (feats && feats.length > 0) {
                matchedFeature = feats[0];
                matchedCentroid = computeCentroid(matchedFeature.geometry);
              }
            } else {
              const nonZero = parts.filter((p) => p !== "000" && p !== "00" && p !== "00000");
              if (nonZero.length > 0) {
                const res = await queryYcpcParcelsByWhere(`PIDN LIKE '%${nonZero.join("%")}%'`);
                const feats = res?.features as Array<{ attributes: Record<string, unknown>; geometry?: unknown }> | undefined;
                if (feats && feats.length > 0) {
                  matchedFeature = feats[0];
                  matchedCentroid = computeCentroid(matchedFeature.geometry);
                }
              }
            }
          }
        }

        // Tier 3: Partial PIDN match if length >= 6
        if (!matchedFeature && digitsOnly.length >= 6) {
          const res = await queryYcpcParcelsByWhere(`PIDN LIKE '%${digitsOnly}%'`);
          const feats = res?.features as Array<{ attributes: Record<string, unknown>; geometry?: unknown }> | undefined;
          if (feats && feats.length > 0) {
            matchedFeature = feats[0];
            matchedCentroid = computeCentroid(matchedFeature.geometry);
          }
        }
      }

      // 3. If still not matched, try Direct Street Address query on YCPC Parcels
      if (!matchedFeature) {
        const numStreetMatch = q.match(/^(\d+)\s+([A-Za-z0-9]+)/);
        if (numStreetMatch) {
          const num = numStreetMatch[1];
          const street = numStreetMatch[2].toUpperCase();
          const res = await queryYcpcParcelsByWhere(`PROPADR LIKE '%${num}%${street}%'`);
          const feats = res?.features as Array<{ attributes: Record<string, unknown>; geometry?: unknown }> | undefined;
          if (feats && feats.length > 0) {
            matchedFeature = feats[0];
            matchedCentroid = computeCentroid(matchedFeature.geometry);
          }
        }
      }

      // 4. If direct YCPC query succeeded, retrieve authoritative zoning at parcel centroid
      if (matchedFeature && matchedCentroid) {
        const parcel = matchedFeature.attributes;
        const geom = pointGeom(matchedCentroid.lng, matchedCentroid.lat);
        const zoningUrl = `${ZONING}?geometry=${geom}&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects&outFields=MUNI_NAME,DISTRICT,ZCODE,ZNAME,ZTYPE,GEN_ZCODE,GEN_ZNAME,JOIN_FIELD&returnGeometry=false&f=json`;
        const zoningJson = await jsonOrNull(zoningUrl);
        const zoning = attrs(zoningJson);

        const distCode = String(parcel.DISTRICT ?? "");
        const fallbackMuni = distCode in YORK_DISTRICT_TO_MUNI ? YORK_DISTRICT_TO_MUNI[distCode] : null;

        const muni = zoning ? String(zoning.MUNI_NAME ?? "") : fallbackMuni || "";
        const zcode = zoning ? String(zoning.ZCODE ?? "") : "";
        const join = zoning ? String(zoning.JOIN_FIELD ?? "") : "";
        const district = findDistrict(muni, zcode, join);

        return {
          ok: true,
          result: {
            matchedAddress: String(parcel.PROPADR ?? q),
            lat: matchedCentroid.lat,
            lng: matchedCentroid.lng,
            parcel: {
              pidn: parcel.PIDN != null ? String(parcel.PIDN) : null,
              address: parcel.PROPADR != null ? String(parcel.PROPADR) : null,
              owner: parcel.OWNER_FULL != null ? String(parcel.OWNER_FULL) : null,
              acres: parcel.ACRES != null ? Number(parcel.ACRES) : null,
              class: parcel.CLASS != null ? String(parcel.CLASS) : null,
              school: parcel.SCHOOL_DIS != null ? String(parcel.SCHOOL_DIS) : null,
              landUse: parcel.LUC != null ? String(parcel.LUC) : null,
            },
            zoning: zoning || fallbackMuni
              ? {
                  municipality: muni || fallbackMuni,
                  municipalityPretty: muni ? prettyMuni(muni) : fallbackMuni,
                  zcode: zcode || null,
                  zname: zoning?.ZNAME != null ? String(zoning.ZNAME) : null,
                  ztype: zoning?.ZTYPE != null ? String(zoning.ZTYPE) : null,
                  gcode: zoning?.GEN_ZCODE != null ? String(zoning.GEN_ZCODE) : null,
                  gname: zoning?.GEN_ZNAME != null ? String(zoning.GEN_ZNAME) : null,
                  join: join || null,
                }
              : null,
            district,
          },
        };
      }

      // 5. Fallback to US Census Geocoder if direct parcel lookup didn't match
      const withState = /,\s*PA\b/i.test(q) || /\bPennsylvania\b/i.test(q) ? q : `${q}, PA`;
      const geoUrl = `${CENSUS}?address=${encodeURIComponent(withState)}&benchmark=Public_AR_Current&vintage=Current_Current&format=json`;
      const geo = await jsonOrNull(geoUrl);
      const matches = (
        geo as {
          result?: {
            addressMatches?: Array<{
              matchedAddress?: string;
              coordinates?: { x: number; y: number };
              addressComponents?: { city?: string; state?: string; zip?: string };
            }>;
          };
        }
      )?.result?.addressMatches;
      const match = matches?.[0];

      if (!match?.coordinates) {
        // If Census failed and query was an APN, provide helpful APN error
        if (isLikelyApnOrPin(q)) {
          return {
            ok: false,
            error: `APN "${q}" not found in York County parcel records. Check district or parcel numbers.`,
          };
        }
        return {
          ok: false,
          error: "No Census or parcel match. Try a full street address or APN in South Central PA.",
        };
      }

      const city = (match.addressComponents?.city ?? "").toUpperCase();
      const state = (match.addressComponents?.state ?? "").toUpperCase();
      if (state && state !== "PA") {
        return { ok: false, error: "That address is outside Pennsylvania." };
      }

      const lat = match.coordinates.y;
      const lng = match.coordinates.x;
      const geom = pointGeom(lng, lat);

      // Query YCPC Parcels and Zoning at geocoded coordinates
      const parcelUrl = `${PARCELS}?geometry=${geom}&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects&outFields=PIDN,PROPADR,OWNER_FULL,ACRES,CLASS,SCHOOL_DIS,LUC,DISTRICT&returnGeometry=false&f=json`;
      const zoningUrl = `${ZONING}?geometry=${geom}&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects&outFields=MUNI_NAME,DISTRICT,ZCODE,ZNAME,ZTYPE,GEN_ZCODE,GEN_ZNAME,JOIN_FIELD&returnGeometry=false&f=json`;

      const [firstParcelJson, zoningJson] = await Promise.all([
        jsonOrNull(parcelUrl),
        jsonOrNull(zoningUrl),
      ]);
      let parcelJson = firstParcelJson;

      let parcel = attrs(parcelJson);
      const zoning = attrs(zoningJson);

      // If point missed due to street centerline offset, retry with 75-foot buffer
      if (!parcel) {
        const bufferedParcelUrl = `${PARCELS}?geometry=${geom}&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects&distance=75&units=esriSRUnit_Foot&outFields=PIDN,PROPADR,OWNER_FULL,ACRES,CLASS,SCHOOL_DIS,LUC,DISTRICT&returnGeometry=false&f=json`;
        parcelJson = await jsonOrNull(bufferedParcelUrl);
        parcel = attrs(parcelJson);
      }

      if (!parcel && !zoning) {
        // Check regional detection (e.g. Cumberland, Dauphin, Lancaster)
        const regional = detectCountyAndMuni(match.matchedAddress || q);
        if (regional && regional.county !== "York") {
          return {
            ok: true,
            result: {
              matchedAddress: match.matchedAddress ?? withState,
              lat,
              lng,
              parcel: null,
              zoning: {
                municipality: regional.municipality,
                municipalityPretty: regional.municipality,
                zcode: "SALDO-STD",
                zname: `${regional.municipality} (${regional.county} County)`,
                ztype: "R",
                gcode: "R",
                gname: "Residential / Agricultural",
                join: null,
              },
              district: null,
            },
          };
        }

        return {
          ok: false,
          error: city
            ? `Geocoded to ${match.matchedAddress}, but YCPC has no parcel/zoning at that point. Confirm it is inside York County.`
            : "No York County parcel or zoning at that point.",
        };
      }

      const distCode = parcel?.DISTRICT ? String(parcel.DISTRICT) : "";
      const fallbackMuni = distCode in YORK_DISTRICT_TO_MUNI ? YORK_DISTRICT_TO_MUNI[distCode] : null;

      const muni = zoning ? String(zoning.MUNI_NAME ?? "") : fallbackMuni || "";
      const zcode = zoning ? String(zoning.ZCODE ?? "") : "";
      const join = zoning ? String(zoning.JOIN_FIELD ?? "") : "";
      const district = findDistrict(muni, zcode, join);

      const result: YorkLookup = {
        matchedAddress: parcel?.PROPADR ? String(parcel.PROPADR) : match.matchedAddress ?? withState,
        lat,
        lng,
        parcel: parcel
          ? {
              pidn: parcel.PIDN != null ? String(parcel.PIDN) : null,
              address: parcel.PROPADR != null ? String(parcel.PROPADR) : null,
              owner: parcel.OWNER_FULL != null ? String(parcel.OWNER_FULL) : null,
              acres: parcel.ACRES != null ? Number(parcel.ACRES) : null,
              class: parcel.CLASS != null ? String(parcel.CLASS) : null,
              school: parcel.SCHOOL_DIS != null ? String(parcel.SCHOOL_DIS) : null,
              landUse: parcel.LUC != null ? String(parcel.LUC) : null,
            }
          : null,
        zoning: zoning || fallbackMuni
          ? {
              municipality: muni || fallbackMuni,
              municipalityPretty: muni ? prettyMuni(muni) : fallbackMuni,
              zcode: zcode || null,
              zname: zoning?.ZNAME != null ? String(zoning.ZNAME) : null,
              ztype: zoning?.ZTYPE != null ? String(zoning.ZTYPE) : null,
              gcode: zoning?.GEN_ZCODE != null ? String(zoning.GEN_ZCODE) : null,
              gname: zoning?.GEN_ZNAME != null ? String(zoning.GEN_ZNAME) : null,
              join: join || null,
            }
          : null,
        district,
      };

      return { ok: true, result };
    },
  );
