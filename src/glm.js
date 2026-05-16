import "./env.js";
import fs from "node:fs/promises";
import path from "node:path";
import { abstractReasonPhraseLabels, feedbackContextCategories } from "./feedback.js";
import { filterProviderConfigsBySelection, getRewriteProviderSelection, getRewriteSelectionModel } from "./model-selection.js";
import { formatInnerSpaceTermsPrompt } from "./inner-space-terms.js";
import { buildXhsHumanizerSystemRules, buildXhsHumanizerUserRequirements } from "./xhs-humanizer-rules.js";

const glmEndpoint = "https://open.bigmodel.cn/api/paas/v4/chat/completions";
const defaultKimiEndpoint = "https://api.moonshot.cn/v1/chat/completions";
const defaultDmxapiEndpoint = "https://www.dmxapi.cn/v1/chat/completions";
const defaultVisionModel = process.env.GLM_VISION_MODEL || "glm-4.6v";
const defaultTextModel = process.env.GLM_TEXT_MODEL || "glm-4.6v";
const defaultKimiTextModel = "kimi-k2.6";
const defaultFeedbackModel = process.env.GLM_FEEDBACK_MODEL || defaultTextModel || "glm-4.6v";
const defaultQwenFeedbackModel = process.env.QWEN_DMXAPI_MODEL || "qwen3.5-plus-2026-02-15";
const defaultMiniMaxDmxapiModel = process.env.MINIMAX_DMXAPI_MODEL || "MiniMax-M2.5";
const defaultGlmDmxapiModel = process.env.GLM_DMXAPI_MODEL || "glm-5.1";
const defaultQwenDmxapiModel = process.env.QWEN_DMXAPI_MODEL || "qwen3.5-plus-2026-02-15";
const defaultDeepSeekFeedbackModel = process.env.DEEPSEEK_FEEDBACK_MODEL || "deepseek-v4-flash";
const humanizerPassEnabled = process.env.HUMANIZER_PASS_ENABLED !== "false";
const feedbackModelCandidates = [defaultFeedbackModel, "glm-4.6-flashX"].filter(
  (item, index, list) => item && list.indexOf(item) === index
);
const feedbackSuggestTimeoutMs = Number(process.env.FEEDBACK_SUGGEST_TIMEOUT_MS || 12000);
const feedbackProviderConfigs = [
  {
    provider: "glm",
    label: "智谱 GLM",
    envKey: "GLM_API_KEY",
    endpoint: glmEndpoint,
    models: feedbackModelCandidates
  },
  {
    provider: "qwen",
    label: "通义千问",
    envKey: "DMXAPI_API_KEY",
    endpoint: defaultDmxapiEndpoint,
    models: [defaultQwenFeedbackModel],
    routeMode: "dmxapi_only"
  },
  {
    provider: "deepseek",
    label: "深度求索",
    envKey: "DEEPSEEK_API_KEY",
    endpoint: "https://api.deepseek.com/chat/completions",
    models: [defaultDeepSeekFeedbackModel],
    routeMode: "official_only"
  }
];

export const rewriteGenerationConfig = {
  baseMaxTokens: Number(process.env.REWRITE_MAX_TOKENS || 3200),
  patchMaxTokens: Number(process.env.REWRITE_PATCH_MAX_TOKENS || 1400),
  humanizerMaxTokens: Number(process.env.REWRITE_HUMANIZER_MAX_TOKENS || 3000),
  maxAttempts: Number(process.env.REWRITE_MAX_ATTEMPTS || 3),
  retryHistoryLimit: Math.max(1, Number(process.env.REWRITE_RETRY_HISTORY_LIMIT || 1))
};

function uniqueNonEmpty(items = []) {
  return items.filter((item, index, list) => item && list.indexOf(item) === index);
}

function getDefaultTextModel() {
  return String(process.env.GLM_TEXT_MODEL || defaultTextModel || "glm-4.6v").trim();
}

function getGlmTextModelCandidates() {
  return uniqueNonEmpty([getDefaultTextModel(), "glm-4.7"]);
}

function getKimiEndpoint() {
  return String(process.env.KIMI_BASE_URL || defaultKimiEndpoint).trim();
}

function getDefaultKimiTextModel() {
  return String(process.env.KIMI_TEXT_MODEL || defaultKimiTextModel || "kimi-k2.6").trim();
}

function getDefaultQwenDmxapiModel() {
  return String(process.env.QWEN_DMXAPI_MODEL || defaultQwenDmxapiModel || "qwen3.5-plus-2026-02-15").trim();
}

function getDefaultMiniMaxDmxapiModel() {
  return String(process.env.MINIMAX_DMXAPI_MODEL || defaultMiniMaxDmxapiModel || "MiniMax-M2.5").trim();
}

function getDefaultGlmDmxapiModel() {
  return String(process.env.GLM_DMXAPI_MODEL || defaultGlmDmxapiModel || "glm-5.1").trim();
}

function getRewriteProviderPreference() {
  const provider = String(process.env.REWRITE_PROVIDER || "glm").trim().toLowerCase();

  return provider === "kimi" ? "kimi" : "glm";
}

export function getRewriteProviderConfig(modelSelection = "auto") {
  const provider = String(modelSelection || "").trim() ? getRewriteProviderSelection(modelSelection) : getRewriteProviderPreference();
  const standaloneModel = String(modelSelection || "").trim() ? getRewriteSelectionModel(modelSelection) : "";

  if (provider === "dmxapi_text") {
    return {
      provider: "dmxapi_text",
      label: "DMXAPI",
      envKey: "DMXAPI_API_KEY",
      endpoint: defaultDmxapiEndpoint,
      models: uniqueNonEmpty([standaloneModel]),
      routeMode: "dmxapi_only"
    };
  }

  if (provider === "kimi") {
    return {
      provider: "kimi",
      label: "Kimi",
      envKey: "KIMI_API_KEY",
      endpoint: getKimiEndpoint(),
      models: uniqueNonEmpty([getDefaultKimiTextModel()])
    };
  }

  if (provider === "qwen") {
    return {
      provider: "qwen",
      label: "通义千问",
      envKey: "DMXAPI_API_KEY",
      endpoint: defaultDmxapiEndpoint,
      models: uniqueNonEmpty([defaultQwenFeedbackModel]),
      routeMode: "dmxapi_only"
    };
  }

  if (provider === "minimax") {
    return {
      provider: "minimax",
      label: "MiniMax",
      envKey: "DMXAPI_API_KEY",
      endpoint: defaultDmxapiEndpoint,
      models: uniqueNonEmpty([defaultMiniMaxDmxapiModel])
    };
  }

  if (provider === "deepseek") {
    return {
      provider: "deepseek",
      label: "深度求索",
      envKey: "DEEPSEEK_API_KEY",
      endpoint: "https://api.deepseek.com/chat/completions",
      models: uniqueNonEmpty([defaultDeepSeekFeedbackModel]),
      routeMode: "official_only"
    };
  }

  return {
    provider: "glm",
    label: "智谱 GLM",
    envKey: "GLM_API_KEY",
    endpoint: glmEndpoint,
    models: getGlmTextModelCandidates()
  };
}

function createGlmError(message, statusCode = 500) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function guessMimeType(filePath = "") {
  const extension = path.extname(filePath).toLowerCase();

  if (extension === ".png") return "image/png";
  if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
  if (extension === ".webp") return "image/webp";
  if (extension === ".gif") return "image/gif";

  return "image/png";
}

function ensureImageDataUrl(imageDataUrl, mimeType = "image/png") {
  const input = String(imageDataUrl || "").trim();

  if (!input) {
    throw new Error("缺少待识别的截图内容。");
  }

  if (input.startsWith("data:image/")) {
    return input;
  }

  return `data:${mimeType};base64,${input}`;
}

function flattenContent(content) {
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((item) => flattenContent(item))
      .filter(Boolean)
      .join("\n");
  }

  if (!content || typeof content !== "object") {
    return "";
  }

  if (typeof content.text === "string") {
    return content.text;
  }

  if (typeof content.output_text === "string") {
    return content.output_text;
  }

  if (typeof content.content === "string") {
    return content.content;
  }

  if (typeof content.arguments === "string") {
    return content.arguments;
  }

  if (typeof content.reasoning_content === "string") {
    return content.reasoning_content;
  }

  if (typeof content.reasoning === "string") {
    return content.reasoning;
  }

  if (typeof content.message === "string") {
    return content.message;
  }

  if (Array.isArray(content.content)) {
    return flattenContent(content.content);
  }

  if (Array.isArray(content.parts)) {
    return flattenContent(content.parts);
  }

  if (Array.isArray(content.items)) {
    return flattenContent(content.items);
  }

  if (Array.isArray(content.tool_calls)) {
    return flattenContent(content.tool_calls);
  }

  if (content.function_call) {
    return flattenContent(content.function_call);
  }

  if (content.delta) {
    return flattenContent(content.delta);
  }

  if (content.message && typeof content.message === "object") {
    return flattenContent(content.message);
  }

  if (content.output && typeof content.output === "object") {
    return flattenContent(content.output);
  }

  if (content.response && typeof content.response === "object") {
    return flattenContent(content.response);
  }

  if (content.data && typeof content.data === "object") {
    return flattenContent(content.data);
  }

  return "";
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

  const balanced = extractBalancedJsonSegment(normalized);

  if (balanced) {
    try {
      return JSON.parse(balanced);
    } catch {}
  }

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

