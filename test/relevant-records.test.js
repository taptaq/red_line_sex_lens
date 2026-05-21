import test from "node:test";
import assert from "node:assert/strict";

import { rankRelevantHistoricalRecords } from "../src/relevant-records.js";

test("rankRelevantHistoricalRecords prefers records sharing tags and collection type", () => {
  const ranked = rankRelevantHistoricalRecords({
    title: "自慰后空虚是不是异常",
    body: "正文里提到空虚和羞耻感",
    tags: ["身体探索", "情绪反应"],
    collectionType: "科普",
    records: [
      {
        id: "record-good",
        note: {
          title: "为什么结束后会失落",
          body: "也提到空虚和羞耻感",
          tags: ["身体探索", "情绪反应"],
          collectionType: "科普"
        },
        publish: {
          status: "positive_performance",
          metrics: { likes: 88 }
        }
      },
      {
        id: "record-weak",
        note: {
          title: "无关标题",
          body: "无关内容",
          tags: ["日常"],
          collectionType: "经验"
        },
        publish: {
          status: "published_passed",
          metrics: { likes: 2 }
        }
      }
    ]
  });

  assert.equal(ranked[0].id, "record-good");
  assert.equal(Array.isArray(ranked[0].reasons), true);
  assert.equal(ranked[0].reasons.length > 0, true);
});

test("rankRelevantHistoricalRecords keeps deterministic ordering for equal-score candidates", () => {
  const ranked = rankRelevantHistoricalRecords({
    title: "关系沟通里的边界感",
    body: "正文强调沟通和边界",
    tags: ["关系沟通"],
    collectionType: "科普",
    records: [
      {
        id: "record-b",
        note: {
          title: "边界感不是冷淡",
          body: "沟通和边界都提到了",
          tags: ["关系沟通"],
          collectionType: "科普"
        },
        publish: {
          status: "published_passed",
          metrics: { likes: 32 }
        }
      },
      {
        id: "record-a",
        note: {
          title: "边界感怎么说出口",
          body: "沟通和边界都提到了",
          tags: ["关系沟通"],
          collectionType: "科普"
        },
        publish: {
          status: "published_passed",
          metrics: { likes: 32 }
        }
      }
    ]
  });

  assert.deepEqual(
    ranked.map((item) => item.id),
    ["record-a", "record-b"]
  );
});
