from typing import Optional
import certifi
from pymongo import MongoClient, DESCENDING
from src.models.notification import Notification


class MongoNotificationRepository:

    def __init__(self, mongo_uri: str):
        client = MongoClient(mongo_uri, tlsCAFile=certifi.where())
        db = client.get_default_database()
        self._col = db["notifications"]

    def _to_notification(self, doc) -> Optional[Notification]:
        if doc is None:
            return None
        data = dict(doc)
        data["id"] = str(data.pop("_id"))
        return Notification.from_dict(data)

    def _to_doc(self, notification: Notification) -> dict:
        d = notification.to_dict()
        d["_id"] = d.pop("id")
        return d

    def find_by_recipient_id(self, recipient_id: str) -> list[Notification]:
        docs = self._col.find({"recipient_id": recipient_id}).sort("created_at", DESCENDING)
        return [self._to_notification(d) for d in docs]

    def find_by_id(self, notification_id: str) -> Optional[Notification]:
        return self._to_notification(self._col.find_one({"_id": notification_id}))

    def save(self, notification: Notification) -> Notification:
        doc = self._to_doc(notification)
        self._col.replace_one({"_id": doc["_id"]}, doc, upsert=True)
        return notification

    def mark_all_read(self, recipient_id: str) -> None:
        self._col.update_many({"recipient_id": recipient_id}, {"$set": {"read": True}})
