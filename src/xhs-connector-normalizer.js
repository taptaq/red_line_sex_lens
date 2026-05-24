function normalizeMetricNumber(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeNoteType(value = "") {
  const text = String(value || "").trim().toLowerCase();
  if (text === "video") return "video";
  if (text === "normal" || text === "image") return "image";
  return "unknown";
}

function normalizeTagList(items = []) {
  return Array.isArray(items)
    ? [...new Set(items.map((item) => String(item || "").trim()).filter(Boolean))]
    : [];
}

function normalizeMetrics(metrics = {}) {
  return {
    likes: normalizeMetricNumber(metrics.likes),
    favorites: normalizeMetricNumber(metrics.favorites),
    comments: normalizeMetricNumber(metrics.comments),
    views: normalizeMetricNumber(metrics.views),
    shares: normalizeMetricNumber(metrics.shares)
  };
}

const KNOWN_PUBLISH_STATUSES = new Set([
  "not_published",
  "published_passed",
  "limited",
  "violation",
  "false_positive",
  "positive_performance"
]);

function normalizeConnectorPublishStatus(value) {
  const status = String(value || "").trim();
  return KNOWN_PUBLISH_STATUSES.has(status) ? status : "published_passed";
}

export function normalizeXhsConnectorDiscoveryItem(item = {}) {
  return {
    provider: String(item.provider || "").trim() || "stub",
    noteId: String(item.noteId || item.note_id || "").trim(),
    xsecToken: String(item.xsecToken || item.xsec_token || "").trim(),
    url: String(item.url || "").trim(),
    title: String(item.title || "").trim(),
    bodyPreview: String(item.bodyPreview || item.desc || item.body || "").trim(),
    coverText: String(item.coverText || "").trim(),
    authorName: String(item.authorName || item.author_name || "").trim(),
    authorId: String(item.authorId || item.author_id || "").trim(),
    noteType: normalizeNoteType(item.noteType || item.type),
    publishedAt: String(item.publishedAt || item.publish_time || "").trim(),
    metrics: normalizeMetrics(item.metrics || {}),
    tags: normalizeTagList(item.tags || [])
  };
}

export function buildSampleLibraryPayloadFromConnectorItem(item = {}, options = {}) {
  const normalized = normalizeXhsConnectorDiscoveryItem(item);
  const fetchedAt = String(options.fetchedAt || "").trim() || new Date().toISOString();

  return {
    source: "imported",
    stage: "draft",
    sampleType: "",
    note: {
      title: normalized.title,
      body: normalized.bodyPreview,
      coverText: normalized.coverText,
      collectionType: "",
      tags: normalized.tags
    },
    publish: {
      status: normalized.publishedAt ? "published_passed" : "not_published",
      publishedAt: normalized.publishedAt,
      platformReason: "",
      notes: "",
      metrics: normalized.metrics
    },
    reference: {
      enabled: false,
      tier: "",
      notes: ""
    },
    calibration: {
      prediction: {},
      retro: {}
    },
    externalSource: {
      provider: normalized.provider,
      noteId: normalized.noteId,
      xsecToken: normalized.xsecToken,
      url: normalized.url,
      authorId: normalized.authorId,
      authorName: normalized.authorName,
      fetchedAt
    }
  };
}

export function buildLifecyclePatchFromConnectorSyncItem(item = {}) {
  return {
    id: String(item.recordId || "").trim(),
    publish: {
      status: normalizeConnectorPublishStatus(item.status),
      publishedAt: String(item.publishedAt || "").trim(),
      metrics: normalizeMetrics(item.metrics || {})
    }
  };
}
