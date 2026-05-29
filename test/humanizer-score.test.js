import test from "node:test";
import assert from "node:assert/strict";

import { evaluateHumanizerSignals } from "../src/humanizer-score.js";

test("evaluateHumanizerSignals penalizes obvious AI-style business jargon and template structure", () => {
  const result = evaluateHumanizerSignals({
    title: "创新驱动与生态升级路径探索",
    body:
      "首先，我们要从更宏观层面看这件事的底层逻辑。其次，这个方案能够赋能用户，形成闭环，沉淀长期势能。最后，总体来说，这标志着一个全新的升级方向。",
    coverText: "高质量发展路径",
    tags: ["关系沟通"]
  });

  assert.equal(result.total < 35, true);
  assert.equal(result.dimensions.directness < 8, true);
  assert.equal(result.dimensions.rhythm < 8, true);
  assert.equal(result.issues.some((item) => /AI 常用词|清单腔|假大空/.test(item)), true);
});

test("evaluateHumanizerSignals rewards concrete first-person sharing with natural rhythm", () => {
  const result = evaluateHumanizerSignals({
    title: "第一次选装备，怎么和自己的身体好好沟通？",
    body:
      "我第一次选的时候真的是靠运气。今天回头看，踩坑不是因为笨，而是当时根本没人把这些细节说清楚。\n\n后来我慢慢发现，先搞清楚自己的感受，再看功能差异，会比一股脑冲着宣传词下单稳很多。",
    coverText: "别急着下单，先弄清这件事",
    tags: ["科普", "沟通"]
  });

  assert.equal(result.total >= 35, true);
  assert.equal(result.dimensions.authenticity >= 7, true);
  assert.equal(result.dimensions.rhythm >= 7, true);
  assert.equal(result.issues.length <= 2, true);
});

test("evaluateHumanizerSignals penalizes empty reassurance, over-explaining tone, and pseudo-empathy", () => {
  const result = evaluateHumanizerSignals({
    title: "你一定要相信，一切都会好起来",
    body:
      "首先你要明白，这其实是一个很正常的问题。希望这能帮到你。你一定要相信自己，也一定要接纳自己。其实每个人都会这样，所以不用太担心。总的来说，只要学会调整心态，一切都会慢慢好起来。",
    coverText: "先别怕，这很正常",
    tags: ["成长", "安慰"]
  });

  assert.equal(result.total < 35, true);
  assert.equal(result.dimensions.trust < 8, true);
  assert.equal(result.dimensions.authenticity < 8, true);
  assert.equal(result.issues.some((item) => /空洞安慰|过度解释|伪共情|说教/.test(item)), true);
});

test("evaluateHumanizerSignals penalizes over-safety disclaimers and flattening complex emotions into correct-sounding summaries", () => {
  const result = evaluateHumanizerSignals({
    title: "先别急着给自己下结论",
    body:
      "当然每个人的情况都不一样，以下内容不能替代专业意见，也不能代表所有人的真实体验。总体来说，我们需要理性看待这些感受，也需要以更成熟、更客观的方式理解它们。很多复杂情绪最终都可以被统一理解成正常波动，所以不必过度放大。",
    coverText: "理性一点看待这件事",
    tags: ["科普", "成长"]
  });

  assert.equal(result.total < 35, true);
  assert.equal(result.dimensions.trust < 8, true);
  assert.equal(result.dimensions.authenticity < 8, true);
  assert.equal(result.issues.some((item) => /过度安全说明|情绪被讲得太平|正确答案口吻/.test(item)), true);
});

test("evaluateHumanizerSignals catches softer safety-padding and flattened 'mature summary' phrasing common in AI rewrites", () => {
  const result = evaluateHumanizerSignals({
    title: "有些别扭感，不用急着立刻定义",
    body:
      "先说一下，这些感受不一定适用于每个人，具体还是要结合自己的关系状态和接受度来判断，也别轻易对号入座。很多时候它未必是什么严重问题，更适合把它看成亲密关系里的阶段性波动。允许自己有情绪，但最后还是要用更稳定、更成熟的心态去接住，慢慢和自己和解。",
    coverText: "别太快给情绪定性",
    tags: ["关系", "感受"]
  });

  assert.equal(result.total < 35, true);
  assert.equal(result.dimensions.trust < 8, true);
  assert.equal(result.dimensions.authenticity < 8, true);
  assert.equal(result.issues.includes("过度安全说明偏多"), true);
  assert.equal(result.issues.includes("复杂感受被讲得太平，像标准答案"), true);
});

test("evaluateHumanizerSignals penalizes relationship-advice and counselor-script phrasing", () => {
  const result = evaluateHumanizerSignals({
    title: "关系里最怕的，其实不是分歧",
    body:
      "亲密关系里，真正要练习的不是争一个对错，而是先看见自己的需求，再练习表达边界。很多让你反复内耗的瞬间，本质上都和课题分离不清有关。把注意力放回自己身上，先处理情绪，再处理事情，关系反而会慢慢松开。",
    coverText: "先别急着证明自己",
    tags: ["关系", "沟通"]
  });

  assert.equal(result.total < 35, true);
  assert.equal(result.dimensions.directness < 8, true);
  assert.equal(result.dimensions.authenticity < 8, true);
  assert.equal(result.issues.includes("关系建议 / 咨询师腔偏重"), true);
});

test("evaluateHumanizerSignals penalizes overly polished human-sounding aphorism summaries", () => {
  const result = evaluateHumanizerSignals({
    title: "你以为自己在等答案，其实是在等被理解",
    body:
      "很多时候，你缺的不是一个立刻解决问题的人，而是一个能接住你情绪的人。说到底，关系里真正重要的，从来不是谁更会讲道理，而是谁能让你慢慢放下防备。那些反复拉扯的瞬间，最后都会提醒你，安全感不是别人给的，是自己一点点长出来的。",
    coverText: "不是所有不安都需要马上解释",
    tags: ["情绪", "关系"]
  });

  assert.equal(result.total < 35, true);
  assert.equal(result.dimensions.trust < 8, true);
  assert.equal(result.dimensions.authenticity < 8, true);
  assert.equal(result.issues.includes("太会总结，像套出来的人味金句"), true);
});
