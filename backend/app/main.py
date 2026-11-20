from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import outfits, products, profile, wardrobe
from virtual_stylist_ai.clothing_classifier import FashionClipClassifier


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.clothing_classifier = FashionClipClassifier()
    yield


app = FastAPI(title="Virtual Stylist API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_settings().cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(profile.router)
app.include_router(wardrobe.router)
app.include_router(products.router)
app.include_router(outfits.router)


@app.get("/health", tags=["meta"])
def health():
    return {"status": "ok"}
