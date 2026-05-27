import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

import {
  buildSampleLibraryCalibrationPrediction,
  resolveSampleLibraryCalibrationPrefillSource
} from "../web/sample-library-calibration.js";

test("prefill source falls back to the saved record analysis snapshot when current session state is empty", () => {
  const source = resolveSampleLibraryCalibrationPrefillSource({
    latestAnalyzePayload: null,
    latestAnalysis: null,
    latestRewrite: null,
    record: {
      note: {
        title: "已保存标题",
        body: "已保存正文",
        coverText: "已保存封面"
      },
      snapshots: {
        analysis: {
          finalVerdict: "manual_review",
          score: 68,
          semanticReview: {
            review: {
              summary: "标题表达仍然偏强，需要轻微收敛。"
            }
          }
        }
      }
    }
  });

  assert.equal(source.kind, "record-analysis");
  assert.equal(source.requirementMessage, "");
  assert.match(source.summary, /这条记录的已保存检测结果/);
  assert.match(source.successMessage, /已保存检测结果/);

  const prediction = buildSampleLibraryCalibrationPrediction(source, {
    semantic: "glm-5.1",
    rewrite: "kimi-k2.6"
  });

  assert.equal(prediction.predictedStatus, "limited");
  assert.equal(prediction.predictedRiskLevel, "medium");
  assert.equal(prediction.model, "glm-5.1");
  assert.match(prediction.reason, /当前检测结论：人工复核/);
  assert.match(prediction.reason, /标题表达仍然偏强/);
  assert.ok(Array.isArray(prediction.evidenceSamples));
  assert.ok(Array.isArray(prediction.evidenceSignals));
  assert.ok(prediction.evidenceSamples.length > 0);
  assert.ok(prediction.evidenceSignals.length > 0);
  assert.equal(prediction.evidenceSamples[0]?.title, "检测结论：人工复核");
  assert.match(prediction.evidenceSignals.join("；"), /规则分：68/);
  assert.match(prediction.evidenceSignals.join("；"), /语义摘要：标题表达仍然偏强/);
  assert.equal(typeof prediction.evidenceSummary, "string");
  assert.match(prediction.evidenceSummary, /证据|相似|检测/);
});

test("prefill source prefers current session results over saved record snapshots when both exist", () => {
  const source = resolveSampleLibraryCalibrationPrefillSource({
    latestAnalyzePayload: {
      title: "当前标题",
      body: "当前正文",
      coverText: "当前封面"
    },
    latestAnalysis: {
      finalVerdict: "observe",
      score: 22
    },
    latestRewrite: {
      title: "当前改写标题",
      body: "当前改写正文",
      coverText: "当前改写封面",
      rewriteNotes: "已弱化敏感表达",
      safetyNotes: "发布前仍建议人工复查"
    },
    record: {
      note: {
        title: "旧记录标题",
        body: "旧记录正文",
        coverText: "旧记录封面"
      },
      snapshots: {
        analysis: {
          finalVerdict: "manual_review",
          score: 77
        }
      }
    }
  });

  assert.equal(source.kind, "current-rewrite-analysis");
  assert.equal(source.requirementMessage, "");
  assert.match(source.summary, /当前改写结果/);
  assert.match(source.successMessage, /当前检测\/改写结果/);

  const prediction = buildSampleLibraryCalibrationPrediction(source, {
    semantic: "glm-5.1",
    rewrite: "kimi-k2.6"
  });

  assert.equal(prediction.predictedStatus, "published_passed");
  assert.equal(prediction.predictedRiskLevel, "low");
  assert.equal(prediction.predictedPerformanceTier, "medium");
  assert.match(prediction.reason, /当前检测结论：观察通过/);
  assert.match(prediction.evidenceSummary, /检测结论：观察通过/);
  assert.equal(typeof prediction.successMessage, "string");
  assert.match(prediction.successMessage, /已根据当前检测\/改写结果预填预判字段/);
  assert.match(prediction.successMessage, /已发布通过/);
  assert.match(prediction.successMessage, /低风险/);
});

test("publish prediction evidence prefers matched historical records over generic local fallback", () => {
  const prediction = buildSampleLibraryCalibrationPrediction(
    {
      kind: "record-analysis",
      summary: "当前预填来源：这条记录的已保存检测结果。",
      analysis: {
        finalVerdict: "observe",
        score: 22
      },
      rewrite: null,
      relatedRecords: [
        {
          id: "record-good",
          title: "怎么表达拒绝又不伤人",
          summary: "高表现样本，同样命中边界表达和沟通压力。",
          reasons: ["标签重合 2 项", "标题短语命中 1 项"]
        }
      ]
    },
    { semantic: "glm-5.1", rewrite: "kimi-k2.6" }
  );

  assert.equal(Array.isArray(prediction.evidenceSamples), true);
  assert.equal(prediction.evidenceSamples[0]?.id, "record-good");
  assert.match(prediction.evidenceSummary, /高表现样本/);
  assert.match(prediction.evidenceSignals.join("；"), /标签重合 2 项/);
});

test("publish prediction evidence still produces reviewable fallback signals when only basic rule evidence exists", () => {
  const prediction = buildSampleLibraryCalibrationPrediction(
    {
      kind: "record-analysis",
      summary: "当前预填来源：这条记录的已保存检测结果。",
      analysis: {
        finalVerdict: "observe",
        score: 80
      },
      rewrite: null,
      relatedRecords: []
    },
    { semantic: "glm-5.1", rewrite: "kimi-k2.6" }
  );

  assert.match(prediction.evidenceSignals.join("；"), /检测结论：观察通过/);
  assert.match(prediction.evidenceSignals.join("；"), /规则分：80/);
});

test("prefill source surfaces a record-specific requirement when only a saved rewrite snapshot exists", () => {
  const source = resolveSampleLibraryCalibrationPrefillSource({
    latestAnalyzePayload: null,
    latestAnalysis: null,
    latestRewrite: null,
    record: {
      note: {
        title: "只有改写快照的记录",
        body: "记录正文",
        coverText: "记录封面"
      },
      snapshots: {
        rewrite: {
          title: "改写标题",
          body: "改写正文",
          coverText: "改写封面",
          rewriteNotes: "已经改写过"
        }
      }
    }
  });

  assert.equal(source.kind, "record-rewrite-only");
  assert.match(source.summary, /只有已保存改写结果/);
  assert.match(source.requirementMessage, /缺少已保存检测结论/);
});

test("sample library calibration modal wiring reads saved-record prefill sources from the active modal record", async () => {
  const appJs = await fs.readFile(path.join(process.cwd(), "web/app.js"), "utf8");

  assert.match(appJs, /resolveSampleLibraryCalibrationPrefillSource/);
  assert.match(appJs, /function getActiveSampleLibraryCalibrationPrefillRecord\(/);
  assert.match(appJs, /modalState\.kind === "record-list-inline-editor"/);
  assert.match(appJs, /record: getActiveSampleLibraryCalibrationPrefillRecord\(\)/);
  assert.match(appJs, /const prefillSource = getSampleLibraryCalibrationPredictionPrefillSource\(\);/);
  assert.match(appJs, /setSampleLibraryCalibrationPrefillMessage\(prediction\.successMessage \|\| prefillSource\.successMessage \|\| "已预填预判字段。"\)/);
});
