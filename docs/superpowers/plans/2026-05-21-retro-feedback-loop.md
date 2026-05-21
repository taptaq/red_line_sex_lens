# Retro 反哺 Style Profile 与 Reference Ranking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn existing structured retro data into active downstream signals for automatic style-profile generation and reference-sample weighting.

**Architecture:** Add one small helper that summarizes retro signals from note records, then reuse that helper in two places: `style-profile` prompt assembly and `sample-weight` calculation. The retro helper should remain descriptive and additive rather than becoming a rule engine. It should never directly overwrite manual style overrides or force reference identity transitions.

**Tech Stack:** Node.js service helpers, existing note-record / sample-weight / style-profile modules, `node:test`

---

## File Structure

- Create: `src/retro-feedback.js`
  - Summarize retro validated/invalidated signals and reference-oriented hints from note records.
- Modify: `src/style-profile.js`
  - Inject retro style hints into automatic style-profile generation context.
- Modify: `src/sample-weight.js`
  - Add small retro-aware weighting adjustments to sample ranking.
- Create: `test/retro-feedback.test.js`
  - Lock the retro summarization helper behavior.
- Modify: `test/style-profile.test.js`
  - Verify retro style hints become part of the style-profile generation context or resulting auto state inputs.
- Modify: `test/sample-weight.test.js`
  - Verify retro signals affect sample ranking in a bounded way.

## Task 1: Build the retro feedback summarization helper

**Files:**
- Create: `src/retro-feedback.js`
- Create: `test/retro-feedback.test.js`

- [ ] **Step 1: Write the failing tests**

Add tests that prove the helper turns note-record retro fields into compact summary outputs.

```js
import test from "node:test";
import assert from "node:assert/strict";

import { buildRetroWeightHints } from "../src/retro-feedback.js";

test("buildRetroWeightHints summarizes validated and invalidated retro signals", () => {
  const hints = buildRetroWeightHints([
    {
      calibration: {
        retro: {
          validatedSignals: ["标题结构", "情绪共鸣"],
          invalidatedSignals: ["标签判断失准"],
          ruleImprovementCandidate: "同类标题结构可提权",
          shouldBecomeReference: true
        }
      }
    }
  ]);

  assert.deepEqual(hints.validatedSignals, ["标题结构", "情绪共鸣"]);
  assert.deepEqual(hints.invalidatedSignals, ["标签判断失准"]);
  assert.deepEqual(hints.ruleCandidates, ["同类标题结构可提权"]);
  assert.equal(hints.referenceBoostCount, 1);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run:

```bash
node --test test/retro-feedback.test.js
```

Expected: fail because `src/retro-feedback.js` does not exist yet.

- [ ] **Step 3: Implement the minimal retro helper**

Create `src/retro-feedback.js` with helpers such as:

```js
function normalizeSignalList(value = []) { ... }

