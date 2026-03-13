"""
services/purchase_service.py
------------------------------
Business logic for adding, listing, and managing purchases.

SOLID – Single Responsibility:
  Only contains purchase-domain rules. Does not know about HTTP or files.

SOLID – Dependency Inversion:
  Receives PurchaseRepository via constructor injection.
"""

from src.models.purchase import Purchase
from src.repositories.purchase_repository import PurchaseRepository


# Valid values for the `platform` field.  Any value outside this set is
# rejected so we never store garbage data.
VALID_PLATFORMS = {"amazon", "aliexpress", "temu", "shein"}


class PurchaseService:
    """Create, read, update, and delete purchases."""

    def __init__(self, purchase_repo: PurchaseRepository):
        self._purchase_repo = purchase_repo

    # ------------------------------------------------------------------
    # Add a purchase
    # ------------------------------------------------------------------

    def add_purchase(
        self,
        user_id: str,
        item_name: str,
        product_url: str,
        platform: str,
        price: str = "",
        currency: str = "",
        image_url: str = "",
        notes: str = "",
        is_public: bool = True,
    ) -> Purchase:
        """
        Validate the incoming data and persist a new purchase.

        The `user_id` comes from the authenticated request (set by middleware),
        NOT from the request body, so a user can never add items for someone
        else.

        Raises ValueError for bad input.
        """
        # Input validation – these are the minimum required fields.
        if not item_name or not item_name.strip():
            raise ValueError("item_name is required.")
        if not product_url or not product_url.strip():
            raise ValueError("product_url is required.")
        platform = platform.lower()
        if platform not in VALID_PLATFORMS:
            raise ValueError(
                f"platform must be one of: {', '.join(VALID_PLATFORMS)}"
            )

        purchase = Purchase(
            user_id=user_id,
            item_name=item_name.strip(),
            product_url=product_url.strip(),
            platform=platform,
            price=price,
            currency=currency,
            image_url=image_url,
            notes=notes,
            is_public=is_public,
        )
        return self._purchase_repo.save(purchase)

    # ------------------------------------------------------------------
    # Read
    # ------------------------------------------------------------------

    def get_purchase_by_id(self, purchase_id: str):
        return self._purchase_repo.find_by_id(purchase_id)

    def get_my_purchases(self, user_id: str) -> list[Purchase]:
        """Return ALL purchases (public + private) for the authenticated user."""
        return self._purchase_repo.find_by_user_id(user_id)

    def get_public_purchases_for_user(self, user_id: str) -> list[Purchase]:
        """
        Return only the PUBLIC purchases for a given user.
        Called when viewing another user's profile.
        """
        return self._purchase_repo.find_public_by_user_id(user_id)

    # ------------------------------------------------------------------
    # Update
    # ------------------------------------------------------------------

    def toggle_visibility(self, purchase_id: str, user_id: str) -> Purchase:
        """
        Flip the is_public flag on a purchase.

        We verify that `user_id` owns the purchase to prevent one user from
        toggling another user's item.

        Returns the updated Purchase.
        Raises ValueError if not found or not owned by this user.
        """
        purchase = self._purchase_repo.find_by_id(purchase_id)
        if not purchase:
            raise ValueError("Purchase not found.")
        if purchase.user_id != user_id:
            raise ValueError("You do not own this purchase.")

        purchase.is_public = not purchase.is_public
        return self._purchase_repo.save(purchase)

    # ------------------------------------------------------------------
    # Delete
    # ------------------------------------------------------------------

    def increment_click(self, purchase_id: str) -> None:
        """Record that someone clicked through to this product."""
        self._purchase_repo.increment_click(purchase_id)

    def mark_also_buying(self, purchase_id: str, user_id: str) -> Purchase:
        """Add user to also_buying list — signals they are buying this too."""
        purchase = self._purchase_repo.find_by_id(purchase_id)
        if not purchase:
            raise ValueError("Purchase not found.")
        if user_id in purchase.also_buying:
            raise ValueError("You already marked this.")
        purchase.also_buying.append(user_id)
        return self._purchase_repo.save(purchase)

    def unmark_also_buying(self, purchase_id: str, user_id: str) -> Purchase:
        """Remove user from also_buying list."""
        purchase = self._purchase_repo.find_by_id(purchase_id)
        if not purchase:
            raise ValueError("Purchase not found.")
        if user_id not in purchase.also_buying:
            raise ValueError("You have not marked this.")
        purchase.also_buying.remove(user_id)
        return self._purchase_repo.save(purchase)

    def delete_purchase(self, purchase_id: str, user_id: str) -> None:
        """
        Delete a purchase.  Verifies ownership first.
        Raises ValueError if not found or not owned by this user.
        """
        purchase = self._purchase_repo.find_by_id(purchase_id)
        if not purchase:
            raise ValueError("Purchase not found.")
        if purchase.user_id != user_id:
            raise ValueError("You do not own this purchase.")

        self._purchase_repo.delete(purchase_id)
