import { ensureArray, normalizeText } from "./normalizer.js";

export const referenceMetricThreshold = {
  likes: 20,
  favorites: 5,
  comments: 2,
  nearLikes: 16,
  nearFavorites: 4,
  nearComments: 1,
  supportViews: 5000
};

export const referenceSampleSupportThreshold = 3.6;

function normalizeString(value = "") {
  return String(value || "").trim();
}

function normalizeMetric(value) {
  const number = Number(String(value ?? "").trim());
  return Number.isFinite(number) && number > 0 ? number : 0;
}

function roundNumber(value) {
  return Math.round(Math.max(0, value) * 100) / 100;
}

function normalizedLength(value = "") {
  return normalizeText(value).length;
}

function buildBigrams(value = "") {
  const normalized = normalizeText(value);

  if (normalized.length < 2) {
    return new Set(normalized ? [normalized] : []);
  }

  const items = new Set();

  for (let index = 0; index < normalized.length - 1; index += 1) {
    items.add(normalized.slice(index, index + 2));
  }

  return items;
}

function jaccardSimilarity(left = "", right = "") {
  const leftSet = buildBigrams(left);
  const rightSet = buildBigrams(right);

  if (!leftSet.size || !rightSet.size) {
    return 0;
  }

  let overlap = 0;

  for (const item of leftSet) {
    if (rightSet.has(item)) {
      overlap += 1;
    }
  }

  return overlap / new Set([...leftSet, ...rightSet]).size;
}

function compareTextSimilarity(currentValue = "", sampleValue = "", { field = "", exact = 0, contains = 0, strong = 0, weak = 0 } = {}) {
  const current = normalizeText(currentValue);
  const sample = normalizeText(sampleValue);

  if (!current || !sample) {
    return { score: 0, reason: "" };
  }

  if (current === sample) {
    return { score: exact, reason: field };
  }

  if (current.length >= 8 && sample.length >= 8 && (current.includes(sample) || sample.includes(current))) {
    return { score: contains, reason: field };
  }

  const similarity = jaccardSimilarity(currentValue, sampleValue);

  if (similarity >= 0.7) {
    return { score: strong, reason: field };
  }

  if (similarity >= 0.52) {
    return { score: weak, reason: field };
  }

  return { score: 0, reason: "" };
}

function normalizeSampleMetrics(sample = {}) {
  return sample.metrics || sample.publishResult?.metrics || sample.publish?.metrics || {};
}

function normalizeSampleStatus(sample = {}) {
  const status = normalizeString(sample.status || sample.publishResult?.status || sample.publish?.status);

  if (status) {
    return status;
  }

  return normalizeString(sample.tier) ? "published_passed" : "";
}

function normalizeSampleCollectionType(sample = {}) {
  return normalizeString(sample.collectionType || sample.note?.collectionType);
}

function normalizeSampleTitle(sample = {}) {
  return normalizeString(sample.title || sample.note?.title);
}

function normalizeSampleBody(sample = {}) {
  return normalizeString(sample.body || sample.note?.body);
}

function normalizeSampleCoverText(sample = {}) {
  return normalizeString(sample.coverText || sample.note?.coverText);
}

function normalizeSampleTags(sample = {}) {
  return ensureArray(sample.tags || sample.note?.tags);
}

export function isPositiveReferenceStatus(status = "") {
  return ["published_passed", "positive_performance"].includes(normalizeString(status));
}

export function evaluateReferenceSampleThreshold(metrics = {}) {
  const likes = normalizeMetric(metrics.likes);
  const favorites = normalizeMetric(metrics.favorites);
  const comments = normalizeMetric(metrics.comments);
  const views = normalizeMetric(metrics.views);

  const nearQualified =
    likes >= referenceMetricThreshold.nearLikes ||
    favorites >= referenceMetricThreshold.nearFavorites ||
    comments >= referenceMetricThreshold.nearComments;
  const highViews = views >= referenceMetricThreshold.supportViews;

  const directQualified =
    likes >= referenceMetricThreshold.likes ||
    favorites >= referenceMetricThreshold.favorites ||
    comments >= referenceMetricThreshold.comments;

  if (directQualified) {
    return {
      qualified: true,
      reason: "互动达标",
      mode: "engagement",
      nearQualified: true,
      highViews
    };
  }

  if (nearQualified && highViews) {
    return {
      qualified: true,
      reason: "互动接近达标，已由高浏览数补足",
      mode: "views_assist",
      nearQualified,
      highViews
    };
  }

  return {
    qualified: false,
    reason: "",
    mode: "none",
    nearQualified,
    highViews
  };
}

