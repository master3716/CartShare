from src.models.comment import Comment
from src.repositories.comment_repository import CommentRepository


class CommentService:
    def __init__(self, comment_repo: CommentRepository, notification_service=None, purchase_repo=None):
        self._repo = comment_repo
        self._notification_service = notification_service
        self._purchase_repo = purchase_repo

    def add_comment(self, purchase_id: str, user_id: str, username: str, text: str, avatar_url: str = "") -> Comment:
        if not text or not text.strip():
            raise ValueError("Comment text is required.")
        if len(text.strip()) > 500:
            raise ValueError("Comment must be 500 characters or less.")
        comment = Comment(purchase_id=purchase_id, user_id=user_id, username=username, text=text.strip(), avatar_url=avatar_url)
        self._repo.save(comment)

        if self._notification_service and self._purchase_repo:
            purchase = self._purchase_repo.find_by_id(purchase_id)
            if purchase and purchase.user_id != user_id:
                self._notification_service.create_notification(
                    recipient_id=purchase.user_id,
                    notif_type="comment",
                    from_user_id=user_id,
                    from_username=username,
                    from_avatar_url=avatar_url,
                    purchase_id=purchase_id,
                    item_name=purchase.item_name,
                )

        return comment

    def get_comments(self, purchase_id: str) -> list[Comment]:
        return self._repo.find_by_purchase_id(purchase_id)

    def delete_comment(self, comment_id: str, user_id: str) -> None:
        comment = self._repo.find_by_id(comment_id)
        if not comment:
            raise ValueError("Comment not found.")
        if comment.user_id != user_id:
            raise ValueError("You do not own this comment.")
        self._repo.delete(comment_id)
