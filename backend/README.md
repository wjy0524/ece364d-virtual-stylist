# Backend (Jaeyeon)

FastAPI + Supabase (Postgres, Auth, private Storage).

## Setup

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env        # fill in values from Supabase → Project Settings → API
uvicorn app.main:app --reload
```

- Health check: http://localhost:8000/health
- Interactive API docs: http://localhost:8000/docs
- Tests: `pytest`

## Supabase (one-time)

1. Create a project at supabase.com.
2. SQL Editor → paste and run `supabase/migrations/0001_init.sql`. This creates the tables, RLS policies, sign-up trigger and the private `closet-images` bucket.
3. Authentication → Providers → Email: enabled (turn off "Confirm email" while developing).
4. Copy the project URL and anon key into `.env` (and share them with the frontend).

## Data model

```
auth.users ─1:1─ profiles ─1:1─ style_preferences
                    │
                    ├─1:N─ clothing_items ─1:N─ fit_feedback
                    └─1:N─ linked_products
```

| Table | Purpose |
|---|---|
| `profiles` | display name, optional measurements (cm). Created automatically on sign-up |
| `style_preferences` | onboarding answers: aesthetics, preferred fits, occasions, disliked items |
| `clothing_items` | closet: category (top, bottom, dress, layer, shoes, accessory), subcategory, brand, tag size, color, pattern, style tags, image path, raw AI tags |
| `fit_feedback` | per-garment fit reports: overall fit (too_small / fits_well / too_large) + issues (`[{area, issue}]`) |
| `linked_products` | pasted shopping links + imported product data and size chart |

Every table has RLS `user_id = auth.uid()`. Images are stored at `closet-images/<user_id>/<item_id>.<ext>` and only the owner can read them.

## API

All `/api/*` routes need `Authorization: Bearer <supabase access token>`.

| Method | Path | Description |
|---|---|---|
| GET | `/health` | liveness |
| GET | `/api/me` | profile + style preferences |
| PATCH | `/api/me` | update display name / measurements |
| PUT | `/api/me/preferences` | save onboarding answers |
| GET | `/api/items` | list closet (with signed image URLs) |
| POST | `/api/items` | add item |
| GET / PATCH / DELETE | `/api/items/{id}` | read / edit / delete item |
| POST | `/api/items/{id}/image` | upload photo (multipart `file`, ≤10 MB) |
| GET / POST | `/api/items/{id}/fit-feedback` | fit history for an item |
| GET / POST | `/api/products` | linked shopping products (import logic: Week 5) |

Coming later: `POST /api/outfits/recommend` (Week 4), `POST /api/products/{id}/size` (Week 6).
