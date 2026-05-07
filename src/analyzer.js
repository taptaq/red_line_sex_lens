import { loadFalsePositiveLog, loadLexicon, loadQualifiedReferenceSamples, loadWhitelist } from "./data-store.js";
import { deriveFailureReasonTags } from "./feedback.js";
import { isSameFeedbackNote } from "./feedback-identity.js";
import { evaluateContextRules } from "./risk-rules.js";
import { ensureArray, flattenPost, normalizeText } from "./normalizer.js";
import { findReferenceSampleHints, referenceSampleSupportThreshold } from "./reference-samples.js";
import { calculateSampleWeight } from "./sample-weight.js";

const riskWeights = {
  hard_block: 100,
  manual_review: 40,
  observe: 10
};

function entryFields(entry) {
  return Array.isArray(entry.fields) && entry.fields.length
    ? entry.fields
    : ["title", "body", "coverText", "tags", "comments"];
}

function detectEntryMatch(entry, normalizedByField, rawByField) {
  const fields = entryFields(entry);
  const matchedFields = [];

  for (const field of fields) {
    const rawText = rawByField[field] || "";
    const normalizedText = normalizedByField[field] || "";
    let matched = false;

    if (entry.match === "exact" && entry.term) {
      matched = normalizedText.includes(normalizeText(entry.term));
    }

    if (entry.match === "regex" && entry.pattern) {
      matched = new RegExp(entry.pattern, "iu").test(rawText);
    }

    if (matched) {
      matchedFields.push(field);
    }
  }

  if (!matchedFields.length) {
    return null;
  }

  return {
    id: entry.id,
    category: entry.category,
    riskLevel: entry.riskLevel,
    reason: entry.xhsReason,
    fields: matchedFields,
    sourceUrl: entry.sourceUrl,
    sourceDate: entry.sourceDate,
    notes: entry.notes || ""
  };
}

function buildSuggestions(verdict, categories) {
  if (verdict === "hard_block") {
    return [
      "去掉导流、联系方式、二维码和站外转化表达",
      "删除未成年人线索与敏感亲密话题的任何组合",
      "避免把敏感话题写成挑逗化、步骤化或交易化内容"
    ];
  }

  if (verdict === "manual_review") {
    return [
      "把标题改成教育、沟通、健康或科普向表达",
      "去掉绝对化功效承诺与刺激性点击诱导",
      "弱化教程感、体验细节和过度聚焦身体部位的表述"
    ];
  }

  if (categories.has("教育语境")) {
    return [
      "继续保持科普和关系教育语境",
      "发布前再核对封面文案、标签和评论区引导语"
    ];
  }

  return ["当前未命中明显高风险规则，仍建议人工复核标题与封面文案"];
}

function normalizeWhitelistItem(item = "") {
  if (item && typeof item === "object") {
    return {
      phrase: String(item.phrase || item.term || item.label || "").trim(),
      source: String(item.source || "whitelist").trim()
    };
  }

  return {
    phrase: String(item || "").trim(),
    source: "whitelist"
  };
}

function findWhitelistHits(whitelist = [], post = {}) {
  const sourceText = normalizeText([post.title, post.body, post.coverText, ensureArray(post.tags).join(" ")].join(" "));

  return whitelist
    .map(normalizeWhitelistItem)
    .filter((item) => item.phrase && sourceText.includes(normalizeText(item.phrase)));
}

function findFalsePositiveHints(falsePositiveLog = [], input = {}) {
  return falsePositiveLog
    .filter((item) => ["platform_passed_pending", "platform_passed_confirmed"].includes(String(item.status || "").trim()))
    .filter((item) => isSameFeedbackNote(item, input))
    .map((item) => ({
      sourceId: String(item.id || "").trim(),
      status: String(item.status || "").trim(),
      title: String(item.title || "").trim(),
      auditSignal: String(item.falsePositiveAudit?.signal || "").trim(),
      sampleWeight: calculateSampleWeight(item, "false_positive"),
      reason: "已确认误报样本与当前内容匹配，建议降低非硬拦截判断权重。"
    }))
    .sort((a, b) => b.sampleWeight - a.sampleWeight);
}

