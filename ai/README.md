# AI / Recommendations (Avery)

Planned modules:

- `outfit_recommendation/` — combine closet items into 3 ranked outfits using style preferences
- `size_recommendation/` — compare owned garments + fit feedback against retailer size charts; return "not enough information" instead of guessing
- `tagging/` — suggest broad category (top / bottom / dress / shoes …) from a photo; user confirms
- `virtual_tryon/` — Spring 2027

Input data shapes match the database tables in `backend/supabase/migrations/0001_init.sql`
(`clothing_items`, `fit_feedback`, `style_preferences`, `linked_products`).

## Notes from the Prior Art report

- **Outfits:** score and rank combinations, and show each item on its own. Don't composite them into one layered image; no try-on model supports that (§5.3).
- **Alternatives:** Tier 2 suggests alternatives by price or by redundancy with what the user already owns. `linked_products.price` is stored for that.
- **Fit labels:** `fit_feedback.overall_fit` is `too_small` / `fits_well` / `too_large`, the same 3 classes as ModCloth / RentTheRunway. Report macro-F1 because `fits_well` dominates (§4.5). Problem areas live in `issues: [{area, issue}]`, where `issue` is tight / loose / short / long.
- **Outfit evaluation:** compatibility via AUC / fill-in-the-blank (Polyvore Outfits); personalized ranking via NDCG@k. Use hard negatives, since random ones inflate AUC.
- **Embeddings:** 512-d float32 ≈ 2 KB per item. At our scale they fit in memory, so no vector DB is needed yet (§5.2).
