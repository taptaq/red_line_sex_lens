import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { paths } from "../src/config.js";
import {
  loadNoteLifecycle,
  loadNoteRecords,
  loadSuccessSamples,
  saveNoteLifecycle,
  saveNoteRecords,
  saveSuccessSamples
} from "../src/data-store.js";
import { buildLifecycleRecord } from "../src/note-lifecycle.js";
import {
  buildNoteFingerprint,
  buildNoteRecord,
  dedupeNoteRecords,
  mergeNoteRecords,
  migrateLifecycleToNoteRecord,
  migrateSuccessSampleToNoteRecord
} from "../src/note-records.js";
import { buildSuccessSampleRecord } from "../src/success-samples.js";

async function withTempNoteRecordsStore(t, run) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "note-records-store-"));
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

test("config exposes note records path", () => {
  assert.match(paths.noteRecords, /data\/note-records\.json$/);
});

test("note records normalize success samples and lifecycle records into one canonical shape", () => {
  const success = migrateSuccessSampleToNoteRecord({
    id: "success-1",
    title: "  真实经验分享 ",
    body: "  正文  ",
    coverText: "  封面  ",
    tags: ["关系", "关系", "沟通"],
    tier: "performed",
    metrics: { likes: "12", favorites: 3, comments: "2" },
    notes: "人工挑选",
    createdAt: "2026-04-29T10:00:00.000Z"
  });

  const lifecycle = migrateLifecycleToNoteRecord({
    id: "life-1",
    source: "rewrite",
    stage: "published",
    note: {
      title: "真实经验分享",
      body: "正文",
      coverText: "封面",
      tags: ["沟通", "关系"]
    },
    publishResult: {
      status: "positive_performance",
      metrics: { likes: 30, favorites: 10, comments: 4 },
      notes: "发布后表现好"
    },
    createdAt: "2026-04-29T12:00:00.000Z"
  });

  assert.equal(success.reference.enabled, true);
  assert.equal(success.reference.tier, "performed");
  assert.equal(success.publish.status, "published_passed");
  assert.equal(lifecycle.reference.enabled, false);
  assert.equal(lifecycle.publish.status, "positive_performance");
  assert.equal(success.note.title, "真实经验分享");
  assert.deepEqual(success.note.tags, ["关系", "沟通"]);
});

test("note records merge by fingerprint and preserve lifecycle publish facts plus success reference facts", () => {
  const merged = mergeNoteRecords(
    migrateSuccessSampleToNoteRecord({
      title: "同一篇内容",
      body: "正文",
      tags: ["科普"],
      tier: "featured",
      createdAt: "2026-04-28T08:00:00.000Z"
    }),
    migrateLifecycleToNoteRecord({
      source: "generation_final",
      note: { title: "同一篇内容", body: "正文", tags: ["科普"] },
      publishResult: { status: "positive_performance", metrics: { likes: 99 } },
      createdAt: "2026-04-29T08:00:00.000Z"
    })
  );

  assert.equal(merged.reference.enabled, true);
  assert.equal(merged.reference.tier, "featured");
  assert.equal(merged.publish.status, "positive_performance");
  assert.equal(merged.publish.metrics.likes, 99);
  assert.equal(merged.createdAt, "2026-04-28T08:00:00.000Z");
});

test("dedupeNoteRecords collapses success and lifecycle entries with the same fingerprint", () => {
  const records = dedupeNoteRecords([
    buildNoteRecord({
      note: { title: "A", body: "B", tags: ["x", "x"] },
      reference: { enabled: true, tier: "passed" }
    }),
    buildNoteRecord({
      note: { title: "A", body: "B", tags: ["x"] },
      publish: { status: "published_passed", metrics: { likes: 8 } }
    })
  ]);

  assert.equal(records.length, 1);
  assert.equal(records[0].reference.enabled, true);
  assert.equal(records[0].publish.status, "published_passed");
});

test("dedupeNoteRecords is stable regardless of input order", () => {
  const success = migrateSuccessSampleToNoteRecord({
    title: "顺序无关",
    body: "同一篇正文",
    tags: ["科普"],
    tier: "featured",
    notes: "人工挑选"
  });
  const lifecycle = migrateLifecycleToNoteRecord({
    source: "generation_final",
    stage: "published",
    note: {
      title: "顺序无关",
      body: "同一篇正文",
      tags: ["科普"]
    },
    publishResult: {
      status: "positive_performance",
      metrics: { likes: 99, favorites: 18, comments: 6 },
      notes: "发布表现稳定"
    }
  });

  const leftFirst = dedupeNoteRecords([success, lifecycle])[0];
  const rightFirst = dedupeNoteRecords([lifecycle, success])[0];

  assert.deepEqual(rightFirst, leftFirst);
  assert.equal(leftFirst.source, "generation_final");
  assert.equal(leftFirst.stage, "published");
  assert.equal(leftFirst.publish.status, "positive_performance");
  assert.equal(leftFirst.reference.tier, "featured");
});

