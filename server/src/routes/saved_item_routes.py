from flask import Blueprint, request, jsonify, g
from src.services.saved_item_service import SavedItemService
from src.middleware.auth_middleware import require_auth


def create_saved_item_blueprint(saved_item_service: SavedItemService, user_repo) -> Blueprint:
    bp = Blueprint("saved_items", __name__)
    auth = require_auth(user_repo)

    @bp.route("", methods=["POST"])
    @auth
    def save_item():
        data = request.get_json(silent=True) or {}
        try:
            item = saved_item_service.save_item(
                user_id=g.current_user.id,
                purchase_id=data.get("purchase_id", ""),
                category=data.get("category", ""),
            )
            return jsonify(item.to_dict()), 201
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 400

    @bp.route("", methods=["GET"])
    @auth
    def get_saved_items():
        items = saved_item_service.get_saved_items(g.current_user.id)
        return jsonify(items), 200

    @bp.route("/categories", methods=["GET"])
    @auth
    def get_categories():
        cats = saved_item_service.get_categories(g.current_user.id)
        return jsonify(cats), 200

    @bp.route("/<item_id>", methods=["DELETE"])
    @auth
    def delete_saved_item(item_id):
        try:
            saved_item_service.delete_saved_item(item_id, g.current_user.id)
            return jsonify({"message": "Removed from collection."}), 200
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 400

    return bp
