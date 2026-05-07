import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { createMemoryVectorStore } from "../src/memory/vector-store.js";
import { createMemoryRetrievalService } from "../src/memory/retrieval-service.js";

function mockEmbeddingProvider() {
  return {
    version: "mock-v1",
    async embedTexts(texts = []) {
      return texts.map((text) => {
        const normalized = String(text || "");
        return [
          normalized.includes("沟通") ? 1 : 0,
          normalized.includes("导流") ? 1 : 0,
          normalized.includes("误报") ? 1 : 0,
          normalized.length
        ];
      });
    }
  };
}

test("retrieval service returns bucketed context for analysis", async (t) => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "memory-retrieval-"));
  t.after(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  const store = createMemoryVectorStore({
    rootDir: tempDir,
    embeddingProvider: mockEmbeddingProvider()
  });
  await store.upsertDocuments([
    {
      id: "feedback-1",
      kind: "violation_feedback",
      status: "active",
      searchText: "导流动作导致违规",
      riskCategories: ["导流与私域"],
      confidence: 0.92
    },
    {
      id: "fp-1",
      kind: "false_positive",
      status: "active",
      searchText: "误报样本，实际平台已放行",
      confidence: 0.88
    },
    {
      id: "reference-1",
      kind: "reference_sample",
      status: "active",
      searchText: "沟通选题参考样本",
      collectionType: "科普",
      confidence: 0.81
    },
    {
      id: "card-1",
      kind: "risk_pattern_card",
      status: "active",
      searchText: "记忆卡片：导流风险的替代表达",
      confidence: 0.77
    }
  ]);

  const service = createMemoryRetrievalService({ vectorStore: store });
  const result = await service.retrieveForAnalysis({
    title: "沟通标题",
    body: "正文里不要有导流感",
    tags: ["沟通"]
  });

  assert.equal(result.referenceSamples.length, 1);
  assert.equal(result.referenceSamples[0].id, "reference-1");
  assert.equal(result.memoryCards.length, 1);
  assert.equal(result.memoryCards[0].id, "card-1");
  assert.equal(result.riskFeedback.length, 1);
  assert.equal(result.riskFeedback[0].id, "feedback-1");
  assert.equal(result.falsePositiveHints.length, 1);
  assert.equal(result.falsePositiveHints[0].id, "fp-1");
  assert.equal(result.retrievalMeta.queryKind, "analysis");
  assert.equal(result.retrievalMeta.candidateCount, 4);
});

test("analysis retrieval query includes cover text", async (t) => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "memory-retrieval-cover-"));
  t.after(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  const store = createMemoryVectorStore({
    rootDir: tempDir,
    embeddingProvider: mockEmbeddingProvider()
  });
  await store.upsertDocuments([
    {
      id: "reference-cover-1",
      kind: "reference_sample",
      status: "active",
      searchText: "封面暗号样本",
      collectionType: "科普",
      confidence: 0.82
    }
  ]);

  const service = createMemoryRetrievalService({ vectorStore: store });
  const result = await service.retrieveForAnalysis({
    title: "普通标题",
    body: "普通正文",
    coverText: "封面暗号",
    tags: ["普通标签"]
  });

  assert.equal(result.referenceSamples.length, 1);
  assert.equal(result.referenceSamples[0].id, "reference-cover-1");
});
