# Product Simplification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refocus the product around the self-improving loop: detect, rewrite/generate, capture platform outcomes, save false-positive and strong-reference samples, and feed them back into detection and generation.

**Architecture:** Keep existing APIs and storage compatible while simplifying the visible information architecture first. Daily workflows should expose only content work, learning samples, and platform outcome capture; calibration tools remain available behind folded system sections.

**Tech Stack:** Vanilla HTML/CSS/JS frontend in `web/`, Node.js route handlers in `src/server.js`, JSON-backed stores in `data/`, Node test runner via `node --test`.

---

## File Map

- `web/index.html`: Primary information architecture, section labels, visible entry points, and daily versus calibration grouping.
- `web/app.js`: Summary cards, workflow assistant actions, sample labels, and later platform outcome shortcuts.
- `web/styles.css`: Layout support for simplified cards, learning-sample grouping, and calibration folding.
- `src/note-records.js`: Canonical learning-sample record behavior for later data unification tasks.
- `src/sample-library.js`: Existing sample-library compatibility layer used by the current UI.
- `src/false-positive-log.js` equivalent behavior lives in `src/feedback.js` and server routes; keep compatibility while unifying visible concepts.
- `src/server.js`: API route compatibility and later platform outcome shortcut endpoints.
- `test/success-generation-ui.test.js`: Frontend structure regression tests.
- `test/false-positive-admin.test.js`: Feedback and false-positive maintenance UI tests.
- `test/sample-library-api.test.js`: Sample record API compatibility tests.
- `test/note-records-store.test.js`: Canonical sample-record behavior tests.

---

## Phase P0: Visible Product Reduction

### Task P0.1: Rename Main Information Architecture

**Files:**
- Modify: `web/index.html`
- Modify: `web/app.js`
- Test: `test/success-generation-ui.test.js`

- [x] **Step 1: Update frontend structure tests first**

Add expectations that the visible product terms are `内容工作台`, `学习样本`, and `系统校准`, while legacy daily labels such as `低频维护与人工复核` are no longer the primary heading.

Run: `node --test test/success-generation-ui.test.js`

Expected: FAIL until the HTML/JS labels are updated.

- [x] **Step 2: Update visible labels in `web/index.html`**

Change the main analyzer panel heading from detection-only wording to `内容工作台`.

Change the support section heading from `低频维护与人工复核` / `数据维护台` language to `学习样本`.

Keep `系统校准` folded and explicitly describe it as stage-based calibration, not daily work.

- [x] **Step 3: Simplify top summary cards in `web/app.js`**

Replace five cards with three daily cards:

```js
[
  "待处理误判",
  "待补好样本",
  "今日内容流转"
]
```

The cards should still jump to existing panes using `open-feedback-center`, `open-sample-library`, and `open-review-queue` or `open-lifecycle` as appropriate.

- [x] **Step 4: Run focused frontend tests**

Run: `node --test test/success-generation-ui.test.js test/rewrite-panel-behavior.test.js test/false-positive-admin.test.js`

Expected: PASS.

### Task P0.2: Collapse Calibration-Like Entry Points

**Files:**
- Modify: `web/index.html`
- Modify: `web/app.js`
- Test: `test/success-generation-ui.test.js`
- Test: `test/benchmark-generation-ui.test.js`

- [x] **Step 1: Update tests to assert calibration is folded**

Assert `review-benchmark-pane`, `model-performance-pane`, `custom-lexicon-pane`, and `seed-lexicon-pane` remain present but are nested under folded calibration or rules sections.

- [x] **Step 2: Update copy for benchmark and model performance**

Change benchmark wording from daily maintenance to `阶段性回归检查`.

Change model performance wording to `调试与路由稳定性`.

- [x] **Step 3: Run focused tests**

Run: `node --test test/success-generation-ui.test.js test/benchmark-generation-ui.test.js test/model-performance.test.js`

Expected: PASS.

### Task P0.3: Rename Sample Library Surface to Learning Samples

**Files:**
- Modify: `web/index.html`
- Modify: `web/app.js`
- Test: `test/success-generation-ui.test.js`

- [x] **Step 1: Update tests for learning-sample language**

Expect visible labels such as `学习样本`, `新增学习样本`, `好样本`, and `误判样本`.

- [x] **Step 2: Update sample UI labels without changing APIs**

Keep IDs and API calls as `sample-library` for compatibility, but change visible copy to learning-sample language.

- [x] **Step 3: Run focused tests**

Run: `node --test test/success-generation-ui.test.js test/sample-library-api.test.js`

Expected: PASS.

---

