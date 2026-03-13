from src.models.comment import Comment
from src.repositories.comment_repository import CommentRepository


class CommentService:
    def __init__(self, comment_repo: CommentRepository):
        self._repo = comment_repo

    def add_comment(self, purchase_id: str, user_id: str, username: str, text: str, avatar_url: str = "") -> Comment:
        if not text or not text.strip():
            raise ValueError("Comment text is required.")
        if len(text.strip()) > 500:
            raise ValueError("Comment must be 500 characters or less.")
        comment = Comment(purchase_id=purchase_id, user_id=user_id, username=username, text=text.strip(), avatar_url=avatar_url)
        return self._repo.save(comment)

    def get_comments(self, purchase_id: str) -> list[Comment]:
        return self._repo.find_by_purchase_id(purchase_id)

    def delete_comment(self, comment_id: str, user_id: str) -> None:
        comment = self._repo.find_by_id(comment_id)
        if not comment:
            raise ValueError("Comment not found.")
        if comment.user_id != user_id:
            raise ValueError("You do not own this comment.")
        self._repo.delete(comment_id)
