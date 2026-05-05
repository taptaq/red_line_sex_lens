# Analyze Tag Picker Restore Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the full analyze tag picker in the content detection form with preset multi-select, custom tag add, clear action, and hidden-input serialization.

**Architecture:** Reintroduce the previous analyze tag picker only inside the analyze form while keeping the rest of the reduced product surface unchanged. Use the existing `analyze-tag-options` storage path, restore the picker DOM and styles in `web/`, and keep form submission compatible by writing the final selected tags into the hidden `tags` input.

**Tech Stack:** Static HTML, browser DOM APIs in `web/app.js`, existing JSON-backed analyze tag options API, `node:test`

---

## File Map

- `web/index.html`: analyze form markup; restores the hidden input, trigger, dropdown, preset option container, clear action, and custom-tag controls.
- `web/app.js`: picker helpers, state synchronization, preset/custom option rendering, outside-click and keyboard behavior, hidden-input serialization, option persistence.
- `web/styles.css`: picker trigger, dropdown, chips, selected state, custom delete affordance, overflow and layout behavior.
- `test/analyze-tag-picker-layout.test.js`: restore assertions that the analyze picker structure and styles exist.
- `test/analyze-tag-picker-behavior.test.js`: restore assertions that the picker helpers and hidden-input serialization logic exist.
- `test/success-generation-ui.test.js`: align the broader UI expectations with the restored analyze picker.

### Task 1: Restore failing tests for the analyze picker surface

**Files:**
- Modify: `test/analyze-tag-picker-layout.test.js`
- Modify: `test/analyze-tag-picker-behavior.test.js`
- Modify: `test/success-generation-ui.test.js`
- Test: `test/analyze-tag-picker-layout.test.js`
- Test: `test/analyze-tag-picker-behavior.test.js`

- [ ] **Step 1: Rewrite the layout test to expect the custom picker shell again**

Use these assertions in `test/analyze-tag-picker-layout.test.js`:

```js
test("analyze form uses a custom dropdown picker instead of a plain text tag input", async () => {
  const source = await fs.readFile(path.join(process.cwd(), "web/index.html"), "utf8");

  assert.match(source, /id="analyze-tag-picker"/);
  assert.match(source, /id="analyze-tags-value"/);
  assert.match(source, /id="analyze-tag-trigger"/);
  assert.match(source, /id="analyze-tag-dropdown"/);
  assert.match(source, /id="analyze-tag-options"/);
  assert.match(source, /id="analyze-tag-custom"/);
  assert.match(source, /id="analyze-tag-add"/);
  assert.doesNotMatch(source, /<input[^>]*name="tags"[^>]*placeholder="标签，用逗号分隔"/);
});

test("analyze tag picker styles exist for trigger and dropdown layout", async () => {
  const source = await fs.readFile(path.join(process.cwd(), "web/styles.css"), "utf8");

  assert.match(source, /\.tag-picker-trigger \{/);
  assert.match(source, /\.tag-picker-dropdown \{/);
  assert.match(source, /\.tag-picker-dropdown\[hidden\] \{/);
});

test("custom tag delete affordance styles exist for custom picker options", async () => {
  const source = await fs.readFile(path.join(process.cwd(), "web/styles.css"), "utf8");

  assert.match(source, /\.tag-picker-option-delete \{/);
  assert.match(source, /\.tag-picker-option-row\.is-custom:hover \.tag-picker-option-delete/);
  assert.match(source, /\.tag-picker-option-row\.is-custom:focus-within \.tag-picker-option-delete/);
});
```

- [ ] **Step 2: Rewrite the behavior test to expect picker helpers and hidden-input serialization**

Use these assertions in `test/analyze-tag-picker-behavior.test.js`:

```js
test("analyze form source uses dropdown helpers for tag selection", async () => {
  const source = await fs.readFile(path.join(process.cwd(), "web/app.js"), "utf8");
  assert.match(source, /function setAnalyzeTagDropdownOpen\(/);
  assert.match(source, /function toggleAnalyzePresetTag\(/);
  assert.match(source, /function renderAnalyzeTagOptions\(/);
  assert.match(source, /aria-expanded/);
});

test("analyze form source serializes tags through the hidden input", async () => {
  const source = await fs.readFile(path.join(process.cwd(), "web/app.js"), "utf8");

  assert.match(source, /hiddenInput\.value = joinCSV\(normalized\)/);
  assert.match(source, /buildAnalyzeTagSelectionMarkup\(normalized\)/);
  assert.doesNotMatch(source, /tags:\s*String\(form\.get\("tags"\) \|\| ""\)\.trim\(\)/);
});

test("analyze form source restores custom option maintenance in the picker", async () => {
  const source = await fs.readFile(path.join(process.cwd(), "web/app.js"), "utf8");

  assert.match(source, /function removeAnalyzeTagOption\(/);
  assert.match(source, /data-tag-delete=/);
});
```

