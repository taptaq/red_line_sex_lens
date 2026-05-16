# Cover Image Prompt Generation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate one usable `coverImagePrompt` for each new candidate draft, show it on the final result card, and support one-click copy without changing lifecycle or sample-library flows.

**Architecture:** Extend the candidate normalization pipeline in `src/generation-workbench.js` so the candidate object always carries `coverImagePrompt`, generated from title/body with model-first plus local fallback. Then update `web/app.js` to render the prompt in the final result card and add a dedicated copy action, backed by focused backend and frontend tests.

**Tech Stack:** Node.js built-in test runner, existing generation workbench pipeline, vanilla frontend in `web/app.js`

---

### Task 1: Plan the candidate data shape and backend test coverage

**Files:**
- Modify: `test/generation-workbench.test.js`
- Modify: `src/generation-workbench.js`

- [ ] **Step 1: Write the failing backend tests**

```js
test("normalizeGenerationCandidate keeps cover image prompt when provided", () => {
  const candidate = normalizeGenerationCandidate(
    {
      title: "标题",
      body: "正文".repeat(80),
      coverImagePrompt: "基于正文生成的封面 prompt"
    },
    0
  );

  assert.equal(candidate.coverImagePrompt, "基于正文生成的封面 prompt");
});

test("generateNoteCandidates fills a short-mode fallback cover image prompt when model omits it", async () => {
  const result = await generateNoteCandidates({
    mode: "from_scratch",
    brief: { collectionType: "科普", topic: "亲密关系", lengthMode: "short" },
    generateJson: async () => ({
      candidate: {
        variant: "final",
        title: "短文标题",
        body: "正文".repeat(220),
        coverText: "封面文案",
        tags: ["亲密关系", "关系沟通"]
      },
      provider: "mock",
      model: "mock-model"
    })
  });

  assert.match(result.candidates[0].coverImagePrompt, /不露脸的萌系宇航员/);
  assert.match(result.candidates[0].coverImagePrompt, /去掉手臂的国旗标识/);
  assert.match(result.candidates[0].coverImagePrompt, /高反差/);
  assert.match(result.candidates[0].coverImagePrompt, /吸睛/);
  assert.match(result.candidates[0].coverImagePrompt, /封面文案/);
});

test("mergeGenerationRepairDraft preserves previous cover image prompt when repair payload omits it", () => {
  const merged = mergeGenerationRepairDraft(
    {
      title: "旧标题",
      body: "旧正文",
      coverText: "旧封面",
      coverImagePrompt: "旧的封面图 prompt"
    },
    {
      title: "新标题",
      body: "新正文"
    },
    {
      id: "candidate-final-1",
      variant: "final"
    }
  );

  assert.equal(merged.coverImagePrompt, "旧的封面图 prompt");
});
```

- [ ] **Step 2: Run backend tests to verify RED**

Run: `node --test test/generation-workbench.test.js`
Expected: FAIL because `coverImagePrompt` is not yet normalized/generated/preserved.

- [ ] **Step 3: Implement the minimal backend support**

```js
return {
  id,
  variant,
  title,
  body,
  coverText,
  coverImagePrompt,
  tags,
  generationNotes,
  safetyNotes,
  referencedSampleIds
};
```

- [ ] **Step 4: Run backend tests to verify GREEN**

Run: `node --test test/generation-workbench.test.js`
Expected: PASS for the new `coverImagePrompt` tests.

### Task 2: Add local fallback prompt builder and wire it into generation/repair flow

**Files:**
- Modify: `src/generation-workbench.js`
- Test: `test/generation-workbench.test.js`

- [ ] **Step 1: Write the failing behavior tests for mode-specific fallback**

```js
test("generateNoteCandidates builds a long-mode fallback cover image prompt with visible astronaut requirement", async () => {
  const result = await generateNoteCandidates({
    mode: "from_scratch",
    brief: { collectionType: "科普", topic: "沟通", lengthMode: "long" },
    generateJson: async () => ({
      candidate: {
        variant: "final",
        title: "长文标题",
        body: "正文".repeat(320),
        coverText: "长文封面文案",
        tags: ["沟通", "亲密关系"]
      },
      provider: "mock",
      model: "mock-model"
    })
  });

  assert.match(result.candidates[0].coverImagePrompt, /露脸的萌系宇航员/);
  assert.doesNotMatch(result.candidates[0].coverImagePrompt, /不露脸的萌系宇航员/);
});
```

