# API Performance Optimization Design

## Goal

系统性提升当前产品里“所有用户可感知接口”的加载速度，重点覆盖：

- 首屏进入与后台维护区进入
- 学习样本、规则维护、误报/反馈等高频读接口
- 写操作后的刷新链路
- 检测、改写、生成、交叉复判等模型链路的非必要等待

本次目标不是“绝对实时到 0 延迟”，而是采用用户已接受的策略：

1. 先展示最近一次可用数据
2. 再后台静默刷新
3. 写后立即失效相关缓存，避免长期脏数据

## Current Bottlenecks

### 首屏链路过重

当前 `refreshAll()` 虽然对 `/api/summary` 和 `/api/collection-types` 做了并发，但后续仍会顺序等待：

- `/api/admin/data`
- `/api/sample-library`

因此任意一个慢接口都会拖住整页完成态。

### 读接口混入重计算

`GET /api/admin/data` 当前会同步触发 `refreshAutoStyleProfile()`，把风格画像重生成放进高频读路径里，导致：

- 学习样本页进入慢
- 规则维护区刷新慢
- 任意依赖 `adminData` 的区块都被画像生成拖慢

### 写后过度全量刷新

大量前端写操作结束后仍然直接 `await refreshAll()`，会导致：

- 保存一条记录后整页多个接口全部重拉
- 一次小改动引发无关区块刷新
- 用户感知到“局部操作引发全局卡顿”

### 高频 GET 缺少短缓存与并发去重

下列接口是典型高频读取：

- `/api/summary`
- `/api/admin/data`
- `/api/sample-library`
- `/api/collection-types`
- `/api/model-options`
- `/api/analyze-tag-options`

它们当前基本都会重新走到底层读盘、聚合和转换逻辑，没有统一的短 TTL 和 in-flight 去重。

## Chosen Approach

采用“四层提速”组合方案：

1. 前端快照直出 + 后台刷新
2. 后端高频 GET 短缓存 + in-flight 去重
3. 将风格画像重生成从读接口拆出，改为后台刷新
4. 写操作后改为局部刷新，不再一律全量 `refreshAll()`

这是本次推荐方案，因为它同时提升：

- 首屏体感速度
- 接口真实响应时间
- 日常编辑/保存流畅度
- 模型链路的可等待时间

## Frontend Strategy

### Bootstrap Snapshot

前端为以下数据增加本地快照：

- `summary`
- `adminData`
- `sampleLibraryRecords`
- `collectionTypeOptions`
- `modelOptions`
- `analyzeTagOptions`

快照策略：

- 动态业务数据：
  - `summary`
  - `adminData`
  - `sampleLibraryRecords`
  - 建议 `maxAge = 30s`
- 低变更配置数据：
  - `collectionTypeOptions`
  - `modelOptions`
  - `analyzeTagOptions`
  - 建议 `maxAge = 10min`

首次进入页面时：

1. 先读取本地快照
2. 如果快照有效，立即渲染
3. 各区块进入“刷新中”而非“空白中”
4. 后台并发拉取最新数据
5. 任一接口返回后立刻只更新对应区块并覆盖本地快照

### Incremental Refresh

`refreshAll()` 调整为 bootstrap orchestration，而不是单条重链路。职责变为：

- 首屏或显式全量刷新时启动所有子刷新
- 自身不再串行等待每个区块后再统一渲染

新增独立刷新函数：

- `refreshSummaryState()`
- `refreshAdminDataState()`
- `refreshSampleLibraryWorkspace()`
- `loadCollectionTypeOptions()`
- `loadModelSelectionOptions()`
- `loadAnalyzeTagOptions()`

它们各自负责：

- loading 切换
- 接口读取
- 更新对应 state
- 覆盖本地快照
- 只重渲染自己的 UI

## Backend Strategy

### Read Cache

新增进程内运行时缓存层，用于 GET 接口读通道：

- 支持 `ttlMs`
- 支持 in-flight request dedupe
- 支持按 key / tag 失效

建议 TTL：

