from typing import Optional
from src.models.saved_item import SavedItem
from src.repositories.file_repository import FileRepository


class SavedItemRepository(FileRepository):
    _KEY = "saved_items"

    def _get_all_raw(self) -> list[dict]:
        return self._read_db().get(self._KEY, [])

    def _save_all(self, dicts: list[dict]) -> None:
        db = self._read_db()
        db[self._KEY] = dicts
        self._write_db(db)

    def find_by_user_id(self, user_id: str) -> list[SavedItem]:
        return [SavedItem.from_dict(d) for d in self._get_all_raw() if d["user_id"] == user_id]

    def find_by_id(self, item_id: str) -> Optional[SavedItem]:
        raw = next((d for d in self._get_all_raw() if d["id"] == item_id), None)
        return SavedItem.from_dict(raw) if raw else None

    def already_saved(self, user_id: str, purchase_id: str) -> bool:
        return any(d["user_id"] == user_id and d["purchase_id"] == purchase_id for d in self._get_all_raw())

    def save(self, item: SavedItem) -> SavedItem:
        all_dicts = self._get_all_raw()
        d = item.to_dict()
        for i, existing in enumerate(all_dicts):
            if existing["id"] == item.id:
                all_dicts[i] = d
                self._save_all(all_dicts)
                return item
        all_dicts.append(d)
        self._save_all(all_dicts)
        return item

    def delete(self, item_id: str) -> bool:
        all_dicts = self._get_all_raw()
        filtered = [d for d in all_dicts if d["id"] != item_id]
        if len(filtered) == len(all_dicts):
            return False
        self._save_all(filtered)
        return True
