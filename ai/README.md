# AI / Recommendations (Avery)

## Clothing classification

The backend uses `virtual_stylist_ai.clothing_classifier.FashionClipClassifier`
to classify uploaded clothing images with Hugging Face's
`patrickjohncyh/fashion-clip` model. The pipeline is initialized once when the
backend starts and returns the two highest-scoring labels. Candidate
descriptions are kept exactly as tested:

| Clothing type | Candidate description | Saved category |
|---|---|---|
| T-shirt | `a t-shirt` | top |
| Tank top | `a tank top` | top |
| Blouse | `a blouse` | top |
| Sweater | `a sweater` | top |
| Jeans | `a pair of jeans` | bottom |
| Pants | `a pair of trousers` | bottom |
| Shorts | `a pair of shorts` | bottom |
| Skirt | `a long or short skirt with a waistband` | bottom |
| Dress | `a one-piece dress worn from shoulders to hem` | dress |
| Sneakers | `a pair of sneakers` | shoes |
| Boots | `a pair of boots` | shoes |
| Heels | `a pair of high heels` | shoes |

Install the AI package and its runtime dependencies from `backend/` with
`pip install -r requirements.txt`. The first backend startup downloads model
weights from Hugging Face; weights are cached outside the repository. CPU
inference works by default. A CUDA-enabled PyTorch install uses the available
GPU automatically.

The app sends image bytes to the backend. Google Cloud Storage, Colab
authentication, notebook batch evaluation, and Pandas are not part of the
application.

## Other planned modules

- `outfit_recommendation/` — combine closet items into 3 ranked outfits using style preferences
- `size_recommendation/` — compare owned garments + fit feedback against retailer size charts; return "not enough information" instead of guessing
- `virtual_tryon/` — Spring 2027

Input data shapes match the database tables in `backend/supabase/migrations/0001_init.sql`
(`clothing_items`, `fit_feedback`, `style_preferences`, `linked_products`).

## Notes from the Prior Art report

- **Outfits:** score and rank combinations, and show each item on its own. Don't composite them into one layered image; no try-on model supports that (§5.3).
- **Alternatives:** Tier 2 suggests alternatives by price or by redundancy with what the user already owns. `linked_products.price` is stored for that.
- **Fit labels:** `fit_feedback.overall_fit` is `too_small` / `fits_well` / `too_large`, the same 3 classes as ModCloth / RentTheRunway. Report macro-F1 because `fits_well` dominates (§4.5). Problem areas live in `issues: [{area, issue}]`, where `issue` is tight / loose / short / long.
- **Outfit evaluation:** compatibility via AUC / fill-in-the-blank (Polyvore Outfits); personalized ranking via NDCG@k. Use hard negatives, since random ones inflate AUC.
- **Embeddings:** 512-d float32 ≈ 2 KB per item. At our scale they fit in memory, so no vector DB is needed yet (§5.2).
