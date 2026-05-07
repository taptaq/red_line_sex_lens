# 学习样本收口与浏览数接入 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `回流中心` 收口进 `学习样本` 主场，并把 `浏览数` 作为第四个互动指标接入录入、展示、判定与样本池解释链路。

**Architecture:** 前端以 `学习样本` 为唯一高频入口，把原 `feedback-center-pane` 的内容并入 `sample-library-pane` 的日常处理区，保留 `样本池工作台` 作为独立大弹窗，保留 `规则维护 / 系统校准 / 术语表` 作为低频扩展维护。后端继续沿用统一的 `note record` / `sample library` 数据模型，在 `metrics` 中新增 `views` 字段，并把参考样本判定升级为“核心互动达标”或“互动接近达标且高浏览补足”。

**Tech Stack:** Node.js, 原生前端 HTML/CSS/JavaScript, `node:test`, 本地 JSON 数据存储。

---

## File Structure

### Existing files to modify

- `web/index.html`
  负责数据维护区结构；删除独立 `回流中心` tab，把待处理回流内容并入 `学习样本` 面板，并在学习样本相关表单中补充 `浏览数` 字段。
- `web/app.js`
  负责 tab 初始化、回流跳转、样本库渲染、PDF 批量导入卡片、生命周期回填、样本池判定与解释文案；需要同步移除 `feedback-center-pane` 依赖并新增 `views` 读写。
- `web/styles.css`
  负责合并后学习样本面板的布局、信息块间距、指标展示与样本池摘要视觉，不改现有整体主题，仅补充新块位和四指标展示样式。
- `src/data-store.js`
  负责底层 JSON 规范化；给统一 `metrics` 结构新增 `views`。
- `src/note-records.js`
  负责样本记录标准化、合并和兼容迁移；给 `publish.metrics` 规范化和 merge 逻辑新增 `views`。
- `src/note-lifecycle.js`
  负责生命周期记录标准化；给回填指标新增 `views`。
- `src/sample-library.js`
  负责学习样本导入载荷、更新补丁；让创建、更新、批量导入都能写入 `publish.metrics.views`。
- `src/pdf-sample-import.js`
  负责 PDF 批量导入提交项标准化；新增 `views` 字段。
- `src/reference-samples.js`
  负责参考样本资格判定与提示；加入“接近达标 + 高浏览补足”的规则和原因标签。
- `src/calibration-replay.js`
  负责复盘层级判断；让 `views` 参与“接近高表现”的辅助判定，但不替代核心互动结论。
- `src/success-samples.js`
  负责成功样本兼容规范化；保证旧链路里读取到的 metrics 统一带上 `views`。
- `src/sample-weight.js`
  负责样本权重；只做低权重辅助接入，不让 `views` 主导分值。

### Existing tests to modify

- `test/false-positive-admin.test.js`
  当前仍断言存在 `feedback-center-pane`；需要改为断言 `学习样本` 内存在 `回流待处理区` 和维护入口。
- `test/success-generation-ui.test.js`
  当前仍断言 `feedback-center-pane`；需要改为断言收口后的单一入口与样本池解释文案。
- `test/sample-library-api.test.js`
  覆盖学习样本创建、更新、参考属性；新增 `views` 读写断言。
- `test/sample-library-pdf-import-api.test.js`
  覆盖 PDF 批量导入；新增 `views`、去重和确认导入的指标透传断言。
- `test/note-records-store.test.js`
  覆盖统一记录标准化与 merge；新增 `views` 规范化和取最大值合并断言。
- `test/pdf-sample-import.test.js`
  覆盖 PDF 导入标准化函数；新增 `views` 默认值和字符串转整数断言。
- `test/sample-weight.test.js`
  覆盖样本权重；验证高浏览只辅助加分，不超越高互动样本。
- `test/analyzer-seed-lexicon.test.js`
  验证学习样本参与内容校验；补充参考样本由高浏览补足入池后的提示链路。
- `test/generation-api.test.js`
  验证学习样本参与生成候选筛选；确保新参考资格逻辑不会破坏原有正向样本入选。

### New tests to add

- `test/reference-samples.test.js`
  单独覆盖 `src/reference-samples.js` 的“互动达标 / 高浏览补足 / 仅高浏览不入池 / 解释文案”。

## Task 1: 收口数据维护入口到学习样本

