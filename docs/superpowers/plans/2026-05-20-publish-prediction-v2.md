# Publish Prediction V2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the existing publish-prep autofill into an evidence-backed prediction flow that uses historical records, sample-library references, and explanation panels to make the result feel meaningfully different across records.

**Architecture:** Keep the prediction logic close to the current sample-library calibration flow so the UI can stay lightweight and the implementation can reuse existing record snapshots, analysis state, and modal plumbing. The browser-side calibration helper will compute a richer prediction plus evidence fields from historical records already loaded into `appState`, while the record storage layer will preserve the new evidence payload without breaking old records. The modal will keep the existing prefill behavior, but now it will show the evidence behind the prediction so users can understand why a record was judged a certain way.

**Tech Stack:** Vanilla JavaScript frontend, Node.js data-store and note-record compatibility helpers, existing `node:test` suite, no new external services

---

## File Structure

- Modify: `web/sample-library-calibration.js`
  - Extend the calibration prediction helper to compute evidence-backed output from historical records.
  - Keep the existing prefill source resolution API stable.
- Modify: `web/app.js`
  - Render the evidence panel in the publish-prep modal.
  - Fetch or derive the evidence payload for the active record and keep the prefill flow conservative.
- Modify: `web/index.html`
  - Add the evidence panel container in the calibration modal layout if the current markup does not already have a stable target.
- Modify: `web/styles.css`
  - Add the evidence panel layout and lighter explanatory styles.
- Modify: `src/note-records.js`
  - Preserve evidence fields when calibrations are normalized and merged.
- Modify: `src/sample-library.js`
  - Preserve evidence fields when patching sample-library records through the API.
- Modify: `src/data-store.js`
  - Ensure note-record save/load logic keeps the new calibration evidence fields backward-compatible.
- Modify: `test/sample-library-calibration-prefill.test.js`
  - Lock the prediction helper behavior and evidence-field expectations.
- Modify: `test/sample-library-api.test.js`
  - Verify API round-trips still preserve evidence fields.
- Modify: `test/success-generation-ui.test.js`
  - Lock the modal evidence panel and prefill interaction.
- Modify: `test/note-records-store.test.js`
  - Verify merge/normalize behavior keeps evidence data intact.

## Task 1: Extend calibration prediction with evidence-backed output

**Files:**
- Modify: `web/sample-library-calibration.js`
- Test: `test/sample-library-calibration-prefill.test.js`

- [ ] **Step 1: Write the failing tests**

Add tests that prove the browser-side calibration helper now returns both the existing prediction fields and evidence fields.

```js
test("buildSampleLibraryCalibrationPrediction surfaces matched evidence samples and evidence summary", () => {
  const source = resolveSampleLibraryCalibrationPrefillSource({
    latestAnalyzePayload: {
      title: "社死焦虑标题",
      body: "正文里提到了隐私物品和羞耻感",
      coverText: "封面",
      tags: ["身体探索", "情绪反应"]
    },
    latestAnalysis: {
      finalVerdict: "manual_review",
      score: 68
    },
    latestRewrite: null,
    record: null
  });

  const prediction = buildSampleLibraryCalibrationPrediction(source, {
    semantic: "glm-5.1",
    rewrite: "kimi-k2.6"
  });

  assert.ok(Array.isArray(prediction.evidenceSamples));
  assert.ok(Array.isArray(prediction.evidenceSignals));
  assert.equal(typeof prediction.evidenceSummary, "string");
  assert.match(prediction.evidenceSummary, /历史样本|相似|证据/i);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
node --test test/sample-library-calibration-prefill.test.js
```

Expected: fail because `evidenceSamples`, `evidenceSignals`, and `evidenceSummary` are not yet returned.

- [ ] **Step 3: Implement the minimal helper changes**

Update `web/sample-library-calibration.js` so the prediction helper returns a shape like this:

```js
{
  predictedStatus,
  predictedRiskLevel,
  predictedPerformanceTier,
  confidence,
  reason,
  evidenceSamples: [
    { id: "record-1", title: "..." }
  ],
  evidenceSignals: [
    "标题短语命中",
    "标签与历史记录相同"
  ],
  evidenceSummary: "这条记录和 2 条高表现样本的结构相近，因此更偏向 ..."
}
```

