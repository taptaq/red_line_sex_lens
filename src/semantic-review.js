import "./env.js";
import { callDeepSeekJson, callDmxapiTextJson, callGlmJson, callMiniMaxJson, callQwenJson } from "./glm.js";
import { filterProviderConfigsBySelection, getSemanticComparisonSelections } from "./model-selection.js";
import { resolveDisplayProvider, splitProviderResultForDisplay } from "./provider-display.js";

const severityRank = {
  pass: 0,
  observe: 1,
  manual_review: 2,
  hard_block: 3
};

const providerConfigs = [
  {
    provider: "glm",
    label: "智谱 GLM",
    envKey: "GLM_API_KEY",
    endpoint: "https://open.bigmodel.cn/api/paas/v4/chat/completions",
    model:
      process.env.GLM_SEMANTIC_MODEL || process.env.GLM_CROSS_REVIEW_MODEL || process.env.GLM_TEXT_MODEL || "glm-4.6v"
  },
  {
    provider: "qwen",
    label: "通义千问",
    envKey: "DMXAPI_API_KEY",
    endpoint: "https://www.dmxapi.cn/v1/chat/completions",
    model: process.env.QWEN_DMXAPI_MODEL || "qwen3.5-plus"
  },
  {
    provider: "minimax",
    label: "MiniMax",
    envKey: "DMXAPI_API_KEY",
    endpoint: "https://www.dmxapi.cn/v1/chat/completions",
    model: process.env.MINIMAX_DMXAPI_MODEL || "MiniMax-M2.5"
  },
  {
    provider: "deepseek",
    label: "深度求索",
    envKey: "DEEPSEEK_API_KEY",
    endpoint: "https://api.deepseek.com/chat/completions",
    model: process.env.DEEPSEEK_SEMANTIC_MODEL || process.env.DEEPSEEK_CROSS_REVIEW_MODEL || "deepseek-v4-flash"
  }
];

const semanticTimeoutMs = Number(process.env.SEMANTIC_REVIEW_TIMEOUT_MS || 60000);
const semanticMaxTokens = Number(process.env.SEMANTIC_REVIEW_MAX_TOKENS || 900);
const semanticStructuredResponseFormat = {
  type: "json_schema",
  json_schema: {
    name: "semantic_review",
    schema: {
      type: "object",
      additionalProperties: false,
      required: [
        "verdict",
        "confidence",
        "categories",
        "reasons",
        "implicitSignals",
        "safeSignals",
        "summary",
        "suggestion"
      ],
      properties: {
        verdict: {
          type: "string",
          enum: ["hard_block", "manual_review", "observe", "pass"]
        },
        confidence: {
          type: "number"
        },
        categories: {
          type: "array",
          items: { type: "string" }
        },
        reasons: {
          type: "array",
          items: { type: "string" }
        },
        implicitSignals: {
          type: "array",
          items: { type: "string" }
        },
        safeSignals: {
          type: "array",
          items: { type: "string" }
        },
        summary: {
          type: "string"
        },
        suggestion: {
          type: "string"
        }
      }
    }
  }
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function flattenContent(content) {
  if (typeof content === "string") {
    return content;
  }

  if (!Array.isArray(content)) {
    return "";
  }

  return content
    .map((item) => {
      if (typeof item === "string") {
        return item;
      }

      if (item?.type === "text") {
        return item.text || "";
      }

      return item?.content || "";
    })
    .join("\n");
}

function extractJsonBlock(text) {
  const content = String(text || "").trim();

  if (!content) {
    return null;
  }

  const normalized = content.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "");

  try {
    return JSON.parse(normalized);
  } catch {}

  const firstBrace = normalized.indexOf("{");
  const lastBrace = normalized.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return null;
  }

  try {
    return JSON.parse(normalized.slice(firstBrace, lastBrace + 1));
  } catch {
    return null;
  }
}

function normalizeVerdict(value) {
  const verdict = String(value || "").trim().toLowerCase();

  if (verdict === "hard_block" || verdict === "manual_review" || verdict === "observe" || verdict === "pass") {
    return verdict;
  }

  return "manual_review";
}

