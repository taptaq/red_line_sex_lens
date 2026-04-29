# 2026-04 Review And Generation Calibration

## 本周目标

本周集中完成 4 条校准链路：

- 固定评测集
- 样本信任分层
- 生成候选先淘汰再排序
- 失败原因统一标签

目标不是继续堆功能，而是让现有系统更容易被验证、更容易复盘，也更适合持续迭代。

## 本周执行结果

### 1. 固定评测集

已新增默认评测集并接入 CLI：

- `data/evals/review-benchmark.json`
- `src/evals/review-benchmark-harness.js`
- `node src/cli.js eval-review-benchmark`
- `npm run eval:review-benchmark`

本周还补上了页面维护入口：

- `数据维护台 > 基准评测`
- 支持手动逐条录入 `标题 / 正文 / 标签 / 预期类型`
- 支持页面内直接运行 benchmark，并查看未匹配样本列表

当前仓库已移除默认演示 benchmark 样本，后续评测结果只以人工录入的真实样本为准。

这意味着：

- 首次运行 `eval-review-benchmark` 或页面里的“运行基准评测”时，如果还没有录入真实样本，会直接提示样本为空
- 之后看到的总样本数、匹配率、未匹配样本，都会反映你自己的真实 benchmark 数据
- 周报里不再把演示样本的命中情况当作当前系统基线

### 2. 样本信任分层

已为成功样本和误报样本接入两层新信号：

- `confidence`: `confirmed | pending`
- `sourceQuality`: `manual_verified | imported | unknown`

当前行为：

- `confirmed` 样本权重大于 `pending`
- `manual_verified` 样本权重大于 `imported`
- `unknown` 来源样本不会被丢弃，但会降权
- 人工录入的成功样本默认归为 `confirmed + manual_verified`

这让风格画像和后续生成参考开始更偏向“强证据样本”，减少弱样本带偏系统的风险。

### 3. 生成候选推荐逻辑

生成排序已从“纯总分排序”改成“先分层，再排序”：

- `safe / natural` 的可接受候选优先
- `expressive` 进入第二层
- `manual_review` 再往后
- `hard_block` 最后

同时保留了轻量 `expressive` 降权，避免它因为更饱满、更有张力而轻易抢掉推荐位。

当前回归结果：

- `test/generation-scoring.test.js`: `4/4` 通过

验证点包括：

- 高风险候选不会盖过安全候选
- `expressive` 在同等可接受条件下不会默认抢第一
- 自动修复后的候选仍可正常回到推荐位

### 4. 失败原因统一标签

已新增统一失败原因标签抽取：

- `导流感`
- `功效承诺`
- `标题挑逗感`
- `步骤化敏感内容`
- `敏感词直给`

当前接入位置：

- `analyzePost` 输出 `failureReasonTags`
- `buildAnalysisSnapshot` 保留 `failureReasonTags`
- 生成候选的 `repair.reasonTags` 会从规则建议、语义复判原因和交叉复判原因中统一抽取

这意味着后面做复盘时，可以直接统计：

- 最近误报主要集中在哪类标签
- 生成候选最常卡在哪类标签

## 本次验证命令

本次记录基于以下命令结果：

```bash
node src/cli.js eval-review-benchmark
node --test test/review-benchmark-harness.test.js
node --test test/sample-weight.test.js test/success-samples-store.test.js test/false-positive-store.test.js
node --test test/generation-scoring.test.js
node --test test/generation-api.test.js test/generation-workbench.test.js
node --test test/failure-reason-tags.test.js
node --test test/false-positive-audit.test.js test/false-positive-api.test.js
node --test test/review-benchmark-store.test.js test/review-benchmark-harness.test.js test/review-benchmark-api.test.js
node --test test/benchmark-generation-ui.test.js test/success-generation-ui.test.js
```

## 当前判断

这轮校准之后，系统已经从“功能完整”迈到了“开始可测、可复盘、可调权重”的状态。

已经明显变稳的部分：

- 可以用固定评测集持续看规则变化
- 基准评测不再只靠手改 JSON，页面里可以直接维护和回归
- 样本开始区分强弱证据
- 推荐第一稿不再过度偏向 `expressive`
- 风险原因开始变成可统计标签

还没有完全解决的点：

- 真实 benchmark 样本量目前还需要继续积累
- 当前评测集样本量还小，更适合作为基线，不适合作为最终结论
- 还没有把“标签分布变化”做成单独的周度统计输出

## 下一步建议

下一轮最值得做的不是继续加新模块，而是把这次暴露出的缺口继续收紧：

1. 扩充 `review-benchmark` 到 `30-50` 条，重点补充误报边界样本。
2. 针对 `教育语境 / 关系沟通` 内容，新增一层“潜在误报关注”判定，不急着提高风险，但要能被评测集识别出来。
3. 把 `failureReasonTags` 做成聚合统计输出，接进周报或管理台。
