# Collection Type Unification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a required single-select `collectionType` field with shared predefined/custom options across detection, generation, sample-library, and benchmark flows, while slightly widening the UI and improving text visibility.

**Architecture:** Introduce one shared collection option source backed by a small JSON store plus `GET/POST /api/collection-types`, then thread `collectionType` through normalized payloads and record storage. On the frontend, load one shared option list, reuse it across forms and filters, and adjust shell/layout widths so the new field does not worsen crowding or truncation.

**Tech Stack:** Node.js, native test runner, existing `src/server.js` route handlers, `src/note-records.js` normalization, `web/index.html`, `web/app.js`, `web/styles.css`

---

## File Structure

- Create: `src/collection-types.js`
  - predefined collection list, merge/dedupe helpers, validation
- Modify: `src/config.js`
  - add `paths.collectionTypes`
- Modify: `src/data-store.js`
  - read/save collection-type options
- Modify: `src/note-records.js`
  - normalize/persist `collectionType`
- Modify: `src/generation-workbench.js`
  - include `collectionType` in generation prompt context
- Modify: `src/server.js`
  - add collection-type APIs and validate/persist `collectionType` in relevant routes
- Modify: `web/index.html`
  - add collection selectors, add-custom controls, and collection filters
- Modify: `web/app.js`
  - load shared options, render selectors/filters, submit `collectionType`, show collection labels, widen key flows
- Modify: `web/styles.css`
  - slightly widen shell/panels and improve flexible text handling for touched surfaces
- Create: `test/collection-types.test.js`
  - helper and normalization tests
- Create: `test/collection-types-api.test.js`
  - API coverage for `GET/POST /api/collection-types`
- Modify: `test/generation-api.test.js`
  - generation payload and prompt context coverage
- Modify: `test/sample-library-api.test.js`
  - sample-library persistence/validation coverage
- Modify: `test/benchmark-generation-ui.test.js`
  - benchmark UI selectors/filters coverage
- Modify: `test/success-generation-ui.test.js`
  - detection/sample-library/global layout presence and width assertions

### Task 1: Shared Collection Option Model

**Files:**
- Create: `src/collection-types.js`
- Modify: `src/config.js`
- Modify: `src/data-store.js`
- Test: `test/collection-types.test.js`

- [ ] **Step 1: Write the failing helper tests**

```js
import test from "node:test";
import assert from "node:assert/strict";

import {
  predefinedCollectionTypes,
  buildCollectionTypeOptions,
  normalizeCollectionType,
  assertValidCollectionType
} from "../src/collection-types.js";

test("collection type helpers merge predefined and custom options in stable order", () => {
  const options = buildCollectionTypeOptions(["自定义合集", "科普", " 自定义合集 "]);

  assert.deepEqual(options.slice(0, 3), [
    "SBTI内太空愉悦档案",
    "双人联机计划",
    "内太空放映室"
  ]);
  assert.equal(options.includes("科普"), true);
  assert.equal(options.includes("自定义合集"), true);
  assert.equal(options.filter((item) => item === "自定义合集").length, 1);
});

test("collection type validation trims and rejects unknown values", () => {
  const options = buildCollectionTypeOptions(["自定义合集"]);

  assert.equal(normalizeCollectionType(" 科普 "), "科普");
  assert.equal(assertValidCollectionType("自定义合集", options), "自定义合集");
  assert.throws(() => assertValidCollectionType("不存在的合集", options), /合集类型/);
});
```

- [ ] **Step 2: Run `node --test test/collection-types.test.js`**

Expected: fail because `src/collection-types.js` does not exist and the exports are missing.

- [ ] **Step 3: Write the minimal shared helper implementation**

