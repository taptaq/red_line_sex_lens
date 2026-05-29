# XHS Account Diagnosis Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a minimal Redfox-backed Xiaohongshu account diagnosis workflow that fetches account data, merges similar-account recommendations, and renders a simple diagnosis report in the existing dashboard.

**Architecture:** Reuse the repo's current account-planner shape: add one server-side service module to normalize Redfox responses into a stable JSON contract, expose one API endpoint from `src/server.js`, and render a dedicated dashboard panel in the existing vanilla JS frontend. Keep v1 scoped to single-account analysis only, without subscriptions, sync retries, or HTML export.

**Tech Stack:** Node.js ESM, built-in `node:test`, existing `src/server.js` route layer, vanilla `web/app.js` + `web/index.html` + `web/styles.css`, built-in `fetch`.

---

### Task 1: Define the service contract with tests

**Files:**
- Create: `test/xhs-account-diagnosis.test.js`
- Create: `src/xhs-account-diagnosis.js`

- [ ] **Step 1: Write the failing test**

```js
test("summarizeXhsAccountDiagnosis normalizes Redfox account and similar-account payloads", async () => {
  const { summarizeXhsAccountDiagnosis } = await import("../src/xhs-account-diagnosis.js");
  const result = await summarizeXhsAccountDiagnosis({
    redId: "26112666886",
    queryAccount: async () => ({ items: [{ nickname: "测试号", redId: "26112666886", fans: 12000, desc: "简介", works: [] }] }),
    querySimilar: async () => ({
      peerAccounts: [{ redId: "p1", nickname: "同阶号", fans: 10000, interactiveCountThirty: 3000 }],
      benchmarkAccounts: [{ redId: "b1", nickname: "标杆号", fans: 45000, interactiveCountThirty: 9000 }]
    })
  });

  assert.equal(result.account.nickname, "测试号");
  assert.equal(result.diagnosis.score > 0, true);
  assert.equal(result.similarAccounts.peer.length, 1);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/xhs-account-diagnosis.test.js`
Expected: FAIL because `src/xhs-account-diagnosis.js` does not exist yet.

- [ ] **Step 3: Write minimal implementation**

Create `src/xhs-account-diagnosis.js` with helpers that:
- query account data
- query similar accounts
- normalize account metrics, diagnosis summary, and similar-account groups

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/xhs-account-diagnosis.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add test/xhs-account-diagnosis.test.js src/xhs-account-diagnosis.js
git commit -m "feat: add xhs account diagnosis service"
```

### Task 2: Expose the API route with tests

**Files:**
- Modify: `src/server.js`
- Modify: `test/generation-api.test.js`

- [ ] **Step 1: Write the failing test**

Add a route test that POSTs:

```json
{ "redId": "26112666886", "mockXhsAccountDiagnosis": { ... } }
```

and expects:
- `ok: true`
- `account.nickname`
- `diagnosis.summary`
- `similarAccounts.peer`

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/generation-api.test.js`
Expected: FAIL because the route does not exist.

- [ ] **Step 3: Write minimal implementation**

Add `/api/xhs/account-diagnosis` to `src/server.js`:
- validate `redId`
- accept `mockXhsAccountDiagnosis` for tests
- otherwise call `summarizeXhsAccountDiagnosis`

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/generation-api.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/server.js test/generation-api.test.js
git commit -m "feat: add xhs account diagnosis api"
```

### Task 3: Render the dashboard panel with tests

**Files:**
- Create: `web/xhs-account-diagnosis-view.js`
- Modify: `web/index.html`
- Modify: `web/app.js`
- Modify: `web/styles.css`
- Modify: `test/account-planner-ui.test.js`

- [ ] **Step 1: Write the failing test**

Add UI assertions that confirm:
- the panel exists in `web/index.html`
- `web/app.js` wires a run button and result container
- rendered HTML includes account overview, diagnosis summary, and similar accounts

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/account-planner-ui.test.js`
Expected: FAIL because the panel/view wiring is missing.

- [ ] **Step 3: Write minimal implementation**

Implement:
- a compact `web/xhs-account-diagnosis-view.js`
- a new panel next to the planner section
- client state + fetch logic in `web/app.js`
- scoped styles in `web/styles.css`

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/account-planner-ui.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add web/xhs-account-diagnosis-view.js web/index.html web/app.js web/styles.css test/account-planner-ui.test.js
git commit -m "feat: add xhs account diagnosis dashboard panel"
```

### Task 4: Run focused verification

**Files:**
- Modify: none

- [ ] **Step 1: Run focused test suite**

Run:

```bash
node --test test/xhs-account-diagnosis.test.js test/generation-api.test.js test/account-planner-ui.test.js
```

Expected: PASS with 0 failures.

- [ ] **Step 2: Smoke-check for obvious app wiring regressions**

Run:

```bash
node --test test/humanizer-score.test.js
```

Expected: PASS with 0 failures.

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/plans/2026-05-29-xhs-account-diagnosis.md
git commit -m "docs: add xhs account diagnosis implementation plan"
```
