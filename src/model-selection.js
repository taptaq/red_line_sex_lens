import "./env.js";
import { providerDisplayLabel } from "./provider-display.js";

const defaultSemanticSelection = "auto";
const defaultRewriteSelection = "auto";
const defaultGenerationSelection = "auto";
const defaultCrossReviewSelection = "group";
const defaultFeedbackScreenshotSelection = "auto";
const defaultFeedbackSuggestionSelection = "auto";
const standaloneDmxapiTextModels = [
  "gemini-3.1-pro-preview-ssvip",
  "gpt-5.4",
  "claude-sonnet-4-6-ssvip",
  "grok-4.2-nothinking"
];

function uniqueNonEmpty(items = []) {
  return items.filter((item, index, list) => item && list.indexOf(item) === index);
}

function getGlmDmxapiModel() {
  return String(process.env.GLM_DMXAPI_MODEL || "glm-5.1").trim();
}

function getQwenDmxapiModel() {
  return String(process.env.QWEN_DMXAPI_MODEL || "qwen3.5-plus-2026-02-15").trim();
}

function getMiniMaxDmxapiModel() {
  return String(process.env.MINIMAX_DMXAPI_MODEL || "MiniMax-M2.5").trim();
}

export function getStandaloneDmxapiTextModels() {
  return standaloneDmxapiTextModels.slice();
}

export function isStandaloneDmxapiTextModel(value = "") {
  return standaloneDmxapiTextModels.includes(String(value || "").trim().toLowerCase());
}

function getSemanticGlmModel() {
  return String(process.env.GLM_SEMANTIC_MODEL || process.env.GLM_CROSS_REVIEW_MODEL || process.env.GLM_TEXT_MODEL || "glm-4.6v").trim();
}

function getCrossReviewGlmModel() {
  return String(process.env.GLM_CROSS_REVIEW_MODEL || "glm-4-flash").trim();
}

function getSemanticQwenModel() {
  return String(process.env.QWEN_DMXAPI_MODEL || "qwen3.5-plus").trim();
}

function getCrossReviewQwenModel() {
  return String(process.env.QWEN_DMXAPI_MODEL || "qwen3.5-plus").trim();
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
  return String(process.env.KIMI_TEXT_MODEL || "kimi-k2.6").trim();
}

function getRewriteQwenModel() {
  return String(process.env.QWEN_DMXAPI_MODEL || "qwen3.5-plus").trim();
}

function getRewriteDeepSeekModel() {
  return String(process.env.DEEPSEEK_FEEDBACK_MODEL || "deepseek-v4-flash").trim();
}

function getRewriteProviderPreference() {
  const provider = String(process.env.REWRITE_PROVIDER || "glm").trim().toLowerCase();
  return provider === "kimi" ? "kimi" : "glm";
}

function buildProviderOption(value, label, primaryModel, fallbackModel = "", options = {}) {
  const primarySourceLabel = String(options.primarySourceLabel || "").trim();
  const fallbackSourceLabel = String(options.fallbackSourceLabel || "").trim();
  const formatModelText = (sourceLabel, model) => (sourceLabel ? `${sourceLabel} ${model}` : model);

  const modelText =
    primaryModel && fallbackModel && primaryModel !== fallbackModel
      ? `${formatModelText(primarySourceLabel, primaryModel)} / ${formatModelText(fallbackSourceLabel, fallbackModel)}`
      : primaryModel
        ? formatModelText(primarySourceLabel, primaryModel)
        : fallbackModel
          ? formatModelText(fallbackSourceLabel, fallbackModel)
          : "未配置模型";

  return {
    value,
    provider: value,
    label: `${label} / ${modelText}`
  };
}

function buildStandaloneDmxapiModelOption(model) {
  return {
    value: model,
    provider: "dmxapi_text",
    label: `DMXAPI / ${model}`
  };
}

function buildTextSelectionOptions(defaultOption, ...providerOptions) {
  return [defaultOption, ...providerOptions, ...standaloneDmxapiTextModels.map(buildStandaloneDmxapiModelOption)];
}