export function meetsReferenceSampleThreshold(metrics = {}) {
  return evaluateReferenceSampleThreshold(metrics).qualified;
}

export function hasReferenceSampleContent(sample = {}) {
  return (
    normalizedLength(normalizeSampleTitle(sample)) >= 4 ||
    normalizedLength(normalizeSampleBody(sample)) >= 16 ||
    normalizedLength(normalizeSampleCoverText(sample)) >= 4
  );
}

export function isQualifiedReferenceSample(sample = {}) {
  return (
    isPositiveReferenceStatus(normalizeSampleStatus(sample)) &&
    meetsReferenceSampleThreshold(normalizeSampleMetrics(sample)) &&
    hasReferenceSampleContent(sample)
  );
}

export function isQualifiedReferenceRecord(record = {}) {
  return record?.reference?.enabled === true && isQualifiedReferenceSample(record);
}

export function filterQualifiedReferenceSamples(samples = []) {
  return (Array.isArray(samples) ? samples : []).filter((sample) => isQualifiedReferenceSample(sample));
}

export function findReferenceSampleHints(samples = [], input = {}) {
  const sourceSamples = filterQualifiedReferenceSamples(samples);
  const currentTags = ensureArray(input.tags);
  const currentCollectionType = normalizeString(input.collectionType);
  const matched = [];

  for (const sample of sourceSamples) {
    const reasons = [];
    let supportScore = 0;

    const titleMatch = compareTextSimilarity(input.title, normalizeSampleTitle(sample), {
      field: "标题",
      exact: 2.2,
      contains: 1.8,
      strong: 1.5,
      weak: 0.9
    });
    const bodyMatch = compareTextSimilarity(input.body, normalizeSampleBody(sample), {
      field: "正文",
      exact: 3,
      contains: 2.4,
      strong: 2.1,
      weak: 1.2
    });
    const coverMatch = compareTextSimilarity(input.coverText, normalizeSampleCoverText(sample), {
      field: "封面文案",
      exact: 1.2,
      contains: 0.9,
      strong: 0.8,
      weak: 0.4
    });

    for (const match of [titleMatch, bodyMatch, coverMatch]) {
      if (match.reason) {
        supportScore += match.score;
        reasons.push(match.reason);
      }
    }

    const sampleTags = normalizeSampleTags(sample);
    const tagOverlap = currentTags.filter((tag) => sampleTags.includes(tag));
    if (tagOverlap.length) {
      supportScore += Math.min(1.2, tagOverlap.length * 0.45);
      reasons.push("标签");
    }

    const sampleCollectionType = normalizeSampleCollectionType(sample);
    if (currentCollectionType && sampleCollectionType && currentCollectionType === sampleCollectionType) {
      supportScore += 0.75;
      reasons.push("集合类型");
    }

    const uniqueReasons = [...new Set(reasons)];

    if (supportScore < referenceSampleSupportThreshold || !uniqueReasons.length) {
      continue;
    }

    matched.push({
      sourceId: normalizeString(sample.id),
      title: normalizeSampleTitle(sample),
      tier: normalizeString(sample.tier),
      status: normalizeSampleStatus(sample),
      sampleWeight: roundNumber(Number(sample.sampleWeight || 0)),
      supportScore: roundNumber(supportScore),
      reasons: uniqueReasons,
      collectionType: sampleCollectionType,
      tags: sampleTags
    });
  }

  matched.sort((left, right) => {
    if (right.supportScore !== left.supportScore) {
      return right.supportScore - left.supportScore;
    }

    return (right.sampleWeight || 0) - (left.sampleWeight || 0);
  });

  const topMatches = matched.slice(0, 3);

  return {
    matchedReferenceSamples: topMatches,
    referenceSampleHints: topMatches.map((item) => ({
      sourceId: item.sourceId,
      title: item.title,
      supportScore: item.supportScore,
      message: `参考样本「${item.title || item.sourceId || "未命名样本"}」在${item.reasons.join("、")}上接近当前内容。`
    })),
    referenceSampleSupportScore: topMatches[0]?.supportScore || 0
  };
}
