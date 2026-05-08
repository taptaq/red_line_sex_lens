# False Positive Modal Actions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将“误报案例”主页区域收口为摘要 + 进入弹窗，所有误报案例确认、删除和完整查看都统一放到误报案例弹窗里处理。

**Architecture:** 复用现有 `false-positive-list` 弹窗作为唯一误报案例工作台，不新增第二套弹窗或后端接口。主页只保留摘要节点和 `查看全部误报案例` 按钮，`renderFalsePositiveLog()` 统一负责刷新摘要、按钮显隐和弹窗内容。

**Tech Stack:** `web/index.html`、`web/app.js`、`test/false-positive-admin.test.js`、`test/success-generation-ui.test.js`、`node:test`

---

## File Structure

### Modified files

- `web/index.html`
  删除主页误报案例预览列表节点，新增误报摘要节点，保留“查看全部误报案例”按钮。
- `web/app.js`
  将误报案例主页渲染改成摘要模式，保留并强化 `false-positive-list` 弹窗内的完整操作刷新路径。
- `test/false-positive-admin.test.js`
  更新误报案例区域测试，从“主页存在列表预览”改为“主页存在摘要入口、弹窗承担完整操作”。
- `test/success-generation-ui.test.js`
  同步更新主界面回归测试，避免继续要求主页存在误报案例预览列表节点。

## Task 1: 先把误报案例主页收口目标写成失败测试

**Files:**
- Modify: `test/false-positive-admin.test.js`
- Modify: `test/success-generation-ui.test.js`

- [ ] **Step 1: 把主页误报案例断言改成摘要 + 弹窗入口**

```js
assert.match(indexHtml, /id="false-positive-summary"/);
assert.match(indexHtml, /id="false-positive-preview-open-button"/);
assert.match(indexHtml, /查看全部误报案例/);
assert.doesNotMatch(indexHtml, /id="false-positive-pending-list"/);
assert.doesNotMatch(indexHtml, /id="false-positive-history-list"/);
```

- [ ] **Step 2: 保护弹窗仍承担完整误报操作**

```js
assert.match(appJs, /function\s+buildFalsePositiveListModalMarkup\s*\(/);
assert.match(appJs, /function\s+renderFalsePositiveListModal\s*\(/);
assert.match(appJs, /data-action="confirm-false-positive"/);
assert.match(appJs, /data-action="delete-false-positive"/);
assert.match(appJs, /if \(appState\.sampleLibraryModal\?\.kind === "false-positive-list"[\s\S]*renderFalsePositiveListModal\(\)/);
```

- [ ] **Step 3: 去掉对主页预览截断的旧要求**

```js
assert.doesNotMatch(appJs, /const FALSE_POSITIVE_PREVIEW_LIMIT = 3/);
assert.doesNotMatch(appJs, /pendingItems[\s\S]*?\.slice\(0,\s*FALSE_POSITIVE_PREVIEW_LIMIT\)/);
assert.doesNotMatch(appJs, /historyItems[\s\S]*?\.slice\(0,\s*FALSE_POSITIVE_PREVIEW_LIMIT\)/);
```

- [ ] **Step 4: 运行测试确认现在是红灯**

Run: `source ~/.nvm/nvm.sh && nvm use 20.19.0 >/dev/null && node --test test/false-positive-admin.test.js test/success-generation-ui.test.js`

Expected: FAIL，因为 `false-positive-summary` 还不存在，主页里仍有 `false-positive-pending-list` / `false-positive-history-list`，且 `FALSE_POSITIVE_PREVIEW_LIMIT` 仍在代码里。

## Task 2: 用最小实现把误报案例操作完全收进弹窗

**Files:**
- Modify: `web/index.html`
- Modify: `web/app.js`
- Test: `test/false-positive-admin.test.js`

- [ ] **Step 1: 把主页误报案例区改成摘要节点**

