# Note Records Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify `success-samples` and `note-lifecycle` into one underlying `note-records` store while keeping existing API contracts usable and leaving `review-benchmark`, `false-positive-log`, and `rewrite-pairs` independent.

**Architecture:** Add a new `note-records` domain module that owns the canonical note shape, fingerprinting, migration from legacy success/lifecycle records, and merge rules. Then move `data-store.js` and `server.js` to use that store behind compatibility loaders and endpoints, so the UI can be consolidated without a flag day rewrite.

**Tech Stack:** Node.js ESM, JSON file storage under `data/`, built-in `node:test`, current `server.js` HTTP API layer, vanilla HTML/CSS/JS frontend in `web/`.

---

### Task 1: Add Canonical Note Records Model

**Files:**
- Create: `src/note-records.js`
- Modify: `src/config.js`
- Test: `test/note-records-store.test.js`

- [ ] **Step 1: Write the failing model test**

```js
import test from "node:test";
import assert from "node:assert/strict";

import {
  buildNoteFingerprint,
  buildNoteRecord,
  mergeNoteRecords,
  migrateLifecycleToNoteRecord,
  migrateSuccessSampleToNoteRecord,
  dedupeNoteRecords
} from "../src/note-records.js";

test("note records normalize success samples and lifecycle records into one canonical shape", () => {
  const success = migrateSuccessSampleToNoteRecord({
    id: "success-1",
    title: "  真实经验分享 ",
    body: "  正文  ",
    coverText: "  封面  ",
    tags: ["关系", "关系", "沟通"],
    tier: "performed",
    metrics: { likes: "12", favorites: 3, comments: "2" },
    notes: "人工挑选",
    createdAt: "2026-04-29T10:00:00.000Z"
  });

  const lifecycle = migrateLifecycleToNoteRecord({
    id: "life-1",
    source: "rewrite",
    stage: "published",
    note: {
      title: "真实经验分享",
      body: "正文",
      coverText: "封面",
      tags: ["沟通", "关系"]
    },
    publishResult: {
      status: "positive_performance",
      metrics: { likes: 30, favorites: 10, comments: 4 },
      notes: "发布后表现好"
    },
    createdAt: "2026-04-29T12:00:00.000Z"
  });

  assert.equal(success.reference.enabled, true);
  assert.equal(success.reference.tier, "performed");
  assert.equal(success.publish.status, "published_passed");
  assert.equal(lifecycle.reference.enabled, false);
  assert.equal(lifecycle.publish.status, "positive_performance");
  assert.equal(success.note.title, "真实经验分享");
  assert.deepEqual(success.note.tags, ["关系", "沟通"]);
});

test("note records merge by fingerprint and preserve lifecycle publish facts plus success reference facts", () => {
  const merged = mergeNoteRecords(
    migrateSuccessSampleToNoteRecord({
      title: "同一篇内容",
      body: "正文",
      tags: ["科普"],
      tier: "featured",
      createdAt: "2026-04-28T08:00:00.000Z"
    }),
    migrateLifecycleToNoteRecord({
      source: "generation_final",
      note: { title: "同一篇内容", body: "正文", tags: ["科普"] },
      publishResult: { status: "positive_performance", metrics: { likes: 99 } },
      createdAt: "2026-04-29T08:00:00.000Z"
    })
  );

  assert.equal(merged.reference.enabled, true);
  assert.equal(merged.reference.tier, "featured");
  assert.equal(merged.publish.status, "positive_performance");
  assert.equal(merged.publish.metrics.likes, 99);
  assert.equal(merged.createdAt, "2026-04-28T08:00:00.000Z");
});

test("dedupeNoteRecords collapses success and lifecycle entries with the same fingerprint", () => {
  const records = dedupeNoteRecords([
    buildNoteRecord({
      note: { title: "A", body: "B", tags: ["x", "x"] },
      reference: { enabled: true, tier: "passed" }
    }),
    buildNoteRecord({
      note: { title: "A", body: "B", tags: ["x"] },
      publish: { status: "published_passed", metrics: { likes: 8 } }
    })
  ]);

  assert.equal(records.length, 1);
  assert.equal(records[0].reference.enabled, true);
  assert.equal(records[0].publish.status, "published_passed");
});

test("buildNoteFingerprint is stable across tag ordering and whitespace", () => {
  assert.equal(
    buildNoteFingerprint({ title: " 标题 ", body: "正文", coverText: "", tags: ["b", "a"] }),
    buildNoteFingerprint({ title: "标题", body: "正文", coverText: "", tags: ["a", "b", "a"] })
  );
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test test/note-records-store.test.js`  
Expected: FAIL with `Cannot find module '../src/note-records.js'` or missing exports.

