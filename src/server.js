import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  addLexiconEntry,
  confirmFalsePositiveLogEntry,
  createWhitelistCandidatesFromFalsePositive,
  deleteFeedbackEntry,
  deleteFalsePositiveLogEntry,
  deleteLexiconEntry,
  deleteRewritePairEntry,
  deleteReviewQueueItem,
  loadAdminData,
  promoteReviewQueueItem
} from "./admin.js";
import { analyzePost } from "./analyzer.js";
import {
  appendRewritePairs,
  loadAnalyzeTagOptions,
  loadFalsePositiveLog,
  loadReviewQueue,
  loadSummary,
  loadStyleProfile,
  loadSuccessSamples,
  saveAnalyzeTagOptions,
  saveFalsePositiveLog,
  saveStyleProfile,
  saveSuccessSamples,
  upsertFeedbackEntries
} from "./data-store.js";
import {
  buildAnalysisSnapshot,
  buildFalsePositiveAudit,
  buildReviewAudit,
  createReviewCandidates,
  mergeSuspiciousPhrases,
  normalizeFeedbackItems,
  sanitizeFeedbackModelSuggestion,
  sanitizeScreenshotMeta,
  sanitizeScreenshotRecognition
} from "./feedback.js";
import { isSameFeedbackNote } from "./feedback-identity.js";
import {
  buildFeedbackModelSelectionOptionsPayload,
  buildModelSelectionOptionsPayload,
  normalizeFeedbackModelSelectionState,
  normalizeModelSelectionState
} from "./model-selection.js";
import { runCrossModelReview } from "./cross-review.js";
import { generateNoteCandidates, scoreGenerationCandidates } from "./generation-workbench.js";
import { recognizeFeedbackScreenshot, rewritePostForCompliance, suggestFeedbackCandidates } from "./glm.js";
import { buildRewritePairRecord } from "./rewrite-pairs.js";
import { mergeRuleAndSemanticAnalysis, runSemanticReview } from "./semantic-review.js";
import { buildStyleProfileDraft, confirmStyleProfileDraft } from "./style-profile.js";
import { buildSuccessSampleRecord, upsertSuccessSampleRecords } from "./success-samples.js";
import { webDir } from "./config.js";

const host = "127.0.0.1";
const port = 3030;
const webRoot = path.resolve(webDir);

function resolveWebAsset(pathname) {
  const localPath = pathname === "/" ? "/index.html" : pathname;
  const assetPath = path.resolve(webRoot, `.${localPath}`);

  if (!assetPath.startsWith(webRoot)) {
    return null;
  }

  return assetPath;
}

function getWebAssetContentType(filePath) {
  const extension = path.extname(filePath).toLowerCase();

  if (extension === ".html") return "text/html; charset=utf-8";
  if (extension === ".js") return "text/javascript; charset=utf-8";
  if (extension === ".css") return "text/css; charset=utf-8";

  return null;
}

function sanitizeAnalyzeTagOptions(options) {
  const seen = new Set();
  const normalized = [];
  const source = Array.isArray(options) ? options : [];

  for (const item of source) {
    const tag = String(item || "").trim();

    if (!tag || seen.has(tag)) {
      continue;
    }

    seen.add(tag);
    normalized.push(tag);
  }

  return normalized.slice(0, 200);
}

function uniqueStrings(items = []) {
  return [...new Set((Array.isArray(items) ? items : [items]).map((item) => String(item || "").trim()).filter(Boolean))];
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  response.end(JSON.stringify(payload, null, 2));
}

function sendFile(response, filePath, contentType) {
  return fs
    .readFile(filePath)
    .then((buffer) => {
      response.writeHead(200, {
        "Content-Type": contentType,
        "Cache-Control": "no-store"
      });
      response.end(buffer);
    })
    .catch(() => {
      response.writeHead(404);
      response.end("Not found");
    });
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    request.on("data", (chunk) => chunks.push(chunk));
    request.on("end", () => {
      try {
        const raw = Buffer.concat(chunks).toString("utf8");
        resolve(raw ? JSON.parse(raw) : {});
      } catch (error) {
        reject(error);
      }
    });
    request.on("error", reject);
  });
}

