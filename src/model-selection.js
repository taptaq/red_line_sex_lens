import "./env.js";
import { providerDisplayLabel } from "./provider-display.js";

const defaultSemanticSelection = "auto";
const defaultRewriteSelection = "auto";
const defaultCrossReviewSelection = "group";
const defaultFeedbackScreenshotSelection = "auto";
const defaultFeedbackSuggestionSelection = "auto";

function uniqueNonEmpty(items = []) {
  return items.filter((item, index, list) => item && list.indexOf(item) === index);
}

function getGlmDmxapiModel() {
  return String(process.env.GLM_DMXAPI_MODEL || "glm-5.1-free").trim();
}

function getQwenDmxapiModel() {
  return String(process.env.QWEN_DMXAPI_MODEL || "qwen3.5-plus-free").trim();
}

function getMiniMaxDmxapiModel() {
  return String(process.env.MINIMAX_DMXAPI_MODEL || "MiniMax-M2.7-free").trim();
}

function getKimiDmxapiModel() {
  return String(process.env.KIMI_DMXAPI_MODEL || "kimi-k2.6-free").trim();
}

function getMimoDmxapiModel() {
  return String(process.env.MIMO_DMXAPI_MODEL || process.env.DEEPSEEK_DMXAPI_MODEL || "mimo-v2.5-free").trim();
}

function getSemanticGlmModel() {
  return String(process.env.GLM_SEMANTIC_MODEL || process.env.GLM_CROSS_REVIEW_MODEL || process.env.GLM_TEXT_MODEL || "glm-4.6v").trim();
}

function getCrossReviewGlmModel() {
  return String(process.env.GLM_CROSS_REVIEW_MODEL || "glm-4-flash").trim();
}

function getSemanticQwenModel() {
  return String(process.env.QWEN_SEMANTIC_MODEL || process.env.QWEN_CROSS_REVIEW_MODEL || "qwen-plus").trim();
}

function getCrossReviewQwenModel() {
  return String(process.env.QWEN_CROSS_REVIEW_MODEL || "qwen-plus").trim();
}

function getSemanticDeepSeekModel() {
  return String(process.env.DEEPSEEK_SEMANTIC_MODEL || process.env.DEEPSEEK_CROSS_REVIEW_MODEL || "deepseek-v4-flash").trim();
}

function getCrossReviewDeepSeekModel() {
  return String(process.env.DEEPSEEK_CROSS_REVIEW_MODEL || "deepseek-v4-flash").trim();
}

function getRewriteGlmModel() {
  return String(process.env.GLM_TEXT_MODEL || "glm-4.6v").trim();
}

function getRewriteKimiModel() {
  return String(process.env.KIMI_TEXT_MODEL || "moonshot-v1-8k").trim();
}

function getRewriteQwenModel() {
  return String(process.env.QWEN_FEEDBACK_MODEL || "qwen-plus").trim();
}

function getRewriteDeepSeekModel() {
  return String(process.env.DEEPSEEK_FEEDBACK_MODEL || "deepseek-v4-flash").trim();
}

function getRewriteProviderPreference() {
  const provider = String(process.env.REWRITE_PROVIDER || "glm").trim().toLowerCase();
  return provider === "kimi" ? "kimi" : "glm";
}

function buildProviderOption(value, label, primaryModel, fallbackModel = "") {
  const modelText =
    primaryModel && fallbackModel && primaryModel !== fallbackModel
      ? `DMXAPI ${primaryModel} / 官方 ${fallbackModel}`
      : primaryModel || fallbackModel || "未配置模型";

  return {
    value,
    provider: value,
    label: `${label} / ${modelText}`
  };
}

export function buildModelSelectionOptionsPayload() {
  const semantic = [
    {
      value: defaultSemanticSelection,
      provider: "",
      label: "默认自动 / 依次尝试当前语义复判模型"
    },
    buildProviderOption("glm", providerDisplayLabel("glm"), getGlmDmxapiModel(), getSemanticGlmModel()),
    buildProviderOption("qwen", providerDisplayLabel("qwen"), getQwenDmxapiModel(), getSemanticQwenModel()),
    buildProviderOption("minimax", providerDisplayLabel("minimax"), getMiniMaxDmxapiModel()),
    buildProviderOption("deepseek", providerDisplayLabel("deepseek"), getMimoDmxapiModel(), getSemanticDeepSeekModel())
  ];

  const rewrite = [
    {
      value: defaultRewriteSelection,
      provider: "",
      label: `默认自动 / 当前优先 ${providerDisplayLabel(getRewriteProviderPreference())}`
    },
    buildProviderOption("glm", providerDisplayLabel("glm"), getGlmDmxapiModel(), getRewriteGlmModel()),
    buildProviderOption("kimi", providerDisplayLabel("kimi"), getKimiDmxapiModel(), getRewriteKimiModel()),
    buildProviderOption("qwen", providerDisplayLabel("qwen"), getQwenDmxapiModel(), getRewriteQwenModel()),
    buildProviderOption("minimax", providerDisplayLabel("minimax"), getMiniMaxDmxapiModel()),
    buildProviderOption("deepseek", providerDisplayLabel("deepseek"), getMimoDmxapiModel(), getRewriteDeepSeekModel())
  ];

  const crossReview = [
    {
      value: defaultCrossReviewSelection,
      provider: "",
      label: "默认模型组 / 并行调用全部交叉复判模型"
    },
    buildProviderOption("glm", providerDisplayLabel("glm"), getGlmDmxapiModel(), getCrossReviewGlmModel()),
    buildProviderOption("qwen", providerDisplayLabel("qwen"), getQwenDmxapiModel(), getCrossReviewQwenModel()),
    buildProviderOption("minimax", providerDisplayLabel("minimax"), getMiniMaxDmxapiModel()),
    buildProviderOption("deepseek", providerDisplayLabel("deepseek"), getMimoDmxapiModel(), getCrossReviewDeepSeekModel())
  ];

  return {
    semantic,
    rewrite,
    crossReview
  };
}

