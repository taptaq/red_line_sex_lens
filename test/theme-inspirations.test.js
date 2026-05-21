import test from "node:test";
import assert from "node:assert/strict";

import {
  collectThemeInspirationSourceRecords,
  buildThemeInspirationClusters,
  buildThemeInspirationSummarizeMessages,
  mergeThemeInspirationItems,
  normalizeThemeInspirationItems,
  summarizeThemeInspirationClusters
} from "../src/theme-inspirations.js";

test("collectThemeInspirationSourceRecords keeps only high-performing published records", () => {
  const items = collectThemeInspirationSourceRecords([
    {
      id: "keep-1",
      note: { title: "自慰后空虚", body: "正文 A", tags: ["身体探索"] },
      publish: { status: "published_passed", metrics: { likes: 60, favorites: 30, comments: 12, views: 3500, shares: 25 } }
    },
    {
      id: "drop-unpublished",
      note: { title: "未发布", body: "正文 B", tags: ["科普"] },
      publish: { status: "not_published", metrics: { likes: 999 } }
    }
  ]);

  assert.deepEqual(items.map((item) => item.id), ["keep-1"]);
});

test("buildThemeInspirationClusters groups records by shared topic signals", () => {
  const clusters = buildThemeInspirationClusters([
    {
      id: "a",
      note: { title: "自慰后空虚是不是异常", body: "空虚 失落 正常性", tags: ["身体探索", "情绪反应"], collectionType: "科普" },
      publish: { status: "published_passed", metrics: { likes: 60, favorites: 30, comments: 12, views: 3500, shares: 25 } }
    },
    {
      id: "b",
      note: { title: "为什么结束后会失落", body: "自慰后情绪 失落 空虚", tags: ["身体探索"], collectionType: "科普" },
      publish: { status: "positive_performance", metrics: { likes: 90, favorites: 40, comments: 20, views: 5000, shares: 35 } }
    }
  ]);

  assert.equal(clusters.length, 1);
  assert.deepEqual(clusters[0].recordIds, ["a", "b"]);
});

test("buildThemeInspirationClusters does not merge unrelated records on generic terms alone", () => {
  const clusters = buildThemeInspirationClusters([
    {
      id: "science-a",
      note: { title: "亲密关系里的嫉妒怎么化解", body: "嫉妒 安全感 沟通 修复", tags: ["情绪反应"], collectionType: "科普" },
      publish: { status: "published_passed", metrics: { likes: 45, favorites: 22, comments: 11, views: 2800, shares: 21 } }
    },
    {
      id: "science-b",
      note: { title: "第一次使用情趣玩具前要准备什么", body: "清洁 材质 润滑 安全", tags: ["新手指南"], collectionType: "科普" },
      publish: { status: "positive_performance", metrics: { likes: 52, favorites: 31, comments: 14, views: 4200, shares: 23 } }
    }
  ]);

  assert.equal(clusters.length, 2);
  assert.deepEqual(
    clusters.map((cluster) => cluster.recordIds),
    [["science-a"], ["science-b"]]
  );
});

test("buildThemeInspirationClusters merges connected records even when the bridge appears later", () => {
  const clusters = buildThemeInspirationClusters([
    {
      id: "a",
      note: { title: "自慰后空虚是不是异常", body: "空虚 失落 正常性", tags: ["身体探索"], collectionType: "科普" },
      publish: { status: "published_passed", metrics: { likes: 60, favorites: 30, comments: 12, views: 3500, shares: 25 } }
    },
    {
      id: "c",
      note: { title: "高潮之后想哭正常吗", body: "情绪波动 羞耻感 恢复", tags: ["情绪反应"], collectionType: "科普" },
      publish: { status: "positive_performance", metrics: { likes: 55, favorites: 28, comments: 16, views: 3300, shares: 26 } }
    },
    {
      id: "b",
      note: { title: "为什么结束后会失落", body: "自慰后情绪 失落 空虚 羞耻感", tags: ["身体探索", "情绪反应"], collectionType: "科普" },
      publish: { status: "positive_performance", metrics: { likes: 90, favorites: 40, comments: 20, views: 5000, shares: 35 } }
    }
  ]);

  assert.equal(clusters.length, 1);
  assert.deepEqual(clusters[0].recordIds, ["a", "b", "c"]);
});

test("normalizeThemeInspirationItems keeps display fields and prefill fields", () => {
  const items = normalizeThemeInspirationItems([
    {
      themeTitle: "自慰后空虚并不一定异常",
      hookAngle: "很多人以为这是问题，其实很常见。",
      whyNow: "这个主题兼具反差和科普价值。",
      discussionSignal: "多个高表现内容都反复命中。",
      sourceSignals: ["命中 2 条高表现内容"],
      expandAngles: ["从激素变化讲", "从羞耻感讲"],
      boundaryNotes: ["避免病理化表达"],
      confidenceScore: 0.92,
      tags: ["身体探索", "情绪反应"],
      prefillBriefing: "写一篇轻松科普，解释自慰后空虚为什么不一定异常。",
      prefillTopic: "自慰后空虚是不是异常",
      prefillConstraints: "避免病理化，不做医疗诊断。",
      prefillReferenceTitle: "为什么结束后会突然很空？",
      prefillMaterialText: "关键点：常见、正常、可自我接纳。"
    }
  ]);

  assert.equal(items.length, 1);
  assert.equal(items[0].themeTitle, "自慰后空虚并不一定异常");
  assert.equal(items[0].prefillTopic, "自慰后空虚是不是异常");
});

