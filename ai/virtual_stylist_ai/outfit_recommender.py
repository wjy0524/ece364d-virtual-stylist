"""Rule-based outfit recommendation (Week 4 baseline).

The backend calls ``recommend_outfits`` with the signed-in user's closet and style
preferences. To plug in a better model, keep the same inputs and return shape and
change ``SOURCE`` so stored results show which recommender produced them.

Input
    items: rows from ``clothing_items`` (dicts with at least ``id`` and ``category``;
        ``subcategory``, ``name`` and ``style_tags`` are used when present)
    preferences: the ``style_preferences`` row (``aesthetics``, ``occasions``,
        ``disliked_items``), or None
    occasion: optional occasion for this request, e.g. "work"
    k: number of outfits to return

Output
    Up to ``k`` dicts, best first:
    {"item_ids": [...], "score": 0.0-1.0, "reason": "..."}
    An empty list means the closet has no complete outfit (top + bottom, or a dress).
"""

from itertools import product

SOURCE = "rule_based"

# Order items appear in within an outfit.
_DISPLAY_ORDER = {"top": 0, "dress": 0, "bottom": 1, "layer": 2, "shoes": 3, "accessory": 4}


def _norm(values) -> set[str]:
    return {str(v).strip().lower() for v in (values or []) if str(v).strip()}


def _is_disliked(item: dict, disliked: set[str]) -> bool:
    words = _norm([item.get("subcategory"), item.get("name"), *(item.get("style_tags") or [])])
    return any(d in w for d in disliked for w in words)


def _matches(item: dict, wanted: set[str]) -> set[str]:
    return _norm(item.get("style_tags")) & wanted


def recommend_outfits(
    items: list[dict],
    preferences: dict | None = None,
    occasion: str | None = None,
    k: int = 3,
) -> list[dict]:
    prefs = preferences or {}
    disliked = _norm(prefs.get("disliked_items"))
    wanted = _norm(prefs.get("aesthetics")) | _norm(prefs.get("occasions"))
    occasion_tag = occasion.strip().lower() if occasion and occasion.strip() else None
    if occasion_tag:
        wanted.add(occasion_tag)

    by_category: dict[str, list[dict]] = {}
    for item in items:
        if item.get("id") and not _is_disliked(item, disliked):
            by_category.setdefault(item.get("category"), []).append(item)

    def item_score(item: dict) -> int:
        tags = _matches(item, wanted)
        return len(tags) + (1 if occasion_tag in tags else 0)

    # Every complete base: top + bottom, or a dress on its own.
    bases = [list(pair) for pair in product(by_category.get("top", []), by_category.get("bottom", []))]
    bases += [[dress] for dress in by_category.get("dress", [])]
    if not bases:
        return []
    bases.sort(key=lambda base: -sum(item_score(i) for i in base))  # stable: keeps closet order on ties

    def best_extra(category: str, used: set[str], required: bool) -> dict | None:
        options = sorted(by_category.get(category, []), key=lambda i: (i["id"] in used, -item_score(i)))
        if not options:
            return None
        pick = options[0]
        return pick if required or item_score(pick) > 0 else None

    outfits: list[dict] = []
    used_ids: set[str] = set()
    used_combos: set[frozenset] = set()
    # First pass avoids repeating any base garment; second pass only avoids identical bases.
    for strict in (True, False):
        for base in bases:
            if len(outfits) == k:
                break
            base_ids = frozenset(i["id"] for i in base)
            if base_ids in used_combos or (strict and base_ids & used_ids):
                continue
            outfit = list(base)
            for category, required in (("layer", False), ("shoes", True)):
                extra = best_extra(category, used_ids, required)
                if extra:
                    outfit.append(extra)
            outfit.sort(key=lambda i: _DISPLAY_ORDER.get(i.get("category"), 9))
            outfits.append(_describe(outfit, wanted, item_score))
            used_combos.add(base_ids)
            used_ids.update(i["id"] for i in outfit)

    return outfits


def _describe(outfit: list[dict], wanted: set[str], item_score) -> dict:
    matched = sorted(set().union(*(_matches(i, wanted) for i in outfit)))
    matching_items = sum(1 for i in outfit if item_score(i) > 0)
    has_shoes = any(i.get("category") == "shoes" for i in outfit)
    # 0.5 for a complete outfit, up to +0.4 for items that fit the user's style, +0.1 for shoes.
    score = 0.5 + 0.4 * matching_items / len(outfit) + (0.1 if has_shoes else 0.0)
    if matched:
        reason = f"Matches your {', '.join(matched[:3])} style"
    else:
        reason = "A complete outfit from your closet"
    return {"item_ids": [i["id"] for i in outfit], "score": round(score, 2), "reason": reason}
