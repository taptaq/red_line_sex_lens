# 轻量草稿区 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让账号复盘卡、主题灵感卡和生成候选稿都能一键加入一个轻量草稿区，并可重新载入到生成工作台继续创作。

**Architecture:** 新增独立的 `draft-ideas` 数据文件与最小 CRUD API，不把“待写选题草稿”混进学习样本库。前端在生成工作台旁增加一个草稿区面板，只提供查看、载入到生成工作台、删除、标记已使用四类基础操作。

**Tech Stack:** Node.js、原生测试 `node:test`、现有 `src/data-store.js` / `src/server.js` 数据流、`web/app.js` / `web/index.html` / `web/styles.css`。

---

### Task 1: 为草稿区数据契约补失败测试

**Files:**
- Modify: `test/sample-library-api.test.js`
- Modify: `test/success-generation-ui.test.js`

- [ ] **Step 1: 写 API 侧失败测试，覆盖草稿区的增删查改最小流程**

```js
test("draft ideas API supports list create patch delete", async (t) => {
  // GET 空列表
  // POST 创建 account planner 草稿
  // PATCH 标记已使用
  // DELETE 删除草稿
});
```

- [ ] **Step 2: 运行 API 测试确认失败**

Run: `node --test test/sample-library-api.test.js`
Expected: FAIL，当前还没有 `/api/draft-ideas` 路由和持久化文件。

- [ ] **Step 3: 写前端失败测试，覆盖草稿区入口与主要操作文案**

```js
test("frontend exposes draft inbox actions for account planner, theme inspirations, and generation candidates", async () => {
  // 断言三个入口按钮和草稿区面板存在
});
```

- [ ] **Step 4: 运行前端测试确认失败**

Run: `node --test test/success-generation-ui.test.js`
Expected: FAIL，当前页面还没有草稿区 UI 和按钮。

- [ ] **Step 5: Commit**

```bash
git add test/sample-library-api.test.js test/success-generation-ui.test.js
git commit -m "test: cover draft idea inbox contract"
```

### Task 2: 实现草稿区数据层与 API

**Files:**
- Modify: `src/config.js`
- Modify: `src/data-store.js`
- Modify: `src/server.js`
- Create: `src/draft-ideas.js`
- Create: `data/draft-ideas.json`

- [ ] **Step 1: 新增草稿区配置与空数据文件**

```js
paths.draftIdeas = path.join(dataDir, "draft-ideas.json");
```

```json
{
  "items": []
}
```

- [ ] **Step 2: 新建草稿区归一化辅助模块**

```js
export function normalizeDraftIdea(item = {}) {
  return {
    id: normalizeString(item.id) || `draft-${Date.now()}`,
    title: normalizeString(item.title),
    briefing: normalizeString(item.briefing),
    collectionType: normalizeString(item.collectionType) || "科普",
    materialText: normalizeString(item.materialText),
    referenceTitle: normalizeString(item.referenceTitle),
    tags: uniqueStrings(item.tags || []),
    sourceType: normalizeString(item.sourceType) || "manual",
    sourceLabel: normalizeString(item.sourceLabel),
    status: normalizeString(item.status) || "draft",
    createdAt: normalizeString(item.createdAt) || new Date().toISOString(),
    updatedAt: normalizeString(item.updatedAt) || new Date().toISOString()
  };
}
```

- [ ] **Step 3: 在数据层实现草稿区读写方法**

```js
export async function loadDraftIdeas() {}
export async function saveDraftIdeas(items = []) {}
export async function upsertDraftIdea(item = {}) {}
export async function deleteDraftIdea(id = "") {}
```

- [ ] **Step 4: 在服务端新增草稿区 API**

```js
GET /api/draft-ideas
POST /api/draft-ideas
PATCH /api/draft-ideas
DELETE /api/draft-ideas
```

- [ ] **Step 5: 运行 API 测试直到通过**

Run: `node --test test/sample-library-api.test.js`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/config.js src/data-store.js src/server.js src/draft-ideas.js data/draft-ideas.json test/sample-library-api.test.js
git commit -m "feat: add draft idea inbox storage and api"
```

### Task 3: 在生成工作台旁落地草稿区 UI

**Files:**
- Modify: `web/index.html`
- Modify: `web/styles.css`
- Modify: `web/app.js`
- Create: `web/draft-ideas-view.js`
- Modify: `test/success-generation-ui.test.js`

- [ ] **Step 1: 新增草稿区面板骨架与列表容器**

```html
<section class="panel generation-draft-inbox-panel" id="generation-draft-inbox-panel">
  <div class="section-heading">
    <div>
      <p class="eyebrow">草稿区</p>
      <h3>待写选题</h3>
    </div>
    <p class="section-note">先把复盘卡、灵感卡和生成候选稿收进来，再决定什么时候开写。</p>
  </div>
  <div id="draft-ideas-list" class="draft-ideas-list"></div>
</section>
```

- [ ] **Step 2: 新增草稿区视图构建函数**

```js
export function renderDraftIdeasList(items = [], helpers = {}) {
  // 空状态、草稿卡、按钮 data-action
}
```

- [ ] **Step 3: 在前端状态与刷新链路中接入草稿区**

```js
appState.draftIdeas = [];
async function refreshDraftIdeas() {}
```

- [ ] **Step 4: 为三个来源补“加入草稿区”按钮**

```js
// account planner card action
// theme inspiration card action
// generation candidate card action
```

- [ ] **Step 5: 草稿区支持载入到生成工作台 / 标记已使用 / 删除**

```js
async function addDraftIdeaFromPlannerCard(card) {}
async function loadDraftIdeaIntoGenerationForm(id) {}
async function patchDraftIdeaStatus(id, status) {}
async function removeDraftIdea(id) {}
```

- [ ] **Step 6: 运行前端测试直到通过**

Run: `node --test test/success-generation-ui.test.js`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add web/index.html web/styles.css web/app.js web/draft-ideas-view.js test/success-generation-ui.test.js
git commit -m "feat: add draft idea inbox ui"
```

### Task 4: 验证端到端交互与最小回归

**Files:**
- Modify: `test/generation-api.test.js`
- Modify: `test/account-planner-ui.test.js`
- Modify: `test/theme-inspirations.test.js`

- [ ] **Step 1: 补端到端测试，确认草稿区不会影响现有复盘与灵感链路**

```js
test("adding planner and inspiration cards to draft inbox preserves their prefill payload", async () => {
  // 断言标题 / briefing / materialText / tags 被保留
});
```

- [ ] **Step 2: 运行目标测试集**

Run: `node --test test/sample-library-api.test.js test/success-generation-ui.test.js test/account-planner-ui.test.js test/generation-api.test.js test/theme-inspirations.test.js`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add test/generation-api.test.js test/account-planner-ui.test.js test/theme-inspirations.test.js
 git commit -m "test: verify draft idea inbox workflow"
```
