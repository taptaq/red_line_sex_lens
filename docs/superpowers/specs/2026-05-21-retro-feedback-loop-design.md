# Retro 反哺 Style Profile 与 Reference Ranking 设计

## 目标

把当前已经结构化保存的 retro 结果，真正接入后续系统能力，而不只是停留在“填写后存档”。

本次只落两条反哺链：

1. `retro -> style-profile`
2. `retro -> reference ranking`

目标是让这些人工复盘结果，开始影响：

- 风格画像的自动沉淀
- 参考样本的排序与权重

## 范围

本次只使用当前项目已有数据：

- `note-records`
- `calibration.prediction`
- `calibration.retro`
- `style-profile`
- `qualified reference samples`
- `sample-weight`

本次不做：

- 自动修改审核规则
- 自动修改词库
- 向量数据库
- 新建外部服务

## 为什么要做

现在 retro 已经越来越结构化：

- 偏差原因
- 被验证信号
- 被推翻信号
- 规则优化候选

但这些信息目前的主要问题是：

- 存下来了
- 但没怎么被后面的链路用起来

所以最直接的价值提升，不是继续加更多填写字段，而是让这些复盘结果真正改变：

- 什么样本更值得被参考
- 什么风格信号更该被保留
- 什么历史判断以后该少信一点

## 链路一：retro -> style-profile

### 问题

当前 `style-profile` 的自动沉淀主要还是从高质量参考样本出发，总结：

- 标题风格
- 正文结构
- 语气
- 偏好标签
- 避免表达
- 生成指导

但它缺少来自 retro 的“负反馈修正”。

比如：

- 某种标题结构经常被验证有效
- 某种标签判断经常失准
- 某种开头切口在实际发布后并没有你以为的效果

这些都应该进入 style-profile 的更新依据。

### 设计

新增一个 retro 摘要 helper，例如：

- `buildRetroWeightHints(records)`

输出：

- `validatedSignals`
- `invalidatedSignals`
- `ruleCandidates`
- `styleHints`

其中 `styleHints` 可以映射为：

- 哪类标题结构被验证有效
- 哪类表达方式被推翻
- 哪类标签选择更稳
- 哪类正文长度判断更常命中

### 第一阶段接入方式

不是直接改写 `style-profile` 字段，而是：

1. 先把 retro 的 style hints 拼进 style profile prompt
2. 作为“额外摘要上下文”提供给画像生成
3. 保持人工 overrides 优先级不变

这样更稳，不会因为一条 retro 就把画像直接改坏。

## 链路二：retro -> reference ranking

### 问题

当前 `sample-weight` 已经会参考：

- tier
- status
- metrics
- recency
- confidence

但还没真正吃到 retro。

实际更合理的是：

- 被 retro 认定“应转参考样本”的，应该更有权重
- 多次被验证信号支持的样本，应该更有参考价值
- 被推翻信号较多的样本，即使通过，也不应该被过度信任

### 设计

在 `sample-weight` 或相邻 helper 中增加 retro 加权逻辑。

第一阶段建议只引入这几个简单信号：

- `shouldBecomeReference === true`
  - 增加正向权重
- `validatedSignals.length`
  - 小幅正向加权
- `invalidatedSignals.length`
  - 小幅负向加权
- `ruleImprovementCandidate`
  - 不直接加权，但作为解释依据保留

### 接入边界

这个 retro 加权只影响：

- 参考样本排序
- 相关样本优先级

不直接决定：

- 是否自动变成 featured
- 是否自动修改参考属性

## 推荐实现方式

### 新增 helper

- `src/retro-feedback.js`
  - 汇总 retro 信号
  - 输出 style hints
  - 输出 reference weight hints

### 接入位置

- `src/style-profile.js`
  - 在自动画像生成时，把 retro style hints 加进 prompt 或本地摘要

- `src/sample-weight.js`
  - 在现有 sample weight 计算中叠加 retro 权重

- `src/context-bundle.js`
  - 可选地把 retroSignalsSummary 进一步细化

## 规则建议

### style-profile 侧

- 只让 retro 提供“修正线索”
- 不直接硬覆盖画像字段
- 人工 override 永远优先

### reference ranking 侧

- retro 只做加减权
- 不直接决定样本身份
- 权重变化保持温和，避免一次复盘把排序拉爆

## 测试重点

至少补这些回归：

- retro validated signals 会影响 style-profile 生成上下文
- retro invalidated signals 会进入 style hints
- `shouldBecomeReference` 会提升 sample weight
- `invalidatedSignals` 会压低 sample weight
- 老记录没有 retro 时仍保持原逻辑

