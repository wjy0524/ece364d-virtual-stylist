from io import BytesIO
from threading import Lock

import pytest
from PIL import Image

from virtual_stylist_ai.clothing_classifier import FashionClipClassifier, LABELS, MODEL_ID


class FakePipeline:
    def __init__(self):
        self.candidate_labels = None

    def __call__(self, image, candidate_labels):
        self.candidate_labels = candidate_labels
        return [
            {"label": "a one-piece dress worn from shoulders to hem", "score": 0.81},
            {"label": "a blouse", "score": 0.12},
        ]


def image_bytes():
    buffer = BytesIO()
    Image.new("RGB", (2, 2), "white").save(buffer, format="PNG")
    return buffer.getvalue()


def test_predict_uses_exact_candidate_descriptions_and_maps_top_two():
    classifier = object.__new__(FashionClipClassifier)
    classifier._classifier = FakePipeline()
    classifier._inference_lock = Lock()

    result = classifier.predict(image_bytes())

    assert MODEL_ID == "patrickjohncyh/fashion-clip"
    assert classifier._classifier.candidate_labels == [
        "a t-shirt",
        "a tank top",
        "a blouse",
        "a sweater",
        "a pair of jeans",
        "a pair of trousers",
        "a pair of shorts",
        "a long or short skirt with a waistband",
        "a one-piece dress worn from shoulders to hem",
        "a pair of sneakers",
        "a pair of boots",
        "a pair of high heels",
    ]
    assert classifier._classifier.candidate_labels == list(LABELS.values())
    assert result == {
        "model": MODEL_ID,
        "top_prediction": {
            "clothing_type": "Dress",
            "category": "dress",
            "subcategory": "dress",
            "score": 0.81,
        },
        "second_prediction": {
            "clothing_type": "Blouse",
            "category": "top",
            "subcategory": "blouse",
            "score": 0.12,
        },
    }


def test_predict_rejects_non_image_bytes():
    classifier = object.__new__(FashionClipClassifier)
    classifier._classifier = FakePipeline()
    classifier._inference_lock = Lock()

    with pytest.raises(ValueError, match="not a supported image"):
        classifier.predict(b"not an image")
