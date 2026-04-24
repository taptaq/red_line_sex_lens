import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { paths } from '../src/config.js';
import { loadFalsePositiveLog, saveFalsePositiveLog } from '../src/data-store.js';

test('load/save false positive log persists normalized entries', async (t) => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'false-positive-log-'));
  const tempFile = path.join(tempDir, 'false-positive-log.json');
  const originalPath = paths.falsePositiveLog;
  paths.falsePositiveLog = tempFile;

  t.after(async () => {
    paths.falsePositiveLog = originalPath;
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  const empty = await loadFalsePositiveLog();
  assert.deepEqual(empty, []);

  await saveFalsePositiveLog([
    {
      id: '  fp-1  ',
      status: '   ',
      observationWindowHours: '  24  ',
      title: '  示例标题  ',
      body: '  正文内容  ',
      coverText: '  封面文案  ',
      userNotes: '  人工备注  ',
      tags: ['关系沟通', '关系沟通', '  健康表达  ', '']
    }
  ]);

  const persisted = JSON.parse(await fs.readFile(tempFile, 'utf8'));
  assert.equal(persisted[0].id, 'fp-1');
  assert.equal(persisted[0].status, 'platform_passed_pending');
  assert.equal(persisted[0].observationWindowHours, 24);
  assert.equal(persisted[0].title, '示例标题');
  assert.equal(persisted[0].body, '正文内容');
  assert.equal(persisted[0].coverText, '封面文案');
  assert.equal(persisted[0].userNotes, '人工备注');
  assert.deepEqual(persisted[0].tags, ['关系沟通', '健康表达']);

  const loaded = await loadFalsePositiveLog();
  assert.equal(loaded[0].id, 'fp-1');
  assert.equal(loaded[0].status, 'platform_passed_pending');
  assert.equal(loaded[0].observationWindowHours, 24);
  assert.equal(loaded[0].title, '示例标题');
  assert.equal(loaded[0].body, '正文内容');
  assert.equal(loaded[0].coverText, '封面文案');
  assert.equal(loaded[0].userNotes, '人工备注');
  assert.deepEqual(loaded[0].tags, ['关系沟通', '健康表达']);
});
