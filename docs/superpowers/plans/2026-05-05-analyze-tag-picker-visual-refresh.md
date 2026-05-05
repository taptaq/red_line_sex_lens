# Analyze Tag Picker Visual Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refresh the analyze tag picker so it adopts a compact warm-gold capsule style that matches the current product theme without changing picker behavior.

**Architecture:** Keep the current HTML structure and JS behavior intact wherever possible, and drive the refresh primarily through `web/styles.css`. Use one structural regression test update to lock in the capsule layout and shorter dropdown direction, then apply the minimal CSS changes needed to satisfy that updated surface while preserving the existing picker interactions.

**Tech Stack:** Static HTML, CSS, existing browser DOM behavior in `web/app.js`, `node:test`

---

## File Map

- `web/styles.css`: primary implementation file; converts the current row-like picker into a compact warm-gold capsule treatment.
- `web/index.html`: only touch if a tiny styling hook is absolutely necessary; prefer leaving markup unchanged.
- `test/analyze-tag-picker-layout.test.js`: updates structural style expectations for the capsule layout.
- `test/success-generation-ui.test.js`: only touch if a stale high-level style expectation conflicts with the refreshed picker surface.

### Task 1: Lock the capsule layout direction with a failing structural style test

**Files:**
- Modify: `test/analyze-tag-picker-layout.test.js`
- Test: `test/analyze-tag-picker-layout.test.js`

- [ ] **Step 1: Update the layout test to expect a compact wrapping option field**

In `test/analyze-tag-picker-layout.test.js`, keep the existing shell checks and strengthen the style test to expect the capsule direction:

```js
test("analyze tag picker styles use a compact wrapping capsule layout", async () => {
  const source = await fs.readFile(path.join(process.cwd(), "web/styles.css"), "utf8");

  assert.match(source, /\.tag-picker-options\s*\{[\s\S]*flex-wrap:\s*wrap/);
  assert.match(source, /\.tag-picker-option-row\s*\{[\s\S]*display:\s*inline-flex/);
  assert.match(source, /\.tag-picker-option\s*\{[\s\S]*border-radius:\s*999px/);
  assert.match(source, /\.tag-picker-dropdown\s*\{[\s\S]*max-height:/);
});
```

Keep the delete-affordance assertions that already exist.

- [ ] **Step 2: Run the layout test to verify it fails before the CSS refresh**

Run:

```bash
node --test test/analyze-tag-picker-layout.test.js
```

Expected: FAIL because the current picker options still use a taller row-like layout rather than the compact capsule layout.

- [ ] **Step 3: Commit the red test**

```bash
git add test/analyze-tag-picker-layout.test.js
git commit -m "test: cover analyze tag picker capsule styling"
```

### Task 2: Refresh the picker visuals in CSS

**Files:**
- Modify: `web/styles.css`
- Modify: `web/index.html` (only if a tiny style hook is required)
- Test: `test/analyze-tag-picker-layout.test.js`

- [ ] **Step 1: Restyle the trigger and selected area to match the warm-gold theme**

Update the existing trigger-related blocks in `web/styles.css` toward a tighter, warmer treatment:

```css
.tag-picker-trigger {
  min-height: 2.9rem;
  max-height: 4.9rem;
  padding: 0.8rem 0.95rem;
  border-radius: 20px;
  background:
    linear-gradient(180deg, rgba(255, 251, 244, 0.96), rgba(248, 238, 222, 0.88));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.7),
    0 8px 20px rgba(67, 43, 25, 0.05);
}

.tag-picker-selected {
  gap: 0.4rem;
  align-items: center;
  overflow: hidden;
}
```

Also introduce chip-like selected-tag styling if it does not already exist in the current file:

```css
.tag-picker-selected .tag-chip {
  display: inline-flex;
  align-items: center;
  min-height: 1.7rem;
  padding: 0.18rem 0.62rem;
  border-radius: 999px;
  background: rgba(199, 154, 69, 0.14);
  border: 1px solid rgba(199, 154, 69, 0.22);
  color: #6a4a1d;
  font-size: 0.84rem;
}
```

- [ ] **Step 2: Convert the dropdown option field from stacked rows to wrapping capsules**

Update the option layout blocks in `web/styles.css`:

```css
.tag-picker-options {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
  align-content: flex-start;
}

.tag-picker-option-row {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0;
  border: none;
  background: transparent;
}

.tag-picker-option {
  display: inline-flex;
  align-items: center;
  gap: 0.42rem;
  min-height: 2rem;
  padding: 0.4rem 0.78rem;
  border-radius: 999px;
  border: 1px solid rgba(199, 154, 69, 0.24);
  background: rgba(255, 251, 244, 0.92);
  color: var(--ink-soft);
}

.tag-picker-option.is-selected {
  border-color: rgba(199, 154, 69, 0.46);
  background: linear-gradient(180deg, rgba(242, 208, 140, 0.68), rgba(199, 154, 69, 0.28));
  color: #523816;
}
```

Keep the existing `data-tag-option` behavior unchanged.

- [ ] **Step 3: Tighten the dropdown card and custom-tag row**

Update the dropdown and custom controls so the surface feels shorter and lighter:

```css
.tag-picker-dropdown {
  gap: 0.75rem;
  padding: 0.82rem;
  border-radius: 20px;
  background:
    linear-gradient(180deg, rgba(255, 252, 247, 0.98), rgba(248, 238, 222, 0.94));
  box-shadow: 0 16px 34px rgba(67, 43, 25, 0.12);
  max-height: 15rem;
}

.tag-picker-custom {
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0.5rem;
}

.tag-picker-custom input {
  min-height: 2.5rem;
}
```

Refine the delete affordance into a small quiet circular close button:

```css
.tag-picker-option-delete {
  width: 1.7rem;
  height: 1.7rem;
  padding: 0;
  border-radius: 999px;
  background: rgba(54, 43, 31, 0.08);
}
```

- [ ] **Step 4: Run the layout test and verify it passes**

Run:

```bash
node --test test/analyze-tag-picker-layout.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit the visual refresh implementation**

```bash
git add web/styles.css web/index.html test/analyze-tag-picker-layout.test.js
git commit -m "feat: refresh analyze tag picker visuals"
```

### Task 3: Run the focused regression set and verify no behavior changes

**Files:**
- Modify: `web/styles.css`
- Modify: `web/index.html`
- Modify: `test/analyze-tag-picker-layout.test.js`
- Modify: `test/success-generation-ui.test.js` (only if needed for a stale style expectation)

- [ ] **Step 1: Run the full focused picker regression set**

Run:

```bash
node --test test/analyze-tag-picker-layout.test.js test/analyze-tag-picker-behavior.test.js test/success-generation-ui.test.js test/rewrite-panel-behavior.test.js
```

Expected: PASS.

- [ ] **Step 2: Inspect the diff to confirm the scope stayed visual**

Run:

```bash
git diff -- web/styles.css web/index.html test/analyze-tag-picker-layout.test.js test/success-generation-ui.test.js
```

Expected: only picker-surface styling changes, any tiny supporting markup hook, and the matching structural style expectations.

- [ ] **Step 3: Commit the verified visual polish**

```bash
git add web/styles.css web/index.html test/analyze-tag-picker-layout.test.js test/success-generation-ui.test.js
git commit -m "fix: polish analyze tag picker styling"
```
