# 小红书本地合规检测与改写系统

这是一个本地运行的小红书内容合规工作台，面向两性、身体探索、亲密关系、自我愉悦等高敏内容场景。

它的目标不是“绕过审核”，而是把内容风险、平台反馈、误报样本、样本记录和改写经验持续沉淀下来，逐步形成一个可持续学习的内容合规与成稿系统。

快速理解整套链路可以先看：

- [SYSTEM_FLOW.md](./SYSTEM_FLOW.md)
- [docs/seed-lexicon-tiered-checklist.md](./docs/seed-lexicon-tiered-checklist.md)

## 当前产品结构

当前版本的主界面已经收敛成 4 个高频工作面，外加 1 个紧贴主工作台的独立发现区：

1. `内容工作台`
   内容检测、合规改写、生成新内容。
2. `反馈回流`
   快速记录真实违规反馈，需要时再展开截图识别与候选补充。
3. `学习样本 / 误判与好样本回流`
   统一承接人工复核、误报回流、样本记录、生命周期和系统校准。
4. `草稿区`
   把账号复盘卡、主题灵感卡、生成候选稿一键收成待写选题，再回填到生成工作台。
5. `同类爆文专区`
   独立放在内容工作台下方，按账号自动匹配同赛道爆文，也支持手动筛选、手动刷新和分组浏览。

低频能力例如词库维护、人工复核明细、基准评测、模型看板，都还保留，但已经下沉到折叠区、弹窗或系统校准区，不再和主任务并排抢注意力。

## 当前能力

- 本地规则检测：基于种子词库、自定义词库、白名单和组合规则判断内容风险。
- 外部违禁词检测：在内容检测里补一层小红书外部违禁词库校验，并按严重度影响综合结论。
- 语义复判：对规则结果进行模型复核，识别隐晦表达、擦边语境和误报可能。
- 多模型交叉复判：支持 GLM、Qwen、MiniMax、DeepSeek 等 provider 参与复核。
- 合规改写：根据检测结果进行多轮改写，尽量保留原文信息量和表达风格，同时复用小红书风格成稿约束，补齐标题、emoji 和 tags。
- 生成新内容：支持从零起稿或基于草稿优化，可补充近期小红书爆文规律，并推荐更稳的一版。
- 违规原因回流：记录平台处罚原因，自动生成候选词和候选语境，进入人工复核。
- 误报样本回流：记录平台实际放行样本，用于后续降权提示和白名单候选。
- 样本库沉淀：统一管理样本记录、参考属性、生命周期和风格画像。
- 账号级复盘：优先基于参考样本、效果好样本与外部样本，生成下一篇 Planner 卡。
- 小红书账号诊断：查询单账号或多账号数据，补充同阶对标、同类爆文信号与 30 分钟后自动补采。
- 同类爆文专区：独立浏览 `dailyTop / weeklyTop / lowTop` 三类同赛道信号，使用单独 API 和缓存，不依赖账号诊断结果。
- 链接素材采集（link-note-saver）：从小红书、网页、视频链接自动提取内容并生成小红书传播拆解，一键保存为外部参考样本。详见 [link-note-saver 集成说明](./docs/link-note-saver-integration.md)。
- 主题灵感：从高表现样本提炼切入角度，并可直接回填到生成工作台。
- 草稿区：把复盘卡、灵感卡和生成候选稿收成可排序、可筛选的待写选题池。
- 笔记生命周期：记录检测、改写、生成稿到发布结果的闭环表现。
- 样本权重体系：按成功等级、确认强度、发布表现和时间新鲜度计算参考权重。
- 规则变更预演：候选词库或白名单生效前，先模拟会影响哪些历史样本。
- 内太空术语工作区：维护赛道术语、别名、合集适配与提示文案，给改写与生成链路补充稳定上下文。

## 页面工作流

启动本地服务：

```bash
npm run server
```

打开：

