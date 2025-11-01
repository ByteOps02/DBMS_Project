/*
  ✅ Visitor Management System — Full Schema + RLS Security (Final)
*/

-- ✅ ENUM Creation (duplicate safe)
DO $$ BEGIN
  CREATE TYPE visit_status AS ENUM ('pending', 'approved', 'denied', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'guard', 'host');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ✅ TABLES
CREATE TABLE IF NOT EXISTS departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS hosts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id uuid REFERENCES auth.users(id) UNIQUE,
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  department_id uuid REFERENCES departments(id),
  role user_role NOT NULL DEFAULT 'host',
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS visitors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  company text,
  photo_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(email, phone)
);

CREATE TABLE IF NOT EXISTS visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id uuid REFERENCES visitors(id),
  host_id uuid REFERENCES hosts(id),
  purpose text NOT NULL,
  status visit_status DEFAULT 'pending',
  check_in_time timestamptz,
  check_out_time timestamptz,
  valid_until timestamptz NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ✅ Enable RLS
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE hosts ENABLE ROW LEVEL SECURITY;
ALTER TABLE visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;

-- ✅ Remove previous conflicting host policies
DROP POLICY IF EXISTS "Users can insert themselves as hosts" ON hosts;
DROP POLICY IF EXISTS "Users can view only their own host record" ON hosts;
DROP POLICY IF EXISTS "Admins have full access on hosts" ON hosts;

-- ✅ RLS Policies

-- Departments readable by all authenticated
CREATE POLICY "Departments readable"
  ON departments FOR SELECT
  TO authenticated
  USING (true);

-- Hosts security
CREATE POLICY "Users can insert themselves as hosts"
  ON hosts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = auth_id);

CREATE POLICY "Users can view only their own host record"
  ON hosts FOR SELECT
  TO authenticated
  USING (auth.uid() = auth_id);

CREATE POLICY "Admins have full access on hosts"
  ON hosts FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM hosts h
            WHERE h.auth_id = auth.uid()
            AND h.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM hosts h
            WHERE h.auth_id = auth.uid()
            AND h.role = 'admin')
  );

-- Visitors
CREATE POLICY "Visitors insert allowed"
  ON visitors FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Visitors read allowed"
  ON visitors FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Visitors update by guard/admin"
  ON visitors FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM hosts h
            WHERE h.auth_id = auth.uid()
            AND (h.role = 'guard' OR h.role = 'admin'))
  );

-- Visits
CREATE POLICY "Visits insert allowed"
  ON visits FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Visits read allowed"
  ON visits FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Visits update by guard/admin/host"
  ON visits FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM hosts h
            WHERE h.auth_id = auth.uid()
            AND (
              h.role = 'guard' OR
              h.role = 'admin' OR
              h.id = visits.host_id
            ))
  );

-- ✅ Indexes
CREATE INDEX IF NOT EXISTS idx_visits_status ON visits(status);
CREATE INDEX IF NOT EXISTS idx_visits_created_at ON visits(created_at);
CREATE INDEX IF NOT EXISTS idx_visits_host_id ON visits(host_id);
CREATE INDEX IF NOT EXISTS idx_visits_visitor_id ON visits(visitor_id);
CREATE INDEX IF NOT EXISTS idx_hosts_email ON hosts(email);
CREATE INDEX IF NOT EXISTS idx_visitors_email ON visitors(email);
CREATE INDEX IF NOT EXISTS idx_hosts_auth_id ON hosts(auth_id);

-- ✅ Updated_at automation
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON departments
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_hosts_updated_at BEFORE UPDATE ON hosts
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_visitors_updated_at BEFORE UPDATE ON visitors
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_visits_updated_at BEFORE UPDATE ON visits
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ✅ Default Departments
INSERT INTO departments (name) VALUES
('Administration'), ('Faculty'), ('Security'),
('IT Department'), ('Facilities')
ON CONFLICT DO NOTHING;
