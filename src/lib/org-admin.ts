import { createServerFn } from "@tanstack/react-start";
import { adminMiddleware } from "@/lib/auth/middleware";

export type OrgEntitlement = {
  status: string;
  seatCount: number | null;
  currentPeriodEnd: string | null;
};

/** Current org's Stripe subscription record. `adminMiddleware` scopes this to the caller's own active organization — never a client-supplied id. */
export const getOrgEntitlement = createServerFn({ method: "GET" })
  .middleware([adminMiddleware])
  .handler(async ({ context }): Promise<OrgEntitlement | null> => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const rows = await sql<{
      status: string;
      seat_count: number | null;
      current_period_end: string | null;
    }>`
      select status, seat_count, current_period_end
      from stripe_entitlements
      where organization_id = ${context.organizationId}
      limit 1
    `;
    if (rows.length === 0) return null;
    return {
      status: rows[0].status,
      seatCount: rows[0].seat_count,
      currentPeriodEnd: rows[0].current_period_end,
    };
  });

export type OrgMember = { userId: string; role: string; createdAt: string };

export const listOrgMembers = createServerFn({ method: "GET" })
  .middleware([adminMiddleware])
  .handler(async ({ context }): Promise<OrgMember[]> => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const rows = await sql<{ user_id: string; role: string; created_at: string }>`
      select user_id, role, created_at
      from organization_memberships
      where organization_id = ${context.organizationId}
      order by created_at asc
    `;
    return rows.map((r) => ({ userId: r.user_id, role: r.role, createdAt: r.created_at }));
  });

export type AuditLogEntry = {
  id: number;
  actorUserId: string;
  action: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

export const listAuditLog = createServerFn({ method: "GET" })
  .middleware([adminMiddleware])
  .handler(async ({ context }): Promise<AuditLogEntry[]> => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const rows = await sql<{
      id: number;
      actor_user_id: string;
      action: string;
      metadata: Record<string, unknown> | null;
      created_at: string;
    }>`
      select id, actor_user_id, action, metadata, created_at
      from organization_audit_log
      where organization_id = ${context.organizationId}
      order by created_at desc
      limit 200
    `;
    return rows.map((r) => ({
      id: r.id,
      actorUserId: r.actor_user_id,
      action: r.action,
      metadata: r.metadata,
      createdAt: r.created_at,
    }));
  });
