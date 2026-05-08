# Sample Library Record Inline Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把“查看全部记录列表”弹窗升级成支持四块完整内联编辑、整条记录统一保存的维护工作台，并让主页面不再展示样本详情数据。

**Architecture:** 继续复用现有 `sample-library-modal`，但把原先的 `record-list` 查看型弹窗升级成左右分栏的 master-detail 编辑器。左栏维护当前筛选结果的完整列表，右栏维护当前记录草稿与四块编辑表单；统一保存通过单次 `PATCH /api/sample-library` 提交 `note + reference + publish + calibration`，同时用 modal state 追踪 dirty 与待确认切换/关闭动作。主页面只保留筛选、短预览和进入弹窗入口，不再渲染样本详情区中的具体数据。

**Tech Stack:** `web/index.html`、`web/app.js`、`web/styles.css`、`node:test`

---

## File Structure

### Modified files

- `web/index.html`
  移除主页面样本详情区的静态结构，让主页面只保留记录预览和进入弹窗入口。
- `web/app.js`
  新增记录弹窗内联编辑的 state、草稿转换、dirty 检测、统一保存、放弃确认和分栏渲染；抽取可复用的四块编辑 section builder，供内联编辑和现有二级弹窗共用，同时把主页面的“打开记录”路径收敛到弹窗工作台。
- `web/styles.css`
  为记录弹窗增加左右分栏、右栏滚动区、内联表单节奏和待确认状态样式，继续沿用现有 `sample-library-modal` 视觉体系，同时收口主页面去掉详情区后的布局。
- `test/success-generation-ui.test.js`
  增加记录弹窗内联编辑的结构与行为保护，包括统一保存、dirty 拦截、选中记录切换和复用字段逻辑，并保护主页面不再渲染样本详情区。

### Existing docs to reference

- `docs/superpowers/specs/2026-05-07-sample-library-record-inline-editor-design.md`
- `docs/superpowers/specs/2026-05-07-sample-library-list-modals-design.md`

## Task 1: 为记录弹窗内联编辑补失败测试

**Files:**
- Modify: `test/success-generation-ui.test.js`

- [ ] **Step 1: 写记录弹窗内联编辑结构与统一保存的失败测试**

