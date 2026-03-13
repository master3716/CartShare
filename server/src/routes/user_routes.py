"""
routes/user_routes.py
----------------------
HTTP handlers for user profile endpoints.

GET /api/users/me          – return the logged-in user's own profile
GET /api/users/<username>  – return any user's PUBLIC profile (no auth needed)
"""

from flask import Blueprint, jsonify, g, request
from src.services.user_service import UserService
from src.middleware.auth_middleware import require_auth


def create_user_blueprint(user_service: UserService, user_repo) -> Blueprint:
    bp = Blueprint("users", __name__)
    auth = require_auth(user_repo)

    # ------------------------------------------------------------------
    # GET /api/users/me
    # ------------------------------------------------------------------

    @bp.route("/me", methods=["GET"])
    @auth
    def get_me():
        """
        Return the full profile of the currently authenticated user.
        The auth decorator populates g.current_user.
        We return to_public_dict() which omits password and token.
        """
        user = g.current_user
        # Also include friendship metadata so the UI can show pending requests.
        data = user.to_public_dict()
        data["email"] = user.email   # own profile includes email
        data["friends_count"] = len(user.friends)
        data["pending_requests_count"] = len(user.friend_requests_received)
        return jsonify(data), 200

    # ------------------------------------------------------------------
    # PATCH /api/users/me/avatar
    # ------------------------------------------------------------------

    @bp.route("/me/avatar", methods=["PATCH"])
    @auth
    def update_avatar():
        """Update the avatar URL for the currently authenticated user."""
        data = request.get_json(silent=True) or {}
        avatar_url = data.get("avatar_url", "")
        try:
            user = user_service.update_avatar(g.current_user.id, avatar_url)
            result = user.to_public_dict()
            result["avatar_url"] = user.avatar_url
            return jsonify(result), 200
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 400

    # ------------------------------------------------------------------
    # GET /api/users/<username>
    # ------------------------------------------------------------------

    @bp.route("/<username>", methods=["GET"])
    def get_user(username):
        """
        Public profile page for any user. No auth required.
        Returns only safe fields (no email, no token).
        """
        try:
            user = user_service.get_by_username(username)
            return jsonify(user.to_public_dict()), 200
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 404

    return bp
