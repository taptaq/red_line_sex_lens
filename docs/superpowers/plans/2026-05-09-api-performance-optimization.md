# API Performance Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve perceived and actual latency across bootstrap reads, high-frequency GET endpoints, write-after-refresh flows, and model-route preloads without weakening data consistency.

**Architecture:** Add frontend snapshot bootstrap plus independent refreshers in `web/app.js`, introduce a small runtime GET cache with TTL and in-flight dedupe on the server, move style-profile regeneration out of read endpoints into a background refresh queue, and replace broad `refreshAll()` calls with targeted refresh helpers.

**Tech Stack:** Vanilla JavaScript frontend, Node HTTP server, JSON-file-backed data store, Node test runner

## File Structure

- `web/app.js`
  - Add snapshot persistence helpers, bootstrap hydration, independent refresh orchestration, and narrower post-mutation refresh flows.
- `src/runtime-cache.js`
  - New focused helper for TTL caching, single-flight loading, and tag/key invalidation.
- `src/server.js`
  - Wrap high-frequency GET routes with the runtime cache, add style-profile background refresh scheduling, and invalidate cached reads after writes.
- `src/admin.js`
  - Keep `loadAdminData()` focused on assembling admin payloads without forcing style-profile refresh side effects.
- `test/success-generation-ui.test.js`
  - Lock the frontend snapshot/refresh orchestration contract.
- `test/runtime-cache.test.js`
  - Lock the generic runtime-cache behavior.
- `test/style-profile-api.test.js`
  - Lock the new “read fast, refresh style profile asynchronously” contract.
- `test/sample-library-api.test.js`
  - Lock write-response behavior when a reference-sample mutation queues style-profile refresh.

## Task 1: Add frontend bootstrap snapshots and independent refreshers

**Files:**
- Modify: `web/app.js`
- Modify: `test/success-generation-ui.test.js`

- [ ] **Step 1: Write the failing test**

Add source assertions for the new snapshot/bootstrap helpers and orchestration contract:

```js
assert.match(appJs, /const BOOTSTRAP_SNAPSHOT_KEYS = \{/);
assert.match(appJs, /function loadBootstrapSnapshotPart\s*\(/);
assert.match(appJs, /function persistBootstrapSnapshotPart\s*\(/);
assert.match(appJs, /function clearBootstrapSnapshotPart\s*\(/);
assert.match(appJs, /async function refreshSummaryState\s*\(/);
assert.match(appJs, /async function refreshAll\(\{ useSnapshot = true \} = \{\}\)\s*\{/);
assert.match(appJs, /loadBootstrapSnapshotPart\("summary"\)/);
assert.match(appJs, /loadBootstrapSnapshotPart\("adminData"\)/);
assert.match(appJs, /loadBootstrapSnapshotPart\("sampleLibraryRecords"\)/);
assert.match(appJs, /const refreshTasks = \[/);
assert.match(appJs, /refreshSummaryState\(\)/);
assert.match(appJs, /refreshAdminDataState\(\)/);
assert.match(appJs, /refreshSampleLibraryWorkspace\(\)/);
assert.match(appJs, /await Promise\.allSettled\(refreshTasks\)/);
```

Also add a small runtime test proving stale-free snapshot bootstrap for the sample library list:

```js
assert.equal(nodes["sample-library-list-count"].textContent, "加载中...");
assert.match(nodes["sample-library-record-list"].innerHTML, /加载中/);
assert.doesNotMatch(nodes["sample-library-record-list"].innerHTML, /当前没有样本记录/);
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
node --test test/success-generation-ui.test.js
```

Expected: FAIL because snapshot helpers and the new `refreshAll({ useSnapshot = true })` flow do not exist yet.

- [ ] **Step 3: Write minimal implementation**

In `web/app.js`, add:

```js
const BOOTSTRAP_SNAPSHOT_KEYS = {
  summary: "redline:bootstrap:summary",
  adminData: "redline:bootstrap:admin-data",
  sampleLibraryRecords: "redline:bootstrap:sample-library-records",
  collectionTypeOptions: "redline:bootstrap:collection-type-options",
  modelOptions: "redline:bootstrap:model-options",
  analyzeTagOptions: "redline:bootstrap:analyze-tag-options"
};
```

Implement small helpers:

