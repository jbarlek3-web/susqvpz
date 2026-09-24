import { useMemo } from "react";
import {
  Layers,
  ArrowRightLeft,
  Sparkles,
  Plus,
  Trash2,
  Building,
  Compass,
  ArrowDownUp,
  MapPin,
  CheckCircle2,
  AlertCircle,
  FileCheck2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Parcel } from "@/lib/types";
import {
  ASSEMBLAGE_MODE_LABELS,
  type AssemblageConfig,
  type AssemblageMode,
  type AssemblageSlot,
  type ParcelFeasibilityAssessment,
} from "@/lib/feasibility/feasibility-engine";

interface AssemblageBuilderProps {
  primaryParcel: Parcel;
  availableParcels: Parcel[];
  assemblageConfig: AssemblageConfig;
  onChangeConfig: (config: AssemblageConfig) => void;
  assessment?: ParcelFeasibilityAssessment;
}

export function AssemblageBuilder({
  primaryParcel,
  availableParcels,
  assemblageConfig,
  onChangeConfig,
  assessment,
}: AssemblageBuilderProps) {
  const { mode, slots } = assemblageConfig;

  // Change mode
  const handleModeChange = (newMode: AssemblageMode) => {
    if (newMode === "single_parcel") {
      onChangeConfig({
        mode: "single_parcel",
        slots: [{ parcel: primaryParcel, role: "primary", elevationTrend: "neutral" }],
      });
      return;
    }

    // Default slot configuration when switching to an assemblage mode
    const currentSlots = [...slots];
    // Ensure primary parcel is in the slots
    if (!currentSlots.some((s) => s.parcel.id === primaryParcel.id)) {
      currentSlots.unshift({ parcel: primaryParcel, role: "primary", elevationTrend: "neutral" });
    }

    // Adjust roles based on mode
    const adjustedSlots: AssemblageSlot[] = currentSlots.map((s, idx) => {
      if (idx === 0) return { ...s, role: "primary" };
      if (newMode === "split_street_assemblage") {
        return {
          ...s,
          role: idx === currentSlots.length - 1 ? "cross_street_subdivisible" : "contiguous_adjacent",
          elevationTrend: idx === currentSlots.length - 1 ? "low" : "high",
        };
      }
      return { ...s, role: "contiguous_adjacent" };
    });

    onChangeConfig({
      mode: newMode,
      slots: adjustedSlots,
    });
  };

  // Add a parcel into the assemblage
  const handleAddParcel = (parcelId: string) => {
    const p = availableParcels.find((item) => item.id === parcelId);
    if (!p) return;
    if (slots.some((s) => s.parcel.id === p.id)) return;

    let role: AssemblageSlot["role"] = "contiguous_adjacent";
    let elevationTrend: AssemblageSlot["elevationTrend"] = "neutral";

    if (mode === "split_street_assemblage") {
      const hasCrossStreet = slots.some((s) => s.role === "cross_street_subdivisible");
      if (!hasCrossStreet) {
        role = "cross_street_subdivisible";
        elevationTrend = "low";
      } else {
        role = "contiguous_adjacent";
        elevationTrend = "high";
      }
    }

    onChangeConfig({
      mode,
      slots: [...slots, { parcel: p, role, elevationTrend }],
    });
  };

  // Remove a parcel
  const handleRemoveSlot = (parcelId: string) => {
    if (slots.length <= 1) return;
    onChangeConfig({
      mode,
      slots: slots.filter((s) => s.parcel.id !== parcelId),
    });
  };

  // Toggle elevation trend for split-street balancing
  const handleToggleElevation = (parcelId: string) => {
    onChangeConfig({
      mode,
      slots: slots.map((s) => {
        if (s.parcel.id !== parcelId) return s;
        const nextElevation: AssemblageSlot["elevationTrend"] =
          s.elevationTrend === "high" ? "low" : s.elevationTrend === "low" ? "neutral" : "high";
        return { ...s, elevationTrend: nextElevation };
      }),
    });
  };

  // Toggle role in split street
  const handleToggleSlotRole = (parcelId: string) => {
    if (mode !== "split_street_assemblage") return;
    onChangeConfig({
      mode,
      slots: slots.map((s) => {
        if (s.parcel.id !== parcelId) return s;
        return {
          ...s,
          role: s.role === "contiguous_adjacent" ? "cross_street_subdivisible" : "contiguous_adjacent",
        };
      }),
    });
  };

  // Unselected candidate parcels
  const unselectedParcels = useMemo(() => {
    const selectedIds = new Set(slots.map((s) => s.parcel.id));
    return availableParcels.filter((p) => !selectedIds.has(p.id));
  }, [availableParcels, slots]);

  return (
    <Card className="cyber-card border-primary/20">
      <CardHeader className="pb-3 border-b border-border/40">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex size-5 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
              1
            </span>
            <CardTitle className="text-base font-semibold">
              Site Structure & Land Assemblage Strategy
            </CardTitle>
          </div>
          <span className="text-xs text-muted-foreground font-medium">
            PA Municipalities Planning Code (Act 247 § 10107)
          </span>
        </div>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        {/* Mode Selector Tabs */}
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {(Object.keys(ASSEMBLAGE_MODE_LABELS) as AssemblageMode[]).map((m) => {
            const isSelected = mode === m;
            const meta = ASSEMBLAGE_MODE_LABELS[m];
            return (
              <button
                key={m}
                onClick={() => handleModeChange(m)}
                className={cn(
                  "flex flex-col text-left p-3 rounded-lg border transition-all duration-150 relative",
                  isSelected
                    ? "border-primary bg-primary/10 shadow-[0_0_15px_rgba(249,115,22,0.15)]"
                    : "border-border/60 bg-muted/10 hover:border-border hover:bg-muted/20",
                )}
              >
                {isSelected && (
                  <span className="absolute top-2 right-2 flex size-2 rounded-full bg-primary" />
                )}
                <span className="text-xs font-bold text-foreground">{meta.title}</span>
                <span className="text-[11px] font-semibold text-primary mt-0.5">{meta.subtitle}</span>
                <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2 leading-tight">
                  {meta.desc}
                </p>
              </button>
            );
          })}
        </div>

        {/* Assemblage Active Workspace (Only when 2+ parcels or assemblage mode selected) */}
        {mode !== "single_parcel" && (
          <div className="rounded-xl border border-primary/30 bg-muted/15 p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-2">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                  <Layers className="size-3.5" /> Assembled Tract Workspace ({slots.length} Parcels)
                </span>
                <p className="text-xs text-muted-foreground">
                  Combine contiguous parcels or cross-street tracts to model reverse subdivision yield & infrastructure balancing.
                </p>
              </div>

              {/* Add Parcel Dropdown/Button */}
              {unselectedParcels.length > 0 && (
                <div className="flex items-center gap-2">
                  <select
                    className="h-8 rounded-md border border-border/80 bg-background px-2 text-xs text-foreground font-medium"
                    defaultValue=""
                    onChange={(e) => {
                      if (e.target.value) {
                        handleAddParcel(e.target.value);
                        e.target.value = "";
                      }
                    }}
                  >
                    <option value="" disabled>
                      + Add Parcel to Assemblage...
                    </option>
                    {unselectedParcels.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.address} ({p.acres} ac, {p.municipality})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Slots List */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {slots.map((slot) => {
                const isPrimary = slot.parcel.id === primaryParcel.id;
                const isCrossStreet = slot.role === "cross_street_subdivisible";

                return (
                  <div
                    key={slot.parcel.id}
                    className={cn(
                      "rounded-lg border p-3 flex flex-col justify-between gap-3 text-xs transition-colors",
                      isCrossStreet
                        ? "border-amber-500/40 bg-amber-500/5"
                        : "border-border/60 bg-background/60",
                    )}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={cn(
                            "rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                            isPrimary && "bg-primary/20 text-primary",
                            !isPrimary && !isCrossStreet && "bg-muted text-muted-foreground",
                            isCrossStreet && "bg-amber-500/20 text-amber-400",
                          )}
                        >
                          {isPrimary
                            ? "Anchor Primary"
                            : isCrossStreet
                              ? "Across Street (Subdivisible)"
                              : "Contiguous Adjacent"}
                        </span>

                        {!isPrimary && (
                          <button
                            onClick={() => handleRemoveSlot(slot.parcel.id)}
                            className="text-muted-foreground hover:text-destructive p-1 rounded"
                            title="Remove parcel from assemblage"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        )}
                      </div>

                      <p className="mt-2 font-bold text-foreground text-sm leading-tight">
                        {slot.parcel.address}
                      </p>
                      <p className="text-muted-foreground text-[11px]">
                        {slot.parcel.municipality}, {slot.parcel.county} Co. · {slot.parcel.acres} Acres
                      </p>
                    </div>

                    <div className="space-y-2 border-t border-border/40 pt-2">
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>Zoning: <strong>{slot.parcel.zoning}</strong></span>
                        <span>Assessed: <strong>${(slot.parcel.assessed || 120000).toLocaleString()}</strong></span>
                      </div>

                      {/* Elevation Indicator for Split-Street Mode */}
                      {mode === "split_street_assemblage" && (
                        <div className="flex items-center justify-between gap-1 pt-1">
                          <button
                            type="button"
                            onClick={() => handleToggleSlotRole(slot.parcel.id)}
                            disabled={isPrimary}
                            className="text-[10px] font-semibold text-primary hover:underline"
                          >
                            Switch Side of Street
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleElevation(slot.parcel.id)}
                            className={cn(
                              "rounded px-1.5 py-0.5 text-[10px] font-bold uppercase flex items-center gap-1",
                              slot.elevationTrend === "low"
                                ? "bg-cyan-500/20 text-cyan-400"
                                : slot.elevationTrend === "high"
                                  ? "bg-amber-500/20 text-amber-400"
                                  : "bg-muted text-muted-foreground",
                            )}
                            title="Click to toggle elevation trend (High / Neutral / Low) for gravity drainage balancing"
                          >
                            <ArrowDownUp className="size-3" />
                            {slot.elevationTrend === "low"
                              ? "Low Elevation (Basin Site)"
                              : slot.elevationTrend === "high"
                                ? "High Elevation"
                                : "Neutral Grade"}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Live Assemblage Strategic Metrics Banner */}
            {assessment && (
              <div className="rounded-lg border border-primary/40 bg-primary/5 p-3.5 text-xs space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-primary/20 pb-2">
                  <span className="font-bold text-foreground flex items-center gap-1.5">
                    <Sparkles className="size-4 text-primary" /> Assemblage Consolidation Metrics
                  </span>
                  <span className="font-semibold text-primary">
                    Total Consolidated Tract: {assessment.grossAcres} Acres ({assessment.netDevelopableAcres} Net)
                  </span>
                </div>

                <div className="grid gap-2 sm:grid-cols-3 text-muted-foreground text-[11px]">
                  <div className="rounded border border-border/40 bg-background/50 p-2">
                    <span className="block font-bold text-foreground">Internal Setback Reclaimed</span>
                    <span className="font-semibold text-emerald-400">
                      +{assessment.assemblage.setbackAreaRecoveredSqFt.toLocaleString()} sq ft (+{assessment.assemblage.setbackAreaRecoveredAcres} ac)
                    </span>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Obliterating {assessment.assemblage.contiguousBoundaryCount} internal boundaries eliminates interior setbacks.
                    </p>
                  </div>

                  <div className="rounded border border-border/40 bg-background/50 p-2">
                    <span className="block font-bold text-foreground">Reverse Subdivision Review</span>
                    <span className="font-semibold text-foreground">
                      PA MPC Act 247 § 10107
                    </span>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Est. Legal & Survey Plat: ${assessment.assemblage.reverseSubdivisionEstCost.toLocaleString()} (+2–3 mos review).
                    </p>
                  </div>

                  <div className="rounded border border-border/40 bg-background/50 p-2">
                    <span className="block font-bold text-foreground">Corridor Infrastructure</span>
                    <span className="font-semibold text-foreground">
                      {assessment.assemblage.crossStreetBoringRequired
                        ? `PennDOT UOP Boring (~$${assessment.assemblage.crossStreetBoringEstCost.toLocaleString()})`
                        : "Single Unified Utility Corridor"}
                    </span>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {assessment.assemblage.crossStreetBoringRequired
                        ? "Gravity sewer intertie & stormwater equalization across roadway."
                        : "Centralized stormwater basin reduces land dedication."}
                    </p>
                  </div>
                </div>

                {assessment.assemblage.topographicGravityBalanceNote && (
                  <div className="rounded border border-cyan-500/30 bg-cyan-500/10 p-2 text-cyan-300 text-[11px] flex items-start gap-2">
                    <Compass className="size-4 shrink-0 text-cyan-400 mt-0.5" />
                    <span>{assessment.assemblage.topographicGravityBalanceNote}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
