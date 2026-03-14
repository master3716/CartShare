from flask import Blueprint, jsonify, g
from src.services.notification_service import NotificationService
from src.middleware.auth_middleware import require_auth


def create_notification_blueprint(notification_service: NotificationService, user_repo) -> Blueprint:
    bp = Blueprint("notifications", __name__)
    auth = require_auth(user_repo)

    @bp.route("", methods=["GET"])
    @auth
    def get_notifications():
        notifications = notification_service.get_notifications(g.current_user.id)
        return jsonify([n.to_dict() for n in notifications]), 200

    @bp.route("/unread-count", methods=["GET"])
    @auth
    def get_unread_count():
        count = notification_service.get_unread_count(g.current_user.id)
        return jsonify({"count": count}), 200

    @bp.route("/<notification_id>/read", methods=["POST"])
    @auth
    def mark_read(notification_id):
        try:
            notification_service.mark_read(notification_id, g.current_user.id)
            return jsonify({"message": "Marked as read."}), 200
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 400

    @bp.route("/read-all", methods=["POST"])
    @auth
    def mark_all_read():
        notification_service.mark_all_read(g.current_user.id)
        return jsonify({"message": "All notifications marked as read."}), 200

    return bp