function extractBalancedJsonSegment(text) {
  const source = String(text || "");
  const start = source.search(/[\{\[]/);

  if (start === -1) {
    return "";
  }

  const stack = [];
  let inString = false;
  let escaped = false;

  for (let index = start; index < source.length; index += 1) {
    const char = source[index];

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }

      if (char === "\\") {
        escaped = true;
        continue;
      }

      if (char === '"') {
        inString = false;
      }

      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === "{" || char === "[") {
      stack.push(char);
      continue;
    }

    if (char === "}" || char === "]") {
      const open = stack[stack.length - 1];
      const matched = (open === "{" && char === "}") || (open === "[" && char === "]");

      if (!matched) {
        return "";
      }

      stack.pop();

      if (!stack.length) {
        return source.slice(start, index + 1);
      }
    }
  }

  return "";
}

function sanitizeJsonLikeText(text) {
  return String(text || "")
    .trim()
    .replace(/^\uFEFF/, "")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, '"')
    .replace(/[\u300C\u300D]/g, '"')
    .replace(/[\u300E\u300F]/g, '"')
    .replace(/[\uFF02]/g, '"')
    .replace(/[\uFF1A]/g, ":")
    .replace(/[\uFF0C]/g, ",");
}

function escapeControlCharsInsideStrings(text) {
  const source = String(text || "");
  let inString = false;
  let escaped = false;
  let result = "";

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];

    if (inString) {
      if (escaped) {
        result += char;
        escaped = false;
        continue;
      }

      if (char === "\\") {
        result += char;
        escaped = true;
        continue;
      }

      if (char === '"') {
        result += char;
        inString = false;
        continue;
      }

      if (char === "\n") {
        result += "\\n";
        continue;
      }

      if (char === "\r") {
        result += "\\r";
        continue;
      }

      if (char === "\t") {
        result += "\\t";
        continue;
      }

      result += char;
      continue;
    }

    if (char === '"') {
      inString = true;
    }

    result += char;
  }

  return result;
}

function escapeLikelyUnescapedQuotesInsideStrings(text) {
  const source = String(text || "");
  let inString = false;
  let escaped = false;
  let result = "";

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];

    if (!inString) {
      if (char === '"') {
        inString = true;
      }

      result += char;
      continue;
    }

    if (escaped) {
      result += char;
      escaped = false;
      continue;
    }

    if (char === "\\") {
      result += char;
      escaped = true;
      continue;
    }

    if (char === '"') {
      const nextSignificant = source.slice(index + 1).match(/\S/)?.[0] || "";

      if (!nextSignificant || [",", "}", "]", ":"].includes(nextSignificant)) {
        result += char;
        inString = false;
        continue;
      }

      result += '\\"';
      continue;
    }

    result += char;
  }

  return result;
}

function stripTrailingCommas(text) {
  return String(text || "").replace(/,\s*([}\]])/g, "$1");
}

function closeIncompleteJsonStructure(text) {
  const source = String(text || "").trim();

  if (!source) {
    return "";
  }

  const stack = [];
  let inString = false;
  let escaped = false;
  let result = source;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }

      if (char === "\\") {
        escaped = true;
        continue;
      }

      if (char === '"') {
        inString = false;
      }

      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === "{" || char === "[") {
      stack.push(char);
      continue;
    }

    if (char === "}" || char === "]") {
      const open = stack[stack.length - 1];
      const matched = (open === "{" && char === "}") || (open === "[" && char === "]");

      if (matched) {
        stack.pop();
      }
    }
  }

  if (inString) {
    result += '"';
  }

  while (stack.length) {
    const open = stack.pop();
    result += open === "{" ? "}" : "]";
  }

  return result;
}

function tryParseJson(text) {
  const direct = extractJsonBlock(text);

  if (direct) {
    return direct;
  }

  const sanitized = sanitizeJsonLikeText(text);

  if (sanitized !== String(text || "").trim()) {
    const reparsed = extractJsonBlock(sanitized);

    if (reparsed) {
      return reparsed;
    }
  }

  const quoteRepaired = escapeLikelyUnescapedQuotesInsideStrings(sanitized);

  if (quoteRepaired && quoteRepaired !== sanitized) {
    const reparsedQuotes = extractJsonBlock(quoteRepaired);

    if (reparsedQuotes) {
      return reparsedQuotes;
    }
  }

  const repairedSource = quoteRepaired || sanitized;
  const repaired = stripTrailingCommas(escapeControlCharsInsideStrings(repairedSource));

  if (repaired && repaired !== sanitized) {
    return extractJsonBlock(repaired);
  }

  const closed = closeIncompleteJsonStructure(repaired || sanitized);

  if (closed && closed !== repaired && closed !== sanitized) {
    const reparsedClosed = extractJsonBlock(closed);

    if (reparsedClosed) {
      return reparsedClosed;
    }
  }

  const repairedBalanced = extractBalancedJsonSegment(repaired);

  if (repairedBalanced) {
    try {
      return JSON.parse(repairedBalanced);
    } catch {}
  }

  return null;
}

const jsonShapeHintKeys = new Set([
  "title",
  "body",
  "coverText",
  "tags",
  "rewriteNotes",
  "safetyNotes",
  "platformReason",
  "suspiciousPhrases",
  "extractedText",
  "summary",
  "confidence",
  "verdict",
  "categories",
  "reasons",
  "implicitSignals",
  "safeSignals",
  "falsePositiveRisk",
  "falseNegativeRisk",
  "contextCategories"
]);

function looksLikeJsonPayload(value) {
  return Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      Object.keys(value).some((key) => jsonShapeHintKeys.has(key))
  );
}

function tryParseJsonFromUnknown(value) {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    return tryParseJson(value);
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const parsed = tryParseJsonFromUnknown(item);

      if (parsed) {
        return parsed;
      }
    }

    const flattened = flattenContent(value);
    return flattened ? tryParseJson(flattened) : null;
  }

  if (typeof value !== "object") {
    return null;
  }

  if (looksLikeJsonPayload(value)) {
    return value;
  }

  const directCandidates = [
    value.parsed,
    value.json,
    value.result,
    value.output,
    value.response,
    value.data,
    value.message,
    value.delta
  ];

  for (const candidate of directCandidates) {
    const parsed = tryParseJsonFromUnknown(candidate);

    if (parsed) {
      return parsed;
    }
  }

  if (typeof value.arguments === "string") {
    const parsed = tryParseJson(value.arguments);

    if (parsed) {
      return parsed;
    }
  }

  if (value.function_call?.arguments) {
    const parsed = tryParseJsonFromUnknown(value.function_call.arguments);

    if (parsed) {
      return parsed;
    }
  }

  if (Array.isArray(value.tool_calls)) {
    for (const call of value.tool_calls) {
      const parsed = tryParseJsonFromUnknown(call?.function?.arguments || call?.arguments || call);

      if (parsed) {
        return parsed;
      }
    }
  }

  const flattened = flattenContent(value);
  return flattened ? tryParseJson(flattened) : null;
}

function buildPreviewText(value, maxLength = 240) {
  if (typeof value === "string") {
    return sanitizeJsonLikeText(value).slice(0, maxLength);
  }

  if (!value) {
    return "";
  }

  try {
    return sanitizeJsonLikeText(JSON.stringify(value)).slice(0, maxLength);
  } catch {
    return sanitizeJsonLikeText(String(value)).slice(0, maxLength);
  }
}

function normalizeMemorySampleTitle(sample = {}) {
  return String(sample.payload?.note?.title || sample.payload?.title || sample.title || "").trim();
}

function normalizeMemorySampleBody(sample = {}) {
  return String(sample.payload?.note?.body || sample.payload?.body || sample.body || "").trim();
}

