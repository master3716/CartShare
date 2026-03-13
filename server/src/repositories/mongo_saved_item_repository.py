"""
repositories/mongo_saved_item_repository.py
---------------------------------------------
MongoDB-backed implementation of the saved item repository.
Drop-in replacement for SavedItemRepository — same public interface.
"""

from typing import Optional
import certifi
from pymongo import MongoClient
from src.models.saved_item import SavedItem


class MongoSavedItemRepository:

    def __init__(self, mongo_uri: str):
        client = MongoClient(mongo_uri, tlsCAFile=certifi.where())
        db = client.get_default_database()
        self._col = db["saved_items"]

    def _to_item(self, doc) -> Optional[SavedItem]:
        if doc is None:
            return None
        data = dict(doc)
        data["id"] = str(data.pop("_id"))
        return SavedItem.from_dict(data)

    def _to_doc(self, item: SavedItem) -> dict:
        d = item.to_dict()
        d["_id"] = d.pop("id")
        return d

    def find_by_user_id(self, user_id: str) -> list[SavedItem]:
        return [self._to_item(d) for d in self._col.find({"user_id": user_id})]

    def find_by_id(self, item_id: str) -> Optional[SavedItem]:
        return self._to_item(self._col.find_one({"_id": item_id}))

    def already_saved(self, user_id: str, purchase_id: str) -> bool:
        return self._col.find_one({"user_id": user_id, "purchase_id": purchase_id}) is not None

    def save(self, item: SavedItem) -> SavedItem:
        doc = self._to_doc(item)
        self._col.replace_one({"_id": doc["_id"]}, doc, upsert=True)
        return item

    def delete(self, item_id: str) -> bool:
        return self._col.delete_one({"_id": item_id}).deleted_count > 0
