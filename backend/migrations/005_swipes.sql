CREATE TABLE roommate.swipes (
  swiper_id uuid NOT NULL REFERENCES roommate.profiles(user_id) ON DELETE CASCADE,
  target_id uuid NOT NULL REFERENCES roommate.profiles(user_id) ON DELETE CASCADE,
  liked boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (swiper_id, target_id),
  CHECK (swiper_id <> target_id)
);
CREATE INDEX swipes_target_idx ON roommate.swipes (target_id);

ALTER TABLE roommate.swipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY server_access ON roommate.swipes TO roommate_runtime USING (true) WITH CHECK (true);
REVOKE ALL ON roommate.swipes FROM PUBLIC;
GRANT SELECT, INSERT, DELETE ON roommate.swipes TO roommate_runtime;
DO $$
DECLARE client_role text;
BEGIN
  FOREACH client_role IN ARRAY ARRAY['anon','authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = client_role) THEN
      EXECUTE format('REVOKE ALL ON roommate.swipes FROM %I', client_role);
    END IF;
  END LOOP;
END;
$$;