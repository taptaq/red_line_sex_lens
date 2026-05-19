# Generation Temporary Reference Assets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add request-scoped image and text reference uploads to the generation workbench so one generation run can borrow temporary materials without polluting long-term samples or memory.

**Architecture:** Keep the frontend on the current JSON submission path by staging selected files in `web/app.js`, serializing images as `dataUrl` and text files as `base64`, then normalizing them in a new backend helper before generation. Only call vision summarization when image assets exist; otherwise feed merged text references straight into `buildGenerationMessages()` as ordinary prompt context.

**Tech Stack:** Vanilla JavaScript frontend, Node.js HTTP server, existing GLM vision helper, `node:test`

---

## File Structure

- Create: `src/generation-reference-assets.js`
  - Normalize request-scoped reference assets, decode base64 text files, cap merged text length, and optionally summarize images through an injected helper.
- Modify: `src/glm.js`
  - Add a focused vision helper for temporary generation reference images.
- Modify: `src/server.js`
  - Normalize `payload.referenceAssets`, pass them into generation, and include the normalized result in the route response for transparent testing/debugging.
- Modify: `src/generation-workbench.js`
  - Accept normalized temporary reference assets and inject them into prompt assembly with “参考但不照抄” constraints.
- Modify: `web/index.html`
  - Add image and text upload controls plus preview containers inside the generation workbench form.
- Modify: `web/app.js`
  - Read selected files, maintain request-scoped asset state, support removal, enforce the 5-image limit, and add serialized `referenceAssets` to the generation payload.
- Modify: `web/styles.css`
  - Style the temporary asset picker and selected-file previews.
- Modify: `test/success-generation-ui.test.js`
  - Lock in the frontend markers and payload wiring.
- Create: `test/generation-reference-assets.test.js`
  - Unit-test normalization, text merging, image-summary invocation, and no-image skip behavior.
- Modify: `test/generation-workbench.test.js`
  - Verify prompt inclusion rules for temporary image/text references.
- Modify: `test/generation-api.test.js`
  - Verify the route accepts `referenceAssets`, returns normalized data, and skips image summarization when no image assets are supplied.

### Task 1: Add the frontend temporary reference asset picker

**Files:**
- Modify: `web/index.html`
- Modify: `web/app.js`
- Modify: `web/styles.css`
- Test: `test/success-generation-ui.test.js`

- [ ] **Step 1: Write the failing frontend test**

Update `test/success-generation-ui.test.js` with assertions for the new inputs, preview containers, app-state helpers, and payload wiring:

```js
test("frontend generation workbench exposes temporary reference asset uploads", async () => {
  const { indexHtml, appJs, styles } = await readFrontendFiles();

  assert.match(indexHtml, /id="generation-reference-image-input"/);
  assert.match(indexHtml, /accept="image\/\*"/);
  assert.match(indexHtml, /id="generation-reference-text-input"/);
  assert.match(indexHtml, /accept="\.txt,\.md,\.markdown,text\/plain,text\/markdown"/);
  assert.match(indexHtml, /id="generation-reference-assets-preview"/);

  assert.match(appJs, /generationReferenceAssets:\s*\{/);
  assert.match(appJs, /async function readGenerationReferenceImageFiles\s*\(/);
  assert.match(appJs, /async function readGenerationReferenceTextFiles\s*\(/);
  assert.match(appJs, /function renderGenerationReferenceAssets\s*\(/);
  assert.match(appJs, /referenceAssets:\s*\{/);
  assert.match(appJs, /images:\s*appState\.generationReferenceAssets\.images/);
  assert.match(appJs, /textFiles:\s*appState\.generationReferenceAssets\.textFiles/);

  assert.match(styles, /\.generation-reference-assets\s*\{/);
  assert.match(styles, /\.generation-reference-files\s*\{/);
});
```

- [ ] **Step 2: Run the frontend test to verify it fails**

Run: `node --test test/success-generation-ui.test.js`

Expected: FAIL with missing generation reference upload markers such as `generation-reference-image-input` or missing `generationReferenceAssets` state.

- [ ] **Step 3: Implement the minimal frontend uploader**