function buildRewriteSharedMemoryPrompt(memoryContext = null) {
  if (!memoryContext || typeof memoryContext !== "object") {
    return "";
  }

  const referenceSection = Array.isArray(memoryContext.referenceSamples)
    ? memoryContext.referenceSamples
        .slice(0, 3)
        .map((sample, index) => {
          const title = normalizeMemorySampleTitle(sample);
          const body = normalizeMemorySampleBody(sample);
          const lines = [`共享参考样本 ${index + 1}：${title || "未命名样本"}`];

          if (body) {
            lines.push(`成功样本可借鉴点：${body.slice(0, 120)}`);
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
          const summary = String(card.summary || card.title || "").trim();

          if (!summary) {
            return "";
          }

          return `改写策略记忆 ${index + 1}：${summary}`;
        })
        .filter(Boolean)
        .join("\n")
    : "";

  const riskCategories = uniqueNonEmpty(
    (Array.isArray(memoryContext.riskFeedback) ? memoryContext.riskFeedback : []).flatMap((item) =>
      Array.isArray(item?.riskCategories) ? item.riskCategories : []
    )
  );
  const riskSection = riskCategories.length
    ? `风险边界总结：相似受限案例主要集中在 ${riskCategories.join("、")}，这次优先弱化相关动作感、交易感和刺激感。`
    : "";
  const falsePositiveSection = Array.isArray(memoryContext.falsePositiveHints) && memoryContext.falsePositiveHints.length
    ? "误报保护提示：历史相似放行样本说明，中性经验分享、克制表达和非导流语气可以尽量保留，不要为了求稳过度改写。"
    : "";

  return [
    referenceSection ? `共享记忆提示：\n${referenceSection}` : "",
    cardSection ? `改写策略记忆：\n${cardSection}` : "",
    riskSection,
    falsePositiveSection
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function buildRewriteMessages({ input = {}, analysis = {}, semantic = null, innerSpaceTerms = [] } = {}) {
  const retryGuidance = analysis?.retryGuidance && typeof analysis.retryGuidance === "object" ? analysis.retryGuidance : null;
  const retryHistory = Array.isArray(analysis?.retryHistory)
    ? analysis.retryHistory.slice(-rewriteGenerationConfig.retryHistoryLimit)
    : [];
  const terminologyPrompt = formatInnerSpaceTermsPrompt(innerSpaceTerms);
  const sharedMemoryPrompt = buildRewriteSharedMemoryPrompt(analysis?.memoryContext);

  return [
    {
      role: "system",
      content: [
        "你是小红书内容安全团队中的中文合规编辑与改写助手。",
        "目标是帮助用户在尽量保留原笔记风格、人设、语气、节奏、表达习惯的前提下，把内容改写得更安全，而不是把原文改成模板化科普文，也不是帮助规避审核。",
        "改写风格要自然、幽默风趣、说人话，像朋友聊天式分享，像真实的人在轻松交流，而不是模板化生成。",
        "请优先按小红书内容审核语境理解风险，尤其关注导流、低俗擦边、未成年人、教程化敏感内容、夸大承诺。",
        "你需要同时参考规则层风险和语义层风险，尤其关注隐晦导流、暗示性表达、擦边氛围、角色扮演、人设诱导、场景化刺激、两性用品宣传展示语境。",
        "不得输出导流、站外联系方式、夸大承诺、挑逗化标题、未成年人敏感组合、教程化敏感步骤。",
        "如果原文是口语化、分享感、经验感、轻松语气、种草语气，请尽量保留这种风格；只修改真正有风险的部分。",
        "改写应遵循最小必要改动原则：能局部替换就不要整段重写，能弱化就不要彻底改风格。",
        "请只返回 JSON。"
      ].join("\n")
    },
    {
      role: "user",
      content: [
        "请根据下面的原始内容和检测结果，输出一个更稳妥的改写版本。",
        "要求：",
        "1. 尽量保留原本想表达的核心主题。",
        "2. 尽量保持原文的说话方式、句子长短、口吻、轻重节奏、分享感和人设，不要偏离原笔记风格。",
        "3. 如果原文有高风险点，优先做最小必要改写：删掉、替换、弱化、改写局部表达，而不是整体换一种文风。",
        "4. 只有在原风格本身明显过于擦边、过于交易化、过于教程化时，才允许适度往教育、沟通、健康表达上收。",
        "5. 不要编造医疗功效、绝对化承诺或联系方式。",
        "6. tags 给 0-5 个更稳妥、但仍然贴近原内容风格的标签。",
        "7. body 必须尽量保留原文的信息量和段落结构，不要把正文缩成摘要、提纲或短版。",
        "8. 除非为删除高风险内容所必需，不要明显缩短正文篇幅；如果原文有三段，改写后也应尽量保持接近的段落数量。",
        "9. 语言风格要自然、幽默风趣、说人话，有真实分享感，更像朋友聊天式分享，但不要低俗、油腻、浮夸。",
        "10. 读起来要像朋友之间顺手分享经验、感受和观察，不要像上课、不要像培训、不要像公号文章。",
        "输出格式：",
        "{",
        '  "title": "改写后的标题",',
        '  "body": "改写后的正文",',
        '  "coverText": "改写后的封面文案",',
        '  "tags": ["标签1", "标签2"],',
        '  "rewriteNotes": "一句话说明主要改写了什么",',
        '  "safetyNotes": "一句话提示仍需人工留意的点，没有就给空字符串"',
        "}",
        "",
        `原始标题：${String(input.title || "")}`,
        `原始正文：${String(input.body || "")}`,
        `原始封面文案：${String(input.coverText || "")}`,
        `原始标签：${Array.isArray(input.tags) ? input.tags.join("、") : String(input.tags || "")}`,
        `规则检测结论：${String(analysis.verdict || "")}`,
        `综合检测结论：${String(analysis.finalVerdict || analysis.verdict || "")}`,
        `命中项：${JSON.stringify(analysis.hits || [], null, 2)}`,
        `建议：${JSON.stringify(analysis.suggestions || [], null, 2)}`,
        `语义风险分类：${JSON.stringify(semantic?.categories || [])}`,
        `语义风险原因：${JSON.stringify(semantic?.reasons || [])}`,
        `语义隐含信号：${JSON.stringify(semantic?.implicitSignals || [])}`,
        `语义正向信号：${JSON.stringify(semantic?.safeSignals || [])}`,
        `语义摘要：${JSON.stringify(semantic?.summary || "")}`,
        `语义改写建议：${JSON.stringify(semantic?.suggestion || "")}`,
        sharedMemoryPrompt,
        retryGuidance ? `当前是第 ${Number(retryGuidance.attempt || 0) + 1} 轮自动改写。` : "",
        retryGuidance ? `上一轮复判摘要：${String(retryGuidance.summary || "")}` : "",
        retryGuidance ? `上一轮优先修正点：${JSON.stringify(retryGuidance.focusPoints || [])}` : "",
        retryHistory.length
          ? `最近几轮复盘轨迹：${JSON.stringify(
              retryHistory.map((item) => ({
                attempt: item.attempt,
                summary: item.summary,
                focusPoints: item.focusPoints
              }))
            )}`
          : "",
        terminologyPrompt,
        "",
        "改写偏好补充：",
        "1. 不要把所有内容都改成统一的官方科普腔。",
        "2. 不要无故拔高措辞，不要写得太像说明书。",
        "3. 能保留原来的分享感、口语感、记录感，就尽量保留。",
        "4. rewriteNotes 请说明你主要改掉了哪些风险点；如果保留了原风格，也请点明。",
        retryGuidance ? "5. 这次不要泛泛重写，请优先针对上一轮复判指出的问题做定向修改。" : ""
      ].join("\n")
    }
  ];
}

export function buildPatchMessages({ input = {}, analysis = {}, semantic = null, innerSpaceTerms = [] } = {}) {
  const retryGuidance = analysis?.retryGuidance && typeof analysis.retryGuidance === "object" ? analysis.retryGuidance : null;
  const retryHistory = Array.isArray(analysis?.retryHistory)
    ? analysis.retryHistory.slice(-rewriteGenerationConfig.retryHistoryLimit)
    : [];
  const terminologyPrompt = formatInnerSpaceTermsPrompt(innerSpaceTerms);
  const sharedMemoryPrompt = buildRewriteSharedMemoryPrompt(analysis?.memoryContext);
  const compactHits = Array.isArray(analysis?.hits)
    ? analysis.hits.slice(0, 4).map((item) => ({
        category: String(item?.category || "").trim(),
        reason: String(item?.reason || "").trim()
      }))
    : [];

  return [
    {
      role: "system",
      content: [
        "你是小红书内容安全团队中的中文合规编辑助手。",
        "这一次不要整稿重写，优先输出局部 patch，用最小必要修改消除上一轮暴露出来的风险点。",
        "patch 必须能直接映射到当前文本中的具体片段，target 必须是当前字段里能精确找到的原文。",
        "只有当局部 patch 无法解决问题时，才允许对单个字段给出完整兜底重写。",
        "请只返回 JSON。"
      ].join("\n")
    },
    {
      role: "user",
      content: [
        "请根据上一轮复判建议，对当前版本做定向修补。",
        "输出格式：",
        "{",
        '  "patches": [',
        "    {",
        '      "field": "title | body | coverText",',
        '      "target": "当前文本里要替换的原句或短语",',
        '      "replaceWith": "替换后的文本",',
        '      "reason": "为什么这么改",',
        '      "addresses": "对应解决的建议点"',
        "    }",
        "  ],",
        '  "title": "如果必须整段重写标题，这里给完整标题；否则留空",',
        '  "body": "如果必须整段重写正文，这里给完整正文；否则留空",',
        '  "coverText": "如果必须整段重写封面文案，这里给完整文案；否则留空",',
        '  "tags": ["需要更新时再给标签"],',
        '  "rewriteNotes": "一句话说明本轮主要修了哪些点",',
        '  "safetyNotes": "一句话提示仍需人工留意的点，没有就给空字符串"',
        "}",
        "要求：",
        "1. 优先输出局部 patch，不要无故整稿重写。",
        "2. 每个 patch 都要明确对应一条建议点，addresses 直接写对应建议。",
        "3. 如果只需要改 1-3 处，就不要改更多地方。",
        "4. body 除非必须，不要整体改写，不要明显缩短信息量。",
        "5. 保留原本分享感、口语感和节奏，不要改成统一科普腔。",
        "",
        `当前标题：${String(input.title || "")}`,
        `当前正文：${String(input.body || "")}`,
        `当前封面文案：${String(input.coverText || "")}`,
        `当前标签：${Array.isArray(input.tags) ? input.tags.join("、") : String(input.tags || "")}`,
        `规则检测结论：${String(analysis.verdict || "")}`,
        `综合检测结论：${String(analysis.finalVerdict || analysis.verdict || "")}`,
        `精简命中摘要：${JSON.stringify(compactHits)}`,
        `精简规则建议：${JSON.stringify((analysis.suggestions || []).slice(0, 3))}`,
        `语义摘要：${JSON.stringify(semantic?.summary || "")}`,
        `语义原因：${JSON.stringify((semantic?.reasons || []).slice(0, 3))}`,
        `当前是第 ${Number(retryGuidance?.attempt || 0) + 1} 轮自动改写。`,
        `上一轮复判摘要：${String(retryGuidance?.summary || "")}`,
        `上一轮优先修正点：${JSON.stringify(retryGuidance?.focusPoints || [])}`,
        retryHistory.length
          ? `最近一轮复盘轨迹：${JSON.stringify(
              retryHistory.map((item) => ({
                attempt: item.attempt,
                summary: item.summary,
                focusPoints: item.focusPoints
              }))
            )}`
          : "",
        sharedMemoryPrompt,
        terminologyPrompt
      ].join("\n")
    }
  ];
}

export function buildHumanizerMessages({ input = {}, analysis = {}, semantic = null, baseRewrite = {}, innerSpaceTerms = [] } = {}) {
  const systemRules = buildXhsHumanizerSystemRules();
  const userRequirements = buildXhsHumanizerUserRequirements();
  const terminologyPrompt = formatInnerSpaceTermsPrompt(innerSpaceTerms);

  return [
    {
      role: "system",
      content: systemRules.join("\n")
    },
    {
      role: "user",
      content: [
        "请把下面已经合规改写过的版本，再做一轮人味化处理。",
        "要求：",
        ...userRequirements,
        "输出格式：",
        "{",
        '  "title": "润色后的标题",',
        '  "body": "润色后的正文",',
        '  "coverText": "润色后的封面文案",',
        '  "tags": ["标签1", "标签2"],',
        '  "rewriteNotes": "一句话说明在人味化阶段主要做了什么",',
        '  "safetyNotes": "一句话提示仍需人工留意的点，没有就给空字符串"',
        "}",
        "",
        `原始标题（风格样本）：${String(input.title || "")}`,
        `原始正文（风格样本）：${String(input.body || "")}`,
        `原始封面文案（风格样本）：${String(input.coverText || "")}`,
        `原始标签（风格样本）：${Array.isArray(input.tags) ? input.tags.join("、") : String(input.tags || "")}`,
        "",
        `当前合规改写标题：${String(baseRewrite.title || "")}`,
        `当前合规改写正文：${String(baseRewrite.body || "")}`,
        `当前合规改写封面文案：${String(baseRewrite.coverText || "")}`,
        `当前合规改写标签：${Array.isArray(baseRewrite.tags) ? baseRewrite.tags.join("、") : ""}`,
        `上一轮改写说明：${String(baseRewrite.rewriteNotes || "")}`,
        `当前风险结论：${String(analysis.finalVerdict || analysis.verdict || "")}`,
        `语义风险摘要：${String(semantic?.summary || "")}`,
        `语义风险原因：${JSON.stringify(semantic?.reasons || [])}`,
        terminologyPrompt
      ].join("\n")
    }
  ];
}

function normalizePatchArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const field = String(item.field || item.path || item.key || "").trim();

      if (!["title", "body", "coverText"].includes(field)) {
        return null;
      }

      return {
        field,
        target: normalizeTextField(item.target || item.before || item.source || item.original),
        replaceWith: normalizeTextField(item.replaceWith || item.after || item.replacement || item.value),
        reason: normalizeTextField(item.reason || item.notes || item.summary),
        addresses: normalizeTextField(item.addresses || item.addressedPoint || item.guidance || item.focusPoint)
      };
    })
    .filter((item) => item && item.target && item.replaceWith);
}

