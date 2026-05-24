# Web App Modularization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split `web/app.js` into focused frontend modules without changing user-visible behavior.

**Architecture:** Keep `web/app.js` as the orchestration surface for `appState`, bootstrapping, and event wiring. Extract pure view/payload/helper logic into focused `web/*.js` modules that follow the existing lightweight ES module pattern already used by `web/rewrite-result-view.js` and `web/false-positive-view.js`.

**Tech Stack:** Plain browser-side ES modules, existing DOM-driven UI, Node test runner, frontend regression tests in `test/success-generation-ui.test.js`

---

## File Structure

### Existing files we will modify

- `web/app.js`
  - Keep orchestration, state, request flow, and event wiring
  - Replace inlined view/helper code with imports from extracted modules
- `test/success-generation-ui.test.js`
  - Update regression coverage to assert imports / moved helpers where needed

### New files we will create

- `web/style-profile-view.js`
  - Own style profile modal markup + payload readers + local formatting helpers tightly coupled to that modal
- `web/sample-library-calibration-view.js`
  - Own calibration evidence markup, retro chip markup, prediction/review suggestion helpers, and calibration payload readers if safely movable
- `web/theme-inspiration-view.js`
  - Own theme inspiration modal and detail rendering helpers
- `web/sample-library-record-view.js`
  - Own record card / pool card / list rendering helpers for sample library surfaces

### Dependency boundaries

- New view modules should not import `appState`
- Pass in narrow helpers or values such as `escapeHtml`, `formatDate`, `joinCSV`, labels, and small helper functions
- `web/app.js` remains the top-level integration point

---

### Task 1: Extract Style Profile View Module

**Files:**
- Create: `web/style-profile-view.js`
- Modify: `web/app.js`
- Test: `test/success-generation-ui.test.js`

- [ ] **Step 1: Write the failing regression for extracted style profile helpers**

Update `test/success-generation-ui.test.js` so the frontend regression expects style profile rendering helpers to be sourced from a dedicated module rather than only living inline in `web/app.js`.

Add assertions for:

```js
assert.match(appJs, /from "\.\/style-profile-view\.js"/);
```

- [ ] **Step 2: Run the regression to verify it fails**

Run:

```bash
node --test test/success-generation-ui.test.js
```

Expected: FAIL because `web/app.js` does not yet import `./style-profile-view.js`.

- [ ] **Step 3: Create `web/style-profile-view.js` with the current style profile helpers**

Move these helpers out of `web/app.js` into `web/style-profile-view.js` as named exports:

```js
export function buildStyleProfileGenerationLabel(meta = {}, { providerLabel }) {
  const method = String(meta?.method || "").trim();
  const provider = String(meta?.provider || "").trim();
  const providerText = String(meta?.providerLabel || providerLabel(provider) || "本地规则").trim();
  const model = String(meta?.model || "").trim();
  const routeLabel = String(meta?.routeLabel || "").trim();

  if (method === "model_summary" && provider) {
    return [providerText, model, routeLabel].filter(Boolean).join(" · ");
  }

  if (method === "local_rule_fallback" && Array.isArray(meta?.attemptedProviders) && meta.attemptedProviders.length) {
    return "本地规则汇总（模型链路已回退）";
  }

  return "本地规则汇总";
}
```

```js
export function buildStyleProfileModalMarkup(profileState = null, helpers = {}) {
  const {
    buildSampleLibraryModalSectionMarkup,
    escapeHtml,
    joinCSV,
    joinLineList,
    formatDate,
    buildStyleProfileGenerationLabel
  } = helpers;

  // Move the current implementation intact from web/app.js,
  // keeping markup and text unchanged except for using injected helpers.
}
```