Add the upload controls to `web/index.html` right after the “一句话需求” block so the materials clearly belong to this run:

```html
<div class="field-wide generation-reference-assets">
  <div class="tab-panel-head">
    <strong>本次生成参考素材</strong>
    <span>只对这一次生成生效，不会写入样本库或共享记忆。</span>
  </div>
  <div class="form-grid">
    <label>
      <span>参考图片素材</span>
      <input
        id="generation-reference-image-input"
        type="file"
        accept="image/*"
        multiple
      />
      <small class="helper-text">最多 5 张；适合提供封面气质、构图和氛围参考。</small>
    </label>
    <label>
      <span>参考文本素材</span>
      <input
        id="generation-reference-text-input"
        type="file"
        accept=".txt,.md,.markdown,text/plain,text/markdown"
        multiple
      />
      <small class="helper-text">可一次上传多个文本文件，本次生成前会自动合并。</small>
    </label>
  </div>
  <div id="generation-reference-assets-preview" class="generation-reference-files"></div>
</div>
```

Initialize request-scoped state and payload wiring in `web/app.js`:

```js
const GENERATION_REFERENCE_IMAGE_LIMIT = 5;

const appState = {
  // ...existing state...
  generationReferenceAssets: {
    images: [],
    textFiles: [],
    message: ""
  }
};
```

```js
async function readGenerationReferenceImageFiles(fileList) {
  const files = [...(fileList || [])];
  const remainingSlots = Math.max(0, GENERATION_REFERENCE_IMAGE_LIMIT - appState.generationReferenceAssets.images.length);

  if (files.length > remainingSlots) {
    appState.generationReferenceAssets.message = `参考图片最多保留 ${GENERATION_REFERENCE_IMAGE_LIMIT} 张。`;
  }

  const selected = files.slice(0, remainingSlots);
  const images = await Promise.all(
    selected.map(async (file) => ({
      name: file.name,
      type: file.type || "image/png",
      size: file.size || 0,
      dataUrl: await fileToDataUrl(file)
    }))
  );

  appState.generationReferenceAssets.images = [...appState.generationReferenceAssets.images, ...images];
  renderGenerationReferenceAssets();
}

async function readGenerationReferenceTextFiles(fileList) {
  const files = [...(fileList || [])];
  const textFiles = await Promise.all(
    files.map(async (file) => ({
      name: file.name,
      contentBase64: await fileToBase64(file)
    }))
  );

  appState.generationReferenceAssets.textFiles = [
    ...appState.generationReferenceAssets.textFiles,
    ...textFiles
  ];
  renderGenerationReferenceAssets();
}

function renderGenerationReferenceAssets() {
  const container = byId("generation-reference-assets-preview");
  if (!container) return;

  const imageItems = appState.generationReferenceAssets.images
    .map(
      (item, index) => `
        <button type="button" class="generation-reference-chip" data-action="remove-generation-reference-image" data-index="${index}">
          <span>图片：${escapeHtml(item.name)}</span>
        </button>
      `
    )
    .join("");
  const textItems = appState.generationReferenceAssets.textFiles
    .map(
      (item, index) => `
        <button type="button" class="generation-reference-chip" data-action="remove-generation-reference-text" data-index="${index}">
          <span>文本：${escapeHtml(item.name)}</span>
        </button>
      `
    )
    .join("");

  container.innerHTML = `
    <div class="generation-reference-file-group">
      <strong>已选图片 ${appState.generationReferenceAssets.images.length} / ${GENERATION_REFERENCE_IMAGE_LIMIT}</strong>
      <div class="generation-reference-chip-list">${imageItems || '<span class="helper-text">还没有上传图片素材</span>'}</div>
    </div>
    <div class="generation-reference-file-group">
      <strong>已选文本 ${appState.generationReferenceAssets.textFiles.length}</strong>
      <div class="generation-reference-chip-list">${textItems || '<span class="helper-text">还没有上传文本素材</span>'}</div>
    </div>
    <p class="helper-text">${escapeHtml(appState.generationReferenceAssets.message || "")}</p>
  `;
}
```

Add payload serialization in `getGenerationPayload()`:

```js
referenceAssets: {
  images: appState.generationReferenceAssets.images.map((item) => ({
    name: item.name,
    type: item.type,
    size: item.size,
    dataUrl: item.dataUrl
  })),
  textFiles: appState.generationReferenceAssets.textFiles.map((item) => ({
    name: item.name,
    contentBase64: item.contentBase64
  }))
},
```

Bind the new inputs and removal actions:

```js
byId("generation-reference-image-input")?.addEventListener("change", async (event) => {
  await readGenerationReferenceImageFiles(event.currentTarget.files);
  event.currentTarget.value = "";
});

byId("generation-reference-text-input")?.addEventListener("change", async (event) => {
  await readGenerationReferenceTextFiles(event.currentTarget.files);
  event.currentTarget.value = "";
});

document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;

  const action = button.getAttribute("data-action");
  const index = Number(button.getAttribute("data-index"));

  if (action === "remove-generation-reference-image") {
    appState.generationReferenceAssets.images.splice(index, 1);
    appState.generationReferenceAssets.message = "";
    renderGenerationReferenceAssets();
  }

  if (action === "remove-generation-reference-text") {
    appState.generationReferenceAssets.textFiles.splice(index, 1);
    renderGenerationReferenceAssets();
  }
});
```

Add basic styles in `web/styles.css`:

```css
.generation-reference-assets {
  display: grid;
  gap: 0.85rem;
}

.generation-reference-files {
  display: grid;
  gap: 0.8rem;
  padding: 0.95rem 1rem;
  border-radius: 20px;
  border: 1px solid rgba(54, 43, 31, 0.12);
  background: linear-gradient(180deg, rgba(255, 251, 244, 0.78), rgba(248, 238, 222, 0.62));
}

.generation-reference-chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
}

.generation-reference-chip {
  border: 1px solid rgba(199, 154, 69, 0.28);
  border-radius: 999px;
  background: rgba(199, 154, 69, 0.12);
  color: var(--ink);
}
```

- [ ] **Step 4: Run the frontend test to verify it passes**

Run: `node --test test/success-generation-ui.test.js`

Expected: PASS

- [ ] **Step 5: Commit the frontend uploader slice**

```bash
git add web/index.html web/app.js web/styles.css test/success-generation-ui.test.js
git commit -m "feat: add generation reference asset pickers"
```

### Task 2: Normalize temporary reference assets on the backend

**Files:**
- Create: `src/generation-reference-assets.js`
- Modify: `src/glm.js`
- Test: `test/generation-reference-assets.test.js`

- [ ] **Step 1: Write failing normalization tests**

Create `test/generation-reference-assets.test.js` with focused helper coverage:

```js
import test from "node:test";
import assert from "node:assert/strict";

import { summarizeGenerationReferenceAssets } from "../src/generation-reference-assets.js";

test("summarizeGenerationReferenceAssets merges text files and skips image summarization when there are no images", async () => {
  let summarizeCalls = 0;

  const result = await summarizeGenerationReferenceAssets({
    referenceAssets: {
      images: [],
      textFiles: [
        { name: "a.md", contentBase64: Buffer.from("第一段参考").toString("base64") },
        { name: "b.txt", contentBase64: Buffer.from("第二段参考").toString("base64") }
      ]
    },
    summarizeImage: async () => {
      summarizeCalls += 1;
      return { summary: "should not run" };
    }
  });

  assert.equal(summarizeCalls, 0);
  assert.deepEqual(result.imageSummaries, []);
  assert.deepEqual(result.textFileNames, ["a.md", "b.txt"]);
  assert.match(result.mergedText, /第一段参考/);
  assert.match(result.mergedText, /第二段参考/);
});

test("summarizeGenerationReferenceAssets keeps successful image summaries and downgrades failures to warnings", async () => {
  const result = await summarizeGenerationReferenceAssets({
    referenceAssets: {
      images: [
        { name: "cover-1.png", type: "image/png", dataUrl: "data:image/png;base64,AAA=" },
        { name: "cover-2.png", type: "image/png", dataUrl: "data:image/png;base64,BBB=" }
      ],
      textFiles: []
    },
    summarizeImage: async ({ fileName }) => {
      if (fileName === "cover-2.png") {
        throw new Error("vision failed");
      }
      return { summary: "高反差插画封面，主体居中" };
    }
  });

  assert.equal(result.imageSummaries.length, 1);
  assert.equal(result.imageSummaries[0].name, "cover-1.png");
  assert.match(result.imageSummaries[0].summary, /主体居中/);
  assert.equal(result.warnings.length, 1);
  assert.match(result.warnings[0], /cover-2\.png/);
});
```

