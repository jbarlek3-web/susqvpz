import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Bot,
  Briefcase,
  Building,
  CheckCircle2,
  ChevronDown,
  Database,
  DollarSign,
  ExternalLink,
  Factory,
  FileCheck2,
  FileSearch,
  FileSpreadsheet,
  Filter,
  Home,
  Layers,
  Layers3,
  Lock,
  MapPin,
  Plus,
  RefreshCw,
  RotateCcw,
  Scale,
  ShieldAlert,
  SlidersHorizontal,
  Sparkles,
  Store,
  TrendingDown,
  TrendingUp,
  Truck,
  Unlock,
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
  useUserUnderwritingPreset,
  calculateResidualLandValue,
  type UserUnderwritingPreset,
} from "@/lib/feasibility/user-underwriting-presets";
import {
  assessParcelFeasibility,
  COUNTY_BENCHMARKS,
  OBJECTIVE_LABELS,
  ROLE_LABELS,
  type AssemblageConfig,
  type DevelopmentObjective,
  type DevelopmentRole,
  type ParcelFeasibilityAssessment,
} from "@/lib/feasibility/feasibility-engine";
import { AssemblageBuilder } from "@/components/feasibility/assemblage-builder";
import { FeasibilityReportTab } from "@/components/feasibility/feasibility-report-tab";
import { FEASIBILITY_DATA_GROUPS, FEASIBILITY_DATA_SOURCES } from "@/lib/data/feasibility-data";
import { DD_GROUPS, PERMIT_PATHS, SCREENING_CHECKS } from "@/lib/data/acquisition";

export interface AcquireSearch {
  parcelId?: string;
  tab?: string;
  role?: string;
}