```js
export function readStyleProfileModalPayload(contentNode, helpers = {}) {
  const { splitCSV, splitLineList } = helpers;

  return {
    topic: contentNode?.querySelector('[name="styleProfileTopic"]')?.value || "",
    name: contentNode?.querySelector('[name="styleProfileName"]')?.value || "",
    titleStyle: contentNode?.querySelector('[name="styleProfileTitleStyle"]')?.value || "",
    bodyStructure: contentNode?.querySelector('[name="styleProfileBodyStructure"]')?.value || "",
    tone: contentNode?.querySelector('[name="styleProfileTone"]')?.value || "",
    preferredTags: splitCSV(contentNode?.querySelector('[name="styleProfilePreferredTags"]')?.value || ""),
    avoidExpressions: splitLineList(contentNode?.querySelector('[name="styleProfileAvoidExpressions"]')?.value || ""),
    generationGuidelines: splitLineList(contentNode?.querySelector('[name="styleProfileGenerationGuidelines"]')?.value || "")
  };
}
```

- [ ] **Step 4: Rewire `web/app.js` to import and use the extracted style profile helpers**

At the top of `web/app.js`, add:

```js
import {
  buildStyleProfileGenerationLabel,
  buildStyleProfileModalMarkup,
  readStyleProfileModalPayload
} from "./style-profile-view.js";
```

Then replace the inlined implementations with calls into the module:

```js
function renderStyleProfileModal() {
  const profile = appState.sampleLibraryModal?.profile || appState.adminData.styleProfile || null;
  const sourceCount = Array.isArray(profile?.current?.sourceSampleIds) ? profile.current.sourceSampleIds.length : 0;

  renderSampleLibraryModal({
    title: "当前风格画像",
    subtitle: profile?.current ? `当前生效画像 · ${sourceCount} 条来源样本` : "当前还没有自动沉淀画像",
    body: buildStyleProfileModalMarkup(profile, {
      buildSampleLibraryModalSectionMarkup,
      escapeHtml,
      joinCSV,
      joinLineList,
      formatDate,
      buildStyleProfileGenerationLabel: (meta) => buildStyleProfileGenerationLabel(meta, { providerLabel })
    }),
    saveLabel: "保存画像"
  });
}
```

```js
function readStyleProfileModalPayload() {
  return readStyleProfileModalPayload(byId("sample-library-modal-content"), {
    splitCSV,
    splitLineList
  });
}
```

Rename the local wrapper if needed to avoid export/import name collision, for example:

```js
import { readStyleProfileModalPayload as readStyleProfileModalPayloadView } from "./style-profile-view.js";
```

- [ ] **Step 5: Run the regression to verify it passes**

Run:

```bash
node --test test/success-generation-ui.test.js
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add web/app.js web/style-profile-view.js test/success-generation-ui.test.js
git commit -m "refactor: extract style profile frontend helpers"
```

---

### Task 2: Extract Sample Library Calibration View Module

**Files:**
- Create: `web/sample-library-calibration-view.js`
- Modify: `web/app.js`
- Test: `test/success-generation-ui.test.js`

- [ ] **Step 1: Extend the regression so calibration helpers are expected in a dedicated module**

Add assertions to `test/success-generation-ui.test.js` for:

```js
assert.match(appJs, /from "\.\/sample-library-calibration-view\.js"/);
```

- [ ] **Step 2: Run the regression to verify it fails**

Run:

```bash
node --test test/success-generation-ui.test.js
```

Expected: FAIL because the import does not yet exist.

- [ ] **Step 3: Create `web/sample-library-calibration-view.js`**

Move the current calibration view helpers out of `web/app.js` as named exports, keeping behavior intact:

```js
export function buildSampleLibraryCalibrationEvidenceMarkup(prediction = {}, helpers = {}) {
  // move current implementation, including:
  // - evidence summary
  // - signal categories
  // - manual-review rewrite button visibility
}
```

```js
export function buildSampleLibraryCalibrationEditorSectionsMarkup(args = {}, helpers = {}) {
  // move current implementation, including:
  // - retro signal suggestions
  // - helper text
  // - retro chip groups
}
```

Also move supporting helpers that are tightly bound to that UI:

