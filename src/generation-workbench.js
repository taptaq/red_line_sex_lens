import { analyzePost } from "./analyzer.js";
import { runCrossModelReview } from "./cross-review.js";
import { deriveFailureReasonTags } from "./feedback.js";
import { callRoutedTextProviderJson, rewritePostForCompliance } from "./glm.js";
import { getRewriteProviderSelection, getRewriteSelectionModel } from "./model-selection.js";
import { ensureArray } from "./normalizer.js";
import { runSemanticReview } from "./semantic-review.js";
import { scoreContentAgainstStyleProfile } from "./style-profile.js";
import { rankSamplesByWeight } from "./sample-weight.js";

const variants = ["safe", "natural", "expressive"];
const verdictPenalty = {
  pass: 0,
  observe: 12,
  manual_review: 38,
  hard_block: 90
};

function uniqueStrings(items = []) {
  return [...new Set((Array.isArray(items) ? items : [items]).map((item) => String(item || "").trim()).filter(Boolean))];
}

function stringifyReferenceSamples(samples = []) {
  return rankSamplesByWeight(samples)
    .slice(0, 5)
    .map((sample, index) =>
      [
        `参考样本 ${index + 1}（${sample.tier || "passed"}，权重 ${sample.sampleWeight}）：`,
        `标题：${sample.title || ""}`,
        `正文摘要：${String(sample.body || "").slice(0, 220)}`,
        `标签：${ensureArray(sample.tags).join("、")}`
      ].join("\n")
    )
    .join("\n\n");
}

export function buildGenerationMessages({
  mode = "from_scratch",
  brief = {},
  draft = {},
  styleProfile = null,
  referenceSamples = []
} = {}) {
  return [
    {
      role: "system",
      content: [
        "你是小红书内容生成助手，目标是生成合规、自然、符合账号风格的笔记。",
        "不要帮助规避平台审核，不要输出低俗擦边、导流、夸大承诺或教程化敏感内容。",
        "请生成 3 个候选：safe、natural、expressive。",
        "只返回 JSON。"
      ].join("\n")
    },
    {
      role: "user",
      content: [
        `生成模式：${mode === "draft_optimize" ? "草稿优化" : "从零生成"}`,
        `合集类型：${brief.collectionType || ""}`,
        `主题：${brief.topic || ""}`,
        `卖点：${brief.sellingPoints || ""}`,
        `目标人群：${brief.audience || ""}`,
        `注意事项：${brief.constraints || ""}`,
        `原始标题：${draft.title || ""}`,
        `原始正文：${draft.body || ""}`,
        `原始封面：${draft.coverText || ""}`,
        `原始标签：${ensureArray(draft.tags).join("、")}`,
        "",
        "当前生效风格画像：",
        JSON.stringify(styleProfile || {}, null, 2),
        "",
        "可参考成功样本：",
        stringifyReferenceSamples(referenceSamples),
        "",
        "输出格式：",
        "{",
        '  "candidates": [',
        '    {"variant":"safe","title":"标题","body":"正文","coverText":"封面文案","tags":["标签"],"generationNotes":"生成说明","safetyNotes":"安全注意点","referencedSampleIds":["sample-id"]}',
        "  ]",
        "}",
        "要求：不要照抄参考样本；候选之间要有明显侧重点差异；正文必须完整，不要只给摘要。"
      ].join("\n")
    }
  ];
}

export function normalizeGenerationCandidate(candidate = {}, index = 0) {
  const variant = variants.includes(String(candidate.variant || "").trim()) ? String(candidate.variant).trim() : variants[index] || "natural";

  return {
    id: String(candidate.id || `candidate-${variant}-${index + 1}`).trim(),
    variant,
    title: String(candidate.title || "").trim(),
    body: String(candidate.body || candidate.content || "").trim(),
    coverText: String(candidate.coverText || "").trim(),
    tags: uniqueStrings(ensureArray(candidate.tags)),
    generationNotes: String(candidate.generationNotes || candidate.rewriteNotes || "").trim(),
    safetyNotes: String(candidate.safetyNotes || "").trim(),
    referencedSampleIds: uniqueStrings(candidate.referencedSampleIds)
  };
}

function extractJsonBlock(text) {
  const content = String(text || "")
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "");

  try {
    return JSON.parse(content);
  } catch {}

  const start = content.indexOf("{");
  const end = content.lastIndexOf("}");

  if (start === -1 || end <= start) {
    return null;
  }

  try {
    return JSON.parse(content.slice(start, end + 1));
  } catch {
    return null;
  }
}