```html
<div class="item-actions">
  <button
    type="button"
    id="false-positive-preview-open-button"
    class="button button-ghost button-small"
    data-action="open-false-positive-list-modal"
    hidden
  >
    查看全部误报案例
  </button>
</div>
<div id="false-positive-summary" class="result-card muted">当前没有误报案例</div>
<div id="false-positive-log-list" class="admin-list" hidden></div>
```

- [ ] **Step 2: 在 `web/app.js` 新增主页摘要文案 helper**

```js
function buildFalsePositiveSummaryText({ pendingItems = [], historyItems = [] } = {}) {
  if (!pendingItems.length && !historyItems.length) {
    return "当前没有误报案例";
  }

  return `待确认 ${pendingItems.length} 条，已沉淀 ${historyItems.length} 条`;
}
```

- [ ] **Step 3: 把 `renderFalsePositiveLog()` 改成只刷新摘要、按钮和弹窗**

```js
function renderFalsePositiveLog(items) {
  appState.falsePositiveLog = Array.isArray(items) ? items : [];
  const { pendingItems, historyItems } = getSortedFalsePositiveGroups(appState.falsePositiveLog);
  const previewButton = byId("false-positive-preview-open-button");
  const summaryNode = byId("false-positive-summary");

  if (previewButton) {
    previewButton.hidden = appState.falsePositiveLog.length === 0;
  }

  if (summaryNode) {
    summaryNode.textContent = buildFalsePositiveSummaryText({ pendingItems, historyItems });
    summaryNode.className = appState.falsePositiveLog.length ? "result-card" : "result-card muted";
  }

  byId("false-positive-log-list").innerHTML = appState.falsePositiveLog.length
    ? ""
    : '<div class="result-card muted">当前没有误报样本</div>';

  if (appState.sampleLibraryModal?.kind === "false-positive-list" && byId("sample-library-modal")?.hidden === false) {
    renderFalsePositiveListModal();
  }
}
```

- [ ] **Step 4: 删除主页误报预览列表渲染和旧常量**

```js
// 删除：
const FALSE_POSITIVE_PREVIEW_LIMIT = 3;

// 删除 renderFalsePositiveLog() 中下面两段：
byId("false-positive-pending-list").innerHTML = ...;
byId("false-positive-history-list").innerHTML = ...;
```

- [ ] **Step 5: 保持弹窗里的确认 / 删除后原地刷新**

```js
if (action === "confirm-false-positive") {
  await apiJson("/api/admin/false-positive-log", {
    method: "PATCH",
    body: JSON.stringify({
      id: button.dataset.id,
      status: "platform_passed_confirmed"
    })
  });
}

if (action === "delete-false-positive") {
  await apiJson("/api/admin/false-positive-log", {
    method: "DELETE",
    body: JSON.stringify({
      id: button.dataset.id
    })
  });
}

await refreshAll();
```

- [ ] **Step 6: 重新运行前端测试确认通过**

Run: `source ~/.nvm/nvm.sh && nvm use 20.19.0 >/dev/null && node --test test/false-positive-admin.test.js test/success-generation-ui.test.js`

Expected: PASS

## Task 3: 回归误报案例和样本库相关行为

**Files:**
- Test: `test/false-positive-admin.test.js`
- Test: `test/success-generation-ui.test.js`
- Test: `test/false-positive-view.test.js`

- [ ] **Step 1: 运行误报案例与样本库回归测试**

```bash
source ~/.nvm/nvm.sh && nvm use 20.19.0 >/dev/null && node --test \
  test/false-positive-admin.test.js \
  test/success-generation-ui.test.js \
  test/false-positive-view.test.js
```

Expected: PASS，且误报案例弹窗仍保留分区和操作按钮。

- [ ] **Step 2: 快速检查需求覆盖**

```txt
- 主页不再直接渲染误报案例列表
- 主页显示数量摘要
- 主页只有“查看全部误报案例”入口
- 确认 / 删除只能在弹窗里做
- 弹窗内操作后继续停留并刷新
```

- [ ] **Step 3: 记录本次实现文件**

```txt
确认最终修改集中在：
- web/index.html
- web/app.js
- test/false-positive-admin.test.js
- test/success-generation-ui.test.js
```
