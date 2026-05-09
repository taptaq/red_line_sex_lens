# Sample Library Record Ordering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the sample-library record preview and record-list modal both use the same publish-time-desc ordering.

**Architecture:** Keep filtering and ordering in one shared path so the outer preview, the full record-list modal, and any other list views consume the same sorted records. Sort by `publish.publishedAt` descending, then fall back to `updatedAt` / `createdAt` for records without a publish date.

**Tech Stack:** Vanilla JavaScript, Node test runner, existing frontend regression tests

---

### Task 1: Lock in publish-time-desc behavior with a failing regression test

**Files:**
- Modify: `test/success-generation-ui.test.js`
- Test: `test/success-generation-ui.test.js`

- [ ] **Step 1: Write the failing test**

```js
  assert.match(appJs, /function\s+sortSampleLibraryRecordsByPublishedAtDesc\s*\(/);

  const sortSampleLibraryRecordsByPublishedAtDesc = new Function(
    "getSampleRecordPublish",
    `${sortHelperSource}; return sortSampleLibraryRecordsByPublishedAtDesc;`
  )((item) => item.publish || {});

  const sortedItems = sortSampleLibraryRecordsByPublishedAtDesc([
    { id: "record-1", publish: { publishedAt: "2026-05-01" }, createdAt: "2026-05-01T09:00:00.000Z" },
    { id: "record-2", publish: { publishedAt: "2026-05-08" }, createdAt: "2026-05-08T09:00:00.000Z" },
    { id: "record-3", publish: { publishedAt: "" }, updatedAt: "2026-05-07T08:00:00.000Z", createdAt: "2026-05-07T08:00:00.000Z" },
    { id: "record-4", publish: { publishedAt: "2026-05-06" }, createdAt: "2026-05-06T09:00:00.000Z" }
  ]);

  assert.deepEqual(sortedItems.map((item) => item.id), ["record-2", "record-4", "record-3", "record-1"]);

  const previewItems = getSampleLibraryRecordPreviewItems(sortedItems);
  assert.deepEqual(previewItems.map((item) => item.id), ["record-2", "record-4", "record-3"]);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/success-generation-ui.test.js`
Expected: FAIL because the sort helper does not exist yet and preview logic still preserves selected records instead of strictly taking the first three sorted results.

- [ ] **Step 3: Write minimal implementation**

```js
function sortSampleLibraryRecordsByPublishedAtDesc(items = []) {
  return [...normalizedItems].sort((left, right) => rightSortTime - leftSortTime);
}

function filterSampleLibraryRecords(items = []) {
  return sortSampleLibraryRecordsByPublishedAtDesc(normalizedItems.filter(...));
}

function getSampleLibraryRecordPreviewItems(items = []) {
  return normalizedItems.slice(0, SAMPLE_LIBRARY_RECORD_PREVIEW_LIMIT);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/success-generation-ui.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/plans/2026-05-08-sample-library-record-ordering.md test/success-generation-ui.test.js web/app.js
git commit -m "feat: sort sample library records by publish time"
```