async function generateJsonWithModel({ messages, modelSelection = "auto" }) {
  const provider = getRewriteProviderSelection(modelSelection);
  const model = getRewriteSelectionModel(modelSelection);
  const result = await callRoutedTextProviderJson({
    provider,
    model,
    temperature: 0.7,
    maxTokens: Number(process.env.GENERATION_MAX_TOKENS || 1800),
    messages,
    missingKeyMessage: `生成工作台缺少 ${provider} 可用密钥。`,
    scene: "generation",
    fallbackParser: extractJsonBlock
  });

  return {
    ...result.parsed,
    provider,
    model: result.model || model,
    route: result.route,
    routeLabel: result.routeLabel,
    attemptedRoutes: result.attemptedRoutes || []
  };
}

export async function generateNoteCandidates({
  mode = "from_scratch",
  brief = {},
  draft = {},
  styleProfile = null,
  referenceSamples = [],
  modelSelection = "auto",
  generateJson = generateJsonWithModel
} = {}) {
  const messages = buildGenerationMessages({ mode, brief, draft, styleProfile, referenceSamples });
  const payload = await generateJson({ messages, modelSelection });
  const candidates = ensureArray(payload.candidates).map(normalizeGenerationCandidate).slice(0, 3);

  return {
    mode,
    candidates,
    modelTrace: {
      provider: payload.provider || "",
      model: payload.model || "",
      route: payload.route || "",
      routeLabel: payload.routeLabel || "",
      attemptedRoutes: payload.attemptedRoutes || []
    }
  };
}

function normalizeVerdict(value = "") {
  const verdict = String(value || "").trim();
  return ["pass", "observe", "manual_review", "hard_block"].includes(verdict) ? verdict : "manual_review";
}

function isAcceptedVerdict(value = "") {
  return ["pass", "observe"].includes(normalizeVerdict(value));
}

function scoreCompleteness(candidate = {}, brief = {}) {
  const text = `${candidate.title || ""}\n${candidate.body || ""}\n${candidate.coverText || ""}\n${ensureArray(candidate.tags).join(" ")}`;
  const topic = String(brief.topic || "").trim();
  const hasTopic = !topic || text.includes(topic);
  const hasBody = String(candidate.body || "").trim().length >= 120;
  const hasCover = Boolean(String(candidate.coverText || "").trim());
  const hasTags = ensureArray(candidate.tags).length >= 2;
  const score = Math.max(0, Math.min(100, (hasTopic ? 30 : 0) + (hasBody ? 35 : 0) + (hasCover ? 15 : 0) + (hasTags ? 20 : 0)));

  return {
    score,
    reasons: [
      hasTopic ? "覆盖主题" : "主题覆盖不明显",
      hasBody ? "正文完整" : "正文偏短",
      hasCover ? "包含封面文案" : "缺少封面文案",
      hasTags ? "标签数量足够" : "标签偏少"
    ]
  };
}

function rankScoredCandidate(item) {
  const verdict = normalizeVerdict(item.analysis?.finalVerdict || item.analysis?.verdict);
  const riskScore = Math.max(0, 100 - (verdictPenalty[verdict] || 0) - Math.min(50, Number(item.analysis?.score) || 0));
  const variantPenalty = item.variant === "expressive" && isAcceptedVerdict(verdict) ? 8 : 0;

  return {
    riskScore,
    total: Math.round(riskScore * 0.5 + item.style.score * 0.3 + item.completeness.score * 0.2 - variantPenalty)
  };
}

function getRecommendationBucket(item) {
  const verdict = normalizeVerdict(item.analysis?.finalVerdict || item.analysis?.verdict);

  if (verdict === "hard_block") {
    return 0;
  }

  if (verdict === "manual_review") {
    return 1;
  }

  return item.variant === "expressive" ? 2 : 3;
}

function buildRepairReason(analysis = {}, crossReview = null) {
  return uniqueStrings([
    ...(analysis?.suggestions || []),
    ...(analysis?.semanticReview?.status === "ok" ? analysis.semanticReview.review?.reasons || [] : []),
    ...(crossReview?.aggregate?.reasons || [])
  ])
    .slice(0, 5)
    .join("；");
}

function buildRepairReasonTags(analysis = {}, crossReview = null) {
  return deriveFailureReasonTags({
    texts: [
      ...(analysis?.suggestions || []),
      ...(analysis?.semanticReview?.status === "ok" ? analysis.semanticReview.review?.reasons || [] : []),
      ...(crossReview?.aggregate?.reasons || [])
    ],
    categories: analysis?.categories || [],
    topHits: analysis?.hits || []
  });
}

