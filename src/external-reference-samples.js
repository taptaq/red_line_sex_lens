import crypto from "node:crypto";

function normalizeString(value) {
  return String(value || "").trim();
}

function uniqueStrings(items = []) {
  return [...new Set((Array.isArray(items) ? items : [items]).map((item) => normalizeString(item)).filter(Boolean))];
}

function normalizeMetric(value) {
  const number = Number(String(value ?? "").trim());
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : 0;
}

function normalizeMetrics(metrics = {}) {
  return {
    likes: normalizeMetric(metrics.likes),
    favorites: normalizeMetric(metrics.favorites),
    comments: normalizeMetric(metrics.comments),
    views: normalizeMetric(metrics.views),
    shares: normalizeMetric(metrics.shares)
  };
}

export function normalizeExternalReferenceSample(item = {}) {
  const publish = item?.publish && typeof item.publish === "object" ? item.publish : {};
  const now = new Date().toISOString();

  return {
    id: normalizeString(item.id) || `external-sample-${crypto.randomUUID()}`,
    title: normalizeString(item.title),
    body: normalizeString(item.body),
    tags: uniqueStrings(item.tags || []),
    collectionType: normalizeString(item.collectionType) || "科普",
    notes: normalizeString(item.notes),
    createdAt: normalizeString(item.createdAt) || now,
    updatedAt: now,
    publish: {
      status: normalizeString(publish.status || item.publishStatus) || "positive_performance",
      publishedAt: normalizeString(publish.publishedAt || item.publishedAt),
      platformReason: normalizeString(publish.platformReason || item.platformReason),
      notes: normalizeString(publish.notes || item.publishNotes),
      metrics: normalizeMetrics(publish.metrics || item.metrics || item)
    }
  };
}
