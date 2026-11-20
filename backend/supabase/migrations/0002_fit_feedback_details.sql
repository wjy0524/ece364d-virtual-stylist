-- Structured garment cut and a more useful, directional fit feedback scale.
alter table public.clothing_items
  add column if not exists garment_cut text;

alter table public.clothing_items
  drop constraint if exists clothing_items_garment_cut_check;

alter table public.clothing_items
  add constraint clothing_items_garment_cut_check
  check (garment_cut is null or garment_cut in ('fitted', 'slim', 'regular', 'relaxed', 'oversized'));

alter table public.fit_feedback
  drop constraint if exists fit_feedback_overall_fit_check;

alter table public.fit_feedback
  add constraint fit_feedback_overall_fit_check
  check (overall_fit in (
    'too_small',
    'slightly_tight',
    'fits_as_desired',
    'slightly_loose',
    'too_large',
    'fits_well'
  ));

alter table public.fit_feedback
  add column if not exists updated_at timestamptz not null default now();

drop trigger if exists fit_feedback_updated_at on public.fit_feedback;

create trigger fit_feedback_updated_at
  before update on public.fit_feedback
  for each row execute function public.set_updated_at();
