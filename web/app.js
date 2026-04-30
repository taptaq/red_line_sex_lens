import {
  buildFalsePositiveActionMarkup,
  buildFalsePositiveCaptureSources,
  buildFalsePositiveEntryMarkup
} from "./false-positive-view.js";
import { buildRewriteBodyMarkup } from "./rewrite-result-view.js";

function byId(id) {
  return document.getElementById(id);
}

function splitCSV(value) {
  return String(value || "")
    .split(/[，,、]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function joinCSV(items = []) {
  return Array.isArray(items) ? items.join(", ") : "";
}

function uniqueStrings(items = []) {
  return [...new Set((Array.isArray(items) ? items : [items]).map((item) => String(item || "").trim()).filter(Boolean))];
}

function buildAnalyzeTagSelectionMarkup(tags = []) {
  const normalized = uniqueStrings(tags);

  if (!normalized.length) {
    return '<span class="tag-picker-empty">尚未选择标签</span>';
  }

  return normalized
    .map(
      (tag) => `
        <span class="tag-chip">
          <span>${escapeHtml(tag)}</span>
        </span>
      `
    )
    .join("");
}

function verdictLabel(verdict) {
  if (verdict === "hard_block") return "高风险拦截";
  if (verdict === "manual_review") return "人工复核";
  if (verdict === "observe") return "观察通过";
  return "通过";
}

function matchLabel(match) {
  if (match === "regex") return "正则";
  return "精确词";
}

function lexiconLevelLabel(level) {
  if (level === "l1") return "一级词库";
  if (level === "l3") return "三级词库";
  return "二级词库";
}

function inferLexiconLevel(level, riskLevel) {
  const text = String(level || "").trim().toLowerCase();

  if (text === "l1" || text === "l2" || text === "l3") {
    return text;
  }

  if (riskLevel === "hard_block") {
    return "l1";
  }
  if (riskLevel === "observe" || riskLevel === "pass") {
    return "l3";
  }

  return "l2";
}

function reviewStatusLabel(status) {
  if (status === "pending_review") return "待复核";
  if (status === "approved") return "已采纳";
  if (status === "rejected") return "已驳回";
  return String(status || "").trim() || "待复核";
}

function consensusLabel(consensus) {
  if (consensus === "unanimous") return "结论一致";
  if (consensus === "majority") return "多数一致";
  if (consensus === "split") return "结论分歧";
  if (consensus === "single") return "单模型返回";
  return "暂无共识";
}

function reviewAuditLabel(audit) {
  return String(audit?.label || "").trim() || "未完成规则复盘";
}

function rulePreviewRiskLabel(riskLevel) {
  if (riskLevel === "high") return "高风险预演";
  if (riskLevel === "medium") return "中风险预演";
  if (riskLevel === "low") return "低风险预演";
  if (riskLevel === "none") return "暂无影响";
  return "影响预演";
}

function falsePositiveStatusLabel(status) {
  if (status === "platform_passed_confirmed") return "观察期后仍正常";
  if (status === "platform_passed_pending") return "已发出，目前正常";
  return String(status || "").trim() || "待观察";
}

function publishStatusLabel(status) {
  if (status === "published_passed") return "已发布通过";
  if (status === "limited") return "疑似限流";
  if (status === "violation") return "平台判违规";
  if (status === "false_positive") return "系统误报 / 平台放行";
  if (status === "positive_performance") return "过审且表现好";
  return "未发布";
}

function lifecycleSourceLabel(source) {
  if (source === "benchmark_mismatch") return "基准未命中回流";
  if (source === "generation_final") return "最终推荐稿";
  if (source === "generation_candidate") return "生成候选稿";
  if (source === "generation") return "生成稿";
  if (source === "rewrite") return "改写稿";
  if (source === "analysis") return "检测记录";
  return String(source || "").trim() || "manual";
}

function compactText(value, maxLength = 80) {
  const text = String(value || "").replace(/\s+/g, " ").trim();

  if (!text) {
    return "";
  }

  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

function buildRuleChangePreviewMarkup(preview = null) {
  if (!preview) {
    return "";
  }

  const impactedSamples = Array.isArray(preview.impactedSamples) ? preview.impactedSamples : [];
  const sampleMarkup = impactedSamples.length
    ? impactedSamples
        .slice(0, 3)
        .map(
          (item) => `
            <li>
              <strong>${escapeHtml(item.title || "未命名样本")}</strong>
              <span>${escapeHtml(item.kind || "sample")} / 权重 ${escapeHtml(String(item.sampleWeight ?? 0))} / ${escapeHtml(
                item.previewEffect || "可能受影响"
              )}</span>
            </li>
          `
        )
        .join("")
    : "<li><strong>未命中历史样本</strong><span>当前影响面较小</span></li>";
  const warnings = Array.isArray(preview.warnings) && preview.warnings.length
    ? `<p class="rule-preview-warning">${escapeHtml(preview.warnings.join("；"))}</p>`
    : "";

  return `
    <div class="rule-preview-card rule-preview-${escapeHtml(preview.riskLevel || "none")}">
      <div class="rule-preview-head">
        <span>${escapeHtml(rulePreviewRiskLabel(preview.riskLevel))}</span>
        <strong>${escapeHtml(preview.changeType === "whitelist" ? "白名单生效预演" : "规则入库预演")}</strong>
      </div>
      <p>${escapeHtml(preview.summary || "暂无预演摘要")}</p>
      <div class="meta-row">
        <span class="meta-pill">影响 ${escapeHtml(String(preview.impactedCount || 0))} 条</span>
        <span class="meta-pill">影响权重 ${escapeHtml(String(preview.totalImpactWeight || 0))}</span>
      </div>
      ${warnings}
      <ul>${sampleMarkup}</ul>
    </div>
  `;
}

function activateTab(targetId) {
  document.querySelectorAll(".tab-button[data-tab-target]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.tabTarget === targetId);
  });

  document.querySelectorAll(".tab-panel").forEach((panel) => {
    panel.classList.toggle("is-active", panel.id === targetId);
  });
}

function initializeTabs() {
  document.querySelectorAll(".tab-button[data-tab-target]").forEach((button) => {
    button.addEventListener("click", () => activateTab(button.dataset.tabTarget));
  });

  activateTab("custom-lexicon-pane");
}

function revealSampleLibraryPane() {
  activateTab("sample-library-pane");
  byId("sample-library-pane")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function revealStyleProfilePane() {
  revealSampleLibraryPane();
  byId("style-profile-topic")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function revealFalsePositiveLogPane() {
  activateTab("false-positive-log-pane");
  byId("false-positive-log-pane")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function revealReviewBenchmarkPane() {
  activateTab("review-benchmark-pane");
  byId("review-benchmark-pane")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

const appState = {
  latestAnalyzePayload: null,
  latestAnalysis: null,
  latestRewrite: null,
  latestGeneration: null,
  latestAnalysisFalsePositiveSource: null,
  latestRewriteFalsePositiveSource: null,
  falsePositiveLog: [],
  reviewBenchmarkSamples: [],
  reviewBenchmarkLastRunResult: null,
  reviewBenchmarkCollectionFilter: "all",
  reviewBenchmarkTypeFilter: "all",
  reviewBenchmarkSourceFilter: "all",
  reviewBenchmarkViewFilter: "all",
  collectionTypeOptions: [],
  sampleLibraryRecords: [],
  selectedSampleLibraryRecordId: "",
  sampleLibraryCollectionFilter: "all",
  sampleLibraryFilter: "all",
  sampleLibrarySearch: "",
  styleProfileState: null,
  styleProfileDraftEditing: false,
  styleProfileDraftForm: {
    topic: "",
    tone: "",
    titleStyle: "",
    bodyStructure: "",
    preferredTags: ""
  },
  modelOptions: null,
  modelRecommendations: {}
};

const presetAnalyzeTags = [
  "两性",
  "身体探索",
  "关系沟通",
  "亲密关系",
  "性教育",
  "健康科普",
  "女性成长",
  "男性成长",
  "婚恋关系",
  "伴侣沟通",
  "边界感",
  "情绪价值",
  "安全提醒",
  "科普",
  "经验分享"
];
let analyzeTagOptions = [...presetAnalyzeTags];
const analyzeTagOptionsApi = "/api/analyze-tag-options";
const collectionTypesApi = "/api/collection-types";
const modelOptionsApi = "/api/model-options";
const reviewBenchmarkApi = "/api/review-benchmark";
const sampleLibraryApi = "/api/sample-library";

function buildCollectionTypeOptionsMarkup({
  options = [],
  value = "",
  allowAll = false,
  placeholder = "请选择合集类型"
} = {}) {
  const normalizedValue = String(value || "").trim();
  const baseOptions = allowAll ? ['<option value="all">全部合集</option>'] : [`<option value="">${escapeHtml(placeholder)}</option>`];

  return [
    ...baseOptions,
    ...options.map(
      (item) => `<option value="${escapeHtml(item)}"${normalizedValue === item ? " selected" : ""}>${escapeHtml(item)}</option>`
    )
  ].join("");
}

function renderCollectionTypeSelectors() {
  const analyzeSelect = byId("analyze-collection-type-select");
  const generationSelect = byId("generation-collection-type-select");
  const sampleLibrarySelect = byId("sample-library-collection-type-select");
  const sampleLibraryFilterSelect = byId("sample-library-collection-filter");
  const reviewBenchmarkSelect = byId("review-benchmark-collection-type-select");
  const reviewBenchmarkFilterSelect = byId("review-benchmark-collection-filter");

  if (analyzeSelect) {
    analyzeSelect.innerHTML = buildCollectionTypeOptionsMarkup({
      options: appState.collectionTypeOptions,
      value: analyzeSelect.value || appState.latestAnalyzePayload?.collectionType || ""
    });
  }

  if (generationSelect) {
    generationSelect.innerHTML = buildCollectionTypeOptionsMarkup({
      options: appState.collectionTypeOptions,
      value: generationSelect.value || appState.latestGeneration?.collectionType || ""
    });
  }

  if (sampleLibrarySelect) {
    sampleLibrarySelect.innerHTML = buildCollectionTypeOptionsMarkup({
      options: appState.collectionTypeOptions,
      value: sampleLibrarySelect.value
    });
  }

  if (sampleLibraryFilterSelect) {
    sampleLibraryFilterSelect.innerHTML = buildCollectionTypeOptionsMarkup({
      options: appState.collectionTypeOptions,
      value: appState.sampleLibraryCollectionFilter,
      allowAll: true
    });
  }

  if (reviewBenchmarkSelect) {
    reviewBenchmarkSelect.innerHTML = buildCollectionTypeOptionsMarkup({
      options: appState.collectionTypeOptions,
      value: reviewBenchmarkSelect.value
    });
  }

  if (reviewBenchmarkFilterSelect) {
    reviewBenchmarkFilterSelect.innerHTML = buildCollectionTypeOptionsMarkup({
      options: appState.collectionTypeOptions,
      value: appState.reviewBenchmarkCollectionFilter,
      allowAll: true
    });
  }

  syncAnalyzeActions();
  syncGenerationActions();
  syncSampleLibraryCreateActions();
  syncReviewBenchmarkActions();
}

async function loadCollectionTypeOptions() {
  const payload = await apiJson(collectionTypesApi);
  appState.collectionTypeOptions = Array.isArray(payload.options) ? payload.options : [];
  renderCollectionTypeSelectors();
}

async function addCollectionTypeOption(targetSelectId) {
  const nextName = window.prompt("输入新的合集类型名称");
  const normalizedName = String(nextName || "").trim();

  if (!normalizedName) {
    return;
  }

  const payload = await apiJson(collectionTypesApi, {
    method: "POST",
    body: JSON.stringify({ name: normalizedName })
  });

  appState.collectionTypeOptions = Array.isArray(payload.options) ? payload.options : appState.collectionTypeOptions;
  renderCollectionTypeSelectors();

  const select = byId(targetSelectId);
  if (select) {
    select.value = normalizedName;
  }

  syncAnalyzeActions();
  syncGenerationActions();
  syncSampleLibraryCreateActions();
  syncReviewBenchmarkActions();
}

function normalizeStyleProfileDraftForm(profile = {}) {
  return {
    topic: String(profile?.topic || "").trim(),
    tone: String(profile?.tone || "").trim(),
    titleStyle: String(profile?.titleStyle || "").trim(),
    bodyStructure: String(profile?.bodyStructure || "").trim(),
    preferredTags: joinCSV(profile?.preferredTags || [])
  };
}

function enterStyleProfileDraftEditMode(profile = null) {
  appState.styleProfileDraftEditing = true;
  appState.styleProfileDraftForm = normalizeStyleProfileDraftForm(profile || appState.styleProfileState?.draft || {});
}

function exitStyleProfileDraftEditMode() {
  appState.styleProfileDraftEditing = false;
  appState.styleProfileDraftForm = normalizeStyleProfileDraftForm({});
}

function buildStyleProfileDraftPayload(source = appState.styleProfileDraftForm) {
  const isFormElement = typeof HTMLFormElement !== "undefined" && source instanceof HTMLFormElement;
  const isContainerElement = !isFormElement && source && typeof source.querySelector === "function";
  const formValues = isFormElement
    ? Object.fromEntries(new FormData(source).entries())
    : isContainerElement
      ? {
          topic: source.querySelector('[name="topic"]')?.value,
          tone: source.querySelector('[name="tone"]')?.value,
          titleStyle: source.querySelector('[name="titleStyle"]')?.value,
          bodyStructure: source.querySelector('[name="bodyStructure"]')?.value,
          preferredTags: source.querySelector('[name="preferredTags"]')?.value
        }
      : source || {};
  const normalized = {
    topic: String(formValues.topic || "").trim(),
    tone: String(formValues.tone || "").trim(),
    titleStyle: String(formValues.titleStyle || "").trim(),
    bodyStructure: String(formValues.bodyStructure || "").trim(),
    preferredTags: String(formValues.preferredTags || "").trim()
  };

  appState.styleProfileDraftForm = normalized;

  return {
    topic: normalized.topic,
    tone: normalized.tone,
    titleStyle: normalized.titleStyle,
    bodyStructure: normalized.bodyStructure,
    preferredTags: splitCSV(normalized.preferredTags)
  };
}
const defaultModelSelectionOptions = {
  semantic: [
    { value: "auto", label: "默认自动 / 依次尝试当前语义复判模型" },
    { value: "glm", label: "智谱 GLM" },
    { value: "qwen", label: "通义千问" },
    { value: "minimax", label: "MiniMax" },
    { value: "mimo", label: "Mimo" },
    { value: "deepseek", label: "深度求索" }
  ],
  rewrite: [
    { value: "auto", label: "默认自动 / 使用当前默认改写模型" },
    { value: "glm", label: "智谱 GLM" },
    { value: "kimi", label: "Kimi" },
    { value: "qwen", label: "通义千问" },
    { value: "minimax", label: "MiniMax" },
    { value: "mimo", label: "Mimo" },
    { value: "deepseek", label: "深度求索" }
  ],
  crossReview: [
    { value: "group", label: "默认模型组 / 并行调用全部交叉复判模型" },
    { value: "glm", label: "智谱 GLM" },
    { value: "kimi", label: "Kimi" },
    { value: "qwen", label: "通义千问" },
    { value: "minimax", label: "MiniMax" },
    { value: "mimo", label: "Mimo" },
    { value: "deepseek", label: "深度求索" }
  ],
  feedbackScreenshot: [
    { value: "auto", label: "默认自动 / 当前视觉识别模型" },
    { value: "glm", label: "智谱 GLM" }
  ],
  feedbackSuggestion: [
    { value: "auto", label: "默认自动 / 顺序尝试候选补充模型" },
    { value: "glm", label: "智谱 GLM" },
    { value: "qwen", label: "通义千问" },
    { value: "mimo", label: "Mimo" },
    { value: "deepseek", label: "深度求索" }
  ]
};

async function loadAnalyzeCustomTagOptions() {
  try {
    const payload = await apiJson(analyzeTagOptionsApi);
    return uniqueStrings(Array.isArray(payload?.options) ? payload.options : []);
  } catch {
    return [];
  }
}

async function saveAnalyzeCustomTagOptions(options = []) {
  const customOnly = uniqueStrings(options).filter((tag) => !presetAnalyzeTags.includes(tag));
  await apiJson(analyzeTagOptionsApi, {
    method: "POST",
    body: JSON.stringify({
      options: customOnly
    })
  });
}

async function readJson(response) {
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload?.error || "请求失败");
  }

  return payload;
}

async function apiJson(url, options = {}) {
  const headers = { ...(options.headers || {}) };

  if (options.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  return fetch(url, { ...options, headers }).then(readJson);
}

function normalizeModelSelectionOptions(items = [], fallbackItems = []) {
  const source = Array.isArray(items) && items.length ? items : fallbackItems;

  return source
    .map((item) => ({
      value: String(item?.value || "").trim(),
      label: String(item?.label || item?.value || "").trim()
    }))
    .filter((item) => item.value && item.label);
}

function populateModelSelectionControl(selectId, items = [], fallbackValue = "") {
  const select = byId(selectId);

  if (!(select instanceof HTMLSelectElement)) {
    return;
  }

  const previousValue = String(select.value || fallbackValue || "").trim();
  select.innerHTML = items
    .map((item) => `<option value="${escapeHtml(item.value)}">${escapeHtml(item.label)}</option>`)
    .join("");

  const nextValue = items.some((item) => item.value === previousValue) ? previousValue : fallbackValue || items[0]?.value || "";

  if (nextValue) {
    select.value = nextValue;
  }
}

function syncCrossReviewModelSelectionRules() {
  const rewriteSelect = byId("rewrite-model-selection");
  const crossReviewSelect = byId("cross-review-model-selection");

  if (!(rewriteSelect instanceof HTMLSelectElement) || !(crossReviewSelect instanceof HTMLSelectElement)) {
    return;
  }

  const blockedProvider = String(rewriteSelect.value || "").trim().toLowerCase();
  const shouldBlock = blockedProvider && blockedProvider !== "auto";

  [...crossReviewSelect.options].forEach((option) => {
    const optionValue = String(option.value || "").trim().toLowerCase();
    const baseLabel = option.dataset.baseLabel || option.textContent || "";
    const disabled = shouldBlock && optionValue === blockedProvider;

    option.dataset.baseLabel = baseLabel;
    option.disabled = disabled;
    option.textContent = disabled ? `${baseLabel}（改写已选）` : baseLabel;
  });

  if (shouldBlock && String(crossReviewSelect.value || "").trim().toLowerCase() === blockedProvider) {
    crossReviewSelect.value = [...crossReviewSelect.options].some((option) => option.value === "group" && !option.disabled)
      ? "group"
      : [...crossReviewSelect.options].find((option) => !option.disabled)?.value || "group";
  }
}

function renderModelSelectionControls(options = defaultModelSelectionOptions) {
  const normalizedOptions = {
    semantic: normalizeModelSelectionOptions(options?.semantic, defaultModelSelectionOptions.semantic),
    rewrite: normalizeModelSelectionOptions(options?.rewrite, defaultModelSelectionOptions.rewrite),
    crossReview: normalizeModelSelectionOptions(options?.crossReview, defaultModelSelectionOptions.crossReview),
    feedbackScreenshot: normalizeModelSelectionOptions(
      options?.feedbackScreenshot,
      defaultModelSelectionOptions.feedbackScreenshot
    ),
    feedbackSuggestion: normalizeModelSelectionOptions(
      options?.feedbackSuggestion,
      defaultModelSelectionOptions.feedbackSuggestion
    )
  };

  appState.modelOptions = normalizedOptions;
  populateModelSelectionControl("semantic-model-selection", normalizedOptions.semantic, "auto");
  populateModelSelectionControl("rewrite-model-selection", normalizedOptions.rewrite, "auto");
  populateModelSelectionControl("cross-review-model-selection", normalizedOptions.crossReview, "group");
  populateModelSelectionControl("feedback-screenshot-model-selection", normalizedOptions.feedbackScreenshot, "auto");
  populateModelSelectionControl("feedback-suggestion-model-selection", normalizedOptions.feedbackSuggestion, "auto");
  syncCrossReviewModelSelectionRules();
}

async function loadModelSelectionOptions() {
  try {
    const payload = await apiJson(modelOptionsApi);
    renderModelSelectionControls(payload);
  } catch {
    renderModelSelectionControls(defaultModelSelectionOptions);
  }
}

function getSelectedModelSelections() {
  return {
    semantic: String(byId("semantic-model-selection")?.value || "auto").trim() || "auto",
    rewrite: String(byId("rewrite-model-selection")?.value || "auto").trim() || "auto",
    crossReview: String(byId("cross-review-model-selection")?.value || "group").trim() || "group"
  };
}

function getSelectedFeedbackModelSelections() {
  return {
    feedbackScreenshot: String(byId("feedback-screenshot-model-selection")?.value || "auto").trim() || "auto",
    feedbackSuggestion: String(byId("feedback-suggestion-model-selection")?.value || "auto").trim() || "auto"
  };
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatConfidence(value) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "未提供";
  }

  return `${Math.round(value * 100)}%`;
}

function renderInfoPills(items = [], emptyText = "未提供", extraClass = "") {
  const tokens = Array.isArray(items) ? items.filter(Boolean) : [];

  if (!tokens.length) {
    return `<span class="meta-pill ${extraClass}">${escapeHtml(emptyText)}</span>`;
  }

  return tokens
    .map((item) => `<span class="meta-pill ${extraClass}">${escapeHtml(item)}</span>`)
    .join("");
}

function normalizeTextValue(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeTextValue(item))
      .filter(Boolean)
      .join("\n")
      .trim();
  }

  if (!value || typeof value !== "object") {
    return String(value || "").trim();
  }

  return String(value.text || value.content || value.output_text || "").trim();
}

function normalizeTagListValue(value) {
  if (Array.isArray(value)) {
    return [...new Set(value.map((item) => normalizeTextValue(item)).filter(Boolean))];
  }

  return String(value || "")
    .split(/[\n,，、]/)
    .map((item) => item.replace(/^[-*•#\s]+/, "").trim())
    .filter(Boolean);
}

function pickFirstDefined(source, keys = []) {
  if (!source || typeof source !== "object") {
    return undefined;
  }

  for (const key of keys) {
    if (source[key] !== undefined && source[key] !== null) {
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

    if (pickFirstDefined(current, ["title", "body", "content", "text", "正文", "改写正文"]) !== undefined) {
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

function normalizeRewritePayload(payload) {
  const source = unwrapRewritePayload(payload);
  const provider = normalizeTextValue(pickFirstDefined(source, ["provider", "rewriteProvider"])).toLowerCase();

  return {
    provider,
    model: normalizeTextValue(pickFirstDefined(source, ["model", "modelName", "rewriteModel"])) || "GLM",
    title: normalizeTextValue(pickFirstDefined(source, ["title", "headline", "heading", "标题", "改写标题"])),
    body: normalizeTextValue(
      pickFirstDefined(source, ["body", "content", "text", "正文", "改写正文", "正文内容", "mainText", "bodyText"])
    ),
    coverText: normalizeTextValue(
      pickFirstDefined(source, ["coverText", "cover", "cover_text", "coverCopy", "封面文案", "改写封面文案", "封面"])
    ),
    tags: normalizeTagListValue(
      pickFirstDefined(source, ["tags", "tagList", "hashtags", "labels", "keywords", "recommendedTags", "推荐标签", "标签"])
    ),
    rewriteNotes: normalizeTextValue(
      pickFirstDefined(source, ["rewriteNotes", "notes", "rewriteReason", "rewriteSummary", "改写说明", "润色说明", "修改说明", "说明"])
    ),
    safetyNotes: normalizeTextValue(
      pickFirstDefined(source, ["safetyNotes", "riskNotes", "warnings", "attention", "人工留意", "安全提示", "注意事项", "风险提示"])
    ),
    patches: normalizePatchEntries(pickFirstDefined(source, ["patches", "rewritePatches", "patchPlan", "modifications"])),
    appliedPatches: normalizePatchEntries(
      pickFirstDefined(source, ["appliedPatches", "effectivePatches", "executedPatches"])
    ),
    rewriteMode: normalizeTextValue(pickFirstDefined(source, ["rewriteMode", "mode", "strategy"])),
    humanized: source?.humanized === true
  };
}

function normalizePatchEntries(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const field = normalizeTextValue(item.field || item.path || item.key);

      if (!field) {
        return null;
      }

      return {
        field,
        target: normalizeTextValue(item.target || item.before || item.source || item.original),
        replaceWith: normalizeTextValue(item.replaceWith || item.after || item.replacement || item.value),
        reason: normalizeTextValue(item.reason || item.notes || item.summary),
        addresses: normalizeTextValue(item.addresses || item.addressedPoint || item.guidance || item.focusPoint)
      };
    })
    .filter(Boolean);
}

function providerLabel(provider) {
  if (provider === "kimi") return "Kimi";
  if (provider === "glm") return "智谱 GLM";
  if (provider === "qwen") return "通义千问";
  if (provider === "minimax") return "MiniMax";
  if (provider === "mimo") return "Mimo";
  if (provider === "deepseek") return "深度求索";
  return String(provider || "").trim() || "未标记模型";
}

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "未知时间" : date.toLocaleString("zh-CN");
}

function setButtonBusy(button, isBusy, busyText) {
  if (!button) {
    return;
  }

  if (!button.dataset.label) {
    button.dataset.label = button.textContent.trim();
  }

  button.dataset.busy = isBusy ? "true" : "";
  button.disabled = isBusy;
  button.textContent = isBusy ? busyText : button.dataset.label;
}

function setActionGateHint(id, message = "") {
  const node = byId(id);

  if (!node) {
    return;
  }

  node.textContent = message || "";
  node.classList.toggle("is-visible", Boolean(message));
}

function setGatedButtonState(button, enabled, hint = "") {
  if (!button) {
    return;
  }

  if (!button.dataset.busy) {
    button.disabled = !enabled;
  }

  button.title = !enabled && hint ? hint : "";
}

function workflowActionButton({ action, label, tone = "button" } = {}) {
  return `<button type="button" class="button ${escapeHtml(tone)}" data-workflow-action="${escapeHtml(action)}">${escapeHtml(label)}</button>`;
}

function getWorkflowAssistantState() {
  const hasInput = hasAnalyzeInput();
  const analysis = appState.latestAnalysis;
  const rewrite = appState.latestRewrite;
  const generation = appState.latestGeneration;

  if (generation?.recommendedCandidateId) {
    return {
      step: 3,
      title: "推荐稿已生成，可以进入生命周期",
      description: "建议先保存最终推荐稿，发布后回填表现。表现好的稿子会反向影响下一次生成。",
      actions: [
        { action: "save-generation-final", label: "最终推荐稿进入生命周期", tone: "button-alt" },
        { action: "open-lifecycle", label: "查看生命周期", tone: "button-ghost" }
      ]
    };
  }

  if (rewrite) {
    return {
      step: 2,
      title: "改写稿已生成，下一步做最终确认",
      description: "如果改写后风险已经稳定，可以保存改写稿；如果还想更稳，建议再做一次交叉复判。",
      actions: [
        { action: "cross-review", label: "模型交叉复判", tone: "button-alt" },
        { action: "save-rewrite", label: "保存改写稿生命周期", tone: "button-ghost" }
      ]
    };
  }

  if (analysis) {
    const verdict = analysis.finalVerdict || analysis.verdict || "manual_review";
    const safeEnough = verdict === "pass" || verdict === "observe";

    return {
      step: 1,
      title: safeEnough ? "检测已完成，可以沉淀或继续复判" : "检测已完成，建议先改写",
      description: safeEnough
        ? "当前风险较低。你可以保存检测记录，也可以用交叉复判确认模型是否一致。"
        : "当前仍有人工复核或高风险信号。建议先做合规改写，再看是否需要交叉复判。",
      actions: safeEnough
        ? [
            { action: "cross-review", label: "模型交叉复判", tone: "button-alt" },
            { action: "save-analysis", label: "保存检测记录", tone: "button-ghost" }
          ]
        : [
            { action: "rewrite", label: "一键合规改写", tone: "button-alt" },
            { action: "cross-review", label: "先交叉复判", tone: "button-ghost" }
          ]
    };
  }

  if (hasInput) {
    return {
      step: 0,
      title: "内容已输入，先运行检测",
      description: "先用规则和语义复判拿到基线结论，再决定是保存、改写还是交叉复判。",
      actions: [{ action: "analyze", label: "运行检测", tone: "button-alt" }]
    };
  }

  return {
    step: 0,
    title: "先输入一篇笔记",
    description: "系统会根据当前结果推荐下一步，避免你在检测、改写、复判和生命周期之间来回找。",
    actions: []
  };
}

function renderWorkflowAssistant() {
  const state = getWorkflowAssistantState();
  const title = byId("workflow-assistant-title");
  const description = byId("workflow-assistant-description");
  const actions = byId("workflow-assistant-actions");
  const timeline = byId("workflow-timeline");

  if (title) title.textContent = state.title;
  if (description) description.textContent = state.description;
  if (actions) {
    actions.innerHTML = state.actions.length
      ? state.actions.map(workflowActionButton).join("")
      : '<span class="workflow-assistant-empty">等待输入内容</span>';
  }

  if (timeline) {
    [...timeline.querySelectorAll("li")].forEach((item, index) => {
      item.classList.toggle("is-active", index === state.step);
      item.classList.toggle("is-complete", index < state.step);
    });
  }
}

function hasAnalyzeInput() {
  const payload = getAnalyzePayload();

  return Boolean(
    String(payload.title || "").trim() ||
      String(payload.body || "").trim() ||
      String(payload.coverText || "").trim() ||
      payload.tags.length
  );
}

function getAnalyzeActionRequirementMessage() {
  const payload = getAnalyzePayload();

  if (!hasAnalyzeInput()) {
    return "请先填写标题、正文、封面文案或标签。";
  }

  if (!String(payload.collectionType || "").trim()) {
    return "请先选择合集类型。";
  }

  return "";
}

function syncAnalyzeActions() {
  const requirementMessage = getAnalyzeActionRequirementMessage();
  const enabled = !requirementMessage;
  const analyzeButton = byId("analyze-button");
  const rewriteButton = byId("rewrite-button");
  const crossReviewButton = byId("cross-review-button");

  setGatedButtonState(analyzeButton, enabled, requirementMessage);
  setGatedButtonState(rewriteButton, enabled, requirementMessage);
  setGatedButtonState(crossReviewButton, enabled, requirementMessage);
  setActionGateHint("analyze-action-hint", requirementMessage);

  renderWorkflowAssistant();
}

function getAnalyzeTagInput() {
  return byId("analyze-tags-value");
}

function getAnalyzeTagTrigger() {
  return byId("analyze-tag-trigger");
}

function getAnalyzeTagDropdown() {
  return byId("analyze-tag-dropdown");
}

function getAnalyzeTagOptionsContainer() {
  return byId("analyze-tag-options");
}

function focusFirstAnalyzeTagOption() {
  const firstOption = getAnalyzeTagOptionsContainer()?.querySelector("[data-tag-option]");
  if (firstOption instanceof HTMLElement) {
    firstOption.focus();
  }
}

function getAnalyzeTagSelection() {
  return byId("analyze-tag-selected");
}

function isAnalyzeTagDropdownOpen() {
  return getAnalyzeTagTrigger()?.getAttribute("aria-expanded") === "true";
}

function isPresetAnalyzeTag(tag) {
  return presetAnalyzeTags.includes(String(tag || "").trim());
}

function eventTargetsAnalyzeTagPicker(event, picker) {
  if (!picker || !event) {
    return false;
  }

  if (typeof event.composedPath === "function") {
    return event.composedPath().includes(picker);
  }

  return picker.contains(event.target);
}

function setAnalyzeTagDropdownOpen(isOpen) {
  const trigger = getAnalyzeTagTrigger();
  const dropdown = getAnalyzeTagDropdown();

  if (!trigger || !dropdown) {
    return;
  }

  trigger.setAttribute("aria-expanded", isOpen ? "true" : "false");
  dropdown.hidden = !isOpen;
  byId("analyze-tag-picker")?.classList.toggle("is-open", isOpen);
}

function toggleAnalyzePresetTag(tag) {
  const current = readAnalyzeTags();
  const normalizedTag = String(tag || "").trim();

  if (!normalizedTag) {
    return;
  }

  writeAnalyzeTags(
    current.includes(normalizedTag) ? current.filter((item) => item !== normalizedTag) : [...current, normalizedTag]
  );
}

function removeAnalyzeTagOption(tag) {
  const normalizedTag = String(tag || "").trim();

  if (!normalizedTag || isPresetAnalyzeTag(normalizedTag)) {
    return;
  }

  analyzeTagOptions = analyzeTagOptions.filter((item) => item !== normalizedTag);
  writeAnalyzeTags(readAnalyzeTags().filter((item) => item !== normalizedTag));
  saveAnalyzeCustomTagOptions(analyzeTagOptions).catch(() => {});
}

function renderAnalyzeTagOptions() {
  const container = getAnalyzeTagOptionsContainer();

  if (!container) {
    return;
  }

  const selectedTags = readAnalyzeTags();
  container.innerHTML = uniqueStrings(analyzeTagOptions)
    .map((tag) => {
      const selected = selectedTags.includes(tag);
      const isCustom = !isPresetAnalyzeTag(tag);
      return `
        <span class="tag-picker-option-row${isCustom ? " is-custom" : ""}">
          <button
            type="button"
            class="tag-picker-option${selected ? " is-selected" : ""}"
            data-tag-option="${escapeHtml(tag)}"
            aria-pressed="${selected ? "true" : "false"}"
          >
            <span>${escapeHtml(tag)}</span>
            <span class="tag-picker-option-check" aria-hidden="true">${selected ? "✓" : ""}</span>
          </button>
          ${
            isCustom
              ? `
                <button
                  type="button"
                  class="tag-picker-option-delete"
                  data-tag-delete="${escapeHtml(tag)}"
                  aria-label="删除自定义标签 ${escapeHtml(tag)}"
                >
                  ×
                </button>
              `
              : ""
          }
        </span>
      `;
    })
    .join("");
}

function readAnalyzeTags() {
  return uniqueStrings(splitCSV(getAnalyzeTagInput()?.value || ""));
}

function writeAnalyzeTags(tags = []) {
  const normalized = uniqueStrings(tags);
  const hiddenInput = getAnalyzeTagInput();

  if (hiddenInput) {
    hiddenInput.value = joinCSV(normalized);
  }

  const selected = getAnalyzeTagSelection();
  if (selected) {
    selected.innerHTML = buildAnalyzeTagSelectionMarkup(normalized);
  }

  renderAnalyzeTagOptions();

  analyzeForm.dispatchEvent(new Event("input", { bubbles: true }));
}

function addAnalyzeTag(tag) {
  const nextTag = String(tag || "").trim();

  if (!nextTag) {
    return;
  }

  writeAnalyzeTags([...readAnalyzeTags(), nextTag]);
}

function addAnalyzeTagOption(tag) {
  const nextTag = String(tag || "").trim();

  if (!nextTag) {
    return;
  }

  const nextOptions = uniqueStrings([...analyzeTagOptions, nextTag]);
  const changed = nextOptions.length !== analyzeTagOptions.length;
  analyzeTagOptions = nextOptions;
  renderAnalyzeTagOptions();

  if (changed) {
    saveAnalyzeCustomTagOptions(analyzeTagOptions).catch(() => {});
  }
}

function initializeAnalyzeTagPicker() {
  const trigger = getAnalyzeTagTrigger();
  const dropdown = getAnalyzeTagDropdown();
  const optionsContainer = getAnalyzeTagOptionsContainer();
  const customInput = byId("analyze-tag-custom");
  const addButton = byId("analyze-tag-add");
  const clearButton = byId("analyze-tag-clear");
  const picker = byId("analyze-tag-picker");

  if (!trigger || !dropdown || !optionsContainer || !customInput || !addButton || !picker) {
    return;
  }

  customInput.setAttribute("aria-label", customInput.getAttribute("aria-label") || customInput.placeholder || "输入自定义标签");

  analyzeTagOptions = [...presetAnalyzeTags];
  setAnalyzeTagDropdownOpen(false);
  renderAnalyzeTagOptions();
  loadAnalyzeCustomTagOptions()
    .then((customOptions) => {
      analyzeTagOptions = uniqueStrings([...presetAnalyzeTags, ...analyzeTagOptions, ...customOptions]);
      renderAnalyzeTagOptions();
    })
    .catch(() => {});

  trigger.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    setAnalyzeTagDropdownOpen(!isAnalyzeTagDropdownOpen());
  });

  trigger.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowDown") {
      return;
    }

    event.preventDefault();
    setAnalyzeTagDropdownOpen(true);
    focusFirstAnalyzeTagOption();
  });

  optionsContainer.addEventListener("click", (event) => {
    event.stopPropagation();
    const deleteButton = event.target instanceof Element ? event.target.closest("[data-tag-delete]") : null;
    if (deleteButton) {
      removeAnalyzeTagOption(deleteButton.dataset.tagDelete);
      return;
    }

    const option = event.target instanceof Element ? event.target.closest("[data-tag-option]") : null;
    if (!option) {
      return;
    }

    toggleAnalyzePresetTag(option.dataset.tagOption);
  });

  clearButton?.addEventListener("click", () => {
    writeAnalyzeTags([]);
  });

  clearButton?.addEventListener("click", (event) => {
    event.stopPropagation();
  });

  addButton.addEventListener("click", (event) => {
    event.stopPropagation();
    const shouldRefocus = Boolean(String(customInput.value || "").trim());
    addAnalyzeTagOption(customInput.value);
    addAnalyzeTag(customInput.value);
    customInput.value = "";

    if (shouldRefocus) {
      renderAnalyzeTagOptions();
      customInput.focus();
    }
  });

  customInput.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== ",") {
      return;
    }

    event.preventDefault();
    addAnalyzeTagOption(customInput.value);
    addAnalyzeTag(customInput.value);
    customInput.value = "";
    renderAnalyzeTagOptions();
  });

  customInput.addEventListener("blur", (event) => {
    if (event.relatedTarget === addButton) {
      return;
    }

    const value = String(customInput.value || "").trim();

    if (!value) {
      return;
    }

    addAnalyzeTagOption(value);
    addAnalyzeTag(value);
    customInput.value = "";
    renderAnalyzeTagOptions();
  });

  customInput.addEventListener("click", (event) => {
    event.stopPropagation();
  });

  document.addEventListener("click", (event) => {
    if (eventTargetsAnalyzeTagPicker(event, picker)) {
      return;
    }

    setAnalyzeTagDropdownOpen(false);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") {
      return;
    }

    setAnalyzeTagDropdownOpen(false);

    if (picker.contains(document.activeElement)) {
      trigger.focus();
    }
  });

  writeAnalyzeTags(readAnalyzeTags());
}

