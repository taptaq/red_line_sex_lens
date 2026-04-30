import path from "node:path";
import { analyzePost } from "../analyzer.js";
import { readImportFile } from "../data-store.js";
import { normalizeExpectedType } from "../review-benchmark.js";
import { buildXhsHumanizerBenchmarkRubric, evaluateXhsHumanizerSignals } from "../xhs-humanizer-rules.js";

function normalizeVerdict(value = "") {
  const normalized = String(value || "").trim().toLowerCase();
  return ["pass", "observe", "manual_review", "hard_block"].includes(normalized) ? normalized : "manual_review";
}

function normalizeInput(input = {}) {
  return {
    title: String(input.title || "").trim(),
    body: String(input.body || "").trim(),
    coverText: String(input.coverText || "").trim(),
    tags: Array.isArray(input.tags) ? input.tags.map((item) => String(item || "").trim()).filter(Boolean) : []
  };
}

function summarizeCounts(items = [], keySelector) {
  return items.reduce((summary, item) => {
    const key = keySelector(item);
    summary[key] = (summary[key] || 0) + 1;
    return summary;
  }, {});
}

function expectedVerdictGroup(expectedType = "") {
  if (expectedType === "success") {
    return "accepted";
  }

  if (expectedType === "violation") {
    return "blocked";
  }

  return "flagged";
}

function matchesExpectedGroup(group = "", verdict = "") {
  if (group === "accepted") {
    return verdict === "pass" || verdict === "observe";
  }

  if (group === "blocked") {
    return verdict === "hard_block";
  }

  return verdict === "manual_review" || verdict === "hard_block";
}

async function evaluateSample(sample, index, analyzeCandidate) {
  const expectedType = normalizeExpectedType(sample.expectedType);

  if (!expectedType) {
    const error = new Error(`基准样本预期类型无效：${String(sample.id || `review-benchmark-${index + 1}`).trim()}`);
    error.statusCode = 400;
    throw error;
  }

  const input = normalizeInput(sample.input || sample);
  const analysis = await analyzeCandidate(input);
  const actualVerdict = normalizeVerdict(analysis.finalVerdict || analysis.verdict);
  const group = expectedVerdictGroup(expectedType);
  const humanizer = evaluateXhsHumanizerSignals(input);

  return {
    id: String(sample.id || `review-benchmark-${index + 1}`).trim(),
    expectedType,
    expectedVerdictGroup: group,
    actualVerdict,
    matchedExpectation: matchesExpectedGroup(group, actualVerdict),
    score: Number(analysis.score) || 0,
    input,
    analysis,
    humanizer
  };
}

export async function runReviewBenchmarkHarness({
  filePath,
  samples: providedSamples,
  analyzeCandidate = analyzePost
} = {}) {
  const resolvedPath = filePath ? path.resolve(filePath) : "";
  const samples = Array.isArray(providedSamples) ? providedSamples : await readImportFile(resolvedPath);

  if (!Array.isArray(samples) || !samples.length) {
    throw new Error(`评测样本为空：${resolvedPath || "(in-memory)"}`);
  }

  const results = [];

  for (let index = 0; index < samples.length; index += 1) {
    results.push(await evaluateSample(samples[index], index, analyzeCandidate));
  }

  const passed = results.filter((item) => item.matchedExpectation).length;
  const rubric = buildXhsHumanizerBenchmarkRubric();
  const humanizerPassed = results.filter((item) => item.humanizer?.passed).length;
  const humanizerByCheck = rubric.reduce((summary, item) => {
    const failed = results.filter((result) => result.humanizer?.checks?.some((check) => check.id === item.id && check.passed === false)).length;

    summary[item.id] = {
      label: item.label,
      description: item.description,
      passed: results.length - failed,
      failed
    };

    return summary;
  }, {});

  return {
    ok: passed === results.length,
    sampleFile: resolvedPath || "(in-memory)",
    summary: {
      total: results.length,
      passed,
      failed: results.length - passed,
      byExpectedType: summarizeCounts(results, (item) => item.expectedType),
      byVerdict: summarizeCounts(results, (item) => item.actualVerdict),
      humanizer: {
        total: results.length,
        passedSamples: humanizerPassed,
        failedSamples: results.length - humanizerPassed,
        byCheck: humanizerByCheck
      }
    },
    results
  };
}
