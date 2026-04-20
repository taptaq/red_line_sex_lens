import "./env.js";
import fs from "node:fs/promises";
import path from "node:path";
import { abstractReasonPhraseLabels, feedbackContextCategories } from "./feedback.js";

const glmEndpoint = "https://open.bigmodel.cn/api/paas/v4/chat/completions";
const defaultVisionModel = process.env.GLM_VISION_MODEL || "glm-4.6v";
const defaultTextModel = process.env.GLM_TEXT_MODEL || "glm-4.6v";
const defaultFeedbackModel = process.env.GLM_FEEDBACK_MODEL || defaultTextModel || "glm-4.6v";
const defaultQwenFeedbackModel = process.env.QWEN_FEEDBACK_MODEL || "qwen-plus";
const defaultDeepSeekFeedbackModel = process.env.DEEPSEEK_FEEDBACK_MODEL || "deepseek-chat";
const humanizerPassEnabled = process.env.HUMANIZER_PASS_ENABLED !== "false";
const textModelCandidates = [
  defaultTextModel,
  "glm-4.7",
].filter((item, index, list) => item && list.indexOf(item) === index);
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
    envKey: "DASHSCOPE_API_KEY",
    endpoint: "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
    models: [defaultQwenFeedbackModel]
  },
  {
    provider: "deepseek",
    label: "深度求索",
    envKey: "DEEPSEEK_API_KEY",
    endpoint: "https://api.deepseek.com/chat/completions",
    models: [defaultDeepSeekFeedbackModel]
  }
];

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

  if (Array.isArray(content.content)) {
    return flattenContent(content.content);
  }

  if (Array.isArray(content.parts)) {
    return flattenContent(content.parts);
  }

  if (Array.isArray(content.items)) {
    return flattenContent(content.items);
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

function stripTrailingCommas(text) {
  return String(text || "").replace(/,\s*([}\]])/g, "$1");
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

  const repaired = stripTrailingCommas(escapeControlCharsInsideStrings(sanitized));

  if (repaired && repaired !== sanitized) {
    return extractJsonBlock(repaired);
  }

  const repairedBalanced = extractBalancedJsonSegment(repaired);

  if (repairedBalanced) {
    try {
      return JSON.parse(repairedBalanced);
    } catch {}
  }

  return null;
}

