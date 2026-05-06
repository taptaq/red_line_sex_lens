# Sample Library Calibration Roadmap

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the sample-library workflow into a real calibration loop that captures pre-publish predictions, post-publish retros, and eventually feeds rule updates and better sample selection.

**Architecture:** Keep everything inside the existing sample-library record model instead of creating a second prediction system. Store the calibration data beside `note`, `reference`, `publish`, and `snapshots`, expose it in the existing four-step detail flow, and then add lightweight automation around that foundation.

**Tech Stack:** Node.js HTTP server, vanilla browser JS, existing `note-records` persistence, sample-library API helpers, node:test

---

## Scope map

**Already completed**
- [x] Extend canonical `note-records` with `calibration.prediction` and `calibration.retro`
- [x] Support create / patch persistence for calibration fields
- [x] Add the fourth `预判复盘` step to sample-library detail
- [x] Add UI fields for manual prediction and manual retro entry
- [x] Cover the new model and UI surface with regression tests

**Still to do**
- [x] Generate calibration prediction from current analysis / rewrite results
- [x] Auto-compare prediction vs. lifecycle outcome and surface mismatch summary
- [x] Use retro data to suggest reference promotion and rule-improvement candidates
- [x] Add list-level filtering / badges / search for calibration state
- [x] Add calibration export / review views for batch operations
- [x] Add rule-validation workflow that replays historical calibrated samples

---

### Task 1: Stabilize the manual calibration foundation

**Files:**
- Verify: `src/note-records.js`
- Verify: `src/sample-library.js`
- Verify: `web/index.html`
- Verify: `web/app.js`
- Verify: `web/styles.css`
- Test: `test/note-records-store.test.js`
- Test: `test/sample-library-api.test.js`
- Test: `test/success-generation-ui.test.js`

- [x] **Step 1: Confirm canonical record shape includes calibration**

Check that every sample-library record now supports:

```js
{
  calibration: {
    prediction: {
      predictedStatus,
      predictedRiskLevel,
      predictedPerformanceTier,
      confidence,
      reason,
      model,
      createdAt
    },
    retro: {
      actualPerformanceTier,
      predictionMatched,
      missReason,
      validatedSignals,
      invalidatedSignals,
      shouldBecomeReference,
      ruleImprovementCandidate,
      notes,
      reviewedAt
    }
  }
}
```

- [x] **Step 2: Confirm create / patch / merge behavior is covered**

Run:

```bash
node --test test/note-records-store.test.js test/sample-library-api.test.js test/success-generation-ui.test.js
```

Expected: PASS with calibration tests green.

- [x] **Step 3: Confirm broader regression still passes**

Run:

```bash
node --test test/pdf-sample-import.test.js test/sample-library-pdf-import-api.test.js test/sample-library-pdf-import-ui.test.js test/sample-library-api.test.js test/note-records-store.test.js test/collection-types-api.test.js test/success-generation-ui.test.js
```

Expected: PASS with no regression in PDF import, sample-library API, or sample-library UI.

---

### Task 2: Add one-click prediction prefill from current analysis

**Files:**
- Modify: `web/app.js`
- Test: `test/success-generation-ui.test.js`
- Optional test: `test/sample-library-api.test.js` if payload shape changes

- [x] **Step 1: Add failing UI assertions for a prediction prefill action**

Assert the sample-library detail or create area exposes a button that fills prediction fields from current analysis / rewrite context.

- [x] **Step 2: Run the focused test and verify it fails**

Run:

```bash
node --test test/success-generation-ui.test.js
```

Expected: FAIL because the prefill action and helper do not exist yet.

- [x] **Step 3: Implement a prediction builder from current workbench state**

Add a small helper in `web/app.js` that maps the latest analysis state into prediction defaults:

```js
{
  predictedStatus,
  predictedRiskLevel,
  predictedPerformanceTier,
  confidence,
  reason,
  model,
  createdAt
}
```

Suggested mapping:
- `hard_block` -> `violation`
- `manual_review` -> `limited`
- `observe` / `pass` -> `published_passed`
- high semantic / rule confidence -> higher `confidence`
- use current semantic model / rewrite model selection as `model`

