-- Supabase Database Setup Script for Loyalty Stamp App
-- Run this script in your Supabase SQL editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
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

-- Stamps table (individual stamp records)
CREATE TABLE IF NOT EXISTS public.stamps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stamp_card_id UUID NOT NULL REFERENCES public.stamp_cards(id) ON DELETE CASCADE,
    collected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    method TEXT CHECK (method IN ('nfc', 'qr', 'manual')) DEFAULT 'qr'
);

-- Redemptions table
CREATE TABLE IF NOT EXISTS public.redemptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    stamp_card_id UUID NOT NULL REFERENCES public.stamp_cards(id),
    business_id UUID NOT NULL REFERENCES public.businesses(id),
    redeemed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reward_description TEXT NOT NULL
);

-- Nonce tracking table (prevent replay attacks)
CREATE TABLE IF NOT EXISTS public.used_nonces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nonce TEXT UNIQUE NOT NULL,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '10 minutes')
);

-- Payload secrets table (for HMAC signing)
CREATE TABLE IF NOT EXISTS public.payload_secrets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    secret_key TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE
);

-- Create indexes for better performance
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

-- RLS Policies for users table
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for businesses table (public read)
CREATE POLICY "Anyone can view businesses" ON public.businesses
    FOR SELECT USING (true);

-- RLS Policies for stamp_cards table
CREATE POLICY "Users can view own stamp cards" ON public.stamp_cards
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own stamp cards" ON public.stamp_cards
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own stamp cards" ON public.stamp_cards
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own stamp cards" ON public.stamp_cards
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for stamps table
CREATE POLICY "Users can view stamps on own cards" ON public.stamps
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.stamp_cards
            WHERE stamp_cards.id = stamps.stamp_card_id
            AND stamp_cards.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert stamps on own cards" ON public.stamps
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.stamp_cards
            WHERE stamp_cards.id = stamps.stamp_card_id
            AND stamp_cards.user_id = auth.uid()
        )
    );

