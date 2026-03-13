from flask import Blueprint, request, jsonify, g
from src.services.comment_service import CommentService
from src.middleware.auth_middleware import require_auth


def create_comment_blueprint(comment_service: CommentService, user_repo) -> Blueprint:
    bp = Blueprint("comments", __name__)
    auth = require_auth(user_repo)

    @bp.route("/purchases/<purchase_id>/comments", methods=["GET"])
    def get_comments(purchase_id):
        comments = comment_service.get_comments(purchase_id)
        return jsonify([c.to_dict() for c in comments]), 200

    @bp.route("/purchases/<purchase_id>/comments", methods=["POST"])
    @auth
    def add_comment(purchase_id):
        data = request.get_json(silent=True) or {}
        try:
            comment = comment_service.add_comment(
                purchase_id=purchase_id,
                user_id=g.current_user.id,
                username=g.current_user.username,
                text=data.get("text", ""),
                avatar_url=g.current_user.avatar_url,
            )
            return jsonify(comment.to_dict()), 201
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 400

    @bp.route("/comments/<comment_id>", methods=["DELETE"])
    @auth
    def delete_comment(comment_id):
        try:
            comment_service.delete_comment(comment_id, g.current_user.id)
            return jsonify({"message": "Comment deleted."}), 200
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 400

    return bp