function renderSummary(summary) {
  const cards = [
    ["种子词库", summary.seedLexiconCount],
    ["自定义词库", summary.customLexiconCount],
    ["反馈日志", summary.feedbackCount],
    ["复核队列", summary.reviewQueueCount],
    ["生命周期", summary.noteLifecycleCount || 0]
  ];

  byId("summary-grid").innerHTML = cards
    .map(
      ([label, value]) => `
        <div class="summary-card">
          <span>${label}</span>
          <strong>${value}</strong>
        </div>
      `
    )
    .join("");
}

function renderAnalysis(result, falsePositiveSource = null) {
  const falsePositiveMarkup = falsePositiveSource
    ? buildFalsePositiveActionMarkup(falsePositiveSource)
    : "";
  const hits = result.hits.length
    ? result.hits
        .map(
          (hit) => `
            <li>
              <strong>${escapeHtml(hit.category)}</strong>
              <span>${escapeHtml(hit.reason)}</span>
            </li>
          `
        )
        .join("")
    : "<li><strong>无命中</strong><span>未检测到明显高风险规则</span></li>";

  const suggestions = result.suggestions.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  const semantic = result.semanticReview?.status === "ok" ? result.semanticReview.review : null;
  const ruleModelLabel = escapeHtml(
    result.modelTrace?.label || "本地规则引擎 / 规则词库 + 组合规则"
  );
  const semanticAttemptLabels = (Array.isArray(result.semanticReview?.providersTried) ? result.semanticReview.providersTried : [])
    .flatMap((item) => {
      const attempts = Array.isArray(item.attemptedRoutes) && item.attemptedRoutes.length
        ? item.attemptedRoutes
        : [
            {
              routeLabel: item.routeLabel || "",
              model: item.model || ""
            }
          ];

      return attempts
        .map((attempt) => [attempt.routeLabel || "", providerLabel(item.provider), attempt.model || ""].filter(Boolean).join(" / "))
        .filter(Boolean);
    });
  const semanticModelLabel = semantic
    ? escapeHtml(
        semantic.modelTrace?.label ||
          [semantic.routeLabel || "", providerLabel(semantic.provider), semantic.model || "未标记模型"].filter(Boolean).join(" / ")
      )
    : "";
  const semanticReasons = semantic?.reasons?.length
    ? semantic.reasons.map((item) => `<li>${escapeHtml(item)}</li>`).join("")
    : "<li>当前未返回明确语义原因</li>";
  const semanticSignals = semantic?.implicitSignals?.length
    ? semantic.implicitSignals.map((item) => `<li>${escapeHtml(item)}</li>`).join("")
    : "<li>未检测到明显隐含风险信号</li>";
  const semanticFooter =
    result.semanticReview?.status === "ok"
      ? `<p class="helper-text">语义复判模型：${semanticModelLabel}；置信度：${escapeHtml(
          formatConfidence(semantic.confidence)
        )}</p>`
      : semanticAttemptLabels.length
        ? `<p class="helper-text">语义复判模型：${escapeHtml(`已尝试 ${semanticAttemptLabels.join("；")}`)}</p>`
      : `<p class="helper-text">${escapeHtml(
          result.semanticReview?.message
            ? `语义复判模型：本地检测（未调用模型）。${result.semanticReview.message}`
            : "语义复判模型：本地检测（未调用模型）"
        )}</p>`;
  const falsePositiveHints = Array.isArray(result.falsePositiveHints) ? result.falsePositiveHints : [];
  const whitelistHits = Array.isArray(result.whitelistHits) ? result.whitelistHits : [];
  const downgradeEvidence = [
    ...falsePositiveHints.map((item) => `规则偏严反例：${item.title || item.sourceId || "已确认误报样本"}`),
    ...whitelistHits.map((item) => `宽松白名单：${item.phrase || item}`)
  ];
  const downgradeMarkup = downgradeEvidence.length
    ? `
      <div class="model-scope-banner">
        <span class="model-scope-kicker">降权提示</span>
        <strong>${escapeHtml(result.softenedByFalsePositive ? "已按反例信号降为观察" : "发现可参考的反例信号")}</strong>
        <p>${escapeHtml(downgradeEvidence.join("；"))}</p>
      </div>
    `
    : "";

  byId("analysis-result").innerHTML = `
    <div class="verdict verdict-${result.finalVerdict || result.verdict}">
      <span>综合结论</span>
      <strong>${verdictLabel(result.finalVerdict || result.verdict)}</strong>
      <em>规则分 ${result.score}</em>
    </div>
    <p class="helper-text">规则检测：${escapeHtml(verdictLabel(result.verdict))}；语义复判：${escapeHtml(
      semantic ? verdictLabel(semantic.verdict) : "未启用/未返回"
    )}</p>
    <p class="helper-text">规则检测模型：${ruleModelLabel}</p>
    <div class="columns">
      <div>
        <h3>规则命中</h3>
        <ul>${hits}</ul>
      </div>
      <div>
        <h3>规则建议</h3>
        <ul>${suggestions}</ul>
      </div>
    </div>
    <div class="columns">
      <div>
        <h3>语义判断</h3>
        <ul>${semanticReasons}</ul>
      </div>
      <div>
        <h3>隐含信号</h3>
        <ul>${semanticSignals}</ul>
      </div>
    </div>
    <p class="helper-text">语义摘要：${escapeHtml(semantic?.summary || "当前未返回语义摘要")}</p>
    <p class="helper-text">语义改写建议：${escapeHtml(semantic?.suggestion || "暂无补充建议")}</p>
    ${semanticFooter}
    ${downgradeMarkup}
    ${falsePositiveMarkup}
    <div class="item-actions">
      <button type="button" class="button button-small" data-action="save-lifecycle-analysis">
        保存为生命周期记录
      </button>
    </div>
    <p class="helper-text action-gate-hint" id="analysis-lifecycle-action-hint" aria-live="polite"></p>
  `;
  syncLifecycleResultActions();
}

