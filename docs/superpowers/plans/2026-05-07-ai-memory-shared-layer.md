# AI 记忆共享层 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为检测与改写/生成两条在线链路接入一套项目内可控的 AI 记忆共享层，包含本地检索文档、向量索引抽象、候选记忆卡片和统一 retrieval service。

**Architecture:** 保留现有 JSON 文件作为事实层，在 `src/memory/` 下新增检索文档构建、记忆卡片构建、embedding provider、向量存储和 retrieval service 五类模块。第一版采用“本地索引文件 + 进程内召回”的轻量实现，用元数据过滤、向量召回和业务重排统一服务检测、改写、生成。

**Tech Stack:** Node.js ESM、`node:test`、现有 `src/data-store.js` / `src/server.js` / `src/analyzer.js`、新增 `src/memory/*` 模块、项目内 JSON/JSONL 数据文件。

---

## File Structure

### New files

- `src/memory/memory-document.js`
  将 `note-records`、`feedback`、`false-positive`、改写成功记录映射为统一检索文档。
- `src/memory/memory-card.js`
  定义风险模式卡、误报反例卡、改写策略卡、风格经验卡的候选与激活结构。
- `src/memory/embedding-provider.js`
  封装本地 embedding provider，统一暴露 `embedTexts()` 接口，并提供测试用 deterministic provider。
- `src/memory/vector-store.js`
  管理本地索引文件、文档 upsert、批量重建和 top-k 召回。
- `src/memory/retrieval-service.js`
  面向检测/改写/生成输出分桶后的结构化记忆上下文。
- `test/memory-document.test.js`
  保护检索文档映射规则与治理字段。
- `test/vector-store.test.js`
  保护本地向量检索、元数据过滤和重建行为。
- `test/retrieval-service.test.js`
  保护检测/改写/生成三类召回分桶与重排行为。
- `test/memory-card.test.js`
  保护候选记忆卡片生成、激活和抑制规则。

### Modified files

- `src/config.js`
  为 memory 存储目录和索引文件新增路径常量。
- `src/data-store.js`
  增加 memory 文档和卡片文件的读写、dirty 标记与重建入口。
- `src/analyzer.js`
  检测链路改接 retrieval service，消费风险反馈、误报反例、参考样本和风险模式卡。
- `src/generation-workbench.js`
  生成/改写消息构造中接入结构化记忆上下文块。
- `src/server.js`
  生成接口、样本更新接口、反馈导入接口接入 memory 重建与在线检索。
- `src/cli.js`
  增加 `memory:rebuild`、`memory:inspect` 等命令入口。
- `package.json`
  新增 memory 相关脚本。
- `README.md`
  补充 memory 共享层的命令与运行说明。
- `test/analyzer-seed-lexicon.test.js`
  为检测链路的记忆增强补回归测试。
- `test/generation-workbench.test.js`
  为生成/改写链路的记忆上下文补测试。
- `test/generation-api.test.js`
  为生成接口接入 retrieval service 补测试。

## Task 1: 为 memory 底座补测试护栏

**Files:**
- Create: `test/memory-document.test.js`
- Create: `test/vector-store.test.js`
- Create: `test/retrieval-service.test.js`
- Modify: `package.json`

- [ ] **Step 1: 写检索文档映射的失败测试**

```js
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
  assert.equal(doc.embeddingVersion, "test-v1");
  assert.deepEqual(doc.sourceIds, ["record-1"]);
  assert.equal(doc.collectionType, "科普");
  assert.deepEqual(doc.tags, ["沟通", "关系"]);
  assert.match(doc.searchText, /参考标题/);
  assert.match(doc.searchText, /参考正文/);
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
  assert.deepEqual(doc.sourceIds, ["fp-1"]);
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
  assert.match(doc.searchText, /二维码/);
});
```

- [ ] **Step 2: 写向量存储与 retrieval service 的失败测试**

```js
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
      searchText: "沟通体验很自然",
      collectionType: "科普"
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
    filters: { kind: ["reference_sample"] }
  });

  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].id, "reference-1");
});

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
    }
  ]);

  const service = createMemoryRetrievalService({ vectorStore: store });
  const result = await service.retrieveForAnalysis({
    title: "沟通标题",
    body: "正文里不要有导流感",
    tags: ["沟通"]
  });

  assert.equal(Array.isArray(result.riskFeedback), true);
  assert.equal(Array.isArray(result.falsePositiveHints), true);
  assert.equal(result.retrievalMeta.queryKind, "analysis");
});
```

