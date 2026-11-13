begin;

grant usage on schema public to authenticated;
grant select, insert, update, delete on
  public.audits,
  public.bill_items,
  public.findings,
  public.reports,
  public.benchmarks
to authenticated;

alter table public.audits enable row level security;
alter table public.audits force row level security;
drop policy if exists audit_owner_access on public.audits;
create policy audit_owner_access on public.audits
  for all to authenticated
  using (user_id = (select auth.uid())::text)
  with check (user_id = (select auth.uid())::text);

alter table public.bill_items enable row level security;
alter table public.bill_items force row level security;
drop policy if exists bill_item_owner_access on public.bill_items;
create policy bill_item_owner_access on public.bill_items
  for all to authenticated
  using (
    exists (
      select 1 from public.audits a
      where a.id = bill_items.audit_id
        and a.user_id = (select auth.uid())::text
    )
  )
  with check (
    exists (
      select 1 from public.audits a
      where a.id = bill_items.audit_id
        and a.user_id = (select auth.uid())::text
    )
  );

alter table public.findings enable row level security;
alter table public.findings force row level security;
drop policy if exists finding_owner_access on public.findings;
create policy finding_owner_access on public.findings
  for all to authenticated
  using (
    exists (
      select 1 from public.audits a
      where a.id = findings.audit_id
        and a.user_id = (select auth.uid())::text
    )
  )
  with check (
    exists (
      select 1 from public.audits a
      where a.id = findings.audit_id
        and a.user_id = (select auth.uid())::text
    )
  );

alter table public.reports enable row level security;
alter table public.reports force row level security;
drop policy if exists report_owner_access on public.reports;
create policy report_owner_access on public.reports
  for all to authenticated
  using (
    exists (
      select 1 from public.audits a
      where a.id = reports.audit_id
        and a.user_id = (select auth.uid())::text
    )
  )
  with check (
    exists (
      select 1 from public.audits a
      where a.id = reports.audit_id
        and a.user_id = (select auth.uid())::text
    )
  );

alter table public.benchmarks enable row level security;
alter table public.benchmarks force row level security;
drop policy if exists benchmark_authenticated_read on public.benchmarks;
create policy benchmark_authenticated_read on public.benchmarks
  for select to authenticated
  using (true);
drop policy if exists benchmark_admin_insert on public.benchmarks;
create policy benchmark_admin_insert on public.benchmarks
  for insert to authenticated
  with check ((select auth.jwt() -> 'app_metadata' ->> 'hisaab_role') = 'admin');
drop policy if exists benchmark_admin_update on public.benchmarks;
create policy benchmark_admin_update on public.benchmarks
  for update to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'hisaab_role') = 'admin')
  with check ((select auth.jwt() -> 'app_metadata' ->> 'hisaab_role') = 'admin');
drop policy if exists benchmark_admin_delete on public.benchmarks;
create policy benchmark_admin_delete on public.benchmarks
  for delete to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'hisaab_role') = 'admin');

commit;
