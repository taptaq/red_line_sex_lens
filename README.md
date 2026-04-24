# 小红书本地合规检测系统

这是一个零依赖、本地运行的最小可用项目，用来帮助你为小红书内容建立：

- 敏感风险词库
- 平台违规原因回流日志
- 候选词人工复核队列
- 标题/正文/封面文案的本地检测

它的目标是帮助你做内容合规，不是帮助绕过平台审核。

如果你想快速看懂整套链路，可以先看：

- [SYSTEM_FLOW.md](./SYSTEM_FLOW.md)
- [docs/seed-lexicon-tiered-checklist.md](./docs/seed-lexicon-tiered-checklist.md)

## 项目结构

```text
data/
  lexicon.seed.json       平台与通用规则的初始词库
  lexicon.custom.json     你手动维护的账号专属词库
  whitelist.json          合规科普与教育语境白名单
  feedback.log.json       违规反馈回流日志
  false-positive-log.json 误报样本回流日志
  review-queue.json       待人工复核的候选词
src/
  analyzer.js             核心检测引擎
  cli.js                  命令行入口
  data-store.js           数据读取与写回
  normalizer.js           文本标准化
  risk-rules.js           组合型规则
  server.js               本地网页服务
web/
  index.html              本地面板
  app.js                  前端逻辑
  styles.css              前端样式
```

## 快速开始

### 1. 查看当前词库与反馈概况

```bash
npm run summary
```

如果你想先按“硬拦截 / 人工复核 / 观察项”三层快速看当前种子词库，可以直接看：

- [docs/seed-lexicon-tiered-checklist.md](./docs/seed-lexicon-tiered-checklist.md)

### 2. 检测一段文本

```bash
npm run analyze -- --title "示例标题" --body "示例正文"
```

也可以检测你自己整理的 JSON 文件：

```bash
npm run analyze -- --file ./your-post.json
```

文件内容支持对象格式：

```json
{
  "title": "标题",
  "body": "正文",
  "coverText": "封面文案",
  "tags": ["标签1", "标签2"]
}
```

### 3. 回流违规反馈

把你拿到的平台违规原因整理成 JSON，然后导入：

```bash
npm run ingest-feedback -- --file ./your-feedback.json
```

单条结构示例：

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

导入后，系统会：

- 追加到 `data/feedback.log.json`
- 生成待复核候选项到 `data/review-queue.json`
- 不会自动把候选词直接加进正式词库

### 4. 运行回流评测 Harness

如果你想验证“截图提词、候选词过滤、是否会误入库”这条链路，可以直接跑：

```bash
npm run eval:feedback
```

默认会读取：

```text
data/evals/feedback-harness.samples.json
```

也可以指定你自己的样本文件：

```bash
npm run eval:feedback -- --file ./your-feedback-eval.json
```

样本结构示例：

```json
{
  "id": "traffic-phrases-should-survive",
  "noteContent": "想要完整版内容可以私信我，我把领取方式发你。",
  "platformReason": "疑似导流",
  "suspiciousPhrases": ["私信我", "完整版", "领取方式"],
  "expectedAllowedCandidates": ["私信我", "完整版", "领取方式"],
  "expectedBlockedCandidates": [],
  "expectedAuditSignal": "aligned"
}
```

评测输出会包含：

- 每条样本是否通过
- 当前规则复盘信号
- 实际保留的候选词
- 实际拦截的候选词及原因
- 每个候选词对应的推荐入库草稿

### 5. 记录并评测改写前后样本

你可以在页面右侧的“改写样本”分区里记录：

- 修改前内容
- 修改后内容
- 修改前平台原因
- 改写策略
- 哪些改动最有效

如果已经在页面里跑过“一键合规改写”，可以直接点击“记为前后对照样本”或“从当前改写结果填充”，自动带入当前前后内容。

这些样本会保存到：

```text
data/rewrite-pairs.json
```

想批量评测这些改写样本时，可以运行：

```bash
npm run eval:rewrite-pairs
```

也可以指定你自己的样本文件：

```bash
npm run eval:rewrite-pairs -- --file ./your-rewrite-pairs.json
```

评测输出会统计：

- 修改后是否整体降风险
- 风险分变化
- 结论是否从更高风险降到更低风险

### 6. 记录误报样本

当系统给出 `manual_review` 或 `hard_block`，但内容实际发到小红书后仍然正常时，可以在“规则检测”或“合规改写”结果区点击“记录为误报样本”。

