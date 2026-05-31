# XHS Top Signals Browser Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a standalone `同类爆文专区` block below the content workbench that independently loads and browses same-track top signals with account auto-match, manual filters, manual refresh, category tabs, quick actions, and expandable detail.

**Architecture:** Reuse the existing same-track signal ranking/fetch logic behind a new standalone cache and API so the browser does not depend on account diagnosis state. Add a dedicated frontend state slice and page block under the main workbench, with honest error handling and no fallback cards.

**Tech Stack:** Node.js ESM, existing local HTTP server, vanilla frontend modules, Node test runner

---

## File Map

- Modify: `src/config.js`
  Add dedicated cache path for the top-signals browser.
- Modify: `src/data-store.js`
  Add load/save helpers for the standalone browser cache.
- Modify: `src/server.js`
  Add standalone GET/POST APIs for the browser and wire cache usage.
- Reuse / possibly lightly modify: `src/xhs-top-signals.js`
  Keep ranking/fetch logic centralized and reusable by the new API.
- Modify: `web/index.html`
  Add a new standalone block below the main content workbench.
- Modify: `web/app.js`
  Add browser state, refresh logic, filtering, selection, cache hydration, and quick actions.
- Create: `web/xhs-top-signals-view.js`
  Isolate rendering for the new browser block, list cards, filters, and detail view.
- Modify: `web/styles.css`
  Style the new block so it looks like an independent browsing area, not a reused modal fragment.
- Modify: `README.md`
  Document the new block and standalone API/cache.
- Modify: `SYSTEM_FLOW.md`
  Add the standalone discovery block to the product flow.
- Test: `test/xhs-top-signals-browser.test.js`
  New backend/store/api coverage.
- Test: `test/xhs-top-signals-browser-ui.test.js`
  New UI structure/rendering/interaction coverage.
- Modify: `test/account-planner-ui.test.js`
  Keep existing diagnosis-related top-signal behavior compatible where shared helpers are reused.

---

### Task 1: Add standalone top-signals cache storage

**Files:**
- Modify: `src/config.js`
- Modify: `src/data-store.js`
- Test: `test/xhs-top-signals-browser.test.js`

- [ ] **Step 1: Write the failing storage test**

```js
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { paths } from "../src/config.js";
import { loadXhsTopSignalsBrowser, saveXhsTopSignalsBrowser } from "../src/data-store.js";

test("xhs top-signals browser store saves and loads the latest standalone cache", async (t) => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "xhs-top-signals-store-"));
  const originals = { xhsTopSignals: paths.xhsTopSignals };
  paths.xhsTopSignals = path.join(tempDir, "xhs-top-signals.json");

  t.after(async () => {
    Object.assign(paths, originals);
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  await saveXhsTopSignalsBrowser({
    accountContext: { redId: "26112666886", nickname: "测试号", derivedTrack: "情感", derivedTags: ["关系沟通"] },
    filters: { track: "情感", keyword: "边界", tags: ["关系沟通"] },
    items: { dailyTop: [{ id: "daily-1", title: "今日样本" }], weeklyTop: [], lowTop: [] },
    generatedAt: "2026-05-30T10:00:00.000Z",
    resultCount: 1
  });

  const loaded = await loadXhsTopSignalsBrowser();
  assert.equal(loaded.accountContext.redId, "26112666886");
  assert.equal(loaded.filters.keyword, "边界");
  assert.equal(loaded.items.dailyTop[0].title, "今日样本");
  assert.equal(loaded.resultCount, 1);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/xhs-top-signals-browser.test.js`
Expected: FAIL with missing `paths.xhsTopSignals` and/or missing `loadXhsTopSignalsBrowser` export.

- [ ] **Step 3: Add config path and store helpers**

```js
// src/config.js
xhsTopSignals: path.join(dataDir, "xhs-top-signals.json"),
```

