# Sample Library List Modals Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将样本库中的误报案例和记录列表改成“默认 3 条预览 + 查看全部弹窗”模式，缩短主页面滚动长度，同时保留现有详情与维护操作。

**Architecture:** 复用现有 `sample-library-modal` 作为统一弹窗容器，不新增新的弹窗体系。主页面只保留短预览和“查看全部”入口，完整列表在弹窗里复用现有卡片渲染逻辑和记录打开逻辑。

**Tech Stack:** `web/index.html`、`web/app.js`、`web/styles.css`、`node:test` 前端静态断言测试。

---

## File Structure

### Modified files

- `web/index.html`
  为误报案例区和记录列表区增加“查看全部”入口，并为预览区补充更明确的块级结构。
- `web/app.js`
  增加预览截断逻辑、两个 modal kind、两个 modal markup builder、两个打开全量列表的 action。
- `web/styles.css`
  补充预览区头部、弹窗内滚动列表、预览按钮等样式，沿用现有 `sample-library-modal` 视觉体系。
- `test/false-positive-admin.test.js`
  保护误报案例区的“3 条预览 + 查看全部入口 + 误报列表弹窗”结构与动作存在。
- `test/success-generation-ui.test.js`
  保护记录列表区的“3 条预览 + 查看全部入口 + 记录列表弹窗”结构与动作存在。

## Task 1: 为误报案例弹窗化写失败测试

**Files:**
- Modify: `test/false-positive-admin.test.js`

- [ ] **Step 1: 写误报案例预览与弹窗入口的失败测试**

```js
test("sample library reflow area exposes false positive preview and modal launch controls", async () => {
  const [indexHtml, appJs] = await Promise.all([
    fs.readFile(path.join(process.cwd(), "web/index.html"), "utf8"),
    fs.readFile(path.join(process.cwd(), "web/app.js"), "utf8")
  ]);

  assert.match(indexHtml, /id="false-positive-pending-list"/);
  assert.match(indexHtml, /id="false-positive-history-list"/);
  assert.match(indexHtml, /id="false-positive-preview-open-button"/);
  assert.match(indexHtml, /查看全部误报案例/);
  assert.match(appJs, /const FALSE_POSITIVE_PREVIEW_LIMIT = 3/);
  assert.match(appJs, /function\s+openFalsePositiveListModal\s*\(/);
  assert.match(appJs, /function\s+buildFalsePositiveListModalMarkup\s*\(/);
  assert.match(appJs, /if \(action === "open-false-positive-list-modal"\)/);
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test test/false-positive-admin.test.js`

Expected: FAIL with missing preview button / modal action assertions

- [ ] **Step 3: 实现误报案例预览与弹窗**

```txt
实现要求：
- 主页面的待确认误报和已沉淀误报都只渲染最近 3 条
- 保持现有排序逻辑不变，只在最终渲染前 slice(0, 3)
- 仅在存在误报数据时显示“查看全部误报案例”按钮
- 弹窗内容分成两个 section：待确认误报、已沉淀误报案例
- 弹窗内继续复用 buildFalsePositiveEntryMarkup()
```

- [ ] **Step 4: 重新运行测试确认通过**

Run: `node --test test/false-positive-admin.test.js`

Expected: PASS

## Task 2: 为记录列表弹窗化写失败测试

**Files:**
- Modify: `test/success-generation-ui.test.js`

- [ ] **Step 1: 写记录列表预览与弹窗入口的失败测试**

```js
test("sample library workspace exposes record preview and full-list modal controls", async () => {
  const { indexHtml, appJs } = await readFrontendFiles();
  const sampleLibraryPaneHtml = extractElementInnerHtml(indexHtml, 'id="sample-library-pane"');

  assert.match(sampleLibraryPaneHtml, /id="sample-library-record-list"/);
  assert.match(sampleLibraryPaneHtml, /id="sample-library-record-preview-open-button"/);
  assert.match(sampleLibraryPaneHtml, /查看全部记录列表/);
  assert.match(appJs, /const SAMPLE_LIBRARY_RECORD_PREVIEW_LIMIT = 3/);
  assert.match(appJs, /function\s+openSampleLibraryRecordListModal\s*\(/);
  assert.match(appJs, /function\s+buildSampleLibraryRecordListModalMarkup\s*\(/);
  assert.match(appJs, /if \(action === "open-sample-library-record-list-modal"\)/);
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test test/success-generation-ui.test.js`

Expected: FAIL with missing preview button / modal action assertions

- [ ] **Step 3: 实现记录列表预览与弹窗**

```txt
实现要求：
- 主页面记录列表只显示当前筛选结果的前 3 条
- 保留原有计数文案和当前选中高亮逻辑
- 仅在有记录时显示“查看全部记录列表”按钮
- 弹窗内展示当前筛选条件下的完整记录列表
- 点击弹窗内记录后，复用现有 open-sample-library-record 路径并关闭弹窗
```

- [ ] **Step 4: 重新运行测试确认通过**

Run: `node --test test/success-generation-ui.test.js`

Expected: PASS

## Task 3: 样式收口与全量前端回归

**Files:**
- Modify: `web/styles.css`
- Modify: `test/false-positive-admin.test.js`
- Modify: `test/success-generation-ui.test.js`

- [ ] **Step 1: 调整样式让预览和弹窗列表都可读**

```txt
样式目标：
- 主页面预览区更紧凑，但不压缩单张卡片内容到不可读
- “查看全部”按钮放在对应区块头部或尾部，视觉上不抢主动作
- 弹窗列表内容区滚动，不让整页滚动
- 不新增新的 modal 样式体系，继续沿用 sample-library-modal
```

- [ ] **Step 2: 跑误报与样本库相关前端回归**

Run: `node --test test/false-positive-admin.test.js test/success-generation-ui.test.js`

Expected: PASS

- [ ] **Step 3: 跑补充前端回归，确认没有把现有样本库 modal 机制带坏**

Run: `node --test test/sample-library-pdf-import-ui.test.js test/false-positive-view.test.js`

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add web/index.html web/app.js web/styles.css test/false-positive-admin.test.js test/success-generation-ui.test.js docs/superpowers/specs/2026-05-07-sample-library-list-modals-design.md docs/superpowers/plans/2026-05-07-sample-library-list-modals.md
git commit -m "feat: move sample library long lists into modals"
```