- [ ] **Step 2: Run the normalization tests to verify they fail**

Run: `node --test test/generation-reference-assets.test.js`

Expected: FAIL with missing module `../src/generation-reference-assets.js` or missing `summarizeGenerationReferenceAssets` export.

- [ ] **Step 3: Implement request-scoped normalization and image summarization**

Create `src/generation-reference-assets.js`:

```js
const MAX_GENERATION_REFERENCE_TEXT_CHARS = 16000;

function normalizeAssetList(items) {
  return Array.isArray(items) ? items.filter((item) => item && typeof item === "object") : [];
}

function decodeBase64Utf8(value = "") {
  return Buffer.from(String(value || ""), "base64").toString("utf8");
}

function clampMergedText(value = "", maxChars = MAX_GENERATION_REFERENCE_TEXT_CHARS) {
  return String(value || "").replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim().slice(0, maxChars);
}

export async function summarizeGenerationReferenceAssets({
  referenceAssets = {},
  summarizeImage = async () => ({ summary: "" }),
  modelSelection = "auto"
} = {}) {
  const images = normalizeAssetList(referenceAssets.images);
  const textFiles = normalizeAssetList(referenceAssets.textFiles);
  const warnings = [];

  const mergedText = clampMergedText(
    textFiles
      .map((item) => {
        try {
          return `文件：${String(item.name || "").trim()}\n${decodeBase64Utf8(item.contentBase64 || "")}`;
        } catch {
          warnings.push(`文本素材 ${String(item.name || "未命名文件")} 解析失败，已跳过。`);
          return "";
        }
      })
      .filter(Boolean)
      .join("\n\n")
  );

  const imageSummaries = [];
  for (const image of images) {
    try {
      const summary = await summarizeImage({
        imageDataUrl: image.dataUrl,
        mimeType: image.type || "image/png",
        fileName: image.name || "",
        modelSelection
      });

      if (String(summary?.summary || "").trim()) {
        imageSummaries.push({
          name: String(image.name || "").trim(),
          summary: String(summary.summary || "").trim()
        });
      }
    } catch {
      warnings.push(`图片素材 ${String(image.name || "未命名图片")} 解析失败，已跳过。`);
    }
  }

  return {
    imageSummaries,
    mergedText,
    textFileNames: textFiles.map((item) => String(item.name || "").trim()).filter(Boolean),
    imageFileNames: images.map((item) => String(item.name || "").trim()).filter(Boolean),
    warnings
  };
}
```

Add a focused vision helper to `src/glm.js`:

```js
export async function summarizeGenerationReferenceImage({ imageDataUrl, mimeType, fileName = "", modelSelection = "auto" }) {
  const { parsed } = await callChatJson({
    providerConfig: {
      provider: "glm",
      label: "智谱 GLM",
      envKey: "GLM_API_KEY",
      endpoint: glmEndpoint
    },
    model: defaultVisionModel,
    temperature: 0.1,
    missingKeyMessage: "参考图片理解缺少 GLM_API_KEY 环境变量。",
    scene: "generation_reference_image",
    messages: [
      {
        role: "system",
        content: "你是生成参考图理解助手。只描述可借鉴的视觉信息，输出必须是 JSON。"
      },
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: {
              url: ensureImageDataUrl(imageDataUrl, mimeType)
            }
          },
          {
            type: "text",
            text: [
              `文件名：${fileName || "未命名图片"}`,
              "请提炼画面主体、构图、配色、氛围和适合作为封面参考的要点。",
              "只返回 JSON。",
              "{",
              '  "summary": "1-3 句中文总结，可直接放进内容生成 prompt"',
              "}"
            ].join("\n")
          }
        ]
      }
    ]
  });

  return {
    summary: String(parsed?.summary || "").trim()
  };
}
```

