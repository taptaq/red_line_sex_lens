# Generation Reference Material Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add hand-written material text plus a manual AI-powered web reference search modal that returns candidate reference materials and appends a selected one back into the generation workbench’s material text field.

**Architecture:** Extend the current generation workbench by adding a first-class `materialText` input inside the existing temporary reference section, then expose a separate `POST /api/generate-reference-materials` route that turns the current generation brief into search queries, fetches web reference candidates, and returns compact candidate cards for a modal picker. The selected card appends into `materialText`, and the existing generation reference-asset pipeline merges that text into the temporary text-reference flow used by `/api/generate-note`.

**Tech Stack:** Vanilla JavaScript frontend, Node.js HTTP server, existing generation workbench helpers, `node:test`, web search via routed model/search capability

---

## File Structure

- Modify: `web/index.html`
  - Add the material-text textarea, the search trigger button, and the modal shell for web reference candidates.
- Modify: `web/app.js`
  - Add UI state for material text search, modal rendering, search trigger handling, candidate adoption, and payload wiring.
- Modify: `web/styles.css`
  - Add styles for the new material-text block and search modal cards.
- Modify: `src/server.js`
  - Add `POST /api/generate-reference-materials`.
- Modify: `src/generation-reference-assets.js`
  - Accept direct material text in addition to uploaded text files and merge both into one normalized text reference pool.
- Modify: `src/generation-workbench.js`
  - Add helper/prompt support for generating reference-search queries and candidate-card normalization if kept here.
- Create: `test/generation-reference-search.test.js`
  - Unit-test server-side candidate normalization and empty-brief validation for the new search route/helper.
- Modify: `test/generation-api.test.js`
  - Cover the new route and confirm selected `materialText` is merged into normalized `referenceAssets`.
- Modify: `test/generation-workbench.test.js`
  - Cover any prompt/helper additions for material text merging or reference-search query generation.
- Modify: `test/success-generation-ui.test.js`
  - Lock in the new UI markers, modal controls, and append-back behavior wiring.

### Task 1: Add material-text input and reference-search modal UI

**Files:**
- Modify: `web/index.html`
- Modify: `web/app.js`
- Modify: `web/styles.css`
- Modify: `test/success-generation-ui.test.js`

- [ ] **Step 1: Write the failing frontend test**

Update `test/success-generation-ui.test.js` with assertions for the new input, button, modal, and append action:

```js
test("frontend generation workbench exposes material text input and reference search modal controls", async () => {
  const { indexHtml, appJs, styles } = await readFrontendFiles();

  assert.match(indexHtml, /name="materialText"/);
  assert.match(indexHtml, /素材文本/);
  assert.match(indexHtml, /id="generation-reference-search-button"/);
  assert.match(indexHtml, /AI搜索参考资料/);
  assert.match(indexHtml, /id="generation-reference-search-modal"/);
  assert.match(indexHtml, /id="generation-reference-search-modal-content"/);

  assert.match(appJs, /generationReferenceSearch:\s*\{/);
  assert.match(appJs, /async function openGenerationReferenceSearchModal\s*\(/);
  assert.match(appJs, /function renderGenerationReferenceSearchModal\s*\(/);
  assert.match(appJs, /function appendGenerationMaterialText\s*\(/);
  assert.match(appJs, /\/api\/generate-reference-materials/);
  assert.match(appJs, /data-action="apply-generation-reference-material"/);

  assert.match(styles, /\.generation-material-text-block\b/);
  assert.match(styles, /\.generation-reference-search-modal\b/);
});
```

- [ ] **Step 2: Run the frontend test to verify it fails**

Run: `node --test test/success-generation-ui.test.js`

Expected: FAIL with missing `name="materialText"` or missing `generation-reference-search-modal` markers.

- [ ] **Step 3: Implement the material-text block and modal shell**

Add the material-text UI to `web/index.html` inside the existing temporary reference section, after the file-upload grid:

```html
<label class="field-wide generation-material-text-block">
  <span>素材文本</span>
  <textarea
    name="materialText"
    rows="6"
    placeholder="可手动填写本次生成会参考的资料摘录、事实口径、表达角度或信息点"
  ></textarea>
  <small class="helper-text">这里放的是“生成时可参考什么”，不会写入长期样本库。</small>
  <div class="generation-briefing-improve-row">
    <div class="item-actions">
      <button type="button" class="button button-ghost button-small" id="generation-reference-search-button">
        AI搜索参考资料
      </button>
    </div>
    <div id="generation-reference-search-result" class="helper-text" aria-live="polite"></div>
  </div>
</label>
```

