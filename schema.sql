-- SpaceRent Database Schema
-- PostgreSQL with JSONB and ARRAY support
-- Requires: PostgreSQL 13+

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- USERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),                              -- NULL if using Google OAuth only
    google_id VARCHAR(255) UNIQUE,                           -- NULL if using email/password only
    display_name VARCHAR(255),
    stripe_customer_id VARCHAR(255) UNIQUE,                  -- Stripe Customer object ID
    is_admin BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_stripe_customer ON users(stripe_customer_id);

-- ============================================================
-- SPACES TABLE
-- ============================================================
CREATE TYPE space_status AS ENUM ('vacant', 'rented');

CREATE TABLE IF NOT EXISTS spaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    status space_status NOT NULL DEFAULT 'vacant',
    current_tenant_id UUID REFERENCES users(id) ON DELETE SET NULL,
    stripe_subscription_id VARCHAR(255) UNIQUE,              -- Stripe Subscription object ID
    description TEXT,                                        -- Unrestricted "anything goes" description
    media_urls TEXT[] DEFAULT '{}',                          -- Array of storage URLs for any file type
    custom_metadata JSONB DEFAULT '{}',                      -- Unlimited key-value pairs, any structure
    price_per_month INTEGER NOT NULL DEFAULT 100,            -- £1.00 in pence
    price_per_year INTEGER NOT NULL DEFAULT 1200,            -- £12.00 in pence
    stripe_price_id_month VARCHAR(255),                     -- Stripe Price ID for monthly
    stripe_price_id_year VARCHAR(255),                      -- Stripe Price ID for yearly
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_spaces_status ON spaces(status);
CREATE INDEX idx_spaces_tenant ON spaces(current_tenant_id);
CREATE INDEX idx_spaces_subscription ON spaces(stripe_subscription_id);
CREATE INDEX idx_spaces_metadata ON spaces USING GIN (custom_metadata jsonb_path_ops);

-- ============================================================
-- TRANSACTIONS TABLE
-- ============================================================
CREATE TYPE transaction_status AS ENUM ('success', 'failed', 'pending');

CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,                                 -- Amount in pence (100 = £1, 1200 = £12)
    currency VARCHAR(3) NOT NULL DEFAULT 'gbp',              -- Locked to GBP
    status transaction_status NOT NULL DEFAULT 'pending',
    stripe_invoice_id VARCHAR(255),                          -- Stripe Invoice object ID
    stripe_payment_intent_id VARCHAR(255),                   -- Stripe PaymentIntent object ID
    period_start TIMESTAMPTZ,                                -- Billing period start
    period_end TIMESTAMPTZ,                                  -- Billing period end
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_transactions_user ON transactions(user_id);
CREATE INDEX idx_transactions_space ON transactions(space_id);
CREATE INDEX idx_transactions_stripe_invoice ON transactions(stripe_invoice_id);
CREATE INDEX idx_transactions_created ON transactions(created_at DESC);

-- ============================================================
-- SUBSCRIPTIONS TABLE
-- ============================================================
CREATE TYPE subscription_status AS ENUM ('active', 'canceled', 'past_due', 'incomplete');

CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
    stripe_subscription_id VARCHAR(255) UNIQUE NOT NULL,
    status subscription_status NOT NULL DEFAULT 'active',
    price_period VARCHAR(10) NOT NULL DEFAULT 'month',       -- 'month' or 'year'
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    canceled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_space ON subscriptions(space_id);
CREATE INDEX idx_subscriptions_stripe ON subscriptions(stripe_subscription_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);

-- ============================================================
-- INITIAL SEED SPACES (adjust names as desired)
-- ============================================================
INSERT INTO spaces (name, description, custom_metadata) VALUES
    ('Space Alpha', 'A blank digital canvas. Use it for anything.', '{"type": "digital", "features": ["unlimited-storage", "any-format"]}'),
    ('Space Beta', 'Your personal corner of the cloud.', '{"type": "digital", "features": ["backup", "archive"]}'),
    ('Space Gamma', 'A conceptual pocket dimension for your ideas.', '{"type": "conceptual", "features": ["creative", "unstructured"]}'),
    ('Space Delta', 'Physical storage proxy — track real-world items.', '{"type": "physical-proxy", "features": ["inventory", "tracking"]}'),
    ('Space Epsilon', 'Host anything digital — files, logs, or dreams.', '{"type": "digital", "features": ["hosting", "any-file-type"]}'),
    ('Space Zeta', 'The everything space. No rules, no limits.', '{"type": "mixed", "features": ["unlimited", "anything"]}')
ON CONFLICT DO NOTHING;