系统会自动带入当前：

- 标题 / 正文 / 封面文案 / 标签
- 当前规则结论与风险分
- 当前样本来自规则检测结果还是改写结果

你可以先记录为：

- `已发出，目前正常`
  对应内部状态 `platform_passed_pending`，表示刚发布或仍在观察期
- `观察期后仍正常`
  对应内部状态 `platform_passed_confirmed`，表示经过观察期后仍正常，是更强的偏严证据

这些样本会保存到：

```text
data/false-positive-log.json
```

在页面下方“数据维护”里的“误报样本”分区，可以继续做这几件事：

- 查看状态、规则结论和误报复盘结论
- 展开查看正文 / 封面 / 备注全文
- 将待观察样本标记为已确认
- 删除明显无效的样本

## 本地网页面板

如果要启用违规截图识别，先设置 GLM 密钥：

```bash
export GLM_API_KEY="你的密钥"
```

当前默认模型分工如下：

- 截图识别默认使用 `glm-4.6v`
- 文本改写默认使用 `REWRITE_PROVIDER=glm`，对应模型为 `GLM_TEXT_MODEL`，未设置时回退到 `glm-4.6v`
- 交叉复判默认使用 `glm-4-flash`

如果你想覆盖，可以额外设置：

```bash
export GLM_VISION_MODEL="glm-4.6v"
export GLM_TEXT_MODEL="glm-4.6v"
export GLM_CROSS_REVIEW_MODEL="glm-4-flash"
```

如果你想把“改写 + 人味化”切到 Kimi，而不影响截图识别和交叉复判，可以这样配：

```bash
export REWRITE_PROVIDER="kimi"
export KIMI_API_KEY="你的密钥"
export KIMI_BASE_URL="https://api.moonshot.cn/v1/chat/completions"
export KIMI_TEXT_MODEL="moonshot-v1-8k"
```

补充说明：

- `REWRITE_PROVIDER` 目前支持 `glm` 和 `kimi`，默认值是 `glm`
- 只会影响“一键合规改写”与改写后的 humanizer 二次润色
- `KIMI_BASE_URL` 不填时会默认走 Moonshot 兼容接口
- 如果你本地已经使用 `MOONSHOT_API_KEY`，系统会自动兼容映射到 `KIMI_API_KEY`

```bash
npm run server
```

然后在浏览器打开：

[http://127.0.0.1:3030](http://127.0.0.1:3030)

在“内容检测”里可以直接运行检测，或点击“一键合规改写”，系统会结合当前命中项和建议，用当前配置的改写模型生成更偏教育 / 沟通 / 科普语境的改写版本。

在“违规原因回流”里可以直接填写对应笔记内容并上传截图，点击“识别截图并回填”，系统会用 GLM 读取截图中的违规原因和候选词，并把识别摘要写入反馈日志。

页面下方的“数据维护”区域支持直接维护：

- 新增 / 删除种子词库
- 新增 / 删除自定义词库
- 删除反馈日志
- 查看 / 确认 / 删除误报样本
- 将复核队列一键转入自定义词库，或直接删除

## 截图回流 JSON 导入

`ingest-feedback` 也支持在导入 JSON 时携带截图路径：

```json
{
  "noteContent": "这里放对应的笔记内容",
  "screenshotPath": "./screenshots/review-001.png"
}
```

当设置了 `GLM_API_KEY` 后，导入时会自动识别截图并补全 `platformReason`、`suspiciousPhrases` 和 `screenshotRecognition`。

## 维护建议

- 把平台返回的“违规原因”按原文记录进反馈日志
- 候选词先进入 `review-queue.json`，人工确认后再转进 `lexicon.custom.json`
- 不要只存词，尽量一起维护：
  - `category`
  - `riskLevel`
  - `xhsReason`
  - `sourceUrl`
  - `sourceDate`
  - `notes`
- 对于两性/身体探索赛道，重点观察组合场景：
  - 性相关话题 + 未成年人线索
  - 性相关话题 + 导流
  - 性相关话题 + 步骤化教学
  - 身体问题 + 疗效承诺

## 公开规则来源

- 小红书规则中心：https://school.xiaohongshu.com/rule
- 网信办《网络信息内容生态治理规定》：https://www.cac.gov.cn/2019-12/20/c_1578375159509309.htm
- 小红书交易导流违规管理细则公开报道：https://finance.sina.cn/2025-03-12/detail-inepkkxp4622323.d.html
