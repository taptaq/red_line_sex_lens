---
name: link-note-saver
description: 当用户发送文章、网页、GitHub、产品页、视频文案等链接，并要求保存、总结、拆解、归档、做小红书选题、生成内容素材库或上传静态预览站时使用。本技能会把链接沉淀为中文 Markdown 笔记、索引、静态 HTML 预览，并输出小红书传播切口、封面标题、正文结构、标签和可复用角度。
---

# 链接素材库助手

这个技能把用户给的链接变成“可复用的中文内容资产”：先保存 Markdown 笔记，再生成可浏览的静态素材库；如果配置了腾讯云 COS，就上传成在线预览站。

## 适用场景

- 用户发来一个或多个链接，想要保存、归档、总结、拆解、做笔记。
- 用户想把链接转成小红书选题、封面标题、正文结构、标签或评论区引导。
- 用户想维护一个可下载 Markdown、可在线预览的链接素材库。

## 小红书内测包适配

小红书技能包内测只支持上传单个 `.md`，或只包含 `.md` / `.txt` 的文件夹。因此发布版使用这个结构：

```text
link-note-saver/
├── SKILL.md
├── env.example.txt
└── scripts/
    ├── generate_site.py.txt
    └── cos_upload.py.txt
```

关键约定：

- `.txt` 脚本可以直接执行：`python3 scripts/generate_site.py.txt`。
- 不依赖 Node、npm、`cos-nodejs-sdk-v5` 或外置脚本包。
- 密钥不要写进 `SKILL.md`。让用户把 `env.example.txt` 复制成 `env.local.txt` 后填写，或用环境变量提供。
- 如果平台只能上传单个 `.md`，把两个脚本作为代码块放到 `SKILL.md` 文末，并在首次运行时先把代码块落地为临时脚本；但推荐文件夹形态，安装成功率更高。

## 存储位置

默认路径：

- 笔记目录：`$OPENCLAW_WORKSPACE/notes/link-library/`
- 索引文件：`$OPENCLAW_WORKSPACE/notes/link-library/INDEX.md`
- 静态站入口：`$OPENCLAW_WORKSPACE/notes/link-library/index.html`
- 技能目录：`$OPENCLAW_WORKSPACE/skills/link-note-saver/`

如果环境里没有 `OPENCLAW_WORKSPACE`，脚本会自动尝试识别技能目录上级的 `workspace`，最后退回当前目录。

文件命名：

- 单篇笔记：`YYYY-MM-DD-short-slug.md`
- 一条链接默认保存成一篇 Markdown；批量链接可以逐篇保存，除非用户明确要合并成合集。

## 配置文件

发布包里只带 `env.example.txt`：

```env
TENCENT_COS_SECRET_ID=your-secret-id
TENCENT_COS_SECRET_KEY=your-secret-key
TENCENT_COS_REGION=ap-hongkong
TENCENT_COS_BUCKET=your-bucket-1250000000
TENCENT_COS_CUSTOM_DOMAIN=example.com
LINK_NOTE_REMOTE_PREFIX=openclaw/link-library
LINK_NOTE_PUBLIC_BASE_URL=https://example.com
LINK_NOTE_PAGE_SIZE=20
```

首次需要上传时：

1. 把 `env.example.txt` 复制为 `env.local.txt`。
2. 填入 COS 配置。
3. 运行生成并上传命令。

如果用户没有 COS 配置，仍然要完成本地笔记和 HTML 生成；只在回复里说明“在线上传未配置”。

## 工作流程

1. 获取链接内容。
   - 优先轻量抓取标题、正文、作者、发布时间和来源域名。
   - 如果无法抓取全文，不要假装读完；保存链接、元信息和可确认的摘要，并说明依据有限。
2. 产出中文结构化内容：
   - 标题、原文链接、来源、作者/日期、保存时间、标签。
   - 摘要、关键要点、可复用角度。
   - 小红书传播拆解：3 秒钩子、封面标题、笔记标题、正文结构、话题标签、评论区引导。
3. 写入 Markdown 笔记。
4. 运行静态站生成脚本，自动重建 `INDEX.md`、`index.html` 和单篇预览页。
5. 如果用户要求在线访问，或 COS 已配置，运行上传。
6. 用中文回复保存路径、预览入口、单篇预览、Markdown 下载地址，以及核心摘要。

