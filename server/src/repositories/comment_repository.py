from typing import Optional
from src.models.comment import Comment
from src.repositories.file_repository import FileRepository


class CommentRepository(FileRepository):
    _KEY = "comments"

    def _get_all_raw(self) -> list[dict]:
        return self._read_db().get(self._KEY, [])

    def _save_all(self, dicts: list[dict]) -> None:
        db = self._read_db()
        db[self._KEY] = dicts
        self._write_db(db)

    def find_by_purchase_id(self, purchase_id: str) -> list[Comment]:
        matches = [Comment.from_dict(d) for d in self._get_all_raw() if d["purchase_id"] == purchase_id]
        return sorted(matches, key=lambda c: c.created_at)

    def find_by_id(self, comment_id: str) -> Optional[Comment]:
        raw = next((d for d in self._get_all_raw() if d["id"] == comment_id), None)
        return Comment.from_dict(raw) if raw else None

    def save(self, comment: Comment) -> Comment:
        all_dicts = self._get_all_raw()
        d = comment.to_dict()
        for i, existing in enumerate(all_dicts):
            if existing["id"] == comment.id:
                all_dicts[i] = d
                self._save_all(all_dicts)
                return comment
        all_dicts.append(d)
        self._save_all(all_dicts)
        return comment

    def delete(self, comment_id: str) -> bool:
        all_dicts = self._get_all_raw()
        filtered = [d for d in all_dicts if d["id"] != comment_id]
        if len(filtered) == len(all_dicts):
            return False
        self._save_all(filtered)
        return True
