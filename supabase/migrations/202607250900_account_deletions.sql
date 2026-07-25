-- Audit trail for self-service account deletion (App Store guideline 5.1.1(v)).
--
-- The auth.users row is gone after a deletion, so nothing links back to the
-- person. We keep a salted-free SHA-256 of the normalized email only, which is
-- enough for support to answer "was this address deleted, and when?" without
-- retaining the address itself.
create table if not exists public.account_deletion_log (
  id uuid primary key default gen_random_uuid(),
  -- Intentionally no FK: the referenced auth.users row no longer exists.
  deleted_user_id uuid not null,
  email_sha256 text not null,
  -- Per-table row counts removed / anonymized, for spot-checking coverage.
  purge_summary jsonb not null default '{}'::jsonb,
  requested_from text,
  created_at timestamptz not null default now()
);

alter table public.account_deletion_log enable row level security;

-- No policies on purpose: only the service role (edge functions) may read or
-- write this table. RLS with zero policies denies anon and authenticated.

create index if not exists account_deletion_log_email_idx
  on public.account_deletion_log(email_sha256, created_at desc);

create index if not exists account_deletion_log_user_idx
  on public.account_deletion_log(deleted_user_id);

comment on table public.account_deletion_log is
  'Proof-of-deletion records for user-initiated account deletion. Holds no plaintext PII.';
