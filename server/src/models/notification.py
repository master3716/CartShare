import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone


@dataclass
class Notification:
    recipient_id: str
    type: str           # "friend_request" | "friend_accepted" | "comment" | "me_too"
    from_user_id: str
    from_username: str
    from_avatar_url: str = ""
    purchase_id: str = ""
    item_name: str = ""
    read: bool = False
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "recipient_id": self.recipient_id,
            "type": self.type,
            "from_user_id": self.from_user_id,
            "from_username": self.from_username,
            "from_avatar_url": self.from_avatar_url,
            "purchase_id": self.purchase_id,
            "item_name": self.item_name,
            "read": self.read,
            "created_at": self.created_at,
        }

    @staticmethod
    def from_dict(data: dict) -> "Notification":
        known = {
            "id", "recipient_id", "type", "from_user_id", "from_username",
            "from_avatar_url", "purchase_id", "item_name", "read", "created_at",
        }
        return Notification(**{k: v for k, v in data.items() if k in known})
