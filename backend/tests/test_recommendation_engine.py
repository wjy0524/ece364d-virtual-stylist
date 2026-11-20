from app.recommendation_engine import generate_recommendations, outfit_key


def garment(item_id, category, **details):
    return {"id": item_id, "category": category, **details}


def test_generates_diverse_top_bottom_shoe_outfits_from_owned_items():
    wardrobe = [
        garment("top-1", "top", name="White shirt", color="white", style_tags=["minimalist"]),
        garment("top-2", "top", name="Blue sweater", color="blue", style_tags=["classic"]),
        garment("bottom-1", "bottom", name="Black trousers", color="black"),
        garment("bottom-2", "bottom", name="Denim jeans", color="denim"),
        garment("shoe-1", "shoes", name="Sneakers", color="white"),
    ]

    result = generate_recommendations(
        wardrobe,
        {"aesthetics": ["minimalist"], "occasions": ["everyday"]},
    )

    assert len(result["recommendations"]) == 3
    assert result["recommendations"][0]["score_breakdown"]["diversity"] == 50
    for outfit in result["recommendations"]:
        categories = [item["category"] for item in outfit["items"]]
        assert categories.count("top") == 1
        assert categories.count("bottom") == 1
        assert categories.count("shoes") == 1
        assert {item["id"] for item in outfit["items"]} <= {item["id"] for item in wardrobe}
        assert set(outfit["score_breakdown"]) == {"occasion", "style", "color", "diversity"}
        components = outfit["score_breakdown"]
        expected_score = (
            0.4 * components["occasion"]
            + 0.3 * components["style"]
            + 0.2 * components["color"]
            + 0.1 * components["diversity"]
        )
        assert abs(outfit["ranking_score"] - round(expected_score, 1)) <= 0.1
    core_outfits = [
        frozenset(item["id"] for item in outfit["items"] if item["category"] != "accessory")
        for outfit in result["recommendations"]
    ]
    assert len(core_outfits) == len(set(core_outfits))


def test_generates_dress_and_shoe_outfits_and_returns_fewer_when_needed():
    wardrobe = [
        garment("dress-1", "dress", name="Blue dress", color="blue"),
        garment("shoe-1", "shoes", name="Black heels", color="black"),
    ]

    result = generate_recommendations(wardrobe, occasion="Formal")

    assert len(result["recommendations"]) == 1
    assert {item["category"] for item in result["recommendations"][0]["items"]} == {"dress", "shoes"}
    assert result["message"] == "Found 1 complete outfit suggestion(s) from your wardrobe."


def test_missing_categories_and_metadata_are_explained():
    result = generate_recommendations(
        [garment("top-1", "top", name="Shirt")],
        {},
    )

    assert result["recommendations"] == []
    assert result["missing_categories"] == ["shoes", "a dress or both a top and a bottom"]
    assert "Add shoes" in result["message"]
    assert any("Colors are missing" in note for note in result["metadata_missing"])
    assert any("Style tags are missing" in note for note in result["metadata_missing"])
    assert any("No style aesthetic" in note for note in result["metadata_missing"])


def test_disliked_items_are_not_recommended_and_neutral_colors_are_compatible():
    wardrobe = [
        garment("top-1", "top", name="White shirt", color="white"),
        garment("bottom-1", "bottom", name="Blue jeans", color="blue"),
        garment("shoe-1", "shoes", name="Black shoes", color="black"),
        garment("dress-1", "dress", name="Red dress", color="red"),
    ]

    result = generate_recommendations(
        wardrobe,
        {"disliked_items": ["dress"], "occasions": ["everyday"]},
    )

    assert result["recommendations"]
    assert all(item["category"] != "dress" for outfit in result["recommendations"] for item in outfit["items"])
    assert result["recommendations"][0]["score_breakdown"]["color"] > 50


def test_disliked_terms_match_whole_words_only():
    wardrobe = [
        garment("top-1", "top", name="Graphic tee"),
        garment("top-2", "top", name="Hoodie", style_tags=["streetwear"]),
        garment("bottom-1", "bottom", name="Straight jeans"),
        garment("shoe-1", "shoes", name="Sneakers"),
    ]

    result = generate_recommendations(wardrobe, {"disliked_items": ["tee", "skinny_jeans"]})

    ids = {item["id"] for outfit in result["recommendations"] for item in outfit["items"]}
    assert "top-1" not in ids
    assert {"top-2", "bottom-1"} <= ids


def test_outfits_rated_not_helpful_are_not_suggested_again():
    wardrobe = [
        garment("top-1", "top"),
        garment("top-2", "top"),
        garment("bottom-1", "bottom"),
        garment("shoe-1", "shoes"),
    ]
    rejected = outfit_key(["top-1", "bottom-1", "shoe-1"], "Everyday")
    liked = outfit_key(["top-2", "bottom-1", "shoe-1"], "Everyday")

    result = generate_recommendations(wardrobe, feedback={rejected: False, liked: True})

    assert [outfit["id"] for outfit in result["recommendations"]] == [liked]
    assert result["recommendations"][0]["feedback"] is True
