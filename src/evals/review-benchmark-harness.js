import path from "node:path";
import { analyzePost } from "../analyzer.js";
import { readImportFile } from "../data-store.js";

function normalizeExpectedType(value = "") {
  const normalized = String(value || "").trim().toLowerCase();
  return ["violation", "false_positive", "success"].includes(normalized) ? normalized : "success";
}

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
  const input = normalizeInput(sample.input || sample);
  const analysis = await analyzeCandidate(input);
  const actualVerdict = normalizeVerdict(analysis.finalVerdict || analysis.verdict);
  const group = expectedVerdictGroup(expectedType);

  return {
    id: String(sample.id || `review-benchmark-${index + 1}`).trim(),
    expectedType,
    expectedVerdictGroup: group,
    actualVerdict,
    matchedExpectation: matchesExpectedGroup(group, actualVerdict),
    score: Number(analysis.score) || 0,
    input,
    analysis
  };
}

export async function runReviewBenchmarkHarness({
  filePath,
  analyzeCandidate = analyzePost
} = {}) {
  const resolvedPath = path.resolve(filePath);
  const samples = await readImportFile(resolvedPath);

  if (!Array.isArray(samples) || !samples.length) {
    throw new Error(`评测样本为空：${resolvedPath}`);
  }

  const results = [];

  for (let index = 0; index < samples.length; index += 1) {
    results.push(await evaluateSample(samples[index], index, analyzeCandidate));
  }

  const passed = results.filter((item) => item.matchedExpectation).length;

  return {
    ok: passed === results.length,
    sampleFile: resolvedPath,
    summary: {
      total: results.length,
      passed,
      failed: results.length - passed,
      byExpectedType: summarizeCounts(results, (item) => item.expectedType),
      byVerdict: summarizeCounts(results, (item) => item.actualVerdict)
    },
    results
  };
}