Keep the existing prediction fields and model field untouched so current callers stay compatible.

- [ ] **Step 4: Run the test to verify it passes**

Run:

```bash
node --test test/sample-library-calibration-prefill.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/sample-library-calibration.js test/sample-library-calibration-prefill.test.js
git commit -m "feat: add evidence-backed publish prediction helper"
```

## Task 2: Preserve prediction evidence in stored records

**Files:**
- Modify: `src/note-records.js`
- Modify: `src/sample-library.js`
- Modify: `src/data-store.js`
- Test: `test/note-records-store.test.js`
- Test: `test/sample-library-api.test.js`

- [ ] **Step 1: Write the failing tests**

Add a record-merge test that includes calibration evidence and proves it survives normalization and patching.

```js
test("note records normalize and merge prediction evidence details", () => {
  const merged = mergeNoteRecords(
    buildNoteRecord({
      note: { title: "预测证据标题", body: "正文" },
      calibration: {
        prediction: {
          predictedStatus: "limited",
          predictedRiskLevel: "medium",
          predictedPerformanceTier: "low",
          confidence: 68,
          reason: "标题结构接近历史高风险样本",
          evidenceSamples: [{ id: "sample-1", title: "历史样本 1" }],
          evidenceSignals: ["标题短语命中"],
          evidenceSummary: "与 1 条历史样本相似"
        }
      }
    }),
    buildNoteRecord({
      note: { title: "预测证据标题", body: "正文" },
      calibration: {
        prediction: {
          evidenceSamples: [{ id: "sample-2", title: "历史样本 2" }],
          evidenceSignals: ["标签重合"]
        }
      }
    })
  );

  assert.equal(merged.calibration.prediction.predictedStatus, "limited");
  assert.deepEqual(merged.calibration.prediction.evidenceSamples.map((item) => item.id), ["sample-2"]);
  assert.deepEqual(merged.calibration.prediction.evidenceSignals, ["标签重合"]);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run:

```bash
node --test test/note-records-store.test.js
node --test test/sample-library-api.test.js
```

Expected: the new evidence assertions fail because evidence fields are currently dropped during normalization/patching.

- [ ] **Step 3: Implement the minimal record compatibility changes**

Update normalization/merge logic so calibration predictions preserve:

- `evidenceSamples`
- `evidenceSignals`
- `evidenceSummary`

Keep the stored shape backward-compatible so older records without evidence still load cleanly.

- [ ] **Step 4: Run the tests to verify they pass**

Run:

```bash
node --test test/note-records-store.test.js
node --test test/sample-library-api.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/note-records.js src/sample-library.js src/data-store.js test/note-records-store.test.js test/sample-library-api.test.js
git commit -m "feat: preserve publish prediction evidence in records"
```

## Task 3: Render the evidence panel in the calibration modal

**Files:**
- Modify: `web/index.html`
- Modify: `web/app.js`
- Modify: `web/styles.css`
- Test: `test/success-generation-ui.test.js`

- [ ] **Step 1: Write the failing UI test**

Add a test that proves the calibration modal now renders a visible evidence panel with matched samples and a short explanation.

```js
test("sample library calibration modal renders prediction evidence and matched samples", async () => {
  const evidenceMarkup = renderSampleLibraryCalibrationEvidence({
    evidenceSamples: [
      { id: "record-1", title: "历史样本 1" }
    ],
    evidenceSignals: ["标题短语命中", "标签重合"],
    evidenceSummary: "这条记录与 1 条历史样本的结构高度相似。"
  });

  assert.match(evidenceMarkup, /历史样本 1/);
  assert.match(evidenceMarkup, /标题短语命中/);
  assert.match(evidenceMarkup, /结构高度相似/);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
node --test test/success-generation-ui.test.js
```

Expected: fail because the evidence panel helper / markup does not exist yet.

- [ ] **Step 3: Implement the minimal UI changes**

Add a compact evidence panel to the calibration modal:

- matched sample list
- evidence signals
- evidence summary
- confidence note

Implement the panel with a focused helper such as:

```js
function buildSampleLibraryCalibrationEvidenceMarkup(evidence = {}) {
  const samples = Array.isArray(evidence.evidenceSamples) ? evidence.evidenceSamples : [];
  const signals = Array.isArray(evidence.evidenceSignals) ? evidence.evidenceSignals : [];
  const summary = String(evidence.evidenceSummary || "").trim();

  return `
    <section class="sample-library-calibration-evidence">
      <strong>预判依据</strong>
      <p>${escapeHtml(summary || "暂无足够证据")}</p>
      <ul>
        ${samples.map((item) => `<li>${escapeHtml(item.title || item.id || "未命名样本")}</li>`).join("")}
      </ul>
      <div class="meta-row">
        ${signals.map((signal) => `<span class="meta-pill">${escapeHtml(signal)}</span>`).join("")}
      </div>
    </section>
  `;
}
```

The panel should be calm and readable, not dashboard-heavy.

- [ ] **Step 4: Run the test to verify it passes**

Run:

```bash
node --test test/success-generation-ui.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/index.html web/app.js web/styles.css test/success-generation-ui.test.js
git commit -m "feat: show evidence behind publish prediction"
```

## Task 4: Wire the end-to-end publish prediction flow

**Files:**
- Modify: `web/app.js`
- Modify: `web/sample-library-calibration.js`
- Test: `test/sample-library-calibration-prefill.test.js`
- Test: `test/success-generation-ui.test.js`

- [ ] **Step 1: Write the failing integration-style test**

Add a test that proves:

- the prefill still only fills empty fields
- the evidence panel updates from the same prediction source
- the user can see both the prediction and why it was made

```js
test("publish prefill keeps fields conservative and shows the same evidence source", async () => {
  const source = resolveSampleLibraryCalibrationPrefillSource({
    latestAnalyzePayload: { title: "标题", body: "正文", coverText: "封面" },
    latestAnalysis: { finalVerdict: "observe", score: 22 },
    latestRewrite: null,
    record: null
  });

  const prediction = buildSampleLibraryCalibrationPrediction(source, {
    semantic: "glm-5.1",
    rewrite: "kimi-k2.6"
  });

  assert.ok(prediction.evidenceSummary.length > 0);
  assert.ok(prediction.reason.length > 0);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run:

```bash
node --test test/sample-library-calibration-prefill.test.js
node --test test/success-generation-ui.test.js
```

Expected: fail until the UI wiring and helper outputs are fully aligned.

- [ ] **Step 3: Implement the wiring**

Make the modal use the same prediction source for:

- prefill fields
- evidence panel rendering
- success message

Keep the user-facing behavior conservative:

- do not overwrite already-filled fields
- append only where that is already the existing pattern
- keep the current modal flow unchanged otherwise

Keep the evidence display tied to the same `buildSampleLibraryCalibrationPrediction(...)` source object so the number the user sees and the explanation they read always come from the same payload.

- [ ] **Step 4: Run the tests to verify they pass**

Run:

```bash
node --test test/sample-library-calibration-prefill.test.js
node --test test/success-generation-ui.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/app.js web/sample-library-calibration.js test/sample-library-calibration-prefill.test.js test/success-generation-ui.test.js
git commit -m "feat: complete publish prediction v2 flow"
```

## Self-Review

- Spec coverage:
  - historical sample layer: covered in Tasks 1 and 2
  - prediction layer: covered in Tasks 1 and 4
  - evidence layer: covered in Tasks 1, 2, and 3
  - conservative prefill behavior: covered in Task 4
  - backward-compatible storage: covered in Task 2

- Placeholder scan:
  - no TBD / TODO / implement later markers
  - each test step names concrete files and commands
  - each implementation step names actual objects and fields

- Type consistency:
  - prediction fields stay consistent with the current calibration shape
  - new evidence fields are named the same across tests, storage, and UI
  - the plan keeps the modal source-of-truth aligned between helper and renderer
