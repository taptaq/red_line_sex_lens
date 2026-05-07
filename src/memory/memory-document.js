import { calculateSampleWeight } from "../sample-weight.js";

function normalizeString(value = "") {
  return String(value || "").trim();
}

function uniqueStrings(items = []) {
  return [...new Set((Array.isArray(items) ? items : [items]).map((item) => normalizeString(item)).filter(Boolean))];
}

function normalizeNumericScore(value, fallback) {
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : fallback;
}

function inferSourceQuality(value = "", fallback = "unknown") {
  const normalized = normalizeString(value).toLowerCase();

  if (["manual_verified", "imported", "unknown"].includes(normalized)) {
    return normalized;
  }

  if (normalized === "manual") {
    return "manual_verified";
  }

  if (normalized) {
    return "imported";
  }

  return fallback;
}

function buildSearchText(parts = []) {
  return parts
    .map((part) => normalizeString(part))
    .filter(Boolean)
    .join("\n");
}

export function buildMemoryDocumentFromNoteRecord(record = {}, { status = "active", embeddingVersion = "" } = {}) {
  const note = record.note || {};
  const publish = record.publish || {};
  const metrics = publish.metrics || {};
  const isReference = record.reference?.enabled === true;
  const tags = uniqueStrings(note.tags);
  const source = normalizeString(record.source);

  return {
    id: `note-record:${normalizeString(record.id)}`,
    kind: isReference ? "reference_sample" : "note_record",
    status: normalizeString(status) || "active",
    confidence: normalizeNumericScore(isReference ? 0.95 : 0.7, 0.7),
    sourceQuality: inferSourceQuality(source, isReference ? "manual_verified" : "unknown"),
    sourceIds: [normalizeString(record.id)].filter(Boolean),
    accountScope: "default",
    collectionType: normalizeString(note.collectionType),
    riskCategories: [],
    tags,
    createdAt: normalizeString(record.createdAt),
    updatedAt: normalizeString(record.updatedAt),
    embeddingVersion: normalizeString(embeddingVersion),
    retrievalWeight: normalizeNumericScore(
      calculateSampleWeight(
        {
          tier: record.reference?.tier || "",
          metrics,
          status: publish.status,
          source,
          updatedAt: record.updatedAt,
          createdAt: record.createdAt
        },
        isReference ? "success" : "lifecycle"
      ),
      1
    ),
    searchText: buildSearchText([
      note.title,
      note.body,
      note.coverText,
      note.collectionType,
      tags.join(" ")
    ]),
    payload: record
  };
}

export function buildMemoryDocumentFromFalsePositive(item = {}, { embeddingVersion = "" } = {}) {
  const status = normalizeString(item.status) || "platform_passed_pending";
  const tags = uniqueStrings(item.tags);
  const riskCategories = uniqueStrings(item.riskCategories);
  const isConfirmed = status === "platform_passed_confirmed";

  return {
    id: `false-positive:${normalizeString(item.id)}`,
    kind: "false_positive",
    status: "active",
    confidence: normalizeNumericScore(isConfirmed ? 0.9 : 0.72, 0.72),
    sourceQuality: inferSourceQuality(item.sourceQuality, isConfirmed ? "manual_verified" : "unknown"),
    sourceIds: [normalizeString(item.id)].filter(Boolean),
    accountScope: "default",
    collectionType: "",
    riskCategories,
    tags,
    createdAt: normalizeString(item.createdAt),
    updatedAt: normalizeString(item.updatedAt),
    embeddingVersion: normalizeString(embeddingVersion),
    retrievalWeight: normalizeNumericScore(calculateSampleWeight(item, "false_positive"), 1),
    searchText: buildSearchText([
      item.title,
      item.body,
      item.coverText,
      tags.join(" "),
      riskCategories.join(" ")
    ]),
    payload: item
  };
}

export function buildMemoryDocumentFromFeedback(item = {}, { embeddingVersion = "" } = {}) {
  const feedbackSuggestion = item.feedbackModelSuggestion || {};
  const riskCategories = uniqueStrings([
    item.platformReason,
    feedbackSuggestion.suggestedCategory,
    ...(Array.isArray(feedbackSuggestion.contextCategories) ? feedbackSuggestion.contextCategories : [])
  ]);
  const tags = uniqueStrings(item.tags);
  const suspiciousPhrases = uniqueStrings(item.suspiciousPhrases);

  return {
    id: `feedback:${normalizeString(item.id)}`,
    kind: "violation_feedback",
    status: "active",
    confidence: normalizeNumericScore(item.confidence, 0.92),
    sourceQuality: inferSourceQuality(item.sourceQuality, "imported"),
    sourceIds: [normalizeString(item.id)].filter(Boolean),
    accountScope: "default",
    collectionType: "",
    riskCategories,
    tags,
    createdAt: normalizeString(item.createdAt),
    updatedAt: normalizeString(item.updatedAt),
    embeddingVersion: normalizeString(embeddingVersion),
    retrievalWeight: normalizeNumericScore(item.retrievalWeight, 1.8),
    searchText: buildSearchText([
      item.title,
      item.noteContent || item.body,
      item.platformReason,
      suspiciousPhrases.join(" "),
      tags.join(" "),
      riskCategories.join(" ")
    ]),
    payload: item
  };
}