function normalizeStringList(items = []) {
  return [...new Set((Array.isArray(items) ? items : [items]).map((item) => String(item || "").trim()).filter(Boolean))];
}

function normalizeReasonList(items = []) {
  return [...new Set((Array.isArray(items) ? items : [items]).map((item) => String(item || "").trim()).filter((item) => {
    if (!item) return false;
    if (/^一句话原因(?:\d+)?$/.test(item)) return false;
    if (/^原因\d+$/.test(item)) return false;
    return true;
  }))];
}

function summarizeAnalysis(analysis = {}) {
  const hits = Array.isArray(analysis.hits) ? analysis.hits : [];

  return hits.slice(0, 5).map((hit) => ({
    category: String(hit.category || "").trim(),
    riskLevel: String(hit.riskLevel || "").trim(),
    reason: String(hit.reason || hit.evidence || "").trim(),
    fields: Array.isArray(hit.fields) ? hit.fields.slice(0, 3) : []
  }));
}

function normalizeMemorySampleTitle(sample = {}) {
  return String(sample.payload?.note?.title || sample.payload?.title || sample.title || "").trim();
}

function normalizeMemorySampleBody(sample = {}) {
  return String(sample.payload?.note?.body || sample.payload?.body || sample.body || "").trim();
}

function clipText(value = "", maxLength = 120) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function buildSemanticMemoryPrompt(memoryContext = null) {
  if (!memoryContext || typeof memoryContext !== "object") {
    return "";
  }

  const referenceSection = Array.isArray(memoryContext.referenceSamples)
    ? memoryContext.referenceSamples
        .slice(0, 3)
        .map((sample, index) => {
          const title = normalizeMemorySampleTitle(sample);
          const body = clipText(normalizeMemorySampleBody(sample), 100);
          const lines = [`共享参考样本 ${index + 1}：${title || "未命名样本"}`];

          if (body) {
            lines.push(`相似安全表达：${body}`);
          }

          return lines.join("\n");
        })
        .filter(Boolean)
        .join("\n\n")
    : "";

  const cardSection = Array.isArray(memoryContext.memoryCards)
    ? memoryContext.memoryCards
        .slice(0, 4)
        .map((card, index) => {
          const summary = clipText(card.summary || card.title || "", 100);
          return summary ? `风险记忆 ${index + 1}：${summary}` : "";
        })
        .filter(Boolean)
        .join("\n")
    : "";

  const riskCategories = normalizeStringList(
    (Array.isArray(memoryContext.riskFeedback) ? memoryContext.riskFeedback : []).flatMap((item) =>
      Array.isArray(item?.riskCategories) ? item.riskCategories : []
    )
  );
  const riskSection = riskCategories.length
    ? `历史相似违规风险：${riskCategories.join("、")}`
    : "";

  const falsePositiveSection = Array.isArray(memoryContext.falsePositiveHints) && memoryContext.falsePositiveHints.length
    ? "误报保护提示：历史相似放行样本表明，中性经验分享、克制语气、非导流表达不要被机械误杀。"
    : "";

  return [
    referenceSection ? `共享记忆提示：\n${referenceSection}` : "",
    cardSection ? `长期记忆卡片：\n${cardSection}` : "",
    riskSection,
    falsePositiveSection
  ]
    .filter(Boolean)
    .join("\n\n");
}

