# Frontend (Yasir)

React + Vite. Not scaffolded yet — suggested start:

```bash
npm create vite@latest . -- --template react-ts
npm install @supabase/supabase-js react-router-dom
```

Placeholder routes for Week 1: `/onboarding`, `/closet`, `/closet/:itemId`, `/shop`, `/recommendations`.

Env (`frontend/.env.local`, ask Jaeyeon for values):

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_API_URL=http://localhost:8000
```

Sign in with `supabase.auth.signInWithPassword(...)`, then call the API with
`Authorization: Bearer ${session.access_token}`. API docs: http://localhost:8000/docs
