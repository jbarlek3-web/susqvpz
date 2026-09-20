import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Bot,
  Box,
  Building2,
  ExternalLink,
  FileText,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Search,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { sanitizeUrl } from "@/lib/security/threat-detector";
import { PARCELS } from "@/lib/data/parcels";
import {
  getProCountyDirectory,
  getProCountyDocumentLinks,
  getProMunicipalDocumentLinks,
  type CountyDirectoryPayload,
  type CountyDirectoryRecord,
  type CountyDocumentPayload,
  type CountyDocumentRecord,
  type MunicipalDocPayload,
  type MunicipalDocRecord,
} from "@/lib/pro-directory";

export interface DirectorySearch {
  county?: string;
  search?: string;
  tab?: "county-contacts" | "county-docs" | "municipal-docs" | "counties" | "municipalities";
}

export const Route = createFileRoute("/directory")({
  validateSearch: (search: Record<string, unknown>): DirectorySearch => {
    const validTabs = ["county-contacts", "county-docs", "municipal-docs", "counties", "municipalities"];
    const tab =
      typeof search.tab === "string" && validTabs.includes(search.tab)
        ? (search.tab as DirectorySearch["tab"])
        : undefined;
    return {
      county: typeof search.county === "string" ? search.county : undefined,
      search: typeof search.search === "string" ? search.search : undefined,
      tab,
    };
  },
  component: ProDirectories,
});

type LoadState<T> = { data: T | null; error: string | null; loading: boolean };

