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
  loadCollectionTypes,
  loadFalsePositiveLog,
  loadNoteLifecycle,
  loadNoteRecords,
  loadReviewBenchmarkSamples,
  loadReviewQueue,
  loadSummary,
  loadStyleProfile,
  loadSuccessSamples,
  saveAnalyzeTagOptions,
  saveCollectionTypes,
  saveFalsePositiveLog,
  saveNoteLifecycle,
  saveNoteRecords,
  saveReviewBenchmarkSamples,
  saveStyleProfile,
  saveSuccessSamples,
  upsertFeedbackEntries
} from "./data-store.js";
import { assertValidCollectionType, buildCollectionTypeOptions, normalizeCollectionType } from "./collection-types.js";
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
import { generateNoteCandidates, repairGenerationCandidate, scoreGenerationCandidates } from "./generation-workbench.js";
import { recognizeFeedbackScreenshot, rewritePostForCompliance, suggestFeedbackCandidates } from "./glm.js";
import { buildRewritePairRecord } from "./rewrite-pairs.js";
import {
  choosePreferredReviewBenchmarkSource,
  findMatchingReviewBenchmarkSample,
  normalizeReviewBenchmarkSource,
  normalizeReviewBenchmarkSample
} from "./review-benchmark.js";
import { mergeRuleAndSemanticAnalysis, runSemanticReview } from "./semantic-review.js";
import {
  buildStyleProfileDraft,
  confirmStyleProfileDraft,
  getActiveStyleProfile,
  setActiveStyleProfileVersion,
  updateStyleProfileDraft
} from "./style-profile.js";
import { createSampleLibraryRecord, findSampleLibraryRecord, patchSampleLibraryRecord } from "./sample-library.js";
import { buildSuccessSampleRecord, isSameSuccessSample, upsertSuccessSampleRecords } from "./success-samples.js";
import { buildLifecycleRecord, updateLifecyclePublishResult, upsertLifecycleRecords } from "./note-lifecycle.js";
import { rankSamplesByWeight, withSampleWeight } from "./sample-weight.js";
import { buildModelPerformanceSummary } from "./model-performance.js";
import { paths, webDir } from "./config.js";
import { runReviewBenchmarkHarness } from "./evals/review-benchmark-harness.js";

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

async function sendItemsResponse(response, loader) {
  const items = await loader();
  return sendJson(response, 200, {
    ok: true,
    items
  });
}

async function deleteItemsById(request, response, { loader, saver, notFoundMessage }) {
  const payload = await readBody(request);
  const current = await loader();
  const id = String(payload?.id || "").trim();
  const next = current.filter((item) => String(item.id || "").trim() !== id);

  if (next.length === current.length) {
    const error = new Error(notFoundMessage);
    error.statusCode = 404;
    throw error;
  }

  await saver(next);
  return sendItemsResponse(response, loader);
}

export function lifecycleRecordToReferenceSample(item = {}) {
  const status = String(item.status || item.publishResult?.status || "").trim();

  if (!["published_passed", "positive_performance"].includes(status)) {
    return null;
  }

  const note = item.note || {};

  return withSampleWeight({
    id: item.id ? `lifecycle-${item.id}` : "",
    status,
    publishResult: item.publishResult || {},
    tier: status === "positive_performance" ? "performed" : "passed",
    title: note.title,
    body: note.body,
    coverText: note.coverText,
    tags: note.tags,
    source: item.source || "note_lifecycle",
    lifecycleSource: item.source || "",
    metrics: item.publishResult?.metrics || {},
    createdAt: item.createdAt,
    updatedAt: item.updatedAt
  }, "lifecycle");
}

export function buildGenerationReferenceSamples({ successSamples = [], noteLifecycle = [] } = {}) {
  return rankSamplesByWeight(
    [
      ...successSamples,
      ...noteLifecycle.map(lifecycleRecordToReferenceSample).filter(Boolean)
    ],
    "auto"
  );
}

function uniqueStrings(items = []) {
  return [...new Set((Array.isArray(items) ? items : [items]).map((item) => String(item || "").trim()).filter(Boolean))];
}

async function loadAvailableCollectionTypes() {
  const stored = await loadCollectionTypes();
  return buildCollectionTypeOptions(stored.custom);
}

async function normalizeSampleLibraryPayloadCollectionType(payload = {}) {
  const note = payload?.note;

  if (!note || typeof note !== "object" || !Object.prototype.hasOwnProperty.call(note, "collectionType")) {
    return payload;
  }

  const options = await loadAvailableCollectionTypes();
  return {
    ...payload,
    note: {
      ...note,
      collectionType: assertValidCollectionType(note.collectionType, options)
    }
  };
}

