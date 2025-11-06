-- OneStamps Database Schema Additions
-- Run this AFTER your existing supabase_setup.sql
-- This complements your existing database without recreating anything

-- ============================================
-- STEP 1: Add Business Ownership
-- ============================================
-- This links businesses to user accounts so businesses can log in

ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES public.users(id) ON DELETE CASCADE;

-- Add index for performance when querying businesses by owner
CREATE INDEX IF NOT EXISTS idx_businesses_owner ON public.businesses(owner_user_id);

-- ============================================
-- STEP 2: Create One-Time Stamps Table
-- ============================================
-- This stores each unique QR code that can only be used once

CREATE TABLE IF NOT EXISTS public.one_time_stamps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Which business this stamp belongs to
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,

    -- The unique code in the QR (e.g., "STAMP_f47ac10b...")
    stamp_code TEXT UNIQUE NOT NULL,

    -- Status tracking: 'active', 'used', or 'expired'
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'used', 'expired')),

    -- Who used this stamp and when (NULL if not yet used)
    used_by_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    used_at TIMESTAMP WITH TIME ZONE,

    -- Which stamp card this was added to (NULL if not yet used)
    stamp_card_id UUID REFERENCES public.stamp_cards(id) ON DELETE SET NULL,

    -- Expiry tracking
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- ============================================
-- STEP 3: Create Indexes for Performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_one_time_stamps_business ON public.one_time_stamps(business_id);
CREATE INDEX IF NOT EXISTS idx_one_time_stamps_code ON public.one_time_stamps(stamp_code);
CREATE INDEX IF NOT EXISTS idx_one_time_stamps_status ON public.one_time_stamps(status);
CREATE INDEX IF NOT EXISTS idx_one_time_stamps_user ON public.one_time_stamps(used_by_user_id);

-- ============================================
-- STEP 4: Enable Row Level Security (RLS)
-- ============================================

ALTER TABLE public.one_time_stamps ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 5: Update Business RLS Policies
-- ============================================
-- Allow business owners to manage their own businesses

-- Policy: Business owners can update their own businesses
CREATE POLICY "Business owners can update own business" ON public.businesses
    FOR UPDATE
    USING (auth.uid() = owner_user_id)
    WITH CHECK (auth.uid() = owner_user_id);

-- Policy: Business owners can insert businesses (create new businesses)
CREATE POLICY "Users can create businesses" ON public.businesses
    FOR INSERT
    WITH CHECK (auth.uid() = owner_user_id);

-- ============================================
-- STEP 6: RLS Policies for One-Time Stamps
-- ============================================

-- Policy: Business owners can view all stamps for their business
CREATE POLICY "Business owners can view own stamps" ON public.one_time_stamps
    FOR SELECT
    USING (
        business_id IN (
            SELECT id FROM public.businesses
            WHERE owner_user_id = auth.uid()
        )
    );

-- Policy: Business owners can create stamps for their business
CREATE POLICY "Business owners can insert stamps" ON public.one_time_stamps
    FOR INSERT
    WITH CHECK (
        business_id IN (
            SELECT id FROM public.businesses
            WHERE owner_user_id = auth.uid()
        )
    );

-- Policy: Anyone can read ACTIVE stamps (for validation during scan)
-- This is needed so customers can validate stamps before claiming
CREATE POLICY "Anyone can view active stamps" ON public.one_time_stamps
    FOR SELECT
    USING (status = 'active' AND expires_at > NOW());

-- Policy: Users can update stamps when claiming (status change to 'used')
-- This allows the claim function to work
CREATE POLICY "Anyone can update stamps when claiming" ON public.one_time_stamps
    FOR UPDATE
    USING (status = 'active' AND expires_at > NOW());

-- ============================================
-- STEP 7: Create Atomic Claim Function
-- ============================================
-- This function ensures stamp claiming is all-or-nothing
-- It prevents race conditions (two people scanning at same time)

CREATE OR REPLACE FUNCTION public.claim_one_time_stamp(
    p_stamp_code TEXT,
    p_user_id UUID
)
RETURNS JSON AS $$
DECLARE
    v_stamp RECORD;
    v_stamp_card RECORD;
    v_new_stamp_count INTEGER;