```js
// src/data-store.js
function sanitizeXhsTopSignalsBrowserState(input = {}) {
  const accountContext = input?.accountContext && typeof input.accountContext === "object" ? input.accountContext : {};
  const filters = input?.filters && typeof input.filters === "object" ? input.filters : {};
  const items = input?.items && typeof input.items === "object" ? input.items : {};

  return {
    accountContext: {
      redId: String(accountContext.redId || "").trim(),
      nickname: String(accountContext.nickname || "").trim(),
      derivedTrack: String(accountContext.derivedTrack || "").trim(),
      derivedTags: Array.isArray(accountContext.derivedTags) ? accountContext.derivedTags.map((item) => String(item || "").trim()).filter(Boolean) : []
    },
    filters: {
      track: String(filters.track || "").trim(),
      keyword: String(filters.keyword || "").trim(),
      tags: Array.isArray(filters.tags) ? filters.tags.map((item) => String(item || "").trim()).filter(Boolean) : []
    },
    items: {
      dailyTop: Array.isArray(items.dailyTop) ? items.dailyTop : [],
      weeklyTop: Array.isArray(items.weeklyTop) ? items.weeklyTop : [],
      lowTop: Array.isArray(items.lowTop) ? items.lowTop : []
    },
    generatedAt: String(input.generatedAt || "").trim(),
    resultCount: Number(input.resultCount || 0) || 0
  };
}

export async function loadXhsTopSignalsBrowser() {
  return sanitizeXhsTopSignalsBrowserState(await readJson(paths.xhsTopSignals, {}));
}

export async function saveXhsTopSignalsBrowser(state = {}) {
  const normalized = sanitizeXhsTopSignalsBrowserState(state);
  await writeJson(paths.xhsTopSignals, normalized);
  return normalized;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/xhs-top-signals-browser.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/config.js src/data-store.js test/xhs-top-signals-browser.test.js
git commit -m "feat: add top signals browser cache store"
```

### Task 2: Add standalone top-signals browser API

**Files:**
- Modify: `src/server.js`
- Reuse / lightly modify: `src/xhs-top-signals.js`
- Test: `test/xhs-top-signals-browser.test.js`

- [ ] **Step 1: Write the failing API tests**

```js
test("xhs top-signals browser POST refreshes standalone signals without diagnosis dependency", async (t) => {
  await withTempTopSignalsApi(t, async ({ invokeRoute }) => {
    const result = await invokeRoute("POST", "/api/xhs/top-signals", {
      redId: "26112666886",
      track: "情感",
      keyword: "边界",
      tags: ["关系沟通"]
    });

    assert.equal(result.status, 200);
    assert.equal(result.ok, true);
    assert.equal(Array.isArray(result.items.dailyTop), true);
    assert.equal(typeof result.generatedAt, "string");
  });
});

test("xhs top-signals browser GET returns the latest cached standalone signals", async (t) => {
  await withTempTopSignalsApi(t, async ({ invokeRoute, saveBrowserState }) => {
    await saveBrowserState({
      accountContext: { redId: "26112666886" },
      filters: { track: "情感", keyword: "边界", tags: [] },
      items: { dailyTop: [{ id: "daily-1", title: "今日样本" }], weeklyTop: [], lowTop: [] },
      generatedAt: "2026-05-30T10:00:00.000Z",
      resultCount: 1
    });

    const result = await invokeRoute("GET", "/api/xhs/top-signals");
    assert.equal(result.status, 200);
    assert.equal(result.items.dailyTop[0].title, "今日样本");
  });
});

test("xhs top-signals browser returns refresh errors directly with no fallback cards", async (t) => {
  await withTempTopSignalsApi(t, async ({ invokeRoute }) => {
    const result = await invokeRoute("POST", "/api/xhs/top-signals", {
      redId: "26112666886",
      mockTopSignalsError: "抓取失败"
    });

    assert.equal(result.status, 500);
    assert.equal(result.ok, false);
    assert.match(result.error || "", /抓取失败/);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test test/xhs-top-signals-browser.test.js`
Expected: FAIL with 404 route or missing helper errors.

- [ ] **Step 3: Implement standalone GET/POST API**

```js
// src/server.js
if (request.method === "POST" && url.pathname === "/api/xhs/top-signals") {
  const payload = await readBody(request, { maxBytes: 256 * 1024 });
  const redId = String(payload?.redId || "").trim();
  const track = String(payload?.track || "").trim();
  const keyword = String(payload?.keyword || "").trim();
  const tags = Array.isArray(payload?.tags) ? payload.tags : [];

  if (!redId && !track && !keyword && !tags.length) {
    return sendJson(response, 400, { ok: false, error: "请先提供账号或至少一项筛选条件。" });
  }

  const result = payload?.mockTopSignalsError
    ? (() => {
        throw new Error(String(payload.mockTopSignalsError || "同类爆文抓取失败"));
      })()
    : await fetchTopSignalsBrowserResult({ redId, track, keyword, tags });

  const saved = await saveXhsTopSignalsBrowser(result);
  return sendJson(response, 200, { ok: true, ...saved });
}

if (request.method === "GET" && url.pathname === "/api/xhs/top-signals") {
  const saved = await loadXhsTopSignalsBrowser();
  return sendJson(response, 200, { ok: true, ...saved });
}
```