function withErrorHandling(handler) {
  return async (request, response) => {
    try {
      await handler(request, response);
    } catch (error) {
      sendJson(response, Number(error?.statusCode) || 500, {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown server error"
      });
    }
  };
}

async function buildMergedAnalysis(input, { modelSelection = "auto" } = {}) {
  const analysis = await analyzePost(input);
  const semanticReview = await runSemanticReview({
    input,
    analysis,
    modelSelection
  });

  return mergeRuleAndSemanticAnalysis(analysis, semanticReview);
}

const verdictRank = {
  pass: 0,
  observe: 1,
  manual_review: 2,
  hard_block: 3
};

function isAcceptedRewriteVerdict(verdict = "") {
  return (verdictRank[String(verdict || "").trim()] ?? verdictRank.manual_review) <= verdictRank.observe;
}

function buildRewriteInputFromPayload(rewrite = {}) {
  return {
    title: String(rewrite.title || "").trim(),
    body: String(rewrite.body || "").trim(),
    coverText: String(rewrite.coverText || "").trim(),
    tags: Array.isArray(rewrite.tags) ? rewrite.tags : []
  };
}

function buildRetryGuidance({
  attempt = 1,
  afterAnalysis = {},
  afterCrossReview = {},
  mergedVerdict = "manual_review",
  reviewVerdict = "manual_review"
} = {}) {
  const semantic = afterAnalysis?.semanticReview?.status === "ok" ? afterAnalysis.semanticReview.review : null;
  const focusPoints = uniqueStrings([
    ...(afterAnalysis?.suggestions || []),
    semantic?.suggestion || "",
    ...(semantic?.reasons || []),
    ...(afterCrossReview?.aggregate?.reasons || []),
    ...(afterCrossReview?.aggregate?.falseNegativeSignals || [])
  ]).slice(0, 6);
  const summaryParts = uniqueStrings([
    reviewVerdict === "manual_review" || reviewVerdict === "hard_block"
      ? `第 ${attempt} 轮改写后，交叉复判仍给出${reviewVerdict === "hard_block" ? "高风险拦截" : "人工复核"}。`
      : "",
    mergedVerdict === "manual_review" || mergedVerdict === "hard_block"
      ? `规则与语义综合结论仍是${mergedVerdict === "hard_block" ? "高风险拦截" : "人工复核"}。`
      : "",
    semantic?.summary || ""
  ]);

  return {
    attempt,
    mergedVerdict,
    reviewVerdict,
    summary:
      summaryParts.join(" ") ||
      `第 ${attempt} 轮改写后仍未进入通过区间，下一轮请针对更具体的风险点继续定向修改。`,
    focusPoints
  };
}