function renderRewriteResult(result) {
  if (!result?.rewrite) {
    byId("rewrite-result").innerHTML = '<div class="muted">等待改写</div>';
    return;
  }

  const rewrite = normalizeRewritePayload(result.rewrite);
  const before = result.beforeAnalysis || result.analysis || {};
  const after = result.afterAnalysis || {};
  const tags = rewrite.tags.length
    ? rewrite.tags.map((item) => `<li>${escapeHtml(item)}</li>`).join("")
    : "<li>未生成标签</li>";
  const embeddedCrossReview = result.afterCrossReview
    ? `
        <section class="rewrite-followup">
          <div class="rewrite-followup-head">
            <strong>改写后交叉复判</strong>
            <span>自动对改写后的版本再次做多模型复判，方便直接看最终一致性。</span>
          </div>
          ${buildCrossReviewMarkup(result.afterCrossReview, { embedded: true })}
        </section>
      `
    : "";
  const rewriteSummary = result.rewriteAccepted
    ? `本次自动改写 ${result.rewriteAttempts || 1} 轮，复判结果已达到通过区间。`
    : `本次已自动改写 ${result.rewriteAttempts || 1} 轮，但结果仍需人工复核，建议继续人工改写。`;
  const rewriteProviderName = providerLabel(rewrite.provider);
  const retryRounds = (Array.isArray(result.rounds) ? result.rounds : []).filter(
    (round) => round?.guidance && Array.isArray(round.guidance.focusPoints) && round.guidance.focusPoints.length
  );
  const retryGuidanceMarkup = retryRounds.length
    ? `
        <section class="rewrite-followup">
          <div class="rewrite-followup-head">
            <strong>逐轮修正建议</strong>
            <span>每轮没过的时候，系统会把当轮复判暴露出来的风险点整理成下一轮改写提示，避免盲目重复改写。</span>
          </div>
          <div class="rewrite-iteration-grid">
            ${retryRounds
              .map((round) => {
                const normalizedRoundRewrite = normalizeRewritePayload(round.rewrite);
                const focusPoints = round.guidance.focusPoints
                  .map((item) => `<li>${escapeHtml(item)}</li>`)
                  .join("");
                const actualChanges = (
                  normalizedRoundRewrite.appliedPatches.length
                    ? normalizedRoundRewrite.appliedPatches.map((patch) => {
                        const changeSummary = patch.target && patch.replaceWith ? `${patch.target} -> ${patch.replaceWith}` : patch.replaceWith;
                        const meta = uniqueStrings([patch.addresses, patch.reason]).join("；");

                        return `<li><strong>${escapeHtml(patch.field)}</strong>：${escapeHtml(changeSummary || "已做局部修补")}${
                          meta ? `（${escapeHtml(meta)}）` : ""
                        }</li>`;
                      })
                    : [
                        `<li>${escapeHtml(
                          normalizedRoundRewrite.rewriteNotes ||
                            (normalizedRoundRewrite.rewriteMode === "field_fallback"
                              ? "本轮改为字段级兜底重写"
                              : "本轮未返回可展示的局部 patch")
                        )}</li>`
                      ]
                ).join("");
                const remainingRisks = uniqueStrings([
                  ...(round.afterAnalysis?.suggestions || []),
                  ...(round.afterAnalysis?.semanticReview?.status === "ok"
                    ? round.afterAnalysis.semanticReview.review?.reasons || []
                    : []),
                  ...(round.afterCrossReview?.aggregate?.reasons || []),
                  ...(round.afterCrossReview?.aggregate?.falseNegativeSignals || [])
                ])
                  .slice(0, 5)
                  .map((item) => `<li>${escapeHtml(item)}</li>`)
                  .join("");

                return `
                  <article class="rewrite-iteration-card">
                    <div class="rewrite-iteration-head">
                      <strong>第 ${escapeHtml(String(round.attempt || 0))} 轮复盘</strong>
                      <span>${escapeHtml(
                        `${verdictLabel(round.guidance.mergedVerdict || "manual_review")} / ${verdictLabel(
                          round.guidance.reviewVerdict || "manual_review"
                        )}`
                      )}</span>
                    </div>
                    <p>${escapeHtml(round.guidance.summary || "未提供摘要")}</p>
                    <div class="rewrite-iteration-section">
                      <strong>系统建议</strong>
                      <ul>${focusPoints}</ul>
                    </div>
                    <div class="rewrite-iteration-section">
                      <strong>实际修改</strong>
                      <ul>${actualChanges}</ul>
                    </div>
                    <div class="rewrite-iteration-section">
                      <strong>剩余风险</strong>
                      <ul>${remainingRisks || "<li>本轮未返回额外剩余风险</li>"}</ul>
                    </div>
                  </article>
                `;
              })
              .join("")}
          </div>
        </section>
      `
    : "";

  byId("rewrite-result").innerHTML = `
    <div class="rewrite-hero">
      <div class="verdict verdict-${escapeHtml(after.finalVerdict || after.verdict || "observe")}">
        <span>改写完成</span>
        <strong>${escapeHtml(rewrite.model || "GLM")}</strong>
        <em>${escapeHtml(verdictLabel(after.finalVerdict || after.verdict || "observe"))}</em>
      </div>
      <div class="rewrite-meta-grid">
        <article class="rewrite-meta-card">
          <span>改写模型来源</span>
          <strong>${escapeHtml(rewriteProviderName)}</strong>
        </article>
        <article class="rewrite-meta-card">
          <span>人味化处理</span>
          <strong>${escapeHtml(rewrite.humanized ? "已启用 humanizer 二次润色" : "未启用或本轮回退到基础改写")}</strong>
        </article>
        <article class="rewrite-meta-card">
          <span>综合结论</span>
          <strong>${escapeHtml(verdictLabel(before.finalVerdict || before.verdict || "observe"))} -> ${escapeHtml(
      verdictLabel(after.finalVerdict || after.verdict || "observe")
    )}</strong>
        </article>
        <article class="rewrite-meta-card">
          <span>规则结论</span>
          <strong>${escapeHtml(verdictLabel(before.verdict || "observe"))} -> ${escapeHtml(
      verdictLabel(after.verdict || "observe")
    )}</strong>
        </article>
        <article class="rewrite-meta-card">
          <span>风险分</span>
          <strong>${escapeHtml(String(before.score ?? 0))} -> ${escapeHtml(String(after.score ?? 0))}</strong>
        </article>
      </div>
    </div>
    <div class="model-scope-banner model-scope-banner-rewrite">
      <span class="model-scope-kicker">改写模型来源</span>
      <strong>${escapeHtml(rewriteProviderName)}</strong>
      <p>本区只展示改写模型输出。交叉复判始终使用独立复判模型，不会复用当前改写模型。</p>
    </div>
    <p class="helper-text">${escapeHtml(rewriteSummary)}</p>
    ${retryGuidanceMarkup}
    <div class="rewrite-grid">
      <div class="rewrite-block">
        <strong>改写标题</strong>
        <p>${escapeHtml(rewrite.title || "未生成")}</p>
      </div>
      <div class="rewrite-block">
        <strong>改写封面文案</strong>
        <p>${escapeHtml(rewrite.coverText || "未生成")}</p>
      </div>
      <div class="rewrite-block rewrite-block-body">
        <strong>改写正文</strong>
        ${buildRewriteBodyMarkup(rewrite.body)}
      </div>
      <div class="rewrite-block">
        <strong>推荐标签</strong>
        <ul>${tags}</ul>
      </div>
    </div>
    <p class="helper-text">改写说明：${escapeHtml(rewrite.rewriteNotes || "未提供")}</p>
    <p class="helper-text">人工留意：${escapeHtml(rewrite.safetyNotes || "暂无")}</p>
    <p class="helper-text">改写后语义摘要：${escapeHtml(
      after.semanticReview?.status === "ok" ? after.semanticReview.review?.summary || "未提供" : after.semanticReview?.message || "未返回"
    )}</p>
    ${embeddedCrossReview}
    <div class="item-actions">
      <button type="button" class="button button-small" data-action="save-lifecycle-rewrite">
        保存改写稿生命周期
      </button>
      <button type="button" class="button button-small" data-action="prefill-rewrite-pair-current">
        记为前后对照样本
      </button>
    </div>
    <p class="helper-text action-gate-hint" id="rewrite-lifecycle-action-hint" aria-live="polite"></p>
  `;
  syncLifecycleResultActions();
}

function buildCrossReviewMarkup(review, { embedded = false } = {}) {
  if (!review) {
    return '<div class="muted">等待复判</div>';
  }

  const aggregate = review.aggregate || {};
  const recommendedVerdict = aggregate.recommendedVerdict || "manual_review";
  const analysisVerdict = aggregate.analysisVerdict || "pass";
  const consensus = aggregate.consensus || "unavailable";
  const availableReviews = Number(aggregate.availableReviews || 0);
  const configuredProviders = Number(aggregate.configuredProviders || 0);
  const providerCards = (review.providers || [])
    .map((item) => {
      if (item.status === "ok") {
        return `
          <article class="review-provider-card review-provider-card-ok">
            <div class="review-provider-head">
              <div>
                <strong>${escapeHtml(item.label)}</strong>
                <p class="review-provider-model">${escapeHtml(item.review.model || "未标记模型")}</p>
              </div>
              <span class="review-status-pill review-status-pill-ok">已返回</span>
            </div>
            <div class="meta-row">
              <span class="meta-pill review-pill-strong">${escapeHtml(verdictLabel(item.review.verdict))}</span>
              <span class="meta-pill">置信度 ${escapeHtml(formatConfidence(item.review.confidence))}</span>
            </div>
            <div class="review-provider-summary">
              <span>一句话总结</span>
              <p>${escapeHtml(item.review.summary || "当前模型未补充摘要")}</p>
            </div>
            <div class="review-provider-block">
              <span>风险类别</span>
              <div class="meta-row">${renderInfoPills(item.review.categories, "未提供", "meta-pill-soft")}</div>
            </div>
            <div class="review-provider-block">
              <span>复判原因</span>
              <p>${escapeHtml(joinCSV(item.review.reasons) || "未提供")}</p>
            </div>
            <div class="review-provider-split">
              <div class="review-provider-block">
                <span>误杀提示</span>
                <p>${escapeHtml(item.review.falsePositiveRisk || "未发现明显信号")}</p>
              </div>
              <div class="review-provider-block">
                <span>漏判提示</span>
                <p>${escapeHtml(item.review.falseNegativeRisk || "未发现明显信号")}</p>
              </div>
            </div>
          </article>
        `;
      }

      return `
        <article class="review-provider-card review-provider-card-muted">
          <div class="review-provider-head">
            <div>
              <strong>${escapeHtml(item.label)}</strong>
              <p class="review-provider-model">${escapeHtml(item.model || "未标记模型")}</p>
            </div>
            <span class="review-status-pill ${
              item.status === "unconfigured" ? "review-status-pill-muted" : "review-status-pill-warn"
            }">${escapeHtml(item.status === "unconfigured" ? "未配置" : "不可用")}</span>
          </div>
          <div class="review-provider-block">
            <span>状态说明</span>
            <p>${escapeHtml(item.message || "暂无信息")}</p>
          </div>
        </article>
      `;
    })
    .join("");

  return `
    <section class="cross-review-shell${embedded ? " is-embedded" : ""}">
      <div class="cross-review-top">
        <div class="verdict verdict-${recommendedVerdict}">
          <span>交叉复判</span>
          <strong>${escapeHtml(verdictLabel(recommendedVerdict))}</strong>
          <em>${escapeHtml(consensusLabel(consensus))}</em>
        </div>
        <div class="cross-review-intro">
          <strong>${availableReviews ? "多模型复判已完成" : "当前暂无成功复判结果"}</strong>
          <p class="helper-text">${
            availableReviews
              ? "下面按总览、风险信号、模型意见三个层次展示，方便你快速判断是否需要人工复核。"
              : "请先检查模型密钥、权限或超时设置，当前还没有可用的复判返回。"
          }</p>
        </div>
      </div>

      <div class="model-scope-banner model-scope-banner-review">
        <span class="model-scope-kicker">复判模型组</span>
        <strong>按当前可用复判模型组逐个比对</strong>
        <p>当前交叉复判会自动避开已选改写模型，确保复判模型不与改写模型重复，避免同模型自己给自己复判。</p>
      </div>

      <div class="cross-review-stats">
        <article class="cross-review-stat">
          <span>规则检测</span>
          <strong>${escapeHtml(verdictLabel(analysisVerdict))}</strong>
        </article>
        <article class="cross-review-stat">
          <span>复判建议</span>
          <strong>${escapeHtml(verdictLabel(recommendedVerdict))}</strong>
        </article>
        <article class="cross-review-stat">
          <span>共识状态</span>
          <strong>${escapeHtml(consensusLabel(consensus))}</strong>
        </article>
        <article class="cross-review-stat">
          <span>模型可用数</span>
          <strong>${escapeHtml(String(availableReviews))} / ${escapeHtml(String(configuredProviders))}</strong>
        </article>
      </div>

      <div class="cross-review-signals">
        <article class="cross-review-signal-card">
          <span class="cross-review-signal-label">风险类别</span>
          <div class="meta-row">${renderInfoPills(aggregate.categories, "未提供", "meta-pill-soft")}</div>
        </article>
        <article class="cross-review-signal-card">
          <span class="cross-review-signal-label">误杀信号</span>
          <div class="meta-row">${renderInfoPills(
            aggregate.falsePositiveSignals,
            "未发现明显信号",
            "meta-pill-soft"
          )}</div>
        </article>
        <article class="cross-review-signal-card">
          <span class="cross-review-signal-label">漏判信号</span>
          <div class="meta-row">${renderInfoPills(
            aggregate.falseNegativeSignals,
            "未发现明显信号",
            "meta-pill-soft"
          )}</div>
        </article>
      </div>

      <div class="cross-review-models-head">
        <strong>模型意见对比</strong>
        <span>逐个查看每个复判模型给出的结论、摘要和风险提示。</span>
      </div>
      <div class="review-provider-grid">${providerCards}</div>
    </section>
  `;
}

function renderCrossReviewResult(result) {
  byId("cross-review-result").innerHTML = buildCrossReviewMarkup(result?.review);
}

function renderQueue(items) {
  byId("review-queue").innerHTML = items.length
    ? items
        .map(
          (item) => `
            <article class="queue-item">
              <strong>${escapeHtml(item.phrase)}</strong>
              <div class="meta-row">
                <span class="meta-pill">${escapeHtml(item.priorityLabel || "中优先")}</span>
                <span class="meta-pill">命中 ${escapeHtml(String(item.hitCount || 1))} 次</span>
                <span class="meta-pill">${escapeHtml(matchLabel(item.match || "exact"))}</span>
                <span class="meta-pill">${escapeHtml(item.suggestedCategory || "待人工判断")}</span>
                <span class="meta-pill">${escapeHtml(verdictLabel(item.suggestedRiskLevel || "manual_review"))}</span>
                ${item.candidateType === "whitelist" ? '<span class="meta-pill">宽松白名单</span>' : ""}
              </div>
              <p>${escapeHtml(item.platformReason || "待补充原因")}</p>
              ${
                item.match === "regex" && item.pattern
                  ? `<p>语境规则：<code>${escapeHtml(item.pattern)}</code></p>`
                  : ""
              }
              <p>来源内容：${escapeHtml(compactText(item.sourceNoteExcerpt || item.sourceNoteId, 88) || "未标记")}</p>
              <p>${
                item.recommendedLexiconDraft?.blocked
                  ? `当前不建议直接入库：${escapeHtml(item.recommendedLexiconDraft.blockedReason || "更像平台原因标签")}`
                  : item.recommendedLexiconDraft?.targetScope === "whitelist"
                    ? `建议加入宽松白名单：${escapeHtml(item.recommendedLexiconDraft.phrase || item.phrase || "")}`
                    : `建议入库：${escapeHtml(matchLabel(item.recommendedLexiconDraft?.match || "exact"))} /
                ${escapeHtml(lexiconLevelLabel(inferLexiconLevel(item.recommendedLexiconDraft?.lexiconLevel, item.recommendedLexiconDraft?.riskLevel || item.suggestedRiskLevel)))} /
                ${escapeHtml(item.recommendedLexiconDraft?.category || item.suggestedCategory || "待人工判断")} /
                ${escapeHtml(verdictLabel(item.recommendedLexiconDraft?.riskLevel || item.suggestedRiskLevel || "manual_review"))}`
              }</p>
              ${buildRuleChangePreviewMarkup(item.ruleChangePreview)}
              <div class="item-actions">
                <button
                  type="button"
                  class="button button-small"
                  data-action="prefill-custom-draft"
                  data-match="${escapeHtml(item.recommendedLexiconDraft?.match || "exact")}"
                  data-source="${escapeHtml(
                    item.recommendedLexiconDraft?.term || item.recommendedLexiconDraft?.pattern || item.phrase || ""
                  )}"
                  data-category="${escapeHtml(item.recommendedLexiconDraft?.category || item.suggestedCategory || "")}"
                  data-risk-level="${escapeHtml(
                    item.recommendedLexiconDraft?.riskLevel || item.suggestedRiskLevel || "manual_review"
                  )}"
                  data-lexicon-level="${escapeHtml(
                    inferLexiconLevel(
                      item.recommendedLexiconDraft?.lexiconLevel,
                      item.recommendedLexiconDraft?.riskLevel || item.suggestedRiskLevel || "manual_review"
                    )
                  )}"
                  data-xhs-reason="${escapeHtml(item.recommendedLexiconDraft?.xhsReason || item.platformReason || "")}"
                  ${item.recommendedLexiconDraft?.blocked || item.recommendedLexiconDraft?.targetScope === "whitelist" ? "disabled" : ""}
                >
                  填入右侧表单
                </button>
                <button
                  type="button"
                  class="button button-alt button-small"
                  data-action="promote-review"
                  data-id="${escapeHtml(item.id)}"
                  ${item.recommendedLexiconDraft?.blocked ? "disabled" : ""}
                >
                  ${item.recommendedLexiconDraft?.targetScope === "whitelist" ? "加入白名单" : "按建议入库"}
                </button>
                <button
                  type="button"
                  class="button button-danger button-small"
                  data-action="delete-review"
                  data-id="${escapeHtml(item.id)}"
                >
                  删除
                </button>
              </div>
            </article>
          `
        )
        .join("")
    : '<div class="result-card muted">当前没有待复核候选词</div>';
}

function renderScreenshotRecognition(recognition, screenshot) {
  if (!recognition) {
    byId("feedback-screenshot-result").innerHTML = '<div class="muted">等待截图识别</div>';
    return;
  }

  const phrases = recognition.suspiciousPhrases.length
    ? recognition.suspiciousPhrases.map((item) => `<li>${escapeHtml(item)}</li>`).join("")
    : "<li>未识别到明确候选词</li>";

  byId("feedback-screenshot-result").innerHTML = `
    <div class="verdict verdict-observe">
      <span>截图识别</span>
      <strong>${escapeHtml(screenshot?.name || "已完成")}</strong>
      <em>${escapeHtml(recognition.model || "GLM")}</em>
    </div>
    <div class="columns">
      <div>
        <h3>提取结果</h3>
        <p><strong>违规原因：</strong>${escapeHtml(recognition.platformReason || "未识别")}</p>
        <p><strong>摘要：</strong>${escapeHtml(recognition.summary || "未提供")}</p>
        <p><strong>置信度：</strong>${escapeHtml(formatConfidence(recognition.confidence))}</p>
      </div>
      <div>
        <h3>候选词</h3>
        <ul>${phrases}</ul>
      </div>
    </div>
    <p class="helper-text">${escapeHtml(recognition.extractedText || "截图文字未返回")}</p>
  `;
}

function renderLexiconList(containerId, items, scope) {
  const groups = [
    { key: "l1", label: "一级词库" },
    { key: "l2", label: "二级词库" },
    { key: "l3", label: "三级词库" }
  ];

  byId(containerId).innerHTML = items.length
    ? groups
        .map(({ key, label }) => {
          const groupItems = items.filter((item) => inferLexiconLevel(item.lexiconLevel, item.riskLevel) === key);

          if (!groupItems.length) {
            return `
              <section class="admin-group">
                <div class="tab-panel-head">
                  <strong>${escapeHtml(label)}</strong>
                  <span>当前没有条目</span>
                </div>
              </section>
            `;
          }

          return `
            <section class="admin-group">
              <div class="tab-panel-head">
                <strong>${escapeHtml(label)}</strong>
                <span>${escapeHtml(scope === "seed" ? "按词库级别查看种子规则" : "按词库级别查看自定义规则")}</span>
              </div>
              ${groupItems
                .map(
                  (item) => `
                    <article class="admin-item">
                      <strong>${escapeHtml(item.term || item.pattern || item.id)}</strong>
                      <div class="meta-row">
                        <span class="meta-pill">${escapeHtml(matchLabel(item.match))}</span>
                        <span class="meta-pill">${escapeHtml(lexiconLevelLabel(inferLexiconLevel(item.lexiconLevel, item.riskLevel)))}</span>
                        <span class="meta-pill">${escapeHtml(item.category || "未分类")}</span>
                        <span class="meta-pill">${escapeHtml(verdictLabel(item.riskLevel || "manual_review"))}</span>
                      </div>
                      <p><code>${escapeHtml(item.id)}</code></p>
                      <p>${escapeHtml(item.xhsReason || item.notes || "暂无说明")}</p>
                      <div class="item-actions">
                        <button
                          type="button"
                          class="button button-danger button-small"
                          data-action="delete-lexicon"
                          data-scope="${escapeHtml(scope)}"
                          data-id="${escapeHtml(item.id)}"
                        >
                          删除
                        </button>
                      </div>
                    </article>
                  `
                )
                .join("")}
            </section>
          `;
        })
        .join("")
    : '<div class="result-card muted">当前没有条目</div>';
}

function renderFeedbackLog(items) {
  byId("feedback-log-list").innerHTML = items.length
    ? items
        .slice()
        .reverse()
        .map(
          (item) => {
            const notePreview = compactText(item.noteContent || item.body, 96);

            return `
            <article class="admin-item">
              <strong>${escapeHtml(notePreview || "未填写笔记内容")}</strong>
              <div class="meta-row">
                <span class="meta-pill">${escapeHtml(reviewAuditLabel(item.reviewAudit))}</span>
                <span class="meta-pill">${escapeHtml(verdictLabel(item.analysisSnapshot?.verdict || "pass"))}</span>
                <span class="meta-pill">${escapeHtml(item.decision || "未记录处理结果")}</span>
                <span class="meta-pill">${escapeHtml(formatDate(item.createdAt))}</span>
              </div>
              <p>${escapeHtml(item.platformReason || "未记录违规原因")}</p>
              <p>${escapeHtml(joinCSV(item.suspiciousPhrases) || "无候选词")}</p>
              ${
                item.feedbackModelSuggestion
                  ? `<p>模型补充（${escapeHtml(
                      item.feedbackModelSuggestion.provider && item.feedbackModelSuggestion.model
                        ? `${item.feedbackModelSuggestion.provider}/${item.feedbackModelSuggestion.model}`
                        : item.feedbackModelSuggestion.model || "未标记模型"
                    )}）：${escapeHtml(
                      joinCSV(item.feedbackModelSuggestion.suspiciousPhrases) || "未补充精确词"
                    )}；语境：${escapeHtml(
                      joinCSV(item.feedbackModelSuggestion.contextCategories) || "未补充语境"
                    )}</p>`
                  : ""
              }
              <p>
                规则命中：${escapeHtml(joinCSV(item.analysisSnapshot?.categories) || "未发现明显命中")}；
                风险分：${escapeHtml(String(item.analysisSnapshot?.score ?? 0))}
              </p>
              <div class="item-actions">
                <button
                  type="button"
                  class="button button-danger button-small"
                  data-action="delete-feedback"
                  data-note-id="${escapeHtml(item.noteId)}"
                  data-created-at="${escapeHtml(item.createdAt)}"
                >
                  删除
                </button>
              </div>
            </article>
          `;
          }
        )
        .join("")
    : '<div class="result-card muted">当前没有反馈日志</div>';
}

function renderFalsePositiveLog(items) {
  appState.falsePositiveLog = Array.isArray(items) ? items : [];

  byId("false-positive-log-list").innerHTML = appState.falsePositiveLog.length
    ? appState.falsePositiveLog
        .slice()
        .reverse()
        .map((item) => buildFalsePositiveEntryMarkup({
          ...item,
          updatedAt: formatDate(item.updatedAt || item.createdAt)
        }))
        .join("")
    : '<div class="result-card muted">当前没有误报样本</div>';
}

function renderRewritePairList(items) {
  byId("rewrite-pair-list").innerHTML = items.length
    ? items
        .slice()
        .reverse()
        .map(
          (item) => `
            <article class="admin-item">
              <strong>${escapeHtml(item.name || "未命名改写样本")}</strong>
              <div class="meta-row">
                <span class="meta-pill">${escapeHtml(verdictLabel(item.beforeAnalysis?.verdict || "pass"))}</span>
                <span class="meta-pill">${escapeHtml(verdictLabel(item.afterAnalysis?.verdict || "pass"))}</span>
                <span class="meta-pill">风险分 ${escapeHtml(String(item.beforeAnalysis?.score ?? 0))} -> ${escapeHtml(String(item.afterAnalysis?.score ?? 0))}</span>
                <span class="meta-pill">${escapeHtml(formatDate(item.createdAt))}</span>
              </div>
              <p>修改策略：${escapeHtml(item.rewriteStrategy || "未填写")}</p>
              <p>有效改动：${escapeHtml(item.effectiveChanges || "未填写")}</p>
              <p>修改前：${escapeHtml(compactText(item.before?.body || item.before?.title, 96) || "未填写")}</p>
              <p>修改后：${escapeHtml(compactText(item.after?.body || item.after?.title, 96) || "未填写")}</p>
              <div class="item-actions">
                <button
                  type="button"
                  class="button button-danger button-small"
                  data-action="delete-rewrite-pair"
                  data-id="${escapeHtml(item.id)}"
                  data-created-at="${escapeHtml(item.createdAt)}"
                >
                  删除
                </button>
              </div>
            </article>
          `
        )
        .join("")
    : '<div class="result-card muted">当前没有改写前后样本</div>';
}

function successTierLabel(tier) {
  if (tier === "featured") return "人工精选标杆";
  if (tier === "performed") return "过审且表现好";
  return "仅过审";
}

function expectedTypeLabel(value) {
  if (value === "violation") return "违规样本";
  if (value === "false_positive") return "误报样本";
  if (value === "success") return "正常通过样本";
  return String(value || "").trim() || "未标记类型";
}

