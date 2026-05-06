import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { paths } from "../src/config.js";
import { loadSuccessSamples, loadStyleProfile, saveStyleProfile } from "../src/data-store.js";
import {
  buildAutoStyleProfileState,
  buildStyleProfile,
  getActiveStyleProfile,
  sanitizeStyleProfileState,
  scoreContentAgainstStyleProfile
} from "../src/style-profile.js";

async function withTempStyleProfile(t, run) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "style-profile-"));
  const originalPath = paths.styleProfile;
  paths.styleProfile = path.join(tempDir, "style-profile.json");
  await fs.writeFile(paths.styleProfile, "{}\n", "utf8");

  t.after(async () => {
    paths.styleProfile = originalPath;
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  return run();
}

test("buildStyleProfile summarizes high-weight success samples into one current profile", () => {
  const profile = buildStyleProfile([
    {
      id: "sample-1",
      tier: "featured",
      title: "关系里更舒服的沟通方式",
      body: "先说结论，再给三个具体场景。语气克制一点，像朋友提醒。",
      tags: ["亲密关系", "沟通"]
    },
    {
      id: "sample-2",
      tier: "performed",
      title: "别急着责怪自己",
      body: "用短段落把问题讲清楚，再给可执行建议。",
      tags: ["关系沟通", "自我成长"]
    },
    {
      id: "sample-3",
      tier: "passed",
      title: "普通通过样本",
      body: "权重较低，不进入画像引用。",
      tags: ["普通"]
    }
  ]);

  assert.equal(profile.status, "active");
  assert.deepEqual(profile.sourceSampleIds, ["sample-1", "sample-2"]);
  assert.match(profile.titleStyle, /标题/);
  assert.match(profile.bodyStructure, /短段落|场景/);
  assert.ok(profile.preferredTags.includes("亲密关系"));
});

test("style profile persists as current-only state", async (t) => {
  await withTempStyleProfile(t, async () => {
    const current = buildStyleProfile([{ id: "sample-1", tier: "featured", title: "温和标题", body: "温和正文", tags: ["沟通"] }]);

    await saveStyleProfile({ current });
    const saved = await loadStyleProfile();

    assert.equal(saved.current.status, "active");
    assert.equal(saved.draft, null);
    assert.deepEqual(saved.versions, []);

    const score = scoreContentAgainstStyleProfile({ title: "温和标题", body: "温和正文", tags: ["沟通"] }, saved.current);
    assert.ok(score.score >= 60);
    assert.ok(score.reasons.length >= 1);
  });
});

test("style profile keeps using success compatibility samples from unified note records", async (t) => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "style-profile-note-records-"));
  const originals = {
    noteRecords: paths.noteRecords,
    successSamples: paths.successSamples,
    noteLifecycle: paths.noteLifecycle
  };

  paths.noteRecords = path.join(tempDir, "note-records.json");
  paths.successSamples = path.join(tempDir, "success-samples.json");
  paths.noteLifecycle = path.join(tempDir, "note-lifecycle.json");

  t.after(async () => {
    Object.assign(paths, originals);
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  await fs.writeFile(
    paths.noteRecords,
    `${JSON.stringify([
      {
        id: "record-featured",
        source: "manual",
        stage: "published_reference",
        note: {
          title: "高权重参考样本",
          body: "这是一篇更完整的经验正文。".repeat(8),
          tags: ["关系", "科普"]
        },
        reference: {
          enabled: true,
          tier: "featured",
          selectedBy: "manual"
        },
        publish: {
          status: "published_passed"
        }
      },
      {
        id: "record-passed",
        source: "manual",
        stage: "published_reference",
        note: {
          title: "低权重过审样本",
          body: "普通正文",
          tags: ["普通"]
        },
        reference: {
          enabled: true,
          tier: "passed",
          selectedBy: "manual"
        },
        publish: {
          status: "published_passed"
        }
      },
      {
        id: "record-lifecycle-only",
        source: "generation_final",
        stage: "published",
        note: {
          title: "仅生命周期记录",
          body: "这条记录应该只进入 lifecycle 兼容视图。",
          tags: ["发布"]
        },
        publish: {
          status: "positive_performance",
          metrics: { likes: 80 }
        },
        reference: {
          enabled: false
        }
      }
    ], null, 2)}\n`,
    "utf8"
  );

  const samples = await loadSuccessSamples();
  const profile = buildStyleProfile(samples, { topic: "亲密关系科普" });

  assert.equal(profile.topic, "亲密关系科普");
  assert.deepEqual(profile.sourceSampleIds, ["record-featured"]);
  assert.equal(profile.sourceSampleIds.includes("record-lifecycle-only"), false);
});

