# XHS Prohibited Words Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate Xiaohongshu-only external prohibited-word detection into the existing content detection flow so it augments local rule analysis, affects verdict severity, and marks analysis as incomplete when the external check fails.

**Architecture:** Add a dedicated Redfox prohibited-word integration module, invoke it from `analyzePost()` as a second evidence layer, merge its severity into the existing verdict, and expand the current `规则检测` UI to show external hit summary and failure completeness state without adding a new panel.

**Tech Stack:** Node.js ESM, existing local HTTP server, vanilla frontend rendering, Node test runner

---

## File Map

- Create: `src/prohibited-words.js`
  Dedicated Redfox prohibited-word client, normalization, severity mapping, and failure-safe result contract.
- Modify: `src/analyzer.js`
  Run external prohibited-word check, merge verdicts, and expose completeness metadata.
- Modify: `src/server.js`
  If needed, keep existing analysis route contract stable while returning the expanded analyzer payload.
- Modify: `web/analysis-review-view.js`
  Expand the existing `规则检测` result rendering with external prohibited-word summary/details.
- Modify: `web/app.js`
  Ensure the existing analysis result rendering passes through the new analyzer fields without special casing or hidden failure.
- Test: `test/prohibited-words.test.js`
  Focused unit coverage for integration client normalization and severity mapping.
- Modify: `test/analyzer-seed-lexicon.test.js`
  Merge-path coverage: local verdict + external verdict + incomplete-result behavior.
- Modify: `test/success-generation-ui.test.js`
  UI coverage for rule detection rendering additions.
- Modify: `README.md`
  Mention Xiaohongshu-only external prohibited-word layer and incomplete-result semantics.
- Modify: `SYSTEM_FLOW.md`
  Mention external prohibited-word layer inside content detection.

---

### Task 1: Add prohibited-word integration module and its unit tests

**Files:**
- Create: `src/prohibited-words.js`
- Test: `test/prohibited-words.test.js`

- [ ] **Step 1: Write the failing unit tests**

```js
import test from "node:test";
import assert from "node:assert/strict";

import {
  mapExternalSensitiveSeverity,
  normalizeProhibitedWordsResult,
  normalizeProhibitedWordsFailure
} from "../src/prohibited-words.js";

test("mapExternalSensitiveSeverity maps low/medium/high signals into local verdict levels", () => {
  assert.equal(mapExternalSensitiveSeverity({ level: "low" }), "observe");
  assert.equal(mapExternalSensitiveSeverity({ level: "medium" }), "manual_review");
  assert.equal(mapExternalSensitiveSeverity({ level: "high" }), "hard_block");
});

test("normalizeProhibitedWordsResult returns a stable xiaohongshu payload", () => {
  const normalized = normalizeProhibitedWordsResult({
    platform: "xiaohongshu",
    hitCount: 2,
    level: "medium",
    highlightedText: "命中词上下文",
    suggestions: [{ term: "最", replacement: "更", reason: "极限词" }],
    optimizedText: "更稳版本"
  });

  assert.equal(normalized.status, "ok");
  assert.equal(normalized.platform, "xiaohongshu");
  assert.equal(normalized.hitCount, 2);
  assert.equal(normalized.severity, "manual_review");
  assert.equal(normalized.optimizedText, "更稳版本");
});

test("normalizeProhibitedWordsFailure preserves non-blocking error state", () => {
  const normalized = normalizeProhibitedWordsFailure(new Error("服务超时"));
  assert.equal(normalized.status, "error");
  assert.equal(normalized.platform, "xiaohongshu");
  assert.match(normalized.message, /服务超时/);
  assert.equal(normalized.severity, "unknown");
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test test/prohibited-words.test.js`
Expected: FAIL with missing module / missing exports.

- [ ] **Step 3: Implement the prohibited-word integration module**

```js
// src/prohibited-words.js
function normalizeString(value = "") {
  return String(value || "").trim();
}

export function mapExternalSensitiveSeverity(input = {}) {
  const level = normalizeString(input.level || input.severity || input.riskLevel).toLowerCase();
  if (level === "high" || level === "hard_block") return "hard_block";
  if (level === "medium" || level === "manual_review") return "manual_review";
  if (level === "low" || level === "observe") return "observe";
  return "observe";
}

export function normalizeProhibitedWordsResult(payload = {}) {
  const suggestions = Array.isArray(payload.suggestions)
    ? payload.suggestions
        .filter((item) => item && typeof item === "object")
        .map((item) => ({
          term: normalizeString(item.term || item.word),
          replacement: normalizeString(item.replacement || item.safeWord),
          reason: normalizeString(item.reason || item.note)
        }))
        .filter((item) => item.term || item.replacement || item.reason)
    : [];

  return {
    status: "ok",
    platform: "xiaohongshu",
    hitCount: Number(payload.hitCount || suggestions.length || 0) || 0,
    severity: mapExternalSensitiveSeverity(payload),
    highlightedText: normalizeString(payload.highlightedText || payload.markedText),
    suggestions,
    optimizedText: normalizeString(payload.optimizedText || payload.safeText),
    message: "",
    raw: payload && typeof payload === "object" ? structuredClone(payload) : {}
  };
}

export function normalizeProhibitedWordsFailure(error) {
  return {
    status: "error",
    platform: "xiaohongshu",
    hitCount: 0,
    severity: "unknown",
    highlightedText: "",
    suggestions: [],
    optimizedText: "",
    message: `外部违禁词检测失败：${error?.message || "未知错误"}`,
    raw: null
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test test/prohibited-words.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/prohibited-words.js test/prohibited-words.test.js
git commit -m "feat: add prohibited words normalization module"
```