- [ ] **Step 3: Update the higher-level UI regression to expect the picker again**

In `test/success-generation-ui.test.js`, replace the picker-removal expectations with:

```js
assert.match(indexHtml, /id="analyze-tag-picker"/);
assert.match(indexHtml, /id="analyze-tags-value"/);
assert.match(indexHtml, /id="analyze-tag-trigger"/);
assert.match(indexHtml, /id="analyze-tag-dropdown"/);
assert.match(indexHtml, /id="analyze-tag-options"/);
assert.match(indexHtml, /id="analyze-tag-custom"/);
assert.match(indexHtml, /id="analyze-tag-add"/);
assert.doesNotMatch(indexHtml, /<input[^>]*name="tags"[^>]*placeholder="标签，用逗号分隔"/);

assert.match(appJs, /\/api\/analyze-tag-options/);
assert.match(appJs, /function setAnalyzeTagDropdownOpen\(/);
assert.match(appJs, /function toggleAnalyzePresetTag\(/);
assert.match(appJs, /function renderAnalyzeTagOptions\(/);
```

- [ ] **Step 4: Run the focused tests to verify they fail before implementation**

Run:

```bash
node --test test/analyze-tag-picker-layout.test.js test/analyze-tag-picker-behavior.test.js test/success-generation-ui.test.js
```

Expected: FAIL because the current UI still uses the simplified text input and the dropdown helpers are absent.

- [ ] **Step 5: Commit the red tests**

```bash
git add test/analyze-tag-picker-layout.test.js test/analyze-tag-picker-behavior.test.js test/success-generation-ui.test.js
git commit -m "test: restore analyze tag picker expectations"
```

### Task 2: Restore the picker markup and styles

**Files:**
- Modify: `web/index.html`
- Modify: `web/styles.css`
- Test: `test/analyze-tag-picker-layout.test.js`

- [ ] **Step 1: Replace the analyze tags text input with the picker shell in `web/index.html`**

Use this structure in the analyze form:

```html
<div class="tag-picker" id="analyze-tag-picker">
  <input type="hidden" name="tags" id="analyze-tags-value" />
  <div class="tag-picker-trigger-shell">
    <button
      type="button"
      class="tag-picker-trigger"
      id="analyze-tag-trigger"
      aria-expanded="false"
      aria-controls="analyze-tag-dropdown"
    >
      <span class="tag-picker-trigger-head">
        <span class="tag-picker-trigger-label">标签</span>
        <span class="tag-picker-trigger-caret" aria-hidden="true">▾</span>
      </span>
      <span
        id="analyze-tag-selected"
        class="tag-picker-selected"
        role="group"
        aria-label="已选标签"
        aria-live="polite"
      >
        <span class="tag-picker-empty">尚未选择标签</span>
      </span>
    </button>
  </div>
  <div class="tag-picker-dropdown" id="analyze-tag-dropdown" hidden>
    <div class="tag-picker-dropdown-head">
      <strong>选择预置标签</strong>
      <button type="button" class="tag-picker-clear" id="analyze-tag-clear">清空</button>
    </div>
    <div class="tag-picker-options" id="analyze-tag-options"></div>
    <div class="tag-picker-custom">
      <input type="text" id="analyze-tag-custom" placeholder="输入自定义标签" />
      <button type="button" class="button button-ghost button-small" id="analyze-tag-add">添加</button>
    </div>
  </div>
</div>
```

- [ ] **Step 2: Restore the picker styles in `web/styles.css`**

Reintroduce the tag picker blocks needed by the restored tests and UI:

```css
.tag-picker-trigger {
  width: 100%;
  max-height: 8.5rem;
  overflow: hidden;
}

.tag-picker-dropdown {
  max-height: 18rem;
  overflow: auto;
}

.tag-picker-dropdown[hidden] {
  display: none;
}

.tag-picker-option-delete {
  opacity: 0;
}

.tag-picker-option-row.is-custom:hover .tag-picker-option-delete,
.tag-picker-option-row.is-custom:focus-within .tag-picker-option-delete {
  opacity: 1;
}
```

Match the existing visual language when restoring the full blocks rather than keeping only these fragments.

- [ ] **Step 3: Run the layout test to verify the restored shell passes**

Run:

```bash
node --test test/analyze-tag-picker-layout.test.js
```

Expected: PASS.

- [ ] **Step 4: Commit the markup and style restoration**

```bash
git add web/index.html web/styles.css test/analyze-tag-picker-layout.test.js
git commit -m "feat: restore analyze tag picker markup"
```

