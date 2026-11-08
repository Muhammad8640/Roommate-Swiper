-- Legacy dealbreakers listed ACCEPTABLE answers. Convert to forbidden answers
-- so existing students retain the same effective restrictions.
ALTER TABLE roommate.preferences ADD COLUMN non_negotiables jsonb NOT NULL DEFAULT '{}';
UPDATE roommate.preferences p SET non_negotiables = COALESCE((
  SELECT jsonb_object_agg(item.key, rejected.options)
  FROM jsonb_each(p.dealbreakers) item
  CROSS JOIN LATERAL (
    SELECT jsonb_agg(option ORDER BY option) AS options
    FROM generate_series(0, 3) AS option
    WHERE NOT (item.value @> jsonb_build_array(option))
  ) rejected
  WHERE rejected.options IS NOT NULL
), '{}'::jsonb);
-- Dropping the old column also drops its dependent table CHECK.
ALTER TABLE roommate.preferences DROP COLUMN dealbreakers;
ALTER TABLE roommate.preferences ADD CONSTRAINT preferences_answers_non_negotiables_check
  CHECK (roommate.valid_preferences(scenario_answers, non_negotiables));
