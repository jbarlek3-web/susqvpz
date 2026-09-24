import { CheckCircle2, AlertTriangle, AlertCircle, ArrowRight, X, ExternalLink } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ParcelFeasibilityAssessment } from "@/lib/feasibility/feasibility-engine";

function money(val: number) {
  return val.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

export function ParcelCompareGrid({
  assessments,
  onSelectPrimary,
  onRemoveParcel,
  primaryId,
}: {
  assessments: ParcelFeasibilityAssessment[];
  onSelectPrimary: (id: string) => void;
  onRemoveParcel: (id: string) => void;
  primaryId: string;
}) {
  if (assessments.length === 0) return null;

  // Find the top recommendation
  const bestAssessment = [...assessments].sort((a, b) => b.compositeScore - a.compositeScore)[0];

  return (
    <Card className="cyber-card border-primary/30 overflow-hidden shadow-xl">
      <CardHeader className="border-b border-border/60 bg-muted/20 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-block size-2.5 rounded-full bg-primary animate-pulse" />
              <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
                Multi-Parcel Acquisition Matrix
              </p>
            </div>
            <CardTitle className="mt-1 text-xl font-semibold">
              Comparing {assessments.length} Candidate Sites in Central PA
            </CardTitle>
          </div>
          {bestAssessment && (
            <div className="rounded-lg border border-primary/40 bg-primary/10 px-3.5 py-1.5 text-xs">
              <span className="font-semibold text-primary">Top Feasibility Pick: </span>
              <span className="font-bold text-foreground">{bestAssessment.parcel.address}</span>{" "}
              <span className="font-bold text-primary">({bestAssessment.compositeScore}/100)</span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse min-w-[650px]">
          <thead>
            <tr className="border-b border-border/60 bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <th className="py-3 px-4 w-44">Metric</th>
              {assessments.map((a) => {
                const isPrimary = a.parcel.id === primaryId;
                const isBest = a.parcel.id === bestAssessment?.parcel.id;
                return (
                  <th
                    key={a.parcel.id}
                    className={cn(
                      "py-3 px-4 relative min-w-[220px]",
                      isPrimary && "bg-primary/5 border-l-2 border-r-2 border-t-2 border-primary/40",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          {isBest && (
                            <span className="rounded bg-primary/20 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                              BEST PICK
                            </span>
                          )}
                          {isPrimary && (
                            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-bold text-foreground">
                              ACTIVE
                            </span>
                          )}
                        </div>
                        <p className="mt-1 font-bold text-foreground text-sm leading-tight">
                          {a.parcel.address}
                        </p>
                        <p className="text-xs text-muted-foreground font-normal">
                          {a.parcel.municipality}, {a.parcel.county} Co.
                        </p>
                      </div>
                      {assessments.length > 1 && (
                        <button
                          onClick={() => onRemoveParcel(a.parcel.id)}
                          className="text-muted-foreground hover:text-destructive p-1 rounded-md transition-colors"
                          title="Remove from comparison"
                          aria-label={`Remove ${a.parcel.address}`}
                        >
                          <X className="size-3.5" />
                        </button>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {/* Feasibility Verdict */}
            <tr className="bg-muted/10">
              <td className="py-2.5 px-4 font-semibold text-xs text-muted-foreground uppercase">
                Feasibility Verdict
              </td>
              {assessments.map((a) => (
                <td key={a.parcel.id} className="py-2.5 px-4 font-medium">
                  <div className="flex items-center gap-1.5">
                    {a.verdict === "Proceed" ? (
                      <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                    ) : a.verdict === "Proceed with Conditions" ? (
                      <AlertCircle className="size-4 text-amber-500 shrink-0" />
                    ) : (
                      <AlertTriangle className="size-4 text-destructive shrink-0" />
                    )}
                    <span
                      className={cn(
                        "font-bold text-xs",
                        a.verdictVariant === "success" && "text-emerald-500",
                        a.verdictVariant === "warning" && "text-amber-500",
                        a.verdictVariant === "destructive" && "text-destructive",
                      )}
                    >
                      {a.compositeScore}/100 · {a.verdict}
                    </span>
                  </div>
                </td>
              ))}
            </tr>

            {/* Acreage & Yield */}
            <tr>
              <td className="py-2.5 px-4 font-medium text-xs text-muted-foreground">
                Tract Size & Net Yield
              </td>
              {assessments.map((a) => (
                <td key={a.parcel.id} className="py-2.5 px-4">
                  <div className="font-bold text-foreground">
                    {a.estimatedLots} {a.estimatedLots === 1 ? "Lot" : "Lots"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {a.grossAcres} ac gross ({a.netDevelopableAcres} ac net)
                  </div>
                </td>
              ))}
            </tr>

            {/* Zoning District */}
            <tr>
              <td className="py-2.5 px-4 font-medium text-xs text-muted-foreground">
                Zoning & Permitted Use
              </td>
              {assessments.map((a) => (
                <td key={a.parcel.id} className="py-2.5 px-4">
                  <span className="font-semibold">{a.parcel.zoning}</span>
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {a.pillars.zoning.summary}
                  </p>
                </td>
              ))}
            </tr>

            {/* Slope & Civil Earthwork */}
            <tr>
              <td className="py-2.5 px-4 font-medium text-xs text-muted-foreground">
                Terrain & Hazards
              </td>
              {assessments.map((a) => (
                <td key={a.parcel.id} className="py-2.5 px-4">
                  <span
                    className={cn(
                      "font-semibold text-xs",
                      a.parcel.slopePct > 15 ? "text-destructive font-bold" : "text-foreground",
                    )}
                  >
                    {a.parcel.slopePct}% Slope
                  </span>
                  <div className="text-xs text-muted-foreground">
                    FEMA {a.parcel.flood["5"] || "X"} ·{" "}
                    {a.pillars.civil.status === "pass" ? "Standard grading" : "Complex site"}
                  </div>
                </td>
              ))}
            </tr>

            {/* Utilities */}
            <tr>
              <td className="py-2.5 px-4 font-medium text-xs text-muted-foreground">
                Water & Sewer Status
              </td>
              {assessments.map((a) => (
                <td key={a.parcel.id} className="py-2.5 px-4 text-xs">
                  <p className="font-medium text-foreground">{a.pillars.utilities.summary}</p>
                </td>
              ))}
            </tr>

            {/* Sitework Cost / Lot */}
            <tr>
              <td className="py-2.5 px-4 font-medium text-xs text-muted-foreground">
                Sitework / Lot
              </td>
              {assessments.map((a) => (
                <td key={a.parcel.id} className="py-2.5 px-4 font-medium text-xs">
                  {money(a.financials.horizontalCostPerLot)} / lot
                </td>
              ))}
            </tr>

            {/* Maximum Allowable Offer */}
            <tr className="bg-primary/5">
              <td className="py-2.5 px-4 font-bold text-xs text-primary uppercase">
                Max Allowable Offer (MAO)
              </td>
              {assessments.map((a) => (
                <td key={a.parcel.id} className="py-2.5 px-4">
                  <p className="font-bold text-base text-foreground">
                    {money(a.financials.maxAllowableOfferTotal)}
                  </p>
                  <p
                    className={cn(
                      "text-xs font-semibold",
                      a.financials.spreadAmount >= 0 ? "text-emerald-500" : "text-amber-500",
                    )}
                  >
                    {a.financials.spreadAmount >= 0
                      ? `+$${a.financials.spreadAmount.toLocaleString()} under asking`
                      : `-$${Math.abs(a.financials.spreadAmount).toLocaleString()} over asking`}
                  </p>
                </td>
              ))}
            </tr>

            {/* Action Row */}
            <tr>
              <td className="py-3 px-4 font-medium text-xs text-muted-foreground">Action</td>
              {assessments.map((a) => {
                const isPrimary = a.parcel.id === primaryId;
                return (
                  <td key={a.parcel.id} className="py-3 px-4">
                    {isPrimary ? (
                      <span className="text-xs font-semibold text-primary inline-flex items-center gap-1">
                        <CheckCircle2 className="size-3.5" /> Viewing in Detail Below
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1"
                        onClick={() => onSelectPrimary(a.parcel.id)}
                      >
                        Set as Active Site <ArrowRight className="size-3" />
                      </Button>
                    )}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
