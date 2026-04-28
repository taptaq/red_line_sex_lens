import fs from "node:fs/promises";
import { isSameFeedbackNote } from "./feedback-identity.js";
import { paths } from "./config.js";

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

  return {
    ...entry,
    id: normalizeString(entry.id),
    status,
    createdAt: normalizeString(entry.createdAt),
    updatedAt: normalizeString(entry.updatedAt),
    observedAt: normalizeString(entry.observedAt),
    observationWindowHours: normalizeNumber(entry.observationWindowHours, 0),
    title: normalizeString(entry.title),
    body: normalizeString(entry.body),
    coverText: normalizeString(entry.coverText),
    tags: uniqueStrings(entry.tags),
    userNotes: normalizeString(entry.userNotes)
  };
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

export async function loadSuccessSamples() {
  return readJson(paths.successSamples, []);
}

export async function saveSuccessSamples(items) {
  await writeJson(paths.successSamples, Array.isArray(items) ? items : []);
}

export async function loadStyleProfile() {
  return readJson(paths.styleProfile, {});
}

export async function saveStyleProfile(profile) {
  await writeJson(paths.styleProfile, profile && typeof profile === "object" ? profile : {});
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
  const [seed, custom, feedback, reviewQueue] = await Promise.all([
    readJson(paths.lexiconSeed, []),
    readJson(paths.lexiconCustom, []),
    readJson(paths.feedbackLog, []),
    readJson(paths.reviewQueue, [])
  ]);

  return {
    seedLexiconCount: seed.length,
    customLexiconCount: custom.length,
    feedbackCount: feedback.length,
    reviewQueueCount: reviewQueue.length
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
