# Deep Nested Actions Modal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace deeply nested sample-library editing surfaces with modal-based flows so PDF import advanced fields and sample detail deep actions no longer depend on cramped inline accordions.

**Architecture:** Keep all server APIs and record shapes unchanged. Add one shared frontend modal shell in `web/index.html`, render modal contents from `web/app.js`, and reuse the existing normalization/save helpers so each modal saves independently and refreshes the current summary state after success.

**Tech Stack:** Static HTML, vanilla JavaScript in `web/app.js`, CSS in `web/styles.css`, Node test runner with frontend regression tests.

---

## File Structure

- Modify `web/index.html`
  Add one shared modal host near the end of the page and expose stable IDs for overlay, title, content, result area, and footer actions.
- Modify `web/app.js`
  Add modal state helpers, PDF import advanced modal rendering/save logic, sample detail modal rendering/save logic, and event handlers for open/cancel/save actions.
- Modify `web/styles.css`
  Add theme-matched modal layout, overlay, sticky footer actions, compact summary cards, and responsive rules.
- Modify `test/sample-library-pdf-import-ui.test.js`
  Lock the PDF import UI onto modal entrypoints instead of nested advanced `details`.
- Modify `test/success-generation-ui.test.js`
  Lock the sample-library detail UI onto modal entrypoints, shared modal shell IDs, and new CSS hooks.

### Task 1: Lock PDF Import Modal Regressions

**Files:**
- Modify: `test/sample-library-pdf-import-ui.test.js`
- Test: `test/sample-library-pdf-import-ui.test.js`

- [ ] **Step 1: Write the failing test assertions for modal-based PDF import advanced editing**

