import { Link } from "@tanstack/react-router";
import {
  Car,
  Droplets,
  FolderPlus,
  Grid3x3,
  Home,
  Landmark,
  Layers,
  Map as MapIcon,
  Mountain,
  Plug,
  RotateCcw,
  Search,
  Truck,
  Warehouse,
  Waves,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ZONE_LEGEND } from "@/lib/data/zoning";
import { PARCELS } from "@/lib/data/parcels";
import { COUNTIES } from "@/lib/data/catalog";
import { useHub } from "@/lib/store";
import type { County, LayerId } from "@/lib/types";
import { cn } from "@/lib/utils";
import { YorkParcelSuggestList } from "@/components/map/york-parcel-suggestions";
import { lookupYorkAddress } from "@/lib/york-lookup";
import { useYorkParcelSuggestions } from "@/lib/use-york-parcel-search";
import { dimLabel, prettyMuni } from "@/lib/data/york-zoning";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

const LAYER_ITEMS: { id: LayerId; label: string; hint?: string; icon: typeof Layers }[] = [
  {
    id: "parcels",
    label: "Parcel Boundaries",
    hint: "York, Dauphin, Cumberland, Lancaster · zoom in",
    icon: Landmark,
  },
  {
    id: "yorkZoning",
    label: "York Zoning Districts",
    hint: "Live YCPC districts · 72 municipalities",
    icon: Layers,
  },
  {
    id: "municipalities",
    label: "PA Municipalities",
    hint: "PennDOT municipal boundaries",
    icon: MapIcon,
  },
  { id: "hydro", label: "Hydrography", hint: "USGS NHD streams and waterbodies", icon: Waves },
  { id: "soils", label: "Soils (SSURGO)", hint: "USDA / PASDA soil map units", icon: Mountain },
  { id: "topo", label: "USGS US Topo", hint: "National Map 7.5-minute topo series", icon: MapIcon },
  {
    id: "yorkPasda",
    label: "York PASDA Overlays",
    hint: "Streams, zoning, soils, parks, easements",
    icon: Layers,
  },
  { id: "footprints", label: "Building Footprints", icon: Home },
  { id: "zoning", label: "Zoning Overlays", icon: Layers },
  { id: "flood", label: "Floodplain Overlays", icon: Droplets },
  {
    id: "femaFlood",
    label: "FEMA Flood Hazard Zones",
    hint: "Official NFHL · zoom in",
    icon: Droplets,
  },
  {
    id: "inundation",
    label: "Inundation Vulnerability",
    hint: "Includes bridge-specific risk scores",
    icon: Waves,
  },
  { id: "slopes", label: "Steep Slope Overlays", icon: Mountain },
  { id: "ev", label: "EV Fast-Charger Density", icon: Plug },
  { id: "traffic", label: "Traffic Volume (AADT)", icon: Car },
  { id: "buggy", label: "Horse-and-Buggy Zones", hint: "Lancaster / York", icon: Car },
  {
    id: "improvements",
    label: "Planned Roadway Improvements",
    hint: "Projected completion dates",
    icon: Truck,
  },
  { id: "logistics", label: "Intermodal Logistics Hubs", icon: Warehouse },
  { id: "bridges", label: "Bridge Clearance Risk", icon: Waves },
  { id: "water", label: "Public Water Mains", icon: Droplets },
  { id: "sewer", label: "Public Sewer Mains", icon: Droplets },
];

