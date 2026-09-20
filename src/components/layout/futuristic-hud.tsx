import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import {
  Activity,
  Bot,
  Box,
  Compass,
  FileSpreadsheet,
  FolderArchive,
  Layers,
  MapPin,
  Shield,
  Zap,
} from "lucide-react";
import { useHub } from "@/lib/store";
import { PARCELS } from "@/lib/data/parcels";
import { cn } from "@/lib/utils";

const WORKFLOW_TOOLS = [
  {
    to: "/map",
    label: "GIS Map",
    code: "MAP",
    icon: Compass,
    shortcut: "1",
    desc: "Interactive GIS Parcels",
  },
  {
    to: "/scene-3d",
    label: "Costs Engine",
    code: "COSTS",
    icon: Box,
    shortcut: "2",
    desc: "3D Underwriting & Subdivision",
  },
  {
    to: "/aide",
    label: "Ordinance AI",
    code: "AI",
    icon: Bot,
    shortcut: "3",
    desc: "Private PA Corpus Intelligence",
  },
  {
    to: "/directory",
    label: "Directory",
    code: "DIR",
    icon: FolderArchive,
    shortcut: "4",
    desc: "Counties & Municipal Source URLs",
  },
  {
    to: "/acquire",
    label: "Acquisition",
    code: "ACQ",
    icon: FileSpreadsheet,
    shortcut: "5",
    desc: "Residual Feasibility & Underwriting",
  },
  {
    to: "/zoning",
    label: "Zoning",
    code: "ZONE",
    icon: Layers,
    shortcut: "6",
    desc: "Code & Standards Matrix",
  },
];

function getToolSearch(
  to: string,
  parcel?: (typeof PARCELS)[number],
): Record<string, string> | undefined {
  if (!parcel) return undefined;
  switch (to) {
    case "/map":
      return { parcelId: parcel.id };
    case "/scene-3d":
      return { parcelId: parcel.id };
    case "/aide":
      return { county: parcel.county, municipality: parcel.municipality };
    case "/directory":
      return { search: parcel.municipality, tab: "municipalities" };
    case "/acquire":
      return { parcelId: parcel.id, tab: "Report" };
    case "/zoning":
      return { county: parcel.county, muni: parcel.municipality };
    default:
      return undefined;
  }
}

export function FuturisticTelemetryBar() {
  return (
    <div className="border-b border-cyan-500/20 bg-card/60 backdrop-blur-md px-3 py-1 text-[11px] font-mono text-muted-foreground flex flex-wrap items-center justify-between gap-2 select-none">
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
          <span className="relative flex size-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
          </span>
          SYS: NOMINAL
        </span>
        <span className="hidden sm:inline text-muted-foreground/60">•</span>
        <span className="hidden sm:flex items-center gap-1">
          <Zap className="size-3 text-amber-500" />
          LATENCY: <span className="text-foreground font-medium">12ms</span>
        </span>
        <span className="hidden md:inline text-muted-foreground/60">•</span>
        <span className="hidden md:flex items-center gap-1">
          <Shield className="size-3 text-cyan-500" />
          ENCLAVE:{" "}
          <span className="text-cyan-600 dark:text-cyan-400 font-medium">AES-256 / SHA-256</span>
        </span>
      </div>

      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1 text-xs">
          <Activity className="size-3 text-primary animate-pulse" />
          <span className="font-semibold text-foreground">PA 4-COUNTY GEO-INTELLIGENCE:</span>
          <span className="text-secondary font-bold">ONLINE</span>
        </span>
        <span className="hidden lg:inline text-muted-foreground/60">•</span>
        <span className="hidden lg:inline text-[10px] uppercase tracking-widest text-muted-foreground/80">
          PROTECTION: ACCIDENTAL DATA LOSS SHIELD ACTIVE
        </span>
      </div>
    </div>
  );
}

export function FuturisticWorkflowDock() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const selectedIds = useHub((s) => s.selectedIds);
  const activeParcel = PARCELS.find((p) => selectedIds.includes(p.id)) ?? PARCELS[0];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
        const keyNum = parseInt(e.key, 10);
        if (keyNum >= 1 && keyNum <= WORKFLOW_TOOLS.length) {
          e.preventDefault();
          const targetTool = WORKFLOW_TOOLS[keyNum - 1];
          if (targetTool) {
            navigate({
              to: targetTool.to as any,
              search: getToolSearch(targetTool.to, activeParcel) as any,
            });
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigate, activeParcel]);

  return (
    <aside
      aria-label="Workflow Navigation HUD"
      className="fixed bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1 p-1 sm:p-1.5 rounded-full border border-cyan-500/30 bg-card/90 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.18),0_0_20px_rgba(6,182,212,0.18)] text-foreground transition-all duration-300 hover:border-cyan-500/50 max-w-[96vw] overflow-x-auto"
    >
      {/* Active Parcel Context Chip */}
      {activeParcel && (
        <div className="hidden md:flex items-center gap-1.5 pl-3 pr-2 py-1 text-xs font-mono border-r border-border/80 mr-1 max-w-[200px] truncate">
          <MapPin className="size-3 text-orange-500 shrink-0 animate-bounce" />
          <span className="truncate text-muted-foreground text-[11px]" title={activeParcel.address}>
            {activeParcel.municipality} ({activeParcel.county})
          </span>
        </div>
      )}

      {/* Tool Teleporters */}
      <nav className="flex items-center gap-0.5 sm:gap-1">
        {WORKFLOW_TOOLS.map((tool) => {
          const isActive = tool.to === "/" ? pathname === "/" : pathname.startsWith(tool.to);
          const Icon = tool.icon;
          const searchParams = getToolSearch(tool.to, activeParcel);

          return (
            <Link
              key={tool.to}
              to={tool.to}
              search={searchParams as any}
              preload="intent"
              title={`${tool.desc} (Alt+${tool.shortcut})`}
              className={cn(
                "group relative flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-semibold transition-all duration-150 active:scale-95 border",
                isActive
                  ? "bg-transparent text-foreground font-bold border-orange-500/60 shadow-[0_0_15px_rgba(249,115,22,0.4)]"
                  : "bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40 border-transparent",
              )}
            >
              <Icon
                className={cn(
                  "size-3.5",
                  isActive ? "text-orange-500" : "text-muted-foreground group-hover:text-primary",
                )}
              />
              <span className="hidden lg:inline">{tool.label}</span>
              <span className="lg:hidden font-mono text-[10px] sm:text-xs">{tool.code}</span>
              <span className="hidden xl:inline-block ml-1 px-1 py-0.2 rounded bg-black/20 text-[9px] font-mono text-muted-foreground group-hover:text-primary-foreground opacity-70">
                Alt+{tool.shortcut}
              </span>
              {isActive && (
                <span className="absolute -top-1 right-2 size-1.5 rounded-full bg-orange-400 shadow-[0_0_6px_rgba(249,115,22,0.8)]" />
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
