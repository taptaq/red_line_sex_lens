import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { paths } from "../src/config.js";
import { loadStyleProfile, saveStyleProfile } from "../src/data-store.js";
import {
  buildStyleProfileDraft,
  confirmStyleProfileDraft,
  getActiveStyleProfile,
  setActiveStyleProfileVersion,
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

test("buildStyleProfileDraft summarizes high-weight success samples and requires confirmation", () => {
  const draft = buildStyleProfileDraft([
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

  assert.equal(draft.status, "draft");
  assert.deepEqual(draft.sourceSampleIds, ["sample-1", "sample-2"]);
  assert.match(draft.titleStyle, /标题/);
  assert.match(draft.bodyStructure, /短段落|场景/);
  assert.ok(draft.preferredTags.includes("亲密关系"));
});

test("style profile can be saved as draft and confirmed", async (t) => {
  await withTempStyleProfile(t, async () => {
    const draft = buildStyleProfileDraft([
      { id: "sample-1", tier: "featured", title: "温和标题", body: "温和正文", tags: ["沟通"] }
    ]);

    await saveStyleProfile({ draft, current: null });
    const confirmed = confirmStyleProfileDraft(await loadStyleProfile(), {
      tone: "温和、克制、像朋友提醒"
    });

    assert.equal(confirmed.current.status, "active");
    assert.equal(confirmed.current.tone, "温和、克制、像朋友提醒");
    assert.equal(confirmed.draft, null);

    const score = scoreContentAgainstStyleProfile(
      { title: "温和标题", body: "温和正文", tags: ["沟通"] },
      confirmed.current
    );
    assert.ok(score.score >= 60);
    assert.ok(score.reasons.length >= 1);
  });
});

test("style profile supports versions and activating an older version", async () => {
  const firstDraft = buildStyleProfileDraft(
    [{ id: "sample-1", tier: "featured", title: "关系沟通", body: "温和正文", tags: ["沟通"] }],
    { topic: "亲密关系科普" }
  );
  const firstState = confirmStyleProfileDraft({ draft: firstDraft, current: null, versions: [] });
  const secondDraft = buildStyleProfileDraft(
    [{ id: "sample-2", tier: "featured", title: "产品体验", body: "克制软植入", tags: ["体验"] }],
    { topic: "产品软植入" }
  );
  const secondState = confirmStyleProfileDraft({ ...firstState, draft: secondDraft });

  assert.equal(secondState.versions.length, 2);
  assert.equal(secondState.current.topic, "产品软植入");
  assert.equal(getActiveStyleProfile(secondState, firstState.current.id).topic, "亲密关系科普");

  const reverted = setActiveStyleProfileVersion(secondState, firstState.current.id);
  assert.equal(reverted.current.topic, "亲密关系科普");
  assert.equal(reverted.versions.find((item) => item.id === firstState.current.id).status, "active");
  assert.equal(reverted.versions.find((item) => item.id === secondState.current.id).status, "archived");
});
