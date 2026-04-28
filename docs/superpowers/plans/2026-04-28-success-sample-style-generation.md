# Success Sample Style Generation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a success-sample-driven generation loop that can store passed notes, derive a confirmed account style profile, generate multiple Xiaohongshu note candidates, score them, and recommend the safest on-style draft.

**Architecture:** Add focused data modules for success samples and style profiles, then add a generation service that retrieves confirmed profile data and high-weight samples before calling the existing text-model routing helpers. Scoring reuses the current analyzer, semantic review, and cross-review services, with a small local style/completeness scorer layered on top. The frontend adds lightweight collection and generation controls without replacing the existing detection/rewrite flows.

**Tech Stack:** Node.js ESM, local JSON persistence in `data/`, existing HTTP server in `src/server.js`, vanilla JS frontend in `web/app.js`, CSS in `web/styles.css`, Node test runner via `node --test`.

---

## File Structure

- Create `data/success-samples.json`: persisted success sample records.
- Create `data/style-profile.json`: current confirmed style profile plus latest draft profile.
- Create `src/success-samples.js`: success sample normalization, identity, upsert, and scoring weight helpers.
- Create `src/style-profile.js`: draft profile generation from high-weight samples, profile normalization, confirmation helpers, and local style scoring.
- Create `src/generation-workbench.js`: prompt construction, candidate normalization, model-routed generation, scoring orchestration, and recommendation ranking.
- Modify `src/config.js`: add `paths.successSamples` and `paths.styleProfile`.
- Modify `src/data-store.js`: add load/save helpers for success samples and style profile.
- Modify `src/admin.js`: include success samples and style profile in admin data.
- Modify `src/server.js`: expose success sample, style profile, and generation endpoints.
- Modify `web/index.html`: add success sample admin pane, style profile pane, and generation workbench.
- Modify `web/app.js`: wire forms, one-click save actions, profile confirmation, generation request, and result rendering.
- Modify `web/styles.css`: add layout for success samples, profile cards, candidate score cards, and recommendation banner.
- Modify `README.md`: document the new self-evolution loop.

---

### Task 1: Success Sample Store

**Files:**
- Create: `data/success-samples.json`
- Create: `src/success-samples.js`
- Modify: `src/config.js`
- Modify: `src/data-store.js`
- Test: `test/success-samples-store.test.js`

- [ ] **Step 1: Create the failing store test**

Create `test/success-samples-store.test.js`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { paths } from "../src/config.js";
import { loadSuccessSamples, saveSuccessSamples } from "../src/data-store.js";
import {
  buildSuccessSampleRecord,
  getSuccessSampleWeight,
  upsertSuccessSampleRecords
} from "../src/success-samples.js";