function buildMessages(input = {}, analysis = {}) {
  const sharedMemoryPrompt = buildSemanticMemoryPrompt(analysis?.memoryContext);

  return [
    {
      role: "system",
      content: [
        "你现在扮演小红书内容安全审核团队中的资深语义复判员。",
        "你的任务不是找表面敏感词，而是理解整段内容的真实意图、表达语境、隐晦暗示、角色扮演、导流意图、擦边氛围与教程化倾向。",
        "请按小红书审核语境做强语义判断，尤其关注导流、低俗擦边、未成年人边界、两性用品宣传展示、教程化敏感内容、夸大承诺。",
        "请把规则检测结果当作参考，但你需要独立判断，不能机械复述规则结果。",
        "如果给了长期记忆检索结果，请把它当作历史相似案例参考，但最终仍以当前内容本身的真实语义为准。",
        "输出必须是 JSON。"
      ].join("\n")
    },
    {
      role: "user",
      content: [
        "请对下面内容做语义层合规复判，只返回 JSON。",
        "输出格式：",
        "{",
        '  "verdict": "hard_block | manual_review | observe | pass",',
        '  "confidence": 0.0,',
        '  "categories": ["风险类别1"],',
        '  "reasons": ["简明具体的原因A", "简明具体的原因B"],',
        '  "implicitSignals": ["隐含导流/擦边/暗示等信号，没有就空数组"],',
        '  "safeSignals": ["教育/沟通/科普等正向信号，没有就空数组"],',
        '  "summary": "一句话总结这段内容的真实语义风险",',
        '  "suggestion": "一句话说明应该重点改哪里，没有就空字符串"',
        "}",
        "要求：",
        "1. 如果是明显教育、沟通、健康、科普语境，不要因为个别敏感词就直接判高风险。",
        "2. 如果存在隐晦导流、暗示性挑逗、场景化刺激、教程化描述，要识别这种语义风险。",
        "3. 如果拿不准，不要直接给 pass，优先 observe 或 manual_review。",
        "4. reasons 控制在 2-3 条，短而具体。",
        "",
        `标题：${String(input.title || "")}`,
        `正文：${String(input.body || "")}`,
        `封面文案：${String(input.coverText || "")}`,
        `标签：${Array.isArray(input.tags) ? input.tags.join("、") : String(input.tags || "")}`,
        `规则检测结论：${String(analysis.verdict || "")}`,
        `规则命中摘要：${JSON.stringify(summarizeAnalysis(analysis))}`,
        `规则建议：${JSON.stringify((analysis.suggestions || []).slice(0, 3))}`,
        sharedMemoryPrompt
      ].join("\n")
    }
  ];
}

function normalizeSemanticPayload(payload, provider, model) {
  const confidence = Number(payload?.confidence);

  return {
    provider,
    model: String(payload?.model || model).trim(),
    verdict: normalizeVerdict(payload?.verdict),
    confidence: Number.isFinite(confidence) ? Math.max(0, Math.min(1, confidence)) : null,
    categories: normalizeStringList(payload?.categories),
    reasons: normalizeReasonList(payload?.reasons),
    implicitSignals: normalizeStringList(payload?.implicitSignals),
    safeSignals: normalizeStringList(payload?.safeSignals),
    summary: String(payload?.summary || "").trim(),
    suggestion: String(payload?.suggestion || "").trim()
  };
}

function withReviewModelTrace(review = {}, providerLabelText = "") {
  const routeLabel = String(review.routeLabel || "").trim();
  const model = String(review.model || "").trim();

  return {
    ...review,
    modelTrace: {
      provider: review.provider,
      route: review.route || "",
      routeLabel,
      model,
      label: [routeLabel, providerLabelText, model].filter(Boolean).join(" / ")
    }
  };
}

