import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import {
  addLexiconEntry,
  deleteFeedbackEntry,
  deleteLexiconEntry,
  deleteRewritePairEntry,
  deleteReviewQueueItem,
  loadAdminData,
  promoteReviewQueueItem
} from "./admin.js";
import { analyzePost } from "./analyzer.js";
import { appendRewritePairs, loadReviewQueue, loadSummary, upsertFeedbackEntries } from "./data-store.js";
import {
  buildAnalysisSnapshot,
  buildReviewAudit,
  createReviewCandidates,
  mergeSuspiciousPhrases,
  normalizeFeedbackItems,
  sanitizeFeedbackModelSuggestion,
  sanitizeScreenshotMeta,
  sanitizeScreenshotRecognition
} from "./feedback.js";
import { runCrossModelReview } from "./cross-review.js";
import { recognizeFeedbackScreenshot, rewritePostForCompliance, suggestFeedbackCandidates } from "./glm.js";
import { buildRewritePairRecord } from "./rewrite-pairs.js";
import { mergeRuleAndSemanticAnalysis, runSemanticReview } from "./semantic-review.js";
import { webDir } from "./config.js";

const host = "127.0.0.1";
const port = 3030;

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload, null, 2));
}

function sendFile(response, filePath, contentType) {
  return fs
    .readFile(filePath)
    .then((buffer) => {
      response.writeHead(200, { "Content-Type": contentType });
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

async function buildMergedAnalysis(input) {
  const analysis = await analyzePost(input);
  const semanticReview = await runSemanticReview({
    input,
    analysis
  });

  return mergeRuleAndSemanticAnalysis(analysis, semanticReview);
}

async function recognizeScreenshotPayload(screenshot) {
  if (!screenshot?.dataUrl) {
    const error = new Error("请先上传一张可识别的截图。");
    error.statusCode = 400;
    throw error;
  }

  const meta = sanitizeScreenshotMeta(screenshot);
  const recognition = await recognizeFeedbackScreenshot({
    imageDataUrl: screenshot?.dataUrl,
    mimeType: meta?.type,
    fileName: meta?.name
  });

  return {
    screenshot: meta,
    recognition: sanitizeScreenshotRecognition(recognition)
  };
}

async function enrichFeedbackItems(items) {
  const enrichedItems = [];

  for (const item of items) {
    const screenshot = item?.screenshot;
    let recognition = sanitizeScreenshotRecognition(item?.screenshotRecognition);
    let feedbackModelSuggestion = sanitizeFeedbackModelSuggestion(item?.feedbackModelSuggestion);
    const noteContent = String(item?.noteContent || item?.body || "").trim();

    if (screenshot?.dataUrl && !recognition) {
      const extracted = await recognizeScreenshotPayload(screenshot);
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
      Boolean(process.env.GLM_API_KEY) &&
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
            reviewAudit
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

async function appendFeedbackAndQueue(payload) {
  const enrichedItems = await enrichFeedbackItems(Array.isArray(payload) ? payload : [payload]);
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

const server = http.createServer(
  withErrorHandling(async (request, response) => {
    const url = new URL(request.url, `http://${request.headers.host}`);

    if (request.method === "GET" && url.pathname === "/") {
      return sendFile(response, path.join(webDir, "index.html"), "text/html; charset=utf-8");
    }

    if (request.method === "GET" && url.pathname === "/app.js") {
      return sendFile(response, path.join(webDir, "app.js"), "text/javascript; charset=utf-8");
    }

    if (request.method === "GET" && url.pathname === "/styles.css") {
      return sendFile(response, path.join(webDir, "styles.css"), "text/css; charset=utf-8");
    }

    if (request.method === "GET" && url.pathname === "/api/summary") {
      const summary = await loadSummary();
      return sendJson(response, 200, summary);
    }

    if (request.method === "GET" && url.pathname === "/api/admin/data") {
      const data = await loadAdminData();
      return sendJson(response, 200, data);
    }

    if (request.method === "GET" && url.pathname === "/api/review-queue") {
      const queue = await loadReviewQueue();
      return sendJson(response, 200, queue);
    }

    if (request.method === "POST" && url.pathname === "/api/analyze") {
      const payload = await readBody(request);
      const result = await buildMergedAnalysis(payload);
      return sendJson(response, 200, result);
    }

    if (request.method === "POST" && url.pathname === "/api/rewrite") {
      const payload = await readBody(request);
      const beforeAnalysis = await buildMergedAnalysis(payload);
      const rewrite = await rewritePostForCompliance({
        input: payload,
        analysis: beforeAnalysis
      });
      const afterInput = {
        title: rewrite.title,
        body: rewrite.body,
        coverText: rewrite.coverText,
        tags: rewrite.tags
      };
      const afterAnalysis = await buildMergedAnalysis(afterInput);

      return sendJson(response, 200, {
        ok: true,
        analysis: beforeAnalysis,
        beforeAnalysis,
        afterAnalysis,
        rewrite
      });
    }

    if (request.method === "POST" && url.pathname === "/api/cross-review") {
      const payload = await readBody(request);
      const analysis = await analyzePost(payload);
      const review = await runCrossModelReview({
        input: payload,
        analysis
      });

      return sendJson(response, 200, {
        ok: true,
        analysis,
        review
      });
    }

    if (request.method === "POST" && url.pathname === "/api/feedback/extract-screenshot") {
      const payload = await readBody(request);
      const extracted = await recognizeScreenshotPayload(payload?.screenshot);
      return sendJson(response, 200, {
        ok: true,
        screenshot: extracted.screenshot,
        recognition: extracted.recognition
      });
    }

    if (request.method === "POST" && url.pathname === "/api/feedback") {
      const payload = await readBody(request);
      const result = await appendFeedbackAndQueue(payload);
      return sendJson(response, 200, {
        ok: true,
        reviewQueueCount: result.reviewQueue.length,
        imported: result.items.length,
        recognizedFromScreenshot: result.items.filter((item) => item.screenshotRecognition).length,
        candidateSummary: result.candidateSummary
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

    if (request.method === "POST" && url.pathname === "/api/admin/review-queue/promote") {
      const payload = await readBody(request);
      const entry = await promoteReviewQueueItem(payload.id);
      return sendJson(response, 200, { ok: true, entry });
    }

    response.writeHead(404);
    response.end("Not found");
  })
);

server.listen(port, host, () => {
  console.log(`Server running at http://${host}:${port}`);
});