export function buildRetroWeightHints(records = []) {
  const validatedSignals = [];
  const invalidatedSignals = [];
  const ruleCandidates = [];
  let referenceBoostCount = 0;

  for (const record of Array.isArray(records) ? records : []) {
    const retro = record?.calibration?.retro || {};

    validatedSignals.push(...normalizeSignalList(retro.validatedSignals));
    invalidatedSignals.push(...normalizeSignalList(retro.invalidatedSignals));

    if (retro.ruleImprovementCandidate) {
      ruleCandidates.push(String(retro.ruleImprovementCandidate).trim());
    }

    if (retro.shouldBecomeReference === true) {
      referenceBoostCount += 1;
    }
  }

  return {
    validatedSignals: [...new Set(validatedSignals)],
    invalidatedSignals: [...new Set(invalidatedSignals)],
    ruleCandidates: [...new Set(ruleCandidates)],
    styleHints: [...new Set(validatedSignals.map((item) => `已验证：${item}`).concat(invalidatedSignals.map((item) => `被推翻：${item}`)))],
    referenceBoostCount
  };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run:

```bash
node --test test/retro-feedback.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/retro-feedback.js test/retro-feedback.test.js
git commit -m "feat: add retro feedback summarization helper"
```

## Task 2: Feed retro style hints into automatic style-profile generation

**Files:**
- Modify: `src/style-profile.js`
- Modify: `test/style-profile.test.js`

- [ ] **Step 1: Write the failing tests**

Add a regression showing that retro style hints become part of the style-profile generation context.

```js
test("style profile generation can include retro style hints from note records", () => {
  const messages = buildStyleProfilePromptMessages(
    [{ title: "参考样本", body: "正文", tags: ["科普"] }],
    {
      topic: "身体探索",
      name: "身体探索画像",
      retroHints: {
        styleHints: ["已验证：标题结构", "被推翻：标签判断失准"],
        ruleCandidates: ["同类标题结构可提权"]
      }
    }
  );

  const combined = messages.map((item) => item.content).join("\n");
  assert.match(combined, /已验证：标题结构/);
  assert.match(combined, /被推翻：标签判断失准/);
  assert.match(combined, /同类标题结构可提权/);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run:

```bash
node --test test/style-profile.test.js
```

Expected: fail because prompt generation does not yet accept retro hints.

- [ ] **Step 3: Implement the minimal style-profile integration**

Update `src/style-profile.js` so:

- `buildStyleProfilePromptMessages(...)` accepts a `retroHints` option
- retro style hints are appended as compact explanatory context
- manual overrides remain untouched

Do not make retro hints overwrite the generated style fields directly.

- [ ] **Step 4: Run the tests to verify they pass**

Run:

```bash
node --test test/style-profile.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/style-profile.js test/style-profile.test.js
git commit -m "feat: feed retro hints into style profile generation"
```

## Task 3: Add retro-aware weighting to reference ranking

**Files:**
- Modify: `src/sample-weight.js`
- Modify: `test/sample-weight.test.js`

- [ ] **Step 1: Write the failing tests**

Add a regression showing that retro-confirmed samples get a bounded boost, while many invalidated signals reduce weight.

```js
test("sample weights can include bounded retro adjustments", () => {
  const ranked = rankSamplesByWeight(
    [
      {
        title: "样本 A",
        tier: "passed",
        metrics: { likes: 20, favorites: 5, comments: 2 },
        calibration: {
          retro: {
            shouldBecomeReference: true,
            validatedSignals: ["标题结构", "合集匹配"],
            invalidatedSignals: []
          }
        }
      },
      {
        title: "样本 B",
        tier: "passed",
        metrics: { likes: 20, favorites: 5, comments: 2 },
        calibration: {
          retro: {
            shouldBecomeReference: false,
            validatedSignals: [],
            invalidatedSignals: ["标签判断失准", "正文长度失准"]
          }
        }
      }
    ],
    "success"
  );

  assert.equal(ranked[0].title, "样本 A");
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run:

```bash
node --test test/sample-weight.test.js
```

Expected: fail because retro adjustments are not yet part of the weighting function.

- [ ] **Step 3: Implement the minimal weighting changes**

Update `src/sample-weight.js` so success-sample weighting includes small bounded retro adjustments:

- `shouldBecomeReference === true` => small positive bump
- `validatedSignals.length` => small positive bump
- `invalidatedSignals.length` => small negative bump

Keep the effect small so retro does not overpower publish metrics or tier.

- [ ] **Step 4: Run the tests to verify they pass**

Run:

```bash
node --test test/sample-weight.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/sample-weight.js test/sample-weight.test.js
git commit -m "feat: add retro-aware sample weighting"
```

## Self-Review

- Spec coverage:
  - retro -> style-profile: covered in Task 2
  - retro -> reference ranking: covered in Task 3
  - shared retro helper: covered in Task 1

- Placeholder scan:
  - no TBD / TODO / later placeholders
  - each task names exact files, test commands, and expected failure/pass states

- Type consistency:
  - `buildRetroWeightHints(...)` stays the single source for retro signal summaries
  - `styleHints`, `ruleCandidates`, and `referenceBoostCount` are reused consistently across tasks