## Phase P1: Platform Outcome Capture

### Task P1.1: Add Platform Result Shortcuts

**Files:**
- Modify: `web/index.html`
- Modify: `web/app.js`
- Modify: `src/server.js`
- Test: `test/success-generation-ui.test.js`
- Test: `test/note-lifecycle-api.test.js`

- [x] **Step 1: Add failing UI tests**

Assert generated, rewritten, and analyzed results expose outcome actions: `平台通过`, `平台违规`, `效果好`, `效果一般`, `系统误判`.

- [x] **Step 2: Add minimal action markup**

Render the shortcuts near result panels after there is a current note context.

- [x] **Step 3: Store outcomes through existing note-record paths**

Use existing sample-library or note-record lifecycle APIs first. Add a new route only if the current APIs cannot express the outcome.

- [x] **Step 4: Run tests**

Run: `node --test test/success-generation-ui.test.js test/note-lifecycle-api.test.js test/sample-library-api.test.js`

Expected: PASS.

### Task P1.2: Add Outcome Feedback Message

**Files:**
- Modify: `web/app.js`
- Test: `test/success-generation-ui.test.js`

- [x] **Step 1: Test save feedback copy**

Assert saving a good sample says it will feed generation style references. Assert saving a false-positive sample says it will feed detection calibration.

- [x] **Step 2: Render feedback after successful save**

Show one concise message after each shortcut action.

- [x] **Step 3: Run tests**

Run: `node --test test/success-generation-ui.test.js`

Expected: PASS.

---

## Phase P2: Data Concept Unification

### Task P2.1: Treat `note-records` as the Canonical Learning-Sample Source

**Files:**
- Modify: `src/note-records.js`
- Modify: `src/sample-library.js`
- Modify: `src/server.js`
- Test: `test/note-records-store.test.js`
- Test: `test/sample-library-api.test.js`

- [x] **Step 1: Add tests for sample type normalization**

Cover `good_sample`, `false_positive`, `missed_violation`, `rewrite_success`, and `observe`.

- [x] **Step 2: Add normalization helpers**

Normalize new visible sample types into the canonical note-record shape.

- [x] **Step 3: Preserve old API responses**

Keep current `/api/sample-library` fields working so the existing frontend remains compatible.

- [x] **Step 4: Run tests**

Run: `node --test test/note-records-store.test.js test/sample-library-api.test.js`

Expected: PASS.

### Task P2.2: Present Rewrite Pairs and Success Samples as Learning-Sample Types

**Files:**
- Modify: `web/app.js`
- Modify: `src/server.js`
- Test: `test/rewrite-pairs-api.test.js`
- Test: `test/success-samples-api.test.js`

- [x] **Step 1: Add tests for compatibility views**

Ensure old rewrite-pair and success-sample endpoints still return data, while the UI labels describe them as learning samples.

- [x] **Step 2: Update UI labels and grouping**

Show rewrite pairs as `改写成功样本`; show success samples as `好样本`.

- [x] **Step 3: Run tests**

Run: `node --test test/rewrite-pairs-api.test.js test/success-samples-api.test.js test/success-generation-ui.test.js`

Expected: PASS.

---

## Phase P3: Advanced Capabilities Stay Available but Quiet

### Task P3.1: Keep Cross Review as Advanced Judgement

**Files:**
- Modify: `web/index.html`
- Modify: `web/app.js`
- Test: `test/rewrite-panel-behavior.test.js`

- [x] **Step 1: Assert cross review remains folded under advanced judgement**

Expect the button and selector to remain available, but not presented as the primary next step unless current results are uncertain.

- [x] **Step 2: Tighten assistant recommendations**

Only recommend cross review when the latest result is close or conflicting.

- [x] **Step 3: Run tests**

Run: `node --test test/rewrite-panel-behavior.test.js test/model-selection.test.js`

Expected: PASS.

### Task P3.2: Simplify Model Recommendation Copy

**Files:**
- Modify: `web/app.js`
- Modify: `src/model-performance.js`
- Test: `test/model-performance.test.js`

- [x] **Step 1: Add tests for single recommendation language**

Ensure the UI provides one current suggestion, with secondary details available only in the model performance panel.

- [x] **Step 2: Update recommendation rendering**

Keep data collection intact, but reduce the main UI to one recommendation.

- [x] **Step 3: Run tests**

Run: `node --test test/model-performance.test.js test/success-generation-ui.test.js`

Expected: PASS.

---

## Verification

After each task, run the focused tests listed in the task.

Before calling the simplification complete, run:

```bash
node --test
```

Expected: all tests pass.
