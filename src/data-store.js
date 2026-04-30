import fs from "node:fs/promises";
import path from "node:path";
import { isSameFeedbackNote } from "./feedback-identity.js";
import { paths } from "./config.js";
import { buildLifecycleRecord } from "./note-lifecycle.js";
import {
  buildNoteRecord,
  dedupeNoteRecords,
  mergeNoteRecords,
  migrateLifecycleToNoteRecord,
  migrateSuccessSampleToNoteRecord
} from "./note-records.js";
import { normalizeReviewBenchmarkSample } from "./review-benchmark.js";
import { withSampleWeight } from "./sample-weight.js";

async function readJson(filePath, fallback) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === "ENOENT") {
      return fallback;
    }

    throw error;
  }
}

async function writeJson(filePath, value) {
  const serialized = JSON.stringify(value, null, 2);
  await fs.writeFile(filePath, `${serialized}\n`, "utf8");
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") {
      return false;
    }

    throw error;
  }
}

function uniqueStrings(items = []) {
  return [...new Set((Array.isArray(items) ? items : [items]).map((item) => String(item || "").trim()).filter(Boolean))];
}

function normalizeString(value) {
  return String(value || "").trim();
}

function normalizeNumber(value, fallback = 0) {
  const normalized = Number(String(value || "").trim());
  return Number.isFinite(normalized) ? normalized : fallback;
}

function normalizeFalsePositiveEntry(entry = {}) {
  const status = normalizeString(entry.status) || "platform_passed_pending";
  const confidence = (() => {
    const normalized = normalizeString(entry.confidence).toLowerCase();
    if (normalized === "confirmed" || normalized === "pending") {
      return normalized;
    }

    return status === "platform_passed_confirmed" ? "confirmed" : "pending";
  })();
  const sourceQuality = (() => {
    const normalized = normalizeString(entry.sourceQuality).toLowerCase();
    return ["manual_verified", "imported", "unknown"].includes(normalized) ? normalized : "unknown";
  })();

  return withSampleWeight({
    ...entry,
    id: normalizeString(entry.id),
    source: normalizeString(entry.source),
    status,
    confidence,
    sourceQuality,
    createdAt: normalizeString(entry.createdAt),
    updatedAt: normalizeString(entry.updatedAt),
    observedAt: normalizeString(entry.observedAt),
    observationWindowHours: normalizeNumber(entry.observationWindowHours, 0),
    title: normalizeString(entry.title),
    body: normalizeString(entry.body),
    coverText: normalizeString(entry.coverText),
    tags: uniqueStrings(entry.tags),
    userNotes: normalizeString(entry.userNotes)
  }, "false_positive");
}

function normalizeMetrics(metrics = {}) {
  return {
    likes: normalizeNumber(metrics.likes, 0),
    favorites: normalizeNumber(metrics.favorites, 0),
    comments: normalizeNumber(metrics.comments, 0)
  };
}

function normalizeNoteRecordReference(record = {}) {
  const reference = record.reference || {};

  return {
    enabled: reference.enabled === true,
    tier: normalizeString(reference.tier),
    selectedBy: normalizeString(reference.selectedBy),
    notes: normalizeString(reference.notes)
  };
}

function normalizeNoteRecordPublish(record = {}) {
  const publish = record.publish || {};

  return {
    status: normalizeString(publish.status) || "not_published",
    metrics: normalizeMetrics(publish.metrics || {}),
    notes: normalizeString(publish.notes),
    publishedAt: normalizeString(publish.publishedAt),
    platformReason: normalizeString(publish.platformReason)
  };
}

function hasLifecycleCompat(record = {}) {
  const stage = normalizeString(record.stage);
  const source = normalizeString(record.source);
  const publish = normalizeNoteRecordPublish(record);
  const reference = normalizeNoteRecordReference(record);
  const snapshots = record.snapshots || {};

  if (!reference.enabled) {
    return true;
  }

  if (stage && stage !== "published_reference") {
    return true;
  }

  if (publish.status && publish.status !== "published_passed") {
    return true;
  }

  if (["analysis", "rewrite", "generation_candidate", "generation_final"].includes(source)) {
    return true;
  }

  return Boolean(snapshots.generation || snapshots.crossReview);
}

