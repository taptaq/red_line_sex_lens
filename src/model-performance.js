import fs from "node:fs/promises";
import { paths } from "./config.js";

const maxModelPerformanceEntries = Number(process.env.MODEL_PERFORMANCE_MAX_ENTRIES || 1000);

async function readJson(filePath, fallback) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === "ENOENT") {
      return fallback;
    }

    if (error instanceof SyntaxError) {
      return fallback;
    }

    throw error;
  }
}

async function writeJson(filePath, value) {
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function normalizeString(value) {
  return String(value || "").trim();
}

function normalizeDuration(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.round(number) : 0;
}

function normalizeStatus(value) {
  return normalizeString(value) === "ok" ? "ok" : "error";
}

function inferErrorType({ errorType = "", message = "", statusCode = 0 } = {}) {
  const explicit = normalizeString(errorType);

  if (explicit) {
    return explicit;
  }

  const text = normalizeString(message).toLowerCase();

  if (statusCode === 504 || /timeout|超时|abort/.test(text)) return "timeout";
  if (/json|不是有效/.test(text)) return "json_error";
  if (statusCode === 429 || /rate limit|too many|访问量过大/.test(text)) return "rate_limit";
  if (statusCode === 401 || statusCode === 403 || /permission|forbidden|无权|权限/.test(text)) return "permission";
  if (statusCode >= 500) return "server_error";
  if (statusCode >= 400) return "client_error";
  return "unknown";
}

function normalizeRecord(input = {}) {
  const status = normalizeStatus(input.status);
  const now = new Date().toISOString();

  return {
    id: normalizeString(input.id) || `model-call-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    createdAt: normalizeString(input.createdAt) || now,
    scene: normalizeString(input.scene) || "unknown",
    provider: normalizeString(input.provider) || "unknown",
    route: normalizeString(input.route) || "unknown",
    routeLabel: normalizeString(input.routeLabel),
    model: normalizeString(input.model) || "unknown",
    status,
    errorType: status === "ok" ? "" : inferErrorType(input),
    statusCode: Number(input.statusCode) || 0,
    durationMs: normalizeDuration(input.durationMs),
    message: normalizeString(input.message).slice(0, 240)
  };
}

export async function loadModelPerformanceLog() {
  const items = await readJson(paths.modelPerformance, []);
  return (Array.isArray(items) ? items : []).map(normalizeRecord);
}

export async function saveModelPerformanceLog(items) {
  await writeJson(paths.modelPerformance, (Array.isArray(items) ? items : []).map(normalizeRecord));
}

export async function recordModelCall(input = {}) {
  const current = await loadModelPerformanceLog();
  const next = [...current, normalizeRecord(input)].slice(-maxModelPerformanceEntries);
  await saveModelPerformanceLog(next);
  return next[next.length - 1];
}

function roundRate(value) {
  return Math.round(value * 100) / 100;
}

function summarizeGroup(records = []) {
  const totalCalls = records.length;
  const okCount = records.filter((item) => item.status === "ok").length;
  const timeoutCount = records.filter((item) => item.errorType === "timeout").length;
  const jsonErrorCount = records.filter((item) => item.errorType === "json_error").length;
  const totalDuration = records.reduce((total, item) => total + item.durationMs, 0);
  const lastError = records
    .slice()
    .reverse()
    .find((item) => item.status === "error");
  const first = records[0] || {};

  return {
    provider: first.provider || "unknown",
    route: first.route || "unknown",
    routeLabel: first.routeLabel || "",
    model: first.model || "unknown",
    totalCalls,
    okCount,
    errorCount: totalCalls - okCount,
    successRate: totalCalls ? roundRate(okCount / totalCalls) : 0,
    timeoutRate: totalCalls ? roundRate(timeoutCount / totalCalls) : 0,
    jsonErrorRate: totalCalls ? roundRate(jsonErrorCount / totalCalls) : 0,
    averageDurationMs: totalCalls ? Math.round(totalDuration / totalCalls) : 0,
    scenes: [...new Set(records.map((item) => item.scene).filter(Boolean))].sort(),
    lastError: lastError?.message || "",
    lastErrorType: lastError?.errorType || "",
    lastCalledAt: records[records.length - 1]?.createdAt || ""
  };
}

function calculateRecommendationScore(item = {}) {
  const successScore = Number(item.successRate || 0) * 70;
  const timeoutPenalty = Number(item.timeoutRate || 0) * 18;
  const jsonPenalty = Number(item.jsonErrorRate || 0) * 14;
  const latencyScore = Math.max(0, 10 - Math.round(Number(item.averageDurationMs || 0) / 1500));
  const confidenceScore = Math.min(Number(item.totalCalls || 0), 6);

  return Math.max(0, Math.round(successScore + latencyScore + confidenceScore - timeoutPenalty - jsonPenalty));
}

function buildSceneRecommendations(records = []) {
  const sceneGroups = new Map();

  for (const record of records) {
    const scene = record.scene || "unknown";
    const key = [scene, record.provider, record.route, record.model].join("|");
    sceneGroups.set(key, [...(sceneGroups.get(key) || []), record]);
  }

  const recommendations = {};

  for (const recordsForGroup of sceneGroups.values()) {
    const summary = summarizeGroup(recordsForGroup);
    const scene = summary.scenes[0] || "unknown";
    const score = calculateRecommendationScore(summary);
    const candidate = {
      scene,
      provider: summary.provider,
      route: summary.route,
      routeLabel: summary.routeLabel,
      model: summary.model,
      score,
      successRate: summary.successRate,
      timeoutRate: summary.timeoutRate,
      jsonErrorRate: summary.jsonErrorRate,
      averageDurationMs: summary.averageDurationMs,
      totalCalls: summary.totalCalls,
      reason: summary.okCount > 0 ? "历史调用更稳定" : "暂无稳定成功记录"
    };
    const previous = recommendations[scene];

    if (
      !previous ||
      candidate.score > previous.score ||
      (candidate.score === previous.score && candidate.successRate > previous.successRate) ||
      (candidate.score === previous.score &&
        candidate.successRate === previous.successRate &&
        candidate.averageDurationMs < previous.averageDurationMs)
    ) {
      recommendations[scene] = candidate;
    }
  }

  return recommendations;
}

export async function buildModelPerformanceSummary({ limit = 40 } = {}) {
  const records = await loadModelPerformanceLog();
  const groups = new Map();

  for (const record of records) {
    const key = [record.provider, record.route, record.model].join("|");
    groups.set(key, [...(groups.get(key) || []), record]);
  }

  const items = [...groups.values()]
    .map(summarizeGroup)
    .sort((a, b) => b.totalCalls - a.totalCalls || b.successRate - a.successRate)
    .slice(0, limit);

  return {
    totalCalls: records.length,
    items,
    recommendations: buildSceneRecommendations(records),
    recent: records.slice(-20).reverse()
  };
}