```js
function loadBootstrapSnapshotPart(key, maxAgeMs) {
  const raw = localStorage.getItem(BOOTSTRAP_SNAPSHOT_KEYS[key]);

  if (!raw) return null;

  const parsed = JSON.parse(raw);
  if (!parsed?.savedAt || Date.now() - parsed.savedAt > maxAgeMs) {
    return null;
  }

  return parsed.payload ?? null;
}

function persistBootstrapSnapshotPart(key, payload) {
  localStorage.setItem(
    BOOTSTRAP_SNAPSHOT_KEYS[key],
    JSON.stringify({
      savedAt: Date.now(),
      payload
    })
  );
}

function clearBootstrapSnapshotPart(key) {
  localStorage.removeItem(BOOTSTRAP_SNAPSHOT_KEYS[key]);
}

async function refreshSummaryState() {
  const payload = await apiJson("/api/summary");
  appState.summaryData = payload && typeof payload === "object" ? payload : {};
  persistBootstrapSnapshotPart("summary", appState.summaryData);
  setSummaryLoadingState("idle");
  renderSummary(appState.summaryData);
}
```

Refactor `refreshAll()` so it:

```js
async function refreshAll({ useSnapshot = true } = {}) {
  if (useSnapshot) {
    hydrateBootstrapSnapshot();
  }

  const refreshTasks = [
    refreshSummaryState(),
    refreshAdminDataState(),
    refreshSampleLibraryWorkspace(),
    loadCollectionTypeOptions(),
    loadModelSelectionOptions(),
    loadAnalyzeTagOptions()
  ];

  await Promise.allSettled(refreshTasks);
}
```

