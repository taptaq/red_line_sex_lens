import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { paths } from "../src/config.js";
import { loadNoteRecords, loadNoteLifecycle, loadSuccessSamples, saveNoteLifecycle, saveSuccessSamples } from "../src/data-store.js";
import {
  buildSuccessSampleRecord,
  getSuccessSampleWeight,
  upsertSuccessSampleRecords
} from "../src/success-samples.js";
import { buildLifecycleRecord } from "../src/note-lifecycle.js";

async function withTempSuccessSamples(t, run) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "success-samples-"));
  const originals = {
    successSamples: paths.successSamples,
    noteLifecycle: paths.noteLifecycle,
    noteRecords: paths.noteRecords
  };
  paths.successSamples = path.join(tempDir, "success-samples.json");
  paths.noteLifecycle = path.join(tempDir, "note-lifecycle.json");
  paths.noteRecords = path.join(tempDir, "note-records.json");
  await Promise.all([
    fs.writeFile(paths.successSamples, "[]\n", "utf8"),
    fs.writeFile(paths.noteLifecycle, "[]\n", "utf8")
  ]);

  t.after(async () => {
    Object.assign(paths, originals);
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  return run();
}

test("buildSuccessSampleRecord normalizes tiers, metrics, content, and snapshots", () => {
  const record = buildSuccessSampleRecord({
    id: "sample-1",
    tier: "featured",
    confidence: " pending ",
    sourceQuality: " imported ",
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
  assert.equal(record.confidence, "pending");
  assert.equal(record.sourceQuality, "imported");
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

test("buildSuccessSampleRecord defaults confidence and source quality for manual samples", () => {
  const record = buildSuccessSampleRecord({
    title: "人工样本",
    body: "人工确认的高质量正文",
    source: "manual"
  });

  assert.equal(record.confidence, "confirmed");
  assert.equal(record.sourceQuality, "manual_verified");
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

test("saving success samples persists canonical note records in unified storage", async (t) => {
  await withTempSuccessSamples(t, async () => {
    const sample = buildSuccessSampleRecord({
      title: "统一存储标题",
      body: "统一存储正文",
      tier: "featured",
      metrics: { likes: 18, favorites: 6, comments: 2 },
      notes: "人工精选"
    });

    await saveSuccessSamples([sample]);

    const stored = await loadNoteRecords();
    assert.equal(stored.length, 1);
    assert.equal(stored[0].reference.enabled, true);
    assert.equal(stored[0].reference.tier, "featured");
    assert.equal(stored[0].publish.status, "published_passed");
    assert.equal(stored[0].publish.metrics.likes, 18);
    assert.equal(stored[0].note.title, "统一存储标题");
    assert.equal(stored[0].note.body, "统一存储正文");
  });
});

test("merged lifecycle facts do not downgrade success sample manual confidence semantics", async (t) => {
  await withTempSuccessSamples(t, async () => {
    await saveSuccessSamples([
      buildSuccessSampleRecord({
        title: "人工成功样本",
        body: "人工成功正文",
        tier: "featured",
        source: "manual",
        metrics: { likes: 10, favorites: 3, comments: 1 }
      })
    ]);

    await saveNoteLifecycle([
      buildLifecycleRecord({
        source: "generation_final",
        stage: "published",
        note: {
          title: "人工成功样本",
          body: "人工成功正文",
          tags: ["科普"]
        },
        publishResult: {
          status: "positive_performance",
          metrics: { likes: 66, favorites: 18, comments: 6 }
        }
      })
    ]);

    const samples = await loadSuccessSamples();

    assert.equal(samples.length, 1);
    assert.equal(samples[0].confidence, "confirmed");
    assert.equal(samples[0].sourceQuality, "manual_verified");
  });
});

test("removing success samples keeps lifecycle facts but removes the success reference view", async (t) => {
  await withTempSuccessSamples(t, async () => {
    await saveSuccessSamples([
      buildSuccessSampleRecord({
        title: "双视图样本",
        body: "双视图正文",
        tier: "performed"
      })
    ]);

    await saveNoteLifecycle([
      buildLifecycleRecord({
        source: "generation_final",
        stage: "published",
        note: {
          title: "双视图样本",
          body: "双视图正文",
          tags: ["科普"]
        },
        publishResult: {
          status: "positive_performance",
          metrics: { likes: 50, favorites: 15, comments: 5 }
        }
      })
    ]);

    await saveSuccessSamples([]);

    const samples = await loadSuccessSamples();
    const lifecycle = await loadNoteLifecycle();
    const records = await loadNoteRecords();

    assert.equal(samples.length, 0);
    assert.equal(lifecycle.length, 1);
    assert.equal(lifecycle[0].publishResult.status, "positive_performance");
    assert.equal(records.length, 1);
    assert.equal(records[0].reference.enabled, false);
  });
});