test("mergeNoteRecords preserves existing publish and reference details during partial updates", () => {
  const existing = buildNoteRecord({
    source: "generation_final",
    stage: "published",
    note: { title: "部分更新", body: "正文" },
    publish: {
      status: "positive_performance",
      metrics: { likes: 36, favorites: 12, comments: 4 },
      notes: "原始备注",
      publishedAt: "2026-04-22",
      platformReason: "passed"
    },
    reference: {
      enabled: true,
      tier: "featured",
      selectedBy: "manual",
      notes: "人工精选"
    }
  });

  const merged = mergeNoteRecords(existing, {
    note: { title: "部分更新", body: "正文" },
    publish: { status: "published_passed" },
    reference: { enabled: true }
  });

  assert.equal(merged.publish.status, "positive_performance");
  assert.deepEqual(merged.publish.metrics, { likes: 36, favorites: 12, comments: 4 });
  assert.equal(merged.publish.notes, "原始备注");
  assert.equal(merged.publish.publishedAt, "2026-04-22");
  assert.equal(merged.publish.platformReason, "passed");
  assert.equal(merged.reference.enabled, true);
  assert.equal(merged.reference.tier, "featured");
  assert.equal(merged.reference.selectedBy, "manual");
  assert.equal(merged.reference.notes, "人工精选");
});

test("dedupeNoteRecords picks a deterministic id for duplicate records with different source ids", () => {
  const leftFirst = dedupeNoteRecords([
    migrateSuccessSampleToNoteRecord({
      id: "success-99",
      title: "ID 稳定",
      body: "同一篇正文"
    }),
    migrateLifecycleToNoteRecord({
      id: "life-01",
      note: {
        title: "ID 稳定",
        body: "同一篇正文"
      }
    })
  ])[0];

  const rightFirst = dedupeNoteRecords([
    migrateLifecycleToNoteRecord({
      id: "life-01",
      note: {
        title: "ID 稳定",
        body: "同一篇正文"
      }
    }),
    migrateSuccessSampleToNoteRecord({
      id: "success-99",
      title: "ID 稳定",
      body: "同一篇正文"
    })
  ])[0];

  assert.equal(leftFirst.id, "life-01");
  assert.equal(rightFirst.id, "life-01");
});

test("buildNoteFingerprint is stable across tag ordering and whitespace", () => {
  assert.equal(
    buildNoteFingerprint({ title: " 标题 ", body: "正文", coverText: "", tags: ["b", "a"] }),
    buildNoteFingerprint({ title: "标题", body: "正文", coverText: "", tags: ["a", "b", "a"] })
  );
});

test("note records store round-trips canonical records", async (t) => {
  await withTempNoteRecordsStore(t, async () => {
    const record = buildNoteRecord({
      source: "generation_final",
      stage: "published",
      note: {
        title: "统一 canonical 标题",
        body: "统一 canonical 正文",
        tags: ["科普", "关系"]
      },
      publish: {
        status: "positive_performance",
        metrics: { likes: 42, favorites: 15, comments: 3 }
      },
      reference: {
        enabled: true,
        tier: "featured",
        selectedBy: "manual"
      }
    });

    await saveNoteRecords([record]);

    const stored = await loadNoteRecords();
    assert.equal(stored.length, 1);
    assert.deepEqual(stored[0], record);
  });
});

test("saving lifecycle view persists canonical note records in unified storage", async (t) => {
  await withTempNoteRecordsStore(t, async () => {
    const lifecycle = buildLifecycleRecord({
      source: "generation_final",
      stage: "published",
      note: {
        title: "生命周期标题",
        body: "生命周期正文",
        coverText: "封面",
        tags: ["科普"]
      },
      publishResult: {
        status: "positive_performance",
        metrics: { likes: 36, favorites: 12, comments: 4 },
        notes: "发布后表现好"
      }
    });

    await saveNoteLifecycle([lifecycle]);

    const stored = await loadNoteRecords();
    assert.equal(stored.length, 1);
    assert.equal(stored[0].publish.status, "positive_performance");
    assert.equal(stored[0].publish.metrics.likes, 36);
    assert.equal(stored[0].reference.enabled, false);
    assert.equal(stored[0].note.title, "生命周期标题");
  });
});

