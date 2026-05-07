# 学习样本三分区弹窗工作台 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在学习样本页面新增一个独立的大弹窗工作台，展示 `参考样本池 / 普通样本池 / 反例样本池` 三个分区，并支持轻量迁移操作与“回到原记录”联动。

**Architecture:** 保留现有学习样本主工作区作为单条记录编辑入口，不把三分区塞进右侧详情区。新增一套前端运行时分类 helper 和一个独立的样本池 modal；modal 内只保留一级切换、池头说明、样本卡片列表和轻操作，小型二次确认仍复用现有单动作 modal 机制。

**Tech Stack:** Node.js、原生前端 `web/app.js` / `web/index.html` / `web/styles.css`、原生测试 `node:test`。

---

### Task 1: 先补三分区弹窗的失败测试

**Files:**
- Modify: `test/success-generation-ui.test.js`
- Modify: `test/rewrite-panel-behavior.test.js`

- [ ] **Step 1: 在学习样本 UI 测试里增加样本池入口与弹窗骨架断言**

```js
assert.match(sampleLibraryPaneHtml, /id="sample-library-pools-button"/);
assert.match(indexHtml, /id="sample-library-pools-modal"/);
assert.match(indexHtml, /data-sample-pool-tab="reference"/);
assert.match(indexHtml, /data-sample-pool-tab="regular"/);
assert.match(indexHtml, /data-sample-pool-tab="negative"/);
```

- [ ] **Step 2: 在同一测试里增加“不再把三分区嵌进详情区”的约束**

```js
assert.doesNotMatch(sampleLibraryPaneHtml, /id="sample-library-reference-pool-section"/);
assert.doesNotMatch(sampleLibraryPaneHtml, /id="sample-library-regular-pool-section"/);
assert.doesNotMatch(sampleLibraryPaneHtml, /id="sample-library-negative-pool-section"/);
assert.match(appJs, /sampleLibraryPoolsModal/);
assert.match(appJs, /function classifySampleLibraryPool/);
assert.match(appJs, /function renderSampleLibraryPoolsModal/);
```

- [ ] **Step 3: 在分析面板测试里增加“参考样本提示仍保留”的回归断言**

```js
assert.match(renderAnalysisSource, /参考样本提示/);
assert.match(renderAnalysisSource, /referenceSampleHints/);
```

- [ ] **Step 4: 运行测试确认红灯**

Run: `node --test test/success-generation-ui.test.js test/rewrite-panel-behavior.test.js`
Expected: FAIL，当前还没有样本池大弹窗入口、三分区 tabs 和对应 helper。

- [ ] **Step 5: Commit**

```bash
git add test/success-generation-ui.test.js test/rewrite-panel-behavior.test.js
git commit -m "test: cover sample pool modal workspace"
```

### Task 2: 抽出样本池分类与文案 helper

**Files:**
- Modify: `web/app.js`

- [ ] **Step 1: 新增样本池分类与说明函数**

```js
function classifySampleLibraryPool(record = {}) {
  const reference = getSampleRecordReference(record);
  const publish = getSampleRecordPublish(record);
  const sampleType = String(record?.sampleType || "").trim();

  if (["limited", "violation"].includes(publish.status) || ["false_positive", "missed_violation"].includes(sampleType)) {
    return "negative";
  }

  if (reference.enabled && isQualifiedReferenceCandidate(record)) {
    return "reference";
  }

  return "regular";
}

function getSamplePoolWhyLabel(record = {}) {
  // 返回“为什么在这里”的一句话
}
```

- [ ] **Step 2: 为参考样本池复用已有运行时口径**

```js
function isQualifiedReferenceCandidate(record = {}) {
  const publish = getSampleRecordPublish(record);
  return record?.reference?.enabled === true && meetsReferenceSampleThreshold(publish.metrics) && isPositiveReferenceStatus(publish.status);
}
```

- [ ] **Step 3: 新增弹窗顶部统计聚合 helper**

```js
function buildSamplePoolSummary(records = []) {
  return {
    reference: records.filter((item) => classifySampleLibraryPool(item) === "reference").length,
    regular: records.filter((item) => classifySampleLibraryPool(item) === "regular").length,
    negative: records.filter((item) => classifySampleLibraryPool(item) === "negative").length
  };
}
```

- [ ] **Step 4: 运行 UI 测试，确认仍然因为缺 modal 骨架而失败**

Run: `node --test test/success-generation-ui.test.js`
Expected: FAIL，但与分类 helper 相关的源码断言开始通过。

- [ ] **Step 5: Commit**

```bash
git add web/app.js
git commit -m "feat: add sample pool classification helpers"
```

### Task 3: 加样本池大弹窗的 HTML 骨架和样式

**Files:**
- Modify: `web/index.html`
- Modify: `web/styles.css`

- [ ] **Step 1: 在学习样本工具栏加入入口按钮**

```html
<button
  type="button"
  class="button button-ghost"
  id="sample-library-pools-button"
  aria-controls="sample-library-pools-modal"
  aria-expanded="false"
>
  查看样本池
</button>
```

- [ ] **Step 2: 在页面底部新增独立 modal 骨架**