Persist each successful response back into the matching snapshot key.

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
node --test test/success-generation-ui.test.js
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add web/app.js test/success-generation-ui.test.js
git commit -m "feat: add bootstrap snapshots for fast refresh"
```

## Task 2: Add runtime GET cache with TTL and invalidation

**Files:**
- Add: `src/runtime-cache.js`
- Modify: `src/server.js`
- Add: `test/runtime-cache.test.js`

- [ ] **Step 1: Write the failing test**

Create `test/runtime-cache.test.js` with focused cache semantics:

```js
test("runtime cache reuses in-flight loads and respects ttl invalidation", async () => {
  const cache = createRuntimeCache();
  let calls = 0;

  const loader = async () => {
    calls += 1;
    return { value: calls };
  };

  const [first, second] = await Promise.all([
    cache.getOrLoad("summary", loader, { ttlMs: 1000, tags: ["summary"] }),
    cache.getOrLoad("summary", loader, { ttlMs: 1000, tags: ["summary"] })
  ]);

  assert.equal(calls, 1);
  assert.deepEqual(first, second);

  cache.invalidateTag("summary");
  const third = await cache.getOrLoad("summary", loader, { ttlMs: 1000, tags: ["summary"] });
  assert.equal(calls, 2);
  assert.equal(third.value, 2);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
node --test test/runtime-cache.test.js
```

Expected: FAIL because `createRuntimeCache()` does not exist yet.

- [ ] **Step 3: Write minimal implementation**

Add `src/runtime-cache.js`:

```js
export function createRuntimeCache() {
  const values = new Map();
  const inflight = new Map();
  const tagIndex = new Map();

  return {
    async getOrLoad(key, loader, { ttlMs = 0, tags = [] } = {}) {
      const current = values.get(key);

      if (current && current.expiresAt > Date.now()) {
        return current.value;
      }

      if (inflight.has(key)) {
        return inflight.get(key);
      }

      const promise = Promise.resolve()
        .then(loader)
        .then((value) => {
          values.set(key, {
            value,
            expiresAt: Date.now() + ttlMs
          });

          tags.forEach((tag) => {
            const keys = tagIndex.get(tag) || new Set();
            keys.add(key);
            tagIndex.set(tag, keys);
          });

          inflight.delete(key);
          return value;
        })
        .catch((error) => {
          inflight.delete(key);
          throw error;
        });

      inflight.set(key, promise);
      return promise;
    },
    invalidateKey(key) {
      values.delete(key);
      inflight.delete(key);
    },
    invalidateTag(tag) {
      const keys = tagIndex.get(tag) || new Set();
      keys.forEach((key) => {
        values.delete(key);
        inflight.delete(key);
      });
      tagIndex.delete(tag);
    },
    clear() {
      values.clear();
      inflight.clear();
      tagIndex.clear();
    }
  };
}
```

Wire high-frequency GET routes in `src/server.js`:

```js
const readCache = createRuntimeCache();

function invalidateReadCaches(tags = []) {
  tags.forEach((tag) => readCache.invalidateTag(tag));
}
```

Wrap:

```js
readCache.getOrLoad("summary", loadSummary, { ttlMs: 5000, tags: ["summary"] });
readCache.getOrLoad("admin-data", buildAdminDataView, { ttlMs: 10000, tags: ["admin-data"] });
readCache.getOrLoad("sample-library", loadNoteRecords, { ttlMs: 10000, tags: ["sample-library"] });
```

And invalidate after writes:

```js
invalidateReadCaches(["summary", "admin-data", "sample-library"]);
```

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
node --test test/runtime-cache.test.js test/sample-library-api.test.js test/style-profile-api.test.js
```

Expected: PASS, or FAIL only on style-profile contract changes to be addressed in Task 3.

- [ ] **Step 5: Commit**

```bash
git add src/runtime-cache.js src/server.js test/runtime-cache.test.js
git commit -m "feat: cache high-frequency api reads"
```

## Task 3: Remove style-profile regeneration from GET reads and move it to background refresh

**Files:**
- Modify: `src/server.js`
- Modify: `test/style-profile-api.test.js`
- Modify: `test/sample-library-api.test.js`

- [ ] **Step 1: Write the failing test**

Update style-profile route tests to lock the new contract:

```js
assert.equal(listed.status, 200);
assert.equal(listed.body.styleProfile.current.topic, "旧画像");
assert.deepEqual(listed.body.styleProfile.current.sourceSampleIds, ["note-reference-a", "note-reference-b"]);
assert.equal(listed.body.styleProfileRefreshQueued, undefined);
```

Update sample-library mutation tests so reference-sample writes no longer block on regenerated profile:

```js
assert.equal(created.status, 200);
assert.equal(created.ok, true);
assert.equal(created.styleProfileRefreshQueued, true);
assert.ok(created.styleProfile.current);
```

After delete:

```js
assert.equal(deleted.status, 200);
assert.equal(deleted.ok, true);
assert.equal(deleted.styleProfileRefreshQueued, true);
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
node --test test/sample-library-api.test.js test/style-profile-api.test.js
```

Expected: FAIL because GET routes still refresh style profile synchronously and sample-library writes still await the latest profile view.

- [ ] **Step 3: Write minimal implementation**

In `src/server.js`, split the current behavior:

```js
async function buildAdminDataView() {
  const data = await loadAdminData();
  const styleProfile = await loadCurrentStyleProfileView();
  return { ...data, styleProfile };
}
```

Replace:

```js
const [styleProfile, data] = await Promise.all([refreshAutoStyleProfile(), loadAdminData()]);
```

with:

```js
const data = await readCache.getOrLoad("admin-data", buildAdminDataView, {
  ttlMs: 10000,
  tags: ["admin-data"]
});
```

Add a single-flight background refresher:

```js
let styleProfileRefreshPromise = null;

function scheduleStyleProfileRefresh(reason = "") {
  if (!styleProfileRefreshPromise) {
    styleProfileRefreshPromise = (async () => {
      try {
        await refreshAutoStyleProfile();
        invalidateReadCaches(["admin-data"]);
      } finally {
        styleProfileRefreshPromise = null;
      }
    })();
  }

  return styleProfileRefreshPromise;
}
```

When sample-library writes affect reference samples:

```js
const styleProfile = await loadCurrentStyleProfileView();
scheduleStyleProfileRefresh("sample-library-reference-mutation");
return sendJson(response, 200, {
  ok: true,
  item,
  items,
  styleProfile,
  styleProfileRefreshQueued: true
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
node --test test/sample-library-api.test.js test/style-profile-api.test.js
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/server.js test/sample-library-api.test.js test/style-profile-api.test.js
git commit -m "feat: move style profile refresh out of read path"
```

## Task 4: Replace broad write-after-refresh flows with targeted updates and trim model-route waits

**Files:**
- Modify: `web/app.js`
- Modify: `src/server.js`
- Modify: `test/success-generation-ui.test.js`

- [ ] **Step 1: Write the failing test**

Lock the removal of broad refreshes from high-frequency mutations:

```js
assert.doesNotMatch(appJs, /await refreshAll\(\);[\s\S]*syncStyleProfileStateFromPayload\(response\)/);
assert.match(appJs, /await Promise\.allSettled\(\[refreshSummaryState\(\), refreshAdminDataState\(\)\]\)/);
assert.match(appJs, /renderSampleLibraryWorkspace\(\)/);
assert.match(appJs, /syncStyleProfileStateFromPayload\(response\)/);
```

Also lock server-side model preloading parallelism:

```js
assert.match(serverJs, /const \[beforeAnalysis, rewriteMemoryContext, innerSpaceTermsRaw\] = await Promise\.all\(\[/);
assert.match(serverJs, /const \[profileState, qualifiedReferenceSamples, innerSpaceTermsRaw, memoryContext\] = await Promise\.all\(\[/);
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
node --test test/success-generation-ui.test.js
```

Expected: FAIL because write handlers still call `refreshAll()` too broadly and model routes still contain avoidable sequential waits.

- [ ] **Step 3: Write minimal implementation**

In `web/app.js`, replace broad post-write refreshes with narrower helpers:

```js
async function refreshSupportWorkspaceState() {
  await Promise.allSettled([refreshSummaryState(), refreshAdminDataState()]);
}
```

Sample-library mutations should:

```js
appState.sampleLibraryRecords = Array.isArray(response.items) ? response.items : appState.sampleLibraryRecords;
renderSampleLibraryWorkspace();
syncStyleProfileStateFromPayload(response);
await refreshSummaryState();
```

Feedback / false-positive / review-queue mutations should use:

```js
await Promise.allSettled([refreshSummaryState(), refreshAdminDataState()]);
```

Lexicon / inner-space mutations should use:

```js
await refreshAdminDataState();
renderLexiconWorkspaceModal();
```

In `src/server.js`, parallelize the model-route preloads:

```js
const [beforeAnalysis, rewriteMemoryContext, innerSpaceTermsRaw] = await Promise.all([
  buildMergedAnalysis(payload, { modelSelection: modelSelection.semantic }),
  retrieveRewriteMemoryContext(payload),
  loadInnerSpaceTerms()
]);
```

```js
const [profileState, qualifiedReferenceSamples, innerSpaceTermsRaw, memoryContext] = await Promise.all([
  loadStyleProfile(),
  loadQualifiedReferenceSamples(),
  loadInnerSpaceTerms(),
  retrieveGenerationMemoryContext({
    topic: brief.topic,
    collectionType,
    constraints: brief.constraints,
    tags: Array.isArray(payload?.draft?.tags) ? payload.draft.tags : []
  })
]);
```

- [ ] **Step 4: Run focused verification**

Run:

```bash
node --test test/success-generation-ui.test.js test/sample-library-api.test.js test/style-profile-api.test.js test/runtime-cache.test.js
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add web/app.js src/server.js test/success-generation-ui.test.js
git commit -m "feat: narrow api refresh paths and preload model context"
```

## Task 5: Run end-to-end verification and document any residual risk

**Files:**
- Modify: `docs/superpowers/specs/2026-05-09-api-performance-optimization-design.md` (only if behavior changed from spec)
- Modify: `docs/superpowers/plans/2026-05-09-api-performance-optimization.md` (checkbox updates only if tracked manually)

- [ ] **Step 1: Run the full focused regression suite**

Run:

```bash
node --test \
  test/success-generation-ui.test.js \
  test/false-positive-admin.test.js \
  test/sample-library-api.test.js \
  test/style-profile-api.test.js \
  test/runtime-cache.test.js
```

Expected: PASS

- [ ] **Step 2: Manually verify the key UX path**

Run the app and verify:

1. Reload the page and confirm snapshot content appears before network completion.
2. Confirm the header summary, learning-sample list, and maintenance blocks refresh independently.
3. Create or edit a reference sample and confirm the UI updates immediately without a full-page refetch.
4. Confirm style profile remains viewable immediately and updates after background refresh.

- [ ] **Step 3: Commit final polish if needed**

```bash
git add docs/superpowers/specs/2026-05-09-api-performance-optimization-design.md docs/superpowers/plans/2026-05-09-api-performance-optimization.md
git commit -m "docs: capture api performance optimization plan"
```
