
-- DISCFLIP SOCIAL SAFETY POLICIES
-- Version: 1.2.0

-- 1. AUCTION VISIBILITY (Hide items from/to blocked users)
DROP POLICY IF EXISTS "Auctions: Public browsing" ON auctions;
CREATE POLICY "Auctions: Socially filtered browsing" 
    ON auctions FOR SELECT 
    USING (
        (is_hidden = false OR seller_id = auth.uid()) AND
        NOT is_socially_blocked(auth.uid(), seller_id)
    );

-- 2. BID PREVENTION (Blocked users cannot bid)
DROP POLICY IF EXISTS "Bids: Valid hunter only" ON bids;
CREATE POLICY "Bids: Safety verified insert" 
    ON bids FOR INSERT 
    WITH CHECK (
        auth.role() = 'authenticated' AND 
        bidder_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM auctions 
            WHERE id = auction_id 
            AND seller_id != auth.uid()
            AND NOT is_socially_blocked(auth.uid(), seller_id)
        )
    );

-- 3. MESSAGE PROTECTION
DROP POLICY IF EXISTS "Messages: Participant access" ON messages;
CREATE POLICY "Messages: Socially safe access" 
    ON messages FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM threads 
            WHERE id = thread_id 
            AND (buyer_id = auth.uid() OR seller_id = auth.uid())
            -- Ensure neither participant has blocked the other
            AND NOT is_socially_blocked(buyer_id, seller_id)
        )
        OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_system_admin = true)
    );

-- 4. BLOCKS MANAGEMENT
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Blocks: Self management" 
    ON blocks FOR ALL 
    USING (blocker_id = auth.uid())
    WITH CHECK (blocker_id = auth.uid());

-- 5. REPORTS SUBMISSION
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reports: Authenticated submission" 
    ON reports FOR INSERT 
    WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Reports: Admin only read" 
    ON reports FOR SELECT 
    USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_system_admin = true));