function applyStringPatch(sourceText, patch) {
  const source = String(sourceText || "");
  const target = String(patch?.target || "");
  const replacement = String(patch?.replaceWith || "");

  if (!source || !target || source === replacement) {
    return { applied: false, value: source };
  }

  const index = source.indexOf(target);

  if (index === -1) {
    return { applied: false, value: source };
  }

  return {
    applied: true,
    value: `${source.slice(0, index)}${replacement}${source.slice(index + target.length)}`
  };
}

function applyRewritePatchPlan({ input = {}, rewrite = {} } = {}) {
  const next = {
    title: String(input.title || "").trim(),
    body: String(input.body || "").trim(),
    coverText: String(input.coverText || "").trim(),
    tags: normalizeTagArray(input.tags)
  };
  const appliedPatches = [];

  for (const patch of normalizePatchArray(rewrite.patches)) {
    const currentValue = String(next[patch.field] || "");
    const result = applyStringPatch(currentValue, patch);

    if (!result.applied) {
      continue;
    }

    next[patch.field] = result.value;
    appliedPatches.push(patch);
  }

  let rewriteMode = appliedPatches.length ? "patch" : "";

  for (const field of ["title", "body", "coverText"]) {
    const candidate = normalizeTextField(rewrite[field]);

    if (!candidate || candidate === next[field]) {
      continue;
    }

    next[field] = candidate;
    rewriteMode = rewriteMode || "field_fallback";
  }

  const nextTags = Array.isArray(rewrite.tags) && rewrite.tags.length ? rewrite.tags : next.tags;

  return {
    ...rewrite,
    ...next,
    tags: nextTags,
    patches: normalizePatchArray(rewrite.patches),
    appliedPatches,
    rewriteMode: rewriteMode || rewrite.rewriteMode || "full"
  };
}

function extractProviderMessage(data, fallbackMessage) {
  return data?.error?.message || data?.msg || data?.message || fallbackMessage;
}

function attachRouteMetadata(error, { route = "", routeLabel = "", model = "" } = {}) {
  if (!error || typeof error !== "object") {
    return error;
  }

  error.route = route;
  error.routeLabel = routeLabel;
  error.model = model;
  return error;
}

function attachAttemptedRoutes(target, attemptedRoutes = []) {
  if (!target || typeof target !== "object") {
    return target;
  }

  target.attemptedRoutes = attemptedRoutes;
  return target;
}

const routedTextProviderConfigs = {
  glm: {
    provider: "glm",
    label: "智谱 GLM",
    officialEndpoint: glmEndpoint,
    officialEnvKey: "GLM_API_KEY",
    getOfficialModel: (model) => String(model || process.env.GLM_TEXT_MODEL || "glm-4.6v").trim(),
    getDmxapiModel: () => getDefaultGlmDmxapiModel(),
    dmxapiLabel: "智谱 GLM DMXAPI"
  },
  kimi: {
    provider: "kimi",
    label: "Kimi",
    officialEndpoint: getKimiEndpoint(),
    officialEnvKey: "KIMI_API_KEY",
    getOfficialModel: (model) => String(model || process.env.KIMI_TEXT_MODEL || "kimi-k2.6").trim(),
    getDmxapiModel: () => "",
    dmxapiLabel: "Kimi 官方",
    supportsDmxapi: false
  },
  qwen: {
    provider: "qwen",
    label: "通义千问",
    officialEndpoint: "",
    officialEnvKey: "",
    getOfficialModel: () => "",
    getDmxapiModel: () => getDefaultQwenDmxapiModel(),
    dmxapiLabel: "通义千问 DMXAPI",
    supportsOfficial: false
  },
  minimax: {
    provider: "minimax",
    label: "MiniMax",
    officialEndpoint: "",
    officialEnvKey: "",
    getOfficialModel: (model) => String(model || "").trim(),
    getDmxapiModel: () => getDefaultMiniMaxDmxapiModel(),
    dmxapiLabel: "MiniMax DMXAPI",
    supportsOfficial: false
  },
  deepseek: {
    provider: "deepseek",
    label: "深度求索",
    officialEndpoint: "https://api.deepseek.com/chat/completions",
    officialEnvKey: "DEEPSEEK_API_KEY",
    getOfficialModel: (model) => String(model || process.env.DEEPSEEK_FEEDBACK_MODEL || "deepseek-v4-flash").trim(),
    getDmxapiModel: () => String(process.env.DEEPSEEK_DMXAPI_MODEL || "deepseek-v4-flash").trim(),
    dmxapiLabel: "深度求索 DMXAPI"
  },
  dmxapi_text: {
    provider: "dmxapi_text",
    label: "DMXAPI",
    officialEndpoint: "",
    officialEnvKey: "",
    getOfficialModel: (model) => String(model || "").trim(),
    getDmxapiModel: (model) => String(model || "").trim(),
    dmxapiLabel: "DMXAPI",
    supportsOfficial: false
  }
};

function buildRoutedRequestBodies({ model, temperature, maxTokens, messages, responseFormat, useDmxapi }) {
  const baseRequestBody = {
    model,
    temperature,
    max_tokens: maxTokens,
    messages
  };
  const normalizedResponseFormat =
    responseFormat && typeof responseFormat === "object" ? responseFormat : responseFormat ? { type: responseFormat } : null;

  if (useDmxapi) {
    return normalizedResponseFormat
      ? [
          {
            ...baseRequestBody,
            response_format: normalizedResponseFormat,
            stream: false
          },
          {
            ...baseRequestBody,
            stream: false
          }
        ]
      : [
          {
            ...baseRequestBody,
            stream: false
          }
        ];
  }

  return normalizedResponseFormat
    ? [
        {
          ...baseRequestBody,
          response_format: normalizedResponseFormat
        },
        baseRequestBody
      ]
    : [baseRequestBody];
}

function normalizeTemperatureForRoutedProvider({ provider = "", temperature = 0.2, useDmxapi = false }) {
  const normalizedProvider = String(provider || "").trim().toLowerCase();

  if (normalizedProvider === "kimi" && !useDmxapi) {
    return 1;
  }

  return temperature;
}

function parseJsonChatResult({ data, candidate, fallbackParser, providerLabel }) {
  const choice = data?.choices?.[0] || null;
  const rawMessage = choice?.message || choice || null;
  const rawContent = rawMessage?.content ?? choice?.text ?? data?.output_text ?? "";
  const rawReasoning =
    rawMessage?.reasoning_content ??
    rawMessage?.reasoning ??
    choice?.reasoning_content ??
    choice?.reasoning ??
    data?.reasoning_content ??
    data?.reasoning ??
    "";
  const message = flattenContent(rawMessage || rawContent);
  const reasoningText = flattenContent(rawReasoning);
  const parsed =
    tryParseJsonFromUnknown(rawMessage) ||
    tryParseJsonFromUnknown(rawContent) ||
    tryParseJsonFromUnknown(rawReasoning) ||
    tryParseJsonFromUnknown(choice?.text) ||
    tryParseJsonFromUnknown(data?.output_text);

  if (!parsed && typeof fallbackParser === "function") {
    const fallbackParsed = fallbackParser(message, rawMessage || rawContent);

    if (fallbackParsed) {
      return {
        parsed: fallbackParsed,
        model: data?.model || candidate
      };
    }
  }

  if (!parsed) {
    const preview =
      buildPreviewText(message, 180) ||
      buildPreviewText(rawMessage, 180) ||
      buildPreviewText(rawContent, 180) ||
      buildPreviewText(choice, 180) ||
      buildPreviewText(data, 180);
    const onlyReasoningNoAnswer = !String(message || "").trim() && Boolean(String(reasoningText || "").trim());
    throw createGlmError(
      onlyReasoningNoAnswer
        ? `${providerLabel} 只返回了思考过程，没有输出最终结果 JSON。`
        : preview
          ? `${providerLabel} 返回的结果不是有效 JSON。原始片段：${preview}`
          : `${providerLabel} 返回的结果不是有效 JSON。`,
      502
    );
  }

  return {
    parsed,
    model: data?.model || candidate
  };
}