test("normalizeThemeInspirationItems coerces invalid confidenceScore values to zero", () => {
  const items = normalizeThemeInspirationItems([
    {
      themeTitle: "边界感不是冷淡",
      hookAngle: "很多人把边界误解成疏远。",
      whyNow: "讨论里经常把拒绝和冷漠混在一起。",
      discussionSignal: "评论区反复出现同类误解。",
      sourceSignals: ["命中 1 条高表现内容"],
      expandAngles: ["从沟通措辞讲"],
      boundaryNotes: ["避免绝对化"],
      confidenceScore: "not-a-number",
      tags: ["关系沟通"],
      prefillBriefing: "写一篇解释边界感的科普。",
      prefillTopic: "边界感是不是冷淡",
      prefillConstraints: "保持温和。",
      prefillReferenceTitle: "怎么表达拒绝又不伤人",
      prefillMaterialText: "关键点：边界不等于攻击。"
    }
  ]);

  assert.equal(items.length, 1);
  assert.equal(items[0].confidenceScore, 0);
  assert.equal(Number.isNaN(items[0].confidenceScore), false);
});

test("normalizeThemeInspirationItems drops generic or duplicate theme cards", () => {
  const items = normalizeThemeInspirationItems([
    {
      themeTitle: "身体探索",
      prefillBriefing: "写身体探索",
      prefillTopic: "身体探索"
    },
    {
      themeTitle: "自慰后空虚并不一定异常",
      hookAngle: "很多人以为这是问题，其实很常见。",
      whyNow: "这个主题兼具反差和科普价值。",
      discussionSignal: "多个高表现内容都反复命中。",
      prefillBriefing: "写一篇轻松科普，解释自慰后空虚为什么不一定异常。",
      prefillTopic: "自慰后空虚是不是异常"
    },
    {
      themeTitle: "自慰后空虚并不一定异常",
      hookAngle: "很多人以为这是问题，其实很常见。",
      whyNow: "这个主题兼具反差和科普价值。",
      discussionSignal: "多个高表现内容都反复命中。",
      prefillBriefing: "写一篇轻松科普，解释自慰后空虚为什么不一定异常。",
      prefillTopic: "自慰后空虚是不是异常"
    }
  ]);

  assert.equal(items.length, 1);
  assert.equal(items[0].themeTitle, "自慰后空虚并不一定异常");
});

test("summarizeThemeInspirationClusters turns a cluster into a normalized inspiration card", async () => {
  const clusters = buildThemeInspirationClusters([
    {
      id: "a",
      note: {
        title: "自慰后空虚是不是异常",
        body: "很多人结束后会有短暂空虚和失落，这不一定意味着异常。",
        tags: ["身体探索", "情绪反应"],
        collectionType: "科普"
      },
      publish: { status: "published_passed", metrics: { likes: 60, favorites: 30, comments: 12, views: 3500, shares: 25 } }
    },
    {
      id: "b",
      note: {
        title: "为什么结束后会失落",
        body: "自慰后情绪、羞耻感和激素波动可能都会影响感受。",
        tags: ["身体探索", "情绪反应"],
        collectionType: "科普"
      },
      publish: { status: "positive_performance", metrics: { likes: 90, favorites: 40, comments: 20, views: 5000, shares: 35 } }
    }
  ]);

  const result = await summarizeThemeInspirationClusters({
    clusters,
    referenceSamples: [
      {
        title: "参考样本",
        body: "高质量科普样本",
        tags: ["科普"]
      }
    ],
    summarizeJson: async () => ({
      items: [
        {
          themeTitle: "自慰后空虚并不一定异常",
          hookAngle: "很多人以为空虚就是出问题，其实常见。",
          whyNow: "高表现内容反复命中这个问题。",
          discussionSignal: "容易引发“我是不是不正常”的讨论。",
          sourceSignals: ["命中 2 条高表现内容"],
          expandAngles: ["从激素波动讲", "从羞耻感讲"],
          boundaryNotes: ["避免病理化表达"],
          confidenceScore: 0.93,
          tags: ["身体探索", "情绪反应"],
          prefillBriefing: "写一篇轻松科普，解释自慰后空虚为什么不一定异常。",
          prefillReferenceTitle: "为什么结束后会突然很空？",
          prefillMaterialText: "关键点：常见、正常、可自我接纳。"
        }
      ]
    })
  });

  assert.equal(result.items.length, 2);
  assert.deepEqual(
    result.items.map((item) => item.themeTitle),
    ["从激素波动讲", "从羞耻感讲"]
  );
  assert.equal(result.items[0].sourceThemeTitle, "自慰后空虚并不一定异常");
  assert.equal(result.items[0].prefillReferenceTitle, "从激素波动讲");
  assert.equal(result.diagnostics.rawModelTextLength, 0);
  assert.deepEqual(result.modelTrace.attemptedRoutes, []);
});

