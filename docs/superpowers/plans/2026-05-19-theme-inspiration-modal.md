# Theme Inspiration Modal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a generation-workbench `主题灵感` modal that automatically turns high-performing published content into high-contrast, discussion-worthy inspiration angle cards and supports one-click prefill into the existing new-content form.

**Architecture:** Reuse the existing note-record/sample-library data and generation-workbench UI patterns. The backend will derive high-performing published records, cluster them with lightweight keyword grouping, use the existing JSON text-model flow to refine each cluster into a parent theme plus expansion angles, then flatten those angles into first-level inspiration angle cards. The frontend will expose a modal entry button near the current generation workbench controls, auto-load the latest cards, render a calm dual-pane modal, and prefill the existing form when a card is applied.

**Tech Stack:** Vanilla JavaScript frontend, Node.js HTTP server, existing data-store/sample-library helpers, existing generation-workbench + routed text-model JSON helpers, `node:test`

---

## File Structure

- Create: `src/theme-inspirations.js`
  - Select high-performing published records, build rough clusters, summarize clusters into parent themes, flatten expansion angles into normalized first-level inspiration cards, and expose prefill-ready payloads.
- Modify: `src/server.js`
  - Add `POST /api/generate-theme-inspirations` and wire it to the new service.
- Modify: `src/generation-workbench.js`
  - Reuse normalization helpers if needed for prefill-safe text handling, but keep theme logic in the new service file.
- Modify: `web/index.html`
  - Add the `主题灵感` button and modal shell near the generation workbench.
- Modify: `web/app.js`
  - Add modal state, fetch/load behavior, rendering, card selection/detail behavior, and one-click form prefill.
- Modify: `web/styles.css`
  - Add clean modal layout, light filter pills, theme-card list styling, and detail-pane styling.
- Create: `test/theme-inspirations.test.js`
  - Unit-test source selection, clustering, AI-card normalization, and prefill field generation.
- Modify: `test/generation-api.test.js`
  - Verify the new route returns normalized theme cards and model trace.
- Modify: `test/success-generation-ui.test.js`
  - Lock in the modal entry, loading/empty states, dual-pane card rendering, and prefill-on-apply behavior.

## Task 1: Build backend theme-inspiration aggregation

**Files:**
- Create: `src/theme-inspirations.js`
- Create: `test/theme-inspirations.test.js`

- [ ] **Step 1: Write the failing backend tests**

Add `test/theme-inspirations.test.js` with coverage for:

```js
import test from "node:test";
import assert from "node:assert/strict";

import {
  collectThemeInspirationSourceRecords,
  buildThemeInspirationClusters,
  normalizeThemeInspirationItems
} from "../src/theme-inspirations.js";

test("collectThemeInspirationSourceRecords keeps only high-performing published records", () => {
  const items = collectThemeInspirationSourceRecords([
    {
      id: "keep-1",
      note: { title: "自慰后空虚", body: "正文 A", tags: ["身体探索"] },
      publish: { status: "published_passed", metrics: { likes: 60, favorites: 30, comments: 12, views: 3500, shares: 25 } }
    },
    {
      id: "drop-unpublished",
      note: { title: "未发布", body: "正文 B", tags: ["科普"] },
      publish: { status: "not_published", metrics: { likes: 999 } }
    }
  ]);

  assert.deepEqual(items.map((item) => item.id), ["keep-1"]);
});

test("buildThemeInspirationClusters groups records by shared topic signals", () => {
  const clusters = buildThemeInspirationClusters([
    {
      id: "a",
      note: { title: "自慰后空虚是不是异常", body: "空虚 失落 正常性", tags: ["身体探索", "情绪反应"], collectionType: "科普" },
      publish: { status: "published_passed", metrics: { likes: 60, favorites: 30, comments: 12, views: 3500, shares: 25 } }
    },
    {
      id: "b",
      note: { title: "为什么结束后会失落", body: "自慰后情绪 失落 空虚", tags: ["身体探索"], collectionType: "科普" },
      publish: { status: "positive_performance", metrics: { likes: 90, favorites: 40, comments: 20, views: 5000, shares: 35 } }
    }
  ]);

  assert.equal(clusters.length, 1);
  assert.deepEqual(clusters[0].recordIds, ["a", "b"]);
});

test("normalizeThemeInspirationItems keeps display fields and prefill fields", () => {
  const items = normalizeThemeInspirationItems([
    {
      themeTitle: "自慰后空虚并不一定异常",
      hookAngle: "很多人以为这是问题，其实很常见。",
      whyNow: "这个主题兼具反差和科普价值。",
      discussionSignal: "多个高表现内容都反复命中。",
      sourceSignals: ["命中 2 条高表现内容"],
      expandAngles: ["从激素变化讲", "从羞耻感讲"],
      boundaryNotes: ["避免病理化表达"],
      confidenceScore: 0.92,
      tags: ["身体探索", "情绪反应"],
      prefillBriefing: "写一篇轻松科普，解释自慰后空虚为什么不一定异常。",
      prefillReferenceTitle: "为什么结束后会突然很空？",
      prefillMaterialText: "关键点：常见、正常、可自我接纳。"
    }
  ]);

  assert.equal(items.length, 1);
  assert.equal(items[0].themeTitle, "自慰后空虚并不一定异常");
  assert.equal(items[0].prefillBriefing, "写一篇轻松科普，解释自慰后空虚为什么不一定异常。");
});
```