```js
export function deriveSampleLibraryCalibrationSignalCategories(prediction = {}) {}
export function deriveSampleLibraryRetroSignalSuggestions({ prediction = {}, comparison = {} } = {}) {}
export function parseSampleLibraryRetroChipField(value = "", presetOptions = []) {}
export function serializeSampleLibraryRetroChipField(selected = [], supplement = "") {}
export function readSampleLibraryRetroChipFieldValue(contentNode, fieldName) {}
export function readSampleLibraryRetroChipListValue(contentNode, fieldName) {}
export function buildSampleLibraryRetroChipGroupMarkup(config = {}) {}
export function toggleSampleLibraryRetroChipSelection(chipNode) {}
```

Do not move orchestration helpers such as:
- `buildSampleLibraryCalibrationRetroComparison`
- `buildSampleLibraryCalibrationRetroRecommendation`
- `buildSampleLibraryCalibrationModalMarkup`

Those stay in `web/app.js` for now.

- [ ] **Step 4: Rewire `web/app.js` to import and use the extracted calibration helpers**

Add imports:

```js
import {
  buildSampleLibraryCalibrationEvidenceMarkup,
  buildSampleLibraryCalibrationEditorSectionsMarkup,
  parseSampleLibraryRetroChipField,
  readSampleLibraryRetroChipFieldValue,
  readSampleLibraryRetroChipListValue,
  toggleSampleLibraryRetroChipSelection
} from "./sample-library-calibration-view.js";
```

Keep `buildSampleLibraryCalibrationModalMarkup(...)` in `web/app.js`, but have it call the extracted section builder and evidence builder with injected helpers.

Also keep the existing event branch:

```js
const retroChip = event.target.closest(".sample-library-retro-chip");

if (retroChip) {
  toggleSampleLibraryRetroChipSelection(retroChip);
  return;
}
```

- [ ] **Step 5: Run the regression to verify it passes**

Run:

```bash
node --test test/success-generation-ui.test.js
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add web/app.js web/sample-library-calibration-view.js test/success-generation-ui.test.js
git commit -m "refactor: extract calibration frontend helpers"
```

---

### Task 3: Extract Theme Inspiration View Module

**Files:**
- Create: `web/theme-inspiration-view.js`
- Modify: `web/app.js`
- Test: `test/success-generation-ui.test.js`

- [ ] **Step 1: Add a regression expectation for a dedicated theme inspiration module**

Add assertion:

```js
assert.match(appJs, /from "\.\/theme-inspiration-view\.js"/);
```

- [ ] **Step 2: Run the regression to verify it fails**

Run:

```bash
node --test test/success-generation-ui.test.js
```

Expected: FAIL because the import is not present yet.

- [ ] **Step 3: Create `web/theme-inspiration-view.js` with current rendering helpers**

Move the current modal render helpers into a dedicated module, preserving markup:

```js
export function renderGenerationThemeInspirationModal(state = {}, helpers = {}) {
  // move the current modal rendering implementation
}
```

```js
export function getSelectedGenerationThemeInspiration(items = [], selectedThemeId = "") {
  return (Array.isArray(items) ? items : []).find((item) => String(item?.themeId || "") === String(selectedThemeId || "")) || null;
}
```

If other display-only helpers are tightly coupled, move them too.

- [ ] **Step 4: Rewire `web/app.js` to use the extracted theme inspiration view**

Import:

```js
import {
  renderGenerationThemeInspirationModal,
  getSelectedGenerationThemeInspiration
} from "./theme-inspiration-view.js";
```

If names collide with local functions, rename imports:

```js
import {
  renderGenerationThemeInspirationModal as renderGenerationThemeInspirationModalView,
  getSelectedGenerationThemeInspiration as getSelectedGenerationThemeInspirationView
} from "./theme-inspiration-view.js";
```

Then update local orchestration wrappers to delegate to the extracted module.

- [ ] **Step 5: Run the regression to verify it passes**

Run:

```bash
node --test test/success-generation-ui.test.js
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add web/app.js web/theme-inspiration-view.js test/success-generation-ui.test.js
git commit -m "refactor: extract theme inspiration frontend helpers"
```

