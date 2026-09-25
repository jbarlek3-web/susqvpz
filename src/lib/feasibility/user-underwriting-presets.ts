import { useState, useEffect, useCallback } from "react";

export interface UserUnderwritingPreset {
  isLocked: boolean;
  updatedAt: string;

  // Site & Capacity
  usableLandPct: number; // default 0.85 (85%)
  targetDensityUnitsPerAcre?: number;

  // Standard Cost Assumptions (per unit / lot)
  siteworkPerUnit: number; // default $22,000
  verticalCostPerUnit: number; // default $165,000
  softCostPct: number; // default 12% (0.12)
  contingencyPct: number; // default 8% (0.08)
  offsiteInfrastructure: number; // default $0 or lump sum (e.g. $350,000)
  entitlementFees: number; // default $0 or lump sum (e.g. $125,000)
  sellingCostPct: number; // default 6% (0.06)

  // Schedule, Market & Financing
  targetProfitMarginPct: number; // default 18% (0.18)
  debtCostSharePct: number; // default 65% (0.65)
  annualInterestRatePct: number; // default 9% (0.09)
  discountRatePct: number; // default 18% (0.18)
  holdMonths: number; // default 36
  entitlementMonths: number; // default 9
  constructionMonths: number; // default 18
  priceGrowthPct: number; // default 3% (0.03)

  // Market Pricing Override
  customAsp?: number; // optional custom ASP (e.g. $425,000)
}

export const DEFAULT_UNDERWRITING_PRESET: UserUnderwritingPreset = {
  isLocked: false,
  updatedAt: "2026-09-25T00:00:00.000Z",
  usableLandPct: 0.85,
  siteworkPerUnit: 22_000,
  verticalCostPerUnit: 165_000,
  softCostPct: 12,
  contingencyPct: 8,
  offsiteInfrastructure: 0,
  entitlementFees: 0,
  sellingCostPct: 6,
  targetProfitMarginPct: 18,
  debtCostSharePct: 65,
  annualInterestRatePct: 9,
  discountRatePct: 18,
  holdMonths: 36,
  entitlementMonths: 9,
  constructionMonths: 18,
  priceGrowthPct: 3,
};

const STORAGE_KEY = "fieldacq_user_underwriting_preset_v2";
const STORAGE_EVENT = "fieldacq_underwriting_preset_change";

let memoryPresetFallback: UserUnderwritingPreset = { ...DEFAULT_UNDERWRITING_PRESET };

export function loadUserUnderwritingPreset(): UserUnderwritingPreset {
  if (typeof window === "undefined") {
    return memoryPresetFallback;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return memoryPresetFallback;
    const parsed = JSON.parse(raw) as Partial<UserUnderwritingPreset>;
    return {
      ...DEFAULT_UNDERWRITING_PRESET,
      ...parsed,
      isLocked: Boolean(parsed.isLocked),
    };
  } catch {
    return memoryPresetFallback;
  }
}

export function saveUserUnderwritingPreset(preset: UserUnderwritingPreset): void {
  const updated: UserUnderwritingPreset = {
    ...preset,
    updatedAt: new Date().toISOString(),
  };
  memoryPresetFallback = updated;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent(STORAGE_EVENT, { detail: updated }));
    } catch {
      // Memory fallback active
    }
  }
}

export function lockUserUnderwritingPreset(values?: Partial<UserUnderwritingPreset>): UserUnderwritingPreset {
  const current = loadUserUnderwritingPreset();
  const next: UserUnderwritingPreset = {
    ...current,
    ...(values ?? {}),
    isLocked: true,
    updatedAt: new Date().toISOString(),
  };
  saveUserUnderwritingPreset(next);
  return next;
}

export function unlockUserUnderwritingPreset(): UserUnderwritingPreset {
  const current = loadUserUnderwritingPreset();
  const next: UserUnderwritingPreset = {
    ...current,
    isLocked: false,
    updatedAt: new Date().toISOString(),
  };
  saveUserUnderwritingPreset(next);
  return next;
}

export function resetUserUnderwritingPreset(): UserUnderwritingPreset {
  const next: UserUnderwritingPreset = {
    ...DEFAULT_UNDERWRITING_PRESET,
    isLocked: false,
    updatedAt: new Date().toISOString(),
  };
  saveUserUnderwritingPreset(next);
  return next;
}

export interface ResidualCalculationInput {
  potentialUnits: number;
  averageUnitSalePrice: number;
  grossAcres: number;
  askingOrAssessedPrice: number;
  preset: UserUnderwritingPreset;
}

export interface ResidualLandValueCalculation {
  potentialUnits: number;
  averageUnitSalePrice: number;
  grossSelloutRevenue: number;
  sellingCosts: number;
  siteworkCosts: number;
  verticalCosts: number;
  softCosts: number;
  contingency: number;
  offsiteInfrastructure: number;
  entitlementFees: number;
  developerProfit: number;
  totalUsesExcludingLand: number;
  residualLandValue: number;
  suggestedMaxBid: number;
  residualValuePerAcre: number;
  residualValuePerUnit: number;
  askingOrAssessedPrice: number;
  spreadAmount: number;
  spreadPercent: number;
  isFeasible: boolean;
  debtAmount: number;
  equityRequired: number;
}