async function callProvider(config, input, analysis) {
  if (
    config.provider === "glm" ||
    config.provider === "qwen" ||
    config.provider === "minimax" ||
    config.provider === "deepseek" ||
    config.provider === "dmxapi_text"
  ) {
    try {
      const routedCall =
        config.provider === "glm"
          ? callGlmJson
          : config.provider === "qwen"
            ? callQwenJson
            : config.provider === "minimax"
              ? callMiniMaxJson
              : config.provider === "deepseek"
                ? callDeepSeekJson
                : callDmxapiTextJson;
      const { parsed, model, route, routeLabel, attemptedRoutes } = await routedCall({
        model: config.model,
        temperature: 0.1,
        maxTokens: semanticMaxTokens,
        messages: buildMessages(input, analysis),
        responseFormat: semanticStructuredResponseFormat,
        timeoutMs: semanticTimeoutMs,
        missingKeyMessage: `缺少 ${config.envKey}`,
        scene: "semantic_review",
        allowDmxapi: config.provider === "deepseek" ? false : undefined,
        allowOfficial: config.provider === "dmxapi_text" ? false : undefined,
        fallbackParser: (message) => extractJsonBlock(message)
      });
      const displayProvider = resolveDisplayProvider({
        provider: config.provider,
        route,
        model: model || config.model
      });

      return {
        provider: displayProvider.provider,
        label: displayProvider.label,
        status: "ok",
        attemptedRoutes: Array.isArray(attemptedRoutes) ? attemptedRoutes : [],
        review: withReviewModelTrace(
          {
            ...normalizeSemanticPayload(parsed, displayProvider.provider, model || config.model),
            route,
            routeLabel
          },
          displayProvider.label
        )
      };
    } catch (error) {
      return {
        provider: config.provider,
        label: config.label,
        status: "error",
        model: String(error?.model || config.model || "").trim(),
        route: String(error?.route || "").trim(),
        routeLabel: String(error?.routeLabel || "").trim(),
        attemptedRoutes: Array.isArray(error?.attemptedRoutes) ? error.attemptedRoutes : [],
        message: error instanceof Error ? error.message : `${config.label} 请求失败`
      };
    }
  }

  const apiKey = String(process.env[config.envKey] || "").trim();

  if (!apiKey) {
    return {
      provider: config.provider,
      label: config.label,
      status: "unconfigured",
      model: config.model,
      message: `缺少 ${config.envKey}`
    };
  }

  const requestBody = {
    model: config.model,
    temperature: 0.1,
    max_tokens: semanticMaxTokens,
    messages: buildMessages(input, analysis)
  };

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), semanticTimeoutMs);
    let response;
    let data;

    try {
      response = await fetch(config.endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });
      data = await response.json().catch(() => ({}));
    } catch (error) {
      clearTimeout(timeoutId);

      if (error?.name === "AbortError") {
        return {
          provider: config.provider,
          label: config.label,
          status: "error",
          model: config.model,
          message: `${config.label} 语义复判超时（>${semanticTimeoutMs}ms）`
        };
      }

      return {
        provider: config.provider,
        label: config.label,
        status: "error",
        model: config.model,
        message: error instanceof Error ? error.message : `${config.label} 请求失败`
      };
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const message =
        data?.error?.message || data?.msg || data?.message || `${config.label} 请求失败，状态码 ${response.status}`;
      const isBusy = response.status === 429 || /访问量过大|rate limit|too many|余额不足|resource/i.test(message);

      if (isBusy && attempt === 0) {
        await sleep(900);
        continue;
      }

      return {
        provider: config.provider,
        label: config.label,
        status: "error",
        model: config.model,
        message
      };
    }

    const parsed = extractJsonBlock(flattenContent(data?.choices?.[0]?.message?.content));

    if (!parsed) {
      return {
        provider: config.provider,
        label: config.label,
        status: "error",
        model: config.model,
        message: `${config.label} 返回的语义复判结果不是有效 JSON`
      };
    }

    return {
      provider: config.provider,
      label: config.label,
      status: "ok",
      review: withReviewModelTrace(
        {
          ...normalizeSemanticPayload(parsed, config.provider, data?.model || config.model),
          route: "official",
          routeLabel: "官方"
        },
        config.label
      )
    };
  }

  return {
    provider: config.provider,
    label: config.label,
    status: "error",
    model: config.model,
    message: `${config.label} 暂时不可用`
  };
}

function stricterVerdict(left = "pass", right = "pass") {
  return (severityRank[left] ?? 0) >= (severityRank[right] ?? 0) ? left : right;
}

function softerVerdict(verdict = "pass") {
  if (verdict === "manual_review") {
    return "observe";
  }

  if (verdict === "observe") {
    return "pass";
  }

  return verdict;
}

function normalizeEvidenceScore(item = {}) {
  const retrievalWeight = Number(item?.retrievalWeight ?? item?.sampleWeight ?? 0);
  const confidence = Number(item?.confidence ?? item?.payload?.confidence ?? 0);
  const safeRetrievalWeight = Number.isFinite(retrievalWeight) ? Math.max(0, retrievalWeight) : 0;
  const confidenceBoost = Number.isFinite(confidence) && confidence > 0 ? Math.min(0.6, confidence * 0.4) : 0;

  return Math.round((safeRetrievalWeight + confidenceBoost) * 100) / 100;
}

function sumTopEvidenceScores(items = [], limit = 2) {
  return Math.round(
    (Array.isArray(items) ? items : [])
      .map((item) => normalizeEvidenceScore(item))
      .sort((left, right) => right - left)
      .slice(0, limit)
      .reduce((total, score) => total + score, 0) * 100
  ) / 100;
}