---

### Task 4: Extract Sample Library Record and Pool View Module

**Files:**
- Create: `web/sample-library-record-view.js`
- Modify: `web/app.js`
- Test: `test/success-generation-ui.test.js`

- [ ] **Step 1: Add regression expectations for a dedicated record/pool view module**

Add assertion:

```js
assert.match(appJs, /from "\.\/sample-library-record-view\.js"/);
```

- [ ] **Step 2: Run the regression to verify it fails**

Run:

```bash
node --test test/success-generation-ui.test.js
```

Expected: FAIL because the module import does not yet exist.

- [ ] **Step 3: Create `web/sample-library-record-view.js`**

Move repeated rendering helpers:

```js
export function buildSampleLibraryRecordCardMarkup(item = {}, options = {}, helpers = {}) {}
export function renderSampleLibraryListMarkup(items = [], options = {}, helpers = {}) {}
export function buildSamplePoolActionMarkup(record = {}, pool = "reference", helpers = {}) {}
export function renderSamplePoolCards(items = [], pool = "reference", helpers = {}) {}
```

Keep orchestration functions such as `renderSampleLibraryWorkspace()` and `renderSampleLibraryPoolsModal()` in `web/app.js`, but have them call the extracted renderers.

- [ ] **Step 4: Rewire `web/app.js` to use the extracted record/pool module**

Import the moved render functions and pass the current label/formatting helpers as dependencies.

Preserve:
- the same `data-action` attributes
- the same `data-sample-library-record-id`
- the same `meta-pill` copy

- [ ] **Step 5: Run the regression to verify it passes**

Run:

```bash
node --test test/success-generation-ui.test.js
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add web/app.js web/sample-library-record-view.js test/success-generation-ui.test.js
git commit -m "refactor: extract sample library record views"
```

---

### Task 5: Run Full Frontend and Related Narrow Regressions

**Files:**
- Test: `test/success-generation-ui.test.js`
- Test: `test/sample-library-calibration-prefill.test.js`

- [ ] **Step 1: Run the full frontend regression suite**

Run:

```bash
node --test test/success-generation-ui.test.js
```

Expected: PASS.

- [ ] **Step 2: Run the calibration-focused regression suite**

Run:

```bash
node --test test/sample-library-calibration-prefill.test.js
```

Expected: PASS.

- [ ] **Step 3: Review `web/app.js` size and imports after extraction**

Run:

```bash
wc -l web/app.js
```

Expected:
- line count materially lower than the original ~12530 lines
- imports at top reflect the new module boundaries

- [ ] **Step 4: Commit the verification checkpoint**

```bash
git add web/app.js test/success-generation-ui.test.js test/sample-library-calibration-prefill.test.js
git commit -m "test: verify frontend modularization regressions"
```

---

## Self-Review

### Spec coverage

- Extract pure style profile helpers: covered by Task 1
- Extract pure calibration helpers: covered by Task 2
- Extract theme inspiration view helpers: covered by Task 3
- Extract sample library record / pool render helpers: covered by Task 4
- Preserve orchestration in `web/app.js`: enforced in all tasks
- Keep behavior unchanged and validate via regression: covered by Task 5

### Placeholder scan

- No `TODO` / `TBD`
- Every task lists exact files
- Every code-changing step includes concrete file/function targets
- Every verification step includes exact commands

### Type and naming consistency

- New module names match the spec:
  - `web/style-profile-view.js`
  - `web/sample-library-calibration-view.js`
  - `web/theme-inspiration-view.js`
  - `web/sample-library-record-view.js`
- All tasks preserve ES module usage and `web/app.js` orchestration ownership

Plan complete and saved to `docs/superpowers/plans/2026-05-22-web-app-modularization.md`. Two execution options:

1. Subagent-Driven (recommended) - I dispatch a fresh subagent per task, review between tasks, fast iteration

2. Inline Execution - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
