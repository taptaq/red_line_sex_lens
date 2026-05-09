# Style Profile Modal Editing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore a visible current style-profile entry, let admins edit the active profile without losing edits on later auto refreshes, and make style-profile generation use the model-first fallback chain `qwen -> kimi -> deepseek -> local rules`.

**Architecture:** Add admin-only read/write routes for style profiles, persist manual overrides in style-profile state, refresh the profile from the current reference pool before admin reads, generate the profile through the model-first fallback chain, and reuse the existing shared modal to render and save the profile editor from the generation workspace.

**Tech Stack:** Node.js, built-in `node:test`, vanilla frontend JS, existing JSON data store

---

### Task 1: Lock the behavior with tests

**Files:**
- Modify: `test/style-profile.test.js`
- Modify: `test/style-profile-api.test.js`
- Modify: `test/success-generation-ui.test.js`

- [ ] Add backend tests for manual override persistence and admin route access.
- [ ] Add frontend tests for the new entry button, modal actions, and save flow.
- [ ] Add backend tests for model-chain fallback order and local-rule fallback behavior.
- [ ] Run the focused tests first and confirm they fail for the intended missing behavior.

### Task 2: Implement backend style-profile persistence and admin routes

**Files:**
- Modify: `src/style-profile.js`
- Modify: `src/data-store.js`
- Modify: `src/admin.js`
- Modify: `src/server.js`

- [ ] Extend style-profile sanitization to support manual overrides on editable fields.
- [ ] Update auto refresh to rebuild the automatic profile from the same qualified-reference pool used by the reference sample workspace while reapplying saved manual overrides.
- [ ] Add `qwen -> kimi -> deepseek -> local rules` generation fallback for style profiles and persist generation metadata.
- [ ] Expose admin-only read/write endpoints and include current style profile in admin data.
- [ ] Make the admin style-profile read path refresh from the latest qualified reference pool before returning.
- [ ] Keep removed public routes unchanged.

### Task 3: Implement frontend modal viewing and editing

**Files:**
- Modify: `web/index.html`
- Modify: `web/app.js`
- Modify: `web/styles.css`

- [ ] Add a generation-area entry button for opening the style-profile modal.
- [ ] Render a read/write modal view using the existing shared modal shell.
- [ ] Show reference sample titles plus ID hints instead of bare IDs.
- [ ] Format updated timestamps for local readability.
- [ ] Add a clear “model-first, local-rule fallback” explanation and generation label in the modal.
- [ ] Save edits through the new admin PATCH route and refresh local admin state after saving.
- [ ] Preserve current modal-close confirmation behavior for unrelated sample-library flows.

### Task 4: Verify and polish

**Files:**
- Reuse the files above only if fixes are needed

- [ ] Run targeted backend and frontend tests.
- [ ] Fix any regressions found by the tests.
- [ ] Summarize the final trigger timing, model fallback order, and manual-edit behavior clearly for the user.
