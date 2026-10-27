import { z } from 'zod';

const variables = z.object({
  HOST: z.string().min(1).default('127.0.0.1'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  SUPABASE_URL: z.url().refine(value => ['http:', 'https:'].includes(new URL(value).protocol)),
  SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  SUPABASE_SECRET_KEY: z.string().min(1),
  PHOTO_BUCKET: z.string().regex(/^[a-z0-9][a-z0-9-]{0,62}$/).default('profile-photos'),
  DATABASE_URL: z.string().regex(/^postgres(?:ql)?:\/\//),
  DB_SSL: z.enum(['true', 'false']).default('true'),
  CORS_ORIGINS: z.string().default('')
});

//function to parse and validate environment variables, providing a configuration object
export function configuration(environment = process.env) {
  const parsed = variables.safeParse(environment);
  if (!parsed.success) throw new Error(`Configure these environment fields: ${[...new Set(parsed.error.issues.map(issue => issue.path[0]))].join(', ')}`);
  const config = parsed.data;
  const origins = config.CORS_ORIGINS.split(',').map(value => value.trim()).filter(Boolean);
  for (const origin of origins) {
    let url;
    try { url = new URL(origin); } catch { throw new Error('CORS_ORIGINS must contain exact HTTP(S) origins'); }
    if (!['http:', 'https:'].includes(url.protocol) || url.origin !== origin) throw new Error('CORS_ORIGINS must contain exact HTTP(S) origins');
  }
  return { ...config, origins };
}
