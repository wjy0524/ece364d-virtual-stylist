# Backend (Jaeyeon)

FastAPI + Supabase (Postgres, Auth, private Storage).

## Setup

```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env # fill in values from Supabase → Project Settings → API
uvicorn app.main:app --reload
```

- Health check: http://localhost:8000/health
- Interactive API docs: http://localhost:8000/docs
- Tests: `pytest`
- The requirements install the local `ai/` package, PyTorch, Transformers and Pillow. The first server startup downloads the FashionCLIP model from Hugging Face and caches it outside the repository. Startup can take a while; later starts use the cache.
- CPU inference works by default. If a CUDA-enabled PyTorch build is installed and a CUDA GPU is available, FashionCLIP uses it automatically.
- Online item creation and photo storage require a signed-in Supabase session. Classification also requires a session unless the local demo setting below is enabled. No Google Cloud credentials are used.
- For local demo-mode prediction without signing in, set `ALLOW_DEMO_CLASSIFICATION=true` in `.env` and restart the backend. This only permits anonymous classification; item creation and storage uploads remain authenticated. Keep the setting false outside local testing.
- On macOS/Linux, use `python3 -m venv .venv`, `source .venv/bin/activate`, and `cp .env.example .env` for the corresponding setup commands.

## Supabase (one-time)

1. Create a project at supabase.com.
2. SQL Editor → paste and run `supabase/migrations/0001_init.sql`. This creates the tables, RLS policies, sign-up trigger and the private `closet-images` bucket.
3. Run `supabase/migrations/0002_fit_feedback_details.sql` to add garment cut and the expanded fit-feedback scale, then `0003_outfits.sql` for outfit suggestions.
4. Authentication → Providers → Email: enabled (turn off "Confirm email" while developing).
5. Copy the project URL and anon key into `.env` (and share them with the frontend).

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
| `clothing_items` | closet: category, subcategory, brand, labeled size, garment cut (fitted / slim / regular / relaxed / oversized), color, pattern, style tags, image path, raw AI tags |
| `fit_feedback` | per-garment fit history: overall fit (too_small / slightly_tight / fits_as_desired / slightly_loose / too_large; legacy `fits_well` is retained) + structured area/issue pairs and optional notes |
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
| GET | `/api/items/fit-feedback/history` | list the signed-in user's fit feedback across items, including garment details |
| POST | `/api/items` | add item |
| POST | `/api/items/classify` | classify an uploaded image (multipart `file`; returns top two FashionCLIP predictions) |
| GET / PATCH / DELETE | `/api/items/{id}` | read / edit / delete item |
| POST | `/api/items/{id}/image` | upload photo (multipart `file`, ≤10 MB) |
| GET / POST | `/api/items/{id}/fit-feedback` | read fit history for an item / add feedback |
| PUT | `/api/items/{id}/fit-feedback/{feedback_id}` | edit an existing fit feedback entry |
| GET / POST | `/api/products` | linked shopping products (import logic: Week 5) |
| POST | `/api/outfits/recommend` | suggest up to 3 outfits from the user's closet (optional body `{"occasion": "casual"}`); results are stored |
| GET | `/api/outfits?saved=true` | list suggested outfits (optionally only saved ones), with item details |
| PATCH | `/api/outfits/{id}` | `{"saved": true}` and/or `{"reaction": "helpful" \| "not_helpful" \| null}` |

Coming later: `POST /api/products/{id}/size` (Week 6).

Outfit suggestions come from `ai/virtual_stylist_ai/outfit_recommender.py` (rule-based for now). A better recommender can replace `recommend_outfits` as long as it keeps the same inputs and return shape. Run `supabase/migrations/0003_outfits.sql` once to create the `outfits` table.

Size prediction is not implemented yet. The frontend's temporary test garment
flow stores sample garment and fit-history data only in the browser so sizing
recommendation logic can be developed and evaluated without creating real
closet records.
