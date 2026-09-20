import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Bot,
  Box,
  Compass,
  FileSpreadsheet,
  Gauge,
  Loader2,
  Network,
  Send,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { usePersistentDraft } from "@/lib/hooks/use-persistent-draft";
import { DataProtectionBadge } from "@/components/ui/data-protection-badge";
import { logSecurityEvent, analyzeInput } from "@/lib/security/threat-detector";
import { PARCELS } from "@/lib/data/parcels";
import { getOrdinanceAgentScope, type OrdinanceAgentScope } from "@/lib/ordinance-agent";

export interface AideSearch {
  county?: string;
  municipality?: string;
  q?: string;
}

export const Route = createFileRoute("/aide")({
  validateSearch: (search: Record<string, unknown>): AideSearch => ({
    county: typeof search.county === "string" ? search.county : undefined,
    municipality: typeof search.municipality === "string" ? search.municipality : undefined,
    q: typeof search.q === "string" ? search.q : undefined,
  }),
  component: OrdinanceAide,
});

type Message = { id: number; role: "assistant" | "user"; text: string };

function OrdinanceAide() {
  const search = Route.useSearch();
  const [scope, setScope] = useState<OrdinanceAgentScope | null>(null);
  const [scopeError, setScopeError] = useState("");
  const [county, setCounty] = useState(() => search.county || "York");
  const [municipality, setMunicipality] = useState(() => search.municipality || "");
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
      text: "Choose a county and municipality, then ask a zoning, SALDO, permitting, setback, use, or process question. I will answer from the private Field ACQ corpus and identify the source material used.",
    },
  ]);

  const countyRef = useRef(county);
  useEffect(() => {
    countyRef.current = county;
  }, [county]);

  useEffect(() => {
    let current = true;
    void getOrdinanceAgentScope()
      .then((data) => {
        if (!current) return;
        setScope(data);
        const targetCounty = search.county || countyRef.current;
        const countyData = data.counties.find((item) => item.county === targetCounty);
        if (countyData) {
          if (search.county) setCounty(search.county);
          const hasMuni =
            search.municipality && countyData.municipalities.includes(search.municipality);
          setMunicipality(hasMuni ? search.municipality! : (countyData.municipalities[0] ?? ""));
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
  }, [search.county, search.municipality]);

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

  async function submit(event: FormEvent) {
    event.preventDefault();
    const rawPrompt = question.trim();
    if (!rawPrompt || !municipality || busy) return;

    const threatCheck = analyzeInput(rawPrompt);
    if (threatCheck.isThreat) {
      logSecurityEvent({
        threatType: threatCheck.threatType || "UNKNOWN",
        details: threatCheck.details || "Threat pattern detected in AI prompt",
        sourceContext: "OrdinanceAide",
      });
    }

    const prompt = rawPrompt;

    clearPromptDraft();
    const userMsgId = Date.now();
    const assistantMsgId = userMsgId + 1;

    const conversation = messages
      .filter((m) => m.id !== 1 && m.text.trim().length > 0)
      .map((m) => ({ role: m.role, content: m.text }));
    conversation.push({ role: "user", content: prompt });

    setMessages((current) => [
      ...current,
      { id: userMsgId, role: "user", text: prompt },
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

  return (
    <AppShell>
      <section className="overflow-hidden rounded-xl border border-outline-variant border-t-4 border-t-brand-lime bg-card">
        <div className="grid gap-6 px-5 py-7 md:grid-cols-[1fr_auto] md:px-8">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-secondary">
                Field ACQ intelligence
              </p>
              <Badge variant="approved">
                <ShieldCheck className="mr-1 size-3" /> Private · Pro only
              </Badge>
            </div>
            <h1 className="mt-2 flex items-center gap-3 text-3xl font-semibold">
              <Bot className="size-8 text-primary-container" /> Ordinance Aide Agent
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              Ask jurisdiction-specific questions against the private municipal corpus. Answers are
              grounded in retrieved source excerpts and call out what still needs municipal
              verification.
            </p>
          </div>
          <div className="flex min-w-48 items-center gap-3 rounded-lg bg-surface-low px-4 py-3">
            <Network className="size-8 text-secondary" />
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                Knowledge graph
              </div>
              <div className="font-semibold">
                {scope ? scope.documentCount.toLocaleString() : "—"} sources
              </div>
              <div className="text-xs text-muted-foreground">
                {scope ? scope.chunkCount.toLocaleString() : "—"} searchable chunks
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mt-6 grid gap-4 lg:grid-cols-[280px_1fr]">
        <Card>
          <CardContent className="space-y-4 p-5">
            <div>
              <label htmlFor="agent-county" className="text-sm font-semibold">
                County
              </label>
              <select
                id="agent-county"
                value={county}
                onChange={(event) => changeCounty(event.target.value)}
                disabled={!scope}
                className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {(scope?.counties ?? []).map((item) => (
                  <option key={item.county} value={item.county}>
                    {item.county}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="agent-municipality" className="text-sm font-semibold">
                Municipality
              </label>
              <select
                id="agent-municipality"
                value={municipality}
                onChange={(event) => setMunicipality(event.target.value)}
                disabled={!scope}
                className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {municipalities.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
            {scopeError ? <p className="text-sm text-destructive">{scopeError}</p> : null}
            <div className="rounded-md bg-surface-low p-3 text-xs text-muted-foreground">
              Source files remain private and are never exposed as a browsable website section. This
              agent returns only the excerpts needed to support an answer.
            </div>
            <div className="rounded-md border border-outline-variant p-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Gauge className="size-4 text-secondary" /> AI allowance
              </div>
              <p className="mt-2 text-2xl font-semibold">
                {usage ? usage.remaining.toLocaleString() : "—"}
                <span className="ml-1 text-sm font-normal text-muted-foreground">
                  questions left
                </span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {usage
                  ? `${usage.includedLimit} included monthly · resets ${resetsLabel}`
                  : "Loading allowance…"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="min-h-[560px]">
          <CardContent className="flex h-full min-h-[560px] flex-col p-0">
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
                        ? "ml-auto max-w-[85%] rounded-xl bg-primary-container px-4 py-3 text-sm text-on-primary"
                        : "max-w-[92%] whitespace-pre-wrap rounded-xl bg-surface-low px-4 py-3 text-sm leading-relaxed"
                    }
                  >
                    {message.text}
                  </div>
                );
              })}
              {busy &&
              (!messages[messages.length - 1]?.text ||
                messages[messages.length - 1]?.role === "user") ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" /> Searching the private corpus…
                </div>
              ) : null}
            </div>
            <form onSubmit={submit} className="border-t border-outline-variant p-4">
              <Textarea
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                maxLength={1_200}
                placeholder="Example: What setbacks and approvals should I verify for a small commercial addition?"
                className="min-h-24"
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
                  <p className="text-xs text-muted-foreground hidden sm:block">
                    Research aid only. Confirm controlling requirements with the municipality.
                  </p>
                </div>
                <Button
                  type="submit"
                  disabled={!scope || !municipality || !question.trim() || busy || usage?.exhausted}
                >
                  <Send className="size-4" /> Ask Aide
                </Button>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2 pt-3 border-t border-border/60">
                <span className="text-xs font-mono font-medium text-muted-foreground">
                  Workflow Teleport:
                </span>
                <Button asChild variant="outline" size="sm" className="h-7 text-xs gap-1">
                  <Link
                    to="/scene-3d"
                    search={{
                      parcelId: PARCELS.find(
                        (p) => p.municipality.toLowerCase() === municipality.toLowerCase(),
                      )?.id,
                    }}
                  >
                    <Box className="size-3.5 text-primary" /> Costs Engine
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm" className="h-7 text-xs gap-1">
                  <Link
                    to="/directory"
                    search={{
                      search: municipality,
                      tab: "municipalities",
                    }}
                  >
                    <Compass className="size-3.5 text-emerald-600 dark:text-emerald-400" />{" "}
                    Municipal Directory
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm" className="h-7 text-xs gap-1">
                  <Link
                    to="/acquire"
                    search={{
                      parcelId: PARCELS.find(
                        (p) => p.municipality.toLowerCase() === municipality.toLowerCase(),
                      )?.id,
                      tab: "Report",
                    }}
                  >
                    <FileSpreadsheet className="size-3.5 text-amber-600 dark:text-amber-400" />{" "}
                    Feasibility
                  </Link>
                </Button>
              </div>
              {usage?.exhausted ? (
                <p className="mt-2 text-sm font-medium text-destructive">
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