- [ ] **Step 2: Run focused tests to verify RED**

Run: `node --test test/generation-workbench.test.js`
Expected: FAIL because long/short mode cover image prompt rules are not implemented yet.

- [ ] **Step 3: Implement fallback builder and generation wiring**

```js
function buildFallbackCoverImagePrompt({ brief = {}, candidate = {} } = {}) {
  const shortMode = String(brief.lengthMode || "").trim() !== "long";
  const astronautRule = shortMode ? "不露脸的萌系宇航员形象" : "露脸的萌系宇航员形象";
  const coverCopyRule = shortMode ? `封面文案：${candidate.coverText || candidate.title || ""}` : "";

  return [
    "小红书封面图",
    coverCopyRule,
    astronautRule,
    "去掉手臂的国旗标识",
    "高反差",
    "吸睛",
    `标题主题：${candidate.title || ""}`,
    `正文核心：${extractGenerationBodyPrimaryText(candidate.body || "").slice(0, 120)}`
  ].filter(Boolean).join("，");
}
```

- [ ] **Step 4: Run backend tests to verify GREEN**

Run: `node --test test/generation-workbench.test.js`
Expected: PASS, including short/long mode prompt assertions and repair preservation.

### Task 3: Add result-card display and copy action in the generation UI

**Files:**
- Modify: `web/app.js`
- Modify: `test/success-generation-ui.test.js`

- [ ] **Step 1: Write the failing frontend tests**

```js
test("frontend generation result shows cover image prompt and copy action", async () => {
  const { appJs } = await readFrontendFiles();
  const generationStart = appJs.indexOf("function renderGenerationResult(");
  const generationEnd = appJs.indexOf("function buildLexiconEntry(", generationStart);
  const generationSource = appJs.slice(generationStart, generationEnd);

  assert.match(generationSource, /封面图 Prompt/);
  assert.match(generationSource, /data-action="copy-generation-cover-image-prompt"/);
  assert.match(generationSource, /generation-cover-image-prompt-copy-hint/);
});
```

- [ ] **Step 2: Run frontend tests to verify RED**

Run: `node --test test/success-generation-ui.test.js`
Expected: FAIL because the result card does not yet render the prompt block or copy action.

- [ ] **Step 3: Implement the UI rendering and copy action**

```js
<div class="generation-cover-image-prompt-block">
  <p class="helper-text">封面图 Prompt</p>
  <div class="rewrite-body-reader">${escapeHtml(finalDraft.coverImagePrompt || "未生成")}</div>
</div>
<button
  type="button"
  class="button button-small button-secondary"
  data-action="copy-generation-cover-image-prompt"
  data-candidate-id="${escapeHtml(String(displayItem.id || ""))}"
  data-candidate-index="${escapeHtml(String(displayIndex))}"
>
  复制封面图 Prompt
</button>
```

- [ ] **Step 4: Run frontend tests to verify GREEN**

Run: `node --test test/success-generation-ui.test.js`
Expected: PASS for the new rendering and copy-action assertions.

### Task 4: Run focused end-to-end verification for this feature slice

**Files:**
- Verify only

- [ ] **Step 1: Run backend generation tests**

Run: `node --test test/generation-workbench.test.js`
Expected: PASS with zero failures.

- [ ] **Step 2: Run frontend generation UI tests**

Run: `node --test test/success-generation-ui.test.js`
Expected: PASS with zero failures.

- [ ] **Step 3: Re-read the spec and verify scope alignment**

Checklist:
- `coverImagePrompt` exists on generated candidate objects
- short mode requires `封面文案` + `不露脸的萌系宇航员形象`
- long mode requires `露脸的萌系宇航员形象`
- both modes require `去掉手臂的国旗标识` + `高反差` + `吸睛`
- repair rounds preserve previous `coverImagePrompt` when omitted
- UI shows full prompt and copy button on the final result card
- no lifecycle/sample-library scoring behavior is added

- [ ] **Step 4: Stop without committing**

Do not run `git commit`. Report changed files, verification commands, and any remaining risks directly to the user.