- [ ] **Step 2: Run the backend tests to verify they fail**

Run: `node --test test/theme-inspirations.test.js`

Expected: FAIL with missing `src/theme-inspirations.js` exports.

- [ ] **Step 3: Implement the minimal theme-inspiration backend service**

Create `src/theme-inspirations.js` with these focused responsibilities:

```js
function isHighPerformingPublishedRecord(record = {}) {
  const status = String(record?.publish?.status || "").trim();
  const metrics = record?.publish?.metrics || {};

  if (!["published_passed", "positive_performance"].includes(status)) {
    return false;
  }

  return (
    Number(metrics.likes || 0) >= 30 ||
    Number(metrics.favorites || 0) >= 20 ||
    Number(metrics.comments || 0) >= 10 ||
    Number(metrics.shares || 0) >= 20 ||
    Number(metrics.views || 0) >= 2000
  );
}

export function collectThemeInspirationSourceRecords(records = []) {
  return (Array.isArray(records) ? records : []).filter(isHighPerformingPublishedRecord);
}

function extractClusterTerms(record = {}) {
  const note = record?.note || {};
  return [
    String(note.title || ""),
    ...(Array.isArray(note.tags) ? note.tags : []),
    String(note.collectionType || ""),
    String(note.body || "").slice(0, 200)
  ]
    .join(" ")
    .toLowerCase();
}

export function buildThemeInspirationClusters(records = []) {
  const source = collectThemeInspirationSourceRecords(records);
  const clusters = [];

  for (const record of source) {
    const terms = extractClusterTerms(record);
    const existing = clusters.find((cluster) =>
      cluster.signatureTerms.some((term) => terms.includes(term)) ||
      cluster.recordTerms.some((term) => term && terms.includes(term))
    );

    if (existing) {
      existing.records.push(record);
      existing.recordIds.push(record.id);
      existing.recordTerms.push(terms);
      continue;
    }

    clusters.push({
      id: `cluster-${clusters.length + 1}`,
      records: [record],
      recordIds: [record.id],
      recordTerms: [terms],
      signatureTerms: (Array.isArray(record?.note?.tags) ? record.note.tags : []).slice(0, 3)
    });
  }

  return clusters;
}

export function normalizeThemeInspirationItems(items = []) {
  return (Array.isArray(items) ? items : [])
    .filter((item) => item && typeof item === "object")
    .map((item, index) => ({
      themeId: String(item.themeId || `theme-${index + 1}`).trim(),
      themeTitle: String(item.themeTitle || "").trim(),
      hookAngle: String(item.hookAngle || "").trim(),
      whyNow: String(item.whyNow || "").trim(),
      discussionSignal: String(item.discussionSignal || "").trim(),
      sourceSignals: Array.isArray(item.sourceSignals) ? item.sourceSignals.map((value) => String(value || "").trim()).filter(Boolean) : [],
      expandAngles: Array.isArray(item.expandAngles) ? item.expandAngles.map((value) => String(value || "").trim()).filter(Boolean) : [],
      boundaryNotes: Array.isArray(item.boundaryNotes) ? item.boundaryNotes.map((value) => String(value || "").trim()).filter(Boolean) : [],
      confidenceScore: Number(item.confidenceScore || 0),
      tags: Array.isArray(item.tags) ? item.tags.map((value) => String(value || "").trim()).filter(Boolean) : [],
      prefillBriefing: String(item.prefillBriefing || "").trim(),
      prefillReferenceTitle: String(item.prefillReferenceTitle || "").trim(),
      prefillMaterialText: String(item.prefillMaterialText || "").trim(),
      prefillCollectionType: String(item.prefillCollectionType || "科普").trim(),
      prefillTone: String(item.prefillTone || "温和").trim()
    }))
    .filter((item) => item.themeTitle && item.prefillBriefing)
    .slice(0, 12);
}
```

