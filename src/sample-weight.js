const successTierBase = {
  passed: 1,
  performed: 2,
  featured: 3
};

const falsePositiveStatusBase = {
  platform_passed_pending: 1,
  platform_passed_confirmed: 2.4
};

const lifecycleStatusBase = {
  not_published: 0.4,
  limited: 0.7,
  violation: 0.2,
  published_passed: 1.5,
  false_positive: 2.2,
  positive_performance: 3
};

function normalizeNumber(value) {
  const number = Number(String(value ?? "").trim());
  return Number.isFinite(number) && number > 0 ? number : 0;
}

function normalizeString(value) {
  return String(value || "").trim();
}

function engagementBoost(metrics = {}) {
  const likes = normalizeNumber(metrics.likes);
  const favorites = normalizeNumber(metrics.favorites);
  const comments = normalizeNumber(metrics.comments);
  const engagementScore = likes + favorites * 2 + comments * 3;

  if (!engagementScore) {
    return 0;
  }

  return Math.min(1.6, Math.log10(engagementScore + 1) * 0.42);
}

function recencyBoost(item = {}) {
  const sourceDate = normalizeString(item.updatedAt || item.createdAt || item.publishedAt || item.observedAt);

  if (!sourceDate) {
    return 0;
  }

  const timestamp = Date.parse(sourceDate);

  if (!Number.isFinite(timestamp)) {
    return 0;
  }

  const ageDays = Math.max(0, (Date.now() - timestamp) / 86400000);

  if (ageDays <= 30) return 0.25;
  if (ageDays <= 90) return 0.15;
  if (ageDays <= 180) return 0.05;
  return 0;
}

function roundWeight(value) {
  return Math.round(Math.max(0, value) * 100) / 100;
}

function inferKind(item = {}, kind = "auto") {
  if (kind && kind !== "auto") {
    return kind;
  }

  if (normalizeString(item.tier)) return "success";
  if (normalizeString(item.status).startsWith("platform_passed_")) return "false_positive";
  if (item.publishResult || normalizeString(item.source) === "generation" || normalizeString(item.stage)) return "lifecycle";
  return "generic";
}

export function calculateSampleWeight(item = {}, kind = "auto") {
  const resolvedKind = inferKind(item, kind);
  const status = normalizeString(item.publishResult?.status || item.status);

  if (resolvedKind === "success") {
    const tier = normalizeString(item.tier) || "passed";
    return roundWeight((successTierBase[tier] || successTierBase.passed) + engagementBoost(item.metrics) + recencyBoost(item));
  }

  if (resolvedKind === "false_positive") {
    const auditBonus = normalizeString(item.falsePositiveAudit?.signal) === "strict_confirmed" ? 0.25 : 0;
    return roundWeight((falsePositiveStatusBase[status] || 0.7) + auditBonus + recencyBoost(item));
  }

  if (resolvedKind === "lifecycle") {
    return roundWeight((lifecycleStatusBase[status] || lifecycleStatusBase.not_published) + engagementBoost(item.publishResult?.metrics || item.metrics) + recencyBoost(item));
  }

  return roundWeight(1 + recencyBoost(item));
}

export function withSampleWeight(item = {}, kind = "auto") {
  return {
    ...item,
    sampleWeight: calculateSampleWeight(item, kind)
  };
}

export function rankSamplesByWeight(items = [], kind = "auto") {
  return (Array.isArray(items) ? items : [])
    .map((item) => withSampleWeight(item, kind))
    .sort((a, b) => b.sampleWeight - a.sampleWeight);
}
