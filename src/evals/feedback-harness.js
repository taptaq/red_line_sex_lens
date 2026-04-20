import path from "node:path";
import { analyzePost } from "../analyzer.js";
import { buildLexiconDraftFromReviewItem } from "../admin.js";
import { readImportFile } from "../data-store.js";
import {
  buildAnalysisSnapshot,
  buildReviewAudit,
  deriveReviewCandidates,
  getCandidatePhraseIssue,
  normalizeFeedbackItems
} from "../feedback.js";
import { normalizeText } from "../normalizer.js";

function uniqueStrings(items = []) {
  return [...new Set((Array.isArray(items) ? items : [items]).map((item) => String(item || "").trim()).filter(Boolean))];
}

function canonicalizeList(items = []) {
  return uniqueStrings(items).map((item) => ({
    raw: item,
    canonical: normalizeText(item)
  }));
}

function compareExpected(actualItems = [], expectedItems = []) {
  const actual = canonicalizeList(actualItems);
  const expected = canonicalizeList(expectedItems);
  const actualCanonicals = new Set(actual.map((item) => item.canonical));
  const expectedCanonicals = new Set(expected.map((item) => item.canonical));

  return {
    missed: expected.filter((item) => !actualCanonicals.has(item.canonical)).map((item) => item.raw),
    unexpected: actual.filter((item) => !expectedCanonicals.has(item.canonical)).map((item) => item.raw)
  };
}

function sampleId(sample, index) {
  return String(sample.id || sample.name || `sample-${index + 1}`)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function evaluateSample(sample, index) {
  const noteContent = String(sample.noteContent || sample.body || "").trim();
  const suspiciousPhrases = uniqueStrings(sample.suspiciousPhrases);
  const analysis = noteContent ? await analyzePost({ body: noteContent }) : null;
  const analysisSnapshot = buildAnalysisSnapshot(analysis);
  const reviewAudit = buildReviewAudit({
    platformReason: sample.platformReason || "",
    analysisSnapshot
  });

  const normalizedItems = normalizeFeedbackItems([
    {
      source: "eval",
      noteId: `eval-${sampleId(sample, index)}`,
      noteContent,
      platformReason: sample.platformReason || "",
      suspiciousPhrases,
      analysisSnapshot,
      reviewAudit
    }
  ]);

  const queue = deriveReviewCandidates(normalizedItems, {
    existingQueue: sample.existingQueue || [],
    lexicon: sample.lexicon || []
  });
  const generatedItems = queue.filter((item) => item.sourceNoteId === normalizedItems[0].noteId);
  const acceptedCandidates = generatedItems.map((item) => item.phrase);
  const acceptedCanonicals = new Set(acceptedCandidates.map((item) => normalizeText(item)));
  const blockedCandidates = suspiciousPhrases.filter((item) => !acceptedCanonicals.has(normalizeText(item)));
  const blockedReasons = Object.fromEntries(
    blockedCandidates.map((item) => [item, getCandidatePhraseIssue(item) || "已被现有词库或复核队列吸收"])
  );

  const allowedDiff = compareExpected(acceptedCandidates, sample.expectedAllowedCandidates || []);
  const blockedDiff = compareExpected(blockedCandidates, sample.expectedBlockedCandidates || []);
  const auditExpected = String(sample.expectedAuditSignal || "").trim();
  const auditMatches = !auditExpected || reviewAudit.signal === auditExpected;

  return {
    id: sample.id || `sample-${index + 1}`,
    title: sample.title || sample.name || `样本 ${index + 1}`,
    passed:
      allowedDiff.missed.length === 0 &&
      allowedDiff.unexpected.length === 0 &&
      blockedDiff.missed.length === 0 &&
      blockedDiff.unexpected.length === 0 &&
      auditMatches,
    input: {
      noteContent,
      platformReason: sample.platformReason || "",
      suspiciousPhrases
    },
    analysisSnapshot,
    reviewAudit,
    expected: {
      allowedCandidates: sample.expectedAllowedCandidates || [],
      blockedCandidates: sample.expectedBlockedCandidates || [],
      auditSignal: auditExpected || null
    },
    actual: {
      allowedCandidates: acceptedCandidates,
      blockedCandidates,
      blockedReasons,
      reviewQueueItems: generatedItems.map((item) => ({
        phrase: item.phrase,
        category: item.suggestedCategory,
        riskLevel: item.suggestedRiskLevel,
        priorityLabel: item.priorityLabel,
        priorityScore: item.priorityScore,
        draft: buildLexiconDraftFromReviewItem(item)
      }))
    },
    diff: {
      allowed: allowedDiff,
      blocked: blockedDiff,
      auditMatches,
      actualAuditSignal: reviewAudit.signal
    }
  };
}

export async function runFeedbackHarness({ filePath }) {
  const resolvedPath = path.resolve(filePath);
  const samples = await readImportFile(resolvedPath);

  if (!Array.isArray(samples) || !samples.length) {
    throw new Error(`评测样本为空：${resolvedPath}`);
  }

  const results = [];

  for (let index = 0; index < samples.length; index += 1) {
    results.push(await evaluateSample(samples[index], index));
  }

  const passed = results.filter((item) => item.passed).length;

  return {
    ok: passed === results.length,
    sampleFile: resolvedPath,
    summary: {
      total: results.length,
      passed,
      failed: results.length - passed
    },
    results
  };
}