- [ ] **Step 3: 补上测试脚本并先运行失败**

```json
{
  "scripts": {
    "test:memory": "node --test test/memory-document.test.js test/vector-store.test.js test/retrieval-service.test.js"
  }
}
```

Run: `node --test test/memory-document.test.js test/vector-store.test.js test/retrieval-service.test.js`

Expected: FAIL，报错包含 `Cannot find module '../src/memory/memory-document.js'` 或未定义导出。

- [ ] **Step 4: Commit**

```bash
git add package.json test/memory-document.test.js test/vector-store.test.js test/retrieval-service.test.js
git commit -m "test: add memory foundation coverage"
```

## Task 2: 搭建 memory 配置、检索文档和本地向量存储

**Files:**
- Modify: `src/config.js`
- Modify: `src/data-store.js`
- Create: `src/memory/memory-document.js`
- Create: `src/memory/embedding-provider.js`
- Create: `src/memory/vector-store.js`
- Test: `test/memory-document.test.js`
- Test: `test/vector-store.test.js`

- [ ] **Step 1: 扩展配置路径并写文件存储辅助**

```js
export const paths = {
  lexiconSeed: path.join(dataDir, "lexicon.seed.json"),
  lexiconCustom: path.join(dataDir, "lexicon.custom.json"),
  whitelist: path.join(dataDir, "whitelist.json"),
  feedbackLog: path.join(dataDir, "feedback.log.json"),
  falsePositiveLog: path.join(dataDir, "false-positive-log.json"),
  reviewQueue: path.join(dataDir, "review-queue.json"),
  successSamples: path.join(dataDir, "success-samples.json"),
  styleProfile: path.join(dataDir, "style-profile.json"),
  collectionTypes: path.join(dataDir, "collection-types.json"),
  noteLifecycle: path.join(dataDir, "note-lifecycle.json"),
  noteRecords: path.join(dataDir, "note-records.json"),
  analyzeTagOptions: path.join(dataDir, "analyze-tag-options.json"),
  innerSpaceTerms: path.join(dataDir, "inner-space-terms.json"),
  memoryRoot: path.join(dataDir, "memory"),
  memoryDocuments: path.join(dataDir, "memory", "documents.jsonl"),
  memoryCards: path.join(dataDir, "memory", "cards.jsonl"),
  memoryEmbeddings: path.join(dataDir, "memory", "embeddings.jsonl"),
  memoryIndexMeta: path.join(dataDir, "memory", "index-meta.json")
};
```

```js
export async function ensureMemoryStorage() {
  await fs.mkdir(paths.memoryRoot, { recursive: true });
}
```

- [ ] **Step 2: 实现检索文档构建器**

```js
import { calculateSampleWeight } from "../sample-weight.js";

function normalizeString(value = "") {
  return String(value || "").trim();
}

function uniqueStrings(items = []) {
  return [...new Set((Array.isArray(items) ? items : [items]).map((item) => normalizeString(item)).filter(Boolean))];
}

export function buildMemoryDocumentFromNoteRecord(record = {}, { status = "active", embeddingVersion = "" } = {}) {
  const note = record.note || {};
  const publish = record.publish || {};
  const metrics = publish.metrics || {};
  const isReference = record?.reference?.enabled === true;

  return {
    id: `note-record:${normalizeString(record.id)}`,
    kind: isReference ? "reference_sample" : "note_record",
    status,
    confidence: isReference ? 0.95 : 0.7,
    sourceQuality: normalizeString(record.source || "unknown"),
    sourceIds: [normalizeString(record.id)].filter(Boolean),
    accountScope: "default",
    collectionType: normalizeString(note.collectionType),
    riskCategories: [],
    tags: uniqueStrings(note.tags),
    createdAt: normalizeString(record.createdAt),
    updatedAt: normalizeString(record.updatedAt),
    embeddingVersion,
    retrievalWeight: calculateSampleWeight({
      tier: record?.reference?.tier || "",
      metrics,
      status: publish.status,
      updatedAt: record.updatedAt,
      createdAt: record.createdAt
    }, isReference ? "success" : "lifecycle"),
    searchText: [
      normalizeString(note.title),
      normalizeString(note.body),
      normalizeString(note.coverText),
      normalizeString(note.collectionType),
      uniqueStrings(note.tags).join(" ")
    ].filter(Boolean).join("\n"),
    payload: record
  };
}
```

