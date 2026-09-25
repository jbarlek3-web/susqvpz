import { useEffect, useState } from "react";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { searchYorkParcels, type YorkParcelSuggestion } from "@/lib/york-lookup";

export function useYorkParcelSuggestions(query: string) {
  const { user } = useCurrentUserState();
  const [matches, setMatches] = useState<YorkParcelSuggestion[]>([]);

  useEffect(() => {
    const q = query.trim();
    if (!user || q.length < 3) {
      setMatches([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      void searchYorkParcels({ data: { q } })
        .then((res) => {
          if (!cancelled) setMatches(res.matches);
        })
        .catch(() => {
          if (!cancelled) setMatches([]);
        });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, user]);

  return matches;
}
