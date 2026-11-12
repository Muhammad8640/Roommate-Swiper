export function preferencesRepository() {
  return {
    async read(client, id) {
      const result = await client.query(`SELECT user_id AS "userId", questionnaire_version AS "questionnaireVersion",
        scenario_answers AS "scenarioAnswers", non_negotiables AS "nonNegotiables", updated_at AS "updatedAt"
        FROM roommate.preferences WHERE user_id = $1`, [id]);
      return result.rows[0];
    },
    async write(client, id, values) {
      await client.query(`INSERT INTO roommate.preferences (user_id, questionnaire_version, scenario_answers, non_negotiables)
        VALUES ($1, $2, $3::jsonb, $4::jsonb)
        ON CONFLICT (user_id) DO UPDATE SET questionnaire_version = EXCLUDED.questionnaire_version,
          scenario_answers = EXCLUDED.scenario_answers, non_negotiables = EXCLUDED.non_negotiables, updated_at = now()`,
      [id, values.questionnaireVersion, JSON.stringify(values.scenarioAnswers), JSON.stringify(values.nonNegotiables)]);
    }
  };
}
