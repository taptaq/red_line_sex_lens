# False Positive Review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a dedicated false-positive feedback loop so users can record "system said manual review/blocked, but Xiaohongshu allowed it", confirm those samples after an observation window, and review them in a layout that stays readable for long text.

**Architecture:** Add a new `false-positive-log.json` store, service endpoints, and audit logic parallel to the existing feedback flow. Expose one capture entrypoint from the analysis/rewrite results and one maintenance panel in admin, with long-text-safe cards and explicit status transitions from `platform_passed_pending` to `platform_passed_confirmed`.

**Tech Stack:** Node.js ESM, local JSON persistence, existing `src/server.js` HTTP API, vanilla JS frontend in `web/app.js`, CSS grid layout in `web/styles.css`, Node test runner.

---

### Task 1: Add False Positive Persistence

**Files:**
- Modify: `src/config.js`
- Modify: `src/data-store.js`
- Create: `data/false-positive-log.json`
- Test: `test/false-positive-store.test.js`

- [ ] **Step 1: Write the failing test**

```js
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { paths } from "../src/config.js";
import { loadFalsePositiveLog, saveFalsePositiveLog } from "../src/data-store.js";

test("load/save false positive log persists normalized entries", async (t) => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "false-positive-log-"));
  const tempFile = path.join(tempDir, "false-positive-log.json");
  const originalPath = paths.falsePositiveLog;
  paths.falsePositiveLog = tempFile;

  t.after(async () => {
    paths.falsePositiveLog = originalPath;
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  assert.deepEqual(await loadFalsePositiveLog(), []);

  await saveFalsePositiveLog([
    {
      id: "fp-1",
      status: "platform_passed_pending",
      title: "  示例标题  ",
      tags: ["关系沟通", "关系沟通", ""]
    }
  ]);

  const saved = JSON.parse(await fs.readFile(tempFile, "utf8"));
  assert.equal(saved[0].title, "示例标题");
  assert.deepEqual(saved[0].tags, ["关系沟通"]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/false-positive-store.test.js`
Expected: FAIL with missing `loadFalsePositiveLog` / `saveFalsePositiveLog` exports or missing `paths.falsePositiveLog`.

- [ ] **Step 3: Write minimal implementation**

```js
// src/config.js
export const paths = {
  // ...
  falsePositiveLog: path.join(dataDir, "false-positive-log.json")
};

// src/data-store.js
function uniqueStrings(items = []) {
  return [...new Set((Array.isArray(items) ? items : [items]).map((item) => String(item || "").trim()).filter(Boolean))];
}

function sanitizeFalsePositiveEntry(entry = {}) {
  return {
    id: String(entry.id || "").trim(),
    createdAt: String(entry.createdAt || "").trim(),
    updatedAt: String(entry.updatedAt || "").trim(),
    status: String(entry.status || "platform_passed_pending").trim(),
    observedAt: String(entry.observedAt || "").trim(),
    observationWindowHours: Number(entry.observationWindowHours) || 0,
    title: String(entry.title || "").trim(),
    body: String(entry.body || "").trim(),
    coverText: String(entry.coverText || "").trim(),
    tags: uniqueStrings(entry.tags),
    userNotes: String(entry.userNotes || "").trim()
  };
}

export async function loadFalsePositiveLog() {
  return (await readJson(paths.falsePositiveLog, [])).map(sanitizeFalsePositiveEntry);
}

export async function saveFalsePositiveLog(items) {
  await writeJson(paths.falsePositiveLog, (Array.isArray(items) ? items : []).map(sanitizeFalsePositiveEntry));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/false-positive-store.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/config.js src/data-store.js data/false-positive-log.json test/false-positive-store.test.js
git commit -m "feat: add false positive log storage"
```

### Task 2: Add False Positive Audit Logic

**Files:**
- Modify: `src/feedback.js`
- Test: `test/false-positive-audit.test.js`

- [ ] **Step 1: Write the failing test**