function ProDirectories() {
  const search = Route.useSearch();
  const getInitialTab = () => {
    if (search.tab === "county-contacts" || search.tab === "counties") return "county-contacts";
    if (search.tab === "county-docs") return "county-docs";
    if (search.tab === "municipal-docs" || search.tab === "municipalities") return "municipal-docs";
    if (search.search) return "municipal-docs";
    return "county-contacts";
  };
  const [activeTab, setActiveTab] = useState<string>(getInitialTab);

  const [counties, setCounties] = useState<LoadState<CountyDirectoryPayload>>({
    data: null,
    error: null,
    loading: true,
  });
  const [countyDocs, setCountyDocs] = useState<LoadState<CountyDocumentPayload>>({
    data: null,
    error: null,
    loading: false,
  });
  const [municipalDocs, setMunicipalDocs] = useState<LoadState<MunicipalDocPayload>>({
    data: null,
    error: null,
    loading: false,
  });

  useEffect(() => {
    let current = true;
    void getProCountyDirectory()
      .then((data) => {
        if (current) setCounties({ data, error: null, loading: false });
      })
      .catch(() => {
        if (current)
          setCounties({
            data: null,
            error: "The county contact directory could not be loaded.",
            loading: false,
          });
      });
    return () => {
      current = false;
    };
  }, []);

  useEffect(() => {
    if (activeTab !== "county-docs" || countyDocs.data || countyDocs.loading) return;
    let current = true;
    setCountyDocs((state) => ({ ...state, error: null, loading: true }));
    void getProCountyDocumentLinks()
      .then((data) => {
        if (current) setCountyDocs({ data, error: null, loading: false });
      })
      .catch(() => {
        if (current)
          setCountyDocs({
            data: null,
            error: "The county document links could not be loaded.",
            loading: false,
          });
      });
    return () => {
      current = false;
    };
  }, [activeTab, countyDocs.data, countyDocs.loading]);

  useEffect(() => {
    if (activeTab !== "municipal-docs" || municipalDocs.data || municipalDocs.loading) return;
    let current = true;
    setMunicipalDocs((state) => ({ ...state, error: null, loading: true }));
    void getProMunicipalDocumentLinks()
      .then((data) => {
        if (current) setMunicipalDocs({ data, error: null, loading: false });
      })
      .catch(() => {
        if (current)
          setMunicipalDocs({
            data: null,
            error: "The municipal document links could not be loaded.",
            loading: false,
          });
      });
    return () => {
      current = false;
    };
  }, [activeTab, municipalDocs.data, municipalDocs.loading]);

  return (
    <AppShell>
      <section className="rounded-xl border border-outline-variant border-t-4 border-t-brand-lime bg-card px-5 py-7 md:px-8">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-secondary">
            Pennsylvania Development Directories
          </p>
          <Badge variant="approved">
            <ShieldCheck className="mr-1 size-3" /> Pro only
          </Badge>
        </div>
        <h1 className="mt-2 text-3xl font-semibold">Planning and Zoning Directories</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Access county contact details, verified county document links, and comprehensive municipal
          document links for all municipalities across Cumberland, Dauphin, Lancaster, and York.
          No document files are hosted on this platform — all links direct users to verified official
          government websites and code repositories.
        </p>
      </section>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
        <TabsList aria-label="Pro directory selection" className="h-auto flex-wrap">
          <TabsTrigger value="county-contacts">County P&amp;Z directory · Contacts</TabsTrigger>
          <TabsTrigger value="county-docs">County Document Links</TabsTrigger>
          <TabsTrigger value="municipal-docs">Municipal source directory · Municipal Document Links</TabsTrigger>
        </TabsList>
        <TabsContent value="county-contacts" className="mt-4">
          <DirectoryLoadState state={counties}>
            {(data) => <CountyDirectory data={data} />}
          </DirectoryLoadState>
        </TabsContent>
        <TabsContent value="county-docs" className="mt-4">
          <DirectoryLoadState state={countyDocs}>
            {(data) => <CountyDocumentDirectory data={data} />}
          </DirectoryLoadState>
        </TabsContent>
        <TabsContent value="municipal-docs" className="mt-4">
          <DirectoryLoadState state={municipalDocs}>
            {(data) => (
              <MunicipalDocumentLinksDirectory
                data={data}
                initialSearch={search.search}
                initialCounty={search.county}
              />
            )}
          </DirectoryLoadState>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}

function DirectoryLoadState<T>({
  state,
  children,
}: {
  state: LoadState<T>;
  children: (data: T) => ReactNode;
}) {
  if (state.loading) {
    return (
      <div className="grid min-h-64 place-items-center rounded-lg border border-outline-variant bg-card">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading directory data…
        </div>
      </div>
    );
  }
  if (state.error || !state.data) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-card px-5 py-12 text-center">
        <p className="font-medium">{state.error ?? "This directory is unavailable."}</p>
        <p className="mt-2 text-sm text-muted-foreground">Reload the page to try again.</p>
      </div>
    );
  }
  return <>{children(state.data)}</>;
}

function CountyDirectory({ data }: { data: CountyDirectoryPayload }) {
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      data.records.filter((entry) =>
        needle
          ? `${entry.county} ${entry.departmentName} ${entry.directorOrZoningOfficer ?? ""}`
              .toLowerCase()
              .includes(needle)
          : true,
      ),
    [data.records, needle],
  );

  return (
    <section>
      <DirectorySearch
        id="county-directory-search"
        value={query}
        onChange={setQuery}
        placeholder="Search county, department, or official..."
      />
      <p className="mt-3 text-xs text-muted-foreground">
        Showing {filtered.length} of {data.records.length} county departments · Source: {data.source}
      </p>
      {filtered.length ? (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {filtered.map((entry) => (
            <CountyCard key={entry.county} entry={entry} />
          ))}
        </div>
      ) : (
        <EmptySearch label="county contacts" onClear={() => setQuery("")} />
      )}
    </section>
  );
}

