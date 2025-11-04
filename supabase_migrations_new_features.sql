-- Enhanced Database Schema - New Features
-- Run this after the initial supabase_setup.sql

-- Add push_token to users table for notifications
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS push_token TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS theme_preference TEXT DEFAULT 'light';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS language_preference TEXT DEFAULT 'en';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN DEFAULT TRUE;

-- Business Reviews table
CREATE TABLE IF NOT EXISTS public.business_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    images TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(business_id, user_id)
);

-- Promotions table
CREATE TABLE IF NOT EXISTS public.promotions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    discount_percentage INTEGER,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    promotion_type TEXT CHECK (promotion_type IN ('double_stamps', 'discount', 'bonus_reward', 'limited_time')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Achievements table (gamification)
CREATE TABLE IF NOT EXISTS public.achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    icon TEXT,
    requirement_type TEXT NOT NULL,
    requirement_value INTEGER NOT NULL,
    reward_points INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Achievements junction table
CREATE TABLE IF NOT EXISTS public.user_achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, achievement_id)
);

-- User Streaks table (daily stamp collection streaks)
CREATE TABLE IF NOT EXISTS public.user_streaks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_stamp_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Referrals table
CREATE TABLE IF NOT EXISTS public.referrals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    referrer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    referred_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    referral_code TEXT NOT NULL,
    bonus_stamps_awarded INTEGER DEFAULT 5,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(referred_id)
);

-- Notifications log table
CREATE TABLE IF NOT EXISTS public.notification_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    notification_type TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    data JSONB,
    is_read BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Analytics Events table
CREATE TABLE IF NOT EXISTS public.analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    event_name TEXT NOT NULL,
    event_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Business Hours table
CREATE TABLE IF NOT EXISTS public.business_hours (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    open_time TIME NOT NULL,
    close_time TIME NOT NULL,
    is_closed BOOLEAN DEFAULT FALSE
);

-- Add new indexes
CREATE INDEX IF NOT EXISTS idx_business_reviews_business_id ON public.business_reviews(business_id);
CREATE INDEX IF NOT EXISTS idx_business_reviews_user_id ON public.business_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_promotions_business_id ON public.promotions(business_id);
CREATE INDEX IF NOT EXISTS idx_promotions_active ON public.promotions(is_active, end_date);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON public.user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON public.referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_user_id ON public.notification_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON public.analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON public.analytics_events(created_at);

-- Enable RLS on new tables
ALTER TABLE public.business_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_hours ENABLE ROW LEVEL SECURITY;

-- RLS Policies for business_reviews
CREATE POLICY "Users can view all reviews" ON public.business_reviews
    FOR SELECT USING (true);

CREATE POLICY "Users can create their own reviews" ON public.business_reviews
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reviews" ON public.business_reviews
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reviews" ON public.business_reviews
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for promotions
CREATE POLICY "Anyone can view active promotions" ON public.promotions
    FOR SELECT USING (is_active = true);

-- RLS Policies for achievements
CREATE POLICY "Anyone can view achievements" ON public.achievements
    FOR SELECT USING (true);

-- RLS Policies for user_achievements
CREATE POLICY "Users can view their own achievements" ON public.user_achievements
    FOR SELECT USING (auth.uid() = user_id);

-- RLS Policies for user_streaks
CREATE POLICY "Users can view their own streak" ON public.user_streaks
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own streak" ON public.user_streaks
    FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for referrals
CREATE POLICY "Users can view their referrals" ON public.referrals
    FOR SELECT USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

-- RLS Policies for notification_logs
CREATE POLICY "Users can view their own notifications" ON public.notification_logs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON public.notification_logs
    FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for analytics_events
CREATE POLICY "Users can view their own analytics" ON public.analytics_events
    FOR SELECT USING (auth.uid() = user_id);

-- RLS Policies for business_hours
CREATE POLICY "Anyone can view business hours" ON public.business_hours
    FOR SELECT USING (true);

-- Insert sample achievements
INSERT INTO public.achievements (name, description, icon, requirement_type, requirement_value, reward_points) VALUES
('First Stamp', 'Collect your first stamp', '⭐', 'stamps_collected', 1, 10),
('Getting Started', 'Collect 5 stamps', '🌟', 'stamps_collected', 5, 25),
('Stamp Collector', 'Collect 10 stamps', '💫', 'stamps_collected', 10, 50),
('Super Collector', 'Collect 25 stamps', '✨', 'stamps_collected', 25, 100),
('Stamp Master', 'Collect 50 stamps', '🏆', 'stamps_collected', 50, 250),
('First Redemption', 'Redeem your first reward', '🎁', 'redemptions', 1, 20),
('Loyal Customer', 'Complete 5 stamp cards', '💎', 'completed_cards', 5, 100),
('Card Collector', 'Have 10 active cards', '📇', 'active_cards', 10, 75),
('Weekly Warrior', 'Collect stamps 7 days in a row', '🔥', 'streak_days', 7, 150),
('Monthly Champion', 'Collect stamps 30 days in a row', '👑', 'streak_days', 30, 500)
ON CONFLICT (name) DO NOTHING;