```js
import test from "node:test";
import assert from "node:assert/strict";

import { buildFalsePositiveAudit } from "../src/feedback.js";

test("marks confirmed manual-review sample as strict_confirmed", () => {
  const audit = buildFalsePositiveAudit({
    status: "platform_passed_confirmed",
    analysisSnapshot: {
      verdict: "manual_review",
      score: 48,
      categories: ["两性用品宣传与展示"],
      topHits: [{ category: "两性用品宣传与展示", riskLevel: "manual_review", reason: "示例" }]
    }
  });

  assert.equal(audit.signal, "strict_confirmed");
  assert.match(audit.notes, /观察期/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/false-positive-audit.test.js`
Expected: FAIL with missing `buildFalsePositiveAudit` export.

- [ ] **Step 3: Write minimal implementation**

```js
export function buildFalsePositiveAudit({ status = "", analysisSnapshot = null }) {
  const normalizedStatus = String(status || "").trim();
  const analyzerVerdict = String(analysisSnapshot?.verdict || "").trim() || "pass";
  const analyzerRank = severityRank[analyzerVerdict] ?? severityRank.pass;

  if (!analysisSnapshot || analyzerRank < severityRank.manual_review) {
    return {
      signal: "not_enough_evidence",
      label: "证据不足",
      analyzerVerdict,
      notes: "当前样本没有足够证据证明规则偏严。"
    };
  }

  if (normalizedStatus === "platform_passed_confirmed") {
    return {
      signal: "strict_confirmed",
      label: "规则偏严已确认",
      analyzerVerdict,
      notes: "该样本经过观察期仍正常，说明当前规则可能偏严。"
    };
  }

  return {
    signal: "strict_pending",
    label: "规则偏严待确认",
    analyzerVerdict,
    notes: "该样本已记录为放行，但仍处于观察期，暂不用于直接调整规则。"
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/false-positive-audit.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/feedback.js test/false-positive-audit.test.js
git commit -m "feat: add false positive audit classification"
```

### Task 3: Add Service Endpoints For False Positive Samples

**Files:**
- Modify: `src/server.js`
- Modify: `src/data-store.js`
- Modify: `src/feedback.js`
- Test: `test/false-positive-api.test.js`

- [ ] **Step 1: Write the failing test**

```js
import test from "node:test";
import assert from "node:assert/strict";

import { buildFalsePositivePayload } from "../src/server.js";

test("buildFalsePositivePayload attaches analysis snapshot and audit", () => {
  const payload = buildFalsePositivePayload({
    title: "标题",
    body: "正文",
    status: "platform_passed_pending",
    analysis: { verdict: "manual_review", score: 40, hits: [], suggestions: [] }
  });

  assert.equal(payload.status, "platform_passed_pending");
  assert.equal(payload.analysisSnapshot.verdict, "manual_review");
  assert.equal(payload.falsePositiveAudit.signal, "strict_pending");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/false-positive-api.test.js`
Expected: FAIL with missing `buildFalsePositivePayload` export.

- [ ] **Step 3: Write minimal implementation**

```js
// src/server.js
import { buildAnalysisSnapshot, buildFalsePositiveAudit } from "./feedback.js";
import { loadFalsePositiveLog, saveFalsePositiveLog } from "./data-store.js";

export function buildFalsePositivePayload({ analysis = null, ...input }) {
  const now = new Date().toISOString();
  const analysisSnapshot = buildAnalysisSnapshot(analysis);

  return {
    id: String(input.id || `fp-${Date.now()}`).trim(),
    createdAt: String(input.createdAt || now).trim(),
    updatedAt: now,
    status: String(input.status || "platform_passed_pending").trim(),
    observedAt: String(input.observedAt || "").trim(),
    observationWindowHours: Number(input.observationWindowHours) || 0,
    title: String(input.title || "").trim(),
    body: String(input.body || "").trim(),
    coverText: String(input.coverText || "").trim(),
    tags: Array.isArray(input.tags) ? input.tags : [],
    userNotes: String(input.userNotes || "").trim(),
    analysisSnapshot,
    falsePositiveAudit: buildFalsePositiveAudit({
      status: input.status,
      analysisSnapshot
    })
  };
}

// routes
if (request.method === "GET" && url.pathname === "/api/false-positive-log") {
  return sendJson(response, 200, { ok: true, items: await loadFalsePositiveLog() });
}

if (request.method === "POST" && url.pathname === "/api/false-positive-log") {
  const payload = await readBody(request);
  const current = await loadFalsePositiveLog();
  const next = [...current, buildFalsePositivePayload(payload)];
  await saveFalsePositiveLog(next);
  return sendJson(response, 200, { ok: true, items: next });
}

if (request.method === "PATCH" && url.pathname === "/api/false-positive-log") {
  const payload = await readBody(request);
  const current = await loadFalsePositiveLog();
  const next = current.map((item) =>
    item.id !== payload.id
      ? item
      : buildFalsePositivePayload({
          ...item,
          ...payload,
          createdAt: item.createdAt
        })
  );
  await saveFalsePositiveLog(next);
  return sendJson(response, 200, { ok: true, items: next });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/false-positive-api.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/server.js src/data-store.js src/feedback.js test/false-positive-api.test.js
git commit -m "feat: add false positive log api"
```

