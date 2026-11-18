import { transaction } from '../database.js';
import { HttpError } from '../errors.js';

export function swipesRepository(pool) {
  return {
    async pair(myId, otherId, operation) {
      return transaction(pool, async client => {
        const account = await client.query('SELECT status FROM roommate.accounts WHERE id = $1', [myId]);
        if (account.rows[0]?.status !== 'active') throw new HttpError(403, 'ACCOUNT_INACTIVE', 'This account is not active.');
        const [low, high] = [myId, otherId].sort();
        await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`${low}:${high}`]);
        return operation(client);
      });
    },
    async find(client, swiperId, targetId) {
      const result = await client.query('SELECT liked FROM roommate.swipes WHERE swiper_id = $1 AND target_id = $2', [swiperId, targetId]);
      return result.rows[0];
    },
    async record(client, swiperId, targetId, liked) {
      await client.query('INSERT INTO roommate.swipes (swiper_id, target_id, liked) VALUES ($1, $2, $3)', [swiperId, targetId, liked]);
    },
    async discard(client, swiperId, targetId) {
      await client.query('DELETE FROM roommate.swipes WHERE swiper_id = $1 AND target_id = $2 AND liked', [swiperId, targetId]);
    },
    async phone(client, id) {
      const result = await client.query('SELECT phone FROM roommate.profiles WHERE user_id = $1', [id]);
      return result.rows[0]?.phone;
    },
    async matches(id) {
      const result = await pool.query(`
        SELECT p.user_id AS "userId", p.display_name AS "displayName", p.phone,
          GREATEST(mine.created_at, theirs.created_at) AS "matchedAt"
        FROM roommate.swipes mine
        JOIN roommate.swipes theirs ON theirs.swiper_id = mine.target_id
          AND theirs.target_id = mine.swiper_id AND theirs.liked
        JOIN roommate.profiles p ON p.user_id = mine.target_id
        JOIN roommate.accounts a ON a.id = mine.target_id AND a.status = 'active'
        WHERE mine.swiper_id = $1 AND mine.liked
        ORDER BY "matchedAt" DESC`, [id]);
      return result.rows;
    }
  };
}