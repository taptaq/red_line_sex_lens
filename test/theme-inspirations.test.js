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
      note: { title: "边界感", body: "正文 A", tags: ["身体探索"] },
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
      note: { title: "边界感是不是冷淡", body: "边界表达 关系沟通", tags: ["边界表达", "关系沟通"], collectionType: "科普" },
      publish: { status: "published_passed", metrics: { likes: 60, favorites: 30, comments: 12, views: 3500, shares: 25 } }
    },
    {
      id: "b",
      note: { title: "怎么表达拒绝又不伤人", body: "边界表达 关系沟通 安全感", tags: ["边界表达", "关系沟通"], collectionType: "科普" },
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
      note: { title: "边界感是不是冷淡", body: "边界表达 关系沟通", tags: ["边界表达", "关系沟通"], collectionType: "科普" },
      publish: { status: "published_passed", metrics: { likes: 60, favorites: 30, comments: 12, views: 3500, shares: 25 } }
    },
    {
      id: "c",
      note: { title: "表达边界后还会内疚正常吗", body: "关系沟通 情绪反应 恢复", tags: ["关系沟通", "情绪反应"], collectionType: "科普" },
      publish: { status: "positive_performance", metrics: { likes: 55, favorites: 28, comments: 16, views: 3300, shares: 26 } }
    },
    {
      id: "b",
      note: { title: "怎么表达拒绝又不伤人", body: "边界表达 关系沟通 情绪反应", tags: ["边界表达", "关系沟通", "情绪反应"], collectionType: "科普" },
      publish: { status: "positive_performance", metrics: { likes: 90, favorites: 40, comments: 20, views: 5000, shares: 35 } }
    }
  ]);

  assert.equal(clusters.length, 1);
  assert.deepEqual(clusters[0].recordIds, ["a", "b", "c"]);
});

test("normalizeThemeInspirationItems keeps display fields and prefill fields", () => {
  const items = normalizeThemeInspirationItems([
    {
      themeTitle: "边界感不是冷淡",
      hookAngle: "很多人以为这是问题，其实很常见。",
      whyNow: "这个主题兼具反差和科普价值。",
      discussionSignal: "多个高表现内容都反复命中。",
      sourceSignals: ["命中 2 条高表现内容"],
      expandAngles: ["从表达方式讲", "从关系安全感讲"],
      boundaryNotes: ["避免病理化表达"],
      confidenceScore: 0.92,
      tags: ["身体探索", "情绪反应"],
      prefillBriefing: "写一篇轻松科普，解释边界感为什么不一定异常。",
      prefillTopic: "边界感是不是冷淡",
      prefillConstraints: "避免病理化，不做医疗诊断。",
      prefillReferenceTitle: "怎么表达拒绝又不伤人？",
      prefillMaterialText: "关键点：先共情、再说明边界、最后给替代沟通方式。"
    }
  ]);

  assert.equal(items.length, 1);
  assert.equal(items[0].themeTitle, "边界感不是冷淡");
  assert.equal(items[0].prefillTopic, "边界感是不是冷淡");
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
      themeTitle: "边界感不是冷淡",
      hookAngle: "很多人以为这是问题，其实很常见。",
      whyNow: "这个主题兼具反差和科普价值。",
      discussionSignal: "多个高表现内容都反复命中。",
      prefillBriefing: "写一篇轻松科普，解释边界感为什么不一定异常。",
      prefillTopic: "边界感是不是冷淡"
    },
    {
      themeTitle: "边界感不是冷淡",
      hookAngle: "很多人以为这是问题，其实很常见。",
      whyNow: "这个主题兼具反差和科普价值。",
      discussionSignal: "多个高表现内容都反复命中。",
      prefillBriefing: "写一篇轻松科普，解释边界感为什么不一定异常。",
      prefillTopic: "边界感是不是冷淡"
    }
  ]);

  assert.equal(items.length, 1);
  assert.equal(items[0].themeTitle, "边界感不是冷淡");
});