test("summarizeThemeInspirationClusters accepts top-level array payloads from the model parser", async () => {
  const clusters = buildThemeInspirationClusters([
    {
      id: "a",
      note: {
        title: "自慰后空虚是不是异常",
        body: "很多人结束后会有短暂空虚和失落，这不一定意味着异常。",
        tags: ["身体探索", "情绪反应"],
        collectionType: "科普"
      },
      publish: { status: "published_passed", metrics: { likes: 60, favorites: 30, comments: 12, views: 3500, shares: 25 } }
    },
    {
      id: "b",
      note: {
        title: "为什么结束后会失落",
        body: "自慰后情绪、羞耻感和激素波动可能都会影响感受。",
        tags: ["身体探索", "情绪反应"],
        collectionType: "科普"
      },
      publish: { status: "positive_performance", metrics: { likes: 90, favorites: 40, comments: 20, views: 5000, shares: 35 } }
    }
  ]);

  const result = await summarizeThemeInspirationClusters({
    clusters,
    summarizeJson: async () => [
      {
        themeTitle: "自慰后空虚并不一定异常",
        hookAngle: "很多人以为空虚就是出问题，其实常见。",
        whyNow: "高表现内容反复命中这个问题。",
        discussionSignal: "容易引发“我是不是不正常”的讨论。",
        sourceSignals: ["命中 2 条高表现内容"],
        expandAngles: ["从激素波动讲", "从羞耻感讲"],
        boundaryNotes: ["避免病理化表达"],
        confidenceScore: 0.93,
        tags: ["身体探索", "情绪反应"],
        prefillBriefing: "写一篇轻松科普，解释自慰后空虚为什么不一定异常。",
        prefillReferenceTitle: "为什么结束后会突然很空？",
        prefillMaterialText: "关键点：常见、正常、可自我接纳。"
      }
    ]
  });

  assert.equal(result.items.length, 2);
  assert.deepEqual(
    result.items.map((item) => item.themeTitle),
    ["从激素波动讲", "从羞耻感讲"]
  );
});

test("mergeThemeInspirationItems prepends new deduped cards ahead of cached ones", () => {
  const merged = mergeThemeInspirationItems({
    cachedItems: [
      {
        themeId: "old-1",
        themeTitle: "从羞耻感讲",
        prefillBriefing: "写一篇从羞耻感角度展开的轻松科普。",
        confidenceScore: 0.82
      },
      {
        themeId: "old-2",
        themeTitle: "从沟通边界讲",
        prefillBriefing: "写一篇关于亲密关系里沟通边界的轻松科普。",
        confidenceScore: 0.8
      }
    ],
    nextItems: [
      {
        themeId: "new-1",
        themeTitle: "从新手试错讲",
        prefillBriefing: "写一篇从第一次尝试身体探索的紧张感切入的轻松科普。",
        confidenceScore: 0.91
      },
      {
        themeId: "new-2",
        themeTitle: "从羞耻感讲",
        prefillBriefing: "写一篇从羞耻感角度展开的轻松科普。",
        confidenceScore: 0.95
      }
    ]
  });

  assert.deepEqual(
    merged.map((item) => item.themeTitle),
    ["从新手试错讲", "从羞耻感讲", "从沟通边界讲"]
  );
  assert.equal(merged[1].themeId, "new-2");
  assert.equal(merged[1].confidenceScore, 0.95);
});

test("theme inspiration summarize messages can include compact relevant record evidence", () => {
  const messages = buildThemeInspirationSummarizeMessages({
    clusters: [
      {
        id: "cluster-1",
        recordIds: ["a"],
        signatureTerms: ["身体探索", "情绪反应"],
        records: [
          {
            note: {
              title: "自慰后空虚是不是异常",
              body: "很多人结束后会有短暂空虚和失落，这不一定意味着异常。",
              tags: ["身体探索", "情绪反应"]
            },
            publish: { metrics: { likes: 60 } }
          }
        ]
      }
    ],
    referenceSamples: [],
    relevantRecords: [
      {
        id: "record-1",
        title: "为什么结束后会失落",
        summary: "高表现样本，同样命中空虚和羞耻感。",
        reasons: ["标签重合 2 项", "标题短语命中 1 项"]
      }
    ]
  });

  const combined = messages.map((item) => item.content).join("\n");
  assert.match(combined, /相关历史证据/);
  assert.match(combined, /为什么结束后会失落/);
  assert.match(combined, /高表现样本，同样命中空虚和羞耻感/);
  assert.match(combined, /标签重合 2 项/);
});
