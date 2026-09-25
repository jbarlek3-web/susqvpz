import { gunzipSync } from "node:zlib";
import { buildParcelIndex, type ParcelIndex } from "./york-parcel-index.ts";

let pending: Promise<ParcelIndex> | null = null;

async function readIndexGzip() {
  const { readFile } = await import("node:fs/promises");
  const { fileURLToPath } = await import("node:url");
  const { join } = await import("node:path");
  const candidates = [
    fileURLToPath(new URL("./data/york-parcel-index/index.json.gz", import.meta.url)),
    join(process.cwd(), "src/lib/data/york-parcel-index/index.json.gz"),
  ];
  for (const path of candidates) {
    try {
      return await readFile(path);
    } catch {
      // Try the next location. Production reads the Nitro server asset below.
    }
  }

  try {
    const storage = await import("nitro/storage");
    const readServerAsset = storage.useStorage;
    const raw = await readServerAsset("assets:york-parcels").getItemRaw("index.json.gz");
    if (raw) return Buffer.from(raw);
  } catch {
    // Nitro storage is only mounted in the built server.
  }

  throw new Error(
    "York parcel index is missing. Run: python scripts/build-york-parcel-index.py",
  );
}

export function loadYorkParcelIndex() {
  if (!pending) {
    pending = readIndexGzip()
      .then((bytes) => {
        const payload = JSON.parse(gunzipSync(bytes).toString("utf8")) as { rows?: unknown[][] };
        if (!Array.isArray(payload.rows)) throw new Error("York parcel index is invalid");
        return buildParcelIndex(payload.rows);
      })
      .catch((error) => {
        pending = null;
        throw error;
      });
  }
  return pending;
}
