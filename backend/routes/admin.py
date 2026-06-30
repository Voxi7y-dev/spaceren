from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import User, Space, SpaceStatus, Subscription, SubscriptionStatus, Transaction
from schemas import AdminDashboard, TransactionResponse
from auth_utils import require_admin

router = APIRouter()


@router.get("/dashboard", response_model=AdminDashboard)
def get_admin_dashboard(admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    total_users = db.query(User).count()
    active_subs = (
        db.query(Subscription)
        .filter(Subscription.status == SubscriptionStatus.ACTIVE)
        .count()
    )
    total_spaces = db.query(Space).count()
    occupied = db.query(Space).filter(Space.status == SpaceStatus.RENTED).count()
    vacant = total_spaces - occupied

    recent_txs = (
        db.query(Transaction)
        .order_by(Transaction.created_at.desc())
        .limit(20)
        .all()
    )

    # MRR: sum of all active monthly subscriptions + yearly/12
    monthly_subs = (
        db.query(Subscription)
        .filter(
            Subscription.status == SubscriptionStatus.ACTIVE,
            Subscription.price_period == "month",
        )
        .count()
    )
    yearly_subs = (
        db.query(Subscription)
        .filter(
            Subscription.status == SubscriptionStatus.ACTIVE,
            Subscription.price_period == "year",
        )
        .count()
    )
    mrr = (monthly_subs * 100) + (yearly_subs * 1200 / 12)  # in pence
    mrr_gbp = round(mrr / 100, 2)

    return AdminDashboard(
        total_subscribers=total_users,
        active_subscriptions=active_subs,
        monthly_recurring_revenue=mrr_gbp,
        total_spaces=total_spaces,
        occupied_spaces=occupied,
        vacant_spaces=vacant,
        recent_transactions=[TransactionResponse.model_validate(tx) for tx in recent_txs],
    )
