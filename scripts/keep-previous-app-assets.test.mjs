import assert from 'node:assert/strict';
import test from 'node:test';
import { assetNamesFromHtml, filesToDelete } from './keep-previous-app-assets.mjs';

test('reads hashed js and css from app html', () => {
  const html = `
    <script type="module" src="/app/assets/index-DPTM9fbZ.js"></script>
    <link rel="stylesheet" href="/app/assets/index-abc123.css">
  `;
  assert.deepEqual(assetNamesFromHtml(html).sort(), [
    'index-DPTM9fbZ.js',
    'index-abc123.css',
  ]);
});

test('keeps current bundle plus two newest extras', () => {
  const deleted = filesToDelete(
    [
      { name: 'index-new.js', mtimeMs: 300 },
      { name: 'index-mid.js', mtimeMs: 200 },
      { name: 'index-old.js', mtimeMs: 100 },
      { name: 'index-ancient.js', mtimeMs: 50 },
    ],
    new Set(['index-new.js']),
    2,
  );
  assert.deepEqual(deleted, ['index-ancient.js']);
});

test('never deletes the html-referenced file', () => {
  const deleted = filesToDelete(
    [
      { name: 'index-current.js', mtimeMs: 1 },
      { name: 'index-a.js', mtimeMs: 9 },
      { name: 'index-b.js', mtimeMs: 8 },
    ],
    new Set(['index-current.js']),
    2,
  );
  assert.equal(deleted.includes('index-current.js'), false);
  assert.equal(deleted.length, 0);
});