function uniqueSignalStrings(items = []) {
  return [...new Set((Array.isArray(items) ? items : []).map((item) => String(item || "").trim()).filter(Boolean))];
}

function buildMemoryCalibration(analysis = {}, baseVerdict = "pass") {
  const memoryContext = analysis?.memoryContext && typeof analysis.memoryContext === "object" ? analysis.memoryContext : null;
  const stableVerdict = String(baseVerdict || "pass").trim() || "pass";

  const baseCalibration = {
    applied: false,
    direction: "none",
    fromVerdict: stableVerdict,
    toVerdict: stableVerdict,
    riskScore: 0,
    safeScore: 0,
    categories: [],
    reasons: []
  };

  if (!memoryContext || stableVerdict === "hard_block") {
    return baseCalibration;
  }

  const riskFeedback = Array.isArray(memoryContext.riskFeedback) ? memoryContext.riskFeedback : [];
  const falsePositiveHints = Array.isArray(memoryContext.falsePositiveHints) ? memoryContext.falsePositiveHints : [];
  const referenceSamples = Array.isArray(memoryContext.referenceSamples) ? memoryContext.referenceSamples : [];

  const riskScore = sumTopEvidenceScores(riskFeedback, 2);
  const safeScore = Math.round((sumTopEvidenceScores(falsePositiveHints, 2) + sumTopEvidenceScores(referenceSamples, 2)) * 100) / 100;
  const riskCategories = uniqueSignalStrings(
    riskFeedback.flatMap((item) => [
      ...(Array.isArray(item?.riskCategories) ? item.riskCategories : []),
      item?.payload?.platformReason || "",
      item?.payload?.feedbackModelSuggestion?.suggestedCategory || ""
    ])
  );

  if (stableVerdict === "manual_review" && safeScore >= 2.4) {
    return {
      applied: true,
      direction: "safety_soften",
      fromVerdict: stableVerdict,
      toVerdict: softerVerdict(stableVerdict),
      riskScore,
      safeScore,
      categories: [],
      reasons: ["长期记忆命中高可信误报/参考样本，当前内容更接近历史安全表达，综合降为观察。"]
    };
  }

  if (stableVerdict === "pass" && riskScore >= 2.2) {
    return {
      applied: true,
      direction: "risk_raise",
      fromVerdict: stableVerdict,
      toVerdict: "observe",
      riskScore,
      safeScore,
      categories: riskCategories,
      reasons: ["长期记忆命中高相似违规案例，虽然当前规则与语义未直接拦截，仍建议提升为观察。"]
    };
  }

  if (stableVerdict === "observe" && riskScore >= 2.8 && safeScore < 2.4) {
    return {
      applied: true,
      direction: "risk_raise",
      fromVerdict: stableVerdict,
      toVerdict: "manual_review",
      riskScore,
      safeScore,
      categories: riskCategories,
      reasons: ["长期记忆显示相似内容存在较强违规先例，综合提升为人工复核。"]
    };
  }

  return {
    ...baseCalibration,
    riskScore,
    safeScore,
    categories: riskCategories
  };
}

export function mergeRuleAndSemanticAnalysis(analysis = {}, semanticReview = null) {
  const semantic = semanticReview?.status === "ok" ? semanticReview.review : null;
  const mergedVerdict = semantic ? stricterVerdict(analysis.verdict, semantic.verdict) : analysis.verdict;
  const memoryCalibration = buildMemoryCalibration(analysis, mergedVerdict);
  const finalVerdict = memoryCalibration.applied ? memoryCalibration.toVerdict : mergedVerdict;

  return {
    ...analysis,
    semanticReview,
    finalVerdictBeforeMemoryCalibration: mergedVerdict,
    memoryCalibration,
    finalVerdict,
    finalCategories: normalizeStringList([
      ...(analysis.categories || []),
      ...(semantic?.categories || []),
      ...(memoryCalibration?.categories || [])
    ]),
    finalReasons: normalizeStringList([
      ...((analysis.hits || []).map((hit) => hit.reason || hit.evidence || "").filter(Boolean)),
      ...(semantic?.reasons || []),
      semantic?.summary || "",
      ...((memoryCalibration?.reasons || []).filter(Boolean))
    ]),
    semanticEnabled: Boolean(semanticReview),
    semanticAvailable: Boolean(semantic)
  };
}