function buildNoteRecordCompatibilityKey(record = {}) {
  const normalized = buildNoteRecord(record);
  const note = normalized.note || {};
  const title = normalizeString(note.title).toLowerCase();
  const body = normalizeString(note.body).toLowerCase();
  const coverText = normalizeString(note.coverText).toLowerCase();

  if (title || body) {
    return `${title}::${body}`;
  }

  if (coverText) {
    return `cover::${coverText}`;
  }

  return normalizeString(normalized.id).toLowerCase();
}

function canUseCompatibilityFallback(left = {}, right = {}) {
  const normalizedLeft = buildNoteRecord(left);
  const normalizedRight = buildNoteRecord(right);
  const leftReference = normalizeNoteRecordReference(normalizedLeft).enabled;
  const rightReference = normalizeNoteRecordReference(normalizedRight).enabled;
  const leftLifecycle = hasLifecycleCompat(normalizedLeft);
  const rightLifecycle = hasLifecycleCompat(normalizedRight);
  const leftNote = normalizedLeft.note || {};
  const rightNote = normalizedRight.note || {};
  const tagsMissing = !leftNote.tags?.length || !rightNote.tags?.length;
  const coverTextCompatible =
    !normalizeString(leftNote.coverText) ||
    !normalizeString(rightNote.coverText) ||
    normalizeString(leftNote.coverText) === normalizeString(rightNote.coverText);

  return ((leftReference && rightLifecycle) || (rightReference && leftLifecycle)) && tagsMissing && coverTextCompatible;
}

function noteRecordsMatch(left = {}, right = {}) {
  const normalizedLeft = buildNoteRecord(left);
  const normalizedRight = buildNoteRecord(right);

  if (normalizedLeft.fingerprint && normalizedLeft.fingerprint === normalizedRight.fingerprint) {
    return true;
  }

  if (!canUseCompatibilityFallback(normalizedLeft, normalizedRight)) {
    return false;
  }

  return buildNoteRecordCompatibilityKey(normalizedLeft) === buildNoteRecordCompatibilityKey(normalizedRight);
}

function collapseNoteRecordsByCompatibility(items = []) {
  const next = [];

  for (const item of Array.isArray(items) ? items : []) {
    const index = next.findIndex((existing) => noteRecordsMatch(existing, item));

    if (index === -1) {
      next.push(buildNoteRecord(item));
      continue;
    }

    next[index] = mergeNoteRecords(next[index], item);
  }

  return next;
}

function stripReferenceFromRecord(record = {}) {
  return buildNoteRecord({
    ...record,
    reference: { enabled: false }
  });
}

function collapseLifecycleToSuccessReference(record = {}) {
  const publish = normalizeNoteRecordPublish(record);
  const reference = normalizeNoteRecordReference(record);

  return buildNoteRecord({
    ...record,
    source: "manual",
    stage: "published_reference",
    publish: {
      status: "published_passed",
      metrics: publish.metrics,
      notes: reference.notes || publish.notes,
      publishedAt: publish.publishedAt,
      platformReason: ""
    },
    reference: {
      enabled: true,
      tier: reference.tier || "passed",
      selectedBy: reference.selectedBy || "manual",
      notes: reference.notes || publish.notes
    },
    snapshots: {
      analysis: record.snapshots?.analysis || null,
      rewrite: record.snapshots?.rewrite || null,
      generation: null,
      crossReview: null
    }
  });
}

function mergeSuccessIntoRecord(existing = {}, incoming = {}) {
  const merged = mergeNoteRecords(existing, incoming);

  if (!hasLifecycleCompat(existing)) {
    return buildNoteRecord({
      ...merged,
      id: normalizeString(existing.id) || normalizeString(merged.id)
    });
  }

  return buildNoteRecord({
    ...merged,
    id: normalizeString(existing.id) || normalizeString(merged.id),
    source: normalizeString(existing.source) || normalizeString(merged.source) || "manual",
    stage: normalizeString(existing.stage) || normalizeString(merged.stage) || "draft"
  });
}

