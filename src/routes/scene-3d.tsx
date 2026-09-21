import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/app-shell";
import { DEFAULT_HOUSE_SPEC } from "@/lib/subdivision/types";
import {
  Bot,
  Building2,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  MapPin,
  Waves,
  DollarSign,
  FileSpreadsheet,
  FileText,
  Download,
  Mountain,
  Droplets,
  HardHat,
  Sliders,
  Compass,
  Hammer,
  Sparkles,
  Info,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useEffect, useMemo, useState } from "react";
import { usePersistentDraft } from "@/lib/hooks/use-persistent-draft";
import { DataProtectionBadge } from "@/components/ui/data-protection-badge";
import { useHub } from "@/lib/store";
import { PARCELS } from "@/lib/data/parcels";
import {
  BUILDER_TIER_DETAILS,
  calculateDevelopmentCost,
  calculateRenovationCost,
} from "@/lib/subdivision/cost-estimator";
import { resolveAddressOrParcel } from "@/lib/subdivision/address-resolver";
import type {
  ArchitectureStyle,
  BuilderTier,
  CostBreakdown,
  FacadeMaterial,
  HouseDesignSpec,
  InteriorFlooring,
  InteriorWallColor,
  RenovationBreakdown,
  RenovationScope,
  RoofMaterial,
} from "@/lib/subdivision/types";

export interface Scene3DSearch {
  parcelId?: string;
}

export const Route = createFileRoute("/scene-3d")({
  validateSearch: (search: Record<string, unknown>): Scene3DSearch => ({
    parcelId: typeof search.parcelId === "string" ? search.parcelId : undefined,
  }),
  component: Scene3DPage,
});

type ActiveTab = "UnderwritingCost" | "ZoningRestrictions" | "SpecDesign";