```js
export const predefinedCollectionTypes = [
  "SBTI内太空愉悦档案",
  "双人联机计划",
  "内太空放映室",
  "脑洞+神评",
  "科普",
  "MBTI内太空愉悦档案",
  "疗愈指南",
  "身体探索",
  "伪装学大师",
  "造船手记"
];

export function normalizeCollectionType(value = "") {
  return String(value || "").trim();
}

export function buildCollectionTypeOptions(custom = []) {
  const seen = new Set();
  return [...predefinedCollectionTypes, ...(Array.isArray(custom) ? custom : [])]
    .map((item) => normalizeCollectionType(item))
    .filter((item) => {
      if (!item || seen.has(item)) return false;
      seen.add(item);
      return true;
    });
}

export function assertValidCollectionType(value = "", options = []) {
  const normalized = normalizeCollectionType(value);
  if (!normalized || !buildCollectionTypeOptions(options).includes(normalized)) {
    const error = new Error("合集类型无效或未选择。");
    error.statusCode = 400;
    throw error;
  }
  return normalized;
}
```

- [ ] **Step 4: Add config + store wiring**

```js
// src/config.js
collectionTypes: path.join(dataDir, "collection-types.json")

// src/data-store.js
export async function loadCollectionTypes() {
  const payload = await readJson(paths.collectionTypes, { custom: [] });
  return {
    custom: uniqueStrings(payload.custom || [])
  };
}

export async function saveCollectionTypes(value = {}) {
  return writeJson(paths.collectionTypes, {
    custom: uniqueStrings(value.custom || [])
  });
}
```

- [ ] **Step 5: Run `node --test test/collection-types.test.js`**

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/collection-types.js src/config.js src/data-store.js test/collection-types.test.js
git commit -m "feat: add shared collection type option model"
```

### Task 2: Collection Type APIs and Record Normalization

**Files:**
- Modify: `src/note-records.js`
- Modify: `src/server.js`
- Create: `test/collection-types-api.test.js`
- Modify: `test/sample-library-api.test.js`

- [ ] **Step 1: Write the failing API and persistence tests**

```js
test("collection type API returns predefined plus saved custom options", async (t) => {
  const result = await invokeRoute("GET", "/api/collection-types");
  assert.equal(result.status, 200);
  assert.equal(result.options.includes("科普"), true);
});

test("collection type API saves a new custom option once", async (t) => {
  const created = await invokeRoute("POST", "/api/collection-types", {
    name: "新系列实验室"
  });
  assert.equal(created.status, 200);
  assert.equal(created.options.includes("新系列实验室"), true);
});

test("sample library persists collectionType on create and patch", async (t) => {
  const created = await invokeRoute("POST", "/api/sample-library", {
    note: {
      title: "统一样本标题",
      body: "统一样本正文",
      collectionType: "科普",
      tags: ["科普", "沟通"]
    }
  });
  assert.equal(created.item.note.collectionType, "科普");
});
```

- [ ] **Step 2: Run `node --test test/collection-types-api.test.js test/sample-library-api.test.js`**

Expected: fail because APIs and note normalization do not support `collectionType`.

- [ ] **Step 3: Update note normalization to persist `collectionType`**

```js
function normalizeNote(note = {}) {
  return {
    title: normalizeString(note.title),
    body: normalizeString(note.body || note.noteContent),
    coverText: normalizeString(note.coverText),
    collectionType: normalizeString(note.collectionType),
    tags: uniqueStrings(note.tags)
  };
}
```

- [ ] **Step 4: Add collection-type routes and validation in `src/server.js`**

```js
if (request.method === "GET" && url.pathname === "/api/collection-types") {
  const stored = await loadCollectionTypes();
  return sendJson(response, 200, {
    ok: true,
    options: buildCollectionTypeOptions(stored.custom)
  });
}

if (request.method === "POST" && url.pathname === "/api/collection-types") {
  const payload = await readBody(request);
  const current = await loadCollectionTypes();
  const next = uniqueStrings([...current.custom, String(payload?.name || "").trim()]);
  await saveCollectionTypes({ custom: next });
  return sendJson(response, 200, {
    ok: true,
    options: buildCollectionTypeOptions(next)
  });
}
```

- [ ] **Step 5: Validate `collectionType` on sample-library writes**

```js
const collectionOptions = buildCollectionTypeOptions((await loadCollectionTypes()).custom);
payload.note.collectionType = assertValidCollectionType(payload.note?.collectionType, collectionOptions);
```

- [ ] **Step 6: Run `node --test test/collection-types-api.test.js test/sample-library-api.test.js`**

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/note-records.js src/server.js test/collection-types-api.test.js test/sample-library-api.test.js
git commit -m "feat: persist and validate collection types"
```