Add the modal shell near other modals:

```html
<section id="generation-reference-search-modal" class="modal-shell generation-reference-search-modal" hidden>
  <div class="modal-backdrop" data-action="close-generation-reference-search-modal"></div>
  <div class="modal-card">
    <div class="modal-card-head">
      <div>
        <strong>AI搜索参考资料</strong>
        <p>基于当前需求，从全网检索本次生成可能用得上的参考资料。</p>
      </div>
      <button type="button" class="button button-ghost button-small" data-action="close-generation-reference-search-modal">关闭</button>
    </div>
    <div id="generation-reference-search-modal-content" class="modal-card-body"></div>
  </div>
</section>
```

Add request-scoped search state to `appState` in `web/app.js`:

```js
generationReferenceSearch: {
  open: false,
  loading: false,
  message: "",
  items: []
},
```

Add UI helpers in `web/app.js`:

```js
function appendGenerationMaterialText(nextText = "") {
  const field = byId("generation-workbench-form")?.querySelector('[name="materialText"]');
  const incoming = String(nextText || "").trim();

  if (!field || !incoming) return;

  const current = String(field.value || "").trim();
  field.value = current ? `${current}\n\n${incoming}` : incoming;
  field.dispatchEvent(new Event("input", { bubbles: true }));
}

function renderGenerationReferenceSearchModal() {
  const modal = byId("generation-reference-search-modal");
  const content = byId("generation-reference-search-modal-content");
  if (!modal || !content) return;

  modal.hidden = !appState.generationReferenceSearch.open;

  if (appState.generationReferenceSearch.loading) {
    content.innerHTML = '<div class="result-card-shell muted">正在搜索参考资料...</div>';
    return;
  }

  if (!appState.generationReferenceSearch.items.length) {
    content.innerHTML = `<div class="result-card-shell muted">${escapeHtml(appState.generationReferenceSearch.message || "暂无候选参考资料")}</div>`;
    return;
  }

  content.innerHTML = appState.generationReferenceSearch.items
    .map(
      (item) => `
        <article class="generation-reference-result-card">
          <strong>${escapeHtml(item.title || "未命名资料")}</strong>
          <p class="helper-text">${escapeHtml(item.reason || "未提供推荐理由")}</p>
          <div class="rewrite-body-reader generation-reference-result-reader">${escapeHtml(item.referenceText || "")}</div>
          <p class="helper-text"><a href="${escapeHtml(item.sourceUrl || "#")}" target="_blank" rel="noreferrer">查看来源</a></p>
          <div class="item-actions">
            <button
              type="button"
              class="button button-small button-secondary"
              data-action="apply-generation-reference-material"
              data-reference-id="${escapeHtml(String(item.id || ""))}"
            >
              采用并回填
            </button>
          </div>
        </article>
      `
    )
    .join("");
}
```

Add the trigger handler:

```js
async function openGenerationReferenceSearchModal() {
  const payload = getGenerationPayload({ includeReferenceAssets: false });

  if (!String(payload.brief?.briefing || "").trim()) {
    appState.generationReferenceSearch = {
      ...appState.generationReferenceSearch,
      message: "请先填写一句话需求。"
    };
    byId("generation-reference-search-result").textContent = appState.generationReferenceSearch.message;
    return;
  }

  appState.generationReferenceSearch = {
    open: true,
    loading: true,
    message: "",
    items: []
  };
  renderGenerationReferenceSearchModal();

  try {
    const result = await apiJson("/api/generate-reference-materials", {
      method: "POST",
      body: JSON.stringify(payload)
    });

    appState.generationReferenceSearch = {
      open: true,
      loading: false,
      message: result.message || "",
      items: Array.isArray(result.items) ? result.items : []
    };
  } catch (error) {
    appState.generationReferenceSearch = {
      open: true,
      loading: false,
      message: error.message || "搜索参考资料失败",
      items: []
    };
  }

  renderGenerationReferenceSearchModal();
}
```

Wire events:

```js
byId("generation-reference-search-button")?.addEventListener("click", openGenerationReferenceSearchModal);

document.addEventListener("click", (event) => {
  const button = event.target instanceof Element ? event.target.closest("[data-action]") : null;
  if (!button) return;

  if (button.dataset.action === "close-generation-reference-search-modal") {
    appState.generationReferenceSearch.open = false;
    renderGenerationReferenceSearchModal();
  }

  if (button.dataset.action === "apply-generation-reference-material") {
    const item = appState.generationReferenceSearch.items.find((entry) => String(entry.id || "") === String(button.dataset.referenceId || ""));
    appendGenerationMaterialText(item?.referenceText || "");
    appState.generationReferenceSearch.open = false;
    byId("generation-reference-search-result").textContent = "已回填到素材文本。";
    renderGenerationReferenceSearchModal();
  }
});
```

Add styles in `web/styles.css`:

```css
.generation-material-text-block {
  display: grid;
  gap: 0.75rem;
}

.generation-reference-search-modal .modal-card {
  width: min(960px, calc(100vw - 2rem));
}

.generation-reference-result-card {
  display: grid;
  gap: 0.75rem;
  padding: 1rem;
  border-radius: 22px;
  border: 1px solid rgba(54, 43, 31, 0.12);
  background: linear-gradient(180deg, rgba(255, 251, 244, 0.82), rgba(248, 238, 222, 0.64));
}
```

- [ ] **Step 4: Run the frontend test to verify it passes**

Run: `node --test test/success-generation-ui.test.js`

Expected: PASS

- [ ] **Step 5: Commit the UI/modal slice**

```bash
git add web/index.html web/app.js web/styles.css test/success-generation-ui.test.js
git commit -m "feat: add reference material search modal ui"
```

### Task 2: Add the web reference material search API

**Files:**
- Modify: `src/server.js`
- Modify: `src/generation-workbench.js`
- Create: `test/generation-reference-search.test.js`
- Modify: `test/generation-api.test.js`

- [ ] **Step 1: Write failing API/helper tests**

Create `test/generation-reference-search.test.js`:

```js
import test from "node:test";
import assert from "node:assert/strict";

import { buildGenerationReferenceMaterialSearchPrompt, normalizeGenerationReferenceMaterialItems } from "../src/generation-workbench.js";

test("normalizeGenerationReferenceMaterialItems keeps compact candidate fields", () => {
  const items = normalizeGenerationReferenceMaterialItems([
    {
      id: "ref-1",
      title: "资料标题",
      reason: "解释推荐原因",
      referenceText: "整理后的参考文本",
      sourceUrl: "https://example.com/a"
    }
  ]);

  assert.deepEqual(items, [
    {
      id: "ref-1",
      title: "资料标题",
      reason: "解释推荐原因",
      referenceText: "整理后的参考文本",
      sourceUrl: "https://example.com/a"
    }
  ]);
});

test("buildGenerationReferenceMaterialSearchPrompt requires the current brief context", () => {
  const messages = buildGenerationReferenceMaterialSearchPrompt({
    brief: {
      briefing: "写一篇轻松科普，回答经期能不能用玩具",
      collectionType: "科普",
      tagReferences: "关系沟通"
    },
    draft: {
      title: "",
      body: ""
    }
  });

  const combined = messages.map((item) => item.content).join("\n");
  assert.match(combined, /原始一句话需求/);
  assert.match(combined, /全网检索/);
  assert.match(combined, /referenceText/);
});
```

Add a route test in `test/generation-api.test.js`:

```js
test("generation reference material search endpoint returns candidate cards", async (t) => {
  await withTempGenerationData(t, async () => {
    const result = await invokeRoute("POST", "/api/generate-reference-materials", {
      collectionType: "科普",
      brief: {
        briefing: "写经期能不能用玩具，语气自然一点",
        collectionType: "科普",
        tagReferences: "关系沟通"
      },
      mockReferenceMaterials: {
        items: [
          {
            id: "ref-1",
            title: "经期使用建议",
            reason: "能补足边界提醒",
            referenceText: "经期是否能使用，需要结合不适程度、卫生条件和个体状态来判断。",
            sourceUrl: "https://example.com/ref-1"
          }
        ]
      }
    });

    assert.equal(result.status, 200);
    assert.equal(result.ok, true);
    assert.equal(result.items.length, 1);
    assert.equal(result.items[0].title, "经期使用建议");
  });
});
```

- [ ] **Step 2: Run the new API/helper tests to verify they fail**

Run: `node --test test/generation-reference-search.test.js test/generation-api.test.js`

