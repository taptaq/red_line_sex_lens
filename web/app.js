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

const REFERENCE_METRIC_THRESHOLD = {
  likes: 20,
  favorites: 10,
  comments: 10,
  nearLikes: 16,
  nearFavorites: 4,
  nearComments: 5,
  supportViews: 3000
};

function formatReferenceThresholdRule(parts = [], { joiner = "、", lastJoiner = " 或" } = {}) {
  const normalized = Array.isArray(parts) ? parts.filter(Boolean) : [];

  if (!normalized.length) {
    return "";
  }

  if (normalized.length === 1) {
    return normalized[0];
  }

  if (normalized.length === 2) {
    return `${normalized[0]}${lastJoiner}${normalized[1]}`;
  }

  return `${normalized.slice(0, -1).join(joiner)}${lastJoiner}${normalized.at(-1)}`;
}

function getReferenceThresholdDirectRuleText({ joiner = "、", lastJoiner = " 或" } = {}) {
  return formatReferenceThresholdRule(
    [
      `点赞 >= ${REFERENCE_METRIC_THRESHOLD.likes}`,
      `收藏 >= ${REFERENCE_METRIC_THRESHOLD.favorites}`,
      `评论 >= ${REFERENCE_METRIC_THRESHOLD.comments}`
    ],
    { joiner, lastJoiner }
  );
}

function getReferenceThresholdAssistRuleText({ joiner = "、", lastJoiner = " 或" } = {}) {
  const nearRule = formatReferenceThresholdRule(
    [
      `点赞 >= ${REFERENCE_METRIC_THRESHOLD.nearLikes}`,
      `收藏 >= ${REFERENCE_METRIC_THRESHOLD.nearFavorites}`,
      `评论 >= ${REFERENCE_METRIC_THRESHOLD.nearComments}`
    ],
    { joiner, lastJoiner }
  );

  return `${nearRule}，再配合浏览 >= ${REFERENCE_METRIC_THRESHOLD.supportViews}`;
}

function getReferenceThresholdRequirementText() {
  return getReferenceThresholdDirectRuleText({ joiner: " / ", lastJoiner: " / " });
}

function getReferenceThresholdFlowGuideText() {
  return `启用参考属性并达到数据门槛：直接达标需要${getReferenceThresholdDirectRuleText()}；若${getReferenceThresholdAssistRuleText()}，也会进入参考样本池。`;
}

function getReferenceThresholdReferenceDescription() {
  return `决定这条记录能否进入参考样本候选。直接达标：${getReferenceThresholdDirectRuleText()}；接近达标后再配合浏览 >= ${REFERENCE_METRIC_THRESHOLD.supportViews}，也会生效。`;
}

function getReferenceThresholdPoolsSubtitleText() {
  return `查看参考样本池、普通样本池和反例样本池的分区结果与生效范围；直接达标看${getReferenceThresholdDirectRuleText()}，接近达标后也可由浏览 >= ${REFERENCE_METRIC_THRESHOLD.supportViews} 补足。`;
}

