/*
  # StampMe Staff App Database Schema

  1. New Tables
    - `staff_members` - Staff accounts for merchants
      - `id` (uuid, primary key)
      - `merchant_id` (uuid, references businesses)
      - `name` (text)
      - `email` (text, unique)
      - `phone` (text)
      - `staff_pin_hash` (text, bcrypt hashed PIN)
      - `role` (text: 'owner', 'manager', 'staff')
      - `permissions` (jsonb: permissions object)
      - `is_active` (boolean)
      - `last_login_at` (timestamp)
      - `created_at` (timestamp)

    - `staff_sessions` - Active login sessions
      - `id` (uuid, primary key)
      - `staff_id` (uuid, references staff_members)
      - `session_token` (text, unique)
      - `device_info` (jsonb)
      - `expires_at` (timestamp)
      - `created_at` (timestamp)

    - `stamp_transactions` - Audit log for all stamp actions
      - `id` (uuid, primary key)
      - `merchant_id` (uuid, references businesses)
      - `stamp_code` (text)
      - `customer_id` (uuid, references users)
      - `staff_id` (uuid, references staff_members)
      - `transaction_type` (text: 'stamp_issued', 'stamp_redeemed', 'stamp_voided', 'reward_redeemed')
      - `method` (text: 'nfc', 'qr')
      - `metadata` (jsonb)
      - `created_at` (timestamp)

  2. Table Extensions
    - Add columns to `one_time_stamps`:
      - `issued_by_staff_id` (uuid, references staff_members)
      - `is_written_to_tag` (boolean)
      - `is_generated_as_qr` (boolean)
      - `voided_by_staff_id` (uuid, references staff_members)
      - `voided_at` (timestamp)
      - `void_reason` (text)

    - Add columns to `businesses`:
      - `staff_settings` (jsonb: configuration options)

  3. Security
    - Enable RLS on all new tables
    - Add policies for staff to access only their merchant's data
    - Create database function for bulk stamp generation
    - Create function for staff authentication with PIN
*/

-- ============================================
-- STEP 1: Create Staff Members Table
-- ============================================

CREATE TABLE IF NOT EXISTS public.staff_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    staff_pin_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'staff')),
    permissions JSONB DEFAULT '{
        "can_issue_stamps": true,
        "can_void_stamps": false,
        "can_view_analytics": false,
        "can_manage_inventory": true,
        "can_manage_staff": false
    }'::jsonb,
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- STEP 2: Create Staff Sessions Table
-- ============================================

CREATE TABLE IF NOT EXISTS public.staff_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    staff_id UUID NOT NULL REFERENCES public.staff_members(id) ON DELETE CASCADE,
    session_token TEXT UNIQUE NOT NULL,
    device_info JSONB DEFAULT '{}'::jsonb,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- STEP 3: Create Stamp Transactions Table
-- ============================================

CREATE TABLE IF NOT EXISTS public.stamp_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    stamp_code TEXT,
    customer_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    staff_id UUID REFERENCES public.staff_members(id) ON DELETE SET NULL,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('stamp_issued', 'stamp_redeemed', 'stamp_voided', 'reward_redeemed')),
    method TEXT CHECK (method IN ('nfc', 'qr')),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- STEP 4: Extend One-Time Stamps Table
-- ============================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'one_time_stamps' AND column_name = 'issued_by_staff_id'
    ) THEN
        ALTER TABLE public.one_time_stamps
        ADD COLUMN issued_by_staff_id UUID REFERENCES public.staff_members(id) ON DELETE SET NULL,
        ADD COLUMN is_written_to_tag BOOLEAN DEFAULT false,
        ADD COLUMN is_generated_as_qr BOOLEAN DEFAULT false,
        ADD COLUMN voided_by_staff_id UUID REFERENCES public.staff_members(id) ON DELETE SET NULL,
        ADD COLUMN voided_at TIMESTAMPTZ,
        ADD COLUMN void_reason TEXT;
    END IF;