async function withTempSuccessSamples(t, run) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "success-samples-"));
  const originalPath = paths.successSamples;
  paths.successSamples = path.join(tempDir, "success-samples.json");
  await fs.writeFile(paths.successSamples, "[]\n", "utf8");

  t.after(async () => {
    paths.successSamples = originalPath;
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  return run();
}

test("buildSuccessSampleRecord normalizes tiers, metrics, content, and snapshots", () => {
  const record = buildSuccessSampleRecord({
    id: "sample-1",
    tier: "featured",
    title: " 标题 ",
    body: " 正文 ",
    coverText: " 封面 ",
    tags: ["科普", "科普", "关系"],
    publishedAt: "2026-04-20",
    metrics: { likes: "12", favorites: "5", comments: "3" },
    source: "current_rewrite",
    notes: "人工精选",
    analysisSnapshot: { verdict: "pass" },
    rewriteSnapshot: { model: "glm-test" }
  });

  assert.equal(record.tier, "featured");
  assert.equal(record.title, "标题");
  assert.equal(record.body, "正文");
  assert.deepEqual(record.tags, ["科普", "关系"]);
  assert.deepEqual(record.metrics, { likes: 12, favorites: 5, comments: 3 });
  assert.equal(record.source, "current_rewrite");
  assert.equal(record.analysisSnapshot.verdict, "pass");
  assert.equal(record.rewriteSnapshot.model, "glm-test");
  assert.equal(getSuccessSampleWeight(record), 3);
});

test("success sample store upserts the same note instead of appending duplicates", async (t) => {
  await withTempSuccessSamples(t, async () => {
    const first = buildSuccessSampleRecord({
      title: "同一篇",
      body: "同一段正文",
      tier: "passed",
      metrics: { likes: 1 }
    });
    const second = buildSuccessSampleRecord({
      title: "同一篇",
      body: "同一段正文",
      tier: "performed",
      metrics: { likes: 20, favorites: 8, comments: 2 }
    });

    await saveSuccessSamples(upsertSuccessSampleRecords([], [first]));
    const next = upsertSuccessSampleRecords(await loadSuccessSamples(), [second]);
    await saveSuccessSamples(next);

    const stored = await loadSuccessSamples();
    assert.equal(stored.length, 1);
    assert.equal(stored[0].tier, "performed");
    assert.equal(stored[0].metrics.likes, 20);
    assert.equal(stored[0].createdAt, first.createdAt);
  });
});
```

- [ ] **Step 2: Run the failing test**

Run: `node --test test/success-samples-store.test.js`

Expected: FAIL with missing `loadSuccessSamples`, `saveSuccessSamples`, or `src/success-samples.js`.

- [ ] **Step 3: Add the data file and config path**

Create `data/success-samples.json`:

```json
[]
```

Modify `src/config.js`:

```js
export const paths = {
  lexiconSeed: path.join(dataDir, "lexicon.seed.json"),
  lexiconCustom: path.join(dataDir, "lexicon.custom.json"),
  whitelist: path.join(dataDir, "whitelist.json"),
  feedbackLog: path.join(dataDir, "feedback.log.json"),
  falsePositiveLog: path.join(dataDir, "false-positive-log.json"),
  reviewQueue: path.join(dataDir, "review-queue.json"),
  rewritePairs: path.join(dataDir, "rewrite-pairs.json"),
  successSamples: path.join(dataDir, "success-samples.json"),
  analyzeTagOptions: path.join(dataDir, "analyze-tag-options.json")
};
```

- [ ] **Step 4: Add data-store helpers**

Modify `src/data-store.js`:

```js
export async function loadSuccessSamples() {
  return readJson(paths.successSamples, []);
}

export async function saveSuccessSamples(items) {
  await writeJson(paths.successSamples, Array.isArray(items) ? items : []);
}
```

- [ ] **Step 5: Implement success sample normalization**

Create `src/success-samples.js`:

```js
import crypto from "node:crypto";
import { ensureArray, normalizeText } from "./normalizer.js";

const allowedTiers = new Set(["passed", "performed", "featured"]);
const tierWeights = {
  passed: 1,
  performed: 2,
  featured: 3
};

function uniqueStrings(items = []) {
  return [...new Set((Array.isArray(items) ? items : [items]).map((item) => String(item || "").trim()).filter(Boolean))];
}

function normalizeTier(value = "") {
  const normalized = String(value || "").trim().toLowerCase();
  return allowedTiers.has(normalized) ? normalized : "passed";
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

export function buildSuccessSampleIdentityKey(item = {}) {
  const title = normalizeText(item.title);
  const body = normalizeText(item.body || item.noteContent);

  if (!title && !body) {
    return "";
  }

  return `${String(item.sourcePlatform || "xiaohongshu").trim().toLowerCase()}|${title}|${body}`;
}

export function isSameSuccessSample(left = {}, right = {}) {
  const leftId = String(left.id || "").trim();
  const rightId = String(right.id || "").trim();

  if (leftId && rightId && leftId === rightId) {
    return true;
  }

  const leftKey = buildSuccessSampleIdentityKey(left);
  const rightKey = buildSuccessSampleIdentityKey(right);
  return Boolean(leftKey && rightKey && leftKey === rightKey);
}

export function buildSuccessSampleRecord(input = {}) {
  const now = new Date().toISOString();
  const identityKey = buildSuccessSampleIdentityKey(input);
  const id =
    String(input.id || "").trim() ||
    `success-${crypto.createHash("sha1").update(identityKey || `${Date.now()}`).digest("hex").slice(0, 16)}`;

  return {
    id,
    tier: normalizeTier(input.tier),
    title: String(input.title || "").trim(),
    body: String(input.body || input.noteContent || "").trim(),
    coverText: String(input.coverText || "").trim(),
    tags: uniqueStrings(ensureArray(input.tags)),
    sourcePlatform: String(input.sourcePlatform || "xiaohongshu").trim() || "xiaohongshu",
    source: String(input.source || "manual").trim() || "manual",
    publishedAt: String(input.publishedAt || "").trim(),
    metrics: normalizeMetrics(input.metrics || {}),
    notes: String(input.notes || "").trim(),
    analysisSnapshot: input.analysisSnapshot || input.analysis || null,
    rewriteSnapshot: input.rewriteSnapshot || input.rewrite || null,
    createdAt: String(input.createdAt || now).trim(),
    updatedAt: now
  };
}

export function getSuccessSampleWeight(item = {}) {
  return tierWeights[normalizeTier(item.tier)] || 1;
}

export function upsertSuccessSampleRecords(current = [], incoming = []) {
  const normalizedIncoming = (Array.isArray(incoming) ? incoming : [incoming]).filter(Boolean).map(buildSuccessSampleRecord);
  const retained = (Array.isArray(current) ? current : []).filter(
    (existing) => !normalizedIncoming.some((entry) => isSameSuccessSample(existing, entry))
  );
  const mergedIncoming = normalizedIncoming.map((entry) => {
    const previous = (Array.isArray(current) ? current : []).find((item) => isSameSuccessSample(item, entry));
    return previous ? { ...entry, id: previous.id, createdAt: previous.createdAt } : entry;
  });

  return [...retained, ...mergedIncoming];
}
```

- [ ] **Step 6: Run the store test**

Run: `node --test test/success-samples-store.test.js`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add data/success-samples.json src/config.js src/data-store.js src/success-samples.js test/success-samples-store.test.js
git commit -m "feat: add success sample store"
```

---

### Task 2: Success Sample API and Admin Data

**Files:**
- Modify: `src/admin.js`
- Modify: `src/server.js`
- Test: `test/success-samples-api.test.js`

- [ ] **Step 1: Create the failing API test**

Create `test/success-samples-api.test.js`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { paths } from "../src/config.js";
import { loadAdminData } from "../src/admin.js";
import { handleRequest } from "../src/server.js";

async function withTempSuccessSampleApi(t, run) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "success-samples-api-"));
  const originalPath = paths.successSamples;
  paths.successSamples = path.join(tempDir, "success-samples.json");
  await fs.writeFile(paths.successSamples, "[]\n", "utf8");

  t.after(async () => {
    paths.successSamples = originalPath;
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  return run();
}

test("success sample API creates, lists, upserts, and deletes samples", async (t) => {
  await withTempSuccessSampleApi(t, async () => {
    const created = await invokeRoute("POST", "/api/success-samples", {
      title: "成功标题",
      body: "成功正文",
      tags: ["科普"],
      tier: "performed",
      metrics: { likes: 9, favorites: 4, comments: 2 }
    });

    assert.equal(created.status, 200);
    assert.equal(created.ok, true);
    assert.equal(created.items.length, 1);
    assert.equal(created.items[0].tier, "performed");

    const replaced = await invokeRoute("POST", "/api/success-samples", {
      title: "成功标题",
      body: "成功正文",
      tier: "featured",
      metrics: { likes: 20 }
    });

    assert.equal(replaced.items.length, 1);
    assert.equal(replaced.items[0].tier, "featured");
    assert.equal(replaced.items[0].metrics.likes, 20);

    const listed = await invokeRoute("GET", "/api/success-samples");
    assert.equal(listed.items.length, 1);
    assert.equal(listed.items[0].title, "成功标题");

    const adminData = await loadAdminData();
    assert.equal(adminData.successSamples.length, 1);

    const deleted = await invokeRoute("DELETE", "/api/success-samples", { id: listed.items[0].id });
    assert.equal(deleted.items.length, 0);
  });
});

async function invokeRoute(method, pathname, body = null) {
  const request = new EventEmitter();
  request.method = method;
  request.url = pathname;
  request.headers = { host: "127.0.0.1" };

  const response = {
    status: 0,
    headers: {},
    body: "",
    writeHead(statusCode, headers = {}) {
      this.status = statusCode;
      this.headers = headers;
    },
    end(chunk = "") {
      this.body += Buffer.isBuffer(chunk) ? chunk.toString("utf8") : String(chunk || "");
    }
  };

  queueMicrotask(() => {
    if (body !== null) request.emit("data", Buffer.from(JSON.stringify(body)));
    request.emit("end");
  });

  await handleRequest(request, response);
  return {
    status: response.status,
    ...(response.body ? JSON.parse(response.body) : {})
  };
}
```

- [ ] **Step 2: Run the failing API test**

Run: `node --test test/success-samples-api.test.js`

Expected: FAIL with missing `/api/success-samples` route or missing `successSamples` in admin data.

- [ ] **Step 3: Include success samples in admin data**

Modify `src/admin.js` imports:

```js
import {
  loadSuccessSamples,
  // keep existing imports
} from "./data-store.js";
```

Modify `loadAdminData()` so the `Promise.all` includes `loadSuccessSamples()` and the returned object includes `successSamples`.

```js
const [seedLexicon, customLexicon, feedbackLog, reviewQueue, rewritePairs, falsePositiveLog, successSamples] =
  await Promise.all([
    loadSeedLexicon(),
    loadCustomLexicon(),
    loadFeedbackLog(),
    loadReviewQueue(),
    loadRewritePairs(),
    loadFalsePositiveLog(),
    loadSuccessSamples()
  ]);

return {
  seedLexicon: seedLexicon.map((item) => ({
    ...item,
    lexiconLevel: normalizeLexiconLevel(item.lexiconLevel, item.riskLevel)
  })),
  customLexicon: customLexicon.map((item) => ({
    ...item,
    lexiconLevel: normalizeLexiconLevel(item.lexiconLevel, item.riskLevel)
  })),
  feedbackLog,
  reviewQueue: reviewQueue.map(enrichReviewQueueItem),
  rewritePairs,
  falsePositiveLog: falsePositiveLog.map(enrichFalsePositiveLogItem),
  successSamples
};
```

- [ ] **Step 4: Add server routes**

Modify `src/server.js` imports:

```js
import {
  loadSuccessSamples,
  saveSuccessSamples,
  // keep existing imports
} from "./data-store.js";
import { buildSuccessSampleRecord, upsertSuccessSampleRecords } from "./success-samples.js";
```

Add these route branches before the 404:

```js
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
  return sendJson(response, 200, { ok: true, item: next.find((item) => item.id === nextRecord.id) || next[next.length - 1], items: next });
}

