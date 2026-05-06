import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { paths } from '../src/config.js';
import { loadAnalyzeTagOptions } from '../src/data-store.js';

test('loadAnalyzeTagOptions tolerates missing configured file for backward compatibility reads', async (t) => {
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
});
