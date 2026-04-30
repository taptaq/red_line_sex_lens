# Sample Library Focus Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor `样本库` into a single record workspace with one dominant creation flow, while reducing repeated backend compatibility-route scaffolding and repeated frontend sample-library rendering scaffolding.

**Architecture:** Keep `data/note-records.json` as the canonical store, preserve `/api/success-samples` and `/api/note-lifecycle` for compatibility, and add one UI-facing sample-library route that works directly with canonical note records. On the frontend, replace the nested sample-library tabs with a list-first workspace that edits one selected record at a time and treats reference/lifecycle as attribute blocks on that record.

**Tech Stack:** Node.js built-in test runner, plain ESM server code, plain HTML/CSS/vanilla JS frontend

---

## File Structure

- Create: `src/sample-library.js`
  - Canonical sample-library payload shaping for the UI
  - Minimal create/update helpers around canonical note records
- Create: `test/sample-library-api.test.js`
  - UI-facing canonical sample-library API coverage
- Modify: `src/server.js`
  - Add `/api/sample-library` GET/POST/PATCH/DELETE
  - Extract shared compatibility-route scaffolding for success/lifecycle CRUD
- Modify: `src/admin.js`
  - Include canonical note records in admin payload if the frontend refresh path benefits from it
- Modify: `web/index.html`
  - Replace nested sample-library tabs with one list/detail workspace
- Modify: `web/app.js`
  - Add sample-library workspace state, filtering, selection, and detail rendering
  - Route helper actions through unified sample-record creation
- Modify: `web/styles.css`
  - Add layout + card styles for the list/detail workspace
- Modify: `test/success-generation-ui.test.js`
  - Lock the new sample-library workspace structure
- Modify: `README.md`
  - Describe the new `新增样本记录 -> 补属性` workflow if wording materially changes

### Task 1: Lock The New Sample-Library Workspace UI Contract

**Files:**
- Modify: `test/success-generation-ui.test.js`
- Modify later in implementation: `web/index.html`
- Modify later in implementation: `web/app.js`
- Modify later in implementation: `web/styles.css`

- [ ] **Step 1: Rewrite the failing UI expectation test around the new workspace**

Replace the current nested-tab expectations in `test/success-generation-ui.test.js` with a list/detail contract:

```js
test("frontend exposes a list-first sample library workspace with one primary create action", async () => {
  const [indexHtml, appJs, styles] = await Promise.all([
    fs.readFile(path.join(process.cwd(), "web/index.html"), "utf8"),
    fs.readFile(path.join(process.cwd(), "web/app.js"), "utf8"),
    fs.readFile(path.join(process.cwd(), "web/styles.css"), "utf8")
  ]);

  assert.match(indexHtml, /data-tab-target="sample-library-pane"/);
  assert.match(indexHtml, /id="sample-library-pane"/);
  assert.match(indexHtml, /id="sample-library-create-button"/);
  assert.match(indexHtml, /新增样本记录/);
  assert.match(indexHtml, /id="sample-library-search-input"/);
  assert.match(indexHtml, /id="sample-library-filter"/);
  assert.match(indexHtml, /id="sample-library-record-list"/);
  assert.match(indexHtml, /id="sample-library-detail"/);
  assert.match(indexHtml, /id="sample-library-base-section"/);
  assert.match(indexHtml, /id="sample-library-reference-section"/);
  assert.match(indexHtml, /id="sample-library-lifecycle-section"/);
  assert.match(indexHtml, /id="style-profile-result"/);

  assert.doesNotMatch(indexHtml, /data-sample-library-tab-target=/);
  assert.doesNotMatch(indexHtml, /id="success-sample-form"/);
  assert.doesNotMatch(indexHtml, /id="note-lifecycle-list"/);
  assert.doesNotMatch(indexHtml, /sample-library-tab-strip/);

  assert.match(appJs, /const sampleLibraryApi = "\\/api\\/sample-library"/);
  assert.match(appJs, /selectedSampleLibraryRecordId/);
  assert.match(appJs, /renderSampleLibraryList/);
  assert.match(appJs, /renderSampleLibraryDetail/);
  assert.match(appJs, /filterSampleLibraryRecords/);

  assert.match(styles, /\\.sample-library-workspace/);
  assert.match(styles, /\\.sample-library-record-list/);
  assert.match(styles, /\\.sample-library-detail/);
});
```

