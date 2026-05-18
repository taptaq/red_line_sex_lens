import test from "node:test";
import assert from "node:assert/strict";

import {
  buildGenerationReferenceMaterialSearchPrompt,
  generateReferenceMaterials,
  normalizeGenerationReferenceMaterialItems
} from "../src/generation-workbench.js";

test("normalizeGenerationReferenceMaterialItems keeps compact candidate fields", () => {
  const items = normalizeGenerationReferenceMaterialItems([
    {
      id: " card-1 ",
      title: " 参考标题 ",
      reason: " 适合当前选题 ",
      referenceText: " 一段可摘录的网页参考 ",
      sourceUrl: " https://example.com/reference ",
      ignored: "drop-me"
    }
  ]);

  assert.deepEqual(items, [
    {
      id: "card-1",
      title: "参考标题",
      reason: "适合当前选题",
      referenceText: "一段可摘录的网页参考",
      sourceUrl: "https://example.com/reference"
    }
  ]);
});

test("buildGenerationReferenceMaterialSearchPrompt includes current brief context and the search output requirements", () => {
  const prompt = buildGenerationReferenceMaterialSearchPrompt({
    brief: {
      briefing: "写经期能不能用玩具，轻松一点",
      collectionType: "科普"
    },
    draft: {
      title: "经期也想用？",
      body: "先别急着下结论。"
    }
  });

  assert.match(prompt, /原始一句话需求：写经期能不能用玩具，轻松一点/);
  assert.match(prompt, /全网检索/);
  assert.match(prompt, /referenceText/);
});

test("normalizeGenerationReferenceMaterialItems supports alias fields", () => {
  const items = normalizeGenerationReferenceMaterialItems([
    {
      id: "alias-1",
      title: "别名参考",
      reason: "字段别名也应可用",
      reference_text: "来自别名字段的摘要",
      source_url: "https://example.com/alias"
    }
  ]);

  assert.deepEqual(items, [
    {
      id: "alias-1",
      title: "别名参考",
      reason: "字段别名也应可用",
      referenceText: "来自别名字段的摘要",
      sourceUrl: "https://example.com/alias"
    }
  ]);
});

test("normalizeGenerationReferenceMaterialItems drops incomplete and invalid candidates", () => {
  const items = normalizeGenerationReferenceMaterialItems([
    {
      id: "missing-reference",
      title: "缺少参考文本",
      reason: "不完整",
      sourceUrl: "https://example.com/a"
    },
    {
      id: "invalid-url",
      title: "链接不合法",
      reason: "不应保留",
      referenceText: "有内容",
      sourceUrl: "ftp://example.com/a"
    },
    {
      id: "valid-item",
      title: "有效候选",
      reason: "字段完整",
      referenceText: "可作为摘录参考",
      url: "https://example.com/valid"
    }
  ]);

  assert.deepEqual(items, [
    {
      id: "valid-item",
      title: "有效候选",
      reason: "字段完整",
      referenceText: "可作为摘录参考",
      sourceUrl: "https://example.com/valid"
    }
  ]);
});

test("generateReferenceMaterials falls back to payload.references", async () => {
  const result = await generateReferenceMaterials({
    brief: {
      briefing: "写经期能不能用玩具，轻松一点"
    },
    generateJson: async () => ({
      references: [
        {
          title: "参考回退项",
          reason: "兼容旧字段",
          referenceText: "从 references 字段读取",
          sourceUrl: "https://example.com/fallback"
        }
      ],
      provider: "mock",
      model: "mock-model"
    })
  });

  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].title, "参考回退项");
});

test("normalizeGenerationReferenceMaterialItems caps returned items at 5", () => {
  const items = normalizeGenerationReferenceMaterialItems(
    Array.from({ length: 6 }, (_, index) => ({
      id: `item-${index + 1}`,
      title: `标题${index + 1}`,
      reason: `原因${index + 1}`,
      referenceText: `摘要${index + 1}`,
      sourceUrl: `https://example.com/${index + 1}`
    }))
  );

  assert.equal(items.length, 5);
  assert.deepEqual(
    items.map((item) => item.id),
    ["item-1", "item-2", "item-3", "item-4", "item-5"]
  );
});
