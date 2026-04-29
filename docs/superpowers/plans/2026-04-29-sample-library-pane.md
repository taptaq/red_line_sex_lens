# Sample Library Pane Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the three top-level tabs `成功样本` / `生命周期` / `风格画像` with a single top-level `样本库` pane that contains nested tabs for `参考样本` / `生命周期` / `风格画像`, while keeping `基准评测` independent.

**Architecture:** Keep the existing frontend business logic, form ids, render functions, and API calls intact. Only change the information architecture in `web/index.html`, add a small nested-tab activation layer in `web/app.js`, and extend the UI test to verify the new grouping.

**Tech Stack:** Vanilla HTML/CSS/JS, built-in `node:test`, existing tab-driven admin console in `web/`

---

### Task 1: Lock The New Sample Library Structure In The UI Test

**Files:**
- Modify: `test/success-generation-ui.test.js`
- Reference: `web/index.html`
- Reference: `web/app.js`

- [ ] **Step 1: Replace the old flat-tab assertion with a failing grouped-pane test**

```js
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

test("frontend groups reference samples, lifecycle, and style profile under one sample library pane", async () => {
  const [indexHtml, appJs, styles] = await Promise.all([
    fs.readFile(path.join(process.cwd(), "web/index.html"), "utf8"),
    fs.readFile(path.join(process.cwd(), "web/app.js"), "utf8"),
    fs.readFile(path.join(process.cwd(), "web/styles.css"), "utf8")
  ]);

  assert.match(indexHtml, /data-tab-target="sample-library-pane"/);
  assert.match(indexHtml, /id="sample-library-pane"/);
  assert.match(indexHtml, /data-sample-library-tab-target="sample-library-success-pane"/);
  assert.match(indexHtml, /data-sample-library-tab-target="sample-library-lifecycle-pane"/);
  assert.match(indexHtml, /data-sample-library-tab-target="sample-library-style-pane"/);
  assert.match(indexHtml, />参考样本</);
  assert.match(indexHtml, />生命周期</);
  assert.match(indexHtml, />风格画像</);
  assert.doesNotMatch(indexHtml, /data-tab-target="success-samples-pane"/);
  assert.doesNotMatch(indexHtml, /data-tab-target="note-lifecycle-pane"/);
  assert.doesNotMatch(indexHtml, /data-tab-target="style-profile-pane"/);
  assert.match(appJs, /sample-library-tab-target/);
  assert.match(appJs, /initializeSampleLibraryTabs/);
  assert.match(styles, /\.sample-library-tab-strip/);
  assert.match(styles, /\.sample-library-tab-panel/);
});
```

- [ ] **Step 2: Run the UI test and verify it fails for the right reason**

Run:

```bash
node --test test/success-generation-ui.test.js
```

Expected:
- FAIL because `sample-library-pane` and the nested tab markup do not exist yet

- [ ] **Step 3: Commit the red test**

```bash
git add test/success-generation-ui.test.js
git commit -m "test: define sample library pane ui expectations"
```

### Task 2: Replace The Three Top-Level Tabs With One Sample Library Pane

**Files:**
- Modify: `web/index.html`
- Reference: `docs/superpowers/specs/2026-04-29-sample-library-pane-design.md`

- [ ] **Step 1: Replace the top-level tab buttons**

Update the data-maintenance tab strip so it keeps `改写样本`, `基准评测`, and `模型看板`, removes top-level `成功样本` / `生命周期` / `风格画像`, and inserts a single `样本库` button:

```html
<button type="button" class="tab-button" data-tab-target="rewrite-pairs-pane">改写样本</button>
<button type="button" class="tab-button" data-tab-target="sample-library-pane">样本库</button>
<button type="button" class="tab-button" data-tab-target="review-benchmark-pane">基准评测</button>
<button type="button" class="tab-button" data-tab-target="model-performance-pane">模型看板</button>
```

- [ ] **Step 2: Replace the three separate panels with one nested sample-library panel**

Insert a single panel in place of the old top-level `success-samples-pane`, `note-lifecycle-pane`, and `style-profile-pane`:

```html
<section class="tab-panel" id="sample-library-pane">
  <div class="tab-panel-head">
    <strong>样本库</strong>
    <span>把参考样本、生命周期记录和风格画像收在一个入口下，减少并列心智负担。</span>
  </div>

  <div class="sample-library-tab-strip" role="tablist" aria-label="样本库分区">
    <button type="button" class="sample-library-tab-button" data-sample-library-tab-target="sample-library-success-pane">
      参考样本
    </button>
    <button type="button" class="sample-library-tab-button" data-sample-library-tab-target="sample-library-lifecycle-pane">
      生命周期
    </button>
    <button type="button" class="sample-library-tab-button" data-sample-library-tab-target="sample-library-style-pane">
      风格画像
    </button>
  </div>

  <div class="sample-library-tab-panels">
    <section class="sample-library-tab-panel" id="sample-library-success-pane">
      <!-- move existing success sample form/result/list block here unchanged -->
    </section>
    <section class="sample-library-tab-panel" id="sample-library-lifecycle-pane">
      <!-- move existing lifecycle list block here unchanged -->
    </section>
    <section class="sample-library-tab-panel" id="sample-library-style-pane">
      <!-- move existing style profile control/result block here unchanged -->
    </section>
  </div>
</section>
```

