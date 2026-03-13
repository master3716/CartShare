import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional


@dataclass
class SavedItem:
    user_id: str
    purchase_id: str
    category: str
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    saved_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "purchase_id": self.purchase_id,
            "category": self.category,
            "saved_at": self.saved_at,
        }

    @staticmethod
    def from_dict(data: dict) -> "SavedItem":
        known = {"id", "user_id", "purchase_id", "category", "saved_at"}
        return SavedItem(**{k: v for k, v in data.items() if k in known})
