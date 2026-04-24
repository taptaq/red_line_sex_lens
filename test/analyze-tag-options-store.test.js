import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { paths } from '../src/config.js';
import { loadAnalyzeTagOptions, saveAnalyzeTagOptions } from '../src/data-store.js';

test('load/save analyze tag options persists to configured json file', async (t) => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'tag-options-'));
  const tempFile = path.join(tempDir, 'analyze-tag-options.json');
  const originalPath = paths.analyzeTagOptions;
  paths.analyzeTagOptions = tempFile;

  t.after(async () => {
    paths.analyzeTagOptions = originalPath;
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  const empty = await loadAnalyzeTagOptions();
  assert.deepEqual(empty, []);

  await saveAnalyzeTagOptions(['关系沟通', '  亲密关系  ', '', '关系沟通']);

  const persisted = JSON.parse(await fs.readFile(tempFile, 'utf8'));
  assert.deepEqual(persisted, ['关系沟通', '亲密关系']);

  const loaded = await loadAnalyzeTagOptions();
  assert.deepEqual(loaded, ['关系沟通', '亲密关系']);
});
