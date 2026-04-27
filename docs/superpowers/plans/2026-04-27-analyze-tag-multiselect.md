# Analyze Tag Multi-Select Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current analyze-tag single-pick control with a custom dropdown multi-select that stays compact, keeps custom tag entry, and shows selected tags inline in a polished trigger.

**Architecture:** Keep the hidden-input CSV contract and current custom-option persistence logic, but replace the native preset `select` interaction with a custom trigger + dropdown panel in the existing `web/index.html`, `web/app.js`, and `web/styles.css` stack. Use small focused DOM helpers in `web/app.js` so selection state, dropdown open/close state, and custom-tag persistence remain predictable without changing the backend API.

**Tech Stack:** Static HTML, browser DOM APIs, existing `web/app.js` helpers, existing `web/styles.css`, `node:test`

---

### Task 1: Lock the new picker structure with failing markup and style tests

**Files:**
- Create: `test/analyze-tag-picker-layout.test.js`
- Test: `test/analyze-tag-picker-layout.test.js`

- [ ] **Step 1: Write the failing structure test**

```js
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

test("analyze tag picker uses a custom dropdown trigger instead of a native preset select", async () => {
  const source = await fs.readFile(path.join(process.cwd(), "web/index.html"), "utf8");

  assert.doesNotMatch(source, /<select id="analyze-tag-select"/);
  assert.match(source, /id="analyze-tag-trigger"/);
  assert.match(source, /id="analyze-tag-dropdown"/);
  assert.match(source, /id="analyze-tag-options"/);
});

test("analyze tag picker styles bound the closed trigger and dropdown overflow", async () => {
  const source = await fs.readFile(path.join(process.cwd(), "web/styles.css"), "utf8");

  assert.match(source, /\.tag-picker-trigger \{/);
  assert.match(source, /\.tag-picker-trigger \{[\s\S]*max-height:/);
  assert.match(source, /\.tag-picker-trigger \{[\s\S]*overflow: hidden;/);
  assert.match(source, /\.tag-picker-dropdown \{[\s\S]*max-height:/);
  assert.match(source, /\.tag-picker-dropdown \{[\s\S]*overflow: auto;/);
});
```

- [ ] **Step 2: Run the new test to verify it fails**

Run:

```bash
node --test test/analyze-tag-picker-layout.test.js
```

Expected: FAIL because the current HTML still contains `#analyze-tag-select` and the new dropdown classes do not exist yet.

- [ ] **Step 3: Commit the failing test**

```bash
git add test/analyze-tag-picker-layout.test.js
git commit -m "test: cover analyze tag multiselect markup"
```

### Task 2: Lock the multi-select behavior with failing app-source tests

**Files:**
- Create: `test/analyze-tag-picker-behavior.test.js`
- Test: `test/analyze-tag-picker-behavior.test.js`

- [ ] **Step 1: Write the failing behavior test**

```js
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

test("analyze tag picker source includes dropdown toggle and preset tag toggle helpers", async () => {
  const source = await fs.readFile(path.join(process.cwd(), "web/app.js"), "utf8");

  assert.match(source, /function setAnalyzeTagDropdownOpen\(/);
  assert.match(source, /function toggleAnalyzePresetTag\(/);
  assert.match(source, /function renderAnalyzeTagOptions\(/);
  assert.match(source, /aria-expanded/);
});

test("analyze tag picker source still serializes tags through the hidden input", async () => {
  const source = await fs.readFile(path.join(process.cwd(), "web/app.js"), "utf8");

  assert.match(source, /hiddenInput\.value = joinCSV\(normalized\)/);
  assert.match(source, /buildAnalyzeTagSelectionMarkup\(normalized\)/);
  assert.match(source, /addAnalyzeTagOption\(customInput\.value\)/);
});
```

- [ ] **Step 2: Run the new behavior test to verify it fails**

Run:

```bash
node --test test/analyze-tag-picker-behavior.test.js
```

Expected: FAIL because the dropdown open/close and preset toggle helpers do not exist yet.

- [ ] **Step 3: Commit the failing test**

```bash
git add test/analyze-tag-picker-behavior.test.js
git commit -m "test: cover analyze tag multiselect behavior"
```