- [ ] **Step 2: Run the UI test to verify it fails**

Run: `node --test test/success-generation-ui.test.js`
Expected: FAIL because `web/index.html`, `web/app.js`, and `web/styles.css` still expose nested sample-library tabs and the legacy `success-sample-form`.

- [ ] **Step 3: Commit the failing test**

```bash
git add test/success-generation-ui.test.js
git commit -m "test: define focused sample library workspace ui"
```

### Task 2: Add A Canonical Sample-Library API And Deduplicate Compatibility Route Scaffolding

**Files:**
- Create: `src/sample-library.js`
- Create: `test/sample-library-api.test.js`
- Modify: `src/server.js`
- Modify: `src/admin.js`
- Test: `test/success-samples-api.test.js`
- Test: `test/note-lifecycle-api.test.js`

- [ ] **Step 1: Write the failing canonical sample-library API test**

Create `test/sample-library-api.test.js` with one end-to-end test for the new canonical route:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { paths } from "../src/config.js";
import { handleRequest } from "../src/server.js";

async function withTempSampleLibraryApi(t, run) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "sample-library-api-"));
  const originals = {
    successSamples: paths.successSamples,
    noteLifecycle: paths.noteLifecycle,
    noteRecords: paths.noteRecords
  };

  paths.successSamples = path.join(tempDir, "success-samples.json");
  paths.noteLifecycle = path.join(tempDir, "note-lifecycle.json");
  paths.noteRecords = path.join(tempDir, "note-records.json");

  t.after(async () => {
    Object.assign(paths, originals);
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  await fs.writeFile(paths.noteRecords, "[]\n", "utf8");
  return run();
}

test("sample library API creates one canonical record and enriches reference plus lifecycle attributes on it", async (t) => {
  await withTempSampleLibraryApi(t, async () => {
    const created = await invokeRoute("POST", "/api/sample-library", {
      note: {
        title: "统一样本标题",
        body: "统一样本正文",
        tags: ["关系沟通"]
      }
    });

    assert.equal(created.status, 200);
    assert.equal(created.item.note.title, "统一样本标题");
    assert.equal(created.items.length, 1);
    assert.equal(created.items[0].reference.enabled, false);
    assert.equal(created.items[0].publish.status, "not_published");

    const patched = await invokeRoute("PATCH", "/api/sample-library", {
      id: created.item.id,
      reference: {
        enabled: true,
        tier: "featured",
        notes: "设为重点参考"
      },
      publish: {
        status: "positive_performance",
        metrics: {
          likes: 25,
          favorites: 8,
          comments: 3
        },
        notes: "发布后表现稳定"
      }
    });

    assert.equal(patched.item.id, created.item.id);
    assert.equal(patched.item.reference.enabled, true);
    assert.equal(patched.item.reference.tier, "featured");
    assert.equal(patched.item.publish.status, "positive_performance");

    const listed = await invokeRoute("GET", "/api/sample-library");
    assert.equal(listed.items.length, 1);
    assert.equal(listed.items[0].id, created.item.id);
    assert.equal(listed.items[0].reference.enabled, true);
    assert.equal(listed.items[0].publish.status, "positive_performance");
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

- [ ] **Step 2: Run the new API test to verify it fails**

Run: `node --test test/sample-library-api.test.js`
Expected: FAIL with `404` on `/api/sample-library`.

- [ ] **Step 3: Implement canonical sample-library helpers**

Create `src/sample-library.js`:

```js
import { buildNoteRecord, mergeNoteRecords } from "./note-records.js";

function normalizeRecordId(value = "") {
  return String(value || "").trim();
}

export function createSampleLibraryRecord(payload = {}) {
  return buildNoteRecord({
    note: payload.note || {},
    reference: {
      enabled: false,
      tier: "passed",
      selectedBy: "manual",
      notes: ""
    },
    publish: {
      status: "not_published",
      metrics: { likes: 0, favorites: 0, comments: 0 },
      notes: ""
    }
  });
}

export function patchSampleLibraryRecord(current = {}, payload = {}) {
  return mergeNoteRecords(current, {
    id: normalizeRecordId(payload.id || current.id),
    note: payload.note || current.note,
    reference: payload.reference || current.reference,
    publish: payload.publish || current.publish
  });
}
```

- [ ] **Step 4: Add the new route and shared compatibility helpers in `src/server.js`**

Add imports:

```js
import { loadNoteRecords, saveNoteRecords } from "./data-store.js";
import { createSampleLibraryRecord, patchSampleLibraryRecord } from "./sample-library.js";
```

Add small shared helpers near the sample-library routes:

```js
async function sendCompatList(response, loadItems) {
  const items = await loadItems();
  return sendJson(response, 200, { ok: true, items });
}

async function handleCompatDelete({ request, response, loadItems, saveItems, notFoundMessage }) {
  const payload = await readBody(request);
  const current = await loadItems();
  const next = current.filter((item) => String(item.id || "").trim() !== String(payload?.id || "").trim());

  if (next.length === current.length) {
    const error = new Error(notFoundMessage);
    error.statusCode = 404;
    throw error;
  }

  await saveItems(next);
  const items = await loadItems();
  return sendJson(response, 200, { ok: true, items });
}
```

Add canonical sample-library routes:

```js
if (request.method === "GET" && url.pathname === "/api/sample-library") {
  const items = await loadNoteRecords();
  return sendJson(response, 200, { ok: true, items });
}

if (request.method === "POST" && url.pathname === "/api/sample-library") {
  const payload = await readBody(request);
  const current = await loadNoteRecords();
  const nextRecord = createSampleLibraryRecord(payload);
  const items = await saveNoteRecords([...current, nextRecord]);
  return sendJson(response, 200, {
    ok: true,
    item: items.find((item) => item.id === nextRecord.id) || items[items.length - 1] || null,
    items
  });
}

if (request.method === "PATCH" && url.pathname === "/api/sample-library") {
  const payload = await readBody(request);
  const current = await loadNoteRecords();
  const index = current.findIndex((item) => String(item.id || "").trim() === String(payload?.id || "").trim());

  if (index === -1) {
    const error = new Error("未找到要更新的样本记录。");
    error.statusCode = 404;
    throw error;
  }

  const next = [...current];
  next[index] = patchSampleLibraryRecord(current[index], payload);
  const items = await saveNoteRecords(next);
  return sendJson(response, 200, {
    ok: true,
    item: items.find((item) => item.id === next[index].id) || null,
    items
  });
}

if (request.method === "DELETE" && url.pathname === "/api/sample-library") {
  const payload = await readBody(request);
  const current = await loadNoteRecords();
  const next = current.filter((item) => String(item.id || "").trim() !== String(payload?.id || "").trim());

  if (next.length === current.length) {
    const error = new Error("未找到要删除的样本记录。");
    error.statusCode = 404;
    throw error;
  }

  const items = await saveNoteRecords(next);
  return sendJson(response, 200, { ok: true, items });
}
```

Then refactor the compatibility list/delete routes to use `sendCompatList()` / `handleCompatDelete()` instead of repeating scaffolding:

```js
if (request.method === "GET" && url.pathname === "/api/success-samples") {
  return sendCompatList(response, loadSuccessSamples);
}

if (request.method === "GET" && url.pathname === "/api/note-lifecycle") {
  return sendCompatList(response, loadNoteLifecycle);
}
```

- [ ] **Step 5: Run API safety-net tests**

Run: `node --test test/sample-library-api.test.js test/success-samples-api.test.js test/note-lifecycle-api.test.js`
Expected: PASS

- [ ] **Step 6: Commit the backend refactor**

```bash
git add src/sample-library.js src/server.js test/sample-library-api.test.js test/success-samples-api.test.js test/note-lifecycle-api.test.js
git commit -m "feat: add canonical sample library api"
```

### Task 3: Refactor Frontend State And Shared Sample-Library Rendering Helpers

**Files:**
- Modify: `web/app.js`
- Test via: `test/success-generation-ui.test.js`

- [ ] **Step 1: Add the failing frontend state/render helper expectations**

Extend `test/success-generation-ui.test.js` with explicit function/state checks:

```js
assert.match(appJs, /sampleLibraryRecords: \\[\\]/);
assert.match(appJs, /selectedSampleLibraryRecordId: ""/);
assert.match(appJs, /sampleLibraryFilter: "all"/);
assert.match(appJs, /sampleLibrarySearch: ""/);
assert.match(appJs, /function filterSampleLibraryRecords\\(/);
assert.match(appJs, /function renderSampleLibraryList\\(/);
assert.match(appJs, /function renderSampleLibraryDetail\\(/);
assert.match(appJs, /function renderSampleLibraryWorkspace\\(/);
```

- [ ] **Step 2: Run the UI test to verify it still fails**

Run: `node --test test/success-generation-ui.test.js`
Expected: FAIL because the new sample-library workspace helpers are not implemented yet.

- [ ] **Step 3: Add shared sample-library state and helper functions in `web/app.js`**

Extend `appState`:

```js
const appState = {
  latestAnalyzePayload: null,
  latestAnalysis: null,
  latestRewrite: null,
  latestGeneration: null,
  latestAnalysisFalsePositiveSource: null,
  latestRewriteFalsePositiveSource: null,
  modelOptions: null,
  modelRecommendations: {},
  sampleLibraryRecords: [],
  selectedSampleLibraryRecordId: "",
  sampleLibraryFilter: "all",
  sampleLibrarySearch: ""
};
```

Add the shared helpers:

```js
const sampleLibraryApi = "/api/sample-library";

function filterSampleLibraryRecords(items = []) {
  const search = String(appState.sampleLibrarySearch || "").trim().toLowerCase();
  const filter = appState.sampleLibraryFilter || "all";

  return (Array.isArray(items) ? items : []).filter((item) => {
    const title = String(item.note?.title || "").toLowerCase();
    const tags = Array.isArray(item.note?.tags) ? item.note.tags.join(" ").toLowerCase() : "";
    const matchesSearch = !search || title.includes(search) || tags.includes(search);
    const referenceEnabled = item.reference?.enabled === true;
    const publishStatus = String(item.publish?.status || "not_published").trim();
    const hasTrackedPublish = publishStatus !== "not_published";
    const needsCompletion = !referenceEnabled && !hasTrackedPublish;

    if (!matchesSearch) return false;
    if (filter === "needs_completion") return needsCompletion;
    if (filter === "reference_enabled") return referenceEnabled;
    if (filter === "publish_tracked") return hasTrackedPublish;
    return true;
  });
}

function getSelectedSampleLibraryRecord() {
  const selectedId = String(appState.selectedSampleLibraryRecordId || "").trim();
  const items = appState.sampleLibraryRecords || [];
  return items.find((item) => String(item.id || "").trim() === selectedId) || items[0] || null;
}
```

Add list/detail renderer shells:

```js
function renderSampleLibraryList(items = []) {
  const selectedId = String(appState.selectedSampleLibraryRecordId || "").trim();
  byId("sample-library-record-list").innerHTML = items.length
    ? items
        .map((item) => `
          <button
            type="button"
            class="sample-library-record-card${selectedId === item.id ? " is-active" : ""}"
            data-action="select-sample-library-record"
            data-id="${escapeHtml(item.id || "")}"
          >
            <strong>${escapeHtml(item.note?.title || "未命名样本")}</strong>
            <span>${escapeHtml(joinCSV(item.note?.tags) || "未填写标签")}</span>
          </button>
        `)
        .join("")
    : '<div class="result-card muted">当前还没有样本记录</div>';
}

function renderSampleLibraryDetail(record = null) {
  if (!record) {
    byId("sample-library-detail").innerHTML = '<div class="result-card muted">先创建一条样本记录，或从左侧选择已有记录。</div>';
    return;
  }

  byId("sample-library-detail").innerHTML = `
    <section id="sample-library-base-section"></section>
    <section id="sample-library-reference-section"></section>
    <section id="sample-library-lifecycle-section"></section>
  `;
}
```

- [ ] **Step 4: Wire a workspace refresh function**

Add a canonical refresh path:

```js
async function refreshSampleLibraryWorkspace() {
  const payload = await apiJson(sampleLibraryApi);
  appState.sampleLibraryRecords = payload.items || [];

  if (!appState.selectedSampleLibraryRecordId && appState.sampleLibraryRecords.length) {
    appState.selectedSampleLibraryRecordId = String(appState.sampleLibraryRecords[0].id || "");
  }

  const visibleItems = filterSampleLibraryRecords(appState.sampleLibraryRecords);
  const selectedRecord =
    visibleItems.find((item) => String(item.id || "") === String(appState.selectedSampleLibraryRecordId || "")) ||
    visibleItems[0] ||
    null;

  if (selectedRecord) {
    appState.selectedSampleLibraryRecordId = String(selectedRecord.id || "");
  }

  renderSampleLibraryList(visibleItems);
  renderSampleLibraryDetail(selectedRecord);
  return payload;
}
```

- [ ] **Step 5: Run the UI test to verify it passes once the helpers exist**

Run: `node --test test/success-generation-ui.test.js`
Expected: PASS

- [ ] **Step 6: Commit the frontend state/helper refactor**

```bash
git add web/app.js test/success-generation-ui.test.js
git commit -m "refactor: add sample library workspace state"
```

### Task 4: Replace The Old Nested Sample-Library UI With The New List/Detail Workspace

**Files:**
- Modify: `web/index.html`
- Modify: `web/app.js`
- Modify: `web/styles.css`
- Test: `test/success-generation-ui.test.js`

- [ ] **Step 1: Replace the old sample-library markup in `web/index.html`**

Swap the nested sample-library tabs and `success-sample-form` block for one workspace:

```html
<section class="tab-panel" id="sample-library-pane">
  <div class="tab-panel-head">
    <strong>样本库</strong>
    <span>先创建一条样本记录，再补参考属性或生命周期属性。</span>
  </div>

  <div class="sample-library-toolbar">
    <button type="button" class="button button-alt" id="sample-library-create-button">新增样本记录</button>
    <input id="sample-library-search-input" class="mock-input" placeholder="搜索标题 / 标签" />
    <select id="sample-library-filter">
      <option value="all">全部</option>
      <option value="needs_completion">待补全</option>
      <option value="reference_enabled">已成参考</option>
      <option value="publish_tracked">已跟踪发布</option>
    </select>
  </div>

  <div class="sample-library-workspace">
    <aside class="sample-library-record-list" id="sample-library-record-list"></aside>
    <section class="sample-library-detail" id="sample-library-detail"></section>
  </div>

  <div class="admin-panel-block">
    <div class="admin-panel-body">
      <label>
        <span>画像主题</span>
        <input id="style-profile-topic" placeholder="例如：亲密关系科普 / 产品软植入" />
      </label>
      <button type="button" class="button" id="style-profile-draft-button">从高权重参考记录生成画像草稿</button>
    </div>
    <div id="style-profile-result" class="admin-list"></div>
  </div>
</section>
```

- [ ] **Step 2: Replace legacy create/update handlers with canonical sample-library actions in `web/app.js`**

Use the new route for creation:

```js
async function createSampleLibraryRecordFromDraft(note = {}) {
  const response = await apiJson(sampleLibraryApi, {
    method: "POST",
    body: {
      note: {
        title: note.title || "",
        body: note.body || "",
        coverText: note.coverText || "",
        tags: note.tags || []
      }
    }
  });

  appState.sampleLibraryRecords = response.items || [];
  appState.selectedSampleLibraryRecordId = String(response.item?.id || "");
  await refreshSampleLibraryWorkspace();
}
```

Convert helper actions:

```js
function buildCurrentSampleRecordSeed(source = "analysis") {
  const payload = appState.latestAnalyzePayload || {};
  const rewrite = source === "rewrite" && appState.latestRewrite ? normalizeRewritePayload(appState.latestRewrite) : null;

  return {
    title: rewrite?.title || payload.title || "",
    body: rewrite?.body || payload.body || "",
    coverText: rewrite?.coverText || payload.coverText || "",
    tags: rewrite?.tags?.length ? rewrite.tags : payload.tags || []
  };
}
```

Then wire:

```js
byId("sample-library-create-button").addEventListener("click", async () => {
  await createSampleLibraryRecordFromDraft({ title: "", body: "", coverText: "", tags: [] });
});
```

- [ ] **Step 3: Add detail editing and save-through actions**

Use one save path for base/reference/lifecycle changes:

```js
async function saveSelectedSampleLibraryRecord(patch = {}) {
  const id = String(appState.selectedSampleLibraryRecordId || "").trim();
  if (!id) return;

  const response = await apiJson(sampleLibraryApi, {
    method: "PATCH",
    body: {
      id,
      ...patch
    }
  });

  appState.sampleLibraryRecords = response.items || [];
  appState.selectedSampleLibraryRecordId = String(response.item?.id || id);
  await refreshSampleLibraryWorkspace();
}
```

Inside `renderSampleLibraryDetail(record)`, render concrete forms for:

```js
<section id="sample-library-base-section" class="sample-library-detail-section">
  <strong>基础内容</strong>
  <!-- title/body/tags/coverText inputs -->
</section>

<section id="sample-library-reference-section" class="sample-library-detail-section">
  <strong>参考属性</strong>
  <!-- enabled/tier/notes/weight summary -->
</section>

<section id="sample-library-lifecycle-section" class="sample-library-detail-section">
  <strong>生命周期属性</strong>
  <!-- publish status / metrics / notes -->
</section>
```

- [ ] **Step 4: Add workspace styles in `web/styles.css`**

Add the new layout classes:

```css
.sample-library-toolbar {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: center;
}

.sample-library-workspace {
  display: grid;
  grid-template-columns: minmax(260px, 360px) minmax(0, 1fr);
  gap: 16px;
}

.sample-library-record-list,
.sample-library-detail {
  display: grid;
  gap: 12px;
}

.sample-library-record-card {
  text-align: left;
  border: 1px solid var(--border-color);
}

.sample-library-record-card.is-active {
  border-color: var(--accent-color);
}
```

- [ ] **Step 5: Run the workspace UI test**

Run: `node --test test/success-generation-ui.test.js`
Expected: PASS

- [ ] **Step 6: Commit the UI workspace change**

```bash
git add web/index.html web/app.js web/styles.css test/success-generation-ui.test.js
git commit -m "feat: turn sample library into record workspace"
```

### Task 5: Re-Verify Compatibility Flows And Update Workflow Docs

**Files:**
- Modify if needed: `README.md`
- Test: `test/style-profile.test.js`
- Test: `test/generation-api.test.js`
- Test: `test/sample-library-api.test.js`
- Test: `test/success-samples-api.test.js`
- Test: `test/note-lifecycle-api.test.js`
- Test: `test/note-records-store.test.js`
- Test: `test/readme-doc-links.test.js`

- [ ] **Step 1: Update README workflow wording if the UI text changed materially**

Adjust the sample-library section so it explicitly states:

```md
- `数据维护台 > 样本库`：默认按“左侧记录列表 + 右侧详情编辑”工作。
- 主入口只有一个：`新增样本记录`
- 先保存 `标题 / 正文 / 标签`，再在详情里补 `参考属性` 和 `生命周期属性`
```

- [ ] **Step 2: Run the targeted compatibility and workflow regression suite**

Run:

```bash
node --test test/sample-library-api.test.js \
  test/success-samples-api.test.js \
  test/note-lifecycle-api.test.js \
  test/style-profile.test.js \
  test/generation-api.test.js \
  test/success-generation-ui.test.js \
  test/readme-doc-links.test.js
```

Expected: PASS

- [ ] **Step 3: Run the broader note-records verification set**

Run:

```bash
node --check web/app.js
node --test test/note-records-store.test.js \
  test/success-samples-store.test.js \
  test/success-samples-api.test.js \
  test/note-lifecycle-api.test.js \
  test/sample-library-api.test.js \
  test/style-profile.test.js \
  test/generation-api.test.js \
  test/sample-weight.test.js \
  test/success-generation-ui.test.js \
  test/readme-doc-links.test.js
```

Expected: PASS

- [ ] **Step 4: Commit the docs and verification pass**

```bash
git add README.md test/readme-doc-links.test.js
git commit -m "docs: describe focused sample library workflow"
```

## Self-Review

### Spec coverage

- One primary creation entry point: Task 1 + Task 4
- List-first layout: Task 1 + Task 4
- Reference/lifecycle as attributes on one record: Task 2 + Task 4
- Backend deduplication of compatibility scaffolding: Task 2
- Frontend deduplication of sample-library rendering/state: Task 3
- Style-profile remains secondary and still works: Task 4 + Task 5
- Compatibility APIs preserved: Task 2 + Task 5

### Placeholder scan

- No `TODO` / `TBD`
- Every task contains exact file paths, commands, and concrete code snippets
- Verification commands are explicit

### Type consistency

- Canonical UI route is consistently `/api/sample-library`
- Frontend state consistently uses `sampleLibraryRecords`, `selectedSampleLibraryRecordId`, `sampleLibraryFilter`, `sampleLibrarySearch`
- Detail sections are consistently `sample-library-base-section`, `sample-library-reference-section`, `sample-library-lifecycle-section`
