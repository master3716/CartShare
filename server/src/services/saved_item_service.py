from src.models.saved_item import SavedItem
from src.repositories.saved_item_repository import SavedItemRepository
from src.repositories.purchase_repository import PurchaseRepository


class SavedItemService:
    def __init__(self, saved_item_repo: SavedItemRepository, purchase_repo):
        self._repo = saved_item_repo
        self._purchase_repo = purchase_repo

    def save_item(self, user_id: str, purchase_id: str, category: str) -> SavedItem:
        if not category or not category.strip():
            raise ValueError("category is required.")
        purchase = self._purchase_repo.find_by_id(purchase_id)
        if not purchase:
            raise ValueError("Purchase not found.")
        if purchase.user_id == user_id:
            raise ValueError("You cannot save your own purchase to a collection.")
        if self._repo.already_saved(user_id, purchase_id):
            raise ValueError("You have already saved this item.")
        item = SavedItem(user_id=user_id, purchase_id=purchase_id, category=category.strip())
        return self._repo.save(item)

    def get_saved_items(self, user_id: str) -> list[dict]:
        saved = self._repo.find_by_user_id(user_id)
        result = []
        for s in saved:
            purchase = self._purchase_repo.find_by_id(s.purchase_id)
            if purchase:
                d = s.to_dict()
                d["purchase"] = purchase.to_dict()
                result.append(d)
        return result

    def get_categories(self, user_id: str) -> list[str]:
        saved = self._repo.find_by_user_id(user_id)
        return sorted(set(s.category for s in saved))

    def delete_saved_item(self, item_id: str, user_id: str) -> None:
        item = self._repo.find_by_id(item_id)
        if not item:
            raise ValueError("Saved item not found.")
        if item.user_id != user_id:
            raise ValueError("You do not own this saved item.")
        self._repo.delete(item_id)