```js
// src/server.js helper sketch
async function fetchTopSignalsBrowserResult({ redId = "", track = "", keyword = "", tags = [] } = {}) {
  const items = await fetchStandaloneTopSignals({ redId, track, keyword, tags });
  const resultCount = [...items.dailyTop, ...items.weeklyTop, ...items.lowTop].length;

  return {
    accountContext: {
      redId,
      nickname: "",
      derivedTrack: track,
      derivedTags: tags
    },
    filters: { track, keyword, tags },
    items,
    generatedAt: new Date().toISOString(),
    resultCount
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test test/xhs-top-signals-browser.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/server.js src/xhs-top-signals.js test/xhs-top-signals-browser.test.js
git commit -m "feat: add standalone top signals browser api"
```

### Task 3: Render the standalone browser block below the content workbench

**Files:**
- Modify: `web/index.html`
- Create: `web/xhs-top-signals-view.js`
- Modify: `web/styles.css`
- Test: `test/xhs-top-signals-browser-ui.test.js`

- [ ] **Step 1: Write the failing UI structure test**

```js
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

test("top signals browser block sits below the content workbench as a standalone section", async () => {
  const [indexHtml, appJs, styles] = await Promise.all([
    fs.readFile(path.join(process.cwd(), "web/index.html"), "utf8"),
    fs.readFile(path.join(process.cwd(), "web/app.js"), "utf8"),
    fs.readFile(path.join(process.cwd(), "web/styles.css"), "utf8")
  ]);

  assert.match(indexHtml, /id="xhs-top-signals-panel"/);
  assert.match(indexHtml, /id="xhs-top-signals-refresh"/);
  assert.match(indexHtml, /data-xhs-top-signals-filter="daily"/);
  assert.match(indexHtml, /data-xhs-top-signals-filter="weekly"/);
  assert.match(indexHtml, /data-xhs-top-signals-filter="low"/);
  assert.match(appJs, /from "\.\/xhs-top-signals-view\.js"/);
  assert.match(styles, /\.xhs-top-signals-panel/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/xhs-top-signals-browser-ui.test.js`
Expected: FAIL because the block and view module do not exist.

- [ ] **Step 3: Add markup, rendering module, and styles**

```html
<!-- web/index.html -->
<section id="xhs-top-signals-panel" class="panel xhs-top-signals-panel">
  <div class="tab-panel-head">
    <strong>同类爆文专区</strong>
    <span>默认按账号自动匹配，也可手动改筛选。</span>
  </div>
  <div class="xhs-top-signals-toolbar">
    <input id="xhs-top-signals-red-id" placeholder="输入小红书号" />
    <input id="xhs-top-signals-track" placeholder="手动赛道，如 情感" />
    <input id="xhs-top-signals-keyword" placeholder="关键词，如 边界" />
    <input id="xhs-top-signals-tags" placeholder="标签，逗号分隔" />
    <button type="button" class="button" id="xhs-top-signals-refresh">手动刷新</button>
  </div>
  <div class="tab-strip" role="tablist" aria-label="同类爆文筛选">
    <button type="button" data-xhs-top-signals-filter="all">全部</button>
    <button type="button" data-xhs-top-signals-filter="daily">今日</button>
    <button type="button" data-xhs-top-signals-filter="weekly">7日</button>
    <button type="button" data-xhs-top-signals-filter="low">低粉爆文</button>
  </div>
  <div id="xhs-top-signals-status" class="helper-text">等待刷新</div>
  <div id="xhs-top-signals-list" class="xhs-top-signals-list"></div>
  <aside id="xhs-top-signals-detail" class="xhs-top-signals-detail"></aside>
</section>
```

