"""
models/user.py
--------------
Defines what a User looks like as a plain Python object.

SOLID – Single Responsibility:
  A model's only job is to represent data and convert it to/from the dict
  format that we write into database.json. It has NO business logic and NO
  knowledge of Flask, files, or HTTP.
"""

import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional


@dataclass
class User:
    """
    Represents one registered user.

    Fields
    ------
    id              : Unique identifier (UUID4 string). Generated automatically
                      on creation so callers never have to supply one.
    username        : The display name shown to other users (must be unique).
    email           : Used for login. Stored as plain text (no encryption yet).
    password        : Stored as plain text for now. Future: bcrypt hash.
    token           : The active session token.  None means "not logged in".
    friends         : List of user IDs this user has accepted as friends.
    friend_requests_received : IDs of users who sent a friend request TO this user.
    friend_requests_sent     : IDs of users this user has sent a request TO.
    created_at      : ISO-8601 timestamp of when the account was created.
    """

    username: str
    email: str
    password: str                              # plain text – will be hashed later
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    token: Optional[str] = None
    friends: list = field(default_factory=list)
    friend_requests_received: list = field(default_factory=list)
    friend_requests_sent: list = field(default_factory=list)
    created_at: str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )

    # ------------------------------------------------------------------
    # Serialisation helpers
    # ------------------------------------------------------------------

    def to_dict(self) -> dict:
        """
        Convert this User into a plain dict so it can be JSON-serialised and
        written to database.json.
        """
        return {
            "id": self.id,
            "username": self.username,
            "email": self.email,
            "password": self.password,
            "token": self.token,
            "friends": self.friends,
            "friend_requests_received": self.friend_requests_received,
            "friend_requests_sent": self.friend_requests_sent,
            "created_at": self.created_at,
        }

    def to_public_dict(self) -> dict:
        """
        A safe view of the user that omits the password and token.
        This is what we send over the wire in API responses.
        """
        return {
            "id": self.id,
            "username": self.username,
            "created_at": self.created_at,
        }

    @staticmethod
    def from_dict(data: dict) -> "User":
        """
        Re-hydrate a User from a dict that was previously stored in the file.
        The `**data` unpacking maps each key in the dict to the matching field.
        """
        return User(**data)
