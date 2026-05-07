import test from "node:test";
import assert from "node:assert/strict";

import {
  buildMemoryDocumentFromNoteRecord,
  buildMemoryDocumentFromFeedback,
  buildMemoryDocumentFromFalsePositive
} from "../src/memory/memory-document.js";

test("memory document keeps fact fields and governance metadata", () => {
  const noteRecord = {
    id: "record-1",
    source: "manual",
    note: {
      title: "参考标题",
      body: "参考正文",
      coverText: "参考封面",
      collectionType: "科普",
      tags: ["沟通", "关系"]
    },
    reference: { enabled: true, tier: "featured" },
    publish: {
      status: "published_passed",
      metrics: { likes: 36, favorites: 8, comments: 2, views: 5600 }
    },
    createdAt: "2026-05-01T00:00:00.000Z",
    updatedAt: "2026-05-02T00:00:00.000Z"
  };

  const doc = buildMemoryDocumentFromNoteRecord(noteRecord, {
    status: "active",
    embeddingVersion: "test-v1"
  });

  assert.equal(doc.kind, "reference_sample");
  assert.equal(doc.status, "active");
  assert.equal(Number.isFinite(doc.confidence), true);
  assert.equal(typeof doc.sourceQuality, "string");
  assert.equal(doc.embeddingVersion, "test-v1");
  assert.deepEqual(doc.sourceIds, ["record-1"]);
  assert.equal(doc.collectionType, "科普");
  assert.equal(Array.isArray(doc.riskCategories), true);
  assert.equal(Number.isFinite(doc.retrievalWeight), true);
  assert.match(doc.searchText, /参考标题/);
  assert.match(doc.searchText, /参考正文/);
  assert.match(doc.searchText, /参考封面/);
  assert.match(doc.searchText, /科普/);
  assert.match(doc.searchText, /沟通/);
  assert.match(doc.searchText, /关系/);
});

test("memory document maps confirmed false positive into false_positive kind", () => {
  const doc = buildMemoryDocumentFromFalsePositive(
    {
      id: "fp-1",
      status: "platform_passed_confirmed",
      title: "误报标题",
      body: "误报正文",
      tags: ["沟通"]
    },
    { embeddingVersion: "test-v1" }
  );

  assert.equal(doc.kind, "false_positive");
  assert.equal(doc.status, "active");
  assert.equal(Number.isFinite(doc.confidence), true);
  assert.equal(typeof doc.sourceQuality, "string");
  assert.deepEqual(doc.sourceIds, ["fp-1"]);
  assert.equal(Array.isArray(doc.riskCategories), true);
  assert.equal(Number.isFinite(doc.retrievalWeight), true);
  assert.match(doc.searchText, /误报标题/);
  assert.match(doc.searchText, /误报正文/);
  assert.match(doc.searchText, /沟通/);
});

test("memory document maps platform feedback into violation_feedback kind", () => {
  const doc = buildMemoryDocumentFromFeedback(
    {
      id: "feedback-1",
      title: "违规标题",
      noteContent: "违规正文",
      platformReason: "疑似低俗或导流",
      suspiciousPhrases: ["二维码"]
    },
    { embeddingVersion: "test-v1" }
  );

  assert.equal(doc.kind, "violation_feedback");
  assert.equal(doc.status, "active");
  assert.equal(Number.isFinite(doc.confidence), true);
  assert.equal(typeof doc.sourceQuality, "string");
  assert.deepEqual(doc.sourceIds, ["feedback-1"]);
  assert.equal(Array.isArray(doc.riskCategories), true);
  assert.equal(Number.isFinite(doc.retrievalWeight), true);
  assert.match(doc.searchText, /违规标题/);
  assert.match(doc.searchText, /违规正文/);
  assert.match(doc.searchText, /疑似低俗或导流/);
  assert.match(doc.searchText, /二维码/);
});
