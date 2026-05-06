import { ensureArray, normalizeText } from "./normalizer.js";
import { calculateSampleWeight } from "./sample-weight.js";

function normalizeString(value) {
  return String(value || "").trim();
}

function compactText(value = "", maxLength = 96) {
  const text = normalizeString(value).replace(/\s+/g, " ");
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

function detectDraftMatch(draft = {}, sample = {}) {
  const text = [sample.title, sample.body, sample.coverText, ensureArray(sample.tags).join(" ")].join("\n");

  if (draft.targetScope === "whitelist") {
    const phrase = normalizeString(draft.phrase || draft.term);
    return Boolean(phrase && normalizeText(text).includes(normalizeText(phrase)));
  }

  if (draft.match === "regex" && draft.pattern) {
    try {
      return new RegExp(draft.pattern, "iu").test(text);
    } catch {
      return false;
    }
  }

  const term = normalizeString(draft.term || draft.phrase);
  return Boolean(term && normalizeText(text).includes(normalizeText(term)));
}

function normalizeHistorySample(item = {}, kind = "generic") {
  const note = item.note || {};
  const title = normalizeString(item.title || note.title);
  const body = normalizeString(item.body || item.noteContent || note.body);
  const coverText = normalizeString(item.coverText || note.coverText);
  const status = normalizeString(item.status || item.publishResult?.status);
  const verdict = normalizeString(item.analysisSnapshot?.verdict || item.analysisSnapshot?.finalVerdict);

  return {
    id: normalizeString(item.id || item.noteId || `${kind}-${title || compactText(body, 24)}`),
    kind,
    title,
    body,
    coverText,
    tags: ensureArray(item.tags || note.tags),
    status,
    verdict,
    platformReason: normalizeString(item.platformReason),
    sampleWeight: calculateSampleWeight(item, kind === "feedback" ? "generic" : kind)
  };
}

function buildHistorySamples(histories = {}) {
  return [
    ...ensureArray(histories.successSamples).map((item) => normalizeHistorySample(item, "success")),
    ...ensureArray(histories.falsePositiveLog).map((item) => normalizeHistorySample(item, "false_positive")),
    ...ensureArray(histories.noteLifecycle).map((item) => normalizeHistorySample(item, "lifecycle")),
    ...ensureArray(histories.feedbackLog).map((item) => normalizeHistorySample(item, "feedback"))
  ].filter((item) => item.title || item.body || item.coverText || item.tags.length);
}

function classifySampleImpact(sample = {}) {
  const safeKinds = new Set(["success", "false_positive", "lifecycle", "rewrite_after"]);

  if (sample.verdict === "hard_block" || sample.kind === "feedback" || sample.status === "violation") {
    return "violation_like";
  }

  if (
    safeKinds.has(sample.kind) &&
    ["positive_performance", "published_passed", "platform_passed_confirmed", ""].includes(sample.status)
  ) {
    return "safe_like";
  }

  return "unknown";
}

function riskLevelForPreview({ changeType, impactedSamples, totalImpactWeight }) {
  const violationCount = impactedSamples.filter((item) => item.impactClass === "violation_like").length;
  const highValueSafeCount = impactedSamples.filter((item) => item.impactClass === "safe_like" && item.sampleWeight >= 2).length;

  if (changeType === "whitelist" && violationCount > 0) {
    return "high";
  }

  if (changeType === "lexicon" && highValueSafeCount > 0) {
    return "medium";
  }

  if (totalImpactWeight >= 8 || impactedSamples.length >= 8) {
    return "medium";
  }

  return impactedSamples.length ? "low" : "none";
}

function buildWarnings({ changeType, impactedSamples }) {
  const warnings = [];
  const violationCount = impactedSamples.filter((item) => item.impactClass === "violation_like").length;
  const highValueSafeCount = impactedSamples.filter((item) => item.impactClass === "safe_like" && item.sampleWeight >= 2).length;

  if (changeType === "whitelist" && violationCount) {
    warnings.push(`该白名单候选会命中 ${violationCount} 条违规/高风险历史样本，可能放宽过头。`);
  }

  if (changeType === "lexicon" && highValueSafeCount) {
    warnings.push(`该规则候选会命中 ${highValueSafeCount} 条高权重安全样本，可能造成误杀。`);
  }

  if (impactedSamples.length >= 8) {
    warnings.push("影响范围较大，建议先收窄词或语境。");
  }

  return warnings;
}

export function buildRuleChangePreview({ draft = {}, histories = {} } = {}) {
  const changeType = draft.targetScope === "whitelist" ? "whitelist" : "lexicon";
  const impactedSamples = buildHistorySamples(histories)
    .filter((sample) => detectDraftMatch(draft, sample))
    .map((sample) => ({
      id: sample.id,
      kind: sample.kind,
      title: sample.title || compactText(sample.body, 36) || "未命名样本",
      verdict: sample.verdict,
      status: sample.status,
      platformReason: sample.platformReason,
      sampleWeight: sample.sampleWeight,
      impactClass: classifySampleImpact(sample),
      previewEffect:
        changeType === "whitelist"
          ? sample.verdict === "hard_block"
            ? "命中但不会自动放行硬拦截"
            : "命中后可能降低人工复核权重"
          : `命中后可能新增 ${draft.riskLevel || "manual_review"} 判断`
    }))
    .sort((a, b) => b.sampleWeight - a.sampleWeight)
    .slice(0, 12);
  const totalImpactWeight = Math.round(impactedSamples.reduce((total, item) => total + item.sampleWeight, 0) * 100) / 100;
  const warnings = buildWarnings({ changeType, impactedSamples });
  const riskLevel = riskLevelForPreview({ changeType, impactedSamples, totalImpactWeight });

  return {
    changeType,
    riskLevel,
    impactedCount: impactedSamples.length,
    totalImpactWeight,
    warnings,
    summary:
      impactedSamples.length === 0
        ? "未命中历史样本，当前影响面较小。"
        : warnings[0] || `预计影响 ${impactedSamples.length} 条历史样本，影响权重 ${totalImpactWeight}。`,
    impactedSamples
  };
}
