import test from "node:test";
import assert from "node:assert/strict";

import {
  buildSkippedHotArticleFormula,
  deriveHotArticleKeyword,
  fetchHotArticleFormula,
  normalizeHotArticleRecord,
  summarizeHotArticleFormula
} from "../src/xhs-hot-articles.js";

test("deriveHotArticleKeyword prefers specific generation brief fields", () => {
  const keyword = deriveHotArticleKeyword({
    brief: {
      topic: "关系沟通",
      referenceTitle: "边界感不是冷淡",
      briefing: "帮我写一篇关于亲密关系的小红书笔记",
      tagReferences: "情绪反应, 安全感"
    },
    draft: {
      title: "草稿标题",
      tags: ["草稿标签"]
    }
  });

  assert.equal(keyword, "关系沟通");
});

test("deriveHotArticleKeyword trims generation filler words", () => {
  const keyword = deriveHotArticleKeyword({
    brief: {
      briefing: "帮我写一篇关于关系沟通的小红书笔记"
    }
  });

  assert.equal(keyword, "关系沟通");
});

test("normalizeHotArticleRecord maps Redfox hot-article fields", () => {
  const item = normalizeHotArticleRecord({
    noteId: "note-1",
    title: "3个沟通技巧",
    desc: "边界感和安全感都要照顾到",
    createTime: "2026-05-30",
    authorId: "author-1",
    authorNickname: "作者A",
    authorFans: 1200,
    noteLink: "https://www.xiaohongshu.com/explore/note-1",
    authorLink: "https://www.xiaohongshu.com/user/profile/author-1",
    likedCount: 100,
    collectedCount: 80,
    commentsCount: 20,
    sharedCount: 10,
    interactiveCount: 210,
    totalScore: 98
  });

  assert.equal(item.noteId, "note-1");
  assert.equal(item.title, "3个沟通技巧");
  assert.equal(item.desc, "边界感和安全感都要照顾到");
  assert.equal(item.authorNickname, "作者A");
  assert.equal(item.authorFans, 1200);
  assert.equal(item.noteLink, "https://www.xiaohongshu.com/explore/note-1");
  assert.equal(item.authorLink, "https://www.xiaohongshu.com/user/profile/author-1");
  assert.equal(item.likedCount, 100);
  assert.equal(item.collectedCount, 80);
  assert.equal(item.commentsCount, 20);
  assert.equal(item.sharedCount, 10);
  assert.equal(item.interactiveCount, 210);
  assert.equal(item.totalScore, 98);
});

test("summarizeHotArticleFormula extracts compact winning-pattern evidence", () => {
  const result = summarizeHotArticleFormula({
    keyword: "关系沟通",
    timeWindowDays: 7,
    items: [
      {
        title: "3个沟通技巧，亲密关系真的会变轻松",
        desc: "先说一个很多人都会误会的点：边界感不是冷淡。评论区告诉我你们遇到过吗",
        noteLink: "https://example.com/1",
        authorNickname: "作者A",
        authorLink: "https://example.com/a",
        likedCount: 1000,
        collectedCount: 600,
        commentsCount: 90,
        sharedCount: 80,
        interactiveCount: 1770
      },
      {
        title: "为什么越亲密越需要边界感？",
        desc: "痛点是安全感和表达方式。分点说清楚，每一步都更容易执行。评论区聊聊",
        noteLink: "https://example.com/2",
        authorNickname: "作者B",
        authorLink: "https://example.com/b",
        likedCount: 800,
        collectedCount: 400,
        commentsCount: 70,
        sharedCount: 50,
        interactiveCount: 1320
      },
      {
        title: "边界感不是冷淡！",
        desc: "反差开头更容易让人点进来，正文用误区解释加行动建议。",
        noteLink: "https://example.com/3",
        authorNickname: "作者C",
        authorLink: "https://example.com/c",
        likedCount: 500,
        collectedCount: 300,
        commentsCount: 40,
        sharedCount: 30,
        interactiveCount: 870
      }
    ]
  });

  assert.equal(result.status, "ok");
  assert.equal(result.keyword, "关系沟通");
  assert.equal(result.timeWindowDays, 7);
  assert.equal(result.itemCount, 3);
  assert.match(result.formula, /数字型标题|疑问标题|痛点开场|互动收尾/);
  assert.ok(result.titlePatterns.length > 0);
  assert.ok(result.openingPatterns.length > 0);
  assert.ok(result.structurePatterns.length > 0);
  assert.ok(result.highFrequencyKeywords.includes("边界感"));
  assert.ok(result.interactionPrompts.length > 0);
  assert.equal(result.references.length, 3);
  assert.equal(result.references[0].title, "3个沟通技巧，亲密关系真的会变轻松");
});