```js
test("sample library record modal upgrades to inline master-detail editing", async () => {
  const { appJs, styles } = await readFrontendFiles();
  const inlineEditorSource = extractSourceBetween(
    appJs,
    "function buildSampleLibraryRecordInlineEditorModalMarkup(",
    "function renderSampleLibraryRecordInlineEditorModal("
  );

  assert.match(appJs, /function\s+buildSampleLibraryRecordInlineEditorDraft\s*\(/);
  assert.match(appJs, /function\s+buildSampleLibraryRecordInlineEditorPatchPayload\s*\(/);
  assert.match(appJs, /function\s+buildSampleLibraryRecordInlineEditorModalMarkup\s*\(/);
  assert.match(appJs, /function\s+saveSampleLibraryRecordInlineEditorModal\s*\(/);
  assert.match(appJs, /function\s+requestSampleLibraryRecordInlineEditorSwitch\s*\(/);
  assert.match(appJs, /function\s+requestCloseSampleLibraryRecordInlineEditorModal\s*\(/);
  assert.match(appJs, /kind:\s*"record-list-inline-editor"/);
  assert.match(inlineEditorSource, /sample-library-record-inline-editor-layout/);
  assert.match(inlineEditorSource, /sample-library-record-inline-editor-sidebar/);
  assert.match(inlineEditorSource, /sample-library-record-inline-editor-detail/);
  assert.match(inlineEditorSource, /保存整条记录/);
  assert.match(inlineEditorSource, /data-action="switch-sample-library-record-inline-editor-record"/);
  assert.match(inlineEditorSource, /data-action="open-sample-library-delete-modal"/);
  assert.match(styles, /\.sample-library-record-inline-editor-layout/);
});

test("record inline editor keeps one unified patch payload and dirty-aware record switching", async () => {
  const { appJs } = await readFrontendFiles();
  const draftHelperSource = extractSourceBetween(
    appJs,
    "function buildSampleLibraryRecordInlineEditorDraft(",
    "function buildSampleLibraryRecordInlineEditorPatchPayload("
  );
  const payloadHelperSource = extractSourceBetween(
    appJs,
    "function buildSampleLibraryRecordInlineEditorPatchPayload(",
    "function isSampleLibraryRecordInlineEditorDirty("
  );
  const dirtyHelperSource = extractSourceBetween(
    appJs,
    "function isSampleLibraryRecordInlineEditorDirty(",
    "function buildSampleLibraryRecordInlineEditorSidebarMarkup("
  );

  const buildDraft = new Function(
    "getSampleRecordNote",
    "getSampleRecordCollectionType",
    "getSampleRecordReference",
    "getSampleRecordPublish",
    "getSampleRecordCalibration",
    `${draftHelperSource}; return buildSampleLibraryRecordInlineEditorDraft;`
  )(
    (record) => record.note || {},
    (record) => record.note?.collectionType || "",
    (record) => record.reference || {},
    (record) => record.publish || {},
    (record) => record.calibration || {}
  );

  const record = {
    id: "note-4",
    note: { title: "标题", body: "正文", coverText: "封面", collectionType: "all", tags: ["a"] },
    reference: { enabled: true, tier: "passed", notes: "ref" },
    publish: { status: "published_passed", metrics: { likes: 1, favorites: 2, comments: 3, views: 4 } },
    calibration: { prediction: { predictedStatus: "published_passed" }, retro: { notes: "retro" } }
  };

  const draft = buildDraft(record);
  assert.equal(draft.note.title, "标题");
  assert.equal(draft.reference.enabled, true);
  assert.equal(draft.publish.metrics.views, 4);

  const buildPatchPayload = new Function(`${payloadHelperSource}; return buildSampleLibraryRecordInlineEditorPatchPayload;`)();
  const payload = buildPatchPayload("note-4", draft);
  assert.deepEqual(Object.keys(payload).sort(), ["calibration", "id", "note", "publish", "reference"]);

  const isDirty = new Function(`${dirtyHelperSource}; return isSampleLibraryRecordInlineEditorDirty;`)();
  assert.equal(isDirty({ draft, initialSnapshot: draft }), false);
  assert.equal(
    isDirty({
      draft: { ...draft, note: { ...draft.note, title: "新标题" } },
      initialSnapshot: draft
    }),
    true
  );

  assert.match(appJs, /pendingAction:\s*\{\s*type:\s*"switch-record"/);
  assert.match(appJs, /pendingAction:\s*\{\s*type:\s*"close"/);
  assert.match(appJs, /method:\s*"PATCH"[\s\S]*note:[\s\S]*reference:[\s\S]*publish:[\s\S]*calibration:/);
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test test/success-generation-ui.test.js`

Expected: FAIL with missing inline-editor helper / modal assertions

- [ ] **Step 3: 提交测试红灯快照**

```bash
git add test/success-generation-ui.test.js
git commit -m "test: cover sample library inline record editor"
```

## Task 2: 抽取四块编辑 section 并搭出左右分栏弹窗

**Files:**
- Modify: `web/app.js`
- Modify: `web/styles.css`
- Test: `test/success-generation-ui.test.js`

- [ ] **Step 1: 先抽取可复用的编辑 section builder，避免复制两套字段语义**

