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
    notification_service=None,
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
                categories=data.get("categories") or ([data["category"]] if data.get("category") else []),
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
    # PATCH /api/purchases/<id>/category
    # ------------------------------------------------------------------

    @bp.route("/<purchase_id>/category", methods=["PATCH"])
    @auth
    def update_category(purchase_id):
        """Update the categories of a purchase."""
        data = request.get_json(silent=True) or {}
        purchase = purchase_service.get_purchase_by_id(purchase_id)
        if not purchase:
            return jsonify({"error": "Purchase not found."}), 404
        if purchase.user_id != g.current_user.id:
            return jsonify({"error": "You do not own this purchase."}), 403
        categories = data.get("categories", [])
        if isinstance(categories, list):
            purchase.categories = categories
        updated = purchase_service._purchase_repo.save(purchase)
        return jsonify(updated.to_dict()), 200

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
    # GET /api/purchases/stats?ids=id1,id2,...  – lightweight polling
    # ------------------------------------------------------------------

    @bp.route("/stats", methods=["GET"])
    def get_stats():
        """Return live click_count and also_buying_users for a list of purchase IDs."""
        ids_param = request.args.get("ids", "")
        if not ids_param:
            return jsonify({}), 200
        purchase_ids = [i.strip() for i in ids_param.split(",") if i.strip()][:50]
        result = {}
        for pid in purchase_ids:
            purchase = purchase_service.get_purchase_by_id(pid)
            if purchase:
                also_buying_users = []
                for uid in purchase.also_buying:
                    u = user_repo.find_by_id(uid)
                    if u:
                        also_buying_users.append({"username": u.username, "avatar_url": u.avatar_url, "id": u.id})
                result[pid] = {
                    "click_count": purchase.click_count,
                    "also_buying": purchase.also_buying,
                    "also_buying_users": also_buying_users,
                }
        return jsonify(result), 200

    # ------------------------------------------------------------------
    # POST /api/purchases/<id>/click  – record a click-through
    # ------------------------------------------------------------------

    @bp.route("/<purchase_id>/click", methods=["POST"])
    def click_purchase(purchase_id):
        """Increment the click counter. No auth required."""
        purchase_service.increment_click(purchase_id)
        return jsonify({"message": "ok"}), 200

    # ------------------------------------------------------------------
    # POST /api/purchases/<id>/also-buying  – mark "I'm buying this too"
    # ------------------------------------------------------------------

    @bp.route("/<purchase_id>/also-buying", methods=["POST"])
    @auth
    def mark_also_buying(purchase_id):
        try:
            purchase = purchase_service.mark_also_buying(purchase_id, g.current_user.id)
            if notification_service and purchase.user_id != g.current_user.id:
                notification_service.create_notification(
                    recipient_id=purchase.user_id,
                    notif_type="me_too",
                    from_user_id=g.current_user.id,
                    from_username=g.current_user.username,
                    from_avatar_url=g.current_user.avatar_url,
                    purchase_id=purchase_id,
                    item_name=purchase.item_name,
                )
            return jsonify(purchase.to_dict()), 200
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 400

    # ------------------------------------------------------------------
    # DELETE /api/purchases/<id>/also-buying  – unmark
    # ------------------------------------------------------------------

    @bp.route("/<purchase_id>/also-buying", methods=["DELETE"])
    @auth
    def unmark_also_buying(purchase_id):
        try:
            purchase = purchase_service.unmark_also_buying(purchase_id, g.current_user.id)
            return jsonify(purchase.to_dict()), 200
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 400

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
