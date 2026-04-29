import crypto from "node:crypto";

const publishStatusPriority = {
  not_published: 0,
  violation: 1,
  limited: 2,
  published_passed: 3,
  false_positive: 4,
  positive_performance: 5
};

const referenceTierPriority = {
  "": 0,
  passed: 1,
  performed: 2,
  featured: 3
};

const stagePriority = {
  draft: 0,
  generated: 1,
  published_reference: 2,
  published: 3
};

const sourcePriority = {
  manual: 0,
  analysis: 1,
  rewrite: 2,
  generation_candidate: 3,
  generation_final: 4
};

function normalizeString(value) {
  return String(value || "").trim();
}

function uniqueStrings(items = []) {
  return [...new Set((Array.isArray(items) ? items : [items]).map((item) => normalizeString(item)).filter(Boolean))];
}

function normalizeMetric(value) {
  const number = Number(String(value ?? "").trim());
  return Number.isFinite(number) && number >= 0 ? Math.floor(number) : 0;
}

function normalizeMetrics(metrics = {}) {
  return {
    likes: normalizeMetric(metrics.likes),
    favorites: normalizeMetric(metrics.favorites),
    comments: normalizeMetric(metrics.comments)
  };
}

function normalizeStatus(value = "") {
  const normalized = normalizeString(value);

  if (
    ["not_published", "published_passed", "limited", "violation", "false_positive", "positive_performance"].includes(
      normalized
    )
  ) {
    return normalized;
  }

  return "not_published";
}

function normalizeTier(value = "") {
  const normalized = normalizeString(value);
  return ["passed", "performed", "featured"].includes(normalized) ? normalized : "";
}

function earliestTimestamp(left = "", right = "") {
  return [normalizeString(left), normalizeString(right)].filter(Boolean).sort()[0] || "";
}

function latestTimestamp(left = "", right = "") {
  const values = [normalizeString(left), normalizeString(right)].filter(Boolean).sort();
  return values[values.length - 1] || "";
}

function compareByPriority(left = "", right = "", map = {}) {
  const leftKey = normalizeString(left);
  const rightKey = normalizeString(right);
  const leftScore = map[leftKey] ?? -1;
  const rightScore = map[rightKey] ?? -1;

  if (leftScore !== rightScore) {
    return leftScore - rightScore;
  }

  return leftKey.localeCompare(rightKey);
}

function preferLongerString(left = "", right = "") {
  const leftText = normalizeString(left);
  const rightText = normalizeString(right);

  if (!leftText) return rightText;
  if (!rightText) return leftText;
  if (leftText.length !== rightText.length) {
    return leftText.length > rightText.length ? leftText : rightText;
  }

  return leftText.localeCompare(rightText) <= 0 ? leftText : rightText;
}

function preferPriorityValue(left = "", right = "", map = {}) {
  return compareByPriority(left, right, map) >= 0 ? normalizeString(left) : normalizeString(right);
}

function mergeMetrics(left = {}, right = {}) {
  return {
    likes: Math.max(normalizeMetric(left.likes), normalizeMetric(right.likes)),
    favorites: Math.max(normalizeMetric(left.favorites), normalizeMetric(right.favorites)),
    comments: Math.max(normalizeMetric(left.comments), normalizeMetric(right.comments))
  };
}

function mergeNote(left = {}, right = {}) {
  const normalizedLeft = normalizeNote(left);
  const normalizedRight = normalizeNote(right);

  return {
    title: preferLongerString(normalizedLeft.title, normalizedRight.title),
    body: preferLongerString(normalizedLeft.body, normalizedRight.body),
    coverText: preferLongerString(normalizedLeft.coverText, normalizedRight.coverText),
    tags: [...new Set([...normalizedLeft.tags, ...normalizedRight.tags])].sort((a, b) => a.localeCompare(b, "zh-Hans-CN"))
  };
}

