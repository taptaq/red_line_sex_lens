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

function riskLevelLabel(level) {
  if (level === "high") return "高风险";
  if (level === "medium") return "中风险";
  if (level === "low") return "低风险";
  return "未预判";
}

function performanceTierLabel(tier) {
  if (tier === "high") return "高表现";
  if (tier === "medium") return "中等表现";
  if (tier === "low") return "低表现";
  return "未判断";
}

function predictionMatchedLabel(value) {
  return value === true ? "预判命中" : "待复盘";
}

function lifecycleSourceLabel(source) {
  if (source === "false_positive_reflow") return "误报回流";
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

function activateTab(groupName, targetId) {
  document.querySelectorAll(`.tab-button[data-tab-group="${groupName}"][data-tab-target]`).forEach((button) => {
    button.classList.toggle("is-active", button.dataset.tabTarget === targetId);
  });

  document.querySelectorAll(`.tab-panel[data-tab-group="${groupName}"]`).forEach((panel) => {
    panel.classList.toggle("is-active", panel.id === targetId);
  });
}

function initializeTabs() {
  document.querySelectorAll(".tab-button[data-tab-group][data-tab-target]").forEach((button) => {
    button.addEventListener("click", () => activateTab(button.dataset.tabGroup, button.dataset.tabTarget));
  });

  activateTab("main-workbench", "analyze-workbench-pane");
  activateTab("data-maintenance", "feedback-center-pane");
}

function revealSampleLibraryPane() {
  activateTab("data-maintenance", "sample-library-pane");
  byId("sample-library-pane")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function openSampleLibraryRecord(recordId = "", step = "base") {
  const normalizedStep = ["base", "reference", "lifecycle", "calibration"].includes(step) ? step : "base";

  revealSampleLibraryPane();
  appState.sampleLibraryFilter = "all";
  appState.sampleLibraryCollectionFilter = "all";
  appState.sampleLibrarySearch = "";
  appState.selectedSampleLibraryRecordId = String(recordId || "");
  if (byId("sample-library-filter")) {
    byId("sample-library-filter").value = "all";
  }
  if (byId("sample-library-collection-filter")) {
    byId("sample-library-collection-filter").value = "all";
  }
  if (byId("sample-library-search-input")) {
    byId("sample-library-search-input").value = "";
  }
  setSampleLibraryDetailStep(normalizedStep);
  renderSampleLibraryWorkspace();
  window.setTimeout(() => {
    byId(
      normalizedStep === "calibration" ? "sample-library-calibration-section" : "sample-library-detail"
    )?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 0);
}

function revealFeedbackCenterPane() {
  activateTab("data-maintenance", "feedback-center-pane");
  byId("feedback-center-pane")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function revealFeedbackCenterDetails() {
  revealFeedbackCenterPane();
  byId("feedback-center-pane")?.querySelector(".feedback-advanced-panel")?.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

function revealRulesMaintenancePane(targetId = "custom-lexicon-pane") {
  ensureSupportWorkspaceOpen();
  revealSampleLibraryPane();
  ensureSampleLibraryAdvancedPanelOpen();
  ensureRulesMaintenanceOpen();
  window.setTimeout(() => {
    byId(targetId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 0);
}

function revealGenerationWorkbenchPane() {
  activateTab("main-workbench", "generation-workbench-pane");
  byId("generation-workbench-pane")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function ensureSupportWorkspaceOpen() {
  const panel = byId("support-workspace-panel");

  if (panel && "open" in panel) {
    panel.open = true;
  }
}

function ensureRulesMaintenanceOpen() {
  const panel = byId("rules-maintenance-panel");

  if (panel && "open" in panel) {
    panel.open = true;
  }
}

function ensureSampleLibraryAdvancedPanelOpen() {
  const panel = byId("sample-library-advanced-panel");

  if (panel && "open" in panel) {
    panel.open = true;
  }
}

function ensureFeedbackAdvancedPanelOpen() {
  const panel = byId("feedback-advanced-panel");

  if (panel && "open" in panel) {
    panel.open = true;
  }
}

const appState = {
  latestAnalyzePayload: null,
  latestAnalysis: null,
  latestRewrite: null,
  latestGeneration: null,
  latestAnalysisFalsePositiveSource: null,
  falsePositiveLog: [],
  collectionTypeOptions: [],
  sampleLibraryRecords: [],
  selectedSampleLibraryRecordId: "",
  sampleLibraryDetailStep: "base",
  sampleLibraryCollectionFilter: "all",
  sampleLibraryFilter: "all",
  sampleLibrarySearch: "",
  sampleLibraryImportDrafts: [],
  sampleLibraryCalibrationReplayResult: null
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
const sampleLibraryApi = "/api/sample-library";
const sampleLibraryPdfImportParseApi = "/api/sample-library/pdf-import/parse";
const sampleLibraryPdfImportCommitApi = "/api/sample-library/pdf-import/commit";
const sampleLibraryCalibrationReplayApi = "/api/sample-library/calibration-replay";

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

  syncAnalyzeActions();
  syncGenerationActions();
  syncSampleLibraryCreateActions();
}

async function loadCollectionTypeOptions() {
  const payload = await apiJson(collectionTypesApi);
  appState.collectionTypeOptions = Array.isArray(payload.options) ? payload.options : [];
  renderCollectionTypeSelectors();
}

const defaultModelSelectionOptions = {
  semantic: [
    { value: "auto", label: "默认自动 / 依次尝试当前语义复判模型" },
    { value: "glm", label: "智谱 GLM" },
    { value: "qwen", label: "通义千问" },
    { value: "minimax", label: "MiniMax" },
    { value: "deepseek", label: "深度求索" }
  ],
  rewrite: [
    { value: "auto", label: "默认自动 / 使用当前默认改写模型" },
    { value: "glm", label: "智谱 GLM" },
    { value: "kimi", label: "Kimi" },
    { value: "qwen", label: "通义千问" },
    { value: "minimax", label: "MiniMax" },
    { value: "deepseek", label: "深度求索" }
  ],
  generation: [
    { value: "auto", label: "默认自动 / 使用当前默认生成模型" },
    { value: "glm", label: "智谱 GLM" },
    { value: "kimi", label: "Kimi" },
    { value: "qwen", label: "通义千问" },
    { value: "minimax", label: "MiniMax" },
    { value: "deepseek", label: "深度求索" }
  ],
  crossReview: [
    { value: "group", label: "默认模型组 / 并行调用全部交叉复判模型" },
    { value: "glm", label: "智谱 GLM" },
    { value: "kimi", label: "Kimi" },
    { value: "qwen", label: "通义千问" },
    { value: "minimax", label: "MiniMax" },
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
    { value: "deepseek", label: "深度求索" }
  ]
};

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
    generation: normalizeModelSelectionOptions(options?.generation, defaultModelSelectionOptions.generation),
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

  populateModelSelectionControl("semantic-model-selection", normalizedOptions.semantic, "auto");
  populateModelSelectionControl("rewrite-model-selection", normalizedOptions.rewrite, "auto");
  populateModelSelectionControl("generation-model-selection", normalizedOptions.generation, "auto");
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
    generation: String(byId("generation-model-selection")?.value || "auto").trim() || "auto",
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

const platformOutcomeOptions = [
  { status: "published_passed", label: "平台通过", note: "平台通过，已记录为可观察样本。" },
  { status: "violation", label: "平台违规", note: "平台反馈违规，已记录为检测校准信号。" },
  { status: "positive_performance", label: "效果好", note: "平台通过且表现好，已作为生成风格参考。" },
  { status: "limited", label: "效果一般", note: "平台通过但表现一般，已记录为待观察样本。" },
  { status: "false_positive", label: "系统误判", note: "平台放行但系统偏严，已进入误判降权候选。" }
];

function buildPlatformOutcomeActions(source = "analysis", options = {}) {
  const candidateId = options.candidateId || "";
  const candidateIndex = options.candidateIndex ?? "";
  const buttons = platformOutcomeOptions
    .map(
      (item) => `
        <button
          type="button"
          class="button button-ghost button-small"
          data-action="save-platform-outcome"
          data-source="${escapeHtml(source)}"
          data-publish-status="${escapeHtml(item.status)}"
          data-note="${escapeHtml(item.note)}"
          data-candidate-id="${escapeHtml(candidateId)}"
          data-candidate-index="${escapeHtml(String(candidateIndex))}"
        >
          ${escapeHtml(item.label)}
        </button>
      `
    )
    .join("");

  return `
    <div class="platform-outcome-actions">
      <span class="helper-text">平台结果回填</span>
      <div class="item-actions">${buttons}</div>
    </div>
  `;
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

function verdictRank(value = "") {
  if (value === "hard_block") return 3;
  if (value === "manual_review") return 2;
  if (value === "observe") return 1;
  return 0;
}

function shouldRecommendCrossReview({ analysis = null, rewrite = null } = {}) {
  const analysisVerdict = String(analysis?.finalVerdict || analysis?.verdict || "").trim();
  const semanticVerdict = String(analysis?.semanticReview?.review?.verdict || "").trim();
  const rewriteAnalysisVerdict = String(rewrite?.afterAnalysis?.finalVerdict || rewrite?.afterAnalysis?.verdict || "").trim();
  const rewriteCrossVerdict = String(rewrite?.afterCrossReview?.aggregate?.recommendedVerdict || "").trim();
  const rewriteConsensus = String(rewrite?.afterCrossReview?.aggregate?.consensus || "").trim();
  const analysisScore = Number(analysis?.score);
  const rewriteScore = Number(rewrite?.afterAnalysis?.score);

  if (rewriteConsensus === "split") {
    return true;
  }

  if (rewriteAnalysisVerdict && rewriteCrossVerdict && rewriteAnalysisVerdict !== rewriteCrossVerdict) {
    return true;
  }

  if (analysisVerdict && semanticVerdict && analysisVerdict !== semanticVerdict) {
    return true;
  }

  if (Number.isFinite(rewriteScore) && rewriteScore >= 20 && rewriteScore <= 45) {
    return true;
  }

  if (Number.isFinite(analysisScore) && analysisScore >= 20 && analysisScore <= 45) {
    return true;
  }

  if (verdictRank(rewriteAnalysisVerdict) === verdictRank("observe")) {
    return true;
  }

  if (verdictRank(analysisVerdict) === verdictRank("observe")) {
    return true;
  }

  return false;
}

function buildSampleLibraryCalibrationPredictionFromCurrentState() {
  const rewrite = normalizeRewritePayload(appState.latestRewrite);
  const hasRewrite = hasMeaningfulNoteDraft(rewrite);
  const analysis = appState.latestAnalysis || null;
  const verdict = String(analysis?.finalVerdict || analysis?.verdict || "").trim() || "pass";
  const score = Number(analysis?.score || 0);
  const semanticSummary = String(analysis?.semanticReview?.review?.summary || "").trim();
  const selectedModels = getSelectedModelSelections();

  let predictedStatus = "published_passed";
  let predictedRiskLevel = "low";
  let predictedPerformanceTier = "medium";
  let confidence = 72;

  if (verdict === "hard_block") {
    predictedStatus = "violation";
    predictedRiskLevel = "high";
    predictedPerformanceTier = "low";
    confidence = Math.max(82, Math.min(98, Math.round(score || 88)));
  } else if (verdict === "manual_review") {
    predictedStatus = "limited";
    predictedRiskLevel = "medium";
    predictedPerformanceTier = "low";
    confidence = Math.max(60, Math.min(86, Math.round(score || 68)));
  } else if (verdict === "observe") {
    predictedStatus = "published_passed";
    predictedRiskLevel = "low";
    predictedPerformanceTier = "medium";
    confidence = Math.max(58, Math.min(82, 72 - Math.round((score || 0) / 4)));
  } else if (score >= 60) {
    predictedStatus = "limited";
    predictedRiskLevel = "medium";
    predictedPerformanceTier = "low";
    confidence = 66;
  }

  const reasonParts = [
    `当前检测结论：${verdictLabel(verdict)}`,
    Number.isFinite(score) ? `规则分 ${Math.round(score)}` : "",
    semanticSummary,
    hasRewrite && rewrite.rewriteNotes ? `改写说明：${rewrite.rewriteNotes}` : "",
    hasRewrite && rewrite.safetyNotes ? `安全提示：${rewrite.safetyNotes}` : ""
  ].filter(Boolean);

  return {
    predictedStatus,
    predictedRiskLevel,
    predictedPerformanceTier,
    confidence,
    reason: reasonParts.join("；"),
    model: hasRewrite ? rewrite.model || selectedModels.rewrite : selectedModels.semantic,
    createdAt: new Date().toISOString().slice(0, 10)
  };
}

function deriveSampleLibraryActualPerformanceTier(publish = {}) {
  const status = String(publish?.status || "not_published").trim() || "not_published";
  const likes = Number(publish?.metrics?.likes || 0) || 0;
  const favorites = Number(publish?.metrics?.favorites || 0) || 0;
  const comments = Number(publish?.metrics?.comments || 0) || 0;

  if (status === "not_published") {
    return "";
  }

  if (status === "violation" || status === "limited") {
    return "low";
  }

  if (status === "positive_performance" || likes >= 100 || favorites >= 20 || comments >= 10) {
    return "high";
  }

  if (likes >= 20 || favorites >= 5 || comments >= 2 || status === "published_passed" || status === "false_positive") {
    return "medium";
  }

  return "low";
}

function buildSampleLibraryCalibrationRetroComparison({ prediction = {}, publish = {} } = {}) {
  const predictedStatus = String(prediction?.predictedStatus || "not_published").trim() || "not_published";
  const predictedPerformanceTier = String(prediction?.predictedPerformanceTier || "").trim();
  const actualStatus = String(publish?.status || "not_published").trim() || "not_published";
  const actualPerformanceTier = deriveSampleLibraryActualPerformanceTier(publish);

  if (actualStatus === "not_published") {
    return {
      matched: false,
      actualPerformanceTier: "",
      summary: "待复盘",
      missReasonSuggestion: ""
    };
  }

  const statusMatched =
    predictedStatus === actualStatus ||
    (predictedStatus === "published_passed" && actualStatus === "positive_performance") ||
    (predictedStatus === "positive_performance" && actualStatus === "published_passed");
  const performanceMatched = !predictedPerformanceTier || !actualPerformanceTier || predictedPerformanceTier === actualPerformanceTier;
  const matched = statusMatched && performanceMatched;

  let missReasonSuggestion = "";
  if (!statusMatched) {
    missReasonSuggestion = `预判状态偏差：预期 ${publishStatusLabel(predictedStatus)}，实际 ${publishStatusLabel(actualStatus)}。`;
  } else if (!performanceMatched) {
    missReasonSuggestion = `发布状态基本一致，但表现预估偏差：预期 ${performanceTierLabel(
      predictedPerformanceTier
    )}，实际 ${performanceTierLabel(actualPerformanceTier)}。`;
  } else {
    missReasonSuggestion = "预判与实际结果基本一致，可沉淀为稳定判断。";
  }

  return {
    matched,
    actualPerformanceTier,
    summary: matched
      ? `${predictionMatchedLabel(true)} · ${performanceTierLabel(actualPerformanceTier)}`
      : `预判偏差 · ${publishStatusLabel(actualStatus)}`,
    missReasonSuggestion
  };
}

function buildSampleLibraryCalibrationRetroRecommendation({ prediction = {}, retro = {}, publish = {}, comparison = {} } = {}) {
  const predictedStatus = String(prediction?.predictedStatus || "not_published").trim() || "not_published";
  const predictedPerformanceTier = String(prediction?.predictedPerformanceTier || "").trim();
  const actualStatus = String(publish?.status || "not_published").trim() || "not_published";
  const actualPerformanceTier = String(
    comparison?.actualPerformanceTier || retro?.actualPerformanceTier || deriveSampleLibraryActualPerformanceTier(publish) || ""
  ).trim();
  const matched = comparison?.matched === true;
  const shouldBecomeReference = matched && (actualStatus === "positive_performance" || actualPerformanceTier === "high");
  let ruleImprovementCandidate = "";

  if (actualStatus !== "not_published" && comparison?.matched === false) {
    if (predictedStatus !== actualStatus) {
      ruleImprovementCandidate = `需要复盘发布状态判断：预期 ${publishStatusLabel(predictedStatus)}，实际 ${publishStatusLabel(actualStatus)}。`;
    } else if (predictedPerformanceTier && actualPerformanceTier && predictedPerformanceTier !== actualPerformanceTier) {
      ruleImprovementCandidate = `需要复盘表现预估：预期 ${performanceTierLabel(predictedPerformanceTier)}，实际 ${performanceTierLabel(actualPerformanceTier)}。`;
    } else if (["violation", "limited", "false_positive"].includes(actualStatus)) {
      ruleImprovementCandidate = `需要复盘发布状态判断：${publishStatusLabel(actualStatus)}类样本可补充规则边界。`;
    }
  }

  return {
    shouldBecomeReference,
    ruleImprovementCandidate
  };
}

function hasSampleLibraryCalibrationRetroField(record = {}, key = "") {
  const retro =
    record?.calibration?.retro && typeof record.calibration.retro === "object" ? record.calibration.retro : {};

  return Object.prototype.hasOwnProperty.call(retro, key);
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

function getCrossReviewActionRequirementMessage() {
  return getAnalyzeActionRequirementMessage();
}

function syncAnalyzeActions() {
  const requirementMessage = getAnalyzeActionRequirementMessage();
  const enabled = !requirementMessage;
  const analyzeButton = byId("analyze-button");
  const rewriteButton = byId("rewrite-button");

  setGatedButtonState(analyzeButton, enabled, requirementMessage);
  setGatedButtonState(rewriteButton, enabled, requirementMessage);
  setActionGateHint("analyze-action-hint", requirementMessage);
  syncCrossReviewActions();
}

function syncCrossReviewActions() {
  const requirementMessage = getCrossReviewActionRequirementMessage();
  const enabled = !requirementMessage;
  const crossReviewButton = byId("cross-review-button");
  const recommendationMessage = shouldRecommendCrossReview({
    analysis: appState.latestAnalysis,
    rewrite: appState.latestAnalysis && appState.latestRewrite
      ? {
          afterAnalysis: appState.latestAnalysis,
          afterCrossReview: null
        }
      : null
  })
    ? "当前结论比较接近，或规则与语义信号不完全一致；需要时可展开交叉复判再确认。"
    : "";

  setGatedButtonState(crossReviewButton, enabled, requirementMessage);
  setActionGateHint("cross-review-action-hint", requirementMessage || recommendationMessage);
}

function renderSummary(summary = {}) {
  const pendingReviewCount = Number(summary.reviewQueueCount || 0);
  const pendingFeedbackCount = Number(summary.feedbackCount || 0);
  const sampleLibraryCount = Number(summary.sampleLibraryCount || 0);
  const pendingSampleCount = Array.isArray(appState.sampleLibraryRecords)
    ? appState.sampleLibraryRecords.filter((item) => !item?.reference?.enabled || item?.publish?.status === "not_published").length
    : 0;
  const dailyFlowCount = pendingReviewCount + pendingFeedbackCount + pendingSampleCount;
  const cards = [
    {
      label: "待处理误判",
      value: pendingFeedbackCount,
      meta: pendingFeedbackCount ? "有平台反馈或误报案例待确认，优先把它们沉淀成学习信号。" : "当前没有待处理误判，可以继续推进新内容。",
      action: pendingFeedbackCount ? "去处理误判回流" : "查看回流中心",
      summaryAction: "open-feedback-center"
    },
    {
      label: "待补好样本",
      value: pendingSampleCount,
      meta: sampleLibraryCount ? `已有 ${sampleLibraryCount} 条学习样本，优先补齐能反哺生成的好样本。` : "还没有学习样本，建议先从第一条通过内容开始沉淀。",
      action: pendingSampleCount ? "去补好样本" : "新增学习样本",
      summaryAction: "open-sample-library"
    },
    {
      label: "今日内容流转",
      value: dailyFlowCount,
      meta: dailyFlowCount ? "先清掉回流和样本卡点，再继续检测、改写或生成新内容。" : "今天可以直接从内容工作台开始新一轮检测或生成。",
      action: dailyFlowCount ? "去看当前待办" : "开始内容工作",
      summaryAction: dailyFlowCount ? "open-review-queue" : "open-sample-library"
    }
  ];

  byId("summary-grid").innerHTML = cards
    .map(
      ({ label, value, meta, action, summaryAction }) => `
        <button type="button" class="summary-card summary-card-button" data-summary-action="${escapeHtml(summaryAction)}">
          <span>${label}</span>
          <strong>${value}</strong>
          <p class="summary-card-meta">${escapeHtml(meta)}</p>
          <em class="summary-card-action">${escapeHtml(action)}</em>
        </button>
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
  const semanticAttemptMessages = (Array.isArray(result.semanticReview?.providersTried) ? result.semanticReview.providersTried : [])
    .flatMap((item) => {
      const attempts = Array.isArray(item.attemptedRoutes) && item.attemptedRoutes.length
        ? item.attemptedRoutes
        : [item];

      return attempts
        .map((attempt) => {
          const label = [attempt.routeLabel || item.routeLabel || "", providerLabel(item.provider), attempt.model || item.model || ""]
            .filter(Boolean)
            .join(" / ");
          const message = String(attempt.message || item.message || "").trim();

          if (!label && !message) {
            return "";
          }

          return message ? `${label}：${message}` : label;
        })
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
        ? `<p class="helper-text">${escapeHtml(
            `语义复判未成功。已尝试以下模型：${semanticAttemptLabels.join("；")}${
              semanticAttemptMessages.length ? `。失败原因：${semanticAttemptMessages.join("；")}` : ""
            }`
          )}</p>`
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
    ${buildPlatformOutcomeActions("analysis")}
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
    </div>
    ${buildPlatformOutcomeActions("rewrite")}
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
  const sortedItems = [...items].sort((a, b) => {
    const aNeedsAttention = !String(a.decision || "").trim();
    const bNeedsAttention = !String(b.decision || "").trim();

    if (aNeedsAttention !== bNeedsAttention) {
      return aNeedsAttention ? -1 : 1;
    }

    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
  });
  const pendingFeedbackItems = sortedItems.filter((item) => !String(item.decision || "").trim());
  const completedFeedbackItems = sortedItems.filter((item) => String(item.decision || "").trim());
  const buildFeedbackItemMarkup = (item) => {
    const notePreview = compactText(item.noteContent || item.body, 96);
    const needsAttention = !String(item.decision || "").trim();
    const canSendToReview = (Array.isArray(item.suspiciousPhrases) && item.suspiciousPhrases.length) || item.feedbackModelSuggestion;
    const reviewSignal = String(item.reviewAudit?.signal || "").trim();
    const recommendedActionLabel =
      reviewSignal === "rule_gap" ? "推荐沉淀规则" : reviewSignal === "strict_pending" || reviewSignal === "strict_confirmed" ? "推荐记为误报" : "先人工判断";

    return `
      <article class="admin-item feedback-item-status${needsAttention ? " is-pending" : " is-complete"}">
        <strong>${escapeHtml(notePreview || "未填写笔记内容")}</strong>
        <div class="meta-row">
          <span class="meta-pill">${escapeHtml(needsAttention ? "待优先处理" : "已处理")}</span>
          <span class="meta-pill">${escapeHtml(reviewAuditLabel(item.reviewAudit))}</span>
          <span class="meta-pill">${escapeHtml(verdictLabel(item.analysisSnapshot?.verdict || "pass"))}</span>
          <span class="meta-pill">${escapeHtml(item.decision || "未记录处理结果")}</span>
          <span class="meta-pill">${escapeHtml(formatDate(item.createdAt))}</span>
        </div>
        <p>${escapeHtml(item.platformReason || "未记录违规原因")}</p>
        <p class="feedback-recommended-action">
          <strong>反馈推荐动作</strong>
          <span>${escapeHtml(recommendedActionLabel)}</span>
        </p>
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
            class="button button-small"
            data-action="send-feedback-to-review-queue"
            data-note-content="${escapeHtml(item.noteContent || item.body || "")}"
            data-platform-reason="${escapeHtml(item.platformReason || "")}"
            data-suspicious-phrases="${escapeHtml(joinCSV(item.suspiciousPhrases || []))}"
            data-feedback-model-suspicious-phrases="${escapeHtml(joinCSV(item.feedbackModelSuggestion?.suspiciousPhrases || []))}"
            data-feedback-model-context-categories="${escapeHtml(joinCSV(item.feedbackModelSuggestion?.contextCategories || []))}"
            ${canSendToReview ? "" : "disabled"}
          >
            加入规则复核
          </button>
          <button
            type="button"
            class="button button-ghost button-small"
            data-action="send-feedback-to-false-positive"
            data-title="${escapeHtml(item.noteExcerpt || notePreview || "")}"
            data-body="${escapeHtml(item.noteContent || item.body || "")}"
            data-tags="${escapeHtml(joinCSV(item.analysisSnapshot?.categories || []))}"
            data-platform-reason="${escapeHtml(item.platformReason || "")}"
            data-analysis-verdict="${escapeHtml(item.analysisSnapshot?.verdict || "")}"
            data-analysis-score="${escapeHtml(String(item.analysisSnapshot?.score ?? ""))}"
          >
            记录为误报案例
          </button>
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
  };

  byId("feedback-priority-list").innerHTML = pendingFeedbackItems.length
    ? pendingFeedbackItems.map(buildFeedbackItemMarkup).join("")
    : '<div class="result-card muted">当前没有待优先处理的反馈</div>';

  byId("feedback-log-list").innerHTML = pendingFeedbackItems.length
    ? '<div class="result-card muted">待优先处理的违规反馈已单独置顶显示</div>'
    : '<div class="result-card muted">当前没有待处理违规反馈</div>';

  byId("feedback-log-secondary-list").innerHTML = completedFeedbackItems.length
    ? completedFeedbackItems.map(buildFeedbackItemMarkup).join("")
    : '<div class="result-card muted">当前没有已处理的违规反馈</div>';
}

function renderFalsePositiveLog(items) {
  appState.falsePositiveLog = Array.isArray(items) ? items : [];
  const pendingItems = appState.falsePositiveLog.filter((item) => item.status !== "platform_passed_confirmed");
  const historyItems = appState.falsePositiveLog.filter((item) => item.status === "platform_passed_confirmed");

  byId("false-positive-pending-list").innerHTML = pendingItems.length
    ? pendingItems
        .slice()
        .sort((a, b) => {
          const aPending = a.status !== "platform_passed_confirmed";
          const bPending = b.status !== "platform_passed_confirmed";

          if (aPending !== bPending) {
            return aPending ? -1 : 1;
          }

          return new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime();
        })
        .map((item) => buildFalsePositiveEntryMarkup({
          ...item,
          updatedAt: formatDate(item.updatedAt || item.createdAt)
        }))
        .join("")
    : '<div class="result-card muted">当前没有待确认误报</div>';

  byId("false-positive-history-list").innerHTML = historyItems.length
    ? historyItems
        .slice()
        .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime())
        .map((item) => buildFalsePositiveEntryMarkup({
          ...item,
          updatedAt: formatDate(item.updatedAt || item.createdAt)
        }))
        .join("")
    : '<div class="result-card muted">当前没有已沉淀误报案例</div>';

  byId("false-positive-log-list").innerHTML = appState.falsePositiveLog.length
    ? ""
    : '<div class="result-card muted">当前没有误报样本</div>';
}

function successTierLabel(tier) {
  if (tier === "featured") return "人工精选标杆";
  if (tier === "performed") return "过审且表现好";
  return "仅过审";
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

function getSampleRecordCalibration(record = {}) {
  const calibration = record?.calibration && typeof record.calibration === "object" ? record.calibration : {};
  const prediction = calibration.prediction && typeof calibration.prediction === "object" ? calibration.prediction : {};
  const retro = calibration.retro && typeof calibration.retro === "object" ? calibration.retro : {};

  return {
    prediction: {
      predictedStatus: String(prediction.predictedStatus || "not_published").trim() || "not_published",
      predictedRiskLevel: String(prediction.predictedRiskLevel || "").trim(),
      predictedPerformanceTier: String(prediction.predictedPerformanceTier || "").trim(),
      confidence: Number(prediction.confidence || 0) || 0,
      reason: String(prediction.reason || "").trim(),
      model: String(prediction.model || "").trim(),
      createdAt: String(prediction.createdAt || "").trim()
    },
    retro: {
      actualPerformanceTier: String(retro.actualPerformanceTier || "").trim(),
      predictionMatched: retro.predictionMatched === true,
      missReason: String(retro.missReason || "").trim(),
      validatedSignals: uniqueStrings(retro.validatedSignals || []),
      invalidatedSignals: uniqueStrings(retro.invalidatedSignals || []),
      shouldBecomeReference: retro.shouldBecomeReference === true,
      ruleImprovementCandidate: String(retro.ruleImprovementCandidate || "").trim(),
      notes: String(retro.notes || "").trim(),
      reviewedAt: String(retro.reviewedAt || "").trim()
    }
  };
}

function hasCalibrationPrediction(record = {}) {
  const prediction = getSampleRecordCalibration(record).prediction;
  return Boolean(
    prediction.reason ||
      prediction.model ||
      prediction.confidence > 0 ||
      prediction.predictedStatus !== "not_published" ||
      prediction.predictedRiskLevel ||
      prediction.predictedPerformanceTier ||
      prediction.createdAt
  );
}

function hasCalibrationRetro(record = {}) {
  const retro = getSampleRecordCalibration(record).retro;
  return Boolean(
    retro.actualPerformanceTier ||
      retro.predictionMatched ||
      retro.missReason ||
      retro.validatedSignals.length ||
      retro.invalidatedSignals.length ||
      retro.shouldBecomeReference ||
      retro.ruleImprovementCandidate ||
      retro.notes ||
      retro.reviewedAt
  );
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

function hasCalibration(record = {}) {
  return hasCalibrationPrediction(record) || hasCalibrationRetro(record);
}

function collectionTypeLabel(value = "") {
  return String(value || "").trim() || "未分类合集";
}

function sampleLibraryFilterLabel(value = "all") {
  if (value === "calibration_pending") return "待复盘";
  if (value === "calibration_matched") return "已命中";
  if (value === "calibration_mismatch") return "有偏差";
  if (value === "incomplete") return "待补全";
  if (value === "reference") return "已成参考";
  if (value === "published") return "已跟踪发布";
  return "全部记录";
}

function sampleLibraryCollectionFilterLabel(value = "all") {
  return value === "all" ? "全部合集" : collectionTypeLabel(value);
}

function getSampleLibraryCalibrationListState(record = {}) {
  const publish = getSampleRecordPublish(record);
  const calibration = getSampleRecordCalibration(record);
  const comparison = buildSampleLibraryCalibrationRetroComparison({
    prediction: calibration.prediction,
    publish
  });
  const trackedLifecycle = hasTrackedLifecycle(record);
  const hasPrediction = hasCalibrationPrediction(record);
  const hasRetro = hasCalibrationRetro(record);
  const matched = hasSampleLibraryCalibrationRetroField(record, "predictionMatched")
    ? calibration.retro.predictionMatched
    : comparison.matched;

  if (!hasPrediction && !hasRetro) {
    return {
      key: "uncalibrated",
      label: "未校准"
    };
  }

  if (!trackedLifecycle || publish.status === "not_published" || !hasRetro) {
    return {
      key: "calibration_pending",
      label: "待复盘"
    };
  }

  if (matched === true) {
    return {
      key: "calibration_matched",
      label: "已命中"
    };
  }

  return {
    key: "calibration_mismatch",
    label: "有偏差"
  };
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
    const calibrationState = getSampleLibraryCalibrationListState(item);

    if (filter === "incomplete" && (reference.enabled || trackedLifecycle)) {
      return false;
    }

    if (filter === "calibration_pending" && calibrationState.key !== "calibration_pending") {
      return false;
    }

    if (filter === "calibration_matched" && calibrationState.key !== "calibration_matched") {
      return false;
    }

    if (filter === "calibration_mismatch" && calibrationState.key !== "calibration_mismatch") {
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
      getSampleRecordPublish(item)?.status,
      getSampleLibraryCalibrationListState(item).label,
      buildSampleLibraryCalibrationRetroComparison({
        prediction: getSampleRecordCalibration(item)?.prediction,
        publish: getSampleRecordPublish(item)
      })?.summary,
      getSampleRecordCalibration(item)?.prediction?.predictedStatus,
      getSampleRecordCalibration(item)?.prediction?.predictedRiskLevel,
      riskLevelLabel(getSampleRecordCalibration(item)?.prediction?.predictedRiskLevel),
      getSampleRecordCalibration(item)?.retro?.actualPerformanceTier
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

function getSampleLibraryRecordStepLabel(record = {}) {
  const note = getSampleRecordNote(record);
  const reference = getSampleRecordReference(record);
  const publish = getSampleRecordPublish(record);
  const hasBase =
    Boolean(String(note.title || "").trim()) &&
    Boolean(String(note.body || "").trim()) &&
    Boolean(String(getSampleRecordCollectionType(record) || "").trim());

  if (!hasBase) {
    return "卡点：基础内容";
  }

  if (!reference.enabled) {
    return "卡点：参考属性";
  }

  if (!hasTrackedLifecycle(record) || publish.status === "not_published") {
    return "卡点：生命周期";
  }

  if (!hasCalibrationPrediction(record) || !hasCalibrationRetro(record)) {
    return "卡点：预判复盘";
  }

  return "已完成校准闭环";
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
          const calibration = getSampleRecordCalibration(item);
          const calibrationState = getSampleLibraryCalibrationListState(item);
          const title = getSampleRecordTitle(item) || "未命名样本记录";
          const body = getSampleRecordBody(item);
          const collectionType = getSampleRecordCollectionType(item);
          const tags = getSampleRecordTags(item);
          const stepLabel = getSampleLibraryRecordStepLabel(item);

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
                <span class="meta-pill sample-library-calibration-pill is-${escapeHtml(calibrationState.key)}">${escapeHtml(calibrationState.label)}</span>
                ${
                  calibration.prediction.predictedRiskLevel
                    ? `<span class="meta-pill sample-library-calibration-pill is-risk">${escapeHtml(
                        riskLevelLabel(calibration.prediction.predictedRiskLevel)
                      )}</span>`
                    : ""
                }
                <span class="meta-pill">${escapeHtml(collectionTypeLabel(collectionType))}</span>
                <span class="meta-pill">${escapeHtml(lifecycleSourceLabel(item?.source || "manual"))}</span>
                <span class="meta-pill">${escapeHtml(formatDate(item?.updatedAt || item?.createdAt))}</span>
              </div>
              <p>${escapeHtml(compactText(body || getSampleRecordCoverText(item), 96) || "未填写正文")}</p>
              <p>标签：${escapeHtml(joinCSV(tags) || "未填写")}</p>
              <p class="sample-library-record-step">${escapeHtml(stepLabel)}</p>
            </button>
          `;
        })
        .join("")
    : '<div class="result-card muted">当前没有样本记录</div>';
}

function renderSampleLibraryCalibrationReplayResult(result = null) {
  const node = byId("sample-library-calibration-replay-result");
  const triggerButton = document.querySelector('[data-action="run-sample-library-calibration-replay"]');

  if (!node) {
    return;
  }

  if (!result) {
    if (triggerButton) {
      triggerButton.title = "";
    }
    node.innerHTML = '<div class="result-card-shell muted">等待运行历史回放</div>';
    return;
  }

  if (triggerButton) {
    triggerButton.title = "重新运行历史回放";
  }

  const preview = Array.isArray(result.preview) ? result.preview : [];
  const previewMarkup = preview.length
    ? `
        <div class="sample-library-calibration-replay-preview">
          <strong>受影响样本</strong>
          <div class="admin-list">
            ${preview
              .map(
                (item) => `
                  <article class="sample-library-calibration-queue-card result-card-shell">
                    <div class="sample-library-calibration-queue-head">
                      <div>
                        <strong>${escapeHtml(item.title || "未命名样本记录")}</strong>
                        <p>${escapeHtml(item.reason || "当前没有补充偏差原因")}</p>
                      </div>
                      <span class="meta-pill sample-library-calibration-pill is-calibration_mismatch">有偏差</span>
                    </div>
                    <div class="meta-row">
                      <span class="meta-pill">${escapeHtml(publishStatusLabel(item.actualStatus || "not_published"))}</span>
                      <span class="meta-pill">${escapeHtml(publishStatusLabel(item.predictedStatus || "not_published"))}</span>
                    </div>
                  </article>
                `
              )
              .join("")}
          </div>
        </div>
      `
    : '<p class="helper-text">本轮回放没有发现新增偏差样本。</p>';

  node.innerHTML = `
    <article class="result-card-shell">
      <div class="meta-row">
        <span class="meta-pill">总样本 ${escapeHtml(String(result.total || 0))}</span>
        <span class="meta-pill">命中 ${escapeHtml(String(result.matched || 0))}</span>
        <span class="meta-pill">偏差 ${escapeHtml(String(result.mismatched || 0))}</span>
        <span class="meta-pill">高风险漏差 ${escapeHtml(String(result.highRiskMisses || 0))}</span>
        <span class="meta-pill">参考候选受影响 ${escapeHtml(String(result.referenceCandidatesAffected || 0))}</span>
      </div>
      ${previewMarkup}
    </article>
  `;
}

function getSampleLibraryCalibrationReviewQueueItems(items = []) {
  return (Array.isArray(items) ? items : [])
    .map((item) => {
      const publish = getSampleRecordPublish(item);
      const calibration = getSampleRecordCalibration(item);
      const calibrationState = getSampleLibraryCalibrationListState(item);
      const trackedLifecycle = hasTrackedLifecycle(item);
      const needsRetro = trackedLifecycle && publish.status !== "not_published" && !hasCalibrationRetro(item);
      const highConfidenceMismatch =
        calibrationState.key === "calibration_mismatch" && Number(calibration.prediction.confidence || 0) >= 70;

      if (!needsRetro && !highConfidenceMismatch) {
        return null;
      }

      return {
        item,
        publish,
        calibration,
        calibrationState,
        queueReason: needsRetro ? "已发布待复盘" : "高置信偏差"
      };
    })
    .filter(Boolean)
    .sort((left, right) => {
      const leftScore = left.queueReason === "高置信偏差" ? 1 : 0;
      const rightScore = right.queueReason === "高置信偏差" ? 1 : 0;

      if (leftScore !== rightScore) {
        return rightScore - leftScore;
      }

      return String(right.item?.updatedAt || right.item?.createdAt || "").localeCompare(
        String(left.item?.updatedAt || left.item?.createdAt || "")
      );
    });
}

function renderSampleLibraryCalibrationReviewQueue(items = []) {
  const queueNode = byId("sample-library-calibration-review-queue");

  if (!queueNode) {
    return;
  }

  const queueItems = getSampleLibraryCalibrationReviewQueueItems(items);

  queueNode.innerHTML = queueItems.length
    ? queueItems
        .map(({ item, publish, calibration, calibrationState, queueReason }) => {
          const title = getSampleRecordTitle(item) || "未命名样本记录";
          const body = compactText(getSampleRecordBody(item) || getSampleRecordCoverText(item), 88) || "未填写正文";

          return `
            <article class="sample-library-calibration-queue-card result-card-shell">
              <div class="sample-library-calibration-queue-head">
                <div>
                  <strong>${escapeHtml(title)}</strong>
                  <p>${escapeHtml(body)}</p>
                </div>
                <span class="meta-pill sample-library-calibration-pill is-${escapeHtml(calibrationState.key)}">${escapeHtml(queueReason)}</span>
              </div>
              <div class="meta-row">
                <span class="meta-pill">${escapeHtml(calibrationState.label)}</span>
                <span class="meta-pill">${escapeHtml(publishStatusLabel(publish.status))}</span>
                <span class="meta-pill">${escapeHtml(collectionTypeLabel(getSampleRecordCollectionType(item)))}</span>
                ${
                  calibration.prediction.confidence
                    ? `<span class="meta-pill">置信度 ${escapeHtml(String(calibration.prediction.confidence))}</span>`
                    : ""
                }
              </div>
              <div class="item-actions">
                <button
                  type="button"
                  class="button button-ghost button-small"
                  data-action="open-sample-library-record"
                  data-id="${escapeHtml(String(item?.id || ""))}"
                >
                  打开记录
                </button>
                <button
                  type="button"
                  class="button button-small"
                  data-action="open-sample-library-calibration"
                  data-id="${escapeHtml(String(item?.id || ""))}"
                >
                  进入预判复盘
                </button>
              </div>
            </article>
          `;
        })
        .join("")
    : '<div class="result-card muted">当前没有待处理的批量复盘项。</div>';
}

function renderSampleLibraryDetailSection(nodeId, markup) {
  const node = byId(nodeId);

  if (node) {
    node.innerHTML = markup;
  }
}

function setSampleLibraryDetailStep(step = "base") {
  const normalized = ["base", "reference", "lifecycle", "calibration"].includes(step) ? step : "base";
  appState.sampleLibraryDetailStep = normalized;
}

function renderSampleLibraryDetailStepState() {
  const steps = ["base", "reference", "lifecycle", "calibration"];
  const currentIndex = steps.indexOf(appState.sampleLibraryDetailStep);

  document.querySelectorAll("[data-sample-library-step]").forEach((section) => {
    const step = section.dataset.sampleLibraryStep || "";
    const index = steps.indexOf(step);
    const state = index === currentIndex ? "current" : index < currentIndex ? "completed" : "upcoming";
    section.setAttribute("data-step-state", state);

    const body = section.querySelector(".sample-library-detail-step-body");
    if (body) {
      body.hidden = state !== "current";
    }
  });
}

function buildSampleLibraryStepMarkup({ step, index, title, description, status, body }) {
  return `
    <div class="sample-library-detail-step-summary">
      <div class="sample-library-section-head">
        <div>
          <strong>步骤 ${index} · ${title}</strong>
          <p>${description}</p>
        </div>
        <span class="meta-pill">${escapeHtml(status)}</span>
      </div>
    </div>
    <div class="sample-library-detail-step-body"${appState.sampleLibraryDetailStep === step ? "" : " hidden"}>
      ${body}
    </div>
  `;
}

function renderSampleLibraryDetail(record) {
  const detailNode = byId("sample-library-detail");
  const headerNode = byId("sample-library-detail-header");

  if (!detailNode) {
    return;
  }

  if (!record) {
    setSampleLibraryDetailStep("base");
    if (headerNode) {
      headerNode.innerHTML = '<div class="result-card muted">请选择左侧样本，或先新增一条记录。</div>';
    }

    renderSampleLibraryDetailSection(
      "sample-library-base-section",
      buildSampleLibraryStepMarkup({
        step: "base",
        index: 1,
        title: "基础内容",
        description: "先保存标题、正文、标签和封面文案。",
        status: "未选择记录",
        body: '<div class="result-card muted">选中一条记录后再补充基础内容。</div>'
      })
    );
    renderSampleLibraryDetailSection(
      "sample-library-reference-section",
      buildSampleLibraryStepMarkup({
        step: "reference",
        index: 2,
        title: "参考属性",
        description: "决定它是否进入参考样本和风格画像。",
        status: "未启用",
        body: '<div class="result-card muted">选中记录后可启用参考属性。</div>'
      })
    );
    renderSampleLibraryDetailSection(
      "sample-library-lifecycle-section",
      buildSampleLibraryStepMarkup({
        step: "lifecycle",
        index: 3,
        title: "生命周期属性",
        description: "回填发布结果和互动表现。",
        status: "未回填",
        body: '<div class="result-card muted">选中记录后可补充发布状态与互动指标。</div>'
      })
    );
    renderSampleLibraryDetailSection(
      "sample-library-calibration-section",
      buildSampleLibraryStepMarkup({
        step: "calibration",
        index: 4,
        title: "预判复盘",
        description: "把发布前判断和发布后偏差放在同一条样本里。",
        status: "未校准",
        body: '<div class="result-card muted">选中记录后可记录发布前预判与复盘结论。</div>'
      })
    );
    renderSampleLibraryDetailStepState();
    return;
  }

  const note = getSampleRecordNote(record);
  const reference = getSampleRecordReference(record);
  const publish = getSampleRecordPublish(record);
  const calibration = getSampleRecordCalibration(record);
  const comparison = buildSampleLibraryCalibrationRetroComparison({
    prediction: calibration.prediction,
    publish
  });
  const recommendation = buildSampleLibraryCalibrationRetroRecommendation({
    prediction: calibration.prediction,
    retro: calibration.retro,
    publish,
    comparison
  });
  const comparisonStatusLabel = predictionMatchedLabel(comparison.matched);
  const hasRecordedRetro = hasCalibrationRetro(record);
  const effectiveRetro = {
    ...calibration.retro,
    actualPerformanceTier: calibration.retro.actualPerformanceTier || comparison.actualPerformanceTier,
    predictionMatched: hasSampleLibraryCalibrationRetroField(record, "predictionMatched")
      ? calibration.retro.predictionMatched
      : comparison.matched,
    missReason: calibration.retro.missReason || comparison.missReasonSuggestion,
    shouldBecomeReference: hasSampleLibraryCalibrationRetroField(record, "shouldBecomeReference")
      ? calibration.retro.shouldBecomeReference
      : recommendation.shouldBecomeReference,
    ruleImprovementCandidate: calibration.retro.ruleImprovementCandidate || recommendation.ruleImprovementCandidate
  };
  const collectionType = getSampleRecordCollectionType(record);
  const referenceSummary = reference.enabled ? successTierLabel(reference.tier) : "未启用";
  const lifecycleSummary = hasTrackedLifecycle(record) ? publishStatusLabel(publish.status) : "未回填";
  const calibrationSummary = hasCalibrationPrediction(record)
    ? hasRecordedRetro
      ? `${predictionMatchedLabel(effectiveRetro.predictionMatched)} · ${performanceTierLabel(
          effectiveRetro.actualPerformanceTier || calibration.prediction.predictedPerformanceTier
        )}`
      : `${comparisonStatusLabel} · ${performanceTierLabel(
          comparison.actualPerformanceTier || calibration.prediction.predictedPerformanceTier
        )}`
    : "未校准";

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
          <span class="meta-pill">${escapeHtml(calibrationSummary)}</span>
          <span class="meta-pill">${escapeHtml(collectionTypeLabel(collectionType))}</span>
          <span class="meta-pill">${escapeHtml(lifecycleSourceLabel(record.source || "manual"))}</span>
          <span class="meta-pill">${escapeHtml(formatDate(record.updatedAt || record.createdAt))}</span>
        </div>
      </article>
    `;
  }

  renderSampleLibraryDetailSection(
    "sample-library-base-section",
    buildSampleLibraryStepMarkup({
      step: "base",
      index: 1,
      title: "基础内容",
      description: "先确认标题、正文和标签，后续筛选都基于这里。",
      status: "已选中",
      body: `
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
    })
  );

  renderSampleLibraryDetailSection(
    "sample-library-reference-section",
    buildSampleLibraryStepMarkup({
      step: "reference",
      index: 2,
      title: "参考属性",
      description: "决定这条记录是否参与参考样本和风格画像生成。",
      status: referenceSummary,
      body: `
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
    })
  );

  renderSampleLibraryDetailSection(
    "sample-library-lifecycle-section",
    buildSampleLibraryStepMarkup({
      step: "lifecycle",
      index: 3,
      title: "生命周期属性",
      description: "发布后回填结果，便于后续判断哪些内容真正可复用。",
      status: lifecycleSummary,
      body: `
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
    })
  );

  renderSampleLibraryDetailSection(
    "sample-library-calibration-section",
    buildSampleLibraryStepMarkup({
      step: "calibration",
      index: 4,
      title: "预判复盘",
      description: "发布前先记录判断，发布后用真实表现校准系统。",
      status: calibrationSummary,
      body: `
        <div class="admin-panel-body">
          <div class="sample-library-calibration-grid">
            <section class="sample-library-calibration-card">
              <div class="sample-library-calibration-head">
                <strong>发布前预判</strong>
                <p>这部分用于锁定当时的判断基线。</p>
              </div>
              <div class="lifecycle-primary-grid">
                <label>
                  <span>预判发布状态</span>
                  <select name="predictedStatus">
                    <option value="not_published"${calibration.prediction.predictedStatus === "not_published" ? " selected" : ""}>未发布</option>
                    <option value="published_passed"${calibration.prediction.predictedStatus === "published_passed" ? " selected" : ""}>已发布通过</option>
                    <option value="limited"${calibration.prediction.predictedStatus === "limited" ? " selected" : ""}>疑似限流</option>
                    <option value="violation"${calibration.prediction.predictedStatus === "violation" ? " selected" : ""}>平台判违规</option>
                    <option value="false_positive"${calibration.prediction.predictedStatus === "false_positive" ? " selected" : ""}>系统误报 / 平台放行</option>
                    <option value="positive_performance"${
                      calibration.prediction.predictedStatus === "positive_performance" ? " selected" : ""
                    }>过审且表现好</option>
                  </select>
                </label>
                <label>
                  <span>预判风险</span>
                  <select name="predictedRiskLevel">
                    <option value=""${!calibration.prediction.predictedRiskLevel ? " selected" : ""}>未预判</option>
                    <option value="low"${calibration.prediction.predictedRiskLevel === "low" ? " selected" : ""}>低风险</option>
                    <option value="medium"${calibration.prediction.predictedRiskLevel === "medium" ? " selected" : ""}>中风险</option>
                    <option value="high"${calibration.prediction.predictedRiskLevel === "high" ? " selected" : ""}>高风险</option>
                  </select>
                </label>
              </div>
              <div class="lifecycle-primary-grid">
                <label>
                  <span>预判表现</span>
                  <select name="predictedPerformanceTier">
                    <option value=""${!calibration.prediction.predictedPerformanceTier ? " selected" : ""}>未判断</option>
                    <option value="low"${calibration.prediction.predictedPerformanceTier === "low" ? " selected" : ""}>低表现</option>
                    <option value="medium"${calibration.prediction.predictedPerformanceTier === "medium" ? " selected" : ""}>中等表现</option>
                    <option value="high"${calibration.prediction.predictedPerformanceTier === "high" ? " selected" : ""}>高表现</option>
                  </select>
                </label>
                <label>
                  <span>置信度</span>
                  <input name="predictionConfidence" type="number" min="0" max="100" value="${escapeHtml(
                    String(calibration.prediction.confidence || 0)
                  )}" />
                </label>
              </div>
              <div class="lifecycle-primary-grid">
                <label>
                  <span>预判模型</span>
                  <input name="predictionModel" value="${escapeHtml(calibration.prediction.model || "")}" placeholder="例如：gpt-5.4" />
                </label>
                <label>
                  <span>预判时间</span>
                  <input name="predictionCreatedAt" type="date" value="${escapeHtml(String(calibration.prediction.createdAt || "").slice(0, 10))}" />
                </label>
              </div>
              <label>
                <span>预判理由</span>
                <textarea name="predictionReason" rows="3" placeholder="例如：标题结构接近高表现样本，但正文风险较低">${escapeHtml(
                  calibration.prediction.reason || ""
                )}</textarea>
              </label>
            </section>
            <section class="sample-library-calibration-card">
              <div class="sample-library-calibration-head">
                <strong>发布后复盘</strong>
                <p>把真实结果和偏差原因转成后续可用的判断经验。</p>
              </div>
              <div class="lifecycle-primary-grid">
                <label>
                  <span>实际表现</span>
                  <select name="actualPerformanceTier">
                    <option value=""${!effectiveRetro.actualPerformanceTier ? " selected" : ""}>未判断</option>
                    <option value="low"${effectiveRetro.actualPerformanceTier === "low" ? " selected" : ""}>低表现</option>
                    <option value="medium"${effectiveRetro.actualPerformanceTier === "medium" ? " selected" : ""}>中等表现</option>
                    <option value="high"${effectiveRetro.actualPerformanceTier === "high" ? " selected" : ""}>高表现</option>
                  </select>
                </label>
                <label>
                  <span>复盘时间</span>
                  <input name="reviewedAt" type="date" value="${escapeHtml(String(effectiveRetro.reviewedAt || "").slice(0, 10))}" />
                </label>
              </div>
              <label class="sample-library-checkbox">
                <input type="checkbox" name="predictionMatched"${effectiveRetro.predictionMatched ? " checked" : ""} />
                <span>预判命中</span>
              </label>
              <label class="sample-library-checkbox">
                <input type="checkbox" name="shouldBecomeReference"${effectiveRetro.shouldBecomeReference ? " checked" : ""} />
                <span>建议进入参考样本</span>
              </label>
              <label>
                <span>偏差原因</span>
                <input name="missReason" value="${escapeHtml(effectiveRetro.missReason || "")}" placeholder="例如：标题命中，但正文留存不足" />
              </label>
              <label>
                <span>被验证信号</span>
                <input name="validatedSignals" value="${escapeHtml(joinCSV(effectiveRetro.validatedSignals))}" placeholder="标题结构, 合集匹配" />
              </label>
              <label>
                <span>被推翻信号</span>
                <input name="invalidatedSignals" value="${escapeHtml(joinCSV(effectiveRetro.invalidatedSignals))}" placeholder="正文过长, 标签不准" />
              </label>
              <label>
                <span>规则优化候选</span>
                <textarea name="ruleImprovementCandidate" rows="3" placeholder="例如：同类标题结构可提升参考权重">${escapeHtml(
                  effectiveRetro.ruleImprovementCandidate || ""
                )}</textarea>
              </label>
              <label>
                <span>复盘备注</span>
                <textarea name="retroNotes" rows="3" placeholder="例如：72 小时后表现稳定">${escapeHtml(effectiveRetro.notes || "")}</textarea>
              </label>
              <p class="helper-text">${escapeHtml(comparisonStatusLabel)}${comparison.missReasonSuggestion ? ` · ${escapeHtml(comparison.missReasonSuggestion)}` : ""}</p>
            </section>
          </div>
          <div class="item-actions">
            <button
              type="button"
              class="button button-ghost button-small"
              data-action="prefill-sample-library-calibration-prediction"
              data-id="${escapeHtml(record.id || "")}"
            >
              从当前检测预填预判
            </button>
            <button
              type="button"
              class="button button-small"
              data-action="save-sample-library-calibration"
              data-id="${escapeHtml(record.id || "")}"
            >
              保存预判复盘
            </button>
          </div>
          <p class="helper-text action-gate-hint" id="sample-library-calibration-action-hint" aria-live="polite"></p>
        </div>
      `
    })
  );
  renderSampleLibraryDetailStepState();
  syncSampleLibraryReferenceSectionState();
  syncSampleLibraryDetailActions();
}

function renderSampleLibraryWorkspace() {
  const workspaceNode = byId("sample-library-workspace");
  const listNode = byId("sample-library-record-list");
  const detailNode = byId("sample-library-detail");
  const queueNode = byId("sample-library-calibration-review-queue");

  if (!workspaceNode && !listNode && !detailNode && !queueNode) {
    return;
  }

  renderCollectionTypeSelectors();
  const filteredItems = filterSampleLibraryRecords(appState.sampleLibraryRecords);
  const selectedRecord = getSelectedSampleLibraryRecord();

  renderSampleLibraryList(filteredItems);
  renderSampleLibraryDetail(selectedRecord);
  renderSampleLibraryCalibrationReplayResult(appState.sampleLibraryCalibrationReplayResult);
  renderSampleLibraryCalibrationReviewQueue(appState.sampleLibraryRecords);
  syncSampleLibraryCreateActions();
  syncSampleLibraryPrefillActions();
  syncSampleLibraryDetailActions();
}

async function refreshSampleLibraryWorkspace() {
  const workspaceNode = byId("sample-library-workspace");
  const listNode = byId("sample-library-record-list");
  const detailNode = byId("sample-library-detail");
  const queueNode = byId("sample-library-calibration-review-queue");

  if (!workspaceNode && !listNode && !detailNode && !queueNode) {
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
          ${buildPlatformOutcomeActions("generation", { candidateId: item.id || "", candidateIndex: index })}
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
}

async function refreshAll() {
  const [summary, adminData, collectionTypePayload] = await Promise.all([
    apiJson("/api/summary"),
    apiJson("/api/admin/data"),
    apiJson(collectionTypesApi)
  ]);

  appState.collectionTypeOptions = Array.isArray(collectionTypePayload.options) ? collectionTypePayload.options : [];
  renderSummary(summary);
  renderQueue(adminData.reviewQueue);
  renderAdminData(adminData);
  renderCollectionTypeSelectors();
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

async function fileToBase64(file) {
  const buffer = await file.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(buffer);

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}

function setSampleLibraryImportBlockOpen(isOpen) {
  const button = byId("sample-library-import-button");
  const block = byId("sample-library-import-block");

  if (block) {
    block.hidden = !isOpen;
  }

  if (button) {
    button.setAttribute("aria-expanded", String(isOpen));
  }
}

function getSampleLibraryImportCardRequirementMessage(card) {
  if (!card) {
    return "请先选择 PDF 并完成解析。";
  }

  const title = String(card.querySelector('[name="title"]')?.value || "").trim();
  const coverText = String(card.querySelector('[name="coverText"]')?.value || "").trim();
  const body = String(card.querySelector('[name="body"]')?.value || "").trim();
  const collectionType = String(card.querySelector('[name="collectionType"]')?.value || "").trim();

  if (!title || !coverText || !body || !collectionType) {
    return "请先填写标题、封面文案、正文和合集类型。";
  }

  const duplicateMessage = getSampleLibraryImportCardDuplicateMessage(card);
  if (duplicateMessage) {
    return duplicateMessage;
  }

  return "";
}

function buildSampleLibraryImportDuplicateKey({ title = "", body = "", coverText = "" } = {}) {
  return [String(title || "").trim(), String(body || "").trim(), String(coverText || "").trim()]
    .map((value) => value.toLowerCase())
    .join("::");
}

function getSampleLibraryImportCardDuplicateMessage(card) {
  if (!card) {
    return "";
  }

  const title = String(card.querySelector('[name="title"]')?.value || "").trim();
  const coverText = String(card.querySelector('[name="coverText"]')?.value || "").trim();
  const body = String(card.querySelector('[name="body"]')?.value || "").trim();

  if (!title || !coverText || !body) {
    return "";
  }

  const duplicateKey = buildSampleLibraryImportDuplicateKey({ title, body, coverText });

  const hasExistingDuplicate = appState.sampleLibraryRecords.some(
    (record) =>
      buildSampleLibraryImportDuplicateKey({
        title: getSampleRecordNote(record)?.title,
        body: getSampleRecordNote(record)?.body,
        coverText: getSampleRecordCoverText(record)
      }) === duplicateKey
  );

  if (hasExistingDuplicate) {
    return "当前内容与已有学习样本重复，请勿重复导入。";
  }

  const hasBatchDuplicate = getSampleLibraryImportCards().some((otherCard) => {
    if (otherCard === card) {
      return false;
    }

    return (
      buildSampleLibraryImportDuplicateKey({
        title: otherCard.querySelector('[name="title"]')?.value || "",
        body: otherCard.querySelector('[name="body"]')?.value || "",
        coverText: otherCard.querySelector('[name="coverText"]')?.value || ""
      }) === duplicateKey
    );
  });

  return hasBatchDuplicate ? "当前内容与本批其他导入项重复，请先去重。" : "";
}

function setSampleLibraryImportCardHint(card, message = "") {
  const node = card?.querySelector(".sample-library-import-card-hint");

  if (!node) {
    return;
  }

  node.textContent = message || "";
  node.classList.toggle("is-visible", Boolean(message));
}

function syncSampleLibraryImportCardActions(card) {
  const button = card?.querySelector('[data-action="sample-library-import-single-commit"]');
  const requirementMessage = getSampleLibraryImportCardRequirementMessage(card);

  setGatedButtonState(button, !requirementMessage, requirementMessage);
  setSampleLibraryImportCardHint(card, requirementMessage);
}

function syncSampleLibraryImportActions() {
  getSampleLibraryImportCards().forEach((card) => {
    syncSampleLibraryImportCardActions(card);
  });
}

async function parseSampleLibraryPdfFiles(files = []) {
  const payload = {
    files: await Promise.all(
      [...files].map(async (file) => ({
        name: file.name,
        contentBase64: await fileToBase64(file)
      }))
    )
  };

  return apiJson(sampleLibraryPdfImportParseApi, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

function readSampleLibraryImportDraftReference(item = {}) {
  const source = item?.reference && typeof item.reference === "object" ? item.reference : item;
  const tier = String(source?.tier || source?.referenceTier || "").trim();
  return {
    enabled: source?.enabled === true || source?.referenceEnabled === true || Boolean(tier),
    tier,
    notes: String(source?.notes || source?.referenceNotes || "").trim()
  };
}

function readSampleLibraryImportDraftPublish(item = {}) {
  const source = item?.publish && typeof item.publish === "object" ? item.publish : item;
  return {
    status: String(source?.status || source?.publishStatus || "not_published").trim() || "not_published",
    publishedAt: String(source?.publishedAt || "").trim(),
    platformReason: String(source?.platformReason || "").trim(),
    notes: String(source?.notes || source?.publishNotes || "").trim()
  };
}

function buildSampleLibraryImportCardAdvancedStatusMarkup({ reference, publish } = {}) {
  const normalizedReference = reference || {};
  const normalizedPublish = publish || {};

  return `
    <span class="meta-pill">参考：${escapeHtml(
      normalizedReference.enabled ? successTierLabel(normalizedReference.tier || "passed") : "未启用"
    )}</span>
    <span class="meta-pill">生命周期：${escapeHtml(publishStatusLabel(normalizedPublish.status || "not_published"))}</span>
  `;
}

function buildSampleLibraryImportTagPickerMarkup(index, tags = []) {
  const selectedMarkup = buildAnalyzeTagSelectionMarkup(tags);

  return `
    <div class="tag-picker field-wide sample-library-import-tag-picker" data-import-tag-picker="${index}">
      <input name="tags" type="hidden" value="${escapeHtml(joinCSV(tags))}" />
      <button
        type="button"
        class="tag-picker-trigger sample-library-import-tag-trigger"
        aria-expanded="false"
        aria-controls="sample-library-import-tag-dropdown-${index}"
      >
        <span class="tag-picker-trigger-head">
          <span class="tag-picker-trigger-label">标签</span>
          <span class="tag-picker-trigger-caret" aria-hidden="true">▾</span>
        </span>
        <span class="tag-picker-selected sample-library-import-tag-selected" role="group" aria-label="已选标签" aria-live="polite">
          ${selectedMarkup}
        </span>
      </button>
      <div class="tag-picker-dropdown sample-library-import-tag-dropdown" id="sample-library-import-tag-dropdown-${index}" hidden>
        <div class="tag-picker-dropdown-head">
          <strong>选择预置标签</strong>
          <button type="button" class="tag-picker-clear sample-library-import-tag-clear">清空</button>
        </div>
        <div class="tag-picker-options sample-library-import-tag-options"></div>
        <div class="tag-picker-custom">
          <input type="text" class="sample-library-import-tag-custom" placeholder="输入自定义标签" />
          <button type="button" class="button button-ghost button-small sample-library-import-tag-add">添加</button>
        </div>
      </div>
    </div>
  `;
}

function getSampleLibraryImportCards() {
  return [...document.querySelectorAll("[data-import-index]")];
}

function getSampleLibraryImportCardTagPicker(card) {
  return card?.querySelector(".sample-library-import-tag-picker");
}

function getSampleLibraryImportCardTagTrigger(card) {
  return card?.querySelector(".sample-library-import-tag-trigger");
}

function getSampleLibraryImportCardTagDropdown(card) {
  return card?.querySelector(".sample-library-import-tag-dropdown");
}

function getSampleLibraryImportCardTagOptionsContainer(card) {
  return card?.querySelector(".sample-library-import-tag-options");
}

function getSampleLibraryImportCardTagSelection(card) {
  return card?.querySelector(".sample-library-import-tag-selected");
}

function getSampleLibraryImportCardTagInput(card) {
  return card?.querySelector('[name="tags"]');
}

function getSampleLibraryImportCardTagCustomInput(card) {
  return card?.querySelector(".sample-library-import-tag-custom");
}

function focusFirstSampleLibraryImportTagOption(card) {
  const firstOption = getSampleLibraryImportCardTagOptionsContainer(card)?.querySelector("[data-import-tag-option]");
  if (firstOption instanceof HTMLElement) {
    firstOption.focus();
  }
}

function isSampleLibraryImportCardTagDropdownOpen(card) {
  return getSampleLibraryImportCardTagTrigger(card)?.getAttribute("aria-expanded") === "true";
}

function setSampleLibraryImportCardTagDropdownOpen(card, isOpen) {
  const trigger = getSampleLibraryImportCardTagTrigger(card);
  const dropdown = getSampleLibraryImportCardTagDropdown(card);
  const picker = getSampleLibraryImportCardTagPicker(card);

  if (!trigger || !dropdown || !picker) {
    return;
  }

  trigger.setAttribute("aria-expanded", isOpen ? "true" : "false");
  dropdown.hidden = !isOpen;
  picker.classList.toggle("is-open", isOpen);
}

function closeAllSampleLibraryImportTagDropdowns() {
  getSampleLibraryImportCards().forEach((card) => {
    setSampleLibraryImportCardTagDropdownOpen(card, false);
  });
}

function readSampleLibraryImportCardTags(card) {
  return uniqueStrings(splitCSV(getSampleLibraryImportCardTagInput(card)?.value || ""));
}

function renderSampleLibraryImportTagOptions(card) {
  const container = getSampleLibraryImportCardTagOptionsContainer(card);

  if (!container) {
    return;
  }

  const selectedTags = readSampleLibraryImportCardTags(card);
  container.innerHTML = uniqueStrings(analyzeTagOptions)
    .map((tag) => {
      const selected = selectedTags.includes(tag);
      const isCustom = !isPresetAnalyzeTag(tag);
      return `
        <span class="tag-picker-option-row${isCustom ? " is-custom" : ""}">
          <button
            type="button"
            class="tag-picker-option${selected ? " is-selected" : ""}"
            data-import-tag-option="${escapeHtml(tag)}"
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
                  data-import-tag-delete="${escapeHtml(tag)}"
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

function writeSampleLibraryImportCardTags(card, tags = [], { emitInput = true } = {}) {
  const hiddenInput = getSampleLibraryImportCardTagInput(card);
  const selected = getSampleLibraryImportCardTagSelection(card);
  const normalized = uniqueStrings(tags);

  if (hiddenInput) {
    hiddenInput.value = joinCSV(normalized);
  }

  if (selected) {
    selected.innerHTML = buildAnalyzeTagSelectionMarkup(normalized);
  }

  renderSampleLibraryImportTagOptions(card);

  if (emitInput && hiddenInput) {
    hiddenInput.dispatchEvent(new Event("input", { bubbles: true }));
  }
}

function toggleSampleLibraryImportCardTag(card, tag) {
  const current = readSampleLibraryImportCardTags(card);
  const normalizedTag = String(tag || "").trim();

  if (!normalizedTag) {
    return;
  }

  writeSampleLibraryImportCardTags(
    card,
    current.includes(normalizedTag) ? current.filter((item) => item !== normalizedTag) : [...current, normalizedTag]
  );
}

function removeSampleLibraryImportTagOption(tag) {
  const normalizedTag = String(tag || "").trim();

  if (!normalizedTag || isPresetAnalyzeTag(normalizedTag)) {
    return;
  }

  analyzeTagOptions = analyzeTagOptions.filter((item) => item !== normalizedTag);
  writeAnalyzeTags(readAnalyzeTags());
  getSampleLibraryImportCards().forEach((card) => {
    writeSampleLibraryImportCardTags(
      card,
      readSampleLibraryImportCardTags(card).filter((item) => item !== normalizedTag),
      { emitInput: false }
    );
  });
  initializeSampleLibraryImportTagPickers();
  saveAnalyzeCustomTagOptions(analyzeTagOptions).catch(() => {});
}

function addSampleLibraryImportCardTag(card, tag) {
  const nextTag = String(tag || "").trim();

  if (!nextTag) {
    return;
  }

  addAnalyzeTagOption(nextTag);
  writeSampleLibraryImportCardTags(card, [...readSampleLibraryImportCardTags(card), nextTag]);
}

function initializeSampleLibraryImportTagPickers() {
  getSampleLibraryImportCards().forEach((card) => {
    const customInput = getSampleLibraryImportCardTagCustomInput(card);
    customInput?.setAttribute(
      "aria-label",
      customInput.getAttribute("aria-label") || customInput.placeholder || "输入自定义标签"
    );
    setSampleLibraryImportCardTagDropdownOpen(card, false);
    writeSampleLibraryImportCardTags(card, readSampleLibraryImportCardTags(card), { emitInput: false });
    syncSampleLibraryImportCardReferenceSectionState(card);
  });
}

function syncSampleLibraryImportCardAdvancedSummary(card) {
  const statusNode = card?.querySelector(".sample-library-import-advanced-status");

  if (!statusNode) {
    return;
  }

  const referenceTier = String(card.querySelector('[name="referenceTier"]')?.value || "").trim();
  const referenceEnabled = card.querySelector('[name="referenceEnabled"]')?.checked === true || Boolean(referenceTier);
  const publishStatus = String(card.querySelector('[name="publishStatus"]')?.value || "not_published").trim() || "not_published";

  statusNode.innerHTML = buildSampleLibraryImportCardAdvancedStatusMarkup({
    reference: {
      enabled: referenceEnabled,
      tier: referenceTier
    },
    publish: {
      status: publishStatus
    }
  });
}

function syncSampleLibraryImportCardReferenceSectionState(card, { source = "" } = {}) {
  const enabledCheckbox = card?.querySelector('[name="referenceEnabled"]');
  const tierSelect = card?.querySelector('[name="referenceTier"]');

  if (!(enabledCheckbox instanceof HTMLInputElement) || !(tierSelect instanceof HTMLSelectElement)) {
    return;
  }

  const tier = String(tierSelect.value || "").trim();

  if (source === "checkbox" && enabledCheckbox.checked !== true) {
    tierSelect.value = "";
  } else if (tier) {
    enabledCheckbox.checked = true;
  } else if (enabledCheckbox.checked) {
    tierSelect.value = "passed";
  } else {
    tierSelect.value = "";
  }

  syncSampleLibraryImportCardAdvancedSummary(card);
}

function renderSampleLibraryImportDrafts(items = []) {
  const resultNode = byId("sample-library-import-result");
  appState.sampleLibraryImportDrafts = Array.isArray(items) ? items : [];

  if (!resultNode) {
    syncSampleLibraryImportActions();
    return;
  }

  if (!appState.sampleLibraryImportDrafts.length) {
    resultNode.innerHTML = '<div class="result-card muted">等待导入 PDF</div>';
    syncSampleLibraryImportActions();
    return;
  }

  resultNode.innerHTML = `
    <div class="sample-library-import-list">
      ${appState.sampleLibraryImportDrafts
        .map((item, index) => {
          const status = String(item?.status || "").trim();
          const helperText = item?.error || (status === "ready" ? "已完成 PDF 解析，可继续补全信息。" : "请确认解析结果后再导入。");
          const defaultCollectionType =
            appState.collectionTypeOptions.length === 1 ? appState.collectionTypeOptions[0] : "";
          const reference = readSampleLibraryImportDraftReference(item);
          const publish = readSampleLibraryImportDraftPublish(item);

          return `
            <article class="sample-library-import-card" data-import-index="${index}">
              <div class="inline-fields">
                <label>
                  <span>来源文件</span>
                  <input name="fileName" value="${escapeHtml(item?.fileName || "")}" disabled />
                </label>
              </div>
              <label>
                <span>标题</span>
                <input name="title" value="${escapeHtml(item?.title || "")}" placeholder="样本标题" />
              </label>
              <label>
                <span>封面文案</span>
                <input name="coverText" value="${escapeHtml(item?.title || "")}" placeholder="封面文案" />
              </label>
              <label>
                <span>正文</span>
                <textarea name="body" rows="6" placeholder="样本正文">${escapeHtml(item?.body || "")}</textarea>
              </label>
              <label>
                <span>合集类型</span>
                <select name="collectionType">
                  ${buildCollectionTypeOptionsMarkup({
                    options: appState.collectionTypeOptions,
                    value: defaultCollectionType
                  })}
                </select>
              </label>
              ${buildSampleLibraryImportTagPickerMarkup(index)}
              <div class="inline-fields">
                <label>
                  <span>点赞</span>
                  <input name="likes" type="number" min="0" value="${escapeHtml(String(item?.likes ?? 0))}" />
                </label>
                <label>
                  <span>收藏</span>
                  <input name="favorites" type="number" min="0" value="${escapeHtml(String(item?.favorites ?? 0))}" />
                </label>
                <label>
                  <span>评论</span>
                  <input name="comments" type="number" min="0" value="${escapeHtml(String(item?.comments ?? 0))}" />
                </label>
              </div>
              <details class="sample-library-import-advanced admin-accordion">
                <summary class="sample-library-import-advanced-summary">
                  <span>高级属性</span>
                  <span class="sample-library-import-advanced-status">
                    ${buildSampleLibraryImportCardAdvancedStatusMarkup({ reference, publish })}
                  </span>
                </summary>
                <div class="admin-accordion-body sample-library-import-advanced-body">
                  <div class="sample-library-import-advanced-grid">
                    <section class="sample-library-import-advanced-section">
                      <div class="sample-library-import-advanced-head">
                        <strong>参考属性</strong>
                        <p>需要作为参考样本时，直接在导入时顺手补齐。</p>
                      </div>
                      <label class="sample-library-checkbox">
                        <input type="checkbox" name="referenceEnabled"${reference.enabled ? " checked" : ""} />
                        <span>启用为参考样本</span>
                      </label>
                      <label>
                        <span>参考等级</span>
                        <select name="referenceTier">
                          <option value=""${!reference.tier ? " selected" : ""}>未启用</option>
                          <option value="passed"${reference.tier === "passed" ? " selected" : ""}>仅过审</option>
                          <option value="performed"${reference.tier === "performed" ? " selected" : ""}>过审且表现好</option>
                          <option value="featured"${reference.tier === "featured" ? " selected" : ""}>人工精选标杆</option>
                        </select>
                      </label>
                      <label>
                        <span>参考备注</span>
                        <textarea name="referenceNotes" rows="3" placeholder="例如：适合作为开头结构参考">${escapeHtml(
                          reference.notes || ""
                        )}</textarea>
                      </label>
                    </section>
                    <section class="sample-library-import-advanced-section">
                      <div class="sample-library-import-advanced-head">
                        <strong>生命周期属性</strong>
                        <p>点赞、收藏、评论保留在上方，这里补发布状态与备注。</p>
                      </div>
                      <div class="lifecycle-primary-grid">
                        <label>
                          <span>发布状态</span>
                          <select name="publishStatus">
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
                      <label>
                        <span>平台原因</span>
                        <input name="platformReason" value="${escapeHtml(publish.platformReason || "")}" placeholder="例如：疑似导流、低俗等" />
                      </label>
                      <label>
                        <span>回填备注</span>
                        <textarea name="publishNotes" rows="3" placeholder="例如：发布 24h 后稳定通过">${escapeHtml(
                          publish.notes || ""
                        )}</textarea>
                      </label>
                    </section>
                  </div>
                </div>
              </details>
              <div class="inline-actions">
                <button type="button" class="button button-alt" data-action="sample-library-import-single-commit">确认导入</button>
              </div>
              <p class="helper-text">${escapeHtml(helperText)}</p>
              <p class="helper-text action-gate-hint sample-library-import-card-hint" aria-live="polite"></p>
            </article>
          `;
        })
        .join("")}
    </div>
  `;

  initializeSampleLibraryImportTagPickers();
  syncSampleLibraryImportActions();
}

async function commitSampleLibraryImportCard(card) {
  const requirementMessage = getSampleLibraryImportCardRequirementMessage(card);

  if (requirementMessage) {
    throw new Error(requirementMessage);
  }

  const index = Number(card.dataset.importIndex);
  const sourceItem = appState.sampleLibraryImportDrafts[index] || {};
  const items = [
    {
      selected: true,
      fileName: sourceItem.fileName || "",
      title: card.querySelector('[name="title"]')?.value || "",
      coverText: card.querySelector('[name="coverText"]')?.value || "",
      body: card.querySelector('[name="body"]')?.value || "",
      collectionType: card.querySelector('[name="collectionType"]')?.value || "",
      tags: joinCSV(readSampleLibraryImportCardTags(card)),
      referenceEnabled: card.querySelector('[name="referenceEnabled"]')?.checked === true,
      referenceTier: card.querySelector('[name="referenceTier"]')?.value || "",
      referenceNotes: card.querySelector('[name="referenceNotes"]')?.value || "",
      publishStatus: card.querySelector('[name="publishStatus"]')?.value || "not_published",
      publishedAt: card.querySelector('[name="publishedAt"]')?.value || "",
      platformReason: card.querySelector('[name="platformReason"]')?.value || "",
      publishNotes: card.querySelector('[name="publishNotes"]')?.value || "",
      likes: card.querySelector('[name="likes"]')?.value || "0",
      favorites: card.querySelector('[name="favorites"]')?.value || "0",
      comments: card.querySelector('[name="comments"]')?.value || "0"
    }
  ];

  const response = await apiJson(sampleLibraryPdfImportCommitApi, {
    method: "POST",
    body: JSON.stringify({ items })
  });

  if (Array.isArray(response.items) && response.items.length) {
    appState.selectedSampleLibraryRecordId = String(response.items[0]?.id || appState.selectedSampleLibraryRecordId || "");
  }

  appState.sampleLibraryFilter = "all";
  appState.sampleLibraryCollectionFilter = "all";
  appState.sampleLibrarySearch = "";
  appState.sampleLibraryImportDrafts = appState.sampleLibraryImportDrafts.filter((_, itemIndex) => itemIndex !== index);

  if (byId("sample-library-search-input")) {
    byId("sample-library-search-input").value = "";
  }

  if (byId("sample-library-filter")) {
    byId("sample-library-filter").value = "all";
  }

  if (byId("sample-library-collection-filter")) {
    byId("sample-library-collection-filter").value = "all";
  }

  await refreshSampleLibraryWorkspace();
  renderSampleLibraryImportDrafts(appState.sampleLibraryImportDrafts);

  if (!appState.sampleLibraryImportDrafts.length) {
    setSampleLibraryImportBlockOpen(false);
  }

  return response;
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
  const expandedAttribute = ["aria", "expanded"].join("-");
  const nextHidden = !isOpen;

  if (shell) {
    shell.hidden = nextHidden;
  }

  if (button) {
    button.setAttribute(expandedAttribute, String(!nextHidden));
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
  const rawPayload = {
    title: form.get("title"),
    body: form.get("body"),
    coverText: form.get("coverText"),
    collectionType: String(form.get("collectionType") || "").trim(),
    tags: String(form.get("tags") || "").trim()
  };

  return {
    ...rawPayload,
    tags: splitCSV(rawPayload.tags)
  };
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

function readAnalyzeTags() {
  return uniqueStrings(splitCSV(getAnalyzeTagInput()?.value || ""));
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
  initializeSampleLibraryImportTagPickers();
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

function writeAnalyzeTags(tags = []) {
  const hiddenInput = getAnalyzeTagInput();
  const selected = getAnalyzeTagSelection();
  const normalized = uniqueStrings(tags);

  if (hiddenInput) {
    hiddenInput.value = joinCSV(normalized);
  }

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
  initializeSampleLibraryImportTagPickers();

  if (changed) {
    saveAnalyzeCustomTagOptions(analyzeTagOptions).catch(() => {});
  }
}

function getGenerationPayload() {
  const form = new FormData(byId("generation-workbench-form"));

  return {
    mode: String(form.get("mode") || "from_scratch"),
    collectionType: String(form.get("collectionType") || "").trim(),
    brief: {
      collectionType: String(form.get("collectionType") || "").trim(),
      lengthMode: String(form.get("lengthMode") || "short").trim() || "short",
      topic: String(form.get("topic") || "").trim(),
      sellingPoints: String(form.get("sellingPoints") || "").trim(),
      audience: String(form.get("audience") || "").trim(),
      constraints: String(form.get("constraints") || "").trim()
    },
    draft: {
      title: String(form.get("draftTitle") || "").trim(),
      body: String(form.get("draftBody") || "").trim()
    },
    modelSelection: getSelectedModelSelections()
  };
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
      initializeSampleLibraryImportTagPickers();
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

function revealNoteLifecyclePane() {
  ensureSupportWorkspaceOpen();
  revealSampleLibraryPane();
  byId("sample-library-lifecycle-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function handleSummaryAction(action) {
  if (action === "open-review-queue") {
    ensureSupportWorkspaceOpen();
    byId("review-queue")?.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  if (action === "open-feedback-center") {
    ensureSupportWorkspaceOpen();
    revealFeedbackCenterPane();
    return;
  }

  if (action === "open-sample-library") {
    ensureSupportWorkspaceOpen();
    revealSampleLibraryPane();
    setSampleLibraryCreateFormOpen(true);
    byId("sample-library-create-form-shell")?.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  if (action === "open-custom-lexicon") {
    revealRulesMaintenancePane("custom-lexicon-pane");
    return;
  }

  if (action === "open-seed-lexicon") {
    revealRulesMaintenancePane("seed-lexicon-pane");
    return;
  }

  if (action === "open-lifecycle") {
    revealNoteLifecyclePane();
    return;
  }
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

async function savePlatformOutcomeFromCurrent({
  source = "analysis",
  publishStatus = "published_passed",
  candidateId = "",
  candidateIndex = "",
  notes = ""
} = {}) {
  const saved = await saveLifecycleFromCurrent(source, candidateId, candidateIndex);
  const id = String(saved.item?.id || appState.selectedSampleLibraryRecordId || "").trim();

  if (!id) {
    throw new Error("未找到可回填的平台结果记录。");
  }

  const response = await apiJson(sampleLibraryApi, {
    method: "PATCH",
    body: JSON.stringify({
      id,
      publish: {
        status: publishStatus,
        notes
      }
    })
  });
  appState.sampleLibraryRecords = Array.isArray(response.items) ? response.items : appState.sampleLibraryRecords;
  appState.selectedSampleLibraryRecordId = String(response.item?.id || id);
  renderSampleLibraryWorkspace();
  revealNoteLifecyclePane();
  return response;
}

const analyzeForm = byId("analyze-form");
analyzeForm.addEventListener("input", syncAnalyzeActions);
analyzeForm.addEventListener("change", syncAnalyzeActions);
initializeAnalyzeTagPicker();
byId("feedback-form").addEventListener("input", syncFeedbackActions);
byId("feedback-form").addEventListener("change", syncFeedbackActions);
byId("generation-workbench-form").addEventListener("input", syncGenerationActions);
byId("generation-workbench-form").addEventListener("change", syncGenerationActions);
byId("custom-lexicon-form").addEventListener("input", syncLexiconFormActions);
byId("custom-lexicon-form").addEventListener("change", syncLexiconFormActions);
byId("seed-lexicon-form").addEventListener("input", syncLexiconFormActions);
byId("seed-lexicon-form").addEventListener("change", syncLexiconFormActions);
byId("sample-library-create-form").addEventListener("input", syncSampleLibraryCreateActions);
byId("sample-library-create-form").addEventListener("change", syncSampleLibraryCreateActions);
byId("sample-library-detail")?.addEventListener("input", syncSampleLibraryDetailActions);
byId("sample-library-detail")?.addEventListener("change", syncSampleLibraryDetailActions);
byId("sample-library-detail")?.addEventListener("change", syncSampleLibraryReferenceSectionState);

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

function getFeedbackRecognizeRequirementMessage() {
  return getFeedbackRecognitionRequirementMessage();
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
  const recognizeMessage = getFeedbackRecognizeRequirementMessage();
  const submitMessage = getFeedbackSubmitRequirementMessage();
  const recognizeButton = byId("feedback-recognize");
  const submitButton = byId("feedback-quick-submit");

  setGatedButtonState(recognizeButton, !recognizeMessage, recognizeMessage);
  setGatedButtonState(submitButton, !submitMessage, submitMessage);
  setActionGateHint("feedback-action-hint", submitMessage);
  setActionGateHint("feedback-recognize-action-hint", recognizeMessage);
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

  const tier = String(section.querySelector('[name="tier"]')?.value || "").trim();
  const enabled = section.querySelector('[name="enabled"]')?.checked === true || Boolean(tier);

  if (enabled && !tier) {
    return "启用参考样本时请先选择参考等级。";
  }

  return "";
}

function syncSampleLibraryReferenceSectionState() {
  const section = byId("sample-library-reference-section");
  const enabledCheckbox = section?.querySelector('[name="enabled"]');
  const tierSelect = section?.querySelector('[name="tier"]');

  if (!(enabledCheckbox instanceof HTMLInputElement) || !(tierSelect instanceof HTMLSelectElement)) {
    return;
  }

  const tier = String(tierSelect.value || "").trim();

  if (tier) {
    enabledCheckbox.checked = true;
  }

  if (enabledCheckbox.checked === false) {
    tierSelect.value = "";
  } else if (!String(tierSelect.value || "").trim()) {
    tierSelect.value = "passed";
  }

  syncSampleLibraryDetailActions();
}

function getSampleLibraryCalibrationPredictionPrefillRequirementMessage() {
  const hasAnalyze = hasMeaningfulNoteDraft(appState.latestAnalyzePayload || {});
  const rewrite = normalizeRewritePayload(appState.latestRewrite);
  const hasRewrite = hasMeaningfulNoteDraft(rewrite);

  if (!hasAnalyze && !hasRewrite) {
    return "请先完成一次有效检测或改写，再预填预判。";
  }

  if (!appState.latestAnalysis) {
    return "请先生成当前检测结论，再预填预判。";
  }

  return "";
}

function setSampleLibraryCalibrationPredictionFields(section, prediction = {}) {
  if (!section) {
    return;
  }

  const fieldEntries = {
    predictedStatus: prediction.predictedStatus || "not_published",
    predictedRiskLevel: prediction.predictedRiskLevel || "",
    predictedPerformanceTier: prediction.predictedPerformanceTier || "",
    predictionConfidence: String(prediction.confidence ?? 0),
    predictionModel: prediction.model || "",
    predictionCreatedAt: prediction.createdAt || "",
    predictionReason: prediction.reason || ""
  };

  Object.entries(fieldEntries).forEach(([name, value]) => {
    const field = section.querySelector(`[name="${name}"]`);
    if (
      field instanceof HTMLInputElement ||
      field instanceof HTMLSelectElement ||
      field instanceof HTMLTextAreaElement
    ) {
      field.value = value;
    }
  });

  syncSampleLibraryDetailActions();
}

function getSampleLibraryDetailLifecycleRequirementMessage() {
  return getSampleLibraryDetailBaseRequirementMessage();
}

function getSampleLibraryDetailCalibrationRequirementMessage() {
  return getSampleLibraryDetailBaseRequirementMessage();
}

function syncSampleLibraryDetailActions() {
  const baseMessage = getSampleLibraryDetailBaseRequirementMessage();
  const referenceMessage = getSampleLibraryDetailReferenceRequirementMessage();
  const lifecycleMessage = getSampleLibraryDetailLifecycleRequirementMessage();
  const calibrationMessage = getSampleLibraryDetailCalibrationRequirementMessage();
  const calibrationPrefillMessage = getSampleLibraryCalibrationPredictionPrefillRequirementMessage();
  const baseButton = byId("sample-library-base-section")?.querySelector('[data-action="save-sample-library-base"]');
  const referenceButton = byId("sample-library-reference-section")?.querySelector('[data-action="save-sample-library-reference"]');
  const lifecycleButton = byId("sample-library-lifecycle-section")?.querySelector('[data-action="save-sample-library-lifecycle"]');
  const calibrationPrefillButton = byId("sample-library-calibration-section")?.querySelector(
    '[data-action="prefill-sample-library-calibration-prediction"]'
  );
  const calibrationButton = byId("sample-library-calibration-section")?.querySelector('[data-action="save-sample-library-calibration"]');

  setGatedButtonState(baseButton, !baseMessage, baseMessage);
  setGatedButtonState(referenceButton, !referenceMessage, referenceMessage);
  setGatedButtonState(lifecycleButton, !lifecycleMessage, lifecycleMessage);
  setGatedButtonState(calibrationPrefillButton, !calibrationPrefillMessage, calibrationPrefillMessage);
  setGatedButtonState(calibrationButton, !calibrationMessage, calibrationMessage);
  setActionGateHint("sample-library-base-action-hint", baseMessage);
  setActionGateHint("sample-library-reference-action-hint", referenceMessage);
  setActionGateHint("sample-library-lifecycle-action-hint", lifecycleMessage);
  setActionGateHint("sample-library-calibration-action-hint", calibrationMessage);
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
    renderAnalysis(result, appState.latestAnalysisFalsePositiveSource);
  } catch (error) {
    byId("analysis-result").innerHTML = `
      <div class="result-card-shell muted">${escapeHtml(error.message || "检测失败")}</div>
    `;
  } finally {
    setButtonBusy(analyzeButton, false);
    syncAnalyzeActions();
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
    renderAnalysis(result.analysis, appState.latestAnalysisFalsePositiveSource);
    renderRewriteResult({
      ...result,
      rewrite: appState.latestRewrite
    });
  } catch (error) {
    byId("rewrite-result").innerHTML = `
      <div class="result-card-shell muted">${escapeHtml(error.message || "改写失败")}</div>
    `;
  } finally {
    setButtonBusy(rewriteButton, false);
    syncAnalyzeActions();
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
  } catch (error) {
    byId("generation-result").innerHTML = `
      <div class="result-card-shell muted">${escapeHtml(error.message || "生成候选稿失败")}</div>
    `;
  } finally {
    setButtonBusy(submitButton, false);
  }
});

byId("feedback-recognize").addEventListener("click", async () => {
  const recognizeButton = byId("feedback-recognize");
  const requirementMessage = getFeedbackRecognizeRequirementMessage();
  ensureFeedbackAdvancedPanelOpen();

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
    revealFeedbackCenterPane();
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
  const submitButton = byId("feedback-quick-submit");
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

byId("sample-library-create-button").addEventListener("click", () => {
  const shell = byId("sample-library-create-form-shell");
  setSampleLibraryCreateFormOpen(Boolean(shell?.hidden));
});

byId("sample-library-import-button").addEventListener("click", () => {
  setSampleLibraryImportBlockOpen(true);
  byId("sample-library-import-input").click();
});

byId("sample-library-import-input").addEventListener("change", async (event) => {
  const input = event.currentTarget;
  const files = input.files || [];

  if (!files.length) {
    return;
  }

  setSampleLibraryImportBlockOpen(true);
  byId("sample-library-import-result").innerHTML = '<div class="result-card-shell muted">正在解析 PDF...</div>';

  try {
    const result = await parseSampleLibraryPdfFiles(files);
    renderSampleLibraryImportDrafts(result.items || []);
  } catch (error) {
    appState.sampleLibraryImportDrafts = [];
    byId("sample-library-import-result").innerHTML = `
      <div class="result-card-shell muted">${escapeHtml(error.message || "PDF 解析失败")}</div>
    `;
    syncSampleLibraryImportActions();
  } finally {
    input.value = "";
  }
});

byId("sample-library-import-block")?.addEventListener("input", (event) => {
  const card = event.target instanceof Element ? event.target.closest("[data-import-index]") : null;

  if (card) {
    syncSampleLibraryImportCardAdvancedSummary(card);
  }

  syncSampleLibraryImportActions();
});

byId("sample-library-import-block")?.addEventListener("change", (event) => {
  const card = event.target instanceof Element ? event.target.closest("[data-import-index]") : null;

  if (card) {
    const fieldName =
      event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement || event.target instanceof HTMLTextAreaElement
        ? String(event.target.name || "")
        : "";

    if (fieldName === "referenceEnabled") {
      syncSampleLibraryImportCardReferenceSectionState(card, { source: "checkbox" });
    } else if (fieldName === "referenceTier") {
      syncSampleLibraryImportCardReferenceSectionState(card, { source: "tier" });
    } else {
      syncSampleLibraryImportCardAdvancedSummary(card);
    }
  }

  syncSampleLibraryImportActions();
});

byId("sample-library-import-block")?.addEventListener("click", async (event) => {
  const card = event.target instanceof Element ? event.target.closest("[data-import-index]") : null;

  if (!card) {
    return;
  }

  const commitButton = event.target instanceof Element ? event.target.closest('[data-action="sample-library-import-single-commit"]') : null;
  if (commitButton) {
    const requirementMessage = getSampleLibraryImportCardRequirementMessage(card);

    if (requirementMessage) {
      syncSampleLibraryImportCardActions(card);
      return;
    }

    setButtonBusy(commitButton, true, "导入中...");

    try {
      const response = await commitSampleLibraryImportCard(card);
      byId("sample-library-create-result").innerHTML = `<div class="result-card-shell">已导入 ${escapeHtml(
        String(response.createdCount || 0)
      )} 条学习样本，可继续补参考属性和生命周期属性。</div>`;
    } catch (error) {
      card.insertAdjacentHTML("beforeend", `<p class="helper-text">${escapeHtml(error.message || "导入学习样本失败")}</p>`);
      setSampleLibraryImportBlockOpen(true);
    } finally {
      setButtonBusy(commitButton, false);
      syncSampleLibraryImportActions();
    }

    return;
  }

  const trigger = event.target instanceof Element ? event.target.closest(".sample-library-import-tag-trigger") : null;
  if (trigger) {
    event.preventDefault();
    const nextOpen = !isSampleLibraryImportCardTagDropdownOpen(card);
    closeAllSampleLibraryImportTagDropdowns();
    setSampleLibraryImportCardTagDropdownOpen(card, nextOpen);
    return;
  }

  const deleteButton = event.target instanceof Element ? event.target.closest("[data-import-tag-delete]") : null;
  if (deleteButton) {
    removeSampleLibraryImportTagOption(deleteButton.dataset.importTagDelete);
    return;
  }

  const option = event.target instanceof Element ? event.target.closest("[data-import-tag-option]") : null;
  if (option) {
    toggleSampleLibraryImportCardTag(card, option.dataset.importTagOption);
    return;
  }

  const clearButton = event.target instanceof Element ? event.target.closest(".sample-library-import-tag-clear") : null;
  if (clearButton) {
    writeSampleLibraryImportCardTags(card, []);
    return;
  }

  const addButton = event.target instanceof Element ? event.target.closest(".sample-library-import-tag-add") : null;
  if (addButton) {
    const customInput = getSampleLibraryImportCardTagCustomInput(card);
    const shouldRefocus = Boolean(String(customInput?.value || "").trim());
    addSampleLibraryImportCardTag(card, customInput?.value || "");

    if (customInput) {
      customInput.value = "";
      if (shouldRefocus) {
        customInput.focus();
      }
    }
  }
});

byId("sample-library-import-block")?.addEventListener("keydown", (event) => {
  const card = event.target instanceof Element ? event.target.closest("[data-import-index]") : null;

  if (!card) {
    return;
  }

  if (event.target instanceof Element && event.target.closest(".sample-library-import-tag-trigger")) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      closeAllSampleLibraryImportTagDropdowns();
      setSampleLibraryImportCardTagDropdownOpen(card, true);
      focusFirstSampleLibraryImportTagOption(card);
    }

    return;
  }

  if (!(event.target instanceof Element) || !event.target.closest(".sample-library-import-tag-custom")) {
    return;
  }

  if (event.key !== "Enter" && event.key !== ",") {
    return;
  }

  event.preventDefault();
  addSampleLibraryImportCardTag(card, event.target.value || "");
  event.target.value = "";
});

byId("sample-library-import-block")?.addEventListener("focusout", (event) => {
  const customInput = event.target instanceof Element ? event.target.closest(".sample-library-import-tag-custom") : null;
  const card = event.target instanceof Element ? event.target.closest("[data-import-index]") : null;

  if (!customInput || !card) {
    return;
  }

  const addButton = card.querySelector(".sample-library-import-tag-add");
  if (event.relatedTarget === addButton) {
    return;
  }

  const value = String(customInput.value || "").trim();
  if (!value) {
    return;
  }

  addSampleLibraryImportCardTag(card, value);
  customInput.value = "";
});

document.addEventListener("click", (event) => {
  getSampleLibraryImportCards().forEach((card) => {
    const picker = getSampleLibraryImportCardTagPicker(card);

    if (eventTargetsAnalyzeTagPicker(event, picker)) {
      return;
    }

    setSampleLibraryImportCardTagDropdownOpen(card, false);
  });
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") {
    return;
  }

  getSampleLibraryImportCards().forEach((card) => {
    const picker = getSampleLibraryImportCardTagPicker(card);
    const trigger = getSampleLibraryImportCardTagTrigger(card);
    const hadFocus = picker?.contains(document.activeElement);

    setSampleLibraryImportCardTagDropdownOpen(card, false);

    if (hadFocus && trigger instanceof HTMLElement) {
      trigger.focus();
    }
  });
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
    const sampleLibraryTags = form.get(["tags"].join(""));
    const response = await apiJson(sampleLibraryApi, {
      method: "POST",
      body: JSON.stringify({
        source: "manual",
        note: {
          title: form.get("title"),
          body: form.get("body"),
          coverText: form.get("coverText"),
          collectionType: form.get("collectionType"),
          tags: splitCSV(sampleLibraryTags)
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

byId("sample-library-collection-filter").addEventListener("change", (event) => {
  appState.sampleLibraryCollectionFilter = String(event.currentTarget.value || "all");
  renderSampleLibraryWorkspace();
});

initializeTabs();
renderSampleLibraryWorkspace();

document.addEventListener("click", async (event) => {
  const summaryAction = event.target.closest("[data-summary-action]");

  if (summaryAction) {
    await handleSummaryAction(summaryAction.dataset.summaryAction);
    return;
  }

  const sampleLibraryRecord = event.target.closest("[data-sample-library-record-id]");

  if (sampleLibraryRecord) {
    appState.selectedSampleLibraryRecordId = String(sampleLibraryRecord.dataset.sampleLibraryRecordId || "");
    setSampleLibraryDetailStep("base");
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
    revealRulesMaintenancePane("custom-lexicon-pane");
    byId("custom-lexicon-result").innerHTML =
      '<div class="result-card-shell">已将推荐草稿填入自定义词库表单，可先调整再保存。</div>';
    return;
  }

  if (action === "open-sample-library-record") {
    openSampleLibraryRecord(button.dataset.id, "base");
    return;
  }

  if (action === "open-sample-library-calibration") {
    openSampleLibraryRecord(button.dataset.id, "calibration");
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

    if (action === "run-sample-library-calibration-replay") {
      const resultNode = byId("sample-library-calibration-replay-result");

      if (resultNode) {
        resultNode.innerHTML = '<div class="result-card-shell muted">正在回放历史校准样本...</div>';
      }

      const response = await apiJson(sampleLibraryCalibrationReplayApi, {
        method: "POST",
        body: JSON.stringify({
          mode: "balanced"
        })
      });
      appState.sampleLibraryCalibrationReplayResult = response.result || null;
      ensureSampleLibraryAdvancedPanelOpen();
      const systemCalibrationPanel = byId("system-calibration-panel");
      if (systemCalibrationPanel && "open" in systemCalibrationPanel) {
        systemCalibrationPanel.open = true;
      }
      renderSampleLibraryCalibrationReplayResult(appState.sampleLibraryCalibrationReplayResult);
      return;
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
      setSampleLibraryDetailStep("reference");
      renderSampleLibraryWorkspace();
    }

    if (action === "save-sample-library-reference") {
      const requirementMessage = getSampleLibraryDetailReferenceRequirementMessage();

      if (requirementMessage) {
        syncSampleLibraryDetailActions();
        return;
      }

      const section = byId("sample-library-reference-section");
      const tier = String(section?.querySelector('[name="tier"]')?.value || "").trim();
      const enabled = section?.querySelector('[name="enabled"]')?.checked === true || Boolean(tier);
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
      setSampleLibraryDetailStep("lifecycle");
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
      setSampleLibraryDetailStep("calibration");
      renderSampleLibraryWorkspace();
    }

    if (action === "prefill-sample-library-calibration-prediction") {
      const requirementMessage = getSampleLibraryCalibrationPredictionPrefillRequirementMessage();

      if (requirementMessage) {
        syncSampleLibraryDetailActions();
        return;
      }

      const section = byId("sample-library-calibration-section");
      const prediction = buildSampleLibraryCalibrationPredictionFromCurrentState();
      setSampleLibraryCalibrationPredictionFields(section, prediction);
      setSampleLibraryDetailStep("calibration");
      renderSampleLibraryDetailStepState();
      return;
    }

    if (action === "save-sample-library-calibration") {
      const requirementMessage = getSampleLibraryDetailCalibrationRequirementMessage();

      if (requirementMessage) {
        syncSampleLibraryDetailActions();
        return;
      }

      const section = byId("sample-library-calibration-section");
      const response = await apiJson(sampleLibraryApi, {
        method: "PATCH",
        body: JSON.stringify({
          id: button.dataset.id,
          calibration: {
            prediction: {
              predictedStatus: section?.querySelector('[name="predictedStatus"]')?.value || "not_published",
              predictedRiskLevel: section?.querySelector('[name="predictedRiskLevel"]')?.value || "",
              predictedPerformanceTier: section?.querySelector('[name="predictedPerformanceTier"]')?.value || "",
              confidence: section?.querySelector('[name="predictionConfidence"]')?.value || 0,
              reason: section?.querySelector('[name="predictionReason"]')?.value || "",
              model: section?.querySelector('[name="predictionModel"]')?.value || "",
              createdAt: section?.querySelector('[name="predictionCreatedAt"]')?.value || ""
            },
            retro: {
              actualPerformanceTier: section?.querySelector('[name="actualPerformanceTier"]')?.value || "",
              predictionMatched: section?.querySelector('[name="predictionMatched"]')?.checked === true,
              missReason: section?.querySelector('[name="missReason"]')?.value || "",
              validatedSignals: splitCSV(section?.querySelector('[name="validatedSignals"]')?.value || ""),
              invalidatedSignals: splitCSV(section?.querySelector('[name="invalidatedSignals"]')?.value || ""),
              shouldBecomeReference: section?.querySelector('[name="shouldBecomeReference"]')?.checked === true,
              ruleImprovementCandidate: section?.querySelector('[name="ruleImprovementCandidate"]')?.value || "",
              notes: section?.querySelector('[name="retroNotes"]')?.value || "",
              reviewedAt: section?.querySelector('[name="reviewedAt"]')?.value || ""
            }
          }
        })
      });
      appState.sampleLibraryRecords = Array.isArray(response.items) ? response.items : appState.sampleLibraryRecords;
      appState.selectedSampleLibraryRecordId = String(response.item?.id || button.dataset.id || "");
      setSampleLibraryDetailStep("calibration");
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

    if (action === "save-platform-outcome") {
      const source = button.dataset.source || "analysis";
      const requirementMessage = getLifecycleSaveRequirementMessage(source, button.dataset.candidateId, button.dataset.candidateIndex);

      if (requirementMessage) {
        syncLifecycleResultActions();
        return;
      }

      const response = await savePlatformOutcomeFromCurrent({
        source,
        publishStatus: button.dataset.publishStatus,
        candidateId: button.dataset.candidateId,
        candidateIndex: button.dataset.candidateIndex,
        notes: button.dataset.note
      });
      const resultNode = byId("sample-library-create-result");

      if (resultNode) {
        resultNode.innerHTML = `<div class="result-card-shell">${escapeHtml(button.dataset.note || "平台结果已回填到学习样本。")}</div>`;
      }

      return;
    }

    if (action === "send-feedback-to-review-queue") {
      const suspiciousPhrases = uniqueStrings([
        ...splitCSV(button.dataset.suspiciousPhrases || ""),
        ...splitCSV(button.dataset.feedbackModelSuspiciousPhrases || ""),
        ...splitCSV(button.dataset.feedbackModelContextCategories || "")
      ]);

      if (!suspiciousPhrases.length) {
        throw new Error("当前反馈没有可沉淀的候选词或语境。");
      }

      const form = byId("custom-lexicon-form");
      form.elements.match.value = "exact";
      form.elements.source.value = suspiciousPhrases[0] || "";
      form.elements.category.value = splitCSV(button.dataset.feedbackModelContextCategories || "")[0] || "待人工判断";
      form.elements.riskLevel.value = "manual_review";
      form.elements.lexiconLevel.value = inferLexiconLevel("", "manual_review");
      form.elements.xhsReason.value = button.dataset.platformReason || "";
      revealRulesMaintenancePane("custom-lexicon-pane");
      byId("custom-lexicon-result").innerHTML =
        '<div class="result-card-shell">已根据反馈预填规则草稿，请确认后保存，或回到人工复核队列继续处理。</div>';
      return;
    }

    if (action === "send-feedback-to-false-positive") {
      const analysisVerdict = String(button.dataset.analysisVerdict || "").trim();
      const analysisScore = Number(button.dataset.analysisScore || 0);
      const response = await apiJson("/api/false-positive-log", {
        method: "POST",
        body: JSON.stringify({
          source: "feedback_log",
          title: button.dataset.title || "",
          body: button.dataset.body || "",
          tags: splitCSV(button.dataset.tags || ""),
          status: "platform_passed_pending",
          userNotes: button.dataset.platformReason || "由违规反馈回流记录",
          analysis: analysisVerdict
            ? {
                verdict: analysisVerdict,
                score: Number.isFinite(analysisScore) ? analysisScore : 0,
                categories: splitCSV(button.dataset.tags || [])
              }
            : undefined
        })
      });

      renderFalsePositiveLog(response.items || []);
      revealFeedbackCenterPane();
      byId("false-positive-log-list")?.scrollIntoView({ behavior: "smooth", block: "start" });
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

loadModelSelectionOptions().catch(() => {});
loadCollectionTypeOptions().catch(() => {});

syncAnalyzeActions();
syncFeedbackActions();
syncGenerationActions();
syncSampleLibraryCreateActions();
syncSampleLibraryImportActions();
syncSampleLibraryPrefillActions();
syncSampleLibraryDetailActions();
syncLifecycleResultActions();
syncLexiconFormActions();
