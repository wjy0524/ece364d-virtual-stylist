import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import products, profile, recommendations, wardrobe
from virtual_stylist_ai.clothing_classifier import FashionClipClassifier

logger = logging.getLogger(__name__)


async def _initialize_classifier(app: FastAPI) -> None:
    try:
        app.state.clothing_classifier = await run_in_threadpool(FashionClipClassifier)
        app.state.clothing_classifier_status = "ready"
    except Exception:
        app.state.clothing_classifier_status = "failed"
        logger.exception("Could not initialize the clothing image classifier")


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.clothing_classifier = None
    app.state.clothing_classifier_status = "loading"
    classifier_task = asyncio.create_task(_initialize_classifier(app))
    try:
        yield
    finally:
        classifier_task.cancel()


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
app.include_router(recommendations.router)


@app.get("/health", tags=["meta"])
def health():
    return {"status": "ok"}
