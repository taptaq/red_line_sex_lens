# XHS Hot Article Generation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `xiaohongshu-write` hot-article evidence into the existing `生成新内容` flow so generated notes can reference recent Xiaohongshu winning patterns and show a compact `爆款公式来源`.

**Architecture:** Create a focused Redfox hot-article module that derives keywords, fetches recent hot notes, normalizes and summarizes patterns, then pass that summary into `buildGenerationMessages()` and return it through `/api/generate-note`. Render the formula in the existing generation result panel without exposing the raw 50-note dataset.

**Tech Stack:** Node.js ESM, existing local HTTP server, vanilla frontend modules, Node test runner.

---

## File Map

- Create: `src/xhs-hot-articles.js`
  Keyword derivation, Redfox hot-article request, record normalization, time-window expansion, and formula summarization.
- Modify: `src/generation-workbench.js`
  Accept optional `hotArticleFormula` in `buildGenerationMessages()` and `generateNoteCandidates()`.
- Modify: `src/server.js`
  Build hot-article formula before generation, pass it into candidate generation, and return it in `/api/generate-note`.
- Modify: `web/app.js`
  Carry response-level `hotArticleFormula` into generation result rendering.
- Modify: `web/analysis-review-view.js`
  Render compact `爆款公式来源` in the existing generation result card.
- Test: `test/xhs-hot-articles.test.js`
  Unit coverage for keyword derivation, normalization, summarization, and fetch fallback.
- Modify: `test/generation-api.test.js`
  API contract coverage for successful formula, skipped formula, and non-blocking formula failure.
- Modify: `test/success-generation-ui.test.js` or create focused UI test if lighter
  UI coverage for formula rendering and raw-data non-leakage.
- Modify: `README.md`
  Document generation hot-article evidence.
- Modify: `SYSTEM_FLOW.md`
  Update generation flow description.

---

### Task 1: Add Hot-Article Formula Module

**Files:**
- Create: `src/xhs-hot-articles.js`
- Test: `test/xhs-hot-articles.test.js`

- [ ] Write failing tests for:
  - `deriveHotArticleKeyword()` chooses `brief.topic` before `referenceTitle`, `briefing`, tags, and draft fields.
  - filler text like `帮我写一篇关于关系沟通的小红书笔记` normalizes to `关系沟通`.
  - `normalizeHotArticleRecord()` maps Redfox fields: title, desc, noteLink, authorNickname, authorLink, liked/collected/comment/shared/interactive counts.
  - `summarizeHotArticleFormula()` returns `status: "ok"`, formula text, title/opening/structure/tag patterns, high-frequency keywords, interaction prompts, and top 2-3 references.
  - empty input returns `status: "skipped"` with `reason: "no_items"`.
- [ ] Run `node --test test/xhs-hot-articles.test.js` and confirm the tests fail for missing module/exports.
- [ ] Implement minimal exports:
  - `deriveHotArticleKeyword({ brief, draft })`
  - `normalizeHotArticleRecord(record)`
  - `summarizeHotArticleFormula({ keyword, timeWindowDays, items })`
  - `buildSkippedHotArticleFormula(reason, extra = {})`
- [ ] Run `node --test test/xhs-hot-articles.test.js` and confirm the new tests pass.

### Task 2: Add Redfox Fetch With 7-Day To 30-Day Expansion

**Files:**
- Modify: `src/xhs-hot-articles.js`
- Test: `test/xhs-hot-articles.test.js`

- [ ] Add failing tests for `fetchHotArticleFormula()`:
  - sends keyword, `maxItems: 50`, `pageSize: 50`, and `startDate` based on a 7-day window.
  - if the 7-day result has too few usable items, retries with a 30-day window.
  - if request throws, returns `status: "error"` and does not throw.
  - if no keyword is derived, returns `status: "skipped"` with `reason: "no_keyword"`.
- [ ] Run `node --test test/xhs-hot-articles.test.js` and confirm the transport tests fail.
- [ ] Implement `fetchHotArticleFormula({ brief, draft, now, requestImpl })`.
- [ ] Use `REDFOX_API_KEY` for auth and support endpoint override through `XHS_HOT_ARTICLES_API_URL`.
- [ ] Keep raw returned items out of the normalized formula except the selected 2-3 references.
- [ ] Run `node --test test/xhs-hot-articles.test.js` and confirm all module tests pass.

