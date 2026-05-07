import { withSampleWeight } from "./sample-weight.js";

function normalizeString(value) {
  return String(value || "").trim();
}

function uniqueStrings(items = []) {
  return [...new Set((Array.isArray(items) ? items : [items]).map((item) => normalizeString(item)).filter(Boolean))];
}

function compactText(value = "", maxLength = 36) {
  const text = normalizeString(value).replace(/\s+/g, " ");
  return text.length > maxLength ? text.slice(0, maxLength) : text;
}

function canonicalLifecycleKey(record = {}) {
  const note = normalizeNotePayload(record.note || record);
  const titleKey = normalizeString(note.title).toLowerCase();

  if (titleKey) {
    return `title:${titleKey}`;
  }

  return `content:${compactText(note.coverText || note.body, 80).toLowerCase()}`;
}

function normalizeNotePayload(note = {}) {
  return {
    title: normalizeString(note.title),
    body: normalizeString(note.body),
    coverText: normalizeString(note.coverText),
    tags: uniqueStrings(note.tags)
  };
}

function normalizeMetrics(metrics = {}) {
  return {
    likes: Math.max(0, Math.floor(Number(metrics.likes) || 0)),
    favorites: Math.max(0, Math.floor(Number(metrics.favorites) || 0)),
    comments: Math.max(0, Math.floor(Number(metrics.comments) || 0)),
    views: Math.max(0, Math.floor(Number(metrics.views) || 0))
  };
}

export function publishStatusLabel(status = "") {
  if (status === "published_passed") return "已发布通过";
  if (status === "limited") return "疑似限流";
  if (status === "violation") return "平台判违规";
  if (status === "false_positive") return "系统误报 / 平台放行";
  if (status === "positive_performance") return "过审且表现好";
  return "未发布";
}

export function normalizePublishStatus(status = "") {
  const value = normalizeString(status);

  if (
    ["not_published", "published_passed", "limited", "violation", "false_positive", "positive_performance"].includes(value)
  ) {
    return value;
  }

  return "not_published";
}

export function buildLifecycleRecord(payload = {}) {
  const now = new Date().toISOString();
  const note = normalizeNotePayload(payload.note || payload);
  const source = normalizeString(payload.source) || "manual";
  const stage = normalizeString(payload.stage) || (source.startsWith("generation") ? "generated" : "draft");
  const titleSeed = compactText(note.title || note.body || note.coverText || source, 24) || "note";

  return withSampleWeight({
    id: normalizeString(payload.id) || `note-life-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    name: normalizeString(payload.name) || `${titleSeed} / ${publishStatusLabel("not_published")}`,
    source,
    stage,
    status: normalizePublishStatus(payload.status),
    note,
    snapshots: {
      analysis: payload.analysis || payload.analysisSnapshot || null,
      rewrite: payload.rewrite || payload.rewriteSnapshot || null,
      generation: payload.generation || payload.generationSnapshot || null,
      crossReview: payload.crossReview || payload.crossReviewSnapshot || null
    },
    publishResult: normalizePublishResult(payload.publishResult || payload),
    createdAt: normalizeString(payload.createdAt) || now,
    updatedAt: normalizeString(payload.updatedAt) || now
  }, "lifecycle");
}

export function normalizePublishResult(payload = {}) {
  const status = normalizePublishStatus(payload.publishStatus || payload.status);
  const now = new Date().toISOString();
  const metricSource =
    payload.metrics && typeof payload.metrics === "object" ? payload.metrics : payload.publish?.metrics || payload;

  return {
    status,
    label: publishStatusLabel(status),
    publishedAt: normalizeString(payload.publishedAt),
    platformReason: normalizeString(payload.platformReason),
    notes: normalizeString(payload.notes || payload.publishNotes),
    metrics: normalizeMetrics(metricSource),
    updatedAt: normalizeString(payload.updatedAt) || now
  };
}

export function updateLifecyclePublishResult(record = {}, payload = {}) {
  const publishResult = normalizePublishResult(payload);

  return withSampleWeight({
    ...record,
    status: publishResult.status,
    stage: publishResult.status === "not_published" ? record.stage || "draft" : "published",
    publishResult,
    updatedAt: new Date().toISOString()
  }, "lifecycle");
}

export function upsertLifecycleRecords(current = [], records = []) {
  const incoming = (Array.isArray(records) ? records : [records]).filter(Boolean);
  const currentItems = Array.isArray(current) ? current : [];
  const byId = new Map(currentItems.map((item) => [normalizeString(item.id), item]));
  const idByLifecycleKey = new Map(
    currentItems
      .map((item) => [canonicalLifecycleKey(item), normalizeString(item.id)])
      .filter(([key, id]) => key && id)
  );

  for (const item of incoming) {
    const itemId = normalizeString(item.id);
    const existingId = idByLifecycleKey.get(canonicalLifecycleKey(item));

    if (existingId && existingId !== itemId) {
      const existing = byId.get(existingId) || {};
      byId.set(existingId, {
        ...item,
        id: existingId,
        createdAt: existing.createdAt || item.createdAt
      });
      continue;
    }

    byId.set(itemId, item);
  }

  return [...byId.values()];
}