export async function rewriteUntilAccepted({
  input = {},
  beforeAnalysis = {},
  modelSelection = {},
  maxAttempts = 3,
  rewritePost = rewritePostForCompliance,
  analyzeMerged = buildMergedAnalysis,
  crossReview = runCrossModelReview
} = {}) {
  let attempt = 0;
  let currentInput = { ...input };
  let currentAnalysis = beforeAnalysis;
  let latestRewrite = null;
  let latestAfterAnalysis = null;
  let latestAfterCrossReview = null;
  const rounds = [];

  while (attempt < maxAttempts) {
    attempt += 1;
    const sourceInput = { ...currentInput };
    latestRewrite = await rewritePost({
      input: currentInput,
      analysis: currentAnalysis,
      modelSelection: modelSelection.rewrite
    });

    const rewrittenInput = buildRewriteInputFromPayload(latestRewrite);
    latestAfterAnalysis = await analyzeMerged(rewrittenInput, {
      modelSelection: modelSelection.semantic
    });

    const mergedVerdict = latestAfterAnalysis?.finalVerdict || latestAfterAnalysis?.verdict || "manual_review";
    const shouldRunCrossReview = attempt === maxAttempts || isAcceptedRewriteVerdict(mergedVerdict);

    latestAfterCrossReview = shouldRunCrossReview
      ? await crossReview({
          input: rewrittenInput,
          analysis: latestAfterAnalysis,
          modelSelection: modelSelection.crossReview
        })
      : null;

    const reviewVerdict =
      latestAfterCrossReview?.aggregate?.recommendedVerdict ||
      latestAfterCrossReview?.aggregate?.analysisVerdict ||
      mergedVerdict;
    const accepted = isAcceptedRewriteVerdict(mergedVerdict) && isAcceptedRewriteVerdict(reviewVerdict);

    if (accepted) {
      rounds.push({
        attempt,
        sourceInput,
        rewrite: latestRewrite,
        afterAnalysis: latestAfterAnalysis,
        afterCrossReview: latestAfterCrossReview,
        accepted: true,
        guidance: null
      });

      return {
        rewrite: latestRewrite,
        afterAnalysis: latestAfterAnalysis,
        afterCrossReview: latestAfterCrossReview,
        attempts: attempt,
        accepted: true,
        stopReason: "accepted",
        rounds
      };
    }

    const retryGuidance = buildRetryGuidance({
      attempt,
      afterAnalysis: latestAfterAnalysis,
      afterCrossReview: latestAfterCrossReview,
      mergedVerdict,
      reviewVerdict
    });

    rounds.push({
      attempt,
      sourceInput,
      rewrite: latestRewrite,
      afterAnalysis: latestAfterAnalysis,
      afterCrossReview: latestAfterCrossReview,
      accepted: false,
      guidance: retryGuidance
    });

    currentInput = rewrittenInput;
    currentAnalysis = {
      ...latestAfterAnalysis,
      retryGuidance,
      retryHistory: [...(Array.isArray(currentAnalysis?.retryHistory) ? currentAnalysis.retryHistory : []), retryGuidance]
    };
  }

  return {
    rewrite: latestRewrite,
    afterAnalysis: latestAfterAnalysis,
    afterCrossReview: latestAfterCrossReview,
    attempts: attempt,
    accepted: false,
    stopReason: "max_attempts_reached",
    rounds
  };
}

export function buildFalsePositivePayload({ analysis = null, analysisSnapshot: inputAnalysisSnapshot = null, ...input } = {}) {
  const now = new Date().toISOString();
  const analysisSnapshot = buildAnalysisSnapshot(analysis) || inputAnalysisSnapshot || null;
  const status = String(input.status || "platform_passed_pending").trim() || "platform_passed_pending";

  return {
    id: String(input.id || `fp-${Date.now()}`).trim(),
    createdAt: String(input.createdAt || now).trim(),
    updatedAt: now,
    status,
    observedAt: String(input.observedAt || "").trim(),
    observationWindowHours: Number(input.observationWindowHours) || 0,
    title: String(input.title || "").trim(),
    body: String(input.body || "").trim(),
    coverText: String(input.coverText || "").trim(),
    tags: uniqueStrings(input.tags),
    userNotes: String(input.userNotes || "").trim(),
    analysisSnapshot,
    falsePositiveAudit: buildFalsePositiveAudit({
      status,
      analysisSnapshot
    })
  };
}

async function recognizeScreenshotPayload(screenshot, { modelSelection = "auto" } = {}) {
  if (!screenshot?.dataUrl) {
    const error = new Error("请先上传一张可识别的截图。");
    error.statusCode = 400;
    throw error;
  }

  const meta = sanitizeScreenshotMeta(screenshot);
  const recognition = await recognizeFeedbackScreenshot({
    imageDataUrl: screenshot?.dataUrl,
    mimeType: meta?.type,
    fileName: meta?.name,
    modelSelection
  });

  return {
    screenshot: meta,
    recognition: sanitizeScreenshotRecognition(recognition)
  };
}

