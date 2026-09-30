/**
 * After vite build: inject PostHog key into dist/landing-analytics.js
 * Reads .env.production from cwd (nested build folder).
 */
import fs from 'fs';
import path from 'path';

const root = process.cwd();
const envPath = path.join(root, '.env.production');
const target = path.join(root, 'dist', 'landing-analytics.js');

function readEnv() {
  if (!fs.existsSync(envPath)) return {};
  const text = fs.readFileSync(envPath, 'utf8');
  const out = {};
  for (const line of text.split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) out[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
  return out;
}

if (!fs.existsSync(target)) {
  console.warn('inject-landing-env: no dist/landing-analytics.js, skip');
  process.exit(0);
}

const env = readEnv();
const key = env.VITE_POSTHOG_KEY || '';
const host = (env.VITE_POSTHOG_HOST || 'https://eu.i.posthog.com').replace(/\/$/, '');

let js = fs.readFileSync(target, 'utf8');
js = js.replace('__POSTHOG_KEY__', key);
js = js.replace('__POSTHOG_HOST__', host);
fs.writeFileSync(target, js);
console.log('inject-landing-env: PostHog', key ? 'ok' : 'empty key');
