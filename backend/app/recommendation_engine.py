import hashlib
import re
from itertools import combinations, product
from typing import Any


_OCCASION_GROUPS = {
    "everyday": {"everyday", "daily", "casual", "weekend"},
    "work": {"work", "office", "business", "smart casual"},
    "formal": {"formal", "black tie", "dressy"},
    "going out": {"going out", "night out", "party", "date night"},
}
_OCCASION_TAGS = {
    alias
    for group in _OCCASION_GROUPS.values()
    for alias in group
}
_COLOR_FAMILIES = {
    "black": "neutral",
    "white": "neutral",
    "ivory": "neutral",
    "cream": "neutral",
    "beige": "neutral",
    "tan": "neutral",
    "taupe": "neutral",
    "brown": "neutral",
    "gray": "neutral",
    "grey": "neutral",
    "charcoal": "neutral",
    "navy": "blue",
    "denim": "blue",
    "blue": "blue",
    "teal": "green",
    "olive": "green",
    "green": "green",
    "red": "red",
    "burgundy": "red",
    "maroon": "red",
    "pink": "pink",
    "coral": "pink",
    "orange": "orange",
    "yellow": "yellow",
    "mustard": "yellow",
    "purple": "purple",
    "lavender": "purple",
}
_COMPLEMENTARY_FAMILIES = {
    frozenset(("blue", "orange")),
    frozenset(("red", "green")),
    frozenset(("yellow", "purple")),
}


def _normalize(value: Any) -> str:
    return re.sub(r"[^a-z0-9]+", " ", str(value or "").lower()).strip()


def _strings(value: Any) -> list[str]:
    if isinstance(value, str):
        return [value] if value.strip() else []
    if isinstance(value, (list, tuple, set)):
        return [str(entry) for entry in value if entry]
    return []


def _words(value: Any) -> set[str]:
    # Drop a trailing plural "s" so "tops" matches "top" and "jeans" matches "jean".
    return {word[:-1] if len(word) > 3 and word.endswith("s") and not word.endswith("ss") else word
            for word in _normalize(value).split()}


def _matches(value: str, target: str) -> bool:
    # Every word of `target` must appear as a whole word in `value`: "tee" must not
    # match "streetwear", and disliking "skinny jeans" must not exclude all jeans.
    wanted = _words(target)
    return bool(wanted) and wanted <= _words(value)


def _occasion_group(value: str) -> set[str]:
    normalized = _normalize(value)
    for group in _OCCASION_GROUPS.values():
        if normalized in {_normalize(alias) for alias in group}:
            return group
    return {normalized} if normalized else set()


def _item_has_disliked_tag(item: dict[str, Any], disliked: list[str]) -> bool:
    fields = [
        item.get("category", ""),
        item.get("subcategory", ""),
        item.get("name", ""),
        *_strings(item.get("style_tags")),
    ]
    return any(_matches(field, term) for field in fields for term in disliked)


def _style_score(
    items: list[dict[str, Any]], aesthetics: list[str], preferred_fits: list[str]
) -> float:
    if not aesthetics and not preferred_fits:
        return 0.5

    scores = []
    for item in items:
        item_scores = []
        tags = _strings(item.get("style_tags"))
        if aesthetics:
            if tags:
                matching = sum(any(_matches(tag, style) for style in aesthetics) for tag in tags)
                item_scores.append(0.2 + 0.8 * matching / len(tags))
            else:
                item_scores.append(0.5)
        if preferred_fits:
            garment_cut = item.get("garment_cut")
            item_scores.append(
                (1.0 if any(_matches(garment_cut, fit) for fit in preferred_fits) else 0.2)
                if garment_cut
                else 0.5
            )
        scores.append(sum(item_scores) / len(item_scores))
    return sum(scores) / len(scores)


def _occasion_score(
    items: list[dict[str, Any]], occasion: str, preferred_occasions: list[str]
) -> float:
    target_group = _occasion_group(occasion)
    matching_items = 0
    tagged_items = 0
    for item in items:
        tags = _strings(item.get("style_tags"))
        occasion_tags = [tag for tag in tags if _normalize(tag) in _OCCASION_TAGS]
        if not occasion_tags:
            continue
        tagged_items += 1
        if any(_occasion_group(tag) & target_group for tag in occasion_tags):
            matching_items += 1
    if tagged_items:
        return 0.5 + 0.5 * matching_items / len(items)
    if preferred_occasions:
        return 1.0 if any(_occasion_group(value) & target_group for value in preferred_occasions) else 0.55
    return 0.5


