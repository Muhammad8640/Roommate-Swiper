import { transaction } from '../database.js';
import { HttpError } from '../errors.js';

export function profilesRepository(pool) {
  return {
    async owned(id, operation) {
      return transaction(pool, async client => {
        const result = await client.query('SELECT status FROM roommate.accounts WHERE id = $1 FOR UPDATE', [id]);
        if (result.rows[0]?.status !== 'active') throw new HttpError(403, 'ACCOUNT_INACTIVE', 'This account is not active.');
        return operation(client);
      });
    },
    async read(client, id) {
      const result = await client.query(`
        SELECT user_id AS "userId", display_name AS "displayName", bio, major,
               class_year AS "classYear", interests FROM roommate.profiles WHERE user_id = $1
      `, [id]);
      return result.rows[0];
    },
    async write(client, id, values) {
      await client.query(`
        INSERT INTO roommate.profiles (user_id, display_name, bio, major, class_year, interests)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (user_id) DO UPDATE SET display_name = EXCLUDED.display_name,
          bio = EXCLUDED.bio, major = EXCLUDED.major, class_year = EXCLUDED.class_year,
          interests = EXCLUDED.interests, updated_at = now()
      `, [id, values.displayName, values.bio, values.major, values.classYear, values.interests]);
    },
    async photos(client, id) {
      const result = await client.query('SELECT id, object_key AS key, position FROM roommate.photos WHERE user_id = $1 ORDER BY position', [id]);
      return result.rows;
    },
    async addPhoto(client, id, photo) {
      await client.query('INSERT INTO roommate.photos (id, user_id, object_key, position) VALUES ($1, $2, $3, $4)', [photo.id, id, photo.key, photo.position]);
    },
    async deletePhoto(client, id, photoId) {
      await client.query('DELETE FROM roommate.photos WHERE user_id = $1 AND id = $2', [id, photoId]);
    }
  };
}
