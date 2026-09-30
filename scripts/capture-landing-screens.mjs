/**
 * Real TiLi/Lumi screenshots for landing (Playwright + local dev or prod URL).
 * Usage: npm run dev  →  node scripts/capture-landing-screens.mjs
 */
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '../public/screens');
const base = (process.env.TILI_DEV_URL || 'http://127.0.0.1:5173/').replace(/\/?$/, '/');

function findChromiumExecutable() {
  const cache = path.join(os.homedir(), 'Library/Caches/ms-playwright');
  if (!fs.existsSync(cache)) return null;
  for (const dir of fs.readdirSync(cache)) {
    if (!dir.startsWith('chromium-')) continue;
    const exe = path.join(
      cache,
      dir,
      'chrome-mac',
      'Chromium.app',
      'Contents',
      'MacOS',
      'Chromium',
    );
    if (fs.existsSync(exe)) return exe;
  }
  return null;
}

async function main() {
  let chromium;
  try {
    ({ chromium } = await import('playwright'));
  } catch {
    console.error('Run: npm install -D playwright && npx playwright install chromium');
    process.exit(1);
  }

  fs.mkdirSync(outDir, { recursive: true });

  const executablePath = findChromiumExecutable();
  const launchOpts = { headless: true };
  if (executablePath) {
    launchOpts.executablePath = executablePath;
  }

  const browser = await chromium.launch(launchOpts);
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    locale: 'ru-RU',
    colorScheme: 'light',
  });

  await ctx.addInitScript(() => {
    localStorage.setItem('tili-onboarding-done', '1');
    localStorage.setItem('tili-analytics-consent', 'no');
    try {
      sessionStorage.setItem('tili-main-tab', 'calendar');
    } catch (_) {}
  });

  const page = await ctx.newPage();

  async function shot(name, fn) {
    await fn();
    await page.waitForTimeout(800);
    const shell = page.locator('.app-shell').first();
    await shell.waitFor({ state: 'visible', timeout: 30000 });
    await shell.screenshot({ path: path.join(outDir, name) });
    console.log('✓', name);
  }

  await page.goto(`${base}?lang=ru`, { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForSelector('.zoom-tabs', { timeout: 30000 });

  await shot('tili-day.png', async () => {
    await page.getByRole('button', { name: 'День', exact: true }).click();
  });

  await shot('tili-week.png', async () => {
    await page.getByRole('button', { name: 'Неделя', exact: true }).click();
  });

  await shot('tili-month.png', async () => {
    await page.getByRole('button', { name: 'Месяц', exact: true }).click();
  });

  await shot('lumi-wish.png', async () => {
    await page.locator('.bottom-nav__item').filter({ hasText: 'Желания' }).click();
    await page.waitForTimeout(1200);
  });

  await browser.close();
  console.log('Saved to', outDir);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