function isRoutedProviderRecoverableFailure(statusCode, message, error) {
  if (error?.name === "AbortError") {
    return true;
  }

  const messageText = String(message || "").trim();

  if (statusCode === 400 || statusCode === 429 || statusCode >= 500) {
    return true;
  }

  if (statusCode === 403 && /无权访问|forbidden|permission|access denied|denied/i.test(messageText)) {
    return true;
  }

  return /模型不存在|model.+not found|unknown model|no access to model|model access/i.test(messageText);
}

async function executeChatRequest({ endpoint, apiKey, requestBody, timeoutMs }) {
  const controller = timeoutMs ? new AbortController() : null;
  const timeoutId = timeoutMs ? setTimeout(() => controller.abort(), timeoutMs) : null;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody),
      signal: controller?.signal
    });
    const data = await response.json().catch(() => ({}));

    return { response, data };
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

async function attemptRoutedProviderRoute({
  provider,
  label,
  endpoint,
  apiKey,
  model,
  temperature,
  maxTokens,
  messages,
  responseFormat,
  fallbackParser,
  timeoutMs,
  allowRecoverableFallback,
  useDmxapi,
  scene = "unknown"
}) {
  const effectiveTemperature = normalizeTemperatureForRoutedProvider({
    provider,
    temperature,
    useDmxapi
  });
  const requestBodies = buildRoutedRequestBodies({
    model,
    temperature: effectiveTemperature,
    maxTokens,
    messages,
    responseFormat,
    useDmxapi
  });
  let lastError = null;
  let shouldFallback = false;
  const startedAt = Date.now();
  const route = useDmxapi ? "dmxapi" : "official";
  const routeLabel = useDmxapi ? "DMXAPI" : "官方";

  requestBodyLoop: for (const requestBody of requestBodies) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      let response;
      let data;

      try {
        ({ response, data } = await executeChatRequest({
          endpoint,
          apiKey,
          requestBody,
          timeoutMs
        }));
      } catch (error) {
        const timeoutMessage = timeoutMs ? `${label} 请求超时（>${timeoutMs}ms）` : `${label} 请求超时`;
        lastError = attachRouteMetadata(
          createGlmError(
          error?.name === "AbortError"
            ? timeoutMessage
            : error instanceof Error
              ? error.message
              : `${label} 请求失败`,
          error?.name === "AbortError" ? 504 : 502
          ),
          { route, routeLabel, model }
        );
        shouldFallback = allowRecoverableFallback && isRoutedProviderRecoverableFailure(0, lastError.message, error);
        break requestBodyLoop;
      }

      if (!response.ok) {
        const message = extractProviderMessage(data, `${label} 请求失败，状态码 ${response.status}`);
        const isBusy = response.status === 429 || /访问量过大|rate limit|too many|余额不足|resource/i.test(message);
        const isUnsupportedResponseFormat =
          Boolean(requestBody.response_format) &&
          /response_format|json_object|json schema|structured output|unsupported.+response|不支持.+(?:json|结构化|response_format)/i.test(
            message
          );

        if (isBusy && attempt === 0) {
          await sleep(900);
          continue;
        }

        lastError = attachRouteMetadata(createGlmError(message, isBusy ? 503 : response.status || 500), {
          route,
          routeLabel,
          model
        });

        if (isUnsupportedResponseFormat) {
          continue requestBodyLoop;
        }

        shouldFallback = allowRecoverableFallback && isRoutedProviderRecoverableFailure(response.status, message);
        break requestBodyLoop;
      }

      try {
        const parsedResult = {
          ok: true,
          route,
          routeLabel,
          ...parseJsonChatResult({
            data,
            candidate: model,
            fallbackParser,
            providerLabel: label
          })
        };
        return parsedResult;
      } catch (error) {
        lastError = attachRouteMetadata(error, {
          route,
          routeLabel,
          model
        });

        const shouldRetryWithoutResponseFormat =
          Boolean(requestBody.response_format) &&
          /只返回了思考过程|没有最终.*JSON|没有输出最终.*JSON|not an? valid JSON|invalid JSON|返回的结果不是有效 JSON|response_format|json_object|json schema|structured output|unsupported|invalid parameter|不支持/i.test(
            String(lastError?.message || "")
          );

        if (shouldRetryWithoutResponseFormat) {
          continue requestBodyLoop;
        }

        if (attempt === 0) {
          await sleep(250);
          continue;
        }

        shouldFallback = allowRecoverableFallback && isRoutedProviderRecoverableFailure(
          error?.statusCode || 0,
          error?.message || "",
          error
        );
        break requestBodyLoop;
      }
    }
  }

  return {
    ok: false,
    error: lastError || createGlmError(`${label} 暂时不可用，请稍后再试。`, 503),
    shouldFallback
  };
}

export async function callRoutedTextProviderJson({
  provider,
  model,
  temperature = 0.2,
  maxTokens = 700,
  messages,
  missingKeyMessage,
  responseFormat = "json_object",
  fallbackParser = null,
  timeoutMs = 0,
  allowDmxapi = true,
  allowOfficial = true,
  scene = "unknown"
}) {
  const config = routedTextProviderConfigs[String(provider || "").trim()];

  if (!config) {
    throw createGlmError(`未知文本 provider：${String(provider || "") || "empty"}`, 500);
  }

  const officialModel = config.getOfficialModel(model);
  const dmxapiApiKey = String(process.env.DMXAPI_API_KEY || "").trim();
  const attemptedRoutes = [];
  const shouldUseDmxapi = allowDmxapi !== false && config.supportsDmxapi !== false;
  const shouldUseOfficial = allowOfficial !== false && config.supportsOfficial !== false;

  if (shouldUseDmxapi && dmxapiApiKey) {
    const dmxapiModel = config.getDmxapiModel(model);
    const dmxapiResult = await attemptRoutedProviderRoute({
      provider: config.provider,
      label: config.dmxapiLabel,
      endpoint: defaultDmxapiEndpoint,
      apiKey: dmxapiApiKey,
      model: dmxapiModel,
      temperature,
      maxTokens,
      messages,
      responseFormat,
      fallbackParser,
      timeoutMs,
      allowRecoverableFallback: true,
      useDmxapi: true,
      scene
    });

    if (dmxapiResult.ok) {
      attemptedRoutes.push({
        route: "dmxapi",
        routeLabel: "DMXAPI",
        model: dmxapiResult.model || dmxapiModel,
        status: "ok",
        message: ""
      });
      return attachAttemptedRoutes(dmxapiResult, attemptedRoutes);
    }

    attemptedRoutes.push({
      route: "dmxapi",
      routeLabel: "DMXAPI",
      model: String(dmxapiResult.error?.model || dmxapiModel || "").trim(),
      status: "error",
      message: dmxapiResult.error?.message || ""
    });

    const officialApiKey = shouldUseOfficial ? String(process.env[config.officialEnvKey] || "").trim() : "";

    if (dmxapiResult.shouldFallback && officialApiKey) {
      const officialResult = await attemptRoutedProviderRoute({
        provider: config.provider,
        label: config.label,
        endpoint: config.officialEndpoint,
        apiKey: officialApiKey,
        model: officialModel,
        temperature,
        maxTokens,
        messages,
        responseFormat,
        fallbackParser,
        timeoutMs,
        allowRecoverableFallback: false,
        useDmxapi: false,
        scene
      });

      if (officialResult.ok) {
        attemptedRoutes.push({
          route: "official",
          routeLabel: "官方",
          model: officialResult.model || officialModel,
          status: "ok",
          message: ""
        });
        return attachAttemptedRoutes(officialResult, attemptedRoutes);
      }

      attemptedRoutes.push({
        route: "official",
        routeLabel: "官方",
        model: String(officialResult.error?.model || officialModel || "").trim(),
        status: "error",
        message: officialResult.error?.message || ""
      });
      throw attachAttemptedRoutes(officialResult.error, attemptedRoutes);
    }

    throw attachAttemptedRoutes(dmxapiResult.error, attemptedRoutes);
  }

  if (shouldUseDmxapi && !dmxapiApiKey && !shouldUseOfficial) {
    throw createGlmError(missingKeyMessage || "缺少 DMXAPI_API_KEY 环境变量。", 400);
  }

  if (!shouldUseOfficial) {
    throw createGlmError(`${config.label} 没有可用调用路由。`, 500);
  }

  const officialApiKey = String(process.env[config.officialEnvKey] || "").trim();

  if (!officialApiKey) {
    throw createGlmError(missingKeyMessage || `缺少 ${config.officialEnvKey} 环境变量。`, 400);
  }

  const officialResult = await attemptRoutedProviderRoute({
    provider: config.provider,
    label: config.label,
    endpoint: config.officialEndpoint,
    apiKey: officialApiKey,
    model: officialModel,
    temperature,
    maxTokens,
    messages,
    responseFormat,
    fallbackParser,
    timeoutMs,
    allowRecoverableFallback: false,
    useDmxapi: false,
    scene
  });

  if (officialResult.ok) {
    attemptedRoutes.push({
      route: "official",
      routeLabel: "官方",
      model: officialResult.model || officialModel,
      status: "ok",
      message: ""
    });
    return attachAttemptedRoutes(officialResult, attemptedRoutes);
  }

  attemptedRoutes.push({
    route: "official",
    routeLabel: "官方",
    model: String(officialResult.error?.model || officialModel || "").trim(),
    status: "error",
    message: officialResult.error?.message || ""
  });
  throw attachAttemptedRoutes(officialResult.error, attemptedRoutes);
}

