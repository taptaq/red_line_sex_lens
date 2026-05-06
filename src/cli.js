import "./env.js";
import path from "node:path";
import { analyzePost } from "./analyzer.js";
import { loadSummary, readImportFile, upsertFeedbackEntries } from "./data-store.js";
import { runFeedbackHarness } from "./evals/feedback-harness.js";
import {
  createReviewCandidates,
  mergeSuspiciousPhrases,
  normalizeFeedbackItems,
  sanitizeFeedbackModelSuggestion,
  sanitizeScreenshotMeta,
  sanitizeScreenshotRecognition
} from "./feedback.js";
import { recognizeFeedbackScreenshot, screenshotFileToDataUrl, suggestFeedbackCandidates } from "./glm.js";

function splitLooseCSV(value = "") {
  return String(value || "")
    .split(/[，,、]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseArgs(argv) {
  const result = {};

  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith("--")) {
      continue;
    }

    const key = item.slice(2);
    const next = argv[index + 1];
    if (next && !next.startsWith("--")) {
      result[key] = next;
      index += 1;
    } else {
      result[key] = true;
    }
  }

  return result;
}

async function enrichFeedbackItemsForImport(input, baseDir) {
  const items = Array.isArray(input) ? input : [input];
  const enrichedItems = [];

  for (const item of items.filter(Boolean)) {
    let screenshot = sanitizeScreenshotMeta(item.screenshot);
    let recognition = sanitizeScreenshotRecognition(item.screenshotRecognition);
    let feedbackModelSuggestion = sanitizeFeedbackModelSuggestion(item.feedbackModelSuggestion);

    if (item?.screenshotPath) {
      const screenshotFile = await screenshotFileToDataUrl(path.resolve(baseDir, item.screenshotPath));
      screenshot = sanitizeScreenshotMeta(screenshotFile);

      if (!recognition) {
        recognition = sanitizeScreenshotRecognition(
          await recognizeFeedbackScreenshot({
            imageDataUrl: screenshotFile.dataUrl,
            mimeType: screenshotFile.type,
            fileName: screenshotFile.name
          })
        );
      }
    }

    const noteContent = String(item?.noteContent || item?.body || "").trim();
    const mergedPlatformReason = item.platformReason || recognition?.platformReason || "";

    if (!feedbackModelSuggestion && process.env.GLM_API_KEY && (noteContent || mergedPlatformReason || recognition)) {
      try {
        feedbackModelSuggestion = sanitizeFeedbackModelSuggestion(
          await suggestFeedbackCandidates({
            noteContent,
            platformReason: mergedPlatformReason,
            suspiciousPhrases: mergeSuspiciousPhrases(item.suspiciousPhrases, recognition?.suspiciousPhrases),
            screenshotRecognition: recognition
          })
        );
      } catch {}
    }

    enrichedItems.push({
      ...item,
      screenshot,
      screenshotRecognition: recognition,
      feedbackModelSuggestion,
      platformReason: mergedPlatformReason,
      suspiciousPhrases: mergeSuspiciousPhrases(item.suspiciousPhrases, recognition?.suspiciousPhrases)
    });
  }

  return normalizeFeedbackItems(enrichedItems);
}

async function runAnalyze(args) {
  let payload = {
    title: args.title || "",
    body: args.body || "",
    coverText: args["cover-text"] || "",
    tags: splitLooseCSV(args.tags)
  };

  if (args.file) {
    const imported = await readImportFile(path.resolve(args.file));
    payload = Array.isArray(imported) ? imported[0] : imported;
  }

  const result = await analyzePost(payload);
  console.log(JSON.stringify(result, null, 2));
}

async function runIngestFeedback(args) {
  if (!args.file) {
    throw new Error("Please provide --file <path-to-json> for feedback import.");
  }

  const importPath = path.resolve(args.file);
  const imported = await readImportFile(importPath);
  const feedbackItems = await enrichFeedbackItemsForImport(imported, path.dirname(importPath));
  const feedbackLog = await upsertFeedbackEntries(feedbackItems);
  const reviewQueue = await createReviewCandidates(feedbackLog, { reset: true });

  console.log(
    JSON.stringify(
      {
        imported: feedbackItems.length,
        reviewQueueCount: reviewQueue.length
      },
      null,
      2
    )
  );
}

async function runSummary() {
  const summary = await loadSummary();
  console.log(JSON.stringify(summary, null, 2));
}

async function runEvalFeedback(args) {
  const filePath = args.file
    ? path.resolve(args.file)
    : path.resolve("data/evals/feedback-harness.samples.json");
  const result = await runFeedbackHarness({ filePath });
  console.log(JSON.stringify(result, null, 2));
}

async function main() {
  const [, , command = "summary", ...rest] = process.argv;
  const args = parseArgs(rest);

  if (command === "analyze") {
    await runAnalyze(args);
    return;
  }

  if (command === "ingest-feedback") {
    await runIngestFeedback(args);
    return;
  }

  if (command === "summary") {
    await runSummary();
    return;
  }

  if (command === "eval-feedback") {
    await runEvalFeedback(args);
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