**Files:**
- Modify: `web/index.html`
- Modify: `web/app.js`
- Modify: `web/styles.css`
- Test: `test/false-positive-admin.test.js`
- Test: `test/success-generation-ui.test.js`

- [ ] **Step 1: 写前端结构失败测试，先证明独立回流中心仍存在**

```js
test("support workspace no longer exposes a standalone feedback center tab", async (t) => {
  const fixture = await loadAdminUiFixture(t);

  assert.doesNotMatch(fixture.indexHtml, /data-tab-target="feedback-center-pane"/);
  assert.doesNotMatch(fixture.indexHtml, /id="feedback-center-pane"/);
  assert.match(fixture.indexHtml, /id="sample-library-pane"/);
  assert.match(fixture.indexHtml, /回流待处理区/);
  assert.match(fixture.indexHtml, /规则维护/);
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `node --test test/false-positive-admin.test.js test/success-generation-ui.test.js`

Expected: FAIL，提示页面仍包含 `feedback-center-pane`，且缺少新的 `回流待处理区` 文案。

- [ ] **Step 3: 修改页面结构，把回流区并入学习样本**

```html
<div class="tab-strip" role="tablist" aria-label="数据维护分区">
  <button type="button" class="tab-button" data-tab-group="data-maintenance" data-tab-target="sample-library-pane">学习样本</button>
</div>

<section class="tab-panel" id="sample-library-pane" data-tab-group="data-maintenance">
  <div class="tab-panel-head">
    <strong>学习样本</strong>
    <span>统一沉淀好样本、误判样本、平台结果与规则线索。</span>
  </div>

  <section class="admin-panel-block sample-library-reflow-panel">
    <div class="tab-panel-head">
      <strong>回流待处理区</strong>
      <span>先处理待确认误报、违规反馈和待沉淀规则线索。</span>
    </div>
    <div id="feedback-priority-list" class="admin-list"></div>
    <div id="feedback-log-list" class="admin-list"></div>
    <div id="feedback-log-secondary-list" class="admin-list"></div>
    <div id="false-positive-pending-list" class="admin-list"></div>
    <div id="false-positive-history-list" class="admin-list"></div>
  </section>

  <details id="sample-library-advanced-panel" class="admin-accordion">
    <summary>扩展维护</summary>
    <div class="admin-accordion-body">
      <section id="rules-maintenance-shortcuts" class="admin-panel-block rules-maintenance-shortcuts"></section>
      <section id="rules-maintenance-panel" class="admin-panel-block"></section>
    </div>
  </details>
</section>
```

- [ ] **Step 4: 修改前端跳转逻辑，彻底移除 `feedback-center-pane` 依赖**

```js
function initializeTabs() {
  document.querySelectorAll(".tab-button[data-tab-group][data-tab-target]").forEach((button) => {
    button.addEventListener("click", () => activateTab(button.dataset.tabGroup, button.dataset.tabTarget));
  });

  activateTab("main-workbench", "analyze-workbench-pane");
  activateTab("data-maintenance", "sample-library-pane");
}