```js
function buildSampleLibraryNoteEditorSectionMarkup({
  title = "",
  body = "",
  coverText = "",
  collectionType = "",
  tags = [],
  includeViews = false,
  views = 0,
  includePrefillActions = false
} = {}) {
  return `
    <section class="sample-library-modal-section">
      <div class="sample-library-modal-section-head">
        <strong>基础内容</strong>
        <p>先把标题、正文、封面文案和标签整理好，后续筛选都会基于这里。</p>
      </div>
      <label>
        <span>标题</span>
        <input name="title" value="${escapeHtml(title)}" placeholder="样本标题" />
      </label>
      <label>
        <span>正文</span>
        <textarea name="body" rows="6" placeholder="样本正文">${escapeHtml(body)}</textarea>
      </label>
      <label>
        <span>封面文案</span>
        <input name="coverText" value="${escapeHtml(coverText)}" placeholder="封面文案" />
      </label>
      <label>
        <span>合集类型</span>
        <select name="collectionType">
          ${buildCollectionTypeOptionsMarkup({ options: appState.collectionTypeOptions, value: collectionType })}
        </select>
      </label>
      <div class="sample-library-create-metrics">
        ${buildSampleLibraryModalTagPickerMarkup(tags)}
        ${
          includeViews
            ? `
              <label>
                <span>浏览数</span>
                <input name="views" type="number" min="0" value="${escapeHtml(String(views || 0))}" />
              </label>
            `
            : ""
        }
      </div>
      ${
        includePrefillActions
          ? `
            <div class="inline-actions inline-actions-row">
              <button type="button" class="button button-ghost" data-action="prefill-sample-library-create-analysis">从当前检测填充</button>
              <button type="button" class="button button-ghost" data-action="prefill-sample-library-create-rewrite">从当前改写填充</button>
            </div>
          `
          : ""
      }
    </section>
  `;
}
```

- [ ] **Step 2: 让现有单块弹窗改为复用这些 section builder**

```js
function buildSampleLibraryBaseModalMarkup(record = {}) {
  const note = getSampleRecordNote(record);

  return `
    <div class="sample-library-modal-stack compact-form">
      ${buildSampleLibraryNoteEditorSectionMarkup({
        title: note.title || "",
        body: note.body || "",
        coverText: note.coverText || "",
        collectionType: getSampleRecordCollectionType(record),
        tags: note.tags || []
      })}
    </div>
  `;
}
```

- [ ] **Step 3: 新增记录弹窗内联编辑草稿与分栏 markup**

```js
function buildSampleLibraryRecordInlineEditorDraft(record = {}) {
  const note = getSampleRecordNote(record);
  const reference = getSampleRecordReference(record);
  const publish = getSampleRecordPublish(record);
  const calibration = getSampleRecordCalibration(record);

  return {
    note: {
      title: note.title || "",
      body: note.body || "",
      coverText: note.coverText || "",
      collectionType: getSampleRecordCollectionType(record),
      tags: Array.isArray(note.tags) ? [...note.tags] : []
    },
    reference: {
      enabled: reference.enabled === true,
      tier: reference.tier || "",
      notes: reference.notes || ""
    },
    publish: {
      status: publish.status || "not_published",
      publishedAt: publish.publishedAt || "",
      platformReason: publish.platformReason || "",
      notes: publish.notes || "",
      metrics: {
        likes: Number(publish.metrics?.likes || 0) || 0,
        favorites: Number(publish.metrics?.favorites || 0) || 0,
        comments: Number(publish.metrics?.comments || 0) || 0,
        views: Number(publish.metrics?.views || 0) || 0
      }
    },
    calibration: structuredClone(calibration || { prediction: {}, retro: {} })
  };
}

function buildSampleLibraryRecordInlineEditorModalMarkup({ items = [], modalState }) {
  return `
    <div class="sample-library-record-inline-editor-layout">
      <aside class="sample-library-record-inline-editor-sidebar">
        ${buildSampleLibraryRecordInlineEditorSidebarMarkup(items, modalState)}
      </aside>
      <section class="sample-library-record-inline-editor-detail">
        ${buildSampleLibraryRecordInlineEditorDetailMarkup(modalState)}
      </section>
    </div>
  `;
}
```

- [ ] **Step 4: 增加左右分栏样式，让右栏独立滚动**