- [ ] **Step 4: Run the normalization tests to verify they pass**

Run: `node --test test/generation-reference-assets.test.js`

Expected: PASS

- [ ] **Step 5: Commit the backend normalization slice**

```bash
git add src/generation-reference-assets.js src/glm.js test/generation-reference-assets.test.js
git commit -m "feat: normalize temporary generation reference assets"
```

### Task 3: Thread temporary assets through the generation API and prompt builder

**Files:**
- Modify: `src/server.js`
- Modify: `src/generation-workbench.js`
- Modify: `test/generation-api.test.js`
- Modify: `test/generation-workbench.test.js`

- [ ] **Step 1: Write failing API and prompt tests**

Add prompt coverage to `test/generation-workbench.test.js`:

```js
test("buildGenerationMessages injects temporary text and image references with non-copying guidance", () => {
  const messages = buildGenerationMessages({
    mode: "from_scratch",
    brief: {
      collectionType: "科普",
      lengthMode: "short",
      briefing: "写关系沟通"
    },
    referenceAssets: {
      imageSummaries: [{ name: "cover-1.png", summary: "高反差暖色封面，主体居中，留白明显" }],
      mergedText: "文件：notes.md\n先把情绪讲透，再给建议。",
      textFileNames: ["notes.md"],
      imageFileNames: ["cover-1.png"]
    }
  });

  assert.match(messages[1].content, /本次临时参考素材/);
  assert.match(messages[1].content, /高反差暖色封面/);
  assert.match(messages[1].content, /notes\.md/);
  assert.match(messages[1].content, /不要直接照抄文本素材原文/);
});

test("buildGenerationMessages omits temporary image guidance when no image summaries exist", () => {
  const messages = buildGenerationMessages({
    mode: "from_scratch",
    brief: {
      collectionType: "科普",
      lengthMode: "short",
      briefing: "写关系沟通"
    },
    referenceAssets: {
      imageSummaries: [],
      mergedText: "文件：notes.md\n只保留文本参考。",
      textFileNames: ["notes.md"],
      imageFileNames: []
    }
  });

  assert.match(messages[1].content, /只保留文本参考/);
  assert.doesNotMatch(messages[1].content, /临时参考图片/);
});
```

Add route coverage to `test/generation-api.test.js`:

```js
test("generation endpoint returns normalized temporary reference text without calling image summarization when no images are uploaded", async (t) => {
  await withTempGenerationData(t, async () => {
    const result = await invokeRoute("POST", "/api/generate-note", {
      mode: "from_scratch",
      collectionType: "科普",
      brief: { topic: "沟通", constraints: "温和" },
      referenceAssets: {
        images: [],
        textFiles: [
          {
            name: "notes.md",
            contentBase64: Buffer.from("先共情，再给建议。").toString("base64")
          }
        ]
      },
      mockCandidates: [
        { variant: "safe", title: "沟通标题", body: "完整正文".repeat(40), coverText: "封面", tags: ["沟通"] }
      ]
    });

    assert.equal(result.status, 200);
    assert.match(result.referenceAssets.mergedText, /先共情，再给建议/);
    assert.deepEqual(result.referenceAssets.imageSummaries, []);
  });
});
```

- [ ] **Step 2: Run the API and prompt tests to verify they fail**

Run: `node --test test/generation-workbench.test.js test/generation-api.test.js`

Expected: FAIL with missing `referenceAssets` prompt output or missing `referenceAssets` in the route response.

- [ ] **Step 3: Implement API plumbing and prompt injection**

Wire normalization into `src/server.js`:

```js
import { summarizeGenerationReferenceAssets } from "./generation-reference-assets.js";
import { recognizeFeedbackScreenshot, rewritePostForCompliance, summarizeGenerationReferenceImage, suggestFeedbackCandidates } from "./glm.js";
```