### Task 3: Replace the native preset select with custom dropdown markup

**Files:**
- Modify: `web/index.html`
- Test: `test/analyze-tag-picker-layout.test.js`

- [ ] **Step 1: Replace the current preset select block with the custom trigger + dropdown shell**

Use this structure in `web/index.html` in place of the current `select` block:

```html
<div class="tag-picker" id="analyze-tag-picker">
  <input type="hidden" name="tags" id="analyze-tags-value" />
  <button
    type="button"
    class="tag-picker-trigger"
    id="analyze-tag-trigger"
    aria-expanded="false"
    aria-controls="analyze-tag-dropdown"
  >
    <span class="tag-picker-trigger-label">标签</span>
    <span id="analyze-tag-selected" class="tag-picker-selected">
      <span class="tag-picker-empty">尚未选择标签</span>
    </span>
    <span class="tag-picker-trigger-caret" aria-hidden="true">▾</span>
  </button>
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

- [ ] **Step 2: Run the markup/layout test and confirm the structure check passes**

Run:

```bash
node --test test/analyze-tag-picker-layout.test.js
```

Expected: the structure test passes and the style assertions still fail until CSS is added.

- [ ] **Step 3: Commit the HTML shell change**

```bash
git add web/index.html test/analyze-tag-picker-layout.test.js
git commit -m "feat: add analyze tag multiselect markup shell"
```

### Task 4: Implement dropdown state and multi-select rendering in the app logic

**Files:**
- Modify: `web/app.js`
- Test: `test/analyze-tag-picker-behavior.test.js`

- [ ] **Step 1: Add the DOM helpers for the new picker**

Add helpers near the existing analyze tag accessors:

```js
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

- [ ] **Step 2: Add dropdown state and preset toggle helpers**

Add focused helpers:

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
    current.includes(normalizedTag) ? current.filter((item) => item !== normalizedTag) : [...current, normalizedTag]
  );
}
```

- [ ] **Step 3: Rework option rendering from `<option>` strings to button-like selectable items**

Replace the current `renderAnalyzeTagOptions()` body with logic shaped like:

```js
function renderAnalyzeTagOptions() {
  const container = getAnalyzeTagOptionsContainer();

  if (!container) {
    return;
  }

  const selectedTags = readAnalyzeTags();
  container.innerHTML = uniqueStrings(analyzeTagOptions)
    .map((tag) => {
      const selected = selectedTags.includes(tag);
      return `
        <button
          type="button"
          class="tag-picker-option${selected ? " is-selected" : ""}"
          data-tag-option="${escapeHtml(tag)}"
          aria-pressed="${selected ? "true" : "false"}"
        >
          <span>${escapeHtml(tag)}</span>
          <span class="tag-picker-option-check" aria-hidden="true">${selected ? "✓" : ""}</span>
        </button>
      `;
    })
    .join("");
}
```

- [ ] **Step 4: Update `writeAnalyzeTags()` to refresh both the selected-chip summary and option selected state**

Keep this line intact:

```js
hiddenInput.value = joinCSV(normalized);
```

Then re-render both surfaces:

```js
selected.innerHTML = buildAnalyzeTagSelectionMarkup(normalized);
renderAnalyzeTagOptions();
```

- [ ] **Step 5: Rework `initializeAnalyzeTagPicker()` event wiring**

Replace the current `select`-based listeners with:

```js
trigger.addEventListener("click", () => {
  const expanded = trigger.getAttribute("aria-expanded") === "true";
  setAnalyzeTagDropdownOpen(!expanded);
});

optionsContainer.addEventListener("click", (event) => {
  const button = event.target.closest("[data-tag-option]");
  if (!button) {
    return;
  }

  toggleAnalyzePresetTag(button.dataset.tagOption || "");
});

clearButton.addEventListener("click", () => {
  writeAnalyzeTags([]);
});

