import { createHash } from "node:crypto";

function normalizeString(value) {
  return String(value || "").trim();
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

function buildGeneratedId(sample) {
  const digest = createHash("sha1").update(JSON.stringify(sample)).digest("hex").slice(0, 12);
  return `review-benchmark-${digest}`;
}

export function normalizeReviewBenchmarkSample(sample = {}) {
  const input = sample.input && typeof sample.input === "object" ? sample.input : sample;
  const createdAt = isoTimestampOrNow(sample.createdAt);
  const normalized = {
    expectedType: normalizeExpectedType(sample.expectedType),
    createdAt,
    updatedAt: isoTimestampOrNow(sample.updatedAt) || createdAt,
    input: {
      title: normalizeString(input.title),
      body: normalizeString(input.body),
      coverText: normalizeString(input.coverText),
      tags: uniqueStrings(input.tags)
    }
  };

  return {
    id: normalizeString(sample.id) || buildGeneratedId(normalized),
    ...normalized
  };
}
