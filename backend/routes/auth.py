import stripe
import os
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models import User
from schemas import UserSignup, UserLogin, GoogleOAuth, UserResponse
from auth_utils import hash_password, verify_password, create_access_token, get_current_user

router = APIRouter()

stripe.api_key = os.getenv("STRIPE_SECRET_KEY")


@router.post("/signup")
def signup(data: UserSignup, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    try:
        customer = stripe.Customer.create(email=data.email, metadata={"source": "spaceren"})
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"Stripe error: {str(e)}")

    user = User(
        email=data.email,
        password_hash=hash_password(data.password),
        display_name=data.email.split("@")[0],
        stripe_customer_id=customer.id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(user.id)
    return {"token": token, "user": UserResponse.model_validate(user)}


@router.post("/login")
def login(data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user or not user.password_hash or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    token = create_access_token(user.id)
    return {"token": token, "user": UserResponse.model_validate(user)}


@router.post("/google")
def google_auth(data: GoogleOAuth, db: Session = Depends(get_db)):
    user = db.query(User).filter(
        (User.google_id == data.google_id) | (User.email == data.email)
    ).first()

    if not user:
        try:
            customer = stripe.Customer.create(
                email=data.email, metadata={"source": "spaceren", "google_id": data.google_id}
            )
        except Exception as e:
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"Stripe error: {str(e)}")

        user = User(
            email=data.email,
            google_id=data.google_id,
            display_name=data.display_name or data.email.split("@")[0],
            stripe_customer_id=customer.id,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    elif not user.google_id:
        user.google_id = data.google_id
        db.commit()
        db.refresh(user)

    token = create_access_token(user.id)
    return {"token": token, "user": UserResponse.model_validate(user)}


@router.get("/me", response_model=UserResponse)
def get_me(user: User = Depends(get_current_user)):
    return user
