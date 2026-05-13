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
      lengthMode: "short",
      audience: "刚进入关系的人",
      constraints: "不要营销感",
      tagReferences: "亲密关系, 关系沟通, 情侣日常"
    },
    styleProfile: {
      status: "active",
      tone: "温和克制",
      titleStyle: "标题清晰",
      bodyStructure: "短段落",
      preferredTags: ["亲密关系", "关系沟通"]
    },
    referenceSamples: [
      { title: "成功标题", body: "成功正文", tier: "featured", tags: ["亲密关系", "情侣日常"] }
    ],
    innerSpaceTerms: [
      {
        term: "小飞船",
        literal: "震动棒",
        preferredUsage: "轻松分享场景可自然替换",
        example: "今晚只想驾驶快乐飞船去月球散步。"
      }
    ]
  });

  const combined = messages.map((item) => item.content).join("\n");
  assert.match(combined, /亲密关系沟通/);
  assert.match(combined, /温和克制/);
  assert.match(combined, /成功标题/);
  assert.match(combined, /只返回 JSON/);
  assert.match(combined, /标题一定要吸睛/);
  assert.match(combined, /高反差/);
  assert.match(combined, /适当加 emoji/);
  assert.match(combined, /内太空/);
  assert.match(combined, /黑话/);
  assert.match(combined, /小飞船/);
  assert.match(combined, /震动棒/);
  assert.match(combined, /大白话/);
  assert.match(combined, /不要输出一大段长文不分段/);
  assert.match(combined, /短文档/);
  assert.match(combined, /600-950 字/);
  assert.match(combined, /标签参考项：亲密关系, 关系沟通, 情侣日常/);
  assert.match(combined, /风格画像偏好标签：亲密关系、关系沟通/);
  assert.match(combined, /参考样本高频标签：亲密关系、情侣日常/);
  assert.match(combined, /标签由你自动生成/);
  assert.match(combined, /热门标签/);
  assert.match(combined, /细分标签/);
  assert.match(combined, /避免只给过于空泛的大词标签/);
  assert.match(combined, /至少包含 1 个更具体的场景标签/);
  assert.match(combined, /不要 3-6 个标签全部都是泛热门词/);
  assert.match(combined, /避免输出语义非常接近的重复标签/);
  assert.match(combined, /如果已经有“亲密关系”/);
  assert.match(combined, /不要再连续给出多个几乎同义的宽泛标签/);
  assert.match(combined, /优先采用“1 个相对宽一点的主标签 \+ 2-4 个更细分的标签”/);
  assert.match(combined, /不要把 3-6 个名额都分配给同一层级的大词/);
  assert.match(combined, /细分标签优先从具体场景、人群阶段、痛点问题、情绪状态或需求目标里提炼/);
});

test("buildGenerationMessages packs shared memory guidance without leaking raw violation text", () => {
  const messages = buildGenerationMessages({
    mode: "from_scratch",
    brief: {
      topic: "亲密关系沟通",
      collectionType: "科普"
    },
    memoryContext: {
      referenceSamples: [
        {
          title: "共享记忆参考标题",
          payload: {
            note: {
              title: "共享记忆参考标题",
              body: "这是一段可供模仿节奏的成功样本正文，用来验证提示词会打包成功经验。"
            }
          }
        }
      ],
      memoryCards: [
        {
          kind: "style_experience_card",
          summary: "标题可以有反差感，但正文要像真人分享，保持克制。"
        },
        {
          kind: "risk_boundary_card",
          summary: "避免导流暗示和过度承诺，把风险提醒转成正向边界。"
        }
      ],
      riskFeedback: [
        {
          payload: {
            platformReason: "疑似导流到站外",
            violationText: "加我领完整清单"
          }
        }
      ]
    }
  });

  const combined = messages.map((item) => item.content).join("\n");
  assert.match(combined, /共享记忆提示/);
  assert.match(combined, /共享记忆参考标题/);
  assert.match(combined, /真人分享，保持克制/);
  assert.match(combined, /避免导流暗示和过度承诺/);
  assert.doesNotMatch(combined, /疑似导流到站外/);
  assert.doesNotMatch(combined, /加我领完整清单/);
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

test("normalizeGenerationCandidate lightly cleans generated tags", () => {
  const candidate = normalizeGenerationCandidate(
    {
      title: "标题",
      tags: [
        "#亲密关系",
        "亲密关系",
        "亲密关系沟通",
        "关系沟通",
        "日常",
        "好物",
        "刚确认关系",
        " "
      ]
    },
    0
  );

  assert.deepEqual(candidate.tags, ["亲密关系沟通", "关系沟通", "刚确认关系"]);
});