```js
export function buildMemoryDocumentFromFeedback(item = {}, { embeddingVersion = "" } = {}) {
  return {
    id: `feedback:${normalizeString(item.id)}`,
    kind: "violation_feedback",
    status: "active",
    confidence: 0.92,
    sourceQuality: "imported",
    sourceIds: [normalizeString(item.id)].filter(Boolean),
    accountScope: "default",
    collectionType: "",
    riskCategories: uniqueStrings([
      item.feedbackModelSuggestion?.suggestedCategory,
      ...(item.feedbackModelSuggestion?.contextCategories || [])
    ]),
    tags: uniqueStrings(item.tags),
    createdAt: normalizeString(item.createdAt),
    updatedAt: normalizeString(item.updatedAt),
    embeddingVersion,
    retrievalWeight: 1.8,
    searchText: [
      normalizeString(item.title),
      normalizeString(item.noteContent || item.body),
      normalizeString(item.platformReason),
      uniqueStrings(item.suspiciousPhrases).join(" ")
    ].filter(Boolean).join("\n"),
    payload: item
  };
}
```

- [ ] **Step 3: 实现本地 embedding provider 和轻量向量存储**

```js
export function createDeterministicEmbeddingProvider({ version = "deterministic-v1" } = {}) {
  return {
    version,
    async embedTexts(texts = []) {
      return texts.map((text) => {
        const value = String(text || "");
        const chars = [...value];
        const sum = chars.reduce((total, char) => total + char.charCodeAt(0), 0);
        const length = chars.length;
        const whitespace = chars.filter((char) => /\s/u.test(char)).length;
        return [length, whitespace, sum % 997, value.includes("导流") ? 1 : 0, value.includes("沟通") ? 1 : 0];
      });
    }
  };
}
```

```js
import fs from "node:fs/promises";
import path from "node:path";

function cosineSimilarity(left = [], right = []) {
  const size = Math.max(left.length, right.length);
  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;

  for (let index = 0; index < size; index += 1) {
    const a = Number(left[index] || 0);
    const b = Number(right[index] || 0);
    dot += a * b;
    leftNorm += a * a;
    rightNorm += b * b;
  }

  if (!leftNorm || !rightNorm) {
    return 0;
  }

  return dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm));
}

export function createMemoryVectorStore({ rootDir, embeddingProvider }) {
  async function ensureRoot() {
    await fs.mkdir(rootDir, { recursive: true });
  }

  async function readStore() {
    try {
      const raw = await fs.readFile(path.join(rootDir, "documents.json"), "utf8");
      return JSON.parse(raw);
    } catch (error) {
      if (error.code === "ENOENT") {
        return [];
      }
      throw error;
    }
  }

  async function writeStore(items) {
    await ensureRoot();
    await fs.writeFile(path.join(rootDir, "documents.json"), `${JSON.stringify(items, null, 2)}\n`, "utf8");
  }

  return {
    async upsertDocuments(documents = []) {
      const current = await readStore();
      const embeddings = await embeddingProvider.embedTexts(documents.map((item) => item.searchText || ""));
      const next = [...current];

      documents.forEach((document, index) => {
        const existingIndex = next.findIndex((item) => item.id === document.id);
        const enriched = {
          ...document,
          embedding: embeddings[index],
          embeddingVersion: document.embeddingVersion || embeddingProvider.version
        };
        if (existingIndex === -1) {
          next.push(enriched);
        } else {
          next[existingIndex] = enriched;
        }
      });

      await writeStore(next);
      return next;
    },
    async search({ queryText = "", limit = 5, filters = {} } = {}) {
      const current = await readStore();
      const [queryEmbedding] = await embeddingProvider.embedTexts([queryText]);
      const filtered = current.filter((item) => {
        if (filters.kind?.length && !filters.kind.includes(item.kind)) return false;
        if (filters.status?.length && !filters.status.includes(item.status)) return false;
        if (filters.collectionType && item.collectionType !== filters.collectionType) return false;
        return true;
      });

      const items = filtered
        .map((item) => ({
          ...item,
          similarity: cosineSimilarity(queryEmbedding, item.embedding || [])
        }))
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);

      return { items };
    }
  };
}
```

