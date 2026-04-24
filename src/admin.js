import {
  loadCustomLexicon,
  loadFeedbackLog,
  loadFalsePositiveLog,
  loadReviewQueue,
  loadRewritePairs,
  loadSeedLexicon,
  saveCustomLexicon,
  saveFeedbackLog,
  saveFalsePositiveLog,
  saveReviewQueue,
  saveRewritePairs,
  saveSeedLexicon
} from "./data-store.js";
import { buildFalsePositiveAudit, getCandidatePhraseIssue, isValidLexiconCandidatePhrase } from "./feedback.js";

export function normalizeLexiconLevel(value = "", riskLevel = "manual_review") {
  const text = String(value || "").trim().toLowerCase();

  if (text === "l1" || text === "一级" || text === "一级词库") {
    return "l1";
  }
  if (text === "l2" || text === "二级" || text === "二级词库") {
    return "l2";
  }
  if (text === "l3" || text === "三级" || text === "三级词库") {
    return "l3";
  }

  if (riskLevel === "hard_block") {
    return "l1";
  }
  if (riskLevel === "observe" || riskLevel === "pass") {
    return "l3";
  }

  return "l2";
}

function createError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function slugify(value = "") {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function uniqueStrings(items = []) {
  return [...new Set((Array.isArray(items) ? items : [items]).map((item) => String(item || "").trim()).filter(Boolean))];
}

function sanitizeLexiconEntry(entry = {}) {
  const match = entry.match === "regex" ? "regex" : "exact";
  const term = String(entry.term || "").trim();
  const pattern = String(entry.pattern || "").trim();
  const sourceText = match === "regex" ? pattern : term;

  if (!sourceText) {
    throw createError("词库项缺少 term 或 pattern。");
  }

  return {
    id: String(entry.id || `${slugify(sourceText) || "lexicon"}-${Date.now()}`),
    term: match === "exact" ? term : undefined,
    pattern: match === "regex" ? pattern : undefined,
    match,
    category: String(entry.category || "待人工判断").trim(),
    riskLevel: String(entry.riskLevel || "manual_review").trim(),
    lexiconLevel: normalizeLexiconLevel(entry.lexiconLevel, entry.riskLevel),
    fields: uniqueStrings(entry.fields).length
      ? uniqueStrings(entry.fields)
      : ["title", "body", "coverText"],
    xhsReason: String(entry.xhsReason || "").trim(),
    sourceUrl: String(entry.sourceUrl || "").trim(),
    sourceDate: String(entry.sourceDate || "").trim(),
    notes: String(entry.notes || "").trim(),
    enabled: entry.enabled !== false
  };
}

function buildReviewReasonText(item) {
  const reasons = uniqueStrings(item.platformReasons || [item.platformReason]);

  if (reasons.length) {
    return reasons.join(" / ");
  }

  return "来自违规原因回流复核队列";
}

function enrichFalsePositiveLogItem(item) {
  const status = String(item.status || "platform_passed_pending").trim() || "platform_passed_pending";
  const audit = item.falsePositiveAudit || {};

  return {
    ...item,
    status,
    falsePositiveAudit: {
      ...audit,
      label: String(audit.label || "").trim(),
      signal: String(audit.signal || "").trim(),
      analyzerVerdict: String(audit.analyzerVerdict || "").trim(),
      notes: String(audit.notes || "").trim()
    }
  };
}

export function buildLexiconDraftFromReviewItem(item) {
  const sourceHint = String(item.sourceNoteExcerpt || item.sourceNoteId || "未标记").trim();
  const reviewLabel = String(item.reviewAuditSignal || "").trim();
  const hitCount = Math.max(1, Number(item.hitCount) || 1);
  const phraseIssue = getCandidatePhraseIssue(item.phrase);
  const match = item.match === "regex" ? "regex" : "exact";

  if (match === "exact" && !isValidLexiconCandidatePhrase(item.phrase)) {
    return {
      blocked: true,
      blockedReason: phraseIssue || "当前候选词不适合直接入库",
      suggestedSource: "",
      match,
      category: item.suggestedCategory || "待人工判断",
      riskLevel: item.suggestedRiskLevel || "manual_review",
      lexiconLevel: normalizeLexiconLevel(item.lexiconLevel, item.suggestedRiskLevel),
      xhsReason: buildReviewReasonText(item),
      notes: `未生成直接入库草稿；来源内容：${sourceHint}`
    };
  }

  return sanitizeLexiconEntry({
    id: item.id ? `review-${item.id}` : undefined,
    term: match === "exact" ? item.phrase : undefined,
    pattern: match === "regex" ? item.pattern : undefined,
    match,
    category: item.suggestedCategory || "待人工判断",
    riskLevel: item.suggestedRiskLevel || "manual_review",
    lexiconLevel: normalizeLexiconLevel(item.lexiconLevel, item.suggestedRiskLevel),
    fields: ["title", "body", "coverText", "tags", "comments"],
    xhsReason: buildReviewReasonText(item),
    notes: `由复核队列转入；来源内容：${sourceHint}；累计命中 ${hitCount} 次；复盘信号：${reviewLabel || "未标记"}${item.notes ? `；候选说明：${item.notes}` : ""}`
  });
}

function enrichReviewQueueItem(item) {
  return {
    ...item,
    lexiconLevel: normalizeLexiconLevel(item.lexiconLevel, item.suggestedRiskLevel),
    recommendedLexiconDraft: buildLexiconDraftFromReviewItem(item)
  };
}

export async function loadAdminData() {
  const [seedLexicon, customLexicon, feedbackLog, reviewQueue, rewritePairs, falsePositiveLog] = await Promise.all([
    loadSeedLexicon(),
    loadCustomLexicon(),
    loadFeedbackLog(),
    loadReviewQueue(),
    loadRewritePairs(),
    loadFalsePositiveLog()
  ]);

  return {
    seedLexicon: seedLexicon.map((item) => ({
      ...item,
      lexiconLevel: normalizeLexiconLevel(item.lexiconLevel, item.riskLevel)
    })),
    customLexicon: customLexicon.map((item) => ({
      ...item,
      lexiconLevel: normalizeLexiconLevel(item.lexiconLevel, item.riskLevel)
    })),
    feedbackLog,
    reviewQueue: reviewQueue.map(enrichReviewQueueItem),
    rewritePairs,
    falsePositiveLog: falsePositiveLog.map(enrichFalsePositiveLogItem)
  };
}

export async function confirmFalsePositiveLogEntry(id, userNotes = "") {
  const current = await loadFalsePositiveLog();
  const index = current.findIndex((item) => String(item.id || "").trim() === String(id || "").trim());

  if (index === -1) {
    throw createError("未找到要确认的误报样本。", 404);
  }

  const existing = current[index];
  const now = new Date().toISOString();
  const nextItem = enrichFalsePositiveLogItem({
    ...existing,
    status: "platform_passed_confirmed",
    updatedAt: now,
    userNotes: String(userNotes || "").trim() || existing.userNotes,
    falsePositiveAudit: buildFalsePositiveAudit({
      status: "platform_passed_confirmed",
      analysisSnapshot: existing.analysisSnapshot
    })
  });

  const next = [...current];
  next[index] = nextItem;
  await saveFalsePositiveLog(next);

  return nextItem;
}

export async function deleteFalsePositiveLogEntry(id) {
  const current = await loadFalsePositiveLog();
  const next = current.filter((item) => String(item.id || "").trim() !== String(id || "").trim());

  if (next.length === current.length) {
    throw createError("未找到要删除的误报样本。", 404);
  }

  await saveFalsePositiveLog(next);
}

export async function addLexiconEntry(scope, entry) {
  const sanitized = sanitizeLexiconEntry(entry);
  const load = scope === "seed" ? loadSeedLexicon : loadCustomLexicon;
  const save = scope === "seed" ? saveSeedLexicon : saveCustomLexicon;

  if (!load || !save) {
    throw createError("不支持的词库范围。");
  }

  const current = await load();

  if (current.some((item) => item.id === sanitized.id)) {
    throw createError(`词库 ID 已存在：${sanitized.id}`);
  }

  current.push(sanitized);
  await save(current);
  return sanitized;
}

export async function deleteLexiconEntry(scope, id) {
  const load = scope === "seed" ? loadSeedLexicon : loadCustomLexicon;
  const save = scope === "seed" ? saveSeedLexicon : saveCustomLexicon;

  if (!load || !save) {
    throw createError("不支持的词库范围。");
  }

  const current = await load();
  const next = current.filter((item) => item.id !== id);

  if (next.length === current.length) {
    throw createError("未找到要删除的词库项。", 404);
  }

  await save(next);
}

export async function deleteFeedbackEntry(noteId, createdAt) {
  const current = await loadFeedbackLog();
  const next = current.filter((item) => !(item.noteId === noteId && item.createdAt === createdAt));

  if (next.length === current.length) {
    throw createError("未找到要删除的反馈日志。", 404);
  }

  await saveFeedbackLog(next);
}

export async function deleteRewritePairEntry(id, createdAt) {
  const current = await loadRewritePairs();
  const next = current.filter((item) => !(item.id === id && item.createdAt === createdAt));

  if (next.length === current.length) {
    throw createError("未找到要删除的改写样本。", 404);
  }

  await saveRewritePairs(next);
}

export async function deleteReviewQueueItem(id) {
  const current = await loadReviewQueue();
  const next = current.filter((item) => item.id !== id);

  if (next.length === current.length) {
    throw createError("未找到要删除的复核项。", 404);
  }

  await saveReviewQueue(next);
}

export async function promoteReviewQueueItem(id) {
  const [reviewQueue, customLexicon] = await Promise.all([loadReviewQueue(), loadCustomLexicon()]);
  const item = reviewQueue.find((entry) => entry.id === id);

  if (!item) {
    throw createError("未找到要转入词库的复核项。", 404);
  }

  const lexiconEntry = buildLexiconDraftFromReviewItem(item);

  if (lexiconEntry?.blocked) {
    throw createError(lexiconEntry.blockedReason || "该候选词当前不适合直接入库。");
  }

  if (customLexicon.some((entry) => entry.id === lexiconEntry.id)) {
    throw createError("该复核项已经转入过自定义词库。");
  }

  await saveCustomLexicon([...customLexicon, lexiconEntry]);
  await saveReviewQueue(reviewQueue.filter((entry) => entry.id !== id));

  return lexiconEntry;
}
