import { callRoutedTextProviderJson } from "./glm.js";
import { getRewriteProviderSelection, getRewriteSelectionModel } from "./model-selection.js";
import { ensureArray } from "./normalizer.js";
import { getSuccessSampleWeight } from "./success-samples.js";

const variants = ["safe", "natural", "expressive"];

function uniqueStrings(items = []) {
  return [...new Set((Array.isArray(items) ? items : [items]).map((item) => String(item || "").trim()).filter(Boolean))];
}

function stringifyReferenceSamples(samples = []) {
  return (Array.isArray(samples) ? samples : [])
    .sort((a, b) => getSuccessSampleWeight(b) - getSuccessSampleWeight(a))
    .slice(0, 5)
    .map((sample, index) =>
      [
        `参考样本 ${index + 1}（${sample.tier || "passed"}）：`,
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