- [ ] **Step 4: 运行底座测试并修正直到通过**

Run: `node --test test/memory-document.test.js test/vector-store.test.js`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/config.js src/data-store.js src/memory/memory-document.js src/memory/embedding-provider.js src/memory/vector-store.js test/memory-document.test.js test/vector-store.test.js
git commit -m "feat: add local memory document and vector storage foundation"
```

## Task 3: 实现 retrieval service，并先接检测链路

**Files:**
- Create: `src/memory/retrieval-service.js`
- Modify: `src/data-store.js`
- Modify: `src/analyzer.js`
- Create: `test/retrieval-service.test.js`
- Modify: `test/analyzer-seed-lexicon.test.js`

- [ ] **Step 1: 为检测链路写失败测试**

```js
test("analysis retrieval buckets risk feedback and false positive hints separately", async () => {
  const result = await retrieveForAnalysisFixture({
    documents: [
      {
        id: "feedback:1",
        kind: "violation_feedback",
        status: "active",
        searchText: "导流动作导致违规",
        confidence: 0.92
      },
      {
        id: "fp:1",
        kind: "false_positive",
        status: "active",
        searchText: "误报样本，平台已放行",
        confidence: 0.88
      }
    ],
    query: {
      title: "体验标题",
      body: "这里不要有导流感",
      tags: ["沟通"]
    }
  });

  assert.equal(result.riskFeedback.length, 1);
  assert.equal(result.falsePositiveHints.length, 1);
  assert.equal(result.referenceSamples.length, 0);
});

test("analysis result includes memory retrieval meta without softening hard blocks", async () => {
  const result = await analyzePost({
    title: "联系我拿完整版",
    body: "加我微信看完整版",
    tags: ["沟通"]
  });

  assert.equal(result.verdict, "hard_block");
  assert.equal(result.memoryContext.retrievalMeta.queryKind, "analysis");
});
```

- [ ] **Step 2: 实现 retrieval service 的分桶与重排**

```js
function sortByRetrievalWeight(items = []) {
  return [...items].sort((left, right) => {
    const rightScore = Number(right.similarity || 0) + Number(right.retrievalWeight || 0);
    const leftScore = Number(left.similarity || 0) + Number(left.retrievalWeight || 0);
    return rightScore - leftScore;
  });
}

export function createMemoryRetrievalService({ vectorStore }) {
  async function retrieveBuckets({ queryText = "", filters = {}, limit = 5 } = {}) {
    const result = await vectorStore.search({ queryText, filters, limit });
    return sortByRetrievalWeight(result.items);
  }

  return {
    async retrieveForAnalysis(input = {}) {
      const queryText = [input.title, input.body, input.coverText, (input.tags || []).join(" ")].filter(Boolean).join("\n");
      const [riskFeedback, falsePositiveHints, referenceSamples, memoryCards] = await Promise.all([
        retrieveBuckets({ queryText, limit: 4, filters: { kind: ["violation_feedback"], status: ["active"] } }),
        retrieveBuckets({ queryText, limit: 4, filters: { kind: ["false_positive"], status: ["active"] } }),
        retrieveBuckets({ queryText, limit: 3, filters: { kind: ["reference_sample"], status: ["active"] } }),
        retrieveBuckets({ queryText, limit: 3, filters: { kind: ["risk_pattern_card"], status: ["active"] } })
      ]);

      return {
        riskFeedback,
        falsePositiveHints,
        referenceSamples,
        memoryCards,
        retrievalMeta: {
          queryKind: "analysis",
          embeddingVersion: riskFeedback[0]?.embeddingVersion || falsePositiveHints[0]?.embeddingVersion || "",
          candidateCount: riskFeedback.length + falsePositiveHints.length + referenceSamples.length + memoryCards.length
        }
      };
    }
  };
}
```

- [ ] **Step 3: 在 `analyzer.js` 中接入 retrieval service**

```js
import { getMemoryRetrievalService } from "./data-store.js";

