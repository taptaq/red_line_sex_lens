import test from "node:test";
import assert from "node:assert/strict";

import {
  buildXhsHumanizerSystemRules,
  buildXhsHumanizerUserRequirements
} from "../src/xhs-humanizer-rules.js";

test("xhs humanizer system rules keep the xiaohongshu sharing tone constraints", () => {
  const rules = buildXhsHumanizerSystemRules();
  const prompt = rules.join("\n");

  assert.ok(Array.isArray(rules));
  assert.ok(rules.length >= 8);
  assert.match(prompt, /小红书平台分享感/);
  assert.match(prompt, /优先保留内容里的真实场景、亲身体验/);
  assert.match(prompt, /不要编造新的经历/);
});

test("xhs humanizer user requirements keep the anti-ai but still human-sharing guardrails", () => {
  const requirements = buildXhsHumanizerUserRequirements();
  const prompt = requirements.join("\n");

  assert.ok(Array.isArray(requirements));
  assert.ok(requirements.length >= 10);
  assert.match(prompt, /优先保留真实场景和亲身体验/);
  assert.match(prompt, /不要写假设性例子/);
  assert.match(prompt, /第一句要让人想继续看/);
  assert.match(prompt, /避免居高临下说教/);
});