### Task 2: Add Redfox request logic with Xiaohongshu-only contract

**Files:**
- Modify: `src/prohibited-words.js`
- Test: `test/prohibited-words.test.js`

- [ ] **Step 1: Write the failing transport tests**

```js
test("checkProhibitedWords sends xiaohongshu platform and returns normalized result", async () => {
  let captured = null;

  const result = await checkProhibitedWords(
    { title: "标题", body: "正文", coverText: "封面", tags: ["标签"] },
    {
      requestImpl: async ({ url, headers, body }) => {
        captured = { url, headers, body };
        return {
          hitCount: 1,
          level: "low",
          suggestions: [{ term: "秒杀", replacement: "优惠", reason: "营销风险" }]
        };
      }
    }
  );

  assert.equal(captured.body.platform, "xiaohongshu");
  assert.equal(result.status, "ok");
  assert.equal(result.severity, "observe");
});

test("checkProhibitedWords returns normalized failure instead of throwing", async () => {
  const result = await checkProhibitedWords(
    { body: "正文" },
    {
      requestImpl: async () => {
        throw new Error("接口超时");
      }
    }
  );

  assert.equal(result.status, "error");
  assert.match(result.message, /接口超时/);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test test/prohibited-words.test.js`
Expected: FAIL with missing `checkProhibitedWords` export.

- [ ] **Step 3: Implement transport and request builder**

```js
// src/prohibited-words.js
function buildProhibitedWordsContent(input = {}) {
  return [input.title, input.body, input.coverText, ...(Array.isArray(input.tags) ? input.tags : [])]
    .map((item) => normalizeString(item))
    .filter(Boolean)
    .join("\n");
}

async function defaultRequestImpl({ url, headers, body }) {
  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(`外部违禁词接口失败（${response.status}）${message ? `：${message}` : ""}`);
  }

  return response.json();
}

export async function checkProhibitedWords(input = {}, { requestImpl = defaultRequestImpl } = {}) {
  const apiKey = normalizeString(process.env.REDFOX_API_KEY);
  const endpoint = normalizeString(process.env.PROHIBITED_WORD_API_URL) || "https://redfox.hk/story/api/cozeSkill/sensitiveWordSearch";
  const content = buildProhibitedWordsContent(input);

  if (!apiKey) {
    return normalizeProhibitedWordsFailure(new Error("缺少 REDFOX_API_KEY"));
  }

  try {
    const payload = await requestImpl({
      url: endpoint,
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey
      },
      body: {
        platform: "xiaohongshu",
        content,
        source: "red-line-sex-lens"
      }
    });

    return normalizeProhibitedWordsResult(payload);
  } catch (error) {
    return normalizeProhibitedWordsFailure(error);
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test test/prohibited-words.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/prohibited-words.js test/prohibited-words.test.js
git commit -m "feat: add xhs prohibited words request flow"
```

### Task 3: Merge external prohibited-word results into analyzePost

**Files:**
- Modify: `src/analyzer.js`
- Modify: `test/analyzer-seed-lexicon.test.js`
- Create or extend: `test/prohibited-words.test.js`

- [ ] **Step 1: Write the failing analyzer merge tests**

```js
test("external prohibited-word severity can raise final verdict", async () => {
  const result = await analyzePost(
    { title: "标题", body: "正文" },
    {
      checkProhibitedWords: async () => ({
        status: "ok",
        platform: "xiaohongshu",
        hitCount: 1,
        severity: "manual_review",
        highlightedText: "命中词上下文",
        suggestions: [{ term: "最", replacement: "更", reason: "极限词" }],
        optimizedText: "更稳版本",
        message: "",
        raw: {}
      })
    }
  );

  assert.equal(result.verdict, "manual_review");
  assert.equal(result.externalSensitiveWords.raisedVerdict, true);
  assert.equal(result.analysisCompleteness.isComplete, true);
});

test("external prohibited-word failure keeps local analysis but marks result incomplete", async () => {
  const result = await analyzePost(
    { title: "标题", body: "正文" },
    {
      checkProhibitedWords: async () => ({
        status: "error",
        platform: "xiaohongshu",
        hitCount: 0,
        severity: "unknown",
        highlightedText: "",
        suggestions: [],
        optimizedText: "",
        message: "外部违禁词检测失败：接口超时",
        raw: null
      })
    }
  );

  assert.equal(result.analysisCompleteness.isComplete, false);
  assert.equal(result.externalSensitiveWords.status, "error");
  assert.match(result.externalSensitiveWords.message, /接口超时/);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test test/analyzer-seed-lexicon.test.js test/prohibited-words.test.js`
