import test from "node:test";
import assert from "node:assert/strict";

import {
  buildGenerationMessages,
  generateNoteCandidates,
  normalizeGenerationCandidate
} from "../src/generation-workbench.js";

test("buildGenerationMessages includes mode, style profile, success samples, and user requirements", () => {
  const messages = buildGenerationMessages({
    mode: "from_scratch",
    brief: {
      topic: "亲密关系沟通",
      sellingPoints: "温和、科普、可执行",
      audience: "刚进入关系的人",
      constraints: "不要营销感"
    },
    styleProfile: {
      status: "active",
      tone: "温和克制",
      titleStyle: "标题清晰",
      bodyStructure: "短段落",
      preferredTags: ["亲密关系"]
    },
    referenceSamples: [
      { title: "成功标题", body: "成功正文", tier: "featured", tags: ["亲密关系"] }
    ]
  });

  const combined = messages.map((item) => item.content).join("\n");
  assert.match(combined, /亲密关系沟通/);
  assert.match(combined, /温和克制/);
  assert.match(combined, /成功标题/);
  assert.match(combined, /只返回 JSON/);
});

test("generateNoteCandidates normalizes three candidate variants from an injected generator", async () => {
  const result = await generateNoteCandidates({
    mode: "draft_optimize",
    draft: { title: "原标题", body: "原正文" },
    generateJson: async () => ({
      candidates: [
        { variant: "safe", title: "安全版", body: "安全正文", coverText: "安全封面", tags: ["科普"] },
        { variant: "natural", title: "自然版", body: "自然正文", coverText: "自然封面", tags: ["关系"] },
        { variant: "expressive", title: "增强版", body: "增强正文", coverText: "增强封面", tags: ["成长"] }
      ],
      model: "mock-model",
      provider: "mock"
    })
  });

  assert.equal(result.candidates.length, 3);
  assert.equal(result.candidates[0].variant, "safe");
  assert.equal(result.candidates[0].title, "安全版");
  assert.equal(result.modelTrace.model, "mock-model");
});

test("normalizeGenerationCandidate fills missing fields without crashing", () => {
  const candidate = normalizeGenerationCandidate({ title: "标题" }, 1);
  assert.equal(candidate.variant, "natural");
  assert.equal(candidate.body, "");
  assert.deepEqual(candidate.tags, []);
});
