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

function normalizeConfidence(value = "", fallback = "pending") {
  const normalized = normalizeString(value).toLowerCase();
  return normalized === "confirmed" || normalized === "pending" ? normalized : fallback;
}

function normalizeSourceQuality(value = "", fallback = "unknown") {
  const normalized = normalizeString(value).toLowerCase();
  return ["manual_verified", "imported", "unknown"].includes(normalized) ? normalized : fallback;
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

function viewsAssistBoost(metrics = {}) {
  const views = normalizeNumber(metrics.views);

  if (views < 3000) {
    return 0;
  }

  if (views >= 10000) {
    return 0.18;
  }

  if (views >= 5000) {
    return 0.1;
  }

  return 0.04;
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

function confidenceBoost(item = {}, fallback = "pending") {
  return normalizeConfidence(item.confidence, fallback) === "confirmed" ? 0.35 : 0;
}

function sourceQualityBoost(item = {}, fallback = "unknown") {
  const sourceQuality = normalizeSourceQuality(item.sourceQuality, fallback);

  if (sourceQuality === "manual_verified") return 0.2;
  if (sourceQuality === "imported") return 0.05;
  if (sourceQuality === "unknown") return -0.05;
  return 0;
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
    return roundWeight(
      (successTierBase[tier] || successTierBase.passed) +
        confidenceBoost(item, normalizeString(item.source) === "manual" ? "confirmed" : "pending") +
        sourceQualityBoost(item, normalizeString(item.source) === "manual" ? "manual_verified" : "imported") +
        engagementBoost(item.metrics) +
        viewsAssistBoost(item.metrics) +
        recencyBoost(item)
    );
  }

  if (resolvedKind === "false_positive") {
    const auditBonus = normalizeString(item.falsePositiveAudit?.signal) === "strict_confirmed" ? 0.25 : 0;
    return roundWeight(
      (falsePositiveStatusBase[status] || 0.7) +
        confidenceBoost(item, status === "platform_passed_confirmed" ? "confirmed" : "pending") +
        sourceQualityBoost(item) +
        auditBonus +
        recencyBoost(item)
    );
  }

  if (resolvedKind === "lifecycle") {
    const metrics = item.publishResult?.metrics || item.metrics;
    return roundWeight(
      (lifecycleStatusBase[status] || lifecycleStatusBase.not_published) + engagementBoost(metrics) + viewsAssistBoost(metrics) + recencyBoost(item)
    );
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
