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
      // One atomic query creates the account or updates its school.
      // Suspended accounts cannot be updated or reactivated by signing in.
      const result = await pool.query(`
        INSERT INTO roommate.accounts (id, school_id) VALUES ($1, $2)
        ON CONFLICT (id) DO UPDATE SET school_id = EXCLUDED.school_id
        WHERE roommate.accounts.status = 'active'
        RETURNING id, status
      `, [id, schoolId]);
      if (!result.rows[0]) throw new HttpError(403, 'ACCOUNT_INACTIVE', 'This account is not active.');
      return result.rows[0];
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
