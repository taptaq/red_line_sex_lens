import { analyzePost } from "./analyzer.js";
import { runCrossModelReview } from "./cross-review.js";
import { deriveFailureReasonTags } from "./feedback.js";
import { callRoutedTextProviderJson, rewritePostForCompliance } from "./glm.js";
import { formatInnerSpaceTermsPrompt } from "./inner-space-terms.js";
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
const genericGeneratedTags = new Set(["日常", "好物", "分享", "记录", "生活", "推荐", "合集"]);

function uniqueStrings(items = []) {
  return [...new Set((Array.isArray(items) ? items : [items]).map((item) => String(item || "").trim()).filter(Boolean))];
}

function normalizeGeneratedTagValue(value = "") {
  return String(value || "")
    .trim()
    .replace(/^[#＃\s]+/g, "")
    .replace(/[，。、,.;；:：!！?？]+$/g, "")
    .trim();
}

function simplifyGeneratedTag(value = "") {
  return normalizeGeneratedTagValue(value).replace(/\s+/g, "").toLowerCase();
}

function isMeaningfulGeneratedTag(value = "") {
  return simplifyGeneratedTag(value).length >= 2;
}

function isGenericGeneratedTag(value = "") {
  return genericGeneratedTags.has(normalizeGeneratedTagValue(value));
}

function isPrefixExpandedDuplicateTag(existingTag = "", nextTag = "") {
  const existing = simplifyGeneratedTag(existingTag);
  const next = simplifyGeneratedTag(nextTag);

  if (!existing || !next || existing === next) {
    return false;
  }

  return existing.startsWith(next) || next.startsWith(existing);
}

function sanitizeGeneratedTags(tags = []) {
  const normalized = uniqueStrings(ensureArray(tags).map((tag) => normalizeGeneratedTagValue(tag)).filter(isMeaningfulGeneratedTag));
  const meaningfulTags = normalized.filter((tag) => !isGenericGeneratedTag(tag));
  const shouldDropGenericTags = meaningfulTags.length >= 3;
  const cleaned = [];

  for (const tag of normalized) {
    if (shouldDropGenericTags && isGenericGeneratedTag(tag)) {
      continue;
    }

    let shouldSkip = false;

    for (let index = 0; index < cleaned.length; index += 1) {
      const current = cleaned[index];

      if (!isPrefixExpandedDuplicateTag(current, tag)) {
        continue;
      }

      const currentSimple = simplifyGeneratedTag(current);
      const nextSimple = simplifyGeneratedTag(tag);

      if (nextSimple.startsWith(currentSimple) && nextSimple.length > currentSimple.length) {
        cleaned[index] = tag;
      }

      shouldSkip = true;
      break;
    }

    if (!shouldSkip) {
      cleaned.push(tag);
    }
  }

  return cleaned.slice(0, 6);
}

function parseTagReferenceInput(value = "") {
  return uniqueStrings(
    String(value || "")
      .split(/[\n，,、]/)
      .map((item) => item.trim())
      .filter(Boolean)
  );
}

function collectReferenceSampleTopTags(samples = [], limit = 8) {
  const counts = new Map();

  for (const sample of Array.isArray(samples) ? samples : []) {
    const weight = Math.max(1, Number(sample?.sampleWeight) || 1);

    for (const tag of ensureArray(sample?.tags)) {
      const normalized = String(tag || "").trim();

      if (!normalized) {
        continue;
      }

      counts.set(normalized, (counts.get(normalized) || 0) + weight);
    }
  }

  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1])
    .map(([tag]) => tag)
    .slice(0, limit);
}

