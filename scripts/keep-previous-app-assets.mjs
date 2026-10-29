/**
 * Keep the last hashed app JS/CSS across Vite's emptyOutDir wipe.
 * Old installed PWAs still request yesterday's index-*.js after a deploy.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';

const root = process.cwd();
const assetsDir = path.join(root, 'dist', 'app', 'assets');
const indexHtml = path.join(root, 'dist', 'app', 'index.html');
const snapDir = path.join(os.tmpdir(), 'tili-kept-app-assets');
const LIVE = (process.env.TILI_LIVE_APP || 'https://tili.su').replace(/\/$/, '');
const EXTRA_KEEP = 2;

export function assetNamesFromHtml(html) {
  const names = new Set();
  const re = /\/app\/assets\/(index-[A-Za-z0-9_-]+\.(?:js|css))/g;
  for (const match of html.matchAll(re)) names.add(match[1]);
  return [...names];
}

export function filesToDelete(entries, currentNames, extraKeep = EXTRA_KEEP) {
  const current = entries.filter((row) => currentNames.has(row.name));
  const others = entries
    .filter((row) => !currentNames.has(row.name))
    .slice()
    .sort((a, b) => b.mtimeMs - a.mtimeMs);
  const keep = new Set([
    ...current.map((row) => row.name),
    ...others.slice(0, extraKeep).map((row) => row.name),
  ]);
  return entries.map((row) => row.name).filter((name) => !keep.has(name));
}

function listIndexAssets(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((name) => /^index-[A-Za-z0-9_-]+\.(js|css)$/.test(name))
    .map((name) => {
      const stat = fs.statSync(path.join(dir, name));
      return { name, mtimeMs: stat.mtimeMs };
    });
}

function copyFilePreserve(from, to) {
  fs.copyFileSync(from, to);
  const stat = fs.statSync(from);
  fs.utimesSync(to, stat.atime, stat.mtime);
}

function snapshot() {
  fs.mkdirSync(snapDir, { recursive: true });
  for (const name of fs.existsSync(snapDir) ? fs.readdirSync(snapDir) : []) {
    fs.rmSync(path.join(snapDir, name), { force: true });
  }
  const rows = listIndexAssets(assetsDir);
  for (const row of rows) {
    copyFilePreserve(path.join(assetsDir, row.name), path.join(snapDir, row.name));
  }
  console.log(`keep-previous snapshot: ${rows.length} file(s) → ${snapDir}`);
}

async function fetchLiveNames() {
  try {
    const res = await fetch(`${LIVE}/app/`, { redirect: 'follow' });
    if (!res.ok) return [];
    return assetNamesFromHtml(await res.text());
  } catch {
    return [];
  }
}

async function downloadLive(name) {
  const dest = path.join(assetsDir, name);
  if (fs.existsSync(dest)) return 'have';
  try {
    const res = await fetch(`${LIVE}/app/assets/${name}`);
    if (!res.ok) return `skip ${name} ${res.status}`;
    fs.mkdirSync(assetsDir, { recursive: true });
    fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
    return `live ${name}`;
  } catch {
    return `skip ${name}`;
  }
}

function restoreSnapshot() {
  if (!fs.existsSync(snapDir)) return [];
  fs.mkdirSync(assetsDir, { recursive: true });
  const kept = [];
  for (const name of fs.readdirSync(snapDir)) {
    if (!/^index-[A-Za-z0-9_-]+\.(js|css)$/.test(name)) continue;
    const dest = path.join(assetsDir, name);
    if (fs.existsSync(dest)) continue;
    copyFilePreserve(path.join(snapDir, name), dest);
    kept.push(name);
  }
  return kept;
}

function prune() {
  if (!fs.existsSync(assetsDir)) return;
  const current = new Set(
    fs.existsSync(indexHtml) ? assetNamesFromHtml(fs.readFileSync(indexHtml, 'utf8')) : [],
  );
  for (const ext of ['.js', '.css']) {
    const entries = listIndexAssets(assetsDir).filter((row) => row.name.endsWith(ext));
    for (const name of filesToDelete(entries, current, EXTRA_KEEP)) {
      fs.rmSync(path.join(assetsDir, name), { force: true });
      console.log(`keep-previous prune ${name}`);
    }
  }
}

async function restore() {
  const fromSnap = restoreSnapshot();
  if (fromSnap.length) console.log(`keep-previous restore snapshot: ${fromSnap.join(', ')}`);
  const live = await fetchLiveNames();
  for (const name of live) {
    const result = await downloadLive(name);
    if (result.startsWith('live')) console.log(`keep-previous ${result}`);
  }
  prune();
  const left = listIndexAssets(assetsDir).map((row) => row.name).sort();
  console.log(`keep-previous assets: ${left.join(', ') || '(none)'}`);
}

const invoked = process.argv[1]?.replace(/\\/g, '/').endsWith('keep-previous-app-assets.mjs');
if (invoked) {
  const command = process.argv[2] || 'restore';
  if (command === 'snapshot') snapshot();
  else if (command === 'restore') void restore();
  else {
    console.error('usage: keep-previous-app-assets.mjs snapshot|restore');
    process.exit(1);
  }
}
