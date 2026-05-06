# PDF Sample Library Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a minimal PDF batch import flow that extracts `title + body` from multiple PDFs, lets the user review and enrich drafts, and only writes confirmed items into the sample library.

**Architecture:** Keep the first version inside the existing sample-library workflow instead of introducing a separate import workspace. The browser reads selected PDF files, sends them to the server as JSON-safe base64 payloads, the server parses them into drafts, and a second confirmation request persists only checked items into `note-records.json`.

**Tech Stack:** Node.js HTTP server, vanilla browser JS, existing sample-library persistence helpers, `pdf-parse` for text extraction, node:test

---

### Task 1: Add focused PDF import domain helpers

**Files:**
- Modify: `package.json`
- Create: `src/pdf-sample-import.js`
- Test: `test/pdf-sample-import.test.js`

- [ ] **Step 1: Write the failing unit test for PDF draft normalization**

```js
import test from "node:test";
import assert from "node:assert/strict";

import {
  buildPdfImportDraftFromText,
  normalizePdfImportCommitItem
} from "../src/pdf-sample-import.js";

test("buildPdfImportDraftFromText treats first non-empty line as title and joins the remaining lines as body", () => {
  const draft = buildPdfImportDraftFromText({
    fileName: "sample.pdf",
    text: "\n标题行\n\n第一段正文\n第二段正文\n"
  });

  assert.equal(draft.status, "ready");
  assert.equal(draft.fileName, "sample.pdf");
  assert.equal(draft.title, "标题行");
  assert.equal(draft.body, "第一段正文\n第二段正文");
});

test("buildPdfImportDraftFromText marks files without usable body text as needs_review", () => {
  const draft = buildPdfImportDraftFromText({
    fileName: "empty.pdf",
    text: "只有标题"
  });

  assert.equal(draft.status, "needs_review");
  assert.match(draft.error, /正文/);
});

test("normalizePdfImportCommitItem trims fields, splits tags and defaults metrics to zero", () => {
  const item = normalizePdfImportCommitItem({
    title: " 标题 ",
    body: " 正文 ",
    collectionType: "科普",
    tags: "标签1，标签2",
    likes: "",
    favorites: "6",
    comments: undefined
  });

  assert.deepEqual(item, {
    title: "标题",
    body: "正文",
    collectionType: "科普",
    tags: ["标签1", "标签2"],
    likes: 0,
    favorites: 6,
    comments: 0
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/pdf-sample-import.test.js`

Expected: FAIL with missing module or missing export errors for `src/pdf-sample-import.js`.

- [ ] **Step 3: Write the minimal PDF import helper module**

```js
import pdfParse from "pdf-parse";

function splitNonEmptyLines(text = "") {
  return String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function buildPdfImportDraftFromText({ fileName = "", text = "" } = {}) {
  const lines = splitNonEmptyLines(text);
  const [title = "", ...bodyLines] = lines;
  const body = bodyLines.join("\n").trim();
  const status = title && body ? "ready" : "needs_review";

  return {
    fileName: String(fileName || "").trim(),
    status,
    title,
    body,
    error: status === "ready" ? "" : "PDF 解析结果缺少可用正文，请手动补充后再导入。"
  };
}

export function normalizePdfImportCommitItem(item = {}) {
  const splitTags = String(item.tags || "")
    .split(/[，,、]/)
    .map((tag) => tag.trim())
    .filter(Boolean);

  const toMetric = (value) => {
    const normalized = Number(String(value ?? "").trim());
    return Number.isFinite(normalized) && normalized > 0 ? Math.floor(normalized) : 0;
  };

  return {
    title: String(item.title || "").trim(),
    body: String(item.body || "").trim(),
    collectionType: String(item.collectionType || "").trim(),
    tags: [...new Set(splitTags)],
    likes: toMetric(item.likes),
    favorites: toMetric(item.favorites),
    comments: toMetric(item.comments)
  };
}

export async function extractPdfText(buffer) {
  const result = await pdfParse(buffer);
  return String(result?.text || "").trim();
}
```

- [ ] **Step 4: Add the PDF parsing dependency**

Update `package.json` to include:

