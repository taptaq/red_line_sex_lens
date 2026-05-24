import { createXhsConnectorProvider } from "./xhs-connector-provider.js";
import {
  normalizeXhsConnectorDiscoveryItem,
  buildSampleLibraryPayloadFromConnectorItem,
  buildLifecyclePatchFromConnectorSyncItem
} from "./xhs-connector-normalizer.js";
import { loadNoteRecords } from "./data-store.js";

function normalizeCandidatesFromRecords(records = []) {
  return (Array.isArray(records) ? records : [])
    .filter((record) => record && typeof record === "object")
    .map((record) => ({
      recordId: String(record.id || "").trim(),
      noteId: String(record.externalSource?.noteId || "").trim(),
      url: String(record.externalSource?.url || "").trim(),
      provider: String(record.externalSource?.provider || "").trim(),
      record
    }))
    .filter((item) => item.recordId && (item.noteId || item.url));
}

function buildPreviewEntry(candidate = {}, publishedItem = {}) {
  const patch = buildLifecyclePatchFromConnectorSyncItem({
    ...publishedItem,
    recordId: candidate.recordId
  });

  return {
    recordId: candidate.recordId,
    noteId: candidate.noteId,
    url: candidate.url,
    provider: candidate.provider,
    performance: publishedItem,
    patch
  };
}

export async function discoverXhsConnectorItems(input = {}) {
  const provider = createXhsConnectorProvider({ kind: "stub" });
  const rawItems = await provider.discover(input);
  return (Array.isArray(rawItems) ? rawItems : []).map((item) => normalizeXhsConnectorDiscoveryItem(item));
}

export async function importXhsConnectorItems(items = [], { persistRecord } = {}) {
  const createdItems = [];
  const normalizedItems = Array.isArray(items) ? items : [];

  for (const item of normalizedItems) {
    const payload = buildSampleLibraryPayloadFromConnectorItem(item);

    if (typeof persistRecord !== "function") {
      continue;
    }

    const created = await persistRecord(payload);
    if (created) {
      createdItems.push(created);
    }
  }

  return {
    createdCount: createdItems.length,
    items: createdItems
  };
}

export async function previewXhsConnectorSync({ provider = null, records = null } = {}) {
  const connectorProvider = provider || createXhsConnectorProvider({ kind: "stub" });
  const noteRecords = records || (await loadNoteRecords());
  const candidates = normalizeCandidatesFromRecords(noteRecords);
  const publishedItems = await connectorProvider.fetchPublishedPerformance(candidates);
  const matched = [];
  const unmatched = [];
  const publishedByNoteId = new Map();
  const publishedByUrl = new Map();

  for (const item of Array.isArray(publishedItems) ? publishedItems : []) {
    const normalized = normalizeXhsConnectorDiscoveryItem(item);
    if (normalized.noteId) {
      publishedByNoteId.set(normalized.noteId, normalized);
    }
    if (normalized.url) {
      publishedByUrl.set(normalized.url, normalized);
    }
  }

  for (const candidate of candidates) {
    const matchedItem = (candidate.noteId && publishedByNoteId.get(candidate.noteId)) || (candidate.url && publishedByUrl.get(candidate.url));

    if (matchedItem) {
      matched.push(buildPreviewEntry(candidate, matchedItem));
      continue;
    }

    unmatched.push(candidate);
  }

  return {
    matched,
    unmatched,
    summary: {
      matchedCount: matched.length,
      unmatchedCount: unmatched.length
    }
  };
}

export async function applyXhsConnectorSync(preview = {}, { patchRecord } = {}) {
  const matched = Array.isArray(preview?.matched) ? preview.matched : [];
  let appliedCount = 0;

  if (typeof patchRecord !== "function") {
    return { appliedCount };
  }

  for (const item of matched) {
    if (!item?.patch || !String(item.patch.id || "").trim()) {
      continue;
    }

    await patchRecord(item.patch);
    appliedCount += 1;
  }

  return { appliedCount };
}