function benchmarkSourceLabel(source = null) {
  const type = String(source?.type || "").trim();

  if (type === "manual") return "手动录入";
  if (type === "sample_library") return "样本库";
  if (type === "false_positive_log") return "误报日志";
  return "历史样本";
}

function benchmarkSourceFilterValue(source = null) {
  const type = String(source?.type || "").trim();
  return type || "legacy";
}

function reviewBenchmarkTypeFilterLabel(value = "all") {
  if (value === "violation") return "违规样本";
  if (value === "false_positive") return "误报样本";
  if (value === "success") return "正常通过样本";
  return "全部类型";
}

function reviewBenchmarkCollectionFilterLabel(value = "all") {
  return value === "all" ? "全部合集" : collectionTypeLabel(value);
}

function reviewBenchmarkViewFilterLabel(value = "all") {
  if (value === "mismatches") return "仅看最近未命中";
  return "全部样本";
}

function reviewBenchmarkSourceFilterLabel(value = "all") {
  if (value === "manual") return "手动录入";
  if (value === "sample_library") return "样本库";
  if (value === "false_positive_log") return "误报日志";
  if (value === "legacy") return "历史样本";
  return "全部来源";
}

function inferSampleLibraryPublishStatusFromBenchmarkExpectedType(expectedType = "") {
  if (expectedType === "false_positive") return "false_positive";
  if (expectedType === "violation") return "violation";
  if (expectedType === "success") return "published_passed";
  return "not_published";
}

function getReviewBenchmarkMismatchById(id = "") {
  const targetId = String(id || "").trim();

  if (!targetId) {
    return null;
  }

  return (
    (appState.reviewBenchmarkLastRunResult?.results || []).find(
      (item) => item?.matchedExpectation === false && String(item?.id || "").trim() === targetId
    ) || null
  );
}

function buildReviewBenchmarkMismatchSummary(mismatch = {}) {
  const failedHumanizerChecks = (mismatch.humanizer?.checks || [])
    .filter((check) => check?.passed === false)
    .map((check) => String(check?.label || "").trim())
    .filter(Boolean);

  return [
    "来自基准评测未命中回流",
    `预期 ${expectedTypeLabel(mismatch.expectedType)} / 实际 ${verdictLabel(mismatch.actualVerdict)}`,
    `人味项未通过：${failedHumanizerChecks.join("、") || "无"}`
  ].join("；");
}

function getSampleRecordNote(record = {}) {
  return record?.note && typeof record.note === "object" ? record.note : record || {};
}

function getSampleRecordReference(record = {}) {
  if (record?.reference && typeof record.reference === "object") {
    return {
      enabled: record.reference.enabled === true,
      tier: String(record.reference.tier || "").trim(),
      selectedBy: String(record.reference.selectedBy || "").trim(),
      notes: String(record.reference.notes || "").trim()
    };
  }

  const tier = String(record?.tier || "").trim();
  return {
    enabled: Boolean(tier),
    tier,
    selectedBy: "",
    notes: String(record?.notes || "").trim()
  };
}

function getSampleRecordPublish(record = {}) {
  const source =
    record?.publish && typeof record.publish === "object"
      ? record.publish
      : record?.publishResult && typeof record.publishResult === "object"
        ? record.publishResult
        : record || {};

  return {
    status: String(source.status || source.publishStatus || "not_published").trim() || "not_published",
    notes: String(source.notes || source.publishNotes || "").trim(),
    publishedAt: String(source.publishedAt || "").trim(),
    platformReason: String(source.platformReason || "").trim(),
    metrics: {
      likes: Number(source.metrics?.likes ?? source.likes ?? 0) || 0,
      favorites: Number(source.metrics?.favorites ?? source.favorites ?? 0) || 0,
      comments: Number(source.metrics?.comments ?? source.comments ?? 0) || 0
    }
  };
}

function getSampleRecordTitle(record = {}) {
  return String(getSampleRecordNote(record)?.title || record?.title || "").trim();
}

function getSampleRecordBody(record = {}) {
  return String(getSampleRecordNote(record)?.body || record?.body || "").trim();
}

function getSampleRecordCoverText(record = {}) {
  return String(getSampleRecordNote(record)?.coverText || record?.coverText || "").trim();
}

function getSampleRecordCollectionType(record = {}) {
  return String(getSampleRecordNote(record)?.collectionType || record?.collectionType || "").trim();
}

function getSampleRecordTags(record = {}) {
  return uniqueStrings(getSampleRecordNote(record)?.tags || record?.tags || []);
}

function getReviewBenchmarkCollectionType(item = {}) {
  return String(item?.input?.collectionType || item?.collectionType || "").trim();
}

function inferBenchmarkExpectedTypeFromSampleRecord(record = {}) {
  const publish = getSampleRecordPublish(record);

  if (publish.status === "false_positive") {
    return "false_positive";
  }

  if (publish.status === "violation") {
    return "violation";
  }

  return "success";
}

async function addBenchmarkSample(payload = {}) {
  const response = await apiJson(reviewBenchmarkApi, {
    method: "POST",
    body: JSON.stringify(payload)
  });

  renderReviewBenchmarkSamples(response.items || []);

  const resultNode = byId("review-benchmark-result");

  if (resultNode) {
    resultNode.innerHTML = `
      <div class="result-card-shell">
        ${
          response.duplicate
            ? `样本已存在，未重复加入，当前样本数 ${escapeHtml(String(response.items?.length ?? 0))}。`
            : `已加入基准评测，当前样本数 ${escapeHtml(String(response.items?.length ?? 0))}。`
        }
      </div>
    `;
  }

  revealReviewBenchmarkPane();
  return response;
}

function hasTrackedLifecycle(record = {}) {
  const publish = getSampleRecordPublish(record);
  return (
    publish.status !== "not_published" ||
    publish.metrics.likes > 0 ||
    publish.metrics.favorites > 0 ||
    publish.metrics.comments > 0 ||
    Boolean(publish.notes || publish.publishedAt || publish.platformReason)
  );
}

function collectionTypeLabel(value = "") {
  return String(value || "").trim() || "未分类合集";
}

function sampleLibraryFilterLabel(value = "all") {
  if (value === "incomplete") return "待补全";
  if (value === "reference") return "已成参考";
  if (value === "published") return "已跟踪发布";
  return "全部记录";
}

function sampleLibraryCollectionFilterLabel(value = "all") {
  return value === "all" ? "全部合集" : collectionTypeLabel(value);
}

function filterSampleLibraryRecords(items = []) {
  const normalizedItems = Array.isArray(items) ? items : [];
  const filter = String(appState.sampleLibraryFilter || "all").trim() || "all";
  const collectionFilter = String(appState.sampleLibraryCollectionFilter || "all").trim() || "all";
  const search = String(appState.sampleLibrarySearch || "")
    .trim()
    .toLowerCase();

  return normalizedItems.filter((item) => {
    const reference = getSampleRecordReference(item);
    const trackedLifecycle = hasTrackedLifecycle(item);
    const collectionType = getSampleRecordCollectionType(item);

    if (filter === "incomplete" && (reference.enabled || trackedLifecycle)) {
      return false;
    }

    if (filter === "reference" && !reference.enabled) {
      return false;
    }

    if (filter === "published" && !trackedLifecycle) {
      return false;
    }

    if (collectionFilter !== "all" && collectionType !== collectionFilter) {
      return false;
    }

    if (!search) {
      return true;
    }

    const haystack = [
      item?.id,
      item?.source,
      item?.stage,
      getSampleRecordTitle(item),
      getSampleRecordBody(item),
      getSampleRecordCoverText(item),
      collectionType,
      joinCSV(getSampleRecordTags(item)),
      getSampleRecordReference(item)?.tier,
      getSampleRecordPublish(item)?.status
    ]
      .map((value) => String(value || "").toLowerCase())
      .join("\n");

    return haystack.includes(search);
  });
}

function getSelectedSampleLibraryRecord() {
  const filteredItems = filterSampleLibraryRecords(appState.sampleLibraryRecords);

  if (!filteredItems.length) {
    appState.selectedSampleLibraryRecordId = "";
    return null;
  }

  const selectedRecord =
    filteredItems.find((item) => String(item?.id || "") === appState.selectedSampleLibraryRecordId) || filteredItems[0];

  appState.selectedSampleLibraryRecordId = String(selectedRecord?.id || "");
  return selectedRecord;
}

function renderSampleLibraryList(items = []) {
  const listNode = byId("sample-library-record-list");
  const countNode = byId("sample-library-list-count");

  if (!listNode) {
    return;
  }

  if (countNode) {
    countNode.textContent = `${items.length} 条 · ${sampleLibraryFilterLabel(appState.sampleLibraryFilter)} · ${sampleLibraryCollectionFilterLabel(
      appState.sampleLibraryCollectionFilter
    )}`;
  }

  listNode.innerHTML = items.length
    ? items
        .map((item) => {
          const itemId = String(item?.id || "");
          const isActive = itemId && itemId === appState.selectedSampleLibraryRecordId;
          const reference = getSampleRecordReference(item);
          const publish = getSampleRecordPublish(item);
          const title = getSampleRecordTitle(item) || "未命名样本记录";
          const body = getSampleRecordBody(item);
          const collectionType = getSampleRecordCollectionType(item);
          const tags = getSampleRecordTags(item);

          return `
            <button
              type="button"
              class="sample-library-record-card admin-item${isActive ? " is-active" : ""}"
              data-sample-library-record-id="${escapeHtml(itemId)}"
            >
              <strong>${escapeHtml(title)}</strong>
              <div class="meta-row">
                <span class="meta-pill">${escapeHtml(reference.enabled ? successTierLabel(reference.tier) : "待补全")}</span>
                <span class="meta-pill">${escapeHtml(publishStatusLabel(publish.status))}</span>
                <span class="meta-pill">${escapeHtml(collectionTypeLabel(collectionType))}</span>
                <span class="meta-pill">${escapeHtml(lifecycleSourceLabel(item?.source || "manual"))}</span>
                <span class="meta-pill">${escapeHtml(formatDate(item?.updatedAt || item?.createdAt))}</span>
              </div>
              <p>${escapeHtml(compactText(body || getSampleRecordCoverText(item), 96) || "未填写正文")}</p>
              <p>标签：${escapeHtml(joinCSV(tags) || "未填写")}</p>
            </button>
          `;
        })
        .join("")
    : '<div class="result-card muted">当前没有样本记录</div>';
}

function renderSampleLibraryDetailSection(nodeId, markup) {
  const node = byId(nodeId);

  if (node) {
    node.innerHTML = markup;
  }
}

function renderSampleLibraryDetail(record) {
  const detailNode = byId("sample-library-detail");
  const headerNode = byId("sample-library-detail-header");

  if (!detailNode) {
    return;
  }

  if (!record) {
    if (headerNode) {
      headerNode.innerHTML = '<div class="result-card muted">请选择左侧样本，或先新增一条记录。</div>';
    }

    renderSampleLibraryDetailSection(
      "sample-library-base-section",
      `
        <div class="sample-library-section-head">
          <div>
            <strong>基础内容</strong>
            <p>先保存标题、正文、标签和封面文案。</p>
          </div>
          <span class="meta-pill">未选择记录</span>
        </div>
        <div class="result-card muted">选中一条记录后再补充基础内容。</div>
      `
    );
    renderSampleLibraryDetailSection(
      "sample-library-reference-section",
      `
        <div class="sample-library-section-head">
          <div>
            <strong>参考属性</strong>
            <p>决定它是否进入参考样本和风格画像。</p>
          </div>
          <span class="meta-pill">未启用</span>
        </div>
        <div class="result-card muted">选中记录后可启用参考属性。</div>
      `
    );
    renderSampleLibraryDetailSection(
      "sample-library-lifecycle-section",
      `
        <div class="sample-library-section-head">
          <div>
            <strong>生命周期属性</strong>
            <p>回填发布结果和互动表现。</p>
          </div>
          <span class="meta-pill">未回填</span>
        </div>
        <div class="result-card muted">选中记录后可补充发布状态与互动指标。</div>
      `
    );
    return;
  }

  const note = getSampleRecordNote(record);
  const reference = getSampleRecordReference(record);
  const publish = getSampleRecordPublish(record);
  const collectionType = getSampleRecordCollectionType(record);
  const referenceSummary = reference.enabled ? successTierLabel(reference.tier) : "未启用";
  const lifecycleSummary = hasTrackedLifecycle(record) ? publishStatusLabel(publish.status) : "未回填";

  if (headerNode) {
    headerNode.innerHTML = `
      <article class="result-card-shell">
        <div class="sample-library-detail-topbar">
          <div>
            <strong>${escapeHtml(getSampleRecordTitle(record) || "未命名样本记录")}</strong>
            <p>${escapeHtml(compactText(getSampleRecordBody(record) || getSampleRecordCoverText(record), 120) || "未填写正文")}</p>
          </div>
          <div class="item-actions">
            <button
              type="button"
              class="button button-alt button-small"
              data-action="add-sample-library-to-benchmark"
              data-id="${escapeHtml(record.id || "")}"
            >
              加入基准评测
            </button>
            <button
              type="button"
              class="button button-danger button-small"
              data-action="delete-sample-library-record"
              data-id="${escapeHtml(record.id || "")}"
            >
              删除记录
            </button>
          </div>
        </div>
        <div class="meta-row">
          <span class="meta-pill">${escapeHtml(referenceSummary)}</span>
          <span class="meta-pill">${escapeHtml(lifecycleSummary)}</span>
          <span class="meta-pill">${escapeHtml(collectionTypeLabel(collectionType))}</span>
          <span class="meta-pill">${escapeHtml(lifecycleSourceLabel(record.source || "manual"))}</span>
          <span class="meta-pill">${escapeHtml(formatDate(record.updatedAt || record.createdAt))}</span>
        </div>
      </article>
    `;
  }

  renderSampleLibraryDetailSection(
    "sample-library-base-section",
    `
      <div class="sample-library-section-head">
        <div>
          <strong>基础内容</strong>
          <p>先确认标题、正文和标签，后续筛选都基于这里。</p>
        </div>
        <span class="meta-pill">已选中</span>
      </div>
      <div class="admin-panel-body stack compact-form">
        <label>
          <span>标题</span>
          <input name="title" value="${escapeHtml(note.title || "")}" placeholder="样本标题" />
        </label>
        <label>
          <span>正文</span>
          <textarea name="body" rows="6" placeholder="样本正文">${escapeHtml(note.body || "")}</textarea>
        </label>
        <label>
          <span>封面文案</span>
          <input name="coverText" value="${escapeHtml(note.coverText || "")}" placeholder="封面文案" />
        </label>
        <label>
          <span>合集类型</span>
          <select name="collectionType">
            ${buildCollectionTypeOptionsMarkup({
              options: appState.collectionTypeOptions,
              value: collectionType
            })}
          </select>
        </label>
        <label>
          <span>标签</span>
          <input name="tags" value="${escapeHtml(joinCSV(note.tags) || "")}" placeholder="标签1, 标签2" />
        </label>
        <div class="item-actions">
          <button type="button" class="button button-small" data-action="save-sample-library-base" data-id="${escapeHtml(record.id || "")}">
            保存基础内容
          </button>
        </div>
        <p class="helper-text action-gate-hint" id="sample-library-base-action-hint" aria-live="polite"></p>
      </div>
    `
  );

  renderSampleLibraryDetailSection(
    "sample-library-reference-section",
    `
      <div class="sample-library-section-head">
        <div>
          <strong>参考属性</strong>
          <p>决定这条记录是否参与参考样本和风格画像生成。</p>
        </div>
        <span class="meta-pill">${escapeHtml(referenceSummary)}</span>
      </div>
      <div class="admin-panel-body stack compact-form">
        <label class="sample-library-checkbox">
          <input type="checkbox" name="enabled"${reference.enabled ? " checked" : ""} />
          <span>启用为参考样本</span>
        </label>
        <label>
          <span>参考等级</span>
          <select name="tier">
            <option value=""${!reference.tier ? " selected" : ""}>未启用</option>
            <option value="passed"${reference.tier === "passed" ? " selected" : ""}>仅过审</option>
            <option value="performed"${reference.tier === "performed" ? " selected" : ""}>过审且表现好</option>
            <option value="featured"${reference.tier === "featured" ? " selected" : ""}>人工精选标杆</option>
          </select>
        </label>
        <label>
          <span>备注</span>
          <textarea name="notes" rows="3" placeholder="例如：适合作为情绪沟通类参考">${escapeHtml(reference.notes || "")}</textarea>
        </label>
        <div class="item-actions">
          <button
            type="button"
            class="button button-small"
            data-action="save-sample-library-reference"
            data-id="${escapeHtml(record.id || "")}"
          >
            保存参考属性
          </button>
        </div>
        <p class="helper-text action-gate-hint" id="sample-library-reference-action-hint" aria-live="polite"></p>
      </div>
    `
  );

  renderSampleLibraryDetailSection(
    "sample-library-lifecycle-section",
    `
      <div class="sample-library-section-head">
        <div>
          <strong>生命周期属性</strong>
          <p>发布后回填结果，便于后续判断哪些内容真正可复用。</p>
        </div>
        <span class="meta-pill">${escapeHtml(lifecycleSummary)}</span>
      </div>
      <div class="admin-panel-body">
        <div class="lifecycle-update-grid sample-library-lifecycle-grid">
          <div class="lifecycle-primary-grid">
            <label>
              <span>发布状态</span>
              <select name="status">
                <option value="not_published"${publish.status === "not_published" ? " selected" : ""}>未发布</option>
                <option value="published_passed"${publish.status === "published_passed" ? " selected" : ""}>已发布通过</option>
                <option value="limited"${publish.status === "limited" ? " selected" : ""}>疑似限流</option>
                <option value="violation"${publish.status === "violation" ? " selected" : ""}>平台判违规</option>
                <option value="false_positive"${publish.status === "false_positive" ? " selected" : ""}>系统误报 / 平台放行</option>
                <option value="positive_performance"${publish.status === "positive_performance" ? " selected" : ""}>过审且表现好</option>
              </select>
            </label>
            <label>
              <span>发布时间</span>
              <input name="publishedAt" type="date" value="${escapeHtml(String(publish.publishedAt || "").slice(0, 10))}" />
            </label>
          </div>
          <div class="lifecycle-metrics-grid">
            <label>
              <span>点赞</span>
              <input name="likes" type="number" min="0" value="${escapeHtml(String(publish.metrics.likes || 0))}" />
            </label>
            <label>
              <span>收藏</span>
              <input name="favorites" type="number" min="0" value="${escapeHtml(String(publish.metrics.favorites || 0))}" />
            </label>
            <label>
              <span>评论</span>
              <input name="comments" type="number" min="0" value="${escapeHtml(String(publish.metrics.comments || 0))}" />
            </label>
          </div>
          <label class="field-wide">
            <span>平台原因</span>
            <input name="platformReason" value="${escapeHtml(publish.platformReason || "")}" placeholder="例如：疑似导流、低俗等" />
          </label>
          <label class="field-wide">
            <span>回填备注</span>
            <textarea name="notes" rows="3" placeholder="例如：发布 24h 后稳定通过">${escapeHtml(publish.notes || "")}</textarea>
          </label>
        </div>
        <div class="item-actions">
          <button
            type="button"
            class="button button-small"
            data-action="save-sample-library-lifecycle"
            data-id="${escapeHtml(record.id || "")}"
          >
            保存生命周期属性
          </button>
        </div>
        <p class="helper-text action-gate-hint" id="sample-library-lifecycle-action-hint" aria-live="polite"></p>
      </div>
    `
  );
  syncSampleLibraryDetailActions();
}

function renderSampleLibraryWorkspace() {
  const workspaceNode = byId("sample-library-workspace");
  const listNode = byId("sample-library-record-list");
  const detailNode = byId("sample-library-detail");

  if (!workspaceNode && !listNode && !detailNode) {
    return;
  }

  renderCollectionTypeSelectors();
  const filteredItems = filterSampleLibraryRecords(appState.sampleLibraryRecords);
  const selectedRecord = getSelectedSampleLibraryRecord();

  renderSampleLibraryList(filteredItems);
  renderSampleLibraryDetail(selectedRecord);
  syncSampleLibraryCreateActions();
  syncSampleLibraryPrefillActions();
  syncSampleLibraryDetailActions();
  syncStyleProfileDraftActions();
}

async function refreshSampleLibraryWorkspace() {
  const workspaceNode = byId("sample-library-workspace");
  const listNode = byId("sample-library-record-list");
  const detailNode = byId("sample-library-detail");

  if (!workspaceNode && !listNode && !detailNode) {
    return appState.sampleLibraryRecords;
  }

  try {
    const payload = await apiJson(sampleLibraryApi);
    appState.sampleLibraryRecords = Array.isArray(payload?.items) ? payload.items : [];
  } catch {
    appState.sampleLibraryRecords = Array.isArray(appState.sampleLibraryRecords) ? appState.sampleLibraryRecords : [];
  }

  renderSampleLibraryWorkspace();
  return appState.sampleLibraryRecords;
}

function renderSuccessSamples(items = []) {
  const listNode = byId("success-sample-list");

  if (!listNode) {
    return;
  }

  listNode.innerHTML = items.length
    ? items
        .slice()
        .reverse()
        .map(
          (item) => `
            <article class="admin-item">
              <strong>${escapeHtml(item.title || "未命名成功样本")}</strong>
              <div class="meta-row">
                <span class="meta-pill">${escapeHtml(successTierLabel(item.tier))}</span>
                <span class="meta-pill">权重 ${escapeHtml(String(item.sampleWeight ?? "-"))}</span>
                <span class="meta-pill">赞 ${escapeHtml(String(item.metrics?.likes || 0))}</span>
                <span class="meta-pill">藏 ${escapeHtml(String(item.metrics?.favorites || 0))}</span>
                <span class="meta-pill">评 ${escapeHtml(String(item.metrics?.comments || 0))}</span>
                <span class="meta-pill">${escapeHtml(formatDate(item.createdAt))}</span>
              </div>
              <p>${escapeHtml(compactText(item.body, 140) || "未填写正文")}</p>
              <p>标签：${escapeHtml(joinCSV(item.tags) || "未填写")}</p>
            </article>
          `
        )
        .join("")
    : '<div class="result-card muted">当前没有成功样本</div>';
}

function renderReviewBenchmarkSamples(items = []) {
  appState.reviewBenchmarkSamples = Array.isArray(items) ? items : [];
  renderCollectionTypeSelectors();
  const listNode = byId("review-benchmark-list");
  const countNode = byId("review-benchmark-list-count");
  const filteredItems = filterReviewBenchmarkSamples(appState.reviewBenchmarkSamples);

  if (countNode) {
    countNode.textContent = `${filteredItems.length} 条 · ${reviewBenchmarkViewFilterLabel(
      appState.reviewBenchmarkViewFilter
    )} · ${reviewBenchmarkCollectionFilterLabel(
      appState.reviewBenchmarkCollectionFilter
    )} · ${reviewBenchmarkTypeFilterLabel(
      appState.reviewBenchmarkTypeFilter
    )} · ${reviewBenchmarkSourceFilterLabel(appState.reviewBenchmarkSourceFilter)}`;
  }

  if (!listNode) {
    return;
  }

  listNode.innerHTML = filteredItems.length
    ? filteredItems
        .slice()
        .reverse()
        .map(
          (item) => `
            <article class="admin-item">
              <strong>${escapeHtml(item.input?.title || item.title || "未命名基准样本")}</strong>
              <div class="meta-row">
                <span class="meta-pill">${escapeHtml(collectionTypeLabel(getReviewBenchmarkCollectionType(item)))}</span>
                <span class="meta-pill">${escapeHtml(expectedTypeLabel(item.expectedType))}</span>
                <span class="meta-pill">${escapeHtml(benchmarkSourceLabel(item.source))}</span>
                <span class="meta-pill">${escapeHtml(joinCSV(item.input?.tags || item.tags) || "未填写标签")}</span>
                <span class="meta-pill">${escapeHtml(formatDate(item.createdAt))}</span>
              </div>
              <p>${escapeHtml(compactText(item.input?.body || item.body, 140) || "未填写正文")}</p>
              <div class="item-actions">
                <button
                  type="button"
                  class="button button-danger button-small"
                  data-action="delete-review-benchmark"
                  data-id="${escapeHtml(item.id || "")}"
                >
                  删除
                </button>
              </div>
            </article>
          `
        )
        .join("")
    : '<div class="result-card muted">当前没有基准样本</div>';
  syncReviewBenchmarkActions();
}

