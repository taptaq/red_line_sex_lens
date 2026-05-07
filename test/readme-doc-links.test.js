import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

test("README links to the system flow and seed lexicon tiered checklist docs", async () => {
  const source = await fs.readFile(path.join(process.cwd(), "README.md"), "utf8");

  assert.match(source, /\[SYSTEM_FLOW\.md\]\(\.\/SYSTEM_FLOW\.md\)/);
  assert.match(source, /\[docs\/seed-lexicon-tiered-checklist\.md\]\(\.\/docs\/seed-lexicon-tiered-checklist\.md\)/);
  assert.match(source, /样本库/);
  assert.match(source, /note-records\.json/);
  assert.match(source, /风格画像/);
  assert.match(source, /自进化成稿工作台/);
  assert.match(source, /AI 记忆共享层/);
  assert.match(source, /npm run memory:rebuild/);
  assert.match(source, /npm run memory:inspect/);
  assert.match(source, /data\/memory\//);
});