```json
{
  "dependencies": {
    "pdf-parse": "^1.1.1"
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `node --test test/pdf-sample-import.test.js`

Expected: PASS with `3` passing tests.

- [ ] **Step 6: Commit**

```bash
git add package.json src/pdf-sample-import.js test/pdf-sample-import.test.js
git commit -m "feat: add pdf import parsing helpers"
```

### Task 2: Add parse and commit API routes for PDF imports

**Files:**
- Modify: `src/server.js`
- Modify: `src/sample-library.js`
- Modify: `src/pdf-sample-import.js`
- Test: `test/sample-library-pdf-import-api.test.js`

- [ ] **Step 1: Write the failing API test for parse and commit routes**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { paths } from "../src/config.js";
import { loadNoteRecords } from "../src/data-store.js";
import * as pdfImport from "../src/pdf-sample-import.js";
import { safeHandleRequest } from "../src/server.js";

test("sample library PDF parse returns editable drafts and commit persists only confirmed items", async (t) => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "sample-library-pdf-import-"));
  const originals = {
    collectionTypes: paths.collectionTypes,
    noteRecords: paths.noteRecords,
    successSamples: paths.successSamples,
    noteLifecycle: paths.noteLifecycle
  };

  paths.collectionTypes = path.join(tempDir, "collection-types.json");
  paths.noteRecords = path.join(tempDir, "note-records.json");
  paths.successSamples = path.join(tempDir, "success-samples.json");
  paths.noteLifecycle = path.join(tempDir, "note-lifecycle.json");

  await Promise.all([
    fs.writeFile(paths.collectionTypes, `${JSON.stringify({ custom: [] }, null, 2)}\n`, "utf8"),
    fs.writeFile(paths.successSamples, "[]\n", "utf8"),
    fs.writeFile(paths.noteLifecycle, "[]\n", "utf8")
  ]);

  const originalExtractPdfText = pdfImport.extractPdfText;
  pdfImport.extractPdfText = async () => "标题A\n正文A第一段\n正文A第二段";

  t.after(async () => {
    pdfImport.extractPdfText = originalExtractPdfText;
    Object.assign(paths, originals);
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  const parsed = await invokeRoute("POST", "/api/sample-library/pdf-import/parse", {
    files: [{ name: "a.pdf", contentBase64: Buffer.from("pdf").toString("base64") }]
  });

  assert.equal(parsed.status, 200);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.items.length, 1);
  assert.equal(parsed.items[0].title, "标题A");

  const committed = await invokeRoute("POST", "/api/sample-library/pdf-import/commit", {
    items: [
      {
        selected: true,
        fileName: "a.pdf",
        title: "标题A",
        body: "正文A第一段\n正文A第二段",
        collectionType: "科普",
        tags: "经验, 分享",
        likes: "12",
        favorites: "5",
        comments: "1"
      },
      {
        selected: false,
        fileName: "skip.pdf",
        title: "跳过",
        body: "跳过正文",
        collectionType: "科普"
      }
    ]
  });

  const records = await loadNoteRecords();
  assert.equal(committed.status, 200);
  assert.equal(committed.ok, true);
  assert.equal(committed.createdCount, 1);
  assert.equal(records.length, 1);
  assert.equal(records[0].note.title, "标题A");
  assert.deepEqual(records[0].note.tags, ["经验", "分享"]);
  assert.equal(records[0].publish.metrics.likes, 12);
  assert.equal(records[0].reference.enabled, false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/sample-library-pdf-import-api.test.js`

Expected: FAIL with `404` route responses or missing route handlers.

- [ ] **Step 3: Add sample-library payload mapping helper for imported drafts**

Add to `src/sample-library.js`:

```js
export function buildSampleLibraryImportPayload(item = {}) {
  return {
    source: "manual",
    stage: "draft",
    sampleType: "",
    note: {
      title: item.title,
      body: item.body,
      coverText: "",
      collectionType: item.collectionType,
      tags: item.tags
    },
    publish: {
      status: "not_published",
      metrics: {
        likes: item.likes,
        favorites: item.favorites,
        comments: item.comments
      }
    },
    reference: {
      enabled: false
    }
  };
}
```

- [ ] **Step 4: Implement parse and commit helpers in `src/pdf-sample-import.js`**