export function buildModelSelectionOptionsPayload() {
  const semantic = buildTextSelectionOptions(
    {
      value: defaultSemanticSelection,
      provider: "",
      label: "默认自动 / 依次尝试当前语义复判模型"
    },
    buildProviderOption("glm", providerDisplayLabel("glm"), getGlmDmxapiModel(), getSemanticGlmModel(), {
      primarySourceLabel: "DMXAPI",
      fallbackSourceLabel: "官方"
    }),
    buildProviderOption("qwen", providerDisplayLabel("qwen"), getQwenDmxapiModel(), getSemanticQwenModel(), {
      primarySourceLabel: "DMXAPI",
      fallbackSourceLabel: "官方"
    }),
    buildProviderOption("minimax", providerDisplayLabel("minimax"), getMiniMaxDmxapiModel(), "", {
      primarySourceLabel: "DMXAPI"
    }),
    buildProviderOption("deepseek", providerDisplayLabel("deepseek"), "", getSemanticDeepSeekModel())
  );

  const rewrite = buildTextSelectionOptions(
    {
      value: defaultRewriteSelection,
      provider: "",
      label: `默认自动 / 当前优先 ${providerDisplayLabel(getRewriteProviderPreference())}`
    },
    buildProviderOption("glm", providerDisplayLabel("glm"), getGlmDmxapiModel(), getRewriteGlmModel(), {
      primarySourceLabel: "DMXAPI",
      fallbackSourceLabel: "官方"
    }),
    buildProviderOption("kimi", providerDisplayLabel("kimi"), "", getRewriteKimiModel()),
    buildProviderOption("qwen", providerDisplayLabel("qwen"), getQwenDmxapiModel(), getRewriteQwenModel(), {
      primarySourceLabel: "DMXAPI",
      fallbackSourceLabel: "官方"
    }),
    buildProviderOption("minimax", providerDisplayLabel("minimax"), getMiniMaxDmxapiModel(), "", {
      primarySourceLabel: "DMXAPI"
    }),
    buildProviderOption("deepseek", providerDisplayLabel("deepseek"), "", getRewriteDeepSeekModel())
  );

  const generation = buildTextSelectionOptions(
    {
      value: defaultGenerationSelection,
      provider: "",
      label: `默认自动 / 当前优先 ${providerDisplayLabel(getRewriteProviderPreference())}`
    },
    buildProviderOption("glm", providerDisplayLabel("glm"), getGlmDmxapiModel(), getRewriteGlmModel(), {
      primarySourceLabel: "DMXAPI",
      fallbackSourceLabel: "官方"
    }),
    buildProviderOption("kimi", providerDisplayLabel("kimi"), "", getRewriteKimiModel()),
    buildProviderOption("qwen", providerDisplayLabel("qwen"), getQwenDmxapiModel(), getRewriteQwenModel(), {
      primarySourceLabel: "DMXAPI",
      fallbackSourceLabel: "官方"
    }),
    buildProviderOption("minimax", providerDisplayLabel("minimax"), getMiniMaxDmxapiModel(), "", {
      primarySourceLabel: "DMXAPI"
    }),
    buildProviderOption("deepseek", providerDisplayLabel("deepseek"), "", getRewriteDeepSeekModel())
  );

  const crossReview = buildTextSelectionOptions(
    {
      value: defaultCrossReviewSelection,
      provider: "",
      label: "默认模型组 / 并行调用全部交叉复判模型"
    },
    buildProviderOption("glm", providerDisplayLabel("glm"), getGlmDmxapiModel(), getCrossReviewGlmModel(), {
      primarySourceLabel: "DMXAPI",
      fallbackSourceLabel: "官方"
    }),
    buildProviderOption("kimi", providerDisplayLabel("kimi"), "", getRewriteKimiModel()),
    buildProviderOption("qwen", providerDisplayLabel("qwen"), getQwenDmxapiModel(), getCrossReviewQwenModel(), {
      primarySourceLabel: "DMXAPI",
      fallbackSourceLabel: "官方"
    }),
    buildProviderOption("minimax", providerDisplayLabel("minimax"), getMiniMaxDmxapiModel(), "", {
      primarySourceLabel: "DMXAPI"
    }),
    buildProviderOption("deepseek", providerDisplayLabel("deepseek"), "", getCrossReviewDeepSeekModel())
  );

  return {
    semantic,
    rewrite,
    generation,
    crossReview
  };
}

