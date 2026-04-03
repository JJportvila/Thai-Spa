-- Apply after supabase-rls.sql
-- New rule: account_id is stored as "<logical_account_id>|<auth_uid>"
-- e.g. R-001|8d4f... ; policy validates the auth_uid suffix.

drop policy if exists retail_inventory_select_own on public.retail_inventory;
drop policy if exists retail_inventory_insert_own on public.retail_inventory;
drop policy if exists retail_inventory_update_own on public.retail_inventory;
drop policy if exists retail_inventory_delete_own on public.retail_inventory;

drop policy if exists account_program_settings_select_own on public.account_program_settings;
drop policy if exists account_program_settings_insert_own on public.account_program_settings;
drop policy if exists account_program_settings_update_own on public.account_program_settings;
drop policy if exists account_program_settings_delete_own on public.account_program_settings;

create policy retail_inventory_select_own
on public.retail_inventory
for select
using (
  split_part(account_id, '|', 2) = auth.uid()::text
);

create policy retail_inventory_insert_own
on public.retail_inventory
for insert
with check (
  split_part(account_id, '|', 2) = auth.uid()::text
);

create policy retail_inventory_update_own
on public.retail_inventory
for update
using (
  split_part(account_id, '|', 2) = auth.uid()::text
)
with check (
  split_part(account_id, '|', 2) = auth.uid()::text
);

create policy retail_inventory_delete_own
on public.retail_inventory
for delete
using (
  split_part(account_id, '|', 2) = auth.uid()::text
);

create policy account_program_settings_select_own
on public.account_program_settings
for select
using (
  split_part(account_id, '|', 2) = auth.uid()::text
);

create policy account_program_settings_insert_own
on public.account_program_settings
for insert
with check (
  split_part(account_id, '|', 2) = auth.uid()::text
);

create policy account_program_settings_update_own
on public.account_program_settings
for update
using (
  split_part(account_id, '|', 2) = auth.uid()::text
)
with check (
  split_part(account_id, '|', 2) = auth.uid()::text
);

create policy account_program_settings_delete_own
on public.account_program_settings
for delete
using (
  split_part(account_id, '|', 2) = auth.uid()::text
);