function mergeLifecycleIntoRecord(existing = {}, incoming = {}) {
  const merged = mergeNoteRecords(existing, incoming);
  const incomingPublish = normalizeNoteRecordPublish(incoming);
  const incomingId = normalizeString(incoming.id);
  const existingId = normalizeString(existing.id);
  const shouldOverridePublish = incomingId && existingId && incomingId === existingId ? true : incomingPublish.status !== "not_published";

  return buildNoteRecord({
    ...merged,
    id: normalizeString(existing.id) || normalizeString(merged.id),
    source: normalizeString(incoming.source) || normalizeString(merged.source) || "manual",
    stage: normalizeString(incoming.stage) || normalizeString(merged.stage) || "draft",
    publish: shouldOverridePublish ? incomingPublish : merged.publish
  });
}

function mergeFallbackLifecycleIntoRecord(existing = {}, incoming = {}) {
  const merged = mergeNoteRecords(existing, incoming);
  const incomingPublish = normalizeNoteRecordPublish(incoming);

  return buildNoteRecord({
    ...merged,
    id: normalizeString(existing.id) || normalizeString(merged.id),
    source: normalizeString(incoming.source) || normalizeString(merged.source) || "manual",
    stage: normalizeString(incoming.stage) || normalizeString(merged.stage) || "draft",
    publish: incomingPublish
  });
}

function noteRecordToSuccessSample(record = {}) {
  const note = record.note || {};
  const publish = normalizeNoteRecordPublish(record);
  const reference = normalizeNoteRecordReference(record);
  const source = normalizeString(record.source) || "manual";
  const referenceNotes = reference.notes || publish.notes;
  const isManualReference = normalizeString(reference.selectedBy) === "manual" || source === "manual";

  return withSampleWeight({
    id: normalizeString(record.id),
    tier: reference.tier || "passed",
    confidence: isManualReference ? "confirmed" : "pending",
    sourceQuality: isManualReference ? "manual_verified" : "imported",
    title: normalizeString(note.title),
    body: normalizeString(note.body),
    coverText: normalizeString(note.coverText),
    tags: uniqueStrings(note.tags),
    sourcePlatform: "xiaohongshu",
    source,
    publishedAt: publish.publishedAt,
    metrics: publish.metrics,
    notes: referenceNotes,
    analysisSnapshot: record.snapshots?.analysis || null,
    rewriteSnapshot: record.snapshots?.rewrite || null,
    createdAt: normalizeString(record.createdAt),
    updatedAt: normalizeString(record.updatedAt)
  }, "success");
}

function noteRecordToLifecycleRecord(record = {}) {
  const publish = normalizeNoteRecordPublish(record);

  return buildLifecycleRecord({
    id: record.id,
    source: record.source,
    stage: record.stage,
    status: publish.status,
    note: record.note,
    analysisSnapshot: record.snapshots?.analysis || null,
    rewriteSnapshot: record.snapshots?.rewrite || null,
    generationSnapshot: record.snapshots?.generation || null,
    crossReviewSnapshot: record.snapshots?.crossReview || null,
    publishResult: {
      ...publish,
      updatedAt: normalizeString(record.updatedAt)
    },
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  });
}

function resolveNoteRecordsPath() {
  const configuredPath = paths.noteRecords;
  const configuredDir = path.dirname(configuredPath);
  const legacyDirs = [path.dirname(paths.successSamples), path.dirname(paths.noteLifecycle)];
  const customDir = legacyDirs.find((dir) => dir && dir !== configuredDir);

  if (customDir && legacyDirs.every((dir) => dir === configuredDir || dir === customDir)) {
    return path.join(customDir, "note-records.json");
  }

  return configuredPath;
}

export async function loadLexicon() {
  const [seed, custom] = await Promise.all([
    readJson(paths.lexiconSeed, []),
    readJson(paths.lexiconCustom, [])
  ]);

  return [...seed, ...custom].filter((entry) => entry && entry.enabled !== false);
}

export async function loadWhitelist() {
  return readJson(paths.whitelist, []);
}

export async function saveWhitelist(items) {
  await writeJson(paths.whitelist, uniqueStrings(items));
}

export async function loadFeedbackLog() {
  return readJson(paths.feedbackLog, []);
}

export async function upsertFeedbackEntries(entries) {
  const current = await loadFeedbackLog();
  const incoming = (Array.isArray(entries) ? entries : [entries]).filter(Boolean);
  const retained = current.filter((existing) => !incoming.some((entry) => isSameFeedbackNote(existing, entry)));
  const next = [...retained, ...incoming];
  await writeJson(paths.feedbackLog, next);
  return next;
}

