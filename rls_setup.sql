-- 1. ALTER TABLE to make subscription fields nullable and ADD seat_no
ALTER TABLE members ALTER COLUMN subscription_plan DROP NOT NULL;
ALTER TABLE members ALTER COLUMN daily_access_hours DROP NOT NULL;
ALTER TABLE members ADD COLUMN IF NOT EXISTS seat_no TEXT;

-- 2. ENABLE RLS (if not already)
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- 3. DROP EXISTING POLICIES to avoid "already exists" errors
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON members;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON transactions;
DROP POLICY IF EXISTS "Allow authenticated insert" ON members;
DROP POLICY IF EXISTS "Allow authenticated select" ON members;
DROP POLICY IF EXISTS "Allow authenticated update" ON members;
DROP POLICY IF EXISTS "Allow transactions access" ON transactions;

-- 4. CREATE NEW POLICIES
-- Allow authenticated users (Receptionists) to READ and WRITE everything
CREATE POLICY "Enable all access for authenticated users" ON members
FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Enable all access for authenticated users" ON transactions
FOR ALL TO authenticated
USING (true)
WITH CHECK (true);