document.addEventListener("click", (event) => {
  if (!picker?.contains(event.target)) {
    setAnalyzeTagDropdownOpen(false);
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    setAnalyzeTagDropdownOpen(false);
  }
});
```

Keep the custom-tag `click`, `Enter`, and `blur` flows, but make sure they end with:

```js
addAnalyzeTagOption(customInput.value);
addAnalyzeTag(customInput.value);
renderAnalyzeTagOptions();
```

- [ ] **Step 6: Run the behavior test and confirm it passes**

Run:

```bash
node --test test/analyze-tag-picker-behavior.test.js
```

Expected: PASS

- [ ] **Step 7: Commit the app logic**

```bash
git add web/app.js test/analyze-tag-picker-behavior.test.js
git commit -m "feat: add analyze tag dropdown multiselect behavior"
```

### Task 5: Polish the styles for the compact dropdown multi-select

**Files:**
- Modify: `web/styles.css`
- Test: `test/analyze-tag-picker-layout.test.js`

- [ ] **Step 1: Replace the old tag-picker control styles with the new trigger/dropdown system**

Add or update rules shaped like:

```css
.tag-picker {
  position: relative;
  display: grid;
  gap: 0.55rem;
}

.tag-picker-trigger {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: start;
  gap: 0.8rem;
  width: 100%;
  min-height: 3.15rem;
  max-height: 5.8rem;
  padding: 0.9rem 1rem;
  border-radius: 18px;
  border: 1px solid rgba(214, 99, 71, 0.22);
  background: linear-gradient(180deg, rgba(255, 250, 245, 0.96), rgba(255, 255, 255, 0.98));
  box-shadow: 0 12px 30px rgba(94, 53, 34, 0.08);
  overflow: hidden;
  cursor: pointer;
}

.tag-picker-dropdown {
  position: absolute;
  top: calc(100% + 0.55rem);
  left: 0;
  right: 0;
  z-index: 20;
  display: grid;
  gap: 0.85rem;
  padding: 0.95rem;
  border-radius: 18px;
  border: 1px solid rgba(214, 99, 71, 0.18);
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 18px 44px rgba(78, 43, 28, 0.16);
  max-height: 18rem;
  overflow: auto;
}
```

- [ ] **Step 2: Add option and state styles**

Add rules shaped like:

```css
.tag-picker-options {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
}

.tag-picker-option {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.55rem 0.82rem;
  border-radius: 999px;
  border: 1px solid rgba(214, 99, 71, 0.18);
  background: #fff;
}

.tag-picker-option.is-selected {
  background: rgba(214, 99, 71, 0.14);
  border-color: rgba(214, 99, 71, 0.42);
}
```

- [ ] **Step 3: Adjust selected-chip summary and mobile layout**

Make sure:

```css
.tag-picker-selected {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  min-width: 0;
  overflow: hidden;
}

@media (max-width: 640px) {
  .tag-picker-trigger {
    grid-template-columns: 1fr auto;
  }

  .tag-picker-custom {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 4: Run the layout test and confirm it passes**

Run:

```bash
node --test test/analyze-tag-picker-layout.test.js
```

Expected: PASS

- [ ] **Step 5: Commit the styling**

```bash
git add web/styles.css test/analyze-tag-picker-layout.test.js
git commit -m "style: polish analyze tag multiselect picker"
```

### Task 6: Full regression verification

**Files:**
- Test: `test/analyze-tag-picker-layout.test.js`
- Test: `test/analyze-tag-picker-behavior.test.js`
- Test: `test/rewrite-panel-behavior.test.js`

- [ ] **Step 1: Run targeted tests**

```bash
node --test test/analyze-tag-picker-layout.test.js test/analyze-tag-picker-behavior.test.js test/rewrite-panel-behavior.test.js
```

Expected: PASS

- [ ] **Step 2: Run a broader regression sweep**

```bash
node --test test/qwen-nvidia-fallback.test.js test/rewrite-panel-behavior.test.js test/deepseek-default-model.test.js test/rewrite-provider-config.test.js test/analyze-tag-picker-layout.test.js test/analyze-tag-picker-behavior.test.js
```

Expected: PASS

- [ ] **Step 3: Review the final diff for scope**

Run:

```bash
git diff -- web/index.html web/app.js web/styles.css test/analyze-tag-picker-layout.test.js test/analyze-tag-picker-behavior.test.js
```

Expected: only the tag-picker markup, behavior, styling, and new tests are changed.
