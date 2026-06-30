from pydantic import BaseModel, EmailStr
from typing import Optional, Any
from uuid import UUID
from datetime import datetime


class UserSignup(BaseModel):
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class GoogleOAuth(BaseModel):
    google_id: str
    email: EmailStr
    display_name: Optional[str] = None

class UserResponse(BaseModel):
    id: UUID
    email: str
    display_name: Optional[str]
    stripe_customer_id: Optional[str]
    is_admin: bool
    created_at: datetime

    class Config:
        from_attributes = True

class SpaceResponse(BaseModel):
    id: UUID
    name: str
    status: str
    current_tenant_id: Optional[UUID]
    description: Optional[str]
    media_urls: list[str]
    custom_metadata: Any
    price_per_month: int
    price_per_year: int
    created_at: datetime

    class Config:
        from_attributes = True

class SpaceCustomize(BaseModel):
    description: Optional[str] = None
    media_urls: Optional[list[str]] = None
    custom_metadata: Optional[Any] = None

class CheckoutRequest(BaseModel):
    space_id: UUID
    price_period: str  # "month" or "year"

class CheckoutResponse(BaseModel):
    url: str

class TransactionResponse(BaseModel):
    id: UUID
    user_id: UUID
    space_id: UUID
    amount: int
    currency: str
    status: str
    stripe_invoice_id: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

class SubscriptionResponse(BaseModel):
    id: UUID
    space_id: UUID
    status: str
    price_period: str
    current_period_start: Optional[datetime]
    current_period_end: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True

class AdminDashboard(BaseModel):
    total_subscribers: int
    active_subscriptions: int
    monthly_recurring_revenue: float
    total_spaces: int
    occupied_spaces: int
    vacant_spaces: int
    recent_transactions: list[TransactionResponse]
