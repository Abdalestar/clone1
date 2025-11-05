-- Modified Supabase Setup - Safe to run multiple times
-- This version checks if things exist before creating them

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
-- Drop existing policies first
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;

CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    avatar_url TEXT,
    preferences TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Businesses table
DROP POLICY IF EXISTS "Anyone can view businesses" ON public.businesses;

CREATE TABLE IF NOT EXISTS public.businesses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    logo_url TEXT,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    address TEXT NOT NULL,
    rating DECIMAL(2,1) DEFAULT 5.0,
    stamps_required INTEGER DEFAULT 10,
    reward_description TEXT NOT NULL,
    nfc_tag_id TEXT UNIQUE,
    qr_code TEXT UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Stamp Cards table
DROP POLICY IF EXISTS "Users can view own stamp cards" ON public.stamp_cards;

CREATE TABLE IF NOT EXISTS public.stamp_cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    stamps_collected INTEGER DEFAULT 0,
    stamps_required INTEGER DEFAULT 10,
    is_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(user_id, business_id, is_completed)
);

-- Stamps table
DROP POLICY IF EXISTS "Users can view own stamps" ON public.stamps;

CREATE TABLE IF NOT EXISTS public.stamps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stamp_card_id UUID NOT NULL REFERENCES public.stamp_cards(id) ON DELETE CASCADE,
    collected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    method TEXT CHECK (method IN ('nfc', 'qr', 'manual')) DEFAULT 'qr'
);

-- Redemptions table
DROP POLICY IF EXISTS "Users can view own redemptions" ON public.redemptions;

CREATE TABLE IF NOT EXISTS public.redemptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    stamp_card_id UUID NOT NULL REFERENCES public.stamp_cards(id),
    business_id UUID NOT NULL REFERENCES public.businesses(id),
    redeemed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reward_description TEXT NOT NULL
);

-- Create indexes (IF NOT EXISTS is implicit for CREATE INDEX)
CREATE INDEX IF NOT EXISTS idx_stamp_cards_user_id ON public.stamp_cards(user_id);
CREATE INDEX IF NOT EXISTS idx_stamp_cards_business_id ON public.stamp_cards(business_id);
CREATE INDEX IF NOT EXISTS idx_stamps_card_id ON public.stamps(stamp_card_id);
CREATE INDEX IF NOT EXISTS idx_redemptions_user_id ON public.redemptions(user_id);
CREATE INDEX IF NOT EXISTS idx_businesses_location ON public.businesses(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_businesses_category ON public.businesses(category);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stamp_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stamps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.redemptions ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies (dropping first to avoid conflicts)
-- Users policies
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- Businesses policies
CREATE POLICY "Anyone can view businesses" ON public.businesses
    FOR SELECT USING (true);

-- Stamp cards policies
CREATE POLICY "Users can view own stamp cards" ON public.stamp_cards
    FOR SELECT USING (auth.uid() = user_id);

-- Stamps policies
CREATE POLICY "Users can view own stamps" ON public.stamps
    FOR SELECT USING (
        stamp_card_id IN (
            SELECT id FROM public.stamp_cards WHERE user_id = auth.uid()
        )
    );

-- Redemptions policies
CREATE POLICY "Users can view own redemptions" ON public.redemptions
    FOR SELECT USING (auth.uid() = user_id);

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Setup completed successfully! You can now run the migrations file.';
END $$;