export async function analyzePost(input = {}) {
  const post = flattenPost(input);
  const memoryService = await getMemoryRetrievalService();
  const memoryContext = await memoryService.retrieveForAnalysis({
    ...post,
    tags: ensureArray(input.tags),
    collectionType: String(input.collectionType || "").trim()
  });

  // 保持现有规则、白名单、误报逻辑不变
  // 仅将 memoryContext 拼入返回值，并允许它增强解释和 observe 级别建议

  return {
    input: {
      ...post,
      collectionType: String(input.collectionType || "").trim(),
      tags: ensureArray(input.tags),
      comments: ensureArray(input.comments)
    },
    verdict,
    originalVerdict,
    score,
    hits,
    whitelistHits,
    falsePositiveHints,
    referenceSampleHints,
    matchedReferenceSamples,
    referenceSampleSupportScore,
    softenedByFalsePositive,
    softenedByReferenceSamples,
    categories: [...categorySet],
    suggestions,
    failureReasonTags,
    memoryContext
  };
}
```

- [ ] **Step 4: 运行检测与 retrieval 测试**

Run: `node --test test/retrieval-service.test.js test/analyzer-seed-lexicon.test.js`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/memory/retrieval-service.js src/data-store.js src/analyzer.js test/retrieval-service.test.js test/analyzer-seed-lexicon.test.js
git commit -m "feat: add shared memory retrieval for analysis"
```

## Task 4: 接入生成与改写链路的结构化记忆上下文

**Files:**
- Modify: `src/generation-workbench.js`
- Modify: `src/server.js`
- Modify: `test/generation-workbench.test.js`
- Modify: `test/generation-api.test.js`

- [ ] **Step 1: 为生成/改写消息补失败测试**

```js
test("generation prompt includes packed memory guidance blocks instead of raw violation text", () => {
  const messages = buildGenerationMessages({
    mode: "from_scratch",
    brief: { topic: "沟通", collectionType: "科普" },
    memoryContext: {
      referenceSamples: [
        { title: "成功样本标题", payload: { note: { body: "成功样本正文" } } }
      ],
      memoryCards: [
        { kind: "style_experience_card", summary: "标题偏高反差，但正文保持克制自然。" }
      ],
      riskFeedback: [
        { payload: { platformReason: "疑似导流" } }
      ]
    }
  });

  assert.match(messages[1].content, /成功样本标题/);
  assert.match(messages[1].content, /标题偏高反差/);
  assert.doesNotMatch(messages[1].content, /疑似导流/);
});

test("generation endpoint returns memory retrieval metadata", async (t) => {
  const result = await invokeRoute("POST", "/api/generate-note", {
    mode: "from_scratch",
    collectionType: "科普",
    brief: { topic: "沟通", constraints: "温和" },
    mockCandidates: [
      { variant: "safe", title: "沟通标题", body: "完整正文".repeat(40), coverText: "封面", tags: ["沟通", "关系"] }
    ]
  });

  assert.equal(result.ok, true);
  assert.equal(result.memoryContext.retrievalMeta.queryKind, "generation");
});
```

- [ ] **Step 2: 扩展 retrieval service，支持生成与改写两个查询入口**

