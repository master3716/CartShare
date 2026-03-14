from src.models.notification import Notification
from src.repositories.notification_repository import NotificationRepository


class NotificationService:
    def __init__(self, notification_repo: NotificationRepository):
        self._repo = notification_repo

    def create_notification(
        self,
        recipient_id: str,
        notif_type: str,
        from_user_id: str,
        from_username: str,
        from_avatar_url: str = "",
        purchase_id: str = "",
        item_name: str = "",
    ) -> Notification:
        notification = Notification(
            recipient_id=recipient_id,
            type=notif_type,
            from_user_id=from_user_id,
            from_username=from_username,
            from_avatar_url=from_avatar_url,
            purchase_id=purchase_id,
            item_name=item_name,
        )
        return self._repo.save(notification)

    def get_notifications(self, user_id: str) -> list[Notification]:
        return self._repo.find_by_recipient_id(user_id)

    def get_unread_count(self, user_id: str) -> int:
        return sum(1 for n in self._repo.find_by_recipient_id(user_id) if not n.read)

    def mark_read(self, notification_id: str, user_id: str) -> Notification:
        notif = self._repo.find_by_id(notification_id)
        if not notif:
            raise ValueError("Notification not found.")
        if notif.recipient_id != user_id:
            raise ValueError("Access denied.")
        notif.read = True
        return self._repo.save(notif)

    def mark_all_read(self, user_id: str) -> None:
        self._repo.mark_all_read(user_id)
