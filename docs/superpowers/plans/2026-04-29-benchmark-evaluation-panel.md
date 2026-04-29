# Benchmark Evaluation Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a new `基准评测` tab under the existing data maintenance area so users can manually create benchmark samples, delete them, and run the benchmark harness from the web UI.

**Architecture:** Keep benchmark data separate from success samples and false-positive logs. Add a focused `review-benchmark` data module plus REST endpoints in `server.js`, then build a lightweight tab in the existing admin surface that talks only to those endpoints. Reuse the existing harness in `src/evals/review-benchmark-harness.js` instead of inventing a second evaluation path.

**Tech Stack:** Node.js ESM, existing JSON file storage under `data/`, built-in `node:test`, current `server.js` HTTP API layer, vanilla HTML/CSS/JS frontend in `web/`.

---

### Task 1: Add Benchmark Data Storage And Normalization

**Files:**
- Create: `src/review-benchmark.js`
- Modify: `src/config.js`
- Modify: `src/data-store.js`
- Test: `test/review-benchmark-store.test.js`

- [ ] **Step 1: Write the failing data-store test**

```js
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { paths } from "../src/config.js";
import { loadReviewBenchmarkSamples, saveReviewBenchmarkSamples } from "../src/data-store.js";

test("load/save review benchmark samples normalizes Chinese expected types and tags", async (t) => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "review-benchmark-store-"));
  const originalPath = paths.reviewBenchmark;
  paths.reviewBenchmark = path.join(tempDir, "review-benchmark.json");

  t.after(async () => {
    paths.reviewBenchmark = originalPath;
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  await saveReviewBenchmarkSamples([
    {
      id: " sample-1 ",
      expectedType: "误报样本",
      input: {
        title: " 关系沟通提醒 ",
        body: " 这是一条容易误报的正文 ",
        tags: ["关系", "关系", "沟通", ""]
      }
    }
  ]);

  const items = await loadReviewBenchmarkSamples();
  assert.equal(items.length, 1);
  assert.equal(items[0].expectedType, "false_positive");
  assert.equal(items[0].input.title, "关系沟通提醒");
  assert.deepEqual(items[0].input.tags, ["关系", "沟通"]);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test test/review-benchmark-store.test.js`  
Expected: FAIL with missing `paths.reviewBenchmark` or missing `loadReviewBenchmarkSamples` / `saveReviewBenchmarkSamples`.

- [ ] **Step 3: Add config path and benchmark helpers**

```js
// src/config.js
export const paths = {
  lexiconSeed: path.join(dataDir, "lexicon.seed.json"),
  lexiconCustom: path.join(dataDir, "lexicon.custom.json"),
  whitelist: path.join(dataDir, "whitelist.json"),
  feedbackLog: path.join(dataDir, "feedback.log.json"),
  falsePositiveLog: path.join(dataDir, "false-positive-log.json"),
  reviewQueue: path.join(dataDir, "review-queue.json"),
  rewritePairs: path.join(dataDir, "rewrite-pairs.json"),
  successSamples: path.join(dataDir, "success-samples.json"),
  styleProfile: path.join(dataDir, "style-profile.json"),
  noteLifecycle: path.join(dataDir, "note-lifecycle.json"),
  modelPerformance: path.join(dataDir, "model-performance.json"),
  analyzeTagOptions: path.join(dataDir, "analyze-tag-options.json"),
  reviewBenchmark: path.join(dataDir, "evals", "review-benchmark.json")
};
```

```js
// src/review-benchmark.js
import crypto from "node:crypto";

function uniqueStrings(items = []) {
  return [...new Set((Array.isArray(items) ? items : [items]).map((item) => String(item || "").trim()).filter(Boolean))];
}

export function normalizeBenchmarkExpectedType(value = "") {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "违规样本" || normalized === "violation") return "violation";
  if (normalized === "误报样本" || normalized === "false_positive") return "false_positive";
  if (normalized === "正常通过样本" || normalized === "success") return "success";
  return "success";
}

export function buildReviewBenchmarkRecord(input = {}) {
  const now = new Date().toISOString();
  const title = String(input?.input?.title || input.title || "").trim();
  const body = String(input?.input?.body || input.body || "").trim();
  const tags = uniqueStrings(input?.input?.tags || input.tags || []);
  const expectedType = normalizeBenchmarkExpectedType(input.expectedType);
  const seed = `${expectedType}|${title}|${body}`;
  const id =
    String(input.id || "").trim() ||
    `benchmark-${crypto.createHash("sha1").update(seed || `${Date.now()}`).digest("hex").slice(0, 12)}`;

  return {
    id,
    expectedType,
    input: {
      title,
      body,
      coverText: String(input?.input?.coverText || "").trim(),
      tags
    },
    createdAt: String(input.createdAt || now).trim(),
    updatedAt: now
  };
}
```