export async function loadReviewQueue() {
  return readJson(paths.reviewQueue, []);
}

export async function saveReviewQueue(items) {
  await writeJson(paths.reviewQueue, items);
}

export async function loadRewritePairs() {
  return readJson(paths.rewritePairs, []);
}

export async function loadNoteRecords() {
  const noteRecordsPath = resolveNoteRecordsPath();

  if (await fileExists(noteRecordsPath)) {
    const items = await readJson(noteRecordsPath, []);
    return collapseNoteRecordsByCompatibility(dedupeNoteRecords(Array.isArray(items) ? items : []));
  }

  const [successSamples, noteLifecycle] = await Promise.all([
    readJson(paths.successSamples, []),
    readJson(paths.noteLifecycle, [])
  ]);

  const successRecords = dedupeNoteRecords(
    (Array.isArray(successSamples) ? successSamples : []).map((item) => migrateSuccessSampleToNoteRecord(item))
  );
  const lifecycleRecords = dedupeNoteRecords(
    (Array.isArray(noteLifecycle) ? noteLifecycle : []).map((item) => migrateLifecycleToNoteRecord(item))
  );
  const next = [...successRecords];

  for (const lifecycleRecord of lifecycleRecords) {
    const matchIndex = next.findIndex((item) => noteRecordsMatch(item, lifecycleRecord));

    if (matchIndex === -1) {
      next.push(lifecycleRecord);
      continue;
    }

    next[matchIndex] = mergeFallbackLifecycleIntoRecord(next[matchIndex], lifecycleRecord);
  }

  return next;
}

export async function saveNoteRecords(items) {
  const normalized = collapseNoteRecordsByCompatibility(dedupeNoteRecords(Array.isArray(items) ? items : []));
  await writeJson(resolveNoteRecordsPath(), normalized);
  return normalized;
}

export async function loadSuccessSamples() {
  const items = await loadNoteRecords();
  return items
    .filter((item) => normalizeNoteRecordReference(item).enabled)
    .map((item) => noteRecordToSuccessSample(item));
}

export async function loadNoteLifecycle() {
  const items = await loadNoteRecords();
  return items
    .filter((item) => hasLifecycleCompat(item))
    .map((item) => noteRecordToLifecycleRecord(item));
}

export async function saveNoteLifecycle(items) {
  const current = await loadNoteRecords();
  const incoming = collapseNoteRecordsByCompatibility(
    dedupeNoteRecords((Array.isArray(items) ? items : []).map((item) => migrateLifecycleToNoteRecord(item)))
  );
  const remainingIncoming = [...incoming];
  const next = [];

  for (const existing of current) {
    const matchIndex = remainingIncoming.findIndex((item) => noteRecordsMatch(existing, item));

    if (matchIndex >= 0) {
      const [replacement] = remainingIncoming.splice(matchIndex, 1);
      next.push(mergeLifecycleIntoRecord(existing, replacement));
      continue;
    }

    if (!hasLifecycleCompat(existing)) {
      next.push(existing);
      continue;
    }

    if (normalizeNoteRecordReference(existing).enabled) {
      next.push(collapseLifecycleToSuccessReference(existing));
    }
  }

  for (const item of remainingIncoming) {
    next.push(item);
  }

  await saveNoteRecords(next);
}

export async function saveSuccessSamples(items) {
  const current = await loadNoteRecords();
  const incoming = collapseNoteRecordsByCompatibility(
    dedupeNoteRecords((Array.isArray(items) ? items : []).map((item) => migrateSuccessSampleToNoteRecord(item)))
  );
  const remainingIncoming = [...incoming];
  const next = [];

  for (const existing of current) {
    const matchIndex = remainingIncoming.findIndex((item) => noteRecordsMatch(existing, item));

    if (matchIndex >= 0) {
      const [replacement] = remainingIncoming.splice(matchIndex, 1);
      next.push(mergeSuccessIntoRecord(existing, replacement));
      continue;
    }

    if (!normalizeNoteRecordReference(existing).enabled) {
      next.push(existing);
      continue;
    }

    if (hasLifecycleCompat(existing)) {
      next.push(stripReferenceFromRecord(existing));
    }
  }

  for (const item of remainingIncoming) {
    next.push(item);
  }

  await saveNoteRecords(next);
}

