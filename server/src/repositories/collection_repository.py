from typing import Optional
from src.models.collection import Collection
from src.repositories.file_repository import FileRepository


class CollectionRepository(FileRepository):
    _KEY = "collections"

    def _get_all_raw(self) -> list[dict]:
        return self._read_db().get(self._KEY, [])

    def _save_all(self, dicts: list[dict]) -> None:
        db = self._read_db()
        db[self._KEY] = dicts
        self._write_db(db)

    def find_by_id(self, collection_id: str) -> Optional[Collection]:
        raw = next((d for d in self._get_all_raw() if d["id"] == collection_id), None)
        return Collection.from_dict(raw) if raw else None

    def find_by_user_id(self, user_id: str) -> list[Collection]:
        """Return collections where user is owner or member."""
        return [
            Collection.from_dict(d) for d in self._get_all_raw()
            if d["owner_id"] == user_id or user_id in d.get("member_ids", [])
        ]

    def save(self, collection: Collection) -> Collection:
        all_dicts = self._get_all_raw()
        d = collection.to_dict()
        for i, existing in enumerate(all_dicts):
            if existing["id"] == collection.id:
                all_dicts[i] = d
                self._save_all(all_dicts)
                return collection
        all_dicts.append(d)
        self._save_all(all_dicts)
        return collection

    def delete(self, collection_id: str) -> bool:
        all_dicts = self._get_all_raw()
        filtered = [d for d in all_dicts if d["id"] != collection_id]
        if len(filtered) == len(all_dicts):
            return False
        self._save_all(filtered)
        return True