### Task 3: Detection and Generation Flow Integration

**Files:**
- Modify: `web/index.html`
- Modify: `web/app.js`
- Modify: `src/generation-workbench.js`
- Modify: `src/server.js`
- Modify: `test/generation-api.test.js`
- Modify: `test/success-generation-ui.test.js`

- [ ] **Step 1: Write the failing detection/generation tests**

```js
assert.match(indexHtml, /name="collectionType"/);
assert.match(indexHtml, /id="generation-collection-type-select"/);
assert.match(appJs, /collectionType: String\(form.get\("collectionType"\)/);

test("generation endpoint passes collectionType into prompt context", async (t) => {
  const result = await invokeRoute("POST", "/api/generate-note", {
    mode: "from_scratch",
    collectionType: "科普",
    brief: { topic: "沟通", constraints: "温和" },
    mockCandidates: [
      { variant: "safe", title: "沟通标题", body: "完整正文".repeat(40), coverText: "封面", tags: ["沟通", "关系"] }
    ]
  });
  assert.equal(result.status, 200);
  assert.equal(result.scoredCandidates.length, 1);
});
```

- [ ] **Step 2: Run `node --test test/generation-api.test.js test/success-generation-ui.test.js`**

Expected: fail because forms and prompt context do not include `collectionType`.

- [ ] **Step 3: Add required selectors to detection and generation forms**

```html
<label>
  <span>合集类型</span>
  <select name="collectionType" id="analyze-collection-type-select" required>
    <option value="">请选择合集类型</option>
  </select>
  <button type="button" class="button button-ghost button-small" id="analyze-collection-type-add">新增合集</button>
</label>
```

- [ ] **Step 4: Thread `collectionType` through frontend payload builders**

```js
function getAnalyzePayload() {
  const form = new FormData(byId("analyze-form"));
  return {
    title: form.get("title"),
    body: form.get("body"),
    coverText: form.get("coverText"),
    collectionType: String(form.get("collectionType") || "").trim(),
    tags: splitCSV(form.get("tags"))
  };
}
```

- [ ] **Step 5: Add collection type to generation prompt context**

```js
`合集类型：${brief.collectionType || ""}`,
```

- [ ] **Step 6: Validate and accept `collectionType` in `POST /api/generate-note`**

```js
const collectionOptions = buildCollectionTypeOptions((await loadCollectionTypes()).custom);
const collectionType = assertValidCollectionType(payload?.collectionType || payload?.brief?.collectionType, collectionOptions);
```

- [ ] **Step 7: Run `node --test test/generation-api.test.js test/success-generation-ui.test.js`**

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add web/index.html web/app.js src/generation-workbench.js src/server.js test/generation-api.test.js test/success-generation-ui.test.js
git commit -m "feat: add collection type to detection and generation flows"
```

### Task 4: Sample Library and Benchmark UI, Filters, and Persistence

**Files:**
- Modify: `web/index.html`
- Modify: `web/app.js`
- Modify: `src/server.js`
- Modify: `test/benchmark-generation-ui.test.js`
- Modify: `test/sample-library-api.test.js`

- [ ] **Step 1: Write the failing UI and API tests**

```js
assert.match(indexHtml, /id="sample-library-collection-filter"/);
assert.match(indexHtml, /id="review-benchmark-collection-filter"/);
assert.match(appJs, /sampleLibraryCollectionFilter:\s*"all"/);
assert.match(appJs, /reviewBenchmarkCollectionFilter:\s*"all"/);
assert.match(appJs, /collectionType/);
```

- [ ] **Step 2: Run `node --test test/benchmark-generation-ui.test.js test/sample-library-api.test.js`**

Expected: fail because the create forms, detail editor, and filters do not yet support collection type.

- [ ] **Step 3: Add collection selectors and filters to sample-library + benchmark UI**

```html
<label>
  <span>合集类型</span>
  <select id="sample-library-collection-filter">
    <option value="all">全部合集</option>
  </select>