async function callGlmJson({
  model,
  models,
  temperature = 0.2,
  messages,
  missingKeyMessage,
  responseFormat = "json_object",
  fallbackParser = null
}) {
  const apiKey = String(process.env.GLM_API_KEY || "").trim();

  if (!apiKey) {
    throw createGlmError(missingKeyMessage || "缺少 GLM_API_KEY 环境变量。", 400);
  }

  const candidates = (Array.isArray(models) && models.length ? models : [model]).filter(Boolean);
  let lastError = null;

  for (const candidate of candidates) {
    const baseRequestBody = {
      model: candidate,
      temperature,
      max_tokens: 700,
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

    for (const requestBody of requestBodies) {
      for (let attempt = 0; attempt < 2; attempt += 1) {
        const response = await fetch(glmEndpoint, {
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
          data?.error?.message || data?.msg || data?.message || `GLM 请求失败，状态码 ${response.status}`;
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

      const rawContent = data?.choices?.[0]?.message?.content;
      const message = flattenContent(rawContent);
      const parsed = tryParseJson(message);

      if (!parsed && typeof fallbackParser === "function") {
        const fallbackParsed = fallbackParser(message, rawContent);

        if (fallbackParsed) {
          return {
            parsed: fallbackParsed,
            model: data?.model || candidate
          };
        }
      }

      if (!parsed) {
        if (attempt === 0) {
          await sleep(250);
          continue;
        }

        const previewSource = message || JSON.stringify(rawContent || "").slice(0, 240);
        const preview = sanitizeJsonLikeText(previewSource).slice(0, 180);
        throw createGlmError(
          preview ? `GLM 返回的结果不是有效 JSON。原始片段：${preview}` : "GLM 返回的结果不是有效 JSON。",
          502
        );
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

  throw createGlmError("GLM 暂时不可用，请稍后再试。", 503);
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

export async function recognizeFeedbackScreenshot({ imageDataUrl, mimeType, fileName = "" }) {
  const { parsed, model } = await callGlmJson({
    model: defaultVisionModel,
    temperature: 0.1,
    missingKeyMessage: "截图识别缺少 GLM_API_KEY 环境变量。",
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
  const tags = Array.isArray(payload?.tags)
    ? [...new Set(payload.tags.map((item) => String(item || "").trim()).filter(Boolean))]
    : [];

  return {
    model: String(payload?.model || fallbackModel || defaultTextModel).trim(),
    title: String(payload?.title || "").trim(),
    body: String(payload?.body || "").trim(),
    coverText: String(payload?.coverText || "").trim(),
    tags,
    rewriteNotes: String(payload?.rewriteNotes || "").trim(),
    safetyNotes: String(payload?.safetyNotes || "").trim(),
    humanized: payload?.humanized === true
  };
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
    "封面文案",
    "改写封面文案",
    "标签",
    "推荐标签",
    "改写标签",
    "改写说明",
    "润色说明",
    "rewriteNotes",
    "人工留意",
    "安全提示",
    "safetyNotes"
  ];

  const title = extractLabeledSection(source, ["标题", "改写标题"], allLabels);
  const body = extractLabeledSection(source, ["正文", "改写正文"], allLabels);
  const coverText = extractLabeledSection(source, ["封面文案", "改写封面文案"], allLabels);
  const tags = parseTagList(extractLabeledSection(source, ["标签", "推荐标签", "改写标签"], allLabels));
  const rewriteNotes = extractLabeledSection(source, ["改写说明", "润色说明", "rewriteNotes"], allLabels);
  const safetyNotes = extractLabeledSection(source, ["人工留意", "安全提示", "safetyNotes"], allLabels);

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
  reviewAudit = null
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

  for (const config of feedbackProviderConfigs) {
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

export async function rewritePostForCompliance({ input = {}, analysis = {} }) {
  const semantic = analysis?.semanticReview?.status === "ok" ? analysis.semanticReview.review : null;
  const { parsed, model } = await callGlmJson({
    models: textModelCandidates,
    temperature: 0.5,
    missingKeyMessage: "改写功能缺少 GLM_API_KEY 环境变量。",
    fallbackParser: salvageRewritePayload,
    messages: [
      {
        role: "system",
        content: [
          "你是小红书内容安全团队中的中文合规编辑与改写助手。",
          "目标是帮助用户在尽量保留原笔记风格、人设、语气、节奏、表达习惯的前提下，把内容改写得更安全，而不是把原文改成模板化科普文，也不是帮助规避审核。",
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
          "",
          "改写偏好补充：",
          "1. 不要把所有内容都改成统一的官方科普腔。",
          "2. 不要无故拔高措辞，不要写得太像说明书。",
          "3. 能保留原来的分享感、口语感、记录感，就尽量保留。",
          "4. rewriteNotes 请说明你主要改掉了哪些风险点；如果保留了原风格，也请点明。"
        ].join("\n")
      }
    ]
  });

  const baseRewrite = normalizeRewriteResult(
    {
      ...parsed,
      model: parsed.model || model || defaultTextModel
    },
    model || defaultTextModel
  );

  if (!humanizerPassEnabled) {
    return baseRewrite;
  }

  try {
    const { parsed: humanizedParsed, model: humanizedModel } = await callGlmJson({
      models: textModelCandidates,
      temperature: 0.45,
      missingKeyMessage: "改写后人味化缺少 GLM_API_KEY 环境变量。",
      fallbackParser: salvageRewritePayload,
      messages: [
        {
          role: "system",
          content: [
            "你现在执行 humanizer 技能，对中文文本做去 AI 腔润色。",
            "你的任务不是改意思，也不是重新创作，而是去掉明显的 AI 写作痕迹，让文字更像真人写的。",
            "重点处理这些问题：过度拔高意义、假大空、宣传腔、过于整齐的排比、僵硬的提纲感、过量 AI 常用词、套话、空洞总结、无聊的安全说明、过分平均的句式。",
            "保留作者原本的语气、分享感、口语感、节奏、人设和情绪。",
            "原始笔记就是你的风格样本，必须向它靠拢，不要把文本润色成统一模板腔。",
            "不要引入新的风险内容，不要恢复已经删掉的高风险表达。",
            "请做一次 final anti-AI pass：先在心里判断哪里还像 AI 文，再把它改得更自然，但不要把这个思考过程写出来。",
            "输出必须是 JSON。"
          ].join("\n")
        },
        {
          role: "user",
          content: [
            "请把下面已经合规改写过的版本，再做一轮人味化处理。",
            "要求：",
            "1. 保留内容含义和合规方向，不要把风险点写回去。",
            "2. 尽量贴近原笔记的表达习惯，让它像同一个人写的。",
            "3. 去掉明显 AI 味，包括模板化科普腔、说明书腔、假大空总结、过于工整的排比。",
            "4. 可以让句子更自然、更口语一点，但不要油腻，不要过度发挥。",
            "5. 如果某一段已经自然，就尽量少改。",
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
            `语义风险原因：${JSON.stringify(semantic?.reasons || [])}`
          ].join("\n")
        }
      ]
    });

    return normalizeRewriteResult(
      {
        ...humanizedParsed,
        model: `${humanizedParsed.model || humanizedModel || baseRewrite.model} + humanizer`,
        humanized: true
      },
      humanizedModel || baseRewrite.model
    );
  } catch {
    return baseRewrite;
  }
}