- [ ] **Step 4: Run the backend tests to verify they pass**

Run: `node --test test/theme-inspirations.test.js`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/theme-inspirations.js test/theme-inspirations.test.js
git commit -m "feat: add theme inspiration backend service"
```

## Task 2: Expose theme-inspiration generation through the server

**Files:**
- Modify: `src/server.js`
- Test: `test/generation-api.test.js`

- [ ] **Step 1: Write the failing route test**

Add a route-level test to `test/generation-api.test.js`:

```js
test("theme inspiration endpoint returns normalized cards from high-performing published content", async (t) => {
  await withTempGenerationData(t, async () => {
    const result = await invokeRoute("POST", "/api/generate-theme-inspirations", {
      mockThemeInspirations: [
        {
          themeTitle: "自慰后空虚并不一定异常",
          hookAngle: "很多人以为这是问题，其实很常见。",
          whyNow: "这个主题兼具反差和科普价值。",
          discussionSignal: "多个高表现内容都反复命中。",
          sourceSignals: ["命中 2 条高表现内容"],
          expandAngles: ["从激素变化讲", "从羞耻感讲"],
          boundaryNotes: ["避免病理化表达"],
          confidenceScore: 0.92,
          tags: ["身体探索", "情绪反应"],
          prefillBriefing: "写一篇轻松科普，解释自慰后空虚为什么不一定异常。",
          prefillReferenceTitle: "为什么结束后会突然很空？",
          prefillMaterialText: "关键点：常见、正常、可自我接纳。"
        }
      ]
    });

    assert.equal(result.status, 200);
    assert.equal(result.ok, true);
    assert.equal(result.items.length, 1);
    assert.equal(result.items[0].themeTitle, "自慰后空虚并不一定异常");
  });
});
```

- [ ] **Step 2: Run the route test to verify it fails**

Run: `node --test test/generation-api.test.js`

Expected: FAIL with missing `/api/generate-theme-inspirations`.

- [ ] **Step 3: Implement the route**

In `src/server.js`, import the new service and add a route:

```js
import {
  buildThemeInspirationClusters,
  collectThemeInspirationSourceRecords,
  normalizeThemeInspirationItems,
  summarizeThemeInspirationClusters
} from "./theme-inspirations.js";
```

Add:

```js
if (request.method === "POST" && url.pathname === "/api/generate-theme-inspirations") {
  const payload = await readBody(request);

  if (Array.isArray(payload?.mockThemeInspirations)) {
    return sendJson(response, 200, {
      ok: true,
      items: normalizeThemeInspirationItems(payload.mockThemeInspirations),
      generatedAt: new Date().toISOString(),
      modelTrace: {
        provider: "mock",
        model: "mock-theme-inspirations"
      }
    });
  }

  const records = await loadNoteRecords();
  const clusters = buildThemeInspirationClusters(records);
  const items = await summarizeThemeInspirationClusters({
    clusters,
    referenceSamples: buildGenerationReferenceSamples({
      successSamples: await loadQualifiedReferenceSamples(),
      noteLifecycle: await loadNoteLifecycle()
    })
  });

  return sendJson(response, 200, {
    ok: true,
    items: normalizeThemeInspirationItems(items),
    generatedAt: new Date().toISOString(),
    modelTrace: {
      provider: "generation",
      model: "theme-inspiration"
    }
  });
}
```

If the summarizer helper is not ready in this task, return an empty normalized array first and wire the real summarizer in Task 4.

- [ ] **Step 4: Run the route test to verify it passes**

Run: `node --test test/generation-api.test.js`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/server.js test/generation-api.test.js
git commit -m "feat: expose theme inspiration api"
```

## Task 3: Add the modal entry and shell in the generation workbench

