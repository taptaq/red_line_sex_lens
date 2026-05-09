import test from "node:test";
import assert from "node:assert/strict";

import {
  buildMarkdownImportDraftFromText,
  normalizeMarkdownImportCommitItem,
  extractMarkdownText
} from "../src/pdf-sample-import.js";

test("buildMarkdownImportDraftFromText removes the leading markdown title block before the body", () => {
  const draft = buildMarkdownImportDraftFromText({
    fileName: "【已发】sample.md",
    text: "# sample\n\n第一段正文\n第二段正文\n"
  });

  assert.equal(draft.status, "ready");
  assert.equal(draft.fileName, "【已发】sample.md");
  assert.equal(draft.title, "sample");
  assert.equal(draft.body, "第一段正文\n第二段正文");
});

test("buildMarkdownImportDraftFromText strips markdown syntax and keeps only plain body text", () => {
  const draft = buildMarkdownImportDraftFromText({
    fileName: "【已发布】救命SOS谁把那玩意儿藏米缸里了啊？！.md",
    text: [
      "# 【已发布】救命SOS谁把那玩意儿藏米缸里了",
      "啊？！",
      "",
      "刚刚收到一个信号",
      "- 把**小玩具**藏在米缸里会被发现吗",
      "> 真的会",
      "[延伸阅读](https://example.com)",
      "![封面图](https://example.com/cover.png)"
    ].join("\n")
  });

  assert.equal(draft.title, "救命SOS谁把那玩意儿藏米缸里了啊？！");
  assert.equal(draft.body, "刚刚收到一个信号\n把小玩具藏在米缸里会被发现吗\n真的会\n延伸阅读\n封面图");
});

test("buildMarkdownImportDraftFromText removes title fragments from the top of body using the file-name title", () => {
  const draft = buildMarkdownImportDraftFromText({
    fileName: "连夜扒了9999条差评，原来女生最讨厌的不是“不震”？ 📊🚫.md",
    text: "连夜扒了9999条差评，原来女生最\n\n讨厌的不是“不震”？\n最近去了几大电商平台，把热销榜产品的差评区给扒了个底朝天。\n"
  });

  assert.equal(draft.title, "连夜扒了9999条差评，原来女生最讨厌的不是“不震”？ 📊🚫");
  assert.equal(draft.body, "最近去了几大电商平台，把热销榜产品的差评区给扒了个底朝天。");
});

test("buildMarkdownImportDraftFromText removes all bracketed segments from the file name title", () => {
  const draft = buildMarkdownImportDraftFromText({
    fileName: "系列A【草稿】【第3版】第3篇.markdown",
    text: "## 系列A 第3篇\n\n第一行正文\n第二行正文"
  });

  assert.equal(draft.title, "系列A第3篇");
  assert.equal(draft.body, "第一行正文\n第二行正文");
});

test("buildMarkdownImportDraftFromText marks files without usable body text as needs_review", () => {
  const draft = buildMarkdownImportDraftFromText({
    fileName: "empty.md",
    text: "# empty"
  });

  assert.equal(draft.status, "needs_review");
  assert.match(draft.error, /正文/);
});

test("normalizeMarkdownImportCommitItem trims fields, defaults cover text to title, and keeps optional reference and lifecycle fields", () => {
  const item = normalizeMarkdownImportCommitItem({
    title: " 标题 ",
    coverText: " ",
    body: " 正文 ",
    collectionType: "科普",
    tags: "标签1，标签2",
    referenceEnabled: false,
    referenceTier: " featured ",
    referenceNotes: " 适合作为开头参考 ",
    publishStatus: " positive_performance ",
    publishedAt: " 2026-05-06 ",
    platformReason: " 表现稳定 ",
    publishNotes: " 24h 后仍稳定 ",
    likes: "",
    favorites: "6",
    comments: undefined,
    views: " 42.8 "
  });

  assert.deepEqual(item, {
    title: "标题",
    coverText: "标题",
    body: "正文",
    collectionType: "科普",
    tags: ["标签1", "标签2"],
    reference: {
      enabled: true,
      tier: "featured",
      notes: "适合作为开头参考"
    },
    publish: {
      status: "positive_performance",
      publishedAt: "2026-05-06",
      platformReason: "表现稳定",
      notes: "24h 后仍稳定"
    },
    likes: 0,
    favorites: 6,
    comments: 0,
    views: 42
  });
});

test("extractMarkdownText reads utf8 markdown bytes and trims outer whitespace", async () => {
  const text = await extractMarkdownText(Buffer.from("\n# 标题\n正文\n", "utf8"));

  assert.equal(text, "# 标题\n正文");
});