Expected: FAIL with missing helper exports or missing `/api/generate-reference-materials` route.

- [ ] **Step 3: Implement the search route and helper normalization**

Add helper functions to `src/generation-workbench.js`:

```js
function normalizeGenerationReferenceMaterialItem(item = {}, index = 0) {
  return {
    id: String(item.id || `ref-${index + 1}`).trim(),
    title: String(item.title || "").trim(),
    reason: String(item.reason || "").trim(),
    referenceText: String(item.referenceText || item.summary || "").trim(),
    sourceUrl: String(item.sourceUrl || item.url || "").trim()
  };
}

export function normalizeGenerationReferenceMaterialItems(items = []) {
  return ensureArray(items)
    .map((item, index) => normalizeGenerationReferenceMaterialItem(item, index))
    .filter((item) => item.title || item.referenceText || item.sourceUrl);
}

export function buildGenerationReferenceMaterialSearchPrompt({ brief = {}, draft = {} } = {}) {
  return [
    {
      role: "system",
      content: [
        "你是生成工作台里的参考资料搜索助手。",
        "你的任务是基于当前生成需求，先理解要点，再联网检索可能有帮助的参考资料，最后整理成可回填的候选卡片。",
        "这些结果是外部参考资料，不是最终生成稿。",
        "只返回 JSON。"
      ].join("\n")
    },
    {
      role: "user",
      content: [
        `原始一句话需求：${brief.briefing || ""}`,
        `合集类型：${brief.collectionType || ""}`,
        `参考标题：${brief.referenceTitle || ""}`,
        `标签提示词：${brief.tagReferences || ""}`,
        `草稿标题：${draft.title || ""}`,
        `草稿正文：${draft.body || ""}`,
        "",
        "请基于以上信息进行全网检索，返回 3-5 条候选参考资料。",
        "每条候选必须包含：title、reason、referenceText、sourceUrl。",
        "referenceText 必须是整理后的可回填文本，不要整段照抄网页长文。"
      ].join("\n")
    }
  ];
}
```

Add the route in `src/server.js`:

```js
if (request.method === "POST" && url.pathname === "/api/generate-reference-materials") {
  const payload = await readBody(request, { maxBytes: 2 * 1024 * 1024 });
  const brief = payload?.brief && typeof payload?.brief === "object" ? payload.brief : {};
  const draft = payload?.draft && typeof payload?.draft === "object" ? payload.draft : {};

  if (!String(brief.briefing || "").trim()) {
    return sendJson(response, 400, {
      ok: false,
      error: "请先填写一句话需求。"
    });
  }

  const result = payload?.mockReferenceMaterials
    ? {
        ...(payload.mockReferenceMaterials || {}),
        provider: "mock",
        model: "mock-reference-search"
      }
    : await generateReferenceMaterials({
        brief,
        draft,
        modelSelection: normalizeModelSelectionState(payload?.modelSelection).generation || "auto"
      });

  return sendJson(response, 200, {
    ok: true,
    items: normalizeGenerationReferenceMaterialItems(result.items || []),
    message: String(result.message || "").trim(),
    modelTrace: {
      provider: String(result.provider || "").trim(),
      model: String(result.model || "").trim()
    }
  });
}
```

If kept in `src/generation-workbench.js`, implement the model-backed route helper:

```js
export async function generateReferenceMaterials({
  brief = {},
  draft = {},
  modelSelection = "auto",
  generateJson = generateJsonWithModel
} = {}) {
  const messages = buildGenerationReferenceMaterialSearchPrompt({ brief, draft });
  const payload = await generateJson({ messages, modelSelection, maxTokens: 2800 });

  return {
    items: normalizeGenerationReferenceMaterialItems(payload?.items || payload?.references || []),
    message: String(payload?.message || "").trim(),
    provider: String(payload?.provider || "").trim(),
    model: String(payload?.model || "").trim()
  };
}
```

- [ ] **Step 4: Run the API/helper tests to verify they pass**

Run: `node --test test/generation-reference-search.test.js test/generation-api.test.js`

Expected: PASS

- [ ] **Step 5: Commit the reference-search API slice**

```bash
git add src/server.js src/generation-workbench.js test/generation-reference-search.test.js test/generation-api.test.js
git commit -m "feat: add generation reference material search api"
```

### Task 3: Merge material text into temporary reference assets and complete append-back flow

