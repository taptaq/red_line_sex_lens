function normalizeString(value) {
  return String(value || "").trim();
}

function uniqueStrings(items = []) {
  return [...new Set((Array.isArray(items) ? items : [items]).map((item) => normalizeString(item)).filter(Boolean))];
}

function buildFinishedContentId() {
  return `finished-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

export function normalizeFinishedContent(item = {}) {
  const now = new Date().toISOString();

  return {
    id: normalizeString(item.id) || buildFinishedContentId(),
    title: normalizeString(item.title),
    body: normalizeString(item.body || item.content),
    coverText: normalizeString(item.coverText),
    collectionType: normalizeString(item.collectionType) || "科普",
    tags: uniqueStrings(item.tags || []),
    generationNotes: normalizeString(item.generationNotes),
    safetyNotes: normalizeString(item.safetyNotes),
    coverImagePrompt: normalizeString(item.coverImagePrompt),
    lunaVideoScript: normalizeString(item.lunaVideoScript),
    sourceType: normalizeString(item.sourceType) || "manual",
    sourceLabel: normalizeString(item.sourceLabel),
    createdAt: normalizeString(item.createdAt) || now,
    updatedAt: normalizeString(item.updatedAt) || now
  };
}

export function normalizeFinishedContentStore(value = {}) {
  const sourceItems = Array.isArray(value?.items) ? value.items : Array.isArray(value) ? value : [];

  return {
    items: sourceItems.map((item) => normalizeFinishedContent(item))
  };
}
