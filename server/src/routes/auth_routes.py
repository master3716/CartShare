"""
routes/auth_routes.py
----------------------
HTTP handlers for /api/auth/register, /api/auth/login, /api/auth/logout.

SOLID – Single Responsibility:
  Routes ONLY handle:
    1. Parsing the request body.
    2. Calling the appropriate service method.
    3. Formatting the HTTP response.
  All business logic lives in UserService.

SOLID – Dependency Inversion:
  `create_auth_blueprint` receives the services it needs as parameters
  rather than importing and instantiating them here.

Blueprint pattern
-----------------
Flask Blueprints let us organise routes into separate files (one per
concern) and register them all on the app in app.py. This is the Flask
equivalent of Express routers.
"""

from flask import Blueprint, request, jsonify, g
from src.services.user_service import UserService
from src.middleware.auth_middleware import require_auth


def create_auth_blueprint(user_service: UserService, user_repo) -> Blueprint:
    """
    Build and return the auth Blueprint.

    Parameters
    ----------
    user_service : UserService   – injected; handles registration/login logic
    user_repo                    – injected; needed by the auth decorator
    """
    bp = Blueprint("auth", __name__)

    # Create the auth decorator once.  We reuse it on any route in this
    # blueprint that requires the user to be logged in.
    auth = require_auth(user_repo)

    # ------------------------------------------------------------------
    # POST /api/auth/register
    # ------------------------------------------------------------------

    @bp.route("/register", methods=["POST"])
    def register():
        """
        Register a new account.

        Expected JSON body:
            { "username": "...", "email": "...", "password": "..." }

        Returns 201 Created with the new user's public info on success.
        Returns 400 Bad Request if validation fails.
        """
        data = request.get_json(silent=True) or {}
        username = data.get("username", "").strip()
        email = data.get("email", "").strip()
        password = data.get("password", "")

        # Basic presence checks; the service does deeper validation.
        if not username or not email or not password:
            return jsonify({"error": "username, email, and password are required."}), 400
        if len(password) < 6:
            return jsonify({"error": "Password must be at least 6 characters."}), 400

        try:
            user = user_service.register(username, email, password)
            return jsonify(user.to_public_dict()), 201
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 400

    # ------------------------------------------------------------------
    # POST /api/auth/login
    # ------------------------------------------------------------------

    @bp.route("/login", methods=["POST"])
    def login():
        """
        Log in and receive an auth token.

        Expected JSON body:
            { "email": "...", "password": "..." }

        Returns 200 OK with { "token": "...", "user": { ... } } on success.
        Returns 401 Unauthorized on bad credentials.
        """
        data = request.get_json(silent=True) or {}
        email = data.get("email", "").strip()
        password = data.get("password", "")

        if not email or not password:
            return jsonify({"error": "email and password are required."}), 400

        try:
            token = user_service.login(email, password)
            # Re-fetch the user to get the updated token for public info
            user = user_service.get_by_username(
                user_service._user_repo.find_by_email(email).username
            )
            return jsonify({"token": token, "user": user.to_public_dict()}), 200
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 401

    # ------------------------------------------------------------------
    # POST /api/auth/logout
    # ------------------------------------------------------------------

    @bp.route("/logout", methods=["POST"])
    @auth
    def logout():
        """
        Invalidate the current session token.
        The @auth decorator ensures only logged-in users can call this.
        g.current_user is set by the decorator.
        """
        user_service.logout(g.current_user, g.current_token)
        return jsonify({"message": "Logged out successfully."}), 200

    return bp
