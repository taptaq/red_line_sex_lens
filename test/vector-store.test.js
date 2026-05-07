import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { createMemoryVectorStore } from "../src/memory/vector-store.js";

function mockEmbeddingProvider() {
  return {
    version: "mock-v1",
    async embedTexts(texts = []) {
      return texts.map((text) => {
        const normalized = String(text || "");
        return [
          normalized.includes("沟通") ? 1 : 0,
          normalized.includes("选题") ? 1 : 0,
          normalized.includes("误报") ? 1 : 0,
          normalized.length
        ];
      });
    }
  };
}

test("vector store filters by metadata before ranking by similarity", async (t) => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "memory-store-"));
  t.after(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  const store = createMemoryVectorStore({
    rootDir: tempDir,
    embeddingProvider: mockEmbeddingProvider()
  });

  await store.upsertDocuments([
    {
      id: "reference-1",
      kind: "reference_sample",
      status: "active",
      searchText: "沟通选题体验很自然",
      collectionType: "科普"
    },
    {
      id: "reference-2",
      kind: "reference_sample",
      status: "active",
      searchText: "沟通表达很直接，适合一般讨论",
      collectionType: "科普"
    },
    {
      id: "reference-3",
      kind: "reference_sample",
      status: "inactive",
      searchText: "沟通但已停用，不应入选",
      collectionType: "科普"
    },
    {
      id: "reference-4",
      kind: "reference_sample",
      status: "active",
      searchText: "沟通但属于其他合集，不应入选",
      collectionType: "别类"
    },
    {
      id: "feedback-1",
      kind: "violation_feedback",
      status: "active",
      searchText: "导流动作导致违规",
      collectionType: "科普"
    }
  ]);

  const result = await store.search({
    queryText: "沟通选题",
    limit: 3,
    filters: { kind: ["reference_sample"], status: ["active"], collectionType: "科普" }
  });

  assert.equal(result.items.length, 2);
  assert.equal(result.items[0].id, "reference-1");
  assert.equal(result.items[1].id, "reference-2");
  assert.equal(result.items.some((item) => item.id === "reference-3"), false);
  assert.equal(result.items.some((item) => item.id === "reference-4"), false);
});

test("vector store excludes stale embedding versions from search scoring", async (t) => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "memory-store-version-"));
  t.after(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  const store = createMemoryVectorStore({
    rootDir: tempDir,
    embeddingProvider: mockEmbeddingProvider()
  });

  await store.upsertDocuments([
    {
      id: "fresh-1",
      kind: "reference_sample",
      status: "active",
      searchText: "沟通选题是当前有效样本",
      collectionType: "科普"
    }
  ]);

  const documentsPath = path.join(tempDir, "documents.jsonl");
  const embeddingsPath = path.join(tempDir, "embeddings.jsonl");
  const staleDocument = {
    id: "stale-1",
    kind: "reference_sample",
    status: "active",
    searchText: "沟通选题是过期 embedding 样本",
    collectionType: "科普",
    embeddingVersion: "mock-v0"
  };
  const staleEmbedding = {
    id: "stale-1",
    embeddingVersion: "mock-v0",
    embedding: [1, 1, 0, 8]
  };

  await fs.appendFile(documentsPath, `${JSON.stringify(staleDocument)}\n`, "utf8");
  await fs.appendFile(embeddingsPath, `${JSON.stringify(staleEmbedding)}\n`, "utf8");

  const result = await store.search({
    queryText: "沟通选题",
    limit: 5,
    filters: { kind: ["reference_sample"], status: ["active"], collectionType: "科普" }
  });

  assert.deepEqual(
    result.items.map((item) => item.id),
    ["fresh-1"]
  );
});

test("vector store stamps fresh embeddings with the active provider version", async (t) => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "memory-store-restamp-"));
  t.after(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  const store = createMemoryVectorStore({
    rootDir: tempDir,
    embeddingProvider: mockEmbeddingProvider()
  });

  await store.upsertDocuments([
    {
      id: "reference-1",
      kind: "reference_sample",
      status: "active",
      searchText: "沟通选题重新向量化后应可检索",
      collectionType: "科普",
      embeddingVersion: "mock-v0"
    }
  ]);

  const result = await store.search({
    queryText: "沟通选题",
    limit: 5,
    filters: { kind: ["reference_sample"], status: ["active"], collectionType: "科普" }
  });

  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].id, "reference-1");
  assert.equal(result.items[0].embeddingVersion, "mock-v1");
});

test("vector store serializes concurrent upserts across store instances on one root", async (t) => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "memory-store-concurrent-"));
  t.after(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  const firstStore = createMemoryVectorStore({
    rootDir: tempDir,
    embeddingProvider: mockEmbeddingProvider()
  });
  const secondStore = createMemoryVectorStore({
    rootDir: tempDir,
    embeddingProvider: mockEmbeddingProvider()
  });

  await Promise.all([
    firstStore.upsertDocuments([
      {
        id: "reference-1",
        kind: "reference_sample",
        status: "active",
        searchText: "沟通选题第一批",
        collectionType: "科普"
      }
    ]),
    secondStore.upsertDocuments([
      {
        id: "reference-2",
        kind: "reference_sample",
        status: "active",
        searchText: "沟通选题第二批",
        collectionType: "科普"
      }
    ])
  ]);

  const result = await firstStore.search({
    queryText: "沟通选题",
    limit: 5,
    filters: { kind: ["reference_sample"], status: ["active"], collectionType: "科普" }
  });

  assert.equal(result.items.length, 2);
  assert.equal(result.items.some((item) => item.id === "reference-1"), true);
  assert.equal(result.items.some((item) => item.id === "reference-2"), true);
});

test("vector store requires explicit embedding provider injection", () => {
  assert.throws(() => createMemoryVectorStore(), /embedding provider/i);
});
