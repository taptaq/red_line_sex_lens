import "./env.js";
import { callDeepSeekJson, callGlmJson, callMiniMaxJson, callQwenJson } from "./glm.js";
import { filterProviderConfigsBySelection } from "./model-selection.js";
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
    model: process.env.GLM_CROSS_REVIEW_MODEL || "glm-4-flash"
  },
  {
    provider: "qwen",
    label: "通义千问",
    envKey: "DASHSCOPE_API_KEY",
    endpoint: "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
    model: process.env.QWEN_CROSS_REVIEW_MODEL || "qwen-plus"
  },
  {
    provider: "minimax",
    label: "MiniMax",
    envKey: "DMXAPI_API_KEY",
    endpoint: "https://www.dmxapi.cn/v1/chat/completions",
    model: process.env.MINIMAX_DMXAPI_MODEL || "MiniMax-M2.7-free"
  },
  {
    provider: "deepseek",
    label: "深度求索",
    envKey: "DEEPSEEK_API_KEY",
    endpoint: "https://api.deepseek.com/chat/completions",
    model: process.env.DEEPSEEK_CROSS_REVIEW_MODEL || "deepseek-v4-flash"
  }
];
const providerTimeoutMs = Number(process.env.CROSS_REVIEW_TIMEOUT_MS || 15000);
const crossReviewMaxTokens = Number(process.env.CROSS_REVIEW_MAX_TOKENS || 900);

function summarizeAnalysis(analysis = {}) {
  const hits = Array.isArray(analysis.hits) ? analysis.hits : [];

  return hits.slice(0, 5).map((hit) => ({
    category: String(hit.category || "").trim(),
    riskLevel: String(hit.riskLevel || "").trim(),
    reason: String(hit.reason || hit.evidence || "").trim(),
    fields: Array.isArray(hit.fields) ? hit.fields.slice(0, 3) : []
  }));
}

function createError(message, statusCode = 500) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

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

function normalizeReviewPayload(payload, provider, model) {
  const confidence = Number(payload?.confidence);

  return {
    provider,
    model: String(payload?.model || model).trim(),
    verdict: normalizeVerdict(payload?.verdict),
    confidence: Number.isFinite(confidence) ? Math.max(0, Math.min(1, confidence)) : null,
    categories: normalizeStringList(payload?.categories),
    reasons: normalizeStringList(payload?.reasons),
    falsePositiveRisk: String(payload?.falsePositiveRisk || "").trim(),
    falseNegativeRisk: String(payload?.falseNegativeRisk || "").trim(),
    summary: String(payload?.summary || "").trim()
  };
}

function buildMessages(input, analysis) {
  return [
    {
      role: "system",
      content: [
        "你现在扮演小红书内容安全审核团队中的复判员。",
        "你的任务不是帮人规避审核，而是判断内容在两性、身体探索、亲密关系等语境下是否可能违规。",
        "请按小红书审核语境复判，重点关注导流、低俗擦边、未成年人、教程化敏感内容、夸大承诺。",
        "请结合原文与规则检测摘要独立复判。",
        "输出必须是 JSON。"
      ].join("\n")
    },
    {
      role: "user",
      content: [
        "请对下面内容做小红书语境下的合规复判，只返回 JSON。",
        "字段格式：",
        "{",
        '  "verdict": "hard_block | manual_review | observe | pass",',
        '  "confidence": 0.0,',
        '  "categories": ["风险类别1"],',
        '  "reasons": ["一句话原因1", "一句话原因2"],',
        '  "falsePositiveRisk": "如果当前规则检测可能偏严，这里说明原因，没有就留空",',
        '  "falseNegativeRisk": "如果当前规则检测可能漏掉风险，这里说明原因，没有就留空",',
        '  "summary": "一句话总结复判结论"',
        "}",
        "判定原则：",
        "1. 出现导流、未成年人敏感组合、明显低俗挑逗、教程化敏感内容时，优先给 hard_block 或 manual_review。",
        "2. 教育、沟通、健康、科普语境更偏 observe 或 pass。",
        "3. 如果拿不准，不要直接给 pass，优先 manual_review。",
        "4. reasons 控制在 2-3 条，简明具体。",
        "",
        `标题：${String(input.title || "")}`,
        `正文：${String(input.body || "")}`,
        `封面文案：${String(input.coverText || "")}`,
        `标签：${Array.isArray(input.tags) ? input.tags.join("、") : String(input.tags || "")}`,
        `规则检测结论：${String(analysis.verdict || "")}`,
        `规则命中摘要：${JSON.stringify(summarizeAnalysis(analysis))}`,
        `规则建议：${JSON.stringify((analysis.suggestions || []).slice(0, 3))}`
      ].join("\n")
    }
  ];
}

