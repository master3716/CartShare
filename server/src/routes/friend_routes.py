"""
routes/friend_routes.py
------------------------
HTTP handlers for the friend system.

POST   /api/friends/request            – send a friend request (auth)
POST   /api/friends/accept             – accept a request (auth)
POST   /api/friends/reject             – reject a request (auth)
DELETE /api/friends/<friend_id>        – unfriend (auth)
GET    /api/friends                    – list my friends (auth)
GET    /api/friends/requests           – list pending incoming requests (auth)
GET    /api/friends/feed               – combined purchases feed from all friends (auth)
"""

from flask import Blueprint, request, jsonify, g
from src.services.friend_service import FriendService
from src.middleware.auth_middleware import require_auth


def create_friend_blueprint(friend_service: FriendService, user_repo) -> Blueprint:
    bp = Blueprint("friends", __name__)
    auth = require_auth(user_repo)

    # ------------------------------------------------------------------
    # POST /api/friends/request
    # ------------------------------------------------------------------

    @bp.route("/request", methods=["POST"])
    @auth
    def send_request():
        """
        Send a friend request to a user identified by username.
        Body: { "username": "their_username" }
        """
        data = request.get_json(silent=True) or {}
        target_username = data.get("username", "").strip()
        if not target_username:
            return jsonify({"error": "username is required."}), 400
        try:
            friend_service.send_request(g.current_user.id, target_username)
            return jsonify({"message": f"Request sent to {target_username}."}), 200
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 400

    # ------------------------------------------------------------------
    # POST /api/friends/accept
    # ------------------------------------------------------------------

    @bp.route("/accept", methods=["POST"])
    @auth
    def accept_request():
        """
        Accept a pending friend request.
        Body: { "requester_id": "their_user_id" }
        """
        data = request.get_json(silent=True) or {}
        requester_id = data.get("requester_id", "").strip()
        if not requester_id:
            return jsonify({"error": "requester_id is required."}), 400
        try:
            friend_service.accept_request(g.current_user.id, requester_id)
            return jsonify({"message": "Friend request accepted."}), 200
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 400

    # ------------------------------------------------------------------
    # POST /api/friends/reject
    # ------------------------------------------------------------------

    @bp.route("/reject", methods=["POST"])
    @auth
    def reject_request():
        """
        Reject a pending friend request.
        Body: { "requester_id": "their_user_id" }
        """
        data = request.get_json(silent=True) or {}
        requester_id = data.get("requester_id", "").strip()
        if not requester_id:
            return jsonify({"error": "requester_id is required."}), 400
        try:
            friend_service.reject_request(g.current_user.id, requester_id)
            return jsonify({"message": "Request rejected."}), 200
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 400

    # ------------------------------------------------------------------
    # DELETE /api/friends/<friend_id>
    # ------------------------------------------------------------------

    @bp.route("/<friend_id>", methods=["DELETE"])
    @auth
    def remove_friend(friend_id):
        """Remove an existing friend from both sides."""
        try:
            friend_service.remove_friend(g.current_user.id, friend_id)
            return jsonify({"message": "Friend removed."}), 200
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 400

    # ------------------------------------------------------------------
    # GET /api/friends
    # ------------------------------------------------------------------

    @bp.route("", methods=["GET"])
    @auth
    def get_friends():
        """Return the list of accepted friends with their public info."""
        friends = friend_service.get_friends(g.current_user.id)
        return jsonify([f.to_public_dict() for f in friends]), 200

    # ------------------------------------------------------------------
    # GET /api/friends/requests
    # ------------------------------------------------------------------

    @bp.route("/requests", methods=["GET"])
    @auth
    def get_pending_requests():
        """Return users who have sent a pending request to the current user."""
        requesters = friend_service.get_pending_requests(g.current_user.id)
        return jsonify([r.to_public_dict() for r in requesters]), 200

    # ------------------------------------------------------------------
    # GET /api/friends/feed
    # ------------------------------------------------------------------

    @bp.route("/feed", methods=["GET"])
    @auth
    def get_feed():
        """
        Return a combined chronological feed of all friends' public purchases.
        Each entry includes a `friend_username` field for display.
        """
        feed = friend_service.get_friends_feed(g.current_user.id)
        return jsonify(feed), 200

    return bp
