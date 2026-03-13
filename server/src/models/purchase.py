"""
models/purchase.py
------------------
Defines what a Purchase looks like as a plain Python object.

SOLID – Single Responsibility:
  Same as User: this model ONLY describes data shape and serialisation.
  It never touches the filesystem, Flask, or business rules.
"""

import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone

@dataclass
class Purchase:
    """
    Represents one item a user has added to their list.

    Fields
    ------
    id          : UUID4 string, auto-generated.
    user_id     : The ID of the User who owns this purchase.
    item_name   : Human-readable product name extracted from the page.
    product_url : The full URL of the product page (used as the "buy" link).
    platform    : "amazon" | "aliexpress" — which site the item came from.
    is_public   : If True, friends can see this purchase.
    price       : Price string as shown on the page (e.g. "$19.99").
    currency    : Currency code extracted from the page (e.g. "USD").
    image_url   : URL of the product thumbnail image.
    notes       : Optional free-text note the user can attach.
    added_at    : ISO-8601 timestamp of when the item was added.
    """

    user_id: str
    item_name: str
    product_url: str
    platform: str                              # "amazon" | "aliexpress"
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    is_public: bool = True
    price: str = ""
    currency: str = ""
    image_url: str = ""
    notes: str = ""
    click_count: int = 0
    also_buying: list = field(default_factory=list)   # list of user_ids also buying this item
    added_at: str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )

    # ------------------------------------------------------------------
    # Serialisation helpers
    # ------------------------------------------------------------------

    def to_dict(self) -> dict:
        """Serialise to a plain dict for storage in database.json."""
        return {
            "id": self.id,
            "user_id": self.user_id,
            "item_name": self.item_name,
            "product_url": self.product_url,
            "platform": self.platform,
            "is_public": self.is_public,
            "price": self.price,
            "currency": self.currency,
            "image_url": self.image_url,
            "notes": self.notes,
            "click_count": self.click_count,
            "also_buying": self.also_buying,
            "added_at": self.added_at,
        }

    @staticmethod
    def from_dict(data: dict) -> "Purchase":
        """Re-hydrate a Purchase from a stored dict."""
        known = {
            "id", "user_id", "item_name", "product_url", "platform",
            "is_public", "price", "currency", "image_url", "notes",
            "click_count", "also_buying", "added_at",
        }
        return Purchase(**{k: v for k, v in data.items() if k in known})