- [x] **Step 4: Wire a visible “从当前检测预填预判” action**

The button should:
- only enable when current analysis or rewrite has meaningful content
- write into the `预判复盘` fields
- keep existing manual edits possible after prefill

- [x] **Step 5: Re-run the focused test**

Run:

```bash
node --test test/success-generation-ui.test.js
```

Expected: PASS with new prefill assertions green.

---

### Task 3: Auto-derive retro match state from lifecycle results

**Files:**
- Modify: `web/app.js`
- Test: `test/success-generation-ui.test.js`
- Optional test: `test/sample-library-api.test.js`

- [x] **Step 1: Add failing assertions for comparison logic**

Add UI assertions that lifecycle plus calibration can produce:
- a `predictionMatched` suggestion
- a short mismatch label in the calibration summary

- [x] **Step 2: Run the focused test and verify it fails**

Run:

```bash
node --test test/success-generation-ui.test.js
```

Expected: FAIL because no comparison helper exists yet.

- [x] **Step 3: Implement a comparison helper**

Create a helper in `web/app.js` that compares:

```js
prediction.predictedStatus
prediction.predictedPerformanceTier
publish.status
publish.metrics
```

Suggested output:

```js
{
  matched,
  actualPerformanceTier,
  summary,
  missReasonSuggestion
}
```

- [x] **Step 4: Use the helper to prefill retro fields when enough lifecycle data exists**

The UI should suggest but not hard-lock:
- `predictionMatched`
- `actualPerformanceTier`
- `missReason`

- [x] **Step 5: Re-run the focused test**

Run:

```bash
node --test test/success-generation-ui.test.js
```

Expected: PASS with the comparison summary reflected in UI output.

---

### Task 4: Turn retro conclusions into sample and rule suggestions

**Files:**
- Modify: `web/app.js`
- Modify: `src/sample-library.js` if new persisted flags are added
- Test: `test/sample-library-api.test.js`
- Test: `test/success-generation-ui.test.js`

- [x] **Step 1: Add failing tests for recommendation helpers**

Cover two recommendation paths:
- suggest `shouldBecomeReference` when lifecycle is strong and retro says prediction matched
- suggest `ruleImprovementCandidate` when retro says prediction missed

- [x] **Step 2: Run tests to verify they fail**

Run:

```bash
node --test test/sample-library-api.test.js test/success-generation-ui.test.js
```

Expected: FAIL because there is no recommendation helper yet.

- [x] **Step 3: Implement suggestion logic in the browser**

Suggested heuristics:
- high-performing published content + matched prediction -> suggest reference promotion
- violation / limited / false positive mismatches -> suggest rule-improvement candidate text

- [x] **Step 4: Keep suggestions editable before save**

Do not auto-save these recommendations; surface them as defaults the user can adjust.

- [x] **Step 5: Re-run the focused tests**

Run:

```bash
node --test test/sample-library-api.test.js test/success-generation-ui.test.js
```

Expected: PASS with both recommendation paths covered.

---

### Task 5: Add calibration visibility in the sample-library list

**Files:**
- Modify: `web/app.js`
- Modify: `web/styles.css`
- Test: `test/success-generation-ui.test.js`

- [x] **Step 1: Add failing UI assertions for list-level calibration visibility**

Assert the list can show or search:
- predicted risk
- retro match state
- unreviewed calibration records

- [x] **Step 2: Run the UI test and verify it fails**

Run:

```bash
node --test test/success-generation-ui.test.js
```

Expected: FAIL because list-level calibration badges / filters do not exist yet.

- [x] **Step 3: Add compact calibration pills and search hooks**

Extend list cards with one compact calibration signal, for example:
- `待复盘`
- `预判命中`
- `高风险误差`

- [x] **Step 4: Add at least one practical filter**

Recommended first filter:
- `全部`
- `待复盘`
- `已命中`
- `有偏差`

- [x] **Step 5: Re-run the UI test**

Run:

```bash
node --test test/success-generation-ui.test.js
```

Expected: PASS with list-level calibration surface covered.

---

### Task 6: Add a batch calibration review view

**Files:**
- Modify: `web/index.html`
- Modify: `web/app.js`
- Modify: `web/styles.css`
- Test: `test/success-generation-ui.test.js`

- [x] **Step 1: Add failing UI assertions for a review queue**

Assert the app exposes a folded review view for sample-library calibration items that are:
- published but not retro-reviewed
- high-confidence mismatches

- [x] **Step 2: Run the UI test and verify it fails**

Run:

```bash
node --test test/success-generation-ui.test.js
```

Expected: FAIL because the calibration review queue does not exist yet.

- [x] **Step 3: Implement a lightweight queue inside folded maintenance space**

Keep this inside existing support / calibration areas, not in the main daily workbench.

- [x] **Step 4: Add quick actions from the queue back into the sample detail**

At minimum support:
- open record
- jump directly to `预判复盘`

- [x] **Step 5: Re-run the UI test**

Run:

```bash
node --test test/success-generation-ui.test.js
```

Expected: PASS with the queue and navigation covered.

---

### Task 7: Build rule-validation replay from calibrated history

**Files:**
- Modify: `src/server.js`
- Modify: `src/sample-library.js`
- Modify: `web/app.js`
- Optional create: `src/calibration-replay.js`
- Test: `test/sample-library-api.test.js`
- Test: new `test/calibration-replay.test.js`

- [x] **Step 1: Write a failing test for replaying calibrated samples**

Cover a small replay helper that takes historical calibrated records and returns:

```js
{
  total,
  matched,
  mismatched,
  highRiskMisses,
  referenceCandidatesAffected
}
```

- [x] **Step 2: Run the replay test and verify it fails**

Run:

```bash
node --test test/calibration-replay.test.js
```

Expected: FAIL because the replay helper does not exist yet.

- [x] **Step 3: Implement a minimal replay module**

Keep v1 read-only:
- no rule editing yet
- just evaluate how many calibrated samples would still look correct under a new heuristic or routing rule

- [x] **Step 4: Expose replay results in the folded calibration area**

The UI only needs:
- one trigger
- one result summary
- one short affected-sample preview

- [x] **Step 5: Run focused replay tests plus sample-library regressions**

Run:

```bash
node --test test/calibration-replay.test.js test/sample-library-api.test.js test/success-generation-ui.test.js
```

Expected: PASS with replay behavior covered.

---

### Task 8: Run the full regression pass before close-out

**Files:**
- Verify: `src/note-records.js`
- Verify: `src/sample-library.js`
- Verify: `src/server.js`
- Verify: `web/index.html`
- Verify: `web/app.js`
- Verify: `web/styles.css`
- Verify tests touched by earlier tasks

- [x] **Step 1: Run the sample-library and PDF regression suite**

Run:

```bash
node --test test/pdf-sample-import.test.js test/sample-library-pdf-import-api.test.js test/sample-library-pdf-import-ui.test.js test/sample-library-api.test.js test/note-records-store.test.js test/collection-types-api.test.js test/success-generation-ui.test.js
```

Expected: PASS with `0` failures.

- [x] **Step 2: Update any docs that describe the sample-library workflow**

If the visible workflow changed materially, update the relevant spec / plan / README notes so the new `预判复盘` step is not implicit tribal knowledge.

- [ ] **Step 3: Commit in small logical slices**

Recommended commit sequence:

```bash
git commit -m "feat: prefill sample-library predictions from analysis"
git commit -m "feat: compare lifecycle outcomes against predictions"
git commit -m "feat: add calibration review and replay workflows"
```

---

## Recommended execution order

1. Finish `Task 4`
2. Finish `Task 5`
3. Finish `Task 6`
4. Finish `Task 7`
5. Run `Task 8`

## What we should do next

The highest-value next slice is now `Task 4`: turn retro conclusions into reference-sample and rule-improvement suggestions, so the calibration loop begins feeding the rest of the system instead of only recording history.