export function getSemanticComparisonSelections(preferredSelections = []) {
  const allowedPreferredSelections = new Set(
    (Array.isArray(preferredSelections) ? preferredSelections : [preferredSelections])
      .map((item) => String(item || "").trim().toLowerCase())
      .filter(Boolean)
  );
  const semanticOptions = buildModelSelectionOptionsPayload().semantic.filter(
    (item) => String(item?.value || "").trim().toLowerCase() !== defaultSemanticSelection
  );

  if (!allowedPreferredSelections.size) {
    return semanticOptions;
  }

  return semanticOptions.filter((item) => allowedPreferredSelections.has(String(item?.value || "").trim().toLowerCase()));
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
      buildProviderOption("qwen", providerDisplayLabel("qwen"), getQwenDmxapiModel(), getRewriteQwenModel(), {
        primarySourceLabel: "DMXAPI",
        fallbackSourceLabel: "官方"
      }),
      buildProviderOption("deepseek", providerDisplayLabel("deepseek"), "", getRewriteDeepSeekModel()),
      ...standaloneDmxapiTextModels.map(buildStandaloneDmxapiModelOption)
    ]
  };
}

const allowedSelections = {
  semantic: new Set(buildModelSelectionOptionsPayload().semantic.map((item) => item.value)),
  rewrite: new Set(buildModelSelectionOptionsPayload().rewrite.map((item) => item.value)),
  generation: new Set(buildModelSelectionOptionsPayload().generation.map((item) => item.value)),
  crossReview: new Set(buildModelSelectionOptionsPayload().crossReview.map((item) => item.value))
};

function normalizeScopeSelection(scope, value) {
  const normalized = String(value || "").trim().toLowerCase();
  const defaultValue =
    scope === "semantic"
      ? defaultSemanticSelection
      : scope === "rewrite"
        ? defaultRewriteSelection
        : scope === "generation"
          ? defaultGenerationSelection
        : defaultCrossReviewSelection;

  return allowedSelections[scope]?.has(normalized) ? normalized : defaultValue;
}

export function normalizeModelSelectionState(value = {}) {
  const source = value && typeof value === "object" ? value : {};

  return {
    semantic: normalizeScopeSelection("semantic", source.semantic),
    rewrite: normalizeScopeSelection("rewrite", source.rewrite),
    generation: normalizeScopeSelection("generation", source.generation),
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

  if (isStandaloneDmxapiTextModel(normalizedSelection)) {
    return [
      {
        provider: "dmxapi_text",
        label: `DMXAPI / ${normalizedSelection}`,
        envKey: "DMXAPI_API_KEY",
        model: normalizedSelection,
        routeMode: "dmxapi_only"
      }
    ];
  }

  return (Array.isArray(providerConfigs) ? providerConfigs : []).filter(
    (item) => String(item?.provider || "").trim().toLowerCase() === normalizedSelection
  );
}

export function getRewriteProviderSelection(selection = "") {
  const normalizedSelection = normalizeScopeSelection("rewrite", selection);
  if (isStandaloneDmxapiTextModel(normalizedSelection)) return "dmxapi_text";
  return normalizedSelection === defaultRewriteSelection ? getRewriteProviderPreference() : normalizedSelection;
}

export function getGlmTextModelCandidates() {
  return uniqueNonEmpty([String(process.env.GLM_TEXT_MODEL || "glm-4.6v").trim(), "glm-4.7"]);
}

export function getRewriteSelectionModel(selection = "") {
  if (isStandaloneDmxapiTextModel(selection)) return String(selection || "").trim();
  const provider = getRewriteProviderSelection(selection);

  if (provider === "kimi") return getRewriteKimiModel();
  if (provider === "qwen") return getRewriteQwenModel();
  if (provider === "minimax") return getMiniMaxDmxapiModel();
  if (provider === "deepseek") return getRewriteDeepSeekModel();
  return getRewriteGlmModel();
}
