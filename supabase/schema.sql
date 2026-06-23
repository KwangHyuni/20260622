-- Supabase SQL Editor에서 실행하거나 supabase db push로 적용하세요.

create table if not exists public.lotto_draws (
  id bigint generated always as identity primary key,
  numbers jsonb not null,
  ticket_index smallint not null default 1,
  batch_id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  constraint lotto_draws_numbers_len check (jsonb_array_length(numbers) = 6)
);

create index if not exists lotto_draws_created_at_idx on public.lotto_draws (created_at desc);

alter table public.lotto_draws enable row level security;

-- 서비스 역할 키(API) 또는 anon 키(클라이언트 직접 연동 시)용 정책
drop policy if exists "lotto_draws_select" on public.lotto_draws;
drop policy if exists "lotto_draws_insert" on public.lotto_draws;

create policy "lotto_draws_select"
  on public.lotto_draws for select
  using (true);

create policy "lotto_draws_insert"
  on public.lotto_draws for insert
  with check (true);