```js
async function retrieveForGeneration(input = {}) {
  const queryText = [input.topic, input.collectionType, input.constraints, (input.tags || []).join(" ")].filter(Boolean).join("\n");
  const [referenceSamples, memoryCards] = await Promise.all([
    retrieveBuckets({ queryText, limit: 5, filters: { kind: ["reference_sample"], status: ["active"], collectionType: input.collectionType || "" } }),
    retrieveBuckets({ queryText, limit: 4, filters: { kind: ["style_experience_card", "risk_boundary_card"], status: ["active"] } })
  ]);

  return {
    riskFeedback: [],
    falsePositiveHints: [],
    referenceSamples,
    memoryCards,
    retrievalMeta: {
      queryKind: "generation",
      embeddingVersion: referenceSamples[0]?.embeddingVersion || memoryCards[0]?.embeddingVersion || "",
      candidateCount: referenceSamples.length + memoryCards.length
    }
  };
}

async function retrieveForRewrite(input = {}) {
  const queryText = [input.title, input.body, input.coverText, (input.tags || []).join(" ")].filter(Boolean).join("\n");
  const [riskFeedback, falsePositiveHints, referenceSamples, memoryCards] = await Promise.all([
    retrieveBuckets({ queryText, limit: 4, filters: { kind: ["violation_feedback"], status: ["active"] } }),
    retrieveBuckets({ queryText, limit: 3, filters: { kind: ["false_positive"], status: ["active"] } }),
    retrieveBuckets({ queryText, limit: 3, filters: { kind: ["reference_sample"], status: ["active"] } }),
    retrieveBuckets({ queryText, limit: 4, filters: { kind: ["rewrite_strategy_card"], status: ["active"] } })
  ]);

  return {
    riskFeedback,
    falsePositiveHints,
    referenceSamples,
    memoryCards,
    retrievalMeta: {
      queryKind: "rewrite",
      embeddingVersion: riskFeedback[0]?.embeddingVersion || memoryCards[0]?.embeddingVersion || "",
      candidateCount: riskFeedback.length + falsePositiveHints.length + referenceSamples.length + memoryCards.length
    }
  };
}
```

- [ ] **Step 3: 在 `generation-workbench.js` 和 `server.js` 中使用结构化记忆块**

```js
function stringifyMemoryContext(memoryContext = {}) {
  const referenceSection = (memoryContext.referenceSamples || [])
    .slice(0, 3)
    .map((sample, index) =>
      [
        `成功参考 ${index + 1}：${sample.payload?.note?.title || sample.title || ""}`,
        `正文摘要：${String(sample.payload?.note?.body || sample.payload?.body || "").slice(0, 140)}`
      ].join("\n")
    )
    .join("\n\n");

  const cardSection = (memoryContext.memoryCards || [])
    .slice(0, 4)
    .map((card, index) => `经验卡 ${index + 1}：${String(card.summary || card.title || "").trim()}`)
    .join("\n");

  return [referenceSection, cardSection].filter(Boolean).join("\n\n");
}
```

```js
export function buildGenerationMessages({
  mode = "from_scratch",
  brief = {},
  draft = {},
  styleProfile = null,
  referenceSamples = [],
  innerSpaceTerms = [],
  memoryContext = null
} = {}) {
  const memoryPrompt = stringifyMemoryContext(memoryContext || {});
  return [
    {
      role: "system",
      content: [
        "你是小红书内容生成助手，目标是生成合规、自然、符合账号风格的笔记。",
        "不要帮助规避平台审核，不要输出低俗擦边、导流、夸大承诺或教程化敏感内容。",
        "只返回 JSON。"
      ].join("\n")
    },
    {
      role: "user",
      content: [
        `生成模式：${mode === "draft_optimize" ? "草稿优化" : "从零生成"}`,
        `合集类型：${brief.collectionType || ""}`,
        `主题：${brief.topic || ""}`,
        "",
        "可参考成功样本：",
        stringifyReferenceSamples(referenceSamples),
        "",
        "共享记忆提示：",
        memoryPrompt
      ].join("\n")
    }
  ];
}
```

```js
const memoryService = await getMemoryRetrievalService();
const memoryContext = await memoryService.retrieveForGeneration({
  topic: brief.topic,
  collectionType,
  constraints: brief.constraints,
  tags: draft.tags || []
});

const generation = await generateNoteCandidates({
  mode,
  brief: { ...brief, collectionType },
  draft,
  styleProfile,
  referenceSamples,
  innerSpaceTerms,
  modelSelection: modelSelection.generation,
  memoryContext
});
```

- [ ] **Step 4: 运行生成与改写相关测试**

Run: `node --test test/generation-workbench.test.js test/generation-api.test.js`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/generation-workbench.js src/server.js test/generation-workbench.test.js test/generation-api.test.js
git commit -m "feat: use shared memory context in generation and rewrite flows"
```

## Task 5: 实现候选记忆卡片与半自动激活规则

**Files:**
- Create: `src/memory/memory-card.js`
- Modify: `src/data-store.js`
- Modify: `src/cli.js`
- Create: `test/memory-card.test.js`

- [ ] **Step 1: 写候选卡片与激活规则的失败测试**

```js
import test from "node:test";
import assert from "node:assert/strict";

