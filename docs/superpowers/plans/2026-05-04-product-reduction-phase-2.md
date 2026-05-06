# Product Reduction Phase 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove low-frequency tools in order while preserving the main self-improving loop and necessary compatibility APIs.

**Architecture:** Treat low-frequency tools as removable shells around the core workflow. Delete UI entry points and active tool behavior first, keep minimum compatible data interfaces where needed, and verify each phase independently before continuing.

**Tech Stack:** Vanilla HTML/CSS/JS frontend in `web/`, Node.js route handlers in `src/server.js`, JSON-backed stores in `data/`, Node test runner via `node --test`.

---

## File Map

- `web/index.html`: Visible low-frequency panels and entry points.
- `web/app.js`: Frontend state, event handlers, rendering, and navigation helpers for low-frequency tools.
- `web/styles.css`: Styles tied to removable panels.
- `src/server.js`: Compatibility routes and active tool endpoints.
- `src/evals/review-benchmark-harness.js`: Benchmark run implementation to remove in Phase 1.
- `src/model-performance.js`: Model dashboard summary logic targeted in Phase 2.
- `src/style-profile.js`: Style profile workbench logic targeted in Phase 3.
- `src/collection-types.js`: Collection type maintenance logic targeted in Phase 4.
- `test/benchmark-generation-ui.test.js`: Benchmark UI regression coverage to invert/remove in Phase 1.
- `test/review-benchmark-api.test.js`: Benchmark API compatibility coverage to narrow in Phase 1.
- `test/review-benchmark-harness.test.js`: Benchmark run coverage to remove in Phase 1.
- `test/model-performance.test.js`: Model performance dashboard coverage targeted in Phase 2.

## Phase 1: Remove Review Benchmark as a Product Tool

Status: Completed. Visible benchmark workspace, run capability, and remaining compatibility CRUD are all removed.

### Task P1.1: Remove benchmark UI surface first

**Files:**
- Modify: `test/benchmark-generation-ui.test.js`
- Modify: `test/success-generation-ui.test.js`
- Modify: `web/index.html`
- Modify: `web/app.js`
- Modify: `web/styles.css`

- [x] **Step 1: Update failing frontend tests first**

Change benchmark UI expectations so the app no longer renders `review-benchmark-pane`, benchmark filters, benchmark result area, or benchmark actions.

Run: `node --test test/benchmark-generation-ui.test.js test/success-generation-ui.test.js`

Expected: FAIL until benchmark UI is removed.

- [x] **Step 2: Remove benchmark markup from `web/index.html`**

Delete the `review-benchmark-pane` section from the folded calibration area and keep the remaining calibration structure valid.

- [x] **Step 3: Remove benchmark frontend logic from `web/app.js`**

Delete benchmark state, render helpers, event listeners, jump helpers, and mismatch recovery actions that only exist for benchmark.

- [x] **Step 4: Remove benchmark-only styles from `web/styles.css`**

Delete selectors dedicated only to benchmark layout and result rendering.

- [x] **Step 5: Re-run the frontend tests**

Run: `node --test test/benchmark-generation-ui.test.js test/success-generation-ui.test.js`

Expected: PASS.

### Task P1.2: Remove benchmark run capability and later compatibility CRUD

**Files:**
- Modify: `test/review-benchmark-api.test.js`
- Delete: `test/review-benchmark-harness.test.js`
- Modify: `src/server.js`
- Delete: `src/evals/review-benchmark-harness.js`
- Modify: `src/cli.js`

- [x] **Step 1: Update API tests to reflect the reduced compatibility boundary**

Keep CRUD coverage for `GET /api/review-benchmark`, `POST /api/review-benchmark`, and `DELETE /api/review-benchmark`.

Add an assertion that `POST /api/review-benchmark/run` no longer runs the benchmark tool and returns a clear removed/unsupported response.

Run: `node --test test/review-benchmark-api.test.js`

Expected: FAIL until the run route is changed.

- [x] **Step 2: Remove benchmark run implementation**

Delete the benchmark harness import and route behavior from `src/server.js`, and return a clear removed response from `POST /api/review-benchmark/run`.

- [x] **Step 3: Remove dedicated harness module and CLI entry**

Delete `src/evals/review-benchmark-harness.js` and remove its CLI command path from `src/cli.js`.

- [x] **Step 4: Remove obsolete benchmark harness test**

Delete `test/review-benchmark-harness.test.js`.

- [x] **Step 5: Re-run benchmark API coverage**