export async function loadStyleProfile() {
  return readJson(paths.styleProfile, {});
}

export async function saveStyleProfile(profile) {
  await writeJson(paths.styleProfile, profile && typeof profile === "object" ? profile : {});
}

export async function loadCollectionTypes() {
  const payload = await readJson(paths.collectionTypes, { custom: [] });
  return {
    custom: uniqueStrings(payload.custom || [])
  };
}

export async function saveCollectionTypes(value = {}) {
  await writeJson(paths.collectionTypes, {
    custom: uniqueStrings(value.custom || [])
  });
}

export async function appendRewritePairs(entries) {
  const current = await loadRewritePairs();
  const next = [...current, ...entries];
  await writeJson(paths.rewritePairs, next);
  return next;
}

export async function saveRewritePairs(items) {
  await writeJson(paths.rewritePairs, items);
}

export async function loadSeedLexicon() {
  return readJson(paths.lexiconSeed, []);
}

export async function saveSeedLexicon(items) {
  await writeJson(paths.lexiconSeed, items);
}

export async function loadCustomLexicon() {
  return readJson(paths.lexiconCustom, []);
}

export async function saveCustomLexicon(items) {
  await writeJson(paths.lexiconCustom, items);
}

export async function saveFeedbackLog(items) {
  await writeJson(paths.feedbackLog, items);
}

export async function loadFalsePositiveLog() {
  const items = await readJson(paths.falsePositiveLog, []);
  return items.map((entry) => normalizeFalsePositiveEntry(entry));
}

export async function saveFalsePositiveLog(items) {
  const normalized = (Array.isArray(items) ? items : []).map((entry) => normalizeFalsePositiveEntry(entry));
  await writeJson(paths.falsePositiveLog, normalized);
}

export async function loadSummary() {
  const [seed, custom, feedback, reviewQueue, noteLifecycle] = await Promise.all([
    readJson(paths.lexiconSeed, []),
    readJson(paths.lexiconCustom, []),
    readJson(paths.feedbackLog, []),
    readJson(paths.reviewQueue, []),
    loadNoteLifecycle()
  ]);

  return {
    seedLexiconCount: seed.length,
    customLexiconCount: custom.length,
    feedbackCount: feedback.length,
    reviewQueueCount: reviewQueue.length,
    noteLifecycleCount: noteLifecycle.length
  };
}

export async function readImportFile(filePath) {
  return readJson(filePath, null);
}

export async function loadAnalyzeTagOptions() {
  return uniqueStrings(await readJson(paths.analyzeTagOptions, []));
}

export async function saveAnalyzeTagOptions(items) {
  await writeJson(paths.analyzeTagOptions, uniqueStrings(items));
}

function ensureUniqueReviewBenchmarkIds(items) {
  const seenIds = new Set();

  return items.map((item) => {
    if (!seenIds.has(item.id)) {
      seenIds.add(item.id);
      return item;
    }

    let attempt = 1;
    let regenerated = normalizeReviewBenchmarkSample({
      ...item,
      id: "",
      updatedAt: `${item.updatedAt}#${attempt}`
    });

    while (seenIds.has(regenerated.id)) {
      attempt += 1;
      regenerated = normalizeReviewBenchmarkSample({
        ...item,
        id: "",
        updatedAt: `${item.updatedAt}#${attempt}`
      });
    }

    seenIds.add(regenerated.id);
    return {
      ...regenerated,
      updatedAt: item.updatedAt
    };
  });
}

export async function loadReviewBenchmarkSamples() {
  const items = await readJson(paths.reviewBenchmark, []);
  return ensureUniqueReviewBenchmarkIds((Array.isArray(items) ? items : []).map((item) => normalizeReviewBenchmarkSample(item)));
}

export async function saveReviewBenchmarkSamples(items) {
  const normalized = ensureUniqueReviewBenchmarkIds((Array.isArray(items) ? items : []).map((item) => normalizeReviewBenchmarkSample(item)));
  await writeJson(paths.reviewBenchmark, normalized);
}
