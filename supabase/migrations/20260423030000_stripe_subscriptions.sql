-- Stripe subscriptions for CC products
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  product_slug TEXT NOT NULL,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT UNIQUE,
  stripe_price_id TEXT,
  status TEXT NOT NULL DEFAULT 'incomplete'
    CHECK (status IN ('incomplete','trialing','active','past_due','canceled','unpaid')),
  tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free','pro','team','enterprise')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS subs_user_product_idx ON subscriptions(user_id, product_slug);
CREATE INDEX IF NOT EXISTS subs_stripe_sub_idx ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS subs_status_idx ON subscriptions(status) WHERE status = 'active';
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  payload JSONB NOT NULL,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS webhook_events_type_idx ON stripe_webhook_events(type);