if (request.method === "DELETE" && url.pathname === "/api/success-samples") {
  const payload = await readBody(request);
  const current = await loadSuccessSamples();
  const next = current.filter((item) => String(item.id || "").trim() !== String(payload?.id || "").trim());

  if (next.length === current.length) {
    const error = new Error("未找到要删除的成功样本。");
    error.statusCode = 404;
    throw error;
  }

  await saveSuccessSamples(next);
  return sendJson(response, 200, { ok: true, items: next });
}
```

- [ ] **Step 5: Run the API test**

Run: `node --test test/success-samples-api.test.js`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/admin.js src/server.js test/success-samples-api.test.js
git commit -m "feat: expose success sample api"
```

---

### Task 3: Style Profile Draft and Confirmation

**Files:**
- Create: `data/style-profile.json`
- Create: `src/style-profile.js`
- Modify: `src/config.js`
- Modify: `src/data-store.js`
- Modify: `src/server.js`
- Test: `test/style-profile.test.js`

- [ ] **Step 1: Create the failing style profile test**

Create `test/style-profile.test.js`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { paths } from "../src/config.js";
import { loadStyleProfile, saveStyleProfile } from "../src/data-store.js";
import {
  buildStyleProfileDraft,
  confirmStyleProfileDraft,
  scoreContentAgainstStyleProfile
} from "../src/style-profile.js";