function mergePublish(left = {}, right = {}) {
  const normalizedLeft = normalizePublish(left);
  const normalizedRight = normalizePublish(right);

  return {
    status: preferPriorityValue(normalizedLeft.status, normalizedRight.status, publishStatusPriority) || "not_published",
    metrics: mergeMetrics(normalizedLeft.metrics, normalizedRight.metrics),
    notes: preferLongerString(normalizedLeft.notes, normalizedRight.notes),
    publishedAt: earliestTimestamp(normalizedLeft.publishedAt, normalizedRight.publishedAt),
    platformReason: preferLongerString(normalizedLeft.platformReason, normalizedRight.platformReason)
  };
}

function mergeReference(left = {}, right = {}) {
  const normalizedLeft = normalizeReference(left);
  const normalizedRight = normalizeReference(right);
  const enabled = normalizedLeft.enabled || normalizedRight.enabled;

  return {
    enabled,
    tier: enabled ? preferPriorityValue(normalizedLeft.tier, normalizedRight.tier, referenceTierPriority) || "passed" : "",
    selectedBy: preferLongerString(normalizedLeft.selectedBy, normalizedRight.selectedBy),
    notes: preferLongerString(normalizedLeft.notes, normalizedRight.notes)
  };
}

function valueDensity(value) {
  if (!value) {
    return { size: 0, serialized: "" };
  }

  const serialized = JSON.stringify(value) || "";
  return { size: serialized.length, serialized };
}

function preferStructuredValue(left = null, right = null) {
  if (!left) return right || null;
  if (!right) return left || null;

  const leftDensity = valueDensity(left);
  const rightDensity = valueDensity(right);

  if (leftDensity.size !== rightDensity.size) {
    return leftDensity.size > rightDensity.size ? left : right;
  }

  return leftDensity.serialized.localeCompare(rightDensity.serialized) <= 0 ? left : right;
}

function mergeSnapshots(left = {}, right = {}) {
  const normalizedLeft = normalizeSnapshots(left);
  const normalizedRight = normalizeSnapshots(right);

  return {
    analysis: preferStructuredValue(normalizedLeft.analysis, normalizedRight.analysis),
    rewrite: preferStructuredValue(normalizedLeft.rewrite, normalizedRight.rewrite),
    generation: preferStructuredValue(normalizedLeft.generation, normalizedRight.generation),
    crossReview: preferStructuredValue(normalizedLeft.crossReview, normalizedRight.crossReview)
  };
}

function chooseCanonicalId(left = {}, right = {}) {
  const candidates = [normalizeString(left.id), normalizeString(right.id)].filter(Boolean).sort((a, b) => a.localeCompare(b));
  return candidates[0] || "";
}

function normalizeNote(note = {}) {
  return {
    title: normalizeString(note.title),
    body: normalizeString(note.body || note.noteContent),
    coverText: normalizeString(note.coverText),
    tags: uniqueStrings(note.tags)
  };
}

function normalizeReference(reference = {}) {
  const enabled = reference.enabled === true;
  const tier = normalizeTier(reference.tier);

  return {
    enabled,
    tier: enabled ? tier || "passed" : "",
    selectedBy: normalizeString(reference.selectedBy),
    notes: normalizeString(reference.notes)
  };
}

function normalizePublish(publish = {}) {
  return {
    status: normalizeStatus(publish.status || publish.publishStatus),
    metrics: normalizeMetrics(publish.metrics || publish),
    notes: normalizeString(publish.notes || publish.publishNotes),
    publishedAt: normalizeString(publish.publishedAt),
    platformReason: normalizeString(publish.platformReason)
  };
}

function normalizeSnapshots(snapshots = {}) {
  return {
    analysis: snapshots.analysis || null,
    rewrite: snapshots.rewrite || null,
    generation: snapshots.generation || null,
    crossReview: snapshots.crossReview || null
  };
}

