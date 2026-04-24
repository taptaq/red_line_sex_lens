import test from "node:test";
import assert from "node:assert/strict";

import { analyzePost } from "../src/analyzer.js";

test("detects expanded absolute-claim phrases from the updated seed lexicon", async () => {
  const result = await analyzePost({
    title: "全网第一的Top1爆款",
    body: "这款产品绝无仅有，而且100%正品，质量免检。"
  });

  assert.equal(result.verdict, "manual_review");
  assert.ok(result.hits.some((hit) => hit.category === "绝对化与功效承诺"));
});

test("detects expanded platform diversion aliases and private-traffic scripts", async () => {
  const result = await analyzePost({
    body: "想要链接的可以加薇，评论区留号，我把猫店链接发你。"
  });

  assert.equal(result.verdict, "hard_block");
  assert.ok(result.hits.some((hit) => hit.category === "导流与私域"));
  assert.ok(result.hits.some((hit) => hit.riskLevel === "hard_block"));
});

test("detects broader medical-health claims from the updated seed lexicon", async () => {
  const result = await analyzePost({
    title: "燃脂减肥方案",
    body: "这个普通产品可以治疗糖尿病、净化血液，还能调节免疫力。"
  });

  assert.equal(result.verdict, "manual_review");
  assert.ok(result.hits.some((hit) => hit.category === "医疗健康风险"));
});

test("detects superstition and pseudo-science phrases from the updated seed lexicon", async () => {
  const result = await analyzePost({
    body: "这个护身符可以带来好运气，招财进宝，还能增强第六感。"
  });

  assert.equal(result.verdict, "manual_review");
  assert.ok(result.hits.some((hit) => hit.category === "迷信与伪科学"));
});

test("detects livestream interaction bait and fake urgency phrases from the updated seed lexicon", async () => {
  const result = await analyzePost({
    body: "错过就没机会了，一键三连，想要扣1，今天秒杀价。"
  });

  assert.equal(result.verdict, "manual_review");
  assert.ok(result.hits.some((hit) => hit.category === "刺激消费与互动诱导"));
});

test("treats government-endorsed supply claims as hard block in the updated seed lexicon", async () => {
  const result = await analyzePost({
    body: "这是国家机关专供，还是领导人推荐款。"
  });

  assert.equal(result.verdict, "hard_block");
  assert.ok(result.hits.some((hit) => hit.category === "权威背书与认证宣称"));
  assert.ok(result.hits.some((hit) => hit.riskLevel === "hard_block"));
});

test("keeps livestream hype claims in manual review but hard-blocks explicit livestream private-traffic offers", async () => {
  const reviewResult = await analyzePost({
    body: "今晚全网最低价，买到就是赚到。"
  });
  const blockResult = await analyzePost({
    body: "直播间私信我拿折扣，我再发你优惠。"
  });

  assert.equal(reviewResult.verdict, "manual_review");
  assert.ok(reviewResult.hits.some((hit) => hit.category === "直播营销禁语"));
  assert.equal(blockResult.verdict, "hard_block");
  assert.ok(blockResult.hits.some((hit) => hit.category === "直播营销禁语"));
  assert.ok(blockResult.hits.some((hit) => hit.riskLevel === "hard_block"));
});
