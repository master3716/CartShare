import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone


@dataclass
class Comment:
    purchase_id: str
    user_id: str
    username: str
    text: str
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    avatar_url: str = ""

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "purchase_id": self.purchase_id,
            "user_id": self.user_id,
            "username": self.username,
            "text": self.text,
            "created_at": self.created_at,
            "avatar_url": self.avatar_url,
        }

    @staticmethod
    def from_dict(data: dict) -> "Comment":
        known = {"id", "purchase_id", "user_id", "username", "text", "created_at", "avatar_url"}
        return Comment(**{k: v for k, v in data.items() if k in known})