async function enrichFeedbackItems(items, { modelSelection = {} } = {}) {
  const enrichedItems = [];

  for (const item of items) {
    const screenshot = item?.screenshot;
    let recognition = sanitizeScreenshotRecognition(item?.screenshotRecognition);
    let feedbackModelSuggestion = sanitizeFeedbackModelSuggestion(item?.feedbackModelSuggestion);
    const noteContent = String(item?.noteContent || item?.body || "").trim();

    if (screenshot?.dataUrl && !recognition) {
      const extracted = await recognizeScreenshotPayload(screenshot, {
        modelSelection: modelSelection.feedbackScreenshot
      });
      recognition = extracted.recognition;
    }

    const mergedPlatformReason = item.platformReason || recognition?.platformReason || "";
    const analysis = noteContent
      ? await analyzePost({
          body: noteContent
        })
      : null;
    const analysisSnapshot = buildAnalysisSnapshot(analysis);
    const reviewAudit = buildReviewAudit({
      platformReason: mergedPlatformReason,
      analysisSnapshot
    });
    const shouldUseModelSuggestion =
      !feedbackModelSuggestion &&
      Boolean(noteContent || mergedPlatformReason || recognition?.summary || recognition?.extractedText);

    if (shouldUseModelSuggestion) {
      try {
        feedbackModelSuggestion = sanitizeFeedbackModelSuggestion(
          await suggestFeedbackCandidates({
            noteContent,
            platformReason: mergedPlatformReason,
            suspiciousPhrases: mergeSuspiciousPhrases(item.suspiciousPhrases, recognition?.suspiciousPhrases),
            screenshotRecognition: recognition,
            analysisSnapshot,
            reviewAudit,
            modelSelection: modelSelection.feedbackSuggestion
          })
        );
      } catch {}
    }

    enrichedItems.push({
      ...item,
      noteContent,
      screenshot: sanitizeScreenshotMeta(screenshot),
      screenshotRecognition: recognition,
      platformReason: mergedPlatformReason,
      suspiciousPhrases: mergeSuspiciousPhrases(item.suspiciousPhrases, recognition?.suspiciousPhrases),
      feedbackModelSuggestion,
      analysisSnapshot,
      reviewAudit
    });
  }

  return normalizeFeedbackItems(enrichedItems);
}

async function appendFeedbackAndQueue(payload, { modelSelection = {} } = {}) {
  const enrichedItems = await enrichFeedbackItems(Array.isArray(payload) ? payload : [payload], {
    modelSelection
  });
  const feedbackLog = await upsertFeedbackEntries(enrichedItems);
  const reviewQueue = await createReviewCandidates(feedbackLog, { reset: true });
  const sourceNoteIds = new Set(enrichedItems.map((item) => item.noteId));
  const derivedCandidates = reviewQueue.filter((item) => sourceNoteIds.has(item.sourceNoteId));
  const candidateSummary = derivedCandidates.reduce(
    (summary, item) => {
      if (item.match === "regex") {
        summary.contextCount += 1;
      } else {
        summary.exactCount += 1;
      }

      if (item.reviewAuditSignal === "rule_gap") {
        summary.ruleGapCount += 1;
      }

      return summary;
    },
    {
      total: derivedCandidates.length,
      exactCount: 0,
      contextCount: 0,
      ruleGapCount: 0,
      modelAssistCount: enrichedItems.filter((item) => item.feedbackModelSuggestion).length,
      modelLabels: [
        ...new Set(
          enrichedItems
            .map((item) => {
              const provider = String(item.feedbackModelSuggestion?.provider || "").trim();
              const model = String(item.feedbackModelSuggestion?.model || "").trim();
              return provider && model ? `${provider}/${model}` : model;
            })
            .filter(Boolean)
        )
      ]
    }
  );

  return {
    items: enrichedItems,
    reviewQueue,
    candidateSummary
  };
}

async function appendRewritePair(payload) {
  const before = payload?.before || {};
  const after = payload?.after || {};
  const [beforeAnalysis, afterAnalysis] = await Promise.all([
    buildMergedAnalysis(before),
    buildMergedAnalysis(after)
  ]);
  const record = buildRewritePairRecord({
    ...payload,
    before,
    after,
    beforeAnalysis,
    afterAnalysis
  });
  await appendRewritePairs([record]);

  return {
    record,
    beforeAnalysis,
    afterAnalysis
  };
}