function syncReferenceThresholdCopy() {
  const flowGuide = byId("sample-library-flow-reference-threshold");
  const poolsSubtitle = byId("sample-library-pools-modal-subtitle");

  if (flowGuide) {
    flowGuide.textContent = getReferenceThresholdFlowGuideText();
  }

  if (poolsSubtitle) {
    poolsSubtitle.textContent = getReferenceThresholdPoolsSubtitleText();
  }
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

function innerSpaceTermCategoryLabel(category) {
  if (category === "actions") return "操作篇";
  if (category === "states") return "状态篇";
  if (category === "map") return "地形篇";
  if (category === "protocol") return "协议篇";
  return "装备篇";
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
  activateTab("data-maintenance", "sample-library-pane");
}

function revealSampleLibraryPane() {
  activateTab("data-maintenance", "sample-library-pane");
  byId("sample-library-pane")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function revealSampleLibraryReflowPane() {
  activateTab("data-maintenance", "sample-library-pane");
  byId("sample-library-reflow-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function openSampleLibraryRecord(recordId = "", step = "base") {
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
  renderSampleLibraryWorkspace();
  openSampleLibraryRecordInlineEditorModal(recordId);
}

function focusSampleLibraryRecordFromPools(recordId = "", step = "base") {
  closeSampleLibraryPoolsModal();
  openSampleLibraryRecord(recordId, step);
}

function revealFeedbackCenterPane() {
  revealSampleLibraryReflowPane();
}

function revealFeedbackCenterDetails() {
  revealSampleLibraryReflowPane();
  byId("feedback-priority-list")?.scrollIntoView({ behavior: "smooth", block: "start" });
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
  adminData: {
    seedLexicon: [],
    customLexicon: [],
    innerSpaceTerms: [],
    feedbackLog: [],
    falsePositiveLog: [],
    reviewQueue: []
  },
  collectionTypeOptions: [],
  sampleLibraryRecords: [],
  selectedSampleLibraryRecordId: "",
  sampleLibraryDetailStep: "base",
  sampleLibraryCollectionFilter: "all",
  sampleLibraryFilter: "all",
  sampleLibrarySearch: "",
  sampleLibraryImportDrafts: [],
  sampleLibraryCalibrationReplayResult: null,
  sampleLibraryModal: null,
  lexiconWorkspaceModal: {
    open: false,
    tab: "custom",
    resultMessage: "",
    drafts: {}
  },
  sampleLibraryPoolsModal: {
    open: false,
    tab: "reference"
  }
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
const innerSpaceTermsApi = "/api/admin/inner-space-terms";
const SAMPLE_LIBRARY_RECORD_PREVIEW_LIMIT = 3;

function syncBodyModalState() {
  const sampleLibraryModalOpen = byId("sample-library-modal")?.hidden === false;
  const lexiconWorkspaceModalOpen = byId("lexicon-workspace-modal")?.hidden === false;
  const sampleLibraryPoolsModalOpen = byId("sample-library-pools-modal")?.hidden === false;
  document.body.classList.toggle(
    "modal-open",
    sampleLibraryModalOpen || lexiconWorkspaceModalOpen || sampleLibraryPoolsModalOpen
  );
}

function syncSampleLibraryCreateButtonExpanded(isExpanded = false) {
  const button = byId("sample-library-create-button");

  if (button) {
    button.setAttribute("aria-expanded", String(isExpanded));
  }
}

function setSampleLibraryModalOpen(isOpen) {
  const modal = byId("sample-library-modal");

  if (!modal) {
    return;
  }

  modal.hidden = !isOpen;
  syncSampleLibraryCreateButtonExpanded(isOpen && appState.sampleLibraryModal?.kind === "create");
  syncBodyModalState();
}

function renderSampleLibraryModal({
  title = "编辑内容",
  subtitle = "在弹窗里完成这一块的编辑与保存。",
  body = "",
  saveLabel = "保存",
  cancelLabel = "取消",
  hideSaveButton = false
} = {}) {
  const titleNode = byId("sample-library-modal-title");
  const subtitleNode = byId("sample-library-modal-subtitle");
  const resultNode = byId("sample-library-modal-result");
  const contentNode = byId("sample-library-modal-content");
  const saveButton = byId("sample-library-modal-save");
  const cancelButton = byId("sample-library-modal-cancel");
  const modalNode = byId("sample-library-modal");

  if (titleNode) {
    titleNode.textContent = title;
  }

  if (subtitleNode) {
    subtitleNode.textContent = subtitle;
  }

  if (resultNode) {
    resultNode.textContent = "";
  }

  if (contentNode) {
    contentNode.innerHTML = body;
  }

  if (saveButton) {
    saveButton.hidden = hideSaveButton;
    saveButton.disabled = false;
    saveButton.dataset.busy = "";
    saveButton.dataset.label = saveLabel;
    saveButton.title = "";
    saveButton.textContent = saveLabel;
    const modalKind = appState.sampleLibraryModal?.kind || "";
    saveButton.classList.toggle("button-danger", modalKind === "record-list-inline-editor-switch-confirm" || modalKind === "record-list-inline-editor-close-confirm");
  }

  if (cancelButton) {
    cancelButton.textContent = cancelLabel;
  }

  if (modalNode) {
    const modalKind = appState.sampleLibraryModal?.kind;
    if (modalKind) {
      modalNode.dataset.modalKind = modalKind;
    } else {
      delete modalNode.dataset.modalKind;
    }
  }

  initializeSampleLibraryModalTagPicker();
  setSampleLibraryModalOpen(true);
}

function closeSampleLibraryModal() {
  appState.sampleLibraryModal = null;
  setSampleLibraryModalOpen(false);

  const resultNode = byId("sample-library-modal-result");
  const contentNode = byId("sample-library-modal-content");
  const saveButton = byId("sample-library-modal-save");
  const cancelButton = byId("sample-library-modal-cancel");
  const modalNode = byId("sample-library-modal");

  if (resultNode) {
    resultNode.textContent = "";
  }

  if (contentNode) {
    contentNode.innerHTML = "";
  }

  if (saveButton) {
    saveButton.hidden = false;
    saveButton.disabled = false;
    saveButton.dataset.busy = "";
    saveButton.dataset.label = "保存";
    saveButton.title = "";
    saveButton.textContent = "保存";
    saveButton.classList.remove("button-danger");
  }

  if (cancelButton) {
    cancelButton.textContent = "取消";
  }

  if (modalNode) {
    delete modalNode.dataset.modalKind;
  }
}

function setSampleLibraryModalMessage(message = "") {
  const resultNode = byId("sample-library-modal-result");

  if (resultNode) {
    resultNode.textContent = String(message || "").trim();
  }
}

function setSampleLibraryPoolsModalOpen(isOpen) {
  const modal = byId("sample-library-pools-modal");
  const trigger = byId("sample-library-pools-button");

  if (!modal) {
    return;
  }

  modal.hidden = !isOpen;

  if (trigger) {
    trigger.setAttribute("aria-expanded", String(isOpen));
  }

  syncBodyModalState();
}

function normalizeLexiconWorkspaceTab(tab = "custom") {
  return ["custom", "seed", "inner-space"].includes(tab) ? tab : "custom";
}

function createDefaultLexiconDraft(scope = "custom") {
  const riskLevel = scope === "seed" ? "hard_block" : "manual_review";

  return {
    match: "exact",
    source: "",
    category: "",
    riskLevel,
    lexiconLevel: inferLexiconLevel("", riskLevel),
    xhsReason: ""
  };
}

function createDefaultInnerSpaceTermDraft() {
  return {
    term: "",
    aliases: "",
    category: "equipment",
    collectionTypes: "",
    literal: "",
    metaphor: "",
    preferredUsage: "",
    avoidUsage: "",
    example: "",
    priority: "80"
  };
}

function createLexiconWorkspaceDrafts(existing = {}) {
  return {
    custom: {
      ...createDefaultLexiconDraft("custom"),
      ...(existing.custom || {})
    },
    seed: {
      ...createDefaultLexiconDraft("seed"),
      ...(existing.seed || {})
    },
    "inner-space": {
      ...createDefaultInnerSpaceTermDraft(),
      ...(existing["inner-space"] || {})
    }
  };
}

function setLexiconWorkspaceModalOpen(isOpen) {
  const modal = byId("lexicon-workspace-modal");

  if (!modal) {
    return;
  }

  modal.hidden = !isOpen;
  syncBodyModalState();
}

function setLexiconWorkspaceResultMessage(message = "") {
  const nextState = {
    ...appState.lexiconWorkspaceModal,
    resultMessage: String(message || "").trim()
  };
  const resultNode = byId("lexicon-workspace-result");

  appState.lexiconWorkspaceModal = nextState;

  if (resultNode) {
    resultNode.textContent = nextState.resultMessage;
  }
}

function buildLexiconWorkspaceConfig(tab = "custom") {
  if (tab === "seed") {
    return {
      title: "种子词库工作台",
      subtitle: "集中维护全局稳定规则，适合查看层级、新增条目和删除历史规则。"
    };
  }

  if (tab === "inner-space") {
    return {
      title: "内太空术语工作台",
      subtitle: "集中维护生成与改写会优先参考的术语表达，不直接参与规则判罚。"
    };
  }

  return {
    title: "自定义词库工作台",
    subtitle: "接收回流复核草稿后，在这里微调、保存和删除自定义规则。"
  };
}

function buildLexiconWorkspaceLexiconFormMarkup(scope = "custom", draft = {}) {
  const isSeed = scope === "seed";
  const riskLevel = String(draft.riskLevel || (isSeed ? "hard_block" : "manual_review"));
  const lexiconLevel = inferLexiconLevel(draft.lexiconLevel, riskLevel);

  return `
    <form class="stack compact-form" data-lexicon-workspace-form="${escapeHtml(scope)}">
      <label>
        <span>匹配类型</span>
        <select name="match">
          <option value="exact" ${draft.match === "regex" ? "" : "selected"}>精确词</option>
          <option value="regex" ${draft.match === "regex" ? "selected" : ""}>正则</option>
        </select>
      </label>
      <label>
        <span>词 / 模式</span>
        <input type="text" name="source" value="${escapeHtml(draft.source || "")}" placeholder="${
          isSeed ? "例如：私信我 或 (vx|微.?信)" : "例如：小窗我"
        }" required />
      </label>
      <label>
        <span>分类</span>
        <input type="text" name="category" value="${escapeHtml(draft.category || "")}" placeholder="例如：导流与私域" required />
      </label>
      <label>
        <span>风险等级</span>
        <select name="riskLevel">
          <option value="hard_block" ${riskLevel === "hard_block" ? "selected" : ""}>高风险拦截</option>
          <option value="manual_review" ${riskLevel === "manual_review" ? "selected" : ""}>人工复核</option>
          <option value="observe" ${riskLevel === "observe" ? "selected" : ""}>观察通过</option>
        </select>
      </label>
      <label>
        <span>词库级别</span>
        <select name="lexiconLevel">
          <option value="l1" ${lexiconLevel === "l1" ? "selected" : ""}>一级词库</option>
          <option value="l2" ${lexiconLevel === "l2" ? "selected" : ""}>二级词库</option>
          <option value="l3" ${lexiconLevel === "l3" ? "selected" : ""}>三级词库</option>
        </select>
      </label>
      <label>
        <span>平台原因</span>
        <input type="text" name="xhsReason" value="${escapeHtml(draft.xhsReason || "")}" placeholder="${
          isSeed ? "例如：交易导流/站外引流" : "例如：账号专属高风险短语"
        }" />
      </label>
      <p class="helper-text">${
        isSeed
          ? "建议把高频稳定高风险规则放一级，把需要继续观察的规则放二级或三级。"
          : "一级更偏核心拦截，二级更偏重点复核，三级更偏观察沉淀。"
      }</p>
      <div class="item-actions">
        <button type="submit" class="button ${isSeed ? "" : "button-alt"}">新增${isSeed ? "种子词" : "自定义词"}</button>
      </div>
    </form>
  `;
}

function buildInnerSpaceWorkspaceFormMarkup(draft = {}) {
  return `
    <form class="stack compact-form" data-lexicon-workspace-form="inner-space">
      <label>
        <span>术语</span>
        <input type="text" name="term" value="${escapeHtml(draft.term || "")}" placeholder="例如：小飞船" required />
      </label>
      <label>
        <span>别名</span>
        <input type="text" name="aliases" value="${escapeHtml(draft.aliases || "")}" placeholder="例如：装备, 快乐飞船" />
      </label>
      <label>
        <span>分类</span>
        <select name="category">
          <option value="equipment" ${draft.category === "equipment" ? "selected" : ""}>装备篇</option>
          <option value="actions" ${draft.category === "actions" ? "selected" : ""}>操作篇</option>
          <option value="states" ${draft.category === "states" ? "selected" : ""}>状态篇</option>
          <option value="map" ${draft.category === "map" ? "selected" : ""}>地形篇</option>
          <option value="protocol" ${draft.category === "protocol" ? "selected" : ""}>协议篇</option>
        </select>
      </label>
      <label>
        <span>适用合集</span>
        <input type="text" name="collectionTypes" value="${escapeHtml(draft.collectionTypes || "")}" placeholder="例如：亲密关系, 两性科普" />
      </label>
      <label>
        <span>原意</span>
        <input type="text" name="literal" value="${escapeHtml(draft.literal || "")}" placeholder="例如：震动棒、跳蛋等情趣玩具" />
      </label>
      <label>
        <span>隐喻逻辑</span>
        <input type="text" name="metaphor" value="${escapeHtml(draft.metaphor || "")}" placeholder="例如：载你去快乐星球的交通工具" />
      </label>
      <label>
        <span>推荐用法</span>
        <input type="text" name="preferredUsage" value="${escapeHtml(draft.preferredUsage || "")}" placeholder="例如：适合轻松分享语境，不要写得太生硬" />
      </label>
      <label>
        <span>避免用法</span>
        <input type="text" name="avoidUsage" value="${escapeHtml(draft.avoidUsage || "")}" placeholder="例如：不要和未成年人、交易暗示并列" />
      </label>
      <label class="field-wide">
        <span>示例句</span>
        <textarea name="example" rows="4" placeholder="例如：今晚不想社交，只想驾驶我的快乐飞船去月球散步。">${escapeHtml(
          draft.example || ""
        )}</textarea>
      </label>
      <label>
        <span>优先级</span>
        <input type="number" name="priority" min="0" max="100" value="${escapeHtml(String(draft.priority || "80"))}" />
      </label>
      <div class="item-actions">
        <button type="submit" class="button button-alt">新增术语</button>
      </div>
    </form>
  `;
}

function buildLexiconWorkspaceBodyMarkup(tab = "custom") {
  const drafts = createLexiconWorkspaceDrafts(appState.lexiconWorkspaceModal?.drafts || {});
  const customLexicon = Array.isArray(appState.adminData?.customLexicon) ? appState.adminData.customLexicon : [];
  const seedLexicon = Array.isArray(appState.adminData?.seedLexicon) ? appState.adminData.seedLexicon : [];
  const innerSpaceTerms = Array.isArray(appState.adminData?.innerSpaceTerms) ? appState.adminData.innerSpaceTerms : [];

  if (tab === "seed") {
    return `
      <div class="lexicon-workspace-panel">
        <section class="lexicon-workspace-editor">
          <div class="lexicon-workspace-panel-head">
            <strong>新增种子规则</strong>
            <p>维护全局稳定规则，新增后会自动刷新右侧列表。</p>
          </div>
          ${buildLexiconWorkspaceLexiconFormMarkup("seed", drafts.seed)}
        </section>
        <section class="lexicon-workspace-list">
          <div class="lexicon-workspace-list-head">
            <strong>当前种子词库</strong>
            <p>按一级、二级、三级词库查看当前规则沉淀。</p>
          </div>
          <div class="admin-list">${buildLexiconListMarkup(seedLexicon, "seed")}</div>
        </section>
      </div>
    `;
  }

  if (tab === "inner-space") {
    return `
      <div class="lexicon-workspace-panel">
        <section class="lexicon-workspace-editor">
          <div class="lexicon-workspace-panel-head">
            <strong>新增术语</strong>
            <p>术语会参与改写和生成的参考表达，用于统一蜜语风格。</p>
          </div>
          ${buildInnerSpaceWorkspaceFormMarkup(drafts["inner-space"])}
        </section>
        <section class="lexicon-workspace-list">
          <div class="lexicon-workspace-list-head">
            <strong>当前术语表</strong>
            <p>按优先级展示当前术语，方便快速删除或核对。</p>
          </div>
          <div class="admin-list">${buildInnerSpaceTermsListMarkup(innerSpaceTerms)}</div>
        </section>
      </div>
    `;
  }

  return `
    <div class="lexicon-workspace-panel">
      <section class="lexicon-workspace-editor">
        <div class="lexicon-workspace-panel-head">
          <strong>新增自定义规则</strong>
          <p>适合接收回流复核草稿，保存后会自动刷新右侧列表。</p>
        </div>
        ${buildLexiconWorkspaceLexiconFormMarkup("custom", drafts.custom)}
      </section>
      <section class="lexicon-workspace-list">
        <div class="lexicon-workspace-list-head">
          <strong>当前自定义词库</strong>
          <p>按一级、二级、三级词库查看当前规则沉淀。</p>
        </div>
        <div class="admin-list">${buildLexiconListMarkup(customLexicon, "custom")}</div>
      </section>
    </div>
  `;
}

function renderLexiconWorkspaceModal() {
  const modalState = appState.lexiconWorkspaceModal;
  const modal = byId("lexicon-workspace-modal");
  const titleNode = byId("lexicon-workspace-modal-title");
  const subtitleNode = byId("lexicon-workspace-modal-subtitle");
  const resultNode = byId("lexicon-workspace-result");
  const contentNode = byId("lexicon-workspace-modal-content");

  if (!modalState?.open) {
    if (modal) {
      modal.hidden = true;
    }
    syncBodyModalState();
    return;
  }

  const tab = normalizeLexiconWorkspaceTab(modalState.tab);
  const config = buildLexiconWorkspaceConfig(tab);

  if (titleNode) {
    titleNode.textContent = config.title;
  }

  if (subtitleNode) {
    subtitleNode.textContent = config.subtitle;
  }

  if (resultNode) {
    resultNode.textContent = modalState.resultMessage || "";
  }

  if (contentNode) {
    contentNode.innerHTML = buildLexiconWorkspaceBodyMarkup(tab);
  }

  document.querySelectorAll("[data-lexicon-workspace-tab]").forEach((button) => {
    button.setAttribute("aria-selected", String(button.dataset.lexiconWorkspaceTab === tab));
  });

  setLexiconWorkspaceModalOpen(true);
}

async function openLexiconWorkspaceModal(tab = "custom", { prefill = null, resultMessage = "" } = {}) {
  const normalizedTab = normalizeLexiconWorkspaceTab(tab);
  const drafts = createLexiconWorkspaceDrafts(appState.lexiconWorkspaceModal?.drafts || {});

  ensureSupportWorkspaceOpen();
  ensureSampleLibraryAdvancedPanelOpen();
  ensureRulesMaintenanceOpen();
  await refreshAdminDataState();
  if (normalizedTab === "inner-space") {
    await refreshInnerSpaceTermsState();
  }

  if (prefill && typeof prefill === "object") {
    drafts[normalizedTab] = {
      ...drafts[normalizedTab],
      ...prefill
    };
  }

  appState.lexiconWorkspaceModal = {
    open: true,
    tab: normalizedTab,
    resultMessage: String(resultMessage || "").trim(),
    drafts
  };

  renderLexiconWorkspaceModal();
}

function closeLexiconWorkspaceModal() {
  appState.lexiconWorkspaceModal = {
    open: false,
    tab: "custom",
    resultMessage: "",
    drafts: createLexiconWorkspaceDrafts()
  };
  setLexiconWorkspaceModalOpen(false);

  const contentNode = byId("lexicon-workspace-modal-content");
  const resultNode = byId("lexicon-workspace-result");

  if (contentNode) {
    contentNode.innerHTML = '<div class="result-card muted">等待打开词库工作台</div>';
  }

  if (resultNode) {
    resultNode.textContent = "";
  }
}

function buildSamplePoolDescription(pool = "reference") {
  if (pool === "negative") {
    return {
      title: "反例样本池",
      subtitle: "当前主要用于风险对照和后续避坑提示，不参与正向生成与校验放宽。",
      empty: "当前还没有进入反例样本池的记录。"
    };
  }

  if (pool === "regular") {
    return {
      title: "普通样本池",
      subtitle: "当前用于沉淀、去重、检索和候选筛选，不直接参与运行时正向参考。",
      empty: "当前没有普通样本记录。"
    };
  }

  return {
    title: "参考样本池",
    subtitle: "会反哺内容生成、改写和内容校验提示层，只展示真正达到运行时口径的样本。",
    empty: "当前还没有满足条件的参考样本。"
  };
}

function buildSamplePoolActionMarkup(record = {}, pool = "reference") {
  const recordId = escapeHtml(String(record?.id || ""));
  const publish = getSampleRecordPublish(record);

  if (pool === "negative") {
    const primaryAction = ["limited", "violation", "false_positive"].includes(publish.status)
      ? `
        <button type="button" class="button button-small" data-action="open-sample-library-lifecycle-from-pool" data-id="${recordId}">
          调整生命周期
        </button>
      `
      : `
        <button type="button" class="button button-small" data-action="restore-sample-from-negative-pool" data-id="${recordId}">
          退回普通样本
        </button>
      `;

    return `
      ${primaryAction}
      <button type="button" class="button button-ghost button-small" data-action="open-sample-library-record" data-id="${recordId}">
        回到原记录
      </button>
    `;
  }

  if (pool === "regular") {
    return `
      <button type="button" class="button button-small" data-action="promote-sample-to-reference" data-id="${recordId}">
        设为参考候选
      </button>
      <button type="button" class="button button-ghost button-small" data-action="mark-sample-as-negative" data-id="${recordId}">
        标记为反例
      </button>
      <button type="button" class="button button-ghost button-small" data-action="open-sample-library-record" data-id="${recordId}">
        回到原记录
      </button>
    `;
  }

  return `
    <button type="button" class="button button-small" data-action="adjust-reference-sample" data-id="${recordId}">
      调整参考等级
    </button>
    <button type="button" class="button button-ghost button-small" data-action="remove-sample-from-reference-pool" data-id="${recordId}">
      移出参考池
    </button>
    <button type="button" class="button button-ghost button-small" data-action="open-sample-library-record" data-id="${recordId}">
      回到原记录
    </button>
  `;
}

function renderSamplePoolCards(items = [], pool = "reference") {
  const records = Array.isArray(items) ? items : [];

  if (!records.length) {
    return "";
  }

  return records
    .map((record) => {
      const title = getSampleRecordTitle(record) || "未命名样本";
      const publish = getSampleRecordPublish(record);
      const reference = getSampleRecordReference(record);
      const tags = getSampleRecordTags(record);

      return `
        <article class="sample-pool-card result-card-shell">
          <div class="sample-pool-card-head">
            <div>
              <strong>${escapeHtml(title)}</strong>
              <p>${escapeHtml(getSamplePoolWhyLabel(record))}</p>
            </div>
            <span class="meta-pill">${escapeHtml(sampleLibraryPoolLabel(pool))}</span>
          </div>
          <div class="meta-row">
            <span class="meta-pill">${escapeHtml(collectionTypeLabel(getSampleRecordCollectionType(record)))}</span>
            <span class="meta-pill">${escapeHtml(publishStatusLabel(publish.status))}</span>
            <span class="meta-pill">${escapeHtml(reference.enabled ? successTierLabel(reference.tier || "passed") : "未启用参考")}</span>
          </div>
          <div class="meta-row sample-library-metric-grid">
            <span class="meta-pill sample-library-metric-pill">赞 ${escapeHtml(String(publish.metrics.likes || 0))}</span>
            <span class="meta-pill sample-library-metric-pill">藏 ${escapeHtml(String(publish.metrics.favorites || 0))}</span>
            <span class="meta-pill sample-library-metric-pill">评 ${escapeHtml(String(publish.metrics.comments || 0))}</span>
            <span class="meta-pill sample-library-metric-pill">浏览 ${escapeHtml(String(publish.metrics.views || 0))}</span>
          </div>
          <p class="helper-text">标签：${escapeHtml(joinCSV(tags) || "未填写")}</p>
          <div class="item-actions">
            ${buildSamplePoolActionMarkup(record, pool)}
          </div>
        </article>
      `;
    })
    .join("");
}

function renderSampleLibraryPoolsModal() {
  const modal = byId("sample-library-pools-modal");
  const contentNode = byId("sample-library-pools-modal-content");

  if (!modal || !contentNode) {
    return;
  }

  const pool = String(appState.sampleLibraryPoolsModal?.tab || "reference").trim() || "reference";
  const summary = buildSamplePoolSummary(appState.sampleLibraryRecords);
  const description = buildSamplePoolDescription(pool);
  const items = (Array.isArray(appState.sampleLibraryRecords) ? appState.sampleLibraryRecords : []).filter(
    (record) => classifySampleLibraryPool(record) === pool
  );

  modal.querySelectorAll("[data-sample-pool-tab]").forEach((button) => {
    button.setAttribute("aria-selected", String(button.dataset.samplePoolTab === pool));
  });

  contentNode.innerHTML = `
    <section class="sample-pool-summary-grid">
      <article class="sample-pool-summary-card">
        <strong>参考样本池</strong>
        <p>${escapeHtml(String(summary.reference || 0))} 条</p>
      </article>
      <article class="sample-pool-summary-card">
        <strong>普通样本池</strong>
        <p>${escapeHtml(String(summary.regular || 0))} 条</p>
      </article>
      <article class="sample-pool-summary-card">
        <strong>反例样本池</strong>
        <p>${escapeHtml(String(summary.negative || 0))} 条</p>
      </article>
    </section>
    <section class="sample-pool-panel">
      <div class="sample-pool-panel-head">
        <div>
          <strong>${escapeHtml(description.title)}</strong>
          <p>${escapeHtml(description.subtitle)}</p>
        </div>
        <span class="meta-pill">${escapeHtml(String(items.length))} 条记录</span>
      </div>
      <div class="sample-pool-card-list">
        ${renderSamplePoolCards(items, pool) || `<div class="result-card muted">${escapeHtml(description.empty)}</div>`}
      </div>
    </section>
  `;
}

function openSampleLibraryPoolsModal(pool = "reference") {
  appState.sampleLibraryPoolsModal = {
    open: true,
    tab: ["reference", "regular", "negative"].includes(pool) ? pool : "reference"
  };
  renderSampleLibraryPoolsModal();
  setSampleLibraryPoolsModalOpen(true);
}

function closeSampleLibraryPoolsModal() {
  appState.sampleLibraryPoolsModal = {
    open: false,
    tab: String(appState.sampleLibraryPoolsModal?.tab || "reference")
  };
  setSampleLibraryPoolsModalOpen(false);
}

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
  const raw = await response.text();
  let payload = {};

  if (raw) {
    try {
      payload = JSON.parse(raw);
    } catch {
      payload = { error: raw };
    }
  }

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

function getPlatformOutcomeOption(status = "published_passed") {
  return platformOutcomeOptions.find((item) => item.status === String(status || "").trim()) || platformOutcomeOptions[0] || {};
}

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

function buildPlatformOutcomeModalMarkup({ publishStatus = "published_passed", notes = "", views = 0 } = {}) {
  const option = getPlatformOutcomeOption(publishStatus);

  return `
    <div class="sample-library-modal-stack compact-form">
      <section class="sample-library-modal-section">
        <div class="sample-library-modal-section-head">
          <strong>${escapeHtml(option.label || "平台结果回填")}</strong>
          <p>${escapeHtml(option.note || "补充这次平台结果的关键回填信息。")}</p>
        </div>
        <div class="sample-library-modal-grid">
          <label>
            <span>平台结果</span>
            <input value="${escapeHtml(option.label || "平台结果")}" disabled />
          </label>
          <label>
            <span>浏览数</span>
            <input name="platformOutcomeViews" type="number" min="0" value="${escapeHtml(String(views || 0))}" />
          </label>
        </div>
        <label>
          <span>回填备注</span>
          <textarea name="platformOutcomeNotes" rows="3" placeholder="例如：发布 24h 后稳定通过">${escapeHtml(notes || option.note || "")}</textarea>
        </label>
      </section>
    </div>
  `;
}

function openPlatformOutcomeModal({
  source = "analysis",
  publishStatus = "published_passed",
  candidateId = "",
  candidateIndex = "",
  notes = "",
  views = 0
} = {}) {
  appState.sampleLibraryModal = {
    kind: "platform-outcome",
    source,
    publishStatus,
    candidateId,
    candidateIndex,
    notes,
    views
  };

  renderSampleLibraryModal({
    title: "回填平台结果",
    subtitle: `${lifecycleSourceLabel(source)} · ${publishStatusLabel(publishStatus)}`,
    body: buildPlatformOutcomeModalMarkup({ publishStatus, notes, views }),
    saveLabel: "确认回填"
  });
}

function readPlatformOutcomeModalPayload() {
  const contentNode = byId("sample-library-modal-content");

  return {
    notes: contentNode?.querySelector('[name="platformOutcomeNotes"]')?.value || "",
    views: contentNode?.querySelector('[name="platformOutcomeViews"]')?.value || 0
  };
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
  const views = Number(publish?.metrics?.views || 0) || 0;

  if (status === "not_published") {
    return "";
  }

  if (status === "violation" || status === "limited") {
    return "low";
  }

  if (status === "positive_performance" || likes >= 100 || favorites >= 20 || comments >= 10) {
    return "high";
  }

  if (
    likes >= REFERENCE_METRIC_THRESHOLD.likes ||
    favorites >= REFERENCE_METRIC_THRESHOLD.favorites ||
    comments >= REFERENCE_METRIC_THRESHOLD.comments ||
    ((likes >= REFERENCE_METRIC_THRESHOLD.nearLikes ||
      favorites >= REFERENCE_METRIC_THRESHOLD.nearFavorites ||
      comments >= REFERENCE_METRIC_THRESHOLD.nearComments) &&
      views >= REFERENCE_METRIC_THRESHOLD.supportViews) ||
    status === "published_passed" ||
    status === "false_positive"
  ) {
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
      action: pendingFeedbackCount ? "去处理误判回流" : "打开学习样本",
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
  const referenceSampleHints = Array.isArray(result.referenceSampleHints) ? result.referenceSampleHints : [];
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
  const referenceSampleEvidence = referenceSampleHints
    .map((item) => String(item?.message || item?.title || "").trim())
    .filter(Boolean);
  const referenceSampleMarkup = referenceSampleEvidence.length
    ? `
      <div class="model-scope-banner">
        <span class="model-scope-kicker">参考样本提示</span>
        <strong>${escapeHtml(result.softenedByReferenceSamples ? "已按参考样本降为观察" : "发现可参考的安全样本")}</strong>
        <p>${escapeHtml(referenceSampleEvidence.join("；"))}</p>
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
    ${referenceSampleMarkup}
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

function buildLexiconListMarkup(items = [], scope = "custom") {
  const groups = [
    { key: "l1", label: "一级词库" },
    { key: "l2", label: "二级词库" },
    { key: "l3", label: "三级词库" }
  ];

  return items.length
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

function renderLexiconList(containerId, items, scope) {
  const node = byId(containerId);

  if (!node) {
    return;
  }

  node.innerHTML = buildLexiconListMarkup(items, scope);
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
            data-note-id="${escapeHtml(item.noteId)}"
            data-created-at="${escapeHtml(item.createdAt)}"
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

function getSortedFalsePositiveGroups(items = []) {
  const normalizedItems = Array.isArray(items) ? items : [];
  const pendingItems = normalizedItems.filter((item) => item.status !== "platform_passed_confirmed");
  const historyItems = normalizedItems.filter((item) => item.status === "platform_passed_confirmed");

  return {
    pendingItems: pendingItems
      .slice()
      .sort((a, b) => {
        const aPending = a.status !== "platform_passed_confirmed";
        const bPending = b.status !== "platform_passed_confirmed";

        if (aPending !== bPending) {
          return aPending ? -1 : 1;
        }

        return new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime();
      }),
    historyItems: historyItems
      .slice()
      .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime())
  };
}

function buildFalsePositiveListSectionMarkup(title, description, items, emptyMessage) {
  return `
    <section class="sample-library-modal-section">
      <div class="sample-library-modal-section-head">
        <strong>${escapeHtml(title)}</strong>
        <p>${escapeHtml(description)}</p>
      </div>
      <div class="admin-list">
        ${
          items.length
            ? items
                .map((item) =>
                  buildFalsePositiveEntryMarkup({
                    ...item,
                    updatedAt: formatDate(item.updatedAt || item.createdAt)
                  })
                )
                .join("")
            : `<div class="result-card muted">${escapeHtml(emptyMessage)}</div>`
        }
      </div>
    </section>
  `;
}

function buildFalsePositiveListModalMarkup() {
  const { pendingItems, historyItems } = getSortedFalsePositiveGroups(appState.falsePositiveLog);

  return `
    <div class="sample-library-modal-stack compact-form">
      ${buildFalsePositiveListSectionMarkup(
        "待确认误报",
        "继续观察近期待确认样本，确认后会转入历史案例。",
        pendingItems,
        "当前没有待确认误报"
      )}
      ${buildFalsePositiveListSectionMarkup(
        "已沉淀误报案例",
        "回看已经确认的误报案例，方便复盘历史判断。",
        historyItems,
        "当前没有已沉淀误报案例"
      )}
    </div>
  `;
}

function renderFalsePositiveListModal() {
  renderSampleLibraryModal({
    title: "全部误报案例",
    subtitle: "按待确认和已沉淀两个分区集中查看。",
    body: buildFalsePositiveListModalMarkup(),
    saveLabel: "关闭",
    cancelLabel: "关闭",
    hideSaveButton: true
  });
}

function openFalsePositiveListModal() {
  appState.sampleLibraryModal = {
    kind: "false-positive-list"
  };

  renderFalsePositiveListModal();
}

function buildFalsePositiveSummaryText({ pendingItems, historyItems }) {
  const pendingCount = Array.isArray(pendingItems) ? pendingItems.length : 0;
  const historyCount = Array.isArray(historyItems) ? historyItems.length : 0;

  if (pendingCount === 0 && historyCount === 0) {
    return "当前没有误报样本";
  }

  if (pendingCount === 0) {
    return `当前没有待确认误报，已沉淀 ${historyCount} 条历史案例。`;
  }

  if (historyCount === 0) {
    return `当前有 ${pendingCount} 条待确认误报，暂时还没有已沉淀历史案例。`;
  }

  return `当前有 ${pendingCount} 条待确认误报，已沉淀 ${historyCount} 条历史案例。`;
}

function renderFalsePositiveLog(items) {
  appState.falsePositiveLog = Array.isArray(items) ? items : [];
  const { pendingItems, historyItems } = getSortedFalsePositiveGroups(appState.falsePositiveLog);
  const previewButton = byId("false-positive-preview-open-button");
  const summaryNode = byId("false-positive-summary");
  const logListNode = byId("false-positive-log-list");

  if (previewButton) {
    previewButton.hidden = appState.falsePositiveLog.length === 0;
  }

  if (summaryNode) {
    summaryNode.textContent = buildFalsePositiveSummaryText({ pendingItems, historyItems });
    summaryNode.classList.toggle("muted", appState.falsePositiveLog.length === 0);
  }

  if (logListNode) {
    logListNode.hidden = appState.falsePositiveLog.length > 0;
    logListNode.innerHTML = appState.falsePositiveLog.length
      ? ""
      : '<div class="result-card muted">当前没有误报样本</div>';
  }

  if (appState.sampleLibraryModal?.kind === "false-positive-list" && byId("sample-library-modal")?.hidden === false) {
    renderFalsePositiveListModal();
  }
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
      comments: Number(source.metrics?.comments ?? source.comments ?? 0) || 0,
      views: Number(source.metrics?.views ?? source.views ?? 0) || 0
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
    publish.metrics.views > 0 ||
    Boolean(publish.notes || publish.publishedAt || publish.platformReason)
  );
}

function isPositiveReferenceStatus(status = "") {
  return ["published_passed", "positive_performance"].includes(String(status || "").trim());
}

function evaluateReferenceSampleThreshold(metrics = {}) {
  const likes = Number(metrics?.likes || 0) || 0;
  const favorites = Number(metrics?.favorites || 0) || 0;
  const comments = Number(metrics?.comments || 0) || 0;
  const views = Number(metrics?.views || 0) || 0;

  const nearQualified =
    likes >= REFERENCE_METRIC_THRESHOLD.nearLikes ||
    favorites >= REFERENCE_METRIC_THRESHOLD.nearFavorites ||
    comments >= REFERENCE_METRIC_THRESHOLD.nearComments;
  const highViews = views >= REFERENCE_METRIC_THRESHOLD.supportViews;
  const directQualified =
    likes >= REFERENCE_METRIC_THRESHOLD.likes ||
    favorites >= REFERENCE_METRIC_THRESHOLD.favorites ||
    comments >= REFERENCE_METRIC_THRESHOLD.comments;

  if (directQualified) {
    return {
      qualified: true,
      reason: "互动达标",
      mode: "engagement",
      nearQualified: true,
      highViews
    };
  }

  if (nearQualified && highViews) {
    return {
      qualified: true,
      reason: "互动接近达标，已由高浏览数补足",
      mode: "views_assist",
      nearQualified,
      highViews
    };
  }

  return {
    qualified: false,
    reason: "",
    mode: "none",
    nearQualified,
    highViews
  };
}

function meetsReferenceSampleThreshold(metrics = {}) {
  return evaluateReferenceSampleThreshold(metrics).qualified;
}

function isQualifiedReferenceCandidate(record = {}) {
  const reference = getSampleRecordReference(record);
  const publish = getSampleRecordPublish(record);
  const title = getSampleRecordTitle(record);
  const body = getSampleRecordBody(record);
  const coverText = getSampleRecordCoverText(record);
  const hasContent = title.length >= 4 || body.length >= 16 || coverText.length >= 4;

  return reference.enabled && hasContent && isPositiveReferenceStatus(publish.status) && meetsReferenceSampleThreshold(publish.metrics);
}

function getReferenceQualification(record = {}) {
  return evaluateReferenceSampleThreshold(getSampleRecordPublish(record).metrics);
}

function classifySampleLibraryPool(record = {}) {
  const publish = getSampleRecordPublish(record);
  const sampleType = String(record?.sampleType || "").trim();

  if (["limited", "violation", "false_positive"].includes(publish.status) || ["false_positive", "missed_violation"].includes(sampleType)) {
    return "negative";
  }

  if (isQualifiedReferenceCandidate(record)) {
    return "reference";
  }

  return "regular";
}

function sampleLibraryPoolLabel(pool = "reference") {
  if (pool === "negative") return "反例样本池";
  if (pool === "regular") return "普通样本池";
  return "参考样本池";
}

function buildSamplePoolSummary(records = []) {
  return (Array.isArray(records) ? records : []).reduce(
    (summary, record) => {
      const pool = classifySampleLibraryPool(record);
      summary[pool] += 1;
      return summary;
    },
    {
      reference: 0,
      regular: 0,
      negative: 0
    }
  );
}

function getSamplePoolWhyLabel(record = {}) {
  const publish = getSampleRecordPublish(record);
  const reference = getSampleRecordReference(record);
  const sampleType = String(record?.sampleType || "").trim();
  const pool = classifySampleLibraryPool(record);
  const qualification = getReferenceQualification(record);

  if (pool === "reference") {
    return `${qualification.reason || "互动达标"}，会参与生成、改写和内容校验提示。`;
  }

  if (pool === "negative") {
    if (["limited", "violation"].includes(publish.status)) {
      return `生命周期状态为${publishStatusLabel(publish.status)}，当前归入反例样本池。`;
    }

    if (sampleType === "false_positive") {
      return "这条记录属于误报回流样本，当前放在反例样本池做风险对照。";
    }

    if (sampleType === "missed_violation") {
      return "这条记录属于漏判风险样本，当前放在反例样本池做风险对照。";
    }

    return "当前已标记为不建议复用，先归入反例样本池。";
  }

  if (!reference.enabled) {
    return "还没启用参考属性，当前先保留在普通样本池。";
  }

  if (!qualification.qualified) {
    if (qualification.highViews && !qualification.nearQualified) {
      return `已启用参考，但当前只有浏览高，核心互动还没接近达标（${getReferenceThresholdAssistRuleText({
        joiner: " / ",
        lastJoiner: " / "
      }).replace(`，再配合浏览 >= ${REFERENCE_METRIC_THRESHOLD.supportViews}`, "")}），仍保留在普通样本池。`;
    }

    if (qualification.nearQualified && !qualification.highViews) {
      return `已启用参考，互动已接近达标，但浏览数还不足 ${REFERENCE_METRIC_THRESHOLD.supportViews}，当前仍保留在普通样本池。`;
    }

    return `已启用参考，但互动数据还没达到参考门槛（${getReferenceThresholdRequirementText()}），当前仍保留在普通样本池。`;
  }

  if (!isPositiveReferenceStatus(publish.status)) {
    return "已启用参考，但发布状态还不属于正向合规样本，当前仍保留在普通样本池。";
  }

  return "当前先作为普通样本沉淀，用于去重、检索和后续筛选。";
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

function buildSampleLibraryRecordActionAttributes({ action = "", id = "" } = {}) {
  if (!action) {
    return "";
  }

  return [`data-action="${escapeHtml(action)}"`, `data-id="${escapeHtml(String(id || ""))}"`].join(" ");
}

function buildSampleLibraryRecordCardMarkup(item = {}, { action = "", actionId = "", isActive = false } = {}) {
  const itemId = String(item?.id || "");
  const reference = getSampleRecordReference(item);
  const publish = getSampleRecordPublish(item);
  const calibration = getSampleRecordCalibration(item);
  const calibrationState = getSampleLibraryCalibrationListState(item);
  const title = getSampleRecordTitle(item) || "未命名样本记录";
  const body = getSampleRecordBody(item);
  const collectionType = getSampleRecordCollectionType(item);
  const tags = getSampleRecordTags(item);
  const stepLabel = getSampleLibraryRecordStepLabel(item);
  const actionAttributes =
    buildSampleLibraryRecordActionAttributes({
      action,
      id: actionId || itemId
    }) || `data-sample-library-record-id="${escapeHtml(itemId)}"`;

  return `
    <button
      type="button"
      class="sample-library-record-card admin-item${isActive ? " is-active" : ""}"
      ${actionAttributes}
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
        <span class="meta-pill">浏览 ${escapeHtml(String(publish.metrics.views || 0))}</span>
        <span class="meta-pill">${escapeHtml(lifecycleSourceLabel(item?.source || "manual"))}</span>
        <span class="meta-pill">${escapeHtml(formatDate(item?.updatedAt || item?.createdAt))}</span>
      </div>
      <p>${escapeHtml(compactText(body || getSampleRecordCoverText(item), 96) || "未填写正文")}</p>
      <p>标签：${escapeHtml(joinCSV(tags) || "未填写")}</p>
      <p class="sample-library-record-step">${escapeHtml(stepLabel)}</p>
    </button>
  `;
}

function getSampleLibraryRecordPreviewItems(items = []) {
  const normalizedItems = Array.isArray(items) ? items : [];

  if (normalizedItems.length <= SAMPLE_LIBRARY_RECORD_PREVIEW_LIMIT) {
    return normalizedItems;
  }

  const previewItems = normalizedItems.slice(0, SAMPLE_LIBRARY_RECORD_PREVIEW_LIMIT);
  const selectedId = String(appState.selectedSampleLibraryRecordId || "");

  if (!selectedId) {
    return previewItems;
  }

  const selectedIndex = normalizedItems.findIndex((item) => String(item?.id || "") === selectedId);

  if (selectedIndex === -1 || selectedIndex < SAMPLE_LIBRARY_RECORD_PREVIEW_LIMIT) {
    return previewItems;
  }

  return [...previewItems.slice(0, SAMPLE_LIBRARY_RECORD_PREVIEW_LIMIT - 1), normalizedItems[selectedIndex]];
}

function renderSampleLibraryList(items = []) {
  const listNode = byId("sample-library-record-list");
  const countNode = byId("sample-library-list-count");
  const previewOpenButton = byId("sample-library-record-preview-open-button");
  const previewItems = getSampleLibraryRecordPreviewItems(items);

  if (!listNode) {
    return;
  }

  if (countNode) {
    countNode.textContent = `${items.length} 条 · ${sampleLibraryFilterLabel(appState.sampleLibraryFilter)} · ${sampleLibraryCollectionFilterLabel(
      appState.sampleLibraryCollectionFilter
    )}`;
  }

  if (previewOpenButton) {
    previewOpenButton.hidden = items.length === 0;
  }

  listNode.innerHTML = items.length
    ? previewItems
        .map((item) =>
          buildSampleLibraryRecordCardMarkup(item, {
            isActive: String(item?.id || "") === appState.selectedSampleLibraryRecordId
          })
        )
        .join("")
    : '<div class="result-card muted">当前没有样本记录</div>';
}

function buildSampleLibraryRecordListModalMarkup(items = []) {
  const listMarkup = items.length
    ? items
        .map((item) =>
          buildSampleLibraryRecordCardMarkup(item, {
            action: "open-sample-library-record-from-modal",
            actionId: String(item?.id || ""),
            isActive: String(item?.id || "") === appState.selectedSampleLibraryRecordId
          })
        )
        .join("")
    : '<div class="result-card muted">当前没有样本记录</div>';

  return `
    <div class="sample-library-modal-stack">
      <section class="sample-library-modal-section">
        <div class="sample-library-modal-section-head">
          <strong>当前筛选下的完整记录列表</strong>
          <p>${escapeHtml(
            `${items.length} 条 · ${sampleLibraryFilterLabel(appState.sampleLibraryFilter)} · ${sampleLibraryCollectionFilterLabel(
              appState.sampleLibraryCollectionFilter
            )}`
          )}</p>
        </div>
        <div class="admin-list">${listMarkup}</div>
      </section>
    </div>
  `;
}

function renderSampleLibraryRecordListModal() {
  const filteredItems = filterSampleLibraryRecords(appState.sampleLibraryRecords);

  renderSampleLibraryModal({
    title: "全部记录列表",
    subtitle: "保留当前筛选条件，在弹窗里快速切换并打开具体记录。",
    body: buildSampleLibraryRecordListModalMarkup(filteredItems),
    cancelLabel: "关闭",
    hideSaveButton: true
  });
}

function openSampleLibraryRecordListModal() {
  appState.sampleLibraryModal = {
    kind: "record-list"
  };
  renderSampleLibraryRecordListModal();
}

function focusSampleLibraryRecordFromModal(recordId = "", step = "base") {
  closeSampleLibraryModal();
  openSampleLibraryRecord(recordId, step);
}

function openSampleLibraryRecordInlineEditorModal(recordId = "") {
  const items = filterSampleLibraryRecords(appState.sampleLibraryRecords);
  const selectedRecord =
    items.find((item) => String(item.id || "") === String(recordId || "")) ||
    items[0] ||
    null;
  const draft = buildSampleLibraryRecordInlineEditorDraft(selectedRecord || {});
  appState.selectedSampleLibraryRecordId = String(selectedRecord?.id || "");

  appState.sampleLibraryModal = {
    kind: "record-list-inline-editor",
    selectedRecordId: String(selectedRecord?.id || ""),
    draft,
    initialSnapshot: structuredClone(draft)
  };
  renderSampleLibraryRecordInlineEditorModal();
}

function buildSampleLibraryRecordInlineEditorDraft(record = {}) {
  const note = getSampleRecordNote(record) || {};
  const reference = getSampleRecordReference(record) || {};
  const publish = getSampleRecordPublish(record) || {};
  const calibration = getSampleRecordCalibration(record) || {};

  return {
    note: {
      title: String(note.title || ""),
      body: String(note.body || ""),
      coverText: String(note.coverText || ""),
      collectionType: String(getSampleRecordCollectionType(record) || ""),
      tags: Array.isArray(note.tags) ? [...note.tags] : []
    },
    reference: {
      enabled: reference.enabled === true,
      tier: String(reference.tier || ""),
      notes: String(reference.notes || "")
    },
    publish: {
      status: String(publish.status || "not_published") || "not_published",
      publishedAt: String(publish.publishedAt || ""),
      platformReason: String(publish.platformReason || ""),
      notes: String(publish.notes || ""),
      metrics: {
        likes: Number(publish?.metrics?.likes ?? 0) || 0,
        favorites: Number(publish?.metrics?.favorites ?? 0) || 0,
        comments: Number(publish?.metrics?.comments ?? 0) || 0,
        views: Number(publish?.metrics?.views ?? 0) || 0
      }
    },
    calibration: {
      prediction: {
        predictedStatus: String(calibration?.prediction?.predictedStatus || "not_published") || "not_published",
        predictedRiskLevel: String(calibration?.prediction?.predictedRiskLevel || ""),
        predictedPerformanceTier: String(calibration?.prediction?.predictedPerformanceTier || ""),
        confidence: Number(calibration?.prediction?.confidence ?? 0) || 0,
        reason: String(calibration?.prediction?.reason || ""),
        model: String(calibration?.prediction?.model || ""),
        createdAt: String(calibration?.prediction?.createdAt || "")
      },
      retro: {
        actualPerformanceTier: String(calibration?.retro?.actualPerformanceTier || ""),
        predictionMatched: calibration?.retro?.predictionMatched === true,
        missReason: String(calibration?.retro?.missReason || ""),
        validatedSignals: Array.isArray(calibration?.retro?.validatedSignals) ? [...calibration.retro.validatedSignals] : [],
        invalidatedSignals: Array.isArray(calibration?.retro?.invalidatedSignals) ? [...calibration.retro.invalidatedSignals] : [],
        shouldBecomeReference: calibration?.retro?.shouldBecomeReference === true,
        ruleImprovementCandidate: String(calibration?.retro?.ruleImprovementCandidate || ""),
        notes: String(calibration?.retro?.notes || ""),
        reviewedAt: String(calibration?.retro?.reviewedAt || "")
      }
    }
  };
}

function buildSampleLibraryRecordInlineEditorPatchPayload(recordId = "", draft = {}) {
  return {
    id: String(recordId || ""),
    note: {
      title: String(draft?.note?.title || ""),
      body: String(draft?.note?.body || ""),
      coverText: String(draft?.note?.coverText || ""),
      collectionType: String(draft?.note?.collectionType || ""),
      tags: Array.isArray(draft?.note?.tags) ? [...draft.note.tags] : []
    },
    reference: {
      enabled: draft?.reference?.enabled === true,
      tier: String(draft?.reference?.tier || ""),
      notes: String(draft?.reference?.notes || "")
    },
    publish: {
      status: String(draft?.publish?.status || "not_published") || "not_published",
      publishedAt: String(draft?.publish?.publishedAt || ""),
      platformReason: String(draft?.publish?.platformReason || ""),
      notes: String(draft?.publish?.notes || ""),
      metrics: {
        likes: Number(draft?.publish?.metrics?.likes ?? 0) || 0,
        favorites: Number(draft?.publish?.metrics?.favorites ?? 0) || 0,
        comments: Number(draft?.publish?.metrics?.comments ?? 0) || 0,
        views: Number(draft?.publish?.metrics?.views ?? 0) || 0
      }
    },
    calibration: {
      prediction: {
        predictedStatus: String(draft?.calibration?.prediction?.predictedStatus || "not_published") || "not_published",
        predictedRiskLevel: String(draft?.calibration?.prediction?.predictedRiskLevel || ""),
        predictedPerformanceTier: String(draft?.calibration?.prediction?.predictedPerformanceTier || ""),
        confidence: Number(draft?.calibration?.prediction?.confidence ?? 0) || 0,
        reason: String(draft?.calibration?.prediction?.reason || ""),
        model: String(draft?.calibration?.prediction?.model || ""),
        createdAt: String(draft?.calibration?.prediction?.createdAt || "")
      },
      retro: {
        actualPerformanceTier: String(draft?.calibration?.retro?.actualPerformanceTier || ""),
        predictionMatched: draft?.calibration?.retro?.predictionMatched === true,
        missReason: String(draft?.calibration?.retro?.missReason || ""),
        validatedSignals: Array.isArray(draft?.calibration?.retro?.validatedSignals) ? [...draft.calibration.retro.validatedSignals] : [],
        invalidatedSignals: Array.isArray(draft?.calibration?.retro?.invalidatedSignals)
          ? [...draft.calibration.retro.invalidatedSignals]
          : [],
        shouldBecomeReference: draft?.calibration?.retro?.shouldBecomeReference === true,
        ruleImprovementCandidate: String(draft?.calibration?.retro?.ruleImprovementCandidate || ""),
        notes: String(draft?.calibration?.retro?.notes || ""),
        reviewedAt: String(draft?.calibration?.retro?.reviewedAt || "")
      }
    }
  };
}

function isSampleLibraryRecordInlineEditorDirty({ draft = null, initialSnapshot = null } = {}) {
  return JSON.stringify(draft || {}) !== JSON.stringify(initialSnapshot || {});
}

function buildSampleLibraryRecordInlineEditorSidebarMarkup(items = [], modalState = {}) {
  const selectedRecordId = String(modalState?.selectedRecordId || "");
  const dirty = isSampleLibraryRecordInlineEditorDirty(modalState);
  const sidebarItemsMarkup = items.length
    ? items
        .map((item) => {
          const isActive = String(item.id || "") === selectedRecordId;
          const note = getSampleRecordNote(item);
          const publish = getSampleRecordPublish(item);
          const reference = getSampleRecordReference(item);

          return `
            <button
              type="button"
              class="sample-library-record-inline-editor-sidebar-item${isActive ? " is-active" : ""}"
              data-action="switch-sample-library-record-inline-editor-record"
              data-id="${escapeHtml(item.id || "")}"
            >
              <strong>${escapeHtml(getSampleRecordTitle(item) || "未命名样本记录")}</strong>
              <span>${escapeHtml(compactText(note.body || note.coverText || "未填写正文", 54))}</span>
              <span class="sample-library-record-inline-editor-sidebar-meta">
                ${escapeHtml(reference.enabled ? successTierLabel(reference.tier || "passed") : "未启用参考")} ·
                ${escapeHtml(publishStatusLabel(publish.status || "not_published"))}
              </span>
            </button>
          `;
        })
        .join("")
    : '<div class="result-card muted">当前筛选下没有记录。</div>';

  return `
    <aside class="sample-library-record-inline-editor-sidebar-panel">
      <div class="sample-library-record-inline-editor-sidebar-head">
        <strong>当前筛选记录</strong>
        <p>${escapeHtml(
          `${items.length} 条 · ${sampleLibraryFilterLabel(appState.sampleLibraryFilter)} · ${sampleLibraryCollectionFilterLabel(
            appState.sampleLibraryCollectionFilter
          )}`
        )}</p>
        <p class="helper-text">${dirty ? "当前记录有未保存修改，切换前请先保存。" : "左侧切换记录，右侧统一编辑四块信息。"}</p>
      </div>
      <div class="sample-library-record-inline-editor-sidebar-list">${sidebarItemsMarkup}</div>
    </aside>
  `;
}

function readSampleLibraryRecordInlineEditorDraftFromModal() {
  const modalState = appState.sampleLibraryModal;
  const contentNode = byId("sample-library-modal-content");
  const noteTags = splitCSV(contentNode?.querySelector('[name="tags"]')?.value || "");
  const referenceTier = String(contentNode?.querySelector('[name="tier"]')?.value || "").trim();
  const referenceEnabled = contentNode?.querySelector('[name="enabled"]')?.checked === true || Boolean(referenceTier);

  return {
    note: {
      title: contentNode?.querySelector('[name="title"]')?.value || "",
      body: contentNode?.querySelector('[name="body"]')?.value || "",
      coverText: contentNode?.querySelector('[name="coverText"]')?.value || "",
      collectionType: contentNode?.querySelector('[name="collectionType"]')?.value || "",
      tags: noteTags
    },
    reference: {
      enabled: referenceEnabled,
      tier: referenceEnabled ? referenceTier || "passed" : "",
      notes: contentNode?.querySelector('[name="referenceNotes"]')?.value || ""
    },
    publish: {
      status: contentNode?.querySelector('[name="status"]')?.value || "not_published",
      publishedAt: contentNode?.querySelector('[name="publishedAt"]')?.value || "",
      platformReason: contentNode?.querySelector('[name="platformReason"]')?.value || "",
      notes: contentNode?.querySelector('[name="publishNotes"]')?.value || "",
      metrics: {
        likes: Number(contentNode?.querySelector('[name="likes"]')?.value || 0) || 0,
        favorites: Number(contentNode?.querySelector('[name="favorites"]')?.value || 0) || 0,
        comments: Number(contentNode?.querySelector('[name="comments"]')?.value || 0) || 0,
        views: Number(contentNode?.querySelector('[name="views"]')?.value || 0) || 0
      }
    },
    calibration: {
      prediction: {
        predictedStatus: contentNode?.querySelector('[name="predictedStatus"]')?.value || "not_published",
        predictedRiskLevel: contentNode?.querySelector('[name="predictedRiskLevel"]')?.value || "",
        predictedPerformanceTier: contentNode?.querySelector('[name="predictedPerformanceTier"]')?.value || "",
        confidence: Number(contentNode?.querySelector('[name="predictionConfidence"]')?.value || 0) || 0,
        reason: contentNode?.querySelector('[name="predictionReason"]')?.value || "",
        model: contentNode?.querySelector('[name="predictionModel"]')?.value || "",
        createdAt: contentNode?.querySelector('[name="predictionCreatedAt"]')?.value || ""
      },
      retro: {
        actualPerformanceTier: contentNode?.querySelector('[name="actualPerformanceTier"]')?.value || "",
        predictionMatched: contentNode?.querySelector('[name="predictionMatched"]')?.checked === true,
        missReason: contentNode?.querySelector('[name="missReason"]')?.value || "",
        validatedSignals: splitCSV(contentNode?.querySelector('[name="validatedSignals"]')?.value || ""),
        invalidatedSignals: splitCSV(contentNode?.querySelector('[name="invalidatedSignals"]')?.value || ""),
        shouldBecomeReference: contentNode?.querySelector('[name="shouldBecomeReference"]')?.checked === true,
        ruleImprovementCandidate: contentNode?.querySelector('[name="ruleImprovementCandidate"]')?.value || "",
        notes: contentNode?.querySelector('[name="retroNotes"]')?.value || "",
        reviewedAt: contentNode?.querySelector('[name="reviewedAt"]')?.value || ""
      }
    },
    recordId: String(modalState?.selectedRecordId || "")
  };
}

function buildSampleLibraryRecordInlineEditorModalMarkup({ items = [], modalState = {} } = {}) {
  const selectedRecord =
    items.find((item) => String(item.id || "") === String(modalState?.selectedRecordId || "")) ||
    items[0] ||
    null;
  const draft = modalState?.draft || buildSampleLibraryRecordInlineEditorDraft(selectedRecord || {});
  const comparisonMatched = draft?.calibration?.retro?.predictionMatched === true;

  return `
    <div class="sample-library-record-inline-editor-layout">
      <!-- data-action="switch-sample-library-record-inline-editor-record" -->
      <div class="sample-library-record-inline-editor-sidebar">
        ${buildSampleLibraryRecordInlineEditorSidebarMarkup(items, modalState)}
      </div>
      <div class="sample-library-record-inline-editor-detail">
        ${
          selectedRecord
            ? `
              <div class="sample-library-record-inline-editor-detail-head">
                <div>
                  <strong>${escapeHtml(getSampleRecordTitle(selectedRecord) || "未命名样本记录")}</strong>
                  <p>${escapeHtml(compactText(draft.note.body || draft.note.coverText || "未填写正文", 160))}</p>
                </div>
                <div class="item-actions">
                  <button
                    type="button"
                    class="button button-danger button-small"
                    data-action="open-sample-library-delete-modal"
                    data-id="${escapeHtml(selectedRecord.id || "")}"
                  >
                    删除记录
                  </button>
                </div>
              </div>
              <p class="helper-text">四块信息会在点击“保存整条记录”后统一提交到这条学习样本。</p>
              <div class="sample-library-modal-stack compact-form">
                ${buildSampleLibraryBaseEditorSectionMarkup({
                  title: draft.note.title,
                  body: draft.note.body,
                  coverText: draft.note.coverText,
                  collectionType: draft.note.collectionType,
                  tags: draft.note.tags
                })}
                ${buildSampleLibraryReferenceEditorSectionMarkup(draft.reference, { notesFieldName: "referenceNotes" })}
                ${buildSampleLibraryLifecycleEditorSectionMarkup(draft.publish, { notesFieldName: "publishNotes" })}
                ${buildSampleLibraryCalibrationEditorSectionsMarkup({
                  prediction: draft.calibration.prediction,
                  retro: draft.calibration.retro,
                  comparisonStatusLabel: predictionMatchedLabel(comparisonMatched),
                  missReasonSuggestion: draft.calibration.retro.missReason
                })}
              </div>
            `
            : '<div class="result-card muted">当前筛选下没有可编辑的记录。</div>'
        }
      </div>
    </div>
  `;
}

function renderSampleLibraryRecordInlineEditorModal() {
  const items = filterSampleLibraryRecords(appState.sampleLibraryRecords);

  renderSampleLibraryModal({
    title: "完整记录内联编辑",
    subtitle: "左侧切换记录，右侧一次性查看并编辑基础内容、参考属性、生命周期和预判复盘。",
    body: buildSampleLibraryRecordInlineEditorModalMarkup({
      items,
      modalState: appState.sampleLibraryModal || {}
    }),
    saveLabel: "保存整条记录",
    cancelLabel: "关闭"
  });
}

function buildSampleLibraryRecordInlineEditorSwitchConfirmModalMarkup(returnTo = null) {
  const selectedRecordId = String(returnTo?.selectedRecordId || "");
  const record =
    appState.sampleLibraryRecords.find((item) => String(item?.id || "") === selectedRecordId) ||
    appState.sampleLibraryRecords[0] ||
    null;

  return `
    <div class="sample-library-modal-stack">
      <section class="sample-library-modal-section">
        <div class="sample-library-modal-section-head">
          <strong>是否切换并丢弃未保存修改？</strong>
          <p>继续切换后，当前这条记录里尚未保存的修改会被丢弃，你可以先返回编辑再决定是否保存。</p>
        </div>
        <article class="sample-library-detail-summary-card">
          <strong>${escapeHtml(getSampleRecordTitle(record) || "未命名样本记录")}</strong>
          <p>${escapeHtml(compactText(returnTo?.draft?.note?.body || returnTo?.draft?.note?.coverText || getSampleRecordBody(record), 180) || "未填写正文")}</p>
        </article>
      </section>
    </div>
  `;
}

function renderSampleLibraryRecordInlineEditorSwitchConfirmModal() {
  const returnTo = appState.sampleLibraryModal?.returnTo || null;

  renderSampleLibraryModal({
    title: "切换前确认",
    subtitle: "这次切换不会保存当前内联编辑中的未提交修改。",
    body: buildSampleLibraryRecordInlineEditorSwitchConfirmModalMarkup(returnTo),
    saveLabel: "继续切换",
    cancelLabel: "返回编辑"
  });
}

function buildSampleLibraryRecordInlineEditorCloseConfirmModalMarkup(returnTo = null) {
  const selectedRecordId = String(returnTo?.selectedRecordId || "");
  const record =
    appState.sampleLibraryRecords.find((item) => String(item?.id || "") === selectedRecordId) ||
    appState.sampleLibraryRecords[0] ||
    null;

  return `
    <div class="sample-library-modal-stack">
      <section class="sample-library-modal-section">
        <div class="sample-library-modal-section-head">
          <strong>是否关闭并丢弃未保存修改？</strong>
          <p>继续关闭后，当前这条记录里尚未保存的修改会被丢弃，你可以先返回编辑再决定是否保存。</p>
        </div>
        <article class="sample-library-detail-summary-card">
          <strong>${escapeHtml(getSampleRecordTitle(record) || "未命名样本记录")}</strong>
          <p>${escapeHtml(compactText(returnTo?.draft?.note?.body || returnTo?.draft?.note?.coverText || getSampleRecordBody(record), 180) || "未填写正文")}</p>
        </article>
      </section>
    </div>
  `;
}

function renderSampleLibraryRecordInlineEditorCloseConfirmModal() {
  const returnTo = appState.sampleLibraryModal?.returnTo || null;

  renderSampleLibraryModal({
    title: "关闭前确认",
    subtitle: "这次关闭不会保存当前内联编辑中的未提交修改。",
    body: buildSampleLibraryRecordInlineEditorCloseConfirmModalMarkup(returnTo),
    saveLabel: "继续关闭",
    cancelLabel: "返回编辑"
  });
}

function requestSampleLibraryRecordInlineEditorSwitch(recordId = "") {
  const modalState = appState.sampleLibraryModal;

  if (modalState?.kind !== "record-list-inline-editor") {
    return;
  }

  const nextState = {
    ...modalState,
    draft: readSampleLibraryRecordInlineEditorDraftFromModal()
  };

  if (isSampleLibraryRecordInlineEditorDirty(nextState)) {
    appState.sampleLibraryModal = {
      kind: "record-list-inline-editor-switch-confirm",
      returnTo: nextState,
      targetRecordId: String(recordId || "")
    };
    renderSampleLibraryRecordInlineEditorSwitchConfirmModal();
    return;
  }

  openSampleLibraryRecordInlineEditorModal(recordId);
}

function requestCloseSampleLibraryRecordInlineEditorModal() {
  const modalState = appState.sampleLibraryModal;

  if (modalState?.kind === "record-list-inline-editor-switch-confirm" && modalState.returnTo?.kind === "record-list-inline-editor") {
    appState.sampleLibraryModal = modalState.returnTo;
    renderSampleLibraryRecordInlineEditorModal();
    return;
  }

  if (modalState?.kind === "record-list-inline-editor-close-confirm" && modalState.returnTo?.kind === "record-list-inline-editor") {
    appState.sampleLibraryModal = modalState.returnTo;
    renderSampleLibraryRecordInlineEditorModal();
    return;
  }

  if (modalState?.kind === "delete-record" && modalState.returnTo?.kind === "record-list-inline-editor") {
    appState.sampleLibraryModal = modalState.returnTo;
    renderSampleLibraryRecordInlineEditorModal();
    return;
  }

  if (modalState?.kind !== "record-list-inline-editor") {
    closeSampleLibraryModal();
    return;
  }

  const nextState = {
    ...modalState,
    draft: readSampleLibraryRecordInlineEditorDraftFromModal()
  };

  if (isSampleLibraryRecordInlineEditorDirty(nextState)) {
    appState.sampleLibraryModal = {
      kind: "record-list-inline-editor-close-confirm",
      returnTo: nextState
    };
    renderSampleLibraryRecordInlineEditorCloseConfirmModal();
    return;
  }

  closeSampleLibraryModal();
}

function saveSampleLibraryRecordInlineEditorSwitchConfirmModal() {
  const modalState = appState.sampleLibraryModal;

  if (modalState?.kind !== "record-list-inline-editor-switch-confirm") {
    return;
  }

  openSampleLibraryRecordInlineEditorModal(modalState.targetRecordId);
}

function saveSampleLibraryRecordInlineEditorCloseConfirmModal() {
  closeSampleLibraryModal();
}

async function saveSampleLibraryRecordInlineEditorModal() {
  const modalState = appState.sampleLibraryModal;

  if (modalState?.kind !== "record-list-inline-editor" || !modalState.selectedRecordId) {
    return;
  }

  const draft = readSampleLibraryRecordInlineEditorDraftFromModal();
  const payload = buildSampleLibraryRecordInlineEditorPatchPayload(modalState.selectedRecordId, draft);
  const response = await apiJson(sampleLibraryApi, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });

  appState.sampleLibraryRecords = Array.isArray(response.items) ? response.items : appState.sampleLibraryRecords;
  appState.selectedSampleLibraryRecordId = String(response.item?.id || modalState.selectedRecordId || "");
  appState.sampleLibraryModal = {
    ...modalState,
    selectedRecordId: String(response.item?.id || modalState.selectedRecordId || ""),
    draft,
    initialSnapshot: structuredClone(draft)
  };
  renderSampleLibraryWorkspace();
  renderSampleLibraryRecordInlineEditorModal();
  setSampleLibraryModalMessage("整条记录已保存。");
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

function buildSampleLibraryDetailSummaryCardMarkup({
  title = "",
  summary = "",
  pills = [],
  pillsClassName = "meta-row",
  pillClassName = "meta-pill",
  actionMarkup = "",
  hintId = ""
} = {}) {
  const pillMarkup = Array.isArray(pills) && pills.length
    ? `<div class="${escapeHtml(pillsClassName)}">${pills
        .map((item) => `<span class="${escapeHtml(pillClassName)}">${escapeHtml(item)}</span>`)
        .join("")}</div>`
    : "";

  return `
    <article class="sample-library-detail-summary-card">
      <div>
        <strong>${escapeHtml(title)}</strong>
        <p>${escapeHtml(summary)}</p>
      </div>
      ${pillMarkup}
      <div class="item-actions">
        ${actionMarkup}
      </div>
      ${hintId ? `<p class="helper-text action-gate-hint" id="${escapeHtml(hintId)}" aria-live="polite"></p>` : ""}
    </article>
  `;
}

function buildSampleLibraryModalTagPickerMarkup(tags = []) {
  const selectedMarkup = buildAnalyzeTagSelectionMarkup(tags);

  return `
    <div class="tag-picker field-wide sample-library-modal-tag-picker">
      <input name="tags" type="hidden" value="${escapeHtml(joinCSV(tags))}" />
      <button
        type="button"
        class="tag-picker-trigger sample-library-modal-tag-trigger"
        aria-expanded="false"
        aria-controls="sample-library-modal-tag-dropdown"
      >
        <span class="tag-picker-trigger-head">
          <span class="tag-picker-trigger-label">标签</span>
          <span class="tag-picker-trigger-caret" aria-hidden="true">▾</span>
        </span>
        <span class="tag-picker-selected sample-library-modal-tag-selected" role="group" aria-label="已选标签" aria-live="polite">
          ${selectedMarkup}
        </span>
      </button>
      <div class="tag-picker-dropdown sample-library-modal-tag-dropdown" id="sample-library-modal-tag-dropdown" hidden>
        <div class="tag-picker-dropdown-head">
          <strong>选择预置标签</strong>
          <button type="button" class="tag-picker-clear sample-library-modal-tag-clear">清空</button>
        </div>
        <div class="tag-picker-options sample-library-modal-tag-options"></div>
        <div class="tag-picker-custom">
          <input type="text" class="sample-library-modal-tag-custom" placeholder="输入自定义标签" />
          <button type="button" class="button button-ghost button-small sample-library-modal-tag-add">添加</button>
        </div>
      </div>
    </div>
  `;
}

function buildSampleLibraryModalSectionMarkup({ title = "", description = "", body = "", className = "" } = {}) {
  return `
    <section class="sample-library-modal-section${className ? ` ${className}` : ""}">
      <div class="sample-library-modal-section-head">
        <strong>${escapeHtml(title)}</strong>
        <p>${escapeHtml(description)}</p>
      </div>
      ${body}
    </section>
  `;
}

function buildSampleLibraryBaseEditorSectionMarkup({
  title = "",
  body = "",
  coverText = "",
  collectionType = "",
  tags = [],
  views = 0,
  includeViews = false,
  includePrefillActions = false
} = {}) {
  const bodyMarkup = `
        <label>
          <span>标题</span>
          <input name="title" value="${escapeHtml(title)}" placeholder="样本标题" />
        </label>
        <label>
          <span>正文</span>
          <textarea name="body" rows="6" placeholder="样本正文">${escapeHtml(body)}</textarea>
        </label>
        <label>
          <span>封面文案</span>
          <input name="coverText" value="${escapeHtml(coverText)}" placeholder="封面文案" />
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
        <div class="sample-library-create-metrics">
          ${buildSampleLibraryModalTagPickerMarkup(tags)}
          ${
            includeViews
              ? `
                <label>
                  <span>浏览数</span>
                  <input name="views" type="number" min="0" value="${escapeHtml(String(views || 0))}" placeholder="浏览数" />
                </label>
              `
              : ""
          }
        </div>
        ${
          includePrefillActions
            ? `
              <div class="inline-actions inline-actions-row">
                <button type="button" class="button button-ghost" data-action="prefill-sample-library-create-analysis">
                  从当前检测填充
                </button>
                <button type="button" class="button button-ghost" data-action="prefill-sample-library-create-rewrite">
                  从当前改写填充
                </button>
              </div>
            `
            : ""
        }
  `;

  return buildSampleLibraryModalSectionMarkup({
    title: "基础内容",
    description: "先把标题、正文、封面文案和标签整理好，后续筛选都会基于这里。",
    body: bodyMarkup
  });
}

function buildSampleLibraryNoteModalMarkup(options = {}) {
  return `
    <div class="sample-library-modal-stack compact-form">
      ${buildSampleLibraryBaseEditorSectionMarkup(options)}
    </div>
  `;
}

function buildSampleLibraryCreateModalMarkup() {
  return buildSampleLibraryNoteModalMarkup({
    includeViews: true,
    includePrefillActions: true
  });
}

function buildSampleLibraryBaseModalMarkup(record = {}) {
  const note = getSampleRecordNote(record);

  return buildSampleLibraryNoteModalMarkup({
    title: note.title || "",
    body: note.body || "",
    coverText: note.coverText || "",
    collectionType: getSampleRecordCollectionType(record),
    tags: note.tags || []
  });
}

function readSampleLibraryCreateModalPayload() {
  const contentNode = byId("sample-library-modal-content");

  return {
    title: contentNode?.querySelector('[name="title"]')?.value || "",
    body: contentNode?.querySelector('[name="body"]')?.value || "",
    coverText: contentNode?.querySelector('[name="coverText"]')?.value || "",
    collectionType: contentNode?.querySelector('[name="collectionType"]')?.value || "",
    tags: splitCSV(contentNode?.querySelector('[name="tags"]')?.value || ""),
    views: contentNode?.querySelector('[name="views"]')?.value || 0
  };
}

function readSampleLibraryModalBasePayload() {
  const contentNode = byId("sample-library-modal-content");

  return {
    title: contentNode?.querySelector('[name="title"]')?.value || "",
    body: contentNode?.querySelector('[name="body"]')?.value || "",
    coverText: contentNode?.querySelector('[name="coverText"]')?.value || "",
    collectionType: contentNode?.querySelector('[name="collectionType"]')?.value || "",
    tags: splitCSV(contentNode?.querySelector('[name="tags"]')?.value || "")
  };
}

function getSampleLibraryCreateRequirementMessage(root = byId("sample-library-modal-content")) {
  const title = String(root?.querySelector('[name="title"]')?.value || "").trim();
  const body = String(root?.querySelector('[name="body"]')?.value || "").trim();
  const coverText = String(root?.querySelector('[name="coverText"]')?.value || "").trim();
  const collectionType = String(root?.querySelector('[name="collectionType"]')?.value || "").trim();

  if (!title && !body && !coverText) {
    return "请至少填写标题、正文或封面文案。";
  }

  if (!collectionType) {
    return "请先选择合集类型。";
  }

  return "";
}

function openSampleLibraryCreateModal() {
  appState.sampleLibraryModal = {
    kind: "create"
  };

  renderSampleLibraryModal({
    title: "新增学习样本",
    subtitle: "先保存基础内容，后续再继续补参考属性和生命周期属性。",
    body: buildSampleLibraryCreateModalMarkup(),
    saveLabel: "保存学习样本"
  });
}

function fillSampleLibraryCreateModalFromCurrent(source = "analysis") {
  const contentNode = byId("sample-library-modal-content");
  const payload = appState.latestAnalyzePayload || {};
  const rewrite = source === "rewrite" && appState.latestRewrite ? normalizeRewritePayload(appState.latestRewrite) : null;

  if (!contentNode) {
    return;
  }

  const fieldValues = {
    title: rewrite?.title || payload.title || "",
    body: rewrite?.body || payload.body || "",
    coverText: rewrite?.coverText || payload.coverText || "",
    collectionType: rewrite?.collectionType || payload.collectionType || ""
  };
  const nextTags = rewrite?.tags?.length ? rewrite.tags : payload.tags || [];

  Object.entries(fieldValues).forEach(([name, value]) => {
    const field = contentNode.querySelector(`[name="${name}"]`);
    if (
      field instanceof HTMLInputElement ||
      field instanceof HTMLSelectElement ||
      field instanceof HTMLTextAreaElement
    ) {
      field.value = value;
    }
  });

  writeSampleLibraryModalTags(nextTags);
}

async function saveSampleLibraryCreateModal() {
  const requirementMessage = getSampleLibraryCreateRequirementMessage();

  if (requirementMessage) {
    throw new Error(requirementMessage);
  }

  const payload = readSampleLibraryCreateModalPayload();
  const response = await apiJson(sampleLibraryApi, {
    method: "POST",
    body: JSON.stringify({
      source: "manual",
      note: {
        title: payload.title,
        body: payload.body,
        coverText: payload.coverText,
        collectionType: payload.collectionType,
        tags: payload.tags
      },
      publish: {
        metrics: {
          views: payload.views || 0
        }
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

  if (byId("sample-library-search-input")) {
    byId("sample-library-search-input").value = "";
  }
  if (byId("sample-library-filter")) {
    byId("sample-library-filter").value = "all";
  }
  if (byId("sample-library-collection-filter")) {
    byId("sample-library-collection-filter").value = "all";
  }

  renderSampleLibraryWorkspace();
  byId("sample-library-create-result").innerHTML = '<div class="result-card-shell">样本记录已保存，可继续补参考属性和生命周期属性。</div>';
  renderCollectionTypeSelectors();
}

function openSampleLibraryBaseModal(recordId = "") {
  const record = appState.sampleLibraryRecords.find((item) => String(item.id || "") === String(recordId || ""));

  if (!record) {
    return;
  }

  appState.sampleLibraryModal = {
    kind: "base",
    recordId: String(record.id || "")
  };

  renderSampleLibraryModal({
    title: "编辑基础内容",
    subtitle: getSampleRecordTitle(record) || "补充标题、正文、封面文案和标签",
    body: buildSampleLibraryBaseModalMarkup(record),
    saveLabel: "保存基础内容"
  });
}

function buildSampleLibraryDeleteModalMarkup(record = {}) {
  return `
    <div class="sample-library-modal-stack">
      <section class="sample-library-modal-section">
        <div class="sample-library-modal-section-head">
          <strong>确认删除这条学习样本？</strong>
          <p>删除后这条记录会从学习样本列表中移除，相关参考属性和生命周期回填也会一起消失。</p>
        </div>
        <article class="sample-library-detail-summary-card">
          <strong>${escapeHtml(getSampleRecordTitle(record) || "未命名样本记录")}</strong>
          <p>${escapeHtml(compactText(getSampleRecordBody(record) || getSampleRecordCoverText(record), 180) || "未填写正文")}</p>
        </article>
      </section>
    </div>
  `;
}

function openSampleLibraryDeleteModal(recordId = "") {
  const record = appState.sampleLibraryRecords.find((item) => String(item.id || "") === String(recordId || ""));
  const returnTo = appState.sampleLibraryModal?.kind === "record-list-inline-editor" ? { ...appState.sampleLibraryModal } : null;

  if (!record) {
    return;
  }

  appState.sampleLibraryModal = {
    kind: "delete-record",
    recordId: String(record.id || ""),
    returnTo
  };

  renderSampleLibraryModal({
    title: "删除学习样本",
    subtitle: "请确认这次删除操作。",
    body: buildSampleLibraryDeleteModalMarkup(record),
    saveLabel: "确认删除"
  });
}

function buildSampleLibraryReferenceEditorSectionMarkup(reference = {}, { notesFieldName = "notes" } = {}) {
  return buildSampleLibraryModalSectionMarkup({
    title: "参考属性",
    description: getReferenceThresholdReferenceDescription(),
    body: `
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
        <textarea name="${escapeHtml(notesFieldName)}" rows="3" placeholder="例如：适合作为情绪沟通类参考">${escapeHtml(
          reference.notes || ""
        )}</textarea>
      </label>
    `
  });
}

function buildFeedbackRuleQueueModalMarkup(modalState = {}) {
  return `
    <div class="sample-library-modal-stack compact-form">
      <section class="sample-library-modal-section">
        <div class="sample-library-modal-section-head">
          <strong>加入规则复核</strong>
          <p>先确认这次要带过去的候选词、语境和平台原因，再跳转到规则维护。</p>
        </div>
        <label>
          <span>候选词</span>
          <input name="source" value="${escapeHtml(modalState.source || "")}" placeholder="候选词" />
        </label>
        <label>
          <span>语境分类</span>
          <input name="category" value="${escapeHtml(modalState.category || "")}" placeholder="待人工判断" />
        </label>
        <label>
          <span>平台原因</span>
          <textarea name="xhsReason" rows="3" placeholder="补充平台原因">${escapeHtml(modalState.xhsReason || "")}</textarea>
        </label>
      </section>
    </div>
  `;
}

function openFeedbackRuleQueueModal({
  source = "",
  category = "待人工判断",
  xhsReason = ""
} = {}) {
  appState.sampleLibraryModal = {
    kind: "feedback-rule-queue",
    source,
    category,
    xhsReason
  };

  renderSampleLibraryModal({
    title: "确认规则复核草稿",
    subtitle: "确认后会自动跳转到规则维护并预填表单。",
    body: buildFeedbackRuleQueueModalMarkup(appState.sampleLibraryModal),
    saveLabel: "确认并前往规则维护"
  });
}

function readFeedbackRuleQueueModalPayload() {
  const contentNode = byId("sample-library-modal-content");

  return {
    source: contentNode?.querySelector('[name="source"]')?.value || "",
    category: contentNode?.querySelector('[name="category"]')?.value || "",
    xhsReason: contentNode?.querySelector('[name="xhsReason"]')?.value || ""
  };
}

async function saveFeedbackRuleQueueModal() {
  const modalState = appState.sampleLibraryModal;
  const payload = readFeedbackRuleQueueModalPayload();

  if (!String(payload.source || "").trim() && !String(payload.category || "").trim()) {
    throw new Error("请至少确认候选词或语境分类。");
  }

  openLexiconWorkspaceModal("custom", {
    prefill: {
      match: "exact",
      source: payload.source || "",
      category: payload.category || "待人工判断",
      riskLevel: "manual_review",
      lexiconLevel: inferLexiconLevel("", "manual_review"),
      xhsReason: payload.xhsReason || modalState?.xhsReason || ""
    },
    resultMessage: "已根据反馈预填规则草稿，请确认后保存，或回到人工复核队列继续处理。"
  });
}

function buildFeedbackFalsePositiveModalMarkup(modalState = {}) {
  return `
    <div class="sample-library-modal-stack compact-form">
      <section class="sample-library-modal-section">
        <div class="sample-library-modal-section-head">
          <strong>记录为误报案例</strong>
          <p>先确认标题、正文摘要和备注，再把它转入误报待确认列表。</p>
        </div>
        <article class="sample-library-detail-summary-card">
          <strong>${escapeHtml(modalState.title || "未命名反馈")}</strong>
          <p>${escapeHtml(compactText(modalState.body || "", 180) || "未填写正文")}</p>
        </article>
        ${buildSampleLibraryModalTagPickerMarkup(modalState.tags || [])}
        <label>
          <span>备注</span>
          <textarea name="userNotes" rows="3" placeholder="补充误报备注">${escapeHtml(modalState.userNotes || "")}</textarea>
        </label>
      </section>
    </div>
  `;
}

function openFeedbackFalsePositiveModal({
  title = "",
  body = "",
  tags = [],
  userNotes = "",
  analysisVerdict = "",
  analysisScore = 0,
  noteId = "",
  createdAt = ""
} = {}) {
  appState.sampleLibraryModal = {
    kind: "feedback-false-positive",
    title,
    body,
    tags,
    userNotes,
    analysisVerdict,
    analysisScore,
    noteId,
    createdAt
  };

  renderSampleLibraryModal({
    title: "确认误报案例",
    subtitle: "确认后会把这条反馈转入误报待确认列表。",
    body: buildFeedbackFalsePositiveModalMarkup(appState.sampleLibraryModal),
    saveLabel: "确认记录为误报"
  });
}

function readFeedbackFalsePositiveModalPayload() {
  const contentNode = byId("sample-library-modal-content");

  return {
    tags: splitCSV(contentNode?.querySelector('[name="tags"]')?.value || ""),
    userNotes: contentNode?.querySelector('[name="userNotes"]')?.value || ""
  };
}

async function saveFeedbackFalsePositiveModal() {
  const modalState = appState.sampleLibraryModal;
  const payload = readFeedbackFalsePositiveModalPayload();
  const analysisVerdict = String(modalState?.analysisVerdict || "").trim();
  const analysisScore = Number(modalState?.analysisScore || 0);
  const response = await apiJson("/api/false-positive-log", {
    method: "POST",
    body: JSON.stringify({
      source: "feedback_log",
      title: modalState?.title || "",
      body: modalState?.body || "",
      tags: payload.tags,
      status: "platform_passed_pending",
      userNotes: payload.userNotes || modalState?.userNotes || "由违规反馈回流记录",
      analysis: analysisVerdict
        ? {
            verdict: analysisVerdict,
            score: Number.isFinite(analysisScore) ? analysisScore : 0,
            categories: payload.tags
          }
        : undefined
    })
  });

  renderFalsePositiveLog(response.items || []);
  await apiJson("/api/admin/feedback", {
    method: "DELETE",
    body: JSON.stringify({
      noteId: modalState.noteId,
      createdAt: modalState.createdAt
    })
  });
  await refreshAll();
  ensureSupportWorkspaceOpen();
  revealSampleLibraryReflowPane();
  byId("false-positive-summary")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function buildSampleLibraryReferenceModalMarkup(record) {
  const reference = getSampleRecordReference(record);

  return `
    <div class="sample-library-modal-stack compact-form">
      ${buildSampleLibraryReferenceEditorSectionMarkup(reference)}
    </div>
  `;
}

function buildSampleLibraryLifecycleEditorSectionMarkup(publish = {}, { notesFieldName = "notes" } = {}) {
  return buildSampleLibraryModalSectionMarkup({
    title: "生命周期属性",
    description: "发布后回填结果，便于后续判断哪些内容真正可复用。",
    body: `
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
          <label>
            <span>浏览数</span>
            <input name="views" type="number" min="0" value="${escapeHtml(String(publish.metrics.views || 0))}" />
          </label>
        </div>
        <label class="field-wide">
          <span>平台原因</span>
          <input name="platformReason" value="${escapeHtml(publish.platformReason || "")}" placeholder="例如：疑似导流、低俗等" />
        </label>
        <label class="field-wide">
          <span>回填备注</span>
          <textarea name="${escapeHtml(notesFieldName)}" rows="3" placeholder="例如：发布 24h 后稳定通过">${escapeHtml(
            publish.notes || ""
          )}</textarea>
        </label>
    `
  });
}

function buildSampleLibraryLifecycleModalMarkup(record) {
  const publish = getSampleRecordPublish(record);

  return `
    <div class="sample-library-modal-stack compact-form">
      ${buildSampleLibraryLifecycleEditorSectionMarkup(publish)}
    </div>
  `;
}

function buildSampleLibraryCalibrationEditorSectionsMarkup({
  prediction = {},
  retro = {},
  comparisonStatusLabel = "待复盘",
  missReasonSuggestion = ""
} = {}) {
  return `
      ${buildSampleLibraryModalSectionMarkup({
        title: "发布前预判",
        description: "这部分用于锁定当时的判断基线。",
        body: `
        <div class="lifecycle-primary-grid">
          <label>
            <span>预判发布状态</span>
            <select name="predictedStatus">
              <option value="not_published"${prediction.predictedStatus === "not_published" ? " selected" : ""}>未发布</option>
              <option value="published_passed"${prediction.predictedStatus === "published_passed" ? " selected" : ""}>已发布通过</option>
              <option value="limited"${prediction.predictedStatus === "limited" ? " selected" : ""}>疑似限流</option>
              <option value="violation"${prediction.predictedStatus === "violation" ? " selected" : ""}>平台判违规</option>
              <option value="false_positive"${prediction.predictedStatus === "false_positive" ? " selected" : ""}>系统误报 / 平台放行</option>
              <option value="positive_performance"${prediction.predictedStatus === "positive_performance" ? " selected" : ""}>过审且表现好</option>
            </select>
          </label>
          <label>
            <span>预判风险</span>
            <select name="predictedRiskLevel">
              <option value=""${!prediction.predictedRiskLevel ? " selected" : ""}>未预判</option>
              <option value="low"${prediction.predictedRiskLevel === "low" ? " selected" : ""}>低风险</option>
              <option value="medium"${prediction.predictedRiskLevel === "medium" ? " selected" : ""}>中风险</option>
              <option value="high"${prediction.predictedRiskLevel === "high" ? " selected" : ""}>高风险</option>
            </select>
          </label>
        </div>
        <div class="lifecycle-primary-grid">
          <label>
            <span>预判表现</span>
            <select name="predictedPerformanceTier">
              <option value=""${!prediction.predictedPerformanceTier ? " selected" : ""}>未判断</option>
              <option value="low"${prediction.predictedPerformanceTier === "low" ? " selected" : ""}>低表现</option>
              <option value="medium"${prediction.predictedPerformanceTier === "medium" ? " selected" : ""}>中等表现</option>
              <option value="high"${prediction.predictedPerformanceTier === "high" ? " selected" : ""}>高表现</option>
            </select>
          </label>
          <label>
            <span>置信度</span>
            <input name="predictionConfidence" type="number" min="0" max="100" value="${escapeHtml(String(prediction.confidence || 0))}" />
          </label>
        </div>
        <div class="lifecycle-primary-grid">
          <label>
            <span>预判模型</span>
            <input name="predictionModel" value="${escapeHtml(prediction.model || "")}" placeholder="例如：gpt-5.4" />
          </label>
          <label>
            <span>预判时间</span>
            <input name="predictionCreatedAt" type="date" value="${escapeHtml(String(prediction.createdAt || "").slice(0, 10))}" />
          </label>
        </div>
        <label>
          <span>预判理由</span>
          <textarea name="predictionReason" rows="3" placeholder="例如：标题结构接近高表现样本，但正文风险较低">${escapeHtml(
            prediction.reason || ""
          )}</textarea>
        </label>
        <div class="item-actions">
          <button type="button" class="button button-ghost button-small" data-action="prefill-sample-library-modal-calibration-prediction">
            从当前检测预填预判
          </button>
        </div>
      `
      })}
      ${buildSampleLibraryModalSectionMarkup({
        title: "发布后复盘",
        description: "把真实结果和偏差原因转成后续可用的判断经验。",
        body: `
        <div class="lifecycle-primary-grid">
          <label>
            <span>实际表现</span>
            <select name="actualPerformanceTier">
              <option value=""${!retro.actualPerformanceTier ? " selected" : ""}>未判断</option>
              <option value="low"${retro.actualPerformanceTier === "low" ? " selected" : ""}>低表现</option>
              <option value="medium"${retro.actualPerformanceTier === "medium" ? " selected" : ""}>中等表现</option>
              <option value="high"${retro.actualPerformanceTier === "high" ? " selected" : ""}>高表现</option>
            </select>
          </label>
          <label>
            <span>复盘时间</span>
            <input name="reviewedAt" type="date" value="${escapeHtml(String(retro.reviewedAt || "").slice(0, 10))}" />
          </label>
        </div>
        <label class="sample-library-checkbox">
          <input type="checkbox" name="predictionMatched"${retro.predictionMatched ? " checked" : ""} />
          <span>预判命中</span>
        </label>
        <label class="sample-library-checkbox">
          <input type="checkbox" name="shouldBecomeReference"${retro.shouldBecomeReference ? " checked" : ""} />
          <span>建议进入参考样本</span>
        </label>
        <label>
          <span>偏差原因</span>
          <input name="missReason" value="${escapeHtml(retro.missReason || "")}" placeholder="例如：标题命中，但正文留存不足" />
        </label>
        <label>
          <span>被验证信号</span>
          <input name="validatedSignals" value="${escapeHtml(joinCSV(retro.validatedSignals))}" placeholder="标题结构, 合集匹配" />
        </label>
        <label>
          <span>被推翻信号</span>
          <input name="invalidatedSignals" value="${escapeHtml(joinCSV(retro.invalidatedSignals))}" placeholder="正文过长, 标签不准" />
        </label>
        <label>
          <span>规则优化候选</span>
          <textarea name="ruleImprovementCandidate" rows="3" placeholder="例如：同类标题结构可提升参考权重">${escapeHtml(
            retro.ruleImprovementCandidate || ""
          )}</textarea>
        </label>
        <label>
          <span>复盘备注</span>
          <textarea name="retroNotes" rows="3" placeholder="例如：72 小时后表现稳定">${escapeHtml(retro.notes || "")}</textarea>
        </label>
        <p class="helper-text">${escapeHtml(comparisonStatusLabel)}${missReasonSuggestion ? ` · ${escapeHtml(missReasonSuggestion)}` : ""}</p>
      `
      })}
  `;
}

function buildSampleLibraryCalibrationModalMarkup(record) {
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

  return `
    <div class="sample-library-modal-stack compact-form">
      ${buildSampleLibraryCalibrationEditorSectionsMarkup({
        prediction: calibration.prediction,
        retro: effectiveRetro,
        comparisonStatusLabel: predictionMatchedLabel(comparison.matched),
        missReasonSuggestion: comparison.missReasonSuggestion
      })}
    </div>
  `;
}

function buildSampleLibraryDetailModalConfig(kind, record) {
  if (kind === "reference") {
    return {
      title: "编辑参考属性",
      subtitle: getSampleRecordTitle(record) || "这条记录的参考样本设置",
      body: buildSampleLibraryReferenceModalMarkup(record),
      saveLabel: "保存参考属性"
    };
  }

  if (kind === "lifecycle") {
    return {
      title: "编辑生命周期属性",
      subtitle: getSampleRecordTitle(record) || "回填发布结果与互动表现",
      body: buildSampleLibraryLifecycleModalMarkup(record),
      saveLabel: "保存生命周期属性"
    };
  }

  return {
    title: "编辑预判复盘",
    subtitle: getSampleRecordTitle(record) || "把预判和真实结果放到同一条样本里复盘",
    body: buildSampleLibraryCalibrationModalMarkup(record),
    saveLabel: "保存预判复盘"
  };
}

function readSampleLibraryModalReferencePayload() {
  const contentNode = byId("sample-library-modal-content");
  const tier = String(contentNode?.querySelector('[name="tier"]')?.value || "").trim();
  const enabled = contentNode?.querySelector('[name="enabled"]')?.checked === true || Boolean(tier);

  return {
    enabled,
    tier: enabled ? tier || "passed" : "",
    notes: contentNode?.querySelector('[name="notes"]')?.value || ""
  };
}

function readSampleLibraryModalLifecyclePayload() {
  const contentNode = byId("sample-library-modal-content");
  return {
    status: contentNode?.querySelector('[name="status"]')?.value || "not_published",
    publishedAt: contentNode?.querySelector('[name="publishedAt"]')?.value || "",
    platformReason: contentNode?.querySelector('[name="platformReason"]')?.value || "",
    notes: contentNode?.querySelector('[name="notes"]')?.value || "",
    metrics: {
      likes: contentNode?.querySelector('[name="likes"]')?.value || 0,
      favorites: contentNode?.querySelector('[name="favorites"]')?.value || 0,
      comments: contentNode?.querySelector('[name="comments"]')?.value || 0,
      views: contentNode?.querySelector('[name="views"]')?.value || 0
    }
  };
}

function readSampleLibraryModalCalibrationPayload() {
  const contentNode = byId("sample-library-modal-content");

  return {
    prediction: {
      predictedStatus: contentNode?.querySelector('[name="predictedStatus"]')?.value || "not_published",
      predictedRiskLevel: contentNode?.querySelector('[name="predictedRiskLevel"]')?.value || "",
      predictedPerformanceTier: contentNode?.querySelector('[name="predictedPerformanceTier"]')?.value || "",
      confidence: contentNode?.querySelector('[name="predictionConfidence"]')?.value || 0,
      reason: contentNode?.querySelector('[name="predictionReason"]')?.value || "",
      model: contentNode?.querySelector('[name="predictionModel"]')?.value || "",
      createdAt: contentNode?.querySelector('[name="predictionCreatedAt"]')?.value || ""
    },
    retro: {
      actualPerformanceTier: contentNode?.querySelector('[name="actualPerformanceTier"]')?.value || "",
      predictionMatched: contentNode?.querySelector('[name="predictionMatched"]')?.checked === true,
      missReason: contentNode?.querySelector('[name="missReason"]')?.value || "",
      validatedSignals: splitCSV(contentNode?.querySelector('[name="validatedSignals"]')?.value || ""),
      invalidatedSignals: splitCSV(contentNode?.querySelector('[name="invalidatedSignals"]')?.value || ""),
      shouldBecomeReference: contentNode?.querySelector('[name="shouldBecomeReference"]')?.checked === true,
      ruleImprovementCandidate: contentNode?.querySelector('[name="ruleImprovementCandidate"]')?.value || "",
      notes: contentNode?.querySelector('[name="retroNotes"]')?.value || "",
      reviewedAt: contentNode?.querySelector('[name="reviewedAt"]')?.value || ""
    }
  };
}

function openSampleLibraryDetailModal(kind, recordId) {
  const record = appState.sampleLibraryRecords.find((item) => String(item.id || "") === String(recordId || ""));

  if (!record) {
    return;
  }

  appState.sampleLibraryModal = {
    kind,
    recordId: String(record.id || "")
  };

  renderSampleLibraryModal(buildSampleLibraryDetailModalConfig(kind, record));
}

function renderSampleLibraryWorkspace() {
  const workspaceNode = byId("sample-library-workspace");
  const listNode = byId("sample-library-record-list");
  const queueNode = byId("sample-library-calibration-review-queue");

  if (!workspaceNode && !listNode && !queueNode) {
    return;
  }

  renderCollectionTypeSelectors();
  const filteredItems = filterSampleLibraryRecords(appState.sampleLibraryRecords);

  renderSampleLibraryList(filteredItems);
  renderSampleLibraryCalibrationReplayResult(appState.sampleLibraryCalibrationReplayResult);
  renderSampleLibraryCalibrationReviewQueue(appState.sampleLibraryRecords);
  if (appState.sampleLibraryModal?.kind === "record-list" && byId("sample-library-modal")?.hidden === false) {
    renderSampleLibraryRecordListModal();
  }
  if (appState.sampleLibraryPoolsModal?.open) {
    renderSampleLibraryPoolsModal();
  }
  syncSampleLibraryCreateActions();
  syncSampleLibraryPrefillActions();
  syncSampleLibraryDetailActions();
}

async function refreshSampleLibraryWorkspace() {
  const workspaceNode = byId("sample-library-workspace");
  const listNode = byId("sample-library-record-list");
  const queueNode = byId("sample-library-calibration-review-queue");

  if (!workspaceNode && !listNode && !queueNode) {
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

function buildInnerSpaceTermsListMarkup(items = []) {
  return Array.isArray(items) && items.length
    ? items
        .slice()
        .sort((left, right) => Number(right.priority || 0) - Number(left.priority || 0))
        .map(
          (item) => `
            <article class="admin-item">
              <div class="item-head">
                <div>
                  <strong>${escapeHtml(item.term || "未命名术语")}</strong>
                  <p>${escapeHtml(item.literal || item.metaphor || "等待补充术语说明")}</p>
                </div>
                <div class="meta-row">
                  <span class="meta-pill">${escapeHtml(innerSpaceTermCategoryLabel(item.category))}</span>
                  <span class="meta-pill">优先级 ${escapeHtml(String(item.priority || 0))}</span>
                </div>
              </div>
              <div class="meta-row">
                <span class="meta-pill">${escapeHtml((item.aliases || []).join("、") || "无别名")}</span>
                <span class="meta-pill">${escapeHtml((item.collectionTypes || []).join("、") || "全部合集")}</span>
              </div>
              <p>${escapeHtml(item.preferredUsage || "暂无推荐用法")}</p>
              <p>${escapeHtml(item.example || "暂无示例句")}</p>
              <div class="item-actions">
                <button
                  type="button"
                  class="button button-danger button-small"
                  data-action="delete-inner-space-term"
                  data-id="${escapeHtml(item.id || "")}"
                >
                  删除
                </button>
              </div>
            </article>
          `
        )
        .join("")
    : '<div class="result-card muted">当前没有术语项</div>';
}

function renderInnerSpaceTermsList(items = []) {
  const node = byId("inner-space-terms-list");

  if (!node) {
    return;
  }

  node.innerHTML = buildInnerSpaceTermsListMarkup(items);
}

function renderAdminData(data) {
  renderLexiconList("seed-lexicon-list", data.seedLexicon, "seed");
  renderLexiconList("custom-lexicon-list", data.customLexicon, "custom");
  renderInnerSpaceTermsList(data.innerSpaceTerms || []);
  renderFeedbackLog(data.feedbackLog);
  renderFalsePositiveLog(data.falsePositiveLog || []);
}

async function refreshInnerSpaceTermsState() {
  let items = [];

  try {
    const innerSpaceTermsPayload = await apiJson(innerSpaceTermsApi);
    items = Array.isArray(innerSpaceTermsPayload.items) ? innerSpaceTermsPayload.items : [];
  } catch (error) {
    const adminData = await apiJson("/api/admin/data");
    items = Array.isArray(adminData.innerSpaceTerms) ? adminData.innerSpaceTerms : [];
  }

  appState.adminData = {
    ...appState.adminData,
    innerSpaceTerms: items
  };

  return items;
}

async function refreshAdminDataState() {
  const adminData = await apiJson("/api/admin/data");

  appState.adminData = {
    seedLexicon: Array.isArray(adminData.seedLexicon) ? adminData.seedLexicon : [],
    customLexicon: Array.isArray(adminData.customLexicon) ? adminData.customLexicon : [],
    innerSpaceTerms: Array.isArray(adminData.innerSpaceTerms) ? adminData.innerSpaceTerms : [],
    feedbackLog: Array.isArray(adminData.feedbackLog) ? adminData.feedbackLog : [],
    falsePositiveLog: Array.isArray(adminData.falsePositiveLog) ? adminData.falsePositiveLog : [],
    reviewQueue: Array.isArray(adminData.reviewQueue) ? adminData.reviewQueue : []
  };

  if (!Array.isArray(adminData.innerSpaceTerms)) {
    await refreshInnerSpaceTermsState();
  }

  return appState.adminData;
}

async function refreshAll() {
  const [summary, collectionTypePayload] = await Promise.all([
    apiJson("/api/summary"),
    apiJson(collectionTypesApi)
  ]);

  await refreshAdminDataState();
  appState.collectionTypeOptions = Array.isArray(collectionTypePayload.options) ? collectionTypePayload.options : [];
  await refreshSampleLibraryWorkspace();
  renderSummary(summary);
  renderQueue(appState.adminData.reviewQueue);
  renderAdminData(appState.adminData);
  renderLexiconWorkspaceModal();
  renderCollectionTypeSelectors();
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
    notes: String(source?.notes || source?.publishNotes || "").trim(),
    metrics: {
      likes: Number(source?.metrics?.likes ?? source?.likes ?? 0) || 0,
      favorites: Number(source?.metrics?.favorites ?? source?.favorites ?? 0) || 0,
      comments: Number(source?.metrics?.comments ?? source?.comments ?? 0) || 0,
      views: Number(source?.metrics?.views ?? source?.views ?? 0) || 0
    }
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
    <span class="meta-pill sample-library-metric-pill">浏览 ${escapeHtml(String(normalizedPublish.metrics.views || 0))}</span>
  `;
}

function buildSampleLibraryImportAdvancedModalMarkup(item = {}) {
  const reference = readSampleLibraryImportDraftReference(item);
  const publish = readSampleLibraryImportDraftPublish(item);

  return `
    <div class="sample-library-modal-stack compact-form">
      <section class="sample-library-modal-section">
        <div class="sample-library-modal-section-head">
          <strong>参考属性</strong>
          <p>需要作为参考样本时，在这里顺手补齐等级和备注。</p>
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
          <textarea name="referenceNotes" rows="3" placeholder="例如：适合作为开头结构参考">${escapeHtml(reference.notes || "")}</textarea>
        </label>
      </section>
      <section class="sample-library-modal-section">
        <div class="sample-library-modal-section-head">
          <strong>生命周期属性</strong>
          <p>点赞、收藏、评论仍放在卡片主区，这里只处理发布状态与补充说明。</p>
        </div>
        <div class="sample-library-modal-grid">
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
          <textarea name="publishNotes" rows="3" placeholder="例如：发布 24h 后稳定通过">${escapeHtml(publish.notes || "")}</textarea>
        </label>
      </section>
    </div>
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

function getOpenSampleLibraryImportCard(index) {
  return document.querySelector(`[data-import-index="${Number(index)}"]`);
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
    syncSampleLibraryImportCardAdvancedSummary(card);
  });
}

function syncSampleLibraryImportCardAdvancedSummary(card) {
  const statusNode = card?.querySelector(".sample-library-import-advanced-status");

  if (!statusNode) {
    return;
  }

  const item = appState.sampleLibraryImportDrafts[Number(card?.dataset?.importIndex ?? -1)] || {};
  statusNode.innerHTML = buildSampleLibraryImportCardAdvancedStatusMarkup({
    reference: readSampleLibraryImportDraftReference(item),
    publish: readSampleLibraryImportDraftPublish(item)
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
}

function readSampleLibraryImportAdvancedModalDraft() {
  const contentNode = byId("sample-library-modal-content");
  const referenceTier = String(contentNode?.querySelector('[name="referenceTier"]')?.value || "").trim();
  const referenceEnabled = contentNode?.querySelector('[name="referenceEnabled"]')?.checked === true || Boolean(referenceTier);

  return {
    reference: {
      enabled: referenceEnabled,
      tier: referenceEnabled ? referenceTier || "passed" : "",
      notes: contentNode?.querySelector('[name="referenceNotes"]')?.value || ""
    },
    publish: {
      status: contentNode?.querySelector('[name="publishStatus"]')?.value || "not_published",
      publishedAt: contentNode?.querySelector('[name="publishedAt"]')?.value || "",
      platformReason: contentNode?.querySelector('[name="platformReason"]')?.value || "",
      notes: contentNode?.querySelector('[name="publishNotes"]')?.value || ""
    }
  };
}

function openSampleLibraryImportAdvancedModal(index) {
  const item = appState.sampleLibraryImportDrafts[Number(index)] || null;

  if (!item) {
    return;
  }

  appState.sampleLibraryModal = {
    kind: "import-advanced",
    index: Number(index)
  };

  renderSampleLibraryModal({
    title: "编辑高级属性",
    subtitle: String(item.fileName || item.title || "补充参考属性与生命周期属性"),
    body: buildSampleLibraryImportAdvancedModalMarkup(item),
    saveLabel: "保存高级属性"
  });
}

function saveSampleLibraryImportAdvancedModal() {
  const modalState = appState.sampleLibraryModal;

  if (modalState?.kind !== "import-advanced") {
    return;
  }

  const nextPatch = readSampleLibraryImportAdvancedModalDraft();
  const current = appState.sampleLibraryImportDrafts[modalState.index] || {};
  appState.sampleLibraryImportDrafts[modalState.index] = {
    ...current,
    reference: nextPatch.reference,
    publish: nextPatch.publish
  };

  const card = getOpenSampleLibraryImportCard(modalState.index);
  if (card) {
    syncSampleLibraryImportCardAdvancedSummary(card);
    syncSampleLibraryImportCardActions(card);
  }

  closeSampleLibraryModal();
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
                <label>
                  <span>浏览数</span>
                  <input name="views" type="number" min="0" value="${escapeHtml(String(item?.views ?? 0))}" />
                </label>
              </div>
              <article class="sample-library-detail-summary-card">
                <div>
                  <strong>高级属性</strong>
                  <p>参考属性和生命周期属性改到弹窗里编辑，避免在导入卡片中继续层层展开。</p>
                </div>
                <div class="item-actions">
                  <span class="sample-library-import-advanced-status">
                    ${buildSampleLibraryImportCardAdvancedStatusMarkup({ reference, publish })}
                  </span>
                  <button
                    type="button"
                    class="button button-ghost button-small"
                    data-action="sample-library-import-open-advanced-modal"
                  >
                    编辑高级属性
                  </button>
                </div>
              </article>
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
  const reference = readSampleLibraryImportDraftReference(sourceItem);
  const publish = readSampleLibraryImportDraftPublish(sourceItem);
  const items = [
    {
      selected: true,
      fileName: sourceItem.fileName || "",
      title: card.querySelector('[name="title"]')?.value || "",
      coverText: card.querySelector('[name="coverText"]')?.value || "",
      body: card.querySelector('[name="body"]')?.value || "",
      collectionType: card.querySelector('[name="collectionType"]')?.value || "",
      tags: joinCSV(readSampleLibraryImportCardTags(card)),
      referenceEnabled: reference.enabled === true,
      referenceTier: reference.tier || "",
      referenceNotes: reference.notes || "",
      publishStatus: publish.status || "not_published",
      publishedAt: publish.publishedAt || "",
      platformReason: publish.platformReason || "",
      publishNotes: publish.notes || "",
      likes: card.querySelector('[name="likes"]')?.value || "0",
      favorites: card.querySelector('[name="favorites"]')?.value || "0",
      comments: card.querySelector('[name="comments"]')?.value || "0",
      views: card.querySelector('[name="views"]')?.value || "0"
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

function getSampleLibraryModalTagPicker() {
  return byId("sample-library-modal-content")?.querySelector(".sample-library-modal-tag-picker");
}

function getSampleLibraryModalTagTrigger() {
  return byId("sample-library-modal-content")?.querySelector(".sample-library-modal-tag-trigger");
}

function getSampleLibraryModalTagDropdown() {
  return byId("sample-library-modal-content")?.querySelector(".sample-library-modal-tag-dropdown");
}

function getSampleLibraryModalTagOptionsContainer() {
  return byId("sample-library-modal-content")?.querySelector(".sample-library-modal-tag-options");
}

function getSampleLibraryModalTagSelection() {
  return byId("sample-library-modal-content")?.querySelector(".sample-library-modal-tag-selected");
}

function getSampleLibraryModalTagInput() {
  return byId("sample-library-modal-content")?.querySelector('.sample-library-modal-tag-picker [name="tags"]');
}

function getSampleLibraryModalTagCustomInput() {
  return byId("sample-library-modal-content")?.querySelector(".sample-library-modal-tag-custom");
}

function focusFirstSampleLibraryModalTagOption() {
  const firstOption = getSampleLibraryModalTagOptionsContainer()?.querySelector("[data-modal-tag-option]");
  if (firstOption instanceof HTMLElement) {
    firstOption.focus();
  }
}

function isSampleLibraryModalTagDropdownOpen() {
  return getSampleLibraryModalTagTrigger()?.getAttribute("aria-expanded") === "true";
}

function setSampleLibraryModalTagDropdownOpen(isOpen) {
  const trigger = getSampleLibraryModalTagTrigger();
  const dropdown = getSampleLibraryModalTagDropdown();
  const picker = getSampleLibraryModalTagPicker();

  if (!trigger || !dropdown || !picker) {
    return;
  }

  trigger.setAttribute("aria-expanded", isOpen ? "true" : "false");
  dropdown.hidden = !isOpen;
  picker.classList.toggle("is-open", isOpen);
}

function readSampleLibraryModalTags() {
  return uniqueStrings(splitCSV(getSampleLibraryModalTagInput()?.value || ""));
}

function renderSampleLibraryModalTagOptions() {
  const container = getSampleLibraryModalTagOptionsContainer();

  if (!container) {
    return;
  }

  const selectedTags = readSampleLibraryModalTags();
  container.innerHTML = uniqueStrings(analyzeTagOptions)
    .map((tag) => {
      const selected = selectedTags.includes(tag);
      const isCustom = !isPresetAnalyzeTag(tag);
      return `
        <span class="tag-picker-option-row${isCustom ? " is-custom" : ""}">
          <button
            type="button"
            class="tag-picker-option${selected ? " is-selected" : ""}"
            data-modal-tag-option="${escapeHtml(tag)}"
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
                  data-modal-tag-delete="${escapeHtml(tag)}"
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

function writeSampleLibraryModalTags(tags = [], { emitInput = true } = {}) {
  const hiddenInput = getSampleLibraryModalTagInput();
  const selected = getSampleLibraryModalTagSelection();
  const normalized = uniqueStrings(tags);

  if (hiddenInput) {
    hiddenInput.value = joinCSV(normalized);
  }

  if (selected) {
    selected.innerHTML = buildAnalyzeTagSelectionMarkup(normalized);
  }

  renderSampleLibraryModalTagOptions();

  if (emitInput && hiddenInput) {
    hiddenInput.dispatchEvent(new Event("input", { bubbles: true }));
  }
}

function toggleSampleLibraryModalTag(tag) {
  const current = readSampleLibraryModalTags();
  const normalizedTag = String(tag || "").trim();

  if (!normalizedTag) {
    return;
  }

  writeSampleLibraryModalTags(
    current.includes(normalizedTag) ? current.filter((item) => item !== normalizedTag) : [...current, normalizedTag]
  );
}

function addSampleLibraryModalTag(tag) {
  const nextTag = String(tag || "").trim();

  if (!nextTag) {
    return;
  }

  addAnalyzeTagOption(nextTag);
  writeSampleLibraryModalTags([...readSampleLibraryModalTags(), nextTag]);
}

function initializeSampleLibraryModalTagPicker() {
  const customInput = getSampleLibraryModalTagCustomInput();

  if (!customInput) {
    return;
  }

  customInput.setAttribute("aria-label", customInput.getAttribute("aria-label") || customInput.placeholder || "输入自定义标签");
  setSampleLibraryModalTagDropdownOpen(false);
  writeSampleLibraryModalTags(readSampleLibraryModalTags(), { emitInput: false });
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
  byId("sample-library-record-list")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function handleSummaryAction(action) {
  if (action === "open-review-queue") {
    ensureSupportWorkspaceOpen();
    byId("review-queue")?.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  if (action === "open-feedback-center") {
    ensureSupportWorkspaceOpen();
    revealSampleLibraryReflowPane();
    return;
  }

  if (action === "open-sample-library") {
    ensureSupportWorkspaceOpen();
    revealSampleLibraryPane();
    openSampleLibraryCreateModal();
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
  notes = "",
  views = 0
} = {}) {
  const saved = await saveLifecycleFromCurrent(source, candidateId, candidateIndex);
  const id = String(saved.item?.id || appState.selectedSampleLibraryRecordId || "").trim();

  if (!id) {
    throw new Error("未找到可回填的平台结果记录。");
  }

  const payload = {
    status: publishStatus,
    notes,
    views: Number(views || 0) || 0
  };

  const response = await apiJson(sampleLibraryApi, {
    method: "PATCH",
    body: JSON.stringify({
      id,
      publish: {
        status: payload.status,
        notes: payload.notes,
        metrics: {
          views: payload.views || 0
        }
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

function syncSampleLibraryCreateActions() {
  const requirementMessage =
    appState.sampleLibraryModal?.kind === "create" ? getSampleLibraryCreateRequirementMessage() : "";
  const submitButton =
    appState.sampleLibraryModal?.kind === "create" ? byId("sample-library-modal-save") : null;

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

function getSampleLibraryDetailBaseRequirementMessage(root = byId("sample-library-modal-content")) {
  const note = {
    title: root?.querySelector('[name="title"]')?.value || "",
    body: root?.querySelector('[name="body"]')?.value || "",
    coverText: root?.querySelector('[name="coverText"]')?.value || "",
    tags: splitCSV(root?.querySelector('[name="tags"]')?.value || "")
  };
  const collectionType = String(root?.querySelector('[name="collectionType"]')?.value || "").trim();

  if (!hasMeaningfulNoteDraft(note)) {
    return "请至少填写标题、正文、封面文案或标签。";
  }

  if (!collectionType) {
    return "请先选择合集类型。";
  }

  return "";
}

function getSampleLibraryDetailReferenceRequirementMessage(root = byId("sample-library-modal-content")) {
  const tier = String(root?.querySelector('[name="tier"]')?.value || "").trim();
  const enabled = root?.querySelector('[name="enabled"]')?.checked === true || Boolean(tier);

  if (enabled && !tier) {
    return "启用参考样本时请先选择参考等级。";
  }

  return "";
}

function syncSampleLibraryReferenceSectionState(root = byId("sample-library-reference-section"), { source = "" } = {}) {
  const scope =
    root?.querySelector?.('[name="enabled"]')
      ? root
      : root?.querySelector?.("#sample-library-reference-section") || null;
  const enabledCheckbox = scope?.querySelector('[name="enabled"]');
  const tierSelect = scope?.querySelector('[name="tier"]');

  if (!(enabledCheckbox instanceof HTMLInputElement) || !(tierSelect instanceof HTMLSelectElement)) {
    return;
  }

  const tier = String(tierSelect.value || "").trim();

  if (source === "checkbox" && enabledCheckbox.checked !== true) {
    tierSelect.value = "";
  } else if (tier) {
    enabledCheckbox.checked = true;
  } else if (!String(tierSelect.value || "").trim()) {
    tierSelect.value = enabledCheckbox.checked ? "passed" : "";
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

async function patchSampleLibraryRecordAndRefresh(payload, { recordId = "", nextStep = "base" } = {}) {
  const response = await apiJson(sampleLibraryApi, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });

  appState.sampleLibraryRecords = Array.isArray(response.items) ? response.items : appState.sampleLibraryRecords;
  appState.selectedSampleLibraryRecordId = String(response.item?.id || recordId || payload?.id || "");
  renderSampleLibraryWorkspace();
  return response;
}

async function saveSampleLibraryDetailReferenceModal(recordId) {
  const requirementMessage = getSampleLibraryDetailReferenceRequirementMessage();

  if (requirementMessage) {
    throw new Error(requirementMessage);
  }

  const reference = readSampleLibraryModalReferencePayload();
  return patchSampleLibraryRecordAndRefresh(
    {
      id: recordId,
      reference
    },
    { recordId, nextStep: "lifecycle" }
  );
}

async function saveSampleLibraryDetailBaseModal(recordId) {
  const requirementMessage = getSampleLibraryCreateRequirementMessage();

  if (requirementMessage) {
    throw new Error(requirementMessage);
  }

  const payload = readSampleLibraryModalBasePayload();
  return patchSampleLibraryRecordAndRefresh(
    {
      id: recordId,
      note: {
        title: payload.title,
        body: payload.body,
        coverText: payload.coverText,
        collectionType: payload.collectionType,
        tags: payload.tags
      }
    },
    { recordId, nextStep: "reference" }
  );
}

async function saveSampleLibraryDetailLifecycleModal(recordId) {
  return patchSampleLibraryRecordAndRefresh(
    {
      id: recordId,
      publish: readSampleLibraryModalLifecyclePayload()
    },
    { recordId, nextStep: "calibration" }
  );
}

async function saveSampleLibraryDetailCalibrationModal(recordId) {
  return patchSampleLibraryRecordAndRefresh(
    {
      id: recordId,
      calibration: readSampleLibraryModalCalibrationPayload()
    },
    { recordId, nextStep: "calibration" }
  );
}

async function savePlatformOutcomeModal() {
  const modalState = appState.sampleLibraryModal;

  if (modalState?.kind !== "platform-outcome") {
    return;
  }

  const payload = readPlatformOutcomeModalPayload();
  await savePlatformOutcomeFromCurrent({
    source: modalState.source,
    publishStatus: modalState.publishStatus,
    candidateId: modalState.candidateId,
    candidateIndex: modalState.candidateIndex,
    notes: payload.notes,
    views: payload.views
  });

  const resultNode = byId("sample-library-create-result");
  const outcomeOption = getPlatformOutcomeOption(modalState.publishStatus);

  if (resultNode) {
    resultNode.innerHTML = `<div class="result-card-shell">${escapeHtml(payload.notes || outcomeOption.note || "平台结果已回填到学习样本。")}</div>`;
  }
}

async function saveSampleLibraryDeleteModal() {
  const modalState = appState.sampleLibraryModal;

  if (!modalState?.recordId) {
    return;
  }

  const response = await apiJson(sampleLibraryApi, {
    method: "DELETE",
    body: JSON.stringify({
      id: modalState.recordId
    })
  });
  appState.sampleLibraryRecords = Array.isArray(response.items) ? response.items : [];
  appState.selectedSampleLibraryRecordId = "";
  renderSampleLibraryWorkspace();
}

async function saveSampleLibraryDetailModal() {
  const modalState = appState.sampleLibraryModal;

  if (modalState?.kind === "platform-outcome") {
    await savePlatformOutcomeModal();
    closeSampleLibraryModal();
    return;
  }

  if (modalState?.kind === "create") {
    await saveSampleLibraryCreateModal();
    closeSampleLibraryModal();
    return;
  }

  if (modalState?.kind === "delete-record") {
    await saveSampleLibraryDeleteModal();
    closeSampleLibraryModal();
    return;
  }

  if (modalState?.kind === "record-list-inline-editor-close-confirm") {
    saveSampleLibraryRecordInlineEditorCloseConfirmModal();
    return;
  }

  if (modalState?.kind === "record-list-inline-editor-switch-confirm") {
    saveSampleLibraryRecordInlineEditorSwitchConfirmModal();
    return;
  }

  if (modalState?.kind === "record-list-inline-editor") {
    await saveSampleLibraryRecordInlineEditorModal();
    return;
  }

  if (modalState?.kind === "feedback-rule-queue") {
    await saveFeedbackRuleQueueModal();
    closeSampleLibraryModal();
    return;
  }

  if (modalState?.kind === "feedback-false-positive") {
    await saveFeedbackFalsePositiveModal();
    closeSampleLibraryModal();
    return;
  }

  if (!modalState?.recordId) {
    return;
  }

  if (modalState.kind === "base") {
    await saveSampleLibraryDetailBaseModal(modalState.recordId);
    closeSampleLibraryModal();
    return;
  }

  if (modalState.kind === "reference") {
    await saveSampleLibraryDetailReferenceModal(modalState.recordId);
    closeSampleLibraryModal();
    return;
  }

  if (modalState.kind === "lifecycle") {
    await saveSampleLibraryDetailLifecycleModal(modalState.recordId);
    closeSampleLibraryModal();
    return;
  }

  if (modalState.kind === "calibration") {
    await saveSampleLibraryDetailCalibrationModal(modalState.recordId);
    closeSampleLibraryModal();
  }
}

function getSampleLibraryDetailLifecycleRequirementMessage() {
  return "";
}

function getSampleLibraryDetailCalibrationRequirementMessage() {
  return "";
}

function syncSampleLibraryDetailActions() {
  const calibrationPrefillMessage = getSampleLibraryCalibrationPredictionPrefillRequirementMessage();
  const baseButton = byId("sample-library-base-section")?.querySelector('[data-action="open-sample-library-base-modal"]');
  const referenceButton = byId("sample-library-reference-section")?.querySelector('[data-action="open-sample-library-reference-modal"]');
  const lifecycleButton = byId("sample-library-lifecycle-section")?.querySelector('[data-action="open-sample-library-lifecycle-modal"]');
  const calibrationPrefillButton =
    byId("sample-library-calibration-section")?.querySelector('[data-action="prefill-sample-library-calibration-prediction"]') || null;
  const calibrationButton = byId("sample-library-calibration-section")?.querySelector('[data-action="open-sample-library-calibration-modal"]');

  setGatedButtonState(baseButton, true, "");
  setGatedButtonState(referenceButton, true, "");
  setGatedButtonState(lifecycleButton, true, "");
  setGatedButtonState(calibrationPrefillButton, !calibrationPrefillMessage, calibrationPrefillMessage);
  setGatedButtonState(calibrationButton, true, "");
  setActionGateHint("sample-library-base-action-hint", "");
  setActionGateHint("sample-library-reference-action-hint", "");
  setActionGateHint("sample-library-lifecycle-action-hint", "");
  setActionGateHint("sample-library-calibration-action-hint", "");
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
    ensureSupportWorkspaceOpen();
    revealSampleLibraryReflowPane();
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

byId("inner-space-terms-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const submitButton = form.querySelector('button[type="submit"]');
  setButtonBusy(submitButton, true, "保存中...");

  try {
    const formData = new FormData(form);
    await apiJson(innerSpaceTermsApi, {
      method: "POST",
      body: JSON.stringify({
        entry: {
          term: formData.get("term"),
          aliases: splitCSV(formData.get("aliases")),
          category: formData.get("category"),
          collectionTypes: splitCSV(formData.get("collectionTypes")),
          literal: formData.get("literal"),
          metaphor: formData.get("metaphor"),
          preferredUsage: formData.get("preferredUsage"),
          avoidUsage: formData.get("avoidUsage"),
          example: formData.get("example"),
          priority: formData.get("priority")
        }
      })
    });
    form.reset();
    const priorityInput = form.querySelector('[name="priority"]');
    if (priorityInput) {
      priorityInput.value = "80";
    }
    byId("inner-space-terms-result").innerHTML = '<div class="result-card-shell">术语已保存，后续改写和生成会优先参考它。</div>';
    await refreshAll();
  } catch (error) {
    byId("inner-space-terms-result").innerHTML = `
      <div class="result-card-shell muted">${escapeHtml(error.message || "保存术语失败")}</div>
    `;
  } finally {
    setButtonBusy(submitButton, false);
  }
});

function updateLexiconWorkspaceDraftFromForm(scope, formElement) {
  const drafts = createLexiconWorkspaceDrafts(appState.lexiconWorkspaceModal?.drafts || {});
  const form = new FormData(formElement);

  if (scope === "inner-space") {
    drafts["inner-space"] = {
      term: String(form.get("term") || ""),
      aliases: String(form.get("aliases") || ""),
      category: String(form.get("category") || "equipment"),
      collectionTypes: String(form.get("collectionTypes") || ""),
      literal: String(form.get("literal") || ""),
      metaphor: String(form.get("metaphor") || ""),
      preferredUsage: String(form.get("preferredUsage") || ""),
      avoidUsage: String(form.get("avoidUsage") || ""),
      example: String(form.get("example") || ""),
      priority: String(form.get("priority") || "80")
    };
  } else {
    const riskLevel = String(form.get("riskLevel") || (scope === "seed" ? "hard_block" : "manual_review"));

    drafts[scope] = {
      match: String(form.get("match") || "exact"),
      source: String(form.get("source") || ""),
      category: String(form.get("category") || ""),
      riskLevel,
      lexiconLevel: String(form.get("lexiconLevel") || inferLexiconLevel("", riskLevel)),
      xhsReason: String(form.get("xhsReason") || "")
    };
  }

  appState.lexiconWorkspaceModal = {
    ...appState.lexiconWorkspaceModal,
    drafts
  };
}

async function submitLexiconWorkspaceLexiconForm(formElement, scope) {
  const submitButton = formElement.querySelector('button[type="submit"]');
  const form = new FormData(formElement);
  const source = String(form.get("source") || "").trim();
  const category = String(form.get("category") || "").trim();

  if (!source && !category) {
    setLexiconWorkspaceResultMessage("请先填写词 / 模式和分类。");
    return;
  }

  if (!source) {
    setLexiconWorkspaceResultMessage("请先填写词 / 模式。");
    return;
  }

  if (!category) {
    setLexiconWorkspaceResultMessage("请先填写分类。");
    return;
  }

  setLexiconWorkspaceResultMessage("");
  setButtonBusy(submitButton, true, "保存中...");

  try {
    await apiJson("/api/admin/lexicon", {
      method: "POST",
      body: JSON.stringify({
        scope,
        entry: buildLexiconEntry(form)
      })
    });

    appState.lexiconWorkspaceModal = {
      ...appState.lexiconWorkspaceModal,
      drafts: {
        ...createLexiconWorkspaceDrafts(appState.lexiconWorkspaceModal?.drafts || {}),
        [scope]: createDefaultLexiconDraft(scope)
      },
      resultMessage: "操作成功，列表已更新。"
    };
    await refreshAll();
  } catch (error) {
    setLexiconWorkspaceResultMessage(error.message || "保存失败");
  } finally {
    setButtonBusy(submitButton, false);
  }
}

async function submitLexiconWorkspaceInnerSpaceForm(formElement) {
  const submitButton = formElement.querySelector('button[type="submit"]');
  const formData = new FormData(formElement);
  setLexiconWorkspaceResultMessage("");
  setButtonBusy(submitButton, true, "保存中...");

  try {
    await apiJson(innerSpaceTermsApi, {
      method: "POST",
      body: JSON.stringify({
        entry: {
          term: formData.get("term"),
          aliases: splitCSV(formData.get("aliases")),
          category: formData.get("category"),
          collectionTypes: splitCSV(formData.get("collectionTypes")),
          literal: formData.get("literal"),
          metaphor: formData.get("metaphor"),
          preferredUsage: formData.get("preferredUsage"),
          avoidUsage: formData.get("avoidUsage"),
          example: formData.get("example"),
          priority: formData.get("priority")
        }
      })
    });

    appState.lexiconWorkspaceModal = {
      ...appState.lexiconWorkspaceModal,
      drafts: {
        ...createLexiconWorkspaceDrafts(appState.lexiconWorkspaceModal?.drafts || {}),
        "inner-space": createDefaultInnerSpaceTermDraft()
      },
      resultMessage: "操作成功，列表已更新。"
    };
    await refreshAll();
  } catch (error) {
    setLexiconWorkspaceResultMessage(error.message || "保存失败");
  } finally {
    setButtonBusy(submitButton, false);
  }
}

byId("lexicon-workspace-modal-content")?.addEventListener("submit", async (event) => {
  const form = event.target.closest("[data-lexicon-workspace-form]");

  if (!form) {
    return;
  }

  event.preventDefault();
  const scope = String(form.dataset.lexiconWorkspaceForm || "custom");

  updateLexiconWorkspaceDraftFromForm(scope, form);

  if (scope === "inner-space") {
    await submitLexiconWorkspaceInnerSpaceForm(form);
    return;
  }

  await submitLexiconWorkspaceLexiconForm(form, scope);
});

byId("lexicon-workspace-modal-content")?.addEventListener("input", (event) => {
  const form = event.target.closest("[data-lexicon-workspace-form]");

  if (!form) {
    return;
  }

  updateLexiconWorkspaceDraftFromForm(String(form.dataset.lexiconWorkspaceForm || "custom"), form);
});

byId("lexicon-workspace-modal-content")?.addEventListener("change", (event) => {
  const form = event.target.closest("[data-lexicon-workspace-form]");

  if (!form) {
    return;
  }

  updateLexiconWorkspaceDraftFromForm(String(form.dataset.lexiconWorkspaceForm || "custom"), form);
});

byId("sample-library-create-button").addEventListener("click", openSampleLibraryCreateModal);

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
  syncSampleLibraryImportActions();
});

byId("sample-library-import-block")?.addEventListener("change", () => {
  syncSampleLibraryImportActions();
});

byId("sample-library-import-block")?.addEventListener("click", async (event) => {
  const card = event.target instanceof Element ? event.target.closest("[data-import-index]") : null;

  if (!card) {
    return;
  }

  const advancedButton =
    event.target instanceof Element ? event.target.closest('[data-action="sample-library-import-open-advanced-modal"]') : null;
  if (advancedButton) {
    openSampleLibraryImportAdvancedModal(card.dataset.importIndex || "");
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
  const modalTagPicker = getSampleLibraryModalTagPicker();

  if (!eventTargetsAnalyzeTagPicker(event, modalTagPicker)) {
    setSampleLibraryModalTagDropdownOpen(false);
  }

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

  if (
    appState.sampleLibraryModal?.kind === "record-list-inline-editor" ||
    appState.sampleLibraryModal?.kind === "record-list-inline-editor-switch-confirm" ||
    appState.sampleLibraryModal?.kind === "record-list-inline-editor-close-confirm" ||
    (appState.sampleLibraryModal?.kind === "delete-record" && appState.sampleLibraryModal.returnTo?.kind === "record-list-inline-editor")
  ) {
    requestCloseSampleLibraryRecordInlineEditorModal();
    return;
  }

  if (appState.sampleLibraryModal) {
    closeSampleLibraryModal();
    return;
  }

   if (appState.sampleLibraryPoolsModal?.open) {
    closeSampleLibraryPoolsModal();
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

byId("sample-library-modal-content")?.addEventListener("change", (event) => {
  const fieldName =
    event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement || event.target instanceof HTMLTextAreaElement
      ? String(event.target.name || "")
      : "";
  const modalState = appState.sampleLibraryModal;

  if (fieldName === "referenceEnabled") {
    syncSampleLibraryImportCardReferenceSectionState(byId("sample-library-modal-content"), { source: "checkbox" });
  }

  if (fieldName === "referenceTier") {
    syncSampleLibraryImportCardReferenceSectionState(byId("sample-library-modal-content"), { source: "tier" });
  }

  if (fieldName === "enabled" || fieldName === "tier") {
    syncSampleLibraryReferenceSectionState(byId("sample-library-modal-content"), {
      source: fieldName === "enabled" ? "checkbox" : "tier"
    });
  }

  if (modalState?.kind === "record-list-inline-editor") {
    appState.sampleLibraryModal = {
      ...modalState,
      draft: readSampleLibraryRecordInlineEditorDraftFromModal()
    };
  }

  if (modalState?.kind === "create") {
    syncSampleLibraryCreateActions();
  }

  if (modalState?.kind === "base") {
    const requirementMessage = getSampleLibraryDetailBaseRequirementMessage();
    setGatedButtonState(byId("sample-library-modal-save"), !requirementMessage, requirementMessage);
  }

  if (modalState?.kind === "reference") {
    const requirementMessage = getSampleLibraryDetailReferenceRequirementMessage();
    setGatedButtonState(byId("sample-library-modal-save"), !requirementMessage, requirementMessage);
  }
});

byId("sample-library-modal-content")?.addEventListener("input", () => {
  const modalState = appState.sampleLibraryModal;

  if (modalState?.kind === "record-list-inline-editor") {
    appState.sampleLibraryModal = {
      ...modalState,
      draft: readSampleLibraryRecordInlineEditorDraftFromModal()
    };
    return;
  }

  if (modalState?.kind === "create") {
    syncSampleLibraryCreateActions();
    return;
  }

  if (modalState?.kind === "base") {
    const requirementMessage = getSampleLibraryDetailBaseRequirementMessage();
    setGatedButtonState(byId("sample-library-modal-save"), !requirementMessage, requirementMessage);
    return;
  }

  if (modalState?.kind === "reference") {
    const requirementMessage = getSampleLibraryDetailReferenceRequirementMessage();
    setGatedButtonState(byId("sample-library-modal-save"), !requirementMessage, requirementMessage);
  }
});

byId("sample-library-modal-content")?.addEventListener("click", (event) => {
  const trigger = event.target instanceof Element ? event.target.closest(".sample-library-modal-tag-trigger") : null;

  if (trigger) {
    event.preventDefault();
    event.stopPropagation();
    setSampleLibraryModalTagDropdownOpen(!isSampleLibraryModalTagDropdownOpen());
    return;
  }

  const clearButton = event.target instanceof Element ? event.target.closest(".sample-library-modal-tag-clear") : null;

  if (clearButton) {
    event.preventDefault();
    event.stopPropagation();
    writeSampleLibraryModalTags([]);
    return;
  }

  const addButton = event.target instanceof Element ? event.target.closest(".sample-library-modal-tag-add") : null;

  if (addButton) {
    event.preventDefault();
    event.stopPropagation();
    const customInput = getSampleLibraryModalTagCustomInput();
    const value = String(customInput?.value || "").trim();

    if (!value) {
      return;
    }

    addSampleLibraryModalTag(value);
    if (customInput) {
      customInput.value = "";
      customInput.focus();
    }
    return;
  }

  const deleteButton = event.target instanceof Element ? event.target.closest("[data-modal-tag-delete]") : null;

  if (deleteButton) {
    event.preventDefault();
    event.stopPropagation();
    const tag = deleteButton.dataset.modalTagDelete;

    removeAnalyzeTagOption(tag);
    writeSampleLibraryModalTags(readSampleLibraryModalTags().filter((item) => item !== String(tag || "").trim()));
    return;
  }

  const optionButton = event.target instanceof Element ? event.target.closest("[data-modal-tag-option]") : null;

  if (optionButton) {
    event.preventDefault();
    event.stopPropagation();
    toggleSampleLibraryModalTag(optionButton.dataset.modalTagOption);
  }
});

byId("sample-library-modal-content")?.addEventListener("keydown", (event) => {
  const trigger = event.target instanceof Element ? event.target.closest(".sample-library-modal-tag-trigger") : null;

  if (trigger && event.key === "ArrowDown") {
    event.preventDefault();
    setSampleLibraryModalTagDropdownOpen(true);
    focusFirstSampleLibraryModalTagOption();
    return;
  }

  const customInput = event.target instanceof Element ? event.target.closest(".sample-library-modal-tag-custom") : null;

  if (!customInput || (event.key !== "Enter" && event.key !== ",")) {
    return;
  }

  event.preventDefault();
  addSampleLibraryModalTag(customInput.value);
  customInput.value = "";
});

byId("sample-library-modal-content")?.addEventListener("focusout", (event) => {
  const customInput = event.target instanceof Element ? event.target.closest(".sample-library-modal-tag-custom") : null;

  if (!customInput) {
    return;
  }

  const addButton = getSampleLibraryModalTagPicker()?.querySelector(".sample-library-modal-tag-add");

  if (event.relatedTarget === addButton) {
    return;
  }

  const value = String(customInput.value || "").trim();

  if (!value) {
    return;
  }

  addSampleLibraryModalTag(value);
  customInput.value = "";
});

byId("sample-library-modal-content")?.addEventListener("click", (event) => {
  const button = event.target instanceof Element ? event.target.closest("[data-action]") : null;

  if (!button) {
    return;
  }

  if (button.dataset.action === "prefill-sample-library-create-analysis") {
    const requirementMessage = getSampleLibraryPrefillAnalysisRequirementMessage();

    if (requirementMessage) {
      setSampleLibraryModalMessage(requirementMessage);
      return;
    }

    fillSampleLibraryCreateModalFromCurrent("analysis");
    setSampleLibraryModalMessage("已根据当前检测结果填充内容。");
    syncSampleLibraryCreateActions();
    return;
  }

  if (button.dataset.action === "prefill-sample-library-create-rewrite") {
    const requirementMessage = getSampleLibraryPrefillRewriteRequirementMessage();

    if (requirementMessage) {
      setSampleLibraryModalMessage(requirementMessage);
      return;
    }

    fillSampleLibraryCreateModalFromCurrent("rewrite");
    setSampleLibraryModalMessage("已根据当前改写结果填充内容。");
    syncSampleLibraryCreateActions();
  }
});

byId("sample-library-modal-save")?.addEventListener("click", async () => {
  const saveButton = byId("sample-library-modal-save");
  const modalState = appState.sampleLibraryModal;

  if (!modalState) {
    return;
  }

  setSampleLibraryModalMessage("");
  setButtonBusy(saveButton, true, "保存中...");

  try {
    if (modalState.kind === "import-advanced") {
      saveSampleLibraryImportAdvancedModal();
    } else {
      await saveSampleLibraryDetailModal();
    }
  } catch (error) {
    setSampleLibraryModalMessage(error.message || "保存失败");
  } finally {
    setButtonBusy(saveButton, false);
  }
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

byId("sample-library-pools-button")?.addEventListener("click", () => {
  openSampleLibraryPoolsModal("reference");
});

byId("sample-library-collection-filter").addEventListener("change", (event) => {
  appState.sampleLibraryCollectionFilter = String(event.currentTarget.value || "all");
  renderSampleLibraryWorkspace();
});

initializeTabs();
syncReferenceThresholdCopy();
renderSampleLibraryWorkspace();

document.addEventListener("click", async (event) => {
  const summaryAction = event.target.closest("[data-summary-action]");

  if (summaryAction) {
    await handleSummaryAction(summaryAction.dataset.summaryAction);
    return;
  }

  const samplePoolTab = event.target.closest("[data-sample-pool-tab]");

  if (samplePoolTab) {
    appState.sampleLibraryPoolsModal = {
      open: true,
      tab: String(samplePoolTab.dataset.samplePoolTab || "reference")
    };
    renderSampleLibraryPoolsModal();
    return;
  }

  const lexiconWorkspaceTab = event.target.closest("[data-lexicon-workspace-tab]");

  if (lexiconWorkspaceTab) {
    const normalizedTab = normalizeLexiconWorkspaceTab(lexiconWorkspaceTab.dataset.lexiconWorkspaceTab || "custom");

    if (normalizedTab === "inner-space") {
      await refreshInnerSpaceTermsState();
    }

    appState.lexiconWorkspaceModal = {
      ...appState.lexiconWorkspaceModal,
      open: true,
      tab: normalizedTab,
      drafts: createLexiconWorkspaceDrafts(appState.lexiconWorkspaceModal?.drafts || {})
    };
    renderLexiconWorkspaceModal();
    return;
  }

  const sampleLibraryRecord = event.target.closest("[data-sample-library-record-id]");

  if (sampleLibraryRecord) {
    openSampleLibraryRecordInlineEditorModal(sampleLibraryRecord.dataset.sampleLibraryRecordId || "");
    return;
  }

  const button = event.target.closest("button[data-action]");

  if (!button) {
    return;
  }

  const action = button.dataset.action;

  if (action === "open-lexicon-workspace-modal") {
    openLexiconWorkspaceModal(button.dataset.tab || "custom");
    return;
  }

  if (action === "prefill-custom-draft") {
    openLexiconWorkspaceModal("custom", {
      prefill: {
        match: button.dataset.match || "exact",
        source: button.dataset.source || "",
        category: button.dataset.category || "",
        riskLevel: button.dataset.riskLevel || "manual_review",
        lexiconLevel: button.dataset.lexiconLevel || inferLexiconLevel("", button.dataset.riskLevel),
        xhsReason: button.dataset.xhsReason || ""
      },
      resultMessage: "已将推荐草稿填入自定义词库表单，可先调整再保存。"
    });
    return;
  }

  if (action === "open-sample-library-record") {
    focusSampleLibraryRecordFromPools(button.dataset.id, "base");
    return;
  }

  if (action === "open-sample-library-record-from-modal") {
    focusSampleLibraryRecordFromModal(button.dataset.id, "base");
    return;
  }

  if (action === "open-sample-library-calibration") {
    focusSampleLibraryRecordFromPools(button.dataset.id, "calibration");
    return;
  }

  if (action === "close-sample-library-pools-modal") {
    closeSampleLibraryPoolsModal();
    return;
  }

  if (action === "promote-sample-to-reference" || action === "adjust-reference-sample") {
    openSampleLibraryDetailModal("reference", button.dataset.id);
    return;
  }

  if (action === "open-sample-library-lifecycle-from-pool") {
    openSampleLibraryDetailModal("lifecycle", button.dataset.id);
    return;
  }

  if (action === "remove-sample-from-reference-pool") {
    setButtonBusy(button, true, "移出中...");

    try {
      const response = await apiJson(sampleLibraryApi, {
        method: "PATCH",
        body: JSON.stringify({
          id: button.dataset.id,
          reference: {
            enabled: false,
            tier: "",
            notes: ""
          }
        })
      });
      appState.sampleLibraryRecords = Array.isArray(response.items) ? response.items : appState.sampleLibraryRecords;
      appState.selectedSampleLibraryRecordId = String(response.item?.id || button.dataset.id || "");
      renderSampleLibraryWorkspace();
    } finally {
      setButtonBusy(button, false);
    }
    return;
  }

  if (action === "mark-sample-as-negative") {
    setButtonBusy(button, true, "标记中...");

    try {
      const response = await apiJson(sampleLibraryApi, {
        method: "PATCH",
        body: JSON.stringify({
          id: button.dataset.id,
          sampleType: "missed_violation"
        })
      });
      appState.sampleLibraryRecords = Array.isArray(response.items) ? response.items : appState.sampleLibraryRecords;
      appState.selectedSampleLibraryRecordId = String(response.item?.id || button.dataset.id || "");
      appState.sampleLibraryPoolsModal.tab = "negative";
      renderSampleLibraryWorkspace();
    } finally {
      setButtonBusy(button, false);
    }
    return;
  }

  if (action === "restore-sample-from-negative-pool") {
    setButtonBusy(button, true, "恢复中...");

    try {
      const response = await apiJson(sampleLibraryApi, {
        method: "PATCH",
        body: JSON.stringify({
          id: button.dataset.id,
          sampleType: ""
        })
      });
      appState.sampleLibraryRecords = Array.isArray(response.items) ? response.items : appState.sampleLibraryRecords;
      appState.selectedSampleLibraryRecordId = String(response.item?.id || button.dataset.id || "");
      appState.sampleLibraryPoolsModal.tab = "regular";
      renderSampleLibraryWorkspace();
    } finally {
      setButtonBusy(button, false);
    }
    return;
  }

  if (action === "sample-library-import-open-advanced-modal") {
    const card = button.closest("[data-import-index]");
    openSampleLibraryImportAdvancedModal(card?.dataset.importIndex || "");
    return;
  }

  if (action === "open-sample-library-base-modal") {
    openSampleLibraryBaseModal(button.dataset.id);
    return;
  }

  if (action === "open-sample-library-reference-modal") {
    openSampleLibraryDetailModal("reference", button.dataset.id);
    return;
  }

  if (action === "open-sample-library-lifecycle-modal") {
    openSampleLibraryDetailModal("lifecycle", button.dataset.id);
    return;
  }

  if (action === "open-sample-library-calibration-modal") {
    openSampleLibraryDetailModal("calibration", button.dataset.id);
    return;
  }

  if (action === "open-sample-library-record-list-modal") {
    openSampleLibraryRecordInlineEditorModal();
    return;
  }

  if (action === "switch-sample-library-record-inline-editor-record") {
    requestSampleLibraryRecordInlineEditorSwitch(button.dataset.id);
    return;
  }

  if (action === "open-sample-library-delete-modal") {
    openSampleLibraryDeleteModal(button.dataset.id);
    return;
  }

  if (action === "close-sample-library-modal") {
    requestCloseSampleLibraryRecordInlineEditorModal();
    return;
  }

  if (action === "close-lexicon-workspace-modal") {
    closeLexiconWorkspaceModal();
    return;
  }

  if (action === "prefill-sample-library-modal-calibration-prediction") {
    const requirementMessage = getSampleLibraryCalibrationPredictionPrefillRequirementMessage();

    if (requirementMessage) {
      setSampleLibraryModalMessage(requirementMessage);
      return;
    }

    const prediction = buildSampleLibraryCalibrationPredictionFromCurrentState();
    setSampleLibraryCalibrationPredictionFields(byId("sample-library-modal-content"), prediction);
    setSampleLibraryModalMessage("已根据当前检测结果预填预判字段。");
    return;
  }

  if (action === "save-platform-outcome") {
    const source = button.dataset.source || "analysis";
    const requirementMessage = getLifecycleSaveRequirementMessage(source, button.dataset.candidateId, button.dataset.candidateIndex);

    if (requirementMessage) {
      syncLifecycleResultActions();
      return;
    }

    openPlatformOutcomeModal({
      source,
      publishStatus: button.dataset.publishStatus,
      candidateId: button.dataset.candidateId,
      candidateIndex: button.dataset.candidateIndex,
      notes: button.dataset.note || "",
      views: 0
    });
    return;
  }

  if (action === "send-feedback-to-review-queue") {
    openFeedbackRuleQueueModal({
      platformReason: button.dataset.platformReason || "",
      suspiciousPhrases: uniqueStrings([
        ...splitCSV(button.dataset.suspiciousPhrases || ""),
        ...splitCSV(button.dataset.feedbackModelSuspiciousPhrases || "")
      ]),
      contextCategories: splitCSV(button.dataset.feedbackModelContextCategories || "")
    });
    return;
  }

  if (action === "send-feedback-to-false-positive") {
    openFeedbackFalsePositiveModal({
      title: button.dataset.title || "",
      body: button.dataset.body || "",
      tags: splitCSV(button.dataset.tags || ""),
      userNotes: button.dataset.platformReason || "",
      analysisVerdict: button.dataset.analysisVerdict || "",
      analysisScore: Number(button.dataset.analysisScore || 0),
      noteId: button.dataset.noteId || "",
      createdAt: button.dataset.createdAt || ""
    });
    return;
  }

  if (action === "open-false-positive-list-modal") {
    openFalsePositiveListModal();
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

    if (action === "delete-inner-space-term") {
      await apiJson(innerSpaceTermsApi, {
        method: "DELETE",
        body: JSON.stringify({
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
syncSampleLibraryCreateButtonExpanded(false);

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
