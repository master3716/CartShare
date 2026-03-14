from typing import Optional
import certifi
from pymongo import MongoClient
from src.models.collection import Collection


class MongoCollectionRepository:

    def __init__(self, mongo_uri: str):
        client = MongoClient(mongo_uri, tlsCAFile=certifi.where())
        db = client.get_default_database()
        self._col = db["collections"]

    def _to_collection(self, doc) -> Optional[Collection]:
        if doc is None:
            return None
        data = dict(doc)
        data["id"] = str(data.pop("_id"))
        return Collection.from_dict(data)

    def _to_doc(self, collection: Collection) -> dict:
        d = collection.to_dict()
        d["_id"] = d.pop("id")
        return d

    def find_by_id(self, collection_id: str) -> Optional[Collection]:
        return self._to_collection(self._col.find_one({"_id": collection_id}))

    def find_by_user_id(self, user_id: str) -> list[Collection]:
        docs = self._col.find({"$or": [{"owner_id": user_id}, {"member_ids": user_id}]})
        return [self._to_collection(d) for d in docs]

    def save(self, collection: Collection) -> Collection:
        doc = self._to_doc(collection)
        self._col.replace_one({"_id": doc["_id"]}, doc, upsert=True)
        return collection

    def delete(self, collection_id: str) -> bool:
        return self._col.delete_one({"_id": collection_id}).deleted_count > 0