## 传播性改造原则

每篇链接笔记都要多一层“小红书可传播表达”，但不要写成夸张营销稿。

- 选题要具体：优先“谁在什么场景遇到什么问题”，少用空泛大词。
- 封面标题要短：12-18 字为佳，避免堆砌感叹号和虚假承诺。
- 正文结构要能直接发布：痛点开场、关键发现、操作清单、避坑提醒、结尾提问。
- 标签要兼顾搜索和人群：包含垂直领域词、场景词、工具词。
- 合规底线：不伪造数据、不冒充原作者、不搬运全文、不承诺收益、不诱导互动。

## 笔记模板

```markdown
# {标题}

- 原文链接：{url}
- 保存时间：{YYYY-MM-DD HH:mm Asia/Shanghai}
- 来源：{domain/source}
- 作者/日期：{作者和日期；没有则写“未注明”}
- 标签：{标签1}, {标签2}, {标签3}

## 摘要

{3-6 句中文摘要，说明这条链接真正有用的地方。}

## 关键要点

- {要点 1}
- {要点 2}
- {要点 3}

## 小红书传播拆解

- 3秒钩子：{一句能抓住目标人群的问题或反差}
- 封面标题：{12-18 字，清晰可读}
- 笔记标题：{可直接发布的小红书标题}
- 正文结构：{开头痛点 -> 关键发现 -> 操作步骤 -> 避坑提醒 -> 结尾提问}
- 话题标签：#{标签1} #{标签2} #{标签3}
- 评论区引导：{自然提问，不诱导点赞收藏}

## 可复用角度

- 内容生产：{能否变成选题、系列、标题、案例素材}
- 自动化闭环：{能否变成脚本、SOP、看板、归档流程}
- AI 协作：{能否变成 prompt、agent workflow、上下文文件}
- 知识资产：{能否沉淀为模板、清单、资料库字段}
- 商业/产品：{能否变成服务包装、咨询入口、交付标准}

## 可执行下一步

- {一个小而具体的下一步}

## 原文摘录 / 备注

- {短摘录或备注；没有则写“无”}
```

## 生成与上传

小红书内测包只暴露 `.txt` 脚本。生成本地预览：

```bash
cd <技能安装目录>/link-note-saver
python3 scripts/generate_site.py.txt
```

如果已经配置 `env.local.txt`，生成后上传到 COS：

```bash
cd <技能安装目录>/link-note-saver
python3 scripts/generate_site.py.txt --upload
```

脚本会生成：

- `INDEX.md`：自动重建的 Markdown 索引。
- `index.html`：稳定入口页。
- `index-N.html`：分页页。
- `{note-slug}.html`：单篇在线预览。
- `{note-slug}.md`：原始 Markdown 下载文件。

上传地址规则：

- COS 前缀：读取 `LINK_NOTE_REMOTE_PREFIX`，默认 `openclaw/link-library`。
- 站点入口：`{LINK_NOTE_PUBLIC_BASE_URL}/{LINK_NOTE_REMOTE_PREFIX}/index.html`。
- 单篇预览：`{LINK_NOTE_PUBLIC_BASE_URL}/{LINK_NOTE_REMOTE_PREFIX}/{note-slug}.html`。
- Markdown 下载：`{LINK_NOTE_PUBLIC_BASE_URL}/{LINK_NOTE_REMOTE_PREFIX}/{note-slug}.md`。

## 回复格式

保存完成后，用中文紧凑回复：

1. 已保存的本地 Markdown 路径。
2. 本地或线上素材库入口。
3. 单篇 HTML 预览地址。
4. Markdown 下载地址；没有上传时给本地文件路径。
5. 摘要。
6. 关键要点。
7. 小红书传播拆解。
8. 可复用角度和下一步。

## 质量要求

- 输出必须中文化，代码和配置键名除外。
- 摘要要密，不写“值得学习”这种空话。
- 小红书建议要可发布、可执行、不过度标题党。
- 链接抓取不完整时要标注限制。
- 不把密钥、token、Cookie 写进笔记或回复。
