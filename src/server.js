import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  addLexiconEntry,
  addInnerSpaceTerm,
  confirmFalsePositiveLogEntry,
  createWhitelistCandidatesFromFalsePositive,
  deleteFeedbackEntry,
  deleteFalsePositiveLogEntry,
  deleteInnerSpaceTerm,
  deleteLexiconEntry,
  deleteReviewQueueItem,
  loadAdminData,
  promoteReviewQueueItem
} from "./admin.js";
import { analyzePost } from "./analyzer.js";
import {
  loadCollectionTypes,
  loadFalsePositiveLog,
  getMemoryRetrievalService,
  loadInnerSpaceTerms,
  loadNoteLifecycle,
  loadNoteRecords,
  loadQualifiedReferenceSamples,
  loadReviewQueue,
  loadSummary,
  loadStyleProfile,
  loadSuccessSamples,
  saveFalsePositiveLog,
  saveNoteRecords,
  saveStyleProfile,
  upsertFeedbackEntries
} from "./data-store.js";
import { assertValidCollectionType, buildCollectionTypeOptions } from "./collection-types.js";
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
import { mergeRuleAndSemanticAnalysis, runSemanticReview } from "./semantic-review.js";
import { filterInnerSpaceTerms } from "./inner-space-terms.js";
import {
  buildAutoStyleProfileState,
  getActiveStyleProfile,
} from "./style-profile.js";
import { normalizePdfImportCommitItem, parsePdfImportFiles } from "./pdf-sample-import.js";
import {
  buildSampleLibraryImportDuplicateKey,
  buildSampleLibraryImportPayload,
  createSampleLibraryRecord,
  findSampleLibraryRecord,
  patchSampleLibraryRecord
} from "./sample-library.js";
import { replayCalibratedSamples } from "./calibration-replay.js";
import { filterQualifiedReferenceSamples } from "./reference-samples.js";
import { rankSamplesByWeight, withSampleWeight } from "./sample-weight.js";
import { paths, webDir } from "./config.js";
import { createRuntimeCache } from "./runtime-cache.js";

const host = "127.0.0.1";
const port = 3030;
const webRoot = path.resolve(webDir);
const readCache = createRuntimeCache();
const writeInvalidationTags = ["summary", "admin-data", "sample-library"];
let styleProfileRefreshPromise = null;

function invalidateReadCaches(tags = []) {
  tags.forEach((tag) => readCache.invalidateTag(tag));
}

function invalidateWriteReadCaches() {
  invalidateReadCaches(writeInvalidationTags);
}

async function loadCurrentStyleProfileView() {
  return loadStyleProfile();
}

async function buildAdminDataView() {
  const data = await loadAdminData();
  const styleProfile = await loadCurrentStyleProfileView();
  return {
    ...data,
    styleProfile
  };
}

function scheduleStyleProfileRefresh(reason = "") {
  void reason;

  if (!styleProfileRefreshPromise) {
    styleProfileRefreshPromise = (async () => {
      try {
        await refreshAutoStyleProfile();
        invalidateReadCaches(["admin-data"]);
      } catch (error) {
        console.warn("Failed to refresh style profile in background", error);
      } finally {
        styleProfileRefreshPromise = null;
      }
    })();
  }

  return styleProfileRefreshPromise;
}

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

async function persistSampleLibraryRecord(payload = {}) {
  const normalizedPayload = await normalizeSampleLibraryPayloadCollectionType(payload);
  const nextRecord = createSampleLibraryRecord(normalizedPayload);
  const items = await saveNoteRecords([...(await loadNoteRecords()), nextRecord]);
  invalidateWriteReadCaches();
  const item = findSampleLibraryRecord(items, nextRecord) || items[items.length - 1] || null;
  const shouldRefreshStyleProfile = item?.reference?.enabled === true;
  let styleProfile;
  if (shouldRefreshStyleProfile) {
    styleProfile = await loadCurrentStyleProfileView();
    scheduleStyleProfileRefresh("sample-library-reference-mutation");
  }

  return {
    item,
    items,
    styleProfile,
    styleProfileRefreshQueued: shouldRefreshStyleProfile ? true : undefined
  };
}

