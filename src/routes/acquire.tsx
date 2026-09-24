import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Bot,
  Building,
  CheckCircle2,
  ChevronDown,
  Database,
  DollarSign,
  ExternalLink,
  FileCheck2,
  FileSearch,
  Filter,
  Layers3,
  MapPin,
  Plus,
  RefreshCw,
  Scale,
  ShieldAlert,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useHub } from "@/lib/store";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { PARCELS, parcelsByCounty } from "@/lib/data/parcels";
import type { County, Parcel } from "@/lib/types";
import {
  assessParcelFeasibility,
  COUNTY_BENCHMARKS,
  OBJECTIVE_LABELS,
  type DevelopmentObjective,
  type ParcelFeasibilityAssessment,
} from "@/lib/feasibility/feasibility-engine";
import { ParcelCompareGrid } from "@/components/feasibility/parcel-compare-grid";
import { FeasibilityReportTab } from "@/components/feasibility/feasibility-report-tab";
import { FEASIBILITY_DATA_GROUPS, FEASIBILITY_DATA_SOURCES } from "@/lib/data/feasibility-data";
import { DD_GROUPS, PERMIT_PATHS, SCREENING_CHECKS } from "@/lib/data/acquisition";

export interface AcquireSearch {
  parcelId?: string;
  tab?: string;
  compareId?: string;
}

export const Route = createFileRoute("/acquire")({
  validateSearch: (search: Record<string, unknown>): AcquireSearch => ({
    parcelId: typeof search.parcelId === "string" ? search.parcelId : undefined,
    tab: typeof search.tab === "string" ? search.tab : undefined,
    compareId: typeof search.compareId === "string" ? search.compareId : undefined,
  }),
  component: AcquireStudio,
});

const COUNTIES: Array<County | "all"> = ["all", "Cumberland", "Dauphin", "Lancaster", "York"];

const PRIMARY_MODES = [
  { id: "assessment", label: "Feasibility Studio" },
  { id: "report", label: "Deep AI & PDF Report" },
  { id: "reference", label: "Due Diligence & Data Register" },
] as const;