**Files:**
- Modify: `web/index.html`
- Modify: `web/styles.css`
- Test: `test/success-generation-ui.test.js`

- [ ] **Step 1: Write the failing frontend shell test**

Extend `test/success-generation-ui.test.js`:

```js
test("frontend exposes theme inspiration modal entry beside generation workbench controls", async () => {
  const { indexHtml, appJs, styles } = await readFrontendFiles();

  assert.match(indexHtml, /id="generation-theme-inspiration-button"/);
  assert.match(indexHtml, /主题灵感/);
  assert.match(indexHtml, /id="generation-theme-inspiration-modal"/);
  assert.match(indexHtml, /id="generation-theme-inspiration-modal-content"/);
  assert.match(indexHtml, /id="generation-theme-inspiration-modal-detail"/);

  assert.match(appJs, /generationThemeInspiration:\s*\{/);
  assert.match(styles, /\.generation-theme-inspiration-modal\b/);
  assert.match(styles, /\.generation-theme-card\b/);
});
```

- [ ] **Step 2: Run the frontend shell test to verify it fails**

Run: `node --test test/success-generation-ui.test.js`

Expected: FAIL with missing `generation-theme-inspiration-button` or modal markers.

- [ ] **Step 3: Implement the modal shell**

In `web/index.html`, add the new button near the generation controls:

```html
<button type="button" class="button button-ghost button-small" id="generation-theme-inspiration-button">
  主题灵感
</button>
```

Add a modal shell near the existing generation reference search modal:

```html
<section id="generation-theme-inspiration-modal" class="generation-theme-inspiration-modal" hidden>
  <button
    type="button"
    class="generation-theme-inspiration-modal-overlay"
    data-action="close-generation-theme-inspiration-modal"
    aria-label="关闭主题灵感弹窗"
  ></button>
  <div class="generation-theme-inspiration-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="generation-theme-inspiration-modal-title">
    <header class="generation-theme-inspiration-modal-header">
      <div>
        <strong id="generation-theme-inspiration-modal-title">主题灵感</strong>
        <p>基于高表现已发布内容自动整理值得继续写的新主题。</p>
      </div>
      <div class="item-actions">
        <button type="button" class="button button-ghost button-small" data-action="refresh-generation-theme-inspiration">刷新灵感</button>
        <button type="button" class="button button-ghost button-small" data-action="close-generation-theme-inspiration-modal">关闭</button>
      </div>
    </header>
    <div class="generation-theme-inspiration-modal-body">
      <div id="generation-theme-inspiration-modal-content" class="generation-theme-inspiration-modal-content"></div>
      <aside id="generation-theme-inspiration-modal-detail" class="generation-theme-inspiration-modal-detail"></aside>
    </div>
  </div>
</section>
```

Add calm modal styles to `web/styles.css`:

```css
.generation-theme-inspiration-modal { ... }
.generation-theme-inspiration-modal-dialog { ... }
.generation-theme-inspiration-modal-body {
  display: grid;
  grid-template-columns: minmax(0, 0.95fr) minmax(320px, 0.75fr);
  gap: 1rem;
}
.generation-theme-card { ... }
```

- [ ] **Step 4: Run the frontend shell test to verify it passes**

