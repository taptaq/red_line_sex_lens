import { buildNoteRecord } from "./note-records.js";

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function normalizeString(value) {
  return String(value || "").trim();
}

function resolveMetricValue(item = {}, key) {
  if (Object.prototype.hasOwnProperty.call(item || {}, key)) {
    return item[key];
  }

  return item?.publish?.metrics?.[key];
}

function stripClientIdentityFields(payload = {}) {
  const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...rest } = payload || {};
  return rest;
}

export function buildSampleLibraryImportPayload(item = {}) {
  const reference = item.reference && typeof item.reference === "object" ? item.reference : {};
  const publish = item.publish && typeof item.publish === "object" ? item.publish : {};

  return {
    source: "manual",
    stage: "draft",
    sampleType: "",
    note: {
      title: item.title,
      body: item.body,
      coverText: item.coverText || item.title || "",
      collectionType: item.collectionType,
      tags: item.tags
    },
    publish: {
      status: publish.status || "not_published",
      notes: publish.notes || "",
      publishedAt: publish.publishedAt || "",
      platformReason: publish.platformReason || "",
      metrics: {
        likes: resolveMetricValue(item, "likes"),
        favorites: resolveMetricValue(item, "favorites"),
        comments: resolveMetricValue(item, "comments"),
        views: resolveMetricValue(item, "views")
      }
    },
    reference: {
      enabled: reference.enabled === true,
      tier: reference.enabled === true ? reference.tier || "passed" : "",
      selectedBy: "",
      notes: reference.notes || ""
    }
  };
}

export function buildSampleLibraryImportDuplicateKey(item = {}) {
  return [normalizeString(item.title), normalizeString(item.body), normalizeString(item.coverText)]
    .map((value) => value.toLowerCase())
    .join("::");
}

export function createSampleLibraryRecord(payload = {}) {
  return buildNoteRecord(stripClientIdentityFields(payload));
}

export function findSampleLibraryRecord(items = [], target = {}) {
  const normalizedItems = Array.isArray(items) ? items : [];
  const normalizedTarget = buildNoteRecord(target);
  const targetId = String(normalizedTarget.id || "").trim();
  const targetFingerprint = String(normalizedTarget.fingerprint || "").trim();

  if (targetFingerprint) {
    const byFingerprint = normalizedItems.find((item) => String(item?.fingerprint || "").trim() === targetFingerprint);
    if (byFingerprint) {
      return byFingerprint;
    }
  }

  if (targetId) {
    const byId = normalizedItems.find((item) => String(item?.id || "").trim() === targetId);
    if (byId) {
      return byId;
    }
  }

  return null;
}

export function patchSampleLibraryRecord(current = {}, payload = {}) {
  const existing = buildNoteRecord(current);
  const next = {
    ...existing,
    id: existing.id,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
    note: { ...existing.note },
    reference: { ...existing.reference },
    publish: {
      ...existing.publish,
      metrics: { ...(existing.publish?.metrics || {}) }
    },
    snapshots: { ...existing.snapshots },
    calibration: {
      ...(existing.calibration || {}),
      prediction: { ...(existing.calibration?.prediction || {}) },
      retro: { ...(existing.calibration?.retro || {}) }
    }
  };

  if (hasOwn(payload, "source")) {
    next.source = payload.source;
  }

  if (hasOwn(payload, "stage")) {
    next.stage = payload.stage;
  }

  if (hasOwn(payload, "sampleType")) {
    next.sampleType = payload.sampleType;
  }

  if (payload.note && typeof payload.note === "object") {
    if (hasOwn(payload.note, "title")) {
      next.note.title = payload.note.title;
    }
    if (hasOwn(payload.note, "body")) {
      next.note.body = payload.note.body;
    }
    if (hasOwn(payload.note, "coverText")) {
      next.note.coverText = payload.note.coverText;
    }
    if (hasOwn(payload.note, "collectionType")) {
      next.note.collectionType = payload.note.collectionType;
    }
    if (hasOwn(payload.note, "tags")) {
      next.note.tags = payload.note.tags;
    }
  }

  if (payload.reference && typeof payload.reference === "object") {
    if (hasOwn(payload.reference, "enabled")) {
      next.reference.enabled = payload.reference.enabled;
    }
    if (hasOwn(payload.reference, "tier")) {
      next.reference.tier = payload.reference.tier;
    }
    if (hasOwn(payload.reference, "selectedBy")) {
      next.reference.selectedBy = payload.reference.selectedBy;
    }
    if (hasOwn(payload.reference, "notes")) {
      next.reference.notes = payload.reference.notes;
    }
  }

  if (payload.publish && typeof payload.publish === "object") {
    if (hasOwn(payload.publish, "status")) {
      next.publish.status = payload.publish.status;
    }
    if (hasOwn(payload.publish, "notes")) {
      next.publish.notes = payload.publish.notes;
    }
    if (hasOwn(payload.publish, "publishedAt")) {
      next.publish.publishedAt = payload.publish.publishedAt;
    }
    if (hasOwn(payload.publish, "platformReason")) {
      next.publish.platformReason = payload.publish.platformReason;
    }
    if (payload.publish.metrics && typeof payload.publish.metrics === "object") {
      if (hasOwn(payload.publish.metrics, "likes")) {
        next.publish.metrics.likes = payload.publish.metrics.likes;
      }
      if (hasOwn(payload.publish.metrics, "favorites")) {
        next.publish.metrics.favorites = payload.publish.metrics.favorites;
      }
      if (hasOwn(payload.publish.metrics, "comments")) {
        next.publish.metrics.comments = payload.publish.metrics.comments;
      }
      if (hasOwn(payload.publish.metrics, "views")) {
        next.publish.metrics.views = payload.publish.metrics.views;
      }
    }
  }

  if (payload.snapshots && typeof payload.snapshots === "object") {
    if (hasOwn(payload.snapshots, "analysis")) {
      next.snapshots.analysis = payload.snapshots.analysis;
    }
    if (hasOwn(payload.snapshots, "rewrite")) {
      next.snapshots.rewrite = payload.snapshots.rewrite;
    }
    if (hasOwn(payload.snapshots, "generation")) {
      next.snapshots.generation = payload.snapshots.generation;
    }
    if (hasOwn(payload.snapshots, "crossReview")) {
      next.snapshots.crossReview = payload.snapshots.crossReview;
    }
  }

  if (payload.calibration && typeof payload.calibration === "object") {
    if (payload.calibration.prediction && typeof payload.calibration.prediction === "object") {
      next.calibration.prediction = {
        ...next.calibration.prediction,
        ...payload.calibration.prediction
      };
    }
    if (payload.calibration.retro && typeof payload.calibration.retro === "object") {
      next.calibration.retro = {
        ...next.calibration.retro,
        ...payload.calibration.retro
      };
    }
  }

  return buildNoteRecord(next);
}