test("summarizeThemeInspirationClusters turns a cluster into a normalized inspiration card", async () => {
  const clusters = buildThemeInspirationClusters([
    {
      id: "a",
      note: {
        title: "边界感是不是冷淡",
        body: "很多人表达拒绝时会担心关系变差，这并不等于做错了。",
        tags: ["身体探索", "情绪反应"],
        collectionType: "科普"
      },
      publish: { status: "published_passed", metrics: { likes: 60, favorites: 30, comments: 12, views: 3500, shares: 25 } }
    },
    {
      id: "b",
      note: {
        title: "怎么表达拒绝又不伤人",
        body: "表达边界时的语气、顺序和安全感都会影响对方感受。",
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
          themeTitle: "边界感不是冷淡",
          hookAngle: "很多人把边界误解成疏远，其实很常见。",
          whyNow: "高表现内容反复命中这个问题。",
          discussionSignal: "容易引发“我是不是不正常”的讨论。",
          sourceSignals: ["命中 2 条高表现内容"],
          expandAngles: ["从表达方式讲", "从关系安全感讲"],
          boundaryNotes: ["避免病理化表达"],
          confidenceScore: 0.93,
          tags: ["身体探索", "情绪反应"],
          prefillBriefing: "写一篇轻松科普，解释边界感为什么不一定异常。",
          prefillReferenceTitle: "怎么表达拒绝又不伤人？",
          prefillMaterialText: "关键点：先共情、再说明边界、最后给替代沟通方式。"
        }
      ]
    })
  });

  assert.equal(result.items.length, 2);
  assert.deepEqual(
    result.items.map((item) => item.themeTitle),
    ["从表达方式讲", "从关系安全感讲"]
  );
  assert.equal(result.items[0].sourceThemeTitle, "边界感不是冷淡");
  assert.equal(result.items[0].prefillReferenceTitle, "从表达方式讲");
  assert.equal(result.diagnostics.rawModelTextLength, 0);
  assert.deepEqual(result.modelTrace.attemptedRoutes, []);
});

test("summarizeThemeInspirationClusters accepts top-level array payloads from the model parser", async () => {
  const clusters = buildThemeInspirationClusters([
    {
      id: "a",
      note: {
        title: "边界感是不是冷淡",
        body: "很多人表达拒绝时会担心关系变差，这并不等于做错了。",
        tags: ["身体探索", "情绪反应"],
        collectionType: "科普"
      },
      publish: { status: "published_passed", metrics: { likes: 60, favorites: 30, comments: 12, views: 3500, shares: 25 } }
    },
    {
      id: "b",
      note: {
        title: "怎么表达拒绝又不伤人",
        body: "表达边界时的语气、顺序和安全感都会影响对方感受。",
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
        themeTitle: "边界感不是冷淡",
        hookAngle: "很多人把边界误解成疏远，其实很常见。",
        whyNow: "高表现内容反复命中这个问题。",
        discussionSignal: "容易引发“我是不是不正常”的讨论。",
        sourceSignals: ["命中 2 条高表现内容"],
        expandAngles: ["从表达方式讲", "从关系安全感讲"],
        boundaryNotes: ["避免病理化表达"],
        confidenceScore: 0.93,
        tags: ["身体探索", "情绪反应"],
        prefillBriefing: "写一篇轻松科普，解释边界感为什么不一定异常。",
        prefillReferenceTitle: "怎么表达拒绝又不伤人？",
        prefillMaterialText: "关键点：先共情、再说明边界、最后给替代沟通方式。"
      }
    ]
  });

  assert.equal(result.items.length, 2);
  assert.deepEqual(
    result.items.map((item) => item.themeTitle),
    ["从表达方式讲", "从关系安全感讲"]
  );
});

test("mergeThemeInspirationItems prepends new deduped cards ahead of cached ones", () => {
  const merged = mergeThemeInspirationItems({
    cachedItems: [
      {
        themeId: "old-1",
        themeTitle: "从关系安全感讲",
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
        themeTitle: "从关系安全感讲",
        prefillBriefing: "写一篇从羞耻感角度展开的轻松科普。",
        confidenceScore: 0.95
      }
    ]
  });

  assert.deepEqual(
    merged.map((item) => item.themeTitle),
    ["从新手试错讲", "从关系安全感讲", "从沟通边界讲"]
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
              title: "边界感是不是冷淡",
              body: "很多人表达拒绝时会担心关系变差，这并不等于做错了。",
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
        title: "怎么表达拒绝又不伤人",
        summary: "高表现样本，同样命中边界表达和沟通压力。",
        reasons: ["标签重合 2 项", "标题短语命中 1 项"]
      }
    ]
  });

  const combined = messages.map((item) => item.content).join("\n");
  assert.match(combined, /相关历史证据/);
  assert.match(combined, /怎么表达拒绝又不伤人/);
  assert.match(combined, /高表现样本，同样命中边界表达和沟通压力/);
  assert.match(combined, /标签重合 2 项/);
});
