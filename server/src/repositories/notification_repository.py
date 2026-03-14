from typing import Optional
from src.models.notification import Notification
from src.repositories.file_repository import FileRepository


class NotificationRepository(FileRepository):
    _KEY = "notifications"

    def _get_all_raw(self) -> list[dict]:
        return self._read_db().get(self._KEY, [])

    def _save_all(self, dicts: list[dict]) -> None:
        db = self._read_db()
        db[self._KEY] = dicts
        self._write_db(db)

    def find_by_recipient_id(self, recipient_id: str) -> list[Notification]:
        matches = [Notification.from_dict(d) for d in self._get_all_raw() if d["recipient_id"] == recipient_id]
        return sorted(matches, key=lambda n: n.created_at, reverse=True)

    def find_by_id(self, notification_id: str) -> Optional[Notification]:
        raw = next((d for d in self._get_all_raw() if d["id"] == notification_id), None)
        return Notification.from_dict(raw) if raw else None

    def save(self, notification: Notification) -> Notification:
        all_dicts = self._get_all_raw()
        d = notification.to_dict()
        for i, existing in enumerate(all_dicts):
            if existing["id"] == notification.id:
                all_dicts[i] = d
                self._save_all(all_dicts)
                return notification
        all_dicts.append(d)
        self._save_all(all_dicts)
        return notification

    def mark_all_read(self, recipient_id: str) -> None:
        all_dicts = self._get_all_raw()
        for d in all_dicts:
            if d["recipient_id"] == recipient_id:
                d["read"] = True
        self._save_all(all_dicts)