test("success and lifecycle views share one canonical note record for the same content", async (t) => {
  await withTempNoteRecordsStore(t, async () => {
    await saveSuccessSamples([
      buildSuccessSampleRecord({
        title: "同一篇统一内容",
        body: "同一篇统一正文",
        tier: "performed",
        metrics: { likes: 12, favorites: 4, comments: 1 }
      })
    ]);

    await saveNoteLifecycle([
      buildLifecycleRecord({
        source: "generation_final",
        stage: "published",
        note: {
          title: "同一篇统一内容",
          body: "同一篇统一正文",
          tags: ["科普"]
        },
        publishResult: {
          status: "positive_performance",
          metrics: { likes: 66, favorites: 18, comments: 6 }
        }
      })
    ]);

    const records = await loadNoteRecords();
    const successItems = await loadSuccessSamples();
    const lifecycleItems = await loadNoteLifecycle();

    assert.equal(records.length, 1);
    assert.equal(records[0].reference.enabled, true);
    assert.equal(records[0].reference.tier, "performed");
    assert.equal(records[0].publish.status, "positive_performance");
    assert.equal(successItems.length, 1);
    assert.equal(successItems[0].title, "同一篇统一内容");
    assert.equal(lifecycleItems.length, 1);
    assert.equal(lifecycleItems[0].note.body, "同一篇统一正文");
  });
});

test("compatibility fallback does not merge unrelated lifecycle records that only share title and body", async (t) => {
  await withTempNoteRecordsStore(t, async () => {
    await saveNoteLifecycle([
      buildLifecycleRecord({
        id: "life-a",
        source: "generation_final",
        stage: "published",
        note: {
          title: "同标题同正文",
          body: "相同正文",
          coverText: "封面 A",
          tags: ["科普"]
        },
        publishResult: {
          status: "positive_performance",
          metrics: { likes: 18 }
        }
      }),
      buildLifecycleRecord({
        id: "life-b",
        source: "generation_final",
        stage: "published",
        note: {
          title: "同标题同正文",
          body: "相同正文",
          coverText: "封面 B",
          tags: ["经验"]
        },
        publishResult: {
          status: "published_passed",
          metrics: { likes: 9 }
        }
      })
    ]);

    const records = await loadNoteRecords();
    const lifecycleItems = await loadNoteLifecycle();

    assert.equal(records.length, 2);
    assert.equal(lifecycleItems.length, 2);
  });
});

test("removing lifecycle entries keeps the success reference view for merged records", async (t) => {
  await withTempNoteRecordsStore(t, async () => {
    await saveSuccessSamples([
      buildSuccessSampleRecord({
        title: "删生命周期保留成功样本",
        body: "同一篇正文",
        tier: "featured",
        source: "manual"
      })
    ]);

    await saveNoteLifecycle([
      buildLifecycleRecord({
        source: "generation_final",
        stage: "published",
        note: {
          title: "删生命周期保留成功样本",
          body: "同一篇正文",
          tags: ["科普"]
        },
        publishResult: {
          status: "positive_performance",
          metrics: { likes: 33, favorites: 9, comments: 3 }
        }
      })
    ]);

    await saveNoteLifecycle([]);

    const records = await loadNoteRecords();
    const successItems = await loadSuccessSamples();
    const lifecycleItems = await loadNoteLifecycle();

    assert.equal(records.length, 1);
    assert.equal(records[0].reference.enabled, true);
    assert.equal(records[0].publish.status, "published_passed");
    assert.equal(successItems.length, 1);
    assert.equal(successItems[0].tier, "featured");
    assert.equal(lifecycleItems.length, 0);
  });
});

test("legacy success and lifecycle files cold-start into one record without losing lifecycle visibility", async (t) => {
  await withTempNoteRecordsStore(t, async () => {
    await Promise.all([
      fs.writeFile(
        paths.successSamples,
        `${JSON.stringify(
          [
            {
              id: "success-99",
              title: "冷启动统一标题",
              body: "冷启动统一正文",
              tier: "performed",
              metrics: { likes: 12, favorites: 4, comments: 1 }
            }
          ],
          null,
          2
        )}\n`,
        "utf8"
      ),
      fs.writeFile(
        paths.noteLifecycle,
        `${JSON.stringify(
          [
            {
              id: "life-01",
              source: "generation_final",
              stage: "draft",
              note: {
                title: "冷启动统一标题",
                body: "冷启动统一正文",
                tags: ["科普"]
              },
              publishResult: {
                status: "not_published",
                metrics: { likes: 0, favorites: 0, comments: 0 }
              }
            }
          ],
          null,
          2
        )}\n`,
        "utf8"
      )
    ]);

    const records = await loadNoteRecords();
    const successItems = await loadSuccessSamples();
    const lifecycleItems = await loadNoteLifecycle();

    assert.equal(records.length, 1);
    assert.equal(records[0].id, "success-99");
    assert.equal(records[0].publish.status, "not_published");
    assert.equal(successItems.length, 1);
    assert.equal(successItems[0].id, "success-99");
    assert.equal(lifecycleItems.length, 1);
    assert.equal(lifecycleItems[0].id, "success-99");
    assert.equal(lifecycleItems[0].status, "not_published");
  });
});
