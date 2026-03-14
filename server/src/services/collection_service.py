from datetime import datetime, timezone
from src.models.collection import Collection


class CollectionService:
    def __init__(self, collection_repo, user_repo, purchase_repo):
        self._repo = collection_repo
        self._user_repo = user_repo
        self._purchase_repo = purchase_repo

    def create(self, owner_id: str, name: str) -> Collection:
        name = name.strip()
        if not name:
            raise ValueError("Collection name is required.")
        if len(name) > 60:
            raise ValueError("Collection name must be 60 characters or less.")
        collection = Collection(owner_id=owner_id, name=name)
        return self._repo.save(collection)

    def get_mine(self, user_id: str) -> list[dict]:
        collections = self._repo.find_by_user_id(user_id)
        result = []
        for c in collections:
            d = c.to_dict()
            owner = self._user_repo.find_by_id(c.owner_id)
            d["owner_username"] = owner.username if owner else ""
            d["item_count"] = len(c.items)
            result.append(d)
        return sorted(result, key=lambda x: x["created_at"], reverse=True)

    def get_by_id(self, collection_id: str, user_id: str) -> dict:
        collection = self._repo.find_by_id(collection_id)
        if not collection:
            raise ValueError("Collection not found.")
        if collection.owner_id != user_id and user_id not in collection.member_ids:
            raise ValueError("Access denied.")
        d = collection.to_dict()
        owner = self._user_repo.find_by_id(collection.owner_id)
        d["owner_username"] = owner.username if owner else ""
        # Enrich member info
        members = []
        for mid in collection.member_ids:
            u = self._user_repo.find_by_id(mid)
            if u:
                members.append({"id": u.id, "username": u.username, "avatar_url": u.avatar_url})
        d["members"] = members
        # Enrich items with full purchase data
        enriched_items = []
        for item in collection.items:
            purchase = self._purchase_repo.find_by_id(item["purchase_id"])
            if purchase:
                adder = self._user_repo.find_by_id(item["added_by_user_id"])
                enriched_items.append({
                    "purchase_id": item["purchase_id"],
                    "added_by_user_id": item["added_by_user_id"],
                    "added_by_username": adder.username if adder else "",
                    "added_at": item["added_at"],
                    "purchase": purchase.to_dict(),
                })
        d["enriched_items"] = enriched_items
        return d

    def invite_member(self, collection_id: str, owner_id: str, username: str) -> None:
        collection = self._repo.find_by_id(collection_id)
        if not collection:
            raise ValueError("Collection not found.")
        if collection.owner_id != owner_id:
            raise ValueError("Only the owner can invite members.")
        target = self._user_repo.find_by_username(username)
        if not target:
            raise ValueError(f"User '{username}' not found.")
        if target.id == owner_id:
            raise ValueError("You are already the owner.")
        if target.id in collection.member_ids:
            raise ValueError("User is already a member.")
        collection.member_ids.append(target.id)
        self._repo.save(collection)

    def leave(self, collection_id: str, user_id: str) -> None:
        collection = self._repo.find_by_id(collection_id)
        if not collection:
            raise ValueError("Collection not found.")
        if collection.owner_id == user_id:
            raise ValueError("Owner cannot leave — delete the collection instead.")
        if user_id not in collection.member_ids:
            raise ValueError("You are not a member of this collection.")
        collection.member_ids.remove(user_id)
        self._repo.save(collection)

    def remove_member(self, collection_id: str, owner_id: str, member_id: str) -> None:
        collection = self._repo.find_by_id(collection_id)
        if not collection:
            raise ValueError("Collection not found.")
        if collection.owner_id != owner_id:
            raise ValueError("Only the owner can remove members.")
        if member_id not in collection.member_ids:
            raise ValueError("User is not a member.")
        collection.member_ids.remove(member_id)
        self._repo.save(collection)

    def add_item(self, collection_id: str, user_id: str, purchase_id: str) -> None:
        collection = self._repo.find_by_id(collection_id)
        if not collection:
            raise ValueError("Collection not found.")
        if collection.owner_id != user_id and user_id not in collection.member_ids:
            raise ValueError("You are not a member of this collection.")
        purchase = self._purchase_repo.find_by_id(purchase_id)
        if not purchase:
            raise ValueError("Purchase not found.")
        if any(item["purchase_id"] == purchase_id for item in collection.items):
            raise ValueError("This item is already in the collection.")
        collection.items.append({
            "purchase_id": purchase_id,
            "added_by_user_id": user_id,
            "added_at": datetime.now(timezone.utc).isoformat(),
        })
        self._repo.save(collection)

    def remove_item(self, collection_id: str, user_id: str, purchase_id: str) -> None:
        collection = self._repo.find_by_id(collection_id)
        if not collection:
            raise ValueError("Collection not found.")
        if collection.owner_id != user_id and user_id not in collection.member_ids:
            raise ValueError("You are not a member of this collection.")
        item = next((i for i in collection.items if i["purchase_id"] == purchase_id), None)
        if not item:
            raise ValueError("Item not in collection.")
        if item["added_by_user_id"] != user_id and collection.owner_id != user_id:
            raise ValueError("You cannot remove an item you did not add.")
        collection.items = [i for i in collection.items if i["purchase_id"] != purchase_id]
        self._repo.save(collection)

    def delete(self, collection_id: str, owner_id: str) -> None:
        collection = self._repo.find_by_id(collection_id)
        if not collection:
            raise ValueError("Collection not found.")
        if collection.owner_id != owner_id:
            raise ValueError("Only the owner can delete this collection.")
        self._repo.delete(collection_id)
