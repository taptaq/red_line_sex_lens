import crypto from "node:crypto";
import { ensureArray, normalizeText } from "./normalizer.js";
import { calculateSampleWeight, withSampleWeight } from "./sample-weight.js";

const allowedTiers = new Set(["passed", "performed", "featured"]);

function uniqueStrings(items = []) {
  return [...new Set((Array.isArray(items) ? items : [items]).map((item) => String(item || "").trim()).filter(Boolean))];
}

function normalizeTier(value = "") {
  const normalized = String(value || "").trim().toLowerCase();
  return allowedTiers.has(normalized) ? normalized : "passed";
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

export function buildSuccessSampleIdentityKey(item = {}) {
  const title = normalizeText(item.title);
  const body = normalizeText(item.body || item.noteContent);

  if (!title && !body) {
    return "";
  }

  return `${String(item.sourcePlatform || "xiaohongshu").trim().toLowerCase()}|${title}|${body}`;
}

export function isSameSuccessSample(left = {}, right = {}) {
  const leftId = String(left.id || "").trim();
  const rightId = String(right.id || "").trim();

  if (leftId && rightId && leftId === rightId) {
    return true;
  }

  const leftKey = buildSuccessSampleIdentityKey(left);
  const rightKey = buildSuccessSampleIdentityKey(right);
  return Boolean(leftKey && rightKey && leftKey === rightKey);
}

export function buildSuccessSampleRecord(input = {}) {
  const now = new Date().toISOString();
  const identityKey = buildSuccessSampleIdentityKey(input);
  const id =
    String(input.id || "").trim() ||
    `success-${crypto.createHash("sha1").update(identityKey || `${Date.now()}`).digest("hex").slice(0, 16)}`;

  return withSampleWeight({
    id,
    tier: normalizeTier(input.tier),
    title: String(input.title || "").trim(),
    body: String(input.body || input.noteContent || "").trim(),
    coverText: String(input.coverText || "").trim(),
    tags: uniqueStrings(ensureArray(input.tags)),
    sourcePlatform: String(input.sourcePlatform || "xiaohongshu").trim() || "xiaohongshu",
    source: String(input.source || "manual").trim() || "manual",
    publishedAt: String(input.publishedAt || "").trim(),
    metrics: normalizeMetrics(input.metrics || {}),
    notes: String(input.notes || "").trim(),
    analysisSnapshot: input.analysisSnapshot || input.analysis || null,
    rewriteSnapshot: input.rewriteSnapshot || input.rewrite || null,
    createdAt: String(input.createdAt || now).trim(),
    updatedAt: now
  }, "success");
}

export function getSuccessSampleWeight(item = {}) {
  return calculateSampleWeight({
    ...item,
    tier: normalizeTier(item.tier)
  }, "success");
}

export function upsertSuccessSampleRecords(current = [], incoming = []) {
  const currentItems = Array.isArray(current) ? current : [];
  const normalizedIncoming = (Array.isArray(incoming) ? incoming : [incoming]).filter(Boolean).map(buildSuccessSampleRecord);
  const retained = currentItems.filter((existing) => !normalizedIncoming.some((entry) => isSameSuccessSample(existing, entry)));
  const mergedIncoming = normalizedIncoming.map((entry) => {
    const previous = currentItems.find((item) => isSameSuccessSample(item, entry));
    return previous ? { ...entry, id: previous.id, createdAt: previous.createdAt } : entry;
  });

  return [...retained, ...mergedIncoming];
}