### Task 3: Restore picker behavior and option persistence in `web/app.js`

**Files:**
- Modify: `web/app.js`
- Test: `test/analyze-tag-picker-behavior.test.js`
- Test: `test/success-generation-ui.test.js`

- [ ] **Step 1: Restore the analyze tag option API constant and picker DOM accessors**

Bring back:

```js
const analyzeTagOptionsApi = "/api/analyze-tag-options";

function getAnalyzeTagInput() {
  return byId("analyze-tags-value");
}

function getAnalyzeTagTrigger() {
  return byId("analyze-tag-trigger");
}

function getAnalyzeTagDropdown() {
  return byId("analyze-tag-dropdown");
}

function getAnalyzeTagOptionsContainer() {
  return byId("analyze-tag-options");
}
```

- [ ] **Step 2: Restore hidden-input serialization and selected-chip rendering**

Bring back the write path that updates the hidden input and selected chips:

```js
function writeAnalyzeTags(tags = []) {
  const hiddenInput = getAnalyzeTagInput();
  const selected = getAnalyzeTagSelection();
  const normalized = uniqueStrings(tags);

  if (hiddenInput) {
    hiddenInput.value = joinCSV(normalized);
  }

  if (selected) {
    selected.innerHTML = buildAnalyzeTagSelectionMarkup(normalized);
  }

  renderAnalyzeTagOptions();
  analyzeForm.dispatchEvent(new Event("input", { bubbles: true }));
}
```

- [ ] **Step 3: Restore dropdown open/close, preset toggling, and custom option behavior**

Reintroduce the focused helpers and initialization flow:

```js
function setAnalyzeTagDropdownOpen(isOpen) {
  const trigger = getAnalyzeTagTrigger();
  const dropdown = getAnalyzeTagDropdown();

  if (!trigger || !dropdown) {
    return;
  }

  trigger.setAttribute("aria-expanded", isOpen ? "true" : "false");
  dropdown.hidden = !isOpen;
  byId("analyze-tag-picker")?.classList.toggle("is-open", isOpen);
}

function toggleAnalyzePresetTag(tag) {
  const current = readAnalyzeTags();
  const normalizedTag = String(tag || "").trim();

  if (!normalizedTag) {
    return;
  }

  writeAnalyzeTags(
    current.includes(normalizedTag)
      ? current.filter((item) => item !== normalizedTag)
      : [...current, normalizedTag]
  );
}

function removeAnalyzeTagOption(tag) {
  const normalizedTag = String(tag || "").trim();

  if (!normalizedTag) {
    return;
  }

  analyzeTagOptions = analyzeTagOptions.filter((item) => item !== normalizedTag);
  writeAnalyzeTags(readAnalyzeTags().filter((item) => item !== normalizedTag));
  saveAnalyzeCustomTagOptions(analyzeTagOptions).catch(() => {});
}
```

Wire the picker back up through `initializeAnalyzeTagPicker()` so the trigger, clear button, option clicks, custom add button, outside-click close, and `Escape` handling all work again.

- [ ] **Step 4: Run the focused behavior and UI regressions**

Run:

```bash
node --test test/analyze-tag-picker-behavior.test.js test/success-generation-ui.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit the restored picker logic**

```bash
git add web/app.js test/analyze-tag-picker-behavior.test.js test/success-generation-ui.test.js
git commit -m "feat: restore analyze tag picker behavior"
```

### Task 4: Run the final focused regression set

**Files:**
- Modify: `web/index.html`
- Modify: `web/app.js`
- Modify: `web/styles.css`
- Modify: `test/analyze-tag-picker-layout.test.js`
- Modify: `test/analyze-tag-picker-behavior.test.js`
- Modify: `test/success-generation-ui.test.js`

- [ ] **Step 1: Run the full focused regression set**

Run:

```bash
node --test test/analyze-tag-picker-layout.test.js test/analyze-tag-picker-behavior.test.js test/success-generation-ui.test.js test/rewrite-panel-behavior.test.js
```

Expected: PASS.

- [ ] **Step 2: Inspect the diff to confirm the scope stayed narrow**

Run:

```bash
git diff -- web/index.html web/app.js web/styles.css test/analyze-tag-picker-layout.test.js test/analyze-tag-picker-behavior.test.js test/success-generation-ui.test.js
```

Expected: only the analyze picker surface and its tests changed.

- [ ] **Step 3: Commit the verified restore**

```bash
git add web/index.html web/app.js web/styles.css test/analyze-tag-picker-layout.test.js test/analyze-tag-picker-behavior.test.js test/success-generation-ui.test.js
git commit -m "fix: restore analyze tag picker"
```
