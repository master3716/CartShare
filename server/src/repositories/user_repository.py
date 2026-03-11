"""
repositories/user_repository.py
---------------------------------
All database operations that involve Users.

SOLID – Single Responsibility:
  Only knows how to find, create, update, and delete User records in the file.
  No business rules (e.g. "is the password correct?") live here – that's the
  service layer's job.

SOLID – Open / Closed:
  Extends FileRepository to gain read/write primitives without modifying it.

SOLID – Liskov Substitution:
  Can be swapped for a future SQLUserRepository as long as it exposes the same
  public methods.
"""

from typing import Optional
from src.models.user import User
from src.repositories.file_repository import FileRepository


class UserRepository(FileRepository):
    """CRUD operations for User records."""

    # The key inside database.json that holds the list of user dicts.
    _KEY = "users"

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _get_all_raw(self) -> list[dict]:
        """Return the raw list of user dicts from the file."""
        return self._read_db().get(self._KEY, [])

    def _save_all(self, user_dicts: list[dict]) -> None:
        """Overwrite the users list inside the file, preserving purchases."""
        db = self._read_db()
        db[self._KEY] = user_dicts
        self._write_db(db)

    # ------------------------------------------------------------------
    # Public query methods
    # ------------------------------------------------------------------

    def get_all(self) -> list[User]:
        """Return every user as a list of User objects."""
        return [User.from_dict(d) for d in self._get_all_raw()]

    def find_by_id(self, user_id: str) -> Optional[User]:
        """
        Return the User whose `id` matches, or None if not found.
        Using a generator expression + next() avoids loading all records into
        a list when we only need the first match.
        """
        raw = next(
            (d for d in self._get_all_raw() if d["id"] == user_id), None
        )
        return User.from_dict(raw) if raw else None

    def find_by_email(self, email: str) -> Optional[User]:
        """Return the User with the given email (used for login), or None."""
        raw = next(
            (d for d in self._get_all_raw() if d["email"] == email), None
        )
        return User.from_dict(raw) if raw else None

    def find_by_username(self, username: str) -> Optional[User]:
        """Return the User with the given username, or None."""
        raw = next(
            (d for d in self._get_all_raw() if d["username"] == username), None
        )
        return User.from_dict(raw) if raw else None

    def find_by_token(self, token: str) -> Optional[User]:
        """
        Look up which user owns a given auth token.
        Called on every authenticated request by the auth middleware.
        """
        raw = next(
            (d for d in self._get_all_raw() if d.get("token") == token), None
        )
        return User.from_dict(raw) if raw else None

    def save(self, user: User) -> User:
        """
        Insert a new user OR update an existing one (upsert by id).

        Strategy: read the full list, replace the matching dict if found,
        otherwise append.  Then write the whole list back.
        This is simple and correct for small datasets; a real DB would use
        INSERT … ON CONFLICT or an UPDATE WHERE id=… query.
        """
        all_dicts = self._get_all_raw()
        user_dict = user.to_dict()

        # Check if this user already exists (update case)
        for i, d in enumerate(all_dicts):
            if d["id"] == user.id:
                all_dicts[i] = user_dict   # replace in place
                self._save_all(all_dicts)
                return user

        # New user – append
        all_dicts.append(user_dict)
        self._save_all(all_dicts)
        return user

    def delete(self, user_id: str) -> bool:
        """
        Remove the user with the given id.  Returns True if a record was
        deleted, False if no matching record was found.
        """
        all_dicts = self._get_all_raw()
        filtered = [d for d in all_dicts if d["id"] != user_id]
        if len(filtered) == len(all_dicts):
            return False   # nothing was removed
        self._save_all(filtered)
        return True
