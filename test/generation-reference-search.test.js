import test from "node:test";
import assert from "node:assert/strict";

import {
  buildGenerationReferenceMaterialSearchPrompt,
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
