-- SQL constraints protect data even when it is written outside the API.
CREATE FUNCTION roommate.valid_preferences(answers jsonb, restrictions jsonb)
RETURNS boolean LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  keys text[] := ARRAY['cleanliness','sleep','noise','guests','smoking','sharing'];
  item record;
  option_value jsonb;
BEGIN
  IF answers IS NULL OR restrictions IS NULL OR jsonb_typeof(answers) <> 'object'
     OR jsonb_typeof(restrictions) <> 'object' THEN RETURN false; END IF;
  IF NOT (answers ?& keys) OR (SELECT count(*) FROM jsonb_object_keys(answers)) <> 6 THEN RETURN false; END IF;
  FOR item IN SELECT * FROM jsonb_each(answers) LOOP
    IF item.value NOT IN ('0'::jsonb,'1'::jsonb,'2'::jsonb,'3'::jsonb) THEN RETURN false; END IF;
  END LOOP;
  FOR item IN SELECT * FROM jsonb_each(restrictions) LOOP
    IF NOT (item.key = ANY(keys)) OR jsonb_typeof(item.value) <> 'array' THEN RETURN false; END IF;
    IF jsonb_array_length(item.value) NOT BETWEEN 1 AND 4 THEN RETURN false; END IF;
    IF (SELECT count(DISTINCT value) FROM jsonb_array_elements(item.value)) <> jsonb_array_length(item.value) THEN RETURN false; END IF;
    FOR option_value IN SELECT value FROM jsonb_array_elements(item.value) LOOP
      IF option_value NOT IN ('0'::jsonb,'1'::jsonb,'2'::jsonb,'3'::jsonb) THEN RETURN false; END IF;
    END LOOP;
  END LOOP;
  RETURN true;
END;
$$;

CREATE TABLE roommate.preferences (
  user_id uuid PRIMARY KEY REFERENCES roommate.profiles(user_id) ON DELETE CASCADE,
  questionnaire_version smallint NOT NULL CHECK (questionnaire_version = 1),
  scenario_answers jsonb NOT NULL,
  dealbreakers jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (roommate.valid_preferences(scenario_answers, dealbreakers))
);
ALTER TABLE roommate.preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY server_access ON roommate.preferences TO roommate_runtime USING (true) WITH CHECK (true);
REVOKE ALL ON roommate.preferences FROM PUBLIC;
REVOKE ALL ON FUNCTION roommate.valid_preferences(jsonb,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION roommate.valid_preferences(jsonb,jsonb) TO roommate_runtime;
GRANT SELECT, INSERT, UPDATE ON roommate.preferences TO roommate_runtime;
DO $$
DECLARE client_role text;
BEGIN
  FOREACH client_role IN ARRAY ARRAY['anon','authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = client_role) THEN
      EXECUTE format('REVOKE ALL ON roommate.preferences FROM %I', client_role);
    END IF;
  END LOOP;
END;
$$;