- [ ] **Step 3: Keep all existing form/list/result ids unchanged**

The moved blocks must keep these ids exactly as-is so existing JavaScript continues to work:

```html
<form id="success-sample-form">...</form>
<div id="success-sample-result"></div>
<div id="success-sample-list"></div>
<div id="note-lifecycle-list"></div>
<input id="style-profile-topic" />
<button id="style-profile-draft-button" type="button">从参考样本生成画像草稿</button>
<div id="style-profile-result"></div>
```

- [ ] **Step 4: Commit the HTML restructure**

```bash
git add web/index.html
git commit -m "feat: group sample-related panels under sample library"
```

### Task 3: Add Nested Sample Library Tab Activation Without Breaking Existing Behavior

**Files:**
- Modify: `web/app.js`
- Modify: `web/styles.css`

- [ ] **Step 1: Add a dedicated nested-tab initializer**

Add a small helper near the existing tab setup logic:

```js
function initializeSampleLibraryTabs() {
  const buttons = Array.from(document.querySelectorAll("[data-sample-library-tab-target]"));
  const panels = Array.from(document.querySelectorAll(".sample-library-tab-panel"));

  if (!buttons.length || !panels.length) {
    return;
  }

  function activateSampleLibraryTab(targetId = "") {
    buttons.forEach((button) => {
      const active = button.dataset.sampleLibraryTabTarget === targetId;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-selected", active ? "true" : "false");
    });

    panels.forEach((panel) => {
      const active = panel.id === targetId;
      panel.hidden = !active;
      panel.classList.toggle("is-active", active);
    });
  }

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      activateSampleLibraryTab(button.dataset.sampleLibraryTabTarget || "");
    });
  });

  activateSampleLibraryTab(buttons[0].dataset.sampleLibraryTabTarget || "");
}
```

- [ ] **Step 2: Call the nested initializer after the page boots**

Ensure the app startup path includes:

```js
initializeTabs();
initializeSampleLibraryTabs();
```

- [ ] **Step 3: Update any “reveal sample area” helpers to target the new top-level pane**

Where the UI previously activated separate top-level tabs for these areas, redirect them to `sample-library-pane`:

```js
function revealSampleLibraryPane() {
  activateTab("sample-library-pane");
}
```

Use that helper inside existing success-sample/style-profile/lifecycle reveal flows instead of activating removed top-level pane ids.

- [ ] **Step 4: Add nested tab styling that stays visually subordinate to the main strip**

Add focused CSS:

```css
.sample-library-tab-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 18px;
}

.sample-library-tab-button {
  border: 1px solid var(--line);
  background: rgba(255, 255, 255, 0.7);
  color: var(--ink-soft);
  border-radius: 999px;
  padding: 8px 14px;
}

.sample-library-tab-button.is-active {
  background: var(--ink);
  color: white;
  border-color: var(--ink);
}

.sample-library-tab-panel[hidden] {
  display: none;
}
```

- [ ] **Step 5: Commit the JavaScript and CSS wiring**

```bash
git add web/app.js web/styles.css
git commit -m "feat: add nested sample library tabs"
```

### Task 4: Verify The New UI Grouping End-To-End

**Files:**
- Verify: `test/success-generation-ui.test.js`
- Verify: `web/index.html`
- Verify: `web/app.js`
- Verify: `web/styles.css`

- [ ] **Step 1: Run the updated UI test**

Run:

```bash
node --test test/success-generation-ui.test.js
```

Expected:
- PASS

- [ ] **Step 2: Re-run the note-records and API safety net that the pane depends on**

Run:

```bash
node --test test/success-samples-store.test.js
node --test test/note-records-store.test.js
node --test test/success-samples-api.test.js
node --test test/note-lifecycle-api.test.js
```

Expected:
- All PASS

- [ ] **Step 3: Inspect the final diff for accidental scope creep**

Run:

```bash
git diff -- web/index.html web/app.js web/styles.css test/success-generation-ui.test.js
```

Expected:
- Only Task 4 UI grouping changes appear

- [ ] **Step 4: Commit the verified Task 4 slice**

```bash
git add web/index.html web/app.js web/styles.css test/success-generation-ui.test.js
git commit -m "feat: consolidate sample-related ui into sample library"
```
