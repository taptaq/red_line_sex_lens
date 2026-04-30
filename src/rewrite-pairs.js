import { ensureArray } from "./normalizer.js";

const severityRank = {
  pass: 0,
  observe: 1,
  manual_review: 2,
  hard_block: 3
};

function uniqueStrings(items = []) {
  return [...new Set((Array.isArray(items) ? items : [items]).map((item) => String(item || "").trim()).filter(Boolean))];
}

function normalizePairContent(input = {}) {
  return {
    title: String(input.title || "").trim(),
    body: String(input.body || "").trim(),
    coverText: String(input.coverText || "").trim(),
    tags: uniqueStrings(ensureArray(input.tags))
  };
}

function hasMeaningfulPairContent(input = {}) {
  const normalized = normalizePairContent(input);
  return Boolean(normalized.title || normalized.body || normalized.coverText || normalized.tags.length);
}

export function isMeaningfulRewritePairRecord(input = {}) {
  return hasMeaningfulPairContent(input.before || {}) || hasMeaningfulPairContent(input.after || {});
}

function summarizeChanges(before, after) {
  const changedFields = ["title", "body", "coverText", "tags"].filter((field) => {
    const beforeValue = field === "tags" ? before.tags.join("、") : before[field];
    const afterValue = field === "tags" ? after.tags.join("、") : after[field];
    return String(beforeValue || "").trim() !== String(afterValue || "").trim();
  });

  return changedFields;
}

export function buildRewritePairRecord(input = {}) {
  const before = normalizePairContent(input.before || {});
  const after = normalizePairContent(input.after || {});
  const beforeAnalysis = input.beforeAnalysis || {};
  const afterAnalysis = input.afterAnalysis || {};
  const beforeVerdict = String(beforeAnalysis.verdict || "pass").trim();
  const afterVerdict = String(afterAnalysis.verdict || "pass").trim();
  const beforeScore = Number(beforeAnalysis.score);
  const afterScore = Number(afterAnalysis.score);
  const changedFields = summarizeChanges(before, after);
  const beforeRank = severityRank[beforeVerdict] ?? 0;
  const afterRank = severityRank[afterVerdict] ?? 0;
  const beforeValue = Number.isFinite(beforeScore) ? beforeScore : 0;
  const afterValue = Number.isFinite(afterScore) ? afterScore : 0;

  return {
    id: String(input.id || `rewrite-pair-${Date.now()}`).trim(),
    name: String(input.name || "").trim(),
    source: String(input.source || "manual").trim() || "manual",
    before,
    after,
    beforePlatformReason: String(input.beforePlatformReason || "").trim(),
    afterPlatformReason: String(input.afterPlatformReason || "").trim(),
    rewriteModel: String(input.rewriteModel || "").trim(),
    rewriteStrategy: String(input.rewriteStrategy || "").trim(),
    effectiveChanges: String(input.effectiveChanges || "").trim(),
    beforeAnalysis: {
      verdict: beforeVerdict,
      score: beforeValue,
      categories: uniqueStrings(beforeAnalysis.categories),
      suggestions: uniqueStrings(beforeAnalysis.suggestions).slice(0, 3)
    },
    afterAnalysis: {
      verdict: afterVerdict,
      score: afterValue,
      categories: uniqueStrings(afterAnalysis.categories),
      suggestions: uniqueStrings(afterAnalysis.suggestions).slice(0, 3)
    },
    outcome: {
      scoreDelta: afterValue - beforeValue,
      severityDelta: afterRank - beforeRank,
      improved: afterRank <= beforeRank && afterValue <= beforeValue,
      changedFields
    },
    createdAt: String(input.createdAt || new Date().toISOString()).trim()
  };
}