function buildGenerationTagGuidance({ brief = {}, styleProfile = null, referenceSamples = [] } = {}) {
  const userTagReferences = parseTagReferenceInput(brief.tagReferences);
  const profileTags = uniqueStrings(styleProfile?.preferredTags || []);
  const referenceTags = collectReferenceSampleTopTags(referenceSamples);

  return {
    userTagReferences,
    profileTags,
    referenceTags
  };
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

function normalizeMemorySampleTitle(sample = {}) {
  return String(sample.payload?.note?.title || sample.payload?.title || sample.title || "").trim();
}

function normalizeMemorySampleBody(sample = {}) {
  return String(sample.payload?.note?.body || sample.payload?.body || sample.body || "").trim();
}

function stringifySharedMemoryContext(memoryContext = null) {
  if (!memoryContext || typeof memoryContext !== "object") {
    return "";
  }

  const referenceSection = ensureArray(memoryContext.referenceSamples)
    .slice(0, 3)
    .map((sample, index) => {
      const title = normalizeMemorySampleTitle(sample);
      const body = normalizeMemorySampleBody(sample);
      const lines = [`共享参考 ${index + 1}：${title || "未命名样本"}`];

      if (body) {
        lines.push(`可借鉴正文节奏：${body.slice(0, 140)}`);
      }

      return lines.join("\n");
    })
    .join("\n\n");
  const memoryCardSection = ensureArray(memoryContext.memoryCards)
    .slice(0, 4)
    .map((card, index) => {
      const kind = String(card.kind || "").trim();
      const label =
        kind === "risk_boundary_card"
          ? "风险边界卡"
          : kind === "style_experience_card"
            ? "风格经验卡"
            : "经验卡";
      const summary = String(card.summary || card.title || "").trim();

      return summary ? `${label} ${index + 1}：${summary}` : "";
    })
    .filter(Boolean)
    .join("\n");

  return [
    referenceSection ? `共享记忆参考：\n${referenceSection}` : "",
    memoryCardSection ? `共享记忆卡：\n${memoryCardSection}` : ""
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function buildGenerationMessages({
  mode = "from_scratch",
  brief = {},
  draft = {},
  styleProfile = null,
  referenceSamples = [],
  innerSpaceTerms = [],
  memoryContext = null
} = {}) {
  const lengthMode = String(brief.lengthMode || "short").trim() === "long" ? "long" : "short";
  const lengthInstruction =
    lengthMode === "long"
      ? "长文档：正文控制在 1100-1600 字，信息更完整，但仍然要自然分段，每段 2-4 句，避免一整坨长段。"
      : "短文档：正文控制在 600-950 字，表达紧凑但不能干瘪，同样要自然分段，每段 2-4 句。";
  const terminologyPrompt = formatInnerSpaceTermsPrompt(innerSpaceTerms);
  const sharedMemoryPrompt = stringifySharedMemoryContext(memoryContext);
  const tagGuidance = buildGenerationTagGuidance({ brief, styleProfile, referenceSamples });
  return [
    {
      role: "system",
      content: [
        "你是小红书内容生成助手，目标是生成合规、自然、符合账号风格的笔记。",
        "不要帮助规避平台审核，不要输出低俗擦边、导流、夸大承诺或教程化敏感内容。",
        "标题一定要吸睛，带一点高反差，但不能低俗、不能标题党过头。",
        "正文要像真人在说话，要有人味、自然感、大白话感，不要像说明书或模板稿。",
        "表达围绕内太空主题展开，敏感词尽量转成自然的内太空黑话表达，但不要为了隐晦而写得难懂。",
        "可以适当加 emoji，但不要堆太多，点到为止。",
        "不要输出一大段长文不分段，必须注意阅读节奏和段落呼吸感。",
        "请生成 3 个候选：safe、natural、expressive。",
        "只返回 JSON。"
      ].join("\n")
    },
    {
      role: "user",
      content: [
        `生成模式：${mode === "draft_optimize" ? "草稿优化" : "从零生成"}`,
        `合集类型：${brief.collectionType || ""}`,
        `文案长度偏好：${lengthMode === "long" ? "长文档" : "短文档"}`,
        `主题：${brief.topic || ""}`,
        `卖点：${brief.sellingPoints || ""}`,
        `目标人群：${brief.audience || ""}`,
        `注意事项：${brief.constraints || ""}`,
        `标签参考项：${tagGuidance.userTagReferences.join(", ")}`,
        `原始标题：${draft.title || ""}`,
        `原始正文：${draft.body || ""}`,
        `原始封面：${draft.coverText || ""}`,
        `原始标签：${ensureArray(draft.tags).join("、")}`,
        "",
        "当前生效风格画像：",
        JSON.stringify(styleProfile || {}, null, 2),
        tagGuidance.profileTags.length ? `风格画像偏好标签：${tagGuidance.profileTags.join("、")}` : "",
        "",
        "可参考成功样本：",
        stringifyReferenceSamples(referenceSamples),
        tagGuidance.referenceTags.length ? `参考样本高频标签：${tagGuidance.referenceTags.join("、")}` : "",
        "",
        sharedMemoryPrompt ? "共享记忆提示：" : "",
        sharedMemoryPrompt,
        sharedMemoryPrompt ? "" : "",
        terminologyPrompt,
        terminologyPrompt ? "" : "",
        "生成规则：",
        "1. 标题一定要吸睛、高反差，让人想点开，但不能显得油腻、夸张或低俗。",
        "2. 正文必须分段清楚，读起来顺，不要一整段铺到底。",
        "3. 语气自然，像真实的人在分享，用大白话，减少机器感。",
        "4. 适当加入 emoji，起点缀作用，不要密集堆砌。",
        "5. 维持内太空主题氛围；涉及敏感表达时，优先用自然的内太空黑话替代。",
        "6. 不要写成教程化敏感步骤，不要出现明显导流、露骨挑逗或夸大承诺。",
        `7. ${lengthInstruction}`,
        "8. 标签由你自动生成 3-6 个，优先参考用户提供的标签参考项、风格画像偏好标签和参考样本高频标签。",
        "9. 可以结合小红书常见的热门标签、细分标签表达方式，但不要硬蹭无关热词，也不要机械照抄参考标签。",
        "10. 避免只给过于空泛的大词标签，比如泛泛的情绪词、成长词、关系词；优先输出和当前主题强相关的表达。",
        "11. 至少包含 1 个更具体的场景标签，可以从人群、问题、场景、情绪、阶段或需求切入，让标签更细分可检索。",
        "12. 不要 3-6 个标签全部都是泛热门词，热门标签最多点到为止，剩余标签要体现内容的具体语境。",
        "13. 避免输出语义非常接近的重复标签；如果已经有“亲密关系”这一类宽标签，就不要再连续给出多个几乎同义的宽泛标签。",
        "14. 标签之间要有分工，尽量覆盖主题、人群、场景、问题或需求中的不同维度，而不是换个说法重复同一层意思。",
        "15. 标签结构上优先采用“1 个相对宽一点的主标签 + 2-4 个更细分的标签”的组合，让标签既能概括主题，也能承接具体检索场景。",
        "16. 不要把 3-6 个名额都分配给同一层级的大词，除非用户明确要求，否则宽标签尽量控制在 1 个以内。",
        "17. 细分标签优先从具体场景、人群阶段、痛点问题、情绪状态或需求目标里提炼，提升标签的信息量和区分度。",
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
    tags: sanitizeGeneratedTags(candidate.tags),
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
  innerSpaceTerms = [],
  memoryContext = null,
  modelSelection = "auto",
  generateJson = generateJsonWithModel
} = {}) {
  const messages = buildGenerationMessages({
    mode,
    brief,
    draft,
    styleProfile,
    referenceSamples,
    innerSpaceTerms,
    memoryContext
  });
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
  modelSelection = "auto",
  innerSpaceTerms = []
} = {}) {
  return rewritePostForCompliance({
    input: candidate,
    analysis,
    modelSelection,
    innerSpaceTerms
  });
}

export async function scoreGenerationCandidates({
  candidates = [],
  styleProfile = null,
  brief = {},
  modelSelection = {},
  innerSpaceTerms = [],
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
          modelSelection: modelSelection.rewrite,
          innerSpaceTerms
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
