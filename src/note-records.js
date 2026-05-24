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

const sampleTypePriority = {
  "": 0,
  observe: 1,
  rewrite_success: 2,
  false_positive: 3,
  missed_violation: 4,
  good_sample: 5
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

function normalizeConfidence(value) {
  const number = Number(String(value ?? "").trim());
  if (!Number.isFinite(number)) {
    return 0;
  }

  return Math.min(100, Math.max(0, Math.round(number)));
}

function normalizeBoolean(value) {
  return value === true || String(value || "").trim().toLowerCase() === "true";
}

function normalizeSignalList(value = []) {
  return uniqueStrings(
    Array.isArray(value)
      ? value
      : String(value || "")
          .split(/[，,、\n]/)
          .map((item) => item.trim())
  );
}

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object || {}, key);
}

function normalizeEvidenceSamples(value = []) {
  const items = Array.isArray(value) ? value : [value];

  return items
    .filter((item) => item && typeof item === "object")
    .map((item) => ({
      ...item,
      id: normalizeString(item.id),
      title: normalizeString(item.title)
    }))
    .filter((item) => Object.values(item).some((entry) => {
      if (Array.isArray(entry)) return entry.length > 0;
      if (entry && typeof entry === "object") return Object.keys(entry).length > 0;
      return Boolean(normalizeString(entry));
    }));
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

export function normalizeLearningSampleType(value = "") {
  const normalized = normalizeString(value);

  if (["good_sample", "false_positive", "missed_violation", "rewrite_success", "observe"].includes(normalized)) {
    return normalized;
  }

  return "";
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
    comments: Math.max(normalizeMetric(left.comments), normalizeMetric(right.comments)),
    views: Math.max(normalizeMetric(left.views), normalizeMetric(right.views)),
    shares: Math.max(normalizeMetric(left.shares), normalizeMetric(right.shares))
  };
}