export async function callQwenJson(options = {}) {
  return callRoutedTextProviderJson({
    provider: "qwen",
    ...options
  });
}

export async function callDeepSeekJson(options = {}) {
  return callRoutedTextProviderJson({
    provider: "deepseek",
    ...options
  });
}

export async function callKimiJson(options = {}) {
  return callRoutedTextProviderJson({
    provider: "kimi",
    ...options
  });
}

export async function callMiniMaxJson(options = {}) {
  return callRoutedTextProviderJson({
    provider: "minimax",
    ...options
  });
}

export async function callDmxapiTextJson(options = {}) {
  return callRoutedTextProviderJson({
    provider: "dmxapi_text",
    ...options
  });
}

export async function callGlmJson(options = {}) {
  return callRoutedTextProviderJson({
    provider: "glm",
    ...options
  });
}

async function callChatJson({
  providerConfig,
  model,
  models,
  temperature = 0.2,
  maxTokens = 700,
  messages,
  missingKeyMessage,
  responseFormat = "json_object",
  fallbackParser = null,
  scene = "unknown"
}) {
  if (providerConfig?.provider && routedTextProviderConfigs[providerConfig.provider]) {
    const officialModels = (Array.isArray(models) && models.length ? models : [model]).filter(Boolean);
    let lastError = null;
    const routeMode = String(providerConfig?.routeMode || "").trim().toLowerCase();
    const allowDmxapi = routeMode === "official_only" ? false : undefined;
    const allowOfficial = routeMode === "dmxapi_only" ? false : undefined;

    for (const candidate of officialModels) {
      try {
        return await callRoutedTextProviderJson({
          provider: providerConfig.provider,
          model: candidate,
          temperature,
          maxTokens,
          messages,
          missingKeyMessage,
          responseFormat,
          fallbackParser,
          allowDmxapi,
          allowOfficial,
          scene
        });
      } catch (error) {
        lastError = error;
      }
    }

    if (lastError) {
      throw lastError;
    }
  }

  const apiKey = String(process.env[providerConfig?.envKey] || "").trim();
  const providerLabel = String(providerConfig?.label || "模型").trim() || "模型";
  const providerEndpoint = String(providerConfig?.endpoint || "").trim();

  if (!apiKey) {
    throw createGlmError(missingKeyMessage || `缺少 ${providerConfig?.envKey || "API_KEY"} 环境变量。`, 400);
  }

  if (!providerEndpoint) {
    throw createGlmError(`${providerLabel} 缺少可用 endpoint 配置。`, 500);
  }

  const candidates = (Array.isArray(models) && models.length ? models : [model]).filter(Boolean);
  let lastError = null;

  for (const candidate of candidates) {
    const baseRequestBody = {
      model: candidate,
      temperature,
      max_tokens: maxTokens,
      messages
    };
    const requestBodies = responseFormat
      ? [
          {
            ...baseRequestBody,
            response_format: { type: responseFormat }
          },
          baseRequestBody
        ]
      : [baseRequestBody];

    requestBodyLoop: for (const requestBody of requestBodies) {
      for (let attempt = 0; attempt < 2; attempt += 1) {
        const response = await fetch(providerEndpoint, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(requestBody)
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message =
          data?.error?.message || data?.msg || data?.message || `${providerLabel} 请求失败，状态码 ${response.status}`;
        const isBusy = response.status === 429 || /访问量过大|rate limit|too many/i.test(message);
        const isForbidden = response.status === 403 || /无权访问|forbidden|permission/i.test(message);
        const isMissingModel = /模型不存在|model.+not found|unknown model/i.test(message);
        const isUnsupportedResponseFormat =
          Boolean(requestBody.response_format) &&
          /response_format|json_object|json schema|unsupported|invalid parameter|不支持/i.test(message);

        if (isBusy && attempt === 0) {
          await sleep(900);
          continue;
        }

        lastError = createGlmError(message, isBusy ? 503 : response.status || 500);

        if (isUnsupportedResponseFormat) {
          break;
        }

        if (isForbidden || isMissingModel) {
          break;
        }

        throw lastError;
      }

      const choice = data?.choices?.[0] || null;
      const rawMessage = choice?.message || choice || null;
      const rawContent = rawMessage?.content ?? choice?.text ?? data?.output_text ?? "";
      const message = flattenContent(rawMessage || rawContent);
      const reasoningText = flattenContent(rawMessage?.reasoning_content || rawMessage?.reasoning || "");
      const parsed =
        tryParseJsonFromUnknown(rawMessage) ||
        tryParseJsonFromUnknown(rawContent) ||
        tryParseJsonFromUnknown(choice?.text) ||
        tryParseJsonFromUnknown(data?.output_text);

      if (!parsed && typeof fallbackParser === "function") {
        const fallbackParsed = fallbackParser(message, rawMessage || rawContent);

        if (fallbackParsed) {
          return {
            parsed: fallbackParsed,
            model: data?.model || candidate
          };
        }
      }

      if (!parsed) {
        const shouldRetryWithoutResponseFormat =
          Boolean(requestBody.response_format) &&
          /只返回了思考过程|没有最终.*JSON|没有输出最终.*JSON|not an? valid JSON|invalid JSON|返回的结果不是有效 JSON|response_format|json_object|json schema|structured output|unsupported|invalid parameter|不支持/i.test(
            `${message || ""}\n${reasoningText || ""}`
          );

        if (shouldRetryWithoutResponseFormat) {
          continue requestBodyLoop;
        }

        if (attempt === 0) {
          await sleep(250);
          continue;
        }

        const preview =
          buildPreviewText(message, 180) ||
          buildPreviewText(rawMessage, 180) ||
          buildPreviewText(rawContent, 180) ||
          buildPreviewText(choice, 180) ||
          buildPreviewText(data, 180);
        const onlyReasoningNoAnswer = !String(message || "").trim() && Boolean(String(reasoningText || "").trim());
        lastError = createGlmError(
          onlyReasoningNoAnswer
            ? `${providerLabel} 只返回了思考过程，没有输出最终改写结果 JSON。`
            : preview
              ? `${providerLabel} 返回的结果不是有效 JSON。原始片段：${preview}`
              : `${providerLabel} 返回的结果不是有效 JSON。`,
          502
        );
        break;
      }

      return {
        parsed,
        model: data?.model || candidate
      };
      }
    }
  }

  if (lastError) {
    throw lastError;
  }

  throw createGlmError(`${providerLabel} 暂时不可用，请稍后再试。`, 503);
}

function normalizeRecognitionResult(payload, fallbackModel) {
  const suspiciousPhrases = Array.isArray(payload?.suspiciousPhrases)
    ? [...new Set(payload.suspiciousPhrases.map((item) => String(item || "").trim()).filter(Boolean))]
    : [];

  const confidence = Number(payload?.confidence);

  return {
    model: String(payload?.model || fallbackModel || defaultVisionModel).trim(),
    platformReason: String(payload?.platformReason || "").trim(),
    suspiciousPhrases,
    extractedText: String(payload?.extractedText || "").trim(),
    summary: String(payload?.summary || "").trim(),
    notes: String(payload?.notes || "").trim(),
    confidence: Number.isFinite(confidence) ? Math.max(0, Math.min(1, confidence)) : null,
    recognizedAt: new Date().toISOString()
  };
}

export async function screenshotFileToDataUrl(filePath) {
  const resolvedPath = path.resolve(filePath);
  const mimeType = guessMimeType(resolvedPath);
  const buffer = await fs.readFile(resolvedPath);

  return {
    name: path.basename(resolvedPath),
    type: mimeType,
    size: buffer.length,
    dataUrl: `data:${mimeType};base64,${buffer.toString("base64")}`
  };
}

export async function recognizeFeedbackScreenshot({ imageDataUrl, mimeType, fileName = "", modelSelection = "auto" }) {
  const provider = String(modelSelection || "").trim().toLowerCase();
  const providerLabelText = provider === "glm" || provider === "auto" || !provider ? "智谱 GLM" : "智谱 GLM";
  const { parsed, model } = await callChatJson({
    providerConfig: {
      provider: "glm",
      label: providerLabelText,
      envKey: "GLM_API_KEY",
      endpoint: glmEndpoint
    },
    model: defaultVisionModel,
    temperature: 0.1,
    missingKeyMessage: "截图识别缺少 GLM_API_KEY 环境变量。",
    scene: "feedback_screenshot",
    messages: [
      {
        role: "system",
        content:
          "你是小红书内容安全团队中的审核截图信息提取助手。你只能根据截图中真实可见的内容提取信息，不能编造。输出必须是 JSON。"
      },
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: {
              url: ensureImageDataUrl(imageDataUrl, mimeType)
            }
          },
          {
            type: "text",
            text: [
              "这是平台违规通知、申诉结果或后台审核截图。",
              "请只返回 JSON 对象，不要附加解释。",
              "字段格式：",
              "{",
              '  "platformReason": "截图里最接近平台违规原因的原文，没有就给空字符串",',
              '  "suspiciousPhrases": ["截图中能直接看到、值得加入人工复核的词或短语"],',
              '  "extractedText": "你从截图中读到的核心文字，尽量保留原意并合并为一段文本",',
              '  "summary": "一句话概括这张截图表达的审核结论",',
              '  "notes": "提取时的不确定性说明，没有就给空字符串",',
              '  "confidence": 0.0',
              "}",
              "要求：",
              "1. platformReason 优先抄录截图里的违规原因原文。",
              "2. suspiciousPhrases 只保留截图里明确可见、且对后续词库有帮助的词。",
              "3. 如果截图里看不到具体短语，就返回空数组。",
              "4. confidence 取 0 到 1。"
            ].join("\n")
          }
        ]
      }
    ]
  });

  return normalizeRecognitionResult(
    {
      ...parsed,
      model: parsed.model || model || defaultVisionModel,
      sourceFileName: fileName
    },
    model || defaultVisionModel
  );
}

