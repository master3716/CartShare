"""
repositories/purchase_repository.py
-------------------------------------
All database operations that involve Purchases.

SOLID – Single Responsibility:
  Only knows how to persist Purchase records. No business rules here.

SOLID – Open / Closed:
  Extends FileRepository; never modifies it.

SOLID – Liskov Substitution:
  Can be replaced by a SQL-backed version without touching any service.
"""

from typing import Optional
from src.models.purchase import Purchase
from src.repositories.file_repository import FileRepository


class PurchaseRepository(FileRepository):
    """CRUD operations for Purchase records."""

    _KEY = "purchases"

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _get_all_raw(self) -> list[dict]:
        return self._read_db().get(self._KEY, [])

    def _save_all(self, purchase_dicts: list[dict]) -> None:
        db = self._read_db()
        db[self._KEY] = purchase_dicts
        self._write_db(db)

    # ------------------------------------------------------------------
    # Public query methods
    # ------------------------------------------------------------------

    def get_all(self) -> list[Purchase]:
        """Return every purchase in the database."""
        return [Purchase.from_dict(d) for d in self._get_all_raw()]

    def find_by_id(self, purchase_id: str) -> Optional[Purchase]:
        """Return the Purchase with the given id, or None."""
        raw = next(
            (d for d in self._get_all_raw() if d["id"] == purchase_id), None
        )
        return Purchase.from_dict(raw) if raw else None

    def find_by_user_id(self, user_id: str) -> list[Purchase]:
        """
        Return all purchases belonging to a specific user, newest first.
        Sorting here keeps the service layer simple.
        """
        matches = [
            Purchase.from_dict(d)
            for d in self._get_all_raw()
            if d["user_id"] == user_id
        ]
        # Sort descending by added_at (ISO strings sort lexicographically)
        return sorted(matches, key=lambda p: p.added_at, reverse=True)

    def find_public_by_user_id(self, user_id: str) -> list[Purchase]:
        """
        Return only the public purchases for a user.
        Used when rendering another user's profile.
        """
        return [p for p in self.find_by_user_id(user_id) if p.is_public]

    def save(self, purchase: Purchase) -> Purchase:
        """
        Insert or update a purchase (upsert by id), then persist to file.
        """
        all_dicts = self._get_all_raw()
        purchase_dict = purchase.to_dict()

        for i, d in enumerate(all_dicts):
            if d["id"] == purchase.id:
                all_dicts[i] = purchase_dict
                self._save_all(all_dicts)
                return purchase

        all_dicts.append(purchase_dict)
        self._save_all(all_dicts)
        return purchase

    def increment_click(self, purchase_id: str) -> None:
        all_dicts = self._get_all_raw()
        for d in all_dicts:
            if d["id"] == purchase_id:
                d["click_count"] = d.get("click_count", 0) + 1
                self._save_all(all_dicts)
                return

    def delete(self, purchase_id: str) -> bool:
        """Delete a purchase by id. Returns True if something was deleted."""
        all_dicts = self._get_all_raw()
        filtered = [d for d in all_dicts if d["id"] != purchase_id]
        if len(filtered) == len(all_dicts):
            return False
        self._save_all(filtered)
        return True