async function handleRequest(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`);

  if (request.method === "GET") {
    const assetPath = resolveWebAsset(url.pathname);
    const contentType = assetPath ? getWebAssetContentType(assetPath) : null;

    if (assetPath && contentType) {
      return sendFile(response, assetPath, contentType);
    }
  }

  if (request.method === "GET" && url.pathname === "/api/summary") {
    const summary = await loadSummary();
    return sendJson(response, 200, summary);
  }

  if (request.method === "GET" && url.pathname === "/api/admin/data") {
    const data = await loadAdminData();
    return sendJson(response, 200, data);
  }

  if (request.method === "GET" && url.pathname === "/api/admin/false-positive-log") {
    const items = await loadFalsePositiveLog();
    return sendJson(response, 200, {
      ok: true,
      items
    });
  }

  if (request.method === "GET" && url.pathname === "/api/review-queue") {
    const queue = await loadReviewQueue();
    return sendJson(response, 200, queue);
  }

  if (request.method === "GET" && url.pathname === "/api/false-positive-log") {
    const items = await loadFalsePositiveLog();
    return sendJson(response, 200, {
      ok: true,
      items
    });
  }

  if (request.method === "GET" && url.pathname === "/api/success-samples") {
    const items = await loadSuccessSamples();
    return sendJson(response, 200, {
      ok: true,
      items
    });
  }

  if (request.method === "GET" && url.pathname === "/api/style-profile") {
    const profile = await loadStyleProfile();
    return sendJson(response, 200, {
      ok: true,
      profile
    });
  }

  if (request.method === "GET" && url.pathname === "/api/analyze-tag-options") {
    const options = await loadAnalyzeTagOptions();
    return sendJson(response, 200, {
      ok: true,
      options
    });
  }

  if (request.method === "GET" && url.pathname === "/api/model-options") {
    return sendJson(response, 200, {
      ok: true,
      ...buildModelSelectionOptionsPayload(),
      ...buildFeedbackModelSelectionOptionsPayload()
    });
  }

  if (request.method === "POST" && url.pathname === "/api/analyze") {
    const payload = await readBody(request);
    const modelSelection = normalizeModelSelectionState(payload?.modelSelection);
    const result = await buildMergedAnalysis(payload, {
      modelSelection: modelSelection.semantic
    });
    return sendJson(response, 200, result);
  }

  if (request.method === "POST" && url.pathname === "/api/rewrite") {
    const payload = await readBody(request);
    const modelSelection = normalizeModelSelectionState(payload?.modelSelection);
    const beforeAnalysis = await buildMergedAnalysis(payload, {
      modelSelection: modelSelection.semantic
    });
    const rewriteResult = await rewriteUntilAccepted({
      input: payload,
      beforeAnalysis,
      modelSelection,
      maxAttempts: 3
    });

    return sendJson(response, 200, {
      ok: true,
      analysis: beforeAnalysis,
      beforeAnalysis,
      afterAnalysis: rewriteResult.afterAnalysis,
      afterCrossReview: rewriteResult.afterCrossReview,
      rewrite: rewriteResult.rewrite,
      rounds: rewriteResult.rounds,
      rewriteAttempts: rewriteResult.attempts,
      rewriteAccepted: rewriteResult.accepted,
      rewriteStopReason: rewriteResult.stopReason
    });
  }

  if (request.method === "POST" && url.pathname === "/api/generate-note") {
    const payload = await readBody(request);
    const modelSelection = normalizeModelSelectionState(payload?.modelSelection);
    const [profileState, successSamples] = await Promise.all([loadStyleProfile(), loadSuccessSamples()]);
    const styleProfile = profileState?.current || null;
    const referenceSamples = successSamples
      .filter((item) => item.tier === "featured" || item.tier === "performed")
      .slice(-12);
    const generation = await generateNoteCandidates({
      mode: payload?.mode,
      brief: payload?.brief,
      draft: payload?.draft,
      styleProfile,
      referenceSamples,
      modelSelection: modelSelection.rewrite,
      generateJson: Array.isArray(payload?.mockCandidates)
        ? async () => ({ candidates: payload.mockCandidates, provider: "mock", model: "mock-generation" })
        : undefined
    });
    const scored = await scoreGenerationCandidates({
      candidates: generation.candidates,
      styleProfile,
      brief: payload?.brief,
      modelSelection
    });

    return sendJson(response, 200, {
      ok: true,
      ...generation,
      ...scored
    });
  }

  if (request.method === "POST" && url.pathname === "/api/cross-review") {
    const payload = await readBody(request);
    const modelSelection = normalizeModelSelectionState(payload?.modelSelection);
    const analysis = await analyzePost(payload);
    const review = await runCrossModelReview({
      input: payload,
      analysis,
      modelSelection: modelSelection.crossReview
    });

    return sendJson(response, 200, {
      ok: true,
      analysis,
      review
    });
  }

  if (request.method === "POST" && url.pathname === "/api/feedback/extract-screenshot") {
    const payload = await readBody(request);
    const modelSelection = normalizeFeedbackModelSelectionState(payload?.modelSelection);
    const extracted = await recognizeScreenshotPayload(payload?.screenshot, {
      modelSelection: modelSelection.feedbackScreenshot
    });
    return sendJson(response, 200, {
      ok: true,
      screenshot: extracted.screenshot,
      recognition: extracted.recognition
    });
  }

  if (request.method === "POST" && url.pathname === "/api/feedback") {
    const payload = await readBody(request);
    const modelSelection = normalizeFeedbackModelSelectionState(payload?.modelSelection);
    const result = await appendFeedbackAndQueue(payload, {
      modelSelection
    });
    return sendJson(response, 200, {
      ok: true,
      reviewQueueCount: result.reviewQueue.length,
      imported: result.items.length,
      recognizedFromScreenshot: result.items.filter((item) => item.screenshotRecognition).length,
      candidateSummary: result.candidateSummary
    });
  }

  if (request.method === "POST" && url.pathname === "/api/false-positive-log") {
    const payload = await readBody(request);
    const current = await loadFalsePositiveLog();
    const nextEntry = buildFalsePositivePayload(payload);
    const sameNoteIndex = current.findIndex((item) => isSameFeedbackNote(item, nextEntry));
    const duplicate = current.some((item) => String(item.id || "").trim() === nextEntry.id);

    if (sameNoteIndex >= 0) {
      const existing = current[sameNoteIndex];
      const mergedEntry = buildFalsePositivePayload({
        ...existing,
        ...payload,
        id: existing.id,
        createdAt: existing.createdAt,
        analysisSnapshot: payload.analysis || payload.analysisSnapshot ? undefined : existing.analysisSnapshot
      });
      const next = current.map((item, index) => (index === sameNoteIndex ? mergedEntry : item));
      await saveFalsePositiveLog(next);
      await createWhitelistCandidatesFromFalsePositive(mergedEntry);
      return sendJson(response, 200, {
        ok: true,
        items: next
      });
    }

    if (duplicate) {
      const error = new Error("误报样本 ID 已存在。");
      error.statusCode = 409;
      throw error;
    }

    const next = [...current, nextEntry];
    await saveFalsePositiveLog(next);
    await createWhitelistCandidatesFromFalsePositive(nextEntry);
    return sendJson(response, 200, {
      ok: true,
      items: next
    });
  }

  if (request.method === "POST" && url.pathname === "/api/success-samples") {
    const payload = await readBody(request);
    const current = await loadSuccessSamples();
    const nextRecord = buildSuccessSampleRecord(payload);
    const next = upsertSuccessSampleRecords(current, [nextRecord]);
    await saveSuccessSamples(next);
    return sendJson(response, 200, {
      ok: true,
      item: next[next.length - 1],
      items: next
    });
  }

  if (request.method === "POST" && url.pathname === "/api/style-profile/draft") {
    const samples = await loadSuccessSamples();
    const current = await loadStyleProfile();
    const draft = buildStyleProfileDraft(samples);
    const profile = {
      ...current,
      draft
    };
    await saveStyleProfile(profile);
    return sendJson(response, 200, {
      ok: true,
      profile,
      draft
    });
  }

  if (request.method === "PATCH" && url.pathname === "/api/false-positive-log") {
    const payload = await readBody(request);
    const current = await loadFalsePositiveLog();
    const index = current.findIndex((item) => String(item.id || "").trim() === String(payload?.id || "").trim());

    if (index === -1) {
      const error = new Error("未找到对应的误报样本。");
      error.statusCode = 404;
      throw error;
    }

    let updated = false;
    const next = current.map((item) => {
      const matches = !updated && String(item.id || "").trim() === String(payload.id || "").trim();

      if (!matches) {
        return item;
      }

      updated = true;
      return buildFalsePositivePayload({
        ...item,
        ...payload,
        createdAt: item.createdAt,
        analysisSnapshot: payload.analysisSnapshot || item.analysisSnapshot
      });
    });
    await saveFalsePositiveLog(next);
    await createWhitelistCandidatesFromFalsePositive(next[index]);
    return sendJson(response, 200, {
      ok: true,
      items: next
    });
  }

  if (request.method === "PATCH" && url.pathname === "/api/style-profile") {
    const payload = await readBody(request);
    const current = await loadStyleProfile();
    const profile = confirmStyleProfileDraft(current, payload?.profile || payload || {});
    await saveStyleProfile(profile);
    return sendJson(response, 200, {
      ok: true,
      profile
    });
  }

  if (request.method === "PATCH" && url.pathname === "/api/admin/false-positive-log") {
    const payload = await readBody(request);
    const updated = await confirmFalsePositiveLogEntry(payload?.id, payload?.userNotes);
    const items = await loadFalsePositiveLog();

    return sendJson(response, 200, {
      ok: true,
      item: updated,
      items
    });
  }

  if (request.method === "DELETE" && url.pathname === "/api/admin/false-positive-log") {
    const payload = await readBody(request);
    await deleteFalsePositiveLogEntry(payload?.id);
    const items = await loadFalsePositiveLog();

    return sendJson(response, 200, {
      ok: true,
      items
    });
  }

  if (request.method === "POST" && url.pathname === "/api/rewrite-pairs") {
    const payload = await readBody(request);
    const result = await appendRewritePair(payload);
    return sendJson(response, 200, {
      ok: true,
      record: result.record,
      beforeAnalysis: result.beforeAnalysis,
      afterAnalysis: result.afterAnalysis
    });
  }

  if (request.method === "POST" && url.pathname === "/api/analyze-tag-options") {
    const payload = await readBody(request);
    const options = sanitizeAnalyzeTagOptions(payload?.options);
    await saveAnalyzeTagOptions(options);

    return sendJson(response, 200, {
      ok: true,
      options
    });
  }

  if (request.method === "POST" && url.pathname === "/api/admin/lexicon") {
    const payload = await readBody(request);
    const entry = await addLexiconEntry(payload.scope, payload.entry);
    return sendJson(response, 200, { ok: true, entry });
  }

  if (request.method === "DELETE" && url.pathname === "/api/admin/lexicon") {
    const payload = await readBody(request);
    await deleteLexiconEntry(payload.scope, payload.id);
    return sendJson(response, 200, { ok: true });
  }

  if (request.method === "DELETE" && url.pathname === "/api/admin/feedback") {
    const payload = await readBody(request);
    await deleteFeedbackEntry(payload.noteId, payload.createdAt);
    return sendJson(response, 200, { ok: true });
  }

  if (request.method === "DELETE" && url.pathname === "/api/admin/rewrite-pairs") {
    const payload = await readBody(request);
    await deleteRewritePairEntry(payload.id, payload.createdAt);
    return sendJson(response, 200, { ok: true });
  }

  if (request.method === "DELETE" && url.pathname === "/api/admin/review-queue") {
    const payload = await readBody(request);
    await deleteReviewQueueItem(payload.id);
    return sendJson(response, 200, { ok: true });
  }

  if (request.method === "DELETE" && url.pathname === "/api/success-samples") {
    const payload = await readBody(request);
    const current = await loadSuccessSamples();
    const next = current.filter((item) => String(item.id || "").trim() !== String(payload?.id || "").trim());

    if (next.length === current.length) {
      const error = new Error("未找到要删除的成功样本。");
      error.statusCode = 404;
      throw error;
    }

    await saveSuccessSamples(next);
    return sendJson(response, 200, {
      ok: true,
      items: next
    });
  }

  if (request.method === "POST" && url.pathname === "/api/admin/review-queue/promote") {
    const payload = await readBody(request);
    const entry = await promoteReviewQueueItem(payload.id);
    return sendJson(response, 200, { ok: true, entry, item: entry });
  }

  response.writeHead(404);
  response.end("Not found");
}

const server = http.createServer(withErrorHandling(handleRequest));

const isDirectExecution = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectExecution) {
  server.listen(port, host, () => {
    console.log(`Server running at http://${host}:${port}`);
  });
}

export { server };
export { handleRequest };
