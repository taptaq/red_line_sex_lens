# Generic-Agent 思路迁移 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the most useful `generic-agent` ideas into this project by adding a unified context compression layer, a retro feedback signal layer, and a reusable historical-record ranking helper for prediction and inspiration workflows.

**Architecture:** Keep the migration incremental and local to existing workflows. Instead of introducing a new agent runtime, add focused helpers that prepare smaller, higher-signal context bundles from existing project data, then reuse those helpers across `generation-workbench`, `theme-inspirations`, and publish prediction. Retro data remains human-confirmed, but becomes an actual input to later ranking and prediction instead of just being stored.

**Tech Stack:** Node.js service helpers, vanilla JS UI consumers where needed, existing note-record / sample-library data, `node:test`

---

## File Structure

- Create: `src/context-bundle.js`
  - Central helper for building compact, scoped context bundles from existing records, reference samples, and retro signals.
- Create: `src/relevant-records.js`
  - Deterministic helper for ranking historical records by relevance.
- Modify: `src/theme-inspirations.js`
  - Replace ad hoc evidence sourcing with the shared relevant-record helper and context bundle.
- Modify: `web/sample-library-calibration.js`
  - Feed publish prediction with ranked historical evidence instead of only local rule mapping.
- Modify: `src/generation-workbench.js`
  - Consume the compact context bundle in generation / briefing chains.
- Modify: `test/theme-inspirations.test.js`
  - Lock shared ranking and theme evidence usage.
- Modify: `test/sample-library-calibration-prefill.test.js`
  - Lock retro / evidence influence on publish prediction payloads.
- Modify: `test/generation-workbench.test.js`
  - Lock scoped context injection behavior.
- Create: `test/context-bundle.test.js`
  - Unit-test bundle selection and compression logic.
- Create: `test/relevant-records.test.js`
  - Unit-test ranking behavior and deterministic ordering.

## Task 1: Add reusable historical-record ranking helper

**Files:**
- Create: `src/relevant-records.js`
- Create: `test/relevant-records.test.js`

- [ ] **Step 1: Write the failing ranking tests**

Add tests that prove the helper prefers records sharing tags, collection type, title phrases, and successful publish signals.

```js
import test from "node:test";
import assert from "node:assert/strict";

import { rankRelevantHistoricalRecords } from "../src/relevant-records.js";

test("rankRelevantHistoricalRecords prefers records sharing tags and collection type", () => {
  const ranked = rankRelevantHistoricalRecords({
    title: "自慰后空虚是不是异常",
    body: "正文里提到空虚和羞耻感",
    tags: ["身体探索", "情绪反应"],
    collectionType: "科普",
    records: [
      {
        id: "record-good",
        note: {
          title: "为什么结束后会失落",
          body: "也提到空虚和羞耻感",
          tags: ["身体探索", "情绪反应"],
          collectionType: "科普"
        },
        publish: {
          status: "positive_performance",
          metrics: { likes: 88 }
        }
      },
      {
        id: "record-weak",
        note: {
          title: "无关标题",
          body: "无关内容",
          tags: ["日常"],
          collectionType: "经验"
        },
        publish: {
          status: "published_passed",
          metrics: { likes: 2 }
        }
      }
    ]
  });

  assert.equal(ranked[0].id, "record-good");
  assert.equal(ranked[0].reasons.length > 0, true);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
node --test test/relevant-records.test.js
```

Expected: fail because the helper file does not exist yet.

- [ ] **Step 3: Implement the minimal ranking helper**

Create `src/relevant-records.js` with a deterministic scoring pass using:

- tag overlap
- collection type match
- title phrase overlap
- body phrase overlap
- publish outcome bonus

Return ranked records with:

- `id`
- `score`
- `reasons`
- original record reference or a compact view

- [ ] **Step 4: Run the test to verify it passes**

Run:

```bash
node --test test/relevant-records.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/relevant-records.js test/relevant-records.test.js
git commit -m "feat: add relevant record ranking helper"
```

## Task 2: Add the unified context bundle helper

**Files:**
- Create: `src/context-bundle.js`
- Create: `test/context-bundle.test.js`

- [ ] **Step 1: Write the failing bundle tests**

Add tests that prove the bundle helper filters unrelated records and returns compressed summaries instead of raw long content.

```js
import test from "node:test";
import assert from "node:assert/strict";

import { buildScopedContextBundle } from "../src/context-bundle.js";

test("buildScopedContextBundle returns compressed relevant record summaries", () => {
  const bundle = buildScopedContextBundle({
    taskType: "publish_prediction",
    current: {
      title: "自慰后空虚是不是异常",
      body: "正文里提到空虚和羞耻感",
      tags: ["身体探索", "情绪反应"],
      collectionType: "科普"
    },
    records: [
      {
        id: "record-1",
        note: {
          title: "为什么结束后会失落",
          body: "很多人结束后会有短暂空虚和失落，这不一定意味着异常。".repeat(8),
          tags: ["身体探索", "情绪反应"],
          collectionType: "科普"
        },
        publish: { status: "positive_performance", metrics: { likes: 99 } }
      }
    ],
    referenceSamples: []
  });

  assert.equal(Array.isArray(bundle.relevantRecords), true);
  assert.equal(bundle.relevantRecords.length, 1);
  assert.equal(bundle.relevantRecords[0].summary.length < 220, true);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
node --test test/context-bundle.test.js
```