Run: `node --test test/review-benchmark-api.test.js`

Expected: PASS.

### Task P1.4: Remove obsolete benchmark compatibility layer entirely

**Files:**
- Modify: `test/review-benchmark-api.test.js`
- Delete: `test/review-benchmark-store.test.js`
- Modify: `src/server.js`
- Modify: `src/data-store.js`
- Modify: `src/config.js`
- Delete: `src/review-benchmark.js`

- [x] **Step 1: Invert benchmark compatibility API coverage to full removal**
- [x] **Step 2: Remove benchmark CRUD routes and store helpers**
- [x] **Step 3: Delete the now-unused benchmark normalization module and store test**
- [x] **Step 4: Re-run benchmark removal checks and focused workflow regressions**

### Task P1.3: Verify Phase 1 did not disturb the core workflow

**Files:**
- Test: `test/sample-library-api.test.js`
- Test: `test/note-records-store.test.js`
- Test: `test/rewrite-panel-behavior.test.js`
- Test: `test/success-generation-ui.test.js`

- [x] **Step 1: Run focused regression tests**

Run: `node --test test/sample-library-api.test.js test/note-records-store.test.js test/rewrite-panel-behavior.test.js test/success-generation-ui.test.js`

Expected: PASS.

## Phase 2: Remove Model Performance Dashboard

Status: Completed. Visible dashboard and route are removed. Internal call recording remains available where runtime still uses it.

### Task P2.1: Remove dashboard UI and route, keep internal call recording temporarily

**Files:**
- Modify: `test/model-performance.test.js`
- Modify: `test/success-generation-ui.test.js`
- Modify: `web/index.html`
- Modify: `web/app.js`
- Modify: `web/styles.css`
- Modify: `src/server.js`

- [x] **Step 1: Invert the dashboard UI and route tests first**
- [x] **Step 2: Remove model performance panel from frontend**
- [x] **Step 3: Remove `/api/model-performance` route**
- [x] **Step 4: Keep `recordModelCall` in place temporarily if runtime code still depends on it**
- [x] **Step 5: Run focused tests**

## Phase 3: Remove the standalone Style Profile workbench

Status: Completed. Standalone management UI is removed; generation still reads the current active profile and draft generation remains available.

### Task P3.1: Remove standalone management UI while preserving generation compatibility

**Files:**
- Modify: `web/index.html`
- Modify: `web/app.js`
- Modify: `test/style-profile-api.test.js`
- Modify: `test/style-profile.test.js`
- Modify: `test/success-generation-ui.test.js`

- [x] **Step 1: Remove style profile management entry points from the visible sample workspace**
- [x] **Step 2: Keep only the minimum read path required by generation**
- [x] **Step 3: Run focused generation and sample tests**

## Phase 4: Remove collection-type and tag maintenance tools

Status: Completed. Visible collection-type creation and analyze tag-maintenance flows are removed; existing options and plain-text tags remain.

### Task P4.1: Reduce configurable input maintenance

**Files:**
- Modify: `web/index.html`
- Modify: `web/app.js`
- Modify: `src/server.js`
- Modify: `test/collection-types-api.test.js`
- Modify: `test/analyze-tag-options-store.test.js`

- [x] **Step 1: Remove visible “新增合集” and tag-maintenance flows**
- [x] **Step 2: Keep a lightweight static or existing-options-only input path**
- [x] **Step 3: Re-run analyze and generation workflow tests**

## Phase 5: Remove explicit legacy compatibility entry points

Status: Mostly completed. Duplicate visible workspaces are removed and compatibility data has been pushed behind unified learning-sample flows; a final compatibility-tail audit remains.

### Task P5.1: Keep compatibility data, remove duplicate visible workspaces

**Files:**
- Modify: `web/index.html`
- Modify: `web/app.js`
- Modify: `test/rewrite-pairs-api.test.js`
- Modify: `test/success-samples-api.test.js`

- [x] **Step 1: Remove any remaining standalone entry points that duplicate learning samples**
- [x] **Step 2: Keep compatibility APIs behind the unified sample workspace**
- [x] **Step 3: Run sample-related regressions**

## Remaining Tail

- [x] Audit which compatibility-only endpoints and stores can be removed next without affecting the unified workflow
- [x] Decide whether `review-benchmark` compatibility CRUD should still remain
- [x] Decide whether `rewrite-pairs` compatibility API should still remain
- [x] Decide whether `success-samples` / `note-lifecycle` compatibility APIs should eventually be narrowed further