async function callProvider(config, input, analysis) {
  if (config.provider === "glm" || config.provider === "qwen" || config.provider === "minimax" || config.provider === "deepseek") {
    try {
      const routedCall =
        config.provider === "glm"
          ? callGlmJson
          : config.provider === "qwen"
            ? callQwenJson
            : config.provider === "minimax"
              ? callMiniMaxJson
              : callDeepSeekJson;
      const { parsed, model, route, routeLabel, attemptedRoutes } = await routedCall({
        model: config.model,
        temperature: 0.1,
        maxTokens: crossReviewMaxTokens,
        messages: buildMessages(input, analysis),
        timeoutMs: providerTimeoutMs,
        missingKeyMessage: `缺少 ${config.envKey}`,
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
        review: {
          ...normalizeReviewPayload(parsed, displayProvider.provider, model || config.model),
          route,
          routeLabel
        }
      };
    } catch (error) {
      return {
        provider: config.provider,
        label: config.label,
        status: "error",
        model: config.model,
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
    max_tokens: crossReviewMaxTokens,
    messages: buildMessages(input, analysis)
  };

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), providerTimeoutMs);
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
          message: `${config.label} 复判超时（>${providerTimeoutMs}ms）`
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
        message: `${config.label} 返回的复判结果不是有效 JSON`
      };
    }

    return {
      provider: config.provider,
      label: config.label,
      status: "ok",
      review: normalizeReviewPayload(parsed, config.provider, data?.model || config.model)
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

function aggregateReviews(providerResults, analysisVerdict) {
  const okResults = providerResults.filter((item) => item.status === "ok").map((item) => item.review);

  if (!okResults.length) {
    return {
      configuredProviders: providerResults.filter((item) => item.status !== "unconfigured").length,
      availableReviews: 0,
      consensus: "unavailable",
      analysisVerdict,
      recommendedVerdict: analysisVerdict || "manual_review",
      categories: [],
      reasons: [],
      falsePositiveSignals: [],
      falseNegativeSignals: []
    };
  }

  const verdictCounts = new Map();

  for (const item of okResults) {
    verdictCounts.set(item.verdict, (verdictCounts.get(item.verdict) || 0) + 1);
  }

  const sorted = [...verdictCounts.entries()].sort((a, b) => {
    if (b[1] !== a[1]) {
      return b[1] - a[1];
    }

    return severityRank[b[0]] - severityRank[a[0]];
  });

  const [topVerdict, topCount] = sorted[0];
  const secondCount = sorted[1]?.[1] || 0;

  let consensus = "single";
  if (okResults.length > 1 && sorted.length === 1) {
    consensus = "unanimous";
  } else if (okResults.length > 1 && topCount > secondCount) {
    consensus = "majority";
  } else if (okResults.length > 1) {
    consensus = "split";
  }

  let recommendedVerdict = topVerdict;
  if (consensus === "split") {
    recommendedVerdict = okResults.some((item) => item.verdict === "hard_block")
      ? "manual_review"
      : topVerdict;
  }

  return {
    configuredProviders: providerResults.filter((item) => item.status !== "unconfigured").length,
    availableReviews: okResults.length,
    consensus,
    analysisVerdict,
    recommendedVerdict,
    categories: normalizeStringList(okResults.flatMap((item) => item.categories)),
    reasons: normalizeStringList(okResults.flatMap((item) => item.reasons)),
    falsePositiveSignals: normalizeStringList(okResults.map((item) => item.falsePositiveRisk)),
    falseNegativeSignals: normalizeStringList(okResults.map((item) => item.falseNegativeRisk))
  };
}

export async function runCrossModelReview({ input = {}, analysis = {}, modelSelection = "group" }) {
  const activeProviderConfigs = filterProviderConfigsBySelection(providerConfigs, modelSelection);
  const rawProviderResults = await Promise.all(activeProviderConfigs.map((config) => callProvider(config, input, analysis)));
  const providerResults = rawProviderResults.flatMap((result, index) =>
    splitProviderResultForDisplay(result, {
      provider: activeProviderConfigs[index]?.provider,
      label: activeProviderConfigs[index]?.label,
      model: activeProviderConfigs[index]?.model
    })
  );

  return {
    providers: providerResults,
    aggregate: aggregateReviews(providerResults, analysis.verdict)
  };
}
