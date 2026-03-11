"""
services/friend_service.py
----------------------------
Business logic for the friend system.

SOLID – Single Responsibility:
  Only handles friend relationships. Independent from purchases and auth.

SOLID – Dependency Inversion:
  Receives both UserRepository and PurchaseRepository via injection.
  It needs the purchase repo to load friends' public purchases.
"""

from src.models.user import User
from src.repositories.user_repository import UserRepository
from src.repositories.purchase_repository import PurchaseRepository


class FriendService:
    """Send/accept/reject friend requests and query friends' purchases."""

    def __init__(
        self,
        user_repo: UserRepository,
        purchase_repo: PurchaseRepository,
    ):
        self._user_repo = user_repo
        self._purchase_repo = purchase_repo

    # ------------------------------------------------------------------
    # Friend requests
    # ------------------------------------------------------------------

    def send_request(self, sender_id: str, target_username: str) -> None:
        """
        Send a friend request from `sender_id` to the user with
        `target_username`.

        Rules enforced:
          - Cannot add yourself.
          - Cannot send a request if already friends.
          - Cannot send a duplicate pending request.

        Both the sender's and the target's records are updated and saved.
        """
        sender = self._user_repo.find_by_id(sender_id)
        target = self._user_repo.find_by_username(target_username)

        if not target:
            raise ValueError(f"User '{target_username}' not found.")
        if target.id == sender_id:
            raise ValueError("You cannot add yourself as a friend.")
        if target.id in sender.friends:
            raise ValueError("You are already friends with this user.")
        if target.id in sender.friend_requests_sent:
            raise ValueError("You already sent a request to this user.")

        # Record the pending request on BOTH sides so either side can query
        # their pending state without scanning the whole user list.
        sender.friend_requests_sent.append(target.id)
        target.friend_requests_received.append(sender.id)

        self._user_repo.save(sender)
        self._user_repo.save(target)

    def accept_request(self, user_id: str, requester_id: str) -> None:
        """
        Accept a pending friend request.

        Both users gain each other in their `friends` list, and the
        pending request entries are cleaned up.
        """
        user = self._user_repo.find_by_id(user_id)
        requester = self._user_repo.find_by_id(requester_id)

        if not requester:
            raise ValueError("Requester not found.")
        if requester_id not in user.friend_requests_received:
            raise ValueError("No pending request from this user.")

        # Remove from pending lists
        user.friend_requests_received.remove(requester_id)
        requester.friend_requests_sent.remove(user_id)

        # Add to friends on both sides (bidirectional relationship)
        user.friends.append(requester_id)
        requester.friends.append(user_id)

        self._user_repo.save(user)
        self._user_repo.save(requester)

    def reject_request(self, user_id: str, requester_id: str) -> None:
        """
        Reject (decline) a friend request without adding as friend.
        Cleans up pending lists on both sides.
        """
        user = self._user_repo.find_by_id(user_id)
        requester = self._user_repo.find_by_id(requester_id)

        if requester_id not in user.friend_requests_received:
            raise ValueError("No pending request from this user.")

        user.friend_requests_received.remove(requester_id)
        if requester and user_id in requester.friend_requests_sent:
            requester.friend_requests_sent.remove(user_id)
            self._user_repo.save(requester)

        self._user_repo.save(user)

    def remove_friend(self, user_id: str, friend_id: str) -> None:
        """
        Unfriend: remove the relationship on both sides.
        """
        user = self._user_repo.find_by_id(user_id)
        friend = self._user_repo.find_by_id(friend_id)

        if friend_id not in user.friends:
            raise ValueError("This user is not in your friends list.")

        user.friends.remove(friend_id)
        self._user_repo.save(user)

        if friend and user_id in friend.friends:
            friend.friends.remove(user_id)
            self._user_repo.save(friend)

    # ------------------------------------------------------------------
    # Queries
    # ------------------------------------------------------------------

    def get_friends(self, user_id: str) -> list[User]:
        """Return the full User objects for all accepted friends."""
        user = self._user_repo.find_by_id(user_id)
        friends = []
        for fid in user.friends:
            f = self._user_repo.find_by_id(fid)
            if f:
                friends.append(f)
        return friends

    def get_pending_requests(self, user_id: str) -> list[User]:
        """
        Return the User objects of everyone who has sent a request
        to the current user that hasn't been answered yet.
        """
        user = self._user_repo.find_by_id(user_id)
        requesters = []
        for rid in user.friend_requests_received:
            r = self._user_repo.find_by_id(rid)
            if r:
                requesters.append(r)
        return requesters

    def get_friends_feed(self, user_id: str) -> list[dict]:
        """
        Return a combined feed of public purchases from ALL friends,
        enriched with the friend's username so the UI can display it.

        Each item in the returned list is a dict with:
          - all purchase fields (from purchase.to_dict())
          - "friend_username": the username of the friend who added it
        """
        friends = self.get_friends(user_id)
        feed = []
        for friend in friends:
            public_purchases = self._purchase_repo.find_public_by_user_id(
                friend.id
            )
            for purchase in public_purchases:
                entry = purchase.to_dict()
                entry["friend_username"] = friend.username
                feed.append(entry)

        # Sort the combined feed newest-first
        feed.sort(key=lambda x: x["added_at"], reverse=True)
        return feed
