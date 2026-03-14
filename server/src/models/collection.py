import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone


@dataclass
class Collection:
    owner_id: str
    name: str
    member_ids: list = field(default_factory=list)
    # items / pending_items: list of {"purchase_id": str, "added_by_user_id": str, "added_at": str}
    items: list = field(default_factory=list)
    pending_items: list = field(default_factory=list)
    requires_approval: bool = False
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "owner_id": self.owner_id,
            "name": self.name,
            "member_ids": self.member_ids,
            "items": self.items,
            "pending_items": self.pending_items,
            "requires_approval": self.requires_approval,
            "created_at": self.created_at,
        }

    @staticmethod
    def from_dict(data: dict) -> "Collection":
        known = {"id", "owner_id", "name", "member_ids", "items", "pending_items", "requires_approval", "created_at"}
        return Collection(**{k: v for k, v in data.items() if k in known})
