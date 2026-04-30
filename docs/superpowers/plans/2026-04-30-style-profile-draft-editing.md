# Style Profile Draft Editing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users manually edit a draft style profile inline before confirming it as the active profile.

**Architecture:** Keep the existing style-profile storage shape and extend the current `PATCH /api/style-profile` endpoint with a draft-update action. On the frontend, add a small local edit state so the draft card can switch between read-only and inline-edit modes without affecting active or archived versions.

**Tech Stack:** Node.js, native test runner, existing `web/app.js` rendering, existing `src/server.js` HTTP handlers, existing `src/style-profile.js` normalization helpers

---

## File Structure

- Modify: `src/style-profile.js`
  - add a draft-update helper that only persists editable fields
- Modify: `src/server.js`
  - support `PATCH /api/style-profile` with `action: "update-draft"`
- Modify: `web/app.js`
  - add local edit state, inline draft form rendering, save/cancel/confirm actions
- Modify: `web/styles.css`
  - style the inline draft editor without introducing a new surface
- Modify: `test/style-profile.test.js`
  - cover draft-update behavior and editable field normalization
- Create or modify: `test/style-profile-api.test.js`
  - cover the new route behavior end-to-end through `handleRequest`
- Modify: `test/benchmark-generation-ui.test.js`
  - cover frontend wiring for edit mode, save, and confirm paths

### Task 1: Draft Update Model

**Files:**
- Modify: `src/style-profile.js`
- Test: `test/style-profile.test.js`

- [ ] **Step 1: Write the failing tests**
- [ ] **Step 2: Run `node --test test/style-profile.test.js` and confirm the new tests fail for missing draft-update support**
- [ ] **Step 3: Add the minimal `updateStyleProfileDraft(...)` helper in `src/style-profile.js`**
- [ ] **Step 4: Re-run `node --test test/style-profile.test.js` and confirm it passes**

### Task 2: Draft Update API

**Files:**
- Modify: `src/server.js`
- Create or modify: `test/style-profile-api.test.js`

- [ ] **Step 1: Write the failing route tests for `PATCH /api/style-profile` with `action: "update-draft"`**
- [ ] **Step 2: Run `node --test test/style-profile-api.test.js` and confirm the new tests fail**
- [ ] **Step 3: Add the minimal server branch to persist draft edits and return updated state**
- [ ] **Step 4: Re-run `node --test test/style-profile-api.test.js` and confirm it passes**

### Task 3: Inline Draft Editing UI

**Files:**
- Modify: `web/app.js`
- Modify: `web/styles.css`
- Modify: `test/benchmark-generation-ui.test.js`

- [ ] **Step 1: Write the failing frontend assertions for draft edit controls, inline form state, and save action wiring**
- [ ] **Step 2: Run `node --test test/benchmark-generation-ui.test.js` and confirm the new tests fail**
- [ ] **Step 3: Add minimal frontend state, render branches, and action handlers for edit / cancel / save / confirm**
- [ ] **Step 4: Add minimal CSS for the inline editor**
- [ ] **Step 5: Re-run `node --test test/benchmark-generation-ui.test.js` and confirm it passes**

### Task 4: Final Verification

**Files:**
- Verify only

- [ ] **Step 1: Run `node --test test/style-profile.test.js test/style-profile-api.test.js test/benchmark-generation-ui.test.js`**
- [ ] **Step 2: Review the diff for unintended changes**