-- Function to update business rating based on reviews
CREATE OR REPLACE FUNCTION update_business_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.businesses
    SET rating = (
        SELECT AVG(rating)::DECIMAL(2,1)
        FROM public.business_reviews
        WHERE business_id = NEW.business_id
    )
    WHERE id = NEW.business_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update business rating
CREATE TRIGGER trigger_update_business_rating
    AFTER INSERT OR UPDATE OF rating ON public.business_reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_business_rating();

-- Function to update user streaks
CREATE OR REPLACE FUNCTION update_user_streak(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
    v_last_stamp_date DATE;
    v_current_streak INTEGER;
    v_longest_streak INTEGER;
BEGIN
    -- Get the last stamp date
    SELECT MAX(DATE(collected_at))
    INTO v_last_stamp_date
    FROM public.stamps s
    JOIN public.stamp_cards sc ON s.stamp_card_id = sc.id
    WHERE sc.user_id = p_user_id;

    -- Get or create streak record
    INSERT INTO public.user_streaks (user_id, current_streak, longest_streak, last_stamp_date)
    VALUES (p_user_id, 0, 0, NULL)
    ON CONFLICT (user_id) DO NOTHING;

    SELECT current_streak, longest_streak
    INTO v_current_streak, v_longest_streak
    FROM public.user_streaks
    WHERE user_id = p_user_id;

    -- Update streak
    IF v_last_stamp_date = CURRENT_DATE THEN
        -- Same day, no change
        NULL;
    ELSIF v_last_stamp_date = CURRENT_DATE - INTERVAL '1 day' THEN
        -- Consecutive day
        v_current_streak := v_current_streak + 1;
        v_longest_streak := GREATEST(v_longest_streak, v_current_streak);
    ELSE
        -- Streak broken
        v_current_streak := 1;
    END IF;

    UPDATE public.user_streaks
    SET current_streak = v_current_streak,
        longest_streak = v_longest_streak,
        last_stamp_date = v_last_stamp_date,
        updated_at = NOW()
    WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Function to check and award achievements
CREATE OR REPLACE FUNCTION check_user_achievements(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
    v_total_stamps INTEGER;
    v_total_redemptions INTEGER;
    v_completed_cards INTEGER;
    v_active_cards INTEGER;
    v_current_streak INTEGER;
    v_achievement RECORD;
BEGIN
    -- Get user stats
    SELECT COUNT(*) INTO v_total_stamps
    FROM public.stamps s
    JOIN public.stamp_cards sc ON s.stamp_card_id = sc.id
    WHERE sc.user_id = p_user_id;

    SELECT COUNT(*) INTO v_total_redemptions
    FROM public.redemptions
    WHERE user_id = p_user_id;

    SELECT COUNT(*) INTO v_completed_cards
    FROM public.stamp_cards
    WHERE user_id = p_user_id AND is_completed = true;

    SELECT COUNT(*) INTO v_active_cards
    FROM public.stamp_cards
    WHERE user_id = p_user_id AND is_completed = false;

    SELECT COALESCE(current_streak, 0) INTO v_current_streak
    FROM public.user_streaks
    WHERE user_id = p_user_id;

    -- Check each achievement
    FOR v_achievement IN
        SELECT * FROM public.achievements
    LOOP
        IF (
            (v_achievement.requirement_type = 'stamps_collected' AND v_total_stamps >= v_achievement.requirement_value) OR
            (v_achievement.requirement_type = 'redemptions' AND v_total_redemptions >= v_achievement.requirement_value) OR
            (v_achievement.requirement_type = 'completed_cards' AND v_completed_cards >= v_achievement.requirement_value) OR
            (v_achievement.requirement_type = 'active_cards' AND v_active_cards >= v_achievement.requirement_value) OR
            (v_achievement.requirement_type = 'streak_days' AND v_current_streak >= v_achievement.requirement_value)
        ) THEN
            -- Award achievement if not already earned
            INSERT INTO public.user_achievements (user_id, achievement_id)
            VALUES (p_user_id, v_achievement.id)
            ON CONFLICT (user_id, achievement_id) DO NOTHING;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Cleanup expired nonces periodically (call this from a scheduled job)
CREATE OR REPLACE FUNCTION cleanup_expired_nonces()
RETURNS VOID AS $$
BEGIN
    DELETE FROM public.used_nonces
    WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE public.business_reviews IS 'User reviews and ratings for businesses';
COMMENT ON TABLE public.promotions IS 'Special promotions and offers from businesses';
COMMENT ON TABLE public.achievements IS 'Available achievements for gamification';
COMMENT ON TABLE public.user_achievements IS 'Achievements earned by users';
COMMENT ON TABLE public.user_streaks IS 'User stamp collection streaks';
COMMENT ON TABLE public.referrals IS 'User referral tracking';
COMMENT ON TABLE public.notification_logs IS 'Log of all notifications sent to users';
COMMENT ON TABLE public.analytics_events IS 'Analytics and user behavior tracking';
COMMENT ON TABLE public.business_hours IS 'Business operating hours';
