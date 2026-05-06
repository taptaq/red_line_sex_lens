# 学习样本反哺校验与生成 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让“手动启用参考且数据达标”的学习样本同时参与生成参考与内容校验的安全提示层，并保持普通样本与反例样本不进入正向运行时链路。

**Architecture:** 保持现有 `note-records` 数据结构不变，在运行时新增一层“合格参考样本池”筛选。生成链路改为优先使用该样本池；校验链路在规则判断后新增参考样本提示层，只允许把 `manual_review` 轻微放宽到 `observe`，且不得影响 `hard_block`。

**Tech Stack:** Node.js、原生测试 `node:test`、现有 `src/` 数据与分析模块、`web/` 管理界面。

---

### Task 1: 为合格参考样本池补测试护栏

**Files:**
- Modify: `test/generation-api.test.js`
- Modify: `test/analyzer-seed-lexicon.test.js`

- [ ] **Step 1: 写生成侧的失败测试**

```js
test("generation references only include qualified reference samples", async (t) => {
  // 断言：仅手动启用参考 + 数据达标 + 正向合规的样本进入生成参考
});
```

- [ ] **Step 2: 运行生成侧测试确认失败**

Run: `node --test test/generation-api.test.js`
Expected: FAIL，当前实现仍会把未达标参考样本混入生成参考。

- [ ] **Step 3: 写校验侧的失败测试**

```js
test("qualified reference samples soften safe manual-review results without changing hard blocks", async (t) => {
  // 断言：manual_review 可被参考样本下调为 observe，hard_block 不受影响
});
```

- [ ] **Step 4: 运行校验侧测试确认失败**

Run: `node --test test/analyzer-seed-lexicon.test.js`
Expected: FAIL，当前实现尚未输出参考样本提示字段，也不会使用参考样本参与放宽。

- [ ] **Step 5: Commit**

```bash
git add test/generation-api.test.js test/analyzer-seed-lexicon.test.js
git commit -m "test: cover qualified reference sample routing"
```

### Task 2: 实现运行时参考样本池筛选

**Files:**
- Create: `src/reference-samples.js`
- Modify: `src/data-store.js`
- Modify: `src/server.js`

- [ ] **Step 1: 新建参考样本筛选辅助模块**

```js
export function isPositivePublishStatus(status = "") {
  return ["published_passed", "positive_performance", "false_positive"].includes(String(status || "").trim());
}

export function meetsReferenceSampleThreshold(metrics = {}) {
  const likes = Number(metrics.likes || 0);
  const favorites = Number(metrics.favorites || 0);
  const comments = Number(metrics.comments || 0);
  return likes >= 20 || favorites >= 5 || comments >= 2;
}
```

- [ ] **Step 2: 在数据层提供“合格参考样本”加载函数**

```js
export async function loadQualifiedReferenceSamples() {
  const items = await loadNoteRecords();
  return items
    .filter((item) => isQualifiedReferenceRecord(item))
    .map((item) => noteRecordToSuccessSample(item));
}
```

- [ ] **Step 3: 让生成链路改用合格参考样本池**

```js
const [currentProfile, qualifiedReferenceSamples] = await Promise.all([
  loadStyleProfile(),
  loadQualifiedReferenceSamples()
]);
```

- [ ] **Step 4: 运行生成测试并修正实现直到通过**

Run: `node --test test/generation-api.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/reference-samples.js src/data-store.js src/server.js test/generation-api.test.js
git commit -m "feat: qualify reference samples for generation"
```

### Task 3: 给校验链路接入参考样本提示层

**Files:**
- Modify: `src/analyzer.js`
- Modify: `src/data-store.js`
- Modify: `src/reference-samples.js`

- [ ] **Step 1: 实现参考样本相似支持计算**

```js
export function findReferenceSampleHints(samples = [], input = {}) {
  // 标题、正文、标签、集合类型四路信号
  // 返回 matchedReferenceSamples / referenceSampleHints / referenceSampleSupportScore
}
```

- [ ] **Step 2: 在分析器中并行加载合格参考样本**

```js
const [whitelist, lexicon, falsePositiveLog, qualifiedReferenceSamples] = await Promise.all([
  loadWhitelist(),
  loadLexicon(),
  loadFalsePositiveLog(),
  loadQualifiedReferenceSamples()
]);
```

- [ ] **Step 3: 只在安全边界内允许 softening**

```js
if (verdict === "manual_review" && !hasHardBlock && referenceSampleSupportScore >= threshold) {
  verdict = "observe";
}
```

- [ ] **Step 4: 返回可解释输出字段**

```js
return {
  referenceSampleHints,
  matchedReferenceSamples,
  referenceSampleSupportScore,
  softenedByReferenceSamples
};
```

- [ ] **Step 5: 运行分析器测试直到通过**

Run: `node --test test/analyzer-seed-lexicon.test.js`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/analyzer.js src/data-store.js src/reference-samples.js test/analyzer-seed-lexicon.test.js
git commit -m "feat: use qualified reference samples in analysis"
```

### Task 4: 更新页面说明与结果展示

**Files:**
- Modify: `web/app.js`
- Modify: `web/index.html`

- [ ] **Step 1: 在检测结果里展示参考样本提示**

```js
const referenceSampleHints = Array.isArray(result.referenceSampleHints) ? result.referenceSampleHints : [];
```

- [ ] **Step 2: 更新学习样本说明文案**

```html
<li>启用参考属性并达到数据门槛后，样本会参与生成参考与内容校验提示层。</li>
```

- [ ] **Step 3: 运行相关前端测试**

Run: `node --test test/rewrite-panel-behavior.test.js test/success-generation-ui.test.js`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add web/app.js web/index.html test/rewrite-panel-behavior.test.js test/success-generation-ui.test.js
git commit -m "feat: show reference sample guidance in analysis UI"
```

### Task 5: 全量回归验证

**Files:**
- Modify: `docs/superpowers/specs/2026-05-06-note-samples-feedback-design.md`
- Modify: `docs/superpowers/plans/2026-05-06-note-samples-feedback.md`

- [ ] **Step 1: 跑本次改动相关测试集**

Run: `node --test test/analyzer-seed-lexicon.test.js test/generation-api.test.js test/rewrite-panel-behavior.test.js test/success-generation-ui.test.js`
Expected: PASS

- [ ] **Step 2: 自查 spec / plan 与实现是否一致**

```txt
检查生成是否只读取合格参考样本；
检查校验是否只允许 manual_review -> observe；
检查页面提示是否写清“启用参考 + 数据达标”。
```

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/specs/2026-05-06-note-samples-feedback-design.md docs/superpowers/plans/2026-05-06-note-samples-feedback.md
git commit -m "docs: finalize note sample feedback plan"
```