function filterReviewBenchmarkSamples(items = []) {
  const normalizedItems = Array.isArray(items) ? items : [];
  const viewFilter = String(appState.reviewBenchmarkViewFilter || "all").trim() || "all";
  const collectionFilter = String(appState.reviewBenchmarkCollectionFilter || "all").trim() || "all";
  const typeFilter = String(appState.reviewBenchmarkTypeFilter || "all").trim() || "all";
  const sourceFilter = String(appState.reviewBenchmarkSourceFilter || "all").trim() || "all";
  const mismatchIds = new Set(
    (appState.reviewBenchmarkLastRunResult?.results || [])
      .filter((item) => item?.matchedExpectation === false)
      .map((item) => String(item?.id || "").trim())
      .filter(Boolean)
  );

  return normalizedItems.filter((item) => {
    if (viewFilter === "mismatches" && !mismatchIds.has(String(item?.id || "").trim())) {
      return false;
    }

    if (collectionFilter !== "all" && getReviewBenchmarkCollectionType(item) !== collectionFilter) {
      return false;
    }

    if (typeFilter !== "all" && String(item?.expectedType || "").trim() !== typeFilter) {
      return false;
    }

    if (sourceFilter !== "all" && benchmarkSourceFilterValue(item?.source) !== sourceFilter) {
      return false;
    }

    return true;
  });
}

function renderReviewBenchmarkResult(result = null) {
  if (!result) {
    appState.reviewBenchmarkLastRunResult = null;
    byId("review-benchmark-result").innerHTML = '<div class="result-card muted">等待操作</div>';
    return;
  }

  appState.reviewBenchmarkLastRunResult = result;
  const summary = result.summary || {};
  const humanizerSummary = summary.humanizer || {};
  const humanizerChecks = Object.values(humanizerSummary.byCheck || {});
  const mismatches = (result.results || []).filter((item) => !item.matchedExpectation);

  byId("review-benchmark-result").innerHTML = `
    <div class="result-card-shell">
      <div class="review-benchmark-result-grid">
        <div class="meta-pill">总样本 ${escapeHtml(String(summary.total || 0))}</div>
        <div class="meta-pill">匹配 ${escapeHtml(String(summary.passed || 0))}</div>
        <div class="meta-pill">未匹配 ${escapeHtml(String(summary.failed || 0))}</div>
        <div class="meta-pill">人味项通过 ${escapeHtml(String(humanizerSummary.passedSamples || 0))}</div>
      </div>
      <div class="tab-panel-head">
        <strong>人味化检查</strong>
        <span>这部分用轻量规则检查开头抓力、真实场景、假设例子和说教腔，不替代人工判断，但能帮我们快速发现 AI 味偏重的样本。</span>
      </div>
      <ul class="review-benchmark-mismatch-list">
        ${
          humanizerChecks.length
            ? humanizerChecks
                .map(
                  (item) => `
                    <li>
                      <strong>${escapeHtml(item.label || "未命名检查项")}</strong>
                      <span>通过 ${escapeHtml(String(item.passed || 0))} / 失败 ${escapeHtml(String(item.failed || 0))}</span>
                    </li>
                  `
                )
                .join("")
            : "<li><strong>当前没有人味化检查结果</strong><span>运行基准评测后会在这里展示。</span></li>"
        }
      </ul>
      <div class="tab-panel-head">
        <strong>未匹配样本</strong>
        <span>优先看这部分，决定是补规则、调权重，还是修正基准样本预期。</span>
      </div>
      <ul class="review-benchmark-mismatch-list">
        ${
          mismatches.length
            ? mismatches
                .map(
                  (item) => `
                    <li>
                      <strong>${escapeHtml(item.input?.title || item.id || "未命名样本")}</strong>
                      <span>
                        预期 ${escapeHtml(expectedTypeLabel(item.expectedType))} / 实际 ${escapeHtml(
                          verdictLabel(item.actualVerdict)
                        )}
                      </span>
                      <span>
                        人味项未通过：${escapeHtml(
                          (item.humanizer?.checks || [])
                            .filter((check) => check.passed === false)
                            .map((check) => check.label)
                            .join("、") || "无"
                            )}
                      </span>
                      <div class="item-actions">
                        <button
                          type="button"
                          class="button button-small"
                          data-action="send-review-benchmark-to-sample-library"
                          data-id="${escapeHtml(item.id || "")}"
                        >
                          回流到样本库
                        </button>
                        ${
                          item.expectedType === "false_positive"
                            ? `
                          <button
                            type="button"
                            class="button button-alt button-small"
                            data-action="send-review-benchmark-to-false-positive"
                            data-id="${escapeHtml(item.id || "")}"
                          >
                            回流到误报日志
                          </button>
                        `
                            : ""
                        }
                      </div>
                    </li>
                  `
                )
                .join("")
            : "<li><strong>当前没有未匹配样本</strong><span>这次基准评测全部命中预期。</span></li>"
        }
      </ul>
    </div>
  `;
}

async function refreshReviewBenchmark() {
  const payload = await apiJson(reviewBenchmarkApi);
  renderReviewBenchmarkSamples(payload.items || []);
  return payload;
}

function renderNoteLifecycle(items = []) {
  const statusOptions = [
    "not_published",
    "published_passed",
    "limited",
    "violation",
    "false_positive",
    "positive_performance"
  ];
  const listNode = byId("note-lifecycle-list");

  if (!listNode) {
    return;
  }

  listNode.innerHTML = items.length
    ? items
        .slice()
        .reverse()
        .map((item) => {
          const status = item.publishResult?.status || item.status || "not_published";

          return `
            <article class="admin-item lifecycle-item">
              <strong>${escapeHtml(item.name || item.note?.title || "未命名笔记")}</strong>
              <div class="meta-row">
                <span class="meta-pill">${escapeHtml(publishStatusLabel(status))}</span>
                <span class="meta-pill">权重 ${escapeHtml(String(item.sampleWeight ?? "-"))}</span>
                <span class="meta-pill">${escapeHtml(lifecycleSourceLabel(item.source))}</span>
                <span class="meta-pill">${escapeHtml(formatDate(item.updatedAt || item.createdAt))}</span>
                <span class="meta-pill">赞 ${escapeHtml(String(item.publishResult?.metrics?.likes || 0))}</span>
                <span class="meta-pill">藏 ${escapeHtml(String(item.publishResult?.metrics?.favorites || 0))}</span>
                <span class="meta-pill">评 ${escapeHtml(String(item.publishResult?.metrics?.comments || 0))}</span>
              </div>
              <p>${escapeHtml(compactText(item.note?.body || item.note?.title || item.note?.coverText, 150) || "未填写正文")}</p>
              <p>标签：${escapeHtml(joinCSV(item.note?.tags) || "未填写")}</p>
              <div class="lifecycle-update-grid">
                <div class="lifecycle-primary-grid">
                  <label>
                    <span>发布状态</span>
                    <select name="publishStatus">
                      ${statusOptions
                        .map(
                          (option) =>
                            `<option value="${escapeHtml(option)}"${option === status ? " selected" : ""}>${escapeHtml(
                              publishStatusLabel(option)
                            )}</option>`
                        )
                        .join("")}
                    </select>
                  </label>
                </div>
                <div class="lifecycle-metrics-grid">
                  <label>
                    <span>点赞</span>
                    <input name="likes" type="number" min="0" value="${escapeHtml(String(item.publishResult?.metrics?.likes || 0))}" />
                  </label>
                  <label>
                    <span>收藏</span>
                    <input name="favorites" type="number" min="0" value="${escapeHtml(
                      String(item.publishResult?.metrics?.favorites || 0)
                    )}" />
                  </label>
                  <label>
                    <span>评论</span>
                    <input name="comments" type="number" min="0" value="${escapeHtml(
                      String(item.publishResult?.metrics?.comments || 0)
                    )}" />
                  </label>
                </div>
                <label class="field-wide">
                  <span>回填备注</span>
                  <input name="notes" value="${escapeHtml(item.publishResult?.notes || "")}" placeholder="例如：发出 24h 后正常，互动稳定" />
                </label>
              </div>
              <div class="item-actions">
                <button type="button" class="button button-small" data-action="update-lifecycle-publish" data-id="${escapeHtml(item.id || "")}">
                  更新发布结果
                </button>
                <button type="button" class="button button-danger button-small" data-action="delete-lifecycle" data-id="${escapeHtml(item.id || "")}">
                  删除
                </button>
              </div>
            </article>
          `;
        })
        .join("")
    : '<div class="result-card muted">当前没有笔记生命周期记录</div>';
}

function renderStyleProfile(profileState = {}) {
  appState.styleProfileState = profileState;
  const current = profileState?.current;
  const draft = profileState?.draft;
  const profile = draft || current;
  const versions = Array.isArray(profileState?.versions) ? profileState.versions : [];
  const isDraftEditing = Boolean(draft && appState.styleProfileDraftEditing);

  if (!draft && appState.styleProfileDraftEditing) {
    exitStyleProfileDraftEditMode();
  }

  const options = [
    '<option value="">当前默认画像</option>',
    ...versions.map(
      (item) =>
        `<option value="${escapeHtml(item.id || "")}"${current?.id === item.id ? " selected" : ""}>${escapeHtml(
          `${item.status === "active" ? "当前 / " : ""}${item.topic || item.name || "通用风格"}`
        )}</option>`
    )
  ].join("");
  const generationSelect = byId("generation-style-profile-select");

  if (generationSelect) {
    generationSelect.innerHTML = options;
  }
  const versionsMarkup = versions.length
    ? `
      <div class="style-profile-version-list">
        ${versions
          .slice()
          .reverse()
          .map(
            (item) => `
              <article class="style-profile-version-card${item.status === "active" ? " is-active" : ""}">
                <div>
                  <strong>${escapeHtml(item.topic || item.name || "通用风格")}</strong>
                  <p>${escapeHtml(item.tone || "未生成语气画像")}</p>
                </div>
                <div class="meta-row">
                  <span class="meta-pill">${escapeHtml(item.status === "active" ? "当前生效" : "历史版本")}</span>
                  <span class="meta-pill">引用 ${escapeHtml(String(item.sourceSampleIds?.length || 0))} 条</span>
                </div>
                ${
                  item.status !== "active"
                    ? `<button type="button" class="button button-small" data-action="activate-style-profile" data-id="${escapeHtml(
                        item.id || ""
                      )}">设为当前</button>`
                    : ""
                }
              </article>
            `
          )
          .join("")}
      </div>
    `
    : "";

  byId("style-profile-result").innerHTML = profile
    ? `
      <article class="style-profile-card">
        <div class="meta-row">
          <span class="meta-pill">${escapeHtml(profile.status === "active" ? "已生效" : "待确认")}</span>
          <span class="meta-pill">${escapeHtml(profile.topic || "通用风格")}</span>
          <span class="meta-pill">引用 ${escapeHtml(String(profile.sourceSampleIds?.length || 0))} 条样本</span>
        </div>
        <strong>${escapeHtml(profile.status === "active" ? "当前风格画像" : "待确认风格画像")}</strong>
        ${
          isDraftEditing
            ? `
              <div class="style-profile-form compact-form">
                <label>
                  <span>主题</span>
                  <input name="topic" value="${escapeHtml(appState.styleProfileDraftForm.topic || "")}" placeholder="例如：亲密关系科普" />
                </label>
                <label>
                  <span>语气画像</span>
                  <textarea name="tone" rows="3" placeholder="例如：温和、克制、像朋友提醒">${escapeHtml(
                    appState.styleProfileDraftForm.tone || ""
                  )}</textarea>
                </label>
                <label>
                  <span>标题风格</span>
                  <textarea name="titleStyle" rows="3" placeholder="例如：先讲场景，再给轻结论">${escapeHtml(
                    appState.styleProfileDraftForm.titleStyle || ""
                  )}</textarea>
                </label>
                <label>
                  <span>正文结构</span>
                  <textarea name="bodyStructure" rows="3" placeholder="例如：先结论、再场景、最后建议">${escapeHtml(
                    appState.styleProfileDraftForm.bodyStructure || ""
                  )}</textarea>
                </label>
                <label>
                  <span>偏好标签</span>
                  <input name="preferredTags" value="${escapeHtml(
                    appState.styleProfileDraftForm.preferredTags || ""
                  )}" placeholder="标签1, 标签2" />
                </label>
              </div>
            `
            : `
              <p>${escapeHtml(profile.tone || "未生成语气画像")}</p>
              <p>${escapeHtml(profile.titleStyle || "未生成标题画像")}</p>
              <p>${escapeHtml(profile.bodyStructure || "未生成正文结构画像")}</p>
              <p>偏好标签：${escapeHtml(joinCSV(profile.preferredTags) || "未总结")}</p>
            `
        }
        ${
          profile.status === "draft"
            ? `
              <div class="item-actions style-profile-actions${isDraftEditing ? " style-profile-form" : ""}">
                ${
                  isDraftEditing
                    ? `
                      <button type="button" class="button button-ghost button-small" data-action="save-style-profile-draft">保存修改</button>
                      <button type="button" class="button button-ghost button-small" data-action="cancel-style-profile-draft">取消</button>
                      <button type="button" class="button button-alt button-small" data-action="confirm-style-profile">确认生效</button>
                    `
                    : `
                      <button type="button" class="button button-ghost button-small" data-action="edit-style-profile-draft">人工编辑</button>
                      <button type="button" class="button button-alt button-small" data-action="confirm-style-profile">确认生效</button>
                    `
                }
              </div>
            `
            : ""
        }
      </article>
      ${versionsMarkup}
    `
    : '<div class="result-card muted">当前没有风格画像，请先积累成功样本。</div>';
  syncStyleProfileDraftActions();
}

function formatRate(value) {
  const number = Number(value);
  return Number.isFinite(number) ? `${Math.round(number * 100)}%` : "0%";
}

function sceneLabel(scene) {
  const labels = {
    semantic_review: "语义复判",
    cross_review: "交叉复判",
    generation: "生成",
    rewrite: "改写",
    rewrite_patch: "改写修补",
    rewrite_humanizer: "人味化",
    feedback_suggestion: "反馈建议",
    feedback_screenshot: "截图识别"
  };

  return labels[scene] || scene || "未知场景";
}

function buildModelRecommendationText(item) {
  if (!item || typeof item !== "object" || !item.model) {
    return "暂无足够历史数据，先按当前选择执行";
  }

  const route = item.routeLabel || item.route || "未标记路线";
  const provider = providerLabel(item.provider);
  const score = Number.isFinite(Number(item.score)) ? `，稳定分 ${Number(item.score)}` : "";

  return `建议：${route} / ${provider} / ${item.model}${score}`;
}

function renderMainModelRecommendations(recommendations = {}) {
  const sceneMap = {
    "semantic-model-recommendation": recommendations.semantic_review,
    "rewrite-model-recommendation": recommendations.rewrite,
    "cross-review-model-recommendation": recommendations.cross_review
  };

  for (const [id, item] of Object.entries(sceneMap)) {
    const node = byId(id);

    if (node) {
      node.textContent = buildModelRecommendationText(item);
      node.title = item?.reason || "根据模型调用表现生成，仅作提示，不自动改变路由";
    }
  }
}

async function refreshModelPerformancePanel() {
  try {
    const modelPerformance = await apiJson("/api/model-performance");
    renderModelPerformance(modelPerformance.summary || {});
  } catch {
    renderModelPerformance({});
  }
}

function renderModelPerformance(summary = {}) {
  const items = Array.isArray(summary.items) ? summary.items : [];
  const recommendations = summary.recommendations || {};
  const confidence = summary.confidence || {};
  const successfulItems = items.filter((item) => Number(item.okCount || 0) > 0);
  const failedOnlyItems = items.filter((item) => Number(item.okCount || 0) <= 0);
  appState.modelRecommendations = recommendations;
  renderMainModelRecommendations(recommendations);
  const buildPerformanceCards = (list = []) =>
    list
      .map(
        (item) => `
          <article class="admin-item model-performance-card">
            <strong>${escapeHtml([item.routeLabel || item.route, providerLabel(item.provider), item.model].filter(Boolean).join(" / "))}</strong>
            <div class="model-performance-grid">
              <div>
                <span>调用</span>
                <strong>${escapeHtml(String(item.totalCalls || 0))}</strong>
              </div>
              <div>
                <span>成功</span>
                <strong>${escapeHtml(String(item.okCount || 0))}</strong>
              </div>
              <div>
                <span>失败</span>
                <strong>${escapeHtml(String(item.errorCount || 0))}</strong>
              </div>
              <div>
                <span>成功率</span>
                <strong>${escapeHtml(formatRate(item.successRate))}</strong>
              </div>
              <div>
                <span>超时率</span>
                <strong>${escapeHtml(formatRate(item.timeoutRate))}</strong>
              </div>
              <div>
                <span>JSON 错误</span>
                <strong>${escapeHtml(formatRate(item.jsonErrorRate))}</strong>
              </div>
              <div>
                <span>平均耗时</span>
                <strong>${escapeHtml(String(item.averageDurationMs || 0))}ms</strong>
              </div>
            </div>
            <p>场景：${escapeHtml((item.scenes || []).map(sceneLabel).join("、") || "未记录")}</p>
            <p class="helper-text">最近成功：${escapeHtml(item.lastOkAt ? formatDate(item.lastOkAt) : "暂无")}</p>
            <p class="helper-text">最近失败：${escapeHtml(item.lastErrorAt ? formatDate(item.lastErrorAt) : "暂无")}</p>
            ${item.lastError ? `<p class="helper-text">最近错误：${escapeHtml(item.lastError)}</p>` : ""}
          </article>
        `
      )
      .join("");
  const cards = items.length
    ? `
        <section class="model-performance-section">
          <div class="model-performance-section-head">
            <strong>有成功记录</strong>
            <span>这部分至少有过一次真实成功调用，更适合作为稳定性参考。</span>
          </div>
          ${
            successfulItems.length
              ? buildPerformanceCards(successfulItems)
              : '<div class="result-card muted">当前还没有真实成功样本，先不要根据看板推荐切模型。</div>'
          }
        </section>
        <section class="model-performance-section">
          <div class="model-performance-section-head">
            <strong>仅失败记录</strong>
            <span>这部分目前只有失败样本，适合排查链路或密钥，不建议直接作为模型推荐依据。</span>
          </div>
          ${
            failedOnlyItems.length
              ? buildPerformanceCards(failedOnlyItems)
              : '<div class="result-card muted">当前没有纯失败分组。</div>'
          }
        </section>
      `
    : '<div class="result-card muted">暂无模型调用记录。触发语义复判、改写、生成或反馈识别后会开始沉淀。</div>';

  byId("model-performance-result").innerHTML = `
    <div class="model-scope-banner">
      <span class="model-scope-kicker">模型表现</span>
      <strong>累计调用 ${escapeHtml(String(summary.totalCalls || 0))} 次</strong>
      <p>成功 ${escapeHtml(String(summary.okCalls || 0))} 次，失败 ${escapeHtml(String(summary.errorCalls || 0))} 次。当前只做观察统计和推荐提示，不会自动改变模型路由顺序。</p>
      <p>数据可信度：${escapeHtml(confidence.message || "暂无判断")}</p>
    </div>
    ${cards}
  `;
}

function renderGenerationResult(result = {}) {
  const cards = (result.scoredCandidates || [])
    .map(
      (item, index) => {
        const finalDraft = item.finalDraft || item;
        const repair = item.repair || {};
        const repairMarkup = repair.attempted
          ? `
            <div class="generation-repair-banner${repair.applied ? "" : " is-muted"}">
              <span>${repair.applied ? "已自动修复一次" : "已尝试自动修复"}</span>
              <p>${escapeHtml(
                repair.applied
                  ? repair.rewrite?.rewriteNotes || repair.reason || "已根据风险点完成一次自动修复。"
                  : repair.error || repair.reason || "本候选已尝试自动修复，但仍需人工确认。"
              )}</p>
            </div>
          `
          : "";

        return `
        <article class="generation-candidate-card${item.id === result.recommendedCandidateId ? " is-recommended" : ""}">
          <div class="meta-row">
            <span class="meta-pill">${escapeHtml(item.variant || "candidate")}</span>
            ${repair.attempted ? `<span class="meta-pill">${escapeHtml(repair.applied ? "修复后评分" : "修复未完成")}</span>` : ""}
            <span class="meta-pill">综合分 ${escapeHtml(String(item.scores?.total ?? 0))}</span>
            <span class="meta-pill">风格分 ${escapeHtml(String(item.style?.score ?? 0))}</span>
            <span class="meta-pill">${escapeHtml(verdictLabel(item.analysis?.finalVerdict || item.analysis?.verdict || "pass"))}</span>
          </div>
          <strong>${escapeHtml(finalDraft.title || "未生成标题")}</strong>
          <p>${escapeHtml(finalDraft.coverText || "未生成封面文案")}</p>
          <div class="rewrite-body-reader">${escapeHtml(finalDraft.body || "未生成正文")}</div>
          <p class="helper-text">标签：${escapeHtml(joinCSV(finalDraft.tags) || "未生成")}</p>
          ${repairMarkup}
          <p class="helper-text">${escapeHtml(finalDraft.generationNotes || item.generationNotes || "暂无生成说明")}</p>
          <p class="helper-text">${escapeHtml(finalDraft.safetyNotes || item.safetyNotes || "暂无安全注意点")}</p>
          <div class="item-actions">
            <button
              type="button"
              class="button button-small"
              data-action="save-lifecycle-generation"
              data-candidate-id="${escapeHtml(item.id || "")}"
              data-candidate-index="${escapeHtml(String(index))}"
            >
              ${item.id === result.recommendedCandidateId ? "最终推荐稿进入生命周期" : "保存候选稿生命周期"}
            </button>
          </div>
        </article>
      `;
      }
    )
    .join("");

  byId("generation-result").innerHTML = `
    <div class="model-scope-banner">
      <span class="model-scope-kicker">推荐结果</span>
      <strong>${escapeHtml(result.recommendationReason || "暂无推荐")}</strong>
    </div>
    <div class="generation-candidate-grid">${cards || '<div class="muted">没有候选稿</div>'}</div>
    <p class="helper-text action-gate-hint" id="generation-lifecycle-action-hint" aria-live="polite"></p>
  `;
  syncLifecycleResultActions();
}