test("auto style profile state refreshes to current-only state", () => {
  const samples = [
    {
      id: "record-featured",
      tier: "featured",
      title: "高权重参考样本",
      body: "这是一篇更完整的经验正文。".repeat(8),
      tags: ["关系", "科普"]
    },
    {
      id: "record-performed",
      tier: "performed",
      title: "稳定参考样本",
      body: "正文里先结论，再给场景和建议。".repeat(6),
      tags: ["沟通", "疗愈"]
    }
  ];

  const profile = buildAutoStyleProfileState({}, samples, {
    topic: "自动沉淀画像"
  });

  assert.equal(profile.current.status, "active");
  assert.equal(profile.current.topic, "自动沉淀画像");
  assert.equal(profile.draft, null);
  assert.deepEqual(profile.current.sourceSampleIds, ["record-featured", "record-performed"]);
  assert.deepEqual(profile.versions, []);
});

test("auto style profile state replaces current profile instead of appending historical versions", () => {
  const samples = [
    {
      id: "record-featured",
      tier: "featured",
      title: "高权重参考样本",
      body: "这是一篇更完整的经验正文。".repeat(8),
      tags: ["关系", "科普"]
    }
  ];

  const firstProfile = buildAutoStyleProfileState({}, samples, {
    topic: "自动沉淀画像"
  });
  const secondProfile = buildAutoStyleProfileState(firstProfile, samples, {
    topic: "自动沉淀画像"
  });

  assert.equal(secondProfile.current.topic, "自动沉淀画像");
  assert.deepEqual(secondProfile.current.sourceSampleIds, ["record-featured"]);
  assert.deepEqual(secondProfile.versions, []);
});

test("sanitizeStyleProfileState collapses legacy draft and versions into current-only state", () => {
  const legacyCurrent = {
    id: "style-profile-current",
    status: "active",
    topic: "通用风格",
    name: "通用风格画像",
    sourceSampleIds: ["note-1"],
    titleStyle: "标题平均约 6 字，优先保持清晰、克制、带一点真实经验感。",
    bodyStructure: "正文平均约 6 字，优先短段落、先结论后场景，再给可执行建议。",
    tone: "温和、克制、像朋友提醒，避免强营销和夸张刺激。",
    preferredTags: ["科普", "沟通"],
    avoidExpressions: ["绝对化承诺", "强导流", "低俗擦边", "过度教程化"],
    generationGuidelines: ["保留科普、沟通、经验分享语境", "减少刺激性标题党表达", "正文给出具体但不过度细节化的建议"],
    createdAt: "2026-04-30T14:59:46.472Z",
    updatedAt: "2026-05-01T03:10:40.040Z",
    confirmedAt: "2026-05-01T03:10:40.040Z"
  };

  const sanitized = sanitizeStyleProfileState({
    draft: {
      id: "style-profile-draft-1",
      status: "draft",
      topic: "旧草稿"
    },
    current: legacyCurrent,
    versions: [
      {
        ...legacyCurrent,
        id: "style-profile-a",
        status: "archived"
      }
    ]
  });

  assert.equal(sanitized.current.id, "style-profile-current");
  assert.equal(sanitized.draft, null);
  assert.deepEqual(sanitized.versions, []);
  assert.equal(getActiveStyleProfile(sanitized).id, "style-profile-current");
});