Expected: FAIL because analyzePost does not yet accept/merge external prohibited-word results.

- [ ] **Step 3: Implement analyzer merge behavior**

```js
// src/analyzer.js imports
import { checkProhibitedWords } from "./prohibited-words.js";
```

```js
// src/analyzer.js helper sketch
function verdictRank(value = "pass") {
  if (value === "hard_block") return 3;
  if (value === "manual_review") return 2;
  if (value === "observe") return 1;
  return 0;
}

function stricterVerdict(left = "pass", right = "pass") {
  return verdictRank(right) > verdictRank(left) ? right : left;
}
```

```js
// analyzePost signature
export async function analyzePost(input = {}, { checkProhibitedWords: checkExternal = checkProhibitedWords } = {}) {
```

```js
// inside analyzePost after local verdict is computed
const externalSensitiveWords = await checkExternal({
  title: post.title,
  body: post.body,
  coverText: post.coverText,
  tags,
  collectionType
});

const mergedVerdict = externalSensitiveWords.status === "ok"
  ? stricterVerdict(verdict, externalSensitiveWords.severity)
  : verdict;
const raisedVerdict = verdictRank(mergedVerdict) > verdictRank(verdict);

if (externalSensitiveWords.status === "ok" && externalSensitiveWords.hitCount > 0) {
  suggestions.unshift("命中外部违禁词库，建议优先按替换建议收紧表述。");
}

return {
  ...existingResult,
  verdict: mergedVerdict,
  externalSensitiveWords: {
    ...externalSensitiveWords,
    raisedVerdict
  },
  analysisCompleteness: {
    localRules: "ok",
    externalSensitiveWords: externalSensitiveWords.status,
    isComplete: externalSensitiveWords.status !== "error"
  }
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test test/analyzer-seed-lexicon.test.js test/prohibited-words.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/analyzer.js src/prohibited-words.js test/analyzer-seed-lexicon.test.js test/prohibited-words.test.js
git commit -m "feat: merge prohibited words into analyzer verdict"
```

### Task 4: Expand rule-detection UI rendering

**Files:**
- Modify: `web/analysis-review-view.js`
- Modify: `web/app.js`
- Modify: `test/success-generation-ui.test.js`

- [ ] **Step 1: Write the failing UI rendering tests**

```js
test("analysis view renders external prohibited-word summary inside the rule detection card", async () => {
  const source = await fs.readFile(path.join(process.cwd(), "web/analysis-review-view.js"), "utf8");
  assert.match(source, /外部违禁词摘要/);
  assert.match(source, /外部违禁词命中与建议/);
  assert.match(source, /结果不完整：外部违禁词检测失败/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/success-generation-ui.test.js`
Expected: FAIL because the analysis card has no external prohibited-word subsection.

- [ ] **Step 3: Implement UI rendering additions**

```js
// web/analysis-review-view.js sketch inside analysis card rendering
const externalSensitiveWords = analysis?.externalSensitiveWords && typeof analysis.externalSensitiveWords === "object"
  ? analysis.externalSensitiveWords
  : null;
const completeness = analysis?.analysisCompleteness && typeof analysis.analysisCompleteness === "object"
  ? analysis.analysisCompleteness
  : null;
```

Render additions:

- summary pills for `外部违禁词 ${hitCount}` and `结果不完整`
- subsection `外部违禁词摘要`
- subsection `外部违禁词命中与建议`
- optimized text block when available

No new panel; keep this inside the existing rule-detection output.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/success-generation-ui.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add web/analysis-review-view.js web/app.js test/success-generation-ui.test.js
git commit -m "feat: show prohibited words inside rule detection card"
```

### Task 5: Focused docs sync and verification

**Files:**
- Modify: `README.md`
- Modify: `SYSTEM_FLOW.md`
- Test: `test/prohibited-words.test.js`
- Test: `test/analyzer-seed-lexicon.test.js`
- Test: `test/success-generation-ui.test.js`

- [ ] **Step 1: Update docs**

```md
- README.md:
  - mention Xiaohongshu-only external prohibited-word layer
  - explain that external failure marks analysis as incomplete rather than blocking local rules
  - explain that the result is shown inside the rule detection card

- SYSTEM_FLOW.md:
  - mention external prohibited-word detection as a second evidence layer in content detection
```

- [ ] **Step 2: Run focused verification**

Run: `node --test test/prohibited-words.test.js test/analyzer-seed-lexicon.test.js test/success-generation-ui.test.js`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add README.md SYSTEM_FLOW.md test/prohibited-words.test.js test/analyzer-seed-lexicon.test.js test/success-generation-ui.test.js
git commit -m "docs: document prohibited words integration"
```
