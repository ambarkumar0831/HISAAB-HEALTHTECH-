begin;

alter table public.audits
  add column if not exists subtotal numeric(12, 2),
  add column if not exists discount numeric(12, 2),
  add column if not exists tax numeric(12, 2),
  add column if not exists uncertain_fields json not null default '[]',
  add column if not exists benchmark_review json,
  add column if not exists extraction_confirmed boolean not null default false;

alter table public.bill_items
  add column if not exists extraction_confidence numeric(3, 2),
  add column if not exists position integer not null default 0;

alter table public.findings
  add column if not exists source_name text,
  add column if not exists source_url text,
  add column if not exists source_date date,
  add column if not exists applicability_notes text;

commit;