function shouldSoftenVerdict(verdict, hits = [], whitelistHits = [], falsePositiveHints = []) {
  if (verdict !== "manual_review") {
    return false;
  }

  if (hits.some((hit) => hit.riskLevel === "hard_block")) {
    return false;
  }

  return whitelistHits.length > 0 || falsePositiveHints.some((item) => item.sampleWeight >= 2);
}

function shouldSoftenVerdictByReferenceSamples(verdict, hits = [], referenceSampleSupportScore = 0) {
  if (verdict !== "manual_review") {
    return false;
  }

  if (hits.some((hit) => hit.riskLevel === "hard_block")) {
    return false;
  }

  return referenceSampleSupportScore >= referenceSampleSupportThreshold;
}

export async function analyzePost(input = {}) {
  const post = flattenPost(input);
  const [whitelist, lexicon, falsePositiveLog, qualifiedReferenceSamples] = await Promise.all([
    loadWhitelist(),
    loadLexicon(),
    loadFalsePositiveLog(),
    loadQualifiedReferenceSamples()
  ]);

  const normalizedByField = Object.fromEntries(
    Object.entries(post).map(([key, value]) => [key, normalizeText(value)])
  );

  const lexiconHits = lexicon
    .map((entry) => detectEntryMatch(entry, normalizedByField, post))
    .filter(Boolean);

  const contextHits = evaluateContextRules(post);
  const hits = [...lexiconHits, ...contextHits];

  const categorySet = new Set(hits.map((hit) => hit.category));
  const whitelistHits = findWhitelistHits(whitelist, post);
  const falsePositiveHints = findFalsePositiveHints(falsePositiveLog, {
    ...post,
    tags: ensureArray(input.tags),
    comments: ensureArray(input.comments)
  });
  const {
    matchedReferenceSamples,
    referenceSampleHints,
    referenceSampleSupportScore
  } = findReferenceSampleHints(qualifiedReferenceSamples, {
    ...post,
    tags: ensureArray(input.tags),
    collectionType: String(input.collectionType || "").trim()
  });

  const score = hits.reduce((total, hit) => total + (riskWeights[hit.riskLevel] || 0), 0);

  let verdict = "pass";
  if (hits.some((hit) => hit.riskLevel === "hard_block")) {
    verdict = "hard_block";
  } else if (hits.some((hit) => hit.riskLevel === "manual_review")) {
    verdict = "manual_review";
  } else if (hits.some((hit) => hit.riskLevel === "observe")) {
    verdict = "observe";
  }
  const originalVerdict = verdict;
  const softenedByFalsePositive = shouldSoftenVerdict(verdict, hits, whitelistHits, falsePositiveHints);
  const softenedByReferenceSamples = shouldSoftenVerdictByReferenceSamples(
    originalVerdict,
    hits,
    referenceSampleSupportScore
  );

  if (softenedByFalsePositive || softenedByReferenceSamples) {
    verdict = "observe";
  }

  const suggestions = buildSuggestions(verdict, categorySet);

  if (softenedByFalsePositive) {
    suggestions.unshift(
      falsePositiveHints.length
        ? "命中已确认误报样本，建议按规则偏严反例降低人工复核权重"
        : "命中宽松白名单，建议按合规语境反例降低人工复核权重"
    );
  }

  if (softenedByReferenceSamples) {
    suggestions.unshift("命中相似参考样本，当前表达更接近已验证的安全内容，可按观察项继续人工把关。");
  }

  const failureReasonTags = deriveFailureReasonTags({
    texts: suggestions,
    categories: [...categorySet],
    topHits: hits
  });

  return {
    input: {
      ...post,
      collectionType: String(input.collectionType || "").trim(),
      tags: ensureArray(input.tags),
      comments: ensureArray(input.comments)
    },
    modelTrace: {
      provider: "rules",
      route: "local",
      routeLabel: "本地规则引擎",
      model: "规则词库 + 组合规则",
      label: "本地规则引擎 / 规则词库 + 组合规则"
    },
    verdict,
    originalVerdict,
    score,
    hits,
    whitelistHits,
    falsePositiveHints,
    referenceSampleHints,
    matchedReferenceSamples,
    referenceSampleSupportScore,
    softenedByFalsePositive,
    softenedByReferenceSamples,
    categories: [...categorySet],
    suggestions,
    failureReasonTags
  };
}