function renderReviewQueueAdmin(items) {
  byId("review-queue-admin-list").innerHTML = items.length
    ? items
        .map(
          (item) => `
            <article class="admin-item">
              <strong>${escapeHtml(item.phrase)}</strong>
              <div class="meta-row">
                <span class="meta-pill">${escapeHtml(item.priorityLabel || "中优先")}</span>
                <span class="meta-pill">命中 ${escapeHtml(String(item.hitCount || 1))} 次</span>
                <span class="meta-pill">${escapeHtml(matchLabel(item.match || "exact"))}</span>
                <span class="meta-pill">${escapeHtml(item.suggestedCategory || "待人工判断")}</span>
                <span class="meta-pill">${escapeHtml(verdictLabel(item.suggestedRiskLevel || "manual_review"))}</span>
                <span class="meta-pill">${escapeHtml(reviewStatusLabel(item.status || "pending_review"))}</span>
                ${item.candidateType === "whitelist" ? '<span class="meta-pill">宽松白名单</span>' : ""}
              </div>
              <p>${escapeHtml(item.platformReason || "待补充平台原因")}</p>
              <p>优先级分数：${escapeHtml(String(item.priorityScore || 0))}</p>
              ${
                item.match === "regex" && item.pattern
                  ? `<p>语境规则：<code>${escapeHtml(item.pattern)}</code></p>`
                  : ""
              }
              <p>来源内容：${escapeHtml(compactText(item.sourceNoteExcerpt || item.sourceNoteId, 96) || "未标记")}</p>
              <p>${
                item.recommendedLexiconDraft?.blocked
                  ? `当前不建议直接入库：${escapeHtml(item.recommendedLexiconDraft.blockedReason || "更像平台原因标签")}`
                  : item.recommendedLexiconDraft?.targetScope === "whitelist"
                    ? `建议加入宽松白名单：${escapeHtml(item.recommendedLexiconDraft.phrase || item.phrase || "")}`
                    : `建议入库：${escapeHtml(matchLabel(item.recommendedLexiconDraft?.match || "exact"))} /
                ${escapeHtml(lexiconLevelLabel(inferLexiconLevel(item.recommendedLexiconDraft?.lexiconLevel, item.recommendedLexiconDraft?.riskLevel || item.suggestedRiskLevel)))} /
                ${escapeHtml(item.recommendedLexiconDraft?.category || item.suggestedCategory || "待人工判断")} /
                ${escapeHtml(verdictLabel(item.recommendedLexiconDraft?.riskLevel || item.suggestedRiskLevel || "manual_review"))}`
              }</p>
              <p>建议原因：${escapeHtml(item.recommendedLexiconDraft?.xhsReason || "暂无建议原因")}</p>
              ${buildRuleChangePreviewMarkup(item.ruleChangePreview)}
              <div class="item-actions">
                <button
                  type="button"
                  class="button button-small"
                  data-action="prefill-custom-draft"
                  data-match="${escapeHtml(item.recommendedLexiconDraft?.match || "exact")}"
                  data-source="${escapeHtml(
                    item.recommendedLexiconDraft?.term || item.recommendedLexiconDraft?.pattern || item.phrase || ""
                  )}"
                  data-category="${escapeHtml(item.recommendedLexiconDraft?.category || item.suggestedCategory || "")}"
                  data-risk-level="${escapeHtml(
                    item.recommendedLexiconDraft?.riskLevel || item.suggestedRiskLevel || "manual_review"
                  )}"
                  data-lexicon-level="${escapeHtml(
                    inferLexiconLevel(
                      item.recommendedLexiconDraft?.lexiconLevel,
                      item.recommendedLexiconDraft?.riskLevel || item.suggestedRiskLevel || "manual_review"
                    )
                  )}"
                  data-xhs-reason="${escapeHtml(item.recommendedLexiconDraft?.xhsReason || item.platformReason || "")}"
                  ${item.recommendedLexiconDraft?.blocked || item.recommendedLexiconDraft?.targetScope === "whitelist" ? "disabled" : ""}
                >
                  填入表单
                </button>
                <button
                  type="button"
                  class="button button-alt button-small"
                  data-action="promote-review"
                  data-id="${escapeHtml(item.id)}"
                  ${item.recommendedLexiconDraft?.blocked ? "disabled" : ""}
                >
                  ${item.recommendedLexiconDraft?.targetScope === "whitelist" ? "加入白名单" : "按建议入库"}
                </button>
                <button
                  type="button"
                  class="button button-danger button-small"
                  data-action="delete-review"
                  data-id="${escapeHtml(item.id)}"
                >
                  删除
                </button>
              </div>
            </article>
          `
        )
        .join("")
    : '<div class="result-card muted">当前没有待维护的复核项</div>';
}

function renderAdminData(data) {
  renderLexiconList("seed-lexicon-list", data.seedLexicon, "seed");
  renderLexiconList("custom-lexicon-list", data.customLexicon, "custom");
  renderFeedbackLog(data.feedbackLog);
  renderFalsePositiveLog(data.falsePositiveLog || []);
  renderRewritePairList(data.rewritePairs || []);
  renderSuccessSamples(data.successSamples || []);
  renderNoteLifecycle(data.noteLifecycle || []);
}

async function refreshAll() {
  const [summary, adminData, styleProfile, collectionTypePayload] = await Promise.all([
    apiJson("/api/summary"),
    apiJson("/api/admin/data"),
    apiJson("/api/style-profile"),
    apiJson(collectionTypesApi)
  ]);

  appState.collectionTypeOptions = Array.isArray(collectionTypePayload.options) ? collectionTypePayload.options : [];
  renderSummary(summary);
  renderQueue(adminData.reviewQueue);
  renderAdminData(adminData);
  renderStyleProfile(styleProfile.profile || {});
  renderCollectionTypeSelectors();
  await refreshModelPerformancePanel();
  await refreshSampleLibraryWorkspace();
}

async function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("读取截图失败"));
    reader.readAsDataURL(file);
  });
}

function syncSampleLibraryCreateButtonLabel() {
  const button = byId("sample-library-create-button");
  const shell = byId("sample-library-create-form-shell");

  if (button) {
    button.textContent = shell?.hidden === false ? "收起新建" : "新增样本记录";
  }
}

function setSampleLibraryCreateFormOpen(isOpen) {
  const button = byId("sample-library-create-button");
  const shell = byId("sample-library-create-form-shell");
  const form = byId("sample-library-create-form");
  const nextHidden = !isOpen;

  if (shell) {
    shell.hidden = nextHidden;
  }

  if (button) {
    button.setAttribute("aria-expanded", String(!nextHidden));
  }

  syncSampleLibraryCreateButtonLabel();

  if (!nextHidden) {
    shell?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    window.setTimeout(() => {
      form?.elements.title?.focus();
    }, 120);
  }
}

function getAnalyzePayload() {
  const form = new FormData(byId("analyze-form"));

  return {
    title: form.get("title"),
    body: form.get("body"),
    coverText: form.get("coverText"),
    collectionType: String(form.get("collectionType") || "").trim(),
    tags: splitCSV(form.get("tags"))
  };
}

function getGenerationPayload() {
  const form = new FormData(byId("generation-workbench-form"));

  return {
    mode: String(form.get("mode") || "from_scratch"),
    collectionType: String(form.get("collectionType") || "").trim(),
    brief: {
      collectionType: String(form.get("collectionType") || "").trim(),
      topic: String(form.get("topic") || "").trim(),
      sellingPoints: String(form.get("sellingPoints") || "").trim(),
      audience: String(form.get("audience") || "").trim(),
      constraints: String(form.get("constraints") || "").trim()
    },
    draft: {
      title: String(form.get("draftTitle") || "").trim(),
      body: String(form.get("draftBody") || "").trim()
    },
    styleProfileId: String(form.get("styleProfileId") || "").trim(),
    modelSelection: getSelectedModelSelections()
  };
}

function syncRewritePairPrefillButton() {
  const button = byId("rewrite-pair-prefill");
  const requirementMessage = getRewritePairPrefillRequirementMessage();

  if (!button) {
    return;
  }

  setGatedButtonState(button, !requirementMessage, requirementMessage);
  setActionGateHint("rewrite-pair-prefill-hint", requirementMessage);
}

function fillRewritePairFormFromCurrent() {
  if (!appState.latestAnalyzePayload || !appState.latestRewrite || !appState.latestAnalysis) {
    return;
  }

  const form = byId("rewrite-pair-form");
  const before = appState.latestAnalyzePayload;
  const after = normalizeRewritePayload(appState.latestRewrite);
  const pane = byId("rewrite-pairs-pane");

  form.elements.name.value = form.elements.name.value || "当前改写对照样本";
  form.elements.beforeTitle.value = before.title || "";
  form.elements.beforeBody.value = before.body || "";
  form.elements.beforeCoverText.value = before.coverText || "";
  form.elements.beforeTags.value = joinCSV(before.tags || []);
  form.elements.afterTitle.value = after.title || "";
  form.elements.afterBody.value = after.body || "";
  form.elements.afterCoverText.value = after.coverText || "";
  form.elements.afterTags.value = joinCSV(after.tags || []);
  form.elements.rewriteStrategy.value = after.rewriteNotes || form.elements.rewriteStrategy.value;
  form.elements.effectiveChanges.value = after.safetyNotes || form.elements.effectiveChanges.value;
  activateTab("rewrite-pairs-pane");
  pane?.scrollIntoView({ behavior: "smooth", block: "start" });
  window.setTimeout(() => {
    form.elements.name?.focus();
  }, 120);
  byId("rewrite-pair-result").innerHTML =
    '<div class="result-card-shell">已用当前改写结果填充前后样本，可补充平台原因或改写策略后保存。</div>';
  syncRewritePairActions();
}

function fillSuccessSampleFormFromCurrent(source = "analysis") {
  const form = byId("sample-library-create-form");
  const shell = byId("sample-library-create-form-shell");
  const resultNode = byId("sample-library-create-result");
  const payload = appState.latestAnalyzePayload || {};
  const rewrite = source === "rewrite" && appState.latestRewrite ? normalizeRewritePayload(appState.latestRewrite) : null;

  if (!form) {
    return;
  }

  form.elements.title.value = rewrite?.title || payload.title || "";
  form.elements.body.value = rewrite?.body || payload.body || "";
  form.elements.coverText.value = rewrite?.coverText || payload.coverText || "";
  if (form.elements.collectionType) {
    form.elements.collectionType.value = rewrite?.collectionType || payload.collectionType || "";
  }
  form.elements.tags.value = joinCSV(rewrite?.tags?.length ? rewrite.tags : payload.tags || []);
  revealSampleLibraryPane();
  setSampleLibraryCreateFormOpen(true);
  if (resultNode) {
    resultNode.innerHTML =
      '<div class="result-card-shell">已填充新增表单，保存后可继续补参考属性和生命周期属性。</div>';
  }
  syncSampleLibraryCreateActions();
}

function revealNoteLifecyclePane() {
  revealSampleLibraryPane();
}

function getRecommendedGenerationCandidate() {
  const candidates = appState.latestGeneration?.scoredCandidates || [];
  const recommendedId = String(appState.latestGeneration?.recommendedCandidateId || "");

  return candidates.find((item) => String(item.id || "") === recommendedId) || candidates[0] || null;
}

async function saveLifecycleFromCurrent(source = "analysis", candidateId = "", candidateIndex = "") {
  const payload = {
    source,
    note: appState.latestAnalyzePayload || {},
    snapshots: {
      analysis: appState.latestAnalysis || null,
      rewrite: null,
      generation: null,
      crossReview: null
    }
  };

  if (source === "rewrite") {
    const rewrite = normalizeRewritePayload(appState.latestRewrite);
    payload.note = {
      title: rewrite.title,
      body: rewrite.body,
      coverText: rewrite.coverText,
      collectionType: appState.latestAnalyzePayload?.collectionType || "",
      tags: rewrite.tags
    };
    payload.snapshots.rewrite = appState.latestRewrite || rewrite;
  }

  if (source === "generation") {
    const candidates = appState.latestGeneration?.scoredCandidates || [];
    const candidate =
      candidates.find((item) => String(item.id || "") === String(candidateId || "")) ||
      candidates[Number(candidateIndex)];
    const finalDraft = candidate?.finalDraft || candidate;
    const isRecommended = String(candidate?.id || "") === String(appState.latestGeneration?.recommendedCandidateId || "");
    payload.source = isRecommended ? "generation_final" : "generation_candidate";
    payload.name = `${isRecommended ? "最终推荐稿" : "生成候选稿"} / ${finalDraft?.title || finalDraft?.variant || "未命名"}`;
    payload.note = {
      title: finalDraft?.title,
      body: finalDraft?.body,
      coverText: finalDraft?.coverText,
      collectionType: appState.latestGeneration?.collectionType || "",
      tags: finalDraft?.tags
    };
    payload.stage = "generated";
    payload.snapshots.generation = candidate
      ? {
          ...candidate,
          lifecycleSource: payload.source,
          savedDraft: finalDraft
        }
      : null;
    payload.snapshots.analysis = candidate?.analysis || null;
    payload.snapshots.crossReview = candidate?.crossReview || null;
  }

  const response = await apiJson(sampleLibraryApi, {
    method: "POST",
    body: JSON.stringify(payload)
  });
  appState.sampleLibraryRecords = Array.isArray(response.items) ? response.items : appState.sampleLibraryRecords;
  appState.sampleLibraryFilter = "all";
  appState.sampleLibraryCollectionFilter = "all";
  appState.sampleLibrarySearch = "";
  appState.selectedSampleLibraryRecordId = String(response.item?.id || "");
  byId("sample-library-search-input") && (byId("sample-library-search-input").value = "");
  byId("sample-library-filter") && (byId("sample-library-filter").value = "all");
  byId("sample-library-collection-filter") && (byId("sample-library-collection-filter").value = "all");
  renderSampleLibraryWorkspace();
  revealNoteLifecyclePane();
  return response;
}

async function runWorkflowAction(action = "") {
  if (action === "analyze") {
    byId("analyze-button")?.click();
    return;
  }

  if (action === "rewrite") {
    byId("rewrite-button")?.click();
    return;
  }

  if (action === "cross-review") {
    byId("cross-review-button")?.click();
    return;
  }

  if (action === "save-analysis") {
    await saveLifecycleFromCurrent("analysis");
    return;
  }

  if (action === "save-rewrite") {
    await saveLifecycleFromCurrent("rewrite");
    return;
  }

  if (action === "save-generation-final") {
    const candidate = getRecommendedGenerationCandidate();
    await saveLifecycleFromCurrent("generation", candidate?.id || "", "");
    return;
  }

  if (action === "open-lifecycle") {
    revealNoteLifecyclePane();
  }
}

const analyzeForm = byId("analyze-form");
analyzeForm.addEventListener("input", syncAnalyzeActions);
analyzeForm.addEventListener("change", syncAnalyzeActions);
byId("feedback-form").addEventListener("input", syncFeedbackActions);
byId("feedback-form").addEventListener("change", syncFeedbackActions);
byId("generation-workbench-form").addEventListener("input", syncGenerationActions);
byId("generation-workbench-form").addEventListener("change", syncGenerationActions);
byId("rewrite-pair-form").addEventListener("input", syncRewritePairActions);
byId("rewrite-pair-form").addEventListener("change", syncRewritePairActions);
byId("custom-lexicon-form").addEventListener("input", syncLexiconFormActions);
byId("custom-lexicon-form").addEventListener("change", syncLexiconFormActions);
byId("seed-lexicon-form").addEventListener("input", syncLexiconFormActions);
byId("seed-lexicon-form").addEventListener("change", syncLexiconFormActions);
byId("sample-library-create-form").addEventListener("input", syncSampleLibraryCreateActions);
byId("sample-library-create-form").addEventListener("change", syncSampleLibraryCreateActions);
byId("sample-library-detail")?.addEventListener("input", syncSampleLibraryDetailActions);
byId("sample-library-detail")?.addEventListener("change", syncSampleLibraryDetailActions);
byId("review-benchmark-form").addEventListener("input", syncReviewBenchmarkActions);
byId("review-benchmark-form").addEventListener("change", syncReviewBenchmarkActions);
initializeAnalyzeTagPicker();

function buildLexiconEntry(form) {
  const source = String(form.get("source") || "").trim();
  const match = String(form.get("match") || "exact");

  return {
    match,
    term: match === "exact" ? source : "",
    pattern: match === "regex" ? source : "",
    category: form.get("category"),
    riskLevel: form.get("riskLevel"),
    lexiconLevel: form.get("lexiconLevel"),
    xhsReason: form.get("xhsReason"),
    fields: ["title", "body", "coverText", "tags", "comments"]
  };
}

const feedbackState = {
  screenshot: null,
  recognition: null
};

function hasMeaningfulNoteDraft(note = {}) {
  return Boolean(
    String(note.title || "").trim() ||
      String(note.body || "").trim() ||
      String(note.coverText || "").trim() ||
      splitCSV(note.tags || []).length ||
      (Array.isArray(note.tags) ? note.tags.length : 0)
  );
}

function hasFeedbackSubmissionSource() {
  const form = byId("feedback-form");
  const noteContent = String(form?.elements?.noteContent?.value || "").trim();

  return Boolean(noteContent || feedbackState.recognition?.extractedText || feedbackState.recognition?.platformReason);
}

function getFeedbackRecognitionRequirementMessage() {
  if (!feedbackState.screenshot) {
    return "请先上传违规截图。";
  }

  return "";
}

function getFeedbackSubmitRequirementMessage() {
  const form = byId("feedback-form");
  const platformReason = String(form?.elements?.platformReason?.value || feedbackState.recognition?.platformReason || "").trim();

  if (!hasFeedbackSubmissionSource()) {
    return "请先填写笔记内容，或先完成截图识别。";
  }

  if (!platformReason) {
    return "请先填写平台违规原因。";
  }

  return "";
}

function syncFeedbackActions() {
  const recognizeMessage = getFeedbackRecognitionRequirementMessage();
  const submitMessage = getFeedbackSubmitRequirementMessage();
  const recognizeButton = byId("feedback-recognize");
  const submitButton = byId("feedback-form")?.querySelector('button[type="submit"]');

  setGatedButtonState(recognizeButton, !recognizeMessage, recognizeMessage);
  setGatedButtonState(submitButton, !submitMessage, submitMessage);
  setActionGateHint("feedback-action-hint", submitMessage || recognizeMessage);
}

function getGenerationRequirementMessage() {
  const payload = getGenerationPayload();

  if (!String(payload.collectionType || "").trim()) {
    return "请先选择合集类型。";
  }

  if (payload.mode === "draft_optimize") {
    if (!String(payload.draft?.title || "").trim() && !String(payload.draft?.body || "").trim()) {
      return "草稿优化模式请先填写草稿标题或草稿正文。";
    }

    return "";
  }

  if (!String(payload.brief?.topic || "").trim() && !String(payload.brief?.sellingPoints || "").trim()) {
    return "请至少填写主题或卖点 / 重点。";
  }

  return "";
}

function syncGenerationActions() {
  const requirementMessage = getGenerationRequirementMessage();
  const submitButton = byId("generation-workbench-form")?.querySelector('button[type="submit"]');

  setGatedButtonState(submitButton, !requirementMessage, requirementMessage);
  setActionGateHint("generation-action-hint", requirementMessage);
}

function getRewritePairRequirementMessage() {
  const form = byId("rewrite-pair-form");

  if (!form) {
    return "";
  }

  const before = {
    title: form.elements.beforeTitle?.value,
    body: form.elements.beforeBody?.value,
    coverText: form.elements.beforeCoverText?.value,
    tags: form.elements.beforeTags?.value
  };
  const after = {
    title: form.elements.afterTitle?.value,
    body: form.elements.afterBody?.value,
    coverText: form.elements.afterCoverText?.value,
    tags: form.elements.afterTags?.value
  };

  if (!hasMeaningfulNoteDraft(before) && !hasMeaningfulNoteDraft(after)) {
    return "请至少填写改写前或改写后的标题、正文、封面文案、标签之一。";
  }

  return "";
}

function syncRewritePairActions() {
  const requirementMessage = getRewritePairRequirementMessage();
  const submitButton = byId("rewrite-pair-form")?.querySelector('button[type="submit"]');

  setGatedButtonState(submitButton, !requirementMessage, requirementMessage);
  setActionGateHint("rewrite-pair-action-hint", requirementMessage);
}

function getRewritePairPrefillRequirementMessage() {
  if (!appState.latestAnalyzePayload || !appState.latestRewrite || !appState.latestAnalysis) {
    return "请先完成一次改写，再从当前结果填充。";
  }

  const rewrite = normalizeRewritePayload(appState.latestRewrite);

  if (!hasMeaningfulNoteDraft(rewrite)) {
    return "请先生成有效的改写结果。";
  }

  return "";
}

function getSampleLibraryCreateRequirementMessage() {
  const form = byId("sample-library-create-form");

  if (!form) {
    return "";
  }

  if (
    !String(form.elements.title?.value || "").trim() &&
    !String(form.elements.body?.value || "").trim() &&
    !String(form.elements.coverText?.value || "").trim()
  ) {
    return "请至少填写标题、正文或封面文案。";
  }

  if (!String(form.elements.collectionType?.value || "").trim()) {
    return "请先选择合集类型。";
  }

  return "";
}

function syncSampleLibraryCreateActions() {
  const requirementMessage = getSampleLibraryCreateRequirementMessage();
  const submitButton = byId("sample-library-create-form")?.querySelector('button[type="submit"]');

  setGatedButtonState(submitButton, !requirementMessage, requirementMessage);
  setActionGateHint("sample-library-create-action-hint", requirementMessage);
}

function getSampleLibraryPrefillAnalysisRequirementMessage() {
  if (!hasMeaningfulNoteDraft(appState.latestAnalyzePayload || {})) {
    return "请先输入内容并完成检测，再从当前检测填充。";
  }

  return "";
}

function getSampleLibraryPrefillRewriteRequirementMessage() {
  const rewrite = normalizeRewritePayload(appState.latestRewrite);

  if (!hasMeaningfulNoteDraft(rewrite)) {
    return "请先完成一次有效改写，再从当前改写填充。";
  }

  return "";
}

function syncSampleLibraryPrefillActions() {
  const analysisMessage = getSampleLibraryPrefillAnalysisRequirementMessage();
  const rewriteMessage = getSampleLibraryPrefillRewriteRequirementMessage();
  const analysisButton = byId("sample-library-prefill-analysis");
  const rewriteButton = byId("sample-library-prefill-rewrite");

  setGatedButtonState(analysisButton, !analysisMessage, analysisMessage);
  setGatedButtonState(rewriteButton, !rewriteMessage, rewriteMessage);
  setActionGateHint("sample-library-prefill-action-hint", analysisMessage || rewriteMessage);
}

function getSampleLibraryDetailBaseRequirementMessage() {
  const section = byId("sample-library-base-section");

  if (!section) {
    return "";
  }

  const note = {
    title: section.querySelector('[name="title"]')?.value || "",
    body: section.querySelector('[name="body"]')?.value || "",
    coverText: section.querySelector('[name="coverText"]')?.value || "",
    tags: splitCSV(section.querySelector('[name="tags"]')?.value || "")
  };
  const collectionType = String(section.querySelector('[name="collectionType"]')?.value || "").trim();

  if (!hasMeaningfulNoteDraft(note)) {
    return "请至少填写标题、正文、封面文案或标签。";
  }

  if (!collectionType) {
    return "请先选择合集类型。";
  }

  return "";
}

function getSampleLibraryDetailReferenceRequirementMessage() {
  const section = byId("sample-library-reference-section");
  const baseMessage = getSampleLibraryDetailBaseRequirementMessage();

  if (!section) {
    return "";
  }

  if (baseMessage) {
    return baseMessage;
  }

  const enabled = section.querySelector('[name="enabled"]')?.checked === true;
  const tier = String(section.querySelector('[name="tier"]')?.value || "").trim();

  if (enabled && !tier) {
    return "启用参考样本时请先选择参考等级。";
  }

  return "";
}

function getSampleLibraryDetailLifecycleRequirementMessage() {
  return getSampleLibraryDetailBaseRequirementMessage();
}

function syncSampleLibraryDetailActions() {
  const baseMessage = getSampleLibraryDetailBaseRequirementMessage();
  const referenceMessage = getSampleLibraryDetailReferenceRequirementMessage();
  const lifecycleMessage = getSampleLibraryDetailLifecycleRequirementMessage();
  const baseButton = byId("sample-library-base-section")?.querySelector('[data-action="save-sample-library-base"]');
  const referenceButton = byId("sample-library-reference-section")?.querySelector('[data-action="save-sample-library-reference"]');
  const lifecycleButton = byId("sample-library-lifecycle-section")?.querySelector('[data-action="save-sample-library-lifecycle"]');

  setGatedButtonState(baseButton, !baseMessage, baseMessage);
  setGatedButtonState(referenceButton, !referenceMessage, referenceMessage);
  setGatedButtonState(lifecycleButton, !lifecycleMessage, lifecycleMessage);
  setActionGateHint("sample-library-base-action-hint", baseMessage);
  setActionGateHint("sample-library-reference-action-hint", referenceMessage);
  setActionGateHint("sample-library-lifecycle-action-hint", lifecycleMessage);
}