-- RLS Policies for redemptions table
CREATE POLICY "Users can view own redemptions" ON public.redemptions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own redemptions" ON public.redemptions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Insert Qatar businesses data
INSERT INTO public.businesses (name, category, description, logo_url, latitude, longitude, address, rating, stamps_required, reward_description, nfc_tag_id, qr_code) VALUES
    ('Souq Waqif Coffee House', 'coffee', 'Traditional Qatari coffee experience in the heart of Souq Waqif', 'https://via.placeholder.com/100x100.png?text=Coffee', 25.2867, 51.5333, 'Souq Waqif, Doha', 4.8, 10, 'Free Qahwa & Date Set', 'SHOP_SWC001', 'QR_SWC001'),
    ('The Pearl Espresso Bar', 'coffee', 'Modern coffee shop at Porto Arabia', 'https://via.placeholder.com/100x100.png?text=Espresso', 25.3717, 51.5408, 'Porto Arabia, The Pearl', 4.6, 8, 'Free Specialty Coffee', 'SHOP_PEB002', 'QR_PEB002'),
    ('Corniche Cafe', 'coffee', 'Seaside cafe with stunning Doha skyline views', 'https://via.placeholder.com/100x100.png?text=Corniche', 25.3004, 51.5269, 'Doha Corniche', 4.7, 10, 'Free Cappuccino + Pastry', 'SHOP_CC003', 'QR_CC003'),
    ('West Bay Grill', 'restaurant', 'Premium steakhouse in the business district', 'https://via.placeholder.com/100x100.png?text=Grill', 25.3189, 51.5307, 'West Bay, Doha', 4.9, 12, 'Free Dessert or Appetizer', 'SHOP_WBG004', 'QR_WBG004'),
    ('Katara Beach Restaurant', 'restaurant', 'Mediterranean cuisine by the beach', 'https://via.placeholder.com/100x100.png?text=Beach', 25.3688, 51.5304, 'Katara Cultural Village', 4.8, 10, 'Free Main Course', 'SHOP_KBR005', 'QR_KBR005'),
    ('Msheireb Dining', 'restaurant', 'Contemporary Qatari cuisine', 'https://via.placeholder.com/100x100.png?text=Dining', 25.2868, 51.5279, 'Msheireb Downtown', 4.7, 10, 'Free Traditional Meal', 'SHOP_MD006', 'QR_MD006'),
    ('Aspire Fitness Club', 'gym', 'State-of-the-art gym and wellness center', 'https://via.placeholder.com/100x100.png?text=Gym', 25.2639, 51.4428, 'Aspire Zone', 4.9, 15, 'Free Personal Training Session', 'SHOP_AFC007', 'QR_AFC007'),
    ('West Bay Sports Center', 'gym', 'Premium fitness facility with pool', 'https://via.placeholder.com/100x100.png?text=Sports', 25.3203, 51.5289, 'West Bay', 4.6, 12, 'Free Week Pass', 'SHOP_WBSC008', 'QR_WBSC008'),
    ('Luxury Spa at The Pearl', 'spa', 'Premium wellness and beauty treatments', 'https://via.placeholder.com/100x100.png?text=Spa', 25.3755, 51.5425, 'The Pearl-Qatar', 5.0, 8, 'Free 30min Massage', 'SHOP_LSP009', 'QR_LSP009'),
    ('Doha Beauty Lounge', 'salon', 'Modern hair and beauty salon', 'https://via.placeholder.com/100x100.png?text=Salon', 25.2947, 51.5258, 'Al Sadd, Doha', 4.7, 10, 'Free Haircut or Styling', 'SHOP_DBL010', 'QR_DBL010'),
    ('Villaggio Mall Fashion', 'retail', 'Trendy fashion boutique', 'https://via.placeholder.com/100x100.png?text=Fashion', 25.2579, 51.4407, 'Villaggio Mall', 4.5, 15, '20% Off Next Purchase', 'SHOP_VMF011', 'QR_VMF011'),
    ('City Center Bookstore', 'retail', 'Wide selection of books and magazines', 'https://via.placeholder.com/100x100.png?text=Books', 25.3266, 51.5151, 'City Center Doha', 4.6, 10, 'Free Book (up to 50 QAR)', 'SHOP_CCB012', 'QR_CCB012'),
    ('Al Wakrah Coffee Corner', 'coffee', 'Cozy neighborhood cafe', 'https://via.placeholder.com/100x100.png?text=Corner', 25.1679, 51.6004, 'Al Wakrah', 4.4, 8, 'Free Coffee & Cookie', 'SHOP_AWC013', 'QR_AWC013'),
    ('Education City Cafe', 'coffee', 'Student-friendly cafe with study areas', 'https://via.placeholder.com/100x100.png?text=Study', 25.3173, 51.4382, 'Education City', 4.5, 10, 'Free Large Coffee', 'SHOP_ECC014', 'QR_ECC014'),
    ('Lusail Marina Bistro', 'restaurant', 'Waterfront dining experience', 'https://via.placeholder.com/100x100.png?text=Marina', 25.4093, 51.4986, 'Lusail', 4.8, 12, 'Free Seafood Platter', 'SHOP_LMB015', 'QR_LMB015'),
    ('Al Khor Gym & Fitness', 'gym', 'Community fitness center', 'https://via.placeholder.com/100x100.png?text=Fitness', 25.6807, 51.4969, 'Al Khor', 4.3, 10, 'Free Month Membership', 'SHOP_AKG016', 'QR_AKG016'),
    ('Barwa Village Mart', 'retail', 'Convenience store with essentials', 'https://via.placeholder.com/100x100.png?text=Mart', 25.2284, 51.4732, 'Barwa Village', 4.2, 15, '50 QAR Shopping Voucher', 'SHOP_BVM017', 'QR_BVM017'),
    ('Old Airport Wellness Spa', 'spa', 'Relaxation and therapy center', 'https://via.placeholder.com/100x100.png?text=Wellness', 25.2614, 51.5609, 'Old Airport Road', 4.7, 8, 'Free Facial Treatment', 'SHOP_OAW018', 'QR_OAW018'),
    ('Dafna Salon & Spa', 'salon', 'Full-service beauty salon', 'https://via.placeholder.com/100x100.png?text=Beauty', 25.3105, 51.5217, 'Al Dafna, West Bay', 4.6, 10, 'Free Manicure', 'SHOP_DSS019', 'QR_DSS019'),
    ('Musheireb Coffee Roasters', 'coffee', 'Artisanal coffee roasting and tasting', 'https://via.placeholder.com/100x100.png?text=Roaster', 25.2856, 51.5294, 'Msheireb', 4.9, 10, 'Free Bag of Coffee Beans', 'SHOP_MCR020', 'QR_MCR020')
ON CONFLICT (nfc_tag_id) DO NOTHING;

-- Success message
SELECT 'Database setup complete! All tables, policies, and Qatar businesses data have been created.' as status;
