import { transaction } from '../database.js';
import { HttpError } from '../errors.js';

export function accountsRepository(pool) {
  return {
    async schools() {
      const result = await pool.query(`
        SELECT schools.id, schools.name, array_agg(domains.domain ORDER BY domains.domain) AS domains
        FROM roommate.schools schools JOIN roommate.school_domains domains ON domains.school_id = schools.id
        WHERE schools.enabled GROUP BY schools.id ORDER BY schools.name, schools.id
      `);
      return result.rows;
    },
    async schoolFor(domain) {
      const result = await pool.query(`
        SELECT schools.id, schools.name FROM roommate.schools schools
        JOIN roommate.school_domains domains ON schools.id = domains.school_id
        WHERE domains.domain = $1 AND schools.enabled
      `, [domain]);
      return result.rows[0];
    },
    async identify(id, schoolId) {
      return transaction(pool, async client => {
        await client.query('INSERT INTO roommate.accounts (id, school_id) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING', [id, schoolId]);
        const result = await client.query('SELECT id, school_id, status FROM roommate.accounts WHERE id = $1 FOR UPDATE', [id]);
        const account = result.rows[0];
        if (account.status !== 'active') throw new HttpError(403, 'ACCOUNT_INACTIVE', 'This account is not active.');
        if (account.school_id !== schoolId) await client.query('UPDATE roommate.accounts SET school_id = $2 WHERE id = $1', [id, schoolId]);
        return { id, status: account.status };
      });
    },
    async completion(id) {
      const result = await pool.query(`
        SELECT EXISTS (SELECT 1 FROM roommate.profiles WHERE user_id = $1) AS profile,
               EXISTS (SELECT 1 FROM roommate.photos WHERE user_id = $1) AS photo
      `, [id]);
      return result.rows[0];
    }
  };
}
