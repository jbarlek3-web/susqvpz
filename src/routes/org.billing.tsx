import { PricingTable, useAuth } from "@clerk/tanstack-react-start";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ORG_PLAN_KEY } from "@/lib/billing-config";
import { getOrgEntitlement, type OrgEntitlement } from "@/lib/org-admin";

export const Route = createFileRoute("/org/billing")({ component: OrgBilling });

function OrgBilling() {
  const { user, isPending } = useCurrentUserState();
  const { isLoaded, orgId, orgRole } = useAuth();
  const [entitlement, setEntitlement] = useState<OrgEntitlement | null | "loading">("loading");

  const isAdmin = isLoaded && !!orgId && orgRole === "org:admin";

  useEffect(() => {
    if (!isAdmin) return;
    let current = true;
    void getOrgEntitlement()
      .then((result) => {
        if (current) setEntitlement(result);
      })
      .catch(() => {
        if (current) setEntitlement(null);
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

  if (!orgId) {
    return (
      <AppShell>
        <div className="mx-auto max-w-2xl p-6">
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              Switch to an organization to manage org billing.
            </CardContent>
          </Card>
        </div>
      </AppShell>
    );
  }

  if (!isAdmin) {
    return (
      <AppShell>
        <div className="mx-auto max-w-2xl p-6">
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              Org billing is visible to organization admins only.
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
            <CardTitle>Organization billing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {entitlement === "loading" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : entitlement ? (
              <dl className="grid grid-cols-2 gap-2 text-sm">
                <dt className="text-muted-foreground">Status</dt>
                <dd>{entitlement.status}</dd>
                <dt className="text-muted-foreground">Seats</dt>
                <dd>{entitlement.seatCount ?? "—"}</dd>
                <dt className="text-muted-foreground">Renews</dt>
                <dd>{entitlement.currentPeriodEnd ?? "—"}</dd>
              </dl>
            ) : (
              <p className="text-sm text-muted-foreground">
                No active subscription for this organization yet.
              </p>
            )}
          </CardContent>
        </Card>
        <PricingTable for="organization" highlightedPlan={ORG_PLAN_KEY} />
      </div>
    </AppShell>
  );
}
