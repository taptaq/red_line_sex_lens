# Admin Data Loading Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add consistent loading behavior to all UI regions backed by `GET /api/admin/data`, with first-load placeholders and non-blocking refresh states.

**Architecture:** Introduce one shared `adminDataLoading` state in `appState`, drive loading transitions from `refreshAdminDataState()`, and let a small set of render helpers decide between placeholder, stale-content loading, normal content, and empty state. Keep the implementation centered in `web/app.js` and shared styles in `web/styles.css`.

**Tech Stack:** Vanilla JavaScript, static HTML, CSS, Node test runner

---

### Task 1: Lock the loading contract with failing frontend tests

**Files:**
- Modify: `test/success-generation-ui.test.js`
- Modify: `test/false-positive-admin.test.js`
- Test: `test/success-generation-ui.test.js`

- [ ] **Step 1: Write the failing test**

Add assertions covering:

```js
assert.match(appJs, /adminDataLoading:\s*\{/);
assert.match(appJs, /function\s+setAdminDataLoadingState\s*\(/);
assert.match(appJs, /function\s+renderAdminDataLoadingPlaceholders\s*\(/);
assert.match(appJs, /function\s+syncAdminDataLoadingUI\s*\(/);
assert.match(appJs, /await refreshAdminDataState\(\)/);
assert.match(appJs, /renderAdminDataLoadingPlaceholders\(\)/);
assert.match(appJs, /setAdminDataLoadingState\("initial"\)/);
assert.match(appJs, /setAdminDataLoadingState\("refresh"\)/);
assert.match(appJs, /setAdminDataLoadingState\("idle"\)/);
assert.match(appJs, /加载中\.\.\./);
```

And in the false-positive runtime test, verify loading does not render the empty-state copy:

```js
appState.adminDataLoading = { phase: "initial", error: "" };
renderFalsePositiveLog([]);
assert.equal(nodes["false-positive-summary"].textContent, "加载中...");
assert.match(nodes["false-positive-log-list"].innerHTML, /加载中/);
assert.equal(nodes["false-positive-log-list"].hidden, false);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/success-generation-ui.test.js test/false-positive-admin.test.js`
Expected: FAIL because `adminDataLoading` state and loading-specific render behavior do not exist yet.

- [ ] **Step 3: Write minimal implementation**

Implement:

```js
appState.adminDataLoading = { phase: "initial", error: "" };

function setAdminDataLoadingState(phase = "idle", error = "") { ... }
function syncAdminDataLoadingUI() { ... }
function renderAdminDataLoadingPlaceholders() { ... }
```

Wire `refreshAdminDataState()` to:

```js
const phase = hasExistingAdminData ? "refresh" : "initial";
setAdminDataLoadingState(phase);
...
setAdminDataLoadingState("idle");
```

Update `renderQueue()`, `renderLexiconList()`, `renderInnerSpaceTermsList()`, `renderFeedbackLog()`, and `renderFalsePositiveLog()` so `initial` loading shows placeholders instead of empty-state text.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/success-generation-ui.test.js test/false-positive-admin.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/plans/2026-05-09-admin-data-loading.md test/success-generation-ui.test.js test/false-positive-admin.test.js web/app.js web/styles.css
git commit -m "feat: add admin data loading states"
```
