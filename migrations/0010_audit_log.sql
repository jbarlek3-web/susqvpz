-- Organization-wide audit trail for membership/role changes.
create table if not exists organization_audit_log (
  id bigserial primary key,
  organization_id text not null,
  actor_user_id text not null,
  action text not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists organization_audit_log_org_idx
  on organization_audit_log (organization_id, created_at desc);