function money(n: number) {
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function Scene3DPage() {
  const search = Route.useSearch();
  const selectParcel = useHub((s) => s.selectParcel);
  const selectedIds = useHub((s) => s.selectedIds);
  const activeHubParcelId =
    selectedIds.find((id) => PARCELS.some((p) => p.id === id)) ?? "p-hampden";

  // 1. Location & Parcel Selection State
  const [selectedParcelId, setSelectedParcelId] = useState<string>(
    () => search.parcelId || activeHubParcelId,
  );
  const [customAddressQuery, setCustomAddressQuery] = useState<string>("");

  useEffect(() => {
    if (search.parcelId && search.parcelId !== selectedParcelId) {
      setSelectedParcelId(search.parcelId);
      selectParcel(search.parcelId);
    }
  }, [search.parcelId, selectedParcelId, selectParcel]);

  const activeProfile = useMemo(() => {
    return resolveAddressOrParcel(customAddressQuery.trim() || selectedParcelId);
  }, [selectedParcelId, customAddressQuery]);

  const subdivisionConfig = activeProfile.subdivision;

  const [activeTab, setActiveTab] = useState<ActiveTab>("UnderwritingCost");

  // 2. House Design Spec State
  const [houseSpec, setHouseSpec] = useState<HouseDesignSpec>({
    ...DEFAULT_HOUSE_SPEC,
    stories: 2,
    totalSqft: 2900,
    sqftPerStory: 1450,
    heightFt: 31.2,
  });

  // Story Changer Helper
  const handleSetStories = (stories: 1 | 2 | 3 | 4) => {
    let sqft = 1850;
    let height = 19.5;
    if (stories === 2) {
      sqft = 2900;
      height = 31.2;
    } else if (stories === 3) {
      sqft = 3950;
      height = 41.5;
    } else if (stories === 4) {
      sqft = 5100;
      height = 51.8;
    }
    setHouseSpec((prev) => ({
      ...prev,
      stories,
      totalSqft: sqft,
      sqftPerStory: Math.round(sqft / stories),
      heightFt: height,
    }));
  };

  // 4. Cost Estimator & Pro Forma State with Accidental Data Loss Prevention (Per-Parcel Enclave)
  const {
    value: underwriteDraft,
    setValue: setUnderwriteDraft,
    isDirty: isUnderwriteDirty,
    isDraftRestored: isUnderwriteRestored,
    lastSavedAt: underwriteLastSavedAt,
    resetToDefault: resetUnderwriteDraft,
  } = usePersistentDraft<{
    finishTier: "standard" | "upgraded" | "luxury";
    builderTier: BuilderTier;
    targetSalePrice: number;
    landCostPerAcre: number;
    projectCostMode: "subdivision" | "renovation";
    renovationScope: RenovationScope;
    renovationSqft: number;
  }>(
    `scene3d_underwriting_v2_${selectedParcelId}`,
    {
      finishTier: "upgraded",
      builderTier: "regionalSemiCustom",
      targetSalePrice: 0,
      landCostPerAcre: 0,
      projectCostMode: "subdivision",
      renovationScope: "moderate",
      renovationSqft: 2400,
    },
    { enableBeforeUnloadWarn: true },
  );

  const customFinishTier = underwriteDraft.finishTier ?? "upgraded";
  const customBuilderTier = underwriteDraft.builderTier ?? "regionalSemiCustom";
  const customTargetSalePrice = underwriteDraft.targetSalePrice ?? 0;
  const customLandCostPerAcre = underwriteDraft.landCostPerAcre ?? 0;
  const projectCostMode = underwriteDraft.projectCostMode ?? "subdivision";
  const renovationScope = underwriteDraft.renovationScope ?? "moderate";
  const renovationSqft = underwriteDraft.renovationSqft ?? 2400;

  const setCustomFinishTier = (tier: "standard" | "upgraded" | "luxury") =>
    setUnderwriteDraft((prev) => ({ ...prev, finishTier: tier }));
  const setCustomBuilderTier = (tier: BuilderTier) =>
    setUnderwriteDraft((prev) => ({ ...prev, builderTier: tier }));
  const setCustomTargetSalePrice = (price: number) =>
    setUnderwriteDraft((prev) => ({ ...prev, targetSalePrice: price }));
  const setCustomLandCostPerAcre = (cost: number) =>
    setUnderwriteDraft((prev) => ({ ...prev, landCostPerAcre: cost }));
  const setProjectCostMode = (mode: "subdivision" | "renovation") =>
    setUnderwriteDraft((prev) => ({ ...prev, projectCostMode: mode }));
  const setRenovationScope = (scope: RenovationScope) =>
    setUnderwriteDraft((prev) => ({ ...prev, renovationScope: scope }));
  const setRenovationSqft = (sqft: number) =>
    setUnderwriteDraft((prev) => ({ ...prev, renovationSqft: sqft }));

  const costBreakdown: CostBreakdown = useMemo(() => {
    return calculateDevelopmentCost(subdivisionConfig, houseSpec, {
      customTargetSalePrice: customTargetSalePrice > 0 ? customTargetSalePrice : undefined,
      customRawLandCost: customLandCostPerAcre > 0 ? customLandCostPerAcre : undefined,
      customFinishTier,
      builderTier: customBuilderTier,
      renovationScope,
    });
  }, [
    subdivisionConfig,
    houseSpec,
    customFinishTier,
    customBuilderTier,
    renovationScope,
    customTargetSalePrice,
    customLandCostPerAcre,
  ]);

  const renovationBreakdown: RenovationBreakdown = useMemo(() => {
    return calculateRenovationCost(
      renovationSqft > 0 ? renovationSqft : houseSpec.totalSqft,
      subdivisionConfig.county,
      renovationScope,
    );
  }, [renovationSqft, houseSpec.totalSqft, subdivisionConfig.county, renovationScope]);

  // Height & Zoning Checks
  const isHeightExceeded = houseSpec.heightFt > subdivisionConfig.maxZoningHeight;
  const isCoverageCompliant =
    (houseSpec.footprintWidthFt * houseSpec.footprintDepthFt) /
      ((subdivisionConfig.grossAcres * 43560) / subdivisionConfig.totalLots) <=
    subdivisionConfig.maxLotCoverage / 100;

  // Export Spec & Underwriting Report
  const handleExportReport = () => {
    const reportData = {
      title: "Field ACQ Land Development Spec Design & Underwriting Report",
      generatedAt: new Date().toISOString(),
      location: {
        address: subdivisionConfig.address,
        parcelId: subdivisionConfig.parcelId,
        municipality: subdivisionConfig.municipality,
        county: subdivisionConfig.county,
        zoningCode: subdivisionConfig.zoningCode,
        zoningDistrict: subdivisionConfig.zoningName,
      },
      landDevelopmentMetrics: {
        grossAcres: subdivisionConfig.grossAcres,
        totalLots: subdivisionConfig.totalLots,
        centralStormwaterPondAcreage: subdivisionConfig.pondAcreage,
        openSpaceAcreage: subdivisionConfig.openSpaceAcreage,
        roadLengthLinearFt: subdivisionConfig.roadLengthLinearFt,
        slopePercentage: subdivisionConfig.slopePct,
        floodZone: subdivisionConfig.floodZone,
        karstLimestoneRisk: subdivisionConfig.karstRisk,
      },
      specHouseDesign: {
        stories: houseSpec.stories,
        architecturalStyle: houseSpec.style,
        facadeMaterial: houseSpec.facadeMaterial,
        roofMaterial: houseSpec.roofMaterial,
        garageBays: houseSpec.garageBays,
        totalSqft: houseSpec.totalSqft,
        totalHeightFt: houseSpec.heightFt,
        interiorFlooring: houseSpec.flooring,
        interiorWallPalette: houseSpec.wallColor,
      },
      underwritingAndCostEngine: {
        ...costBreakdown,
        builderTier: customBuilderTier,
        renovationEstimator: renovationBreakdown,
      },
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `underwriting-spec-report-${subdivisionConfig.parcelId}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppShell fullBleed>
      <div className="flex flex-col min-h-[calc(100dvh-5rem)] bg-background text-foreground">
        {/* Top Control & Location Selector Bar */}
        <div className="border-b border-border bg-card/75 px-4 py-3 md:px-6 backdrop-blur-md">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-sm">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-base md:text-lg font-bold tracking-tight text-foreground">
                    Subdivision & Residential Cost Engine
                  </h1>
                  <Badge
                    variant="outline"
                    className="text-xs bg-sky-500/10 text-sky-600 border-sky-500/30"
                  >
                    <Waves className="w-3 h-3 mr-1" />
                    Central Pond
                  </Badge>
                  <Badge
                    variant="outline"
                    className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                  >
                    <ShieldCheck className="w-3 h-3 mr-1" />
                    PA SALDO
                  </Badge>
                  <Badge
                    variant="outline"
                    className="text-xs bg-primary/10 text-primary border-primary/30"
                  >
                    Cost Engine
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Civil infrastructure estimating, SEC 10-K public homebuilder benchmarks, zoning &
                  topography analysis, and location-tied underwriting.
                </p>
              </div>
            </div>

            {/* Address / Parcel Selector */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <div className="flex items-center gap-1.5 p-1 rounded-lg bg-muted/60 border border-border">
                <MapPin className="w-3.5 h-3.5 text-primary ml-1.5" />
                <select
                  aria-label="Select Pennsylvania regional parcel"
                  value={selectedParcelId}
                  onChange={(e) => {
                    setSelectedParcelId(e.target.value);
                    setCustomAddressQuery("");
                  }}
                  className="bg-transparent text-xs font-medium text-foreground py-1 pr-2 outline-none cursor-pointer"
                >
                  <optgroup label="Cumberland County">
                    {PARCELS.filter((p) => p.county === "Cumberland").map((p) => (
                      <option key={p.id} value={p.id} className="bg-popover text-foreground">
                        {p.address} ({p.municipality})
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="York County">
                    {PARCELS.filter((p) => p.county === "York").map((p) => (
                      <option key={p.id} value={p.id} className="bg-popover text-foreground">
                        {p.address} ({p.municipality})
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Dauphin County">
                    {PARCELS.filter((p) => p.county === "Dauphin").map((p) => (
                      <option key={p.id} value={p.id} className="bg-popover text-foreground">
                        {p.address} ({p.municipality})
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Lancaster County">
                    {PARCELS.filter((p) => p.county === "Lancaster").map((p) => (
                      <option key={p.id} value={p.id} className="bg-popover text-foreground">
                        {p.address} ({p.municipality})
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              {/* Custom Search Input */}
              <div className="w-48 hidden sm:block">
                <Input
                  type="text"
                  placeholder="Or custom PA address..."
                  value={customAddressQuery}
                  onChange={(e) => setCustomAddressQuery(e.target.value)}
                  className="h-8 text-xs bg-muted/60"
                />
              </div>

              <DataProtectionBadge
                isDirty={isUnderwriteDirty}
                isDraftRestored={isUnderwriteRestored}
                lastSavedAt={underwriteLastSavedAt}
                onReset={resetUnderwriteDraft}
              />

              <div className="flex items-center gap-1.5 ml-auto">
                <Button asChild variant="outline" size="sm" className="h-8 text-xs gap-1">
                  <Link
                    to="/acquire"
                    search={{ parcelId: subdivisionConfig.parcelId, tab: "Report" }}
                  >
                    <FileSpreadsheet className="size-3.5 text-primary" /> Feasibility
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm" className="h-8 text-xs gap-1">
                  <Link
                    to="/aide"
                    search={{
                      county: subdivisionConfig.county,
                      municipality: subdivisionConfig.municipality,
                      q: `What are the setbacks and subdivision standards in ${subdivisionConfig.municipality} (${subdivisionConfig.county} County)?`,
                    }}
                  >
                    <Bot className="size-3.5 text-cyan-600 dark:text-cyan-400" /> Ask AI
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm" className="h-8 text-xs gap-1">
                  <Link
                    to="/directory"
                    search={{
                      search: subdivisionConfig.municipality,
                      tab: "municipalities",
                    }}
                  >
                    <Compass className="size-3.5 text-emerald-600 dark:text-emerald-400" />{" "}
                    Municipal Directory
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Location Metrics Banner */}
        <div className="bg-card/40 border-b border-border px-4 py-2 md:px-6 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 font-medium text-foreground">
              <span className="text-muted-foreground">Location:</span>
              <span>{subdivisionConfig.address}</span>
              <span className="text-muted-foreground">
                ({subdivisionConfig.municipality}, {subdivisionConfig.county} Co.)
              </span>
            </div>
            <span>•</span>
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">Zoning:</span>
              <Badge variant="outline" className="text-[11px] font-semibold text-primary">
                {subdivisionConfig.zoningCode}
              </Badge>
            </div>
            <span>•</span>
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">Gross Area:</span>
              <span className="font-semibold">{subdivisionConfig.grossAcres} Acres</span>
            </div>
            <span>•</span>
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">Lot Yield:</span>
              <span className="font-semibold text-sky-600 dark:text-sky-400">
                {subdivisionConfig.totalLots} Platted Lots
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Mountain className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-muted-foreground">Slope:</span>
              <span className="font-semibold">{subdivisionConfig.slopePct}%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Droplets className="w-3.5 h-3.5 text-sky-500" />
              <span className="text-muted-foreground">Flood:</span>
              <span className="font-semibold">Zone {subdivisionConfig.floodZone}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-muted-foreground">Karst:</span>
              <span className="font-semibold">{subdivisionConfig.karstRisk}</span>
            </div>
          </div>
        </div>

        {/* Main Workspace Area */}
        <div className="flex-1 p-3 pb-36 md:p-6 md:pb-52 flex flex-col gap-6">
          {/* Sub-Workspaces & Tools Tabs */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab("UnderwritingCost")}
                  className={cn(
                    "flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 border",
                    activeTab === "UnderwritingCost"
                      ? "bg-transparent text-foreground font-bold border-orange-500/60 shadow-[0_0_15px_rgba(249,115,22,0.4)]"
                      : "bg-transparent text-muted-foreground hover:text-foreground border-transparent hover:border-border/60",
                  )}
                >
                  <DollarSign className="w-3.5 h-3.5 text-orange-400" />
                  <span>Cost Estimator & Underwriting</span>
                </button>

                <button
                  onClick={() => setActiveTab("ZoningRestrictions")}
                  className={cn(
                    "flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 border",
                    activeTab === "ZoningRestrictions"
                      ? "bg-transparent text-foreground font-bold border-orange-500/60 shadow-[0_0_15px_rgba(249,115,22,0.4)]"
                      : "bg-transparent text-muted-foreground hover:text-foreground border-transparent hover:border-border/60",
                  )}
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-orange-400" />
                  <span>Zoning & Topography</span>
                </button>

                <button
                  onClick={() => setActiveTab("SpecDesign")}
                  className={cn(
                    "flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 border",
                    activeTab === "SpecDesign"
                      ? "bg-transparent text-foreground font-bold border-orange-500/60 shadow-[0_0_15px_rgba(249,115,22,0.4)]"
                      : "bg-transparent text-muted-foreground hover:text-foreground border-transparent hover:border-border/60",
                  )}
                >
                  <FileText className="w-3.5 h-3.5 text-orange-400" />
                  <span>Spec Design Sheet</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleExportReport}
                  className="text-xs h-8"
                >
                  <Download className="w-3.5 h-3.5 mr-1.5 text-primary" />
                  Export Spec & Underwriting Report (JSON)
                </Button>
              </div>
            </div>

            {/* TAB 2: ZONING & TOPOGRAPHY RESTRICTIONS */}
            {activeTab === "ZoningRestrictions" && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Dimensional Zoning Invariants */}
                <Card className="shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-primary" />
                      <span>Municipal Zoning Requirements</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-xs">
                    <div className="p-2.5 rounded-lg bg-muted/50 border border-border">
                      <div className="font-semibold text-foreground">
                        {subdivisionConfig.zoningName}
                      </div>
                      <div className="text-muted-foreground text-[11px] mt-0.5">
                        Jurisdiction: {subdivisionConfig.municipality} (SALDO & Zoning Ordinance)
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center py-1 border-b border-border">
                        <span className="text-muted-foreground">Front Yard Setback:</span>
                        <div className="flex items-center gap-1.5 font-semibold">
                          <span>{subdivisionConfig.setbacks.front}&apos; min</span>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        </div>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-border">
                        <span className="text-muted-foreground">Side Yard Setback:</span>
                        <div className="flex items-center gap-1.5 font-semibold">
                          <span>{subdivisionConfig.setbacks.side}&apos; min</span>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        </div>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-border">
                        <span className="text-muted-foreground">Rear Yard Setback:</span>
                        <div className="flex items-center gap-1.5 font-semibold">
                          <span>{subdivisionConfig.setbacks.rear}&apos; min</span>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        </div>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-border">
                        <span className="text-muted-foreground">Max Building Height:</span>
                        <div className="flex items-center gap-1.5 font-semibold">
                          <span>{subdivisionConfig.maxZoningHeight}&apos; max</span>
                          {isHeightExceeded ? (
                            <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          )}
                        </div>
                      </div>
                      <div className="flex justify-between items-center py-1">
                        <span className="text-muted-foreground">Max Lot Coverage:</span>
                        <div className="flex items-center gap-1.5 font-semibold">
                          <span>{subdivisionConfig.maxLotCoverage}%</span>
                          {isCoverageCompliant ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Topography & Soil Constraints */}
                <Card className="shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Mountain className="w-4 h-4 text-emerald-600" />
                      <span>Topography & Grading Analysis</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-xs">
                    <div className="flex justify-between py-1 border-b border-border">
                      <span className="text-muted-foreground">Average Slope Grade:</span>
                      <span className="font-semibold">{subdivisionConfig.slopePct}%</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border">
                      <span className="text-muted-foreground">PA SALDO Slope Category:</span>
                      <span className="font-semibold text-foreground">
                        {subdivisionConfig.slopePct > 15
                          ? "Steep Slope (>15% Conservation)"
                          : subdivisionConfig.slopePct > 8
                            ? "Moderate Slope (8-15%)"
                            : "Gentle / Favorable (0-8%)"}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border">
                      <span className="text-muted-foreground">Grading & Earthwork:</span>
                      <span className="font-semibold">
                        {subdivisionConfig.slopePct > 15
                          ? "Engineered benching & silt fencing"
                          : "Balanced on-site cut & fill"}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border">
                      <span className="text-muted-foreground">FEMA Floodplain Status:</span>
                      <span
                        className={`font-semibold ${
                          subdivisionConfig.floodZone === "AE" ? "text-red-500" : "text-emerald-600"
                        }`}
                      >
                        Zone {subdivisionConfig.floodZone}{" "}
                        {subdivisionConfig.floodZone === "X"
                          ? "(Minimal Flood Hazard)"
                          : "(Floodplain Fringe)"}
                      </span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-muted-foreground">Karst Limestone Geology:</span>
                      <span
                        className={`font-semibold ${
                          subdivisionConfig.karstRisk === "High"
                            ? "text-amber-600"
                            : "text-foreground"
                        }`}
                      >
                        {subdivisionConfig.karstRisk} Risk{" "}
                        {subdivisionConfig.karstRisk !== "Low"
                          ? "(GCL pond liner required)"
                          : "(Standard basin)"}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Infrastructure & Utilities Connections */}
                <Card className="shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <HardHat className="w-4 h-4 text-sky-600" />
                      <span>Infrastructure & Utility Capacity</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-xs">
                    <div className="space-y-2">
                      <div className="p-2 rounded bg-muted/40 border border-border">
                        <span className="text-muted-foreground font-medium block">
                          Potable Water Service:
                        </span>
                        <span className="font-semibold text-foreground">
                          {subdivisionConfig.utilities.water}
                        </span>
                      </div>
                      <div className="p-2 rounded bg-muted/40 border border-border">
                        <span className="text-muted-foreground font-medium block">
                          Sanitary Sewer Service:
                        </span>
                        <span className="font-semibold text-foreground">
                          {subdivisionConfig.utilities.sewer}
                        </span>
                      </div>
                      <div className="p-2 rounded bg-muted/40 border border-border">
                        <span className="text-muted-foreground font-medium block">
                          Electric Service:
                        </span>
                        <span className="font-semibold text-foreground">
                          {subdivisionConfig.utilities.electric}
                        </span>
                      </div>
                      <div className="p-2 rounded bg-muted/40 border border-border">
                        <span className="text-muted-foreground font-medium block">
                          Natural Gas Service:
                        </span>
                        <span className="font-semibold text-foreground">
                          {subdivisionConfig.utilities.gas}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* TAB 3: SPEC DESIGN SHEET */}
            {activeTab === "SpecDesign" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-primary" />
                        <span>Architectural Spec Sheet: Residential Plan</span>
                      </span>
                      <Badge variant="outline" className="text-[10px]">
                        {houseSpec.stories} {houseSpec.stories === 1 ? "Story" : "Stories"}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 text-xs">
                    {/* Story Selection */}
                    <div>
                      <span className="text-muted-foreground font-medium block mb-1.5">
                        Story Configuration:
                      </span>
                      <div className="grid grid-cols-4 gap-1.5">
                        {[1, 2, 3, 4].map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => handleSetStories(s as 1 | 2 | 3 | 4)}
                            className={cn(
                              "py-1.5 text-center rounded-md font-bold transition-all border",
                              houseSpec.stories === s
                                ? "bg-transparent text-foreground font-bold border-orange-500/60 shadow-[0_0_15px_rgba(249,115,22,0.4)]"
                                : "bg-transparent hover:bg-muted/30 text-muted-foreground hover:text-foreground border-border/60",
                            )}
                          >
                            {s}F
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-lg bg-muted/40 border border-border">
                        <span className="text-muted-foreground block">Building Footprint:</span>
                        <span className="font-bold text-sm">
                          {houseSpec.footprintWidthFt}&apos; W × {houseSpec.footprintDepthFt}&apos;
                          D
                        </span>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/40 border border-border">
                        <span className="text-muted-foreground block">Total Finished SF:</span>
                        <span className="font-bold text-sm text-primary">
                          {houseSpec.totalSqft.toLocaleString()} Sq. Ft.
                        </span>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/40 border border-border">
                        <span className="text-muted-foreground block">Ridge Peak Elevation:</span>
                        <span
                          className={`font-bold text-sm ${
                            isHeightExceeded ? "text-red-500" : "text-emerald-600"
                          }`}
                        >
                          {houseSpec.heightFt}&apos; Above Grade
                        </span>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/40 border border-border">
                        <span className="text-muted-foreground block">Max Zoning Height:</span>
                        <span className="font-bold text-sm">
                          {subdivisionConfig.maxZoningHeight}&apos; Max Allowed
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-border space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-muted-foreground block mb-1 font-medium">
                            Architectural Style:
                          </label>
                          <select
                            value={houseSpec.style}
                            onChange={(e) =>
                              setHouseSpec((prev) => ({
                                ...prev,
                                style: e.target.value as ArchitectureStyle,
                              }))
                            }
                            className="w-full p-1.5 rounded border border-border bg-background text-foreground text-xs"
                          >
                            <option value="modernCraftsman">Modern Craftsman</option>
                            <option value="traditionalColonial">Traditional Colonial</option>
                            <option value="modernFarmhouse">Modern Farmhouse</option>
                            <option value="contemporary">Contemporary Minimalist</option>
                            <option value="europeanCountry">European Country Manor</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-muted-foreground block mb-1 font-medium">
                            Garage Capacity:
                          </label>
                          <div className="grid grid-cols-3 gap-1">
                            {[1, 2, 3].map((g) => (
                              <button
                                key={g}
                                type="button"
                                onClick={() =>
                                  setHouseSpec((prev) => ({ ...prev, garageBays: g as 1 | 2 | 3 }))
                                }
                                className={cn(
                                  "py-1.5 text-center rounded border font-semibold text-xs transition-all",
                                  houseSpec.garageBays === g
                                    ? "bg-transparent text-foreground font-bold border-orange-500/60 shadow-[0_0_15px_rgba(249,115,22,0.4)]"
                                    : "bg-transparent border-border/60 text-muted-foreground hover:text-foreground",
                                )}
                              >
                                {g} Bay
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-muted-foreground block mb-1 font-medium">
                            Exterior Facade:
                          </label>
                          <select
                            value={houseSpec.facadeMaterial}
                            onChange={(e) =>
                              setHouseSpec((prev) => ({
                                ...prev,
                                facadeMaterial: e.target.value as FacadeMaterial,
                              }))
                            }
                            className="w-full p-1.5 rounded border border-border bg-background text-foreground text-xs"
                          >
                            <option value="vinyl">Vinyl Siding</option>
                            <option value="hardiePlank">James Hardie Fiber Cement</option>
                            <option value="brickPartial">Partial Masonry / Brick Front</option>
                            <option value="brickFull">Full Brick Veneer</option>
                            <option value="stoneAccent">Fieldstone & Ledgerock Accent</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-muted-foreground block mb-1 font-medium">
                            Roof System:
                          </label>
                          <select
                            value={houseSpec.roofMaterial}
                            onChange={(e) =>
                              setHouseSpec((prev) => ({
                                ...prev,
                                roofMaterial: e.target.value as RoofMaterial,
                              }))
                            }
                            className="w-full p-1.5 rounded border border-border bg-background text-foreground text-xs"
                          >
                            <option value="asphaltShingle">Architectural Asphalt Shingles</option>
                            <option value="metalStandingSeam">Standing Seam Metal Roof</option>
                            <option value="slateTile">Synthetic Slate Tile</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-muted-foreground block mb-1 font-medium">
                            Primary Flooring:
                          </label>
                          <select
                            value={houseSpec.flooring}
                            onChange={(e) =>
                              setHouseSpec((prev) => ({
                                ...prev,
                                flooring: e.target.value as InteriorFlooring,
                              }))
                            }
                            className="w-full p-1.5 rounded border border-border bg-background text-foreground text-xs"
                          >
                            <option value="oakHardwood">Engineered White Oak Hardwood</option>
                            <option value="luxuryVinylPlank">Commercial Grade LVP</option>
                            <option value="porcelainTile">Porcelain Tile & Natural Stone</option>
                            <option value="plushCarpet">Plush Nylon Carpet</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-muted-foreground block mb-1 font-medium">
                            Interior Wall Palette:
                          </label>
                          <select
                            value={houseSpec.wallColor}
                            onChange={(e) =>
                              setHouseSpec((prev) => ({
                                ...prev,
                                wallColor: e.target.value as InteriorWallColor,
                              }))
                            }
                            className="w-full p-1.5 rounded border border-border bg-background text-foreground text-xs"
                          >
                            <option value="agreeableGray">Agreeable Gray (SW 7029)</option>
                            <option value="pureWhite">Pure White (SW 7005)</option>
                            <option value="navalNavy">Naval Blue (SW 6244)</option>
                            <option value="sageGreen">Clary Sage (SW 6178)</option>
                            <option value="charcoal">Iron Ore Charcoal (SW 7069)</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Waves className="w-4 h-4 text-sky-600" />
                      <span>Land Development Master Plan Specs</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-xs">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-lg bg-muted/40 border border-border">
                        <span className="text-muted-foreground block">Gross Parcel Tract:</span>
                        <span className="font-bold text-sm">
                          {subdivisionConfig.grossAcres} Acres
                        </span>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/40 border border-border">
                        <span className="text-muted-foreground block">Platted Lot Count:</span>
                        <span className="font-bold text-sm text-sky-600">
                          {subdivisionConfig.totalLots} Building Lots
                        </span>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/40 border border-border">
                        <span className="text-muted-foreground block">Central Pond Basin:</span>
                        <span className="font-bold text-sm text-primary">
                          {subdivisionConfig.pondAcreage} Ac / {subdivisionConfig.pondRadiusFt}
                          &apos;
                        </span>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/40 border border-border">
                        <span className="text-muted-foreground block">Dedicated Open Space:</span>
                        <span className="font-bold text-sm">
                          {subdivisionConfig.openSpaceAcreage} Acres
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-border space-y-2">
                      <div className="flex justify-between py-1 border-b border-border">
                        <span className="text-muted-foreground">Paved Street Network:</span>
                        <span className="font-semibold">
                          {subdivisionConfig.roadLengthLinearFt.toLocaleString()} LF (28&apos; Curb
                          to Curb)
                        </span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-border">
                        <span className="text-muted-foreground">Sidewalks & Trails:</span>
                        <span className="font-semibold">
                          5&apos; Concrete + Pond Perimeter Loop
                        </span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-border">
                        <span className="text-muted-foreground">Stormwater Management:</span>
                        <span className="font-semibold">
                          PA DEP Chapter 102 E&S & NPDES Phase II Wet Retention
                        </span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-muted-foreground">Community Amenities:</span>
                        <span className="font-semibold">
                          Aeration Fountain, Park Benches & Trail
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* TAB 4: COST ESTIMATOR & UNDERWRITING ENGINE */}
            {activeTab === "UnderwritingCost" && (
              <div className="flex flex-col gap-4">
                {/* Mode Selector & Location Banner */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-2 rounded-xl bg-card border border-border">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setProjectCostMode("subdivision")}
                      className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border",
                        projectCostMode === "subdivision"
                          ? "bg-transparent text-foreground font-bold border-orange-500/60 shadow-[0_0_15px_rgba(249,115,22,0.4)]"
                          : "bg-transparent border-border/60 text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <Building2 className="w-3.5 h-3.5 text-orange-400" />
                      <span>New Subdivision Land Development</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setProjectCostMode("renovation")}
                      className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border",
                        projectCostMode === "renovation"
                          ? "bg-transparent text-foreground font-bold border-orange-500/60 shadow-[0_0_15px_rgba(249,115,22,0.4)]"
                          : "bg-transparent border-border/60 text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <Hammer className="w-3.5 h-3.5 text-orange-400" />
                      <span>Existing Home Renovation & Remodel</span>
                    </button>
                  </div>

                  <Badge variant="outline" className="text-xs text-muted-foreground">
                    {costBreakdown.locationName}
                  </Badge>
                </div>

                {/* Underwriting Sensitivity & Assumptions Panel */}
                <Card className="shadow-sm border-primary/20 bg-card/60 backdrop-blur-sm">
                  <CardHeader className="pb-2.5">
                    <CardTitle className="text-sm flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-primary">
                        <Sliders className="w-4 h-4" />
                        Underwriting Assumptions & Cost Models
                      </span>
                      <span className="text-xs text-muted-foreground">
                        SEC Form 10-K & Regional Subcontractor Benchmarks
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3.5 text-xs">
                    {/* Builder Class / Procurement Tier Selector */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-muted-foreground font-semibold">
                          Builder Tier & Procurement Scale (SEC 10-K Benchmarks):
                        </span>
                        <span className="text-primary font-bold">
                          {BUILDER_TIER_DETAILS[customBuilderTier].targetHardCostPerSqft} direct hard cost
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        {(
                          [
                            {
                              id: "publicProduction" as const,
                              label: "Public Production Builder",
                              peers: "Ryan Homes (NVR), D.R. Horton, Lennar",
                              hardCost: "$75 - $95 / SF",
                            },
                            {
                              id: "regionalSemiCustom" as const,
                              label: "Regional Semi-Custom",
                              peers: "Landmark, EGStoltzfus, Keystone Custom",
                              hardCost: "$130 - $165 / SF",
                            },
                            {
                              id: "customArchitectural" as const,
                              label: "Custom Architectural",
                              peers: "Musser, Custom Creations, Ironstone",
                              hardCost: "$210 - $295+ / SF",
                            },
                          ] as const
                        ).map((tier) => (
                          <button
                            key={tier.id}
                            type="button"
                            onClick={() => setCustomBuilderTier(tier.id)}
                            className={cn(
                              "p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between gap-1",
                              customBuilderTier === tier.id
                                ? "bg-transparent text-foreground font-bold border-orange-500/60 shadow-[0_0_15px_rgba(249,115,22,0.4)]"
                                : "bg-transparent border-border/60 text-muted-foreground hover:text-foreground",
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-xs text-foreground">{tier.label}</span>
                              <span className="text-[11px] font-bold text-primary">{tier.hardCost}</span>
                            </div>
                            <span className="text-[10px] text-muted-foreground line-clamp-1">
                              {tier.peers}
                            </span>
                          </button>
                        ))}
                      </div>

                      <div className="mt-2 p-2.5 rounded-lg bg-muted/40 border border-border flex items-start gap-2 text-[11px]">
                        <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        <div className="space-y-0.5">
                          <span className="font-medium text-foreground block">
                            {BUILDER_TIER_DETAILS[customBuilderTier].name}:{" "}
                            <span className="text-muted-foreground font-normal">
                              {BUILDER_TIER_DETAILS[customBuilderTier].description}
                            </span>
                          </span>
                          <span className="text-muted-foreground block">
                            <strong className="text-foreground">Supply Chain Advantage:</strong>{" "}
                            {BUILDER_TIER_DETAILS[customBuilderTier].procurementAdvantage}
                          </span>
                        </div>
                      </div>
                    </div>

                    {projectCostMode === "subdivision" ? (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-border">
                        <div>
                          <span className="text-muted-foreground font-medium block mb-1">
                            Finish Quality Tier:
                          </span>
                          <div className="grid grid-cols-3 gap-1">
                            {(["standard", "upgraded", "luxury"] as const).map((tier) => (
                              <button
                                key={tier}
                                type="button"
                                onClick={() => setCustomFinishTier(tier)}
                                className={cn(
                                  "py-1.5 px-2 rounded-full border text-center font-semibold capitalize transition-all",
                                  customFinishTier === tier
                                    ? "bg-transparent text-foreground font-bold border-orange-500/60 shadow-[0_0_15px_rgba(249,115,22,0.4)]"
                                    : "bg-transparent border-border/60 text-muted-foreground hover:text-foreground",
                                )}
                              >
                                {tier}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <span className="text-muted-foreground font-medium block mb-1">
                            Target Sale Price (ASP) / Home:
                          </span>
                          <div className="flex items-center gap-1.5">
                            <Input
                              type="number"
                              placeholder={`${costBreakdown.projectedSalePricePerHome}`}
                              value={customTargetSalePrice || ""}
                              onChange={(e) => setCustomTargetSalePrice(Number(e.target.value))}
                              className="h-8 text-xs bg-background"
                            />
                            {customTargetSalePrice > 0 && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setCustomTargetSalePrice(0)}
                                className="h-8 px-2 text-xs text-muted-foreground"
                              >
                                Reset
                              </Button>
                            )}
                          </div>
                        </div>

                        <div>
                          <span className="text-muted-foreground font-medium block mb-1">
                            Land Acquisition Cost ($/Acre):
                          </span>
                          <div className="flex items-center gap-1.5">
                            <Input
                              type="number"
                              placeholder={`${costBreakdown.landCostPerAcre}`}
                              value={customLandCostPerAcre || ""}
                              onChange={(e) => setCustomLandCostPerAcre(Number(e.target.value))}
                              className="h-8 text-xs bg-background"
                            />
                            {customLandCostPerAcre > 0 && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setCustomLandCostPerAcre(0)}
                                className="h-8 px-2 text-xs text-muted-foreground"
                              >
                                Reset
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Renovation Inputs */
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-border">
                        <div className="md:col-span-2">
                          <span className="text-muted-foreground font-medium block mb-1">
                            Renovation Scope of Work:
                          </span>
                          <div className="grid grid-cols-3 gap-1.5">
                            {(
                              [
                                { id: "cosmetic" as const, label: "Cosmetic Refresh", range: "$38 - $75/SF" },
                                { id: "moderate" as const, label: "Moderate Remodel", range: "$80 - $160/SF" },
                                { id: "fullGut" as const, label: "Full Gut to Studs", range: "$130 - $235/SF" },
                              ] as const
                            ).map((s) => (
                              <button
                                key={s.id}
                                type="button"
                                onClick={() => setRenovationScope(s.id)}
                                className={cn(
                                  "py-1.5 px-2 rounded-xl border text-center transition-all flex flex-col items-center justify-center",
                                  renovationScope === s.id
                                    ? "bg-transparent text-foreground font-bold border-orange-500/60 shadow-[0_0_15px_rgba(249,115,22,0.4)]"
                                    : "bg-transparent border-border/60 text-muted-foreground hover:text-foreground",
                                )}
                              >
                                <span className="font-semibold text-xs leading-tight">{s.label}</span>
                                <span className="text-[10px] text-muted-foreground mt-0.5">{s.range}</span>
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <span className="text-muted-foreground font-medium block mb-1">
                            Existing Home Total Sq. Ft.:
                          </span>
                          <Input
                            type="number"
                            value={renovationSqft || ""}
                            onChange={(e) => setRenovationSqft(Number(e.target.value))}
                            className="h-8 text-xs bg-background"
                            placeholder="2400"
                          />
                          <span className="text-[10px] text-muted-foreground mt-1 block">
                            Living area requiring renovation in {subdivisionConfig.county} County.
                          </span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* PROJECT MODE: SUBDIVISION LAND DEVELOPMENT */}
                {projectCostMode === "subdivision" ? (
                  <>
                    {/* Executive Underwriting Pro Forma KPI Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div className="p-4 rounded-xl border border-border bg-card shadow-sm">
                        <span className="text-xs font-medium text-muted-foreground block">
                          Total Development Cost (TDC)
                        </span>
                        <div className="text-xl font-bold text-foreground mt-1">
                          {money(costBreakdown.totalDevelopmentCost)}
                        </div>
                        <span className="text-[11px] text-muted-foreground">
                          {money(costBreakdown.breakevenPricePerHome)} per lot all-in
                        </span>
                      </div>

                      <div className="p-4 rounded-xl border border-border bg-card shadow-sm">
                        <span className="text-xs font-medium text-muted-foreground block">
                          Gross Development Value (GDV)
                        </span>
                        <div className="text-xl font-bold text-sky-600 dark:text-sky-400 mt-1">
                          {money(costBreakdown.grossDevelopmentValue)}
                        </div>
                        <span className="text-[11px] text-muted-foreground">
                          {costBreakdown.projectedSalePricePerHome.toLocaleString("en-US", {
                            style: "currency",
                            currency: "USD",
                            maximumFractionDigits: 0,
                          })}{" "}
                          avg. ASP
                        </span>
                      </div>

                      <div className="p-4 rounded-xl border border-border bg-card shadow-sm">
                        <span className="text-xs font-medium text-muted-foreground block">
                          Net Developer Profit
                        </span>
                        <div className="text-xl font-bold text-emerald-600 mt-1">
                          {money(costBreakdown.netDeveloperProfit)}
                        </div>
                        <span className="text-[11px] font-semibold text-emerald-600">
                          {costBreakdown.developerMarginPct}% Gross Margin
                        </span>
                      </div>

                      <div className="p-4 rounded-xl border border-border bg-card shadow-sm">
                        <span className="text-xs font-medium text-muted-foreground block">
                          Return on Cost (ROC) & Multiple
                        </span>
                        <div className="text-xl font-bold text-primary mt-1">
                          {costBreakdown.returnOnCostPct}% ROC
                        </div>
                        <span className="text-[11px] font-semibold text-foreground">
                          {costBreakdown.equityMultiple}x Equity Multiple
                        </span>
                      </div>
                    </div>

                    {/* Detailed Itemized Development Cost Tables */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Horizontal Civil Work */}
                      <Card className="shadow-sm">
                        <CardHeader className="pb-2.5">
                          <CardTitle className="text-sm flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                              <HardHat className="w-4 h-4 text-sky-600" />
                              Horizontal Civil & Site Development
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {money(costBreakdown.totalHorizontalCost)} Civil Works
                            </Badge>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-xs">
                          <div className="p-2.5 rounded-lg bg-muted/40 border border-border flex justify-between items-center mb-1">
                            <div>
                              <span className="font-semibold block text-foreground">
                                Raw Land Acquisition:
                              </span>
                              <span className="text-[11px] text-muted-foreground">
                                {subdivisionConfig.grossAcres} Acres @{" "}
                                {money(costBreakdown.landCostPerAcre)} / Ac
                              </span>
                            </div>
                            <span className="font-bold text-sm text-foreground">
                              {money(costBreakdown.landAcquisitionCost)}
                            </span>
                          </div>

                          <div className="flex justify-between py-1 border-b border-border">
                            <span className="text-muted-foreground">
                              Clearing, Earthwork & Grading:
                            </span>
                            <span className="font-semibold">
                              {money(costBreakdown.earthworkGradingCost)}
                            </span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-border">
                            <span className="text-muted-foreground">
                              Central Retention Pond & Fountain:
                            </span>
                            <span className="font-semibold text-sky-600">
                              {money(costBreakdown.stormwaterPondCost)}
                            </span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-border">
                            <span className="text-muted-foreground">
                              Paved Streets & Asphalt Topping:
                            </span>
                            <span className="font-semibold">
                              {money(costBreakdown.roadwayPavingCost)}
                            </span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-border">
                            <span className="text-muted-foreground">Concrete Curbs & Sidewalks:</span>
                            <span className="font-semibold">
                              {money(costBreakdown.curbsAndSidewalksCost)}
                            </span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-border">
                            <span className="text-muted-foreground">Walking Trail Around Pond:</span>
                            <span className="font-semibold">
                              {money(costBreakdown.walkingTrailAndAmenitiesCost)}
                            </span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-border">
                            <span className="text-muted-foreground">
                              Water, Sewer & Storm Infrastructure:
                            </span>
                            <span className="font-semibold">
                              {money(costBreakdown.waterSewerInfrastructureCost)}
                            </span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-border">
                            <span className="text-muted-foreground">
                              Dry Utilities (Electric/Gas/Fiber):
                            </span>
                            <span className="font-semibold">
                              {money(costBreakdown.dryUtilitiesTrenchingCost)}
                            </span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-border">
                            <span className="text-muted-foreground">
                              Street Trees & Open Space Landscaping:
                            </span>
                            <span className="font-semibold">
                              {money(costBreakdown.landscapingStreetTreesCost)}
                            </span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-border font-semibold text-foreground">
                            <span>Civil Engineering, NPDES & Permitting:</span>
                            <span>{money(costBreakdown.civilEngineeringAndPermitsCost)}</span>
                          </div>

                          <div className="pt-2 flex justify-between py-1 font-semibold text-sky-600">
                            <span>Horizontal Civil Subtotal ({subdivisionConfig.totalLots} Lots):</span>
                            <span>
                              {money(costBreakdown.totalHorizontalCost)} (
                              {money(costBreakdown.horizontalCostPerLot)}/lot)
                            </span>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Vertical Construction & Pro Forma */}
                      <Card className="shadow-sm">
                        <CardHeader className="pb-2.5">
                          <CardTitle className="text-sm flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                              <Building2 className="w-4 h-4 text-primary" />
                              Vertical Spec House Build-out
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {money(costBreakdown.allHomesVerticalCost)}
                            </Badge>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-xs">
                          <div className="p-2.5 rounded-lg bg-muted/40 border border-border flex justify-between items-center mb-2">
                            <div>
                              <span className="font-semibold block text-foreground">
                                Per Single Spec Home Cost:
                              </span>
                              <span className="text-[11px] text-muted-foreground">
                                {costBreakdown.singleHomeCostPerSqft} / SF ({houseSpec.totalSqft} SF · {BUILDER_TIER_DETAILS[customBuilderTier].name})
                              </span>
                            </div>
                            <span className="font-bold text-sm text-primary">
                              {money(costBreakdown.singleHomeTotalCost)}
                            </span>
                          </div>

                          <div className="flex justify-between py-1 border-b border-border">
                            <span className="text-muted-foreground">Excavation & Foundation:</span>
                            <span className="font-semibold">
                              {money(costBreakdown.singleHomeFoundationCost)}
                            </span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-border">
                            <span className="text-muted-foreground">
                              Framing & Structural Envelope:
                            </span>
                            <span className="font-semibold">
                              {money(costBreakdown.singleHomeFramingCost)}
                            </span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-border">
                            <span className="text-muted-foreground">Exterior Facade & Roofing:</span>
                            <span className="font-semibold">
                              {money(costBreakdown.singleHomeExteriorFinishesCost)}
                            </span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-border">
                            <span className="text-muted-foreground">Interior Drywall & Finishes:</span>
                            <span className="font-semibold">
                              {money(costBreakdown.singleHomeInteriorFinishesCost)}
                            </span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-border">
                            <span className="text-muted-foreground">
                              Plumbing, HVAC & Electrical (MEP):
                            </span>
                            <span className="font-semibold">
                              {money(costBreakdown.singleHomeMEPCost)}
                            </span>
                          </div>

                          <div className="pt-2 border-t border-border flex justify-between py-1 font-semibold text-foreground">
                            <span>Total Vertical ({subdivisionConfig.totalLots} Homes):</span>
                            <span>{money(costBreakdown.allHomesVerticalCost)}</span>
                          </div>

                          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 mt-2 space-y-1">
                            <div className="flex justify-between font-semibold text-primary">
                              <span>Required Equity (35%):</span>
                              <span>{money(costBreakdown.equityRequired)}</span>
                            </div>
                            <div className="flex justify-between text-muted-foreground text-[11px]">
                              <span>Construction Financing (65% LTC):</span>
                              <span>{money(costBreakdown.totalDevelopmentCost * 0.65)}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </>
                ) : (
                  /* PROJECT MODE: EXISTING HOME RENOVATION & REMODEL */
                  <>
                    {/* Executive Renovation KPI Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div className="p-4 rounded-xl border border-border bg-card shadow-sm">
                        <span className="text-xs font-medium text-muted-foreground block">
                          Total Renovation Investment
                        </span>
                        <div className="text-xl font-bold text-foreground mt-1">
                          {money(renovationBreakdown.totalRenovationCost)}
                        </div>
                        <span className="text-[11px] text-muted-foreground">
                          {renovationSqft.toLocaleString()} SF @ {renovationBreakdown.costPerSqft} / SF
                        </span>
                      </div>

                      <div className="p-4 rounded-xl border border-border bg-card shadow-sm">
                        <span className="text-xs font-medium text-muted-foreground block">
                          Average Cost Per Square Foot
                        </span>
                        <div className="text-xl font-bold text-sky-600 dark:text-sky-400 mt-1">
                          ${renovationBreakdown.costPerSqft} / SF
                        </div>
                        <span className="text-[11px] text-muted-foreground">
                          {subdivisionConfig.county} County benchmark
                        </span>
                      </div>

                      <div className="p-4 rounded-xl border border-border bg-card shadow-sm">
                        <span className="text-xs font-medium text-muted-foreground block">
                          Subcontractor Direct Trades
                        </span>
                        <div className="text-xl font-bold text-emerald-600 mt-1">
                          {money(
                            renovationBreakdown.totalRenovationCost -
                              renovationBreakdown.permitsAndContingencyCost,
                          )}
                        </div>
                        <span className="text-[11px] font-semibold text-emerald-600">
                          Hard trade labor & material costs
                        </span>
                      </div>

                      <div className="p-4 rounded-xl border border-border bg-card shadow-sm">
                        <span className="text-xs font-medium text-muted-foreground block">
                          Permits & Contingency Reserve
                        </span>
                        <div className="text-xl font-bold text-primary mt-1">
                          {money(renovationBreakdown.permitsAndContingencyCost)}
                        </div>
                        <span className="text-[11px] font-semibold text-foreground">
                          PA UCC permits & unexpected latent conditions
                        </span>
                      </div>
                    </div>

                    {/* Itemized Trade Breakdown & Strategic Insights */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Trade-by-Trade Cost Breakdown */}
                      <Card className="shadow-sm">
                        <CardHeader className="pb-2.5">
                          <CardTitle className="text-sm flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                              <Hammer className="w-4 h-4 text-orange-500" />
                              Trade-by-Trade Renovation Scope
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {renovationBreakdown.scopeName}
                            </Badge>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-xs">
                          <div className="flex justify-between py-1.5 border-b border-border">
                            <div>
                              <span className="font-semibold block text-foreground">
                                Demolition, Hauling & Abatement:
                              </span>
                              <span className="text-[11px] text-muted-foreground">
                                Debris roll-off containers, plaster/drywall removal, fixtures
                              </span>
                            </div>
                            <span className="font-semibold text-foreground">
                              {money(renovationBreakdown.demolitionCost)}
                            </span>
                          </div>

                          <div className="flex justify-between py-1.5 border-b border-border">
                            <div>
                              <span className="font-semibold block text-foreground">
                                Mechanical, Electrical & Plumbing (MEP):
                              </span>
                              <span className="text-[11px] text-muted-foreground">
                                200A service upgrade, AFCI/GFCI rewire, PEX re-plumb, heat pump HVAC
                              </span>
                            </div>
                            <span className="font-semibold text-sky-600">
                              {money(renovationBreakdown.mechanicalElectricalPlumbingCost)}
                            </span>
                          </div>

                          <div className="flex justify-between py-1.5 border-b border-border">
                            <div>
                              <span className="font-semibold block text-foreground">
                                Framing, Insulation & Drywall:
                              </span>
                              <span className="text-[11px] text-muted-foreground">
                                Sistered joists, R-38 attic & R-21 wall insulation, Level 4 drywall
                              </span>
                            </div>
                            <span className="font-semibold text-foreground">
                              {money(renovationBreakdown.drywallAndInsulationCost)}
                            </span>
                          </div>

                          <div className="flex justify-between py-1.5 border-b border-border">
                            <div>
                              <span className="font-semibold block text-foreground">
                                Kitchen & Bath Modernization:
                              </span>
                              <span className="text-[11px] text-muted-foreground">
                                Plywood soft-close cabinetry, quartz countertops, tile showers
                              </span>
                            </div>
                            <span className="font-semibold text-primary">
                              {money(renovationBreakdown.kitchenAndBathCost)}
                            </span>
                          </div>

                          <div className="flex justify-between py-1.5 border-b border-border">
                            <div>
                              <span className="font-semibold block text-foreground">
                                Architectural Finishes & Flooring:
                              </span>
                              <span className="text-[11px] text-muted-foreground">
                                Luxury vinyl plank / hardwood, casing/baseboards, Sherwin-Williams paint
                              </span>
                            </div>
                            <span className="font-semibold text-foreground">
                              {money(renovationBreakdown.finishesAndFlooringCost)}
                            </span>
                          </div>

                          <div className="flex justify-between py-1.5 border-b border-border">
                            <div>
                              <span className="font-semibold block text-foreground">
                                PA UCC Permitting & Contingency:
                              </span>
                              <span className="text-[11px] text-muted-foreground">
                                Municipal code review, third-party inspections, latent condition reserve
                              </span>
                            </div>
                            <span className="font-semibold text-foreground">
                              {money(renovationBreakdown.permitsAndContingencyCost)}
                            </span>
                          </div>

                          <div className="pt-2 flex justify-between py-1 font-bold text-sm text-foreground">
                            <span>Total Estimated Renovation Cost:</span>
                            <span className="text-primary">{money(renovationBreakdown.totalRenovationCost)}</span>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Strategic Renovation & Code Insights */}
                      <Card className="shadow-sm">
                        <CardHeader className="pb-2.5">
                          <CardTitle className="text-sm flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                              <Sparkles className="w-4 h-4 text-primary" />
                              Regional Remodel Economics & Code
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {subdivisionConfig.county} County
                            </Badge>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-xs">
                          <div className="p-2.5 rounded-lg bg-muted/40 border border-border space-y-1">
                            <div className="flex justify-between font-semibold">
                              <span>Renovation vs. New Build Economics:</span>
                              <span className="text-emerald-600">30% - 45% Capital Savings</span>
                            </div>
                            <p className="text-[11px] text-muted-foreground">
                              Renovating an existing structure preserves horizontal site development (curbs,
                              roadway paving, public water/sewer tap-in fees) saving $65,000–$110,000 per lot
                              compared to raw ground development.
                            </p>
                          </div>

                          <div className="space-y-2">
                            <div className="flex justify-between py-1 border-b border-border">
                              <span className="text-muted-foreground">Location Multiplier:</span>
                              <span className="font-semibold text-foreground">
                                {costBreakdown.locationName}
                              </span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-border">
                              <span className="text-muted-foreground">Typical Remodel Duration:</span>
                              <span className="font-semibold text-foreground">
                                {renovationScope === "cosmetic"
                                  ? "3 - 6 Weeks"
                                  : renovationScope === "moderate"
                                    ? "10 - 16 Weeks"
                                    : "20 - 28 Weeks"}
                              </span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-border">
                              <span className="text-muted-foreground">PA Uniform Construction Code:</span>
                              <span className="font-semibold text-foreground">
                                2018 PA UCC (IRC Existing Building Provisions)
                              </span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-border">
                              <span className="text-muted-foreground">Electrical / Smoke Code Trigger:</span>
                              <span className="font-semibold text-foreground">
                                Hardwired interconnected smoke & CO alarms required
                              </span>
                            </div>
                          </div>

                          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 space-y-1">
                            <span className="font-semibold text-primary block">
                              Builder Class Impact on Renovation:
                            </span>
                            <p className="text-[11px] text-muted-foreground">
                              {customBuilderTier === "publicProduction"
                                ? "Production-focused contractors achieve lowest price through standardized cabinet lines and bulk vinyl plank flooring."
                                : customBuilderTier === "regionalSemiCustom"
                                  ? "Regional semi-custom general contractors balance high durability cabinetry, quartz counters, and licensed trade subs."
                                  : "Architectural custom builders utilize master carpenters, custom site-built built-ins, and premium tile setters."}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Bottom Scroll Clearance Buffer */}
          <div className="h-28 md:h-40 shrink-0" aria-hidden="true" />
        </div>
      </div>
    </AppShell>
  );
}

