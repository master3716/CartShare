"""
routes/purchase_routes.py
--------------------------
HTTP handlers for purchase management.

POST   /api/purchases                        – add a new purchase (auth)
GET    /api/purchases                        – get MY purchases (auth)
DELETE /api/purchases/<id>                   – delete a purchase (auth)
PATCH  /api/purchases/<id>/visibility        – toggle public/private (auth)
GET    /api/purchases/user/<username>        – get a user's PUBLIC purchases (no auth)
"""

from flask import Blueprint, request, jsonify, g
from src.services.purchase_service import PurchaseService
from src.services.user_service import UserService
from src.middleware.auth_middleware import require_auth


def create_purchase_blueprint(
    purchase_service: PurchaseService,
    user_service: UserService,
    user_repo,
) -> Blueprint:
    bp = Blueprint("purchases", __name__)
    auth = require_auth(user_repo)

    # ------------------------------------------------------------------
    # POST /api/purchases  – add a new purchase
    # ------------------------------------------------------------------

    @bp.route("", methods=["POST"])
    @auth
    def add_purchase():
        """
        Add an item to the authenticated user's list.

        Expected JSON body:
        {
          "item_name":   "...",
          "product_url": "https://...",
          "platform":    "amazon" | "aliexpress",
          "price":       "$19.99",       // optional
          "currency":    "USD",          // optional
          "image_url":   "https://...",  // optional
          "notes":       "...",          // optional
          "is_public":   true            // optional, default true
        }

        The user_id is taken from g.current_user (set by auth middleware),
        NOT from the request body, preventing impersonation.
        """
        data = request.get_json(silent=True) or {}
        try:
            purchase = purchase_service.add_purchase(
                user_id=g.current_user.id,
                item_name=data.get("item_name", ""),
                product_url=data.get("product_url", ""),
                platform=data.get("platform", ""),
                price=data.get("price", ""),
                currency=data.get("currency", ""),
                image_url=data.get("image_url", ""),
                notes=data.get("notes", ""),
                is_public=data.get("is_public", True),
            )
            return jsonify(purchase.to_dict()), 201
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 400

    # ------------------------------------------------------------------
    # GET /api/purchases  – list MY purchases
    # ------------------------------------------------------------------

    @bp.route("", methods=["GET"])
    @auth
    def get_my_purchases():
        """
        Return all purchases (public + private) for the logged-in user.
        Private items are only visible to the owner.
        """
        purchases = purchase_service.get_my_purchases(g.current_user.id)
        return jsonify([p.to_dict() for p in purchases]), 200

    # ------------------------------------------------------------------
    # DELETE /api/purchases/<id>
    # ------------------------------------------------------------------

    @bp.route("/<purchase_id>", methods=["DELETE"])
    @auth
    def delete_purchase(purchase_id):
        """Delete a specific purchase. Only the owner can do this."""
        try:
            purchase_service.delete_purchase(purchase_id, g.current_user.id)
            return jsonify({"message": "Purchase deleted."}), 200
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 400

    # ------------------------------------------------------------------
    # PATCH /api/purchases/<id>/visibility
    # ------------------------------------------------------------------

    @bp.route("/<purchase_id>/visibility", methods=["PATCH"])
    @auth
    def toggle_visibility(purchase_id):
        """Toggle a purchase between public and private."""
        try:
            purchase = purchase_service.toggle_visibility(
                purchase_id, g.current_user.id
            )
            return jsonify(purchase.to_dict()), 200
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 400

    # ------------------------------------------------------------------
    # POST /api/purchases/<id>/click  – record a click-through
    # ------------------------------------------------------------------

    @bp.route("/<purchase_id>/click", methods=["POST"])
    def click_purchase(purchase_id):
        """Increment the click counter. No auth required."""
        purchase_service.increment_click(purchase_id)
        return jsonify({"message": "ok"}), 200

    # ------------------------------------------------------------------
    # GET /api/purchases/user/<username>  – public profile purchases
    # ------------------------------------------------------------------

    @bp.route("/user/<username>", methods=["GET"])
    def get_user_purchases(username):
        """
        Return the PUBLIC purchases for any user by username.
        No authentication required — this is the shareable link endpoint.
        """
        try:
            user = user_service.get_by_username(username)
            purchases = purchase_service.get_public_purchases_for_user(user.id)
            return jsonify([p.to_dict() for p in purchases]), 200
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 404

    return bp