export function buildFeedbackModelSelectionOptionsPayload() {
  return {
    feedbackScreenshot: [
      {
        value: defaultFeedbackScreenshotSelection,
        provider: "",
        label: "默认自动 / 当前视觉识别模型"
      },
      buildProviderOption("glm", providerDisplayLabel("glm"), getSemanticGlmModel())
    ],
    feedbackSuggestion: [
      {
        value: defaultFeedbackSuggestionSelection,
        provider: "",
        label: "默认自动 / 顺序尝试候选补充模型"
      },
      buildProviderOption("glm", providerDisplayLabel("glm"), getGlmTextModelCandidates()[0] || getRewriteGlmModel()),
      buildProviderOption("qwen", providerDisplayLabel("qwen"), getQwenDmxapiModel(), getRewriteQwenModel()),
      buildProviderOption("deepseek", providerDisplayLabel("deepseek"), getMimoDmxapiModel(), getRewriteDeepSeekModel())
    ]
  };
}

const allowedSelections = {
  semantic: new Set(buildModelSelectionOptionsPayload().semantic.map((item) => item.value)),
  rewrite: new Set(buildModelSelectionOptionsPayload().rewrite.map((item) => item.value)),
  crossReview: new Set(buildModelSelectionOptionsPayload().crossReview.map((item) => item.value))
};

function normalizeScopeSelection(scope, value) {
  const normalized = String(value || "").trim().toLowerCase();
  const defaultValue =
    scope === "semantic"
      ? defaultSemanticSelection
      : scope === "rewrite"
        ? defaultRewriteSelection
        : defaultCrossReviewSelection;

  return allowedSelections[scope]?.has(normalized) ? normalized : defaultValue;
}

export function normalizeModelSelectionState(value = {}) {
  const source = value && typeof value === "object" ? value : {};

  return {
    semantic: normalizeScopeSelection("semantic", source.semantic),
    rewrite: normalizeScopeSelection("rewrite", source.rewrite),
    crossReview: normalizeScopeSelection("crossReview", source.crossReview)
  };
}

const feedbackAllowedSelections = {
  feedbackScreenshot: new Set(buildFeedbackModelSelectionOptionsPayload().feedbackScreenshot.map((item) => item.value)),
  feedbackSuggestion: new Set(buildFeedbackModelSelectionOptionsPayload().feedbackSuggestion.map((item) => item.value))
};

function normalizeFeedbackScopeSelection(scope, value) {
  const normalized = String(value || "").trim().toLowerCase();
  const defaultValue = scope === "feedbackScreenshot" ? defaultFeedbackScreenshotSelection : defaultFeedbackSuggestionSelection;

  return feedbackAllowedSelections[scope]?.has(normalized) ? normalized : defaultValue;
}

export function normalizeFeedbackModelSelectionState(value = {}) {
  const source = value && typeof value === "object" ? value : {};

  return {
    feedbackScreenshot: normalizeFeedbackScopeSelection("feedbackScreenshot", source.feedbackScreenshot),
    feedbackSuggestion: normalizeFeedbackScopeSelection("feedbackSuggestion", source.feedbackSuggestion)
  };
}

export function filterProviderConfigsBySelection(providerConfigs = [], selection = "") {
  const normalizedSelection = String(selection || "").trim().toLowerCase();

  if (!normalizedSelection || normalizedSelection === defaultSemanticSelection || normalizedSelection === defaultCrossReviewSelection) {
    return Array.isArray(providerConfigs) ? providerConfigs : [];
  }

  return (Array.isArray(providerConfigs) ? providerConfigs : []).filter(
    (item) => String(item?.provider || "").trim().toLowerCase() === normalizedSelection
  );
}

export function getRewriteProviderSelection(selection = "") {
  const normalizedSelection = normalizeScopeSelection("rewrite", selection);
  return normalizedSelection === defaultRewriteSelection ? getRewriteProviderPreference() : normalizedSelection;
}

export function getGlmTextModelCandidates() {
  return uniqueNonEmpty([String(process.env.GLM_TEXT_MODEL || "glm-4.6v").trim(), "glm-4.7"]);
}

export function getRewriteSelectionModel(selection = "") {
  const provider = getRewriteProviderSelection(selection);

  if (provider === "kimi") return getRewriteKimiModel();
  if (provider === "qwen") return getRewriteQwenModel();
  if (provider === "minimax") return getMiniMaxDmxapiModel();
  if (provider === "deepseek") return getRewriteDeepSeekModel();
  return getRewriteGlmModel();
}