def _color_families(item: dict[str, Any]) -> set[str]:
    return {
        _COLOR_FAMILIES[word]
        for word in _normalize(item.get("color")).split()
        if word in _COLOR_FAMILIES
    }


def _pair_color_score(left: dict[str, Any], right: dict[str, Any]) -> float:
    left_colors = _color_families(left)
    right_colors = _color_families(right)
    if not left_colors or not right_colors:
        return 0.5
    if left_colors & right_colors:
        return 0.8
    if left_colors == {"neutral"} or right_colors == {"neutral"}:
        return 0.68
    if any(
        frozenset((left_family, right_family)) in _COMPLEMENTARY_FAMILIES
        for left_family in left_colors
        for right_family in right_colors
    ):
        return 0.65
    return 0.38


def _color_score(items: list[dict[str, Any]]) -> float:
    scores = [_pair_color_score(left, right) for left, right in combinations(items, 2)]
    return sum(scores) / len(scores) if scores else 0.5


def _distance(left: set[str], right: set[str]) -> float:
    union = left | right
    return 1.0 if not union else 1.0 - len(left & right) / len(union)


def outfit_key(item_ids: list[str], occasion: str) -> str:
    """Stable outfit id, shared with the saved_outfits and recommendation_feedback tables."""
    value = f"{_normalize(occasion)}|{'|'.join(sorted(item_ids))}"
    return hashlib.sha256(value.encode("utf-8")).hexdigest()[:24]


def _metadata_missing(items: list[dict[str, Any]], preferences: dict[str, Any]) -> list[str]:
    if not items:
        return []
    total = len(items)
    missing = []
    for field, label in (("image_path", "photos"), ("color", "colors"), ("pattern", "patterns")):
        count = sum(not item.get(field) for item in items)
        if count:
            missing.append(f"{label.title()} are missing on {count} of {total} wardrobe items.")
    count = sum(not _strings(item.get("style_tags")) for item in items)
    if count:
        missing.append(
            f"Style tags are missing on {count} of {total} wardrobe items; those items receive a neutral style score."
        )
    if _strings(preferences.get("preferred_fits")):
        count = sum(not item.get("garment_cut") for item in items)
        if count:
            missing.append(f"Garment cut is missing on {count} of {total} wardrobe items.")
    if not _strings(preferences.get("aesthetics")):
        missing.append("No style aesthetic is saved in your preferences yet.")
    if not _strings(preferences.get("occasions")):
        missing.append("No preferred occasion is saved in your preferences yet.")
    return missing


def _missing_categories(categories: set[str]) -> list[str]:
    missing = []
    if "shoes" not in categories:
        missing.append("shoes")
    if not ({"top", "bottom"} <= categories or "dress" in categories):
        missing.append("a dress or both a top and a bottom")
    return missing


def _explanation(
    candidate: dict[str, Any],
    occasion: str,
    style_preferences: list[str],
    diversity: float,
    has_previous: bool,
) -> str:
    parts = [f"Suggested for {occasion.lower()} plans."]
    if style_preferences and candidate["style"] >= 0.65:
        parts.append("It reflects your saved style preferences.")
    if candidate["color"] >= 0.68:
        parts.append("The recorded colors work well together.")
    extras = [
        item.get("name") or item.get("subcategory") or item.get("category")
        for item in candidate["items"]
        if item.get("category") in {"layer", "accessory"}
    ]
    if extras:
        parts.append(f"Includes your {', '.join(extras)}.")
    if has_previous and diversity >= 0.5:
        parts.append("Adds variety to the other suggestions.")
    return " ".join(parts)


