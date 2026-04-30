import { createHash } from "node:crypto";

function normalizeString(value) {
  return String(value || "").trim();
}

function normalizeComparableText(value) {
  return normalizeString(value).replace(/\s+/g, " ").toLowerCase();
}

function uniqueStrings(items = []) {
  return [...new Set((Array.isArray(items) ? items : [items]).map((item) => normalizeString(item)).filter(Boolean))];
}

function isoTimestampOrNow(value) {
  return normalizeString(value) || new Date().toISOString();
}

export function normalizeExpectedType(value = "") {
  const normalized = normalizeString(value).toLowerCase();

  if (["violation", "false_positive", "success"].includes(normalized)) {
    return normalized;
  }

  const chineseTypeMap = {
    违规样本: "violation",
    误报样本: "false_positive",
    正常样本: "success",
    成功样本: "success",
    正常通过样本: "success"
  };

  return chineseTypeMap[normalizeString(value)] || "";
}

export function normalizeReviewBenchmarkSource(source = null) {
  if (!source) {
    return null;
  }

  const normalizedSource = source && typeof source === "object" ? source : { type: source };
  const type = normalizeString(
    normalizedSource.type || normalizedSource.sourceType || normalizedSource.kind
  ).toLowerCase();
  const recordId = normalizeString(normalizedSource.recordId || normalizedSource.id);

  if (!["manual", "sample_library", "false_positive_log"].includes(type)) {
    return null;
  }

  if (type === "manual") {
    return { type: "manual" };
  }

  return {
    type,
    ...(recordId ? { recordId } : {})
  };
}

function buildGeneratedId(sample) {
  const digest = createHash("sha1").update(JSON.stringify(sample)).digest("hex").slice(0, 12);
  return `review-benchmark-${digest}`;
}

export function normalizeReviewBenchmarkSample(sample = {}) {
  const input = sample.input && typeof sample.input === "object" ? sample.input : sample;
  const createdAt = isoTimestampOrNow(sample.createdAt);
  const source = normalizeReviewBenchmarkSource(sample.source);
  const normalized = {
    expectedType: normalizeExpectedType(sample.expectedType),
    createdAt,
    updatedAt: isoTimestampOrNow(sample.updatedAt) || createdAt,
    ...(source ? { source } : {}),
    input: {
      title: normalizeString(input.title),
      body: normalizeString(input.body),
      coverText: normalizeString(input.coverText),
      collectionType: normalizeString(input.collectionType),
      tags: uniqueStrings(input.tags)
    }
  };

  return {
    id: normalizeString(sample.id) || buildGeneratedId(normalized),
    ...normalized
  };
}

export function buildReviewBenchmarkDuplicateKey(sample = {}) {
  const normalized = normalizeReviewBenchmarkSample(sample);

  return JSON.stringify({
    expectedType: normalized.expectedType,
    input: {
      title: normalizeComparableText(normalized.input?.title),
      body: normalizeComparableText(normalized.input?.body),
      coverText: normalizeComparableText(normalized.input?.coverText),
      collectionType: normalizeComparableText(normalized.input?.collectionType),
      tags: uniqueStrings(normalized.input?.tags || []).map((tag) => normalizeComparableText(tag)).sort()
    }
  });
}

export function findMatchingReviewBenchmarkSample(items = [], sample = {}) {
  const targetKey = buildReviewBenchmarkDuplicateKey(sample);

  return (Array.isArray(items) ? items : []).find((item) => buildReviewBenchmarkDuplicateKey(item) === targetKey) || null;
}

export function choosePreferredReviewBenchmarkSource(existingSource = null, incomingSource = null) {
  const current = normalizeReviewBenchmarkSource(existingSource);
  const incoming = normalizeReviewBenchmarkSource(incomingSource);

  if (!incoming) {
    return current;
  }

  if (!current) {
    return incoming;
  }

  if (current.type === "manual" && incoming.type !== "manual") {
    return incoming;
  }

  if (current.type === incoming.type && !current.recordId && incoming.recordId) {
    return incoming;
  }

  return current;
}
