# Frontend (Yasir)

React + Vite. From this directory, install dependencies and start the dev server:

```bash
npm install
npm run dev
```

Configure `.env.local` with the backend URL. Supabase values are needed for
online closet storage; demo classification can be enabled on the local backend
without signing in.

```dotenv
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_API_URL=http://localhost:8000
```

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
