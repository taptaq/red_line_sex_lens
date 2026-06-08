# link-note-saver 集成说明

## 功能概述

link-note-saver 已成功集成到项目中，用于从链接（文章、视频）提取内容并转换为外部参考样本。

**支持的链接类型：**
- ✅ 小红书笔记链接（优先使用 Redfox API，回退到网页抓取）
- ✅ 普通网页文章
- ✅ 视频链接（B站、抖音、快手等，提取文案和元信息）

**核心能力：**
- 自动提取标题、正文、标签、作者、发布时间
- 生成小红书传播拆解（3秒钩子、封面标题、正文结构、话题标签）
- 标准化为项目的外部参考样本格式
- 支持单个和批量保存

## 使用方式

### 1. Web 界面（推荐）

**在账号诊断 → 同类爆文专区使用：**

1. 打开本地服务：`npm run server`
2. 访问 http://127.0.0.1:3030
3. 进入"账号诊断"区域，查看"同类爆文专区"
4. 点击任意爆文卡片的 **「加入外部参考样本」** 按钮
5. 系统会自动：
   - 检测是否有原文链接（`workUrl`）
   - 如果有链接，从链接抓取完整内容（包括小红书传播拆解）
   - 如果没有链接或抓取失败，直接保存当前数据

**优势：**
- 自动从原文链接获取完整内容（而非 API 返回的摘要）
- 自动生成小红书传播拆解
- 保存后自动刷新外部参考样本列表

### 2. API 调用

**单个链接保存：**

```bash
curl -X POST http://127.0.0.1:3030/api/sample-library/external-reference-samples/from-link \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.xiaohongshu.com/explore/...",
    "notes": "从同类爆文中发现的优质内容",
    "collectionType": "科普",
    "tags": ["亲密关系", "科普"]
  }'
```

**批量链接保存：**

```bash
curl -X POST http://127.0.0.1:3030/api/sample-library/external-reference-samples/from-links \
  -H "Content-Type: application/json" \
  -d '{
    "urls": [
      "https://www.xiaohongshu.com/explore/abc123",
      "https://www.xiaohongshu.com/explore/def456"
    ],
    "notes": "批量导入参考样本",
    "collectionType": "科普",
    "tags": ["测试"]
  }'
```

### 3. 代码调用

```javascript
import { saveLinkAsReferenceSample } from "./src/link-note-saver-adapter.js";
import { saveExternalReferenceSampleFromLink } from "./src/data-store.js";

// 方式 1: 提取内容但不保存
const sample = await saveLinkAsReferenceSample("https://example.com/article", {
  notes: "手动添加的备注",
  collectionType: "科普",
  additionalTags: ["标签1", "标签2"]
});

console.log(sample.title);
console.log(sample.body);
console.log(sample.notes); // 包含小红书传播拆解

// 方式 2: 提取内容并自动保存到 external-reference-samples.json
await saveExternalReferenceSampleFromLink("https://example.com/article", {
  notes: "自动保存",
  collectionType: "科普"
});
```

### 4. 测试脚本

```bash
# 基础功能测试
node scripts/test-link-note-saver.js

# 测试实际链接抓取（需要有效的 URL）
node scripts/test-link-note-saver.js --url https://www.xiaohongshu.com/explore/...
```

## 配置说明

### 环境变量（可选）

```bash
# 小红书 API 密钥（用于获取完整笔记内容）
export REDFOX_API_KEY="your-redfox-api-key"

# GLM API 密钥（用于视频转文字，当前为占位功能）
export GLM_API_KEY="your-glm-api-key"
```

**说明：**
- 如果配置了 `REDFOX_API_KEY`，抓取小红书链接时会优先调用 Redfox API 获取详细数据
- 如果未配置或 API 失败，会回退到网页抓取模式
- 视频转文字功能需要进一步集成，当前只提取页面文案

## 数据结构

### 输入参数

```typescript
{
  url: string;              // 必需：链接地址
  notes?: string;           // 可选：人工备注
  collectionType?: string;  // 可选：合集类型，默认"科普"
  additionalTags?: string[]; // 可选：额外标签
}
```

### 输出格式

生成的外部参考样本包含：

```json
{
  "id": "link-uuid",
  "title": "标题",
  "body": "正文内容",
  "tags": ["标签1", "标签2"],
  "collectionType": "科普",
  "notes": "来源: 小红书\n链接: ...\n作者: ...\n\n小红书传播拆解:\n- 3秒钩子: ...\n- 封面标题: ...\n- 笔记标题: ...\n- 正文结构: ...\n- 话题标签: ...\n- 评论区引导: ...",
  "publish": {
    "status": "positive_performance",
    "publishedAt": "2026-06-03T...",
    "metrics": {
      "likes": 1234,
      "favorites": 567,
      "comments": 89,
      "shares": 12
    }
  },
  "createdAt": "2026-06-03T...",
  "updatedAt": "2026-06-03T..."
}
```