### Task 3: Inject Formula Into Generation Prompt

**Files:**
- Modify: `src/generation-workbench.js`
- Modify: `test/generation-api.test.js` or a focused generation prompt test file

- [ ] Add failing prompt test:
  - `buildGenerationMessages({ hotArticleFormula: { status: "ok", ... } })` includes `爆款公式来源`, formula, title/opening/content/tag guidance, high-frequency keywords, and reference notes.
  - the prompt says to borrow structure, not copy source text.
  - skipped/error formula does not add hot-article guidance.
- [ ] Run the focused test and confirm failure.
- [ ] Extend `buildGenerationMessages()` signature with `hotArticleFormula = null`.
- [ ] Add a compact prompt section only for `hotArticleFormula.status === "ok"`.
- [ ] Extend `generateNoteCandidates()` to accept and pass `hotArticleFormula`.
- [ ] Run the focused generation prompt test and confirm it passes.

### Task 4: Wire Formula Into `/api/generate-note`

**Files:**
- Modify: `src/server.js`
- Modify: `test/generation-api.test.js`

- [ ] Add failing API tests:
  - generation response includes `hotArticleFormula.status === "ok"` when hot-article lookup succeeds.
  - generation response includes `hotArticleFormula.status === "skipped"` when no keyword exists.
  - generation still returns candidates when hot-article lookup returns `error`.
  - generated prompt receives the formula in the generation call.
- [ ] Run the focused generation API tests and confirm failure.
- [ ] Import `fetchHotArticleFormula()` in `src/server.js`.
- [ ] Before `generateNoteCandidates()`, call `fetchHotArticleFormula({ brief, draft: payload?.draft })`.
- [ ] Pass the result into `generateNoteCandidates({ hotArticleFormula })`.
- [ ] Include `hotArticleFormula` in the `/api/generate-note` JSON response.
- [ ] Run `node --test test/generation-api.test.js` or the focused subset and confirm the new tests pass.

### Task 5: Render Formula In Generation Result

**Files:**
- Modify: `web/app.js`
- Modify: `web/analysis-review-view.js`
- Test: create `test/xhs-hot-articles-ui.test.js` or extend existing UI tests

- [ ] Add failing UI tests:
  - generation result rendering includes heading `爆款公式来源`.
  - formula summary and 2-3 reference notes render.
  - raw internal `items` array or 50-note list is not rendered.
  - error/skipped status renders a quiet unavailable message instead of breaking the result card.
- [ ] Run the focused UI test and confirm failure.
- [ ] Update generation result normalization/rendering to pass response-level `hotArticleFormula` into the selected display item or render context.
- [ ] Add a small helper such as `buildGenerationHotArticleFormulaMarkup(formula = {})`.
- [ ] Render links safely using existing escaping conventions.
- [ ] Run the focused UI test and confirm it passes.

### Task 6: Documentation And Focused Verification

**Files:**
- Modify: `README.md`
- Modify: `SYSTEM_FLOW.md`

- [ ] Update README `当前能力` and generation sections:
  - `生成新内容` can use recent Redfox hot-article patterns.
  - output can show `爆款公式来源`.
  - failure is non-blocking.
- [ ] Update SYSTEM_FLOW generation chain:
  - brief -> local context -> hot-article formula -> generation -> compliance repair.
- [ ] Run focused verification:
  - `node --test test/xhs-hot-articles.test.js`
  - focused generation prompt/API tests
  - focused UI test
- [ ] If a larger existing suite fails for unrelated provider-routing reasons, record it explicitly and do not mix that repair into this task unless it blocks the new behavior.

---

## Self-Review

- Spec coverage: backend fetch, summarization, prompt integration, API response, UI display, failure behavior, and docs are covered.
- Scope check: no new standalone page, no raw 50-note display, no forced user style-sample interruption.
- Naming consistency: the shared result field is `hotArticleFormula` across backend, prompt, API, and UI.