### Task 4: Add Capture Entry In Analysis And Rewrite Results

**Files:**
- Modify: `web/index.html`
- Modify: `web/app.js`
- Modify: `web/styles.css`
- Test: `test/false-positive-view.test.js`

- [ ] **Step 1: Write the failing test**

```js
import test from "node:test";
import assert from "node:assert/strict";

import { buildFalsePositiveActionMarkup } from "../web/false-positive-view.js";

test("renders false positive capture action with both statuses", () => {
  const html = buildFalsePositiveActionMarkup();
  assert.match(html, /记录为误报样本/);
  assert.match(html, /platform_passed_pending/);
  assert.match(html, /platform_passed_confirmed/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/false-positive-view.test.js`
Expected: FAIL with missing `buildFalsePositiveActionMarkup`.

- [ ] **Step 3: Write minimal implementation**

```js
// web/false-positive-view.js
export function buildFalsePositiveActionMarkup() {
  return `
    <details class="false-positive-capture">
      <summary class="false-positive-summary">记录为误报样本</summary>
      <div class="false-positive-form-shell">
        <select id="false-positive-status">
          <option value="platform_passed_pending">已发出，目前正常</option>
          <option value="platform_passed_confirmed">观察期后仍正常</option>
        </select>
        <input id="false-positive-window" type="number" min="0" step="24" placeholder="观察时长（小时）" />
        <textarea id="false-positive-notes" rows="3" placeholder="补充说明"></textarea>
        <button type="button" class="button button-ghost" id="false-positive-submit">写入误报样本</button>
      </div>
    </details>
  `;
}
```

```js
// web/app.js
const falsePositiveState = {
  latestSource: null
};

function updateFalsePositiveSource(source) {
  falsePositiveState.latestSource = source;
}

// inside renderAnalysis / renderRewriteResult
updateFalsePositiveSource({
  title: payload.title,
  body: payload.body,
  coverText: payload.coverText,
  tags: payload.tags,
  analysis: result
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/false-positive-view.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add web/index.html web/app.js web/styles.css web/false-positive-view.js test/false-positive-view.test.js
git commit -m "feat: add false positive capture ui"
```

### Task 5: Add Admin Panel For False Positive Samples

**Files:**
- Modify: `src/admin.js`
- Modify: `src/server.js`
- Modify: `web/index.html`
- Modify: `web/app.js`
- Modify: `web/styles.css`
- Test: `test/false-positive-admin.test.js`

- [ ] **Step 1: Write the failing test**

```js
import test from "node:test";
import assert from "node:assert/strict";

import { normalizeFalsePositiveEntry } from "../src/admin.js";

test("normalizes false positive entry for admin rendering", () => {
  const item = normalizeFalsePositiveEntry({
    id: "fp-1",
    status: "platform_passed_confirmed",
    falsePositiveAudit: { signal: "strict_confirmed", label: "规则偏严已确认" }
  });

  assert.equal(item.statusLabel, "观察期后仍正常");
  assert.equal(item.auditLabel, "规则偏严已确认");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/false-positive-admin.test.js`
Expected: FAIL with missing `normalizeFalsePositiveEntry`.

- [ ] **Step 3: Write minimal implementation**

```js
// src/admin.js
export function normalizeFalsePositiveEntry(item = {}) {
  const status = String(item.status || "platform_passed_pending").trim();
  return {
    ...item,
    statusLabel: status === "platform_passed_confirmed" ? "观察期后仍正常" : "已发出，目前正常",
    auditLabel: String(item.falsePositiveAudit?.label || "未完成误报复盘").trim()
  };
}

// include falsePositiveLog in loadAdminData()
```