function getLifecycleSaveRequirementMessage(source = "analysis", candidateId = "", candidateIndex = "") {
  if (source === "analysis") {
    if (!hasMeaningfulNoteDraft(appState.latestAnalyzePayload || {})) {
      return "请先完成一次带内容的检测。";
    }

    if (!String(appState.latestAnalyzePayload?.collectionType || "").trim()) {
      return "请先选择合集类型后再保存检测结果。";
    }

    return "";
  }

  if (source === "rewrite") {
    const rewrite = normalizeRewritePayload(appState.latestRewrite);

    if (!hasMeaningfulNoteDraft(rewrite)) {
      return "请先生成有效的改写结果。";
    }

    if (!String(appState.latestAnalyzePayload?.collectionType || "").trim()) {
      return "请先选择合集类型后再保存改写稿。";
    }

    return "";
  }

  if (source === "generation") {
    const candidates = appState.latestGeneration?.scoredCandidates || [];
    const candidate =
      candidates.find((item) => String(item?.id || "") === String(candidateId || "")) ||
      candidates[Number(candidateIndex)];
    const finalDraft = candidate?.finalDraft || candidate || {};

    if (!hasMeaningfulNoteDraft(finalDraft)) {
      return "请先生成有效的候选稿。";
    }

    if (!String(appState.latestGeneration?.collectionType || "").trim()) {
      return "请先选择合集类型后再保存生成稿。";
    }
  }

  return "";
}

function syncLifecycleResultActions() {
  const analysisMessage = getLifecycleSaveRequirementMessage("analysis");
  const rewriteMessage = getLifecycleSaveRequirementMessage("rewrite");
  const generationButtons = [...document.querySelectorAll('[data-action="save-lifecycle-generation"]')];
  const generationMessage = generationButtons.reduce((message, button) => {
    if (message) {
      return message;
    }

    return getLifecycleSaveRequirementMessage("generation", button.dataset.candidateId, button.dataset.candidateIndex);
  }, "");
  const analysisButton = byId("analysis-result")?.querySelector('[data-action="save-lifecycle-analysis"]');
  const rewriteButton = byId("rewrite-result")?.querySelector('[data-action="save-lifecycle-rewrite"]');

  setGatedButtonState(analysisButton, !analysisMessage, analysisMessage);
  setGatedButtonState(rewriteButton, !rewriteMessage, rewriteMessage);
  generationButtons.forEach((button) => {
    const buttonMessage = getLifecycleSaveRequirementMessage("generation", button.dataset.candidateId, button.dataset.candidateIndex);
    setGatedButtonState(button, !buttonMessage, buttonMessage);
  });
  setActionGateHint("analysis-lifecycle-action-hint", analysisMessage);
  setActionGateHint("rewrite-lifecycle-action-hint", rewriteMessage);
  setActionGateHint("generation-lifecycle-action-hint", generationMessage);
}

function getReviewBenchmarkSubmitRequirementMessage() {
  const form = byId("review-benchmark-form");

  if (!form) {
    return "";
  }

  if (!String(form.elements.title?.value || "").trim() && !String(form.elements.body?.value || "").trim()) {
    return "请至少填写标题或正文。";
  }

  if (!String(form.elements.collectionType?.value || "").trim()) {
    return "请先选择合集类型。";
  }

  return "";
}

function getReviewBenchmarkRunRequirementMessage() {
  if (!appState.reviewBenchmarkSamples.length) {
    return "请先至少保存一条基准样本。";
  }

  return "";
}

function syncReviewBenchmarkActions() {
  const submitMessage = getReviewBenchmarkSubmitRequirementMessage();
  const runMessage = getReviewBenchmarkRunRequirementMessage();
  const submitButton = byId("review-benchmark-form")?.querySelector('button[type="submit"]');
  const runButton = byId("review-benchmark-run-button");

  setGatedButtonState(submitButton, !submitMessage, submitMessage);
  setGatedButtonState(runButton, !runMessage, runMessage);
  setActionGateHint("review-benchmark-action-hint", submitMessage || runMessage);
}

function getStyleProfileDraftRequirementMessage() {
  const hasReferenceSample = appState.sampleLibraryRecords.some((item) => item?.reference?.enabled);

  if (!hasReferenceSample) {
    return "请先在样本库启用至少一条参考样本。";
  }

  return "";
}

function syncStyleProfileDraftActions() {
  const requirementMessage = getStyleProfileDraftRequirementMessage();
  const button = byId("style-profile-draft-button");

  setGatedButtonState(button, !requirementMessage, requirementMessage);
  setActionGateHint("style-profile-action-hint", requirementMessage);
}

function getLexiconRequirementMessage(formId) {
  const form = byId(formId);

  if (!form) {
    return "";
  }

  const source = String(form.elements.source?.value || "").trim();
  const category = String(form.elements.category?.value || "").trim();

  if (!source && !category) {
    return "请先填写词 / 模式和分类。";
  }

  if (!source) {
    return "请先填写词 / 模式。";
  }

  if (!category) {
    return "请先填写分类。";
  }

  return "";
}

function syncLexiconFormActions() {
  const customMessage = getLexiconRequirementMessage("custom-lexicon-form");
  const seedMessage = getLexiconRequirementMessage("seed-lexicon-form");
  const customButton = byId("custom-lexicon-form")?.querySelector('button[type="submit"]');
  const seedButton = byId("seed-lexicon-form")?.querySelector('button[type="submit"]');

  setGatedButtonState(customButton, !customMessage, customMessage);
  setGatedButtonState(seedButton, !seedMessage, seedMessage);
  setActionGateHint("custom-lexicon-action-hint", customMessage);
  setActionGateHint("seed-lexicon-action-hint", seedMessage);
}

function openResultPanel(id) {
  const panel = byId(id);

  if (panel && "open" in panel) {
    panel.open = true;
  }
}

byId("feedback-screenshot").addEventListener("change", async (event) => {
  const file = event.currentTarget.files?.[0];
  feedbackState.recognition = null;

  if (!file) {
    feedbackState.screenshot = null;
    renderScreenshotRecognition(null, null);
    syncFeedbackActions();
    return;
  }

  try {
    feedbackState.screenshot = {
      name: file.name,
      type: file.type || "image/png",
      size: file.size,
      dataUrl: await fileToDataUrl(file)
    };

    byId("feedback-screenshot-result").innerHTML = `
      <div class="result-card-shell">
        已选择截图：${escapeHtml(file.name)}，点击“识别截图并回填”开始提取。
      </div>
    `;
  } catch (error) {
    feedbackState.screenshot = null;
    byId("feedback-screenshot-result").innerHTML = `
      <div class="result-card-shell muted">${escapeHtml(error.message || "读取截图失败")}</div>
    `;
  } finally {
    syncFeedbackActions();
  }
});

byId("analyze-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const analyzeButton = byId("analyze-button");
  const requirementMessage = getAnalyzeActionRequirementMessage();

  if (requirementMessage) {
    syncAnalyzeActions();
    return;
  }

  setButtonBusy(analyzeButton, true, "检测中...");
  openResultPanel("analysis-result-panel");

  try {
    const result = await apiJson("/api/analyze", {
      method: "POST",
      body: JSON.stringify({
        ...getAnalyzePayload(),
        modelSelection: getSelectedModelSelections()
      })
    });

    appState.latestAnalyzePayload = getAnalyzePayload();
    appState.latestAnalysis = result;
    appState.latestRewrite = null;
    appState.latestGeneration = null;
    const falsePositiveSources = buildFalsePositiveCaptureSources({
      analyzePayload: appState.latestAnalyzePayload,
      analysisSnapshot: result
    });
    appState.latestAnalysisFalsePositiveSource = falsePositiveSources.analysis;
    appState.latestRewriteFalsePositiveSource = null;
    renderAnalysis(result, appState.latestAnalysisFalsePositiveSource);
    renderWorkflowAssistant();
  } catch (error) {
    byId("analysis-result").innerHTML = `
      <div class="result-card-shell muted">${escapeHtml(error.message || "检测失败")}</div>
    `;
  } finally {
    setButtonBusy(analyzeButton, false);
    syncAnalyzeActions();
    syncRewritePairPrefillButton();
    syncSampleLibraryPrefillActions();
  }
});

byId("rewrite-button").addEventListener("click", async () => {
  const rewriteButton = byId("rewrite-button");
  const requirementMessage = getAnalyzeActionRequirementMessage();

  if (requirementMessage) {
    syncAnalyzeActions();
    return;
  }

  setButtonBusy(rewriteButton, true, "改写中...");
  openResultPanel("rewrite-result-panel");
  byId("rewrite-result").innerHTML =
    '<div class="result-card-shell muted">正在生成合规改写；如果复判还没过，会继续自动改写，直到通过或达到最大轮次...</div>';

  try {
    const result = await apiJson("/api/rewrite", {
      method: "POST",
      body: JSON.stringify({
        ...getAnalyzePayload(),
        modelSelection: getSelectedModelSelections()
      })
    });

    appState.latestAnalyzePayload = getAnalyzePayload();
    appState.latestAnalysis = result.analysis;
    appState.latestRewrite = normalizeRewritePayload(result.rewrite);
    appState.latestGeneration = null;
    const falsePositiveSources = buildFalsePositiveCaptureSources({
      analyzePayload: appState.latestAnalyzePayload,
      analysisSnapshot: result.analysis,
      rewriteSnapshot: appState.latestRewrite
    });
    appState.latestAnalysisFalsePositiveSource = falsePositiveSources.analysis;
    appState.latestRewriteFalsePositiveSource = null;
    renderAnalysis(result.analysis, appState.latestAnalysisFalsePositiveSource);
    renderRewriteResult({
      ...result,
      rewrite: appState.latestRewrite
    });
    renderWorkflowAssistant();
  } catch (error) {
    byId("rewrite-result").innerHTML = `
      <div class="result-card-shell muted">${escapeHtml(error.message || "改写失败")}</div>
    `;
  } finally {
    setButtonBusy(rewriteButton, false);
    syncAnalyzeActions();
    syncRewritePairPrefillButton();
    syncSampleLibraryPrefillActions();
  }
});

byId("cross-review-button").addEventListener("click", async () => {
  const crossReviewButton = byId("cross-review-button");
  const requirementMessage = getAnalyzeActionRequirementMessage();

  if (requirementMessage) {
    syncAnalyzeActions();
    return;
  }

  setButtonBusy(crossReviewButton, true, "复判中...");
  openResultPanel("cross-review-result-panel");
  byId("cross-review-result").innerHTML =
    '<div class="result-card-shell muted">正在调用不同模型进行交叉复判...</div>';

  try {
    const result = await apiJson("/api/cross-review", {
      method: "POST",
      body: JSON.stringify({
        ...getAnalyzePayload(),
        modelSelection: getSelectedModelSelections()
      })
    });

    appState.latestAnalyzePayload = getAnalyzePayload();
    appState.latestAnalysis = result.analysis;
    renderAnalysis(result.analysis);
    renderCrossReviewResult(result);
    renderWorkflowAssistant();
  } catch (error) {
    byId("cross-review-result").innerHTML = `
      <div class="result-card-shell muted">${escapeHtml(error.message || "交叉复判失败")}</div>
    `;
  } finally {
    setButtonBusy(crossReviewButton, false);
    syncAnalyzeActions();
  }
});

byId("generation-workbench-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const submitButton = event.currentTarget.querySelector('button[type="submit"]');
  const requirementMessage = getGenerationRequirementMessage();

  if (requirementMessage) {
    syncGenerationActions();
    return;
  }

  setButtonBusy(submitButton, true, "生成中...");
  byId("generation-result").innerHTML = '<div class="result-card-shell muted">正在生成并评分候选稿...</div>';

  try {
    const payload = getGenerationPayload();
    const result = await apiJson("/api/generate-note", {
      method: "POST",
      body: JSON.stringify(payload)
    });

    appState.latestGeneration = {
      ...result,
      collectionType: result.collectionType || payload.collectionType || ""
    };
    renderGenerationResult(result);
    renderWorkflowAssistant();
  } catch (error) {
    byId("generation-result").innerHTML = `
      <div class="result-card-shell muted">${escapeHtml(error.message || "生成候选稿失败")}</div>
    `;
  } finally {
    setButtonBusy(submitButton, false);
  }
});

byId("analyze-collection-type-add")?.addEventListener("click", async () => {
  try {
    await addCollectionTypeOption("analyze-collection-type-select");
  } catch (error) {
    byId("analysis-result").innerHTML = `
      <div class="result-card-shell muted">${escapeHtml(error.message || "新增合集失败")}</div>
    `;
  }
});

byId("generation-collection-type-add")?.addEventListener("click", async () => {
  try {
    await addCollectionTypeOption("generation-collection-type-select");
  } catch (error) {
    byId("generation-result").innerHTML = `
      <div class="result-card-shell muted">${escapeHtml(error.message || "新增合集失败")}</div>
    `;
  }
});

byId("sample-library-collection-type-add")?.addEventListener("click", async () => {
  try {
    await addCollectionTypeOption("sample-library-collection-type-select");
  } catch (error) {
    byId("sample-library-create-result").innerHTML = `
      <div class="result-card-shell muted">${escapeHtml(error.message || "新增合集失败")}</div>
    `;
  }
});

byId("review-benchmark-collection-type-add")?.addEventListener("click", async () => {
  try {
    await addCollectionTypeOption("review-benchmark-collection-type-select");
  } catch (error) {
    byId("review-benchmark-result").innerHTML = `
      <div class="result-card-shell muted">${escapeHtml(error.message || "新增合集失败")}</div>
    `;
  }
});

byId("feedback-recognize").addEventListener("click", async () => {
  const recognizeButton = byId("feedback-recognize");
  const requirementMessage = getFeedbackRecognitionRequirementMessage();

  if (requirementMessage) {
    syncFeedbackActions();
    byId("feedback-screenshot-result").innerHTML =
      `<div class="result-card-shell muted">${escapeHtml(requirementMessage)}</div>`;
    return;
  }

  byId("feedback-screenshot-result").innerHTML =
    '<div class="result-card-shell muted">正在调用所选模型识别截图...</div>';
  setButtonBusy(recognizeButton, true, "识别中...");

  try {
    const result = await apiJson("/api/feedback/extract-screenshot", {
      method: "POST",
      body: JSON.stringify({
        screenshot: feedbackState.screenshot,
        modelSelection: getSelectedFeedbackModelSelections()
      })
    });

    feedbackState.recognition = result.recognition;
    byId("feedback-form").elements.platformReason.value =
      result.recognition.platformReason || byId("feedback-form").elements.platformReason.value;
    byId("feedback-form").elements.suspiciousPhrases.value =
      joinCSV(result.recognition.suspiciousPhrases) ||
      byId("feedback-form").elements.suspiciousPhrases.value;
    renderScreenshotRecognition(result.recognition, result.screenshot);
  } catch (error) {
    byId("feedback-screenshot-result").innerHTML = `
      <div class="result-card-shell muted">${escapeHtml(error.message || "截图识别失败")}</div>
    `;
  } finally {
    setButtonBusy(recognizeButton, false);
    syncFeedbackActions();
  }
});

document.addEventListener("submit", async (event) => {
  const form = event.target.closest(".false-positive-capture-form");

  if (!form) {
    return;
  }

  event.preventDefault();

  const capture = form.closest(".false-positive-capture");
  const payloadSource = capture?.dataset.falsePositiveSource;
  const resultNode = capture?.querySelector(".false-positive-capture-result");
  const submitButton = form.querySelector('button[type="submit"]');

  if (!payloadSource) {
    if (resultNode) {
      resultNode.innerHTML = '<div class="result-card-shell muted">当前没有可记录的样本。</div>';
    }
    return;
  }

  setButtonBusy(submitButton, true, "记录中...");

  try {
    const source = JSON.parse(payloadSource);
    const status = String(new FormData(form).get("status") || "platform_passed_pending").trim();
    const response = await apiJson("/api/false-positive-log", {
      method: "POST",
      body: JSON.stringify({
        title: source.title,
        body: source.body,
        coverText: source.coverText,
        tags: source.tags,
        status,
        analysis: source.analysisSnapshot || undefined
      })
    });

    if (resultNode) {
      resultNode.innerHTML = `
        <div class="result-card-shell">
          已记录为 ${escapeHtml(falsePositiveStatusLabel(status))}，当前样本数 ${escapeHtml(
            String(response.items?.length ?? 0)
          )}。
        </div>
      `;
    }

    renderFalsePositiveLog(response.items || []);
    revealFalsePositiveLogPane();
  } catch (error) {
    if (resultNode) {
      resultNode.innerHTML = `
        <div class="result-card-shell muted">${escapeHtml(error.message || "记录误报样本失败")}</div>
      `;
    }
  } finally {
    setButtonBusy(submitButton, false);
  }
});

byId("feedback-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const formElement = event.currentTarget;
  const submitButton = formElement.querySelector('button[type="submit"]');
  const form = new FormData(formElement);
  const requirementMessage = getFeedbackSubmitRequirementMessage();

  if (requirementMessage) {
    syncFeedbackActions();
    return;
  }

  setButtonBusy(submitButton, true, "写入中...");

  try {
    const result = await apiJson("/api/feedback", {
      method: "POST",
      body: JSON.stringify({
        noteContent: form.get("noteContent"),
        platformReason: form.get("platformReason"),
        suspiciousPhrases: splitCSV(form.get("suspiciousPhrases")),
        screenshot: feedbackState.screenshot,
        screenshotRecognition: feedbackState.recognition,
        modelSelection: getSelectedFeedbackModelSelections()
      })
    });

    byId("feedback-result").innerHTML = `
      <div class="verdict verdict-observe">
        <span>已写入</span>
        <strong>回流成功</strong>
        <em>待复核 ${result.reviewQueueCount}</em>
      </div>
      <p class="helper-text">本次写入 ${result.imported} 条，截图识别命中 ${result.recognizedFromScreenshot} 条。</p>
      <p class="helper-text">
        联合复盘回流 ${escapeHtml(String(result.candidateSummary?.total ?? 0))} 个候选：
        精确词 ${escapeHtml(String(result.candidateSummary?.exactCount ?? 0))} 个，
        语境候选 ${escapeHtml(String(result.candidateSummary?.contextCount ?? 0))} 个，
        其中规则漏判信号 ${escapeHtml(String(result.candidateSummary?.ruleGapCount ?? 0))} 个。
      </p>
      <p class="helper-text">
        模型辅助补充：${escapeHtml(String(result.candidateSummary?.modelAssistCount ?? 0))} 条回流已启用${
          result.candidateSummary?.modelLabels?.length
            ? `（${escapeHtml(result.candidateSummary.modelLabels.join(", "))}）`
            : ""
        }。
      </p>
    `;

    feedbackState.screenshot = null;
    feedbackState.recognition = null;
    byId("feedback-screenshot-result").innerHTML =
      '<div class="result-card-shell muted">等待截图识别</div>';
    formElement.reset();
    await refreshAll();
  } catch (error) {
    byId("feedback-result").innerHTML = `
      <div class="result-card-shell muted">${escapeHtml(error.message || "写入反馈失败")}</div>
    `;
  } finally {
    setButtonBusy(submitButton, false);
    syncFeedbackActions();
  }
});

async function handleLexiconSubmit(event, scope, resultId, busyText) {
  event.preventDefault();
  const formElement = event.currentTarget;
  const submitButton = formElement.querySelector('button[type="submit"]');
  const form = new FormData(formElement);
  const requirementMessage = getLexiconRequirementMessage(formElement.id);

  if (requirementMessage) {
    syncLexiconFormActions();
    return;
  }

  setButtonBusy(submitButton, true, busyText);

  try {
    await apiJson("/api/admin/lexicon", {
      method: "POST",
      body: JSON.stringify({
        scope,
        entry: buildLexiconEntry(form)
      })
    });

    byId(resultId).innerHTML = '<div class="result-card-shell">操作成功，列表已更新。</div>';
    formElement.reset();
    await refreshAll();
  } catch (error) {
    byId(resultId).innerHTML = `
      <div class="result-card-shell muted">${escapeHtml(error.message || "保存失败")}</div>
    `;
  } finally {
    setButtonBusy(submitButton, false);
    syncLexiconFormActions();
  }
}

byId("seed-lexicon-form").addEventListener("submit", (event) =>
  handleLexiconSubmit(event, "seed", "seed-lexicon-result", "保存中...")
);

byId("custom-lexicon-form").addEventListener("submit", (event) =>
  handleLexiconSubmit(event, "custom", "custom-lexicon-result", "保存中...")
);

byId("rewrite-pair-prefill").addEventListener("click", () => {
  const requirementMessage = getRewritePairPrefillRequirementMessage();

  if (requirementMessage) {
    syncRewritePairPrefillButton();
    return;
  }

  fillRewritePairFormFromCurrent();
});

byId("sample-library-create-button").addEventListener("click", () => {
  const shell = byId("sample-library-create-form-shell");
  setSampleLibraryCreateFormOpen(Boolean(shell?.hidden));
});

byId("rewrite-model-selection").addEventListener("change", () => {
  syncCrossReviewModelSelectionRules();
});

byId("sample-library-search-input").addEventListener("input", (event) => {
  appState.sampleLibrarySearch = String(event.currentTarget.value || "");
  renderSampleLibraryWorkspace();
});

byId("sample-library-filter").addEventListener("change", (event) => {
  appState.sampleLibraryFilter = String(event.currentTarget.value || "all");
  renderSampleLibraryWorkspace();
});

byId("sample-library-prefill-analysis").addEventListener("click", () => {
  const requirementMessage = getSampleLibraryPrefillAnalysisRequirementMessage();

  if (requirementMessage) {
    syncSampleLibraryPrefillActions();
    return;
  }

  fillSuccessSampleFormFromCurrent("analysis");
});

byId("sample-library-prefill-rewrite").addEventListener("click", () => {
  const requirementMessage = getSampleLibraryPrefillRewriteRequirementMessage();

  if (requirementMessage) {
    syncSampleLibraryPrefillActions();
    return;
  }

  fillSuccessSampleFormFromCurrent("rewrite");
});

byId("sample-library-create-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const formElement = event.currentTarget;
  const submitButton = formElement.querySelector('button[type="submit"]');
  const form = new FormData(formElement);
  const requirementMessage = getSampleLibraryCreateRequirementMessage();

  if (requirementMessage) {
    syncSampleLibraryCreateActions();
    return;
  }

  setButtonBusy(submitButton, true, "保存中...");

  try {
    const response = await apiJson(sampleLibraryApi, {
      method: "POST",
      body: JSON.stringify({
        source: "manual",
        note: {
          title: form.get("title"),
          body: form.get("body"),
          coverText: form.get("coverText"),
          collectionType: form.get("collectionType"),
          tags: splitCSV(form.get("tags"))
        },
        snapshots: {
          analysis: appState.latestAnalysis,
          rewrite: appState.latestRewrite,
          generation: null,
          crossReview: null
        }
      })
    });

    appState.sampleLibraryRecords = Array.isArray(response.items) ? response.items : appState.sampleLibraryRecords;
    appState.sampleLibraryFilter = "all";
    appState.sampleLibrarySearch = "";
    appState.selectedSampleLibraryRecordId = String(response.item?.id || "");
    byId("sample-library-search-input").value = "";
    byId("sample-library-filter").value = "all";
    byId("sample-library-collection-filter").value = "all";
    renderSampleLibraryWorkspace();
    byId("sample-library-create-result").innerHTML = '<div class="result-card-shell">样本记录已保存，可继续补参考属性和生命周期属性。</div>';
    formElement.reset();
    renderCollectionTypeSelectors();
    setSampleLibraryCreateFormOpen(false);
  } catch (error) {
    byId("sample-library-create-result").innerHTML = `
      <div class="result-card-shell muted">${escapeHtml(error.message || "保存样本记录失败")}</div>
    `;
  } finally {
    setButtonBusy(submitButton, false);
    syncSampleLibraryCreateActions();
  }
});