## 关键特性

### 1. 小红书传播拆解

每个保存的样本都会自动生成小红书传播拆解，包括：

- **3秒钩子**：能抓住目标人群的问题或反差
- **封面标题**：12-18 字，清晰可读
- **笔记标题**：可直接发布的小红书标题
- **正文结构**：开头痛点 → 关键发现 → 操作步骤 → 避坑提醒 → 结尾提问
- **话题标签**：# 格式的标签列表
- **评论区引导**：自然提问，不诱导点赞收藏

### 2. 自动回退机制

链接抓取失败时的处理策略：

```
尝试抓取链接
  ↓ 失败
尝试 Redfox API（如果配置）
  ↓ 失败
尝试网页抓取
  ↓ 失败
返回错误
```

### 3. 视频链接支持

对于视频链接（B站、抖音、快手等）：

- ✅ 提取页面中的标题、描述、标签
- ✅ 标记为视频类型
- ⚠️ 视频转文字功能需要进一步集成（当前只提取文案）

**后续增强方向：**
- 集成 Whisper 或其他语音转文字服务
- 从视频平台 API 获取字幕文件
- 提取视频关键帧进行图像识别

## 文件清单

```
src/
  link-note-saver-adapter.js           # 核心适配器模块
  data-store.js                         # 新增链接保存函数
  server.js                             # 新增 API 路由
  external-reference-samples.js         # 数据标准化（已有）

web/
  app.js                                # 修改：集成链接保存逻辑
  xhs-top-signals-view.js               # 已有：UI 入口

test/
  link-note-saver-adapter.test.js       # 单元测试

scripts/
  test-link-note-saver.js               # 集成测试脚本
```

## 使用场景示例

### 场景 1：采集同类爆文

1. 使用账号诊断功能查询同赛道账号
2. 查看"同类爆文专区"的 `dailyTop`、`weeklyTop`、`lowTop` 信号
3. 点击"加入外部参考样本"保存感兴趣的爆文
4. 系统自动从原文链接抓取完整内容
5. 在账号复盘时，这些样本会自动参与分析

### 场景 2：导入外部文章

```bash
# 从技术博客导入参考文章
node scripts/test-link-note-saver.js --url https://example.com/best-practices
```

### 场景 3：批量采集

```javascript
const urls = [
  "https://www.xiaohongshu.com/explore/abc123",
  "https://www.xiaohongshu.com/explore/def456",
  "https://www.xiaohongshu.com/explore/ghi789"
];

const { saved, errors } = await saveExternalReferenceSamplesFromLinks(urls, {
  notes: "2024年6月同类爆文采集",
  collectionType: "科普",
  additionalTags: ["亲密关系"]
});

console.log(`成功: ${saved.length}, 失败: ${errors.length}`);
```

## 注意事项

1. **网络访问**：需要能访问目标网站（可能需要处理反爬虫）
2. **API 配额**：如果使用 Redfox API，注意配额限制
3. **数据质量**：网页抓取的内容可能不完整，建议优先使用官方 API
4. **重复检测**：当前未做去重，相同链接多次保存会生成多条记录
5. **视频支持**：视频转文字功能需要进一步集成

## 后续优化方向

- [ ] 增加链接去重检测（保存前检查是否已存在）
- [ ] 支持更多视频平台的字幕提取
- [ ] 增加图片识别（提取图文笔记的图片内容）
- [ ] 支持自定义抓取规则（CSS 选择器）
- [ ] 增加抓取队列和限流机制
- [ ] 支持定时批量抓取订阅的账号

## 测试覆盖

- ✅ 链接类型检测
- ✅ Markdown 笔记生成
- ✅ 数据存储集成
- ✅ API 端点调用
- ✅ Web 界面集成
- ⚠️ 实际链接抓取（需要真实环境测试）

## 问题排查

**问题：链接抓取失败**
- 检查网络连接
- 确认链接格式正确
- 查看服务器日志中的错误信息

**问题：小红书链接无法获取完整内容**
- 配置 `REDFOX_API_KEY` 环境变量
- 确认 API 密钥有效且有配额

**问题：视频链接只能获取文案**
- 这是预期行为，视频转文字需要额外配置
- 当前版本只提取页面元信息

## 联系与贡献

如有问题或建议，欢迎提交 Issue 或 Pull Request。
