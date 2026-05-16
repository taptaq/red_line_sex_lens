import test from "node:test";
import assert from "node:assert/strict";

import {
  buildGenerationBriefingMessages,
  buildGenerationMessages,
  improveGenerationBriefing,
  generateNoteCandidates,
  normalizeGenerationCandidate,
  scoreGenerationCandidates
} from "../src/generation-workbench.js";

async function withEnv(overrides, run) {
  const previous = new Map();

  for (const [key, value] of Object.entries(overrides)) {
    previous.set(key, process.env[key]);
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  try {
    return await run();
  } finally {
    for (const [key, value] of previous.entries()) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

function createJsonResponse(status, payload) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() {
      return payload;
    }
  };
}

test("buildGenerationMessages includes mode, style profile, success samples, and user requirements", () => {
  const messages = buildGenerationMessages({
    mode: "from_scratch",
    brief: {
      briefing: "写给新手女生的轻松科普，不要营销感",
      referenceTitle: "来月经了，还能进行内太空吗？",
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
  assert.match(combined, /写给新手女生的轻松科普，不要营销感/);
  assert.match(combined, /参考标题：来月经了，还能进行内太空吗？/);
  assert.match(combined, /温和克制/);
  assert.match(combined, /成功标题/);
  assert.match(combined, /只返回 JSON/);
  assert.match(combined, /标题一定要吸睛/);
  assert.match(combined, /高反差/);
  assert.match(combined, /封面文案也要尽可能吸睛、高反差/);
  assert.match(combined, /比标题更短、更冲击/);
  assert.match(combined, /适当加 emoji/);
  assert.match(combined, /正文至少包含 3 个 emoji/);
  assert.match(combined, /内太空/);
  assert.match(combined, /黑话/);
  assert.match(combined, /融入内太空的相关元素/);
  assert.match(combined, /符合账号主题/);
  assert.match(combined, /标题、封面文案、正文开头三者里至少两处/);
  assert.match(combined, /小飞船/);
  assert.match(combined, /震动棒/);
  assert.match(combined, /大白话/);
  assert.match(combined, /不要输出一大段长文不分段/);
  assert.match(combined, /短文档/);
  assert.match(combined, /800-1000 个中文字符/);
  assert.match(combined, /按中文字符数理解/);
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
  assert.match(combined, /封面文案要比标题更短、更像一眼能扫到的封面钩子/);
  assert.match(combined, /封面文案和标题不要只是重复复述/);
  assert.match(combined, /要自然融入内太空相关元素，整体表达要符合账号主题/);
  assert.match(combined, /尽量把内太空元素落在标题、封面文案、正文开头三者中的至少两处/);
  assert.match(combined, /封面图 prompt/iu);
  assert.match(combined, /短文模式/);
  assert.match(combined, /封面文案/);
  assert.match(combined, /不露脸的萌系宇航员形象/);
  assert.match(combined, /长文模式/);
  assert.match(combined, /无任何文字/);
  assert.match(combined, /去掉手臂的国旗标识/);
  assert.match(combined, /3:4/);
  assert.match(combined, /4:3/);
  assert.match(combined, /请生成 1 个最终候选稿/);
  assert.match(combined, /coverImagePrompt/);
  assert.doesNotMatch(combined, /请生成 3 个候选/);
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

test("improveGenerationBriefing expands a one-line request into a richer generation brief", async () => {
  const messages = buildGenerationBriefingMessages({
    mode: "from_scratch",
    brief: {
      collectionType: "科普",
      briefing: "写经期能不能用玩具，轻松一点",
      referenceTitle: "来月经了，还能进行内太空吗？"
    }
  });

  assert.match(messages[0].content, /扩展成更完整、更好用的生成说明/);
  assert.match(messages[1].content, /原始一句话需求：写经期能不能用玩具，轻松一点/);
  assert.match(messages[1].content, /参考标题：来月经了，还能进行内太空吗？/);
  assert.match(messages[1].content, /只返回 JSON/);

  const result = await improveGenerationBriefing({
    mode: "from_scratch",
    brief: {
      collectionType: "科普",
      briefing: "写经期能不能用玩具，轻松一点"
    },
    improveJson: async () => ({
      briefing: "写一篇给新手女生看的轻松科普，重点回答经期能不能用玩具、什么情况下要先暂停，语气自然，不要营销感。",
      notes: ["补足了目标人群", "补足了语气要求"],
      provider: "mock",
      model: "mock-briefing"
    })
  });

  assert.equal(
    result.briefing,
    "写一篇给新手女生看的轻松科普，重点回答经期能不能用玩具、什么情况下要先暂停，语气自然，不要营销感。"
  );
  assert.deepEqual(result.notes, ["补足了目标人群", "补足了语气要求"]);
  assert.equal(result.modelTrace.provider, "mock");
  assert.equal(result.modelTrace.model, "mock-briefing");
});

test("generateNoteCandidates keeps only one final candidate even if the generator returns multiple variants", async () => {
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

  assert.equal(result.candidates.length, 1);
  assert.equal(result.candidates[0].variant, "safe");
  assert.equal(result.candidates[0].title, "安全版");
  assert.equal(result.modelTrace.model, "mock-model");
});

test("generateNoteCandidates accepts a flat top-level candidate payload from the model", async () => {
  const result = await generateNoteCandidates({
    mode: "from_scratch",
    brief: { collectionType: "科普", topic: "沟通" },
    generateJson: async () => ({
      variant: "final",
      title: "扁平标题",
      body: "扁平正文".repeat(30),
      coverText: "扁平封面",
      tags: ["沟通", "科普"],
      generationNotes: "模型直接返回扁平结构",
      safetyNotes: "保持中性表达",
      referencedSampleIds: ["sample-1"],
      provider: "mock",
      model: "mock-flat"
    })
  });

  assert.equal(result.candidates.length, 1);
  assert.equal(result.candidates[0].variant, "final");
  assert.equal(result.candidates[0].title, "扁平标题");
  assert.match(result.candidates[0].body, /🙂\n\n✨\n\n🫶$/);
  assert.deepEqual(result.candidates[0].tags, ["沟通", "科普"]);
  assert.match(result.candidates[0].coverImagePrompt, /封面文案/);
  assert.match(result.candidates[0].coverImagePrompt, /不露脸的萌系宇航员/);
  assert.equal(result.candidates[0].generationNotes, "模型直接返回扁平结构");
  assert.equal(result.candidates[0].safetyNotes, "保持中性表达");
  assert.deepEqual(result.candidates[0].referencedSampleIds, ["sample-1"]);
});

test("generateNoteCandidates expands short body once until it reaches the minimum short-mode chinese character floor", async () => {
  const seenMessages = [];
  let callCount = 0;

  const result = await generateNoteCandidates({
    mode: "from_scratch",
    brief: { collectionType: "科普", topic: "沟通", lengthMode: "short" },
    generateJson: async ({ messages }) => {
      seenMessages.push(messages.map((item) => item.content).join("\n"));
      callCount += 1;

      if (callCount === 1) {
        return {
          candidate: {
            variant: "final",
            title: "标题",
            body: "短正文".repeat(60),
            coverText: "封面钩子",
            tags: ["科普", "沟通"]
          },
          provider: "mock",
          model: "mock-first"
        };
      }

      return {
        candidate: {
          body: "扩写正文".repeat(220)
        },
        provider: "mock",
        model: "mock-expand"
      };
    }
  });

  assert.equal(callCount, 2);
  assert.match(seenMessages[1], /当前正文偏短/);
  assert.match(seenMessages[1], /至少扩写到 800 个中文字符/);
  const hanChars = (result.candidates[0].body.match(/\p{Script=Han}/gu) || []).length;
  assert.ok(hanChars >= 800);
});

test("generateNoteCandidates skips body expansion when chinese character count already reaches the selected floor", async () => {
  let callCount = 0;

  const result = await generateNoteCandidates({
    mode: "from_scratch",
    brief: { collectionType: "科普", topic: "沟通", lengthMode: "short" },
    generateJson: async () => {
      callCount += 1;
      return {
        candidate: {
          variant: "final",
          title: "标题",
          body: "足量正文".repeat(300),
          coverText: "封面钩子",
          tags: ["科普", "沟通"]
        },
        provider: "mock",
        model: "mock-single"
      };
    }
  });

  assert.equal(callCount, 1);
  const hanChars = (result.candidates[0].body.match(/\p{Script=Han}/gu) || []).length;
  assert.ok(hanChars >= 800);
});

test("generateNoteCandidates compacts overly long short-mode body back under the chinese character ceiling", async () => {
  const result = await generateNoteCandidates({
    mode: "from_scratch",
    brief: { collectionType: "科普", topic: "沟通", lengthMode: "short" },
    generateJson: async () => ({
      candidate: {
        variant: "final",
        title: "标题",
        body: `${"第一句讲结论。第二句讲原因。第三句讲风险。第四句讲建议。第五句讲观察点。第六句讲补充提醒。".repeat(30)}`,
        coverText: "封面钩子",
        tags: ["科普", "沟通"]
      },
      provider: "mock",
      model: "mock-long"
    })
  });

  const hanChars = (result.candidates[0].body.match(/\p{Script=Han}/gu) || []).length;
  assert.ok(hanChars <= 1000);
  assert.ok(hanChars >= 800);
});

test("generateNoteCandidates also compacts a single run-on sentence under the short-mode chinese character ceiling", async () => {
  const result = await generateNoteCandidates({
    mode: "from_scratch",
    brief: { collectionType: "科普", topic: "沟通", lengthMode: "short" },
    generateJson: async () => ({
      candidate: {
        variant: "final",
        title: "标题",
        body: `${"先讲一个观察，然后继续补一个原因，再补一个提醒，再接一个判断，再加一个场景，再补一句解释，".repeat(90)}最后落一句总结。`,
        coverText: "封面钩子",
        tags: ["科普", "沟通"]
      },
      provider: "mock",
      model: "mock-run-on"
    })
  });

  const hanChars = (result.candidates[0].body.match(/\p{Script=Han}/gu) || []).length;
  assert.ok(hanChars <= 1000);
});

test("generateNoteCandidates counts only the main body toward the floor when a trailing science section is appended", async () => {
  let callCount = 0;

  const result = await generateNoteCandidates({
    mode: "from_scratch",
    brief: { collectionType: "科普", topic: "沟通", lengthMode: "short" },
    generateJson: async () => {
      callCount += 1;

      if (callCount === 1) {
        return {
          candidate: {
            variant: "final",
            title: "标题",
            body: `${"正文".repeat(350)}\n\n【科普补充】\n${"科普".repeat(180)}`,
            coverText: "封面钩子",
            tags: ["科普", "沟通"]
          },
          provider: "mock",
          model: "mock-first"
        };
      }

      return {
        candidate: {
          body: "扩写正文".repeat(220)
        },
        provider: "mock",
        model: "mock-expand"
      };
    }
  });

  assert.equal(callCount, 2);
  const hanChars = (result.candidates[0].body.match(/\p{Script=Han}/gu) || []).length;
  assert.ok(hanChars >= 800);
});

test("generateNoteCandidates performs at most one body expansion retry even if the expanded body is still short", async () => {
  let callCount = 0;

  const result = await generateNoteCandidates({
    mode: "from_scratch",
    brief: { collectionType: "科普", topic: "沟通", lengthMode: "short" },
    generateJson: async () => {
      callCount += 1;

      if (callCount === 1) {
        return {
          candidate: {
            variant: "final",
            title: "标题",
            body: "短正文".repeat(60),
            coverText: "封面钩子",
            tags: ["科普", "沟通"]
          },
          provider: "mock",
          model: "mock-first"
        };
      }

      return {
        candidate: {
          body: "还是偏短".repeat(80)
        },
        provider: "mock",
        model: "mock-expand"
      };
    }
  });

  assert.equal(callCount, 2);
  const hanChars = (result.candidates[0].body.match(/\p{Script=Han}/gu) || []).length;
  assert.ok(hanChars < 800);
});

test("generateNoteCandidates rewrites cover text once when it is too similar to the title", async () => {
  const seenMessages = [];
  let callCount = 0;

  const result = await generateNoteCandidates({
    mode: "from_scratch",
    brief: { collectionType: "科普", topic: "沟通" },
    generateJson: async ({ messages }) => {
      seenMessages.push(messages.map((item) => item.content).join("\n"));
      callCount += 1;

      if (callCount === 1) {
        return {
          candidate: {
            variant: "final",
            title: "月经来了还能不能开飞船？",
            body: "这是完整正文".repeat(150),
            coverText: "月经来了还能不能开飞船？",
            tags: ["科普", "沟通"]
          },
          provider: "mock",
          model: "mock-first"
        };
      }

      return {
        candidate: {
          coverText: "经期也想开？先看这句"
        },
        provider: "mock",
        model: "mock-second"
      };
    }
  });

  assert.equal(callCount, 2);
  assert.equal(result.candidates[0].coverText, "经期也想开？先看这句");
  assert.match(seenMessages[1], /封面文案和标题太像了/);
  assert.match(seenMessages[1], /只重写封面文案/);
});

test("generateNoteCandidates skips cover text rewrite when title and cover are already distinct", async () => {
  let callCount = 0;

  const result = await generateNoteCandidates({
    mode: "from_scratch",
    brief: { collectionType: "科普", topic: "沟通" },
    generateJson: async () => {
      callCount += 1;
      return {
        candidate: {
          variant: "final",
          title: "月经来了还能不能开飞船？",
          body: "这是完整正文".repeat(150),
          coverText: "先别急，三种情况先暂停",
          tags: ["科普", "沟通"]
        },
        provider: "mock",
        model: "mock-single"
      };
    }
  });

  assert.equal(callCount, 1);
  assert.equal(result.candidates[0].coverText, "先别急，三种情况先暂停");
});

test("generateNoteCandidates repairs lightly broken fenced JSON from DMXAPI text models", async () => {
  await withEnv(
    {
      DMXAPI_API_KEY: "dmxapi-test"
    },
    async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async () =>
        createJsonResponse(200, {
          model: "gpt-5.4",
          choices: [
            {
              message: {
                content: `\`\`\`json
{
  "candidates": [
    {
      "variant": "safe",
      "title": "亲戚来访时,还能开启"内太空漫游"吗？🚀",
      "body": "家人们,最近后台好多新晋宇航员在悄悄问我一个问题:",
      "coverText": "内太空漫游",
      "tags": ["亲密关系沟通", "边界感"]
    }
  ]
}
\`\`\``
              }
            }
          ]
        });

      try {
        const result = await generateNoteCandidates({
          brief: {
            topic: "亲密关系沟通",
            collectionType: "关系"
          },
          modelSelection: "gpt-5.4"
        });

        assert.equal(result.candidates.length, 1);
        assert.equal(result.candidates[0].title, '亲戚来访时,还能开启"内太空漫游"吗？🚀');
        assert.match(result.candidates[0].body, /家人们,最近后台好多新晋宇航员在悄悄问我一个问题:🙂\n\n✨\n\n🫶/);
        assert.deepEqual(result.candidates[0].tags, ["亲密关系沟通", "边界感"]);
        assert.equal(result.modelTrace.provider, "dmxapi_text");
        assert.equal(result.modelTrace.model, "gpt-5.4");
      } finally {
        globalThis.fetch = originalFetch;
      }
    }
  );
});

test("normalizeGenerationCandidate fills missing fields without crashing", () => {
  const candidate = normalizeGenerationCandidate({ title: "标题" }, 1);
  assert.equal(candidate.variant, "natural");
  assert.equal(candidate.body, "");
  assert.equal(candidate.coverImagePrompt, "");
  assert.deepEqual(candidate.tags, []);
});

test("normalizeGenerationCandidate keeps cover image prompt when provided", () => {
  const candidate = normalizeGenerationCandidate(
    {
      title: "标题",
      body: "第一段正文。第二段正文。第三段正文。",
      coverImagePrompt: "基于正文生成的封面图 prompt"
    },
    0
  );

  assert.equal(candidate.coverImagePrompt, "基于正文生成的封面图 prompt");
});

test("normalizeGenerationCandidate ensures generated body carries at least three naturally separated emoji", () => {
  const candidate = normalizeGenerationCandidate(
    {
      title: "标题",
      body: "第一句先铺垫一下整体感受。第二句继续补充一些具体观察。第三句给一点轻松提醒。第四句顺手收个尾。"
    },
    0
  );
  const emojiMatches = candidate.body.match(/\p{Extended_Pictographic}/gu) || [];

  assert.ok(emojiMatches.length >= 3);
  assert.doesNotMatch(candidate.body, /🙂✨🫶|🙂✨|✨🫶/);
  assert.match(candidate.body, /[。！？]\s*🙂/u);
  assert.match(candidate.body, /[。！？]\s*✨/u);
  assert.match(candidate.body, /[。！？]\s*🫶/u);
});

test("normalizeGenerationCandidate reflows overly long paragraphs into shorter readable blocks", () => {
  const candidate = normalizeGenerationCandidate(
    {
      title: "标题",
      body:
        "第一句先回答核心结论🙂。第二句补充为什么现在不建议着急尝试✨。第三句解释风险点主要在哪。第四句给一个更稳妥的等待建议🫶。第五句说明观察身体状态的几个信号。第六句再用一句轻一点的话收尾。"
    },
    0
  );

  const paragraphs = candidate.body.split(/\n\s*\n/).filter(Boolean);

  assert.ok(paragraphs.length >= 3);
  for (const paragraph of paragraphs) {
    const sentenceCount = (paragraph.match(/[^。！？!?]+[。！？!?]+/gu) || []).length;
    assert.ok(sentenceCount <= 3);
  }
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

test("generateNoteCandidates fills a short-mode fallback cover image prompt when model omits it", async () => {
  const result = await generateNoteCandidates({
    mode: "from_scratch",
    brief: {
      collectionType: "科普",
      topic: "亲密关系沟通",
      lengthMode: "short"
    },
    generateJson: async () => ({
      candidate: {
        variant: "final",
        title: "亲密关系里最难讲出口的话",
        body: "正文内容".repeat(220),
        coverText: "先别急着委屈自己",
        tags: ["亲密关系", "关系沟通"]
      },
      provider: "mock",
      model: "mock-model"
    })
  });

  assert.match(result.candidates[0].coverImagePrompt, /封面文案/);
  assert.match(result.candidates[0].coverImagePrompt, /不露脸的萌系宇航员/);
  assert.match(result.candidates[0].coverImagePrompt, /去掉手臂的国旗标识/);
  assert.match(result.candidates[0].coverImagePrompt, /高反差/);
  assert.match(result.candidates[0].coverImagePrompt, /吸睛/);
  assert.match(result.candidates[0].coverImagePrompt, /3:4/);
  assert.match(result.candidates[0].coverImagePrompt, /亲密关系里最难讲出口的话/);
});

test("generateNoteCandidates builds a long-mode fallback cover image prompt with no-text vertical-cover requirement", async () => {
  const result = await generateNoteCandidates({
    mode: "from_scratch",
    brief: {
      collectionType: "科普",
      topic: "亲密关系沟通",
      lengthMode: "long"
    },
    generateJson: async () => ({
      candidate: {
        variant: "final",
        title: "为什么关系里越解释越容易吵起来",
        body: "长文正文".repeat(320),
        coverText: "先停一下再继续说",
        tags: ["亲密关系", "关系沟通"]
      },
      provider: "mock",
      model: "mock-model"
    })
  });

  assert.match(result.candidates[0].coverImagePrompt, /无任何文字/);
  assert.match(result.candidates[0].coverImagePrompt, /不露脸的萌系宇航员/);
  assert.match(result.candidates[0].coverImagePrompt, /去掉手臂的国旗标识/);
  assert.match(result.candidates[0].coverImagePrompt, /4:3/);
  assert.doesNotMatch(result.candidates[0].coverImagePrompt, /封面文案/);
});

test("scoreGenerationCandidates preserves previous cover image prompt when repair payload omits it", async () => {
  let analyzeCount = 0;
  const candidate = normalizeGenerationCandidate(
    {
      id: "candidate-final-1",
      variant: "final",
      title: "原标题",
      body: "正文内容".repeat(220),
      coverText: "原封面",
      coverImagePrompt: "旧的封面图 prompt",
      tags: ["亲密关系", "关系沟通"]
    },
    0,
    { lengthMode: "short" }
  );

  const result = await scoreGenerationCandidates({
    candidates: [candidate],
    brief: { lengthMode: "short" },
    modelSelection: {},
    analyzeCandidate: async () => {
      analyzeCount += 1;
      if (analyzeCount === 1) {
        return { finalVerdict: "manual_review", verdict: "manual_review", score: 24, suggestions: ["需要继续收敛"] };
      }

      return { finalVerdict: "pass", verdict: "pass", score: 82, suggestions: [] };
    },
    semanticReviewCandidate: async ({ analysis }) => ({
      status: "ok",
      review: { reasons: [] },
      verdict: analysis.finalVerdict || analysis.verdict
    }),
    crossReviewCandidate: async ({ analysis }) => ({
      aggregate: {
        recommendedVerdict: analysis.finalVerdict || analysis.verdict,
        analysisVerdict: analysis.finalVerdict || analysis.verdict,
        reasons: []
      }
    }),
    repairCandidate: async () => ({
      title: "修复后标题",
      body: "修复后正文".repeat(220),
      coverText: "修复后封面",
      tags: ["亲密关系", "关系沟通"],
      rewriteNotes: "只修正文和封面，不返回 cover image prompt"
    })
  });

  assert.equal(result.scoredCandidates[0].finalDraft.coverImagePrompt, "旧的封面图 prompt");
});