test("buildSkippedHotArticleFormula returns stable skipped payload", () => {
  const result = buildSkippedHotArticleFormula("no_items", { keyword: "关系沟通" });

  assert.equal(result.status, "skipped");
  assert.equal(result.reason, "no_items");
  assert.equal(result.keyword, "关系沟通");
  assert.deepEqual(result.references, []);
});

test("fetchHotArticleFormula sends Redfox search request with 7 day window", async () => {
  const originalApiKey = process.env.REDFOX_API_KEY;
  process.env.REDFOX_API_KEY = "ak_test";
  const calls = [];

  try {
    const result = await fetchHotArticleFormula({
      brief: { topic: "关系沟通" },
      now: new Date("2026-05-31T12:00:00.000Z"),
      requestImpl: async ({ url, headers, body }) => {
        calls.push({ url, headers, body });
        return {
          data: {
            articles: [
              {
                title: "3个沟通技巧",
                desc: "边界感不是冷淡，评论区聊聊",
                noteLink: "https://example.com/1",
                authorNickname: "作者A",
                interactiveCount: 100
              },
              {
                title: "为什么关系里要有安全感？",
                desc: "痛点共鸣加分点建议",
                noteLink: "https://example.com/2",
                authorNickname: "作者B",
                interactiveCount: 80
              },
              {
                title: "边界感不是冷淡！",
                desc: "误区解释和行动建议",
                noteLink: "https://example.com/3",
                authorNickname: "作者C",
                interactiveCount: 60
              }
            ]
          }
        };
      }
    });

    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "https://redfox.hk/story/api/xhs/search/search");
    assert.equal(calls[0].headers["X-API-KEY"], "ak_test");
    assert.equal(calls[0].body.keyword, "关系沟通");
    assert.equal(calls[0].body.pageSize, 50);
    assert.equal(calls[0].body.startDate, "2026-05-24");
    assert.equal(result.status, "ok");
    assert.equal(result.timeWindowDays, 7);
  } finally {
    process.env.REDFOX_API_KEY = originalApiKey;
  }
});

test("fetchHotArticleFormula expands to 30 days when 7 day result is sparse", async () => {
  const originalApiKey = process.env.REDFOX_API_KEY;
  process.env.REDFOX_API_KEY = "ak_test";
  const calls = [];

  try {
    const result = await fetchHotArticleFormula({
      brief: { topic: "关系沟通" },
      now: new Date("2026-05-31T12:00:00.000Z"),
      requestImpl: async ({ body }) => {
        calls.push(body);
        return calls.length === 1
          ? { data: { articles: [{ title: "太少", desc: "边界感" }] } }
          : {
              data: {
                articles: [
                  { title: "3个沟通技巧", desc: "边界感 评论区", interactiveCount: 100 },
                  { title: "为什么要沟通？", desc: "安全感", interactiveCount: 80 },
                  { title: "边界感不是冷淡！", desc: "误区解释", interactiveCount: 60 }
                ]
              }
            };
      }
    });

    assert.equal(calls.length, 2);
    assert.equal(calls[0].startDate, "2026-05-24");
    assert.equal(calls[1].startDate, "2026-05-01");
    assert.equal(result.status, "ok");
    assert.equal(result.timeWindowDays, 30);
  } finally {
    process.env.REDFOX_API_KEY = originalApiKey;
  }
});

test("fetchHotArticleFormula returns skipped without keyword", async () => {
  const result = await fetchHotArticleFormula({ brief: {}, draft: {} });

  assert.equal(result.status, "skipped");
  assert.equal(result.reason, "no_keyword");
});

test("fetchHotArticleFormula returns error without throwing when request fails", async () => {
  const originalApiKey = process.env.REDFOX_API_KEY;
  process.env.REDFOX_API_KEY = "ak_test";

  try {
    const result = await fetchHotArticleFormula({
      brief: { topic: "关系沟通" },
      requestImpl: async () => {
        throw new Error("接口超时");
      }
    });

    assert.equal(result.status, "error");
    assert.equal(result.keyword, "关系沟通");
    assert.match(result.message, /接口超时/);
  } finally {
    process.env.REDFOX_API_KEY = originalApiKey;
  }
});