export function buildNoteFingerprint(note = {}) {
  const normalized = normalizeNote(note);
  return [
    normalized.title.toLowerCase(),
    normalized.body.toLowerCase(),
    normalized.coverText.toLowerCase(),
    [...normalized.tags].sort().join("|").toLowerCase()
  ].join("::");
}

export function buildNoteRecord(input = {}) {
  const now = new Date().toISOString();
  const note = normalizeNote(input.note || input);
  const fingerprint = buildNoteFingerprint(note);
  const createdAt = normalizeString(input.createdAt) || now;
  const updatedAt = normalizeString(input.updatedAt) || createdAt;
  const source = normalizeString(input.source) || "manual";
  const stage = normalizeString(input.stage) || "draft";
  const idSeed = fingerprint || `${Date.now()}`;

  return {
    id: normalizeString(input.id) || `note-${crypto.createHash("sha1").update(idSeed).digest("hex").slice(0, 16)}`,
    fingerprint,
    source,
    stage,
    createdAt,
    updatedAt,
    note,
    publish: normalizePublish(input.publish || input.publishResult || {}),
    reference: normalizeReference(input.reference || {}),
    snapshots: normalizeSnapshots(input.snapshots || {})
  };
}

export function migrateSuccessSampleToNoteRecord(sample = {}) {
  return buildNoteRecord({
    id: sample.id,
    createdAt: sample.createdAt,
    updatedAt: sample.updatedAt,
    source: normalizeString(sample.source) || "manual",
    stage: "published_reference",
    note: sample,
    publish: {
      status: "published_passed",
      metrics: sample.metrics || {},
      notes: sample.notes,
      publishedAt: sample.publishedAt
    },
    reference: {
      enabled: true,
      tier: sample.tier,
      selectedBy: "manual",
      notes: sample.notes
    },
    snapshots: {
      analysis: sample.analysisSnapshot || null,
      rewrite: sample.rewriteSnapshot || null,
      generation: null,
      crossReview: null
    }
  });
}

export function migrateLifecycleToNoteRecord(record = {}) {
  return buildNoteRecord({
    id: record.id,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    source: record.source,
    stage: record.stage,
    note: record.note || record,
    publish: record.publishResult || record,
    reference: { enabled: false },
    snapshots: record.snapshots || {
      analysis: record.analysisSnapshot || null,
      rewrite: record.rewriteSnapshot || null,
      generation: record.generationSnapshot || null,
      crossReview: record.crossReviewSnapshot || null
    }
  });
}

export function mergeNoteRecords(current = {}, incoming = {}) {
  const left = buildNoteRecord(current);
  const right = buildNoteRecord(incoming);
  const preferredStage = preferPriorityValue(left.stage, right.stage, stagePriority) || "draft";
  const sourceCandidate =
    compareByPriority(left.stage, right.stage, stagePriority) === 0
      ? preferPriorityValue(left.source, right.source, sourcePriority)
      : compareByPriority(left.stage, right.stage, stagePriority) > 0
        ? left.source
        : right.source;

  return buildNoteRecord({
    ...left,
    ...right,
    id: chooseCanonicalId(left, right),
    source: sourceCandidate || preferLongerString(left.source, right.source) || "manual",
    stage: preferredStage,
    createdAt: earliestTimestamp(left.createdAt, right.createdAt),
    updatedAt: latestTimestamp(left.updatedAt, right.updatedAt),
    note: mergeNote(left.note, right.note),
    publish: mergePublish(left.publish, right.publish),
    reference: mergeReference(left.reference, right.reference),
    snapshots: mergeSnapshots(left.snapshots, right.snapshots)
  });
}

export function dedupeNoteRecords(items = []) {
  const byFingerprint = new Map();

  for (const item of Array.isArray(items) ? items : []) {
    const normalized = buildNoteRecord(item);
    const key = normalized.fingerprint || normalized.id;
    const existing = byFingerprint.get(key);
    byFingerprint.set(key, existing ? mergeNoteRecords(existing, normalized) : normalized);
  }

  return [...byFingerprint.values()];
}
