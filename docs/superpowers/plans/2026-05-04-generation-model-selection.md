# Generation Model Selection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a dedicated model selector for "生成新内容" while keeping generation on the generation-specific prompt and scoring pipeline.

**Architecture:** Extend the existing model-selection state with a new `generation` scope, add a dedicated generation UI control, and update `/api/generate-note` to prefer `generation` while only falling back to the `rewrite` model value for compatibility. The generation request must continue to use generation-specific prompt builders and generation workflow code.

**Tech Stack:** Vanilla HTML/CSS/JS frontend in `web/`, Node.js route handlers in `src/`, Node test runner via `node --test`.

---

## File Map

- `web/index.html`: Add the dedicated generation model selector near generation controls.
- `web/app.js`: Populate the new selector and include `generation` in the selected model payload.
- `src/model-selection.js`: Add `generation` options and normalization.
- `src/server.js`: Make `/api/generate-note` prefer `modelSelection.generation` with value-only fallback to `rewrite`.
- `test/success-generation-ui.test.js`: Assert the generation selector is visible and wired.
- `test/model-selection.test.js`: Assert `generation` exists and normalizes correctly.
- `test/generation-api.test.js`: Assert generation requests honor `generation` model selection.

## Task 1: Add failing tests for the new generation selector

**Files:**
- Modify: `test/success-generation-ui.test.js`
- Modify: `test/model-selection.test.js`
- Modify: `test/generation-api.test.js`

- [ ] **Step 1: Update UI expectations to require the generation selector**
- [ ] **Step 2: Update model-selection expectations to require a `generation` scope**
- [ ] **Step 3: Add generation API coverage for `generation` selection and fallback-to-`rewrite` value**
- [ ] **Step 4: Run targeted tests to verify they fail first**

Run: `node --test test/success-generation-ui.test.js test/model-selection.test.js test/generation-api.test.js`

Expected: FAIL until implementation is added.

## Task 2: Implement the dedicated generation selection scope

**Files:**
- Modify: `src/model-selection.js`
- Modify: `web/index.html`
- Modify: `web/app.js`
- Modify: `src/server.js`

- [ ] **Step 1: Add `generation` to model options and normalization**
- [ ] **Step 2: Render a dedicated generation model selector in the generation area**
- [ ] **Step 3: Include `generation` in the client request payload**
- [ ] **Step 4: Update `/api/generate-note` to prefer `generation` and only value-fallback to `rewrite`**

## Task 3: Verify generation stays on the generation pipeline

**Files:**
- Test: `test/success-generation-ui.test.js`
- Test: `test/model-selection.test.js`
- Test: `test/generation-api.test.js`
- Test: `test/rewrite-workflow.test.js`

- [ ] **Step 1: Re-run the focused tests**

Run: `node --test test/success-generation-ui.test.js test/model-selection.test.js test/generation-api.test.js test/rewrite-workflow.test.js`

Expected: PASS.

- [ ] **Step 2: Re-run a small workflow regression set**

Run: `node --test test/sample-library-api.test.js test/generation-api.test.js test/success-generation-ui.test.js`

Expected: PASS.
