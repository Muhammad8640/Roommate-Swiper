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
    }
  };
}
