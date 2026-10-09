import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(8080),
  DATABASE_URL: z.string().url(),
  CORS_ORIGINS: z.string().default('http://localhost:5175,https://tili.su'),
  SESSION_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(30),
  API_PUBLIC_URL: z.string().url().default('http://localhost:8080'),
  MAIL_FROM: z.string().email().default('hello@tili.su'),
  MAIL_FROM_NAME: z.string().trim().min(1).max(80).default('TiLi'),
  UNISENDER_API_URL: z.string().url().default('https://goapi.unisender.ru/ru/transactional/api/v1'),
  UNISENDER_API_KEY: z.string().default(''),
});

export type AppConfig = z.infer<typeof envSchema> & {
  corsOrigins: string[];
};

export function readConfig(env = process.env): AppConfig {
  const parsed = envSchema.parse(env);
  return {
    ...parsed,
    corsOrigins: parsed.CORS_ORIGINS
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  };
}
