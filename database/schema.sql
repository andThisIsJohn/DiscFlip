
-- CENTRAL AUDIT ARCHIVE
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    action TEXT NOT NULL,          -- e.g., 'AUCTION_CREATE', 'BID_PLACE', 'MOD_BAN'
    target_type TEXT NOT NULL,     -- e.g., 'AUCTION', 'USER', 'ORDER'
    target_id TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',   -- Store diffs, amounts, or reasoning
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure table is append-only for users
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 1. Anyone authenticated can record an audit event
CREATE POLICY "Audit: Authenticated insert" 
    ON audit_logs FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated');

-- 2. Only System Admins can read the audit trail
CREATE POLICY "Audit: Admin only select" 
    ON audit_logs FOR SELECT 
    USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_system_admin = true));

-- 3. Prohibit tampering (No Update/Delete for anyone)
-- (Implicitly handled as no policies exist for UPDATE/DELETE)

-- BLOCK CHECK HELPER
-- Returns true if there is any block relationship between two users
CREATE OR REPLACE FUNCTION is_socially_blocked(user_a UUID, user_b UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM blocks 
        WHERE (blocker_id = user_a AND blocked_id = user_b)
           OR (blocker_id = user_b AND blocked_id = user_a)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
