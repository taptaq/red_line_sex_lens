import test from "node:test";
import assert from "node:assert/strict";

import { buildRuleChangePreview } from "../src/rule-preview.js";
import { loadAdminData } from "../src/admin.js";
import { paths } from "../src/config.js";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

async function withTempPreviewData(t, run) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "rule-preview-"));
  const originals = {
    seedLexicon: paths.lexiconSeed,
    customLexicon: paths.lexiconCustom,
    feedbackLog: paths.feedbackLog,
    falsePositiveLog: paths.falsePositiveLog,
    reviewQueue: paths.reviewQueue,
    rewritePairs: paths.rewritePairs,
    successSamples: paths.successSamples,
    noteLifecycle: paths.noteLifecycle,
    whitelist: paths.whitelist
  };

  paths.lexiconSeed = path.join(tempDir, "lexicon.seed.json");
  paths.lexiconCustom = path.join(tempDir, "lexicon.custom.json");
  paths.feedbackLog = path.join(tempDir, "feedback.log.json");
  paths.falsePositiveLog = path.join(tempDir, "false-positive-log.json");
  paths.reviewQueue = path.join(tempDir, "review-queue.json");
  paths.rewritePairs = path.join(tempDir, "rewrite-pairs.json");
  paths.successSamples = path.join(tempDir, "success-samples.json");
  paths.noteLifecycle = path.join(tempDir, "note-lifecycle.json");
  paths.whitelist = path.join(tempDir, "whitelist.json");

  await Promise.all([
    fs.writeFile(paths.lexiconSeed, "[]\n", "utf8"),
    fs.writeFile(paths.lexiconCustom, "[]\n", "utf8"),
    fs.writeFile(paths.feedbackLog, "[]\n", "utf8"),
    fs.writeFile(paths.falsePositiveLog, "[]\n", "utf8"),
    fs.writeFile(paths.rewritePairs, "[]\n", "utf8"),
    fs.writeFile(paths.successSamples, "[]\n", "utf8"),
    fs.writeFile(paths.noteLifecycle, "[]\n", "utf8"),
    fs.writeFile(paths.whitelist, "[]\n", "utf8")
  ]);

  t.after(async () => {
    Object.assign(paths, originals);
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  return run();
}

test("rule preview flags whitelist candidates that would soften violation-like history", () => {
  const preview = buildRuleChangePreview({
    draft: {
      targetScope: "whitelist",
      phrase: "健康表达"
    },
    histories: {
      successSamples: [
        { id: "success-1", tier: "featured", title: "健康表达", body: "温和科普内容" }
      ],
      falsePositiveLog: [
        {
          id: "fp-1",
          status: "platform_passed_confirmed",
          title: "健康表达",
          body: "平台实际放行",
          falsePositiveAudit: { signal: "strict_confirmed" }
        }
      ],
      feedbackLog: [
        {
          noteId: "bad-1",
          title: "健康表达",
          noteContent: "健康表达但含违规导流",
          platformReason: "违规导流",
          analysisSnapshot: { verdict: "hard_block", score: 100 }
        }
      ]
    }
  });

  assert.equal(preview.changeType, "whitelist");
  assert.equal(preview.impactedCount, 3);
  assert.ok(preview.totalImpactWeight > 0);
  assert.equal(preview.riskLevel, "high");
  assert.match(preview.summary, /高风险/);
});

test("rule preview flags lexicon candidates that may over-block high-value safe samples", () => {
  const preview = buildRuleChangePreview({
    draft: {
      match: "exact",
      term: "亲密沟通",
      category: "两性语境",
      riskLevel: "manual_review"
    },
    histories: {
      successSamples: [
        { id: "success-1", tier: "featured", title: "亲密沟通", body: "稳定过审内容", metrics: { likes: 80 } }
      ],
      noteLifecycle: [
        {
          id: "life-1",
          status: "positive_performance",
          note: { title: "亲密沟通", body: "表现不错" },
          publishResult: { metrics: { likes: 40 } }
        }
      ]
    }
  });

  assert.equal(preview.changeType, "lexicon");
  assert.equal(preview.impactedCount, 2);
  assert.equal(preview.riskLevel, "medium");
  assert.ok(preview.impactedSamples.every((item) => item.sampleWeight > 0));
  assert.match(preview.warnings.join("\n"), /高权重安全样本/);
});

test("admin data enriches review queue items with rule change previews", async (t) => {
  await withTempPreviewData(t, async () => {
    await fs.writeFile(
      paths.reviewQueue,
      `${JSON.stringify(
        [
          {
            id: "review-1",
            phrase: "亲密沟通",
            match: "exact",
            suggestedCategory: "两性语境",
            suggestedRiskLevel: "manual_review",
            status: "pending_review"
          }
        ],
        null,
        2
      )}\n`,
      "utf8"
    );
    await fs.writeFile(
      paths.successSamples,
      `${JSON.stringify([{ id: "success-1", tier: "featured", title: "亲密沟通", body: "稳定过审" }], null, 2)}\n`,
      "utf8"
    );

    const data = await loadAdminData();
    assert.equal(data.reviewQueue.length, 1);
    assert.equal(data.reviewQueue[0].ruleChangePreview.changeType, "lexicon");
    assert.equal(data.reviewQueue[0].ruleChangePreview.impactedCount, 1);
    assert.match(data.reviewQueue[0].ruleChangePreview.summary, /高权重安全样本|预计影响/);
  });
});

test("frontend renders rule change preview affordances", async () => {
  const [appJs, styles] = await Promise.all([
    fs.readFile(path.join(process.cwd(), "web/app.js"), "utf8"),
    fs.readFile(path.join(process.cwd(), "web/styles.css"), "utf8")
  ]);

  assert.match(appJs, /buildRuleChangePreviewMarkup/);
  assert.match(appJs, /ruleChangePreview/);
  assert.match(styles, /\.rule-preview-card/);
});
