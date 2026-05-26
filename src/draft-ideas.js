function normalizeString(value) {
  return String(value || "").trim();
}

function uniqueStrings(items = []) {
  return [...new Set((Array.isArray(items) ? items : [items]).map((item) => normalizeString(item)).filter(Boolean))];
}

function normalizeStatus(value = "") {
  const normalized = normalizeString(value).toLowerCase();
  return ["draft", "used"].includes(normalized) ? normalized : "draft";
}

function buildDraftIdeaId() {
  return `draft-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

export function normalizeDraftIdea(item = {}) {
  const now = new Date().toISOString();

  return {
    id: normalizeString(item.id) || buildDraftIdeaId(),
    title: normalizeString(item.title),
    briefing: normalizeString(item.briefing),
    collectionType: normalizeString(item.collectionType) || "科普",
    materialText: normalizeString(item.materialText),
    referenceTitle: normalizeString(item.referenceTitle),
    tags: uniqueStrings(item.tags || []),
    sourceType: normalizeString(item.sourceType) || "manual",
    sourceLabel: normalizeString(item.sourceLabel),
    status: normalizeStatus(item.status),
    createdAt: normalizeString(item.createdAt) || now,
    updatedAt: normalizeString(item.updatedAt) || now
  };
}

export function normalizeDraftIdeaStore(value = {}) {
  const sourceItems =
    Array.isArray(value?.items) ? value.items : Array.isArray(value) ? value : [];

  return {
    items: sourceItems.map((item) => normalizeDraftIdea(item))
  };
}
