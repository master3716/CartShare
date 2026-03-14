from flask import Blueprint, request, jsonify, g
from src.services.collection_service import CollectionService
from src.middleware.auth_middleware import require_auth


def create_collection_blueprint(collection_service: CollectionService, user_repo) -> Blueprint:
    bp = Blueprint("collections", __name__)
    auth = require_auth(user_repo)

    @bp.route("", methods=["POST"])
    @auth
    def create_collection():
        data = request.get_json(silent=True) or {}
        try:
            collection = collection_service.create(g.current_user.id, data.get("name", ""))
            return jsonify(collection.to_dict()), 201
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 400

    @bp.route("", methods=["GET"])
    @auth
    def get_my_collections():
        collections = collection_service.get_mine(g.current_user.id)
        return jsonify(collections), 200

    @bp.route("/<collection_id>", methods=["GET"])
    @auth
    def get_collection(collection_id):
        try:
            collection = collection_service.get_by_id(collection_id, g.current_user.id)
            return jsonify(collection), 200
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 400

    @bp.route("/<collection_id>", methods=["DELETE"])
    @auth
    def delete_collection(collection_id):
        try:
            collection_service.delete(collection_id, g.current_user.id)
            return jsonify({"message": "Collection deleted."}), 200
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 400

    @bp.route("/<collection_id>/members", methods=["POST"])
    @auth
    def invite_member(collection_id):
        data = request.get_json(silent=True) or {}
        try:
            collection_service.invite_member(collection_id, g.current_user.id, data.get("username", ""))
            return jsonify({"message": "Member invited."}), 200
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 400

    @bp.route("/<collection_id>/members/leave", methods=["POST"])
    @auth
    def leave_collection(collection_id):
        try:
            collection_service.leave(collection_id, g.current_user.id)
            return jsonify({"message": "Left collection."}), 200
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 400

    @bp.route("/<collection_id>/members/<member_id>", methods=["DELETE"])
    @auth
    def remove_member(collection_id, member_id):
        try:
            collection_service.remove_member(collection_id, g.current_user.id, member_id)
            return jsonify({"message": "Member removed."}), 200
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 400

    @bp.route("/<collection_id>/items", methods=["POST"])
    @auth
    def add_item(collection_id):
        data = request.get_json(silent=True) or {}
        try:
            result = collection_service.add_item(collection_id, g.current_user.id, data.get("purchase_id", ""))
            msg = "Item submitted for owner approval." if result["pending"] else "Item added."
            return jsonify({"message": msg, "pending": result["pending"]}), 200
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 400

    @bp.route("/<collection_id>/items/<purchase_id>", methods=["DELETE"])
    @auth
    def remove_item(collection_id, purchase_id):
        try:
            collection_service.remove_item(collection_id, g.current_user.id, purchase_id)
            return jsonify({"message": "Item removed."}), 200
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 400

    @bp.route("/<collection_id>/approval", methods=["PATCH"])
    @auth
    def toggle_approval(collection_id):
        try:
            now_required = collection_service.toggle_requires_approval(collection_id, g.current_user.id)
            return jsonify({"requires_approval": now_required}), 200
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 400

    @bp.route("/<collection_id>/pending/<purchase_id>/approve", methods=["POST"])
    @auth
    def approve_item(collection_id, purchase_id):
        try:
            collection_service.approve_item(collection_id, g.current_user.id, purchase_id)
            return jsonify({"message": "Item approved."}), 200
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 400

    @bp.route("/<collection_id>/pending/<purchase_id>", methods=["DELETE"])
    @auth
    def reject_item(collection_id, purchase_id):
        try:
            collection_service.reject_item(collection_id, g.current_user.id, purchase_id)
            return jsonify({"message": "Item rejected."}), 200
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 400

    return bp