def generate_recommendations(
    wardrobe: list[dict[str, Any]],
    preferences: dict[str, Any] | None = None,
    occasion: str | None = None,
    limit: int = 3,
    feedback: dict[str, bool] | None = None,
) -> dict[str, Any]:
    """`feedback` maps outfit_key -> helpful from the user's past ratings."""
    preferences = preferences or {}
    feedback = feedback or {}
    items = sorted(wardrobe, key=lambda item: str(item.get("id", "")))
    categories = {item.get("category") for item in items}
    preference_occasions = _strings(preferences.get("occasions"))
    effective_occasion = occasion.strip() if occasion and occasion.strip() else (
        preference_occasions[0] if preference_occasions else "Everyday"
    )
    aesthetics = _strings(preferences.get("aesthetics"))
    preferred_fits = _strings(preferences.get("preferred_fits"))
    disliked = _strings(preferences.get("disliked_items"))
    eligible = [item for item in items if not _item_has_disliked_tag(item, disliked)]

    tops = [item for item in eligible if item.get("category") == "top"]
    bottoms = [item for item in eligible if item.get("category") == "bottom"]
    dresses = [item for item in eligible if item.get("category") == "dress"]
    shoes = [item for item in eligible if item.get("category") == "shoes"]
    layers = [item for item in eligible if item.get("category") == "layer"]
    accessories = [item for item in eligible if item.get("category") == "accessory"]

    candidates: dict[tuple[str, ...], dict[str, Any]] = {}
    core_outfits = [list(core) for core in product(tops, bottoms, shoes)]
    core_outfits.extend(list(core) for core in product(dresses, shoes))

    for core in core_outfits:
        variants = [core]
        variants.extend([*core, layer] for layer in layers)
        variants.extend([*core, accessory] for accessory in accessories)
        for variant in variants:
            ids = tuple(str(item.get("id", "")) for item in variant)
            if not all(ids) or len(set(ids)) != len(ids):
                continue
            key = tuple(sorted(ids))
            if key in candidates:
                continue
            if feedback.get(outfit_key(list(ids), effective_occasion)) is False:
                continue  # user already rated this exact outfit "not helpful"
            candidates[key] = {
                "items": variant,
                "core_ids": {str(item["id"]) for item in core},
                "occasion": _occasion_score(variant, effective_occasion, preference_occasions),
                "style": _style_score(variant, aesthetics, preferred_fits),
                "color": _color_score(variant),
            }

    selected = []
    while candidates and len(selected) < max(0, limit):
        ranked = []
        candidates_with_new_cores = {
            ids: candidate
            for ids, candidate in candidates.items()
            if all(candidate["core_ids"] != previous["core_ids"] for previous in selected)
        }
        pool = candidates_with_new_cores or candidates
        for ids, candidate in pool.items():
            diversity = (
                min(_distance(candidate["core_ids"], previous["core_ids"]) for previous in selected)
                if selected
                else 0.5
            )
            score = (
                0.4 * candidate["occasion"]
                + 0.3 * candidate["style"]
                + 0.2 * candidate["color"]
                + 0.1 * diversity
            )
            ranked.append((score, ids, candidate, diversity))
        score, ids, candidate, diversity = min(ranked, key=lambda row: (-row[0], row[1]))
        selected.append({**candidate, "diversity": diversity, "ranking_score": score})
        del candidates[ids]

    recommendations = []
    for candidate in selected:
        item_ids = [str(item["id"]) for item in candidate["items"]]
        key = outfit_key(item_ids, effective_occasion)
        recommendations.append(
            {
                "id": key,
                "feedback": feedback.get(key),
                "occasion": effective_occasion,
                "items": candidate["items"],
                "explanation": _explanation(
                    candidate,
                    effective_occasion,
                    aesthetics + preferred_fits,
                    candidate["diversity"],
                    bool(len(recommendations)),
                ),
                "ranking_score": round(candidate["ranking_score"] * 100, 1),
                "score_breakdown": {
                    "occasion": round(candidate["occasion"] * 100, 1),
                    "style": round(candidate["style"] * 100, 1),
                    "color": round(candidate["color"] * 100, 1),
                    "diversity": round(candidate["diversity"] * 100, 1),
                },
            }
        )

    missing = _missing_categories(categories)
    message = None
    if recommendations and len(recommendations) < limit:
        message = f"Found {len(recommendations)} complete outfit suggestion(s) from your wardrobe."
    elif not recommendations and missing:
        message = f"Add {', and '.join(missing)} to complete an outfit."
    elif not recommendations and disliked:
        message = "No complete outfit matched your saved preferences. Update your disliked items or add more pieces."
    elif not recommendations:
        message = "No outfit could be built from your available items and saved preferences."

    return {
        "recommendations": recommendations,
        "message": message,
        "missing_categories": missing,
        "metadata_missing": _metadata_missing(items, preferences),
        "occasion": effective_occasion,
    }
