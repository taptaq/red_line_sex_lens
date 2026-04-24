import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

test("seed lexicon tiered checklist documents hard block manual review and observe layers", async () => {
  const filePath = path.join(process.cwd(), "docs", "seed-lexicon-tiered-checklist.md");
  const source = await fs.readFile(filePath, "utf8");

  assert.match(source, /# 种子词库分层清单/);
  assert.match(source, /## 1\. 硬拦截/);
  assert.match(source, /## 2\. 人工复核/);
  assert.match(source, /## 3\. 观察项/);
  assert.match(source, /导流与私域/);
  assert.match(source, /权威背书与认证宣称/);
  assert.match(source, /教育语境/);
});
