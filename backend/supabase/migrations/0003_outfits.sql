-- Week 4: outfit recommendations built from the user's own closet.
-- Each row is one suggested outfit. The user can save it and mark it helpful / not helpful.
-- Run in Supabase Dashboard → SQL Editor after 0001 and 0002. Safe to re-run.

create table if not exists public.outfits (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  -- clothing_items ids in display order (top, bottom / dress, layer, shoes, accessory)
  item_ids    uuid[] not null check (cardinality(item_ids) > 0),
  score       real,
  reason      text,
  occasion    text,
  -- which recommender produced it, so rule-based and model results can be compared later
  source      text not null default 'rule_based',
  saved       boolean not null default false,
  reaction    text check (reaction is null or reaction in ('helpful', 'not_helpful')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists outfits_user_idx on public.outfits (user_id, created_at desc);

drop trigger if exists outfits_updated_at on public.outfits;
create trigger outfits_updated_at before update on public.outfits
  for each row execute function public.set_updated_at();

grant select, insert, update, delete on public.outfits to authenticated;

alter table public.outfits enable row level security;

drop policy if exists "own outfits" on public.outfits;
create policy "own outfits" on public.outfits
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
