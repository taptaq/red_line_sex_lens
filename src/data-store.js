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
import { isQualifiedReferenceRecord } from "./reference-samples.js";
import { sanitizeInnerSpaceTerms } from "./inner-space-terms.js";
import { sanitizeStyleProfileState } from "./style-profile.js";
import { withSampleWeight } from "./sample-weight.js";

let memoryRetrievalServicePromise = null;
let memoryRetrievalServiceRoot = "";

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

async function readJsonLines(filePath, fallback) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return raw
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  } catch (error) {
    if (error.code === "ENOENT") {
      return fallback;
    }

    throw error;
  }
}

async function writeJsonLines(filePath, items) {
  const lines = (Array.isArray(items) ? items : []).map((item) => JSON.stringify(item));
  await fs.writeFile(filePath, lines.length ? `${lines.join("\n")}\n` : "", "utf8");
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

function normalizeFalsePositiveSource(value) {
  const source = normalizeString(value);

  if (source === "benchmark_mismatch") {
    return "false_positive_reflow";
  }

  return source;
}

function normalizeNumber(value, fallback = 0) {
  const normalized = Number(String(value || "").trim());
  return Number.isFinite(normalized) ? normalized : fallback;
}

function normalizeMetric(value) {
  return Math.max(0, Math.floor(normalizeNumber(value, 0)));
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
    source: normalizeFalsePositiveSource(entry.source),
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
    likes: normalizeMetric(metrics.likes),
    favorites: normalizeMetric(metrics.favorites),
    comments: normalizeMetric(metrics.comments),
    views: normalizeMetric(metrics.views)
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

  return buildNoteRecord({
    ...merged,
    id: normalizeString(existing.id) || normalizeString(merged.id),
    source: normalizeString(incoming.source) || normalizeString(merged.source) || "manual",
    stage: normalizeString(incoming.stage) || normalizeString(merged.stage) || "draft",
    publish: merged.publish
  });
}

function mergeFallbackLifecycleIntoRecord(existing = {}, incoming = {}) {
  const merged = mergeNoteRecords(existing, incoming);

  return buildNoteRecord({
    ...merged,
    id: normalizeString(existing.id) || normalizeString(merged.id),
    source: normalizeString(incoming.source) || normalizeString(merged.source) || "manual",
    stage: normalizeString(incoming.stage) || normalizeString(merged.stage) || "draft",
    publish: merged.publish
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
    status: publish.status,
    confidence: isManualReference ? "confirmed" : "pending",
    sourceQuality: isManualReference ? "manual_verified" : "imported",
    title: normalizeString(note.title),
    body: normalizeString(note.body),
    coverText: normalizeString(note.coverText),
    collectionType: normalizeString(note.collectionType),
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

export async function loadQualifiedReferenceSamples() {
  const items = await loadNoteRecords();
  return items
    .filter((item) => isQualifiedReferenceRecord(item))
    .map((item) => noteRecordToSuccessSample(item));
}

export async function loadNoteLifecycle() {
  const items = await loadNoteRecords();
  return items
    .filter((item) => hasLifecycleCompat(item))
    .map((item) => noteRecordToLifecycleRecord(item));
}

export function replaceNoteRecordCompatibilityView(current = [], incoming = [], kind = "success") {
  const remainingIncoming = [...incoming];
  const next = [];
  const isSuccessKind = kind === "success";

  for (const existing of Array.isArray(current) ? current : []) {
    const matchIndex = remainingIncoming.findIndex((item) => noteRecordsMatch(existing, item));

    if (matchIndex >= 0) {
      const [replacement] = remainingIncoming.splice(matchIndex, 1);
      next.push(isSuccessKind ? mergeSuccessIntoRecord(existing, replacement) : mergeLifecycleIntoRecord(existing, replacement));
      continue;
    }

    if (isSuccessKind) {
      if (!normalizeNoteRecordReference(existing).enabled) {
        next.push(existing);
        continue;
      }

      if (hasLifecycleCompat(existing)) {
        next.push(stripReferenceFromRecord(existing));
      }
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

  return next;
}

export async function saveNoteLifecycle(items) {
  const current = await loadNoteRecords();
  const incoming = collapseNoteRecordsByCompatibility(
    dedupeNoteRecords((Array.isArray(items) ? items : []).map((item) => migrateLifecycleToNoteRecord(item)))
  );
  await saveNoteRecords(replaceNoteRecordCompatibilityView(current, incoming, "lifecycle"));
}

export async function saveSuccessSamples(items) {
  const current = await loadNoteRecords();
  const incoming = collapseNoteRecordsByCompatibility(
    dedupeNoteRecords((Array.isArray(items) ? items : []).map((item) => migrateSuccessSampleToNoteRecord(item)))
  );
  await saveNoteRecords(replaceNoteRecordCompatibilityView(current, incoming, "success"));
}

export async function saveCompatibilityItems(items, { kind = "success" } = {}) {
  if (kind === "lifecycle") {
    await saveNoteLifecycle(items);
    return;
  }

  await saveSuccessSamples(items);
}

function compatibilityNotFoundMessage(kind = "success") {
  return kind === "lifecycle" ? "未找到要删除的笔记生命周期记录。" : "未找到要删除的成功样本。";
}

export async function deleteCompatibilityItemById(id, { kind = "success" } = {}) {
  const targetId = normalizeString(id);
  const currentItems = kind === "lifecycle" ? await loadNoteLifecycle() : await loadSuccessSamples();
  const nextItems = currentItems.filter((item) => normalizeString(item.id) !== targetId);

  if (nextItems.length === currentItems.length) {
    const error = new Error(compatibilityNotFoundMessage(kind));
    error.statusCode = 404;
    throw error;
  }

  await saveCompatibilityItems(nextItems, { kind });
  return kind === "lifecycle" ? loadNoteLifecycle() : loadSuccessSamples();
}

export async function loadStyleProfile() {
  return sanitizeStyleProfileState(await readJson(paths.styleProfile, {}));
}

export async function saveStyleProfile(profile) {
  await writeJson(paths.styleProfile, sanitizeStyleProfileState(profile && typeof profile === "object" ? profile : {}));
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

export async function loadInnerSpaceTerms() {
  return sanitizeInnerSpaceTerms(await readJson(paths.innerSpaceTerms, []));
}

export async function saveInnerSpaceTerms(items) {
  await writeJson(paths.innerSpaceTerms, sanitizeInnerSpaceTerms(items));
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
  const [seed, custom, feedback, reviewQueue, noteLifecycle, noteRecords, falsePositiveLog] = await Promise.all([
    readJson(paths.lexiconSeed, []),
    readJson(paths.lexiconCustom, []),
    readJson(paths.feedbackLog, []),
    readJson(paths.reviewQueue, []),
    loadNoteLifecycle(),
    loadNoteRecords(),
    loadFalsePositiveLog()
  ]);
  const pendingFalsePositiveCount = falsePositiveLog.filter((item) => item.status !== "platform_passed_confirmed").length;

  return {
    seedLexiconCount: seed.length,
    customLexiconCount: custom.length,
    feedbackCount: feedback.length + pendingFalsePositiveCount,
    reviewQueueCount: reviewQueue.length,
    noteLifecycleCount: noteLifecycle.length,
    sampleLibraryCount: noteRecords.length
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

export async function ensureMemoryStorage() {
  await fs.mkdir(paths.memoryRoot, { recursive: true });
}

export async function loadMemoryDocuments() {
  return readJsonLines(paths.memoryDocuments, []);
}

export async function saveMemoryDocuments(items) {
  await ensureMemoryStorage();
  await writeJsonLines(paths.memoryDocuments, items);
}

export async function loadMemoryCards() {
  return readJsonLines(paths.memoryCards, []);
}

export async function saveMemoryCards(items) {
  await ensureMemoryStorage();
  await writeJsonLines(paths.memoryCards, items);
}

export async function loadMemoryEmbeddings() {
  return readJsonLines(paths.memoryEmbeddings, []);
}

export async function saveMemoryEmbeddings(items) {
  await ensureMemoryStorage();
  await writeJsonLines(paths.memoryEmbeddings, items);
}

export async function loadMemoryIndexMeta() {
  return readJson(paths.memoryIndexMeta, {});
}

export async function saveMemoryIndexMeta(value = {}) {
  await ensureMemoryStorage();
  await writeJson(paths.memoryIndexMeta, value && typeof value === "object" ? value : {});
}

export async function loadMemoryStoreSnapshot() {
  const [documents, cards, embeddings, meta] = await Promise.all([
    loadMemoryDocuments(),
    loadMemoryCards(),
    loadMemoryEmbeddings(),
    loadMemoryIndexMeta()
  ]);

  return {
    documents,
    cards,
    embeddings,
    meta
  };
}

export async function saveMemoryStoreSnapshot({ documents = [], cards, embeddings = [], meta = {} } = {}) {
  await ensureMemoryStorage();
  const writes = [saveMemoryDocuments(documents), saveMemoryEmbeddings(embeddings), saveMemoryIndexMeta(meta)];

  if (Array.isArray(cards)) {
    writes.push(saveMemoryCards(cards));
  }

  await Promise.all(writes);
}

export async function getMemoryRetrievalService() {
  const resolvedRoot = path.resolve(paths.memoryRoot);

  if (!memoryRetrievalServicePromise || memoryRetrievalServiceRoot !== resolvedRoot) {
    memoryRetrievalServiceRoot = resolvedRoot;
    memoryRetrievalServicePromise = (async () => {
      const [{ createDeterministicEmbeddingProvider }, { createMemoryVectorStore }, { createMemoryRetrievalService }] =
        await Promise.all([
          import("./memory/embedding-provider.js"),
          import("./memory/vector-store.js"),
          import("./memory/retrieval-service.js")
        ]);

      const embeddingProvider = createDeterministicEmbeddingProvider();
      const vectorStore = createMemoryVectorStore({
        rootDir: paths.memoryRoot,
        embeddingProvider
      });

      return createMemoryRetrievalService({ vectorStore });
    })().catch((error) => {
      if (memoryRetrievalServiceRoot === resolvedRoot) {
        memoryRetrievalServicePromise = null;
      }

      throw error;
    });
  }

  return memoryRetrievalServicePromise;
}
