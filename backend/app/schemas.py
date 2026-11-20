from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, Field, HttpUrl

Category = Literal["top", "bottom", "dress", "layer", "shoes", "accessory"]
GarmentCut = Literal["fitted", "slim", "regular", "relaxed", "oversized"]
OverallFit = Literal[
    "too_small",
    "slightly_tight",
    "fits_as_desired",
    "slightly_loose",
    "too_large",
    "fits_well",
]
FitIssueKind = Literal["tight", "loose", "short", "long"]
FitIssueArea = Literal[
    "shoulders",
    "chest",
    "waist",
    "sleeves",
    "length",
    "hips",
    "thighs",
    "rise",
    "inseam",
    "foot_width",
    "toe_box",
    "heel",
    "strap",
    "width",
    "overall",
]


class ProfileUpdate(BaseModel):
    display_name: str | None = None
    measurements: dict[str, float] | None = None


class StylePreferences(BaseModel):
    aesthetics: list[str] = []
    preferred_fits: list[str] = []
    occasions: list[str] = []
    disliked_items: list[str] = []


class ClothingItemCreate(BaseModel):
    category: Category
    name: str | None = None
    subcategory: str | None = None
    brand: str | None = None
    size_label: str | None = None
    garment_cut: GarmentCut | None = None
    color: str | None = None
    pattern: str | None = None
    style_tags: list[str] = []
    ai_tags: dict[str, Any] | None = None
    tags_confirmed: bool = False


class ClothingItemUpdate(BaseModel):
    category: Category | None = None
    name: str | None = None
    subcategory: str | None = None
    brand: str | None = None
    size_label: str | None = None
    garment_cut: GarmentCut | None = None
    color: str | None = None
    pattern: str | None = None
    style_tags: list[str] | None = None
    tags_confirmed: bool | None = None


class FitIssue(BaseModel):
    area: FitIssueArea = Field(examples=["waist"])
    issue: FitIssueKind


class FitFeedbackCreate(BaseModel):
    overall_fit: OverallFit
    issues: list[FitIssue] = Field(default_factory=list)
    notes: str | None = None


class FitFeedbackUpdate(BaseModel):
    overall_fit: OverallFit | None = None
    issues: list[FitIssue] | None = None
    notes: str | None = None


class OutfitAction(BaseModel):
    item_ids: list[UUID] = Field(min_length=2, max_length=5)
    occasion: str = Field(min_length=1, max_length=80)


class SaveOutfitRequest(OutfitAction):
    explanation: str = Field(max_length=500)
    ranking_score: float = Field(ge=0, le=100)


class RecommendationFeedbackRequest(OutfitAction):
    helpful: bool


class LinkedProductCreate(BaseModel):
    url: HttpUrl
