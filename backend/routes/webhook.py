import os
import stripe
from fastapi import APIRouter, Request, HTTPException, Depends
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from database import get_db
from models import (
    User,
    Space,
    SpaceStatus,
    Transaction,
    TransactionStatus,
    Subscription,
    SubscriptionStatus,
)

router = APIRouter()
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")


@router.post("/stripe")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    if WEBHOOK_SECRET:
        try:
            event = stripe.Webhook.construct_event(payload, sig_header, WEBHOOK_SECRET)
        except stripe.error.SignatureVerificationError:
            raise HTTPException(status_code=400, detail="Invalid signature")
    else:
        # Development fallback — parse raw payload
        import json
        event = json.loads(payload)
        if isinstance(event, dict):
            event = stripe.Event.construct_from(event, stripe.api_key)

    handler = EVENT_HANDLERS.get(event["type"])
    if handler:
        await handler(event, db)

    return {"received": True}


async def handle_invoice_paid(event: stripe.Event, db: Session):
    invoice = event["data"]["object"]
    sub_id = invoice.get("subscription")
    customer_id = invoice.get("customer")
    invoice_id = invoice.get("id")
    payment_intent = invoice.get("payment_intent")
    amount_paid = invoice.get("amount_paid", 0)
    currency = invoice.get("currency", "gbp")
    period_start = invoice.get("period_start")
    period_end = invoice.get("period_end")

    user = db.query(User).filter(User.stripe_customer_id == customer_id).first()
    if not user:
        return

    space = db.query(Space).filter(Space.stripe_subscription_id == sub_id).first()
    if not space:
        return

    tx = Transaction(
        user_id=user.id,
        space_id=space.id,
        amount=amount_paid,
        currency=currency,
        status=TransactionStatus.SUCCESS,
        stripe_invoice_id=invoice_id,
        stripe_payment_intent_id=payment_intent,
        period_start=datetime.fromtimestamp(period_start, tz=timezone.utc) if period_start else None,
        period_end=datetime.fromtimestamp(period_end, tz=timezone.utc) if period_end else None,
    )
    db.add(tx)
    db.commit()


async def handle_subscription_created(event: stripe.Event, db: Session):
    sub = event["data"]["object"]
    sub_id = sub["id"]
    customer_id = sub.get("customer")
    metadata = sub.get("metadata", {})
    space_id_str = metadata.get("space_id")
    user_id_str = metadata.get("user_id")
    price_period = metadata.get("price_period", "month")
    current_period_start = sub.get("current_period_start")
    current_period_end = sub.get("current_period_end")

    user = db.query(User).filter(User.stripe_customer_id == customer_id).first()
    if not user and user_id_str:
        from uuid import UUID
        user = db.query(User).filter(User.id == UUID(user_id_str)).first()
    if not user:
        return

    from uuid import UUID as UUIDType
    space = None
    if space_id_str:
        space = db.query(Space).filter(Space.id == UUIDType(space_id_str)).first()
    if not space:
        space = db.query(Space).filter(Space.stripe_subscription_id == sub_id).first()
    if not space:
        return

    space.status = SpaceStatus.RENTED
    space.current_tenant_id = user.id
    space.stripe_subscription_id = sub_id
    db.commit()

    subscription = Subscription(
        user_id=user.id,
        space_id=space.id,
        stripe_subscription_id=sub_id,
        status=SubscriptionStatus.ACTIVE,
        price_period=price_period,
        current_period_start=(
            datetime.fromtimestamp(current_period_start, tz=timezone.utc)
            if current_period_start else None
        ),
        current_period_end=(
            datetime.fromtimestamp(current_period_end, tz=timezone.utc)
            if current_period_end else None
        ),
    )
    db.add(subscription)
    db.commit()


async def handle_subscription_deleted(event: stripe.Event, db: Session):
    sub = event["data"]["object"]
    sub_id = sub["id"]

    space = db.query(Space).filter(Space.stripe_subscription_id == sub_id).first()
    if space:
        space.status = SpaceStatus.VACANT
        space.current_tenant_id = None
        space.stripe_subscription_id = None
        db.commit()

    subscription = (
        db.query(Subscription)
        .filter(Subscription.stripe_subscription_id == sub_id)
        .first()
    )
    if subscription:
        subscription.status = SubscriptionStatus.CANCELED
        subscription.canceled_at = datetime.now(timezone.utc)
        db.commit()


async def handle_subscription_updated(event: stripe.Event, db: Session):
    sub = event["data"]["object"]
    sub_id = sub["id"]
    status = sub.get("status")
    cancel_at_period_end = sub.get("cancel_at_period_end", False)

    subscription = (
        db.query(Subscription)
        .filter(Subscription.stripe_subscription_id == sub_id)
        .first()
    )
    if subscription:
        current_period_start = sub.get("current_period_start")
        current_period_end = sub.get("current_period_end")

        if cancel_at_period_end:
            subscription.status = SubscriptionStatus.CANCELED
        elif status == "past_due":
            subscription.status = SubscriptionStatus.PAST_DUE
        elif status == "active":
            subscription.status = SubscriptionStatus.ACTIVE

        if current_period_start:
            subscription.current_period_start = datetime.fromtimestamp(
                current_period_start, tz=timezone.utc
            )
        if current_period_end:
            subscription.current_period_end = datetime.fromtimestamp(
                current_period_end, tz=timezone.utc
            )
        db.commit()

    space = db.query(Space).filter(Space.stripe_subscription_id == sub_id).first()
    if space and cancel_at_period_end:
        pass


EVENT_HANDLERS = {
    "invoice.paid": handle_invoice_paid,
    "customer.subscription.created": handle_subscription_created,
    "customer.subscription.deleted": handle_subscription_deleted,
    "customer.subscription.updated": handle_subscription_updated,
}
