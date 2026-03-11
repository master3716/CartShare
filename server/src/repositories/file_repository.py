"""
repositories/file_repository.py
--------------------------------
Base class responsible for reading and writing the JSON "database" file.

SOLID – Single Responsibility:
  This class ONLY handles raw file I/O (open, read, parse, write).
  It knows nothing about users, purchases, or business rules.

SOLID – Open / Closed:
  Subclasses (UserRepository, PurchaseRepository) inherit the read/write
  primitives and add their own query methods WITHOUT touching this file.

SOLID – Dependency Inversion:
  The constructor accepts `db_path` as a parameter (injected from outside)
  rather than hard-coding a path. This lets tests pass a temp file path and
  lets production pass the configured DATABASE_PATH.
"""

import json
import os


class FileRepository:
    """
    Thin wrapper around a JSON file that acts as the entire database.

    The file must contain a JSON object at the top level.  Subclasses work
    with a specific key inside that object (e.g. "users" or "purchases").
    """

    def __init__(self, db_path: str):
        """
        Parameters
        ----------
        db_path : str
            Absolute path to the JSON file.  The directory must already exist.
        """
        self._db_path = db_path
        # If the file does not yet exist (first run), create it with empty
        # collections so downstream code never has to handle "file missing".
        if not os.path.exists(db_path):
            self._write_db({"users": [], "purchases": []})

    # ------------------------------------------------------------------
    # Private I/O helpers (used by subclasses via self._read_db / _write_db)
    # ------------------------------------------------------------------

    def _read_db(self) -> dict:
        """
        Read the entire JSON file and return it as a Python dict.
        Raises a RuntimeError if the file can't be parsed, so callers get a
        meaningful message instead of a raw json.JSONDecodeError.
        """
        with open(self._db_path, "r", encoding="utf-8") as fh:
            try:
                return json.load(fh)
            except json.JSONDecodeError as exc:
                raise RuntimeError(
                    f"database.json is corrupted: {exc}"
                ) from exc

    def _write_db(self, data: dict) -> None:
        """
        Overwrite the entire JSON file with `data`.
        `indent=2` keeps the file human-readable (plain text, as requested).
        `ensure_ascii=False` allows non-ASCII characters (product names in
        other languages).
        """
        with open(self._db_path, "w", encoding="utf-8") as fh:
            json.dump(data, fh, indent=2, ensure_ascii=False)