```js
const referenceAssets = await summarizeGenerationReferenceAssets({
  referenceAssets: payload?.referenceAssets,
  summarizeImage: summarizeGenerationReferenceImage,
  modelSelection: generationModelSelection
});

const generation = await generateNoteCandidates({
  mode: payload?.mode,
  brief,
  draft: payload?.draft,
  styleProfile,
  referenceSamples,
  innerSpaceTerms,
  memoryContext,
  referenceAssets,
  modelSelection: generationModelSelection,
  generateJson: Array.isArray(payload?.mockCandidates)
    ? async () => ({ candidates: payload.mockCandidates, provider: "mock", model: "mock-generation" })
    : undefined
});

return sendJson(response, 200, {
  ok: true,
  collectionType,
  memoryContext,
  referenceAssets,
  ...generation,
  ...scored
});
```

Extend `src/generation-workbench.js`:

```js
function stringifyTemporaryReferenceAssets(referenceAssets = null) {
  if (!referenceAssets || typeof referenceAssets !== "object") {
    return "";
  }

  const imageSection = ensureArray(referenceAssets.imageSummaries)
    .map((item, index) => `临时参考图片 ${index + 1}（${item.name || "未命名图片"}）：${String(item.summary || "").trim()}`)
    .filter(Boolean)
    .join("\n");

  const textSection = String(referenceAssets.mergedText || "").trim()
    ? `临时参考文本：\n${String(referenceAssets.mergedText || "").trim().slice(0, 1200)}`
    : "";

  const guidance = [
    "使用边界：可以借鉴表达角度、结构节奏和视觉氛围，但不要直接照抄文本素材原文。",
    "如果临时素材与现有风格画像冲突，优先保持账号整体风格和合规边界。"
  ].join("\n");

  return [imageSection, textSection, guidance].filter(Boolean).join("\n\n");
}
```

Update the exported signatures:

```js
export function buildGenerationMessages({
  mode = "from_scratch",
  brief = {},
  draft = {},
  styleProfile = null,
  referenceSamples = [],
  innerSpaceTerms = [],
  memoryContext = null,
  referenceAssets = null
} = {}) {
  const temporaryReferencePrompt = stringifyTemporaryReferenceAssets(referenceAssets);
  // ...
  return [
    // ...
    {
      role: "user",
      content: [
        // ...existing content...
        temporaryReferencePrompt ? "本次临时参考素材：" : "",
        temporaryReferencePrompt,
        temporaryReferencePrompt ? "" : "",
        "生成规则：",
        // ...
      ].join("\n")
    }
  ];
}
```

```js
export async function generateNoteCandidates({
  mode = "from_scratch",
  brief = {},
  draft = {},
  styleProfile = null,
  referenceSamples = [],
  innerSpaceTerms = [],
  memoryContext = null,
  referenceAssets = null,
  modelSelection = "auto",
  generateJson = generateJsonWithModel
} = {}) {
  const messages = buildGenerationMessages({
    mode,
    brief,
    draft,
    styleProfile,
    referenceSamples,
    innerSpaceTerms,
    memoryContext,
    referenceAssets
  });
  // ...existing function...
}
```

- [ ] **Step 4: Run the focused generation tests to verify they pass**

Run: `node --test test/generation-reference-assets.test.js test/generation-workbench.test.js test/generation-api.test.js test/success-generation-ui.test.js`

Expected: PASS

- [ ] **Step 5: Commit the API and prompt integration slice**

```bash
git add src/server.js src/generation-workbench.js test/generation-api.test.js test/generation-workbench.test.js
git commit -m "feat: feed temporary reference assets into generation"
```

## Plan Self-Review

- Spec coverage: Task 1 implements the upload UI, local staging, image limit, and request payload shape. Task 2 implements request-scoped normalization, text merging, and the “no images means no vision call” rule. Task 3 threads the normalized assets into the route and prompt builder with explicit anti-copy guidance.
- Placeholder scan: No `TODO`, `TBD`, or “similar to above” placeholders remain; each code-changing step includes concrete snippets and commands.
- Type consistency: The shared property name is `referenceAssets` across frontend payload, backend normalization, route response, and prompt builder; nested keys remain `images`, `textFiles`, `imageSummaries`, `mergedText`, `textFileNames`, and `imageFileNames`.
