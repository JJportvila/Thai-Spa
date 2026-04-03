-- Stret POS: RLS for account-scoped tables
-- Run in Supabase SQL Editor after creating tables.

alter table public.retail_inventory enable row level security;
alter table public.account_program_settings enable row level security;

drop policy if exists retail_inventory_select_own on public.retail_inventory;
drop policy if exists retail_inventory_insert_own on public.retail_inventory;
drop policy if exists retail_inventory_update_own on public.retail_inventory;
drop policy if exists retail_inventory_delete_own on public.retail_inventory;

drop policy if exists account_program_settings_select_own on public.account_program_settings;
drop policy if exists account_program_settings_insert_own on public.account_program_settings;
drop policy if exists account_program_settings_update_own on public.account_program_settings;
drop policy if exists account_program_settings_delete_own on public.account_program_settings;

-- app_account_id claim is recommended (JWT custom claim).
-- fallback to auth.uid() text for simple auth setups.

create policy retail_inventory_select_own
on public.retail_inventory
for select
using (
  account_id = coalesce(auth.jwt() ->> 'app_account_id', auth.uid()::text)
);

create policy retail_inventory_insert_own
on public.retail_inventory
for insert
with check (
  account_id = coalesce(auth.jwt() ->> 'app_account_id', auth.uid()::text)
);

create policy retail_inventory_update_own
on public.retail_inventory
for update
using (
  account_id = coalesce(auth.jwt() ->> 'app_account_id', auth.uid()::text)
)
with check (
  account_id = coalesce(auth.jwt() ->> 'app_account_id', auth.uid()::text)
);

create policy retail_inventory_delete_own
on public.retail_inventory
for delete
using (
  account_id = coalesce(auth.jwt() ->> 'app_account_id', auth.uid()::text)
);

create policy account_program_settings_select_own
on public.account_program_settings
for select
using (
  account_id = coalesce(auth.jwt() ->> 'app_account_id', auth.uid()::text)
);

create policy account_program_settings_insert_own
on public.account_program_settings
for insert
with check (
  account_id = coalesce(auth.jwt() ->> 'app_account_id', auth.uid()::text)
);

create policy account_program_settings_update_own
on public.account_program_settings
for update
using (
  account_id = coalesce(auth.jwt() ->> 'app_account_id', auth.uid()::text)
)
with check (
  account_id = coalesce(auth.jwt() ->> 'app_account_id', auth.uid()::text)
);

create policy account_program_settings_delete_own
on public.account_program_settings
for delete
using (
  account_id = coalesce(auth.jwt() ->> 'app_account_id', auth.uid()::text)
);
