import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Bot,
  Compass,
  DollarSign,
  FileSpreadsheet,
  Gauge,
  Loader2,
  Network,
  Send,
  ShieldCheck,
  MapPin,
  RotateCcw,
  Sparkles,
  Layers,
  Building2,
  ExternalLink,
  ChevronRight,
  HelpCircle,
  CheckCircle2,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { usePersistentDraft } from "@/lib/hooks/use-persistent-draft";
import { DataProtectionBadge } from "@/components/ui/data-protection-badge";
import { logSecurityEvent, analyzeInput } from "@/lib/security/threat-detector";
import { PARCELS } from "@/lib/data/parcels";
import { useHub } from "@/lib/store";
import { getOrdinanceAgentScope, type OrdinanceAgentScope } from "@/lib/ordinance-agent";
import { cn } from "@/lib/utils";

export interface AideSearch {
  county?: string;
  municipality?: string;
  q?: string;
  parcelId?: string;
  topic?: string;
}

export const Route = createFileRoute("/aide")({
  validateSearch: (search: Record<string, unknown>): AideSearch => ({
    county: typeof search.county === "string" ? search.county : undefined,
    municipality: typeof search.municipality === "string" ? search.municipality : undefined,
    q: typeof search.q === "string" ? search.q : undefined,
    parcelId: typeof search.parcelId === "string" ? search.parcelId : undefined,
    topic: typeof search.topic === "string" ? search.topic : undefined,
  }),
  component: OrdinanceAide,
});

type Message = { id: number; role: "assistant" | "user"; text: string };

