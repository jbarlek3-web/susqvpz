import { useMemo, useState } from "react";
import {
  Layers,
  Sparkles,
  Plus,
  Trash2,
  Building,
  Compass,
  ArrowDownUp,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Pencil,
  SlidersHorizontal,
  X,
  Check,
  Ruler,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Parcel, ZoneCode } from "@/lib/types";
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
  const { mode, slots, customBoundaryDepthFt, customInternalSetbackFt } = assemblageConfig;

  // Modal / Creator State for new custom parcel
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customApn, setCustomApn] = useState("");
  const [customAcres, setCustomAcres] = useState(3.5);
  const [customAskingPrice, setCustomAskingPrice] = useState(250_000);
  const [customZoning, setCustomZoning] = useState<ZoneCode>("R-1");
  const [customSlope, setCustomSlope] = useState(6);
  const [customWater, setCustomWater] = useState(true);
  const [customSewer, setCustomSewer] = useState(true);
  const [customElevation, setCustomElevation] = useState<"high" | "neutral" | "low">("neutral");
  const [customRole, setCustomRole] = useState<"contiguous_adjacent" | "cross_street_subdivisible">(
    "contiguous_adjacent",
  );

  // Inline slot parameter editing state
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
  const [editAcres, setEditAcres] = useState<number>(0);
  const [editPrice, setEditPrice] = useState<number>(0);
  const [editSlope, setEditSlope] = useState<number>(0);
  const [editWater, setEditWater] = useState<boolean>(true);
  const [editSewer, setEditSewer] = useState<boolean>(true);

  // Boundary parameters toggle
  const [showBoundaryParams, setShowBoundaryParams] = useState(false);
  const [boundaryDepth, setBoundaryDepth] = useState<number>(customBoundaryDepthFt ?? 350);
  const [sideSetback, setSideSetback] = useState<number>(customInternalSetbackFt ?? 25);

  // Change mode
  const handleModeChange = (newMode: AssemblageMode) => {
    if (newMode === "single_parcel") {
      onChangeConfig({
        mode: "single_parcel",
        slots: [{ parcel: primaryParcel, role: "primary", elevationTrend: "neutral" }],
      });
      return;
    }

    const currentSlots = [...slots];
    if (!currentSlots.some((s) => s.parcel.id === primaryParcel.id)) {
      currentSlots.unshift({ parcel: primaryParcel, role: "primary", elevationTrend: "neutral" });
    }

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
      ...assemblageConfig,
      mode: newMode,
      slots: adjustedSlots,
    });
  };

  // Add existing parcel from catalog
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
      ...assemblageConfig,
      slots: [...slots, { parcel: p, role, elevationTrend }],
    });
  };

  // Create & append a custom user-defined parcel
  const handleCreateCustomParcel = (e: React.FormEvent) => {
    e.preventDefault();
    const id = `custom-parcel-${Date.now()}`;
    const newParcel: Parcel = {
      id,
      apn: customApn.trim() || `CUSTOM-${Math.floor(1000 + Math.random() * 9000)}`,
      address: customName.trim() || `Custom Adjacent Tract (${customAcres} ac)`,
      municipality: primaryParcel.municipality,
      county: primaryParcel.county,
      lat: primaryParcel.lat + 0.001,
      lng: primaryParcel.lng + 0.001,
      polygon: primaryParcel.polygon,
      acres: customAcres,
      sqft: Math.round(customAcres * 43560),
      zoning: customZoning,
      zoningName: `${customZoning} District`,
      zoningSummary: "Custom User-Specified Zoning Classification",
      assessed: customAskingPrice,
      taxYear: 2026,
      owner: "Off-Market Neighbor / Private Owner",
      setbacks: { front: 35, side: sideSetback, rear: 40 },
      maxHeight: 35,
      maxCoverage: 35,
      permittedUses: ["Single-Family Detached", "Residential Subdivision", "Two-Family"],
      footprintSf: 2500,
      lotCoveragePct: 15,
      buildableSf: Math.round(customAcres * 43560 * 0.65),
      rowDedicationSf: 0,
      envBufferSf: 0,
      setbackSf: 0,
      flood: { 0: "X", 1: "X", 3: "X", 5: "X" },
      slopePct: customSlope,
      historic: false,
      utilities: {
        water: customWater ? "Public Authority Water Available" : "Well Required",
        sewer: customSewer ? "Public Sanitary Sewer Available" : "Act 537 Capacity Review Required",
        electric: "Met-Ed / PPL 3-Phase Electric",
        gas: "UGI Natural Gas Available",
      },
      aadt: 4500,
      roiPct: 18,
      densityUa: 2.5,
      potential: "High",
      constraints: customSlope > 15 ? ["Steep Slopes > 15%"] : [],
      transfers: [],
      docs: [],
    };

    const newSlot: AssemblageSlot = {
      parcel: newParcel,
      role: mode === "split_street_assemblage" ? customRole : "contiguous_adjacent",
      elevationTrend: customElevation,
      isCustom: true,
      customOverrides: {
        acres: customAcres,
        askingPrice: customAskingPrice,
        slopePct: customSlope,
        waterAvailable: customWater,
        sewerAvailable: customSewer,
      },
    };

    onChangeConfig({
      ...assemblageConfig,
      slots: [...slots, newSlot],
    });

    // Reset form and close
    setShowCreateModal(false);
    setCustomName("");
    setCustomApn("");
  };

  // Remove a parcel slot
  const handleRemoveSlot = (parcelId: string) => {
    if (slots.length <= 1) return;
    onChangeConfig({
      ...assemblageConfig,
      slots: slots.filter((s) => s.parcel.id !== parcelId),
    });
  };

  // Toggle elevation trend for split-street balancing
  const handleToggleElevation = (parcelId: string) => {
    onChangeConfig({
      ...assemblageConfig,
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
      ...assemblageConfig,
      slots: slots.map((s) => {
        if (s.parcel.id !== parcelId) return s;
        return {
          ...s,
          role: s.role === "contiguous_adjacent" ? "cross_street_subdivisible" : "contiguous_adjacent",
        };
      }),
    });
  };

  // Open inline edit for slot parameters
  const handleStartEdit = (slot: AssemblageSlot) => {
    setEditingSlotId(slot.parcel.id);
    setEditAcres(slot.customOverrides?.acres ?? slot.parcel.acres);
    setEditPrice(slot.customOverrides?.askingPrice ?? slot.parcel.assessed ?? 120_000);
    setEditSlope(slot.customOverrides?.slopePct ?? slot.parcel.slopePct);
    setEditWater(slot.customOverrides?.waterAvailable ?? slot.parcel.utilities.water.toLowerCase().includes("avail"));
    setEditSewer(slot.customOverrides?.sewerAvailable ?? slot.parcel.utilities.sewer.toLowerCase().includes("avail"));
  };

  // Save inline edit
  const handleSaveEdit = (parcelId: string) => {
    onChangeConfig({
      ...assemblageConfig,
      slots: slots.map((s) => {
        if (s.parcel.id !== parcelId) return s;
        return {
          ...s,
          customOverrides: {
            ...s.customOverrides,
            acres: editAcres,
            askingPrice: editPrice,
            slopePct: editSlope,
            waterAvailable: editWater,
            sewerAvailable: editSewer,
          },
        };
      }),
    });
    setEditingSlotId(null);
  };

  // Apply custom boundary parameters
  const handleApplyBoundaryParams = () => {
    onChangeConfig({
      ...assemblageConfig,
      customBoundaryDepthFt: boundaryDepth,
      customInternalSetbackFt: sideSetback,
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
                  Add neighboring parcels, customize acreage and acquisition costs, and model PA MPC Act 247 reverse subdivision.
                </p>
              </div>

              {/* Action Buttons: Add from Catalog OR Create Custom */}
              <div className="flex flex-wrap items-center gap-2">
                {unselectedParcels.length > 0 && (
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
                      + Add Pre-Seeded Parcel...
                    </option>
                    {unselectedParcels.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.address} ({p.acres} ac, {p.municipality})
                      </option>
                    ))}
                  </select>
                )}

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowCreateModal(true)}
                  className="h-8 text-xs font-semibold gap-1 text-primary border-primary/40 bg-primary/10 hover:bg-primary/20"
                >
                  <Plus className="size-3.5" /> Custom Neighbor Parcel
                </Button>
              </div>
            </div>

            {/* Custom Neighbor Parcel Creator Drawer / Form */}
            {showCreateModal && (
              <form
                onSubmit={handleCreateCustomParcel}
                className="rounded-lg border border-primary/40 bg-background/95 p-4 space-y-3 shadow-lg"
              >
                <div className="flex items-center justify-between border-b border-border/40 pb-2">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Plus className="size-4 text-primary" /> Create Custom Contiguous / Neighbor Parcel
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-4" />
                  </button>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-xs">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-muted-foreground block">
                      Address / Description
                    </label>
                    <Input
                      placeholder="e.g. 742 Evergreen Terrace (Adjacent Farm)"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      className="h-8 text-xs mt-1"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase text-muted-foreground block">
                      Tax Parcel ID (APN / UPI)
                    </label>
                    <Input
                      placeholder="e.g. UPI 21-004-0012"
                      value={customApn}
                      onChange={(e) => setCustomApn(e.target.value)}
                      className="h-8 text-xs mt-1"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase text-muted-foreground block">
                      Gross Acreage
                    </label>
                    <Input
                      type="number"
                      step={0.1}
                      min={0.1}
                      value={customAcres}
                      onChange={(e) => setCustomAcres(Math.max(0.1, Number(e.target.value)))}
                      className="h-8 text-xs mt-1"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase text-muted-foreground block">
                      Asking / Contract Price ($)
                    </label>
                    <Input
                      type="number"
                      step={5000}
                      min={10000}
                      value={customAskingPrice}
                      onChange={(e) => setCustomAskingPrice(Math.max(1000, Number(e.target.value)))}
                      className="h-8 text-xs mt-1"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase text-muted-foreground block">
                      Zoning District
                    </label>
                    <select
                      value={customZoning}
                      onChange={(e) => setCustomZoning(e.target.value as ZoneCode)}
                      className="w-full h-8 rounded-md border border-border/80 bg-background px-2 text-xs mt-1"
                    >
                      <option value="R-1">R-1 Low Density Residential</option>
                      <option value="R-2">R-2 Medium Density Residential</option>
                      <option value="C-1">C-1 Neighborhood Commercial</option>
                      <option value="C-2">C-2 General Commercial</option>
                      <option value="I-1">I-1 Light Industrial</option>
                      <option value="A-1">A-1 Agricultural / Rural</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase text-muted-foreground block">
                      Slope Grade (%)
                    </label>
                    <Input
                      type="number"
                      min={0}
                      max={40}
                      value={customSlope}
                      onChange={(e) => setCustomSlope(Number(e.target.value))}
                      className="h-8 text-xs mt-1"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase text-muted-foreground block">
                      Public Water
                    </label>
                    <select
                      value={customWater ? "yes" : "no"}
                      onChange={(e) => setCustomWater(e.target.value === "yes")}
                      className="w-full h-8 rounded-md border border-border/80 bg-background px-2 text-xs mt-1"
                    >
                      <option value="yes">Available at Frontage</option>
                      <option value="no">Off-Site Main Extension / Well</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase text-muted-foreground block">
                      Sanitary Sewer
                    </label>
                    <select
                      value={customSewer ? "yes" : "no"}
                      onChange={(e) => setCustomSewer(e.target.value === "yes")}
                      className="w-full h-8 rounded-md border border-border/80 bg-background px-2 text-xs mt-1"
                    >
                      <option value="yes">Public Gravity Sewer Available</option>
                      <option value="no">Act 537 Review / Lift Station Req</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setShowCreateModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" className="h-7 text-xs font-semibold gap-1">
                    <Check className="size-3" /> Add to Assemblage
                  </Button>
                </div>
              </form>
            )}

            {/* Slots List */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {slots.map((slot) => {
                const isPrimary = slot.parcel.id === primaryParcel.id;
                const isCrossStreet = slot.role === "cross_street_subdivisible";
                const isEditing = editingSlotId === slot.parcel.id;
                const effectiveAcres = slot.customOverrides?.acres ?? slot.parcel.acres;
                const effectivePrice = slot.customOverrides?.askingPrice ?? slot.parcel.assessed ?? 120_000;
                const hasCustomOverrides = Boolean(slot.customOverrides);

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
                        <div className="flex items-center gap-1.5">
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
                                ? "Across Street"
                                : "Contiguous Adjacent"}
                          </span>
                          {(slot.isCustom || hasCustomOverrides) && (
                            <span className="rounded bg-cyan-500/20 px-1 py-0.2 text-[9px] font-bold uppercase text-cyan-400">
                              Customized
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => (isEditing ? setEditingSlotId(null) : handleStartEdit(slot))}
                            className="text-muted-foreground hover:text-primary p-1 rounded transition-colors"
                            title="Edit parcel parameters (acreage, price, slope)"
                          >
                            <Pencil className="size-3" />
                          </button>
                          {!isPrimary && (
                            <button
                              onClick={() => handleRemoveSlot(slot.parcel.id)}
                              className="text-muted-foreground hover:text-destructive p-1 rounded transition-colors"
                              title="Remove parcel from assemblage"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <p className="mt-2 font-bold text-foreground text-sm leading-tight">
                        {slot.parcel.address}
                      </p>
                      <p className="text-muted-foreground text-[11px]">
                        {slot.parcel.municipality}, {slot.parcel.county} Co. · {effectiveAcres} Acres
                      </p>
                    </div>

                    {/* Inline Editing Form */}
                    {isEditing ? (
                      <div className="rounded border border-primary/40 bg-background/90 p-2.5 space-y-2 mt-1">
                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                          <div>
                            <label className="text-[9px] font-bold uppercase text-muted-foreground block">
                              Acreage
                            </label>
                            <Input
                              type="number"
                              step={0.1}
                              min={0.1}
                              value={editAcres}
                              onChange={(e) => setEditAcres(Number(e.target.value))}
                              className="h-7 text-xs"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-bold uppercase text-muted-foreground block">
                              Asking Price ($)
                            </label>
                            <Input
                              type="number"
                              step={5000}
                              value={editPrice}
                              onChange={(e) => setEditPrice(Number(e.target.value))}
                              className="h-7 text-xs"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                          <div>
                            <label className="text-[9px] font-bold uppercase text-muted-foreground block">
                              Slope (%)
                            </label>
                            <Input
                              type="number"
                              min={0}
                              max={40}
                              value={editSlope}
                              onChange={(e) => setEditSlope(Number(e.target.value))}
                              className="h-7 text-xs"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-bold uppercase text-muted-foreground block">
                              Water / Sewer
                            </label>
                            <select
                              value={editWater && editSewer ? "both" : editWater ? "water" : "none"}
                              onChange={(e) => {
                                setEditWater(e.target.value === "both" || e.target.value === "water");
                                setEditSewer(e.target.value === "both");
                              }}
                              className="w-full h-7 rounded border border-border/80 bg-background text-[11px] px-1"
                            >
                              <option value="both">Public Water & Sewer</option>
                              <option value="water">Public Water Only</option>
                              <option value="none">Well & Septic</option>
                            </select>
                          </div>
                        </div>
                        <div className="flex items-center justify-end gap-1.5 pt-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 text-[11px] px-2"
                            onClick={() => setEditingSlotId(null)}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            className="h-6 text-[11px] px-2 font-semibold"
                            onClick={() => handleSaveEdit(slot.parcel.id)}
                          >
                            Save
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2 border-t border-border/40 pt-2">
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                          <span>
                            Zoning: <strong>{slot.parcel.zoning}</strong>
                          </span>
                          <span>
                            Acquisition / Assessed: <strong>${effectivePrice.toLocaleString()}</strong>
                          </span>
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
                    )}
                  </div>
                );
              })}
            </div>

            {/* Boundary & Setback Customizer Accordion */}
            <div className="rounded-lg border border-border/50 bg-background/50 p-3 space-y-2.5">
              <button
                type="button"
                onClick={() => setShowBoundaryParams((prev) => !prev)}
                className="w-full flex items-center justify-between text-xs font-bold text-foreground"
              >
                <span className="flex items-center gap-1.5 text-primary">
                  <Ruler className="size-3.5" /> Customize Boundary Depth & Setback Recovery Parameters
                </span>
                <span className="text-[10px] font-normal text-muted-foreground">
                  {showBoundaryParams ? "Hide Parameters ▲" : "Configure Custom Boundary ▼"}
                </span>
              </button>

              {showBoundaryParams && (
                <div className="grid gap-3 sm:grid-cols-3 pt-2 border-t border-border/40 text-xs">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-muted-foreground block">
                      Shared Boundary Depth (Linear Ft)
                    </label>
                    <Input
                      type="number"
                      step={25}
                      min={50}
                      value={boundaryDepth}
                      onChange={(e) => setBoundaryDepth(Number(e.target.value))}
                      className="h-8 text-xs mt-1"
                    />
                    <span className="text-[9px] text-muted-foreground mt-0.5 block">
                      Length of common boundary line between parcels
                    </span>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase text-muted-foreground block">
                      Side Setback Width (Ft / Parcel)
                    </label>
                    <Input
                      type="number"
                      step={5}
                      min={10}
                      value={sideSetback}
                      onChange={(e) => setSideSetback(Number(e.target.value))}
                      className="h-8 text-xs mt-1"
                    />
                    <span className="text-[9px] text-muted-foreground mt-0.5 block">
                      Total interior setback corridor = {sideSetback * 2} ft
                    </span>
                  </div>

                  <div className="flex flex-col justify-end">
                    <Button
                      size="sm"
                      onClick={handleApplyBoundaryParams}
                      className="h-8 text-xs font-semibold gap-1"
                    >
                      <Check className="size-3.5" /> Apply Dimensions
                    </Button>
                    <span className="text-[9px] text-primary mt-1 block">
                      Formula: {Math.max(1, slots.length - 1)} boundary × {boundaryDepth} ft × {sideSetback * 2} ft ={" "}
                      {((Math.max(1, slots.length - 1) * boundaryDepth * (sideSetback * 2))).toLocaleString()} sq ft
                    </span>
                  </div>
                </div>
              )}
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
                    <span className="font-semibold text-foreground">PA MPC Act 247 § 10107</span>
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
