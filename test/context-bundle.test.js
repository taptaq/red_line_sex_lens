import test from "node:test";
import assert from "node:assert/strict";

import { buildScopedContextBundle } from "../src/context-bundle.js";

test("buildScopedContextBundle returns compressed relevant record summaries", () => {
  const bundle = buildScopedContextBundle({
    taskType: "publish_prediction",
    current: {
      title: "边界感是不是冷淡",
      body: "正文里提到边界和沟通压力",
      tags: ["身体探索", "情绪反应"],
      collectionType: "科普"
    },
    records: [
      {
        id: "record-1",
        note: {
          title: "怎么表达拒绝又不伤人",
          body: "很多人表达拒绝时会担心关系变差，这并不等于做错了。".repeat(8),
          tags: ["身体探索", "情绪反应"],
          collectionType: "科普"
        },
        publish: { status: "positive_performance", metrics: { likes: 99 } }
      },
      {
        id: "record-2",
        note: {
          title: "无关标题",
          body: "无关内容".repeat(20),
          tags: ["日常"],
          collectionType: "经验"
        },
        publish: { status: "published_passed", metrics: { likes: 2 } }
      }
    ],
    referenceSamples: [
      {
        id: "reference-1",
        title: "高质量科普样本",
        body: "参考正文".repeat(20),
        tags: ["科普", "身体探索"]
      }
    ]
  });

  assert.equal(Array.isArray(bundle.relevantRecords), true);
  assert.equal(bundle.relevantRecords.length, 1);
  assert.equal(bundle.relevantRecords[0].id, "record-1");
  assert.equal(bundle.relevantRecords[0].summary.length < 220, true);
  assert.equal(Array.isArray(bundle.relevantRecords[0].reasons), true);
  assert.equal(bundle.relevantReferenceSamples.length, 1);
  assert.equal(bundle.relevantReferenceSamples[0].summary.length < 220, true);
});
