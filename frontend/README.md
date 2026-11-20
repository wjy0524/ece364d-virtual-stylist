# Frontend (Yasir)

React + Vite. From this directory, install dependencies and start the dev server:

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env.local` and add your Supabase project URL and
publishable (anon) key. `VITE_API_URL` should point to the running backend.

The Add an item form sends a selected image to `POST /api/items/classify`,
displays the top two FashionCLIP suggestions, and lets the user edit the broad
category and clothing type before saving. Saving creates the item through the
backend and uploads the photo to its private Supabase Storage bucket. If
classification is unavailable, the category and type can be entered manually.
Without a Supabase session, the current demo mode continues to save small sample
items in browser storage; it does not persist them to the backend. To test
classification without a session, set `ALLOW_DEMO_CLASSIFICATION=true` in
`backend/.env` and restart the backend. This is a local-development-only option;
leave it disabled outside local testing.

API docs: http://localhost:8000/docs

## Accounts

The login page supports email/password sign-up and sign-in through Supabase
Auth. Configure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in
`.env.local`, then restart the Vite dev server. Protected app pages send signed
out users to `/login`; use the sign-out control in the header to end a session.
If Supabase is not configured, the app stays in its existing demo mode and
account forms are disabled.

The local API allows frontend origins at both `http://localhost:5173` and
`http://127.0.0.1:5173` by default.

Supabase may require email confirmation before a new account can sign in,
depending on the project's Auth settings.

## Recommendations

The recommendations page requests up to three deterministic outfit
combinations from the signed-in user's wardrobe. It uses saved aesthetics,
preferred fits, and occasions along with available garment colors, style tags,
and private-storage photos; unavailable metadata is called out on the page.
Recommendations use only complete top + bottom + shoes or dress + shoes looks,
with an optional owned layer or accessory. Run
`backend/supabase/migrations/0003_recommendations.sql` in the Supabase SQL
editor before using saved looks or helpful/not-helpful feedback. Those
interactions are stored per user and protected with row-level security.
