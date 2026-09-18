import { OrganizationProfile, useAuth } from "@clerk/tanstack-react-start";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { listOrgMembers, type OrgMember } from "@/lib/org-admin";

export const Route = createFileRoute("/org/members")({ component: OrgMembers });

function OrgMembers() {
  const { user, isPending } = useCurrentUserState();
  const { isLoaded, orgId, orgRole } = useAuth();
  const [members, setMembers] = useState<OrgMember[] | "loading">("loading");

  const isAdmin = isLoaded && !!orgId && orgRole === "org:admin";

  useEffect(() => {
    if (!isAdmin) return;
    let current = true;
    void listOrgMembers()
      .then((result) => {
        if (current) setMembers(result);
      })
      .catch(() => {
        if (current) setMembers([]);
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
                ? "Member management is visible to organization admins only."
                : "Switch to an organization to manage members."}
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
            <CardTitle>Members</CardTitle>
          </CardHeader>
          <CardContent>
            {members === "loading" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : members.length === 0 ? (
              <p className="text-sm text-muted-foreground">No members found.</p>
            ) : (
              <ul className="divide-y divide-outline-variant text-sm">
                {members.map((m) => (
                  <li key={m.userId} className="flex items-center justify-between py-2">
                    <span className="font-mono text-xs">{m.userId}</span>
                    <Badge variant={m.role === "org:admin" ? "default" : "outline"}>
                      {m.role}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-4 text-xs text-muted-foreground">
              To invite, remove, or change a member's role, use the organization manager below.
            </p>
          </CardContent>
        </Card>
        <OrganizationProfile routing="hash" />
      </div>
    </AppShell>
  );
}
