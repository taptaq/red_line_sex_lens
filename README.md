# 小红书本地合规检测与改写系统

这是一个本地运行的小红书内容合规工作台，面向两性、身体探索、亲密关系、自我愉悦等高敏内容场景。

它的目标不是“绕过审核”，而是把内容风险、平台反馈、误报样本、样本记录和改写经验持续沉淀下来，逐步形成一个可自进化的内容合规与成稿系统。

快速理解整套链路可以先看：

- [SYSTEM_FLOW.md](./SYSTEM_FLOW.md)
- [docs/seed-lexicon-tiered-checklist.md](./docs/seed-lexicon-tiered-checklist.md)

## 当前能力

- 本地规则检测：基于种子词库、自定义词库、白名单和组合规则判断内容风险。
- 语义复判：对规则结果进行模型复核，识别隐晦表达、擦边语境和误报可能。
- 多模型交叉复判：支持 GLM、Qwen、MiniMax、DeepSeek、Mimo 等 provider 参与复核。
- 合规改写：根据检测结果进行多轮改写，尽量保留原文信息量和表达风格。
- 违规原因回流：记录平台处罚原因，自动生成候选词和候选语境，进入人工复核。
- 误报样本回流：记录平台实际放行样本，用于后续降权提示和白名单候选。
- 样本库沉淀：统一管理参考样本、生命周期记录和风格画像。
- 基准评测面板：在页面里手动维护 benchmark 样本，并直接运行回归评测。
- 笔记生命周期：记录检测、改写、生成稿到发布结果的闭环表现。
- 样本权重体系：按成功等级、确认强度、发布表现和时间新鲜度计算参考权重。
- 规则变更预演：候选词库或白名单生效前，先模拟会影响哪些历史样本。
- 模型表现看板：记录模型调用成功率、超时率、JSON 错误率和平均耗时。
- 自进化成稿：基于主题或草稿生成候选小红书笔记，并自动评分和推荐。

## 页面工作流

启动本地服务：

```bash
npm run server
```

打开：

