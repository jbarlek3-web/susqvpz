import type { Sql } from "./db.ts";

export type AuditAction = "member.added" | "member.role_changed" | "member.removed";

/**
 * Append one row to `organization_audit_log`. Called from the Clerk
 * membership webhook handlers (created/updated/deleted) rather than from UI
 * actions directly, so every membership change is captured regardless of
 * whether it originated in this app or Clerk's own hosted UI.
 *
 * `metadata` must never contain secrets/tokens — ids, role strings, and
 * timestamps only.
 */
export async function logAuditEvent(
  sql: Sql,
  params: {
    organizationId: string;
    actorUserId: string;
    action: AuditAction;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  await sql`
    insert into organization_audit_log (organization_id, actor_user_id, action, metadata)
    values (${params.organizationId}, ${params.actorUserId}, ${params.action}, ${JSON.stringify(params.metadata ?? {})}::jsonb)
  `;
}
