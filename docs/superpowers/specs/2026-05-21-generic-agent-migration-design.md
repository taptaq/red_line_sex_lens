# Generic-Agent 思路迁移设计

## 目标

把 `datawhalechina/hello-generic-agent` 里最适合当前项目的思路，迁移成这套内容工作台可落地的能力增强。

本次不是引入一个“通用智能体壳子”，而是借它的三个高价值原则：

- 高信息密度上下文
- 分层记忆 / 分层数据使用
- 复盘结果反哺未来生成与预测

目标是让现有系统在这些链路上更稳、更有区分度：

- 生成候选稿
- AI 润色优化
- 主题灵感
- 发布前预测

## 范围

第一阶段只落三个模块：

1. `统一上下文压缩层`
2. `retro 反哺管道`
3. `相似样本检索层复用`

本次不做：

- 通用 agent runtime
- 外部聊天平台集成
- 向量数据库 / embeddings
- 自动爬外部趋势平台
- 全自动规则更新

## 为什么要迁移

当前项目已经积累了很多上下文来源：

- `style-profile`
- `theme-inspirations`
- `reference-materials`
- `note-records`
- `publish prediction`
- `retro`
- `sample-library`
- `qualified reference samples`

这些信息都有价值，但现在的问题是：

- 不同链路各自拼 prompt
- 同类历史证据会重复计算
- retro 更多是“被记录”，不是“被消费”
- 上下文经常偏散、偏长、偏重复

所以借 generic-agent 的最大价值，不是“让项目变成通用 agent”，而是：

**让现有系统先筛选证据，再注入上下文，再做判断。**

## 迁移原则

### 1. 不迁移通用 agent 壳子

当前项目是垂直内容工作台，不是桌面通用 agent。

因此不引入：

- 通用任务编排器
- 多平台对话壳
- 泛化工具调用框架

迁移重点应放在：

- 上下文组织
- 证据复用
- 数据反馈闭环

### 2. 先做“信息组织”，再做“能力扩张”

现在最值钱的不是多接一个模型，而是把已有数据组织得更可用。

因此第一阶段只增强：

- 数据筛选
- 摘要压缩
- 证据排序
- 反哺使用

### 3. 人工确认仍然保留

generic-agent 的“自我进化”思想在这里不能做成无监督自动更新。

当前项目更适合：

- 半自动建议
- 人工确认
- 再进入正式规则 / 风格 / 参考权重

## 模块一：统一上下文压缩层

### 问题

现在多个链路都在做类似事情：

- 找历史参考
- 找风格画像
- 找风险信号
- 找相关证据
- 拼 prompt

但这些逻辑分散在各处，导致：

- 重复计算
- 注入内容不一致
- prompt 体积偏大
- 不同链路用到的“最相关历史证据”标准不统一

### 设计

新增一个统一 helper，例如：

- `buildScopedContextBundle(...)`

输入：

- 当前任务类型
  - `generation`
  - `rewrite`
  - `theme_inspiration`
  - `publish_prediction`
- 当前内容上下文
  - 标题
  - 正文
  - 标签
  - collection type
- 可选约束
  - 最大样本数
  - 最大摘要长度

输出：

- `relevantRecords`
- `relevantReferenceSamples`
- `styleProfileSummary`
- `riskSignalsSummary`
- `predictionEvidenceSummary`
- `retroSignalsSummary`

### 规则

这个 bundle 不返回大段原始内容，而是返回：

- 最相关记录的短摘要
- 明确可用的证据信号
- 最少必要的风格与风险上下文

也就是说：

- 先筛
- 再压缩
- 最后进 prompt

### 第一阶段应用位置

- `src/generation-workbench.js`
- `src/theme-inspirations.js`
- 发布前预测 helper

## 模块二：retro 反哺管道

### 问题

当前 retro 已经越来越结构化了：

- 偏差原因
- 被验证信号
- 被推翻信号
- 规则优化候选

但它们目前主要停留在“填写后保存”的层面，还没有稳定进入后续链路。

### 设计

把 retro 拆成三种下游用途：

1. `预测反哺`
   - 哪些判断经常命中
   - 哪些判断经常失准

2. `风格反哺`
   - 哪些写法被验证有效
   - 哪些结构或标签会被推翻

3. `参考权重反哺`
   - 哪些参考样本类别更容易导向高表现
   - 哪些参考样本对某类内容帮助不大

### 第一阶段输出形态

不直接自动改规则，而是先沉淀为：

- `retroSignalsSummary`
- `retroWeightHints`
- `retroRuleCandidates`

然后分别给：

- 发布前预测
- 主题灵感
- style-profile 更新
- reference ranking

### 边界

`ruleImprovementCandidate` 第一阶段仍是建议，不自动入规则。

## 模块三：相似样本检索层复用

### 问题

现在至少两条链都在找“相似历史内容”：

- `theme-inspirations`
- 发布前预测

后面生成 / 润色其实也会受益于相同能力。

### 设计

新增一个共享的轻量检索 helper，例如：

- `rankRelevantHistoricalRecords(...)`

输入：

- 当前内容标题/正文/标签/collection type
- 候选 records

输出：

- 排序后的相关历史记录
- 每条记录的命中原因摘要

### 排序信号

第一阶段使用便宜、确定性的信号：

- 标签重合
- collection type 一致
- 标题短语命中
- 正文关键词重合
- 历史发布结果加权
- retro / prediction 命中历史加权

### 使用方

#### 主题灵感

不再只依赖粗聚类结果，而是优先看“哪些历史记录真的相似、且表现好”。

#### 发布前预测

证据面板直接展示这个检索结果。

#### 后续可接入生成 / 润色

作为 prompt 上下文的“相关历史样本候选”。

## 数据分层建议

虽然第一阶段不实现完整“分层记忆系统”，但建议按使用方式分层理解现有数据：

### L1 索引层

- tags
- collectionType
- 标题短语
- 风险标签

### L2 事实层

- note-records
- publish 结果
- calibration prediction / retro

### L3 经验层

- style-profile
- retro 提炼信号
- theme inspirations
- rule candidates

### L4 归档层

- 旧灵感
- 旧 evidence
- 历史参考结果

第一阶段实现时，不需要正式建四层存储，只需要在 helper 设计里按这种思路消费数据。

## 落点建议

### 新增/增强 helper

- 上下文压缩 helper
- 相似样本排序 helper
- retro 信号摘要 helper

### 优先接入链路

1. 发布前预测
2. 主题灵感
3. 生成候选稿
4. AI 润色优化

## UI 影响

第一阶段 UI 变化应尽量少。

主要只体现在：

- 发布前预测 evidence 更清晰
- 主题灵感更像“真正的新角度”
- 生成 / 润色结果背后的参考更聚焦

不新增一个“generic agent 控制台”。

## 非目标

本次不做：

- 一个新的 agent 页面
- 自主规划 / tool calling agent
- 自动规则写入
- 外部趋势数据接入
- 对话式任务编排器

## 测试重点

至少要补这些方向：

- 上下文 bundle 会筛掉无关样本
- 相似样本排序在不同任务里复用结果一致
- retro 结果会真正影响 prediction / inspiration / reference ranking
- prompt 注入不再重复塞大段原文
- 旧数据在无新层字段时仍能正常工作