function normalizeRewriteResult(payload, fallbackModel) {
  const source = unwrapRewritePayload(payload);
  const tags = normalizeTagArray(
    pickRewriteValue(source, [
      "tags",
      "tagList",
      "hashtags",
      "labels",
      "keywords",
      "recommendedTags",
      "推荐标签",
      "标签",
      "改写标签"
    ])
  );

  return {
    provider: String(pickRewriteValue(source, ["provider", "rewriteProvider"]) || "").trim(),
    model: String(
      pickRewriteValue(source, ["model", "modelName", "rewriteModel"]) || fallbackModel || getDefaultTextModel()
    ).trim(),
    title: normalizeTextField(
      pickRewriteValue(source, ["title", "headline", "heading", "标题", "改写标题", "titleText"])
    ),
    body: normalizeTextField(
      pickRewriteValue(source, ["body", "content", "text", "正文", "改写正文", "正文内容", "mainText", "bodyText"])
    ),
    coverText: normalizeTextField(
      pickRewriteValue(source, [
        "coverText",
        "cover",
        "cover_text",
        "coverCopy",
        "封面文案",
        "改写封面文案",
        "封面"
      ])
    ),
    tags,
    rewriteNotes: normalizeTextField(
      pickRewriteValue(source, [
        "rewriteNotes",
        "notes",
        "rewriteReason",
        "rewriteSummary",
        "modificationNotes",
        "改写说明",
        "润色说明",
        "修改说明",
        "说明"
      ])
    ),
    safetyNotes: normalizeTextField(
      pickRewriteValue(source, [
        "safetyNotes",
        "riskNotes",
        "warnings",
        "attention",
        "人工留意",
        "安全提示",
        "注意事项",
        "风险提示"
      ])
    ),
    patches: normalizePatchArray(pickRewriteValue(source, ["patches", "rewritePatches", "patchPlan", "modifications"])),
    appliedPatches: normalizePatchArray(
      pickRewriteValue(source, ["appliedPatches", "effectivePatches", "executedPatches"])
    ),
    rewriteMode: normalizeTextField(pickRewriteValue(source, ["rewriteMode", "mode", "strategy"])),
    humanized: source?.humanized === true
  };
}

function countParagraphs(text = "") {
  const normalized = String(text || "").trim();

  if (!normalized) {
    return 0;
  }

  return normalized.split(/\n\s*\n/).filter(Boolean).length || 1;
}

export function shouldPreferBaseRewriteBody(baseBody = "", candidateBody = "") {
  const base = String(baseBody || "").trim();
  const candidate = String(candidateBody || "").trim();

  if (!base || !candidate) {
    return false;
  }

  const baseParagraphs = countParagraphs(base);
  const candidateParagraphs = countParagraphs(candidate);
  const lengthRatio = candidate.length / Math.max(base.length, 1);

  return candidateParagraphs < baseParagraphs || lengthRatio < 0.72;
}

function normalizeTextField(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeTextField(item))
      .filter(Boolean)
      .join("\n")
      .trim();
  }

  if (!value || typeof value !== "object") {
    return String(value || "").trim();
  }

  return flattenContent(value).trim();
}

function normalizeTagArray(value) {
  if (Array.isArray(value)) {
    return [...new Set(value.map((item) => normalizeTextField(item)).filter(Boolean))];
  }

  if (typeof value === "string") {
    return [...new Set(
      value
        .split(/[\n,，、]/)
        .map((item) => item.replace(/^[-*•#\s]+/, "").trim())
        .filter(Boolean)
    )];
  }

  return [];
}

function pickRewriteValue(source, keys = []) {
  if (!source || typeof source !== "object") {
    return undefined;
  }

  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(source, key) && source[key] !== undefined && source[key] !== null) {
      return source[key];
    }
  }

  return undefined;
}

function unwrapRewritePayload(payload) {
  let current = payload;
  const candidateKeys = ["rewrite", "result", "data", "content", "output", "post"];

  for (let depth = 0; depth < 3; depth += 1) {
    if (!current || typeof current !== "object" || Array.isArray(current)) {
      break;
    }

    const directContent = pickRewriteValue(current, ["title", "body", "content", "text", "正文", "改写正文"]);
    if (directContent !== undefined) {
      return current;
    }

    const nestedKey = candidateKeys.find((key) => current[key] && typeof current[key] === "object");
    if (!nestedKey) {
      break;
    }

    current = current[nestedKey];
  }

  return current || payload;
}

function escapeRegex(text) {
  return String(text || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractLabeledSection(text, labels, allLabels) {
  const labelPattern = labels.map((item) => escapeRegex(item)).join("|");
  const allLabelPattern = allLabels.map((item) => escapeRegex(item)).join("|");
  const pattern = new RegExp(
    `(?:^|\\n)\\s*[*#>\\-\\s]*(?:${labelPattern})\\s*[:：]\\s*([\\s\\S]*?)(?=\\n\\s*[*#>\\-\\s]*(?:${allLabelPattern})\\s*[:：]|$)`,
    "iu"
  );
  const match = String(text || "").match(pattern);

  return match ? match[1].trim() : "";
}

function parseTagList(text) {
  return [...new Set(
    String(text || "")
      .split(/[\n,，、]/)
      .map((item) => item.replace(/^[-*•\s#]+/, "").trim())
      .filter(Boolean)
  )];
}

function salvageRewritePayload(text, rawContent) {
  const source = String(text || "").trim() || flattenContent(rawContent);

  if (!source) {
    return null;
  }

  const allLabels = [
    "标题",
    "改写标题",
    "正文",
    "改写正文",
    "正文内容",
    "封面文案",
    "改写封面文案",
    "封面",
    "标签",
    "推荐标签",
    "改写标签",
    "改写说明",
    "润色说明",
    "修改说明",
    "说明",
    "rewriteNotes",
    "人工留意",
    "安全提示",
    "注意事项",
    "风险提示",
    "safetyNotes"
  ];

  const title = extractLabeledSection(source, ["标题", "改写标题"], allLabels);
  const body = extractLabeledSection(source, ["正文", "改写正文", "正文内容"], allLabels);
  const coverText = extractLabeledSection(source, ["封面文案", "改写封面文案", "封面"], allLabels);
  const tags = parseTagList(extractLabeledSection(source, ["标签", "推荐标签", "改写标签"], allLabels));
  const rewriteNotes = extractLabeledSection(source, ["改写说明", "润色说明", "修改说明", "说明", "rewriteNotes"], allLabels);
  const safetyNotes = extractLabeledSection(source, ["人工留意", "安全提示", "注意事项", "风险提示", "safetyNotes"], allLabels);

  if (!title && !body && !coverText) {
    return null;
  }

  return {
    title,
    body,
    coverText,
    tags,
    rewriteNotes,
    safetyNotes
  };
}

function normalizeFeedbackSuggestionResult(payload, fallbackModel) {
  const suspiciousPhrases = Array.isArray(payload?.suspiciousPhrases)
    ? [...new Set(payload.suspiciousPhrases.map((item) => String(item || "").trim()).filter(Boolean))]
    : [];
  const contextCategories = Array.isArray(payload?.contextCategories)
    ? [...new Set(payload.contextCategories.map((item) => String(item || "").trim()).filter(Boolean))]
    : [];
  const confidence = Number(payload?.confidence);

  return {
    provider: String(payload?.provider || "").trim(),
    model: String(payload?.model || fallbackModel || defaultFeedbackModel).trim(),
    suspiciousPhrases,
    contextCategories,
    summary: String(payload?.summary || "").trim(),
    notes: String(payload?.notes || "").trim(),
    confidence: Number.isFinite(confidence) ? Math.max(0, Math.min(1, confidence)) : null,
    reviewedAt: new Date().toISOString()
  };
}

function buildFeedbackSuggestionMessages({
  noteContent = "",
  platformReason = "",
  suspiciousPhrases = [],
  screenshotRecognition = null,
  analysisSnapshot = null,
  reviewAudit = null
}) {
  return [
    {
      role: "system",
      content: [
        "你是小红书内容安全团队中的违规回流复盘助手。",
        "你的任务是根据笔记内容、平台违规原因和规则复盘结果，补充值得进入人工复核队列的候选词或语境类别。",
        "你只做候选建议，不直接决定是否入库。",
        "禁止把抽象原因标签当成候选词，例如：",
        abstractReasonPhraseLabels.join("、"),
        "输出必须是 JSON。"
      ].join("\n")
    },
    {
      role: "user",
      content: [
        "请结合下面信息，补充最多 4 个精确候选短语，以及 0-3 个语境类别。",
        "只输出 JSON：",
        "{",
        '  "suspiciousPhrases": ["候选短语1"],',
        `  "contextCategories": ${JSON.stringify(feedbackContextCategories)},`,
        '  "summary": "一句话说明为什么建议这些候选",',
        '  "notes": "如果拿不准，说明不确定点；没有就给空字符串",',
        '  "confidence": 0.0',
        "}",
        "要求：",
        "1. suspiciousPhrases 只保留具体、可执行、可复核的短语，优先 2-12 个字。",
        "2. 不要返回抽象平台标签，不要返回“违规宣传”“两性用品”这类泛化原因词。",
        "3. 如果没有可靠精确短语，可以返回空数组，但可以给出 contextCategories。",
        "4. contextCategories 只能从给定类别中选择。",
        "5. 更偏向补充规则可能漏掉的表达，不要重复已有明显候选。",
        "",
        `笔记内容：${String(noteContent || "").trim()}`,
        `平台违规原因：${String(platformReason || "").trim()}`,
        `已有候选短语：${JSON.stringify(suspiciousPhrases || [])}`,
        `截图识别结果：${JSON.stringify(
          screenshotRecognition
            ? {
                platformReason: screenshotRecognition.platformReason || "",
                suspiciousPhrases: screenshotRecognition.suspiciousPhrases || [],
                summary: screenshotRecognition.summary || ""
              }
            : null
        )}`,
        `规则检测摘要：${JSON.stringify(analysisSnapshot || null)}`,
        `规则复盘摘要：${JSON.stringify(reviewAudit || null)}`
      ].join("\n")
    }
  ];
}

async function callFeedbackSuggestionProvider(config, messages) {
  if (config.provider === "qwen" || config.provider === "deepseek" || config.provider === "dmxapi_text") {
    try {
      const routedCall =
        config.provider === "qwen" ? callQwenJson : config.provider === "deepseek" ? callDeepSeekJson : callDmxapiTextJson;
      const defaultModel =
        config.provider === "qwen"
          ? defaultQwenFeedbackModel
          : config.provider === "deepseek"
            ? defaultDeepSeekFeedbackModel
            : String(config.model || "").trim();
      const { parsed, model } = await routedCall({
        model: (Array.isArray(config.models) ? config.models[0] : config.model) || defaultModel,
        temperature: 0.1,
        maxTokens: 560,
        messages,
        timeoutMs: feedbackSuggestTimeoutMs,
        missingKeyMessage: `缺少 ${config.envKey}`,
        scene: "feedback_suggestion",
        allowOfficial: config.provider === "dmxapi_text" ? false : undefined,
        fallbackParser: (message, rawContent) =>
          tryParseJsonFromUnknown(rawContent) || tryParseJsonFromUnknown(message)
      });

      return {
        status: "ok",
        provider: config.provider,
        label: config.label,
        suggestion: normalizeFeedbackSuggestionResult(
          {
            ...parsed,
            provider: config.provider,
            model: parsed.model || model
          },
          model
        )
      };
    } catch (error) {
      return {
        status: "error",
        provider: config.provider,
        label: config.label,
        message: error instanceof Error ? error.message : `${config.label} 暂时不可用`
      };
    }
  }

  const apiKey = String(process.env[config.envKey] || "").trim();

  if (!apiKey) {
    return {
      status: "unconfigured",
      provider: config.provider,
      label: config.label,
      message: `缺少 ${config.envKey}`
    };
  }

  const models = (Array.isArray(config.models) ? config.models : [config.model]).filter(Boolean);
  let lastError = null;

  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), feedbackSuggestTimeoutMs);
      let response;
      let data;

      try {
        response = await fetch(config.endpoint, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model,
            temperature: 0.1,
            max_tokens: config.provider === "glm" ? 420 : 560,
            messages
          }),
          signal: controller.signal
        });
        data = await response.json().catch(() => ({}));
      } catch (error) {
        clearTimeout(timeoutId);
        lastError =
          error?.name === "AbortError"
            ? createGlmError(`${config.label} 候选补充超时（>${feedbackSuggestTimeoutMs}ms）`, 504)
            : createGlmError(error instanceof Error ? error.message : `${config.label} 请求失败`, 502);
      } finally {
        clearTimeout(timeoutId);
      }

      if (lastError && !response) {
        break;
      }

      if (!response.ok) {
        const message =
          data?.error?.message || data?.msg || data?.message || `${config.label} 请求失败，状态码 ${response.status}`;
        const isBusy = response.status === 429 || /访问量过大|rate limit|too many|余额不足|resource/i.test(message);
        lastError = createGlmError(message, isBusy ? 503 : response.status || 500);

        if (isBusy && attempt === 0) {
          await sleep(900);
          lastError = null;
          continue;
        }

        break;
      }

      const parsed = tryParseJson(flattenContent(data?.choices?.[0]?.message?.content));

      if (!parsed) {
        lastError = createGlmError(`${config.label} 返回的候选补充结果不是有效 JSON`, 502);
        break;
      }

      return {
        status: "ok",
        provider: config.provider,
        label: config.label,
        suggestion: normalizeFeedbackSuggestionResult(
          {
            ...parsed,
            provider: config.provider,
            model: parsed.model || data?.model || model
          },
          data?.model || model
        )
      };
    }
  }

  return {
    status: "error",
    provider: config.provider,
    label: config.label,
    message: lastError?.message || `${config.label} 暂时不可用`
  };
}