function shouldRepairCandidate(analysis = {}, crossReview = null) {
  const analysisVerdict = analysis?.finalVerdict || analysis?.verdict || "manual_review";
  const reviewVerdict =
    crossReview?.aggregate?.recommendedVerdict ||
    crossReview?.aggregate?.analysisVerdict ||
    analysisVerdict;

  return !isAcceptedVerdict(analysisVerdict) || !isAcceptedVerdict(reviewVerdict);
}

export async function repairGenerationCandidate({
  candidate = {},
  analysis = {},
  modelSelection = "auto"
} = {}) {
  return rewritePostForCompliance({
    input: candidate,
    analysis,
    modelSelection
  });
}

export async function scoreGenerationCandidates({
  candidates = [],
  styleProfile = null,
  brief = {},
  modelSelection = {},
  analyzeCandidate = analyzePost,
  semanticReviewCandidate = runSemanticReview,
  crossReviewCandidate = runCrossModelReview,
  repairCandidate = null
} = {}) {
  const scoredCandidates = [];

  for (const candidate of candidates) {
    const originalAnalysis = await analyzeCandidate(candidate);
    const originalSemanticReview = await semanticReviewCandidate({
      input: candidate,
      analysis: originalAnalysis,
      modelSelection: modelSelection.semantic
    });
    let mergedAnalysis = {
      ...originalAnalysis,
      semanticReview: originalSemanticReview
    };
    let crossReview = await crossReviewCandidate({
      input: candidate,
      analysis: mergedAnalysis,
      modelSelection: modelSelection.crossReview
    });
    let finalDraft = candidate;
    const repair = {
      attempted: false,
      applied: false,
      reason: "",
      reasonTags: [],
      error: "",
      rewrite: null,
      beforeAnalysis: mergedAnalysis,
      beforeCrossReview: crossReview
    };

    if (repairCandidate && shouldRepairCandidate(mergedAnalysis, crossReview)) {
      repair.attempted = true;
      repair.reason = buildRepairReason(mergedAnalysis, crossReview) || "候选稿未达到直接推荐区间，自动修复一次。";
      repair.reasonTags = buildRepairReasonTags(mergedAnalysis, crossReview);

      try {
        const rewrite = await repairCandidate({
          candidate,
          analysis: mergedAnalysis,
          crossReview,
          modelSelection: modelSelection.rewrite
        });
        finalDraft = {
          ...normalizeGenerationCandidate(
            {
              ...rewrite,
              id: candidate.id,
              variant: candidate.variant,
              generationNotes: rewrite?.rewriteNotes || candidate.generationNotes,
              safetyNotes: rewrite?.safetyNotes || candidate.safetyNotes
            },
            variants.indexOf(candidate.variant)
          ),
          repairedFromCandidateId: candidate.id
        };
        const repairedAnalysis = await analyzeCandidate(finalDraft);
        const repairedSemanticReview = await semanticReviewCandidate({
          input: finalDraft,
          analysis: repairedAnalysis,
          modelSelection: modelSelection.semantic
        });
        mergedAnalysis = {
          ...repairedAnalysis,
          semanticReview: repairedSemanticReview
        };
        crossReview = await crossReviewCandidate({
          input: finalDraft,
          analysis: mergedAnalysis,
          modelSelection: modelSelection.crossReview
        });
        repair.applied = true;
        repair.rewrite = rewrite;
      } catch (error) {
        repair.error = error?.message || "自动修复失败";
      }
    }

    const style = scoreContentAgainstStyleProfile(finalDraft, styleProfile);
    const completeness = scoreCompleteness(finalDraft, brief);
    const scores = rankScoredCandidate({ analysis: mergedAnalysis, style, completeness });

    scoredCandidates.push({
      ...candidate,
      finalDraft,
      analysis: mergedAnalysis,
      crossReview,
      repair,
      style,
      completeness,
      scores
    });
  }

  scoredCandidates.sort((left, right) => {
    const bucketDelta = getRecommendationBucket(right) - getRecommendationBucket(left);

    if (bucketDelta !== 0) {
      return bucketDelta;
    }

    return right.scores.total - left.scores.total;
  });
  const recommended = scoredCandidates[0] || null;
  const recommendedVerdict = normalizeVerdict(recommended?.analysis?.finalVerdict || recommended?.analysis?.verdict);
  const recommendationReason = recommended
    ? recommendedVerdict === "pass" || recommendedVerdict === "observe"
      ? "推荐该候选：合规风险更低，风格匹配和内容完整度综合分最高。"
      : "当前候选仍需人工复核：综合分最高但没有达到可直接发布区间。"
    : "当前没有可推荐候选。";

  return {
    recommendedCandidateId: recommended?.id || "",
    recommendationReason,
    scoredCandidates
  };
}