```html
<div id="sample-library-pools-modal" class="sample-library-pools-modal" hidden>
  <button type="button" class="sample-library-pools-modal-overlay" data-action="close-sample-library-pools-modal" aria-label="关闭样本池弹窗"></button>
  <section class="sample-library-pools-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="sample-library-pools-modal-title">
    <header class="sample-library-pools-modal-header">...</header>
    <div class="sample-library-pools-tab-strip">...</div>
    <div id="sample-library-pools-modal-content" class="sample-library-pools-modal-content"></div>
  </section>
</div>
```

- [ ] **Step 3: 增加大弹窗工作台样式**

```css
.sample-library-pools-modal-dialog {
  width: min(1180px, calc(100vw - 40px));
  max-height: min(88vh, 920px);
}

.sample-library-pools-tab-strip {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.75rem;
}
```

- [ ] **Step 4: 跑前端测试确认骨架通过**

Run: `node --test test/success-generation-ui.test.js`
Expected: FAIL 数量减少，入口和 modal 骨架断言通过，但还缺内容渲染与交互。

- [ ] **Step 5: Commit**

```bash
git add web/index.html web/styles.css
git commit -m "feat: add sample pool modal shell"
```

### Task 4: 渲染三个样本池和卡片轻操作

**Files:**
- Modify: `web/app.js`

- [ ] **Step 1: 扩展前端状态，记录当前样本池弹窗**

```js
sampleLibraryPoolsModal: {
  open: false,
  tab: "reference"
}
```

- [ ] **Step 2: 实现样本池卡片和列表渲染**

```js
function renderSamplePoolCards(items = [], pool = "reference") {
  return items.map((record) => `
    <article class="sample-pool-card">
      <strong>${escapeHtml(getSampleRecordTitle(record) || "未命名样本")}</strong>
      <p>${escapeHtml(getSamplePoolWhyLabel(record))}</p>
      <div class="item-actions">
        ${buildSamplePoolActionMarkup(record, pool)}
      </div>
    </article>
  `).join("");
}
```

- [ ] **Step 3: 实现弹窗整体渲染**

```js
function renderSampleLibraryPoolsModal() {
  const records = Array.isArray(appState.sampleLibraryRecords) ? appState.sampleLibraryRecords : [];
  const tab = appState.sampleLibraryPoolsModal?.tab || "reference";
  const items = records.filter((item) => classifySampleLibraryPool(item) === tab);
  // 写入统计、池头说明、卡片列表
}
```

- [ ] **Step 4: 为三类池提供轻操作**

```js
// reference: 移出参考样本池、调整参考等级、回到原记录
// regular: 设为参考候选、标记为反例、回到原记录
// negative: 退回普通样本池、回到原记录
```

- [ ] **Step 5: 运行前端测试**

Run: `node --test test/success-generation-ui.test.js test/rewrite-panel-behavior.test.js`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add web/app.js test/success-generation-ui.test.js test/rewrite-panel-behavior.test.js
git commit -m "feat: render sample pool modal workspace"
```

### Task 5: 打通事件、二次确认和“回到原记录”联动

**Files:**
- Modify: `web/app.js`

- [ ] **Step 1: 绑定打开/关闭 modal 与 tab 切换事件**

```js
byId("sample-library-pools-button")?.addEventListener("click", () => openSampleLibraryPoolsModal("reference"));
```

- [ ] **Step 2: 复用现有参考属性 modal 作为“调整参考等级 / 设为参考”的二次操作**

```js
if (action === "promote-sample-to-reference") {
  openSampleLibraryDetailModal("reference", button.dataset.id);
}
```

- [ ] **Step 3: 为“标记为反例 / 退回普通样本池”做最小确认流**

```js
await apiJson(sampleLibraryApi, {
  method: "PATCH",
  body: JSON.stringify({
    id,
    sampleType: "missed_violation"
  })
});
```

- [ ] **Step 4: 实现“回到原记录”**

```js
function focusSampleLibraryRecord(recordId = "") {
  closeSampleLibraryPoolsModal();
  appState.selectedSampleLibraryRecordId = String(recordId || "");
  renderSampleLibraryWorkspace();
  byId("sample-library-detail")?.scrollIntoView({ behavior: "smooth", block: "start" });
}
```

- [ ] **Step 5: 跑回归测试**

Run: `node --test test/success-generation-ui.test.js test/sample-library-pdf-import-ui.test.js`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add web/app.js test/success-generation-ui.test.js test/sample-library-pdf-import-ui.test.js
git commit -m "feat: connect sample pool modal actions"
```

### Task 6: 完成整体回归与文档一致性校验

**Files:**
- Modify: `docs/superpowers/specs/2026-05-06-sample-pool-modal-design.md`
- Modify: `docs/superpowers/plans/2026-05-06-sample-pool-modal.md`

- [ ] **Step 1: 跑本次相关测试集**

Run: `node --test test/success-generation-ui.test.js test/rewrite-panel-behavior.test.js test/sample-library-pdf-import-ui.test.js test/analyzer-seed-lexicon.test.js test/generation-api.test.js`
Expected: PASS

- [ ] **Step 2: 对照 spec 自查实现边界**

```txt
确认三个样本池只在独立 modal 中出现；
确认 modal 内只有一级切换；
确认深度编辑仍回主页面；
确认参考样本池沿用“启用参考 + 数据达标 + 正向合规”口径。
```

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/specs/2026-05-06-sample-pool-modal-design.md docs/superpowers/plans/2026-05-06-sample-pool-modal.md
git commit -m "docs: finalize sample pool modal plan"
```