- [ ] **Step 3: Add config path and canonical note-record helpers**

```js
// src/config.js
export const paths = {
  // ...
  noteRecords: path.join(dataDir, "note-records.json"),
  reviewBenchmark: path.join(dataDir, "evals", "review-benchmark.json")
};
```

```js
// src/note-records.js
import crypto from "node:crypto";
import { withSampleWeight } from "./sample-weight.js";

function normalizeString(value) {
  return String(value || "").trim();
}

function uniqueStrings(items = []) {
  return [...new Set((Array.isArray(items) ? items : [items]).map((item) => normalizeString(item)).filter(Boolean))];
}

function normalizeMetric(value) {
  const number = Number(String(value ?? "").trim());
  return Number.isFinite(number) && number >= 0 ? Math.floor(number) : 0;
}

function normalizeMetrics(metrics = {}) {
  return {
    likes: normalizeMetric(metrics.likes),
    favorites: normalizeMetric(metrics.favorites),
    comments: normalizeMetric(metrics.comments)
  };
}

function normalizeNote(note = {}) {
  return {
    title: normalizeString(note.title),
    body: normalizeString(note.body || note.noteContent),
    coverText: normalizeString(note.coverText),
    tags: uniqueStrings(note.tags)
  };
}

function normalizeReference(reference = {}) {
  const enabled = reference.enabled === true;
  const tier = ["passed", "performed", "featured"].includes(normalizeString(reference.tier)) ? normalizeString(reference.tier) : "";

  return {
    enabled,
    tier: enabled ? tier || "passed" : "",
    selectedBy: normalizeString(reference.selectedBy),
    notes: normalizeString(reference.notes)
  };
}

function normalizePublish(publish = {}) {
  const status = ["not_published", "published_passed", "limited", "violation", "false_positive", "positive_performance"].includes(
    normalizeString(publish.status)
  )
    ? normalizeString(publish.status)
    : "not_published";

  return {
    status,
    metrics: normalizeMetrics(publish.metrics || publish),
    notes: normalizeString(publish.notes),
    publishedAt: normalizeString(publish.publishedAt),
    platformReason: normalizeString(publish.platformReason)
  };
}

export function buildNoteFingerprint(note = {}) {
  const normalized = normalizeNote(note);
  return [
    normalized.title.toLowerCase(),
    normalized.body.toLowerCase(),
    normalized.coverText.toLowerCase(),
    [...normalized.tags].sort().join("|").toLowerCase()
  ].join("::");
}

export function buildNoteRecord(input = {}) {
  const now = new Date().toISOString();
  const note = normalizeNote(input.note || input);
  const fingerprint = buildNoteFingerprint(note);
  const createdAt = normalizeString(input.createdAt) || now;
  const base = {
    id:
      normalizeString(input.id) ||
      `note-${crypto.createHash("sha1").update(fingerprint || `${Date.now()}`).digest("hex").slice(0, 16)}`,
    fingerprint,
    source: normalizeString(input.source) || "manual",
    stage: normalizeString(input.stage) || "draft",
    createdAt,
    updatedAt: normalizeString(input.updatedAt) || createdAt,
    note,
    publish: normalizePublish(input.publish || input.publishResult || {}),
    reference: normalizeReference(input.reference || {}),
    snapshots: {
      analysis: input.snapshots?.analysis || input.analysisSnapshot || null,
      rewrite: input.snapshots?.rewrite || input.rewriteSnapshot || null,
      generation: input.snapshots?.generation || input.generationSnapshot || null,
      crossReview: input.snapshots?.crossReview || input.crossReviewSnapshot || null
    }
  };

  return withSampleWeight(base, "note_record");
}

export function migrateSuccessSampleToNoteRecord(sample = {}) {
  return buildNoteRecord({
    id: sample.id,
    createdAt: sample.createdAt,
    updatedAt: sample.updatedAt,
    source: normalizeString(sample.source) || "manual",
    stage: "published_reference",
    note: sample,
    publish: {
      status: "published_passed",
      metrics: sample.metrics || {},
      notes: sample.notes,
      publishedAt: sample.publishedAt
    },
    reference: {
      enabled: true,
      tier: sample.tier,
      selectedBy: "manual",
      notes: sample.notes
    },
    analysisSnapshot: sample.analysisSnapshot,
    rewriteSnapshot: sample.rewriteSnapshot
  });
}

export function migrateLifecycleToNoteRecord(record = {}) {
  return buildNoteRecord({
    id: record.id,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    source: record.source,
    stage: record.stage,
    note: record.note || record,
    publish: record.publishResult || record,
    reference: { enabled: false },
    snapshots: record.snapshots || {
      analysis: record.analysisSnapshot,
      rewrite: record.rewriteSnapshot,
      generation: record.generationSnapshot,
      crossReview: record.crossReviewSnapshot
    }
  });
}

export function mergeNoteRecords(current = {}, incoming = {}) {
  const left = buildNoteRecord(current);
  const right = buildNoteRecord(incoming);
  const note =
    right.note.body.length + right.note.coverText.length >= left.note.body.length + left.note.coverText.length ? right.note : left.note;
  const publish = right.publish.status !== "not_published" ? right.publish : left.publish;
  const reference = right.reference.enabled ? right.reference : left.reference;

  return buildNoteRecord({
    ...left,
    ...right,
    id: left.id || right.id,
    fingerprint: left.fingerprint || right.fingerprint,
    note,
    publish,
    reference,
    createdAt: [left.createdAt, right.createdAt].filter(Boolean).sort()[0],
    updatedAt: [left.updatedAt, right.updatedAt].filter(Boolean).sort().slice(-1)[0],
    snapshots: {
      analysis: right.snapshots?.analysis || left.snapshots?.analysis || null,
      rewrite: right.snapshots?.rewrite || left.snapshots?.rewrite || null,
      generation: right.snapshots?.generation || left.snapshots?.generation || null,
      crossReview: right.snapshots?.crossReview || left.snapshots?.crossReview || null
    }
  });
}

export function dedupeNoteRecords(items = []) {
  const byFingerprint = new Map();

  for (const item of Array.isArray(items) ? items : []) {
    const normalized = buildNoteRecord(item);
    const existing = byFingerprint.get(normalized.fingerprint);
    byFingerprint.set(normalized.fingerprint, existing ? mergeNoteRecords(existing, normalized) : normalized);
  }

  return [...byFingerprint.values()];
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test test/note-records-store.test.js`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/config.js src/note-records.js test/note-records-store.test.js
git commit -m "feat: add canonical note records model"
```

### Task 2: Route Success Samples And Lifecycle Through Note Records

**Files:**
- Modify: `src/data-store.js`
- Modify: `src/sample-weight.js`
- Test: `test/note-records-store.test.js`
- Test: `test/success-samples-store.test.js`

- [ ] **Step 1: Extend the failing store tests for compatibility loaders**

```js
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import { paths } from "../src/config.js";
import {
  loadNoteRecords,
  loadNoteLifecycle,
  loadSuccessSamples,
  saveNoteLifecycle,
  saveSuccessSamples
} from "../src/data-store.js";

