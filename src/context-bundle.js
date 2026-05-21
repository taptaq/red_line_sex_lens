import { rankRelevantHistoricalRecords } from "./relevant-records.js";

function normalizeText(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function compactSummary(value = "", maxLength = 180) {
  const normalized = normalizeText(value);

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1).trim()}…`;
}

function buildReferenceSampleSummary(sample = {}) {
  return {
    id: String(sample?.id || "").trim(),
    title: String(sample?.title || "").trim(),
    summary: compactSummary(sample?.body || "", 180),
    tags: Array.isArray(sample?.tags) ? sample.tags.map((item) => String(item || "").trim()).filter(Boolean) : []
  };
}

export function buildScopedContextBundle({
  taskType = "unknown",
  current = {},
  records = [],
  referenceSamples = [],
  maxRecords = 3,
  maxReferenceSamples = 3
} = {}) {
  const rankedRecords = rankRelevantHistoricalRecords({
    title: current?.title || "",
    body: current?.body || "",
    tags: current?.tags || [],
    collectionType: current?.collectionType || "",
    records
  }).slice(0, Math.max(1, Number(maxRecords) || 3));

  const relevantRecords = rankedRecords.map((item) => ({
    id: item.id,
    score: item.score,
    reasons: item.reasons,
    title: String(item?.record?.note?.title || "").trim(),
    summary: compactSummary(item?.record?.note?.body || "", 180)
  })).filter((item) =>
    Array.isArray(item.reasons) &&
    item.reasons.some((reason) => /标签重合|合集匹配|标题短语命中|正文词命中/.test(String(reason || "")))
  );

  const relevantReferenceSamples = (Array.isArray(referenceSamples) ? referenceSamples : [])
    .slice(0, Math.max(1, Number(maxReferenceSamples) || 3))
    .map(buildReferenceSampleSummary)
    .filter((item) => item.id || item.title || item.summary);

  return {
    taskType: String(taskType || "").trim() || "unknown",
    relevantRecords,
    relevantReferenceSamples,
    retroSignalsSummary: relevantRecords.flatMap((item) => item.reasons).slice(0, 6),
    predictionEvidenceSummary: relevantRecords[0]?.summary || "",
    styleProfileSummary: "",
    riskSignalsSummary: []
  };
}