[http://127.0.0.1:3030](http://127.0.0.1:3030)

页面首页现在优先暴露主任务：

1. `顶部任务卡`
   显示当前待处理复核、待回流反馈、待补全样本、待确认画像、生命周期记录，并支持直接跳转到对应区域。
2. `主工作台`
   用 tab 切换 `内容检测` 与 `生成新内容` 两种主模式。

`内容检测` 仍按三步推进：

1. `输入待检测内容`
   填写标题、正文、封面文案、合集类型和标签。
2. `选择动作`
   分别选择语义复判模型、改写模型；交叉复判已降级到 `高级判断`。
3. `查看检测报告`
   默认优先看规则检测结论，改写结果和交叉复判结果以折叠报告展示。

当前 `规则检测` 卡里除了本地规则命中，还会补充：

- 小红书外部违禁词摘要
- 命中词与替换建议
- 外部检测是否抬高了综合结论
- 若外部检测失败，明确提示 `结果不完整`

`生成新内容` 已并入主工作台，不再是独立大区：

- 支持从零生成。
- 支持基于草稿优化。
- 支持选择当前风格画像与合集类型。
- 生成多个候选稿后给出推荐结果。
- 可基于 Redfox 近期爆文数据提炼 `爆款公式来源`，辅助标题、开头、结构、标签和互动话术。
- 支持打开 `主题灵感` 弹窗拿切入角度。
- 支持把复盘卡 / 灵感卡 / 生成候选稿加入 `草稿区`，再一键载入回生成工作台。

旧文档里提到的 `自进化成稿工作台`，现在已经并入主工作台的 `生成新内容` 模式。

主工作台下方现在还有一块独立的 `草稿区`：

- 默认按 `待写 / 已使用` 两个视图切换。
- 支持按 `最近加入 / 最早加入` 排序。
- 点 `载入生成工作台` 会自动切到 `生成新内容` tab 并滚动到对应区域。

在 `内容工作台` 下方现在还单独放了一块 `同类爆文专区`：

- 位置固定在主工作台后面，和 `草稿区` 一样作为独立区块浏览，不挤进账号诊断结果面板。
- 支持先填小红书号自动匹配账号赛道，也支持手动补充赛道、关键词和标签。
- 支持按 `今日起量 / 7日爆文 / 低粉高表现` 三类切换浏览。
- 使用独立 `GET /api/xhs/top-signals` 与 `POST /api/xhs/top-signals` 接口。
- 最近一次结果会单独缓存到 `data/xhs-top-signals.json`，不和账号诊断缓存共用，也不依赖账号诊断先跑完。

样本与回流区域当前按真实工作流拆成三块：

- `人工复核`
  主页面只保留轻量入口，完整操作在弹窗里完成。
- `回流反馈`
  统一处理待优先反馈、违规反馈和误报案例。
- `学习样本 / 好样本沉淀`
  维护样本记录、参考属性、生命周期、账号级复盘与系统校准。

样本区旁边现在还单独保留了一块 `账号诊断`：

- 支持单账号诊断与多账号对比。
- 支持查看最近一次缓存结果与本地 HTML / JSON 报告。
- 单账号结果会额外补充 `同类今日起量 / 同类七日稳定 / 同类低粉可复制` 三类匹配信号。
- 当 Redfox 侧数据还不完整时，可以发起一次 `30 分钟后自动重查` 的补采订阅。

样本库当前已经改成步骤式维护：

1. `基础内容`
2. `参考属性`
3. `生命周期属性`
4. `预判复盘`

样本列表会直接提示每条记录当前的 `卡点`，例如：

- `卡点：基础内容`
- `卡点：参考属性`
- `卡点：生命周期`
- `卡点：预判复盘`
- `已完成校准闭环`

此外，样本列表和系统校准区现在还会补充两类校准辅助信息：

- 列表里直接显示 `待复盘 / 已命中 / 有偏差` 和预判风险 pill。
- `系统校准` 折叠区里可以运行历史回放验证，并查看批量复盘队列。

## 项目结构

```text
data/
  account-planner-summary.json  账号级复盘的最近一次聚合结果
  analyze-tag-options.json      分析台自定义标签选项
  draft-ideas.json              草稿区待写选题池
  external-reference-samples.json 外部参考样本
  lexicon.seed.json          平台与通用规则的初始词库
  lexicon.custom.json        账号专属词库
  whitelist.json             宽松白名单 / 反例语境
  feedback.log.json          违规反馈回流日志
  false-positive-log.json    误报样本日志
  inner-space-terms.json     内太空术语与别名配置
  review-queue.json          待人工复核候选项
  rewrite-pairs.json         改写前后样本
  note-records.json          样本记录、参考属性与生命周期的统一主存储
  success-samples.json       兼容旧路径，迁移后不再作为主数据源
  note-lifecycle.json        兼容旧路径，迁移后不再作为主数据源
  style-profile.json         风格画像
  theme-inspirations.json    主题灵感缓存
  xhs-top-signals.json       同类爆文专区最近一次独立缓存
  xhs-account-diagnosis.json 最近一次账号诊断结果缓存
  xhs-account-diagnosis-subscriptions.json 账号诊断补采订阅
  xhs-account-diagnosis-report-data.json    最近一次账号诊断 JSON 报告
  xhs-account-diagnosis-report.html         最近一次账号诊断 HTML 报告
src/
  account-planner.js         账号级复盘与 Planner 建议
  account-planner-import.js  外部样本导入解析
  analyzer.js                本地规则检测引擎
  semantic-review.js         语义复判
  cross-review.js            多模型交叉复判
  draft-ideas.js             草稿区数据结构
  glm.js                     模型调用与 DMXAPI / 官方路由
  generation-workbench.js    生成工作台
  inner-space-terms.js       赛道术语过滤与提示拼装
  server.js                  本地网页服务
  cli.js                     命令行入口
  theme-inspirations.js      主题灵感提炼
  xhs-account-diagnosis.js   小红书账号诊断聚合
  xhs-account-diagnosis-subscriptions.js 账号诊断补采调度
web/
  account-planner-view.js    账号级复盘视图
  draft-ideas-view.js        草稿区视图
  index.html                 本地工作台页面
  app.js                     前端交互逻辑
  styles.css                 前端样式
  theme-inspiration-view.js  主题灵感视图
  xhs-account-diagnosis-view.js 账号诊断视图
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

检查当前 note records 是否都已具备账号复盘摘要：

```bash
node src/cli.js planner:check-summaries
```

批量回填缺失的账号复盘摘要：

```bash
node src/cli.js planner:backfill-summaries
```

## AI 记忆共享层

第一版 AI 记忆保留现有 JSON 事实层，在 `data/memory/` 下维护本地检索文档、记忆卡片与索引元数据。

重建 memory 检索文档、卡片与 embeddings：

```bash
npm run memory:rebuild
```

查看当前 memory 摘要：

```bash
npm run memory:inspect
```

审计当前 memory 状态分布与异常卡片：

```bash
npm run memory:audit
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

- `glm` 改写 / 生成 / 语义链路默认优先 `DMXAPI`，失败后再回退官方。
- `kimi` 作为改写 / 生成 provider 时默认走官方接口。
- `qwen`、`minimax` 和独立 `DMXAPI` 文本模型（如 `gemini-3.5-flash`、`gpt-5.4`、`claude-sonnet-4-6-ssvip`、`grok-4.2-nothinking`）走 DMXAPI。
- `deepseek` 当前默认走官方接口。
- DMXAPI 文本请求使用非流式模式。
- 语义复判默认超时为 `60000ms`，可用 `SEMANTIC_REVIEW_TIMEOUT_MS` 覆盖。
- 全部模型对比检测（cross review）默认超时为 `30000ms`，可用 `CROSS_REVIEW_TIMEOUT_MS` 覆盖。
- 改写主轮次默认 `REWRITE_MAX_TOKENS=4200`。

如果要启用账号诊断：

```bash
export REDFOX_API_KEY="你的 Redfox 密钥"
```

同一个 `REDFOX_API_KEY` 现在也会用于：

- 账号诊断
- 同类爆文专区
- 小红书外部违禁词检测

常用模型覆盖：

```bash
export GLM_VISION_MODEL="glm-4.6v"
export GLM_TEXT_MODEL="glm-4.6v"
export GLM_CROSS_REVIEW_MODEL="glm-4-flash"
export GLM_DMXAPI_MODEL="glm-5.1"

export QWEN_DMXAPI_MODEL="qwen3.5-plus-2026-02-15"
export MINIMAX_DMXAPI_MODEL="MiniMax-M2.5"

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
export KIMI_TEXT_MODEL="kimi-k2.6"
```

如果你本地使用 `MOONSHOT_API_KEY`，系统会自动兼容映射到 `KIMI_API_KEY`。

## 回流中心如何发挥作用

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

`回流中心` 当前会优先把这些项排在前面：

- 尚未记录处理结果的违规反馈
- 尚未确认的误报样本
- 最新进入回流的记录

## 样本库与生成工作流

样本库用于让系统学习“安全且有效”的表达方式。

当前页面里的 `参考样本` 与 `生命周期` 已统一落到 `data/note-records.json`。为了兼容已有数据结构，系统内部仍会生成 `success-samples` 与 `note-lifecycle` 两种视图，但它们只是从 `note-records` 派生出来的兼容视图，不再是独立 API 主入口。

一条样本记录现在通常按这条链路补完：

1. 保存基础内容
2. 判断是否启用为参考样本
3. 发布后回填生命周期结果

样本库详情已经改成步骤流；保存上一步后，页面会自动推进到下一步。

系统会为样本计算 `sampleWeight`，后续检测、风格画像和生成参考都会优先使用高权重样本。

账号级复盘当前的输入优先级是：

- `参考样本`
- `效果好样本`（`publish.status = positive_performance`）
- `外部参考样本`

如果近期没有稳定高表现样本，系统会自动退到 `已发布内容的观察型建议`，而不是直接不给结果。

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

在 `样本库 > 风格画像` 区域，可以从高权重参考样本生成画像草稿。画像默认偏自动沉淀，只有需要校准时再人工确认或编辑。

为了避免把测试/占位内容污染正式样本，当前测试约定也已经统一到临时 `note-records.json` 上；真实业务数据只应该由页面操作、导入流程或正式 API 写入。

风格画像支持版本管理：

- 每个画像可以设置主题，例如亲密关系科普、经验分享、产品软植入。
- 确认画像后会进入版本列表。
- 历史版本可以重新设为当前画像。
- 生成工作台可以从下拉框选择指定画像；不选择时使用当前默认画像。

在主工作台的 `生成新内容` 模式中，可以：

- 从零输入主题生成笔记。
- 粘贴已有草稿进行优化。
- 自动生成多个候选稿。
- 自动进行规则检测、语义复判、交叉复判、风格评分和完整度评分。
- 可额外参考近期爆文公式，并在结果里展示 `爆款公式来源` 与 2-3 篇参考笔记。
- 对未达到推荐区间的候选稿最多自动修复 1 次。
- 推荐综合更稳的一版，并展示修复后最终稿。

## 笔记生命周期

主工作台的检测结果、改写结果和生成稿都可以保存为生命周期记录；推荐稿会以“最终推荐稿”来源进入生命周期。

这些生命周期记录与参考样本共享同一份主存储，因此一篇内容从“被选为参考”到“发布后表现回填”可以在同一条样本记录里逐步补全。

生命周期记录用于沉淀一篇笔记从“草稿判断”到“发布后表现”的闭环：

- 保存检测 / 改写 / 生成时的内容快照与模型判断。
- 发布后回填状态：未发布、已发布通过、疑似限流、平台判违规、系统误报 / 平台放行、过审且表现好。
- 回填点赞、收藏、评论和人工备注。
- 已发布通过或表现好的最终推荐稿会按权重进入下一次生成参考，形成“生成 -> 发布反馈 -> 再生成”的闭环。
- 同一标题的笔记重复保存会覆盖原记录，避免同一篇内容多条展示。

## 账号诊断

账号诊断会把 Redfox 账号数据、本地对标整理和同类爆文信号放到同一个结果面板里。

当前支持：

- 单账号诊断：返回账号基础信息、近 30 天核心指标、优势 / 风险 / 下一步动作。
- 多账号对比：一次输入多个小红书号，生成并排对比结果。
- 同类信号补充：对单账号结果补充 `dailyTop / weeklyTop / lowTop` 三类匹配样本。
- 自动补采：如果首次结果不完整，可以订阅一次 30 分钟后的自动重查。
- 报告落盘：最近一次结果会同步写入 HTML 报告和 JSON 报告，方便回看或继续处理。

相关接口：

- `POST /api/xhs/account-diagnosis`
- `POST /api/xhs/account-diagnosis/subscribe`
- `GET /api/xhs/account-diagnosis`
- `GET /api/xhs/account-diagnosis/report`
- `GET /api/xhs/account-diagnosis/report-data`

## 同类爆文专区

`同类爆文专区` 是放在内容工作台下方的独立浏览区，不再绑定在账号诊断链路里使用。

当前支持：

- 账号自动匹配：只填小红书号时，优先按账号上下文推断同赛道信号。
- 手动筛选：可额外指定赛道、关键词和标签，单独刷新结果。
- 分类切换：分别浏览 `dailyTop`、`weeklyTop`、`lowTop` 三类样本。
- 独立缓存：最近一次结果单独写入 `data/xhs-top-signals.json`。
- 独立接口：通过 `GET /api/xhs/top-signals` 读取缓存，通过 `POST /api/xhs/top-signals` 主动刷新。

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
- 样本库、风格画像与权重排序
- 样本库步骤流与卡点提示
- 回流中心优先级提示
- 笔记生命周期与发布结果回填
- 生成候选稿评分
- 生成候选稿单次自动修复
- 改写多轮重试
- 账号诊断、补采订阅与报告落盘
- 测试环境下 `note-records` 等路径隔离，避免示例数据写回真实 `data/*.json`

## 公开规则来源

- 小红书规则中心：https://school.xiaohongshu.com/rule
- 网信办《网络信息内容生态治理规定》：https://www.cac.gov.cn/2019-12/20/c_1578375159509309.htm
- 小红书交易导流违规管理细则公开报道：https://finance.sina.cn/2025-03-12/detail-inepkkxp4622323.d.html