function normalizeComparableText(value = "") {
  return String(value || "").trim();
}

function isSameLifecycleItem(left = {}, right = {}) {
  const leftId = normalizeComparableText(left.id);
  const rightId = normalizeComparableText(right.id);

  if (leftId && rightId && leftId === rightId) {
    return true;
  }

  const leftNote = left.note || left;
  const rightNote = right.note || right;
  const leftTitle = normalizeComparableText(leftNote.title);
  const rightTitle = normalizeComparableText(rightNote.title);
  const leftBody = normalizeComparableText(leftNote.body);
  const rightBody = normalizeComparableText(rightNote.body);
  const leftCoverText = normalizeComparableText(leftNote.coverText);
  const rightCoverText = normalizeComparableText(rightNote.coverText);

  if (leftTitle || rightTitle || leftBody || rightBody) {
    return leftTitle === rightTitle && leftBody === rightBody && leftCoverText === rightCoverText;
  }

  return Boolean(leftCoverText && rightCoverText && leftCoverText === rightCoverText);
}

function parseBenchmarkTags(tags = []) {
  if (Array.isArray(tags)) {
    return uniqueStrings(tags);
  }

  return uniqueStrings(String(tags || "").split(/[,\n]/));
}

function buildReviewBenchmarkSamplePayload(payload = {}) {
  return {
    expectedType: String(payload.expectedType || "").trim(),
    source: normalizeReviewBenchmarkSource(payload.source),
    input: {
      title: String(payload.title || "").trim(),
      body: String(payload.body || "").trim(),
      coverText: String(payload.coverText || "").trim(),
      collectionType: String(payload.collectionType || "").trim(),
      tags: parseBenchmarkTags(payload.tags)
    }
  };
}

function isAllowedBenchmarkExpectedType(value = "") {
  return [
    "violation",
    "false_positive",
    "success",
    "违规样本",
    "误报样本",
    "正常样本",
    "成功样本",
    "正常通过样本"
  ].includes(String(value || "").trim());
}

function assertReviewBenchmarkSamplePayload(payload = {}, options = {}) {
  if (!payload?.input?.title) {
    const error = new Error("基准样本标题不能为空。");
    error.statusCode = 400;
    throw error;
  }

  if (!payload?.input?.body) {
    const error = new Error("基准样本正文不能为空。");
    error.statusCode = 400;
    throw error;
  }

  if (!isAllowedBenchmarkExpectedType(payload.expectedType)) {
    const error = new Error("基准样本预期类型无效，请选择违规样本、误报样本或正常通过样本。");
    error.statusCode = 400;
    throw error;
  }

  if (options.sourceProvided && payload.source === null) {
    const error = new Error("基准样本来源无效，请使用手动录入、样本库或误报日志。");
    error.statusCode = 400;
    throw error;
  }
}

function assertRunnableReviewBenchmarkSamples(items = []) {
  const invalidItem = (Array.isArray(items) ? items : []).find(
    (item) => !["violation", "false_positive", "success"].includes(String(item?.expectedType || "").trim())
  );

  if (!invalidItem) {
    return;
  }

  const error = new Error(
    `存在预期类型无效的基准样本：${String(invalidItem.id || invalidItem?.input?.title || "未命名样本").trim() || "未命名样本"}`
  );
  error.statusCode = 400;
  throw error;
}

let reviewBenchmarkHarnessRunner = runReviewBenchmarkHarness;