- `/api/summary`: `5s`
- `/api/admin/data`: `10s`
- `/api/sample-library`: `10s`
- `/api/collection-types`: `5min`
- `/api/model-options`: `5min`
- `/api/analyze-tag-options`: `5min`

### Invalidation

缓存失效不依赖自然过期，而是以“写后精准失效”为主：

- 学习样本变更：
  - 失效 `sample-library`
  - 失效 `summary`
  - 失效 `admin-data`
- 误报、反馈、复核队列变更：
  - 失效 `summary`
  - 失效 `admin-data`
- 词库、内太空、画像变更：
  - 失效 `admin-data`
- 标签、合集类型、模型配置变更：
  - 失效各自配置缓存

## Style Profile Strategy

### Remove Heavy Refresh from GET

`GET /api/admin/data` 不再同步触发 `refreshAutoStyleProfile()`。

改为：

- 直接读取当前已存储的 style profile 视图
- 返回当前画像与参考样本关联状态
- 如存在“待刷新画像”标记，也只返回当前可用画像，不阻塞主响应

### Background Refresh

以下动作触发后台画像刷新：

- 新增参考样本
- 删除参考样本
- 修改参考样本的启用状态
- 修改参考层级或其他会改变参考池归属的字段
- 批量导入后新增参考样本

刷新方式：

- 服务端调度单飞后台任务
- 同一时刻只允许一个画像刷新任务运行
- 刷新完成后更新持久化画像
- 同时失效 `admin-data` 相关缓存

接口返回行为：

- 写接口立即返回业务结果，不阻塞等待画像完成
- 可额外返回 `styleProfileRefreshQueued: true`
- 前端若收到该标记，可静默补拉 `/api/admin/style-profile` 或 `/api/admin/data`

## Write Path Strategy

### Replace Global Refreshes

写操作完成后按影响范围局部刷新：

- 样本记录新增/编辑/删除：
  - 直接使用返回的 `items`
  - 局部更新学习样本区
  - 再补刷新 `summary`
  - 如参考池受影响，再静默补刷新 style profile
- 误报、反馈、复核操作：
  - 刷新 `adminData`
  - 刷新 `summary`
- 词库、内太空变更：
  - 只刷新 `adminData`

仅在跨多个域且局部回补成本明显更高时，才保留 `refreshAll()`。

## Model Route Strategy

### Parallelize Independent Reads

对模型链路做“非功能变更型提速”，不改模型业务结果，只减少等待：

- `POST /api/rewrite`
  - 将 `buildMergedAnalysis`
  - `retrieveForRewrite`
  - `loadInnerSpaceTerms`
  - 改为并行准备，可在最终合并时再使用结果
- `POST /api/generate-note`
  - 校验完合集类型后，继续并发准备：
    - `loadStyleProfile`
    - `loadQualifiedReferenceSamples`
    - `loadInnerSpaceTerms`
    - `retrieveForGeneration`
- 配置类读取优先使用运行时缓存，减少每次读盘

## Consistency Rules

本次优化必须遵守以下一致性原则：

1. 快照只用于“秒开”和短暂过渡，不作为长期数据源
2. 任意写操作后，相关快照必须立刻清除或覆盖
3. 相关后端缓存必须在写后失效
4. 风格画像即使后台刷新，也必须保持“当前有可用展示值”
5. 前端不可因为提速而回退到长期显示旧数据

## Testing

至少覆盖这些回归点：

- 首屏可从快照恢复，不必等待所有接口返回
- `refreshAll()` 改为并发启动子刷新，而不是串行依赖
- 高频 GET 缓存存在 TTL 与失效逻辑
- `GET /api/admin/data` 不再同步调用画像重生成
- 样本写接口在参考池变化时只排队画像刷新，不阻塞主响应
- 写操作完成后不再一律触发 `refreshAll()`
- 局部刷新后页面状态和计数仍然正确

## Notes

本次优先优化“读取路径、刷新策略、后台重活拆分”。不在本次范围内的内容：

- 数据库存储迁移
- 长期离线任务系统
- 将所有大文件立即重构成细粒度模块

后续若还需要继续压榨性能，再看是否引入更细的文件级缓存、后台任务监控或性能埋点。