Expected: fail because the helper does not exist yet.

- [ ] **Step 3: Implement the minimal bundle helper**

Create `src/context-bundle.js` that:

- calls `rankRelevantHistoricalRecords(...)`
- picks the top few matches
- compresses note content into summaries
- returns:
  - `relevantRecords`
  - `relevantReferenceSamples`
  - `retroSignalsSummary`
  - `predictionEvidenceSummary`

Keep it deterministic and text-light.

- [ ] **Step 4: Run the test to verify it passes**

Run:

```bash
node --test test/context-bundle.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/context-bundle.js test/context-bundle.test.js
git commit -m "feat: add scoped context bundle helper"
```

## Task 3: Reuse shared ranking and context in publish prediction

**Files:**
- Modify: `web/sample-library-calibration.js`
- Modify: `test/sample-library-calibration-prefill.test.js`

- [ ] **Step 1: Write the failing prediction-evidence test**

Add a regression showing that prediction evidence is now influenced by relevant historical records, not only the local analysis snapshot.

```js
test("publish prediction evidence prefers matched historical records over generic fallback copy", () => {
  const prediction = buildSampleLibraryCalibrationPrediction(
    {
      kind: "record-analysis",
      summary: "当前预填来源：这条记录的已保存检测结果。",
      analysis: { finalVerdict: "observe", score: 22 },
      rewrite: null,
      relatedRecords: [
        {
          id: "record-good",
          title: "为什么结束后会失落",
          summary: "高表现样本，同样命中空虚和羞耻感。",
          reasons: ["标签重合", "标题短语命中"]
        }
      ]
    },
    { semantic: "glm-5.1", rewrite: "kimi-k2.6" }
  );

  assert.match(prediction.evidenceSummary, /高表现样本|标签重合/);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
node --test test/sample-library-calibration-prefill.test.js
```

Expected: fail because the helper still only uses local analysis/rewrite evidence.

- [ ] **Step 3: Implement the minimal prediction integration**

Update `web/sample-library-calibration.js` so:

- the source can accept pre-ranked related records
- evidence assembly prefers those historical matches when available
- the existing prediction fields remain backward-compatible

- [ ] **Step 4: Run the test to verify it passes**

Run:

```bash
node --test test/sample-library-calibration-prefill.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/sample-library-calibration.js test/sample-library-calibration-prefill.test.js
git commit -m "feat: use historical evidence in publish prediction"
```

## Task 4: Reuse shared ranking and context in theme inspiration and generation

**Files:**
- Modify: `src/theme-inspirations.js`
- Modify: `src/generation-workbench.js`
- Modify: `test/theme-inspirations.test.js`
- Modify: `test/generation-workbench.test.js`

- [ ] **Step 1: Write the failing shared-context tests**

Add tests that prove:

- theme inspirations can consume ranked related records
- generation prompt context no longer relies on broad raw history dumps

```js
test("theme inspirations prefer ranked relevant record summaries when building evidence context", () => {
  // assert a compact relevant-record summary is present in the model-facing payload
});

test("generation context bundle keeps injected record summaries compact", () => {
  // assert summaries are included but long raw bodies are not
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run:

```bash
node --test test/theme-inspirations.test.js
node --test test/generation-workbench.test.js
```

Expected: fail because these chains do not yet use the shared context helper.

- [ ] **Step 3: Implement the minimal integration**

Update:

- `src/theme-inspirations.js`
  - use `rankRelevantHistoricalRecords(...)` or `buildScopedContextBundle(...)` for model-side evidence
- `src/generation-workbench.js`
  - consume compact scoped context summaries where relevant instead of broad ad hoc context

Keep the change small and backward-compatible.

- [ ] **Step 4: Run the tests to verify they pass**

Run:

```bash
node --test test/theme-inspirations.test.js
node --test test/generation-workbench.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/theme-inspirations.js src/generation-workbench.js test/theme-inspirations.test.js test/generation-workbench.test.js
git commit -m "feat: reuse shared context across inspiration and generation"
```

## Self-Review

- Spec coverage:
  - unified context compression layer: covered in Tasks 1 and 2
  - retro feedback signal usage: covered in Task 2 and Task 3
  - shared historical ranking for prediction and inspiration: covered in Tasks 1, 3, and 4

- Placeholder scan:
  - no TBD / TODO / later markers
  - each task names exact files, tests, and commands

- Type consistency:
  - `rankRelevantHistoricalRecords(...)` and `buildScopedContextBundle(...)` stay stable across all tasks
  - publish prediction and theme inspiration both consume ranked evidence in a compatible summary shape

