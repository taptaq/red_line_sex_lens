import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { paths } from "../src/config.js";
import { loadNoteRecords } from "../src/data-store.js";
import { buildSampleLibraryRecordWithPlannerSummary, safeHandleRequest } from "../src/server.js";

async function withTempSampleLibraryApi(t, run) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "sample-library-api-"));
  const autoPlannerSummary = process.env.SAMPLE_LIBRARY_AUTO_PLANNER_SUMMARY;
  const originals = {
    collectionTypes: paths.collectionTypes,
    successSamples: paths.successSamples,
    noteLifecycle: paths.noteLifecycle,
    noteRecords: paths.noteRecords,
    styleProfile: paths.styleProfile,
    draftIdeas: paths.draftIdeas,
    finishedContents: paths.finishedContents
  };

  paths.collectionTypes = path.join(tempDir, "collection-types.json");
  paths.successSamples = path.join(tempDir, "success-samples.json");
  paths.noteLifecycle = path.join(tempDir, "note-lifecycle.json");
  paths.noteRecords = path.join(tempDir, "note-records.json");
  paths.styleProfile = path.join(tempDir, "style-profile.json");
  paths.draftIdeas = path.join(tempDir, "draft-ideas.json");
  paths.finishedContents = path.join(tempDir, "finished-contents.json");
  process.env.SAMPLE_LIBRARY_AUTO_PLANNER_SUMMARY = "false";

  await Promise.all([
    fs.writeFile(paths.collectionTypes, `${JSON.stringify({ custom: [] }, null, 2)}\n`, "utf8"),
    fs.writeFile(paths.successSamples, "[]\n", "utf8"),
    fs.writeFile(paths.noteLifecycle, "[]\n", "utf8"),
    fs.writeFile(paths.styleProfile, "{}\n", "utf8"),
    fs.writeFile(paths.draftIdeas, `${JSON.stringify({ items: [] }, null, 2)}\n`, "utf8"),
    fs.writeFile(paths.finishedContents, `${JSON.stringify({ items: [] }, null, 2)}\n`, "utf8")
  ]);

  t.after(async () => {
    Object.assign(paths, originals);
    if (autoPlannerSummary === undefined) {
      delete process.env.SAMPLE_LIBRARY_AUTO_PLANNER_SUMMARY;
    } else {
      process.env.SAMPLE_LIBRARY_AUTO_PLANNER_SUMMARY = autoPlannerSummary;
    }
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  return run();
}

test("draft ideas API supports list create patch delete", async (t) => {
  await withTempSampleLibraryApi(t, async () => {
    const initial = await invokeRoute("GET", "/api/draft-ideas");
    assert.equal(initial.status, 200);
    assert.equal(initial.ok, true);
    assert.deepEqual(initial.items, []);

    const created = await invokeRoute("POST", "/api/draft-ideas", {
      title: "先写一篇关系沟通选题",
      briefing: "围绕拒绝表达与关系安全感，写一篇轻科普。",
      collectionType: "科普",
      materialText: "先共情，再给边界表达模板。",
      referenceTitle: "怎么把拒绝说清楚又不伤人？",
      tags: ["关系沟通", "边界表达"],
      sourceType: "account_planner",
      sourceLabel: "账号复盘卡"
    });

    assert.equal(created.status, 200);
    assert.equal(created.ok, true);
    assert.equal(created.items.length, 1);
    assert.equal(created.item.title, "先写一篇关系沟通选题");
    assert.equal(created.item.status, "draft");
    assert.equal(created.item.sourceType, "account_planner");

    const patched = await invokeRoute("PATCH", "/api/draft-ideas", {
      id: created.item.id,
      status: "used"
    });

    assert.equal(patched.status, 200);
    assert.equal(patched.ok, true);
    assert.equal(patched.item.status, "used");

    const deleted = await invokeRoute("DELETE", "/api/draft-ideas", {
      id: created.item.id
    });

    assert.equal(deleted.status, 200);
    assert.equal(deleted.ok, true);
    assert.deepEqual(deleted.items, []);
  });
});

test("finished contents API supports list create patch delete", async (t) => {
  await withTempSampleLibraryApi(t, async () => {
    const initial = await invokeRoute("GET", "/api/finished-contents");
    assert.equal(initial.status, 200);
    assert.equal(initial.ok, true);
    assert.deepEqual(initial.items, []);

    const created = await invokeRoute("POST", "/api/finished-contents", {
      title: "成品标题",
      body: "成品正文",
      coverText: "成品封面",
      collectionType: "科普",
      tags: ["关系沟通", "边界表达"],
      sourceType: "generation_candidate",
      sourceLabel: "生成稿"
    });

    assert.equal(created.status, 200);
    assert.equal(created.ok, true);
    assert.equal(created.items.length, 1);
    assert.equal(created.item.title, "成品标题");
    assert.equal(created.item.body, "成品正文");
    assert.equal(created.item.coverText, "成品封面");
    assert.deepEqual(created.item.tags, ["关系沟通", "边界表达"]);

    const patched = await invokeRoute("PATCH", "/api/finished-contents", {
      id: created.item.id,
      title: "修改后标题",
      body: "修改后正文",
      tags: ["修改"]
    });

    assert.equal(patched.status, 200);
    assert.equal(patched.ok, true);
    assert.equal(patched.item.id, created.item.id);
    assert.equal(patched.item.title, "修改后标题");
    assert.equal(patched.item.body, "修改后正文");
    assert.deepEqual(patched.item.tags, ["修改"]);

    const deleted = await invokeRoute("DELETE", "/api/finished-contents", {
      id: created.item.id
    });

    assert.equal(deleted.status, 200);
    assert.equal(deleted.ok, true);
    assert.deepEqual(deleted.items, []);
  });
});

test("rewrite API route returns the fields needed by the rewrite panel without leaking memoryContext", async () => {
  const serverSource = await fs.readFile(path.join(process.cwd(), "src/server.js"), "utf8");

  assert.match(serverSource, /if \(request\.method === "POST" && url\.pathname === "\/api\/rewrite"\)/);
  assert.match(serverSource, /beforeAnalysis,/);
  assert.match(serverSource, /afterAnalysis: rewriteResult\.afterAnalysis,/);
  assert.match(serverSource, /afterCrossReview: rewriteResult\.afterCrossReview,/);
  assert.match(serverSource, /rewrite: rewriteResult\.rewrite,/);
  assert.match(serverSource, /rounds: rewriteResult\.rounds,/);
  assert.match(serverSource, /rewriteAttempts: rewriteResult\.attempts,/);
  assert.match(serverSource, /rewriteAccepted: rewriteResult\.accepted,/);
  assert.match(serverSource, /rewriteStopReason: rewriteResult\.stopReason/);
  assert.doesNotMatch(serverSource, /memoryContext: rewriteMemoryContext/);
  assert.doesNotMatch(serverSource, /analysis: beforeAnalysis/);
});

test("sample library API supports GET POST PATCH for canonical note records", async (t) => {
  await withTempSampleLibraryApi(t, async () => {
    const initial = await invokeRoute("GET", "/api/sample-library");
    assert.equal(initial.status, 200);
    assert.equal(initial.ok, true);
    assert.deepEqual(initial.items, []);

    const created = await invokeRoute("POST", "/api/sample-library", {
      source: "manual",
      stage: "draft",
      note: {
        title: "统一样本标题",
        body: "统一样本正文",
        collectionType: "科普",
        tags: ["科普", "沟通"]
      }
    });

    assert.equal(created.status, 200);
    assert.equal(created.ok, true);
    assert.equal(created.items.length, 1);
    assert.equal(created.item.note.title, "统一样本标题");
    assert.equal(created.item.note.collectionType, "科普");
    assert.equal(created.item.reference.enabled, false);
    assert.equal(created.item.publish.status, "not_published");
    assert.equal(created.item.publish.metrics.views, 0);

    const patched = await invokeRoute("PATCH", "/api/sample-library", {
      id: created.item.id,
      reference: {
        enabled: true,
        tier: "featured",
        selectedBy: "manual",
        notes: "补充精选属性"
      },
      note: {
        collectionType: "疗愈指南"
      },
      publish: {
        status: "published_passed",
        publishedAt: "2026-04-30",
        notes: "补充发布属性",
        metrics: {
          views: 77
        }
      }
    });

    assert.equal(patched.status, 200);
    assert.equal(patched.ok, true);
    assert.equal(patched.item.id, created.item.id);
    assert.equal(patched.item.reference.enabled, true);
    assert.equal(patched.item.reference.tier, "featured");
    assert.equal(patched.item.note.collectionType, "疗愈指南");
    assert.equal(patched.item.publish.status, "published_passed");
    assert.equal(patched.item.publish.publishedAt, "2026-04-30");
    assert.equal(patched.item.publish.metrics.views, 77);

    const listed = await invokeRoute("GET", "/api/sample-library");
    const records = await loadNoteRecords();

    assert.equal(listed.items.length, 1);
    assert.equal(listed.items[0].id, created.item.id);
    assert.equal(listed.items[0].reference.tier, "featured");
    assert.equal(records.length, 1);
    assert.equal(records[0].id, created.item.id);
    assert.equal(records[0].note.collectionType, "疗愈指南");
    assert.equal(records[0].publish.status, "published_passed");
    assert.equal(records[0].publish.metrics.views, 77);
  });
});

test("sample library API preserves learning sample types on canonical note records", async (t) => {
  await withTempSampleLibraryApi(t, async () => {
    const created = await invokeRoute("POST", "/api/sample-library", {
      source: "manual",
      stage: "draft",
      sampleType: "good_sample",
      note: {
        title: "学习样本标题",
        body: "学习样本正文",
        collectionType: "科普"
      }
    });

    assert.equal(created.status, 200);
    assert.equal(created.item.sampleType, "good_sample");

    const patched = await invokeRoute("PATCH", "/api/sample-library", {
      id: created.item.id,
      sampleType: "false_positive",
      publish: {
        status: "false_positive",
        notes: "平台放行，系统误判"
      }
    });

    const listed = await invokeRoute("GET", "/api/sample-library");
    const records = await loadNoteRecords();

    assert.equal(patched.status, 200);
    assert.equal(patched.item.sampleType, "false_positive");
    assert.equal(listed.items[0].sampleType, "false_positive");
    assert.equal(records[0].sampleType, "false_positive");
    assert.equal(records[0].publish.status, "false_positive");
  });
});

test("sample library API persists learning sample content type", async (t) => {
  await withTempSampleLibraryApi(t, async () => {
    const created = await invokeRoute("POST", "/api/sample-library", {
      source: "manual",
      stage: "draft",
      note: {
        title: "视频样本标题",
        body: "视频样本正文",
        contentType: "video",
        collectionType: "科普"
      }
    });

    assert.equal(created.status, 200);
    assert.equal(created.item.note.contentType, "video");

    const patched = await invokeRoute("PATCH", "/api/sample-library", {
      id: created.item.id,
      note: {
        contentType: "image_text"
      }
    });
    const records = await loadNoteRecords();

    assert.equal(patched.status, 200);
    assert.equal(patched.item.note.contentType, "image_text");
    assert.equal(records[0].note.contentType, "image_text");
  });
});

test("sample library API persists scripts for video learning samples", async (t) => {
  await withTempSampleLibraryApi(t, async () => {
    const created = await invokeRoute("POST", "/api/sample-library", {
      source: "manual",
      stage: "draft",
      note: {
        title: "视频脚本样本",
        body: "视频正文概要",
        contentType: "video",
        videoScript: "开场：提出问题\n中段：给出三点\n结尾：评论区互动",
        collectionType: "科普"
      }
    });

    assert.equal(created.status, 200);
    assert.equal(created.item.note.contentType, "video");
    assert.match(created.item.note.videoScript, /开场：提出问题/);

    const patched = await invokeRoute("PATCH", "/api/sample-library", {
      id: created.item.id,
      note: {
        videoScript: "新版脚本：先讲结论，再补细节。"
      }
    });

    assert.equal(patched.status, 200);
    assert.equal(patched.item.note.videoScript, "新版脚本：先讲结论，再补细节。");

    const converted = await invokeRoute("PATCH", "/api/sample-library", {
      id: created.item.id,
      note: {
        contentType: "image_text",
        videoScript: "不应保留"
      }
    });
    const records = await loadNoteRecords();

    assert.equal(converted.status, 200);
    assert.equal(converted.item.note.contentType, "image_text");
    assert.equal(converted.item.note.videoScript, "");
    assert.equal(records[0].note.videoScript, "");
  });
});

test("sample library API returns the latest style profile after reference-sample mutations", async (t) => {
  await withTempSampleLibraryApi(t, async () => {
    const created = await invokeRoute("POST", "/api/sample-library", {
      source: "manual",
      stage: "published_reference",
      note: {
        title: "参考样本标题",
        body: "参考样本正文".repeat(40),
        collectionType: "科普",
        tags: ["科普", "关系"]
      },
      reference: {
        enabled: true,
        tier: "featured",
        selectedBy: "manual"
      },
      publish: {
        status: "positive_performance",
        metrics: {
          likes: 33,
          favorites: 12,
          comments: 18,
          views: 6000
        }
      }
    });

    assert.equal(created.status, 200);
    assert.equal(created.ok, true);
    assert.equal(created.styleProfile.current.sourceSampleIds.length, 1);
    assert.equal(created.styleProfile.current.sourceSampleIds[0], created.item.id);

    const deleted = await invokeRoute("DELETE", "/api/sample-library", {
      id: created.item.id
    });

    assert.equal(deleted.status, 200);
    assert.equal(deleted.ok, true);
    assert.deepEqual(deleted.styleProfile.current.sourceSampleIds, []);
  });
});

test("sample library API persists prediction and retro calibration fields", async (t) => {
  await withTempSampleLibraryApi(t, async () => {
    const created = await invokeRoute("POST", "/api/sample-library", {
      source: "manual",
      stage: "draft",
      note: {
        title: "校准样本标题",
        body: "校准样本正文",
        collectionType: "科普"
      },
      calibration: {
        prediction: {
          predictedStatus: "published_passed",
          predictedRiskLevel: "medium",
          predictedPerformanceTier: "high",
          confidence: "81",
          reason: "历史样本相似度高",
          model: "gpt-5.4",
          createdAt: "2026-05-06"
        }
      }
    });

    assert.equal(created.status, 200);
    assert.equal(created.item.calibration.prediction.predictedStatus, "published_passed");
    assert.equal(created.item.calibration.prediction.confidence, 81);

    const patched = await invokeRoute("PATCH", "/api/sample-library", {
      id: created.item.id,
      calibration: {
        retro: {
          actualPerformanceTier: "high",
          predictionMatched: true,
          missReason: "判断命中",
          validatedSignals: "标题结构, 合集匹配",
          invalidatedSignals: "正文略长",
          shouldBecomeReference: true,
          ruleImprovementCandidate: "同类标题可提高参考权重",
          notes: "发布后 72 小时表现稳定",
          reviewedAt: "2026-05-09"
        }
      }
    });
    const records = await loadNoteRecords();

    assert.equal(patched.status, 200);
    assert.equal(patched.item.calibration.prediction.predictedRiskLevel, "medium");
    assert.equal(patched.item.calibration.retro.predictionMatched, true);
    assert.deepEqual(patched.item.calibration.retro.validatedSignals, ["标题结构", "合集匹配"]);
    assert.deepEqual(patched.item.calibration.retro.invalidatedSignals, ["正文略长"]);
    assert.equal(patched.item.calibration.retro.shouldBecomeReference, true);
    assert.equal(records[0].calibration.retro.ruleImprovementCandidate, "同类标题可提高参考权重");
  });
});

test("sample library API preserves prediction evidence fields across patch round-trips", async (t) => {
  await withTempSampleLibraryApi(t, async () => {
    const created = await invokeRoute("POST", "/api/sample-library", {
      source: "manual",
      stage: "draft",
      note: {
        title: "预测证据 API 样本",
        body: "预测证据 API 正文",
        collectionType: "科普"
      },
      calibration: {
        prediction: {
          predictedStatus: "limited",
          predictedRiskLevel: "medium",
          predictedPerformanceTier: "low",
          confidence: 68,
          reason: "标题结构接近历史高风险样本",
          evidenceSamples: [{ id: "sample-1", title: "历史样本 1" }],
          evidenceSignals: ["标题短语命中"],
          evidenceSummary: "与 1 条历史样本相似"
        }
      }
    });

    assert.equal(created.status, 200);
    assert.deepEqual(created.item.calibration.prediction.evidenceSamples, [{ id: "sample-1", title: "历史样本 1" }]);
    assert.deepEqual(created.item.calibration.prediction.evidenceSignals, ["标题短语命中"]);
    assert.equal(created.item.calibration.prediction.evidenceSummary, "与 1 条历史样本相似");

    const patched = await invokeRoute("PATCH", "/api/sample-library", {
      id: created.item.id,
      calibration: {
        prediction: {
          evidenceSamples: [{ id: "sample-2", title: "历史样本 2" }],
          evidenceSignals: ["标签重合"],
          evidenceSummary: "与 2 条历史样本相似"
        }
      }
    });
    const records = await loadNoteRecords();

    assert.equal(patched.status, 200);
    assert.equal(patched.item.calibration.prediction.predictedStatus, "limited");
    assert.equal(patched.item.calibration.prediction.predictedRiskLevel, "medium");
    assert.equal(patched.item.calibration.prediction.predictedPerformanceTier, "low");
    assert.equal(patched.item.calibration.prediction.confidence, 68);
    assert.equal(patched.item.calibration.prediction.reason, "标题结构接近历史高风险样本");
    assert.deepEqual(patched.item.calibration.prediction.evidenceSamples, [{ id: "sample-2", title: "历史样本 2" }]);
    assert.deepEqual(patched.item.calibration.prediction.evidenceSignals, ["标签重合"]);
    assert.equal(patched.item.calibration.prediction.evidenceSummary, "与 2 条历史样本相似");
    assert.deepEqual(records[0].calibration.prediction.evidenceSamples, [{ id: "sample-2", title: "历史样本 2" }]);
    assert.deepEqual(records[0].calibration.prediction.evidenceSignals, ["标签重合"]);
    assert.equal(records[0].calibration.prediction.evidenceSummary, "与 2 条历史样本相似");
  });
});

test("sample library calibration replay summarizes historical calibrated samples", async (t) => {
  await withTempSampleLibraryApi(t, async () => {
    await invokeRoute("POST", "/api/sample-library", {
      note: {
        title: "历史过审样本",
        body: "正文一",
        collectionType: "科普"
      },
      publish: {
        status: "published_passed",
        metrics: {
          likes: 24,
          favorites: 5,
          comments: 2
        }
      },
      calibration: {
        prediction: {
          predictedStatus: "published_passed",
          predictedRiskLevel: "low",
          predictedPerformanceTier: "medium"
        },
        retro: {
          predictionMatched: true
        }
      }
    });

    await invokeRoute("POST", "/api/sample-library", {
      note: {
        title: "历史违规样本",
        body: "正文二",
        collectionType: "科普"
      },
      publish: {
        status: "violation"
      },
      calibration: {
        prediction: {
          predictedStatus: "published_passed",
          predictedRiskLevel: "high",
          predictedPerformanceTier: "medium"
        },
        retro: {
          predictionMatched: false
        }
      }
    });

    const replayed = await invokeRoute("POST", "/api/sample-library/calibration-replay", {
      mode: "strict_risk"
    });

    assert.equal(replayed.status, 200);
    assert.equal(replayed.ok, true);
    assert.equal(replayed.result.total, 2);
    assert.equal(replayed.result.matched, 2);
    assert.equal(replayed.result.mismatched, 0);
    assert.equal(replayed.result.highRiskMisses, 0);
    assert.deepEqual(
      replayed.result.preview.map((item) => item.title),
      []
    );
  });
});

test("sample library POST ignores client-provided ids so different notes cannot share one canonical id", async (t) => {
  await withTempSampleLibraryApi(t, async () => {
    const first = await invokeRoute("POST", "/api/sample-library", {
      id: "client-shared-id",
      createdAt: "2000-01-01T00:00:00.000Z",
      updatedAt: "2000-01-01T00:00:00.000Z",
      note: {
        title: "第一条标题",
        body: "第一条正文"
      }
    });

    const second = await invokeRoute("POST", "/api/sample-library", {
      id: "client-shared-id",
      createdAt: "2001-01-01T00:00:00.000Z",
      updatedAt: "2001-01-01T00:00:00.000Z",
      note: {
        title: "第二条标题",
        body: "第二条正文"
      }
    });

    const listed = await invokeRoute("GET", "/api/sample-library");
    const ids = listed.items.map((item) => item.id);

    assert.equal(first.status, 200);
    assert.equal(second.status, 200);
    assert.equal(listed.items.length, 2);
    assert.notEqual(first.item.id, "client-shared-id");
    assert.notEqual(second.item.id, "client-shared-id");
    assert.notEqual(first.item.id, second.item.id);
    assert.equal(new Set(ids).size, 2);
  });
});

test("sample library PATCH can roll back reference and publish fields with true patch semantics", async (t) => {
  await withTempSampleLibraryApi(t, async () => {
    const created = await invokeRoute("POST", "/api/sample-library", {
      source: "manual",
      stage: "draft",
      note: {
        title: "可回退样本标题",
        body: "可回退样本正文",
        tags: ["科普", "回退"]
      }
    });

    const upgraded = await invokeRoute("PATCH", "/api/sample-library", {
      id: created.item.id,
      reference: {
        enabled: true,
        tier: "featured",
        selectedBy: "manual",
        notes: "先标成精选"
      },
      publish: {
        status: "positive_performance",
        metrics: {
          likes: 120,
          favorites: 24,
          comments: 8,
          views: 300
        },
        notes: "先记录高表现",
        publishedAt: "2026-04-30"
      }
    });

    assert.equal(upgraded.status, 200);
    assert.equal(upgraded.item.reference.enabled, true);
    assert.equal(upgraded.item.reference.tier, "featured");
    assert.equal(upgraded.item.publish.status, "positive_performance");
    assert.equal(upgraded.item.publish.metrics.likes, 120);
    assert.equal(upgraded.item.publish.metrics.views, 300);
    assert.equal(upgraded.item.publish.notes, "先记录高表现");
    assert.equal(upgraded.item.publish.publishedAt, "2026-04-30");

    const rolledBack = await invokeRoute("PATCH", "/api/sample-library", {
      id: created.item.id,
      reference: {
        enabled: false,
        notes: ""
      },
      publish: {
        status: "violation",
        metrics: {
          likes: 3,
          favorites: 0,
          comments: 1,
          views: 0
        },
        notes: "",
        publishedAt: ""
      }
    });

    assert.equal(rolledBack.status, 200);
    assert.equal(rolledBack.ok, true);
    assert.equal(rolledBack.item.reference.enabled, false);
    assert.equal(rolledBack.item.reference.tier, "");
    assert.equal(rolledBack.item.reference.notes, "");
    assert.equal(rolledBack.item.publish.status, "violation");
    assert.equal(rolledBack.item.publish.metrics.likes, 3);
    assert.equal(rolledBack.item.publish.metrics.favorites, 0);
    assert.equal(rolledBack.item.publish.metrics.comments, 1);
    assert.equal(rolledBack.item.publish.metrics.views, 0);
    assert.equal(rolledBack.item.publish.notes, "");
    assert.equal(rolledBack.item.publish.publishedAt, "");

    const listed = await invokeRoute("GET", "/api/sample-library");
    assert.equal(listed.items[0].reference.enabled, false);
    assert.equal(listed.items[0].publish.status, "violation");
    assert.equal(listed.items[0].publish.metrics.likes, 3);
    assert.equal(listed.items[0].publish.metrics.views, 0);
  });
});

test("sample library PATCH returns the merged canonical record when note changes collapse two records", async (t) => {
  await withTempSampleLibraryApi(t, async () => {
    const first = await invokeRoute("POST", "/api/sample-library", {
      note: {
        title: "合并目标标题",
        body: "合并目标正文",
        tags: ["科普"]
      }
    });

    const second = await invokeRoute("POST", "/api/sample-library", {
      note: {
        title: "待合并标题",
        body: "待合并正文",
        tags: ["草稿"]
      }
    });

    const patched = await invokeRoute("PATCH", "/api/sample-library", {
      id: second.item.id,
      note: {
        title: "合并目标标题",
        body: "合并目标正文",
        tags: ["科普"]
      }
    });

    const listed = await invokeRoute("GET", "/api/sample-library");

    assert.equal(patched.status, 200);
    assert.equal(patched.ok, true);
    assert.notEqual(patched.item, null);
    assert.equal(patched.item.id, first.item.id);
    assert.equal(patched.item.note.title, "合并目标标题");
    assert.equal(listed.items.length, 1);
    assert.equal(listed.items[0].id, first.item.id);
  });
});

test("sample library PATCH returns 404 when the canonical record does not exist", async (t) => {
  await withTempSampleLibraryApi(t, async () => {
    const patched = await invokeRoute("PATCH", "/api/sample-library", {
      id: "note-missing",
      publish: { status: "published_passed" }
    });

    assert.equal(patched.status, 404);
    assert.equal(patched.ok, false);
    assert.match(patched.error, /未找到/);
  });
});

test("sample library DELETE removes an existing canonical record", async (t) => {
  await withTempSampleLibraryApi(t, async () => {
    const created = await invokeRoute("POST", "/api/sample-library", {
      note: {
        title: "待删除样本标题",
        body: "待删除样本正文"
      }
    });

    const deleted = await invokeRoute("DELETE", "/api/sample-library", {
      id: created.item.id
    });

    assert.equal(deleted.status, 200);
    assert.equal(deleted.ok, true);
    assert.deepEqual(deleted.items, []);

    const listed = await invokeRoute("GET", "/api/sample-library");
    assert.deepEqual(listed.items, []);
  });
});

test("sample library DELETE returns 404 when the canonical record does not exist", async (t) => {
  await withTempSampleLibraryApi(t, async () => {
    const deleted = await invokeRoute("DELETE", "/api/sample-library", {
      id: "note-missing"
    });

    assert.equal(deleted.status, 404);
    assert.equal(deleted.ok, false);
    assert.match(deleted.error, /未找到/);
  });
});

test("sample library POST can create a canonical note record from plain content fields before nesting", async (t) => {
  await withTempSampleLibraryApi(t, async () => {
    const created = await invokeRoute("POST", "/api/sample-library", {
      title: "平铺标题",
      body: "平铺正文",
      coverText: "平铺封面",
      collectionType: "科普",
      tags: ["关系", "沟通"]
    });

    assert.equal(created.status, 200);
    assert.equal(created.ok, true);
    assert.equal(created.item.note.title, "平铺标题");
    assert.equal(created.item.note.body, "平铺正文");
    assert.equal(created.item.note.coverText, "平铺封面");
    assert.equal(created.item.note.collectionType, "科普");
    assert.deepEqual(created.item.note.tags, ["关系", "沟通"]);
  });
});

test("sample library records auto attach planner summaries when created without one", async () => {
  let summarizeCalls = 0;
  const record = await buildSampleLibraryRecordWithPlannerSummary(
    {
      note: {
        title: "新增摘要样本",
        body: "这是一条需要在保存时生成账号复盘摘要的正文。",
        collectionType: "科普",
        tags: ["边界表达"]
      }
    },
    {
      summarizeRecord: async (incoming) => {
        summarizeCalls += 1;
        assert.equal(incoming.note.title, "新增摘要样本");
        return {
          summary: "这篇主要解释边界表达如何降低关系误读。",
          keyPoints: ["边界表达", "误读降低"],
          riskBoundary: ["避免绝对化承诺"],
          suggestedTopic: "怎么把边界说清楚？",
          provider: "deepseek",
          model: "deepseek-v4-flash",
          createdAt: "2026-06-07T10:00:00.000Z"
        };
      }
    }
  );

  assert.equal(summarizeCalls, 1);
  assert.equal(record.calibration.plannerSummary.summary, "这篇主要解释边界表达如何降低关系误读。");
  assert.deepEqual(record.calibration.plannerSummary.keyPoints, ["边界表达", "误读降低"]);
  assert.equal(record.calibration.plannerSummary.provider, "deepseek");
});

test("sample library records keep existing planner summaries and skip auto summary calls", async () => {
  let summarizeCalls = 0;
  const record = await buildSampleLibraryRecordWithPlannerSummary(
    {
      note: {
        title: "已有摘要样本",
        body: "正文"
      },
      calibration: {
        plannerSummary: {
          summary: "已有摘要",
          keyPoints: ["旧要点"],
          riskBoundary: [],
          suggestedTopic: "已有选题",
          provider: "deepseek",
          model: "deepseek-v4-flash",
          createdAt: "2026-06-07T09:00:00.000Z"
        }
      }
    },
    {
      summarizeRecord: async () => {
        summarizeCalls += 1;
        return { summary: "不应覆盖" };
      }
    }
  );

  assert.equal(summarizeCalls, 0);
  assert.equal(record.calibration.plannerSummary.summary, "已有摘要");
  assert.deepEqual(record.calibration.plannerSummary.keyPoints, ["旧要点"]);
});

test("sample library create and patch routes return the canonical merged record even when note fingerprints collapse", async (t) => {
  await withTempSampleLibraryApi(t, async () => {
    await invokeRoute("POST", "/api/sample-library", {
      note: {
        title: "模板化标题",
        body: "模板化正文",
        tags: ["科普"]
      }
    });

    const second = await invokeRoute("POST", "/api/sample-library", {
      note: {
        title: "待折叠标题",
        body: "待折叠正文",
        tags: ["草稿"]
      }
    });

    const patched = await invokeRoute("PATCH", "/api/sample-library", {
      id: second.item.id,
      note: {
        title: "模板化标题",
        body: "模板化正文",
        tags: ["科普"]
      }
    });

    assert.equal(second.status, 200);
    assert.equal(patched.status, 200);
    const listed = await invokeRoute("GET", "/api/sample-library");
    assert.equal(listed.items.length, 1);
    assert.equal(patched.item.id, listed.items[0].id);
    assert.equal(patched.item.note.title, "模板化标题");
  });
});

async function invokeRoute(method, pathname, body = null) {
  const request = new EventEmitter();
  request.method = method;
  request.url = pathname;
  request.headers = { host: "127.0.0.1" };

  const response = {
    status: 0,
    headers: {},
    body: "",
    writeHead(statusCode, headers = {}) {
      this.status = statusCode;
      this.headers = headers;
    },
    end(chunk = "") {
      this.body += Buffer.isBuffer(chunk) ? chunk.toString("utf8") : String(chunk || "");
    }
  };

  queueMicrotask(() => {
    if (body !== null) request.emit("data", Buffer.from(JSON.stringify(body)));
    request.emit("end");
  });

  await safeHandleRequest(request, response);

  let parsed = {};
  if (response.body) {
    try {
      parsed = JSON.parse(response.body);
    } catch {
      parsed = { rawBody: response.body };
    }
  }

  return {
    status: response.status,
    ...parsed
  };
}