```js
// src/data-store.js
import { buildReviewBenchmarkRecord } from "./review-benchmark.js";

export async function loadReviewBenchmarkSamples() {
  const items = await readJson(paths.reviewBenchmark, []);
  return (Array.isArray(items) ? items : []).map((item) => buildReviewBenchmarkRecord(item));
}

export async function saveReviewBenchmarkSamples(items) {
  const normalized = (Array.isArray(items) ? items : []).map((item) => buildReviewBenchmarkRecord(item));
  await writeJson(paths.reviewBenchmark, normalized);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test test/review-benchmark-store.test.js`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/config.js src/data-store.js src/review-benchmark.js test/review-benchmark-store.test.js
git commit -m "feat: add benchmark sample storage"
```

### Task 2: Add Benchmark API Endpoints

**Files:**
- Modify: `src/server.js`
- Test: `test/review-benchmark-api.test.js`
- Reference: `src/evals/review-benchmark-harness.js`

- [ ] **Step 1: Write the failing API test**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { paths } from "../src/config.js";
import { handleRequest } from "../src/server.js";

test("review benchmark API creates, lists, deletes, and runs samples", async (t) => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "review-benchmark-api-"));
  const originalPath = paths.reviewBenchmark;
  paths.reviewBenchmark = path.join(tempDir, "review-benchmark.json");
  await fs.writeFile(paths.reviewBenchmark, "[]\n", "utf8");

  t.after(async () => {
    paths.reviewBenchmark = originalPath;
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  const created = await invokeRoute("POST", "/api/review-benchmark", {
    title: "关系沟通提醒",
    body: "这是一条容易误报的正文",
    tags: ["关系", "沟通"],
    expectedType: "误报样本"
  });

  assert.equal(created.status, 200);
  assert.equal(created.items.length, 1);
  assert.equal(created.items[0].expectedType, "false_positive");

  const listed = await invokeRoute("GET", "/api/review-benchmark");
  assert.equal(listed.items.length, 1);

  const run = await invokeRoute("POST", "/api/review-benchmark/run");
  assert.equal(run.ok, true);
  assert.equal(typeof run.summary.total, "number");

  const deleted = await invokeRoute("DELETE", "/api/review-benchmark", { id: listed.items[0].id });
  assert.equal(deleted.items.length, 0);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test test/review-benchmark-api.test.js`  
Expected: FAIL with 404 / missing route assertions.

- [ ] **Step 3: Implement the benchmark routes**

```js
// src/server.js
import {
  loadReviewBenchmarkSamples,
  saveReviewBenchmarkSamples
} from "./data-store.js";
import { buildReviewBenchmarkRecord } from "./review-benchmark.js";
import { runReviewBenchmarkHarness } from "./evals/review-benchmark-harness.js";
```

```js
if (request.method === "GET" && url.pathname === "/api/review-benchmark") {
  const items = await loadReviewBenchmarkSamples();
  return sendJson(response, 200, { ok: true, items });
}

if (request.method === "POST" && url.pathname === "/api/review-benchmark") {
  const payload = await readBody(request);
  const current = await loadReviewBenchmarkSamples();
  const next = [...current, buildReviewBenchmarkRecord(payload)];
  await saveReviewBenchmarkSamples(next);
  return sendJson(response, 200, { ok: true, items: next });
}

if (request.method === "DELETE" && url.pathname === "/api/review-benchmark") {
  const payload = await readBody(request);
  const current = await loadReviewBenchmarkSamples();
  const next = current.filter((item) => item.id !== String(payload.id || "").trim());

  if (next.length === current.length) {
    const error = new Error("未找到要删除的基准样本。");
    error.statusCode = 404;
    throw error;
  }

  await saveReviewBenchmarkSamples(next);
  return sendJson(response, 200, { ok: true, items: next });
}

if (request.method === "POST" && url.pathname === "/api/review-benchmark/run") {
  const summary = await runReviewBenchmarkHarness({ filePath: paths.reviewBenchmark });
  return sendJson(response, 200, summary);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test test/review-benchmark-api.test.js`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/server.js test/review-benchmark-api.test.js
git commit -m "feat: add benchmark api endpoints"
```

### Task 3: Add The Benchmark Tab And Manual Entry Form

**Files:**
- Modify: `web/index.html`
- Modify: `web/app.js`
- Test: `test/benchmark-generation-ui.test.js`

- [ ] **Step 1: Write the failing UI-structure test**

```js
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

