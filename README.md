# ECE 364D — Virtual Stylist

A web app that builds a digital closet from the clothes you already own, records how they fit, suggests outfits from that closet, and recommends a size when you paste a shopping link.

**Fall 2026 MVP:** onboarding · digital closet · fit feedback · outfit recommendations · shopping link + size recommendation
**Spring 2027:** virtual try-on (BlazePose + VITON-HD / IDM-VTON), better recommendations

Scope follows the Prior Art report (Ch. 5). This semester builds Tier 2 (wardrobe + recommendation, our own contribution). Next semester adds Tier 1 try-on: BlazePose runs in the browser and synthesis runs on a hosted GPU, so user body photos stay on-device as much as possible. Out of scope: video, 3D cloth simulation, training from scratch, and layered-outfit compositing.

## Team

| Area | Owner | Folder |
|---|---|---|
| Product / UX | Joshua | `docs/` |
| Frontend | Yasir | `frontend/` |
| Backend | Jaeyeon | `backend/` |
| AI / Recommendations | Avery | `ai/` |

## Architecture

```
React + Vite (frontend/)  ──REST + Supabase JWT──▶  FastAPI (backend/)  ──▶  Supabase (Postgres, Auth, private Storage)
        │                                                  │
        └── Supabase Auth (sign-in) ◀──────────────────────┘──▶  Recommendation logic (ai/)
```

- The frontend signs users in with **Supabase Auth** and sends the access token to the API as `Authorization: Bearer <token>`.
- The backend talks to Supabase **as that user**, so Row Level Security guarantees nobody can read another user's closet.
- Clothing photos live in the private `closet-images` bucket; the API returns short-lived signed URLs.

## Workflow

1. Branch off `main`: `feature/<area>-<thing>` (e.g. `feature/frontend-closet-grid`)
2. Open a pull request into `main`; get one teammate to review
3. Never commit `.env` files or keys

## Getting started

- Backend: see [`backend/README.md`](backend/README.md)
- Frontend: see [`frontend/README.md`](frontend/README.md)
