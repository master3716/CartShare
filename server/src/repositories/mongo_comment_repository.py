"""
repositories/mongo_comment_repository.py
------------------------------------------
MongoDB-backed implementation of the comment repository.
Drop-in replacement for CommentRepository — same public interface.
"""

from typing import Optional
import certifi
from pymongo import MongoClient, ASCENDING
from src.models.comment import Comment


class MongoCommentRepository:

    def __init__(self, mongo_uri: str):
        client = MongoClient(mongo_uri, tlsCAFile=certifi.where())
        db = client.get_default_database()
        self._col = db["comments"]

    def _to_comment(self, doc) -> Optional[Comment]:
        if doc is None:
            return None
        data = dict(doc)
        data["id"] = str(data.pop("_id"))
        return Comment.from_dict(data)

    def _to_doc(self, comment: Comment) -> dict:
        d = comment.to_dict()
        d["_id"] = d.pop("id")
        return d

    def find_by_purchase_id(self, purchase_id: str) -> list[Comment]:
        docs = self._col.find({"purchase_id": purchase_id}).sort("created_at", ASCENDING)
        return [self._to_comment(d) for d in docs]

    def find_by_id(self, comment_id: str) -> Optional[Comment]:
        return self._to_comment(self._col.find_one({"_id": comment_id}))

    def save(self, comment: Comment) -> Comment:
        doc = self._to_doc(comment)
        self._col.replace_one({"_id": doc["_id"]}, doc, upsert=True)
        return comment

    def delete(self, comment_id: str) -> bool:
        return self._col.delete_one({"_id": comment_id}).deleted_count > 0