```js
  assert.match(appJs, /sample-library-import-open-advanced-modal/);
  assert.match(appJs, /sample-library-modal/);
  assert.match(appJs, /sample-library-modal-save/);
  assert.doesNotMatch(appJs, /<details class="sample-library-import-advanced admin-accordion">/);
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `node --test test/sample-library-pdf-import-ui.test.js`
Expected: FAIL because the current UI still renders `sample-library-import-advanced` as a nested `details` block and does not expose the modal action strings.

- [ ] **Step 3: Implement the minimal test updates for the new modal contract**

```js
test("sample library frontend wires modal-based advanced editing for PDF imports", async () => {
  const { indexHtml, appJs, styles } = await readFrontendFiles();

  assert.match(indexHtml, /id="sample-library-modal"/);
  assert.match(indexHtml, /id="sample-library-modal-content"/);
  assert.match(indexHtml, /id="sample-library-modal-save"/);
  assert.match(appJs, /data-action="sample-library-import-open-advanced-modal"/);
  assert.match(appJs, /function openSampleLibraryImportAdvancedModal\(/);
  assert.match(appJs, /function saveSampleLibraryImportAdvancedModal\(/);
  assert.doesNotMatch(appJs, /<details class="sample-library-import-advanced admin-accordion">/);
  assert.match(styles, /\.sample-library-modal/);
});
```

- [ ] **Step 4: Run the focused test again and confirm it still fails for the right reason**

Run: `node --test test/sample-library-pdf-import-ui.test.js`
Expected: FAIL on missing modal IDs/actions before production code changes are added.

- [ ] **Step 5: Commit the red test**

```bash
git add test/sample-library-pdf-import-ui.test.js
git commit -m "test: lock pdf import advanced editing to modal flow"
```

### Task 2: Lock Sample Detail Modal Regressions

**Files:**
- Modify: `test/success-generation-ui.test.js`
- Test: `test/success-generation-ui.test.js`

- [ ] **Step 1: Write the failing test assertions for detail modal entrypoints**

```js
  assert.match(appJs, /open-sample-library-reference-modal/);
  assert.match(appJs, /open-sample-library-lifecycle-modal/);
  assert.match(appJs, /open-sample-library-calibration-modal/);
  assert.match(appJs, /sample-library-modal-cancel/);
```

- [ ] **Step 2: Run the focused frontend regression test to verify it fails**

Run: `node --test test/success-generation-ui.test.js`
Expected: FAIL because the current detail sections still render inline form bodies with direct save buttons rather than modal open actions.

- [ ] **Step 3: Expand the regression surface to cover modal summaries and shell hooks**

```js
  assert.match(indexHtml, /id="sample-library-modal-title"/);
  assert.match(indexHtml, /id="sample-library-modal-result"/);
  assert.match(appJs, /data-action="open-sample-library-reference-modal"/);
  assert.match(appJs, /data-action="open-sample-library-lifecycle-modal"/);
  assert.match(appJs, /data-action="open-sample-library-calibration-modal"/);
  assert.match(appJs, /function openSampleLibraryDetailModal\(/);
  assert.match(appJs, /function saveSampleLibraryDetailModal\(/);
  assert.match(styles, /\.sample-library-detail-summary-card/);
```

- [ ] **Step 4: Run the focused regression test again and confirm it fails for missing modal wiring**

Run: `node --test test/success-generation-ui.test.js`
Expected: FAIL on missing modal shell IDs and detail modal action strings.

- [ ] **Step 5: Commit the red test**

```bash
git add test/success-generation-ui.test.js
git commit -m "test: lock sample detail deep actions to modal flow"
```

### Task 3: Implement Shared Modal Shell and PDF Import Advanced Editor

**Files:**
- Modify: `web/index.html`
- Modify: `web/app.js`
- Modify: `web/styles.css`
- Test: `test/sample-library-pdf-import-ui.test.js`

- [ ] **Step 1: Add the shared modal shell markup to the page**

```html
      <div id="sample-library-modal" class="sample-library-modal" hidden>
        <div class="sample-library-modal-overlay" data-action="close-sample-library-modal"></div>
        <section class="sample-library-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="sample-library-modal-title">
          <header class="sample-library-modal-header">
            <div>
              <strong id="sample-library-modal-title">编辑内容</strong>
              <p id="sample-library-modal-subtitle">在弹窗中完成这一块的独立编辑与保存。</p>
            </div>
            <button type="button" class="button button-ghost button-small" data-action="close-sample-library-modal">关闭</button>
          </header>
          <div id="sample-library-modal-result" class="helper-text" aria-live="polite"></div>
          <div id="sample-library-modal-content" class="sample-library-modal-content"></div>
          <footer class="sample-library-modal-footer">
            <button type="button" id="sample-library-modal-cancel" class="button button-ghost" data-action="close-sample-library-modal">取消</button>
            <button type="button" id="sample-library-modal-save" class="button">保存</button>
          </footer>
        </section>
      </div>
```

- [ ] **Step 2: Add modal state and PDF import advanced modal render/save helpers in `web/app.js`**

```js
function openSampleLibraryImportAdvancedModal(index) {
  const draft = appState.sampleLibraryImportDrafts[index];
  if (!draft) return;

  appState.sampleLibraryModal = { kind: "import-advanced", index };
  renderSampleLibraryModal({
    title: "编辑高级属性",
    subtitle: draft.fileName || "补充参考属性与生命周期属性",
    body: buildSampleLibraryImportAdvancedModalMarkup(draft)
  });
}

async function saveSampleLibraryImportAdvancedModal() {
  const modalState = appState.sampleLibraryModal;
  if (modalState?.kind !== "import-advanced") return;
  persistSampleLibraryImportAdvancedDraft(modalState.index, readSampleLibraryImportAdvancedModalForm());
  renderSampleLibraryImportDrafts(appState.sampleLibraryImportDrafts);
  closeSampleLibraryModal();
}
```

- [ ] **Step 3: Replace the PDF import nested `details` block with summary + modal open button**

```js
              <div class="sample-library-detail-summary-card">
                <div>
                  <strong>高级属性</strong>
                  <p>参考属性和生命周期属性移到弹窗内编辑，避免卡片内继续嵌套。</p>
                </div>
                <div class="item-actions">
                  <span class="sample-library-import-advanced-status">
                    ${buildSampleLibraryImportCardAdvancedStatusMarkup({ reference, publish })}
                  </span>
                  <button type="button" class="button button-ghost button-small" data-action="sample-library-import-open-advanced-modal">
                    编辑高级属性
                  </button>
                </div>
              </div>
```

- [ ] **Step 4: Add modal styling and responsive rules in `web/styles.css`**

```css
.sample-library-modal {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: grid;
  place-items: center;
  padding: 1.25rem;
}

.sample-library-modal-dialog {
  width: min(760px, calc(100vw - 2rem));
  max-height: calc(100vh - 2rem);
  overflow: hidden;
  border-radius: 28px;
  border: 1px solid rgba(54, 43, 31, 0.12);
  background: linear-gradient(180deg, rgba(255, 251, 244, 0.98), rgba(247, 237, 221, 0.96));
}
```

- [ ] **Step 5: Run the focused PDF import UI test and confirm it passes**

Run: `node --test test/sample-library-pdf-import-ui.test.js`
Expected: PASS with the modal shell IDs, modal action strings, and without the old nested advanced `details` markup.

- [ ] **Step 6: Commit the green implementation**

```bash
git add web/index.html web/app.js web/styles.css test/sample-library-pdf-import-ui.test.js
git commit -m "feat: move pdf import advanced editing into modal"
```

### Task 4: Implement Sample Detail Reference/Lifecycle/Calibration Modals

**Files:**
- Modify: `web/app.js`
- Modify: `web/styles.css`
- Test: `test/success-generation-ui.test.js`

- [ ] **Step 1: Replace inline deep form bodies with summary cards and modal open buttons**

```js
      body: `
        <article class="sample-library-detail-summary-card">
          <div>
            <strong>当前状态：${escapeHtml(referenceSummary)}</strong>
            <p>${escapeHtml(reference.notes || "还没有补充参考备注。")}</p>
          </div>
          <div class="item-actions">
            <button type="button" class="button button-small" data-action="open-sample-library-reference-modal" data-id="${escapeHtml(record.id || "")}">
              编辑参考属性
            </button>
          </div>
          <p class="helper-text action-gate-hint" id="sample-library-reference-action-hint" aria-live="polite"></p>
        </article>
      `
```

- [ ] **Step 2: Add detail modal renderers, form readers, and save handlers**

```js
function openSampleLibraryDetailModal(kind, recordId) {
  const record = appState.sampleLibraryRecords.find((item) => String(item.id || "") === String(recordId || ""));
  if (!record) return;

  appState.sampleLibraryModal = { kind, recordId: String(record.id || "") };
  renderSampleLibraryModal(buildSampleLibraryDetailModalConfig(kind, record));
}

async function saveSampleLibraryDetailModal() {
  const modalState = appState.sampleLibraryModal;
  if (!modalState?.recordId) return;

  if (modalState.kind === "reference") await saveSampleLibraryReferenceModal(modalState.recordId);
  if (modalState.kind === "lifecycle") await saveSampleLibraryLifecycleModal(modalState.recordId);
  if (modalState.kind === "calibration") await saveSampleLibraryCalibrationModal(modalState.recordId);
}
```

- [ ] **Step 3: Keep existing persistence helpers and step progression by reusing the old save payload shape**

```js
await apiJson(sampleLibraryApi, {
  method: "PATCH",
  body: JSON.stringify({
    id: recordId,
    reference: {
      enabled,
      tier,
      notes
    }
  })
});
setSampleLibraryDetailStep("lifecycle");
await refreshSampleLibraryWorkspace();
closeSampleLibraryModal();
```

- [ ] **Step 4: Add summary-card styling for the detail sections and modal content grids**

```css
.sample-library-detail-summary-card {
  display: grid;
  gap: 0.85rem;
  padding: 1rem;
  border: 1px solid rgba(54, 43, 31, 0.08);
  border-radius: 20px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.66), rgba(251, 244, 232, 0.76));
}

.sample-library-modal-content {
  overflow: auto;
  padding: 0 1.25rem 1rem;
}
```

- [ ] **Step 5: Run the focused sample detail regression test and confirm it passes**

Run: `node --test test/success-generation-ui.test.js`
Expected: PASS with modal entrypoints for reference, lifecycle, and calibration plus the shared modal shell hooks.

- [ ] **Step 6: Commit the green implementation**

```bash
git add web/app.js web/styles.css test/success-generation-ui.test.js
git commit -m "feat: move sample detail deep editors into modals"
```

### Task 5: Run Integrated Verification

**Files:**
- Modify: `docs/superpowers/plans/2026-05-06-deep-nested-actions-modal.md`
- Test: `test/sample-library-pdf-import-ui.test.js`
- Test: `test/success-generation-ui.test.js`
- Test: `test/sample-library-pdf-import-api.test.js`
- Test: `test/sample-library-api.test.js`

- [ ] **Step 1: Run the targeted frontend regression suite**

Run: `node --test test/sample-library-pdf-import-ui.test.js test/success-generation-ui.test.js`
Expected: PASS for the new modal entrypoints and shell IDs.

- [ ] **Step 2: Run the sample-library API and import regression suite**

Run: `node --test test/sample-library-pdf-import-api.test.js test/sample-library-api.test.js`
Expected: PASS because the modal refactor does not change storage contracts or API payload shapes.

- [ ] **Step 3: Mark completed tasks in this plan file**

```md
- [x] **Step 1: Run the targeted frontend regression suite**
- [x] **Step 2: Run the sample-library API and import regression suite**
```

- [ ] **Step 4: Commit the verified plan and any final polish**

```bash
git add docs/superpowers/plans/2026-05-06-deep-nested-actions-modal.md
git commit -m "docs: record deep nested actions modal implementation plan"
```
