import { loadLexicon, loadWhitelist } from "./data-store.js";
import { evaluateContextRules } from "./risk-rules.js";
import { ensureArray, flattenPost, normalizeText } from "./normalizer.js";

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

export async function analyzePost(input = {}) {
  const post = flattenPost(input);
  const whitelist = await loadWhitelist();
  const lexicon = await loadLexicon();

  const normalizedByField = Object.fromEntries(
    Object.entries(post).map(([key, value]) => [key, normalizeText(value)])
  );

  const lexiconHits = lexicon
    .map((entry) => detectEntryMatch(entry, normalizedByField, post))
    .filter(Boolean);

  const contextHits = evaluateContextRules(post);
  const hits = [...lexiconHits, ...contextHits];

  const categorySet = new Set(hits.map((hit) => hit.category));
  const whitelistHits = whitelist.filter((item) =>
    normalizeText([post.title, post.body, post.coverText].join(" ")).includes(normalizeText(item))
  );

  const score = hits.reduce((total, hit) => total + (riskWeights[hit.riskLevel] || 0), 0);

  let verdict = "pass";
  if (hits.some((hit) => hit.riskLevel === "hard_block")) {
    verdict = "hard_block";
  } else if (hits.some((hit) => hit.riskLevel === "manual_review")) {
    verdict = "manual_review";
  } else if (hits.some((hit) => hit.riskLevel === "observe")) {
    verdict = "observe";
  }

  return {
    input: {
      ...post,
      tags: ensureArray(input.tags),
      comments: ensureArray(input.comments)
    },
    verdict,
    score,
    hits,
    whitelistHits,
    categories: [...categorySet],
    suggestions: buildSuggestions(verdict, categorySet)
  };
}