function CountyCard({ entry }: { entry: CountyDirectoryRecord }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-secondary">
              {entry.county} County
            </p>
            <h2 className="mt-1 text-lg font-semibold leading-snug">{entry.departmentName}</h2>
          </div>
          <Badge variant={entry.countyZoningStatus === "YES" ? "approved" : "outline"}>
            County zoning ordinance: {entry.countyZoningStatus}
          </Badge>
        </div>
        <ul className="mt-4 space-y-2 text-sm">
          {entry.directorOrZoningOfficer ? (
            <ContactLine icon={UserRound} text={entry.directorOrZoningOfficer} />
          ) : null}
          {entry.phoneNumber ? (
            <ContactLine icon={Phone} text={entry.phoneNumber} href={`tel:${entry.phoneNumber}`} />
          ) : null}
          {entry.emailAddress ? (
            <ContactLine
              icon={Mail}
              text={entry.emailAddress}
              href={`mailto:${entry.emailAddress}`}
            />
          ) : null}
          {entry.physicalAddress ? (
            <ContactLine icon={MapPin} text={entry.physicalAddress} />
          ) : null}
        </ul>
        {entry.websiteUrl ? (
          <Button asChild variant="outline" size="sm" className="mt-5">
            <a href={entry.websiteUrl} target="_blank" rel="noreferrer">
              <ExternalLink className="size-3.5" /> Open department website
            </a>
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}

function CountyDocumentDirectory({ data }: { data: CountyDocumentPayload }) {
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      data.records.filter((entry) =>
        needle
          ? `${entry.county} ${entry.departmentName} ${entry.documentLinks.map((d) => d.title).join(" ")}`
              .toLowerCase()
              .includes(needle)
          : true,
      ),
    [data.records, needle],
  );

  return (
    <section>
      <DirectorySearch
        id="county-document-search"
        value={query}
        onChange={setQuery}
        placeholder="Search county or document title (e.g. SALDO, Comprehensive Plan, Zoning)..."
      />
      <p className="mt-3 text-xs text-muted-foreground">
        Showing official document links for {filtered.length} of {data.records.length} regional PA counties · Source: {data.source}
      </p>
      {filtered.length ? (
        <div className="mt-4 grid gap-5 lg:grid-cols-2">
          {filtered.map((entry) => (
            <CountyDocumentCard key={entry.county} entry={entry} />
          ))}
        </div>
      ) : (
        <EmptySearch label="county document links" onClear={() => setQuery("")} />
      )}
    </section>
  );
}

function CountyDocumentCard({ entry }: { entry: CountyDocumentRecord }) {
  return (
    <Card className="cyber-card transition-all duration-200">
      <CardContent className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
          <div>
            <p className="text-xs font-mono font-bold uppercase tracking-wider text-secondary">
              {entry.county} County · Official Documents
            </p>
            <h2 className="mt-0.5 text-lg font-bold tracking-tight">{entry.departmentName}</h2>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/aide"
              search={{
                county: entry.county,
                q: `What are the county-level planning, SALDO, and development requirements for ${entry.county} County?`,
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition-all active:scale-95 border border-primary/20"
              title="Query private ordinance corpus for this county"
            >
              <Bot className="size-3.5" />
              <span>Ask AI</span>
            </Link>
            {entry.websiteUrl && (
              <Button asChild variant="outline" size="sm" className="h-7 text-xs">
                <a href={entry.websiteUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1">
                  Website <ExternalLink className="size-3" />
                </a>
              </Button>
            )}
          </div>
        </div>

        <div className="mt-4 space-y-2.5">
          {entry.documentLinks.map((doc, i) => (
            <div
              key={i}
              className="rounded-lg border border-outline-variant/60 bg-card/60 p-3 hover:border-primary/40 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <FileText className="size-3.5 text-secondary shrink-0" />
                    <span>{doc.title}</span>
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">{doc.description}</p>
                </div>
                <a
                  href={doc.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline shrink-0 px-2 py-1 rounded bg-primary/10 hover:bg-primary/20 transition-colors"
                >
                  <span>Open URL</span>
                  <ExternalLink className="size-3 shrink-0" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ContactLine({
  icon: Icon,
  text,
  href,
}: {
  icon: typeof Phone;
  text: string;
  href?: string;
}) {
  const content = (
    <>
      <Icon className="mt-0.5 size-4 shrink-0 text-secondary" /> <span>{text}</span>
    </>
  );
  return (
    <li className="flex items-start gap-2 text-on-surface-variant">
      {href ? (
        <a className="flex items-start gap-2 hover:text-primary hover:underline" href={href}>
          {content}
        </a>
      ) : (
        content
      )}
    </li>
  );
}

function MunicipalDocumentLinksDirectory({
  data,
  initialSearch = "",
  initialCounty = "all",
}: {
  data: MunicipalDocPayload;
  initialSearch?: string;
  initialCounty?: string;
}) {
  const [query, setQuery] = useState(initialSearch);
  const [county, setCounty] = useState(initialCounty || "all");
  const [visible, setVisible] = useState(60);

  useEffect(() => {
    if (initialSearch) setQuery(initialSearch);
  }, [initialSearch]);

  useEffect(() => {
    if (initialCounty && initialCounty !== "all") setCounty(initialCounty);
  }, [initialCounty]);

  const counties = useMemo(
    () => [...new Set(data.records.map((record) => record.County))].sort(),
    [data.records],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return data.records.filter(
      (record) =>
        (county === "all" || record.County.toLowerCase() === county.toLowerCase()) &&
        (!needle || `${record.Municipality} ${record.County}`.toLowerCase().includes(needle)),
    );
  }, [county, data.records, query]);

  useEffect(() => setVisible(60), [county, query]);

  return (
    <section>
      <div className="grid gap-3 rounded-lg border border-outline-variant bg-card p-4 md:grid-cols-[minmax(0,1fr)_260px]">
        <DirectorySearch
          id="municipal-document-search"
          value={query}
          onChange={setQuery}
          placeholder="Search municipality, code, forms, or stormwater..."
          bare
        />
        <label className="grid gap-1 text-xs font-semibold text-on-surface-variant">
          County
          <select
            id="municipal-document-county"
            name="municipalDocumentCounty"
            value={county}
            onChange={(event) => setCounty(event.target.value)}
            className="h-10 rounded-md border border-outline-variant bg-card px-3 text-sm text-on-surface"
          >
            <option value="all">All {counties.length} counties</option>
            {counties.map((name) => (
              <option key={name} value={name}>
                {name} County
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Showing {Math.min(visible, filtered.length)} of {filtered.length} matching municipalities ·{" "}
        {data.records.length} total municipal document directories · Source: {data.source}
      </p>
      {filtered.length ? (
        <>
          <div className="mt-4 grid gap-4 lg:grid-cols-1">
            {filtered.slice(0, visible).map((entry) => (
              <MunicipalDocCard key={`${entry.County}-${entry.Municipality}`} entry={entry} />
            ))}
          </div>
          {visible < filtered.length ? (
            <div className="mt-6 text-center">
              <Button
                type="button"
                variant="outline"
                onClick={() => setVisible((value) => value + 60)}
              >
                Show 60 more ({filtered.length - visible} remaining)
              </Button>
            </div>
          ) : null}
        </>
      ) : (
        <EmptySearch
          label="municipal document links"
          onClear={() => {
            setQuery("");
            setCounty("all");
          }}
        />
      )}
    </section>
  );
}

function parseUrls(text: string) {
  if (!text) return [];
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text
    .split(";")
    .map((t) => t.trim())
    .filter(Boolean)
    .map((part) => {
      const match = part.match(urlRegex);
      if (match) {
        const rawUrl = match[0];
        const validUrl = sanitizeUrl(rawUrl);
        const desc = part.replace(rawUrl, "").trim().replace(/^:/, "").replace(/:$/, "").trim();
        return { url: validUrl, desc: desc || "Official Document Link" };
      }
      return { url: null, desc: part };
    });
}

function DocumentCategory({ title, content }: { title: string; content: string }) {
  if (!content || content.toUpperCase().includes("NO MUNICIPAL DEVELOPMENT FORM VERIFIED ONLINE"))
    return null;
  const items = parseUrls(content);
  if (!items.length) return null;
  return (
    <div className="mt-3 rounded-lg border border-outline-variant/70 bg-card/60 p-3 shadow-xs">
      <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-secondary">
        {title}
      </h3>
      <ul className="mt-2 space-y-1.5 text-xs text-muted-foreground">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-1.5">
            <span className="text-secondary mt-0.5">•</span>
            {item.url ? (
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-1 font-medium transition-colors hover:text-secondary break-all"
              >
                <span>{item.desc}</span> <ExternalLink className="size-3 shrink-0" />
              </a>
            ) : (
              <span>{item.desc}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function MunicipalDocCard({ entry }: { entry: MunicipalDocRecord }) {
  const safeMuniUrl = sanitizeUrl(entry["Municipality URL"]);
  return (
    <Card className="cyber-card transition-all duration-200">
      <CardContent className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
          <div>
            <p className="text-xs font-mono font-bold uppercase tracking-wider text-secondary">
              {entry.County} County · Municipal Records &amp; Document Links
            </p>
            <h2 className="mt-0.5 text-lg font-bold tracking-tight">{entry.Municipality}</h2>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/aide"
              search={{
                county: entry.County,
                municipality: entry.Municipality,
                q: `What are the zoning, SALDO, and development requirements for ${entry.Municipality} in ${entry.County} County?`,
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition-all active:scale-95 border border-primary/20"
              title="Query private ordinance corpus for this municipality"
            >
              <Bot className="size-3.5" />
              <span>Ask AI</span>
            </Link>
            <Link
              to="/scene-3d"
              search={{
                parcelId: PARCELS.find(
                  (p) => p.municipality.toLowerCase() === entry.Municipality.toLowerCase(),
                )?.id,
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-secondary/10 text-secondary hover:bg-secondary/20 transition-all active:scale-95 border border-secondary/20"
              title="Open subdivision costs engine"
            >
              <Box className="size-3.5" />
              <span>Costs Engine</span>
            </Link>
            {safeMuniUrl && (
              <Button asChild variant="outline" size="sm" className="h-7 text-xs">
                <a
                  href={safeMuniUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1"
                >
                  Website <ExternalLink className="size-3" />
                </a>
              </Button>
            )}
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <DocumentCategory title="Muni Forms" content={entry["Muni Forms"]} />
          <DocumentCategory title="Municipal Code" content={entry["Municipil Code Download"]} />
          <DocumentCategory title="SALDO" content={entry["Municipal SALDO"]} />
          <DocumentCategory
            title="Stormwater & Sanitary"
            content={entry["Multiple Stormwater & Sanitary Sewer Solutions"]}
          />
          <DocumentCategory title="Zoning Map" content={entry["Zoning Map"]} />
        </div>
      </CardContent>
    </Card>
  );
}

function DirectorySearch({
  id,
  value,
  onChange,
  placeholder,
  bare = false,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  bare?: boolean;
}) {
  const field = (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-on-surface-variant" />
      <Input
        id={id}
        name={id}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="pl-9"
        autoComplete="off"
      />
    </div>
  );
  return bare ? (
    field
  ) : (
    <div className="rounded-lg border border-outline-variant bg-card p-4">{field}</div>
  );
}

function EmptySearch({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <div className="mt-4 rounded-lg border border-dashed border-outline-variant bg-card px-5 py-12 text-center">
      <Building2 className="mx-auto size-8 text-on-surface-variant" />
      <p className="mt-2 font-medium">No {label} match this search.</p>
      <button
        type="button"
        className="mt-2 text-sm font-semibold text-primary-container underline"
        onClick={onClear}
      >
        Clear filters
      </button>
    </div>
  );
}