Add:

```js
export async function parsePdfImportFiles(files = [], { extractText = extractPdfText } = {}) {
  const items = [];

  for (const file of Array.isArray(files) ? files : []) {
    const fileName = String(file?.name || "").trim();
    const contentBase64 = String(file?.contentBase64 || "").trim();

    if (!fileName || !contentBase64) {
      items.push({
        fileName,
        status: "error",
        title: "",
        body: "",
        error: "缺少 PDF 文件名或内容。"
      });
      continue;
    }

    try {
      const text = await extractText(Buffer.from(contentBase64, "base64"));
      items.push(buildPdfImportDraftFromText({ fileName, text }));
    } catch (error) {
      items.push({
        fileName,
        status: "error",
        title: "",
        body: "",
        error: error instanceof Error ? error.message : "PDF 解析失败"
      });
    }
  }

  return items;
}
```

- [ ] **Step 5: Implement the new server routes**

Add to `src/server.js`:

```js
import {
  normalizePdfImportCommitItem,
  parsePdfImportFiles
} from "./pdf-sample-import.js";
import { buildSampleLibraryImportPayload } from "./sample-library.js";
```

Route handlers:

```js
if (request.method === "POST" && url.pathname === "/api/sample-library/pdf-import/parse") {
  const payload = await readBody(request);
  const items = await parsePdfImportFiles(payload?.files || []);
  return sendJson(response, 200, { ok: true, items });
}

if (request.method === "POST" && url.pathname === "/api/sample-library/pdf-import/commit") {
  const payload = await readBody(request);
  const sourceItems = Array.isArray(payload?.items) ? payload.items : [];
  const selectedItems = sourceItems.filter((item) => item?.selected === true);
  const createdItems = [];

  for (const item of selectedItems) {
    const normalized = normalizePdfImportCommitItem(item);
    if (!normalized.title || !normalized.body || !normalized.collectionType) {
      continue;
    }

    const { item: saved } = await persistSampleLibraryRecord(
      buildSampleLibraryImportPayload(normalized)
    );
    createdItems.push(saved);
  }

  return sendJson(response, 200, {
    ok: true,
    createdCount: createdItems.length,
    items: createdItems
  });
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `node --test test/sample-library-pdf-import-api.test.js`

Expected: PASS with `1` passing test.

- [ ] **Step 7: Commit**

```bash
git add src/server.js src/sample-library.js src/pdf-sample-import.js test/sample-library-pdf-import-api.test.js
git commit -m "feat: add sample library pdf import api"
```

### Task 3: Add the sample-library PDF import UI shell

**Files:**
- Modify: `web/index.html`
- Modify: `web/styles.css`
- Test: `test/success-generation-ui.test.js`

- [ ] **Step 1: Write the failing UI source test for the import shell**

Add assertions to `test/success-generation-ui.test.js`:

```js
assert.match(sampleLibraryPaneHtml, /id="sample-library-import-button"/);
assert.match(sampleLibraryPaneHtml, /id="sample-library-import-input"/);
assert.match(sampleLibraryPaneHtml, /accept="application\\/pdf,.pdf"/);
assert.match(sampleLibraryPaneHtml, /id="sample-library-import-result"/);
assert.match(sampleLibraryPaneHtml, /id="sample-library-import-commit-button"/);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/success-generation-ui.test.js`

Expected: FAIL because the new import controls are not present in `web/index.html`.

- [ ] **Step 3: Add the import controls to the sample-library panel**

In `web/index.html`, near the existing create button:

```html
<button type="button" class="button button-ghost" id="sample-library-import-button">
  批量导入 PDF
</button>
<input id="sample-library-import-input" type="file" accept="application/pdf,.pdf" multiple hidden />
```

Below the create block:

```html
<section class="sample-library-import-block" id="sample-library-import-block" hidden>
  <div class="admin-panel-body stack">
    <div class="inline-actions">
      <button type="button" class="button button-alt" id="sample-library-import-commit-button">导入已确认条目</button>
    </div>
    <p class="helper-text action-gate-hint" id="sample-library-import-action-hint" aria-live="polite"></p>
    <div id="sample-library-import-result" class="result-card muted">等待导入 PDF</div>
  </div>