BEGIN
    -- Step 1: Lock and fetch the stamp (prevents race conditions)
    SELECT * INTO v_stamp
    FROM public.one_time_stamps
    WHERE stamp_code = p_stamp_code
    FOR UPDATE;  -- This locks the row until transaction completes

    -- Step 2: Validate stamp exists
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Invalid stamp code'
        );
    END IF;

    -- Step 3: Check if already used
    IF v_stamp.status = 'used' THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Stamp already used',
            'used_at', v_stamp.used_at
        );
    END IF;

    -- Step 4: Check if expired
    IF v_stamp.expires_at < NOW() THEN
        -- Mark as expired
        UPDATE public.one_time_stamps
        SET status = 'expired'
        WHERE id = v_stamp.id;

        RETURN json_build_object(
            'success', false,
            'message', 'Stamp has expired',
            'expired_at', v_stamp.expires_at
        );
    END IF;

    -- Step 5: Get or create stamp card for this business
    SELECT * INTO v_stamp_card
    FROM public.stamp_cards
    WHERE user_id = p_user_id
        AND business_id = v_stamp.business_id
        AND is_completed = false
    ORDER BY created_at DESC
    LIMIT 1;

    -- Create new card if none exists
    IF NOT FOUND THEN
        INSERT INTO public.stamp_cards (user_id, business_id, stamps_collected, stamps_required)
        SELECT
            p_user_id,
            v_stamp.business_id,
            0,
            stamps_required
        FROM public.businesses
        WHERE id = v_stamp.business_id
        RETURNING * INTO v_stamp_card;
    END IF;

    -- Step 6: Mark stamp as used (ATOMIC - this is the critical part)
    UPDATE public.one_time_stamps
    SET
        status = 'used',
        used_by_user_id = p_user_id,
        used_at = NOW(),
        stamp_card_id = v_stamp_card.id
    WHERE id = v_stamp.id
        AND status = 'active';  -- Double-check it's still active

    -- If update affected 0 rows, someone else claimed it first
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Stamp was just claimed by someone else'
        );
    END IF;

    -- Step 7: Add stamp to the card
    INSERT INTO public.stamps (stamp_card_id, collected_at, method)
    VALUES (v_stamp_card.id, NOW(), 'qr');

    -- Step 8: Update card count and check if completed
    UPDATE public.stamp_cards
    SET
        stamps_collected = stamps_collected + 1,
        is_completed = (stamps_collected + 1 >= stamps_required)
    WHERE id = v_stamp_card.id
    RETURNING stamps_collected, stamps_required INTO v_new_stamp_count;

    -- Step 9: Return success with details
    RETURN json_build_object(
        'success', true,
        'message', 'Stamp claimed successfully!',
        'stamps_collected', v_stamp_card.stamps_collected + 1,
        'stamps_required', v_stamp_card.stamps_required,
        'is_completed', (v_stamp_card.stamps_collected + 1 >= v_stamp_card.stamps_required),
        'business_name', (SELECT name FROM public.businesses WHERE id = v_stamp.business_id)
    );

EXCEPTION
    WHEN OTHERS THEN
        -- If anything goes wrong, return error
        RETURN json_build_object(
            'success', false,
            'message', 'Error claiming stamp: ' || SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 8: Create Helper Function to Expire Old Stamps
-- ============================================
-- This function can be called periodically to clean up expired stamps

CREATE OR REPLACE FUNCTION public.expire_old_stamps()
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE public.one_time_stamps
    SET status = 'expired'
    WHERE status = 'active'
        AND expires_at < NOW();

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 9: Update Existing Businesses with Owner
-- ============================================
-- For your 20 pre-seeded businesses, we'll set them as unowned for now
-- You can assign them to specific users later

-- (Optional) If you want to create a demo business owner account, uncomment below:
-- INSERT INTO auth.users (id, email) VALUES ('00000000-0000-0000-0000-000000000001', 'demo@business.com');
-- INSERT INTO public.users (id, email, username, full_name, phone_number)
-- VALUES ('00000000-0000-0000-0000-000000000001', 'demo@business.com', 'demobiz', 'Demo Business', '+97412345678');

-- ============================================
-- SUCCESS!
-- ============================================

SELECT 'OneStamps schema additions complete! ✅' as status,
       'Tables created: one_time_stamps' as tables_added,
       'Columns added: businesses.owner_user_id' as columns_added,
       'Functions created: claim_one_time_stamp(), expire_old_stamps()' as functions_created;
