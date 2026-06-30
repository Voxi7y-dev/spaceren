import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Integer, Boolean, DateTime, ForeignKey, Text, Enum as SAEnum, ARRAY
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from database import Base
import enum


class SpaceStatus(str, enum.Enum):
    VACANT = "vacant"
    RENTED = "rented"


class TransactionStatus(str, enum.Enum):
    PENDING = "pending"
    SUCCESS = "success"
    FAILED = "failed"


class SubscriptionStatus(str, enum.Enum):
    ACTIVE = "active"
    CANCELED = "canceled"
    PAST_DUE = "past_due"
    INCOMPLETE = "incomplete"


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=True)
    google_id = Column(String(255), unique=True, nullable=True)
    display_name = Column(String(255), nullable=True)
    stripe_customer_id = Column(String(255), unique=True, nullable=True)
    is_admin = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    rented_spaces = relationship("Space", back_populates="tenant")
    transactions = relationship("Transaction", back_populates="user")
    subscriptions = relationship("Subscription", back_populates="user")


class Space(Base):
    __tablename__ = "spaces"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    status = Column(SAEnum(SpaceStatus), default=SpaceStatus.VACANT)
    current_tenant_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    stripe_subscription_id = Column(String(255), unique=True, nullable=True)
    description = Column(Text, nullable=True)
    media_urls = Column(ARRAY(Text), default=[])
    custom_metadata = Column(JSONB, default={})
    price_per_month = Column(Integer, default=100)
    price_per_year = Column(Integer, default=1200)
    stripe_price_id_month = Column(String(255), nullable=True)
    stripe_price_id_year = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    tenant = relationship("User", back_populates="rented_spaces")
    transactions = relationship("Transaction", back_populates="space")


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    space_id = Column(UUID(as_uuid=True), ForeignKey("spaces.id"), nullable=False)
    amount = Column(Integer, nullable=False)
    currency = Column(String(3), default="gbp")
    status = Column(SAEnum(TransactionStatus), default=TransactionStatus.PENDING)
    stripe_invoice_id = Column(String(255), nullable=True)
    stripe_payment_intent_id = Column(String(255), nullable=True)
    period_start = Column(DateTime(timezone=True), nullable=True)
    period_end = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="transactions")
    space = relationship("Space", back_populates="transactions")


class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    space_id = Column(UUID(as_uuid=True), ForeignKey("spaces.id"), nullable=False)
    stripe_subscription_id = Column(String(255), unique=True, nullable=False)
    status = Column(SAEnum(SubscriptionStatus), default=SubscriptionStatus.ACTIVE)
    price_period = Column(String(10), default="month")
    current_period_start = Column(DateTime(timezone=True), nullable=True)
    current_period_end = Column(DateTime(timezone=True), nullable=True)
    canceled_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="subscriptions")
    space = relationship("Space")