```js
// web/xhs-top-signals-view.js
export function renderXhsTopSignalsPanel(state = {}, helpers = {}) {
  const { byId, escapeHtml } = helpers;
  const listNode = byId?.("xhs-top-signals-list");
  const detailNode = byId?.("xhs-top-signals-detail");
  const statusNode = byId?.("xhs-top-signals-status");
  if (!listNode || !detailNode || !statusNode) return;

  const activeFilter = String(state.activeFilter || "all").trim();
  const items = buildVisibleTopSignals(state, activeFilter);
  statusNode.innerHTML = escapeHtml(state.message || `结果 ${items.length} 条`);

  listNode.innerHTML = items.length
    ? items.map((item) => `
      <article class="xhs-top-signals-card${String(state.selectedSignalId || "") === String(item.id || "") ? " is-selected" : ""}">
        <button type="button" class="xhs-top-signals-card-button" data-action="select-xhs-top-signal" data-signal-id="${escapeHtml(item.id || "")}">
          <div class="meta-row"><span class="meta-pill">${escapeHtml(item.sourceTypeLabel || "同类爆文")}</span></div>
          <strong>${escapeHtml(item.title || "未命名样本")}</strong>
          <p>${escapeHtml(item.author || "未知作者")} · ${escapeHtml(item.track || "")}</p>
          <p>${escapeHtml(item.analysis?.whySelected || item.analysis?.reuseHint || "可作为参考。")}</p>
        </button>
        <div class="item-actions">
          <button type="button" class="button button-ghost button-small" data-action="save-xhs-top-signal-external-sample" data-signal-id="${escapeHtml(item.id || "")}">加入外部参考样本</button>
          <button type="button" class="button button-ghost button-small" data-action="save-xhs-top-signal-draft-idea" data-signal-id="${escapeHtml(item.id || "")}">生成灵感草稿</button>
        </div>
      </article>
    `).join("")
    : '<div class="result-card muted">当前筛选下还没有可展示的同类爆文。</div>';

  const selected = items.find((item) => String(item.id || "") === String(state.selectedSignalId || "")) || items[0] || null;
  detailNode.innerHTML = selected
    ? `
      <article class="result-card-shell">
        <strong>${escapeHtml(selected.title || "未命名样本")}</strong>
        <p>${escapeHtml(selected.analysis?.whySelected || "")}</p>
        <p>${escapeHtml(selected.analysis?.reuseHint || "")}</p>
        ${selected.workUrl ? `<a href="${escapeHtml(selected.workUrl)}" target="_blank" rel="noreferrer">查看原文</a>` : ""}
      </article>
    `
    : '<div class="result-card muted">选择一条爆文后，这里会显示展开详情。</div>';
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/xhs-top-signals-browser-ui.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add web/index.html web/xhs-top-signals-view.js web/styles.css test/xhs-top-signals-browser-ui.test.js
git commit -m "feat: add standalone top signals browser block"
```

### Task 4: Wire frontend state, refresh, filters, and cache hydration

**Files:**
- Modify: `web/app.js`
- Create / reuse: `web/xhs-top-signals-view.js`
- Test: `test/xhs-top-signals-browser-ui.test.js`

- [ ] **Step 1: Write the failing interaction tests**

```js
test("top signals browser app state can load cached results and switch category filters", async () => {
  const appJs = await fs.readFile(path.join(process.cwd(), "web/app.js"), "utf8");
  assert.match(appJs, /const xhsTopSignalsApi = "\/api\/xhs\/top-signals"/);
  assert.match(appJs, /activeFilter:\s*"all"/);
  assert.match(appJs, /refreshXhsTopSignalsState/);
  assert.match(appJs, /select-xhs-top-signal/);
});

test("top signals browser keeps refresh explicit and surfaces fetch errors directly", async () => {
  const appJs = await fs.readFile(path.join(process.cwd(), "web/app.js"), "utf8");
  assert.match(appJs, /id="xhs-top-signals-refresh"/);
  assert.match(appJs, /message:\s*error\?\.message \|\| "同类爆文刷新失败"/);
  assert.doesNotMatch(appJs, /fallback cards/i);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test test/xhs-top-signals-browser-ui.test.js`
Expected: FAIL because the state slice and refresh handlers are missing.

- [ ] **Step 3: Implement frontend state and event flow**