```css
.sample-library-record-inline-editor-layout {
  display: grid;
  grid-template-columns: minmax(260px, 0.92fr) minmax(0, 1.45fr);
  gap: 1rem;
  min-height: min(70vh, 860px);
}

.sample-library-record-inline-editor-sidebar,
.sample-library-record-inline-editor-detail {
  min-height: 0;
}

.sample-library-record-inline-editor-sidebar {
  display: grid;
  gap: 0.8rem;
  padding-right: 0.2rem;
  overflow: auto;
}

.sample-library-record-inline-editor-detail {
  display: grid;
  gap: 0.9rem;
  padding-right: 0.2rem;
  overflow: auto;
}
```

- [ ] **Step 5: 运行测试确认结构通过但行为仍待补**

Run: `node --test test/success-generation-ui.test.js`

Expected: still FAIL on dirty / unified-save assertions

- [ ] **Step 6: 提交结构阶段**

```bash
git add web/app.js web/styles.css test/success-generation-ui.test.js
git commit -m "feat: scaffold sample library inline record editor modal"
```

## Task 3: 接上 dirty 检测、切换拦截和整条统一保存

**Files:**
- Modify: `web/app.js`
- Test: `test/success-generation-ui.test.js`

- [ ] **Step 1: 为 inline editor modal state 增加草稿、基线和待确认动作**

```js
function openSampleLibraryRecordInlineEditorModal() {
  const filteredItems = filterSampleLibraryRecords(appState.sampleLibraryRecords);
  const selectedRecord =
    filteredItems.find((item) => String(item?.id || "") === appState.selectedSampleLibraryRecordId) || filteredItems[0] || null;

  if (!selectedRecord) {
    return;
  }

  const draft = buildSampleLibraryRecordInlineEditorDraft(selectedRecord);
  appState.sampleLibraryModal = {
    kind: "record-list-inline-editor",
    recordId: String(selectedRecord.id || ""),
    draft,
    initialSnapshot: structuredClone(draft),
    dirty: false,
    pendingAction: null
  };

  renderSampleLibraryRecordInlineEditorModal();
}
```

- [ ] **Step 2: 用统一 helper 读写当前草稿并判断 dirty**

```js
function buildSampleLibraryRecordInlineEditorPatchPayload(recordId = "", draft = {}) {
  return {
    id: String(recordId || ""),
    note: draft.note || {},
    reference: draft.reference || {},
    publish: draft.publish || {},
    calibration: draft.calibration || {}
  };
}

function isSampleLibraryRecordInlineEditorDirty(modalState = {}) {
  return JSON.stringify(modalState.draft || {}) !== JSON.stringify(modalState.initialSnapshot || {});
}

function syncSampleLibraryRecordInlineEditorDirtyState() {
  if (appState.sampleLibraryModal?.kind !== "record-list-inline-editor") {
    return;
  }

  appState.sampleLibraryModal.dirty = isSampleLibraryRecordInlineEditorDirty(appState.sampleLibraryModal);
}
```

- [ ] **Step 3: 统一拦截“切换记录”和“关闭弹窗”**

```js
function requestSampleLibraryRecordInlineEditorSwitch(recordId = "") {
  const modalState = appState.sampleLibraryModal;

  if (!modalState || modalState.kind !== "record-list-inline-editor") {
    return;
  }

  if (!modalState.dirty) {
    selectSampleLibraryRecordInlineEditorRecord(recordId);
    return;
  }

  appState.sampleLibraryModal = {
    ...modalState,
    pendingAction: {
      type: "switch-record",
      recordId: String(recordId || "")
    }
  };
  renderSampleLibraryRecordInlineEditorModal();
}

function requestCloseSampleLibraryRecordInlineEditorModal() {
  const modalState = appState.sampleLibraryModal;

  if (!modalState || modalState.kind !== "record-list-inline-editor") {
    closeSampleLibraryModal();
    return;
  }

  if (!modalState.dirty) {
    closeSampleLibraryModal();
    return;
  }

  appState.sampleLibraryModal = {
    ...modalState,
    pendingAction: {
      type: "close"
    }
  };
  renderSampleLibraryRecordInlineEditorModal();
}
```

- [ ] **Step 4: 统一保存整条记录，并在成功后刷新两侧**