/**
 * Calculates Residual Land Value and Suggested Max Bid based on standard real estate land development underwriting.
 * Formula:
 * Residual Land Value = Gross Sellout Revenue - Total Uses Excluding Land
 */
export function calculateResidualLandValue(
  input: ResidualCalculationInput,
): ResidualLandValueCalculation {
  const { potentialUnits, averageUnitSalePrice, grossAcres, askingOrAssessedPrice, preset } = input;
  const units = Math.max(1, potentialUnits);
  const acres = Math.max(0.1, grossAcres);

  const grossSelloutRevenue = Math.round(units * averageUnitSalePrice);
  const sellingCosts = Math.round(grossSelloutRevenue * (preset.sellingCostPct / 100));
  const siteworkCosts = Math.round(units * preset.siteworkPerUnit);
  const verticalCosts = Math.round(units * preset.verticalCostPerUnit);
  
  // Direct construction subtotal for soft costs and contingency
  const directConstruction = siteworkCosts + verticalCosts;
  const softCosts = Math.round(directConstruction * (preset.softCostPct / 100));
  const contingency = Math.round(directConstruction * (preset.contingencyPct / 100));
  
  const offsiteInfrastructure = preset.offsiteInfrastructure || 0;
  const entitlementFees = preset.entitlementFees || 0;
  
  const developerProfit = Math.round(grossSelloutRevenue * (preset.targetProfitMarginPct / 100));

  const totalUsesExcludingLand =
    sellingCosts +
    siteworkCosts +
    verticalCosts +
    softCosts +
    contingency +
    offsiteInfrastructure +
    entitlementFees +
    developerProfit;

  const rawResidual = grossSelloutRevenue - totalUsesExcludingLand;
  const residualLandValue = Math.max(0, rawResidual);
  const suggestedMaxBid = residualLandValue;
  const residualValuePerAcre = Math.round(residualLandValue / acres);
  const residualValuePerUnit = Math.round(residualLandValue / units);

  const spreadAmount = suggestedMaxBid - askingOrAssessedPrice;
  const spreadPercent = Number(
    ((spreadAmount / Math.max(1, askingOrAssessedPrice)) * 100).toFixed(1),
  );
  const isFeasible = spreadAmount >= 0;

  // Debt & Equity sizing
  const totalProjectUses = totalUsesExcludingLand + (suggestedMaxBid > 0 ? suggestedMaxBid : askingOrAssessedPrice);
  const debtAmount = Math.round(totalProjectUses * (preset.debtCostSharePct / 100));
  const equityRequired = Math.round(totalProjectUses - debtAmount);

  return {
    potentialUnits: units,
    averageUnitSalePrice,
    grossSelloutRevenue,
    sellingCosts,
    siteworkCosts,
    verticalCosts,
    softCosts,
    contingency,
    offsiteInfrastructure,
    entitlementFees,
    developerProfit,
    totalUsesExcludingLand,
    residualLandValue,
    suggestedMaxBid,
    residualValuePerAcre,
    residualValuePerUnit,
    askingOrAssessedPrice,
    spreadAmount,
    spreadPercent,
    isFeasible,
    debtAmount,
    equityRequired,
  };
}

/**
 * React hook to read, update, and lock in user underwriting presets across all parcels and sessions.
 */
export function useUserUnderwritingPreset() {
  const [preset, setPreset] = useState<UserUnderwritingPreset>(() => loadUserUnderwritingPreset());

  useEffect(() => {
    // Initial sync
    setPreset(loadUserUnderwritingPreset());

    const handleStorageChange = () => {
      setPreset(loadUserUnderwritingPreset());
    };

    if (typeof window !== "undefined") {
      window.addEventListener(STORAGE_EVENT, handleStorageChange);
      window.addEventListener("storage", handleStorageChange);
      return () => {
        window.removeEventListener(STORAGE_EVENT, handleStorageChange);
        window.removeEventListener("storage", handleStorageChange);
      };
    }
  }, []);

  const updateField = useCallback(<K extends keyof UserUnderwritingPreset>(
    field: K,
    value: UserUnderwritingPreset[K],
  ) => {
    setPreset((prev) => {
      const next = { ...prev, [field]: value };
      saveUserUnderwritingPreset(next);
      return next;
    });
  }, []);

  const updateValues = useCallback((updates: Partial<UserUnderwritingPreset>) => {
    setPreset((prev) => {
      const next = { ...prev, ...updates };
      saveUserUnderwritingPreset(next);
      return next;
    });
  }, []);

  const lockValues = useCallback((updates?: Partial<UserUnderwritingPreset>) => {
    const next = lockUserUnderwritingPreset(updates);
    setPreset(next);
    return next;
  }, []);

  const unlockValues = useCallback(() => {
    const next = unlockUserUnderwritingPreset();
    setPreset(next);
    return next;
  }, []);

  const resetToBenchmarks = useCallback(() => {
    const next = resetUserUnderwritingPreset();
    setPreset(next);
    return next;
  }, []);

  return {
    preset,
    isLocked: preset.isLocked,
    updateField,
    updateValues,
    lockValues,
    unlockValues,
    resetToBenchmarks,
  };
}
