-- ECE 364D Virtual Stylist — initial schema (Week 1)
-- Run in Supabase Dashboard → SQL Editor, or `supabase db push` with the CLI.
-- Every table is owned by a user and protected by RLS: a user can only touch their own rows.

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles: 1:1 with auth.users, created automatically on sign-up
-- ---------------------------------------------------------------------------
create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  display_name  text,
  -- optional body measurements in cm, e.g. {"chest": 96, "waist": 81, "inseam": 79}
  measurements  jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data ->> 'display_name');
  insert into public.style_preferences (user_id) values (new.id);
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- style_preferences: onboarding quiz answers (1:1 with profile)
-- ---------------------------------------------------------------------------
create table public.style_preferences (
  user_id         uuid primary key references public.profiles (id) on delete cascade,
  aesthetics      text[] not null default '{}',   -- e.g. {minimal, streetwear}
  preferred_fits  text[] not null default '{}',   -- e.g. {relaxed, slim}
  occasions       text[] not null default '{}',   -- e.g. {class, work, going_out}
  disliked_items  text[] not null default '{}',   -- e.g. {skinny_jeans, crop_tops}
  updated_at      timestamptz not null default now()
);

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- clothing_items: the user's closet
-- ---------------------------------------------------------------------------
create table public.clothing_items (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles (id) on delete cascade,
  name            text,
  category        text not null
                  check (category in ('top', 'bottom', 'dress', 'layer', 'shoes', 'accessory')),
  subcategory     text,                           -- e.g. t-shirt, jeans, sneakers
  brand           text,
  size_label      text,                           -- size as printed on the tag: M, 32x30, 9.5
  color           text,
  pattern         text,                           -- e.g. solid, striped, plaid, graphic
  style_tags      text[] not null default '{}',   -- e.g. {casual, preppy, minimalist}
  -- path inside the private `closet-images` bucket: <user_id>/<item_id>.<ext>
  image_path      text,
  -- raw AI suggestions (Avery); user-confirmed values live in the columns above
  ai_tags         jsonb not null default '{}'::jsonb,
  tags_confirmed  boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index clothing_items_user_idx on public.clothing_items (user_id);

-- ---------------------------------------------------------------------------
-- fit_feedback: how an owned garment fits (many per item over time)
-- ---------------------------------------------------------------------------
create table public.fit_feedback (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  item_id      uuid not null references public.clothing_items (id) on delete cascade,
  -- same 3 classes as ModCloth / RentTheRunway fit data
  overall_fit  text not null
               check (overall_fit in ('too_small', 'fits_well', 'too_large')),
  -- per-area issues, issue in (tight, loose, short, long),
  -- e.g. [{"area": "waist", "issue": "tight"}, {"area": "sleeves", "issue": "long"}]
  issues       jsonb not null default '[]'::jsonb,
  notes        text,                              -- free text, kept for re-labeling later
  created_at   timestamptz not null default now()
);
create index fit_feedback_item_idx on public.fit_feedback (item_id);
create index fit_feedback_user_idx on public.fit_feedback (user_id);

-- ---------------------------------------------------------------------------
-- linked_products: shopping links the user pasted
-- ---------------------------------------------------------------------------
create table public.linked_products (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles (id) on delete cascade,
  url              text not null,
  retailer         text,
  name             text,
  brand            text,
  category         text
                   check (category is null or category in ('top', 'bottom', 'dress', 'layer', 'shoes', 'accessory')),
  image_url        text,
  available_sizes  text[] not null default '{}',
  -- price lets the recommender suggest cheaper alternatives (Prior Art §5.3, Tier 2)
  price            numeric(10, 2),
  currency         text default 'USD',
  -- e.g. {"unit": "in", "sizes": {"M": {"chest": [38, 40], "waist": [32, 34]}}}
  size_chart       jsonb,
  import_status    text not null default 'pending'
                   check (import_status in ('pending', 'imported', 'manual', 'failed')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index linked_products_user_idx on public.linked_products (user_id);

-- updated_at triggers
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger style_preferences_updated_at before update on public.style_preferences
  for each row execute function public.set_updated_at();
create trigger clothing_items_updated_at before update on public.clothing_items
  for each row execute function public.set_updated_at();
create trigger linked_products_updated_at before update on public.linked_products
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Data API grants (project has "Automatically expose new tables" off).
-- Only signed-in users get table privileges; RLS below narrows them to their own rows.
-- ---------------------------------------------------------------------------
grant select, insert, update, delete on
  public.profiles,
  public.style_preferences,
  public.clothing_items,
  public.fit_feedback,
  public.linked_products
to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles          enable row level security;
alter table public.style_preferences enable row level security;
alter table public.clothing_items    enable row level security;
alter table public.fit_feedback      enable row level security;
alter table public.linked_products   enable row level security;

create policy "own profile" on public.profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

create policy "own preferences" on public.style_preferences
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own items" on public.clothing_items
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- feedback must also point at an item the user owns
create policy "own feedback" on public.fit_feedback
  for all using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.clothing_items i where i.id = item_id and i.user_id = auth.uid())
  );

create policy "own products" on public.linked_products
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Private image storage: files live under <user_id>/..., only the owner can read/write
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('closet-images', 'closet-images', false, 10485760,
        array['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
on conflict (id) do nothing;

create policy "closet images: owner select" on storage.objects
  for select using (bucket_id = 'closet-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "closet images: owner insert" on storage.objects
  for insert with check (bucket_id = 'closet-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "closet images: owner update" on storage.objects
  for update using (bucket_id = 'closet-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "closet images: owner delete" on storage.objects
  for delete using (bucket_id = 'closet-images' and (storage.foldername(name))[1] = auth.uid()::text);
