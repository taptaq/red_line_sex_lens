import path from "node:path";
import { analyzePost } from "../analyzer.js";
import { readImportFile } from "../data-store.js";

function uniqueStrings(items = []) {
  return [...new Set((Array.isArray(items) ? items : [items]).map((item) => String(item || "").trim()).filter(Boolean))];
}

function normalizeContent(input = {}) {
  return {
    title: String(input.title || "").trim(),
    body: String(input.body || "").trim(),
    coverText: String(input.coverText || "").trim(),
    tags: uniqueStrings(input.tags || [])
  };
}

async function evaluatePair(pair, index) {
  const before = normalizeContent(pair.before || {});
  const after = normalizeContent(pair.after || {});
  const [beforeAnalysis, afterAnalysis] = await Promise.all([analyzePost(before), analyzePost(after)]);
  const beforeRank =
    {
      pass: 0,
      observe: 1,
      manual_review: 2,
      hard_block: 3
    }[beforeAnalysis.verdict] ?? 0;
  const afterRank =
    {
      pass: 0,
      observe: 1,
      manual_review: 2,
      hard_block: 3
    }[afterAnalysis.verdict] ?? 0;

  return {
    id: pair.id || `rewrite-pair-${index + 1}`,
    name: pair.name || `改写样本 ${index + 1}`,
    rewriteModel: pair.rewriteModel || "",
    rewriteStrategy: pair.rewriteStrategy || "",
    effectiveChanges: pair.effectiveChanges || "",
    beforeAnalysis,
    afterAnalysis,
    outcome: {
      improved: afterRank <= beforeRank && afterAnalysis.score <= beforeAnalysis.score,
      severityDelta: afterRank - beforeRank,
      scoreDelta: afterAnalysis.score - beforeAnalysis.score
    }
  };
}

export async function runRewritePairsHarness({ filePath }) {
  const resolvedPath = path.resolve(filePath);
  const pairs = await readImportFile(resolvedPath);

  if (!Array.isArray(pairs) || !pairs.length) {
    throw new Error(`改写样本为空：${resolvedPath}`);
  }

  const results = [];

  for (let index = 0; index < pairs.length; index += 1) {
    results.push(await evaluatePair(pairs[index], index));
  }

  const improved = results.filter((item) => item.outcome.improved).length;
  const worsened = results.filter((item) => item.outcome.severityDelta > 0 || item.outcome.scoreDelta > 0).length;

  return {
    ok: worsened === 0,
    sampleFile: resolvedPath,
    summary: {
      total: results.length,
      improved,
      worsened,
      unchanged: results.length - improved - worsened
    },
    results
  };
}
