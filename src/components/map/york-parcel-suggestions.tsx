import type { YorkParcelSuggestion } from "@/lib/york-lookup";

function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function YorkParcelSuggestList({
  matches,
  onPick,
}: {
  matches: YorkParcelSuggestion[];
  onPick: (pidn: string) => void;
}) {
  if (!matches.length) return null;
  return (
    <ul className="max-h-80 overflow-auto text-sm">
      <li className="px-2 pb-1 pt-1 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
        York assessment roll
      </li>
      {matches.map((match) => (
        <li key={match.pidn}>
          <button
            type="button"
            onClick={() => onPick(match.pidn)}
            className="block w-full rounded-sm px-2 py-2 text-left hover:bg-surface-low"
          >
            <div className="font-medium">{match.address || "No site address"}</div>
            <div className="text-xs text-muted-foreground">
              {match.owner || "Owner unavailable"}
              {match.acres > 0 ? ` · ${match.acres.toFixed(2)} ac` : ""}
              {match.assessed != null ? ` · ${money(match.assessed)}` : ""}
            </div>
            <div className="font-mono text-[11px] text-muted-foreground">PIN {match.pidn}</div>
          </button>
        </li>
      ))}
    </ul>
  );
}