import {
  buildCandidateRiskPatternCards,
  activateMemoryCards
} from "../src/memory/memory-card.js";

test("candidate risk pattern card keeps multiple supporting source ids", () => {
  const cards = buildCandidateRiskPatternCards([
    {
      id: "feedback-1",
      platformReason: "疑似导流",
      feedbackModelSuggestion: {
        contextCategories: ["导流与私域"]
      },
      suspiciousPhrases: ["二维码"]
    },
    {
      id: "feedback-2",
      platformReason: "疑似导流",
      feedbackModelSuggestion: {
        contextCategories: ["导流与私域"]
      },
      suspiciousPhrases: ["私信"]
    }
  ]);

  assert.equal(cards.length, 1);
  assert.equal(cards[0].kind, "risk_pattern_card");
  assert.deepEqual(cards[0].sourceIds, ["feedback-1", "feedback-2"]);
  assert.equal(cards[0].status, "candidate");
});

test("activation only promotes cards with enough support or manual confirmation", () => {
  const cards = activateMemoryCards([
    {
      id: "card-1",
      kind: "risk_pattern_card",
      status: "candidate",
      confidence: 0.82,
      sourceIds: ["feedback-1", "feedback-2"]
    },
    {
      id: "card-2",
      kind: "rewrite_strategy_card",
      status: "candidate",
      confidence: 0.7,
      sourceIds: ["feedback-3"]
    }
  ]);

  assert.equal(cards[0].status, "active");
  assert.equal(cards[1].status, "candidate");
});
```

- [ ] **Step 2: 实现卡片生成与激活函数**

```js
function normalizeString(value = "") {
  return String(value || "").trim();
}

function uniqueStrings(items = []) {
  return [...new Set((Array.isArray(items) ? items : [items]).map((item) => normalizeString(item)).filter(Boolean))];
}

export function buildCandidateRiskPatternCards(feedbackItems = []) {
  const groups = new Map();

  for (const item of feedbackItems) {
    const categories = uniqueStrings(item.feedbackModelSuggestion?.contextCategories || []);
    for (const category of categories) {
      const key = `risk-pattern:${category}`;
      const current = groups.get(key) || {
        id: key,
        kind: "risk_pattern_card",
        status: "candidate",
        confidence: 0.82,
        sourceQuality: "imported",
        sourceIds: [],
        riskCategories: [category],
        summary: `${category} 场景近期重复出现，建议在检测解释和改写提示中重点关注。`
      };
      current.sourceIds = uniqueStrings([...current.sourceIds, item.id]);
      groups.set(key, current);
    }
  }

  return [...groups.values()];
}

export function activateMemoryCards(cards = []) {
  return (Array.isArray(cards) ? cards : []).map((card) => ({
    ...card,
    status:
      card.status === "candidate" &&
      (Array.isArray(card.sourceIds) && card.sourceIds.length >= 2)
        ? "active"
        : card.status
  }));
}
```

- [ ] **Step 3: 将卡片重建接入 CLI 和数据层**

```js
import {
  buildCandidateRiskPatternCards,
  activateMemoryCards
} from "./memory/memory-card.js";

async function runMemoryRebuild() {
  const feedbackItems = await loadFeedbackLog();
  const cards = activateMemoryCards(buildCandidateRiskPatternCards(feedbackItems));
  await saveMemoryCards(cards);
  console.log(JSON.stringify({ ok: true, cards: cards.length }, null, 2));
}

if (command === "memory:rebuild") {
  await runMemoryRebuild();
  return;
}
```

```js
export async function saveMemoryCards(items = []) {
  await ensureMemoryStorage();
  await writeJson(paths.memoryCards, items);
  return items;
}

export async function loadMemoryCards() {
  return readJson(paths.memoryCards, []);
}
```

- [ ] **Step 4: 运行卡片测试**

Run: `node --test test/memory-card.test.js`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/memory/memory-card.js src/data-store.js src/cli.js test/memory-card.test.js
git commit -m "feat: add candidate memory cards and activation rules"
```

## Task 6: 增加 memory rebuild/inspect 命令、文档和回归验证

