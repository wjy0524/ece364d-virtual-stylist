-- Saved looks and thumbs-up/down ratings for generated outfits.
-- outfit_key is a hash of the occasion + sorted item ids (see recommendation_engine.outfit_key).
-- Item ownership is checked by the API before writing; clothing_items RLS protects the items themselves.

create table public.saved_outfits (
  user_id         uuid not null references public.profiles (id) on delete cascade,
  outfit_key      text not null,
  item_ids        uuid[] not null,
  occasion        text not null,
  explanation     text not null,
  ranking_score   numeric(5, 2) not null,
  created_at      timestamptz not null default now(),
  primary key (user_id, outfit_key)
);

create table public.recommendation_feedback (
  user_id         uuid not null references public.profiles (id) on delete cascade,
  outfit_key      text not null,
  helpful         boolean not null,
  created_at      timestamptz not null default now(),
  primary key (user_id, outfit_key)
);

grant select, insert, update, delete on public.saved_outfits, public.recommendation_feedback to authenticated;

alter table public.saved_outfits enable row level security;
alter table public.recommendation_feedback enable row level security;

create policy "own saved outfits" on public.saved_outfits
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own recommendation feedback" on public.recommendation_feedback
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