</section>
```

- [ ] **Step 4: Add minimal layout styling**

In `web/styles.css`:

```css
.sample-library-import-block {
  margin-top: 16px;
}

.sample-library-import-list {
  display: grid;
  gap: 14px;
}

.sample-library-import-card {
  border: 1px solid var(--line-soft);
  border-radius: 18px;
  background: var(--panel-soft);
  padding: 16px;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `node --test test/success-generation-ui.test.js`

Expected: PASS with the existing suite plus the new import shell assertions.

- [ ] **Step 6: Commit**

```bash
git add web/index.html web/styles.css test/success-generation-ui.test.js
git commit -m "feat: add pdf import ui shell"
```

### Task 4: Wire front-end parse, review, and commit behavior

**Files:**
- Modify: `web/app.js`
- Modify: `web/index.html`
- Test: `test/sample-library-pdf-import-ui.test.js`

- [ ] **Step 1: Write the failing source-oriented UI behavior test**

Create `test/sample-library-pdf-import-ui.test.js`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

test("sample library frontend wires parse and commit flows for PDF imports", async () => {
  const appJs = await fs.readFile(new URL("../web/app.js", import.meta.url), "utf8");

  assert.match(appJs, /const sampleLibraryPdfImportParseApi = "\\/api\\/sample-library\\/pdf-import\\/parse"/);
  assert.match(appJs, /const sampleLibraryPdfImportCommitApi = "\\/api\\/sample-library\\/pdf-import\\/commit"/);
  assert.match(appJs, /sample-library-import-input"\)\.addEventListener\("change"/);
  assert.match(appJs, /sample-library-import-commit-button"\)\.addEventListener\("click"/);
  assert.match(appJs, /FileReader|arrayBuffer/);
  assert.match(appJs, /sample-library-import-result/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/sample-library-pdf-import-ui.test.js`

Expected: FAIL because the new API constants and event handlers do not exist yet.

- [ ] **Step 3: Add front-end state and API constants**

In `web/app.js` near the existing API constants and app state:

```js
const sampleLibraryPdfImportParseApi = "/api/sample-library/pdf-import/parse";
const sampleLibraryPdfImportCommitApi = "/api/sample-library/pdf-import/commit";

appState.sampleLibraryImportDrafts = [];
```

- [ ] **Step 4: Implement file encoding and parse request flow**

Add helpers:

```js
async function fileToBase64(file) {
  const buffer = await file.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(buffer);

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}

async function parseSampleLibraryPdfFiles(files = []) {
  const payload = {
    files: await Promise.all(
      [...files].map(async (file) => ({
        name: file.name,
        contentBase64: await fileToBase64(file)
      }))
    )
  };

  return apiJson(sampleLibraryPdfImportParseApi, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}
```

- [ ] **Step 5: Render editable import drafts and commit selected items**

Add rendering and commit helpers:

```js
function renderSampleLibraryImportDrafts(items = []) {
  appState.sampleLibraryImportDrafts = Array.isArray(items) ? items : [];
  byId("sample-library-import-result").innerHTML = `
    <div class="sample-library-import-list">
      ${appState.sampleLibraryImportDrafts.map((item, index) => `
        <article class="sample-library-import-card" data-import-index="${index}">
          <label><span>确认导入</span><input type="checkbox" name="selected"${item.status === "ready" ? " checked" : ""} /></label>
          <label><span>标题</span><input name="title" value="${escapeHtml(item.title || "")}" /></label>
          <label><span>正文</span><textarea name="body" rows="6">${escapeHtml(item.body || "")}</textarea></label>
          <label><span>合集类型</span>${buildCollectionTypeOptionsMarkup({ options: appState.collectionTypeOptions, value: "" })}</label>
          <label><span>标签</span><input name="tags" value="" placeholder="标签，用逗号分隔" /></label>
          <div class="inline-fields">
            <label><span>点赞</span><input name="likes" type="number" min="0" value="0" /></label>
            <label><span>收藏</span><input name="favorites" type="number" min="0" value="0" /></label>
            <label><span>评论</span><input name="comments" type="number" min="0" value="0" /></label>
          </div>
          <p class="helper-text">${escapeHtml(item.error || "已完成 PDF 解析，可继续补全信息。")}</p>
        </article>
      `).join("")}
    </div>
  `;
}
```

Commit:

```js
async function commitSampleLibraryImportDrafts() {
  const cards = [...document.querySelectorAll("[data-import-index]")];
  const items = cards.map((card) => ({
    selected: card.querySelector('[name="selected"]')?.checked === true,
    fileName: appState.sampleLibraryImportDrafts[Number(card.dataset.importIndex)]?.fileName || "",
    title: card.querySelector('[name="title"]')?.value || "",
    body: card.querySelector('[name="body"]')?.value || "",
    collectionType: card.querySelector('[name="collectionType"]')?.value || "",
    tags: card.querySelector('[name="tags"]')?.value || "",
    likes: card.querySelector('[name="likes"]')?.value || "0",
    favorites: card.querySelector('[name="favorites"]')?.value || "0",
    comments: card.querySelector('[name="comments"]')?.value || "0"
  }));

  const result = await apiJson(sampleLibraryPdfImportCommitApi, {
    method: "POST",
    body: JSON.stringify({ items })
  });

  appState.sampleLibraryRecords = result.items || appState.sampleLibraryRecords;
  await refreshSampleLibrary();
}
```

- [ ] **Step 6: Wire the new event listeners**

Add:

```js
byId("sample-library-import-button").addEventListener("click", () => {
  byId("sample-library-import-input").click();
});

byId("sample-library-import-input").addEventListener("change", async (event) => {
  const files = event.currentTarget.files || [];
  if (!files.length) return;

  byId("sample-library-import-block").hidden = false;
  byId("sample-library-import-result").innerHTML = '<div class="result-card-shell muted">正在解析 PDF...</div>';
  const result = await parseSampleLibraryPdfFiles(files);
  renderSampleLibraryImportDrafts(result.items || []);
});

byId("sample-library-import-commit-button").addEventListener("click", async () => {
  await commitSampleLibraryImportDrafts();
});
```

- [ ] **Step 7: Run tests to verify they pass**

Run:

```bash
node --test test/sample-library-pdf-import-ui.test.js
node --test test/success-generation-ui.test.js
```

Expected: PASS for both suites.

- [ ] **Step 8: Commit**

```bash
git add web/app.js web/index.html test/sample-library-pdf-import-ui.test.js
git commit -m "feat: wire sample library pdf import flow"
```

### Task 5: Run final regression for sample-library import and adjacent surfaces

**Files:**
- Modify: none expected
- Test: `test/pdf-sample-import.test.js`
- Test: `test/sample-library-pdf-import-api.test.js`
- Test: `test/sample-library-api.test.js`
- Test: `test/collection-types-api.test.js`
- Test: `test/sample-library-pdf-import-ui.test.js`
- Test: `test/success-generation-ui.test.js`

- [ ] **Step 1: Run the focused regression suite**

Run:

```bash
node --test \
  test/pdf-sample-import.test.js \
  test/sample-library-pdf-import-api.test.js \
  test/sample-library-api.test.js \
  test/collection-types-api.test.js \
  test/sample-library-pdf-import-ui.test.js \
  test/success-generation-ui.test.js
```

Expected: PASS with `0` failures.

- [ ] **Step 2: Verify only intended files changed**

Run:

```bash
git status --short \
  package.json \
  src/pdf-sample-import.js \
  src/sample-library.js \
  src/server.js \
  web/index.html \
  web/app.js \
  web/styles.css \
  test/pdf-sample-import.test.js \
  test/sample-library-pdf-import-api.test.js \
  test/sample-library-pdf-import-ui.test.js \
  test/success-generation-ui.test.js
```

Expected: Only the planned files appear in this filtered status output.

- [ ] **Step 3: Commit the final polish if needed**

```bash
git add package.json src/pdf-sample-import.js src/sample-library.js src/server.js web/index.html web/app.js web/styles.css test/pdf-sample-import.test.js test/sample-library-pdf-import-api.test.js test/sample-library-pdf-import-ui.test.js test/success-generation-ui.test.js
git commit -m "feat: add pdf batch import for sample library"
```