function revealFeedbackCenterPane() {
  ensureSupportWorkspaceOpen();
  revealSampleLibraryPane();
  window.setTimeout(() => {
    byId("sample-library-reflow-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 0);
}

function revealFeedbackCenterDetails() {
  ensureSupportWorkspaceOpen();
  revealSampleLibraryPane();
  ensureSampleLibraryAdvancedPanelOpen();
  window.setTimeout(() => {
    byId("rules-maintenance-shortcuts")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 0);
}
```

- [ ] **Step 5: 补样式，让回流块并入后仍然紧凑、可读**

```css
.sample-library-reflow-panel {
  display: grid;
  gap: 14px;
}

.sample-library-maintenance-grid {
  display: grid;
  gap: 16px;
}

.sample-library-metric-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
```

- [ ] **Step 6: 运行前端结构测试并确认通过**

Run: `node --test test/false-positive-admin.test.js test/success-generation-ui.test.js`

Expected: PASS，且断言改为围绕 `sample-library-pane`、`回流待处理区`、`扩展维护` 成立。

- [ ] **Step 7: 提交这一小步**

```bash
git add web/index.html web/app.js web/styles.css test/false-positive-admin.test.js test/success-generation-ui.test.js
git commit -m "feat: merge feedback center into sample library"
```

## Task 2: 打通后端 `views` 指标的标准化与持久化

**Files:**
- Modify: `src/data-store.js`
- Modify: `src/note-records.js`
- Modify: `src/note-lifecycle.js`
- Modify: `src/sample-library.js`
- Modify: `src/pdf-sample-import.js`
- Modify: `src/success-samples.js`
- Test: `test/note-records-store.test.js`
- Test: `test/sample-library-api.test.js`
- Test: `test/sample-library-pdf-import-api.test.js`
- Test: `test/pdf-sample-import.test.js`

- [ ] **Step 1: 写后端失败测试，先锁定 `views` 缺口**

```js
test("sample library import payload persists views into publish metrics", () => {
  const payload = buildSampleLibraryImportPayload({
    title: "标题",
    body: "正文",
    coverText: "封面",
    likes: "12",
    favorites: "5",
    comments: "2",
    views: "1800"
  });

  assert.equal(payload.publish.metrics.views, "1800");
});

test("mergeNoteRecords keeps the highest views value across lifecycle and sample updates", () => {
  const merged = mergeNoteRecords(
    buildNoteRecord({ note: { title: "同一篇" }, publish: { metrics: { views: 1200 } } }),
    buildNoteRecord({ note: { title: "同一篇" }, publish: { metrics: { views: 5600 } } })
  );

  assert.equal(merged.publish.metrics.views, 5600);
});
```

- [ ] **Step 2: 运行数据层测试并确认失败**

Run: `node --test test/note-records-store.test.js test/sample-library-api.test.js test/sample-library-pdf-import-api.test.js test/pdf-sample-import.test.js`

Expected: FAIL，提示 `views` 缺失、默认为 `undefined` 或 merge 结果未保留。

- [ ] **Step 3: 给所有标准化入口加上 `views`**

```js
function normalizeMetrics(metrics = {}) {
  return {
    likes: normalizeNumber(metrics.likes, 0),
    favorites: normalizeNumber(metrics.favorites, 0),
    comments: normalizeNumber(metrics.comments, 0),
    views: normalizeNumber(metrics.views, 0)
  };
}
```

```js
export function buildSampleLibraryImportPayload(item = {}) {
  return {
    source: "manual",
    stage: "draft",
    sampleType: "",
    note: {
      title: item.title,
      body: item.body,
      coverText: item.coverText || item.title || "",
      collectionType: item.collectionType,
      tags: item.tags
    },
    publish: {
      status: "not_published",
      notes: "",
      publishedAt: "",
      platformReason: "",
      metrics: {
        likes: item.likes,
        favorites: item.favorites,
        comments: item.comments,
        views: item.views
      }
    },
    reference: {
      enabled: false,
      tier: "",
      selectedBy: "",
      notes: ""
    }
  };
}
```

- [ ] **Step 4: 给 patch / merge / PDF 导入兼容层补上 `views`**

```js
if (payload.publish.metrics && typeof payload.publish.metrics === "object") {
  if (hasOwn(payload.publish.metrics, "likes")) next.publish.metrics.likes = payload.publish.metrics.likes;
  if (hasOwn(payload.publish.metrics, "favorites")) next.publish.metrics.favorites = payload.publish.metrics.favorites;
  if (hasOwn(payload.publish.metrics, "comments")) next.publish.metrics.comments = payload.publish.metrics.comments;
  if (hasOwn(payload.publish.metrics, "views")) next.publish.metrics.views = payload.publish.metrics.views;
}
```

```js
function mergeMetrics(left = {}, right = {}) {
  return {
    likes: Math.max(normalizeMetric(left.likes), normalizeMetric(right.likes)),
    favorites: Math.max(normalizeMetric(left.favorites), normalizeMetric(right.favorites)),
    comments: Math.max(normalizeMetric(left.comments), normalizeMetric(right.comments)),
    views: Math.max(normalizeMetric(left.views), normalizeMetric(right.views))
  };
}
```

- [ ] **Step 5: 运行数据层测试并确认通过**

Run: `node --test test/note-records-store.test.js test/sample-library-api.test.js test/sample-library-pdf-import-api.test.js test/pdf-sample-import.test.js`

Expected: PASS，断言 `publish.metrics.views` 在创建、更新、导入和 merge 结果中都为非负整数。

- [ ] **Step 6: 提交这一小步**

```bash
git add src/data-store.js src/note-records.js src/note-lifecycle.js src/sample-library.js src/pdf-sample-import.js src/success-samples.js test/note-records-store.test.js test/sample-library-api.test.js test/sample-library-pdf-import-api.test.js test/pdf-sample-import.test.js
git commit -m "feat: add views metric to sample records"
```

## Task 3: 在学习样本、生命周期和 PDF 导入里展示并编辑 `浏览数`

**Files:**
- Modify: `web/index.html`
- Modify: `web/app.js`
- Modify: `web/styles.css`
- Test: `test/sample-library-pdf-import-ui.test.js`
- Test: `test/success-generation-ui.test.js`

- [ ] **Step 1: 写 UI 失败测试，锁定四个入口都要出现 `浏览数`**

```js
test("sample library surfaces views across create form, lifecycle form and pdf import cards", async (t) => {
  const fixture = await loadAdminUiFixture(t);

  assert.match(fixture.indexHtml, /<span>浏览数<\/span>/);
  assert.match(fixture.appJs, /name="views"/);
  assert.match(fixture.appJs, /`浏览 ${String\(publish\.metrics\.views \|\| 0\)}`/);
});
```

- [ ] **Step 2: 运行 UI 测试并确认失败**

Run: `node --test test/sample-library-pdf-import-ui.test.js test/success-generation-ui.test.js`

Expected: FAIL，提示 `views` 字段、读取逻辑或展示文案缺失。

- [ ] **Step 3: 在学习样本新建、单条详情和生命周期回填里增加输入项**

```html
<label>
  <span>浏览数</span>
  <input name="views" type="number" min="0" value="0" />
</label>
```

```js
metrics: {
  likes: contentNode?.querySelector('[name="likes"]')?.value || 0,
  favorites: contentNode?.querySelector('[name="favorites"]')?.value || 0,
  comments: contentNode?.querySelector('[name="comments"]')?.value || 0,
  views: contentNode?.querySelector('[name="views"]')?.value || 0
}
```

- [ ] **Step 4: 在 PDF 批量导入卡片、确认导入 payload 和样本池卡片摘要中加入 `views`**

```js
return {
  title: card.querySelector('[name="title"]')?.value || "",
  body: card.querySelector('[name="body"]')?.value || "",
  coverText: card.querySelector('[name="coverText"]')?.value || "",
  likes: card.querySelector('[name="likes"]')?.value || "0",
  favorites: card.querySelector('[name="favorites"]')?.value || "0",
  comments: card.querySelector('[name="comments"]')?.value || "0",
  views: card.querySelector('[name="views"]')?.value || "0"
};
```

```js
const metricSummary = [
  `点赞 ${String(publish.metrics.likes || 0)}`,
  `收藏 ${String(publish.metrics.favorites || 0)}`,
  `评论 ${String(publish.metrics.comments || 0)}`,
  `浏览 ${String(publish.metrics.views || 0)}`
];
```

- [ ] **Step 5: 调整展示样式，保持长度不要过长**

```css
.sample-library-metric-pill {
  min-width: 0;
  max-width: 100%;
  white-space: nowrap;
}

.sample-library-metric-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}
```

- [ ] **Step 6: 运行 UI 测试并确认通过**

Run: `node --test test/sample-library-pdf-import-ui.test.js test/success-generation-ui.test.js`

Expected: PASS，断言四个入口都能看到 `浏览数`，样本池与详情摘要也能显示。

- [ ] **Step 7: 提交这一小步**

```bash
git add web/index.html web/app.js web/styles.css test/sample-library-pdf-import-ui.test.js test/success-generation-ui.test.js
git commit -m "feat: surface views in sample library workflows"
```

## Task 4: 让 `浏览数` 作为参考样本池辅助放宽条件

**Files:**
- Modify: `src/reference-samples.js`
- Modify: `src/calibration-replay.js`
- Modify: `src/sample-weight.js`
- Modify: `web/app.js`
- Test: `test/reference-samples.test.js`
- Test: `test/sample-weight.test.js`
- Test: `test/analyzer-seed-lexicon.test.js`
- Test: `test/generation-api.test.js`

- [ ] **Step 1: 写失败测试，明确三种边界**

```js
test("reference sample qualifies when engagement is near threshold and views are high", () => {
  assert.equal(
    meetsReferenceSampleThreshold({ likes: 18, favorites: 4, comments: 1, views: 5200 }).qualified,
    true
  );
});

test("reference sample does not qualify with high views alone", () => {
  assert.equal(
    meetsReferenceSampleThreshold({ likes: 2, favorites: 0, comments: 0, views: 12000 }).qualified,
    false
  );
});

test("reference sample explains whether it passed by engagement or by views assist", () => {
  const qualified = meetsReferenceSampleThreshold({ likes: 18, favorites: 4, comments: 1, views: 5200 });
  assert.equal(qualified.reason, "互动接近达标，已由高浏览数补足");
});
```

- [ ] **Step 2: 运行判定层测试并确认失败**

Run: `node --test test/reference-samples.test.js test/sample-weight.test.js test/analyzer-seed-lexicon.test.js test/generation-api.test.js`

Expected: FAIL，提示当前阈值函数只返回布尔值，且没有 `views` 辅助或解释文案。

- [ ] **Step 3: 重构参考样本阈值函数为“结果对象”，并加入浏览补足逻辑**

```js
const referenceMetricThreshold = {
  likes: 20,
  favorites: 5,
  comments: 2,
  nearLikes: 16,
  nearFavorites: 4,
  nearComments: 1,
  supportViews: 5000
};

export function evaluateReferenceSampleThreshold(metrics = {}) {
  const likes = normalizeMetric(metrics.likes);
  const favorites = normalizeMetric(metrics.favorites);
  const comments = normalizeMetric(metrics.comments);
  const views = normalizeMetric(metrics.views);

  const directQualified =
    likes >= referenceMetricThreshold.likes ||
    favorites >= referenceMetricThreshold.favorites ||
    comments >= referenceMetricThreshold.comments;

  if (directQualified) {
    return { qualified: true, reason: "互动达标" };
  }

  const nearQualified =
    (likes >= referenceMetricThreshold.nearLikes ||
      favorites >= referenceMetricThreshold.nearFavorites ||
      comments >= referenceMetricThreshold.nearComments) &&
    views >= referenceMetricThreshold.supportViews;

  if (nearQualified) {
    return { qualified: true, reason: "互动接近达标，已由高浏览数补足" };
  }

  return { qualified: false, reason: "" };
}

export function meetsReferenceSampleThreshold(metrics = {}) {
  return evaluateReferenceSampleThreshold(metrics).qualified;
}
```

- [ ] **Step 4: 在前端样本池分类和解释文案里透出判定原因**

```js
function getReferenceQualification(record = {}) {
  return evaluateReferenceSampleThreshold(getSampleRecordPublish(record).metrics);
}

function getSamplePoolWhyLabel(record = {}) {
  const publish = getSampleRecordPublish(record);
  const qualification = getReferenceQualification(record);

  if (qualification.qualified && isPositiveReferenceStatus(publish.status)) {
    return qualification.reason;
  }

  if (["limited", "violation"].includes(publish.status)) {
    return "平台结果为风险样本";
  }

  return "暂未达到参考样本条件";
}
```

- [ ] **Step 5: 让权重和复盘层只辅助使用 `views`，不改主导关系**

```js
const engagementScore = likes + favorites * 2 + comments * 3;
const viewsAssistScore = Math.min(3, Math.floor(views / 3000));
return baseWeight + engagementScore + viewsAssistScore;
```

```js
if (status === "positive_performance" || likes >= 100 || favorites >= 20 || comments >= 10) {
  return "high";
}

if (
  likes >= 20 ||
  favorites >= 5 ||
  comments >= 2 ||
  ((likes >= 16 || favorites >= 4 || comments >= 1) && views >= 5000)
) {
  return "medium";
}
```

- [ ] **Step 6: 运行判定与联动测试并确认通过**

Run: `node --test test/reference-samples.test.js test/sample-weight.test.js test/analyzer-seed-lexicon.test.js test/generation-api.test.js`

Expected: PASS，且断言能区分 `互动达标` 与 `互动接近达标，已由高浏览数补足`。

- [ ] **Step 7: 提交这一小步**

```bash
git add src/reference-samples.js src/calibration-replay.js src/sample-weight.js web/app.js test/reference-samples.test.js test/sample-weight.test.js test/analyzer-seed-lexicon.test.js test/generation-api.test.js
git commit -m "feat: qualify reference samples with views assist"
```

## Task 5: 全量回归验证并整理交互说明

**Files:**
- Modify: `web/app.js`
- Modify: `web/index.html`
- Modify: `web/styles.css`
- Test: `test/false-positive-admin.test.js`
- Test: `test/success-generation-ui.test.js`
- Test: `test/sample-library-pdf-import-ui.test.js`
- Test: `test/sample-library-api.test.js`
- Test: `test/sample-library-pdf-import-api.test.js`
- Test: `test/note-records-store.test.js`
- Test: `test/reference-samples.test.js`
- Test: `test/generation-api.test.js`
- Test: `test/analyzer-seed-lexicon.test.js`

- [ ] **Step 1: 补一条收口后的说明文案断言，明确样本生效流转**

```js
test("sample library flow guide explains when records affect validation and generation", async (t) => {
  const fixture = await loadAdminUiFixture(t);

  assert.match(fixture.indexHtml, /启用参考属性并达到数据门槛：才会真正进入参考样本池/);
  assert.match(fixture.indexHtml, /仅保存到学习样本：不会直接进入内容检测规则/);
});
```

- [ ] **Step 2: 运行完整回归并确认是否还有遗漏**

Run: `node --test test/false-positive-admin.test.js test/success-generation-ui.test.js test/sample-library-pdf-import-ui.test.js test/sample-library-api.test.js test/sample-library-pdf-import-api.test.js test/note-records-store.test.js test/reference-samples.test.js test/generation-api.test.js test/analyzer-seed-lexicon.test.js`

Expected: 先可能出现 1-2 个遗漏失败，通常是某个 `views` 渲染点、旧 `feedback-center-pane` 引用或解释文案未更新。

- [ ] **Step 3: 修完回归暴露的最后遗漏**

```js
const flowItems = [
  "只保存基础内容：先进入学习样本记录列表，用于去重、归档和后续补全。",
  "启用参考属性并达到数据门槛：才会真正进入参考样本池，参与风格画像、生成参考和内容校验提示。",
  "仅保存到学习样本：不会直接进入内容检测规则；检测仍主要依赖词库、白名单和误报回流。"
];
```

- [ ] **Step 4: 再跑一次完整回归**

Run: `node --test test/false-positive-admin.test.js test/success-generation-ui.test.js test/sample-library-pdf-import-ui.test.js test/sample-library-api.test.js test/sample-library-pdf-import-api.test.js test/note-records-store.test.js test/reference-samples.test.js test/generation-api.test.js test/analyzer-seed-lexicon.test.js`

Expected: PASS。

- [ ] **Step 5: 做语法检查**

Run: `node --check web/app.js`

Expected: PASS。

- [ ] **Step 6: 提交收尾**

```bash
git add web/index.html web/app.js web/styles.css src/data-store.js src/note-records.js src/note-lifecycle.js src/sample-library.js src/pdf-sample-import.js src/reference-samples.js src/calibration-replay.js src/success-samples.js src/sample-weight.js test/false-positive-admin.test.js test/success-generation-ui.test.js test/sample-library-pdf-import-ui.test.js test/sample-library-api.test.js test/sample-library-pdf-import-api.test.js test/note-records-store.test.js test/reference-samples.test.js test/generation-api.test.js test/analyzer-seed-lexicon.test.js
git commit -m "feat: consolidate sample workspace and add views metric"
```

## Spec Coverage Check

- `回流中心` 并入 `学习样本`：Task 1
- `规则维护 / 系统校准 / 术语表` 仍作为低频扩展维护：Task 1, Task 5
- `浏览数` 全入口接入：Task 2, Task 3
- `浏览数` 仅辅助参考样本入池：Task 4
- 样本池解释文案区分“互动达标 / 高浏览补足”：Task 4
- 不破坏既有生成参考、内容校验、PDF 导入和去重链路：Task 2, Task 3, Task 4, Task 5

## Placeholder Scan

- 本计划未使用 `TODO` / `TBD` / “类似上一步” 这类占位表述。
- 每个任务都包含了明确文件路径、测试命令、预期结果和示例代码。

## Type Consistency Check

- 统一使用 `publish.metrics.views` 作为浏览数字段。
- 参考样本阈值说明统一使用 `互动达标` 与 `互动接近达标，已由高浏览数补足`。
- 收口后的唯一高频主面板统一使用 `sample-library-pane`，回流块使用 `sample-library-reflow-panel`。

Plan complete and saved to `docs/superpowers/plans/2026-05-06-sample-library-consolidation-and-views.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
