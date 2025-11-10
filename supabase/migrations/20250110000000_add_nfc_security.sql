CREATE TABLE IF NOT EXISTS nfc_tags (
  uid TEXT PRIMARY KEY,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  branch_number INTEGER,
  issued_at TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_nfc_tags_uid ON nfc_tags(uid);

ALTER TABLE businesses ADD COLUMN IF NOT EXISTS encryption_key TEXT;

CREATE TABLE IF NOT EXISTS stamp_collection_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  tag_uid TEXT,
  collected_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stamp_log_user_business_time ON stamp_collection_log(user_id, business_id, collected_at);

UPDATE businesses 
SET encryption_key = encode(gen_random_bytes(32), 'hex')
WHERE encryption_key IS NULL;
