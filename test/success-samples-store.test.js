import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { paths } from "../src/config.js";
import { loadSuccessSamples, saveSuccessSamples } from "../src/data-store.js";
import {
  buildSuccessSampleRecord,
  getSuccessSampleWeight,
  upsertSuccessSampleRecords
} from "../src/success-samples.js";

async function withTempSuccessSamples(t, run) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "success-samples-"));
  const originalPath = paths.successSamples;
  paths.successSamples = path.join(tempDir, "success-samples.json");
  await fs.writeFile(paths.successSamples, "[]\n", "utf8");

  t.after(async () => {
    paths.successSamples = originalPath;
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  return run();
}

test("buildSuccessSampleRecord normalizes tiers, metrics, content, and snapshots", () => {
  const record = buildSuccessSampleRecord({
    id: "sample-1",
    tier: "featured",
    title: " 标题 ",
    body: " 正文 ",
    coverText: " 封面 ",
    tags: ["科普", "科普", "关系"],
    publishedAt: "2026-04-20",
    metrics: { likes: "12", favorites: "5", comments: "3" },
    source: "current_rewrite",
    notes: "人工精选",
    analysisSnapshot: { verdict: "pass" },
    rewriteSnapshot: { model: "glm-test" }
  });

  assert.equal(record.tier, "featured");
  assert.equal(record.title, "标题");
  assert.equal(record.body, "正文");
  assert.deepEqual(record.tags, ["科普", "关系"]);
  assert.deepEqual(record.metrics, { likes: 12, favorites: 5, comments: 3 });
  assert.equal(record.source, "current_rewrite");
  assert.equal(record.analysisSnapshot.verdict, "pass");
  assert.equal(record.rewriteSnapshot.model, "glm-test");
  assert.ok(getSuccessSampleWeight(record) > 3);
  assert.equal(record.sampleWeight, getSuccessSampleWeight(record));
});

test("success sample store upserts the same note instead of appending duplicates", async (t) => {
  await withTempSuccessSamples(t, async () => {
    const first = buildSuccessSampleRecord({
      title: "同一篇",
      body: "同一段正文",
      tier: "passed",
      metrics: { likes: 1 }
    });
    const second = buildSuccessSampleRecord({
      title: "同一篇",
      body: "同一段正文",
      tier: "performed",
      metrics: { likes: 20, favorites: 8, comments: 2 }
    });

    await saveSuccessSamples(upsertSuccessSampleRecords([], [first]));
    const next = upsertSuccessSampleRecords(await loadSuccessSamples(), [second]);
    await saveSuccessSamples(next);

    const stored = await loadSuccessSamples();
    assert.equal(stored.length, 1);
    assert.equal(stored[0].tier, "performed");
    assert.equal(stored[0].metrics.likes, 20);
    assert.equal(stored[0].createdAt, first.createdAt);
  });
});