test("frontend exposes benchmark evaluation tab and form", async () => {
  const [indexHtml, appJs] = await Promise.all([
    fs.readFile(path.join(process.cwd(), "web/index.html"), "utf8"),
    fs.readFile(path.join(process.cwd(), "web/app.js"), "utf8")
  ]);

  assert.match(indexHtml, /data-tab-target="review-benchmark-pane"/);
  assert.match(indexHtml, /id="review-benchmark-form"/);
  assert.match(indexHtml, /运行基准评测/);
  assert.match(appJs, /\/api\/review-benchmark/);
  assert.match(appJs, /renderReviewBenchmarkSamples/);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test test/benchmark-generation-ui.test.js`  
Expected: FAIL with missing tab/form assertions.

- [ ] **Step 3: Add the tab and entry form**

```html
<!-- web/index.html -->
<button type="button" class="tab-button" data-tab-target="review-benchmark-pane">基准评测</button>
```

```html
<section class="tab-panel" id="review-benchmark-pane">
  <div class="tab-panel-head">
    <strong>基准评测</strong>
    <span>手动维护回归样本，直接运行校准结果。</span>
  </div>
  <div class="admin-panel-block">
    <div class="admin-panel-body">
      <form id="review-benchmark-form" class="stack compact-form">
        <label>
          <span>标题</span>
          <input name="title" placeholder="基准样本标题" />
        </label>
        <label>
          <span>正文</span>
          <textarea name="body" rows="4" placeholder="基准样本正文"></textarea>
        </label>
        <label>
          <span>标签</span>
          <input name="tags" placeholder="标签，用逗号分隔" />
        </label>
        <label>
          <span>预期类型</span>
          <select name="expectedType">
            <option value="violation">违规样本</option>
            <option value="false_positive">误报样本</option>
            <option value="success">正常通过样本</option>
          </select>
        </label>
        <div class="inline-actions inline-actions-row">
          <button type="submit" class="button button-alt">保存基准样本</button>
          <button type="button" class="button button-ghost" id="review-benchmark-run-button">运行基准评测</button>
        </div>
      </form>
    </div>
    <div id="review-benchmark-result" class="result-card muted">等待操作</div>
    <div id="review-benchmark-list" class="admin-list"></div>
  </div>
</section>
```

```js
// web/app.js
function expectedTypeLabel(value) {
  if (value === "violation") return "违规样本";
  if (value === "false_positive") return "误报样本";
  return "正常通过样本";
}

function renderReviewBenchmarkSamples(items = []) {
  byId("review-benchmark-list").innerHTML = items.length
    ? items
        .map(
          (item) => `
            <article class="admin-item">
              <strong>${escapeHtml(item.input?.title || "未命名基准样本")}</strong>
              <p>${escapeHtml(compactText(item.input?.body || "", 100))}</p>
              <div class="meta-row">
                <span class="meta-pill">${escapeHtml(expectedTypeLabel(item.expectedType))}</span>
                <span class="meta-pill">${escapeHtml(joinCSV(item.input?.tags || [])) || "未填标签"}</span>
              </div>
              <div class="inline-actions">
                <button type="button" class="button button-danger button-small" data-action="delete-review-benchmark" data-id="${escapeHtml(
                  item.id
                )}">删除</button>
              </div>
            </article>
          `
        )
        .join("")
    : '<div class="result-card muted">当前没有基准样本</div>';
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test test/benchmark-generation-ui.test.js`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add web/index.html web/app.js test/benchmark-generation-ui.test.js
git commit -m "feat: add benchmark evaluation tab"
```

### Task 4: Wire Form Submit, Delete, And Run-Result Rendering

**Files:**
- Modify: `web/app.js`
- Modify: `web/styles.css`
- Test: `test/review-benchmark-api.test.js`
- Test: `test/benchmark-generation-ui.test.js`

- [ ] **Step 1: Extend the failing tests with run-result expectations**

```js
assert.match(appJs, /review-benchmark-run-button/);
assert.match(appJs, /renderReviewBenchmarkResult/);
assert.match(appJs, /delete-review-benchmark/);
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test test/benchmark-generation-ui.test.js test/review-benchmark-api.test.js`  
Expected: FAIL with missing run/delete rendering assertions.

- [ ] **Step 3: Implement list refresh, submit, delete, and result rendering**

```js
async function refreshReviewBenchmark() {
  const data = await apiJson("/api/review-benchmark");
  renderReviewBenchmarkSamples(data.items || []);
}

function renderReviewBenchmarkResult(result = null) {
  if (!result) {
    byId("review-benchmark-result").innerHTML = '<div class="result-card muted">等待操作</div>';
    return;
  }

  const mismatches = (result.results || []).filter((item) => !item.matchedExpectation);
  byId("review-benchmark-result").innerHTML = `
    <div class="result-card-shell">
      <div class="meta-row">
        <span class="meta-pill">总样本 ${escapeHtml(String(result.summary?.total || 0))}</span>
        <span class="meta-pill">匹配 ${escapeHtml(String(result.summary?.passed || 0))}</span>
        <span class="meta-pill">未匹配 ${escapeHtml(String(result.summary?.failed || 0))}</span>
      </div>
      <ul>
        ${mismatches.length
          ? mismatches
              .map(
                (item) => `<li>${escapeHtml(item.id)} / 预期 ${escapeHtml(expectedTypeLabel(item.expectedType))} / 实际 ${escapeHtml(
                  verdictLabel(item.actualVerdict)
                )}</li>`
              )
              .join("")
          : "<li>当前没有未匹配样本</li>"}
      </ul>
    </div>
  `;
}
```

```js
byId("review-benchmark-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const formElement = event.currentTarget;
  const form = new FormData(formElement);
  const response = await apiJson("/api/review-benchmark", {
    method: "POST",
    body: JSON.stringify({
      title: form.get("title"),
      body: form.get("body"),
      tags: splitCSV(form.get("tags")),
      expectedType: form.get("expectedType")
    })
  });
  renderReviewBenchmarkSamples(response.items || []);
  byId("review-benchmark-result").innerHTML = '<div class="result-card-shell">基准样本已保存。</div>';
  formElement.reset();
});

byId("review-benchmark-run-button").addEventListener("click", async () => {
  const result = await apiJson("/api/review-benchmark/run", {
    method: "POST",
    body: JSON.stringify({})
  });
  renderReviewBenchmarkResult(result);
});
```

```js
document.addEventListener("click", async (event) => {
  const button = event.target.closest('[data-action="delete-review-benchmark"]');
  if (!button) return;

  const response = await apiJson("/api/review-benchmark", {
    method: "DELETE",
    body: JSON.stringify({ id: button.dataset.id })
  });
  renderReviewBenchmarkSamples(response.items || []);
});
```

```css
/* web/styles.css */
.benchmark-summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 12px;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test test/benchmark-generation-ui.test.js test/review-benchmark-api.test.js`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add web/app.js web/styles.css test/benchmark-generation-ui.test.js test/review-benchmark-api.test.js
git commit -m "feat: add benchmark evaluation actions"
```

### Task 5: Run Full Verification And Update Docs

**Files:**
- Modify: `README.md`
- Modify: `docs/weekly/2026-04-review-generation-calibration.md`

- [ ] **Step 1: Update docs to mention the new panel**

```md
## 页面工作流

- `数据维护台 > 基准评测`：手动维护 benchmark 样本，并直接运行回归评测。
```

```md
## 下一步建议

当前 benchmark 已支持页面逐条录入和直接运行，无需再手动编辑 JSON 文件扩样本。
```

- [ ] **Step 2: Run the focused verification suite**

Run: `node --test test/review-benchmark-store.test.js test/review-benchmark-api.test.js test/review-benchmark-harness.test.js test/benchmark-generation-ui.test.js`  
Expected: PASS

Run: `node src/cli.js eval-review-benchmark`  
Expected: prints benchmark summary JSON using the same file the UI edits.

- [ ] **Step 3: Run the nearby regression suite**

Run: `node --test test/success-samples-api.test.js test/false-positive-api.test.js test/generation-api.test.js`  
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add README.md docs/weekly/2026-04-review-generation-calibration.md
git commit -m "docs: document benchmark evaluation panel"
```

## Self-Review

- Spec coverage:
  - Task 1 covers benchmark file storage and normalization.
  - Task 2 covers API endpoints for list/create/delete/run.
  - Task 3 covers the new `基准评测` tab and the 4-field manual entry form.
  - Task 4 covers list rendering, delete action, run action, and result summary.
  - Task 5 covers docs and verification.

- Placeholder scan:
  - No `TBD`, `TODO`, or “similar to” references remain.

- Type consistency:
  - Internal `expectedType` values stay `violation | false_positive | success`.
  - UI labels stay `违规样本 | 误报样本 | 正常通过样本`.
  - File path stays `data/evals/review-benchmark.json` in both CLI and UI paths.