```js
// web/index.html
<button type="button" class="tab-button" data-tab-target="false-positive-pane">误报样本</button>
<section class="tab-panel" id="false-positive-pane">
  <div class="tab-panel-head">
    <strong>误报样本</strong>
    <span>记录系统偏严但平台实际放行的样本，并在观察期后确认。</span>
  </div>
  <div id="false-positive-list" class="admin-list"></div>
</section>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/false-positive-admin.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/admin.js src/server.js web/index.html web/app.js web/styles.css test/false-positive-admin.test.js
git commit -m "feat: add false positive admin panel"
```

### Task 6: Polish Layout For Long Text And Status Controls

**Files:**
- Modify: `web/styles.css`
- Modify: `web/app.js`
- Test: `test/false-positive-layout.test.js`

- [ ] **Step 1: Write the failing test**

```js
import test from "node:test";
import assert from "node:assert/strict";

import { buildFalsePositiveEntryMarkup } from "../web/false-positive-view.js";

test("renders long false positive content in expandable full-text blocks", () => {
  const html = buildFalsePositiveEntryMarkup({
    title: "标题",
    body: "第一段\n\n第二段\n\n第三段",
    userNotes: "很长的备注",
    statusLabel: "观察期后仍正常",
    auditLabel: "规则偏严已确认"
  });

  assert.match(html, /details/);
  assert.match(html, /正文全文/);
  assert.match(html, /备注全文/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/false-positive-layout.test.js`
Expected: FAIL because the entry markup does not expose full-text readers yet.

- [ ] **Step 3: Write minimal implementation**

```js
// web/false-positive-view.js
export function buildLongTextDetails(title, text) {
  const normalized = String(text || "").trim();
  if (!normalized) return '<p class="false-positive-empty">未提供</p>';
  return `
    <details class="false-positive-details">
      <summary class="false-positive-details-summary">${title}</summary>
      <div class="false-positive-reader">${escapeHtml(normalized)}</div>
    </details>
  `;
}

export function buildFalsePositiveEntryMarkup(item) {
  return `
    <article class="admin-item false-positive-item">
      <div class="meta-row">
        <span class="meta-pill">${escapeHtml(item.statusLabel)}</span>
        <span class="meta-pill">${escapeHtml(item.auditLabel)}</span>
      </div>
      ${buildLongTextDetails("正文全文", item.body)}
      ${buildLongTextDetails("备注全文", item.userNotes)}
    </article>
  `;
}
```

```css
.false-positive-item {
  display: grid;
  gap: 0.85rem;
  align-items: start;
}

.false-positive-reader {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  max-height: 28rem;
  overflow: auto;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/false-positive-layout.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add web/styles.css web/app.js web/false-positive-view.js test/false-positive-layout.test.js
git commit -m "feat: polish false positive layout"
```

### Task 7: Final Verification And Docs Refresh

**Files:**
- Modify: `README.md`
- Modify: `SYSTEM_FLOW.md`

- [ ] **Step 1: Write the failing documentation check**

```bash
rg -n "误报样本|false-positive" README.md SYSTEM_FLOW.md
```

Expected: no matches for the new false-positive flow before docs are updated.

- [ ] **Step 2: Update docs with the new workflow**

```md
## 记录误报样本

当系统给出 `manual_review` 或更高结论，但内容实际发布后仍正常时，可以在检测结果区点击“记录为误报样本”。

样本会写入：

data/false-positive-log.json
```

- [ ] **Step 3: Run full verification**

Run:

```bash
node --test test/false-positive-store.test.js test/false-positive-audit.test.js test/false-positive-api.test.js test/false-positive-view.test.js test/false-positive-admin.test.js test/false-positive-layout.test.js test/rewrite-result-view.test.js test/analyze-tag-options-store.test.js
node --check src/server.js
node --check src/data-store.js
node --check src/feedback.js
node --check src/admin.js
node --check src/glm.js
node --check web/app.js
node --check web/false-positive-view.js
node --check web/rewrite-result-view.js
```

Expected: all tests PASS and all `node --check` commands exit 0.

- [ ] **Step 4: Commit**

```bash
git add README.md SYSTEM_FLOW.md
git commit -m "docs: describe false positive review flow"
```