function mergeNote(left = {}, right = {}) {
  const normalizedLeft = normalizeNote(left);
  const normalizedRight = normalizeNote(right);

  return {
    title: preferLongerString(normalizedLeft.title, normalizedRight.title),
    body: preferLongerString(normalizedLeft.body, normalizedRight.body),
    coverText: preferLongerString(normalizedLeft.coverText, normalizedRight.coverText),
    collectionType: normalizedRight.collectionType || normalizedLeft.collectionType,
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

function mergeExternalSource(left = {}, right = {}) {
  const normalizedLeft = normalizeExternalSource(left);
  const normalizedRight = normalizeExternalSource(right);

  return {
    provider: preferLongerString(normalizedLeft.provider, normalizedRight.provider),
    noteId: preferLongerString(normalizedLeft.noteId, normalizedRight.noteId),
    xsecToken: preferLongerString(normalizedLeft.xsecToken, normalizedRight.xsecToken),
    url: preferLongerString(normalizedLeft.url, normalizedRight.url),
    authorId: preferLongerString(normalizedLeft.authorId, normalizedRight.authorId),
    authorName: preferLongerString(normalizedLeft.authorName, normalizedRight.authorName),
    fetchedAt: latestTimestamp(normalizedLeft.fetchedAt, normalizedRight.fetchedAt)
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

function hasMeaningfulCalibrationBranch(branch = {}) {
  return valueDensity(branch).size > 2 && Object.values(branch || {}).some((value) => {
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === "boolean") return value === true;
    if (typeof value === "number") return value > 0;
    return Boolean(normalizeString(value));
  });
}

function preferCalibrationString(left = "", right = "") {
  return normalizeString(right) || normalizeString(left);
}

function preferCalibrationStatus(left = "", right = "") {
  const normalizedLeft = normalizeStatus(left);
  const normalizedRight = normalizeStatus(right);

  if (normalizedRight !== "not_published" || normalizedLeft === "not_published") {
    return normalizedRight;
  }

  return normalizedLeft;
}

function preferCalibrationConfidence(left = 0, right = 0) {
  const normalizedLeft = normalizeConfidence(left);
  const normalizedRight = normalizeConfidence(right);

  if (normalizedRight > 0 || normalizedLeft === 0) {
    return normalizedRight;
  }

  return normalizedLeft;
}

function preferCalibrationBoolean(left = false, right = false) {
  const normalizedLeft = normalizeBoolean(left);
  const normalizedRight = normalizeBoolean(right);

  if (normalizedRight || normalizedLeft === false) {
    return normalizedRight;
  }

  return normalizedLeft;
}

function preferCalibrationList(left = [], right = []) {
  return Array.isArray(right) && right.length > 0 ? right : left;
}

function mergePredictionCalibration(left = {}, right = {}) {
  return {
    predictedStatus: preferCalibrationStatus(left.predictedStatus, right.predictedStatus),
    predictedRiskLevel: preferCalibrationString(left.predictedRiskLevel, right.predictedRiskLevel),
    predictedPerformanceTier: preferCalibrationString(left.predictedPerformanceTier, right.predictedPerformanceTier),
    confidence: preferCalibrationConfidence(left.confidence, right.confidence),
    reason: preferCalibrationString(left.reason, right.reason),
    model: preferCalibrationString(left.model, right.model),
    createdAt: preferCalibrationString(left.createdAt, right.createdAt),
    evidenceSamples: preferCalibrationList(left.evidenceSamples, right.evidenceSamples),
    evidenceSignals: preferCalibrationList(left.evidenceSignals, right.evidenceSignals),
    evidenceSummary: preferCalibrationString(left.evidenceSummary, right.evidenceSummary)
  };
}

function mergeRetroCalibration(left = {}, right = {}) {
  return {
    actualPerformanceTier: preferCalibrationString(left.actualPerformanceTier, right.actualPerformanceTier),
    predictionMatched: preferCalibrationBoolean(left.predictionMatched, right.predictionMatched),
    missReason: preferCalibrationString(left.missReason, right.missReason),
    validatedSignals: preferCalibrationList(left.validatedSignals, right.validatedSignals),
    invalidatedSignals: preferCalibrationList(left.invalidatedSignals, right.invalidatedSignals),
    shouldBecomeReference: preferCalibrationBoolean(left.shouldBecomeReference, right.shouldBecomeReference),
    ruleImprovementCandidate: preferCalibrationString(left.ruleImprovementCandidate, right.ruleImprovementCandidate),
    notes: preferCalibrationString(left.notes, right.notes),
    reviewedAt: preferCalibrationString(left.reviewedAt, right.reviewedAt)
  };
}

function mergeCalibration(left = {}, right = {}) {
  const normalizedLeft = normalizeCalibration(left);
  const normalizedRight = normalizeCalibration(right);

  return {
    prediction: hasMeaningfulCalibrationBranch(normalizedRight.prediction)
      ? mergePredictionCalibration(normalizedLeft.prediction, normalizedRight.prediction)
      : normalizedLeft.prediction,
    retro: hasMeaningfulCalibrationBranch(normalizedRight.retro)
      ? mergeRetroCalibration(normalizedLeft.retro, normalizedRight.retro)
      : normalizedLeft.retro
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
    collectionType: normalizeString(note.collectionType),
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

function normalizeExternalSource(externalSource = {}) {
  const source = externalSource && typeof externalSource === "object" ? externalSource : {};

  return {
    provider: normalizeString(source.provider),
    noteId: normalizeString(source.noteId),
    xsecToken: normalizeString(source.xsecToken),
    url: normalizeString(source.url),
    authorId: normalizeString(source.authorId),
    authorName: normalizeString(source.authorName),
    fetchedAt: normalizeString(source.fetchedAt)
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

function normalizeCalibration(calibration = {}) {
  const prediction = calibration.prediction && typeof calibration.prediction === "object" ? calibration.prediction : {};
  const retro = calibration.retro && typeof calibration.retro === "object" ? calibration.retro : {};

  return {
    prediction: {
      predictedStatus: normalizeStatus(prediction.predictedStatus),
      predictedRiskLevel: normalizeString(prediction.predictedRiskLevel),
      predictedPerformanceTier: normalizeString(prediction.predictedPerformanceTier),
      confidence: normalizeConfidence(prediction.confidence),
      reason: normalizeString(prediction.reason),
      model: normalizeString(prediction.model),
      createdAt: normalizeString(prediction.createdAt),
      evidenceSamples: normalizeEvidenceSamples(
        hasOwn(prediction, "evidenceSamples") ? prediction.evidenceSamples : prediction.evidenceSampleIds
      ),
      evidenceSignals: normalizeSignalList(prediction.evidenceSignals),
      evidenceSummary: normalizeString(prediction.evidenceSummary)
    },
    retro: {
      actualPerformanceTier: normalizeString(retro.actualPerformanceTier),
      predictionMatched: normalizeBoolean(retro.predictionMatched),
      missReason: normalizeString(retro.missReason),
      validatedSignals: normalizeSignalList(retro.validatedSignals),
      invalidatedSignals: normalizeSignalList(retro.invalidatedSignals),
      shouldBecomeReference: normalizeBoolean(retro.shouldBecomeReference),
      ruleImprovementCandidate: normalizeString(retro.ruleImprovementCandidate),
      notes: normalizeString(retro.notes),
      reviewedAt: normalizeString(retro.reviewedAt)
    }
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
  const sampleType = normalizeLearningSampleType(input.sampleType);
  const idSeed = fingerprint || `${Date.now()}`;

  return {
    id: normalizeString(input.id) || `note-${crypto.createHash("sha1").update(idSeed).digest("hex").slice(0, 16)}`,
    fingerprint,
    source,
    stage,
    sampleType,
    createdAt,
    updatedAt,
    note,
    publish: normalizePublish(input.publish || input.publishResult || {}),
    reference: normalizeReference(input.reference || {}),
    externalSource: normalizeExternalSource(input.externalSource || {}),
    snapshots: normalizeSnapshots(input.snapshots || {}),
    calibration: normalizeCalibration(input.calibration || {})
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
      metrics: sample.metrics || sample,
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
  const sampleType = preferPriorityValue(left.sampleType, right.sampleType, sampleTypePriority) || "";
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
    sampleType,
    createdAt: earliestTimestamp(left.createdAt, right.createdAt),
    updatedAt: latestTimestamp(left.updatedAt, right.updatedAt),
    note: mergeNote(left.note, right.note),
    publish: mergePublish(left.publish, right.publish),
    reference: mergeReference(left.reference, right.reference),
    externalSource: mergeExternalSource(left.externalSource, right.externalSource),
    snapshots: mergeSnapshots(left.snapshots, right.snapshots),
    calibration: mergeCalibration(left.calibration, right.calibration)
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
