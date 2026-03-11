"""
repositories/mongo_purchase_repository.py
-------------------------------------------
MongoDB-backed implementation of the purchase repository.
Drop-in replacement for PurchaseRepository — same public interface.
"""

from typing import Optional
import certifi
from pymongo import MongoClient, DESCENDING
from src.models.purchase import Purchase


class MongoPurchaseRepository:

    def __init__(self, mongo_uri: str):
        client = MongoClient(mongo_uri, tlsCAFile=certifi.where())
        db = client.get_default_database()
        self._col = db["purchases"]

    def _to_purchase(self, doc) -> Optional[Purchase]:
        if doc is None:
            return None
        data = dict(doc)
        data["id"] = str(data.pop("_id"))
        return Purchase.from_dict(data)

    def _to_doc(self, purchase: Purchase) -> dict:
        d = purchase.to_dict()
        d["_id"] = d.pop("id")
        return d

    def get_all(self) -> list[Purchase]:
        return [self._to_purchase(d) for d in self._col.find()]

    def find_by_id(self, purchase_id: str) -> Optional[Purchase]:
        return self._to_purchase(self._col.find_one({"_id": purchase_id}))

    def find_by_user_id(self, user_id: str) -> list[Purchase]:
        docs = self._col.find({"user_id": user_id}).sort("added_at", DESCENDING)
        return [self._to_purchase(d) for d in docs]

    def find_public_by_user_id(self, user_id: str) -> list[Purchase]:
        docs = self._col.find(
            {"user_id": user_id, "is_public": True}
        ).sort("added_at", DESCENDING)
        return [self._to_purchase(d) for d in docs]

    def save(self, purchase: Purchase) -> Purchase:
        doc = self._to_doc(purchase)
        self._col.replace_one({"_id": doc["_id"]}, doc, upsert=True)
        return purchase

    def delete(self, purchase_id: str) -> bool:
        return self._col.delete_one({"_id": purchase_id}).deleted_count > 0
