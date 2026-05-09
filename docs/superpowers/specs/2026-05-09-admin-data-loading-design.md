# Admin Data Loading Design

## Goal

为所有依赖 `GET /api/admin/data` 的界面区域补齐一致的 loading 体验，避免首次进入时把“尚未加载”误显示成“暂无数据”，也避免后续刷新时整页闪烁或整页阻塞。

## Scope

本次只覆盖直接消费 `appState.adminData` 的前端区域，不改动其他接口的 loading 行为。

当前明确在范围内的区域：

- 规则维护中的种子词库列表
- 规则维护中的自定义词库列表
- 内太空词条列表
- 违规反馈列表
- 误报案例摘要与列表
- 复核队列
- 依赖 `adminData.styleProfile` 的风格画像入口与展示

不在本次范围内的区域：

- `/api/summary`
- `/api/collection-types`
- `/api/sample-library`
- 各类按钮自身已有的提交中 / 保存中状态

## Chosen Approach

采用“两阶段 loading”：

1. 首次加载时，所有依赖 `adminData` 的区域展示统一占位，不展示“空列表”文案。
2. 后续再次请求 `api/admin/data` 时，保留现有内容，并在对应区域叠加轻量级局部 loading 状态，不使用整页遮罩。

这样可以同时满足：

- 首屏不会把“未加载”误判成“空数据”
- 刷新时不打断其他工作区操作
- 页面不会因为重复清空再重绘而产生明显跳动

## Data Model

前端新增统一的 `adminDataLoading` 状态，至少区分两类场景：

- `initial`
  - 首次请求 `api/admin/data` 尚未完成
  - 相关区域展示占位卡片 / 占位列表
- `refresh`
  - 已有旧数据，正在重新请求
  - 保留旧数据，叠加局部 loading 样式

同时保留一个失败兜底原则：

- 请求失败时，不主动清空现有 `appState.adminData`
- 如果是首次加载失败，则展示错误提示而不是“暂无数据”
- 如果是刷新失败，则保留旧内容并提示刷新失败

## UI Behavior

### First Load

- `adminData` 相关区域统一显示占位内容
- 占位文案统一使用“加载中...”
- 列表型区域优先使用 2-3 条骨架卡片或 muted loading block，而不是空态文案

### Refresh

- 保留当前已渲染内容
- 对当前区块加 `is-loading` 或 `data-loading="true"` 标记
- 样式上通过轻微透明度、顶部 loading 文案或局部遮罩体现刷新中
- 不禁用整页交互，不加整页遮罩

### Empty State

只有在请求成功且对应数据数组确实为空时，才显示现有“当前没有...”类空态文案。

## Rendering Strategy

为避免把 loading 分散到每个列表函数内部，前端采用一个统一入口：

- 在 `refreshAdminDataState()` 周围切换 `adminDataLoading`
- 在 `renderQueue()`、`renderAdminData()`、以及读取 `adminData.styleProfile` 的展示逻辑中判断当前 loading phase
- 各区块在 render 时根据 phase 决定渲染：
  - loading placeholder
  - stale content + loading state
  - normal content
  - error / empty state

## Error Handling

- `api/admin/data` 首次失败：
  - 相关区域显示“加载失败，请稍后重试”类提示
  - 不伪装成空数据
- `api/admin/data` 刷新失败：
  - 保留旧内容
  - 显示轻量错误提示，不清空列表

## Testing

至少覆盖这些回归点：

- 首次加载阶段存在统一 `adminData` loading 状态
- `renderAdminData()` 相关区域在 loading 时不渲染空态文案
- 刷新阶段保留已有内容并带 loading 标记
- 风格画像入口相关展示不会在 `adminData` 未加载时误判为空

## Notes

本次优先复用现有 `muted` / `result-card` / `panel` 风格，避免为 loading 单独引入复杂动画系统。重点是状态正确、感知清晰、改动集中。