test("success and lifecycle compatibility loaders read from one shared note-records file", async (t) => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "note-records-compat-"));
  const originalNoteRecords = paths.noteRecords;
  const originalSuccess = paths.successSamples;
  const originalLifecycle = paths.noteLifecycle;
  paths.noteRecords = path.join(tempDir, "note-records.json");
  paths.successSamples = path.join(tempDir, "success-samples.json");
  paths.noteLifecycle = path.join(tempDir, "note-lifecycle.json");

  t.after(async () => {
    paths.noteRecords = originalNoteRecords;
    paths.successSamples = originalSuccess;
    paths.noteLifecycle = originalLifecycle;
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  await saveSuccessSamples([
    {
      title: "成功标题",
      body: "成功正文",
      tags: ["科普"],
      tier: "performed",
      metrics: { likes: 12 }
    }
  ]);

  await saveNoteLifecycle([
    {
      source: "rewrite",
      note: {
        title: "生命周期标题",
        body: "生命周期正文",
        tags: ["关系"]
      },
      publishResult: {
        status: "positive_performance",
        metrics: { likes: 30 }
      }
    }
  ]);

  const noteRecords = await loadNoteRecords();
  const success = await loadSuccessSamples();
  const lifecycle = await loadNoteLifecycle();

  assert.equal(noteRecords.length, 2);
  assert.equal(success.length, 1);
  assert.equal(lifecycle.length, 2);
  assert.equal(success[0].tier, "performed");
  assert.equal(lifecycle[1].publishResult.status, "positive_performance");
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test test/note-records-store.test.js test/success-samples-store.test.js`  
Expected: FAIL with missing `loadNoteRecords` or compatibility behavior assertions.

- [ ] **Step 3: Add shared store functions and compatibility loaders**

```js
// src/sample-weight.js
function inferKind(item = {}, kind = "auto") {
  if (kind && kind !== "auto") {
    return kind;
  }

  if (item.reference && typeof item.reference === "object") return "note_record";
  if (normalizeString(item.tier)) return "success";
  if (normalizeString(item.status).startsWith("platform_passed_")) return "false_positive";
  if (item.publishResult || normalizeString(item.source) === "generation" || normalizeString(item.stage)) return "lifecycle";
  return "generic";
}

export function calculateSampleWeight(item = {}, kind = "auto") {
  const resolvedKind = inferKind(item, kind);

  if (resolvedKind === "note_record") {
    if (item.reference?.enabled) {
      return calculateSampleWeight(
        {
          ...item.note,
          tier: item.reference.tier || "passed",
          confidence: "confirmed",
          sourceQuality: "manual_verified",
          source: item.source,
          metrics: item.publish?.metrics || {},
          createdAt: item.createdAt,
          updatedAt: item.updatedAt
        },
        "success"
      );
    }

    return calculateSampleWeight(
      {
        ...item.note,
        source: item.source,
        stage: item.stage,
        publishResult: item.publish,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt
      },
      "lifecycle"
    );
  }

  // existing branches...
}
```

```js
// src/data-store.js
import {
  buildNoteRecord,
  dedupeNoteRecords,
  migrateLifecycleToNoteRecord,
  migrateSuccessSampleToNoteRecord
} from "./note-records.js";

export async function loadNoteRecords() {
  const noteRecords = await readJson(paths.noteRecords, null);

  if (Array.isArray(noteRecords)) {
    return dedupeNoteRecords(noteRecords);
  }

  const [legacySuccess, legacyLifecycle] = await Promise.all([
    readJson(paths.successSamples, []),
    readJson(paths.noteLifecycle, [])
  ]);

  const migrated = dedupeNoteRecords([
    ...(Array.isArray(legacySuccess) ? legacySuccess : []).map(migrateSuccessSampleToNoteRecord),
    ...(Array.isArray(legacyLifecycle) ? legacyLifecycle : []).map(migrateLifecycleToNoteRecord)
  ]);

  if (migrated.length) {
    await writeJson(paths.noteRecords, migrated);
  }

  return migrated;
}

export async function saveNoteRecords(items) {
  const normalized = dedupeNoteRecords((Array.isArray(items) ? items : []).map((item) => buildNoteRecord(item)));
  await writeJson(paths.noteRecords, normalized);
}

export async function loadSuccessSamples() {
  const items = await loadNoteRecords();
  return items
    .filter((item) => item.reference?.enabled)
    .map((item) =>
      withSampleWeight(
        {
          id: item.id,
          title: item.note.title,
          body: item.note.body,
          coverText: item.note.coverText,
          tags: item.note.tags,
          tier: item.reference.tier,
          source: item.source,
          metrics: item.publish.metrics,
          notes: item.reference.notes,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
          analysisSnapshot: item.snapshots.analysis,
          rewriteSnapshot: item.snapshots.rewrite
        },
        "success"
      )
    );
}

export async function saveSuccessSamples(items) {
  const current = await loadNoteRecords();
  const successByFingerprint = new Map(
    current.filter((item) => item.reference?.enabled).map((item) => [item.fingerprint, item])
  );
  const nextSuccess = (Array.isArray(items) ? items : []).map(migrateSuccessSampleToNoteRecord);
  const retained = current.filter((item) => !item.reference?.enabled);
  const merged = nextSuccess.map((item) => {
    const existing = successByFingerprint.get(item.fingerprint);
    return existing ? mergeNoteRecords(existing, item) : item;
  });
  await saveNoteRecords([...retained, ...merged]);
}

export async function loadNoteLifecycle() {
  const items = await loadNoteRecords();
  return items.map((item) =>
    withSampleWeight(
      {
        id: item.id,
        name: item.note.title || item.id,
        source: item.source,
        stage: item.stage,
        status: item.publish.status,
        note: item.note,
        snapshots: item.snapshots,
        publishResult: {
          ...item.publish,
          label: publishStatusLabel(item.publish.status)
        },
        createdAt: item.createdAt,
        updatedAt: item.updatedAt
      },
      "lifecycle"
    )
  );
}

export async function saveNoteLifecycle(items) {
  const current = await loadNoteRecords();
  const nextLifecycle = (Array.isArray(items) ? items : []).map(migrateLifecycleToNoteRecord);
  const byFingerprint = new Map(current.map((item) => [item.fingerprint, item]));
  const merged = nextLifecycle.map((item) => {
    const existing = byFingerprint.get(item.fingerprint);
    return existing ? mergeNoteRecords(existing, item) : item;
  });
  const untouched = current.filter(
    (item) => !nextLifecycle.some((incoming) => incoming.fingerprint === item.fingerprint)
  );
  await saveNoteRecords([...untouched, ...merged]);
}
```

- [ ] **Step 4: Run the store tests to verify they pass**

Run: `node --test test/note-records-store.test.js test/success-samples-store.test.js`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/data-store.js src/sample-weight.js test/note-records-store.test.js test/success-samples-store.test.js
git commit -m "feat: store success and lifecycle in note records"
```

### Task 3: Keep Existing Success And Lifecycle APIs Backward-Compatible

**Files:**
- Modify: `src/server.js`
- Modify: `src/admin.js`
- Test: `test/success-samples-api.test.js`
- Test: `test/note-lifecycle-api.test.js`

- [ ] **Step 1: Extend the failing API tests for shared underlying storage**

```js
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import { paths } from "../src/config.js";
import { handleRequest } from "../src/server.js";

test("success sample API and lifecycle API write to the same note-records file", async (t) => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "note-records-api-"));
  const originalNoteRecords = paths.noteRecords;
  const originalSuccess = paths.successSamples;
  const originalLifecycle = paths.noteLifecycle;
  paths.noteRecords = path.join(tempDir, "note-records.json");
  paths.successSamples = path.join(tempDir, "success-samples.json");
  paths.noteLifecycle = path.join(tempDir, "note-lifecycle.json");
  await fs.writeFile(paths.noteRecords, "[]\n", "utf8");

  t.after(async () => {
    paths.noteRecords = originalNoteRecords;
    paths.successSamples = originalSuccess;
    paths.noteLifecycle = originalLifecycle;
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  const createdSuccess = await invokeRoute("POST", "/api/success-samples", {
    title: "统一样本标题",
    body: "统一样本正文",
    tags: ["科普"],
    tier: "featured"
  });

  const createdLifecycle = await invokeRoute("POST", "/api/note-lifecycle", {
    source: "rewrite",
    note: {
      title: "统一样本标题",
      body: "统一样本正文",
      tags: ["科普"]
    },
    publishStatus: "positive_performance",
    metrics: { likes: 50 }
  });

  const stored = JSON.parse(await fs.readFile(paths.noteRecords, "utf8"));
  assert.equal(stored.length, 1);
  assert.equal(createdSuccess.items.length, 1);
  assert.equal(createdLifecycle.items.length, 1);
  assert.equal(stored[0].reference.enabled, true);
  assert.equal(stored[0].publish.status, "positive_performance");
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test test/success-samples-api.test.js test/note-lifecycle-api.test.js`  
Expected: FAIL because the APIs still write separate JSON files.

- [ ] **Step 3: Repoint the server and admin layer to shared note records**

```js
// src/server.js
import { buildLifecycleRecord, updateLifecyclePublishResult, upsertLifecycleRecords } from "./note-lifecycle.js";
import { buildSuccessSampleRecord, upsertSuccessSampleRecords } from "./success-samples.js";

if (request.method === "GET" && url.pathname === "/api/success-samples") {
  const items = await loadSuccessSamples();
  return sendJson(response, 200, { ok: true, items });
}

if (request.method === "POST" && url.pathname === "/api/success-samples") {
  const payload = await readBody(request);
  const current = await loadSuccessSamples();
  const nextRecord = buildSuccessSampleRecord(payload);
  const next = upsertSuccessSampleRecords(current, [nextRecord]);
  await saveSuccessSamples(next);
  return sendJson(response, 200, {
    ok: true,
    item: next[next.length - 1],
    items: next
  });
}

if (request.method === "GET" && url.pathname === "/api/note-lifecycle") {
  const items = await loadNoteLifecycle();
  return sendJson(response, 200, { ok: true, items });
}

if (request.method === "POST" && url.pathname === "/api/note-lifecycle") {
  const payload = await readBody(request);
  const current = await loadNoteLifecycle();
  const nextRecord = buildLifecycleRecord(payload);
  const next = upsertLifecycleRecords(current, [nextRecord]);
  await saveNoteLifecycle(next);
  return sendJson(response, 200, {
    ok: true,
    item: next.find((entry) => entry.id === nextRecord.id) || next[next.length - 1],
    items: next
  });
}
```

```js
// src/admin.js
export async function loadAdminData() {
  const [seedLexicon, customLexicon, feedbackLog, reviewQueue, rewritePairs, falsePositiveLog, successSamples, noteLifecycle] = await Promise.all([
    loadSeedLexicon(),
    loadCustomLexicon(),
    loadFeedbackLog(),
    loadReviewQueue(),
    loadRewritePairs(),
    loadFalsePositiveLog(),
    loadSuccessSamples(),
    loadNoteLifecycle()
  ]);

  return {
    // existing fields preserved...
    successSamples,
    noteLifecycle
  };
}
```

- [ ] **Step 4: Run the API tests to verify they pass**

Run: `node --test test/success-samples-api.test.js test/note-lifecycle-api.test.js`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/server.js src/admin.js test/success-samples-api.test.js test/note-lifecycle-api.test.js
git commit -m "feat: keep success and lifecycle APIs compatible over note records"
```

### Task 4: Consolidate The UI Into A Sample Library Pane

**Files:**
- Modify: `web/index.html`
- Modify: `web/app.js`
- Test: `test/success-generation-ui.test.js`

- [ ] **Step 1: Extend the failing UI test for the new sample library grouping**

```js
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

test("frontend groups success samples, lifecycle, and style profile under one sample library pane", async () => {
  const [indexHtml, appJs] = await Promise.all([
    fs.readFile(path.join(process.cwd(), "web/index.html"), "utf8"),
    fs.readFile(path.join(process.cwd(), "web/app.js"), "utf8")
  ]);

  assert.match(indexHtml, /data-tab-target="sample-library-pane"/);
  assert.match(indexHtml, /id="sample-library-pane"/);
  assert.match(indexHtml, /参考样本/);
  assert.match(indexHtml, /生命周期记录/);
  assert.match(indexHtml, /风格画像/);
  assert.doesNotMatch(indexHtml, /data-tab-target="success-samples-pane"/);
  assert.doesNotMatch(indexHtml, /data-tab-target="note-lifecycle-pane"/);
  assert.doesNotMatch(indexHtml, /data-tab-target="style-profile-pane"/);
  assert.match(appJs, /renderSuccessSamples/);
  assert.match(appJs, /renderNoteLifecycle/);
  assert.match(appJs, /renderStyleProfile/);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test test/success-generation-ui.test.js`  
Expected: FAIL because the tabs still exist as three separate panes.

- [ ] **Step 3: Merge the UI entry points while keeping current renderers**

```html
<!-- web/index.html -->
<button type="button" class="tab-button" data-tab-target="sample-library-pane">样本库</button>
```

```html
<section class="tab-panel" id="sample-library-pane">
  <div class="tab-panel-head">
    <strong>样本库</strong>
    <span>把参考样本、生命周期记录和风格画像收在一个入口下，减少并列心智负担。</span>
  </div>

  <section class="admin-group">
    <div class="tab-panel-head">
      <strong>参考样本</strong>
      <span>从统一 note records 中筛选 `reference.enabled = true` 的内容。</span>
    </div>
    <div id="success-sample-result" class="result-card muted">等待操作</div>
    <div id="success-sample-list" class="admin-list"></div>
  </section>

  <section class="admin-group">
    <div class="tab-panel-head">
      <strong>生命周期记录</strong>
      <span>记录内容从检测、改写、生成到发布结果的闭环状态。</span>
    </div>
    <div id="note-lifecycle-list" class="admin-list"></div>
  </section>

  <section class="admin-group">
    <div class="tab-panel-head">
      <strong>风格画像</strong>
      <span>继续从参考样本生成画像草稿，但不再占一个独立 tab。</span>
    </div>
    <div class="admin-panel-body">
      <label>
        <span>画像主题</span>
        <input id="style-profile-topic" placeholder="例如：亲密关系科普 / 产品软植入" />
      </label>
      <button type="button" class="button" id="style-profile-draft-button">
        从参考样本生成画像草稿
      </button>
    </div>
    <div id="style-profile-result" class="admin-list"></div>
  </section>
</section>
```

```js
// web/app.js
function renderAdminData(data) {
  renderLexiconList("seed-lexicon-list", data.seedLexicon, "seed");
  renderLexiconList("custom-lexicon-list", data.customLexicon, "custom");
  renderFeedbackLog(data.feedbackLog);
  renderFalsePositiveLog(data.falsePositiveLog || []);
  renderRewritePairList(data.rewritePairs || []);
  renderSuccessSamples(data.successSamples || []);
  renderNoteLifecycle(data.noteLifecycle || []);
}

function fillSuccessSampleFormFromCurrent(source = "analysis") {
  activateTab("sample-library-pane");
  // existing prefill logic retained...
}

function revealNoteLifecyclePane() {
  activateTab("sample-library-pane");
  byId("sample-library-pane")?.scrollIntoView({ behavior: "smooth", block: "start" });
}
```

- [ ] **Step 4: Run the UI test to verify it passes**

Run: `node --test test/success-generation-ui.test.js`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add web/index.html web/app.js test/success-generation-ui.test.js
git commit -m "feat: group reference samples and lifecycle into sample library"
```

### Task 5: Repoint Style Profile And Generation To Unified Reference Samples

**Files:**
- Modify: `src/server.js`
- Modify: `src/style-profile.js`
- Test: `test/style-profile.test.js`
- Test: `test/generation-api.test.js`

- [ ] **Step 1: Extend the failing tests for unified reference input**

```js
import test from "node:test";
import assert from "node:assert/strict";

import { buildStyleProfileDraft } from "../src/style-profile.js";
import { buildGenerationReferenceSamples } from "../src/server.js";

test("style profile draft still prefers reference-enabled notes after storage unification", () => {
  const draft = buildStyleProfileDraft([
    {
      id: "note-1",
      title: "高权重样本",
      body: "这是一篇更完整的经验正文。".repeat(8),
      tags: ["关系", "科普"],
      tier: "featured",
      sampleWeight: 3.2
    }
  ], { topic: "亲密关系科普" });

  assert.equal(draft.topic, "亲密关系科普");
  assert.equal(draft.sourceSampleIds.length, 1);
});

test("generation references still combine success view and lifecycle view after storage unification", () => {
  const references = buildGenerationReferenceSamples({
    successSamples: [
      { id: "success-1", title: "参考样本", body: "正文", tags: ["科普"], tier: "featured", sampleWeight: 3 }
    ],
    noteLifecycle: [
      {
        id: "life-1",
        source: "generation_final",
        note: { title: "发布后记录", body: "正文", tags: ["关系"] },
        publishResult: { status: "positive_performance", metrics: { likes: 50 } },
        sampleWeight: 2
      }
    ]
  });

  assert.equal(references.length, 2);
});
```

- [ ] **Step 2: Run the tests to verify they fail if any reference contract regresses**

Run: `node --test test/style-profile.test.js test/generation-api.test.js`  
Expected: FAIL if the unified store changed the success/lifecycle shape unexpectedly.

- [ ] **Step 3: Reconfirm style-profile and generation code against the compatibility views**

```js
// src/server.js
const [profileState, successSamples, noteLifecycle] = await Promise.all([
  loadStyleProfile(),
  loadSuccessSamples(),
  loadNoteLifecycle()
]);

const referenceSamples = buildGenerationReferenceSamples({ successSamples, noteLifecycle }).slice(0, 12);
```

```js
// src/style-profile.js
export function buildStyleProfileDraft(successSamples = [], options = {}) {
  const sourceSamples = (Array.isArray(successSamples) ? successSamples : [])
    .filter((item) => getSuccessSampleWeight(item) >= 2)
    .sort((a, b) => getSuccessSampleWeight(b) - getSuccessSampleWeight(a))
    .slice(0, 12);

  // existing draft logic retained...
}
```

- [ ] **Step 4: Run the regression tests to verify they pass**

Run: `node --test test/style-profile.test.js test/generation-api.test.js test/sample-weight.test.js`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/server.js src/style-profile.js test/style-profile.test.js test/generation-api.test.js
git commit -m "test: preserve style profile and generation references over note records"
```

### Task 6: Update Docs And Run Full Verification

**Files:**
- Modify: `README.md`
- Test: `test/readme-doc-links.test.js`

- [ ] **Step 1: Update the README to describe the new sample-library model**

```md
## 页面工作流

- `数据维护台 > 样本库`：统一查看参考样本、生命周期记录和风格画像。
- `参考样本` 不再是一份独立主存储，而是 `note-records` 中被标记为参考内容的视图。
- `生命周期记录` 继续用于发布结果追踪，但底层也写入 `note-records`。
- `基准评测` 仍保持独立题库，不与训练样本混存。

## 项目结构

data/
  note-records.json          成功样本与生命周期的统一主存储
  success-samples.json       兼容旧路径，迁移后不再作为主数据源
  note-lifecycle.json        兼容旧路径，迁移后不再作为主数据源
```

- [ ] **Step 2: Run the doc/link test**

Run: `node --test test/readme-doc-links.test.js`  
Expected: PASS

- [ ] **Step 3: Run the full Phase 1 verification set**

Run:

```bash
node --check web/app.js
node --test test/note-records-store.test.js \
  test/success-samples-store.test.js \
  test/success-samples-api.test.js \
  test/note-lifecycle-api.test.js \
  test/style-profile.test.js \
  test/generation-api.test.js \
  test/sample-weight.test.js \
  test/success-generation-ui.test.js \
  test/readme-doc-links.test.js
```

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add README.md test/readme-doc-links.test.js
git commit -m "docs: describe note records sample library"
```

## Self-Review

### Spec coverage
- Unified canonical model: Task 1
- Shared storage for success/lifecycle: Task 2
- Backward-compatible APIs: Task 3
- Sample-library UI consolidation: Task 4
- Style-profile / generation reference continuity: Task 5
- Docs + full verification: Task 6

### Placeholder scan
- No `TBD` / `TODO`
- All tasks name exact files, code targets, commands, and expected outcomes

### Type consistency
- Canonical store file is consistently `data/note-records.json`
- Canonical model helper is consistently `src/note-records.js`
- Compatibility views remain `loadSuccessSamples()` and `loadNoteLifecycle()`
- Benchmark remains explicitly out of scope for this phase