export const Route = createFileRoute("/acquire")({
  validateSearch: (search: Record<string, unknown>): AcquireSearch => ({
    parcelId: typeof search.parcelId === "string" ? search.parcelId : undefined,
    tab: typeof search.tab === "string" ? search.tab : undefined,
    role: typeof search.role === "string" ? search.role : undefined,
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

  // Development Role / Business Model
  const [developmentRole, setDevelopmentRole] = useState<DevelopmentRole>(() => {
    if (search.role && search.role in ROLE_LABELS) {
      return search.role as DevelopmentRole;
    }
    return "lot_developer";
  });

  // Development objective
  const [objective, setObjective] = useState<DevelopmentObjective>("subdivision");

  // Assemblage configuration state
  const [assemblageConfig, setAssemblageConfig] = useState<AssemblageConfig>({
    mode: "single_parcel",
    slots: [{ parcel: activeParcel, role: "primary", elevationTrend: "neutral" }],
  });

  // Update primary parcel in assemblage when activeParcel changes
  useEffect(() => {
    setAssemblageConfig((prev) => {
      if (prev.mode === "single_parcel") {
        return {
          mode: "single_parcel",
          slots: [{ parcel: activeParcel, role: "primary", elevationTrend: "neutral" }],
        };
      }
      // In assemblage mode, ensure the active parcel is the primary slot
      const otherSlots = prev.slots.filter((s) => s.parcel.id !== activeParcel.id);
      return {
        ...prev,
        slots: [{ parcel: activeParcel, role: "primary", elevationTrend: "neutral" }, ...otherSlots],
      };
    });
  }, [activeParcel]);

  // User Underwriting Presets & Locking
  const {
    preset: userPreset,
    isLocked: isUserPresetLocked,
    lockValues: lockPresetValues,
    unlockValues: unlockPresetValues,
    resetToBenchmarks: resetPresetToBenchmarks,
  } = useUserUnderwritingPreset();

  // Working draft for editable underwriting parameters
  const [underwriteDraft, setUnderwritingDraft] = useState<UserUnderwritingPreset>(() => userPreset);

  // Sync draft when userPreset changes
  useEffect(() => {
    setUnderwritingDraft(userPreset);
  }, [userPreset]);

  // Financial overrides
  const [customAsp, setCustomAsp] = useState<number | undefined>(() => (isUserPresetLocked ? userPreset.customAsp : undefined));
  const [customSitework, setCustomSitework] = useState<number | undefined>(() => (isUserPresetLocked ? userPreset.siteworkPerUnit : undefined));
  const [customLots, setCustomLots] = useState<number | undefined>(undefined);

  // Reset custom overrides when parcel changes — but keep locked defaults!
  const handleParcelChange = (newId: string) => {
    selectParcel(newId);
    if (!isUserPresetLocked) {
      setCustomAsp(undefined);
      setCustomSitework(undefined);
    }
    setCustomLots(undefined);
  };

  const handleObjectiveChange = (newObj: DevelopmentObjective) => {
    setObjective(newObj);
    setCustomLots(undefined);
  };

  const handleRoleChange = (newRole: DevelopmentRole) => {
    setDevelopmentRole(newRole);
    setCustomLots(undefined);
    if (newRole === "townhome_developer") {
      setObjective("townhome");
    } else if (newRole === "commercial_pad") {
      setObjective("commercial");
    } else if (newRole === "industrial_logistics") {
      setObjective("commercial");
    } else if (newRole === "lot_developer" || newRole === "builder_developer") {
      setObjective("subdivision");
    }
  };

  // Filtered parcels list
  const filteredParcels = useMemo(() => {
    if (selectedCounty === "all") return PARCELS;
    return parcelsByCounty(selectedCounty);
  }, [selectedCounty]);

  // Feasibility assessment for active parcel and configured assemblage
  const activeAssessment = useMemo(() => {
    const siteworkToUse = isUserPresetLocked ? userPreset.siteworkPerUnit : customSitework;
    const verticalToUse = isUserPresetLocked ? userPreset.verticalCostPerUnit : undefined;
    const softToUse = isUserPresetLocked ? userPreset.softCostPct : undefined;
    const marginToUse = isUserPresetLocked ? userPreset.targetProfitMarginPct : undefined;
    const sellingToUse = isUserPresetLocked ? userPreset.sellingCostPct : undefined;

    return assessParcelFeasibility(
      activeParcel,
      objective,
      {
        customAsp: customAsp ?? (isUserPresetLocked ? userPreset.customAsp : undefined),
        customSiteworkPerLot: siteworkToUse,
        customTargetLots: customLots,
        customVerticalCostPerHome: verticalToUse,
        customSoftCostPercent: softToUse,
        customTargetProfitMarginPercent: marginToUse,
        customSellingCostPercent: sellingToUse,
        customOffsiteInfrastructure: isUserPresetLocked ? userPreset.offsiteInfrastructure : undefined,
        customEntitlementFees: isUserPresetLocked ? userPreset.entitlementFees : undefined,
      },
      developmentRole,
      assemblageConfig,
    );
  }, [
    activeParcel,
    objective,
    customAsp,
    customSitework,
    customLots,
    developmentRole,
    assemblageConfig,
    isUserPresetLocked,
    userPreset,
  ]);

  // Complete Residual Land Value (Suggested Max Bid) Underwriting Model
  const residualSummary = useMemo(() => {
    return calculateResidualLandValue({
      potentialUnits: activeAssessment.estimatedLots,
      averageUnitSalePrice: customAsp ?? (isUserPresetLocked && userPreset.customAsp ? userPreset.customAsp : activeAssessment.financials.finishedHomeAsp),
      grossAcres: activeParcel.acres,
      askingOrAssessedPrice: activeParcel.assessed || 120_000,
      preset: isUserPresetLocked ? userPreset : underwriteDraft,
    });
  }, [
    activeAssessment.estimatedLots,
    activeAssessment.financials.finishedHomeAsp,
    activeParcel.acres,
    activeParcel.assessed,
    customAsp,
    isUserPresetLocked,
    userPreset,
    underwriteDraft,
  ]);

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
            Role-specific underwriting, PA MPC Act 247 parcel assemblage modeling, civil constraints triage, and residual land valuation (MAO) across Cumberland, Dauphin, Lancaster, and York Counties.
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
          {/* STEP 1A: SELECT DEVELOPMENT ROLE & BUSINESS INTENT */}
          <Card className="cyber-card border-primary/20">
            <CardHeader className="pb-3 border-b border-border/40">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex size-5 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
                    1
                  </span>
                  <CardTitle className="text-base font-semibold">
                    Select Development Intent & Underwriting Role
                  </CardTitle>
                </div>
                <span className="text-xs text-muted-foreground font-medium">
                  Customizes pro forma cash flows, returns metrics, and diligence
                </span>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
                {(Object.keys(ROLE_LABELS) as DevelopmentRole[]).map((r) => {
                  const isSelected = developmentRole === r;
                  const meta = ROLE_LABELS[r];
                  const Icon =
                    r === "lot_developer"
                      ? Briefcase
                      : r === "builder_developer"
                        ? Home
                        : r === "townhome_developer"
                          ? Building
                          : r === "commercial_pad"
                            ? Store
                            : Factory;

                  return (
                    <button
                      key={r}
                      onClick={() => handleRoleChange(r)}
                      className={cn(
                        "rounded-lg border p-3 text-left transition-all duration-150 flex flex-col justify-between relative",
                        isSelected
                          ? "border-primary bg-primary/10 shadow-[0_0_14px_rgba(249,115,22,0.2)]"
                          : "border-border/60 bg-muted/10 hover:border-border hover:bg-muted/20",
                      )}
                    >
                      {isSelected && (
                        <span className="absolute top-2.5 right-2.5 flex size-2 rounded-full bg-primary" />
                      )}
                      <div>
                        <div className="flex items-center gap-1.5 text-primary mb-1">
                          <Icon className="size-4" />
                          <span className="text-xs font-bold uppercase tracking-wider">{meta.title}</span>
                        </div>
                        <p className="text-[11px] font-semibold text-foreground leading-snug">
                          {meta.subtitle}
                        </p>
                      </div>
                      <p className="text-[10px] text-muted-foreground line-clamp-3 mt-2 leading-tight">
                        {meta.desc}
                      </p>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* STEP 1B: PARCEL SELECTION & OBJECTIVE BAR */}
          <Card className="cyber-card border-primary/20">
            <CardHeader className="pb-3 border-b border-border/40">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex size-5 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
                    2
                  </span>
                  <CardTitle className="text-base font-semibold">
                    Select Anchor Parcel & County Scope
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

              {/* Primary Parcel Dropdown */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
                  Anchor Parcel under Evaluation
                </label>
                <select
                  value={activeParcel.id}
                  onChange={(e) => handleParcelChange(e.target.value)}
                  className="w-full rounded-lg border border-border/80 bg-background/90 px-3.5 py-2.5 text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
                >
                  {filteredParcels.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.address} ({p.municipality}, {p.county} Co.) — {p.acres} ac · {p.zoning} ({p.zoningName})
                    </option>
                  ))}
                </select>
              </div>

              {/* Objective Selector */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
                  Product Typology & Zoning Sub-Objective
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                  {(Object.keys(OBJECTIVE_LABELS) as DevelopmentObjective[]).map((key) => {
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

          {/* STEP 1C: SITE STRUCTURE & LAND ASSEMBLAGE STRATEGY */}
          <AssemblageBuilder
            primaryParcel={activeParcel}
            availableParcels={filteredParcels}
            assemblageConfig={assemblageConfig}
            onChangeConfig={setAssemblageConfig}
            assessment={activeAssessment}
          />

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
                          <strong>Gross Tract:</strong> {activeAssessment.grossAcres} ac
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
                            {activeAssessment.estimatedLots}{" "}
                            {developmentRole === "commercial_pad"
                              ? "Commercial Pads"
                              : developmentRole === "industrial_logistics"
                                ? "Building Pad"
                                : activeAssessment.estimatedLots === 1
                                  ? "Lot"
                                  : "Lots"}
                          </strong>{" "}
                          ({activeAssessment.grossDensityUa} gross / {activeAssessment.netDensityUa} net DU/ac)
                        </span>
                        {activeAssessment.assemblage.setbackAreaRecoveredSqFt > 0 && (
                          <>
                            <span>•</span>
                            <span className="text-emerald-400 font-semibold">
                              +{activeAssessment.assemblage.setbackAreaRecoveredSqFt.toLocaleString()} sq ft setback area recovered
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* MAO Summary Callout */}
                  <div className="rounded-xl border border-primary/40 bg-background/80 p-4 md:text-right shrink-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Maximum Allowable Offer (MAO)
                    </p>
                    <p className="text-2xl font-black text-foreground">
                      {money(activeAssessment.financials.maxAllowableOfferTotal)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {money(activeAssessment.financials.maxAllowableOfferPerLot)} / lot ·{" "}
                      <span
                        className={cn(
                          "font-bold",
                          activeAssessment.financials.spreadAmount >= 0
                            ? "text-emerald-500"
                            : "text-amber-500",
                        )}
                      >
                        {activeAssessment.financials.spreadAmount >= 0
                          ? `+$${activeAssessment.financials.spreadAmount.toLocaleString()} spread`
                          : `-$${Math.abs(activeAssessment.financials.spreadAmount).toLocaleString()} over asking`}
                      </span>
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ROLE-SPECIFIC UNDERWRITING PRO FORMA CARD */}
            {developmentRole === "lot_developer" && activeAssessment.roleProForma.lotDeveloper && (
              <Card className="cyber-card lg:col-span-12 border-primary/30 bg-primary/5">
                <CardHeader className="pb-3 border-b border-primary/20">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Briefcase className="size-4 text-primary" />
                      <CardTitle className="text-base font-bold">
                        Master Lot Developer Pro Forma · Builder Takedown & Option Waterfall
                      </CardTitle>
                    </div>
                    <span className="text-xs font-semibold text-primary">
                      Takedowns Pace to Homebuilder Absorption
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-xs">
                    <div className="rounded-lg border border-border/50 bg-background/70 p-3">
                      <span className="text-muted-foreground block text-[11px]">Finished Lot Value (FLV)</span>
                      <span className="text-base font-bold text-foreground">
                        {money(activeAssessment.roleProForma.lotDeveloper.finishedLotValue)} / lot
                      </span>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        ${activeAssessment.roleProForma.lotDeveloper.frontFootPrice.toLocaleString()} / front linear foot (65 ft lot width)
                      </p>
                    </div>

                    <div className="rounded-lg border border-border/50 bg-background/70 p-3">
                      <span className="text-muted-foreground block text-[11px]">Gross Lot Consideration</span>
                      <span className="text-base font-bold text-foreground">
                        {money(activeAssessment.roleProForma.lotDeveloper.grossLotRevenue)}
                      </span>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {activeAssessment.estimatedLots} Finished Shovel-Ready Lots
                      </p>
                    </div>

                    <div className="rounded-lg border border-border/50 bg-background/70 p-3">
                      <span className="text-muted-foreground block text-[11px]">Builder Takedown Schedule</span>
                      <span className="text-base font-bold text-primary">
                        {activeAssessment.roleProForma.lotDeveloper.phase1Lots} Initial Lots + {activeAssessment.roleProForma.lotDeveloper.quarterlyTakedownLots}/qtr
                      </span>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Over {activeAssessment.roleProForma.lotDeveloper.takedownDurationQuarters} quarters w/ 0.75% price escalators
                      </p>
                    </div>

                    <div className="rounded-lg border border-border/50 bg-background/70 p-3">
                      <span className="text-muted-foreground block text-[11px]">Developer Return Hurdle</span>
                      <span className="text-base font-bold text-emerald-400">
                        {activeAssessment.roleProForma.lotDeveloper.developerLeveredIrr}% Levered IRR
                      </span>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {activeAssessment.roleProForma.lotDeveloper.equityMultipleMoic}x Equity Multiple (MOIC)
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3 text-[11px] text-muted-foreground border-t border-border/40 pt-3">
                    <div>
                      <strong>Builder Option Deposit (10%):</strong>{" "}
                      {money(activeAssessment.roleProForma.lotDeveloper.optionDepositAmount)} non-refundable deposit held in escrow.
                    </div>
                    <div>
                      <strong>Horizontal Sitework Total:</strong>{" "}
                      {money(activeAssessment.roleProForma.lotDeveloper.totalHorizontalCost)} ({money(activeAssessment.roleProForma.lotDeveloper.horizontalCostPerLot)}/lot).
                    </div>
                    <div>
                      <strong>PA MPC Performance Bond Carry:</strong>{" "}
                      {money(activeAssessment.roleProForma.lotDeveloper.performanceBondCarry)} / year (1.5% annual fee on 110% bond).
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {developmentRole === "builder_developer" && activeAssessment.roleProForma.builderDeveloper && (
              <Card className="cyber-card lg:col-span-12 border-primary/30 bg-primary/5">
                <CardHeader className="pb-3 border-b border-primary/20">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Home className="size-4 text-primary" />
                      <CardTitle className="text-base font-bold">
                        Integrated Builder-Developer Pro Forma · Dual Horizontal & Vertical Margin
                      </CardTitle>
                    </div>
                    <span className="text-xs font-semibold text-emerald-400">
                      Captures Both Site Development & Vertical Building Profit
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-xs">
                    <div className="rounded-lg border border-border/50 bg-background/70 p-3">
                      <span className="text-muted-foreground block text-[11px]">Total Retail Home Revenue</span>
                      <span className="text-base font-bold text-foreground">
                        {money(activeAssessment.roleProForma.builderDeveloper.totalHomeRevenue)}
                      </span>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {activeAssessment.estimatedLots} Homes @ {money(activeAssessment.roleProForma.builderDeveloper.homeAsp)} ASP
                      </p>
                    </div>

                    <div className="rounded-lg border border-border/50 bg-background/70 p-3">
                      <span className="text-muted-foreground block text-[11px]">Vertical Direct Hard Costs</span>
                      <span className="text-base font-bold text-foreground">
                        ${activeAssessment.roleProForma.builderDeveloper.verticalDirectCostPerSqFt} / SF
                      </span>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {money(activeAssessment.roleProForma.builderDeveloper.verticalCostPerHome)} / home (2,400 SF avg)
                      </p>
                    </div>

                    <div className="rounded-lg border border-border/50 bg-background/70 p-3">
                      <span className="text-muted-foreground block text-[11px]">Absorption & Inventory Turn</span>
                      <span className="text-base font-bold text-primary">
                        {activeAssessment.roleProForma.builderDeveloper.monthlyAbsorptionRate} sales / month
                      </span>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {activeAssessment.roleProForma.builderDeveloper.absorptionDurationMonths} months total project absorption
                      </p>
                    </div>

                    <div className="rounded-lg border border-border/50 bg-background/70 p-3">
                      <span className="text-muted-foreground block text-[11px]">Dual Combined Gross Margin</span>
                      <span className="text-base font-bold text-emerald-400">
                        {activeAssessment.roleProForma.builderDeveloper.combinedGrossMarginPct}% Combined Margin
                      </span>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        14% Horizontal Lot Margin + 20% Vertical Builder Margin
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3 text-[11px] text-muted-foreground border-t border-border/40 pt-3">
                    <div>
                      <strong>Total Vertical Hard Cost:</strong>{" "}
                      {money(activeAssessment.roleProForma.builderDeveloper.totalVerticalCost)} sticks & bricks.
                    </div>
                    <div>
                      <strong>Total Horizontal Sitework:</strong>{" "}
                      {money(activeAssessment.roleProForma.builderDeveloper.totalHorizontalSitework)} civil infrastructure.
                    </div>
                    <div>
                      <strong>Project Return on Inventory:</strong>{" "}
                      {activeAssessment.roleProForma.builderDeveloper.returnOnInventoryPct}% ROI ({activeAssessment.roleProForma.builderDeveloper.projectIrr}% Project IRR).
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {developmentRole === "townhome_developer" && activeAssessment.roleProForma.townhome && (
              <Card className="cyber-card lg:col-span-12 border-primary/30 bg-primary/5">
                <CardHeader className="pb-3 border-b border-primary/20">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Building className="size-4 text-primary" />
                      <CardTitle className="text-base font-bold">
                        Townhome & Attached Cluster Pro Forma · Density & Private HOA Cartways
                      </CardTitle>
                    </div>
                    <span className="text-xs font-semibold text-primary">
                      {activeAssessment.roleProForma.townhome.densityPerAcre} DU / Acre Density
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-xs">
                    <div className="rounded-lg border border-border/50 bg-background/70 p-3">
                      <span className="text-muted-foreground block text-[11px]">Townhome Unit ASP</span>
                      <span className="text-base font-bold text-foreground">
                        {money(activeAssessment.roleProForma.townhome.unitAsp)}
                      </span>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Total Gross Revenue: {money(activeAssessment.roleProForma.townhome.totalRevenue)}
                      </p>
                    </div>

                    <div className="rounded-lg border border-border/50 bg-background/70 p-3">
                      <span className="text-muted-foreground block text-[11px]">Street & Access Typology</span>
                      <span className="text-base font-bold text-foreground">
                        {activeAssessment.roleProForma.townhome.streetTypology}
                      </span>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {activeAssessment.roleProForma.townhome.garageTypology} (22 ft lot frontage)
                      </p>
                    </div>

                    <div className="rounded-lg border border-border/50 bg-background/70 p-3">
                      <span className="text-muted-foreground block text-[11px]">Horizontal Cost / Unit</span>
                      <span className="text-base font-bold text-foreground">
                        {money(activeAssessment.roleProForma.townhome.horizontalCostPerUnit)} / unit
                      </span>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        High density reduces linear utility cost per unit
                      </p>
                    </div>

                    <div className="rounded-lg border border-border/50 bg-background/70 p-3">
                      <span className="text-muted-foreground block text-[11px]">Project Margin Target</span>
                      <span className="text-base font-bold text-emerald-400">
                        {activeAssessment.roleProForma.townhome.combinedMarginPct}% Combined Margin
                      </span>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Land MAO: {money(activeAssessment.roleProForma.townhome.maxAllowableOfferTotal)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {developmentRole === "commercial_pad" && activeAssessment.roleProForma.commercialPad && (
              <Card className="cyber-card lg:col-span-12 border-primary/30 bg-primary/5">
                <CardHeader className="pb-3 border-b border-primary/20">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Store className="size-4 text-primary" />
                      <CardTitle className="text-base font-bold">
                        Commercial Outparcel & Pad Development Pro Forma · NNN Ground Leases & Pad Sales
                      </CardTitle>
                    </div>
                    <span className="text-xs font-semibold text-primary">
                      {activeAssessment.roleProForma.commercialPad.outparcelsCount} Pad-Ready Outparcels
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-xs">
                    <div className="rounded-lg border border-border/50 bg-background/70 p-3">
                      <span className="text-muted-foreground block text-[11px]">Fee-Simple Pad Value</span>
                      <span className="text-base font-bold text-foreground">
                        {money(activeAssessment.roleProForma.commercialPad.avgPadPrice)} / pad
                      </span>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Total Pad Consideration: {money(activeAssessment.roleProForma.commercialPad.totalPadRevenue)}
                      </p>
                    </div>

                    <div className="rounded-lg border border-border/50 bg-background/70 p-3">
                      <span className="text-muted-foreground block text-[11px]">NNN Ground Lease Option</span>
                      <span className="text-base font-bold text-foreground">
                        {money(activeAssessment.roleProForma.commercialPad.annualGroundRentPerPad)} / yr rent
                      </span>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Capitalized @ {activeAssessment.roleProForma.commercialPad.groundLeaseCapRate}% Cap Rate
                      </p>
                    </div>

                    <div className="rounded-lg border border-border/50 bg-background/70 p-3">
                      <span className="text-muted-foreground block text-[11px]">PennDOT HOP Turning Lane</span>
                      <span className="text-base font-bold text-primary">
                        {money(activeAssessment.roleProForma.commercialPad.penndotHopTurnLaneEscrow)} Escrow
                      </span>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Auxiliary deceleration lane & traffic impact study
                      </p>
                    </div>

                    <div className="rounded-lg border border-border/50 bg-background/70 p-3">
                      <span className="text-muted-foreground block text-[11px]">Commercial Land MAO</span>
                      <span className="text-base font-bold text-emerald-400">
                        {money(activeAssessment.roleProForma.commercialPad.maxAllowableOfferTotal)}
                      </span>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {activeAssessment.roleProForma.commercialPad.farRatio} FAR · 65% Impervious Coverage
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {developmentRole === "industrial_logistics" && activeAssessment.roleProForma.industrialLogistics && (
              <Card className="cyber-card lg:col-span-12 border-primary/30 bg-primary/5">
                <CardHeader className="pb-3 border-b border-primary/20">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Factory className="size-4 text-primary" />
                      <CardTitle className="text-base font-bold">
                        Industrial Logistics & Warehouse Pad Pro Forma · WB-67 Truck Court
                      </CardTitle>
                    </div>
                    <span className="text-xs font-semibold text-primary">
                      {activeAssessment.roleProForma.industrialLogistics.potentialBuildingSqFt.toLocaleString()} SF Footprint
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-xs">
                    <div className="rounded-lg border border-border/50 bg-background/70 p-3">
                      <span className="text-muted-foreground block text-[11px]">Building Footprint (0.32 FAR)</span>
                      <span className="text-base font-bold text-foreground">
                        {activeAssessment.roleProForma.industrialLogistics.potentialBuildingSqFt.toLocaleString()} SF
                      </span>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        ~{activeAssessment.roleProForma.industrialLogistics.dockDoorsEstimated} Dock Doors Estimated
                      </p>
                    </div>

                    <div className="rounded-lg border border-border/50 bg-background/70 p-3">
                      <span className="text-muted-foreground block text-[11px]">Truck Court Clearance</span>
                      <span className="text-base font-bold text-foreground">
                        {activeAssessment.roleProForma.industrialLogistics.truckCourtDepthFt} ft Depth
                      </span>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        AASHTO WB-67 interstate semitrailer turning compliance
                      </p>
                    </div>

                    <div className="rounded-lg border border-border/50 bg-background/70 p-3">
                      <span className="text-muted-foreground block text-[11px]">Utility Capacities Required</span>
                      <span className="text-base font-bold text-primary">
                        {activeAssessment.roleProForma.industrialLogistics.fireFlowGpmRequired.toLocaleString()} GPM Fire Flow
                      </span>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        ESFR Sprinkler · {activeAssessment.roleProForma.industrialLogistics.powerCapacityKva.toLocaleString()} kVA 3-Phase Power
                      </p>
                    </div>

                    <div className="rounded-lg border border-border/50 bg-background/70 p-3">
                      <span className="text-muted-foreground block text-[11px]">Industrial Land MAO</span>
                      <span className="text-base font-bold text-emerald-400">
                        {money(activeAssessment.roleProForma.industrialLogistics.maxAllowableOfferTotal)}
                      </span>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        ${activeAssessment.roleProForma.industrialLogistics.padReadyValuePerSqFt} / SF Finished Pad Benchmark
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Pillar 1: Zoning & Entitlement */}
            <Card className="cyber-card lg:col-span-6 border-primary/20">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Scale className="size-4 text-primary" />
                    <CardTitle className="text-base font-bold">
                      1. Zoning & Entitlement Feasibility
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
                <div className="rounded-md border border-border/40 bg-muted/20 p-2.5">
                  <span className="font-semibold text-foreground">Classification: </span>
                  <span className="font-bold text-primary">{activeParcel.zoning}</span> —{" "}
                  <span className="text-muted-foreground">{activeParcel.zoningName}</span>
                </div>
                <ul className="space-y-1 text-muted-foreground">
                  {activeAssessment.pillars.zoning.details.map((detail, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="text-primary font-bold">•</span>
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Pillar 2: Site Civil & Environmental */}
            <Card className="cyber-card lg:col-span-6 border-primary/20">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="size-4 text-amber-500" />
                    <CardTitle className="text-base font-bold">
                      2. Site Civil & Environmental Triage
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
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded border border-border/40 p-2">
                    <span className="font-bold text-foreground block">Terrain Slope</span>
                    <span
                      className={cn(
                        "font-semibold",
                        activeParcel.slopePct > 15 ? "text-destructive" : "text-emerald-400",
                      )}
                    >
                      {activeParcel.slopePct}% grade ({activeParcel.slopePct > 15 ? "Steep Slope" : "Standard"})
                    </span>
                  </div>
                  <div className="rounded border border-border/40 p-2">
                    <span className="font-bold text-foreground block">FEMA Flood Zone</span>
                    <span className="font-semibold text-muted-foreground">
                      Zone {activeParcel.flood["5"] || "X"} ({activeParcel.flood["5"] === "AE" ? "100-Yr Hazard" : "Minimal"})
                    </span>
                  </div>
                </div>
                <ul className="space-y-1 text-muted-foreground">
                  {activeAssessment.pillars.civil.details.map((detail, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="text-primary font-bold">•</span>
                      <span>{detail}</span>
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
                    <span className="text-muted-foreground text-right">{activeParcel.utilities.water}</span>
                  </div>
                  <div className="flex items-start justify-between gap-2 border-t border-border/40 pt-1.5">
                    <span className="font-bold text-foreground">Sanitary Sewer:</span>
                    <span className="text-muted-foreground text-right">{activeParcel.utilities.sewer}</span>
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
                    <span className="font-semibold text-foreground block">Traffic Corridor (AADT)</span>
                    <span className="text-muted-foreground">
                      {activeParcel.aadt.toLocaleString()} vehicles/day
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold text-primary">
                    {activeParcel.aadt > 12000 ? "PennDOT HOP Required" : "Municipal Driveway Permit"}
                  </span>
                </div>

                <ul className="space-y-1 text-muted-foreground">
                  {activeAssessment.pillars.utilities.details.map((detail, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="text-primary font-bold">•</span>
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Pillar 4: Residual Financials & Interactive Inputs */}
            <Card className="cyber-card lg:col-span-6 border-primary/20">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DollarSign className="size-4 text-primary" />
                    <CardTitle className="text-base font-bold">
                      4. Residual Valuation & Land Budget
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
                <ul className="space-y-1 text-muted-foreground">
                  {activeAssessment.pillars.financial.details.map((detail, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="text-primary font-bold">•</span>
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>

                {/* Overrides Input Bar */}
                <div className="border-t border-border/40 pt-3 grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-muted-foreground block">
                      Target ASP ($)
                    </label>
                    <Input
                      type="number"
                      step={5000}
                      value={customAsp ?? (isUserPresetLocked && userPreset.customAsp ? userPreset.customAsp : activeAssessment.financials.finishedHomeAsp)}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setCustomAsp(val);
                        setUnderwritingDraft((prev) => ({ ...prev, customAsp: val }));
                      }}
                      className="h-8 text-xs mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-muted-foreground block">
                      Sitework/Lot ($)
                    </label>
                    <Input
                      type="number"
                      step={2500}
                      value={customSitework ?? activeAssessment.financials.horizontalCostPerLot}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setCustomSitework(val);
                        setUnderwritingDraft((prev) => ({ ...prev, siteworkPerUnit: val }));
                      }}
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

            {/* COMPREHENSIVE RESIDUAL LAND VALUE UNDERWRITING & USER COST LOCK */}
            <Card className="cyber-card lg:col-span-12 border-primary/30 bg-card/75 backdrop-blur-md">
              <CardHeader className="pb-3 border-b border-border/50">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <FileSpreadsheet className="size-5 text-primary" />
                    <div>
                      <CardTitle className="text-base font-bold flex items-center gap-2">
                        <span>Residual Land Value (MAO) Underwriting Model</span>
                        {isUserPresetLocked ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 text-emerald-400 px-2.5 py-0.5 text-[11px] font-bold border border-emerald-500/40">
                            <Lock className="size-3" /> Locked Defaults Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 text-amber-400 px-2.5 py-0.5 text-[11px] font-bold border border-amber-500/40">
                            <Unlock className="size-3" /> Live Inputs (Unsaved)
                          </span>
                        )}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Input, save, and lock in your standard cost assumptions for future use across all parcels.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {isUserPresetLocked ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={unlockPresetValues}
                        className="h-7 text-xs gap-1 border-border/60 hover:border-primary/50"
                      >
                        <Unlock className="size-3" /> Unlock to Edit
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => lockPresetValues(underwriteDraft)}
                        className="h-7 text-xs gap-1.5 bg-primary text-primary-foreground font-bold hover:brightness-110 active:scale-95 transition-all shadow-[0_0_12px_rgba(249,115,22,0.35)]"
                      >
                        <Lock className="size-3" /> Save &amp; Lock In My Defaults
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        resetPresetToBenchmarks();
                        setUnderwritingDraft(userPreset);
                        setCustomAsp(undefined);
                        setCustomSitework(undefined);
                      }}
                      className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
                      title="Reset all fields to regional county benchmarks"
                    >
                      <RotateCcw className="size-3" /> Reset Benchmarks
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-5 pt-4 text-xs">
                {/* 1. Interactive Inputs Grid */}
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                    <SlidersHorizontal className="size-3.5 text-primary" /> Cost Assumptions &amp; Underwriting Inputs
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-foreground block">
                        Sitework / Unit ($)
                      </label>
                      <Input
                        type="number"
                        step={1000}
                        value={underwriteDraft.siteworkPerUnit}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setUnderwritingDraft((prev) => ({ ...prev, siteworkPerUnit: val }));
                          if (isUserPresetLocked) lockPresetValues({ siteworkPerUnit: val });
                          else setCustomSitework(val);
                        }}
                        className="h-8 text-xs mt-1 bg-background/80"
                      />
                      <span className="text-[10px] text-muted-foreground mt-0.5 block">Standard: $22,000</span>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-foreground block">
                        Vertical Cost / Unit ($)
                      </label>
                      <Input
                        type="number"
                        step={2500}
                        value={underwriteDraft.verticalCostPerUnit}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setUnderwritingDraft((prev) => ({ ...prev, verticalCostPerUnit: val }));
                          if (isUserPresetLocked) lockPresetValues({ verticalCostPerUnit: val });
                        }}
                        className="h-8 text-xs mt-1 bg-background/80"
                      />
                      <span className="text-[10px] text-muted-foreground mt-0.5 block">Standard: $165,000</span>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-foreground block">
                        Soft Costs (%)
                      </label>
                      <Input
                        type="number"
                        step={0.5}
                        min={0}
                        max={30}
                        value={underwriteDraft.softCostPct}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setUnderwritingDraft((prev) => ({ ...prev, softCostPct: val }));
                          if (isUserPresetLocked) lockPresetValues({ softCostPct: val });
                        }}
                        className="h-8 text-xs mt-1 bg-background/80"
                      />
                      <span className="text-[10px] text-muted-foreground mt-0.5 block">Standard: 12%</span>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-foreground block">
                        Contingency (%)
                      </label>
                      <Input
                        type="number"
                        step={0.5}
                        min={0}
                        max={25}
                        value={underwriteDraft.contingencyPct}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setUnderwritingDraft((prev) => ({ ...prev, contingencyPct: val }));
                          if (isUserPresetLocked) lockPresetValues({ contingencyPct: val });
                        }}
                        className="h-8 text-xs mt-1 bg-background/80"
                      />
                      <span className="text-[10px] text-muted-foreground mt-0.5 block">Standard: 8%</span>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-foreground block">
                        Selling Costs (%)
                      </label>
                      <Input
                        type="number"
                        step={0.5}
                        min={0}
                        max={15}
                        value={underwriteDraft.sellingCostPct}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setUnderwritingDraft((prev) => ({ ...prev, sellingCostPct: val }));
                          if (isUserPresetLocked) lockPresetValues({ sellingCostPct: val });
                        }}
                        className="h-8 text-xs mt-1 bg-background/80"
                      />
                      <span className="text-[10px] text-muted-foreground mt-0.5 block">Standard: 6%</span>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-foreground block">
                        Target Profit Margin (%)
                      </label>
                      <Input
                        type="number"
                        step={0.5}
                        min={5}
                        max={40}
                        value={underwriteDraft.targetProfitMarginPct}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setUnderwritingDraft((prev) => ({ ...prev, targetProfitMarginPct: val }));
                          if (isUserPresetLocked) lockPresetValues({ targetProfitMarginPct: val });
                        }}
                        className="h-8 text-xs mt-1 bg-background/80"
                      />
                      <span className="text-[10px] text-muted-foreground mt-0.5 block">Standard: 18%</span>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-foreground block">
                        Offsite Infrastructure ($)
                      </label>
                      <Input
                        type="number"
                        step={25000}
                        value={underwriteDraft.offsiteInfrastructure}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setUnderwritingDraft((prev) => ({ ...prev, offsiteInfrastructure: val }));
                          if (isUserPresetLocked) lockPresetValues({ offsiteInfrastructure: val });
                        }}
                        className="h-8 text-xs mt-1 bg-background/80"
                      />
                      <span className="text-[10px] text-muted-foreground mt-0.5 block">Off-site roads/utilities</span>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-foreground block">
                        Entitlement Fees ($)
                      </label>
                      <Input
                        type="number"
                        step={10000}
                        value={underwriteDraft.entitlementFees}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setUnderwritingDraft((prev) => ({ ...prev, entitlementFees: val }));
                          if (isUserPresetLocked) lockPresetValues({ entitlementFees: val });
                        }}
                        className="h-8 text-xs mt-1 bg-background/80"
                      />
                      <span className="text-[10px] text-muted-foreground mt-0.5 block">Impact &amp; municipal escrow</span>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-foreground block">
                        Debt Share / Rate
                      </label>
                      <div className="grid grid-cols-2 gap-1 mt-1">
                        <Input
                          type="number"
                          step={1}
                          value={underwriteDraft.debtCostSharePct}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setUnderwritingDraft((prev) => ({ ...prev, debtCostSharePct: val }));
                            if (isUserPresetLocked) lockPresetValues({ debtCostSharePct: val });
                          }}
                          className="h-8 text-xs bg-background/80"
                          title="LTC Debt Share %"
                        />
                        <Input
                          type="number"
                          step={0.5}
                          value={underwriteDraft.annualInterestRatePct}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setUnderwritingDraft((prev) => ({ ...prev, annualInterestRatePct: val }));
                            if (isUserPresetLocked) lockPresetValues({ annualInterestRatePct: val });
                          }}
                          className="h-8 text-xs bg-background/80"
                          title="Annual Interest Rate %"
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground mt-0.5 block">65% LTC · 9.0% Rate</span>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-foreground block">
                        Target ASP ($)
                      </label>
                      <Input
                        type="number"
                        step={5000}
                        value={customAsp ?? (underwriteDraft.customAsp || activeAssessment.financials.finishedHomeAsp)}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setCustomAsp(val);
                          setUnderwritingDraft((prev) => ({ ...prev, customAsp: val }));
                          if (isUserPresetLocked) lockPresetValues({ customAsp: val });
                        }}
                        className="h-8 text-xs mt-1 bg-background/80"
                      />
                      <span className="text-[10px] text-muted-foreground mt-0.5 block">Average unit sale price</span>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-foreground block">
                        Potential Lots
                      </label>
                      <Input
                        type="number"
                        min={1}
                        value={customLots ?? activeAssessment.estimatedLots}
                        onChange={(e) => setCustomLots(Math.max(1, Number(e.target.value)))}
                        className="h-8 text-xs mt-1 bg-background/80"
                      />
                      <span className="text-[10px] text-muted-foreground mt-0.5 block">Gross yield override</span>
                    </div>

                    <div className="flex flex-col justify-end">
                      {!isUserPresetLocked ? (
                        <Button
                          onClick={() => lockPresetValues(underwriteDraft)}
                          className="h-8 text-xs font-bold gap-1 bg-primary text-primary-foreground hover:brightness-110 shadow-[0_0_10px_rgba(249,115,22,0.3)]"
                        >
                          <Lock className="size-3" /> Lock Defaults
                        </Button>
                      ) : (
                        <div className="rounded border border-emerald-500/30 bg-emerald-500/10 p-1.5 text-center text-[10px] text-emerald-400 font-semibold">
                          ✓ Locked Active
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. Live Residual Land Value Underwriting Table */}
                <div className="rounded-xl border border-border/50 bg-background/60 p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-2.5">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-primary">
                        Underwriting Cash Flow &amp; Residual Max Bid
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {residualSummary.potentialUnits} Lots · {money(residualSummary.averageUnitSalePrice)} ASP · {activeParcel.acres} Gross Acres
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground block">Suggested Max Bid (MAO)</span>
                      <span className="text-xl font-black text-emerald-400">
                        {money(residualSummary.suggestedMaxBid)}
                      </span>
                      <span className="text-[11px] text-muted-foreground block">
                        {money(residualSummary.residualValuePerAcre)} / acre · {money(residualSummary.residualValuePerUnit)} / lot
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                    <div className="rounded-lg border border-border/40 bg-muted/20 p-2.5 space-y-1">
                      <div className="flex justify-between text-muted-foreground">
                        <span>Gross Sellout Revenue:</span>
                        <span className="font-bold text-foreground">{money(residualSummary.grossSelloutRevenue)}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Selling Costs ({underwriteDraft.sellingCostPct}%):</span>
                        <span className="text-red-400">-{money(residualSummary.sellingCosts)}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Sitework Costs (${underwriteDraft.siteworkPerUnit.toLocaleString()}/lot):</span>
                        <span className="text-red-400">-{money(residualSummary.siteworkCosts)}</span>
                      </div>
                    </div>

                    <div className="rounded-lg border border-border/40 bg-muted/20 p-2.5 space-y-1">
                      <div className="flex justify-between text-muted-foreground">
                        <span>Vertical Costs (${underwriteDraft.verticalCostPerUnit.toLocaleString()}/unit):</span>
                        <span className="text-red-400">-{money(residualSummary.verticalCosts)}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Soft Costs ({underwriteDraft.softCostPct}%):</span>
                        <span className="text-red-400">-{money(residualSummary.softCosts)}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Contingency ({underwriteDraft.contingencyPct}%):</span>
                        <span className="text-red-400">-{money(residualSummary.contingency)}</span>
                      </div>
                    </div>

                    <div className="rounded-lg border border-border/40 bg-muted/20 p-2.5 space-y-1">
                      <div className="flex justify-between text-muted-foreground">
                        <span>Offsite Infrastructure:</span>
                        <span className="text-red-400">-{money(residualSummary.offsiteInfrastructure)}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Entitlement Fees:</span>
                        <span className="text-red-400">-{money(residualSummary.entitlementFees)}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Developer Profit ({underwriteDraft.targetProfitMarginPct}%):</span>
                        <span className="text-red-400">-{money(residualSummary.developerProfit)}</span>
                      </div>
                    </div>

                    <div className="rounded-lg border border-border/40 bg-muted/20 p-2.5 space-y-1">
                      <div className="flex justify-between text-muted-foreground font-semibold">
                        <span>Total Uses (Excl. Land):</span>
                        <span className="text-foreground">{money(residualSummary.totalUsesExcludingLand)}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Current Asking / Assessed:</span>
                        <span className="text-foreground font-bold">{money(residualSummary.askingOrAssessedPrice)}</span>
                      </div>
                      <div className="flex justify-between items-center pt-1 border-t border-border/40">
                        <span className="font-semibold text-foreground">Underwriting Spread:</span>
                        <span className={cn("font-black", residualSummary.isFeasible ? "text-emerald-400" : "text-amber-400")}>
                          {residualSummary.spreadAmount >= 0 ? "+" : ""}{money(residualSummary.spreadAmount)} ({residualSummary.spreadPercent}%)
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className={cn(
                    "rounded-lg p-2.5 border text-xs flex flex-wrap items-center justify-between gap-2",
                    residualSummary.isFeasible ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-amber-500/10 border-amber-500/30 text-amber-400"
                  )}>
                    <span className="font-medium">
                      {residualSummary.isFeasible
                        ? `✓ Feasible Acquisition: Asking price (${money(residualSummary.askingOrAssessedPrice)}) is within the suggested maximum bid (${money(residualSummary.suggestedMaxBid)}). Project supports ${underwriteDraft.targetProfitMarginPct}% target profit margin.`
                        : `⚠ Price Negotiation Recommended: Asking price (${money(residualSummary.askingOrAssessedPrice)}) exceeds suggested bid (${money(residualSummary.suggestedMaxBid)}) by ${money(Math.abs(residualSummary.spreadAmount))}. Negotiate land basis or adjust density.`}
                    </span>
                    <span className="text-[11px] font-mono text-muted-foreground">
                      LTC Debt: {money(residualSummary.debtAmount)} ({underwriteDraft.debtCostSharePct}%) · Equity Required: {money(residualSummary.equityRequired)}
                    </span>
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
                    <span className="font-bold text-foreground block">Governing Jurisdiction:</span>
                    <p className="text-muted-foreground font-medium">
                      {activeAssessment.approvalTimeline.governingBody}
                    </p>
                  </div>
                  <div className="rounded-md border border-border/40 p-2.5 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-foreground block">County Planning Review:</span>
                      {activeAssessment.approvalTimeline.meetingMinutesUrl && (
                        <a
                          href={activeAssessment.approvalTimeline.meetingMinutesUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                        >
                          <span>Meeting Minutes & Agendas</span>
                          <ExternalLink className="size-3" />
                        </a>
                      )}
                    </div>
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
                  {activeAssessment.approvalTimeline.reverseSubdivisionMonths && (
                    <div className="rounded border border-primary/30 bg-primary/10 p-2 text-primary font-semibold">
                      Reverse Subdivision (PA MPC Act 247): {activeAssessment.approvalTimeline.reverseSubdivisionMonths}
                    </div>
                  )}
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
                {activeParcel.address} ({activeParcel.municipality}) · {ROLE_LABELS[developmentRole].title}
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
          <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/10 p-4">
            <div>
              <h2 className="text-lg font-bold text-foreground">
                Central Pennsylvania Development Reference Library
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Official county datasets, SALDO screening standards, and state environmental permit matrices.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => setActiveMode("assessment")}
            >
              ← Return to Studio
            </Button>
          </div>

          <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-4">
            {FEASIBILITY_DATA_GROUPS.map((group) => {
              const sources = FEASIBILITY_DATA_SOURCES.filter((s) => s.mode === group.mode);
              return (
                <Card key={group.title} className="cyber-card border-primary/20">
                  <CardHeader className="pb-3 border-b border-border/40">
                    <div className="flex items-center gap-2">
                      <Database className="size-4 text-primary" />
                      <CardTitle className="text-sm font-bold">{group.title}</CardTitle>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">{group.description}</p>
                  </CardHeader>
                  <CardContent className="pt-3 space-y-3">
                    {sources.map((item) => (
                      <div key={item.id} className="text-xs border-b border-border/40 pb-2.5 last:border-none">
                        <div className="flex items-start justify-between gap-1">
                          <span className="font-semibold text-foreground text-[11px]">{item.title}</span>
                          <span className="rounded bg-muted px-1.5 py-0.5 text-[9px] text-muted-foreground shrink-0">
                            {item.status}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1">{item.use}</p>
                        <div className="mt-1 flex items-center justify-between text-[10px] text-primary">
                          <span>{item.provider}</span>
                          {item.url && (
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-0.5 hover:underline"
                            >
                              {item.id === "central-pa-market-report-2026-08"
                                ? "Download market report"
                                : "Official"}{" "}
                              <ExternalLink className="size-2.5" />
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </AppShell>
  );
}
