from io import BytesIO
from threading import Lock

from PIL import Image, UnidentifiedImageError

MODEL_ID = "patrickjohncyh/fashion-clip"

LABELS = {
    "tshirt": "a t-shirt",
    "tank_top": "a tank top",
    "blouse": "a blouse",
    "sweater": "a sweater",
    "jeans": "a pair of jeans",
    "pants": "a pair of trousers",
    "shorts": "a pair of shorts",
    "skirt": "a long or short skirt with a waistband",
    "dress": "a one-piece dress worn from shoulders to hem",
    "sneakers": "a pair of sneakers",
    "boots": "a pair of boots",
    "heels": "a pair of high heels",
}

TYPE_DETAILS = {
    "tshirt": ("T-shirt", "top", "t-shirt"),
    "tank_top": ("Tank top", "top", "tank top"),
    "blouse": ("Blouse", "top", "blouse"),
    "sweater": ("Sweater", "top", "sweater"),
    "jeans": ("Jeans", "bottom", "jeans"),
    "pants": ("Pants", "bottom", "pants"),
    "shorts": ("Shorts", "bottom", "shorts"),
    "skirt": ("Skirt", "bottom", "skirt"),
    "dress": ("Dress", "dress", "dress"),
    "sneakers": ("Sneakers", "shoes", "sneakers"),
    "boots": ("Boots", "shoes", "boots"),
    "heels": ("Heels", "shoes", "heels"),
}

DESCRIPTION_TO_KEY = {description: key for key, description in LABELS.items()}


class FashionClipClassifier:
    def __init__(self) -> None:
        import torch
        from transformers import pipeline

        self._classifier = pipeline(
            "zero-shot-image-classification",
            model=MODEL_ID,
            device=0 if torch.cuda.is_available() else -1,
        )
        self._inference_lock = Lock()

    def predict(self, image_bytes: bytes) -> dict:
        try:
            with Image.open(BytesIO(image_bytes)) as source_image:
                image = source_image.convert("RGB")
        except (UnidentifiedImageError, OSError) as exc:
            raise ValueError("The uploaded file is not a supported image.") from exc

        with self._inference_lock:
            predictions = self._classifier(image, candidate_labels=list(LABELS.values()))
        if len(predictions) < 2:
            raise RuntimeError("FashionCLIP returned fewer than two predictions.")

        def format_prediction(prediction: dict) -> dict:
            key = DESCRIPTION_TO_KEY[prediction["label"]]
            clothing_type, category, subcategory = TYPE_DETAILS[key]
            return {
                "clothing_type": clothing_type,
                "category": category,
                "subcategory": subcategory,
                "score": float(prediction["score"]),
            }

        return {
            "model": MODEL_ID,
            "top_prediction": format_prediction(predictions[0]),
            "second_prediction": format_prediction(predictions[1]),
        }
