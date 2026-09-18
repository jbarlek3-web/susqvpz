import { useAuth } from "@clerk/tanstack-react-start";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listAuditLog, type AuditLogEntry } from "@/lib/org-admin";

export const Route = createFileRoute("/org/audit-log")({ component: OrgAuditLog });

const ACTION_LABEL: Record<string, string> = {
  "member.added": "Member added",
  "member.role_changed": "Role changed",
  "member.removed": "Member removed",
};

function OrgAuditLog() {
  const { user, isPending } = useCurrentUserState();
  const { isLoaded, orgId, orgRole } = useAuth();
  const [entries, setEntries] = useState<AuditLogEntry[] | "loading">("loading");

  const isAdmin = isLoaded && !!orgId && orgRole === "org:admin";

  useEffect(() => {
    if (!isAdmin) return;
    let current = true;
    void listAuditLog()
      .then((result) => {
        if (current) setEntries(result);
      })
      .catch(() => {
        if (current) setEntries([]);
      });
    return () => {
      current = false;
    };
  }, [isAdmin]);

  if (isPending || !isLoaded)
    return (
      <main className="grid min-h-screen place-items-center">
        <Loader2 className="size-4 animate-spin" />
      </main>
    );
  if (!user) return <RedirectToSignIn />;

  if (!orgId || !isAdmin) {
    return (
      <AppShell>
        <div className="mx-auto max-w-2xl p-6">
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              {orgId
                ? "The audit log is visible to organization admins only."
                : "Switch to an organization to view its audit log."}
            </CardContent>
          </Card>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl space-y-6 p-6">
        <Card>
          <CardHeader>
            <CardTitle>Audit log</CardTitle>
          </CardHeader>
          <CardContent>
            {entries === "loading" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : entries.length === 0 ? (
              <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
            ) : (
              <ul className="divide-y divide-outline-variant text-sm">
                {entries.map((e) => (
                  <li key={e.id} className="py-2">
                    <div className="flex items-center justify-between">
                      <span>{ACTION_LABEL[e.action] ?? e.action}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(e.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="mt-1 font-mono text-xs text-muted-foreground">
                      {e.actorUserId}
                      {e.metadata && Object.keys(e.metadata).length > 0
                        ? ` — ${JSON.stringify(e.metadata)}`
                        : ""}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
