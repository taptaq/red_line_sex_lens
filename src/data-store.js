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
