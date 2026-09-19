import re

path = r'c:\Users\Shadow 13 Solutions\Desktop\Field ACQ Ordinance Aide\Field ACQ Ordinance Aide\src\routes\directory.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update imports
import_addition = """  getMunicipalDocuments,
  type MunicipalDocumentPayload,
  type MunicipalDocumentRecord,"""
content = content.replace('  getProMunicipalityDirectory,\n  type CountyDirectoryPayload,', import_addition + '\n  getProMunicipalityDirectory,\n  type CountyDirectoryPayload,')

# 2. Add state
state_addition = """  const [documents, setDocuments] = useState<LoadState<MunicipalDocumentPayload>>({
    data: null,
    error: null,
    loading: false,
  });
"""
content = content.replace('  const [municipalities, setMunicipalities] = useState<LoadState<MunicipalityDirectoryPayload>>({', state_addition + '  const [municipalities, setMunicipalities] = useState<LoadState<MunicipalityDirectoryPayload>>({')

# 3. Add useEffect for documents
effect_addition = """  useEffect(() => {
    if (activeTab !== "documents" || documents.data || documents.loading) return;
    let current = true;
    setDocuments((state) => ({ ...state, error: null, loading: true }));
    void getMunicipalDocuments()
      .then((data) => {
        if (current) setDocuments({ data, error: null, loading: false });
      })
      .catch(() => {
        if (current)
          setDocuments({
            data: null,
            error: "The municipal documents could not be loaded.",
            loading: false,
          });
      });
    return () => {
      current = false;
    };
  }, [activeTab, documents.data, documents.loading]);

  return (
    <AppShell>"""
content = content.replace('  return (\n    <AppShell>', effect_addition)

# 4. Add Tab trigger and content
trigger_addition = """          <TabsTrigger value="documents">Municipal Documents</TabsTrigger>"""
content = content.replace('          <TabsTrigger value="municipalities">Municipal source directory</TabsTrigger>', '          <TabsTrigger value="municipalities">Municipal source directory</TabsTrigger>\n' + trigger_addition)

tab_content_addition = """        <TabsContent value="documents" className="mt-4">
          <DirectoryLoadState state={documents}>
            {(data) => <MunicipalDocumentDirectory data={data} />}
          </DirectoryLoadState>
        </TabsContent>"""
content = content.replace('        </TabsContent>\n      </Tabs>', '        </TabsContent>\n' + tab_content_addition + '\n      </Tabs>')

# 5. Append components at the end
components = """
function MunicipalDocumentDirectory({ data }: { data: MunicipalDocumentPayload }) {
  const [query, setQuery] = useState("");
  
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return data.records.filter(
      (record) =>
        (!needle || `${record.Municipality} ${record.County}`.toLowerCase().includes(needle)),
    );
  }, [data.records, query]);

  return (
    <section>
      <div className="mb-4">
        <DirectorySearch
          id="municipal-document-search"
          value={query}
          onChange={setQuery}
          placeholder="Search municipality..."
        />
      </div>
      
      {filtered.length ? (
        <div className="mt-4 grid gap-4 lg:grid-cols-1">
          {filtered.map((entry) => (
            <MunicipalDocumentCard key={`${entry.County}-${entry.Municipality}`} entry={entry} />
          ))}
        </div>
      ) : (
        <EmptySearch
          label="municipal documents"
          onClear={() => {
            setQuery("");
          }}
        />
      )}
    </section>
  );
}

function parseUrls(text: string) {
  const urlRegex = /(https?:\\/\\/[^\\s]+)/g;
  return text.split(';').map(t => t.trim()).filter(Boolean).map(part => {
    const match = part.match(urlRegex);
    if (match) {
      const url = match[0];
      const desc = part.replace(url, '').trim().replace(/^:/, '').trim();
      return { url, desc: desc || "Link" };
    }
    return { url: null, desc: part };
  });
}

function DocumentCategory({ title, content }: { title: string, content: string }) {
  if (!content || content.toUpperCase().includes('NO MUNICIPAL DEVELOPMENT FORM VERIFIED ONLINE')) return null;
  const items = parseUrls(content);
  return (
    <div className="mt-3 border border-outline-variant rounded p-3">
      <h3 className="text-sm font-semibold text-secondary">{title}</h3>
      <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-1">
            <span>•</span>
            {item.url ? (
               <a href={item.url} target="_blank" rel="noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                 {item.desc} <ExternalLink className="size-3" />
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

function MunicipalDocumentCard({ entry }: { entry: MunicipalDocumentRecord }) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-xs font-bold uppercase tracking-wider text-secondary">
          {entry.County} County
        </p>
        <h2 className="mt-1 text-lg font-semibold">{entry.Municipality}</h2>
        {entry["Municipality URL"] && (
           <a href={entry["Municipality URL"]} target="_blank" rel="noreferrer" className="text-sm font-medium text-primary hover:underline inline-flex items-center gap-1 mt-2">
             Municipality Website <ExternalLink className="size-3" />
           </a>
        )}
        
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <DocumentCategory title="Muni Forms" content={entry["Muni Forms"]} />
          <DocumentCategory title="Municipal Code" content={entry["Municipil Code Download"]} />
          <DocumentCategory title="SALDO" content={entry["Municipal SALDO"]} />
          <DocumentCategory title="Stormwater & Sanitary" content={entry["Multiple Stormwater & Sanitary Sewer Solutions"]} />
          <DocumentCategory title="Zoning Map" content={entry["Zoning Map"]} />
        </div>
      </CardContent>
    </Card>
  );
}
"""

content += components

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
