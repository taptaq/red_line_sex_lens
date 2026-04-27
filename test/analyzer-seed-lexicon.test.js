import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { analyzePost } from "../src/analyzer.js";
import { paths } from "../src/config.js";

async function withTempAnalyzerData(t, { seedLexicon = [], customLexicon = [], whitelist = [], falsePositiveLog = [] }, run) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "analyzer-fp-"));
  const originals = {
    lexiconSeed: paths.lexiconSeed,
    lexiconCustom: paths.lexiconCustom,
    whitelist: paths.whitelist,
    falsePositiveLog: paths.falsePositiveLog
  };

  paths.lexiconSeed = path.join(tempDir, "lexicon.seed.json");
  paths.lexiconCustom = path.join(tempDir, "lexicon.custom.json");
  paths.whitelist = path.join(tempDir, "whitelist.json");
  paths.falsePositiveLog = path.join(tempDir, "false-positive-log.json");

  await Promise.all([
    fs.writeFile(paths.lexiconSeed, `${JSON.stringify(seedLexicon, null, 2)}\n`, "utf8"),
    fs.writeFile(paths.lexiconCustom, `${JSON.stringify(customLexicon, null, 2)}\n`, "utf8"),
    fs.writeFile(paths.whitelist, `${JSON.stringify(whitelist, null, 2)}\n`, "utf8"),
    fs.writeFile(paths.falsePositiveLog, `${JSON.stringify(falsePositiveLog, null, 2)}\n`, "utf8")
  ]);

  t.after(async () => {
    Object.assign(paths, originals);
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  return run();
}

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

test("confirmed false positive samples add downgrade hints and soften matching manual-review results", async (t) => {
  await withTempAnalyzerData(
    t,
    {
      seedLexicon: [
        {
          id: "manual-sensitive",
          match: "exact",
          term: "敏感短语",
          category: "两性用品宣传与展示",
          riskLevel: "manual_review",
          fields: ["body"],
          enabled: true
        }
      ],
      falsePositiveLog: [
        {
          id: "fp-confirmed-1",
          status: "platform_passed_confirmed",
          title: "健康表达案例",
          body: "这是一条包含敏感短语但实际平台正常的健康表达。",
          coverText: "",
          tags: ["健康表达"],
          falsePositiveAudit: { signal: "strict_confirmed" }
        }
      ]
    },
    async () => {
      const result = await analyzePost({
        title: "健康表达案例",
        body: "这是一条包含敏感短语但实际平台正常的健康表达。"
      });

      assert.equal(result.originalVerdict, "manual_review");
      assert.equal(result.verdict, "observe");
      assert.equal(result.falsePositiveHints.length, 1);
      assert.equal(result.falsePositiveHints[0].sourceId, "fp-confirmed-1");
      assert.match(result.suggestions.join("\n"), /误报样本/);
    }
  );
});

test("whitelist counterexample phrases soften matching manual-review results after approval", async (t) => {
  await withTempAnalyzerData(
    t,
    {
      seedLexicon: [
        {
          id: "manual-sensitive",
          match: "exact",
          term: "敏感短语",
          category: "两性用品宣传与展示",
          riskLevel: "manual_review",
          fields: ["body"],
          enabled: true
        }
      ],
      whitelist: ["健康表达"]
    },
    async () => {
      const result = await analyzePost({
        body: "这是健康表达场景下的敏感短语说明。"
      });

      assert.equal(result.originalVerdict, "manual_review");
      assert.equal(result.verdict, "observe");
      assert.deepEqual(result.whitelistHits.map((item) => item.phrase), ["健康表达"]);
      assert.match(result.suggestions.join("\n"), /白名单/);
    }
  );
});

test("false-positive and whitelist signals do not soften hard-block results", async (t) => {
  await withTempAnalyzerData(
    t,
    {
      seedLexicon: [
        {
          id: "hard-sensitive",
          match: "exact",
          term: "硬拦截短语",
          category: "导流与私域",
          riskLevel: "hard_block",
          fields: ["body"],
          enabled: true
        }
      ],
      whitelist: ["健康表达"],
      falsePositiveLog: [
        {
          id: "fp-confirmed-hard-1",
          status: "platform_passed_confirmed",
          title: "硬拦截边界案例",
          body: "健康表达里出现硬拦截短语。",
          falsePositiveAudit: { signal: "strict_confirmed" }
        }
      ]
    },
    async () => {
      const result = await analyzePost({
        title: "硬拦截边界案例",
        body: "健康表达里出现硬拦截短语。"
      });

      assert.equal(result.originalVerdict, "hard_block");
      assert.equal(result.verdict, "hard_block");
      assert.equal(result.softenedByFalsePositive, false);
      assert.equal(result.falsePositiveHints.length, 1);
      assert.deepEqual(result.whitelistHits.map((item) => item.phrase), ["健康表达"]);
    }
  );
});