async function withTempStyleProfile(t, run) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "style-profile-"));
  const originalPath = paths.styleProfile;
  paths.styleProfile = path.join(tempDir, "style-profile.json");
  await fs.writeFile(paths.styleProfile, "{}\n", "utf8");

  t.after(async () => {
    paths.styleProfile = originalPath;
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  return run();
}

test("buildStyleProfileDraft summarizes high-weight success samples and requires confirmation", () => {
  const draft = buildStyleProfileDraft([
    {
      id: "sample-1",
      tier: "featured",
      title: "关系里更舒服的沟通方式",
      body: "先说结论，再给三个具体场景。语气克制一点，像朋友提醒。",
      tags: ["亲密关系", "沟通"]
    },
    {
      id: "sample-2",
      tier: "performed",
      title: "别急着责怪自己",
      body: "用短段落把问题讲清楚，再给可执行建议。",
      tags: ["关系沟通", "自我成长"]
    },
    {
      id: "sample-3",
      tier: "passed",
      title: "普通通过样本",
      body: "权重较低，不进入画像引用。",
      tags: ["普通"]
    }
  ]);

  assert.equal(draft.status, "draft");
  assert.deepEqual(draft.sourceSampleIds, ["sample-1", "sample-2"]);
  assert.match(draft.titleStyle, /标题/);
  assert.match(draft.bodyStructure, /短段落|场景/);
  assert.ok(draft.preferredTags.includes("亲密关系"));
});

test("style profile can be saved as draft and confirmed", async (t) => {
  await withTempStyleProfile(t, async () => {
    const draft = buildStyleProfileDraft([
      { id: "sample-1", tier: "featured", title: "温和标题", body: "温和正文", tags: ["沟通"] }
    ]);

    await saveStyleProfile({ draft, current: null });
    const confirmed = confirmStyleProfileDraft(await loadStyleProfile(), {
      tone: "温和、克制、像朋友提醒"
    });

    assert.equal(confirmed.current.status, "active");
    assert.equal(confirmed.current.tone, "温和、克制、像朋友提醒");
    assert.equal(confirmed.draft, null);

    const score = scoreContentAgainstStyleProfile(
      { title: "温和标题", body: "温和正文", tags: ["沟通"] },
      confirmed.current
    );
    assert.ok(score.score >= 60);
    assert.ok(score.reasons.length >= 1);
  });
});
```

- [ ] **Step 2: Run the failing test**

Run: `node --test test/style-profile.test.js`

Expected: FAIL with missing style profile path, store helpers, or module.

- [ ] **Step 3: Add style profile persistence**

Create `data/style-profile.json`:

```json
{}
```

Modify `src/config.js`:

```js
styleProfile: path.join(dataDir, "style-profile.json")
```

Modify `src/data-store.js`:

```js
export async function loadStyleProfile() {
  return readJson(paths.styleProfile, {});
}

export async function saveStyleProfile(profile) {
  await writeJson(paths.styleProfile, profile && typeof profile === "object" ? profile : {});
}
```

- [ ] **Step 4: Implement local style profile helpers**

Create `src/style-profile.js`:

```js
import { getSuccessSampleWeight } from "./success-samples.js";
import { ensureArray, normalizeText } from "./normalizer.js";

function uniqueStrings(items = []) {
  return [...new Set((Array.isArray(items) ? items : [items]).map((item) => String(item || "").trim()).filter(Boolean))];
}

function topTags(samples = []) {
  const counts = new Map();
  for (const sample of samples) {
    for (const tag of ensureArray(sample.tags)) {
      const normalized = String(tag || "").trim();
      if (normalized) counts.set(normalized, (counts.get(normalized) || 0) + getSuccessSampleWeight(sample));
    }
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([tag]) => tag).slice(0, 8);
}

function averageLength(items = []) {
  const values = items.map((item) => String(item || "").trim().length).filter((value) => value > 0);
  if (!values.length) return 0;
  return Math.round(values.reduce((total, value) => total + value, 0) / values.length);
}

export function buildStyleProfileDraft(successSamples = []) {
  const sourceSamples = (Array.isArray(successSamples) ? successSamples : [])
    .filter((item) => getSuccessSampleWeight(item) >= 2)
    .sort((a, b) => getSuccessSampleWeight(b) - getSuccessSampleWeight(a))
    .slice(0, 12);
  const titleLength = averageLength(sourceSamples.map((item) => item.title));
  const bodyLength = averageLength(sourceSamples.map((item) => item.body));
  const preferredTags = topTags(sourceSamples);
  const now = new Date().toISOString();

  return {
    id: `style-profile-draft-${Date.now()}`,
    status: "draft",
    sourceSampleIds: sourceSamples.map((item) => String(item.id || "").trim()).filter(Boolean),
    titleStyle: titleLength
      ? `标题平均约 ${titleLength} 字，优先保持清晰、克制、带一点真实经验感。`
      : "标题保持清晰、克制、真实，不使用夸张承诺。",
    bodyStructure: bodyLength
      ? `正文平均约 ${bodyLength} 字，优先短段落、先结论后场景，再给可执行建议。`
      : "正文使用短段落，先讲结论，再讲场景和建议。",
    tone: "温和、克制、像朋友提醒，避免强营销和夸张刺激。",
    preferredTags,
    avoidExpressions: ["绝对化承诺", "强导流", "低俗擦边", "过度教程化"],
    generationGuidelines: [
      "保留科普、沟通、经验分享语境",
      "减少刺激性标题党表达",
      "正文给出具体但不过度细节化的建议"
    ],
    createdAt: now,
    updatedAt: now
  };
}

export function confirmStyleProfileDraft(profileState = {}, overrides = {}) {
  const draft = profileState?.draft;
  if (!draft) {
    const error = new Error("当前没有待确认的风格画像。");
    error.statusCode = 400;
    throw error;
  }

  const now = new Date().toISOString();
  return {
    draft: null,
    current: {
      ...draft,
      ...overrides,
      status: "active",
      confirmedAt: now,
      updatedAt: now
    }
  };
}

export function scoreContentAgainstStyleProfile(content = {}, profile = null) {
  if (!profile || profile.status !== "active") {
    return {
      score: 50,
      reasons: ["当前没有已确认风格画像，使用中性风格分。"]
    };
  }

  const text = normalizeText([content.title, content.body, ensureArray(content.tags).join(" ")].join(" "));
  const preferredTags = ensureArray(profile.preferredTags);
  const matchedTags = preferredTags.filter((tag) => text.includes(normalizeText(tag)));
  const hasBody = String(content.body || "").trim().length >= 80;
  const avoidsHardSell = !/(全网最低|绝对|私信|加我|立刻下单)/i.test(String(content.title || "") + String(content.body || ""));
  const score = Math.max(0, Math.min(100, 50 + matchedTags.length * 8 + (hasBody ? 20 : 0) + (avoidsHardSell ? 14 : -18)));

  return {
    score,
    reasons: uniqueStrings([
      matchedTags.length ? `命中风格标签：${matchedTags.join("、")}` : "未明显命中画像标签",
      hasBody ? "正文长度足够承载经验和建议" : "正文偏短，风格表达可能不足",
      avoidsHardSell ? "未出现明显强营销表达" : "出现强营销或导流感表达"
    ])
  };
}
```

- [ ] **Step 5: Add style profile API routes**

Modify `src/server.js` imports:

```js
import { loadStyleProfile, saveStyleProfile, loadSuccessSamples } from "./data-store.js";
import { buildStyleProfileDraft, confirmStyleProfileDraft } from "./style-profile.js";
```

Add routes:

```js
if (request.method === "GET" && url.pathname === "/api/style-profile") {
  const profile = await loadStyleProfile();
  return sendJson(response, 200, { ok: true, profile });
}

if (request.method === "POST" && url.pathname === "/api/style-profile/draft") {
  const samples = await loadSuccessSamples();
  const current = await loadStyleProfile();
  const draft = buildStyleProfileDraft(samples);
  const profile = { ...current, draft };
  await saveStyleProfile(profile);
  return sendJson(response, 200, { ok: true, profile, draft });
}

if (request.method === "PATCH" && url.pathname === "/api/style-profile") {
  const payload = await readBody(request);
  const current = await loadStyleProfile();
  const profile = confirmStyleProfileDraft(current, payload?.profile || payload || {});
  await saveStyleProfile(profile);
  return sendJson(response, 200, { ok: true, profile });
}
```

- [ ] **Step 6: Run the style profile test**

Run: `node --test test/style-profile.test.js`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add data/style-profile.json src/config.js src/data-store.js src/style-profile.js src/server.js test/style-profile.test.js
git commit -m "feat: add style profile drafts"
```

---

### Task 4: Generation Candidate Service

**Files:**
- Create: `src/generation-workbench.js`
- Test: `test/generation-workbench.test.js`

- [ ] **Step 1: Create the failing generation service test**

Create `test/generation-workbench.test.js`:

```js
import test from "node:test";
import assert from "node:assert/strict";

import {
  buildGenerationMessages,
  generateNoteCandidates,
  normalizeGenerationCandidate
} from "../src/generation-workbench.js";

test("buildGenerationMessages includes mode, style profile, success samples, and user requirements", () => {
  const messages = buildGenerationMessages({
    mode: "from_scratch",
    brief: {
      topic: "亲密关系沟通",
      sellingPoints: "温和、科普、可执行",
      audience: "刚进入关系的人",
      constraints: "不要营销感"
    },
    styleProfile: {
      status: "active",
      tone: "温和克制",
      titleStyle: "标题清晰",
      bodyStructure: "短段落",
      preferredTags: ["亲密关系"]
    },
    referenceSamples: [
      { title: "成功标题", body: "成功正文", tier: "featured", tags: ["亲密关系"] }
    ]
  });

  const combined = messages.map((item) => item.content).join("\n");
  assert.match(combined, /亲密关系沟通/);
  assert.match(combined, /温和克制/);
  assert.match(combined, /成功标题/);
  assert.match(combined, /只返回 JSON/);
});

test("generateNoteCandidates normalizes three candidate variants from an injected generator", async () => {
  const result = await generateNoteCandidates({
    mode: "draft_optimize",
    draft: { title: "原标题", body: "原正文" },
    generateJson: async () => ({
      candidates: [
        { variant: "safe", title: "安全版", body: "安全正文", coverText: "安全封面", tags: ["科普"] },
        { variant: "natural", title: "自然版", body: "自然正文", coverText: "自然封面", tags: ["关系"] },
        { variant: "expressive", title: "增强版", body: "增强正文", coverText: "增强封面", tags: ["成长"] }
      ],
      model: "mock-model",
      provider: "mock"
    })
  });

  assert.equal(result.candidates.length, 3);
  assert.equal(result.candidates[0].variant, "safe");
  assert.equal(result.candidates[0].title, "安全版");
  assert.equal(result.modelTrace.model, "mock-model");
});

test("normalizeGenerationCandidate fills missing fields without crashing", () => {
  const candidate = normalizeGenerationCandidate({ title: "标题" }, 1);
  assert.equal(candidate.variant, "natural");
  assert.equal(candidate.body, "");
  assert.deepEqual(candidate.tags, []);
});
```

- [ ] **Step 2: Run the failing generation service test**

Run: `node --test test/generation-workbench.test.js`

Expected: FAIL with missing `src/generation-workbench.js`.

- [ ] **Step 3: Implement prompt and candidate normalization**

Create `src/generation-workbench.js`:

```js
import { callRoutedTextProviderJson } from "./glm.js";
import { getRewriteProviderSelection, getRewriteSelectionModel } from "./model-selection.js";
import { ensureArray } from "./normalizer.js";
import { getSuccessSampleWeight } from "./success-samples.js";

const variants = ["safe", "natural", "expressive"];

function uniqueStrings(items = []) {
  return [...new Set((Array.isArray(items) ? items : [items]).map((item) => String(item || "").trim()).filter(Boolean))];
}

function stringifyReferenceSamples(samples = []) {
  return (Array.isArray(samples) ? samples : [])
    .sort((a, b) => getSuccessSampleWeight(b) - getSuccessSampleWeight(a))
    .slice(0, 5)
    .map((sample, index) =>
      [
        `参考样本 ${index + 1}（${sample.tier || "passed"}）：`,
        `标题：${sample.title || ""}`,
        `正文摘要：${String(sample.body || "").slice(0, 220)}`,
        `标签：${ensureArray(sample.tags).join("、")}`
      ].join("\n")
    )
    .join("\n\n");
}

export function buildGenerationMessages({
  mode = "from_scratch",
  brief = {},
  draft = {},
  styleProfile = null,
  referenceSamples = []
} = {}) {
  return [
    {
      role: "system",
      content: [
        "你是小红书内容生成助手，目标是生成合规、自然、符合账号风格的笔记。",
        "不要帮助规避平台审核，不要输出低俗擦边、导流、夸大承诺或教程化敏感内容。",
        "请生成 3 个候选：safe、natural、expressive。",
        "只返回 JSON。"
      ].join("\n")
    },
    {
      role: "user",
      content: [
        `生成模式：${mode === "draft_optimize" ? "草稿优化" : "从零生成"}`,
        `主题：${brief.topic || ""}`,
        `卖点：${brief.sellingPoints || ""}`,
        `目标人群：${brief.audience || ""}`,
        `注意事项：${brief.constraints || ""}`,
        `原始标题：${draft.title || ""}`,
        `原始正文：${draft.body || ""}`,
        `原始封面：${draft.coverText || ""}`,
        `原始标签：${ensureArray(draft.tags).join("、")}`,
        "",
        "当前生效风格画像：",
        JSON.stringify(styleProfile || {}, null, 2),
        "",
        "可参考成功样本：",
        stringifyReferenceSamples(referenceSamples),
        "",
        "输出格式：",
        "{",
        '  "candidates": [',
        '    {"variant":"safe","title":"标题","body":"正文","coverText":"封面文案","tags":["标签"],"generationNotes":"生成说明","safetyNotes":"安全注意点","referencedSampleIds":["sample-id"]}',
        "  ]",
        "}",
        "要求：不要照抄参考样本；候选之间要有明显侧重点差异；正文必须完整，不要只给摘要。"
      ].join("\n")
    }
  ];
}

export function normalizeGenerationCandidate(candidate = {}, index = 0) {
  const variant = variants.includes(String(candidate.variant || "").trim()) ? String(candidate.variant).trim() : variants[index] || "natural";
  return {
    id: String(candidate.id || `candidate-${variant}-${index + 1}`).trim(),
    variant,
    title: String(candidate.title || "").trim(),
    body: String(candidate.body || candidate.content || "").trim(),
    coverText: String(candidate.coverText || "").trim(),
    tags: uniqueStrings(ensureArray(candidate.tags)),
    generationNotes: String(candidate.generationNotes || candidate.rewriteNotes || "").trim(),
    safetyNotes: String(candidate.safetyNotes || "").trim(),
    referencedSampleIds: uniqueStrings(candidate.referencedSampleIds)
  };
}

function extractJsonBlock(text) {
  const content = String(text || "").trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "");
  try {
    return JSON.parse(content);
  } catch {}

  const start = content.indexOf("{");
  const end = content.lastIndexOf("}");
  if (start === -1 || end <= start) return null;

  try {
    return JSON.parse(content.slice(start, end + 1));
  } catch {
    return null;
  }
}

async function generateJsonWithModel({ messages, modelSelection = "auto" }) {
  const provider = getRewriteProviderSelection(modelSelection);
  const model = getRewriteSelectionModel(modelSelection);
  const result = await callRoutedTextProviderJson({
    provider,
    model,
    temperature: 0.7,
    topP: 0.95,
    maxTokens: Number(process.env.GENERATION_MAX_TOKENS || 1800),
    messages,
    missingKeyMessage: `生成工作台缺少 ${provider} 可用密钥。`,
    fallbackParser: extractJsonBlock
  });

  return {
    ...result.parsed,
    provider,
    model: result.model || model,
    route: result.route,
    routeLabel: result.routeLabel,
    attemptedRoutes: result.attemptedRoutes || []
  };
}

export async function generateNoteCandidates({
  mode = "from_scratch",
  brief = {},
  draft = {},
  styleProfile = null,
  referenceSamples = [],
  modelSelection = "auto",
  generateJson = generateJsonWithModel
} = {}) {
  const messages = buildGenerationMessages({ mode, brief, draft, styleProfile, referenceSamples });
  const payload = await generateJson({ messages, modelSelection });
  const candidates = ensureArray(payload.candidates).map(normalizeGenerationCandidate).slice(0, 3);

  return {
    mode,
    candidates,
    modelTrace: {
      provider: payload.provider || "",
      model: payload.model || "",
      route: payload.route || "",
      routeLabel: payload.routeLabel || "",
      attemptedRoutes: payload.attemptedRoutes || []
    }
  };
}
```

- [ ] **Step 4: Run the generation service test**

Run: `node --test test/generation-workbench.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/generation-workbench.js test/generation-workbench.test.js
git commit -m "feat: add generation candidate service"
```

---

### Task 5: Candidate Scoring and Recommendation

**Files:**
- Modify: `src/generation-workbench.js`
- Test: `test/generation-scoring.test.js`

- [ ] **Step 1: Create the failing scoring test**

Create `test/generation-scoring.test.js`:

```js
import test from "node:test";
import assert from "node:assert/strict";

import { scoreGenerationCandidates } from "../src/generation-workbench.js";

test("scoreGenerationCandidates recommends the safest on-style candidate", async () => {
  const result = await scoreGenerationCandidates({
    candidates: [
      { id: "candidate-safe", variant: "safe", title: "温和沟通", body: "这是一段完整的科普沟通建议正文。".repeat(8), tags: ["沟通"] },
      { id: "candidate-risk", variant: "expressive", title: "全网最低立刻私信", body: "私信我领取。", tags: ["促销"] }
    ],
    styleProfile: {
      status: "active",
      preferredTags: ["沟通"],
      tone: "温和克制"
    },
    brief: { topic: "沟通" },
    analyzeCandidate: async (candidate) =>
      candidate.id === "candidate-risk"
        ? { verdict: "hard_block", finalVerdict: "hard_block", score: 100, suggestions: ["删除导流"] }
        : { verdict: "pass", finalVerdict: "pass", score: 0, suggestions: [] },
    semanticReviewCandidate: async () => ({ status: "unavailable", message: "测试不调用模型" }),
    crossReviewCandidate: async () => ({ status: "skipped", reviews: [] })
  });

  assert.equal(result.recommendedCandidateId, "candidate-safe");
  assert.equal(result.scoredCandidates[0].id, "candidate-safe");
  assert.ok(result.scoredCandidates[0].scores.total > result.scoredCandidates[1].scores.total);
  assert.match(result.recommendationReason, /合规风险更低/);
});
```

- [ ] **Step 2: Run the failing scoring test**

Run: `node --test test/generation-scoring.test.js`

Expected: FAIL with missing `scoreGenerationCandidates`.

- [ ] **Step 3: Add scoring helpers**

Modify `src/generation-workbench.js` imports:

```js
import { analyzePost } from "./analyzer.js";
import { runSemanticReview } from "./semantic-review.js";
import { runCrossModelReview } from "./cross-review.js";
import { scoreContentAgainstStyleProfile } from "./style-profile.js";
```

Add scoring functions:

```js
const verdictPenalty = {
  pass: 0,
  observe: 12,
  manual_review: 38,
  hard_block: 90
};

function normalizeVerdict(value = "") {
  const verdict = String(value || "").trim();
  return ["pass", "observe", "manual_review", "hard_block"].includes(verdict) ? verdict : "manual_review";
}

function scoreCompleteness(candidate = {}, brief = {}) {
  const text = `${candidate.title || ""}\n${candidate.body || ""}\n${candidate.coverText || ""}\n${ensureArray(candidate.tags).join(" ")}`;
  const topic = String(brief.topic || "").trim();
  const hasTopic = !topic || text.includes(topic);
  const hasBody = String(candidate.body || "").trim().length >= 120;
  const hasCover = Boolean(String(candidate.coverText || "").trim());
  const hasTags = ensureArray(candidate.tags).length >= 2;
  const score = Math.max(0, Math.min(100, (hasTopic ? 30 : 0) + (hasBody ? 35 : 0) + (hasCover ? 15 : 0) + (hasTags ? 20 : 0)));

  return {
    score,
    reasons: [
      hasTopic ? "覆盖主题" : "主题覆盖不明显",
      hasBody ? "正文完整" : "正文偏短",
      hasCover ? "包含封面文案" : "缺少封面文案",
      hasTags ? "标签数量足够" : "标签偏少"
    ]
  };
}

function rankScoredCandidate(item) {
  const verdict = normalizeVerdict(item.analysis?.finalVerdict || item.analysis?.verdict);
  const riskScore = Math.max(0, 100 - (verdictPenalty[verdict] || 0) - Math.min(50, Number(item.analysis?.score) || 0));
  return {
    riskScore,
    total: Math.round(riskScore * 0.5 + item.style.score * 0.3 + item.completeness.score * 0.2)
  };
}

export async function scoreGenerationCandidates({
  candidates = [],
  styleProfile = null,
  brief = {},
  modelSelection = {},
  analyzeCandidate = analyzePost,
  semanticReviewCandidate = runSemanticReview,
  crossReviewCandidate = runCrossModelReview
} = {}) {
  const scoredCandidates = [];

  for (const candidate of candidates) {
    const analysis = await analyzeCandidate(candidate);
    const semanticReview = await semanticReviewCandidate({
      input: candidate,
      analysis,
      modelSelection: modelSelection.semantic
    });
    const mergedAnalysis = { ...analysis, semanticReview };
    const crossReview = await crossReviewCandidate({
      input: candidate,
      analysis: mergedAnalysis,
      modelSelection: modelSelection.crossReview
    });
    const style = scoreContentAgainstStyleProfile(candidate, styleProfile);
    const completeness = scoreCompleteness(candidate, brief);
    const scores = rankScoredCandidate({ analysis: mergedAnalysis, style, completeness });

    scoredCandidates.push({
      ...candidate,
      analysis: mergedAnalysis,
      crossReview,
      style,
      completeness,
      scores
    });
  }

  scoredCandidates.sort((a, b) => b.scores.total - a.scores.total);
  const recommended = scoredCandidates[0] || null;
  const recommendedVerdict = normalizeVerdict(recommended?.analysis?.finalVerdict || recommended?.analysis?.verdict);
  const recommendationReason = recommended
    ? recommendedVerdict === "pass" || recommendedVerdict === "observe"
      ? "推荐该候选：合规风险更低，风格匹配和内容完整度综合分最高。"
      : "当前候选仍需人工复核：综合分最高但没有达到可直接发布区间。"
    : "当前没有可推荐候选。";

  return {
    recommendedCandidateId: recommended?.id || "",
    recommendationReason,
    scoredCandidates
  };
}
```

- [ ] **Step 4: Run the scoring test**

Run: `node --test test/generation-scoring.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/generation-workbench.js test/generation-scoring.test.js
git commit -m "feat: score generated candidates"
```

---

### Task 6: Generation API Orchestration

**Files:**
- Modify: `src/server.js`
- Test: `test/generation-api.test.js`

- [ ] **Step 1: Create the failing generation API test**

Create `test/generation-api.test.js`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { paths } from "../src/config.js";
import { handleRequest } from "../src/server.js";

async function withTempGenerationData(t, run) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "generation-api-"));
  const originals = {
    successSamples: paths.successSamples,
    styleProfile: paths.styleProfile
  };
  paths.successSamples = path.join(tempDir, "success-samples.json");
  paths.styleProfile = path.join(tempDir, "style-profile.json");
  await fs.writeFile(
    paths.successSamples,
    `${JSON.stringify([{ id: "sample-1", tier: "featured", title: "参考标题", body: "参考正文", tags: ["沟通"] }], null, 2)}\n`,
    "utf8"
  );
  await fs.writeFile(
    paths.styleProfile,
    `${JSON.stringify({ current: { status: "active", preferredTags: ["沟通"], tone: "温和" }, draft: null }, null, 2)}\n`,
    "utf8"
  );

  t.after(async () => {
    Object.assign(paths, originals);
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  return run();
}

test("generation endpoint returns candidates with recommendation metadata", async (t) => {
  await withTempGenerationData(t, async () => {
    const result = await invokeRoute("POST", "/api/generate-note", {
      mode: "from_scratch",
      brief: { topic: "沟通", constraints: "温和" },
      mockCandidates: [
        { variant: "safe", title: "沟通标题", body: "完整正文".repeat(40), coverText: "封面", tags: ["沟通", "关系"] }
      ]
    });

    assert.equal(result.status, 200);
    assert.equal(result.ok, true);
    assert.equal(result.candidates.length, 1);
    assert.equal(result.scoredCandidates.length, 1);
    assert.equal(result.recommendedCandidateId, result.scoredCandidates[0].id);
  });
});

async function invokeRoute(method, pathname, body = null) {
  const request = new EventEmitter();
  request.method = method;
  request.url = pathname;
  request.headers = { host: "127.0.0.1" };

  const response = {
    status: 0,
    headers: {},
    body: "",
    writeHead(statusCode, headers = {}) {
      this.status = statusCode;
      this.headers = headers;
    },
    end(chunk = "") {
      this.body += Buffer.isBuffer(chunk) ? chunk.toString("utf8") : String(chunk || "");
    }
  };

  queueMicrotask(() => {
    if (body !== null) request.emit("data", Buffer.from(JSON.stringify(body)));
    request.emit("end");
  });

  await handleRequest(request, response);
  return {
    status: response.status,
    ...(response.body ? JSON.parse(response.body) : {})
  };
}
```

- [ ] **Step 2: Run the failing generation API test**

Run: `node --test test/generation-api.test.js`

Expected: FAIL with missing `/api/generate-note` route.

- [ ] **Step 3: Add the generation route**

Modify `src/server.js` imports:

```js
import { generateNoteCandidates, scoreGenerationCandidates } from "./generation-workbench.js";
import { loadStyleProfile, loadSuccessSamples } from "./data-store.js";
```

Add route:

```js
if (request.method === "POST" && url.pathname === "/api/generate-note") {
  const payload = await readBody(request);
  const modelSelection = normalizeModelSelectionState(payload?.modelSelection);
  const [profileState, successSamples] = await Promise.all([loadStyleProfile(), loadSuccessSamples()]);
  const styleProfile = profileState?.current || null;
  const referenceSamples = successSamples
    .filter((item) => item.tier === "featured" || item.tier === "performed")
    .slice(-12);
  const generation = await generateNoteCandidates({
    mode: payload?.mode,
    brief: payload?.brief,
    draft: payload?.draft,
    styleProfile,
    referenceSamples,
    modelSelection: modelSelection.rewrite,
    generateJson: Array.isArray(payload?.mockCandidates)
      ? async () => ({ candidates: payload.mockCandidates, provider: "mock", model: "mock-generation" })
      : undefined
  });
  const scored = await scoreGenerationCandidates({
    candidates: generation.candidates,
    styleProfile,
    brief: payload?.brief,
    modelSelection
  });

  return sendJson(response, 200, {
    ok: true,
    ...generation,
    ...scored
  });
}
```

- [ ] **Step 4: Run the generation API test**

Run: `node --test test/generation-api.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/server.js test/generation-api.test.js
git commit -m "feat: expose generation workbench api"
```

---

### Task 7: Frontend Workbench and Admin Controls

**Files:**
- Modify: `web/index.html`
- Modify: `web/app.js`
- Modify: `web/styles.css`
- Test: `test/success-generation-ui.test.js`

- [ ] **Step 1: Create the failing frontend source test**

Create `test/success-generation-ui.test.js`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

test("frontend exposes success samples, style profile, and generation workbench controls", async () => {
  const [indexHtml, appJs, styles] = await Promise.all([
    fs.readFile(path.join(process.cwd(), "web/index.html"), "utf8"),
    fs.readFile(path.join(process.cwd(), "web/app.js"), "utf8"),
    fs.readFile(path.join(process.cwd(), "web/styles.css"), "utf8")
  ]);

  assert.match(indexHtml, /id="generation-workbench-form"/);
  assert.match(indexHtml, /id="success-sample-form"/);
  assert.match(indexHtml, /id="style-profile-pane"/);
  assert.match(appJs, /\/api\/generate-note/);
  assert.match(appJs, /\/api\/success-samples/);
  assert.match(appJs, /\/api\/style-profile\/draft/);
  assert.match(appJs, /renderGenerationResult/);
  assert.match(styles, /\.generation-candidate-card/);
  assert.match(styles, /\.style-profile-card/);
});
```

- [ ] **Step 2: Run the failing frontend source test**

Run: `node --test test/success-generation-ui.test.js`

Expected: FAIL with missing generation and success sample UI markers.

- [ ] **Step 3: Add HTML panels**

Modify `web/index.html` in the main workbench area after the existing rewrite/cross-review controls:

```html
<section class="card generation-workbench">
  <div class="section-title">
    <div>
      <strong>自进化成稿工作台</strong>
      <span>从零生成或基于草稿优化，自动参考成功样本和当前风格画像。</span>
    </div>
  </div>
  <form id="generation-workbench-form" class="stacked-form">
    <label>
      生成模式
      <select name="mode">
        <option value="from_scratch">从零生成</option>
        <option value="draft_optimize">草稿优化</option>
      </select>
    </label>
    <label>主题 <input name="topic" placeholder="例如：亲密关系沟通" /></label>
    <label>卖点/重点 <textarea name="sellingPoints" rows="2"></textarea></label>
    <label>目标人群 <input name="audience" /></label>
    <label>注意事项 <textarea name="constraints" rows="2"></textarea></label>
    <label>草稿标题 <input name="draftTitle" /></label>
    <label>草稿正文 <textarea name="draftBody" rows="5"></textarea></label>
    <button type="submit" class="button">生成候选稿</button>
  </form>
  <div id="generation-result" class="result-card-shell muted">等待生成</div>
</section>
```

Modify the admin tab buttons and panels to include:

```html
<button type="button" class="tab-button" data-tab-target="success-samples-pane">成功样本</button>
<button type="button" class="tab-button" data-tab-target="style-profile-pane">风格画像</button>

<section class="tab-panel" id="success-samples-pane">
  <form id="success-sample-form" class="admin-form">
    <input name="title" placeholder="成功样本标题" />
    <textarea name="body" rows="4" placeholder="成功样本正文"></textarea>
    <input name="coverText" placeholder="封面文案" />
    <input name="tags" placeholder="标签，用逗号分隔" />
    <select name="tier">
      <option value="passed">仅过审</option>
      <option value="performed">过审且表现好</option>
      <option value="featured">人工精选标杆</option>
    </select>
    <input name="likes" type="number" min="0" placeholder="点赞数" />
    <input name="favorites" type="number" min="0" placeholder="收藏数" />
    <input name="comments" type="number" min="0" placeholder="评论数" />
    <input name="publishedAt" type="date" />
    <textarea name="notes" rows="2" placeholder="人工备注"></textarea>
    <button type="submit" class="button">保存成功样本</button>
  </form>
  <div id="success-sample-list" class="admin-list"></div>
</section>

<section class="tab-panel" id="style-profile-pane">
  <button type="button" class="button" id="style-profile-draft-button">从成功样本生成画像草稿</button>
  <div id="style-profile-result" class="admin-list"></div>
</section>
```

- [ ] **Step 4: Add frontend API and render logic**

Modify `web/app.js` with these focused helpers:

```js
function getGenerationPayload() {
  const form = byId("generation-workbench-form");
  const data = new FormData(form);
  return {
    mode: String(data.get("mode") || "from_scratch"),
    brief: {
      topic: String(data.get("topic") || "").trim(),
      sellingPoints: String(data.get("sellingPoints") || "").trim(),
      audience: String(data.get("audience") || "").trim(),
      constraints: String(data.get("constraints") || "").trim()
    },
    draft: {
      title: String(data.get("draftTitle") || "").trim(),
      body: String(data.get("draftBody") || "").trim()
    },
    modelSelection: getSelectedModelSelections()
  };
}

function renderGenerationResult(result = {}) {
  const cards = (result.scoredCandidates || [])
    .map((item) => `
      <article class="generation-candidate-card${item.id === result.recommendedCandidateId ? " is-recommended" : ""}">
        <div class="meta-row">
          <span class="meta-pill">${escapeHtml(item.variant || "candidate")}</span>
          <span class="meta-pill">综合分 ${escapeHtml(String(item.scores?.total ?? 0))}</span>
          <span class="meta-pill">风格分 ${escapeHtml(String(item.style?.score ?? 0))}</span>
        </div>
        <strong>${escapeHtml(item.title || "未生成标题")}</strong>
        <p>${escapeHtml(item.coverText || "未生成封面文案")}</p>
        <div class="rewrite-body-reader">${escapeHtml(item.body || "未生成正文")}</div>
        <p class="helper-text">${escapeHtml(item.generationNotes || "暂无生成说明")}</p>
      </article>
    `)
    .join("");

  byId("generation-result").innerHTML = `
    <div class="model-scope-banner">
      <span class="model-scope-kicker">推荐结果</span>
      <strong>${escapeHtml(result.recommendationReason || "暂无推荐")}</strong>
    </div>
    <div class="generation-candidate-grid">${cards || '<div class="muted">没有候选稿</div>'}</div>
  `;
}

function renderSuccessSamples(items = []) {
  byId("success-sample-list").innerHTML = items.length
    ? items
        .map((item) => `
          <article class="admin-item">
            <div class="meta-row">
              <span class="meta-pill">${escapeHtml(item.tier || "passed")}</span>
              <span class="meta-pill">赞 ${escapeHtml(String(item.metrics?.likes || 0))}</span>
              <span class="meta-pill">藏 ${escapeHtml(String(item.metrics?.favorites || 0))}</span>
              <span class="meta-pill">评 ${escapeHtml(String(item.metrics?.comments || 0))}</span>
            </div>
            <strong>${escapeHtml(item.title || "未命名成功样本")}</strong>
            <p>${escapeHtml(item.body || "未填写正文")}</p>
          </article>
        `)
        .join("")
    : '<div class="result-card muted">当前没有成功样本</div>';
}
```

Wire events:

```js
byId("generation-workbench-form")?.addEventListener("submit", async (event) => {
  event.preventDefault();
  byId("generation-result").innerHTML = '<div class="result-card-shell muted">正在生成并评分候选稿...</div>';
  const result = await apiJson("/api/generate-note", {
    method: "POST",
    body: JSON.stringify(getGenerationPayload())
  });
  renderGenerationResult(result);
});

byId("success-sample-form")?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const response = await apiJson("/api/success-samples", {
    method: "POST",
    body: JSON.stringify({
      title: data.get("title"),
      body: data.get("body"),
      coverText: data.get("coverText"),
      tags: splitCSV(data.get("tags")),
      tier: data.get("tier"),
      publishedAt: data.get("publishedAt"),
      notes: data.get("notes"),
      metrics: {
        likes: data.get("likes"),
        favorites: data.get("favorites"),
        comments: data.get("comments")
      }
    })
  });
  renderSuccessSamples(response.items || []);
});

byId("style-profile-draft-button")?.addEventListener("click", async () => {
  const response = await apiJson("/api/style-profile/draft", { method: "POST" });
  byId("style-profile-result").innerHTML = `
    <article class="style-profile-card">
      <strong>待确认风格画像</strong>
      <p>${escapeHtml(response.draft?.tone || "未生成语气画像")}</p>
      <p>${escapeHtml(response.draft?.titleStyle || "未生成标题画像")}</p>
      <button type="button" class="button" data-action="confirm-style-profile">确认生效</button>
    </article>
  `;
});
```

Extend the existing document click handler:

```js
if (action === "confirm-style-profile") {
  const response = await apiJson("/api/style-profile", {
    method: "PATCH",
    body: JSON.stringify({})
  });
  byId("style-profile-result").innerHTML = `
    <article class="style-profile-card">
      <strong>当前风格画像已生效</strong>
      <p>${escapeHtml(response.profile?.current?.tone || "已确认")}</p>
    </article>
  `;
}
```

Update `refreshAll()` so it fetches and renders success samples from `/api/success-samples`.

- [ ] **Step 5: Add styles**

Modify `web/styles.css`:

```css
.generation-workbench {
  border: 1px solid rgba(35, 80, 64, 0.16);
  background:
    radial-gradient(circle at top left, rgba(128, 184, 139, 0.18), transparent 32rem),
    linear-gradient(135deg, #fffaf0, #f7fbf3);
}

.generation-candidate-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
}

.generation-candidate-card,
.style-profile-card {
  border: 1px solid rgba(44, 62, 48, 0.12);
  border-radius: 18px;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.78);
  box-shadow: 0 14px 34px rgba(33, 50, 40, 0.08);
}

.generation-candidate-card.is-recommended {
  border-color: rgba(41, 128, 96, 0.42);
  box-shadow: 0 18px 42px rgba(41, 128, 96, 0.16);
}
```

- [ ] **Step 6: Run the frontend source test**

Run: `node --test test/success-generation-ui.test.js`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add web/index.html web/app.js web/styles.css test/success-generation-ui.test.js
git commit -m "feat: add generation workbench ui"
```

---

### Task 8: Documentation and Full Regression

**Files:**
- Modify: `README.md`
- Test: `test/readme-doc-links.test.js`

- [ ] **Step 1: Add README documentation**

Modify `README.md` after the误报样本 section:

```md
### 7. 记录成功样本并生成风格化成稿

当一篇笔记已经平台过审，或过审后表现较好，可以保存为成功样本。

成功样本支持三档：

- `passed`：仅过审，用于学习安全表达
- `performed`：过审且表现好，用于学习结构和标题策略
- `featured`：人工精选标杆，生成时优先参考

表现字段第一版记录点赞数、收藏数、评论数、发布时间和人工备注，不记录转化线索。

在“风格画像”区域，可以从 `performed` 和 `featured` 样本生成待确认画像。画像人工确认后才会参与正式生成。

在“自进化成稿工作台”里，可以从零输入主题生成笔记，也可以粘贴已有草稿做优化。系统会生成多个候选稿，并自动跑规则检测、语义复判、交叉复判、风格评分和内容完整度评分，最后推荐综合更稳的一版。
```

- [ ] **Step 2: Extend README test**

Modify `test/readme-doc-links.test.js`:

```js
assert.match(readme, /成功样本/);
assert.match(readme, /风格画像/);
assert.match(readme, /自进化成稿工作台/);
```

- [ ] **Step 3: Run targeted tests**

Run:

```bash
node --test \
  test/success-samples-store.test.js \
  test/success-samples-api.test.js \
  test/style-profile.test.js \
  test/generation-workbench.test.js \
  test/generation-scoring.test.js \
  test/generation-api.test.js \
  test/success-generation-ui.test.js \
  test/readme-doc-links.test.js
```

Expected: all targeted tests PASS.

- [ ] **Step 4: Run full regression**

Run: `node --test`

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add README.md test/readme-doc-links.test.js
git commit -m "docs: document success sample generation loop"
```

---

## Self-Review Checklist

- Spec coverage: Task 1 and Task 2 implement success samples; Task 3 implements style profile draft and confirmation; Task 4 implements from-scratch and draft-optimization candidate generation; Task 5 implements rule, semantic, cross-review, style, and completeness scoring; Task 6 exposes generation through the API; Task 7 exposes UI controls; Task 8 documents the workflow.
- Human control: Style profiles remain draft until confirmation; success samples do not override `hard_block`; generation scoring reports risk instead of forcing publish-ready status.
- Scope control: This plan excludes conversion leads, automatic publishing, automatic A/B experiments, and automatic rule-weight training.
- Type consistency: Success sample tiers are `passed`, `performed`, and `featured`; generation modes are `from_scratch` and `draft_optimize`; candidate variants are `safe`, `natural`, and `expressive`.
