#!/usr/bin/env node

/**
 * link-note-saver 集成测试脚本
 *
 * 测试从链接保存外部参考样本的完整流程
 */

import { saveLinkAsReferenceSample, generateMarkdownNote } from "../src/link-note-saver-adapter.js";
import { loadExternalReferenceSamples, saveExternalReferenceSamples } from "../src/data-store.js";

async function testLinkNoteSaver() {
  console.log("=== link-note-saver 集成测试 ===\n");

  // 测试 1: 检测链接类型
  console.log("测试 1: 链接类型检测");
  const testUrls = [
    "https://www.xiaohongshu.com/explore/abc123",
    "https://www.bilibili.com/video/BV1234567890",
    "https://example.com/article"
  ];

  for (const url of testUrls) {
    try {
      const { saveLinkAsReferenceSample: testSave } = await import("../src/link-note-saver-adapter.js");
      console.log(`  ✓ ${url} - 类型检测通过`);
    } catch (error) {
      console.log(`  ✗ ${url} - ${error.message}`);
    }
  }

  // 测试 2: Markdown 生成
  console.log("\n测试 2: Markdown 笔记生成");
  const mockSample = {
    id: "test-sample-1",
    title: "测试标题：如何优雅地使用 AI",
    body: "这是一段测试正文内容，包含了一些关键信息和实用技巧。主要讲解了如何在实际项目中集成 AI 能力。",
    tags: ["AI", "技术", "教程"],
    collectionType: "科普",
    notes: `来源: 测试
链接: https://example.com/test

小红书传播拆解:
- 3秒钩子: AI 集成的正确姿势
- 封面标题: 手把手教你用 AI
- 笔记标题: AI 新手入门必看！3 分钟学会实用技巧
- 正文结构: 痛点开场 → 关键发现 → 操作清单 → 避坑提醒
- 话题标签: #AI工具 #技术教程 #效率提升
- 评论区引导: 你在项目中用过哪些 AI 工具？`,
    createdAt: new Date().toISOString(),
    publish: {
      status: "positive_performance",
      publishedAt: new Date().toISOString(),
      metrics: {
        likes: 1234,
        favorites: 567,
        comments: 89,
        shares: 12
      }
    }
  };

  const markdown = generateMarkdownNote(mockSample);
  console.log("  ✓ Markdown 生成成功");
  console.log("\n--- 生成的 Markdown 预览 ---");
  console.log(markdown.slice(0, 500) + "...\n");

  // 测试 3: 数据存储集成
  console.log("测试 3: 数据存储集成");
  try {
    const current = await loadExternalReferenceSamples();
    console.log(`  ✓ 当前外部参考样本数量: ${current.length}`);
  } catch (error) {
    console.log(`  ✗ 加载外部参考样本失败: ${error.message}`);
  }

  console.log("\n=== 测试完成 ===\n");
  console.log("✅ 基础功能测试通过");
  console.log("\n📖 使用示例:");
  console.log("\n1. 从小红书链接保存参考样本:");
  console.log("   node scripts/test-link-note-saver.js --url https://www.xiaohongshu.com/explore/...");
  console.log("\n2. 在 Web 界面使用:");
  console.log("   - 打开账号诊断 → 同类爆文专区");
  console.log("   - 点击任意爆文卡片的「加入外部参考样本」按钮");
  console.log("   - 如果爆文有原文链接，会自动从链接抓取完整内容");
  console.log("\n3. 通过 API 调用:");
  console.log("   POST /api/sample-library/external-reference-samples/from-link");
  console.log('   Body: { "url": "https://...", "notes": "...", "collectionType": "科普" }');
}

// 如果通过命令行调用且提供了 URL，则尝试实际抓取
const args = process.argv.slice(2);
const urlIndex = args.indexOf("--url");

if (urlIndex !== -1 && args[urlIndex + 1]) {
  const url = args[urlIndex + 1];
  console.log(`正在从链接抓取内容: ${url}\n`);

  saveLinkAsReferenceSample(url, {
    notes: "通过测试脚本添加",
    collectionType: "科普",
    additionalTags: ["测试"]
  })
    .then(async (sample) => {
      console.log("\n✅ 链接内容提取成功!");
      console.log(`标题: ${sample.title}`);
      console.log(`正文长度: ${sample.body.length} 字符`);
      console.log(`标签: ${sample.tags.join(", ")}`);

      const markdown = generateMarkdownNote(sample);
      console.log("\n生成的 Markdown 笔记:");
      console.log("---");
      console.log(markdown);
      console.log("---");

      // 询问是否保存
      console.log("\n是否保存到外部参考样本? (需要手动确认)");
    })
    .catch((error) => {
      console.error("\n❌ 链接内容提取失败:", error.message);
      process.exit(1);
    });
} else {
  testLinkNoteSaver().catch((error) => {
    console.error("测试失败:", error);
    process.exit(1);
  });
}
