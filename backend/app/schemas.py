from typing import Literal

from pydantic import BaseModel, Field, HttpUrl

Category = Literal["top", "bottom", "dress", "layer", "shoes", "accessory"]
OverallFit = Literal["too_small", "fits_well", "too_large"]
FitIssueKind = Literal["tight", "loose", "short", "long"]


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
    color: str | None = None
    pattern: str | None = None
    style_tags: list[str] = []


class ClothingItemUpdate(BaseModel):
    category: Category | None = None
    name: str | None = None
    subcategory: str | None = None
    brand: str | None = None
    size_label: str | None = None
    color: str | None = None
    pattern: str | None = None
    style_tags: list[str] | None = None
    tags_confirmed: bool | None = None


class FitIssue(BaseModel):
    area: str = Field(examples=["waist"])
    issue: FitIssueKind


class FitFeedbackCreate(BaseModel):
    overall_fit: OverallFit
    issues: list[FitIssue] = []
    notes: str | None = None


class LinkedProductCreate(BaseModel):
    url: HttpUrl
