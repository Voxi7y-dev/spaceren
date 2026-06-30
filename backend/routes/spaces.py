import os
import stripe
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import update
from typing import Optional
from uuid import UUID
from database import get_db
from models import User, Space, SpaceStatus
from schemas import SpaceResponse, SpaceCustomize, CheckoutRequest, CheckoutResponse
from auth_utils import get_current_user

router = APIRouter()
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

# In production, configure these in Stripe Dashboard and set in .env
STRIPE_PRICE_ID_MONTH = os.getenv("STRIPE_PRICE_ID_MONTH")
STRIPE_PRICE_ID_YEAR = os.getenv("STRIPE_PRICE_ID_YEAR")


@router.get("/", response_model=list[SpaceResponse])
def list_spaces(db: Session = Depends(get_db)):
    spaces = db.query(Space).all()
    return spaces


@router.get("/{space_id}", response_model=SpaceResponse)
def get_space(space_id: UUID, db: Session = Depends(get_db)):
    space = db.query(Space).filter(Space.id == space_id).first()
    if not space:
        raise HTTPException(status_code=404, detail="Space not found")
    return space


@router.post("/checkout", response_model=CheckoutResponse)
def create_checkout(
    data: CheckoutRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if data.price_period not in ("month", "year"):
        raise HTTPException(status_code=400, detail="price_period must be 'month' or 'year'")

    # Atomic row-lock to prevent race conditions on the space
    space = (
        db.query(Space)
        .filter(Space.id == data.space_id)
        .with_for_update()
        .first()
    )
    if not space:
        raise HTTPException(status_code=404, detail="Space not found")
    if space.status == SpaceStatus.RENTED:
        raise HTTPException(status_code=409, detail="Space is already rented")

    price_id = None
    if data.price_period == "month":
        price_id = STRIPE_PRICE_ID_MONTH or space.stripe_price_id_month
        unit_amount = 100  # £1.00
    else:
        price_id = STRIPE_PRICE_ID_YEAR or space.stripe_price_id_year
        unit_amount = 1200  # £12.00

    if not price_id:
        # Create Stripe price on-the-fly (idempotent if same product/currency/amount)
        product = stripe.Product.create(name=f"Space: {space.name}")
        price = stripe.Price.create(
            product=product.id,
            unit_amount=unit_amount,
            currency="gbp",
            recurring={"interval": data.price_period},
        )
        price_id = price.id
        if data.price_period == "month":
            space.stripe_price_id_month = price_id
        else:
            space.stripe_price_id_year = price_id
        db.commit()

    try:
        checkout_session = stripe.checkout.Session.create(
            customer=user.stripe_customer_id,
            mode="subscription",
            line_items=[{"price": price_id, "quantity": 1}],
            subscription_data={
                "metadata": {
                    "space_id": str(space.id),
                    "user_id": str(user.id),
                    "price_period": data.price_period,
                },
            },
            metadata={
                "space_id": str(space.id),
                "user_id": str(user.id),
            },
            success_url=f"{FRONTEND_URL}/dashboard?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{FRONTEND_URL}/spaces",
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Stripe error: {str(e)}")

    return CheckoutResponse(url=checkout_session.url)


@router.put("/{space_id}/customize", response_model=SpaceResponse)
def customize_space(
    space_id: UUID,
    data: SpaceCustomize,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    space = db.query(Space).filter(Space.id == space_id).first()
    if not space:
        raise HTTPException(status_code=404, detail="Space not found")
    if space.current_tenant_id != user.id:
        raise HTTPException(status_code=403, detail="You do not occupy this space")

    if data.description is not None:
        space.description = data.description
    if data.media_urls is not None:
        space.media_urls = data.media_urls
    if data.custom_metadata is not None:
        space.custom_metadata = data.custom_metadata

    db.commit()
    db.refresh(space)
    return space


@router.post("/{space_id}/upload")
async def upload_media(
    space_id: UUID,
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    space = db.query(Space).filter(Space.id == space_id).first()
    if not space:
        raise HTTPException(status_code=404, detail="Space not found")
    if space.current_tenant_id != user.id:
        raise HTTPException(status_code=403, detail="You do not occupy this space")

    import boto3
    from botocore.config import Config as BotoConfig

    storage_region = os.getenv("STORAGE_REGION")
    storage_bucket = os.getenv("STORAGE_BUCKET")
    storage_access_key = os.getenv("STORAGE_ACCESS_KEY")
    storage_secret_key = os.getenv("STORAGE_SECRET_KEY")
    storage_endpoint = os.getenv("STORAGE_ENDPOINT")

    session = boto3.Session(
        aws_access_key_id=storage_access_key,
        aws_secret_access_key=storage_secret_key,
        region_name=storage_region,
    )
    client = session.client(
        "s3",
        endpoint_url=storage_endpoint,
        config=BotoConfig(signature_version="s3v4"),
    )

    ext = file.filename.rsplit(".", 1)[-1] if "." in file.filename else "bin"
    key = f"spaces/{space_id}/{uuid.uuid4()}.{ext}"

    content = await file.read()
    client.put_object(Bucket=storage_bucket, Key=key, Body=content, ContentType=file.content_type or "application/octet-stream")

    url = f"{storage_endpoint}/{storage_bucket}/{key}" if storage_endpoint else f"https://{storage_bucket}.s3.{storage_region}.amazonaws.com/{key}"
    space.media_urls = space.media_urls + [url]
    db.commit()

    return {"url": url, "media_urls": space.media_urls}


@router.post("/{space_id}/cancel")
def cancel_subscription(
    space_id: UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from models import Subscription, SubscriptionStatus

    space = db.query(Space).filter(Space.id == space_id).first()
    if not space:
        raise HTTPException(status_code=404, detail="Space not found")
    if space.current_tenant_id != user.id:
        raise HTTPException(status_code=403, detail="You do not occupy this space")
    if not space.stripe_subscription_id:
        raise HTTPException(status_code=400, detail="No active subscription")

    try:
        stripe.Subscription.modify(space.stripe_subscription_id, cancel_at_period_end=True)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Stripe error: {str(e)}")

    sub = (
        db.query(Subscription)
        .filter(Subscription.stripe_subscription_id == space.stripe_subscription_id)
        .first()
    )
    if sub:
        sub.status = SubscriptionStatus.CANCELED
        db.commit()

    return {"message": "Subscription will be canceled at period end"}