```js
async function saveSampleLibraryRecordInlineEditorModal() {
  const modalState = appState.sampleLibraryModal;

  if (!modalState || modalState.kind !== "record-list-inline-editor") {
    return;
  }

  const baseMessage = getSampleLibraryDetailBaseRequirementMessage(byId("sample-library-modal-content"));
  if (baseMessage) {
    throw new Error(baseMessage);
  }

  const referenceMessage = getSampleLibraryDetailReferenceRequirementMessage(byId("sample-library-modal-content"));
  if (referenceMessage) {
    throw new Error(referenceMessage);
  }

  const payload = buildSampleLibraryRecordInlineEditorPatchPayload(modalState.recordId, modalState.draft);
  const response = await patchSampleLibraryRecordAndRefresh(payload, {
    recordId: modalState.recordId,
    nextStep: appState.sampleLibraryDetailStep || "base"
  });

  const nextRecord = response.item || appState.sampleLibraryRecords.find((item) => String(item?.id || "") === modalState.recordId);
  const nextDraft = buildSampleLibraryRecordInlineEditorDraft(nextRecord || {});

  appState.sampleLibraryModal = {
    ...appState.sampleLibraryModal,
    draft: nextDraft,
    initialSnapshot: structuredClone(nextDraft),
    dirty: false,
    pendingAction: null
  };

  renderSampleLibraryRecordInlineEditorModal();
  setSampleLibraryModalMessage("整条记录已保存。");
}
```

- [ ] **Step 5: 把 modal click/save/close 分发改接到 inline editor 路径**

```js
if (action === "open-sample-library-record-list-modal") {
  openSampleLibraryRecordInlineEditorModal();
  return;
}

if (action === "switch-sample-library-record-inline-editor-record") {
  requestSampleLibraryRecordInlineEditorSwitch(button.dataset.id);
  return;
}

if (action === "close-sample-library-modal" && appState.sampleLibraryModal?.kind === "record-list-inline-editor") {
  requestCloseSampleLibraryRecordInlineEditorModal();
  return;
}
```

- [ ] **Step 6: 让 modal save 按钮在 inline editor 模式下走统一保存**

```js
if (modalState.kind === "record-list-inline-editor") {
  await saveSampleLibraryRecordInlineEditorModal();
} else if (modalState.kind === "import-advanced") {
  saveSampleLibraryImportAdvancedModal();
} else {
  await saveSampleLibraryDetailModal();
}
```

- [ ] **Step 7: 运行测试确认通过**

Run: `node --test test/success-generation-ui.test.js`

Expected: PASS

- [ ] **Step 8: 提交统一保存阶段**

```bash
git add web/app.js test/success-generation-ui.test.js
git commit -m "feat: add unified inline editing for sample library records"
```

## Task 4: 样式收口与相关回归

**Files:**
- Modify: `web/styles.css`
- Modify: `test/success-generation-ui.test.js`

- [ ] **Step 1: 优化 footer 与待确认状态文案**

```css
.sample-library-record-inline-editor-layout .sample-library-modal-section {
  gap: 0.95rem;
}

.sample-library-record-inline-editor-confirm {
  padding: 0.85rem 0.95rem;
  border: 1px solid rgba(181, 121, 43, 0.18);
  border-radius: 18px;
  background: linear-gradient(180deg, rgba(255, 248, 234, 0.9), rgba(250, 238, 212, 0.82));
}
```

- [ ] **Step 2: 跑记录弹窗与现有样本库前端回归**

Run: `node --test test/success-generation-ui.test.js test/sample-library-pdf-import-ui.test.js`

Expected: PASS

- [ ] **Step 3: 跑误报与共享 modal 回归，确认没有把既有 modal 行为带坏**

Run: `node --test test/false-positive-admin.test.js test/false-positive-view.test.js`

Expected: PASS

- [ ] **Step 4: 提交回归与样式阶段**

```bash
git add web/styles.css test/success-generation-ui.test.js
git commit -m "test: lock sample library inline editor regressions"
```