END $$;

-- ============================================
-- STEP 5: Extend Businesses Table
-- ============================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'businesses' AND column_name = 'staff_settings'
    ) THEN
        ALTER TABLE public.businesses
        ADD COLUMN staff_settings JSONB DEFAULT '{
            "auto_generate_threshold": 50,
            "auto_generate_quantity": 500,
            "auto_generate_enabled": false,
            "default_nfc_expiry_minutes": 5,
            "default_qr_expiry_minutes": 2
        }'::jsonb;
    END IF;
END $$;

-- ============================================
-- STEP 6: Create Indexes for Performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_staff_members_merchant ON public.staff_members(merchant_id);
CREATE INDEX IF NOT EXISTS idx_staff_members_email ON public.staff_members(email);
CREATE INDEX IF NOT EXISTS idx_staff_members_active ON public.staff_members(is_active);

CREATE INDEX IF NOT EXISTS idx_staff_sessions_staff ON public.staff_sessions(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_sessions_token ON public.staff_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_staff_sessions_expires ON public.staff_sessions(expires_at);

CREATE INDEX IF NOT EXISTS idx_stamp_transactions_merchant ON public.stamp_transactions(merchant_id);
CREATE INDEX IF NOT EXISTS idx_stamp_transactions_staff ON public.stamp_transactions(staff_id);
CREATE INDEX IF NOT EXISTS idx_stamp_transactions_customer ON public.stamp_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_stamp_transactions_type ON public.stamp_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_stamp_transactions_created ON public.stamp_transactions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_one_time_stamps_issued_by ON public.one_time_stamps(issued_by_staff_id);
CREATE INDEX IF NOT EXISTS idx_one_time_stamps_voided ON public.one_time_stamps(voided_by_staff_id);

-- ============================================
-- STEP 7: Enable Row Level Security
-- ============================================

ALTER TABLE public.staff_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stamp_transactions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 8: RLS Policies for Staff Members
-- ============================================

CREATE POLICY "Staff can view colleagues at same merchant"
    ON public.staff_members
    FOR SELECT
    USING (
        merchant_id IN (
            SELECT merchant_id FROM public.staff_members
            WHERE id = auth.uid()::uuid
        )
    );

CREATE POLICY "Managers can update staff at same merchant"
    ON public.staff_members
    FOR UPDATE
    USING (
        merchant_id IN (
            SELECT merchant_id FROM public.staff_members
            WHERE id = auth.uid()::uuid
            AND role IN ('owner', 'manager')
        )
    );

CREATE POLICY "Owners can insert new staff"
    ON public.staff_members
    FOR INSERT
    WITH CHECK (
        merchant_id IN (
            SELECT merchant_id FROM public.staff_members
            WHERE id = auth.uid()::uuid
            AND role = 'owner'
        )
    );

-- ============================================
-- STEP 9: RLS Policies for Staff Sessions
-- ============================================

CREATE POLICY "Staff can view own sessions"
    ON public.staff_sessions
    FOR SELECT
    USING (staff_id = auth.uid()::uuid);

CREATE POLICY "Staff can insert own sessions"
    ON public.staff_sessions
    FOR INSERT
    WITH CHECK (staff_id = auth.uid()::uuid);

CREATE POLICY "Staff can delete own sessions"
    ON public.staff_sessions
    FOR DELETE
    USING (staff_id = auth.uid()::uuid);

-- ============================================
-- STEP 10: RLS Policies for Stamp Transactions
-- ============================================

CREATE POLICY "Staff can view transactions at their merchant"
    ON public.stamp_transactions
    FOR SELECT
    USING (
        merchant_id IN (
            SELECT merchant_id FROM public.staff_members
            WHERE id = auth.uid()::uuid
        )
    );

CREATE POLICY "Staff can insert transactions at their merchant"
    ON public.stamp_transactions
    FOR INSERT
    WITH CHECK (
        merchant_id IN (
            SELECT merchant_id FROM public.staff_members
            WHERE id = auth.uid()::uuid
        )
    );

-- ============================================
-- STEP 11: Function to Generate One-Time Stamps
-- ============================================

CREATE OR REPLACE FUNCTION public.generate_one_time_stamps(
    p_merchant_id UUID,
    p_quantity INTEGER,
    p_expires_in_minutes INTEGER DEFAULT 1440
)
RETURNS JSON AS $$
DECLARE
    v_stamp_code TEXT;
    v_count INTEGER := 0;
    v_expires_at TIMESTAMPTZ;
BEGIN
    v_expires_at := NOW() + (p_expires_in_minutes || ' minutes')::INTERVAL;

    WHILE v_count < p_quantity LOOP
        v_stamp_code := 'STAMP_' || substring(md5(random()::text || clock_timestamp()::text) from 1 for 12);

        BEGIN
            INSERT INTO public.one_time_stamps (
                business_id,
                stamp_code,
                status,
                expires_at
            ) VALUES (
                p_merchant_id,
                v_stamp_code,
                'active',
                v_expires_at
            );

            v_count := v_count + 1;
        EXCEPTION WHEN unique_violation THEN
            CONTINUE;
        END;
    END LOOP;

    RETURN json_build_object(
        'success', true,
        'message', 'Generated ' || v_count || ' stamps',
        'count', v_count
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 12: Function to Validate Staff PIN
-- ============================================

CREATE OR REPLACE FUNCTION public.validate_staff_pin(
    p_email TEXT,
    p_pin TEXT
)
RETURNS JSON AS $$
DECLARE
    v_staff RECORD;
    v_session_token TEXT;
    v_expires_at TIMESTAMPTZ;
BEGIN
    SELECT * INTO v_staff
    FROM public.staff_members
    WHERE email = p_email
    AND is_active = true;

    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Staff member not found or inactive'
        );
    END IF;

    IF NOT (v_staff.staff_pin_hash = crypt(p_pin, v_staff.staff_pin_hash)) THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Invalid PIN'
        );
    END IF;

    UPDATE public.staff_members
    SET last_login_at = NOW()
    WHERE id = v_staff.id;

    v_session_token := encode(gen_random_bytes(32), 'base64');
    v_expires_at := NOW() + INTERVAL '24 hours';

    INSERT INTO public.staff_sessions (staff_id, session_token, expires_at)
    VALUES (v_staff.id, v_session_token, v_expires_at);

    RETURN json_build_object(
        'success', true,
        'message', 'Login successful',
        'staff_id', v_staff.id,
        'merchant_id', v_staff.merchant_id,
        'name', v_staff.name,
        'role', v_staff.role,
        'permissions', v_staff.permissions,
        'session_token', v_session_token,
        'expires_at', v_expires_at
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 13: Insert Demo Staff Member
-- ============================================

DO $$
DECLARE
    v_merchant_id UUID;
BEGIN
    SELECT id INTO v_merchant_id
    FROM public.businesses
    LIMIT 1;

    IF v_merchant_id IS NOT NULL THEN
        INSERT INTO public.staff_members (
            merchant_id,
            name,
            email,
            phone,
            staff_pin_hash,
            role,
            permissions
        ) VALUES (
            v_merchant_id,
            'Demo Staff',
            'staff@demo.com',
            '+97412345678',
            crypt('1234', gen_salt('bf')),
            'manager',
            '{
                "can_issue_stamps": true,
                "can_void_stamps": true,
                "can_view_analytics": true,
                "can_manage_inventory": true,
                "can_manage_staff": false
            }'::jsonb
        ) ON CONFLICT (email) DO NOTHING;
    END IF;
END $$;

-- ============================================
-- SUCCESS!
-- ============================================

SELECT
    'Staff App schema setup complete! ✅' as status,
    'Tables created: staff_members, staff_sessions, stamp_transactions' as tables,
    'Demo staff login: staff@demo.com / PIN: 1234' as demo_account;
