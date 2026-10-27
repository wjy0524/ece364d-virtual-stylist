# Virtual Stylist — Frontend (Person 2)

React + Vite + React Router frontend for the ECE364D Virtual Stylist team project.

## Start locally

Requires Node.js 20.19+ or 22.12+ and npm.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite (usually http://localhost:5173).

## Routes

| Route | Purpose |
|---|---|
| `/onboarding` | Style, occasion, size and palette preferences |
| `/closet` | Wardrobe cards, search, filters and demo add-item |
| `/closet/:id` | Item details and try-on integration placeholder |
| `/recommendations` | Example outfit cards and compatibility-score placeholders |
| `/shopping` | Example retailer-search links |

## Notes for teammates

- No backend is connected yet. The sample wardrobe and outfits live in `src/data/demo.js`.
- Preferences and newly added closet items are saved to browser localStorage (demo only). Uploaded images are stored locally as data URLs and limited to 1.2 MB; production needs server-side image storage.
- Outfit compatibility scores are illustrative only, not model predictions.
- Virtual try-on is **not** implemented; connect the pretrained model at `src/pages/ItemDetails.jsx`.
- Shopping links open Google Shopping searches, not validated product listings.
- The frontend is designed to be independently testable while the rest of the team implements the backend and ML integrations.

## Git collaboration

From the root of your team repository, add this frontend as a `frontend/` folder (unless your team already has an established structure). Work in a branch:

```bash
git checkout -b feature/frontend-navigation
git add frontend/
git commit -m "Set up Virtual Stylist frontend and navigation"
git push -u origin feature/frontend-navigation
```

Open a pull request and ask teammates to review before merging. Do not overwrite an existing frontend without checking with the team.

## Environment and backend integration

Copy `.env.example` to `.env.local` inside `frontend/` (already included in this handoff). The environment variables are `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_API_URL`. Restart Vite after changing them.

- `src/lib/supabase.js` exports a configured Supabase client for future login integration. **Authentication UI and session management are not implemented yet.**
- `src/lib/api.js` exports `apiRequest(path, options)` for backend requests. **No API routes have been assumed or connected**; consult `backend/README.md` for endpoints and startup instructions.
- Backend defaults to `http://localhost:8000`. If using the frontend on another device, localhost refers to that device, not your development computer. Backend CORS must allow the frontend origin.
- `.env.local` is gitignored; `.env.example` is safe to commit because it contains only the team's supplied publishable client configuration. Never put Supabase service-role or other secret keys in `VITE_` variables.
