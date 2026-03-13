"""
app.py
------
Flask application factory and entry point.

This is the ONLY place where concrete classes are instantiated and wired
together. Everything else works through injected interfaces.

SOLID – Dependency Inversion (the wiring hub):
  1. Create the repositories (they know about the file).
  2. Create the services (inject repositories into them).
  3. Create the route blueprints (inject services into them).
  4. Register the blueprints on the Flask app.

No other file creates a UserRepository, PurchaseRepository, or any service.
When you later swap to a real database, you only change the instantiation
lines here (and add a new repository class) — nothing else needs to change.

CORS (Cross-Origin Resource Sharing)
-------------------------------------
The browser extension and the website run on different origins from the
Flask dev server (localhost:5000). Without CORS headers the browser blocks
their requests. flask-cors adds the required headers to every response.
"""

from flask import Flask
from flask_cors import CORS

from src.config import SERVER_HOST, SERVER_PORT, DATABASE_PATH, MONGO_URI
from src.repositories.user_repository import UserRepository
from src.repositories.purchase_repository import PurchaseRepository
from src.repositories.comment_repository import CommentRepository
from src.repositories.saved_item_repository import SavedItemRepository
from src.services.user_service import UserService
from src.services.purchase_service import PurchaseService
from src.services.friend_service import FriendService
from src.services.comment_service import CommentService
from src.services.saved_item_service import SavedItemService
from src.routes.auth_routes import create_auth_blueprint
from src.routes.user_routes import create_user_blueprint
from src.routes.purchase_routes import create_purchase_blueprint
from src.routes.friend_routes import create_friend_blueprint
from src.routes.comment_routes import create_comment_blueprint
from src.routes.saved_item_routes import create_saved_item_blueprint


def create_app() -> Flask:
    """
    Application factory.

    Returns a fully configured Flask app.  Using a factory (instead of a
    module-level `app = Flask(...)`) makes the app easier to test because
    each test can call create_app() to get a fresh instance.
    """
    app = Flask(__name__)

    # Allow requests from any origin.
    # In production you would restrict this to your domain:
    #   CORS(app, origins=["https://your-website.com"])
    CORS(app)

    # ------------------------------------------------------------------
    # Step 1: instantiate repositories
    # Use MongoDB in production (MONGO_URI set), JSON file locally.
    # ------------------------------------------------------------------
    if MONGO_URI:
        from src.repositories.mongo_user_repository import MongoUserRepository
        from src.repositories.mongo_purchase_repository import MongoPurchaseRepository
        from src.repositories.mongo_comment_repository import MongoCommentRepository
        from src.repositories.mongo_saved_item_repository import MongoSavedItemRepository
        user_repo = MongoUserRepository(MONGO_URI)
        purchase_repo = MongoPurchaseRepository(MONGO_URI)
        comment_repo = MongoCommentRepository(MONGO_URI)
        saved_item_repo = MongoSavedItemRepository(MONGO_URI)
    else:
        user_repo = UserRepository(DATABASE_PATH)
        purchase_repo = PurchaseRepository(DATABASE_PATH)
        comment_repo = CommentRepository(DATABASE_PATH)
        saved_item_repo = SavedItemRepository(DATABASE_PATH)

    # ------------------------------------------------------------------
    # Step 2: instantiate services (business logic layer)
    #         inject the repositories they depend on
    # ------------------------------------------------------------------
    user_service = UserService(user_repo)
    purchase_service = PurchaseService(purchase_repo)
    friend_service = FriendService(user_repo, purchase_repo)
    comment_service = CommentService(comment_repo)
    saved_item_service = SavedItemService(saved_item_repo, purchase_repo)

    # ------------------------------------------------------------------
    # Step 3: create blueprints (HTTP layer)
    #         inject the services they depend on
    # ------------------------------------------------------------------
    auth_bp = create_auth_blueprint(user_service, user_repo)
    user_bp = create_user_blueprint(user_service, user_repo)
    purchase_bp = create_purchase_blueprint(purchase_service, user_service, user_repo)
    friend_bp = create_friend_blueprint(friend_service, user_repo)
    comment_bp = create_comment_blueprint(comment_service, user_repo)
    saved_item_bp = create_saved_item_blueprint(saved_item_service, user_repo)

    # ------------------------------------------------------------------
    # Step 4: register blueprints with URL prefixes
    # ------------------------------------------------------------------
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(user_bp, url_prefix="/api/users")
    app.register_blueprint(purchase_bp, url_prefix="/api/purchases")
    app.register_blueprint(friend_bp, url_prefix="/api/friends")
    app.register_blueprint(comment_bp, url_prefix="/api")
    app.register_blueprint(saved_item_bp, url_prefix="/api/saved-items")

    # ------------------------------------------------------------------
    # Health check – lets the extension verify the server is running
    # ------------------------------------------------------------------
    @app.route("/api/health")
    def health():
        return {"status": "ok"}, 200

    return app


# ------------------------------------------------------------------
# Entry point – run with: python src/app.py
# ------------------------------------------------------------------
if __name__ == "__main__":
    application = create_app()
    print(f"Server running at http://{SERVER_HOST}:{SERVER_PORT}")
    application.run(host=SERVER_HOST, port=SERVER_PORT, debug=True)