Run: `node --test test/success-generation-ui.test.js`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add web/index.html web/styles.css test/success-generation-ui.test.js
git commit -m "feat: add theme inspiration modal shell"
```

## Task 4: Implement modal loading, rendering, and one-click prefill

**Files:**
- Modify: `web/app.js`
- Modify: `test/success-generation-ui.test.js`
- Modify: `src/theme-inspirations.js`

- [ ] **Step 1: Write the failing interaction tests**

Add frontend interaction coverage:

```js
test("theme inspiration modal auto-loads and prefills generation form from a selected card", async () => {
  // Expect: modal opens immediately, loads items, selecting a card updates detail,
  // and apply writes existing visible generation-form fields plus material text.
});
```

The test should verify:

- modal opens before async request resolves
- loading copy appears
- returned cards render in the list
- clicking a card updates the right detail pane
- applying the selected card writes into generation form fields
- applying closes the modal and shows a success message

- [ ] **Step 2: Run the interaction tests to verify they fail**

Run: `node --test test/success-generation-ui.test.js`

Expected: FAIL with missing `generationThemeInspiration` state or handlers.

- [ ] **Step 3: Implement minimal frontend state and fetch flow**

In `web/app.js`, add state:

```js
generationThemeInspiration: {
  open: false,
  loading: false,
  items: [],
  selectedId: "",
  generatedAt: "",
  message: ""
},
```

Add modal helpers:

```js
function setGenerationThemeInspirationModalOpen(isOpen) { ... }
function closeGenerationThemeInspirationModal() { ... }
function getSelectedGenerationThemeInspirationItem() { ... }
function renderGenerationThemeInspirationModal() { ... }
async function openGenerationThemeInspirationModal({ forceRefresh = false } = {}) { ... }
function applyGenerationThemeInspirationItem(item = {}) { ... }
```

Behavior:

- first open: `open=true`, `loading=true`, render loading, call `/api/generate-theme-inspirations`
- later open without force refresh: show current cached items
- `刷新灵感`: rerun request
- select card: update `selectedId`, rerender detail pane only or rerender the modal
- apply card:
  - set existing visible generation-form fields such as `briefing`, `referenceTitle`, `collectionType`, and `tagReferences` where appropriate
  - append `prefillMaterialText` into `materialText`
  - close modal
  - set a result hint like `已将主题灵感回填到新内容表单。`

Use conservative overwrite behavior:

- overwrite empty visible fields directly
- for existing non-empty visible fields in first version, prefer leaving the current user input untouched
- for `materialText`, always append using the existing helper

In `src/theme-inspirations.js`, add a first usable summarizer that turns each cluster into a prompt for the existing JSON model flow. Keep it simple and normalize after generation.

- [ ] **Step 4: Run the interaction tests to verify they pass**

Run: `node --test test/success-generation-ui.test.js`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add web/app.js src/theme-inspirations.js test/success-generation-ui.test.js
git commit -m "feat: wire theme inspiration modal and form prefill"
```

## Task 5: Refine AI prompt quality and theme deduping

**Files:**
- Modify: `src/theme-inspirations.js`
- Test: `test/theme-inspirations.test.js`

- [ ] **Step 1: Write the failing quality test**

Add a test that rejects generic cards and deduplicates repeated theme titles:

```js
test("normalizeThemeInspirationItems drops generic or duplicate theme cards", () => {
  const items = normalizeThemeInspirationItems([
    {
      themeTitle: "身体探索",
      prefillBriefing: "写身体探索"
    },
    {
      themeTitle: "自慰后空虚并不一定异常",
      hookAngle: "很多人以为这是问题，其实很常见。",
      prefillBriefing: "写一篇轻松科普，解释自慰后空虚为什么不一定异常。"
    },
    {
      themeTitle: "自慰后空虚并不一定异常",
      hookAngle: "很多人以为这是问题，其实很常见。",
      prefillBriefing: "写一篇轻松科普，解释自慰后空虚为什么不一定异常。"
    }
  ]);

  assert.equal(items.length, 1);
});
```

- [ ] **Step 2: Run the quality test to verify it fails**

Run: `node --test test/theme-inspirations.test.js`

Expected: FAIL because generic/duplicate items still survive.

- [ ] **Step 3: Implement minimal quality filtering**

In `src/theme-inspirations.js`, add:

- generic-title filtering (`身体探索`, `两性科普`, `情绪问题`-style broad buckets)
- duplicate suppression across `themeTitle` and `prefillBriefing`
- optional confidence sorting

- [ ] **Step 4: Run the quality test to verify it passes**

Run: `node --test test/theme-inspirations.test.js`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/theme-inspirations.js test/theme-inspirations.test.js
git commit -m "feat: refine theme inspiration quality filtering"
```

## Self-Review

- Spec coverage:
  - modal entry + auto-load: Task 3 and Task 4
  - high-performing published-source selection: Task 1
  - keyword-first clustering + AI theme refinement: Task 1 and Task 4
  - high-contrast/high-discussion card quality: Task 5
  - one-click prefill into generation form: Task 4
- Placeholder scan:
  - No `TBD` / `TODO` placeholders remain in task steps.
- Type consistency:
  - `generationThemeInspiration` is used consistently for frontend modal state.
  - `themeId`, `themeTitle`, `prefillBriefing`, `prefillReferenceTitle`, and `prefillMaterialText` are used consistently across route, frontend, and tests.
