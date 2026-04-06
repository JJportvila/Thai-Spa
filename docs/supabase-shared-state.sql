-- Stret POS shared state storage
-- Purpose: persist cross-device app state that previously lived in localStorage.
-- This prototype stores data by logical account_id and state_key.

create table if not exists public.app_shared_state (
  account_id text not null,
  state_key text not null,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (account_id, state_key)
);

create index if not exists idx_app_shared_state_updated_at
  on public.app_shared_state (updated_at desc);

alter table public.app_shared_state enable row level security;

drop policy if exists app_shared_state_select_all on public.app_shared_state;
drop policy if exists app_shared_state_insert_all on public.app_shared_state;
drop policy if exists app_shared_state_update_all on public.app_shared_state;
drop policy if exists app_shared_state_delete_all on public.app_shared_state;

-- Prototype policy: allow anon/authenticated clients to read/write.
-- Logical isolation is handled by account_id in the application layer.
create policy app_shared_state_select_all
on public.app_shared_state
for select
using (true);

create policy app_shared_state_insert_all
on public.app_shared_state
for insert
with check (true);

create policy app_shared_state_update_all
on public.app_shared_state
for update
using (true)
with check (true);

create policy app_shared_state_delete_all
on public.app_shared_state
for delete
using (true);