function money(val: number) {
  if (!Number.isFinite(val)) return "—";
  return val.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function AcquireStudio() {
  const search = Route.useSearch();
  const selectedIds = useHub((s) => s.selectedIds);
  const selectParcel = useHub((s) => s.selectParcel);

  // Sync search param with hub store
  useEffect(() => {
    if (search.parcelId) {
      selectParcel(search.parcelId);
    }
  }, [search.parcelId, selectParcel]);

  // Mode selection (Assessment studio vs Deep Report vs Reference)
  const [activeMode, setActiveMode] = useState<"assessment" | "report" | "reference">(() => {
    if (search.tab?.toLowerCase() === "report") return "report";
    if (search.tab?.toLowerCase() === "data" || search.tab?.toLowerCase() === "diligence") {
      return "reference";
    }
    return "assessment";
  });

  // County filter
  const [selectedCounty, setSelectedCounty] = useState<County | "all">("all");

  // Selected primary parcel
  const activeParcelId = useMemo(() => {
    if (search.parcelId && PARCELS.some((p) => p.id === search.parcelId)) {
      return search.parcelId;
    }
    const found = selectedIds.find((id) => PARCELS.some((p) => p.id === id));
    if (found) return found;
    return PARCELS[0]?.id ?? "";
  }, [search.parcelId, selectedIds]);

  const activeParcel = useMemo(() => {
    return PARCELS.find((p) => p.id === activeParcelId) ?? PARCELS[0]!;
  }, [activeParcelId]);

  // Comparison parcels state
  const [compareIds, setCompareIds] = useState<string[]>(() => {
    if (search.compareId && PARCELS.some((p) => p.id === search.compareId)) {
      return [search.compareId];
    }
    return [];
  });

  // Development objective
  const [objective, setObjective] = useState<DevelopmentObjective>("subdivision");

  // Financial overrides
  const [customAsp, setCustomAsp] = useState<number | undefined>(undefined);
  const [customSitework, setCustomSitework] = useState<number | undefined>(undefined);
  const [customLots, setCustomLots] = useState<number | undefined>(undefined);

  // Reset custom overrides when parcel or objective changes
  const handleParcelChange = (newId: string) => {
    selectParcel(newId);
    setCustomAsp(undefined);
    setCustomSitework(undefined);
    setCustomLots(undefined);
  };

  const handleObjectiveChange = (newObj: DevelopmentObjective) => {
    setObjective(newObj);
    setCustomLots(undefined);
  };

  // Filtered parcels list
  const filteredParcels = useMemo(() => {
    if (selectedCounty === "all") return PARCELS;
    return parcelsByCounty(selectedCounty);
  }, [selectedCounty]);

  // Feasibility assessment for active parcel
  const activeAssessment = useMemo(() => {
    return assessParcelFeasibility(activeParcel, objective, {
      customAsp,
      customSiteworkPerLot: customSitework,
      customTargetLots: customLots,
    });
  }, [activeParcel, objective, customAsp, customSitework, customLots]);

  // Feasibility assessments for all compared parcels
  const comparisonAssessments = useMemo(() => {
    const allIds = Array.from(new Set([activeParcel.id, ...compareIds]));
    return allIds
      .map((id) => PARCELS.find((p) => p.id === id))
      .filter((p): p is Parcel => Boolean(p))
      .map((p) => assessParcelFeasibility(p, objective));
  }, [activeParcel.id, compareIds, objective]);

  const toggleCompareParcel = (id: string) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      }
      return [...prev, id];
    });
  };

  const removeCompareParcel = (id: string) => {
    if (id === activeParcel.id) {
      const nextId = compareIds[0];
      if (nextId) {
        selectParcel(nextId);
        setCompareIds((prev) => prev.filter((item) => item !== nextId));
      }
    } else {
      setCompareIds((prev) => prev.filter((item) => item !== id));
    }
  };

  return (
    <AppShell>
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-block size-2 rounded-full bg-primary" />
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Field ACQ · Land Feasibility & Underwriting Engine
            </p>
          </div>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Acquisition Feasibility Studio</h1>
          <p className="mt-1.5 max-w-3xl text-sm text-muted-foreground">
            Automated 4-pillar feasibility analysis, density yield calculation, civil constraints
            triage, and residual land valuation (MAO) across Cumberland, Dauphin, Lancaster, and
            York Counties.
          </p>
        </div>

        {/* View Switcher Pills */}
        <div className="flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/20 p-1">
          {PRIMARY_MODES.map((mode) => (
            <button
              key={mode.id}
              onClick={() => setActiveMode(mode.id)}
              className={cn(
                "rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-wider transition-all duration-150 border",
                activeMode === mode.id
                  ? "bg-transparent text-primary font-bold border-primary shadow-[0_0_12px_rgba(249,115,22,0.35)]"
                  : "bg-transparent text-muted-foreground hover:text-foreground border-transparent hover:border-border/60",
              )}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      {/* Mode 1: Instant Feasibility Studio (Primary Default) */}
      {activeMode === "assessment" && (
        <div className="mt-6 space-y-6">
          {/* STEP 1: PARCEL SELECTION & OBJECTIVE BAR */}
          <Card className="cyber-card border-primary/20">
            <CardHeader className="pb-3 border-b border-border/40">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex size-5 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
                    1
                  </span>
                  <CardTitle className="text-base font-semibold">
                    Select Target Site & Development Objective
                  </CardTitle>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MapPin className="size-3.5 text-primary" />
                  <span>Central Pennsylvania Multi-County Coverage</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {/* County Filter Pills */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground mr-1 flex items-center gap-1">
                  <Filter className="size-3" /> County:
                </span>
                {COUNTIES.map((c) => (
                  <button
                    key={c}
                    onClick={() => setSelectedCounty(c)}
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider transition-all border",
                      selectedCounty === c
                        ? "bg-primary/20 text-primary border-primary font-bold shadow-sm"
                        : "bg-transparent text-muted-foreground border-border/60 hover:text-foreground hover:border-foreground/40",
                    )}
                  >
                    {c === "all" ? "All Counties (16)" : c}
                  </button>
                ))}
              </div>

              {/* Primary Parcel Dropdown & Multi-Compare Control */}
              <div className="grid gap-3 md:grid-cols-3">
                <div className="md:col-span-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
                    Active Parcel under Evaluation
                  </label>
                  <select
                    value={activeParcel.id}
                    onChange={(e) => handleParcelChange(e.target.value)}
                    className="w-full rounded-lg border border-border/80 bg-background/90 px-3.5 py-2.5 text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
                  >
                    {filteredParcels.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.address} ({p.municipality}, {p.county} Co.) — {p.acres} ac · {p.zoning} (
                        {p.zoningName})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
                    Compare Multiple Parcels
                  </label>
                  <div className="flex items-center gap-2">
                    <select
                      value=""
                      onChange={(e) => {
                        if (e.target.value) toggleCompareParcel(e.target.value);
                      }}
                      className="w-full rounded-lg border border-border/80 bg-background/90 px-3 py-2.5 text-xs text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="">+ Add Site to Compare Grid...</option>
                      {PARCELS.filter(
                        (p) => p.id !== activeParcel.id && !compareIds.includes(p.id),
                      ).map((p) => (
                        <option key={p.id} value={p.id}>
                          + {p.address} ({p.municipality}, {p.acres} ac)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Objective Selector */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
                  Development Target Objective
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                  {(
                    Object.keys(OBJECTIVE_LABELS) as DevelopmentObjective[]
                  ).map((key) => {
                    const info = OBJECTIVE_LABELS[key];
                    const isSelected = objective === key;
                    return (
                      <button
                        key={key}
                        onClick={() => handleObjectiveChange(key)}
                        className={cn(
                          "rounded-lg border p-2.5 text-left transition-all duration-150 flex flex-col justify-between",
                          isSelected
                            ? "border-primary bg-primary/10 shadow-[0_0_12px_rgba(249,115,22,0.25)]"
                            : "border-border/60 bg-muted/10 hover:border-border hover:bg-muted/20",
                        )}
                      >
                        <span
                          className={cn(
                            "text-xs font-bold block",
                            isSelected ? "text-primary" : "text-foreground",
                          )}
                        >
                          {info.title}
                        </span>
                        <span className="text-[11px] text-muted-foreground line-clamp-2 mt-1">
                          {info.desc}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* MULTI-PARCEL COMPARISON MATRIX (When 2+ parcels are in comparison) */}
          {comparisonAssessments.length > 1 && (
            <ParcelCompareGrid
              assessments={comparisonAssessments}
              onSelectPrimary={handleParcelChange}
              onRemoveParcel={removeCompareParcel}
              primaryId={activeParcel.id}
            />
          )}

          {/* STEP 2: INSTANT FEASIBILITY SCORECARD & EXECUTIVE VERDICT */}
          <div className="grid gap-6 lg:grid-cols-12">
            {/* Executive Scorecard Banner */}
            <Card
              className={cn(
                "cyber-card lg:col-span-12 border-2",
                activeAssessment.verdictVariant === "success" && "border-emerald-500/50 bg-emerald-950/10",
                activeAssessment.verdictVariant === "warning" && "border-amber-500/50 bg-amber-950/10",
                activeAssessment.verdictVariant === "destructive" &&
                  "border-destructive/50 bg-destructive/10",
              )}
            >
              <CardContent className="p-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
                  <div className="flex items-start gap-4">
                    {/* Radial/Score Badge */}
                    <div className="flex flex-col items-center justify-center size-20 rounded-2xl border-2 border-border/80 bg-background/80 shadow-md shrink-0">
                      <span className="text-2xl font-black tracking-tight text-foreground">
                        {activeAssessment.compositeScore}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        / 100
                      </span>
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider border",
                            activeAssessment.verdictVariant === "success" &&
                              "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
                            activeAssessment.verdictVariant === "warning" &&
                              "bg-amber-500/20 text-amber-400 border-amber-500/40",
                            activeAssessment.verdictVariant === "destructive" &&
                              "bg-destructive/20 text-destructive border-destructive/40",
                          )}
                        >
                          {activeAssessment.verdictBadge}
                        </span>
                        <span className="text-xs text-muted-foreground font-medium">
                          {activeAssessment.parcel.address} · {activeAssessment.parcel.municipality} (
                          {activeAssessment.parcel.county} Co.)
                        </span>
                      </div>
                      <h2 className="mt-1 text-xl font-bold text-foreground">
                        {activeAssessment.verdict}: {activeAssessment.verdictExplanation}
                      </h2>
                      <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                        <span>
                          <strong>Gross Tract:</strong> {activeAssessment.grossAcres} ac (
                          {activeAssessment.parcel.sqft.toLocaleString()} sf)
                        </span>
                        <span>•</span>
                        <span>
                          <strong>Net Developable:</strong> {activeAssessment.netDevelopableAcres} ac (
                          {activeAssessment.deductionPct}% ROW/Storm deductions)
                        </span>
                        <span>•</span>
                        <span>
                          <strong>Calculated Yield:</strong>{" "}
                          <strong className="text-primary font-bold">
                            {activeAssessment.estimatedLots} {activeAssessment.estimatedLots === 1 ? "Lot" : "Lots"}
                          </strong>{" "}
                          ({activeAssessment.grossDensityUa} / ac gross)
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end justify-center shrink-0 border-t md:border-t-0 md:border-l border-border/40 pt-3 md:pt-0 md:pl-5">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Maximum Allowable Offer (MAO)
                    </p>
                    <p className="text-2xl font-black text-primary">
                      {money(activeAssessment.financials.maxAllowableOfferTotal)}
                    </p>
                    <p
                      className={cn(
                        "text-xs font-semibold mt-0.5",
                        activeAssessment.financials.spreadAmount >= 0
                          ? "text-emerald-400"
                          : "text-amber-400",
                      )}
                    >
                      {activeAssessment.financials.spreadAmount >= 0
                        ? `+$${activeAssessment.financials.spreadAmount.toLocaleString()} under asking/assessed`
                        : `-$${Math.abs(activeAssessment.financials.spreadAmount).toLocaleString()} over asking/assessed`}
                    </p>
                  </div>
                </div>

                {/* Fatal Flaw Alerts (if any) */}
                {activeAssessment.fatalFlaws.length > 0 && (
                  <div className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive flex items-start gap-2">
                    <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Caution / Site Constraint Detected: </span>
                      {activeAssessment.fatalFlaws.join(" ")}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* THE 4 KEY FEASIBILITY PILLARS */}

            {/* Pillar 1: Zoning & Entitlement */}
            <Card className="cyber-card lg:col-span-6 border-primary/20">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Scale className="size-4 text-primary" />
                    <CardTitle className="text-base font-bold">
                      1. Zoning & Entitlement Yield
                    </CardTitle>
                  </div>
                  <span
                    className={cn(
                      "rounded px-2 py-0.5 text-xs font-bold",
                      activeAssessment.pillars.zoning.status === "pass" &&
                        "bg-emerald-500/20 text-emerald-400",
                      activeAssessment.pillars.zoning.status === "warning" &&
                        "bg-amber-500/20 text-amber-400",
                      activeAssessment.pillars.zoning.status === "fail" &&
                        "bg-destructive/20 text-destructive",
                    )}
                  >
                    {activeAssessment.pillars.zoning.score}/100
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pt-2 text-xs">
                <div className="rounded-md bg-muted/20 p-2.5">
                  <div className="flex items-center justify-between font-bold text-foreground">
                    <span>
                      District: {activeParcel.zoning} — {activeParcel.zoningName}
                    </span>
                    <span className="text-primary font-bold">
                      {activeAssessment.estimatedLots} Lots Calculated
                    </span>
                  </div>
                  <p className="mt-1 text-muted-foreground">{activeParcel.zoningSummary}</p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                  <div className="rounded border border-border/40 p-2">
                    <span className="font-semibold text-foreground block">Max Lot Coverage</span>
                    <span>{activeParcel.maxCoverage}% of tract</span>
                  </div>
                  <div className="rounded border border-border/40 p-2">
                    <span className="font-semibold text-foreground block">Height Restriction</span>
                    <span>{activeParcel.maxHeight} feet</span>
                  </div>
                  <div className="rounded border border-border/40 p-2">
                    <span className="font-semibold text-foreground block">Setbacks (F / S / R)</span>
                    <span>
                      {activeParcel.setbacks.front}&apos; / {activeParcel.setbacks.side}&apos; /{" "}
                      {activeParcel.setbacks.rear}&apos;
                    </span>
                  </div>
                  <div className="rounded border border-border/40 p-2">
                    <span className="font-semibold text-foreground block">Net Density</span>
                    <span>{activeAssessment.netDensityUa} dwelling units/ac</span>
                  </div>
                </div>

                <ul className="space-y-1 text-muted-foreground">
                  {activeAssessment.pillars.zoning.details.map((d, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-primary">•</span>
                      <span>{d}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Pillar 2: Civil & Environmental */}
            <Card className="cyber-card lg:col-span-6 border-primary/20">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building className="size-4 text-cyan-500" />
                    <CardTitle className="text-base font-bold">
                      2. Civil & Environmental Site Conditions
                    </CardTitle>
                  </div>
                  <span
                    className={cn(
                      "rounded px-2 py-0.5 text-xs font-bold",
                      activeAssessment.pillars.civil.status === "pass" &&
                        "bg-emerald-500/20 text-emerald-400",
                      activeAssessment.pillars.civil.status === "warning" &&
                        "bg-amber-500/20 text-amber-400",
                      activeAssessment.pillars.civil.status === "fail" &&
                        "bg-destructive/20 text-destructive",
                    )}
                  >
                    {activeAssessment.pillars.civil.score}/100
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pt-2 text-xs">
                <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                  <div className="rounded border border-border/40 p-2">
                    <span className="font-semibold text-foreground block">Slope & Topography</span>
                    <span
                      className={
                        activeParcel.slopePct > 15
                          ? "text-destructive font-bold"
                          : activeParcel.slopePct > 8
                            ? "text-amber-400"
                            : "text-foreground"
                      }
                    >
                      {activeParcel.slopePct}% grade ({activeAssessment.pillars.civil.summary})
                    </span>
                  </div>
                  <div className="rounded border border-border/40 p-2">
                    <span className="font-semibold text-foreground block">FEMA Flood Zone</span>
                    <span>Zone {activeParcel.flood["5"] || "X"} (100-Yr Boundary)</span>
                  </div>
                  <div className="rounded border border-border/40 p-2">
                    <span className="font-semibold text-foreground block">PA DEP Chapter 102</span>
                    <span>
                      {activeParcel.acres >= 1.0 ? "NPDES Permit Required" : "Standard E&S Plan"}
                    </span>
                  </div>
                  <div className="rounded border border-border/40 p-2">
                    <span className="font-semibold text-foreground block">Karst Limestone</span>
                    <span>
                      {activeParcel.county === "Cumberland" || activeParcel.county === "Lancaster"
                        ? "High Formation Hazard"
                        : "Low / Moderate"}
                    </span>
                  </div>
                </div>

                <ul className="space-y-1 text-muted-foreground">
                  {activeAssessment.pillars.civil.details.map((d, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-cyan-500">•</span>
                      <span>{d}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Pillar 3: Utilities & Infrastructure */}
            <Card className="cyber-card lg:col-span-6 border-primary/20">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers3 className="size-4 text-emerald-500" />
                    <CardTitle className="text-base font-bold">
                      3. Utilities & Infrastructure Access
                    </CardTitle>
                  </div>
                  <span
                    className={cn(
                      "rounded px-2 py-0.5 text-xs font-bold",
                      activeAssessment.pillars.utilities.status === "pass" &&
                        "bg-emerald-500/20 text-emerald-400",
                      activeAssessment.pillars.utilities.status === "warning" &&
                        "bg-amber-500/20 text-amber-400",
                      activeAssessment.pillars.utilities.status === "fail" &&
                        "bg-destructive/20 text-destructive",
                    )}
                  >
                    {activeAssessment.pillars.utilities.score}/100
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pt-2 text-xs">
                <div className="rounded border border-border/40 p-2.5 space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-bold text-foreground">Public Water:</span>
                    <span className="text-muted-foreground text-right">
                      {activeParcel.utilities.water}
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-2 border-t border-border/40 pt-1.5">
                    <span className="font-bold text-foreground">Sanitary Sewer:</span>
                    <span className="text-muted-foreground text-right">
                      {activeParcel.utilities.sewer}
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-2 border-t border-border/40 pt-1.5">
                    <span className="font-bold text-foreground">Electric & Gas:</span>
                    <span className="text-muted-foreground text-right">
                      {activeParcel.utilities.electric}; {activeParcel.utilities.gas}
                    </span>
                  </div>
                </div>

                <div className="rounded border border-border/40 p-2 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-foreground block">
                      Traffic Corridor (AADT)
                    </span>
                    <span className="text-muted-foreground">
                      {activeParcel.aadt.toLocaleString()} vehicles/day
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold text-primary">
                    {activeParcel.aadt > 12000 ? "PennDOT HOP Required" : "Municipal Driveway Permit"}
                  </span>
                </div>

                <ul className="space-y-1 text-muted-foreground">
                  {activeAssessment.pillars.utilities.details.map((d, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-emerald-500">•</span>
                      <span>{d}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Pillar 4: Residual Land Value & Financial Pro Forma */}
            <Card className="cyber-card lg:col-span-6 border-primary/20">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DollarSign className="size-4 text-primary" />
                    <CardTitle className="text-base font-bold">
                      4. Residual Land Valuation & MAO
                    </CardTitle>
                  </div>
                  <span
                    className={cn(
                      "rounded px-2 py-0.5 text-xs font-bold",
                      activeAssessment.pillars.financial.status === "pass" &&
                        "bg-emerald-500/20 text-emerald-400",
                      activeAssessment.pillars.financial.status === "warning" &&
                        "bg-amber-500/20 text-amber-400",
                      activeAssessment.pillars.financial.status === "fail" &&
                        "bg-destructive/20 text-destructive",
                    )}
                  >
                    {activeAssessment.pillars.financial.score}/100
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pt-2 text-xs">
                {/* Pro Forma Table */}
                <div className="rounded-lg border border-border/40 bg-muted/10 p-2.5 space-y-1.5">
                  <div className="flex justify-between items-center text-foreground font-semibold">
                    <span>Projected Finished Home ASP</span>
                    <span>{money(activeAssessment.financials.finishedHomeAsp)}</span>
                  </div>
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span>Finished Lot Value (22% FLV)</span>
                    <span>{money(activeAssessment.financials.finishedLotValue)} / lot</span>
                  </div>
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span>Horizontal Sitework Cost</span>
                    <span className="text-destructive font-medium">
                      -{money(activeAssessment.financials.horizontalCostPerLot)} / lot
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span>Soft Costs & Permitting</span>
                    <span className="text-destructive font-medium">
                      -{money(activeAssessment.financials.softCostPerLot)} / lot
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span>Carry & Financing (5%)</span>
                    <span className="text-destructive font-medium">
                      -{money(activeAssessment.financials.carryCostPerLot)} / lot
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span>Developer Target Margin (20%)</span>
                    <span className="text-destructive font-medium">
                      -
                      {money(
                        Math.round(activeAssessment.financials.finishedLotValue * 0.2),
                      )}{" "}
                      / lot
                    </span>
                  </div>

                  <div className="border-t border-border/60 pt-2 flex justify-between items-center font-bold text-sm text-foreground">
                    <span className="text-primary">Max Allowable Offer (MAO)</span>
                    <span className="text-primary text-base">
                      {money(activeAssessment.financials.maxAllowableOfferTotal)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[11px] text-muted-foreground">
                    <span>Current Assessed/Asking</span>
                    <span>{money(activeAssessment.financials.currentAssessedOrAsking)}</span>
                  </div>
                </div>

                {/* Quick Override Toggle */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-muted-foreground block">
                      Custom ASP ($)
                    </label>
                    <Input
                      type="number"
                      step={5000}
                      value={customAsp ?? activeAssessment.financials.finishedHomeAsp}
                      onChange={(e) => setCustomAsp(Number(e.target.value))}
                      className="h-8 text-xs mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-muted-foreground block">
                      Target Lots
                    </label>
                    <Input
                      type="number"
                      min={1}
                      value={customLots ?? activeAssessment.estimatedLots}
                      onChange={(e) => setCustomLots(Math.max(1, Number(e.target.value)))}
                      className="h-8 text-xs mt-1"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* STEP 3: ACTIONABLE DUE DILIGENCE & TIMELINE */}
          <div className="grid gap-6 lg:grid-cols-12">
            {/* Diligence Checklist */}
            <Card className="cyber-card lg:col-span-7 border-primary/20">
              <CardHeader className="pb-3 border-b border-border/40">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileCheck2 className="size-4 text-primary" />
                    <CardTitle className="text-base font-bold">
                      Site-Specific Due Diligence Roadmap
                    </CardTitle>
                  </div>
                  <span className="text-xs text-muted-foreground font-semibold">
                    {activeAssessment.diligenceChecklist.length} Action Items
                  </span>
                </div>
              </CardHeader>
              <CardContent className="pt-3 space-y-2.5">
                {activeAssessment.diligenceChecklist.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-start gap-3 rounded-lg border border-border/40 bg-muted/10 p-3"
                  >
                    <Checkbox id={task.id} className="mt-0.5" />
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-foreground">{task.task}</span>
                        <span
                          className={cn(
                            "rounded px-1.5 py-0.2 text-[10px] font-bold uppercase",
                            task.priority === "high"
                              ? "bg-destructive/20 text-destructive"
                              : task.priority === "medium"
                                ? "bg-amber-500/20 text-amber-400"
                                : "bg-muted text-muted-foreground",
                          )}
                        >
                          {task.priority} Priority
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">{task.reason}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Entitlement Timeline & Cross-Links */}
            <div className="space-y-4 lg:col-span-5">
              <Card className="cyber-card border-primary/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-bold">
                    Municipal Approval & SALDO Timeline
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-xs">
                  <div className="rounded-md border border-border/40 p-2.5 space-y-1">
                    <span className="font-bold text-foreground block">
                      Governing Jurisdiction:
                    </span>
                    <p className="text-muted-foreground font-medium">
                      {activeAssessment.approvalTimeline.governingBody}
                    </p>
                  </div>
                  <div className="rounded-md border border-border/40 p-2.5 space-y-1">
                    <span className="font-bold text-foreground block">
                      County Planning Review:
                    </span>
                    <p className="text-muted-foreground font-medium">
                      {activeAssessment.approvalTimeline.countyPlanningCommission}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                    <div className="rounded border border-border/40 p-2">
                      <span className="font-semibold text-foreground block">Minor SALDO</span>
                      <span>{activeAssessment.approvalTimeline.minorMonths}</span>
                    </div>
                    <div className="rounded border border-border/40 p-2">
                      <span className="font-semibold text-foreground block">Major SALDO</span>
                      <span>{activeAssessment.approvalTimeline.majorMonths}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Action Hub */}
              <Card className="cyber-card border-primary/30 bg-primary/5">
                <CardContent className="p-4 space-y-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-primary">
                    Next Acquisition Actions
                  </p>
                  <Button
                    onClick={() => setActiveMode("report")}
                    className="w-full justify-between text-xs font-semibold gap-2"
                  >
                    <span>Generate Source-Grounded PDF Report</span>
                    <FileSearch className="size-4" />
                  </Button>
                  <div className="grid grid-cols-2 gap-2">
                    <Button asChild variant="outline" size="sm" className="h-8 text-xs gap-1">
                      <Link to="/scene-3d">
                        <DollarSign className="size-3.5 text-primary" /> Cost Engine
                      </Link>
                    </Button>
                    <Button asChild variant="outline" size="sm" className="h-8 text-xs gap-1">
                      <Link to="/aide">
                        <Bot className="size-3.5 text-cyan-500" /> Ordinance AI
                      </Link>
                    </Button>
                    <Button asChild variant="outline" size="sm" className="h-8 text-xs gap-1">
                      <Link to="/zoning">
                        <Scale className="size-3.5 text-amber-500" /> View Zoning
                      </Link>
                    </Button>
                    <Button asChild variant="outline" size="sm" className="h-8 text-xs gap-1">
                      <Link to="/directory">
                        <Building className="size-3.5 text-emerald-500" /> Directory
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* Mode 2: Deep AI Feasibility Report & PDF Generator */}
      {activeMode === "report" && (
        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/10 p-3 text-xs">
            <span className="text-foreground font-medium">
              Generating official source-grounded report for:{" "}
              <strong>
                {activeParcel.address} ({activeParcel.municipality})
              </strong>
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setActiveMode("assessment")}
            >
              ← Back to Feasibility Studio
            </Button>
          </div>
          <FeasibilityReportTab />
        </div>
      )}

      {/* Mode 3: Due Diligence & Developer Data Register */}
      {activeMode === "reference" && (
        <div className="mt-6 space-y-6">
          <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 p-3 text-xs">
            <span className="text-muted-foreground">
              Official authoritative reference sources, screening checklists, and permit pathways for
              South Central Pennsylvania developers.
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setActiveMode("assessment")}
            >
              ← Back to Feasibility Studio
            </Button>
          </div>

          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="size-5 text-primary" /> Developer Data Register
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>
                  Official mapping, hazard, market, and housing-finance sources used for early
                  feasibility and underwriting research across York, Cumberland, Dauphin, and
                  Lancaster Counties.
                </p>
              </CardContent>
            </Card>

            {FEASIBILITY_DATA_GROUPS.map((group) => {
              const sources = FEASIBILITY_DATA_SOURCES.filter(
                (source) => source.mode === group.mode,
              );
              return (
                <section key={group.mode}>
                  <h2 className="text-lg font-semibold">{group.title}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{group.description}</p>
                  <div className="mt-3 grid gap-3 lg:grid-cols-2">
                    {sources.map((source) => (
                      <Card key={source.id}>
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between gap-3">
                            <CardTitle className="text-base">{source.title}</CardTitle>
                            <span className="shrink-0 rounded-full bg-surface-low px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                              {source.status}
                            </span>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                          <p className="font-medium">{source.provider}</p>
                          <p className="text-muted-foreground">{source.use}</p>
                          <p className="text-xs text-muted-foreground">{source.detail}</p>
                          <div className="flex flex-wrap gap-3 pt-1 text-sm font-semibold text-primary">
                            {source.mode === "live-map" ? (
                              <Link to="/map" className="inline-flex items-center gap-1 underline">
                                <Layers3 className="size-3.5" /> Open map
                              </Link>
                            ) : null}
                            {source.id === "central-pa-market-report-2026-08" ? (
                              <a
                                href={source.url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 underline"
                              >
                                Download market report <ExternalLink className="size-3.5" />
                              </a>
                            ) : (
                              <a
                                href={source.url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 underline"
                              >
                                Official source <ExternalLink className="size-3.5" />
                              </a>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      )}
    </AppShell>
  );
}