</label>
```

- [ ] **Step 4: Persist and patch `collectionType` in sample-library and benchmark handlers**

```js
note: {
  title: String(payload.title || "").trim(),
  body: String(payload.body || "").trim(),
  coverText: String(payload.coverText || "").trim(),
  collectionType: assertValidCollectionType(payload.collectionType, collectionOptions),
  tags: parseBenchmarkTags(payload.tags)
}
```

- [ ] **Step 5: Render collection labels in record cards and meta rows**

```js
<span class="meta-pill">${escapeHtml(item.note?.collectionType || "未分类合集")}</span>
```

- [ ] **Step 6: Run `node --test test/benchmark-generation-ui.test.js test/sample-library-api.test.js`**

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add web/index.html web/app.js src/server.js test/benchmark-generation-ui.test.js test/sample-library-api.test.js
git commit -m "feat: add collection type to sample library and benchmark flows"
```

### Task 5: Width and Text Visibility Adjustments

**Files:**
- Modify: `web/styles.css`
- Modify: `test/success-generation-ui.test.js`
- Modify: `test/benchmark-generation-ui.test.js`

- [ ] **Step 1: Write the failing layout assertions**

```js
assert.match(styles, /\.shell\s*\{/);
assert.match(styles, /width:\s*min\(1600px,\s*calc\(100% - 2\.4rem\)\)/);
assert.match(styles, /\.meta-pill\s*\{/);
assert.match(styles, /white-space:\s*normal/);
assert.match(styles, /\.sample-library-toolbar-filters/);
assert.match(styles, /\.review-benchmark-toolbar-filters/);
```

- [ ] **Step 2: Run `node --test test/success-generation-ui.test.js test/benchmark-generation-ui.test.js`**

Expected: fail because shell width and flexible layouts have not been widened enough for the new field set.

- [ ] **Step 3: Widen shared containers and relax text clipping**

```css
.shell {
  width: min(1600px, calc(100% - 2.4rem));
}

.sample-library-toolbar-filters,
.review-benchmark-toolbar-filters,
.form-grid,
.model-action-grid {
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}
```

- [ ] **Step 4: Ensure touched labels and meta text can wrap instead of overflow**

```css
.meta-pill,
.sample-library-record-card,
.review-benchmark-toolbar,
.tab-button {
  overflow-wrap: anywhere;
  white-space: normal;
}
```

- [ ] **Step 5: Run `node --test test/success-generation-ui.test.js test/benchmark-generation-ui.test.js`**

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add web/styles.css test/success-generation-ui.test.js test/benchmark-generation-ui.test.js
git commit -m "style: widen layout and improve text visibility for collection metadata"
```

### Task 6: Final Verification

**Files:**
- Verify only

- [ ] **Step 1: Run the focused suite**

Run:

```bash
node --test test/collection-types.test.js test/collection-types-api.test.js test/generation-api.test.js test/sample-library-api.test.js test/benchmark-generation-ui.test.js test/success-generation-ui.test.js
```

Expected: all tests pass.

- [ ] **Step 2: Run syntax verification**

Run:

```bash
node --check web/app.js && node --check src/server.js && node --check src/generation-workbench.js && node --check src/note-records.js && node --check src/collection-types.js
```

Expected: no syntax errors.

- [ ] **Step 3: Review diff for accidental scope creep**

Run:

```bash
git diff -- web/index.html web/app.js web/styles.css src/config.js src/data-store.js src/collection-types.js src/note-records.js src/generation-workbench.js src/server.js test/collection-types.test.js test/collection-types-api.test.js test/generation-api.test.js test/sample-library-api.test.js test/benchmark-generation-ui.test.js test/success-generation-ui.test.js
```

Expected: only collection-type and width/readability related changes.