byId("review-benchmark-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const formElement = event.currentTarget;
  const submitButton = formElement.querySelector('button[type="submit"]');
  const form = new FormData(formElement);
  const requirementMessage = getReviewBenchmarkSubmitRequirementMessage();

  if (requirementMessage) {
    syncReviewBenchmarkActions();
    return;
  }

  setButtonBusy(submitButton, true, "保存中...");

  try {
    await addBenchmarkSample({
      title: form.get("title"),
      body: form.get("body"),
      collectionType: form.get("collectionType"),
      tags: splitCSV(form.get("tags")),
      expectedType: form.get("expectedType"),
      source: {
        type: "manual"
      }
    });
    formElement.reset();
    renderCollectionTypeSelectors();
  } catch (error) {
    byId("review-benchmark-result").innerHTML = `
      <div class="result-card-shell muted">${escapeHtml(error.message || "保存基准样本失败")}</div>
    `;
  } finally {
    setButtonBusy(submitButton, false);
    syncReviewBenchmarkActions();
  }
});

byId("sample-library-collection-filter").addEventListener("change", (event) => {
  appState.sampleLibraryCollectionFilter = String(event.currentTarget.value || "all");
  renderSampleLibraryWorkspace();
});

byId("review-benchmark-collection-filter").addEventListener("change", (event) => {
  appState.reviewBenchmarkCollectionFilter = String(event.currentTarget.value || "all");
  renderReviewBenchmarkSamples(appState.reviewBenchmarkSamples);
});

byId("review-benchmark-type-filter").addEventListener("change", (event) => {
  appState.reviewBenchmarkTypeFilter = String(event.currentTarget.value || "all");
  renderReviewBenchmarkSamples(appState.reviewBenchmarkSamples);
});

byId("review-benchmark-view-filter").addEventListener("change", (event) => {
  appState.reviewBenchmarkViewFilter = String(event.currentTarget.value || "all");
  renderReviewBenchmarkSamples(appState.reviewBenchmarkSamples);
});

byId("review-benchmark-source-filter").addEventListener("change", (event) => {
  appState.reviewBenchmarkSourceFilter = String(event.currentTarget.value || "all");
  renderReviewBenchmarkSamples(appState.reviewBenchmarkSamples);
});

byId("review-benchmark-run-button").addEventListener("click", async () => {
  const button = byId("review-benchmark-run-button");
  const requirementMessage = getReviewBenchmarkRunRequirementMessage();

  if (requirementMessage) {
    syncReviewBenchmarkActions();
    return;
  }

  setButtonBusy(button, true, "运行中...");

  try {
    const result = await apiJson(`${reviewBenchmarkApi}/run`, {
      method: "POST",
      body: JSON.stringify({})
    });
    appState.reviewBenchmarkViewFilter = result?.summary?.failed > 0 ? "mismatches" : "all";
    byId("review-benchmark-view-filter") && (byId("review-benchmark-view-filter").value = appState.reviewBenchmarkViewFilter);
    renderReviewBenchmarkSamples(appState.reviewBenchmarkSamples);
    renderReviewBenchmarkResult(result);
    renderReviewBenchmarkSamples(appState.reviewBenchmarkSamples);
  } catch (error) {
    byId("review-benchmark-result").innerHTML = `
      <div class="result-card-shell muted">${escapeHtml(error.message || "运行基准评测失败")}</div>
    `;
  } finally {
    setButtonBusy(button, false);
    syncReviewBenchmarkActions();
  }
});

byId("style-profile-draft-button").addEventListener("click", async () => {
  const button = byId("style-profile-draft-button");
  const requirementMessage = getStyleProfileDraftRequirementMessage();

  if (requirementMessage) {
    syncStyleProfileDraftActions();
    return;
  }

  revealStyleProfilePane();
  setButtonBusy(button, true, "生成中...");

  try {
    const response = await apiJson("/api/style-profile/draft", {
      method: "POST",
      body: JSON.stringify({
        topic: byId("style-profile-topic")?.value || ""
      })
    });
    renderStyleProfile(response.profile || {});
  } catch (error) {
    byId("style-profile-result").innerHTML = `
      <div class="result-card-shell muted">${escapeHtml(error.message || "生成风格画像失败")}</div>
    `;
  } finally {
    setButtonBusy(button, false);
    syncStyleProfileDraftActions();
  }
});

byId("rewrite-pair-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const formElement = event.currentTarget;
  const submitButton = formElement.querySelector('button[type="submit"]');
  const form = new FormData(formElement);
  const requirementMessage = getRewritePairRequirementMessage();

  if (requirementMessage) {
    syncRewritePairActions();
    return;
  }

  setButtonBusy(submitButton, true, "保存中...");

  try {
    const result = await apiJson("/api/rewrite-pairs", {
      method: "POST",
      body: JSON.stringify({
        name: form.get("name"),
        beforePlatformReason: form.get("beforePlatformReason"),
        rewriteStrategy: form.get("rewriteStrategy"),
        effectiveChanges: form.get("effectiveChanges"),
        rewriteModel: appState.latestRewrite?.model || "",
        before: {
          title: form.get("beforeTitle"),
          body: form.get("beforeBody"),
          coverText: form.get("beforeCoverText"),
          tags: splitCSV(form.get("beforeTags"))
        },
        after: {
          title: form.get("afterTitle"),
          body: form.get("afterBody"),
          coverText: form.get("afterCoverText"),
          tags: splitCSV(form.get("afterTags"))
        }
      })
    });

    byId("rewrite-pair-result").innerHTML = `
      <div class="verdict verdict-observe">
        <span>样本已保存</span>
        <strong>${escapeHtml(verdictLabel(result.beforeAnalysis?.verdict || "pass"))} -> ${escapeHtml(
          verdictLabel(result.afterAnalysis?.verdict || "pass")
        )}</strong>
        <em>风险分 ${escapeHtml(String(result.beforeAnalysis?.score ?? 0))} -> ${escapeHtml(
          String(result.afterAnalysis?.score ?? 0)
        )}</em>
      </div>
    `;
    formElement.reset();
    await refreshAll();
  } catch (error) {
    byId("rewrite-pair-result").innerHTML = `
      <div class="result-card-shell muted">${escapeHtml(error.message || "保存改写样本失败")}</div>
    `;
  } finally {
    setButtonBusy(submitButton, false);
    syncRewritePairActions();
  }
});

initializeTabs();
renderSampleLibraryWorkspace();

document.addEventListener("click", async (event) => {
  const workflowButton = event.target.closest("[data-workflow-action]");

  if (workflowButton) {
    setButtonBusy(workflowButton, true, "处理中...");

    try {
      await runWorkflowAction(workflowButton.dataset.workflowAction);
    } catch (error) {
      const assistant = byId("workflow-assistant");
      assistant?.insertAdjacentHTML("beforeend", `<p class="helper-text">${escapeHtml(error.message || "操作失败")}</p>`);
    } finally {
      setButtonBusy(workflowButton, false);
      renderWorkflowAssistant();
    }
    return;
  }

  const sampleLibraryRecord = event.target.closest("[data-sample-library-record-id]");

  if (sampleLibraryRecord) {
    appState.selectedSampleLibraryRecordId = String(sampleLibraryRecord.dataset.sampleLibraryRecordId || "");
    renderSampleLibraryWorkspace();
    return;
  }

  const button = event.target.closest("button[data-action]");

  if (!button) {
    return;
  }

  const action = button.dataset.action;

  if (action === "prefill-custom-draft") {
    const form = byId("custom-lexicon-form");

    form.elements.match.value = button.dataset.match || "exact";
    form.elements.source.value = button.dataset.source || "";
    form.elements.category.value = button.dataset.category || "";
    form.elements.riskLevel.value = button.dataset.riskLevel || "manual_review";
    form.elements.lexiconLevel.value = button.dataset.lexiconLevel || inferLexiconLevel("", button.dataset.riskLevel);
    form.elements.xhsReason.value = button.dataset.xhsReason || "";
    activateTab("custom-lexicon-pane");
    byId("custom-lexicon-result").innerHTML =
      '<div class="result-card-shell">已将推荐草稿填入自定义词库表单，可先调整再保存。</div>';
    return;
  }

  if (action === "prefill-rewrite-pair-current") {
    fillRewritePairFormFromCurrent();
    return;
  }

  setButtonBusy(button, true, "处理中...");

  try {
    if (action === "delete-lexicon") {
      await apiJson("/api/admin/lexicon", {
        method: "DELETE",
        body: JSON.stringify({
          scope: button.dataset.scope,
          id: button.dataset.id
        })
      });
    }

    if (action === "delete-feedback") {
      await apiJson("/api/admin/feedback", {
        method: "DELETE",
        body: JSON.stringify({
          noteId: button.dataset.noteId,
          createdAt: button.dataset.createdAt
        })
      });
    }

    if (action === "delete-rewrite-pair") {
      await apiJson("/api/admin/rewrite-pairs", {
        method: "DELETE",
        body: JSON.stringify({
          id: button.dataset.id,
          createdAt: button.dataset.createdAt
        })
      });
    }

    if (action === "delete-review") {
      await apiJson("/api/admin/review-queue", {
        method: "DELETE",
        body: JSON.stringify({
          id: button.dataset.id
        })
      });
    }

    if (action === "promote-review") {
      await apiJson("/api/admin/review-queue/promote", {
        method: "POST",
        body: JSON.stringify({
          id: button.dataset.id
        })
      });
    }

    if (action === "confirm-false-positive") {
      await apiJson("/api/admin/false-positive-log", {
        method: "PATCH",
        body: JSON.stringify({
          id: button.dataset.id,
          status: "platform_passed_confirmed"
        })
      });
    }

    if (action === "delete-false-positive") {
      await apiJson("/api/admin/false-positive-log", {
        method: "DELETE",
        body: JSON.stringify({
          id: button.dataset.id
        })
      });
    }

    if (action === "save-sample-library-base") {
      const requirementMessage = getSampleLibraryDetailBaseRequirementMessage();

      if (requirementMessage) {
        syncSampleLibraryDetailActions();
        return;
      }

      const section = byId("sample-library-base-section");
      const response = await apiJson(sampleLibraryApi, {
        method: "PATCH",
        body: JSON.stringify({
          id: button.dataset.id,
          note: {
            title: section?.querySelector('[name="title"]')?.value || "",
            body: section?.querySelector('[name="body"]')?.value || "",
            coverText: section?.querySelector('[name="coverText"]')?.value || "",
            collectionType: section?.querySelector('[name="collectionType"]')?.value || "",
            tags: splitCSV(section?.querySelector('[name="tags"]')?.value || "")
          }
        })
      });
      appState.sampleLibraryRecords = Array.isArray(response.items) ? response.items : appState.sampleLibraryRecords;
      appState.selectedSampleLibraryRecordId = String(response.item?.id || button.dataset.id || "");
      renderSampleLibraryWorkspace();
    }

    if (action === "save-sample-library-reference") {
      const requirementMessage = getSampleLibraryDetailReferenceRequirementMessage();

      if (requirementMessage) {
        syncSampleLibraryDetailActions();
        return;
      }

      const section = byId("sample-library-reference-section");
      const enabled = section?.querySelector('[name="enabled"]')?.checked === true;
      const tier = String(section?.querySelector('[name="tier"]')?.value || "").trim();
      const response = await apiJson(sampleLibraryApi, {
        method: "PATCH",
        body: JSON.stringify({
          id: button.dataset.id,
          reference: {
            enabled,
            tier: enabled ? tier || "passed" : "",
            notes: section?.querySelector('[name="notes"]')?.value || ""
          }
        })
      });
      appState.sampleLibraryRecords = Array.isArray(response.items) ? response.items : appState.sampleLibraryRecords;
      appState.selectedSampleLibraryRecordId = String(response.item?.id || button.dataset.id || "");
      renderSampleLibraryWorkspace();
    }

    if (action === "save-sample-library-lifecycle") {
      const requirementMessage = getSampleLibraryDetailLifecycleRequirementMessage();

      if (requirementMessage) {
        syncSampleLibraryDetailActions();
        return;
      }

      const section = byId("sample-library-lifecycle-section");
      const response = await apiJson(sampleLibraryApi, {
        method: "PATCH",
        body: JSON.stringify({
          id: button.dataset.id,
          publish: {
            status: section?.querySelector('[name="status"]')?.value || "not_published",
            publishedAt: section?.querySelector('[name="publishedAt"]')?.value || "",
            platformReason: section?.querySelector('[name="platformReason"]')?.value || "",
            notes: section?.querySelector('[name="notes"]')?.value || "",
            metrics: {
              likes: section?.querySelector('[name="likes"]')?.value || 0,
              favorites: section?.querySelector('[name="favorites"]')?.value || 0,
              comments: section?.querySelector('[name="comments"]')?.value || 0
            }
          }
        })
      });
      appState.sampleLibraryRecords = Array.isArray(response.items) ? response.items : appState.sampleLibraryRecords;
      appState.selectedSampleLibraryRecordId = String(response.item?.id || button.dataset.id || "");
      renderSampleLibraryWorkspace();
    }

    if (action === "delete-sample-library-record") {
      const response = await apiJson(sampleLibraryApi, {
        method: "DELETE",
        body: JSON.stringify({
          id: button.dataset.id
        })
      });
      appState.sampleLibraryRecords = Array.isArray(response.items) ? response.items : [];
      appState.selectedSampleLibraryRecordId = "";
      renderSampleLibraryWorkspace();
      return;
    }

    if (action === "add-sample-library-to-benchmark") {
      const record = appState.sampleLibraryRecords.find((item) => String(item.id || "") === String(button.dataset.id || ""));

      if (!record) {
        throw new Error("未找到对应的样本记录。");
      }

      await addBenchmarkSample({
        title: getSampleRecordTitle(record),
        body: getSampleRecordBody(record) || getSampleRecordCoverText(record) || getSampleRecordTitle(record),
        coverText: getSampleRecordCoverText(record),
        collectionType: getSampleRecordCollectionType(record),
        tags: getSampleRecordTags(record),
        expectedType: inferBenchmarkExpectedTypeFromSampleRecord(record),
        source: {
          type: "sample_library",
          recordId: String(record.id || "").trim()
        }
      });
      return;
    }

    if (action === "add-false-positive-to-benchmark") {
      const item = appState.falsePositiveLog.find((entry) => String(entry.id || "") === String(button.dataset.id || ""));

      if (!item) {
        throw new Error("未找到对应的误报样本。");
      }

      await addBenchmarkSample({
        title: String(item.title || "").trim(),
        body: String(item.body || item.coverText || item.title || "").trim(),
        coverText: String(item.coverText || "").trim(),
        tags: uniqueStrings(item.tags || []),
        expectedType: "false_positive",
        source: {
          type: "false_positive_log",
          recordId: String(item.id || "").trim()
        }
      });
      return;
    }

    if (action === "save-lifecycle-analysis") {
      const requirementMessage = getLifecycleSaveRequirementMessage("analysis");

      if (requirementMessage) {
        syncLifecycleResultActions();
        return;
      }

      await saveLifecycleFromCurrent("analysis");
    }

    if (action === "save-lifecycle-rewrite") {
      const requirementMessage = getLifecycleSaveRequirementMessage("rewrite");

      if (requirementMessage) {
        syncLifecycleResultActions();
        return;
      }

      await saveLifecycleFromCurrent("rewrite");
    }

    if (action === "save-lifecycle-generation") {
      const requirementMessage = getLifecycleSaveRequirementMessage("generation", button.dataset.candidateId, button.dataset.candidateIndex);

      if (requirementMessage) {
        syncLifecycleResultActions();
        return;
      }

      await saveLifecycleFromCurrent("generation", button.dataset.candidateId, button.dataset.candidateIndex);
    }

    if (action === "update-lifecycle-publish") {
      const container = button.closest(".admin-item")?.querySelector(".lifecycle-update-grid");
      await apiJson("/api/note-lifecycle", {
        method: "PATCH",
        body: JSON.stringify({
          id: button.dataset.id,
          publishStatus: container?.querySelector('[name="publishStatus"]')?.value,
          notes: container?.querySelector('[name="notes"]')?.value,
          metrics: {
            likes: container?.querySelector('[name="likes"]')?.value,
            favorites: container?.querySelector('[name="favorites"]')?.value,
            comments: container?.querySelector('[name="comments"]')?.value
          }
        })
      });
      revealNoteLifecyclePane();
    }

    if (action === "delete-lifecycle") {
      await apiJson("/api/note-lifecycle", {
        method: "DELETE",
        body: JSON.stringify({
          id: button.dataset.id
        })
      });
      revealNoteLifecyclePane();
    }

    if (action === "send-review-benchmark-to-sample-library") {
      const mismatch = getReviewBenchmarkMismatchById(button.dataset.id);

      if (!mismatch) {
        throw new Error("未找到对应的未命中样本。");
      }

      const response = await apiJson(sampleLibraryApi, {
        method: "POST",
        body: JSON.stringify({
          source: "benchmark_mismatch",
          stage: "draft",
          note: {
            title: mismatch.input?.title || "",
            body: mismatch.input?.body || "",
            coverText: mismatch.input?.coverText || "",
            collectionType: mismatch.input?.collectionType || "",
            tags: uniqueStrings(mismatch.input?.tags || [])
          },
          publish: {
            status: inferSampleLibraryPublishStatusFromBenchmarkExpectedType(mismatch.expectedType),
            notes: buildReviewBenchmarkMismatchSummary(mismatch)
          },
          snapshots: {
            analysis: mismatch.analysis || null,
            rewrite: null,
            generation: null,
            crossReview: null
          }
        })
      });

      appState.sampleLibraryRecords = Array.isArray(response.items) ? response.items : appState.sampleLibraryRecords;
      appState.sampleLibraryFilter = "all";
      appState.sampleLibraryCollectionFilter = "all";
      appState.sampleLibrarySearch = "";
      appState.selectedSampleLibraryRecordId = String(response.item?.id || "");
      byId("sample-library-search-input") && (byId("sample-library-search-input").value = "");
      byId("sample-library-filter") && (byId("sample-library-filter").value = "all");
      byId("sample-library-collection-filter") && (byId("sample-library-collection-filter").value = "all");
      renderSampleLibraryWorkspace();
      revealSampleLibraryPane();

      if (appState.reviewBenchmarkLastRunResult) {
        renderReviewBenchmarkResult(appState.reviewBenchmarkLastRunResult);
      }

      byId("review-benchmark-result")?.insertAdjacentHTML(
        "afterbegin",
        '<div class="result-card-shell">未命中样本已回流到样本库，可继续补充参考属性或修正生命周期状态。</div>'
      );
      return;
    }

    if (action === "send-review-benchmark-to-false-positive") {
      const mismatch = getReviewBenchmarkMismatchById(button.dataset.id);

      if (!mismatch) {
        throw new Error("未找到对应的未命中样本。");
      }

      const response = await apiJson("/api/false-positive-log", {
        method: "POST",
        body: JSON.stringify({
          source: "benchmark_mismatch",
          title: mismatch.input?.title || "",
          body: mismatch.input?.body || "",
          coverText: mismatch.input?.coverText || "",
          tags: uniqueStrings(mismatch.input?.tags || []),
          status: "platform_passed_pending",
          userNotes: buildReviewBenchmarkMismatchSummary(mismatch),
          analysis: mismatch.analysis || undefined
        })
      });

      renderFalsePositiveLog(response.items || []);
      revealFalsePositiveLogPane();

      if (appState.reviewBenchmarkLastRunResult) {
        renderReviewBenchmarkResult(appState.reviewBenchmarkLastRunResult);
      }

      byId("review-benchmark-result")?.insertAdjacentHTML(
        "afterbegin",
        '<div class="result-card-shell">未命中样本已回流到误报日志，可继续确认是否为稳定误报。</div>'
      );
      return;
    }

    if (action === "delete-review-benchmark") {
      const response = await apiJson(reviewBenchmarkApi, {
        method: "DELETE",
        body: JSON.stringify({
          id: button.dataset.id
        })
      });
      renderReviewBenchmarkSamples(response.items || []);
      byId("review-benchmark-result").innerHTML = '<div class="result-card-shell">基准样本已删除。</div>';
      return;
    }

    if (action === "edit-style-profile-draft") {
      enterStyleProfileDraftEditMode(appState.styleProfileState?.draft || {});
      renderStyleProfile(appState.styleProfileState || {});
      return;
    }

    if (action === "cancel-style-profile-draft") {
      exitStyleProfileDraftEditMode();
      renderStyleProfile(appState.styleProfileState || {});
      return;
    }

    if (action === "save-style-profile-draft") {
      const container = button.closest(".style-profile-card");
      const response = await apiJson("/api/style-profile", {
        method: "PATCH",
        body: JSON.stringify({
          action: "update-draft",
          profile: buildStyleProfileDraftPayload(container)
        })
      });
      exitStyleProfileDraftEditMode();
      renderStyleProfile(response.profile || {});
      return;
    }

    if (action === "confirm-style-profile") {
      if (appState.styleProfileDraftEditing) {
        const container = button.closest(".style-profile-card");
        const updated = await apiJson("/api/style-profile", {
          method: "PATCH",
          body: JSON.stringify({
            action: "update-draft",
            profile: buildStyleProfileDraftPayload(container)
          })
        });
        const response = await apiJson("/api/style-profile", {
          method: "PATCH",
          body: JSON.stringify({})
        });
        exitStyleProfileDraftEditMode();
        renderStyleProfile(response.profile || updated.profile || {});
        return;
      }

      const response = await apiJson("/api/style-profile", {
        method: "PATCH",
        body: JSON.stringify({})
      });
      renderStyleProfile(response.profile || {});
      return;
    }

    if (action === "activate-style-profile") {
      const response = await apiJson("/api/style-profile", {
        method: "PATCH",
        body: JSON.stringify({
          action: "activate",
          id: button.dataset.id
        })
      });
      renderStyleProfile(response.profile || {});
      return;
    }

    await refreshAll();
  } catch (error) {
    const target =
      button.closest(".admin-item") || byId("feedback-result") || byId("custom-lexicon-result");
    target.insertAdjacentHTML(
      "beforeend",
      `<p class="helper-text">${escapeHtml(error.message || "操作失败")}</p>`
    );
  } finally {
    setButtonBusy(button, false);
  }
});

renderModelSelectionControls(defaultModelSelectionOptions);
renderCollectionTypeSelectors();
syncSampleLibraryCreateButtonLabel();

refreshAll().catch((error) => {
  byId("analysis-result").innerHTML = `
    <div class="result-card-shell muted">${escapeHtml(error.message || "初始化失败")}</div>
  `;
});

refreshReviewBenchmark().catch((error) => {
  byId("review-benchmark-result").innerHTML = `
    <div class="result-card-shell muted">${escapeHtml(error.message || "基准评测初始化失败")}</div>
  `;
});

loadModelSelectionOptions().catch(() => {});
loadCollectionTypeOptions().catch(() => {});

syncAnalyzeActions();
syncFeedbackActions();
syncGenerationActions();
syncRewritePairActions();
syncRewritePairPrefillButton();
syncSampleLibraryCreateActions();
syncSampleLibraryPrefillActions();
syncSampleLibraryDetailActions();
syncReviewBenchmarkActions();
syncStyleProfileDraftActions();
syncLifecycleResultActions();
syncLexiconFormActions();