function hasSemanticReviewContent(input = {}) {
  return Boolean(
    String(input.title || "").trim() ||
      String(input.body || "").trim() ||
      String(input.coverText || "").trim() ||
      (Array.isArray(input.tags) && input.tags.length)
  );
}

function normalizeProvidersTriedForDisplay(result, config = {}) {
  return splitProviderResultForDisplay(result, {
    provider: config.provider,
    label: config.label,
    model: config.model
  }).map((item) => ({
    provider: item.provider,
    label: item.label,
    status: item.status,
    model: item.review?.model || item.model || config.model,
    route: item.review?.route || item.route || "",
    routeLabel: item.review?.routeLabel || item.routeLabel || "",
    attemptedRoutes: Array.isArray(item.attemptedRoutes)
      ? item.attemptedRoutes
      : item.review?.route
        ? [
            {
              route: item.review.route,
              routeLabel: item.review.routeLabel || "",
              model: item.review.model || "",
              status: item.status,
              message: item.message || ""
            }
          ]
        : [],
    message: item.message || ""
  }));
}

function buildUnavailableSemanticReviewResult(providersTried = []) {
  return {
    status: "unavailable",
    providersTried,
    message: providersTried.some((item) => item.status !== "unconfigured")
      ? "语义复判模型暂时不可用，已退回规则检测结果。"
      : "当前未配置语义复判模型，已退回规则检测结果。"
  };
}

export async function runSemanticReview({ input = {}, analysis = {}, modelSelection = "auto" }) {
  if (!hasSemanticReviewContent(input)) {
    return {
      status: "skipped",
      providersTried: [],
      message: "缺少可用于语义复判的内容。"
    };
  }

  const activeProviderConfigs = filterProviderConfigsBySelection(providerConfigs, modelSelection);
  const providersTried = [];

  for (const config of activeProviderConfigs) {
    const result = await callProvider(config, input, analysis);
    providersTried.push(...normalizeProvidersTriedForDisplay(result, config));

    if (result.status === "ok") {
      return {
        status: "ok",
        providersTried,
        review: result.review
      };
    }
  }

  return buildUnavailableSemanticReviewResult(providersTried);
}

export async function runSemanticReviewComparison({ input = {}, analysis = {}, compareSelections = [] } = {}) {
  const selectionOptions = getSemanticComparisonSelections(compareSelections);

  if (!hasSemanticReviewContent(input)) {
    return selectionOptions.map((item) => ({
      selection: item.value,
      label: item.label,
      durationMs: 0,
      semanticReview: {
        status: "skipped",
        providersTried: [],
        message: "缺少可用于语义复判的内容。"
      },
      mergedAnalysis: mergeRuleAndSemanticAnalysis(analysis, {
        status: "skipped",
        providersTried: [],
        message: "缺少可用于语义复判的内容。"
      })
    }));
  }

  const results = await Promise.all(
    selectionOptions.map(async (item) => {
      const startedAt = Date.now();
      const activeProviderConfigs = filterProviderConfigsBySelection(providerConfigs, item.value);
      const providersTried = [];

      for (const config of activeProviderConfigs) {
        const result = await callProvider(config, input, analysis);
        providersTried.push(...normalizeProvidersTriedForDisplay(result, config));

        if (result.status === "ok") {
          const semanticReview = {
            status: "ok",
            providersTried,
            review: result.review
          };

          return {
            selection: item.value,
            label: item.label,
            durationMs: Date.now() - startedAt,
            semanticReview,
            mergedAnalysis: mergeRuleAndSemanticAnalysis(analysis, semanticReview)
          };
        }
      }

      const semanticReview = buildUnavailableSemanticReviewResult(providersTried);

      return {
        selection: item.value,
        label: item.label,
        durationMs: Date.now() - startedAt,
        semanticReview,
        mergedAnalysis: mergeRuleAndSemanticAnalysis(analysis, semanticReview)
      };
    })
  );

  return results;
}