**Files:**
- Modify: `package.json`
- Modify: `README.md`
- Modify: `src/cli.js`
- Modify: `src/data-store.js`
- Modify: `test/readme-doc-links.test.js`

- [ ] **Step 1: 为 CLI 命令写失败测试或最小 smoke 断言**

```js
test("memory rebuild command writes cards and documents summary", async () => {
  const result = await runCliCommand(["memory:rebuild"]);
  assert.equal(result.ok, true);
  assert.equal(typeof result.cards, "number");
});
```

- [ ] **Step 2: 新增脚本与 inspect 命令**

```json
{
  "scripts": {
    "memory:rebuild": "node src/cli.js memory:rebuild",
    "memory:inspect": "node src/cli.js memory:inspect"
  }
}
```

```js
async function runMemoryInspect() {
  const [documents, cards] = await Promise.all([loadMemoryDocuments(), loadMemoryCards()]);
  console.log(
    JSON.stringify(
      {
        ok: true,
        documents: documents.length,
        cards: cards.length,
        activeCards: cards.filter((item) => item.status === "active").length
      },
      null,
      2
    )
  );
}

if (command === "memory:inspect") {
  await runMemoryInspect();
  return;
}
```

- [ ] **Step 3: 更新 README**

```md
## AI 记忆共享层

第一版 AI 记忆保留现有 JSON 事实层，在 `data/memory/` 下维护本地检索文档、记忆卡片与索引元数据。

重建 memory 索引与卡片：

```bash
npm run memory:rebuild
```

查看当前 memory 摘要：

```bash
npm run memory:inspect
```
```

- [ ] **Step 4: 运行文档与命令相关回归**

Run: `node --test test/readme-doc-links.test.js`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add package.json README.md src/cli.js src/data-store.js test/readme-doc-links.test.js
git commit -m "docs: document memory rebuild and inspect commands"
```

## Task 7: 全量回归与 spec 对照

**Files:**
- Modify: `docs/superpowers/specs/2026-05-07-ai-memory-shared-layer-design.md`
- Modify: `docs/superpowers/plans/2026-05-07-ai-memory-shared-layer.md`

- [ ] **Step 1: 运行第一版 memory 相关测试集**

Run: `node --test test/memory-document.test.js test/vector-store.test.js test/retrieval-service.test.js test/memory-card.test.js test/analyzer-seed-lexicon.test.js test/generation-workbench.test.js test/generation-api.test.js test/readme-doc-links.test.js`

Expected: PASS

- [ ] **Step 2: 用 spec 清单对照实现**

```txt
检查项：
1. 是否保留 JSON 事实层，不让向量索引替代主存储
2. 是否实现检测 / 生成 / 改写的共享 retrieval service
3. 是否实现 candidate / active / suppressed / archived 的状态模型
4. 是否禁止记忆层放宽 hard_block
5. 是否加入 memory rebuild / inspect 命令
6. 是否实现候选记忆卡片且至少支持风险模式卡
```

- [ ] **Step 3: 根据实现结果修正文档**

```md
- 若第一版尚未实现 `suppressed / archived` 的 UI 操作，只在 spec 中保留“数据结构已预留”说明。
- 若第一版生成链路只消费 style/risk boundary 两类卡片，则在 plan 和 spec 中同步写明，不宣称已消费全部卡片类型。
```

**Task 7 对照结论（按当前实现更新）**

- 已确认保留 JSON 事实层，`data/memory/` 仅作为检索与索引层，不替代主存储。
- 已确认共享 `memory retrieval service` 同时服务检测、改写、生成三条链路，其中改写链路也已实际消费结构化记忆上下文。
- 已确认 `hard_block` 不会被记忆层直接放宽。
- 已确认 `memory:rebuild`、`memory:inspect` 已落地。
- 已确认首版候选记忆卡片生成 / 激活逻辑聚焦 `risk_pattern_card`。
- 已确认 `candidate`、`active` 为当前实际运行状态；`suppressed`、`archived` 仍为治理预留状态，尚未形成完整操作闭环。

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/specs/2026-05-07-ai-memory-shared-layer-design.md docs/superpowers/plans/2026-05-07-ai-memory-shared-layer.md
git commit -m "docs: finalize ai memory shared layer plan"
```
