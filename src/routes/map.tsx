import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/app-shell";
import { MapPanel, MapToolbar } from "@/components/map/map-panel";
import { ParcelMap } from "@/components/map/parcel-map";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { PanelLeft } from "lucide-react";
import { useHub } from "@/lib/store";
import { cn } from "@/lib/utils";

export interface MapSearch {
  parcelId?: string;
}

export const Route = createFileRoute("/map")({
  validateSearch: (search: Record<string, unknown>): MapSearch => ({
    parcelId: typeof search.parcelId === "string" ? search.parcelId : undefined,
  }),
  component: MapPage,
});

function MapPage() {
  const search = Route.useSearch();
  const selectParcel = useHub((s) => s.selectParcel);

  useEffect(() => {
    if (search.parcelId) {
      selectParcel(search.parcelId);
    }
  }, [search.parcelId, selectParcel]);

  const [panel, setPanel] = useState(true);
  return (
    <AppShell fullBleed>
      <div className="flex h-[calc(100dvh-5rem)] md:h-[calc(100dvh-5rem)]">
        <div
          className={cn(
            "shrink-0 overflow-hidden border-r border-outline-variant bg-card transition-all",
            panel ? "w-full max-w-md md:w-[22rem]" : "w-0",
          )}
        >
          {panel && <MapPanel />}
        </div>
        <div className="relative min-w-0 flex-1">
          <ParcelMap className="h-full" />
          <MapToolbar />
          <Button
            size="icon"
            variant="outline"
            className="absolute left-3 top-3 z-[400] bg-card"
            onClick={() => setPanel((v) => !v)}
            aria-label="Toggle layers"
          >
            <PanelLeft />
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
