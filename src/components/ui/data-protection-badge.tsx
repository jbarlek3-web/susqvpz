import { ShieldCheck, RefreshCw, Save } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface DataProtectionBadgeProps {
  isDirty: boolean;
  isDraftRestored?: boolean;
  lastSavedAt?: number | null;
  onReset?: () => void;
  className?: string;
}

export function DataProtectionBadge({
  isDirty,
  isDraftRestored,
  lastSavedAt,
  onReset,
  className = "",
}: DataProtectionBadgeProps) {
  const formattedTime = lastSavedAt
    ? new Date(lastSavedAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : null;

  return (
    <div className={`inline-flex items-center gap-2 text-xs font-mono ${className}`}>
      {isDirty ? (
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md border border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.2)]">
          <Save className="size-3 animate-pulse text-amber-600 dark:text-amber-400" />
          <span>Autosaved to Enclave</span>
          {formattedTime && <span className="opacity-75">({formattedTime})</span>}
        </div>
      ) : isDraftRestored ? (
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md border border-cyan-500/40 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 shadow-[0_0_8px_rgba(6,182,212,0.2)]">
          <RefreshCw className="size-3 text-cyan-600 dark:text-cyan-400" />
          <span>Restored from Enclave Cache</span>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.15)]">
          <ShieldCheck className="size-3 text-emerald-600 dark:text-emerald-400" />
          <span>Data Protected</span>
        </div>
      )}

      {(isDirty || isDraftRestored) && onReset && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onReset}
          className="h-6 px-2 text-[11px] text-muted-foreground hover:text-destructive transition-colors"
          title="Clear autosaved draft and restore defaults"
        >
          Reset to default
        </Button>
      )}
    </div>
  );
}
