"""
repositories/mongo_user_repository.py
---------------------------------------
MongoDB-backed implementation of the user repository.
Drop-in replacement for UserRepository — same public interface.
"""

from typing import Optional
from pymongo import MongoClient
from src.models.user import User


class MongoUserRepository:

    def __init__(self, mongo_uri: str):
        client = MongoClient(mongo_uri)
        db = client.get_default_database()
        self._col = db["users"]

    def _to_user(self, doc) -> Optional[User]:
        if doc is None:
            return None
        data = dict(doc)
        data["id"] = str(data.pop("_id"))
        return User.from_dict(data)

    def _to_doc(self, user: User) -> dict:
        d = user.to_dict()
        d["_id"] = d.pop("id")
        return d

    def get_all(self) -> list[User]:
        return [self._to_user(d) for d in self._col.find()]

    def find_by_id(self, user_id: str) -> Optional[User]:
        return self._to_user(self._col.find_one({"_id": user_id}))

    def find_by_email(self, email: str) -> Optional[User]:
        return self._to_user(self._col.find_one({"email": email}))

    def find_by_username(self, username: str) -> Optional[User]:
        return self._to_user(self._col.find_one({"username": username}))

    def find_by_token(self, token: str) -> Optional[User]:
        return self._to_user(self._col.find_one({"token": token}))

    def save(self, user: User) -> User:
        doc = self._to_doc(user)
        self._col.replace_one({"_id": doc["_id"]}, doc, upsert=True)
        return user

    def delete(self, user_id: str) -> bool:
        return self._col.delete_one({"_id": user_id}).deleted_count > 0