[http://127.0.0.1:3030](http://127.0.0.1:3030)

主检测台现在按工作流拆成三步：

1. `输入待检测内容`
   填写标题、正文、封面文案和标签。
2. `选择动作`
   分别选择语义复判模型、改写模型、交叉复判模型，再执行检测、改写或复判。
3. `查看检测报告`
   默认优先看规则检测结论，改写结果和交叉复判结果以折叠报告展示，触发对应操作后会自动展开。

页面还包括：

- `违规原因回流`：填写平台违规原因、上传违规截图、识别截图并生成候选补充。
- `自进化成稿工作台`：从零生成或基于草稿优化，输出多个候选稿并推荐更稳的一版。
- `人工复核队列`：人工确认候选词、语境规则或白名单候选。
- `数据维护台`：维护词库、反馈日志、误报样本、改写样本、样本库、基准评测和模型看板。
- `数据维护台 > 样本库`：集中查看 `参考样本 / 生命周期 / 风格画像` 三个子页。
- `参考样本` 不再是一份独立主存储，而是 `note-records` 中被标记为参考内容的兼容视图。
- `生命周期` 继续负责发布结果追踪，但底层同样写入 `note-records`。
- `数据维护台 > 基准评测`：手动逐条录入 `标题 / 正文 / 标签 / 预期类型`，保存样本后可直接运行 benchmark 回归，并查看未匹配样本。

## 项目结构

```text
data/
  lexicon.seed.json          平台与通用规则的初始词库
  lexicon.custom.json        账号专属词库
  whitelist.json             宽松白名单 / 反例语境
  feedback.log.json          违规反馈回流日志
  false-positive-log.json    误报样本日志
  review-queue.json          待人工复核候选项
  rewrite-pairs.json         改写前后样本
  note-records.json          参考样本与生命周期的统一主存储
  success-samples.json       兼容旧路径，迁移后不再作为主数据源
  note-lifecycle.json        兼容旧路径，迁移后不再作为主数据源
  model-performance.json     模型调用表现日志
  style-profile.json         风格画像
  evals/
    review-benchmark.json    基准评测样本集（默认不预置演示样本）
src/
  analyzer.js                本地规则检测引擎
  semantic-review.js         语义复判
  cross-review.js            多模型交叉复判
  glm.js                     模型调用与 DMXAPI / 官方路由
  generation-workbench.js    自进化成稿
  server.js                  本地网页服务
  cli.js                     命令行入口
web/
  index.html                 本地工作台页面
  app.js                     前端交互逻辑
  styles.css                 前端样式
```

## 快速命令

查看当前词库、反馈和队列概况：

```bash
npm run summary
```

检测一段内容：

```bash
npm run analyze -- --title "示例标题" --body "示例正文"
```

检测 JSON 文件：

```bash
npm run analyze -- --file ./your-post.json
```

内容格式：

```json
{
  "title": "标题",
  "body": "正文",
  "coverText": "封面文案",
  "tags": ["标签1", "标签2"]
}
```

导入平台违规反馈：

```bash
npm run ingest-feedback -- --file ./your-feedback.json
```

反馈格式：

```json
{
  "source": "xiaohongshu",
  "title": "你的标题",
  "noteContent": "对应的笔记内容",
  "platformReason": "疑似低俗或导流",
  "decision": "下架",
  "suspiciousPhrases": ["加我", "二维码"]
}
```

运行反馈回流评测：

```bash
npm run eval:feedback
```

运行改写样本评测：

```bash
npm run eval:rewrite-pairs
```

运行基准评测：

```bash
npm run eval:review-benchmark
```

## 模型与环境变量

如果只使用本地规则检测，不配置模型也可以运行。

如果要启用截图识别：

```bash
export GLM_API_KEY="你的 GLM 密钥"
```

如果要启用当前推荐的文本模型路由：

```bash
export DMXAPI_API_KEY="你的 DMXAPI 密钥"
```

当前文本 provider 的默认路由规则：

- `glm / kimi / qwen / deepseek` 文本 helper 默认按 `DMXAPI -> 官方接口` 顺序调用。
- `minimax` 当前是 `DMXAPI-only` provider。
- `mimo` 是独立 provider，默认模型为 `mimo-v2.5-free`。
- 官方 `deepseek` 仍单独展示，默认模型为 `deepseek-v4-flash`。
- 如果没有设置 `DMXAPI_API_KEY`，会自动跳过 DMXAPI，直接走各 provider 官方接口。
- DMXAPI 文本请求使用非流式模式，不设置 `stream: true`。
- 语义复判默认超时为 `60000ms`，可用 `SEMANTIC_REVIEW_TIMEOUT_MS` 覆盖。

常用模型覆盖：

```bash
export GLM_VISION_MODEL="glm-4.6v"
export GLM_TEXT_MODEL="glm-4.6v"
export GLM_CROSS_REVIEW_MODEL="glm-4-flash"
export GLM_DMXAPI_MODEL="glm-5.1-free"

export KIMI_DMXAPI_MODEL="kimi-k2.6-free"
export QWEN_DMXAPI_MODEL="qwen3.5-plus-free"
export MINIMAX_DMXAPI_MODEL="MiniMax-M2.7-free"
export MIMO_DMXAPI_MODEL="mimo-v2.5-free"

export QWEN_FEEDBACK_MODEL="qwen-plus"
export QWEN_CROSS_REVIEW_MODEL="qwen-plus"
export QWEN_SEMANTIC_MODEL="qwen-plus"

export DEEPSEEK_FEEDBACK_MODEL="deepseek-v4-flash"
export DEEPSEEK_CROSS_REVIEW_MODEL="deepseek-v4-flash"
export DEEPSEEK_SEMANTIC_MODEL="deepseek-v4-flash"
```

Kimi 官方接口也支持兼容配置：

```bash
export KIMI_API_KEY="你的 Kimi 密钥"
export KIMI_BASE_URL="https://api.moonshot.cn/v1/chat/completions"
export KIMI_TEXT_MODEL="moonshot-v1-8k"
```

如果你本地使用 `MOONSHOT_API_KEY`，系统会自动兼容映射到 `KIMI_API_KEY`。

## 误报样本如何发挥作用

当系统判定 `manual_review` 或 `hard_block`，但内容实际在平台正常发布，可以在结果区记录为误报样本。

误报样本支持两种状态：

- `platform_passed_pending`：已发出，目前正常，仍在观察期。
- `platform_passed_confirmed`：观察期后仍正常，是更强的反例证据。

已确认误报样本会参与后续检测：

- 命中相似内容时显示降权提示。
- 对非硬拦截的 `manual_review` 可降为 `observe`。
- 自动生成宽松白名单 / 反例规则候选，进入人工复核队列。
- 人工确认后写入 `data/whitelist.json`。
- `hard_block` 不会被误报样本或白名单直接放行，只保留提示，仍需人工判断。

## 规则变更预演

复核队列里的候选词、语境规则和白名单候选，会在确认前展示影响预演。

预演会模拟该候选生效后可能命中的历史数据：

- 成功样本
- 误报样本
- 笔记生命周期
- 违规反馈日志
- 改写前后样本

系统会展示：

- 预计影响多少条历史样本。
- 影响样本的总权重。
- 命中的高权重安全样本。
- 白名单是否会命中过往违规 / 高风险样本。
- 是否存在“可能误杀”或“可能放宽过头”的提醒。

预演只用于辅助人工确认，不会直接修改词库或白名单。

## 模型表现看板

模型表现看板会记录文本模型调用表现，帮助后续判断哪个模型更稳。

当前记录字段包括：

- 调用场景：语义复判、交叉复判、生成、改写、反馈建议、截图识别等。
- provider / route / model：区分 DMXAPI 和官方路由。
- 调用状态：成功或失败。
- 错误类型：超时、JSON 错误、限流、权限、服务端错误等。
- 平均耗时和最近错误。

看板会按场景生成稳定模型建议，并在主检测台的语义复判、改写、交叉复判下拉区展示。当前只做观察统计和推荐提示，不会自动改变模型默认顺序；后续可以基于这份数据做模型自动路由优化。

## 样本库与自进化成稿

样本库用于让系统学习“安全且有效”的表达方式。

当前页面里的 `参考样本` 与 `生命周期` 已统一落到 `data/note-records.json`。为了兼容已有 API 和功能，系统仍会提供 `success-samples` 与 `note-lifecycle` 两种视图，但它们不再是彼此独立的主存储。

系统会为样本计算 `sampleWeight`，后续检测、风格画像和生成参考都会优先使用高权重样本。

参考样本分三档：

- `passed`：仅过审，主要学习安全表达。
- `performed`：过审且表现好，学习结构、标题和内容策略。
- `featured`：人工精选标杆，生成时优先参考。

权重会综合考虑：

- 参考样本等级：`featured` > `performed` > `passed`。
- 误报确认强度：`platform_passed_confirmed` > `platform_passed_pending`。
- 生命周期结果：`positive_performance` > `published_passed` > `limited` / `violation`。
- 互动表现：点赞、收藏、评论越高，权重越高。
- 时间新鲜度：较新的样本会有轻微加权。

表现字段当前记录：

- 点赞数
- 收藏数
- 评论数
- 发布时间
- 人工备注

在 `样本库 > 风格画像` 区域，可以从高权重参考样本生成画像草稿。画像需要人工确认后才会参与正式生成。

风格画像支持版本管理：

- 每个画像可以设置主题，例如亲密关系科普、经验分享、产品软植入。
- 确认画像后会进入版本列表。
- 历史版本可以重新设为当前画像。
- 生成工作台可以从下拉框选择指定画像；不选择时使用当前默认画像。

在 `自进化成稿工作台` 区域，可以：

- 从零输入主题生成笔记。
- 粘贴已有草稿进行优化。
- 自动生成多个候选稿。
- 自动进行规则检测、语义复判、交叉复判、风格评分和完整度评分。
- 对未达到推荐区间的候选稿最多自动修复 1 次。
- 推荐综合更稳的一版，并展示修复后最终稿。

## 笔记生命周期

主检测台的检测结果、改写结果和生成稿都可以保存为生命周期记录；生成工作台的推荐稿会以“最终推荐稿”来源进入生命周期。

这些生命周期记录与参考样本共享同一份主存储，因此一篇内容从“被选为参考”到“发布后表现回填”可以在同一条样本记录里逐步补全。

生命周期记录用于沉淀一篇笔记从“草稿判断”到“发布后表现”的闭环：

- 保存检测 / 改写 / 生成时的内容快照与模型判断。
- 发布后回填状态：未发布、已发布通过、疑似限流、平台判违规、系统误报 / 平台放行、过审且表现好。
- 回填点赞、收藏、评论和人工备注。
- 已发布通过或表现好的最终推荐稿会按权重进入下一次生成参考，形成“生成 -> 发布反馈 -> 再生成”的闭环。
- 同一标题的笔记重复保存会覆盖原记录，避免同一篇内容多条展示。

这部分数据后续会继续服务于风格画像、成功表达归纳和风险规则校准。

## 违规截图回流

页面支持上传违规截图并调用 GLM 识别。

`ingest-feedback` 也支持在 JSON 中携带截图路径：

```json
{
  "noteContent": "这里放对应的笔记内容",
  "screenshotPath": "./screenshots/review-001.png"
}
```

当设置了 `GLM_API_KEY` 后，导入时会自动识别截图并补全：

- `platformReason`
- `suspiciousPhrases`
- `screenshotRecognition`

## 维护建议

- 平台返回的违规原因尽量按原文记录。
- 候选词先进入 `review-queue.json`，人工确认后再进入正式词库。
- 不要只存词，尽量同时维护分类、风险等级、平台原因、来源和备注。
- 误报样本不要直接放行硬拦截，只用于降权提示和白名单候选。
- 参考样本优先保存真实过审、真实表现好的内容，避免污染风格画像。
- 对两性 / 身体探索赛道，重点观察组合风险：
  - 性相关话题 + 未成年人线索
  - 性相关话题 + 导流
  - 性相关话题 + 步骤化教学
  - 身体问题 + 疗效承诺

## 测试

运行全量测试：

```bash
node --test
```

当前项目也包含针对以下链路的测试：

- 标签下拉多选
- 模型选择与 provider 路由
- DMXAPI / 官方兜底
- 误报样本 upsert 与白名单候选
- 样本权重计算与排序
- 规则变更预演
- 模型表现统计
- 样本库、风格画像与权重排序
- 笔记生命周期与发布结果回填
- 生成候选稿评分
- 生成候选稿单次自动修复
- 改写多轮重试

## 公开规则来源

- 小红书规则中心：https://school.xiaohongshu.com/rule
- 网信办《网络信息内容生态治理规定》：https://www.cac.gov.cn/2019-12/20/c_1578375159509309.htm
- 小红书交易导流违规管理细则公开报道：https://finance.sina.cn/2025-03-12/detail-inepkkxp4622323.d.html
