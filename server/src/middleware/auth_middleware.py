"""
middleware/auth_middleware.py
------------------------------
Flask decorator that protects routes requiring authentication.

How it works
------------
The client (extension or website) sends the token it received at login
inside the `Authorization` HTTP header:

    Authorization: Bearer <token>

The decorator reads that header, looks up the token in the file, and if
found attaches the matching User object to Flask's `g` object.
`g` is a per-request context store; anything stored there is available
for the duration of that one request.

Protected route handlers can then access the logged-in user via:

    from flask import g
    current_user = g.current_user

SOLID – Single Responsibility:
  This file ONLY handles token validation and request context setup.
  It does not contain any route logic or business rules.
"""

import functools
from flask import request, jsonify, g
from src.repositories.user_repository import UserRepository


def require_auth(user_repo: UserRepository):
    """
    Factory that returns the actual decorator.

    We use a factory because the decorator needs access to `user_repo`,
    but Python decorators are applied at import time before any repository
    is created.  By wrapping it in a function, we delay the binding until
    the decorator is actually used inside a route blueprint.

    Usage in a route file:
        auth = require_auth(user_repo)   # once, at blueprint creation

        @bp.route("/protected")
        @auth                            # apply to each protected route
        def protected_endpoint():
            user = g.current_user
            ...
    """

    def decorator(f):
        @functools.wraps(f)
        def wrapper(*args, **kwargs):
            # 1. Extract the token from the Authorization header.
            auth_header = request.headers.get("Authorization", "")

            # The header format is "Bearer <token>".
            # We split on the first space and take the second part.
            if not auth_header.startswith("Bearer "):
                return jsonify({"error": "Missing or malformed Authorization header."}), 401

            token = auth_header[len("Bearer "):]

            # 2. Look up which user owns this token.
            user = user_repo.find_by_token(token)
            if not user:
                return jsonify({"error": "Invalid or expired token."}), 401

            # 3. Attach the user and token to the request context.
            g.current_user = user
            g.current_token = token

            # 4. Call the actual route handler.
            return f(*args, **kwargs)

        return wrapper
    return decorator