**Files:**
- Modify: `src/generation-reference-assets.js`
- Modify: `src/server.js`
- Modify: `web/app.js`
- Modify: `test/generation-reference-assets.test.js`
- Modify: `test/generation-api.test.js`

- [ ] **Step 1: Write failing merge-path tests**

Add a unit test in `test/generation-reference-assets.test.js`:

```js
test("summarizeGenerationReferenceAssets merges direct materialText with uploaded text files", async () => {
  const result = await summarizeGenerationReferenceAssets({
    referenceAssets: {
      materialText: "手填素材文本",
      textFiles: [
        {
          name: "notes.md",
          contentBase64: Buffer.from("上传文本内容", "utf8").toString("base64")
        }
      ],
      images: []
    }
  });

  assert.match(result.mergedText, /手填素材文本/);
  assert.match(result.mergedText, /上传文本内容/);
});
```

Add an API-level test in `test/generation-api.test.js`:

```js
test("generation endpoint merges materialText into normalized temporary reference assets", async (t) => {
  await withTempGenerationData(t, async () => {
    const result = await invokeRoute("POST", "/api/generate-note", {
      mode: "from_scratch",
      collectionType: "科普",
      brief: { topic: "沟通", constraints: "温和" },
      referenceAssets: {
        materialText: "手填或回填的参考资料文本",
        images: [],
        textFiles: []
      },
      mockCandidates: [
        { variant: "safe", title: "沟通标题", body: "完整正文".repeat(40), coverText: "封面", tags: ["沟通"] }
      ]
    });

    assert.equal(result.status, 200);
    assert.match(result.referenceAssets.mergedText, /手填或回填的参考资料文本/);
  });
});
```

- [ ] **Step 2: Run the merge-path tests to verify they fail**

Run: `node --test test/generation-reference-assets.test.js test/generation-api.test.js`

Expected: FAIL because `materialText` is not yet merged.

- [ ] **Step 3: Implement material-text merging and append-back**

Extend `src/generation-reference-assets.js` so direct material text participates in the merged text pool:

```js
export async function summarizeGenerationReferenceAssets({
  referenceAssets = {},
  summarizeImage = async () => ({ summary: "" }),
  modelSelection = "auto"
} = {}) {
  const directMaterialText = String(referenceAssets?.materialText || "").trim();
  // ...existing logic...

  if (directMaterialText) {
    mergedTextParts.push(directMaterialText);
  }

  // uploaded text files append after direct material text
}
```

Ensure `web/app.js` sends `materialText` through `referenceAssets`:

```js
if (includeReferenceAssets) {
  payload.referenceAssets = {
    ...(referenceAssets || serializeGenerationReferenceAssets()),
    materialText: String(form.get("materialText") || "").trim()
  };
}
```

Add the append-back behavior if not already present:

```js
if (button.dataset.action === "apply-generation-reference-material") {
  const item = appState.generationReferenceSearch.items.find((entry) => String(entry.id || "") === String(button.dataset.referenceId || ""));
  appendGenerationMaterialText(item?.referenceText || "");
  appState.generationReferenceSearch.open = false;
  byId("generation-reference-search-result").textContent = "已回填到素材文本。";
  renderGenerationReferenceSearchModal();
}
```

- [ ] **Step 4: Run the merge-path tests to verify they pass**

Run: `node --test test/generation-reference-assets.test.js test/generation-api.test.js test/success-generation-ui.test.js`

Expected: PASS

- [ ] **Step 5: Commit the material-text integration slice**

```bash
git add src/generation-reference-assets.js src/server.js web/app.js test/generation-reference-assets.test.js test/generation-api.test.js test/success-generation-ui.test.js
git commit -m "feat: merge searched material text into generation references"
```

## Plan Self-Review

- Spec coverage: Task 1 implements the new material-text input, trigger button, modal, and append-back action. Task 2 implements the dedicated reference-search API and candidate-card normalization. Task 3 merges hand-written and AI-returned material text into the existing temporary reference-asset flow used by generation.
- Placeholder scan: No `TODO`, `TBD`, or “similar to above” placeholders remain; each code-changing step includes concrete snippets, file paths, and commands.
- Type consistency: The feature uses `materialText` consistently as the textarea/input field name, the `referenceAssets` direct-text field, and the merged server-side property; candidate-card fields remain `id`, `title`, `reason`, `referenceText`, and `sourceUrl` throughout.