export function MapPanel() {
  const { user, isPending } = useCurrentUserState();
  const county = useHub((s) => s.county);
  const setCounty = useHub((s) => s.setCounty);
  const layers = useHub((s) => s.layers);
  const toggleLayer = useHub((s) => s.toggleLayer);
  const resetLayers = useHub((s) => s.resetLayers);
  const query = useHub((s) => s.query);
  const setQuery = useHub((s) => s.setQuery);
  const floodFt = useHub((s) => s.floodFt);
  const setFloodFt = useHub((s) => s.setFloodFt);
  const batchMode = useHub((s) => s.batchMode);
  const setBatchMode = useHub((s) => s.setBatchMode);
  const selectedIds = useHub((s) => s.selectedIds);
  const batchName = useHub((s) => s.batchName);
  const setBatchName = useHub((s) => s.setBatchName);
  const saveBatchAsProject = useHub((s) => s.saveBatchAsProject);
  const selected = PARCELS.filter((p) => selectedIds.includes(p.id));
  const primary = selected[0];
  const [minAc, setMinAc] = useState("");
  const [maxAc, setMaxAc] = useState("");
  const lookup = useHub((s) => s.lookup);
  const lookupBusy = useHub((s) => s.lookupBusy);
  const lookupError = useHub((s) => s.lookupError);
  const setLookupBusy = useHub((s) => s.setLookupBusy);
  const setLookupResult = useHub((s) => s.setLookupResult);
  const clearLookup = useHub((s) => s.clearLookup);
  const yorkMatches = useYorkParcelSuggestions(query);

  async function runLookup(value: string) {
    if (isPending) return;
    if (!user) {
      toast.message("Sign in to use live parcel lookup");
      window.location.assign("/login");
      return;
    }
    const q = value.trim();
    if (q.length < 3) {
      toast.error("Enter a street address or APN/PINID");
      return;
    }
    setLookupBusy(true);
    setCounty("York");
    try {
      const res = await lookupYorkAddress({ data: { q } });
      if (res.ok) setLookupResult(res.result);
      else setLookupResult(null, res.error);
    } catch {
      setLookupResult(null, "Lookup failed. Try again.");
    }
  }

  const filteredHint =
    minAc || maxAc
      ? PARCELS.filter((p) => {
          const min = Number(minAc) || 0;
          const max = Number(maxAc) || 1e9;
          return p.acres >= min && p.acres <= max;
        }).length
      : null;

  return (
    <aside className="flex h-full w-full flex-col overflow-y-auto border-r border-outline-variant bg-card">
      <div className="border-b border-outline-variant p-4">
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
          Property Search
        </p>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-on-surface-variant" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void runLookup(query);
            }}
            placeholder="Search address, owner, or PIN…"
            className="pl-9"
          />
          {yorkMatches.length > 0 && (
            <div className="mt-2 rounded-md border border-outline-variant bg-card">
              <YorkParcelSuggestList
                matches={yorkMatches}
                onPick={(pidn) => {
                  setQuery(pidn);
                  void runLookup(pidn);
                }}
              />
            </div>
          )}
        </div>
        <Button
          className="mt-2 w-full"
          size="sm"
          onClick={() => void runLookup(query)}
          disabled={lookupBusy}
        >
          {lookupBusy ? "Searching live GIS & parcels…" : "Search Address / APN"}
        </Button>
        {lookupError && <p className="mt-2 text-xs text-destructive">{lookupError}</p>}
        {lookup && (
          <div className="mt-3 rounded-md border border-outline-variant bg-surface-low p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                {lookup.parcel?.source === "assessment-roll"
                  ? "York assessment roll"
                  : lookup.parcel
                    ? "Verified Parcel Match"
                    : "Regional Geocoded Match"}
              </span>
              {lookup.parcel?.acres != null && (
                <span className="text-[11px] font-semibold text-foreground">
                  {lookup.parcel.acres.toFixed(2)} ac
                </span>
              )}
            </div>
            <div className="font-semibold text-foreground mt-1">
              {lookup.parcel?.address || lookup.matchedAddress}
            </div>
            {lookup.parcel?.pidn && (
              <div className="font-mono text-xs text-muted-foreground">
                APN/PIN: {lookup.parcel.pidn}
              </div>
            )}
            {lookup.parcel?.owner && (
              <div className="text-xs text-muted-foreground truncate">
                Owner: {lookup.parcel.owner}
              </div>
            )}
            <AssessmentFacts parcel={lookup.parcel} />
            {lookup.zoning && (
              <div className="mt-2 rounded bg-surface/50 p-2 text-xs border border-border/40">
                <div className="font-semibold text-foreground">
                  {lookup.zoning.zcode} — {lookup.zoning.zname}
                </div>
                <div className="text-primary font-medium">
                  {lookup.zoning.municipalityPretty || prettyMuni(lookup.zoning.municipality ?? "")}
                </div>
                {lookup.district && (
                  <div className="mt-1 text-muted-foreground text-[11px]">
                    Front {dimLabel(lookup.district.front, "ft")} · Side{" "}
                    {dimLabel(lookup.district.side, "ft")}
                    <br />
                    Min lot {dimLabel(lookup.district.lot, "sf")} · Height{" "}
                    {dimLabel(lookup.district.height, "ft")}
                  </div>
                )}
              </div>
            )}
            <div className="mt-2.5 flex items-center justify-between pt-1 border-t border-border/30">
              <Link
                to="/aide"
                search={{
                  municipality: lookup.zoning?.municipalityPretty || lookup.zoning?.municipality || undefined,
                  county: "York",
                }}
                className="text-[11px] font-semibold text-primary hover:underline"
              >
                Launch Aide →
              </Link>
              <button
                className="text-[11px] font-medium text-muted-foreground hover:text-foreground"
                onClick={clearLookup}
              >
                Clear match
              </button>
            </div>
          </div>
        )}
        <p className="mt-3 mb-1.5 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
          Select County
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          {(["all", ...COUNTIES] as const).map((c) => (
            <button
              key={c}
              onClick={() => setCounty(c === "all" ? "all" : (c as County))}
              className={cn(
                "rounded-full px-2.5 py-1.5 text-xs font-semibold transition-all duration-150 border",
                county === c
                  ? "bg-transparent text-on-surface font-bold border-orange-500/60 shadow-[0_0_12px_rgba(249,115,22,0.35)]"
                  : "bg-transparent text-muted-foreground hover:text-foreground border-border/60 hover:border-border",
              )}
            >
              {c === "all" ? "All" : c}
            </button>
          ))}
        </div>
      </div>

      <div className="border-b border-outline-variant p-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
            Map Layers
          </p>
          <button
            onClick={resetLayers}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary-container"
          >
            <RotateCcw className="size-3" /> Reset
          </button>
        </div>
        <ul className="space-y-2">
          {LAYER_ITEMS.map((item) => (
            <li key={item.id} className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2">
                <item.icon className="mt-0.5 size-4 text-on-surface-variant" />
                <div>
                  <div className="text-sm font-medium">{item.label}</div>
                  {item.hint && (
                    <div className="text-[11px] text-muted-foreground">{item.hint}</div>
                  )}
                </div>
              </div>
              <Switch
                checked={
                  item.id === "parcels"
                    ? (layers.parcels ?? layers.yorkParcels) !== false
                    : Boolean(layers[item.id])
                }
                onCheckedChange={() => toggleLayer(item.id)}
              />
            </li>
          ))}
        </ul>
      </div>

      {(layers.inundation || layers.flood) && (
        <div className="border-b border-outline-variant p-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
            Flood Impact Projection
          </p>
          <div className="grid grid-cols-4 gap-1">
            {([0, 1, 3, 5] as const).map((n) => (
              <button
                key={n}
                onClick={() => setFloodFt(n)}
                className={cn(
                  "rounded-full py-1.5 text-xs font-semibold transition-all duration-150 border",
                  floodFt === n
                    ? "bg-transparent text-on-surface font-bold border-orange-500/60 shadow-[0_0_12px_rgba(249,115,22,0.35)]"
                    : "bg-transparent text-muted-foreground hover:text-foreground border-border/60 hover:border-border",
                )}
              >
                {n === 0 ? "Current" : `+${n}ft`}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Simulating extreme precipitation based on NOAA 2024 projections.
          </p>
        </div>
      )}

      <div className="border-b border-outline-variant p-4">
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
          Zoning Classification & Legend
        </p>
        <ul className="space-y-1.5">
          {ZONE_LEGEND.map((z) => (
            <li key={z.label} className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2">
                <span className="size-2.5 rounded-sm" style={{ background: z.color }} />
                {z.label}
              </span>
              <span className="font-mono tabular-nums text-on-surface-variant">
                {z.count.toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="border-b border-outline-variant p-4">
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
          Advanced Filters
        </p>
        <div className="grid grid-cols-2 gap-2">
          <Input
            value={minAc}
            onChange={(e) => setMinAc(e.target.value)}
            placeholder="Min ac"
            inputMode="decimal"
          />
          <Input
            value={maxAc}
            onChange={(e) => setMaxAc(e.target.value)}
            placeholder="Max ac"
            inputMode="decimal"
          />
        </div>
        {filteredHint !== null && (
          <p className="mt-2 text-[11px] text-muted-foreground">{filteredHint} parcels in range</p>
        )}
        <label className="mt-3 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={batchMode}
            onChange={(e) => setBatchMode(e.target.checked)}
            className="size-4 accent-primary-container"
          />
          Select multiple parcels
        </label>
      </div>

      {selected.length > 0 && primary && (
        <div className="p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
              {selected.length} Parcel{selected.length > 1 ? "s" : ""} Selected
            </p>
          </div>
          {selected.length > 1 && (
            <div className="mb-3 flex gap-2">
              <Input
                value={batchName}
                onChange={(e) => setBatchName(e.target.value)}
                placeholder="Batch name"
              />
              <Button
                size="sm"
                onClick={() => {
                  const name = batchName.trim() || "Untitled batch";
                  saveBatchAsProject(name);
                  toast.success(`Saved “${name}” to projects`);
                }}
              >
                <FolderPlus className="size-4" />
                Save
              </Button>
            </div>
          )}
          <ul className="mb-3 space-y-1 text-sm">
            {selected.map((p) => (
              <li key={p.id} className="flex justify-between gap-2">
                <span>{p.address}</span>
                <span className="font-mono text-xs text-on-surface-variant">{p.zoning}</span>
              </li>
            ))}
          </ul>
          {selected.length > 1 && (
            <div className="mb-3 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-on-surface-variant">
                  <tr>
                    <th className="py-1 font-medium">Address</th>
                    <th className="font-medium">Setbacks</th>
                    <th className="font-medium">ROI</th>
                    <th className="font-medium">u/ac</th>
                  </tr>
                </thead>
                <tbody>
                  {selected.map((p) => (
                    <tr key={p.id} className="border-t border-outline-variant">
                      <td className="py-1">{p.address.split(" ")[0]}</td>
                      <td>
                        {p.setbacks.front}/{p.setbacks.side}/{p.setbacks.rear}
                      </td>
                      <td>{p.roiPct}%</td>
                      <td>{p.densityUa}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="rounded-md bg-surface-low p-3">
            <div className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
              Zoning Classification
            </div>
            <div className="mt-1 text-lg font-semibold">
              {primary.zoning}{" "}
              <span className="text-sm font-normal text-on-surface-variant">
                {primary.zoningName}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{primary.zoningSummary}</p>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div>Front {primary.setbacks.front} ft</div>
              <div>Side {primary.setbacks.side} ft</div>
              <div>Rear {primary.setbacks.rear} ft</div>
              <div>Max height {primary.maxHeight} ft</div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="font-mono text-sm font-semibold">
                  {primary.footprintSf.toLocaleString()}
                </div>
                <div className="text-[10px] uppercase text-on-surface-variant">Footprint</div>
              </div>
              <div>
                <div className="font-mono text-sm font-semibold">{primary.lotCoveragePct}%</div>
                <div className="text-[10px] uppercase text-on-surface-variant">Coverage</div>
              </div>
              <div>
                <div className="font-mono text-sm font-semibold">
                  {primary.buildableSf.toLocaleString()}
                </div>
                <div className="text-[10px] uppercase text-on-surface-variant">Buildable</div>
              </div>
            </div>
          </div>
          {layers.bridges && (
            <div className="mt-3 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs">
              <div className="font-semibold">Bridge Vulnerability</div>
              <div className="mt-1">Vertical clearance 14' 6" · Horizontal 42'</div>
              <div>Risk score 8.2/10 (High Priority)</div>
              {floodFt >= 3 && <div>Projected risk (+3ft): 9.4/10</div>}
              {floodFt >= 3 && (
                <div className="mt-1">
                  Estimated loss $1.2M–$4.5M · Business interruption 72 hours
                </div>
              )}
            </div>
          )}
          <div className="mt-3 flex flex-col gap-2">
            <Button asChild>
              <Link to="/parcels/$id" params={{ id: primary.id }}>
                View Feasibility Report
              </Link>
            </Button>
          </div>
        </div>
      )}
    </aside>
  );
}

export function MapToolbar() {
  const satellite = useHub((s) => s.satellite);
  const setSatellite = useHub((s) => s.setSatellite);
  const layers = useHub((s) => s.layers);
  const toggleLayer = useHub((s) => s.toggleLayer);

  const getPillClass = (active: boolean) =>
    cn(
      "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-150 border",
      active
        ? "bg-transparent text-on-surface font-bold border-orange-500/60 shadow-[0_0_12px_rgba(249,115,22,0.35)]"
        : "bg-transparent text-muted-foreground hover:text-foreground border-border/60 hover:border-border",
    );

  return (
    <div className="pointer-events-auto absolute right-3 top-3 z-[400] flex flex-col gap-1.5 rounded-2xl border border-outline-variant/70 bg-card/90 p-1.5 shadow-lg backdrop-blur-md">
      <button
        onClick={() => setSatellite(false)}
        className={getPillClass(!satellite)}
      >
        <Grid3x3 className="size-3.5 text-orange-500" /> Base
      </button>
      <button
        onClick={() => setSatellite(true)}
        className={getPillClass(satellite)}
      >
        Satellite
      </button>
      <button
        onClick={() => toggleLayer("parcels")}
        className={getPillClass((layers.parcels ?? layers.yorkParcels) !== false)}
      >
        Parcels
      </button>
      <button
        onClick={() => toggleLayer("yorkZoning")}
        className={getPillClass(layers.yorkZoning !== false)}
      >
        York zoning
      </button>
      <button
        onClick={() => toggleLayer("zoning")}
        className={getPillClass(Boolean(layers.zoning))}
      >
        Zoning
      </button>
    </div>
  );
}

function money(value: number) {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function AssessmentFacts({
  parcel,
}: {
  parcel: {
    source?: string;
    class: string | null;
    assessed?: number | null;
    landValue?: number | null;
    buildingValue?: number | null;
    salePrice?: number | null;
    saleDate?: string | null;
    yearBuilt?: number | null;
    livingArea?: number | null;
    deed?: string | null;
    school: string | null;
    mailAddress?: string | null;
    utility?: string | null;
  } | null;
}) {
  if (!parcel || parcel.source !== "assessment-roll") return null;
  return (
    <div className="mt-2 space-y-0.5 text-xs text-muted-foreground">
      {parcel.class && <div>Class: {parcel.class}</div>}
      {parcel.assessed != null && <div>Assessed: {money(parcel.assessed)}</div>}
      {(parcel.landValue != null || parcel.buildingValue != null) && (
        <div>
          Land {parcel.landValue != null ? money(parcel.landValue) : "—"} · Building{" "}
          {parcel.buildingValue != null ? money(parcel.buildingValue) : "—"}
        </div>
      )}
      {parcel.salePrice != null && (
        <div>
          Last sale: {money(parcel.salePrice)}
          {parcel.saleDate ? ` on ${parcel.saleDate}` : ""}
        </div>
      )}
      {parcel.yearBuilt != null && <div>Year built: {parcel.yearBuilt}</div>}
      {parcel.livingArea != null && (
        <div>Living area: {parcel.livingArea.toLocaleString()} sf</div>
      )}
      {parcel.utility && <div>Utilities: {parcel.utility}</div>}
      {parcel.deed && <div>Deed book/page: {parcel.deed}</div>}
      {parcel.school && <div>School district: {parcel.school}</div>}
      {parcel.mailAddress && <div className="truncate">Mail: {parcel.mailAddress}</div>}
    </div>
  );
}