export async function suggestFeedbackCandidates({
  noteContent = "",
  platformReason = "",
  suspiciousPhrases = [],
  screenshotRecognition = null,
  analysisSnapshot = null,
  reviewAudit = null,
  modelSelection = "auto"
}) {
  const messages = buildFeedbackSuggestionMessages({
    noteContent,
    platformReason,
    suspiciousPhrases,
    screenshotRecognition,
    analysisSnapshot,
    reviewAudit
  });
  const errors = [];

  const activeProviderConfigs = filterProviderConfigsBySelection(feedbackProviderConfigs, modelSelection);

  for (const config of activeProviderConfigs) {
    const result = await callFeedbackSuggestionProvider(config, messages);

    if (result.status === "ok") {
      return result.suggestion;
    }

    if (result.status === "error") {
      errors.push(`${config.label}: ${result.message}`);
    }
  }

  if (errors.length) {
    throw createGlmError(`候选补充模型均不可用：${errors.join("；")}`, 503);
  }

  throw createGlmError("候选补充缺少可用模型配置。", 400);
}

export async function rewritePostForCompliance({ input = {}, analysis = {}, modelSelection = "auto", innerSpaceTerms = [] }) {
  const semantic = analysis?.semanticReview?.status === "ok" ? analysis.semanticReview.review : null;
  const rewriteProviderConfig = getRewriteProviderConfig(modelSelection);
  const rewriteFallbackModel = rewriteProviderConfig.models[0] || getDefaultTextModel();
  const usePatchMode = Boolean(analysis?.retryGuidance);
  const { parsed, model } = await callChatJson({
    providerConfig: rewriteProviderConfig,
    models: rewriteProviderConfig.models,
    temperature: 0.5,
    maxTokens: usePatchMode ? rewriteGenerationConfig.patchMaxTokens : rewriteGenerationConfig.baseMaxTokens,
    missingKeyMessage: `改写功能缺少 ${rewriteProviderConfig.envKey} 环境变量。`,
    fallbackParser: salvageRewritePayload,
    scene: usePatchMode ? "rewrite_patch" : "rewrite",
    messages: usePatchMode
      ? buildPatchMessages({ input, analysis, semantic, innerSpaceTerms })
      : buildRewriteMessages({ input, analysis, semantic, innerSpaceTerms })
  });

  const normalizedRewrite = normalizeRewriteResult(
    {
      ...parsed,
      provider: rewriteProviderConfig.provider,
      model: parsed.model || model || rewriteFallbackModel,
      rewriteMode: parsed?.rewriteMode || (usePatchMode ? "patch" : "full")
    },
    model || rewriteFallbackModel
  );
  const baseRewrite = usePatchMode ? applyRewritePatchPlan({ input, rewrite: normalizedRewrite }) : normalizedRewrite;

  if (!humanizerPassEnabled || usePatchMode) {
    return baseRewrite;
  }

  try {
    const { parsed: humanizedParsed, model: humanizedModel } = await callChatJson({
      providerConfig: rewriteProviderConfig,
      models: rewriteProviderConfig.models,
      temperature: 0.45,
      maxTokens: rewriteGenerationConfig.humanizerMaxTokens,
      missingKeyMessage: `改写后人味化缺少 ${rewriteProviderConfig.envKey} 环境变量。`,
      fallbackParser: salvageRewritePayload,
      scene: "rewrite_humanizer",
      messages: buildHumanizerMessages({ input, analysis, semantic, baseRewrite, innerSpaceTerms })
    });

    const humanizedRewrite = normalizeRewriteResult(
      {
        ...humanizedParsed,
        provider: rewriteProviderConfig.provider,
        model: `${humanizedParsed.model || humanizedModel || baseRewrite.model} + humanizer`,
        humanized: true
      },
      humanizedModel || baseRewrite.model
    );

    return {
      ...baseRewrite,
      ...humanizedRewrite,
      title: humanizedRewrite.title || baseRewrite.title,
      body:
        !humanizedRewrite.body || shouldPreferBaseRewriteBody(baseRewrite.body, humanizedRewrite.body)
          ? baseRewrite.body
          : humanizedRewrite.body,
      coverText: humanizedRewrite.coverText || baseRewrite.coverText,
      tags: humanizedRewrite.tags.length ? humanizedRewrite.tags : baseRewrite.tags,
      rewriteNotes: humanizedRewrite.rewriteNotes || baseRewrite.rewriteNotes,
      safetyNotes: humanizedRewrite.safetyNotes || baseRewrite.safetyNotes,
      humanized: true
    };
  } catch {
    return baseRewrite;
  }
}
