from virtual_stylist_ai.outfit_recommender import recommend_outfits


def item(id, category, tags=(), subcategory=None):
    return {"id": id, "category": category, "style_tags": list(tags), "subcategory": subcategory}


def test_needs_a_complete_outfit():
    assert recommend_outfits([item("t1", "top"), item("s1", "shoes")]) == []
    assert recommend_outfits([]) == []


def test_top_bottom_and_shoes_in_display_order():
    closet = [item("s1", "shoes"), item("b1", "bottom"), item("t1", "top")]
    [outfit] = recommend_outfits(closet)
    assert outfit["item_ids"] == ["t1", "b1", "s1"]
    assert 0 <= outfit["score"] <= 1
    assert outfit["reason"]


def test_dress_is_a_complete_outfit():
    [outfit] = recommend_outfits([item("d1", "dress")])
    assert outfit["item_ids"] == ["d1"]


def test_returns_three_outfits_without_repeating_a_base_garment():
    closet = [item(f"t{i}", "top") for i in range(3)] + [item(f"b{i}", "bottom") for i in range(3)]
    outfits = recommend_outfits(closet, k=3)
    assert len(outfits) == 3
    tops = [o["item_ids"][0] for o in outfits]
    bottoms = [o["item_ids"][1] for o in outfits]
    assert len(set(tops)) == 3 and len(set(bottoms)) == 3


def test_reuses_garments_when_closet_is_small_but_never_repeats_an_outfit():
    closet = [item("t1", "top"), item("t2", "top"), item("b1", "bottom")]
    outfits = recommend_outfits(closet, k=3)
    assert len(outfits) == 2
    assert {tuple(o["item_ids"]) for o in outfits} == {("t1", "b1"), ("t2", "b1")}


def test_prefers_items_matching_style_and_occasion():
    closet = [
        item("t-formal", "top", ["formal"]),
        item("t-street", "top", ["streetwear"]),
        item("b1", "bottom"),
    ]
    prefs = {"aesthetics": ["Streetwear"], "occasions": [], "disliked_items": []}
    best = recommend_outfits(closet, prefs, k=1)[0]
    assert best["item_ids"][0] == "t-street"
    assert "streetwear" in best["reason"]

    best_for_work = recommend_outfits(closet, prefs, occasion="formal", k=1)[0]
    assert best_for_work["item_ids"][0] == "t-formal"


def test_skips_disliked_items():
    closet = [item("t1", "top", subcategory="crop top"), item("t2", "top", subcategory="t-shirt"), item("b1", "bottom")]
    outfits = recommend_outfits(closet, {"disliked_items": ["crop top"]})
    assert all("t1" not in o["item_ids"] for o in outfits)


def test_layer_only_added_when_it_matches_style():
    closet = [item("t1", "top"), item("b1", "bottom"), item("l1", "layer")]
    assert recommend_outfits(closet)[0]["item_ids"] == ["t1", "b1"]
    closet[2]["style_tags"] = ["casual"]
    assert recommend_outfits(closet, {"aesthetics": ["casual"]})[0]["item_ids"] == ["t1", "b1", "l1"]