export function setReviewBenchmarkHarnessRunnerForTests(runner) {
  const previous = reviewBenchmarkHarnessRunner;
  reviewBenchmarkHarnessRunner = typeof runner === "function" ? runner : runReviewBenchmarkHarness;
  return previous;
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
    source: String(input.source || "").trim(),
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
    return sendItemsResponse(response, loadSuccessSamples);
  }

  if (request.method === "GET" && url.pathname === "/api/review-benchmark") {
    const items = await loadReviewBenchmarkSamples();
    return sendJson(response, 200, {
      ok: true,
      items
    });
  }

  if (request.method === "GET" && url.pathname === "/api/note-lifecycle") {
    return sendItemsResponse(response, loadNoteLifecycle);
  }

  if (request.method === "GET" && url.pathname === "/api/sample-library") {
    return sendItemsResponse(response, loadNoteRecords);
  }

  if (request.method === "GET" && url.pathname === "/api/collection-types") {
    return sendJson(response, 200, {
      ok: true,
      options: await loadAvailableCollectionTypes()
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

  if (request.method === "GET" && url.pathname === "/api/model-performance") {
    const summary = await buildModelPerformanceSummary();
    return sendJson(response, 200, {
      ok: true,
      summary
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
    const collectionOptions = await loadAvailableCollectionTypes();
    const collectionType = assertValidCollectionType(payload?.collectionType || payload?.brief?.collectionType, collectionOptions);
    const brief = {
      ...(payload?.brief && typeof payload.brief === "object" ? payload.brief : {}),
      collectionType
    };
    const [profileState, successSamples, noteLifecycle] = await Promise.all([loadStyleProfile(), loadSuccessSamples(), loadNoteLifecycle()]);
    const styleProfile = getActiveStyleProfile(profileState, payload?.styleProfileId);
    const referenceSamples = buildGenerationReferenceSamples({ successSamples, noteLifecycle }).slice(0, 12);
    const generation = await generateNoteCandidates({
      mode: payload?.mode,
      brief,
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
      modelSelection,
      repairCandidate: repairGenerationCandidate
    });

    return sendJson(response, 200, {
      ok: true,
      collectionType,
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
    const items = await loadSuccessSamples();
    const item = items.find((entry) => isSameSuccessSample(entry, nextRecord)) || items[items.length - 1] || null;
    return sendJson(response, 200, {
      ok: true,
      item,
      items
    });
  }

  if (request.method === "POST" && url.pathname === "/api/note-lifecycle") {
    const payload = await readBody(request);
    const current = await loadNoteLifecycle();
    const nextRecord = buildLifecycleRecord(payload);
    const next = upsertLifecycleRecords(current, [nextRecord]);
    await saveNoteLifecycle(next);
    const items = await loadNoteLifecycle();
    const item = items.find((entry) => isSameLifecycleItem(entry, nextRecord)) || items[items.length - 1] || null;
    return sendJson(response, 200, {
      ok: true,
      item,
      items
    });
  }

  if (request.method === "POST" && url.pathname === "/api/sample-library") {
    const payload = await normalizeSampleLibraryPayloadCollectionType(await readBody(request));
    const nextRecord = createSampleLibraryRecord(payload);
    const items = await saveNoteRecords([...(await loadNoteRecords()), nextRecord]);
    const item = findSampleLibraryRecord(items, nextRecord) || items[items.length - 1] || null;
    return sendJson(response, 200, {
      ok: true,
      item,
      items
    });
  }

  if (request.method === "POST" && url.pathname === "/api/review-benchmark") {
    const rawPayload = await readBody(request);
    const payload = buildReviewBenchmarkSamplePayload(rawPayload);
    if (Object.prototype.hasOwnProperty.call(rawPayload || {}, "collectionType")) {
      payload.input.collectionType = assertValidCollectionType(rawPayload?.collectionType, await loadAvailableCollectionTypes());
    }
    assertReviewBenchmarkSamplePayload(payload, { sourceProvided: rawPayload?.source !== undefined });
    const current = await loadReviewBenchmarkSamples();
    const duplicate = findMatchingReviewBenchmarkSample(current, payload);

    if (duplicate) {
      const merged = normalizeReviewBenchmarkSample({
        ...duplicate,
        source: choosePreferredReviewBenchmarkSource(duplicate.source, payload.source),
        updatedAt: new Date().toISOString()
      });
      const next = current.map((item) => (item.id === duplicate.id ? merged : item));
      await saveReviewBenchmarkSamples(next);
      const items = await loadReviewBenchmarkSamples();
      const item = items.find((entry) => entry.id === merged.id) || merged;
      return sendJson(response, 200, {
        ok: true,
        duplicate: true,
        item,
        items
      });
    }

    const next = [...current, payload];
    await saveReviewBenchmarkSamples(next);
    const items = await loadReviewBenchmarkSamples();
    return sendJson(response, 200, {
      ok: true,
      duplicate: false,
      item: items[items.length - 1] || null,
      items
    });
  }

  if (request.method === "POST" && url.pathname === "/api/collection-types") {
    const payload = await readBody(request);
    const current = await loadCollectionTypes();
    const nextName = normalizeCollectionType(payload?.name);

    if (!nextName) {
      const error = new Error("合集类型名称不能为空。");
      error.statusCode = 400;
      throw error;
    }

    const nextCustom = uniqueStrings([...current.custom, nextName]);
    await saveCollectionTypes({ custom: nextCustom });

    return sendJson(response, 200, {
      ok: true,
      options: buildCollectionTypeOptions(nextCustom)
    });
  }

  if (request.method === "POST" && url.pathname === "/api/review-benchmark/run") {
    const samples = await loadReviewBenchmarkSamples();
    assertRunnableReviewBenchmarkSamples(samples);
    const result = await reviewBenchmarkHarnessRunner({
      filePath: paths.reviewBenchmark,
      samples
    });
    return sendJson(response, 200, result);
  }

  if (request.method === "POST" && url.pathname === "/api/style-profile/draft") {
    const payload = await readBody(request);
    const samples = await loadSuccessSamples();
    const current = await loadStyleProfile();
    const draft = buildStyleProfileDraft(samples, {
      topic: payload?.topic,
      name: payload?.name
    });
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
    const profile =
      payload?.action === "activate"
        ? setActiveStyleProfileVersion(current, payload?.id)
        : payload?.action === "update-draft"
          ? updateStyleProfileDraft(current, payload?.profile || payload || {})
        : confirmStyleProfileDraft(current, payload?.profile || payload || {});
    await saveStyleProfile(profile);
    return sendJson(response, 200, {
      ok: true,
      profile
    });
  }

  if (request.method === "PATCH" && url.pathname === "/api/note-lifecycle") {
    const payload = await readBody(request);
    const current = await loadNoteLifecycle();
    const id = String(payload?.id || "").trim();
    const index = current.findIndex((item) => String(item.id || "").trim() === id);

    if (index === -1) {
      const error = new Error("未找到要更新的笔记生命周期记录。");
      error.statusCode = 404;
      throw error;
    }

    const next = [...current];
    next[index] = updateLifecyclePublishResult(current[index], payload);
    await saveNoteLifecycle(next);
    const items = await loadNoteLifecycle();
    const item = items.find((entry) => String(entry.id || "").trim() === id) || items.find((entry) => isSameLifecycleItem(entry, next[index])) || null;
    return sendJson(response, 200, {
      ok: true,
      item,
      items
    });
  }

  if (request.method === "PATCH" && url.pathname === "/api/sample-library") {
    const payload = await normalizeSampleLibraryPayloadCollectionType(await readBody(request));
    const id = String(payload?.id || "").trim();
    const current = await loadNoteRecords();
    const index = current.findIndex((item) => String(item.id || "").trim() === id);

    if (index === -1) {
      const error = new Error("未找到要更新的样本库记录。");
      error.statusCode = 404;
      throw error;
    }

    const next = [...current];
    next[index] = patchSampleLibraryRecord(current[index], payload);
    const items = await saveNoteRecords(next);
    const item = findSampleLibraryRecord(items, next[index]) || null;
    return sendJson(response, 200, {
      ok: true,
      item,
      items
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
    return deleteItemsById(request, response, {
      loader: loadSuccessSamples,
      saver: saveSuccessSamples,
      notFoundMessage: "未找到要删除的成功样本。"
    });
  }

  if (request.method === "DELETE" && url.pathname === "/api/review-benchmark") {
    const payload = await readBody(request);
    const current = await loadReviewBenchmarkSamples();
    const next = current.filter((item) => String(item.id || "").trim() !== String(payload?.id || "").trim());

    if (next.length === current.length) {
      const error = new Error("未找到要删除的基准样本。");
      error.statusCode = 404;
      throw error;
    }

    await saveReviewBenchmarkSamples(next);
    return sendJson(response, 200, {
      ok: true,
      items: next
    });
  }

  if (request.method === "DELETE" && url.pathname === "/api/note-lifecycle") {
    return deleteItemsById(request, response, {
      loader: loadNoteLifecycle,
      saver: saveNoteLifecycle,
      notFoundMessage: "未找到要删除的笔记生命周期记录。"
    });
  }

  if (request.method === "DELETE" && url.pathname === "/api/sample-library") {
    return deleteItemsById(request, response, {
      loader: loadNoteRecords,
      saver: saveNoteRecords,
      notFoundMessage: "未找到要删除的样本库记录。"
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

const safeHandleRequest = withErrorHandling(handleRequest);
const server = http.createServer(safeHandleRequest);

const isDirectExecution = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectExecution) {
  server.listen(port, host, () => {
    console.log(`Server running at http://${host}:${port}`);
  });
}

export { server };
export { handleRequest };
export { safeHandleRequest };
