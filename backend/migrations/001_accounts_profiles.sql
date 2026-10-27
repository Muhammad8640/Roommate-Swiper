DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'roommate_runtime') THEN
    CREATE ROLE roommate_runtime NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
  END IF;
END
$$;

CREATE TABLE roommate.schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 120),
  enabled boolean NOT NULL DEFAULT true
);

CREATE TABLE roommate.school_domains (
  domain text PRIMARY KEY CHECK (domain = lower(domain) AND length(domain) <= 253
    AND domain ~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$'),
  school_id uuid NOT NULL REFERENCES roommate.schools(id)
);

CREATE TABLE roommate.accounts (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  school_id uuid NOT NULL REFERENCES roommate.schools(id),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE roommate.profiles (
  user_id uuid PRIMARY KEY REFERENCES roommate.accounts(id) ON DELETE CASCADE,
  display_name text NOT NULL CHECK (length(btrim(display_name)) BETWEEN 1 AND 80),
  bio text NOT NULL DEFAULT '' CHECK (length(bio) <= 500),
  major text CHECK (length(major) BETWEEN 1 AND 100),
  class_year smallint CHECK (class_year BETWEEN 2000 AND 2100),
  interests text[] NOT NULL DEFAULT '{}' CHECK (cardinality(interests) <= 10 AND array_position(interests, NULL) IS NULL),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE roommate.photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES roommate.profiles(user_id) ON DELETE CASCADE,
  object_key text NOT NULL UNIQUE CHECK (length(object_key) BETWEEN 1 AND 500),
  position smallint NOT NULL CHECK (position BETWEEN 1 AND 3),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, position)
);

REVOKE ALL ON SCHEMA roommate FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA roommate FROM PUBLIC;
GRANT USAGE ON SCHEMA roommate TO roommate_runtime;
GRANT SELECT ON roommate.schools, roommate.school_domains TO roommate_runtime;
GRANT SELECT, INSERT, UPDATE ON roommate.accounts, roommate.profiles TO roommate_runtime;
GRANT SELECT, INSERT, DELETE ON roommate.photos TO roommate_runtime;

DO $$
DECLARE
  client_role text;
  table_name text;
BEGIN
  FOREACH client_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = client_role) THEN
      EXECUTE format('REVOKE ALL ON SCHEMA roommate FROM %I', client_role);
      EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA roommate FROM %I', client_role);
    END IF;
  END LOOP;
  FOREACH table_name IN ARRAY ARRAY['schools', 'school_domains', 'accounts', 'profiles', 'photos'] LOOP
    EXECUTE format('ALTER TABLE roommate.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('CREATE POLICY server_access ON roommate.%I TO roommate_runtime USING (true) WITH CHECK (true)', table_name);
  END LOOP;
END
$$;