function money(val: number) {
  if (!Number.isFinite(val)) return "—";
  return val.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function OrdinanceAide() {
  const search = Route.useSearch();
  const selectedIds = useHub((s) => s.selectedIds);
  const selectParcel = useHub((s) => s.selectParcel);

  // 1. Unified Active Parcel Context (synchronizing with Hub & URL search)
  const activeParcelId = useMemo(() => {
    if (search.parcelId && PARCELS.some((p) => p.id === search.parcelId)) {
      return search.parcelId;
    }
    const found = selectedIds.find((id) => PARCELS.some((p) => p.id === id));
    if (found) return found;
    return PARCELS[0]?.id ?? "";
  }, [search.parcelId, selectedIds]);

  const activeParcel = useMemo(() => {
    return PARCELS.find((p) => p.id === activeParcelId) ?? null;
  }, [activeParcelId]);

  // Keep hub store in sync if search param provides a valid parcelId
  useEffect(() => {
    if (search.parcelId && search.parcelId !== selectedIds[0]) {
      selectParcel(search.parcelId);
    }
  }, [search.parcelId, selectedIds, selectParcel]);

  const [scope, setScope] = useState<OrdinanceAgentScope | null>(null);
  const [scopeError, setScopeError] = useState("");
  const [county, setCounty] = useState(() => search.county || activeParcel?.county || "York");
  const [municipality, setMunicipality] = useState(() => search.municipality || activeParcel?.municipality || "");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const {
    value: question,
    setValue: setQuestion,
    isDirty: isPromptDirty,
    isDraftRestored: isPromptRestored,
    lastSavedAt: promptLastSavedAt,
    resetToDefault: resetPrompt,
    clearDraft: clearPromptDraft,
  } = usePersistentDraft<string>("aide_prompt_draft_v1", () => search.q || "", {
    storage: "sessionStorage",
    enableBeforeUnloadWarn: true,
  });

  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      role: "assistant",
      text: activeParcel
        ? `I am ready to analyze zoning, SALDO, permitting, setbacks, and land development standards for ${activeParcel.address} in ${activeParcel.municipality} (${activeParcel.zoning} - ${activeParcel.zoningName}). Choose a quick prompt below or ask your specific question.`
        : "Choose a county and municipality, then ask a zoning, SALDO, permitting, setback, use, or process question. I will answer from the private Field ACQ corpus and identify the source material used.",
    },
  ]);

  const countyRef = useRef(county);
  useEffect(() => {
    countyRef.current = county;
  }, [county]);

  // Sync county and municipality when active parcel changes and user didn't explicitly override via search
  useEffect(() => {
    if (activeParcel && !search.county && !search.municipality) {
      setCounty(activeParcel.county);
      setMunicipality(activeParcel.municipality);
    }
  }, [activeParcel, search.county, search.municipality]);

  useEffect(() => {
    let current = true;
    void getOrdinanceAgentScope()
      .then((data) => {
        if (!current) return;
        setScope(data);
        const targetCounty = search.county || (activeParcel?.county ?? countyRef.current);
        const countyData = data.counties.find((item) => item.county === targetCounty);
        if (countyData) {
          if (search.county) setCounty(search.county);
          const hasMuni =
            search.municipality && countyData.municipalities.includes(search.municipality);
          setMunicipality(
            hasMuni
              ? search.municipality!
              : (activeParcel?.municipality && countyData.municipalities.includes(activeParcel.municipality)
                  ? activeParcel.municipality
                  : countyData.municipalities[0] ?? ""),
          );
        } else {
          const first = data.counties[0];
          setCounty(first?.county ?? "York");
          setMunicipality(first?.municipalities[0] ?? "");
        }
      })
      .catch(() => {
        if (current) setScopeError("The private ordinance corpus could not be loaded.");
      });
    return () => {
      current = false;
    };
  }, [search.county, search.municipality, activeParcel]);

  useEffect(() => {
    if (search.q && !question) {
      setQuestion(search.q);
    }
  }, [search.q, question, setQuestion]);

  const municipalities = useMemo(
    () => scope?.counties.find((item) => item.county === county)?.municipalities ?? [],
    [county, scope],
  );
  const usage = scope?.usage;
  const resetsLabel = usage
    ? new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      }).format(new Date(usage.resetsAt))
    : "—";

  function changeCounty(nextCounty: string) {
    setCounty(nextCounty);
    const first = scope?.counties.find((item) => item.county === nextCounty)?.municipalities[0];
    setMunicipality(first ?? "");
  }

  function handleSelectParcel(id: string) {
    selectParcel(id);
    const p = PARCELS.find((item) => item.id === id);
    if (p) {
      setCounty(p.county);
      setMunicipality(p.municipality);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          role: "assistant",
          text: `Switched active parcel context to ${p.address} (${p.municipality}, ${p.county} Co. | ${p.acres} ac · ${p.zoning} ${p.zoningName}). What would you like to verify for this parcel?`,
        },
      ]);
    }
  }

  // 2. Contextual Quick-Prompts (tailored directly to active parcel & zoning district)
  const quickPrompts = useMemo(() => {
    if (!activeParcel) {
      return [
        {
          id: "saldo_sub",
          category: "SALDO",
          label: "📐 SALDO Submission Tiers",
          prompt: `What are the submission requirements, plan scale, and statutory review clocks for minor vs major subdivision under SALDO in ${municipality || "York County"}?`,
        },
        {
          id: "swm_karst",
          category: "Stormwater",
          label: "🌊 Stormwater & Karst",
          prompt: `What are the municipal stormwater management ordinance (SWM) detention requirements and karst limestone infiltration restrictions in ${municipality || "South Central PA"}?`,
        },
        {
          id: "fees_escrow",
          category: "Fees",
          label: "💰 Fee Schedule & Escrow",
          prompt: `What are the preliminary plan filing fees, recreation fees-in-lieu, and engineering escrow amounts in ${municipality || "the municipality"}?`,
        },
        {
          id: "mpc_clock",
          category: "Process",
          label: "⏱️ MPC Section 508 Review",
          prompt: `What is the statutory PA MPC Section 508 90-day review timeline and planning commission meeting schedule in ${municipality || "the municipality"}?`,
        },
      ];
    }

    return [
      {
        id: "setbacks_dim",
        category: "Zoning",
        label: "📐 Setbacks & Dimensional Standards",
        prompt: `What are the minimum lot size, maximum lot coverage, and front/side/rear setback requirements for the ${activeParcel.zoning} (${activeParcel.zoningName}) district in ${activeParcel.municipality}?`,
      },
      {
        id: "permitted_uses",
        category: "Uses",
        label: "🏠 Permitted Uses & Housing Types",
        prompt: `Is residential subdivision, single-family detached, or townhouse development permitted by-right or by conditional use in ${activeParcel.zoning} in ${activeParcel.municipality}?`,
      },
      {
        id: "saldo_swm",
        category: "SALDO",
        label: "🌊 Stormwater & SALDO Standards",
        prompt: `What are the SALDO stormwater retention basin, environmental buffer, and curb/sidewalk requirements in ${activeParcel.municipality} for a subdivision on ${activeParcel.acres} acres?`,
      },
      {
        id: "fees_escrows",
        category: "Finance",
        label: "💰 Subdivision Fees & Escrow",
        prompt: `What are the preliminary subdivision filing fees, engineering escrow deposits, and recreation fee-in-lieu requirements in ${activeParcel.municipality}, ${activeParcel.county} County?`,
      },
      {
        id: "mpc_timeline",
        category: "Clock",
        label: "⏱️ Statutory Review Timeline",
        prompt: `What is the statutory PA MPC Section 508 review clock and submission deadline for preliminary land development plans in ${activeParcel.municipality}?`,
      },
      {
        id: "street_access",
        category: "Access",
        label: "🚧 Street & Right-of-Way Width",
        prompt: `What are the minimum street right-of-way width, cul-de-sac turnaround diameter, and driveway sight distance standards under the ${activeParcel.municipality} SALDO?`,
      },
    ];
  }, [activeParcel, municipality]);

  const handleSelectQuickPrompt = (promptText: string) => {
    setQuestion(promptText);
    textareaRef.current?.focus();
  };

  const handleClearConversation = () => {
    setMessages([
      {
        id: Date.now(),
        role: "assistant",
        text: activeParcel
          ? `Conversation reset. Ready for new inquiries regarding ${activeParcel.address} in ${activeParcel.municipality}.`
          : `Conversation reset. Choose a county and municipality to ask a land development or ordinance question.`,
      },
    ]);
  };

  async function executePrompt(promptText: string) {
    const rawPrompt = promptText.trim();
    if (!rawPrompt || !municipality || busy) return;

    const threatCheck = analyzeInput(rawPrompt);
    if (threatCheck.isThreat) {
      logSecurityEvent({
        threatType: threatCheck.threatType || "UNKNOWN",
        details: threatCheck.details || "Threat pattern detected in AI prompt",
        sourceContext: "OrdinanceAide",
      });
    }

    clearPromptDraft();
    const userMsgId = Date.now();
    const assistantMsgId = userMsgId + 1;

    const conversation = messages
      .filter((m) => m.id !== 1 && m.text.trim().length > 0)
      .map((m) => ({ role: m.role, content: m.text }));
    conversation.push({ role: "user", content: rawPrompt });

    setMessages((current) => [
      ...current,
      { id: userMsgId, role: "user", text: rawPrompt },
      { id: assistantMsgId, role: "assistant", text: "" },
    ]);
    setBusy(true);

    try {
      const response = await fetch("/api/ordinance/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          county,
          municipality,
          messages: conversation,
          zoningDistrict: activeParcel?.zoning,
          parcelId: activeParcel?.id,
          topic: search.topic,
        }),
      });

      if (!response.ok) {
        let errorMessage = "The Ordinance Aide could not complete that request.";
        try {
          const errData = (await response.json()) as { error?: string };
          if (errData?.error) errorMessage = errData.error;
        } catch {
          // ignore
        }
        setMessages((current) =>
          current.map((m) => (m.id === assistantMsgId ? { ...m, text: errorMessage } : m)),
        );
        return;
      }

      if (!response.body) {
        throw new Error("No response body from stream");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const payload = trimmed.replace(/^data:\s*/, "");
          if (payload === "[DONE]") break;
          try {
            const data = JSON.parse(payload) as { text?: string; error?: string };
            if (data.text) {
              accumulated += data.text;
              setMessages((current) =>
                current.map((m) => (m.id === assistantMsgId ? { ...m, text: accumulated } : m)),
              );
            } else if (data.error) {
              accumulated = data.error;
              setMessages((current) =>
                current.map((m) => (m.id === assistantMsgId ? { ...m, text: accumulated } : m)),
              );
            }
          } catch {
            // ignore partial JSON parse
          }
        }
      }
    } catch {
      setMessages((current) =>
        current.map((m) =>
          m.id === assistantMsgId && !m.text
            ? {
                ...m,
                text: "The Ordinance Aide could not complete that request. Please try again.",
              }
            : m,
        ),
      );
    } finally {
      setBusy(false);
      void getOrdinanceAgentScope()
        .then((data) => {
          setScope(data);
        })
        .catch(() => undefined);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    await executePrompt(question);
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!busy && question.trim() && scope && municipality) {
        void executePrompt(question);
      }
    }
  };

  return (
    <AppShell>
      {/* Top Banner Header */}
      <section className="overflow-hidden rounded-xl border border-outline-variant border-t-4 border-t-brand-lime bg-card">
        <div className="grid gap-6 px-5 py-6 md:grid-cols-[1fr_auto] md:px-8">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-secondary">
                Field ACQ intelligence
              </p>
              <Badge variant="approved">
                <ShieldCheck className="mr-1 size-3" /> Private · Pro only
              </Badge>
              {activeParcel && (
                <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary font-semibold text-xs">
                  <MapPin className="mr-1 size-3 text-primary" /> Active Parcel Context Linked
                </Badge>
              )}
            </div>
            <h1 className="mt-2 flex items-center gap-3 text-2xl sm:text-3xl font-bold tracking-tight">
              <Bot className="size-8 text-primary" /> Ordinance Aide Agent
            </h1>
            <p className="mt-1.5 max-w-3xl text-xs sm:text-sm text-muted-foreground">
              Ask jurisdiction-specific questions against the private municipal corpus. Answers are
              grounded in retrieved source excerpts, statutory MPC standards, and local SALDO provisions.
            </p>
          </div>
          <div className="flex min-w-48 items-center gap-3 rounded-lg bg-surface-low px-4 py-3 border border-border/40">
            <Network className="size-8 text-secondary shrink-0" />
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Knowledge graph
              </div>
              <div className="font-semibold text-sm">
                {scope ? scope.documentCount.toLocaleString() : "—"} sources
              </div>
              <div className="text-xs text-muted-foreground">
                {scope ? scope.chunkCount.toLocaleString() : "—"} searchable chunks
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Grid: Left Context Enclave & Right Conversational Studio */}
      <div className="mt-6 grid gap-5 lg:grid-cols-[320px_1fr]">
        {/* Left Sidebar: Active Parcel Enclave & Jurisdictional Controls */}
        <div className="space-y-4">
          {/* Active Parcel Context Card */}
          {activeParcel && (
            <Card className="border-primary/40 shadow-sm overflow-hidden bg-gradient-to-b from-primary/5 to-transparent">
              <CardHeader className="p-4 pb-2 border-b border-border/40 bg-muted/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary">
                    <MapPin className="size-3.5 text-primary" /> Active Parcel Context
                  </div>
                  <Badge variant="outline" className="text-[10px] font-mono font-semibold">
                    {activeParcel.county} Co.
                  </Badge>
                </div>
                <CardTitle className="text-sm font-bold text-foreground mt-1 truncate">
                  {activeParcel.address}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3 text-xs">
                {/* Parcel Switcher Dropdown */}
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                    Switch Anchor Parcel
                  </label>
                  <select
                    value={activeParcel.id}
                    onChange={(e) => handleSelectParcel(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary truncate"
                  >
                    {PARCELS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.address} ({p.municipality} · {p.acres} ac · {p.zoning})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Key Spec Grid */}
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/40">
                  <div className="p-2 rounded bg-muted/40">
                    <span className="text-[10px] text-muted-foreground block">Zoning Code</span>
                    <span className="font-bold text-foreground">{activeParcel.zoning}</span>
                    <span className="text-[10px] text-muted-foreground block truncate">{activeParcel.zoningName}</span>
                  </div>
                  <div className="p-2 rounded bg-muted/40">
                    <span className="text-[10px] text-muted-foreground block">Gross Acres</span>
                    <span className="font-bold text-foreground">{activeParcel.acres} ac</span>
                    <span className="text-[10px] text-muted-foreground block">{Math.round(activeParcel.sqft).toLocaleString()} sqft</span>
                  </div>
                  <div className="p-2 rounded bg-muted/40">
                    <span className="text-[10px] text-muted-foreground block">Municipality</span>
                    <span className="font-bold text-foreground truncate block">{activeParcel.municipality}</span>
                  </div>
                  <div className="p-2 rounded bg-muted/40">
                    <span className="text-[10px] text-muted-foreground block">Assessed Value</span>
                    <span className="font-bold text-foreground">{money(activeParcel.assessed)}</span>
                  </div>
                </div>

                {/* Direct Cross-Tool Teleport Links */}
                <div className="pt-2 border-t border-border/40 space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Cross-Tool Handoff
                  </span>
                  <div className="flex flex-col gap-1.5">
                    <Button asChild variant="outline" size="sm" className="h-7 text-xs justify-between w-full">
                      <Link to="/acquire" search={{ parcelId: activeParcel.id }}>
                        <span className="flex items-center gap-1.5">
                          <FileSpreadsheet className="size-3 text-amber-600 dark:text-amber-400" /> Feasibility Studio
                        </span>
                        <ChevronRight className="size-3 text-muted-foreground" />
                      </Link>
                    </Button>
                    <Button asChild variant="outline" size="sm" className="h-7 text-xs justify-between w-full">
                      <Link to="/map" search={{ parcelId: activeParcel.id }}>
                        <span className="flex items-center gap-1.5">
                          <Layers className="size-3 text-sky-600 dark:text-sky-400" /> Interactive GIS Map
                        </span>
                        <ChevronRight className="size-3 text-muted-foreground" />
                      </Link>
                    </Button>
                    <Button asChild variant="outline" size="sm" className="h-7 text-xs justify-between w-full">
                      <Link to="/scene-3d" search={{ parcelId: activeParcel.id }}>
                        <span className="flex items-center gap-1.5">
                          <DollarSign className="size-3 text-primary" /> 3D Massing & Cost Engine
                        </span>
                        <ChevronRight className="size-3 text-muted-foreground" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Jurisdiction Filters & Allowance Card */}
          <Card>
            <CardContent className="space-y-4 p-4 text-xs">
              <div>
                <label htmlFor="agent-county" className="font-semibold block mb-1">
                  County Authority
                </label>
                <select
                  id="agent-county"
                  value={county}
                  onChange={(event) => changeCounty(event.target.value)}
                  disabled={!scope}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs font-medium"
                >
                  {(scope?.counties ?? []).map((item) => (
                    <option key={item.county} value={item.county}>
                      {item.county} County
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="agent-municipality" className="font-semibold block mb-1">
                  Municipality
                </label>
                <select
                  id="agent-municipality"
                  value={municipality}
                  onChange={(event) => setMunicipality(event.target.value)}
                  disabled={!scope}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs font-medium"
                >
                  {municipalities.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              {scopeError ? <p className="text-xs text-destructive">{scopeError}</p> : null}

              <div className="rounded-lg bg-surface-low p-2.5 text-[11px] text-muted-foreground border border-border/40 leading-relaxed">
                Source files remain private and are never exposed as a browsable website section. This agent returns only the excerpts needed to support an answer.
              </div>

              {/* AI Allowance Quota */}
              <div className="rounded-lg border border-border/60 p-3 bg-card/60">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="flex items-center gap-1.5">
                    <Gauge className="size-3.5 text-secondary" /> AI Allowance
                  </span>
                  <Badge variant="outline" className="text-[10px]">Monthly Pro</Badge>
                </div>
                <p className="mt-1.5 text-xl font-bold text-foreground">
                  {usage ? usage.remaining.toLocaleString() : "—"}
                  <span className="ml-1 text-xs font-normal text-muted-foreground">
                    questions left
                  </span>
                </p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  {usage
                    ? `${usage.includedLimit} included monthly · resets ${resetsLabel}`
                    : "Loading allowance…"}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Main Conversational Studio */}
        <Card className="min-h-[640px] flex flex-col shadow-sm border border-border/80">
          {/* Studio Header with Reset Button */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-border/60 bg-muted/10">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Target Jurisdiction:
              </span>
              <Badge variant="outline" className="text-xs font-semibold bg-muted/30">
                {municipality || "Select Municipality"}, {county} Co.
              </Badge>
              {activeParcel && (
                <Badge variant="outline" className="text-xs text-muted-foreground hidden sm:inline-flex">
                  Zoning: {activeParcel.zoning}
                </Badge>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearConversation}
              className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1"
            >
              <RotateCcw className="size-3" /> Reset Chat
            </Button>
          </div>

          <CardContent className="flex h-full min-h-[580px] flex-col p-0 justify-between">
            {/* Message Thread Scroll Container */}
            <div
              className="flex-1 space-y-4 overflow-y-auto p-5"
              aria-live="polite"
              aria-label="Ordinance Aide conversation"
            >
              {messages.map((message) => {
                if (!message.text && message.role === "assistant" && busy) {
                  return null;
                }
                return (
                  <div
                    key={message.id}
                    className={
                      message.role === "user"
                        ? "ml-auto max-w-[85%] rounded-xl bg-primary text-primary-foreground px-4 py-3 text-sm shadow-sm"
                        : "max-w-[92%] whitespace-pre-wrap rounded-xl bg-muted/40 border border-border/50 px-4 py-3 text-sm leading-relaxed text-foreground shadow-sm"
                    }
                  >
                    {message.text}
                  </div>
                );
              })}

              {/* Initial Contextual Jumpstart Grid (When chat is fresh) */}
              {messages.length <= 1 && (
                <div className="mt-4 p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                      <Sparkles className="size-3.5 text-primary" /> Contextual Jumpstart Questions
                    </span>
                    <span className="text-[11px] text-muted-foreground">Click to load question</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {quickPrompts.map((qp) => (
                      <button
                        key={qp.id}
                        type="button"
                        onClick={() => handleSelectQuickPrompt(qp.prompt)}
                        className="p-2.5 rounded-lg border border-border/60 bg-card hover:border-primary/60 hover:bg-primary/5 text-left transition-all duration-150 group shadow-2xs"
                      >
                        <span className="text-xs font-bold text-foreground group-hover:text-primary block">
                          {qp.label}
                        </span>
                        <span className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
                          {qp.prompt}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Streaming loading indicator */}
              {busy &&
              (!messages[messages.length - 1]?.text ||
                messages[messages.length - 1]?.role === "user") ? (
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground p-3 rounded-lg bg-muted/20 border border-border/40 w-fit">
                  <Loader2 className="size-4 animate-spin text-primary" /> Searching private Pennsylvania ordinance corpus…
                </div>
              ) : null}
            </div>

            {/* Input Form & Quick Prompt Bar */}
            <form onSubmit={submit} className="border-t border-border/70 p-4 bg-card">
              {/* Contextual Quick Chips Bar (accessible at any time) */}
              <div className="mb-3 flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground shrink-0 mr-1 flex items-center gap-1">
                  <Sparkles className="size-3 text-primary" /> Quick Inquiries:
                </span>
                {quickPrompts.map((qp) => (
                  <button
                    key={qp.id}
                    type="button"
                    onClick={() => handleSelectQuickPrompt(qp.prompt)}
                    className="whitespace-nowrap px-2.5 py-1 rounded-full border border-border/70 bg-muted/20 text-[11px] font-medium text-muted-foreground hover:border-primary/60 hover:text-foreground hover:bg-primary/5 transition-all shrink-0"
                  >
                    {qp.label}
                  </button>
                ))}
              </div>

              {/* Textarea Input */}
              <Textarea
                ref={textareaRef}
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                onKeyDown={handleKeyDown}
                maxLength={1_200}
                placeholder={
                  activeParcel
                    ? `Ask about setbacks, SALDO requirements, stormwater, or permitted uses for ${activeParcel.address}... (Press Enter to send, Shift+Enter for newline)`
                    : `Ask about setbacks, SALDO requirements, stormwater, or permitted uses in ${municipality}... (Press Enter to send)`
                }
                className="min-h-24 resize-y text-xs sm:text-sm bg-background"
                disabled={!scope || busy || usage?.exhausted}
              />

              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <DataProtectionBadge
                    isDirty={isPromptDirty}
                    isDraftRestored={isPromptRestored}
                    lastSavedAt={promptLastSavedAt}
                    onReset={resetPrompt}
                  />
                  <p className="text-[11px] text-muted-foreground hidden sm:block">
                    Press <kbd className="px-1 py-0.5 rounded bg-muted border text-[10px] font-mono">Enter</kbd> to ask · Private corpus grounded
                  </p>
                </div>
                <Button
                  type="submit"
                  size="sm"
                  disabled={!scope || !municipality || !question.trim() || busy || usage?.exhausted}
                  className="gap-1.5 font-semibold text-xs"
                >
                  {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                  Ask Aide
                </Button>
              </div>

              {usage?.exhausted ? (
                <p className="mt-2 text-xs font-semibold text-destructive">
                  Monthly AI allowance used. Access resumes {resetsLabel}.
                </p>
              ) : null}
            </form>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
