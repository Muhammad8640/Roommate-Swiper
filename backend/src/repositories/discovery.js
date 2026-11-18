const CANDIDATE = `
  SELECT p.user_id AS "userId", p.display_name AS "displayName", p.bio,
    p.major, p.class_year AS "classYear", p.interests,
    q.questionnaire_version AS "questionnaireVersion",
    q.scenario_answers AS "scenarioAnswers", q.non_negotiables AS "nonNegotiables"
  FROM roommate.profiles p
  JOIN roommate.accounts a ON a.id = p.user_id
  JOIN roommate.preferences q ON q.user_id = p.user_id
  WHERE a.school_id = $2 AND a.status = 'active'
    AND EXISTS (SELECT 1 FROM roommate.photos WHERE user_id = p.user_id)`;

export function discoveryRepository(pool) {
  return {
    async setup(id) {
      const result = await pool.query(`SELECT
        EXISTS (SELECT 1 FROM roommate.profiles WHERE user_id = $1) AS profile,
        EXISTS (SELECT 1 FROM roommate.photos WHERE user_id = $1) AS photo,
        EXISTS (SELECT 1 FROM roommate.preferences WHERE user_id = $1) AS preferences`, [id]);
      return result.rows[0];
    },
    async list(id, schoolId, limit, offset) {
      // Select public fields explicitly: never include phone or private restrictions.
      const result = await pool.query(`
        SELECT p.user_id AS "userId", p.display_name AS "displayName", p.bio,
          p.major, p.class_year AS "classYear", p.interests,
          q.questionnaire_version AS "questionnaireVersion", q.scenario_answers AS "scenarioAnswers"
        FROM roommate.profiles p
        JOIN roommate.accounts a ON a.id = p.user_id
        JOIN roommate.preferences q ON q.user_id = p.user_id
        WHERE p.user_id <> $1 AND a.school_id = $2 AND a.status = 'active'
          AND EXISTS (SELECT 1 FROM roommate.photos WHERE user_id = p.user_id)
        ORDER BY p.user_id LIMIT $3 OFFSET $4`, [id, schoolId, limit, offset]);
      return result.rows;
    },
    async photos(id) {
      const result = await pool.query('SELECT id, position, object_key AS key FROM roommate.photos WHERE user_id = $1 ORDER BY position', [id]);
      return result.rows;
    },
    async preferences(id) {
      const result = await pool.query(`SELECT scenario_answers AS "scenarioAnswers", non_negotiables AS "nonNegotiables"
        FROM roommate.preferences WHERE user_id = $1`, [id]);
      return result.rows[0];
    },
    async candidates(id, schoolId) {
      const result = await pool.query(`${CANDIDATE}
        AND p.user_id <> $1
        AND NOT EXISTS (SELECT 1 FROM roommate.swipes s WHERE s.swiper_id = $1 AND s.target_id = p.user_id)
        AND NOT EXISTS (SELECT 1 FROM roommate.swipes s WHERE s.swiper_id = p.user_id AND s.target_id = $1 AND NOT s.liked)`,
      [id, schoolId]);
      return result.rows;
    },
    async candidate(id, schoolId) {
      const result = await pool.query(`${CANDIDATE} AND p.user_id = $1`, [id, schoolId]);
      return result.rows[0];
    }
  };
}