async function patchSampleLibraryRecordAndReturn(payload = {}) {
  const normalizedPayload = await normalizeSampleLibraryPayloadCollectionType(payload);
  const id = String(normalizedPayload?.id || "").trim();
  const current = await loadNoteRecords();
  const index = current.findIndex((item) => String(item.id || "").trim() === id);

  if (index === -1) {
    const error = new Error("未找到要更新的样本库记录。");
    error.statusCode = 404;
    throw error;
  }

  const next = [...current];
  next[index] = patchSampleLibraryRecord(current[index], normalizedPayload);
  const items = await saveNoteRecords(next);
  invalidateWriteReadCaches();
  const item = findSampleLibraryRecord(items, next[index]) || null;
  const referenceChanged =
    Object.prototype.hasOwnProperty.call(normalizedPayload || {}, "reference") ||
    (normalizedPayload?.publish && (item?.reference?.enabled === true || current[index]?.reference?.enabled === true));
  let styleProfile;
  if (referenceChanged) {
    styleProfile = await loadCurrentStyleProfileView();
    scheduleStyleProfileRefresh("sample-library-reference-mutation");
  }

  return {
    item,
    items,
    styleProfile,
    styleProfileRefreshQueued: referenceChanged ? true : undefined
  };
}

async function deleteSampleLibraryRecordAndReturn(id) {
  const targetId = String(id || "").trim();
  const current = await loadNoteRecords();
  const removed = current.find((item) => String(item.id || "").trim() === targetId) || null;
  const next = current.filter((item) => String(item.id || "").trim() !== targetId);

  if (next.length === current.length) {
    const error = new Error("未找到要删除的样本库记录。");
    error.statusCode = 404;
    throw error;
  }

  await saveNoteRecords(next);
  invalidateWriteReadCaches();
  let styleProfile;
  if (removed?.reference?.enabled === true) {
    styleProfile = await loadCurrentStyleProfileView();
    scheduleStyleProfileRefresh("sample-library-reference-mutation");
  }

  return {
    items: next,
    styleProfile,
    styleProfileRefreshQueued: removed?.reference?.enabled === true ? true : undefined
  };
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
  return rankSamplesByWeight(filterQualifiedReferenceSamples(successSamples), "success");
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

async function validatePdfImportCommitItems(items = []) {
  const selectedItems = (Array.isArray(items) ? items : []).filter((item) => item?.selected === true);
  const validatedPayloads = [];
  const currentRecords = await loadNoteRecords();
  const existingDuplicateKeys = new Set(
    currentRecords.map((record) =>
      buildSampleLibraryImportDuplicateKey({
        title: record?.note?.title,
        body: record?.note?.body,
        coverText: record?.note?.coverText
      })
    )
  );
  const batchDuplicateKeys = new Set();

  for (const [index, item] of selectedItems.entries()) {
    const normalized = normalizePdfImportCommitItem(item);

    if (!normalized.title || !normalized.body || !normalized.collectionType) {
      const error = new Error(`第 ${index + 1} 条已勾选导入项缺少标题、正文或合集类型。`);
      error.statusCode = 400;
      throw error;
    }

    const duplicateKey = buildSampleLibraryImportDuplicateKey(normalized);

    if (existingDuplicateKeys.has(duplicateKey)) {
      const error = new Error(`第 ${index + 1} 条已勾选导入项与已有学习样本重复。`);
      error.statusCode = 409;
      throw error;
    }

    if (batchDuplicateKeys.has(duplicateKey)) {
      const error = new Error(`第 ${index + 1} 条已勾选导入项与本批其他导入项重复。`);
      error.statusCode = 409;
      throw error;
    }

    batchDuplicateKeys.add(duplicateKey);

    const importPayload = buildSampleLibraryImportPayload(normalized);

    try {
      validatedPayloads.push(await normalizeSampleLibraryPayloadCollectionType(importPayload));
    } catch (error) {
      if (Number(error?.statusCode) === 400) {
        const collectionError = new Error(`第 ${index + 1} 条已勾选导入项的合集类型无效或未选择。`);
        collectionError.statusCode = 400;
        throw collectionError;
      }

      throw error;
    }
  }

  return validatedPayloads;
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

async function refreshAutoStyleProfile({ topic = "", name = "" } = {}) {
  const [currentProfile, successSamples] = await Promise.all([loadStyleProfile(), loadSuccessSamples()]);

  if (!successSamples.length) {
    return currentProfile;
  }

  const currentTopic = String(currentProfile?.current?.topic || "").trim();
  const currentName = String(currentProfile?.current?.name || "").trim();
  const nextProfile = buildAutoStyleProfileState(currentProfile, successSamples, {
    topic: String(topic || "").trim() || currentTopic,
    name: String(name || "").trim() || currentName
  });

  await saveStyleProfile(nextProfile);
  return nextProfile;
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

function buildEmptySharedMemoryContext(queryKind = "") {
  return {
    riskFeedback: [],
    falsePositiveHints: [],
    referenceSamples: [],
    memoryCards: [],
    retrievalMeta: {
      queryKind,
      embeddingVersion: "",
      candidateCount: 0
    }
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
  memoryContext = beforeAnalysis?.memoryContext || null,
  modelSelection = {},
  maxAttempts = 3,
  innerSpaceTerms = [],
  rewritePost = rewritePostForCompliance,
  analyzeMerged = buildMergedAnalysis,
  crossReview = runCrossModelReview
} = {}) {
  let attempt = 0;
  let currentInput = { ...input };
  let currentAnalysis = memoryContext ? { ...beforeAnalysis, memoryContext } : beforeAnalysis;
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
      modelSelection: modelSelection.rewrite,
      innerSpaceTerms
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
      memoryContext: currentAnalysis?.memoryContext || memoryContext,
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
  let dirty = false;

  try {
    const feedbackLog = await upsertFeedbackEntries(enrichedItems);
    dirty = true;
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
  } finally {
    if (dirty) {
      invalidateWriteReadCaches();
    }
  }
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
    const summary = await readCache.getOrLoad("summary", loadSummary, { ttlMs: 5000, tags: ["summary"] });
    return sendJson(response, 200, summary);
  }

  if (request.method === "GET" && url.pathname === "/api/admin/data") {
    const data = await readCache.getOrLoad("admin-data", buildAdminDataView, { ttlMs: 10000, tags: ["admin-data"] });
    return sendJson(response, 200, data);
  }

  if (request.method === "GET" && url.pathname === "/api/admin/style-profile") {
    const styleProfile = await loadCurrentStyleProfileView();
    return sendJson(response, 200, {
      ok: true,
      styleProfile
    });
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

  if (request.method === "GET" && url.pathname === "/api/sample-library") {
    return sendItemsResponse(response, () =>
      readCache.getOrLoad("sample-library", loadNoteRecords, { ttlMs: 10000, tags: ["sample-library"] })
    );
  }

  if (request.method === "GET" && url.pathname === "/api/collection-types") {
    return sendJson(response, 200, {
      ok: true,
      options: await loadAvailableCollectionTypes()
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
    const rewriteMemoryContext = await (async () => {
      try {
        const memoryRetrievalService = await getMemoryRetrievalService();
        return await memoryRetrievalService.retrieveForRewrite(payload);
      } catch {
        return buildEmptySharedMemoryContext("rewrite");
      }
    })();
    const innerSpaceTerms = filterInnerSpaceTerms(await loadInnerSpaceTerms(), {
      collectionType: payload?.collectionType
    });
    const rewriteResult = await rewriteUntilAccepted({
      input: payload,
      beforeAnalysis,
      memoryContext: rewriteMemoryContext,
      modelSelection,
      maxAttempts: 3,
      innerSpaceTerms
    });

    return sendJson(response, 200, {
      ok: true,
      analysis: beforeAnalysis,
      beforeAnalysis,
      memoryContext: rewriteMemoryContext,
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
    const generationModelSelection = modelSelection.generation || modelSelection.rewrite;
    const collectionOptions = await loadAvailableCollectionTypes();
    const collectionType = assertValidCollectionType(payload?.collectionType || payload?.brief?.collectionType, collectionOptions);
    const brief = {
      ...(payload?.brief && typeof payload.brief === "object" ? payload.brief : {}),
      collectionType
    };
    const [profileState, qualifiedReferenceSamples, innerSpaceTermsRaw] = await Promise.all([
      loadStyleProfile(),
      loadQualifiedReferenceSamples(),
      loadInnerSpaceTerms()
    ]);
    const styleProfile = getActiveStyleProfile(profileState);
    const referenceSamples = buildGenerationReferenceSamples({ successSamples: qualifiedReferenceSamples }).slice(0, 12);
    const innerSpaceTerms = filterInnerSpaceTerms(innerSpaceTermsRaw, { collectionType });
    const memoryContext = await (async () => {
      try {
        const memoryRetrievalService = await getMemoryRetrievalService();
        return await memoryRetrievalService.retrieveForGeneration({
          topic: brief.topic,
          collectionType,
          constraints: brief.constraints,
          tags: Array.isArray(payload?.draft?.tags) ? payload.draft.tags : []
        });
      } catch {
        return buildEmptySharedMemoryContext("generation");
      }
    })();
    const generation = await generateNoteCandidates({
      mode: payload?.mode,
      brief,
      draft: payload?.draft,
      styleProfile,
      referenceSamples,
      innerSpaceTerms,
      memoryContext,
      modelSelection: generationModelSelection,
      generateJson: Array.isArray(payload?.mockCandidates)
        ? async () => ({ candidates: payload.mockCandidates, provider: "mock", model: "mock-generation" })
        : undefined
    });
    const scored = await scoreGenerationCandidates({
      candidates: generation.candidates,
      styleProfile,
      brief: payload?.brief,
      modelSelection,
      innerSpaceTerms,
      repairCandidate: repairGenerationCandidate
    });

    return sendJson(response, 200, {
      ok: true,
      collectionType,
      memoryContext,
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
    let dirty = false;

    try {
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
        dirty = true;
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
      dirty = true;
      await createWhitelistCandidatesFromFalsePositive(nextEntry);
      return sendJson(response, 200, {
        ok: true,
        items: next
      });
    } finally {
      if (dirty) {
        invalidateWriteReadCaches();
      }
    }
  }

  if (request.method === "POST" && url.pathname === "/api/sample-library") {
    const payload = await readBody(request);
    const { item, items, styleProfile, styleProfileRefreshQueued } = await persistSampleLibraryRecord(payload);
    return sendJson(response, 200, {
      ok: true,
      item,
      items,
      styleProfile,
      styleProfileRefreshQueued
    });
  }

  if (request.method === "POST" && url.pathname === "/api/sample-library/pdf-import/parse") {
    const payload = await readBody(request);
    const items = await parsePdfImportFiles(payload?.files || []);
    return sendJson(response, 200, {
      ok: true,
      items
    });
  }

  if (request.method === "POST" && url.pathname === "/api/sample-library/pdf-import/commit") {
    const payload = await readBody(request);
    const validatedPayloads = await validatePdfImportCommitItems(payload?.items);
    const createdItems = [];

    for (const validatedPayload of validatedPayloads) {
      const { item: saved } = await persistSampleLibraryRecord(validatedPayload);
      createdItems.push(saved);
    }

    return sendJson(response, 200, {
      ok: true,
      createdCount: createdItems.length,
      items: createdItems
    });
  }

  if (request.method === "POST" && url.pathname === "/api/sample-library/calibration-replay") {
    const payload = await readBody(request);
    const records = await loadNoteRecords();
    const result = replayCalibratedSamples(records, {
      mode: payload?.mode
    });
    return sendJson(response, 200, {
      ok: true,
      result
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
    let dirty = false;

    try {
      await saveFalsePositiveLog(next);
      dirty = true;
      await createWhitelistCandidatesFromFalsePositive(next[index]);
      return sendJson(response, 200, {
        ok: true,
        items: next
      });
    } finally {
      if (dirty) {
        invalidateWriteReadCaches();
      }
    }
  }

  if (request.method === "PATCH" && url.pathname === "/api/sample-library") {
    const payload = await readBody(request);
    const { item, items, styleProfile, styleProfileRefreshQueued } = await patchSampleLibraryRecordAndReturn(payload);
    return sendJson(response, 200, {
      ok: true,
      item,
      items,
      styleProfile,
      styleProfileRefreshQueued
    });
  }

  if (request.method === "PATCH" && url.pathname === "/api/admin/false-positive-log") {
    const payload = await readBody(request);
    let dirty = false;

    try {
      dirty = true;
      const updated = await confirmFalsePositiveLogEntry(payload?.id, payload?.userNotes);
      const items = await loadFalsePositiveLog();

      return sendJson(response, 200, {
        ok: true,
        item: updated,
        items
      });
    } finally {
      if (dirty) {
        invalidateWriteReadCaches();
      }
    }
  }

  if (request.method === "DELETE" && url.pathname === "/api/admin/false-positive-log") {
    const payload = await readBody(request);
    let dirty = false;

    try {
      await deleteFalsePositiveLogEntry(payload?.id);
      dirty = true;
      const items = await loadFalsePositiveLog();

      return sendJson(response, 200, {
        ok: true,
        items
      });
    } finally {
      if (dirty) {
        invalidateWriteReadCaches();
      }
    }
  }

  if (request.method === "POST" && url.pathname === "/api/admin/lexicon") {
    const payload = await readBody(request);
    const entry = await addLexiconEntry(payload.scope, payload.entry);
    invalidateWriteReadCaches();
    return sendJson(response, 200, { ok: true, entry });
  }

  if (request.method === "POST" && url.pathname === "/api/admin/inner-space-terms") {
    const payload = await readBody(request);
    const entry = await addInnerSpaceTerm(payload?.entry);
    invalidateWriteReadCaches();
    return sendJson(response, 200, { ok: true, entry });
  }

  if (request.method === "GET" && url.pathname === "/api/admin/inner-space-terms") {
    return sendItemsResponse(response, loadInnerSpaceTerms);
  }

  if (request.method === "DELETE" && url.pathname === "/api/admin/lexicon") {
    const payload = await readBody(request);
    await deleteLexiconEntry(payload.scope, payload.id);
    invalidateWriteReadCaches();
    return sendJson(response, 200, { ok: true });
  }

  if (request.method === "DELETE" && url.pathname === "/api/admin/inner-space-terms") {
    const payload = await readBody(request);
    const items = await deleteInnerSpaceTerm(payload?.id);
    invalidateWriteReadCaches();
    return sendJson(response, 200, { ok: true, items });
  }

  if (request.method === "DELETE" && url.pathname === "/api/admin/feedback") {
    const payload = await readBody(request);
    await deleteFeedbackEntry(payload.noteId, payload.createdAt);
    invalidateWriteReadCaches();
    return sendJson(response, 200, { ok: true });
  }

  if (request.method === "DELETE" && url.pathname === "/api/admin/review-queue") {
    const payload = await readBody(request);
    await deleteReviewQueueItem(payload.id);
    invalidateWriteReadCaches();
    return sendJson(response, 200, { ok: true });
  }

  if (request.method === "DELETE" && url.pathname === "/api/sample-library") {
    const payload = await readBody(request);
    const { items, styleProfile, styleProfileRefreshQueued } = await deleteSampleLibraryRecordAndReturn(payload?.id);
    return sendJson(response, 200, {
      ok: true,
      items,
      styleProfile,
      styleProfileRefreshQueued
    });
  }

  if (request.method === "POST" && url.pathname === "/api/admin/review-queue/promote") {
    const payload = await readBody(request);
    let dirty = false;

    try {
      dirty = true;
      const entry = await promoteReviewQueueItem(payload.id);
      return sendJson(response, 200, { ok: true, entry, item: entry });
    } finally {
      if (dirty) {
        invalidateWriteReadCaches();
      }
    }
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