```js
// web/app.js
const xhsTopSignalsApi = "/api/xhs/top-signals";

appState.xhsTopSignals = {
  loading: false,
  message: "",
  redId: "",
  track: "",
  keyword: "",
  tags: "",
  activeFilter: "all",
  items: { dailyTop: [], weeklyTop: [], lowTop: [] },
  generatedAt: "",
  selectedSignalId: ""
};

async function refreshXhsTopSignalsState({ useCache = false } = {}) {
  appState.xhsTopSignals = { ...appState.xhsTopSignals, loading: true, message: "" };
  syncXhsTopSignalsPanel();

  try {
    const response = useCache
      ? await apiJson(xhsTopSignalsApi)
      : await apiJson(xhsTopSignalsApi, {
          method: "POST",
          body: JSON.stringify(buildXhsTopSignalsRequestPayload())
        });

    appState.xhsTopSignals = {
      ...appState.xhsTopSignals,
      loading: false,
      message: response.generatedAt ? `已刷新 ${response.resultCount || 0} 条 · ${response.generatedAt}` : "",
      redId: response.accountContext?.redId || appState.xhsTopSignals.redId,
      track: response.filters?.track || "",
      keyword: response.filters?.keyword || "",
      tags: Array.isArray(response.filters?.tags) ? response.filters.tags.join(", ") : "",
      items: response.items || { dailyTop: [], weeklyTop: [], lowTop: [] },
      generatedAt: String(response.generatedAt || "").trim(),
      selectedSignalId: ""
    };
  } catch (error) {
    appState.xhsTopSignals = {
      ...appState.xhsTopSignals,
      loading: false,
      message: error?.message || "同类爆文刷新失败"
    };
  }

  syncXhsTopSignalsPanel();
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test test/xhs-top-signals-browser-ui.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add web/app.js web/xhs-top-signals-view.js test/xhs-top-signals-browser-ui.test.js
git commit -m "feat: wire top signals browser frontend state"
```

### Task 5: Reuse signal actions for external sample and draft idea flows

**Files:**
- Modify: `web/app.js`
- Possibly modify: `src/server.js`
- Test: `test/xhs-top-signals-browser-ui.test.js`

- [ ] **Step 1: Write the failing action tests**

```js
test("top signals browser exposes quick actions for external sample and draft idea flows", async () => {
  const appJs = await fs.readFile(path.join(process.cwd(), "web/app.js"), "utf8");
  assert.match(appJs, /save-xhs-top-signal-external-sample/);
  assert.match(appJs, /save-xhs-top-signal-draft-idea/);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test test/xhs-top-signals-browser-ui.test.js`
Expected: FAIL because the new action handlers do not exist.

- [ ] **Step 3: Implement action reuse**

```js
// web/app.js action sketch
if (action === "save-xhs-top-signal-external-sample") {
  await saveTopSignalAsExternalSample(signalId);
  return;
}

if (action === "save-xhs-top-signal-draft-idea") {
  await saveTopSignalAsDraftIdea(signalId);
  return;
}
```

Use the same serialization fields already used by matched-signal actions from diagnosis so the browser does not invent a second payload shape.

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test test/xhs-top-signals-browser-ui.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add web/app.js src/server.js test/xhs-top-signals-browser-ui.test.js
git commit -m "feat: connect top signals browser actions"
```

### Task 6: Update docs and final verification

**Files:**
- Modify: `README.md`
- Modify: `SYSTEM_FLOW.md`
- Test: `test/xhs-top-signals-browser.test.js`
- Test: `test/xhs-top-signals-browser-ui.test.js`
- Test: `test/account-planner-ui.test.js`
- Test: `test/generation-api.test.js`

- [ ] **Step 1: Document the new standalone block**

```md
- README.md:
  - add `同类爆文专区` to main product structure
  - mention standalone API/cache
  - explain that it does not depend on account diagnosis

- SYSTEM_FLOW.md:
  - add the new block under the main workbench
  - explain manual refresh and independent browsing role
```

- [ ] **Step 2: Run focused verification**

Run: `node --test test/xhs-top-signals-browser.test.js test/xhs-top-signals-browser-ui.test.js test/account-planner-ui.test.js test/generation-api.test.js`
Expected: PASS

- [ ] **Step 3: Run a manual browser sanity check**

Run: `npm run server`
Expected: local app starts and the new block renders below the content workbench.

Manual check:
- block is visible below the main workbench
- refresh button works
- filter tabs switch visible content
- quick actions are clickable
- error state shows real message with no fake cards

- [ ] **Step 4: Commit**

```bash
git add README.md SYSTEM_FLOW.md test/xhs-top-signals-browser.test.js test/xhs-top-signals-browser-ui.test.js test/account-planner-ui.test.js test/generation-api.test.js
git commit -m "docs: add top signals browser documentation"
```
