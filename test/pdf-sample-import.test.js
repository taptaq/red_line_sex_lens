import test from "node:test";
import assert from "node:assert/strict";

import {
  buildPdfImportDraftFromText,
  normalizePdfImportCommitItem,
  extractPdfText
} from "../src/pdf-sample-import.js";

test("buildPdfImportDraftFromText removes the full title block before the first blank separator", () => {
  const draft = buildPdfImportDraftFromText({
    fileName: "【已发】sample.pdf",
    text: "\n1\n标题行\n\n第一段正文\n第二段正文\n"
  });

  assert.equal(draft.status, "ready");
  assert.equal(draft.fileName, "【已发】sample.pdf");
  assert.equal(draft.title, "sample");
  assert.equal(draft.body, "第一段正文\n第二段正文");
});

test("buildPdfImportDraftFromText removes two-line title blocks before the body", () => {
  const draft = buildPdfImportDraftFromText({
    fileName: "【已发布】救命SOS谁把那玩意儿藏米缸里了啊？！.pdf",
    text: "\n1\n【已发布】救命SOS谁把那玩意儿藏米缸里了\n啊？！\n\n刚刚收到一个信号\n把小玩具藏在米缸里会被发现吗\n"
  });

  assert.equal(draft.title, "救命SOS谁把那玩意儿藏米缸里了啊？！");
  assert.equal(draft.body, "刚刚收到一个信号\n把小玩具藏在米缸里会被发现吗");
});

test("buildPdfImportDraftFromText removes title fragments from the top of body using the parsed title", () => {
  const draft = buildPdfImportDraftFromText({
    fileName: "连夜扒了9999条差评，原来女生最讨厌的不是“不震”？ 📊🚫.pdf",
    text: "\n1\n连夜扒了9999条差评，原来女生最\n\n讨厌的不是�不震��?\n最近去了几大电商平台，把“愉悦玩具热销榜产品的“差评区”给扒了个底朝天。\n"
  });

  assert.equal(draft.title, "连夜扒了9999条差评，原来女生最讨厌的不是“不震”？ 📊🚫");
  assert.equal(draft.body, "最近去了几大电商平台，把“愉悦玩具热销榜产品的“差评区”给扒了个底朝天。");
});

test("buildPdfImportDraftFromText removes short title suffix fragments left at the top of body", () => {
  const draft = buildPdfImportDraftFromText({
    fileName: "救命SOS谁把那玩意儿藏米缸里了啊？！.pdf",
    text: "\n1\n救命SOS 谁把那玩意儿藏米缸里了\n\n啊？ ！\n刚刚收到一个信号\n"
  });

  assert.equal(draft.title, "救命SOS谁把那玩意儿藏米缸里了啊？！");
  assert.equal(draft.body, "刚刚收到一个信号");
});

test("buildPdfImportDraftFromText removes all bracketed segments from the file name title", () => {
  const draft = buildPdfImportDraftFromText({
    fileName: "系列A【草稿】【第3版】第3篇.pdf",
    text: "\n系列A 第3篇\n\n第一行正文\n第二行正文"
  });

  assert.equal(draft.title, "系列A第3篇");
  assert.equal(draft.body, "第一行正文\n第二行正文");
});

test("buildPdfImportDraftFromText marks files without usable body text as needs_review", () => {
  const draft = buildPdfImportDraftFromText({
    fileName: "empty.pdf",
    text: "只有标题"
  });

  assert.equal(draft.status, "needs_review");
  assert.match(draft.error, /正文/);
});

test("normalizePdfImportCommitItem trims fields, defaults cover text to title, and keeps optional reference and lifecycle fields", () => {
  const item = normalizePdfImportCommitItem({
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

test("extractPdfText trims parsed text from the provided parser", async () => {
  const parser = async (buffer) => {
    assert.equal(buffer.toString("utf8"), "pdf-bytes");
    return { text: "\n标题\n正文\n" };
  };
  const text = await extractPdfText(Buffer.from("pdf-bytes"), parser);

  assert.equal(text, "标题\n正文");
});
