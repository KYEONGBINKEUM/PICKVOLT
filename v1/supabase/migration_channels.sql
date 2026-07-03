-- Channel subscriptions: user → user follow/subscribe
CREATE TABLE IF NOT EXISTS channel_subscriptions (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  subscriber_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(subscriber_id, channel_id),
  CHECK(subscriber_id != channel_id)
);

-- Additional profile fields for channel feature
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_official BOOLEAN DEFAULT FALSE;

-- RLS
ALTER TABLE channel_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view subscriptions"
  ON channel_subscriptions FOR SELECT
  USING (true);

CREATE POLICY "Users can manage own subscriptions"
  ON channel_subscriptions FOR ALL
  USING (auth.uid() = subscriber_id)
  WITH CHECK (auth.uid() = subscriber_id);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_channel_subscriptions_subscriber ON channel_subscriptions(subscriber_id);
CREATE INDEX IF NOT EXISTS idx_channel_subscriptions_channel   ON channel_subscriptions(channel_id);
