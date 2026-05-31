import {
  buildFalsePositiveActionMarkup,
  buildFalsePositiveCaptureSources,
  buildFalsePositiveEntryMarkup,
  buildLongTextDetails
} from "./false-positive-view.js";
import {
  buildInnerSpaceTermsListMarkup as buildInnerSpaceTermsListMarkupView,
  buildLexiconListMarkup as buildLexiconListMarkupView,
  renderFeedbackLog as renderFeedbackLogView,
  renderFalsePositiveLog as renderFalsePositiveLogView
} from "./admin-panels-view.js";
import { buildRewriteBodyMarkup } from "./rewrite-result-view.js";
import {
  buildSampleLibraryCalibrationPrediction,
  buildSampleLibraryCalibrationEvidenceState,
  resolveSampleLibraryCalibrationPrefillSource
} from "./sample-library-calibration.js";
import {
  buildSampleLibraryCalibrationEditorSectionsMarkup as buildSampleLibraryCalibrationEditorSectionsMarkupView,
  buildSampleLibraryCalibrationEvidenceMarkup as buildSampleLibraryCalibrationEvidenceMarkupView,
  buildSampleLibraryRetroChipGroupMarkup as buildSampleLibraryRetroChipGroupMarkupView,
  deriveSampleLibraryCalibrationSignalCategories,
  deriveSampleLibraryRetroSignalSuggestions,
  parseSampleLibraryRetroChipField,
  readSampleLibraryRetroChipFieldValue,
  readSampleLibraryRetroChipListValue,
  serializeSampleLibraryRetroChipField,
  toggleSampleLibraryRetroChipSelection
} from "./sample-library-calibration-view.js";
import { deriveSampleLibraryReferenceApplication } from "./sample-library-reference-application.js";
import {
  buildStyleProfileGenerationLabel,
  buildStyleProfileModalMarkup,
  readStyleProfileModalPayload as readStyleProfileModalPayloadView
} from "./style-profile-view.js";
import {
  getSelectedGenerationThemeInspiration as getSelectedGenerationThemeInspirationView,
  renderGenerationThemeInspirationDetail as renderGenerationThemeInspirationDetailView,
  renderGenerationThemeInspirationModal as renderGenerationThemeInspirationModalView
} from "./theme-inspiration-view.js";
import {
  applySampleLibraryAccountPlannerPrefill as applySampleLibraryAccountPlannerPrefillView,
  getSelectedSampleLibraryAccountPlannerCard as getSelectedSampleLibraryAccountPlannerCardView,
  renderSampleLibraryAccountPlannerDetail as renderSampleLibraryAccountPlannerDetailView,
  renderSampleLibraryAccountPlannerResult as renderSampleLibraryAccountPlannerResultView,
  renderSampleLibraryExternalSamplesModal as renderSampleLibraryExternalSamplesModalView
} from "./account-planner-view.js";
import { buildXhsAccountDiagnosisModalMarkup as buildXhsAccountDiagnosisModalMarkupView } from "./xhs-account-diagnosis-view.js";
import { renderDraftIdeasList as renderDraftIdeasListView } from "./draft-ideas-view.js";
import {
  buildSampleLibraryRecordCardMarkup as buildSampleLibraryRecordCardMarkupView,
  buildSampleLibraryRecordListMarkup as buildSampleLibraryRecordListMarkupView,
  buildSamplePoolActionMarkup as buildSamplePoolActionMarkupView,
  renderSamplePoolCards as renderSamplePoolCardsView
} from "./sample-library-record-view.js";
import {
  buildSampleLibraryRecordListModalMarkup as buildSampleLibraryRecordListModalMarkupView,
  buildSampleLibraryRecordInlineEditorDraft as buildSampleLibraryRecordInlineEditorDraftView,
  buildSampleLibraryRecordInlineEditorPatchPayload as buildSampleLibraryRecordInlineEditorPatchPayloadView,
  isSampleLibraryRecordInlineEditorDirty as isSampleLibraryRecordInlineEditorDirtyView,
  filterSampleLibraryRecordInlineEditorItems as filterSampleLibraryRecordInlineEditorItemsView,
  getSampleLibraryRecordInlineEditorFilterSummaryText as getSampleLibraryRecordInlineEditorFilterSummaryTextView,
  buildSampleLibraryRecordInlineEditorSidebarListMarkup as buildSampleLibraryRecordInlineEditorSidebarListMarkupView,
  buildSampleLibraryRecordInlineEditorSidebarMarkup as buildSampleLibraryRecordInlineEditorSidebarMarkupView,
  readSampleLibraryRecordInlineEditorDraftFromModal as readSampleLibraryRecordInlineEditorDraftFromModalView,
  buildSampleLibraryRecordInlineEditorModalMarkup as buildSampleLibraryRecordInlineEditorModalMarkupView,
  buildSampleLibraryRecordInlineEditorSwitchConfirmModalMarkup as buildSampleLibraryRecordInlineEditorSwitchConfirmModalMarkupView,
  buildSampleLibraryRecordInlineEditorCloseConfirmModalMarkup as buildSampleLibraryRecordInlineEditorCloseConfirmModalMarkupView,
  buildSampleLibraryNoteModalMarkup as buildSampleLibraryNoteModalMarkupView,
  buildSampleLibraryCreateModalMarkup as buildSampleLibraryCreateModalMarkupView,
  buildSampleLibraryBaseModalMarkup as buildSampleLibraryBaseModalMarkupView,
  buildSampleLibraryDeleteModalMarkup as buildSampleLibraryDeleteModalMarkupView,
  buildFeedbackRuleQueueModalMarkup as buildFeedbackRuleQueueModalMarkupView,
  buildFeedbackFalsePositiveModalMarkup as buildFeedbackFalsePositiveModalMarkupView
} from "./sample-library-modal-view.js";
import {
  buildSampleLibraryModalTagPickerMarkup as buildSampleLibraryModalTagPickerMarkupView,
  buildSampleLibraryModalSectionMarkup as buildSampleLibraryModalSectionMarkupView,
  buildSampleLibraryBaseEditorSectionMarkup as buildSampleLibraryBaseEditorSectionMarkupView,
  buildSampleLibraryReferenceEditorSectionMarkup as buildSampleLibraryReferenceEditorSectionMarkupView,
  buildSampleLibraryLifecycleEditorSectionMarkup as buildSampleLibraryLifecycleEditorSectionMarkupView,
  buildSampleLibraryReferenceModalMarkup as buildSampleLibraryReferenceModalMarkupView,
  buildSampleLibraryLifecycleModalMarkup as buildSampleLibraryLifecycleModalMarkupView
} from "./sample-library-sections-view.js";
import {
  readSampleLibraryCreateModalPayload as readSampleLibraryCreateModalPayloadView,
  readSampleLibraryModalBasePayload as readSampleLibraryModalBasePayloadView,
  getSampleLibraryCreateRequirementMessage as getSampleLibraryCreateRequirementMessageView,
  readFeedbackRuleQueueModalPayload as readFeedbackRuleQueueModalPayloadView,
  readFeedbackFalsePositiveModalPayload as readFeedbackFalsePositiveModalPayloadView,
  buildSampleLibraryDetailModalConfig as buildSampleLibraryDetailModalConfigView,
  readSampleLibraryModalReferencePayload as readSampleLibraryModalReferencePayloadView,
  readSampleLibraryModalLifecyclePayload as readSampleLibraryModalLifecyclePayloadView,
  readSampleLibraryModalCalibrationPayload as readSampleLibraryModalCalibrationPayloadView
} from "./sample-library-form-helpers.js";
import {
  buildPlatformOutcomeActions as buildPlatformOutcomeActionsView,
  buildPlatformOutcomeModalMarkup as buildPlatformOutcomeModalMarkupView,
  getPlatformOutcomeOption as getPlatformOutcomeOptionView,
  buildCrossReviewMarkup as buildCrossReviewMarkupView,
  buildAnalyzeCompareSummaryMarkup as buildAnalyzeCompareSummaryMarkupView,
  buildAnalyzeCompareContentActionsMarkup as buildAnalyzeCompareContentActionsMarkupView,
  buildAnalyzeCompareCardMarkup as buildAnalyzeCompareCardMarkupView,
  buildAnalyzeCompareModalMarkup as buildAnalyzeCompareModalMarkupView,
  renderAnalyzeCompareModal as renderAnalyzeCompareModalView,
  renderCrossReviewResult as renderCrossReviewResultView,
  renderAnalysis as renderAnalysisView,
  renderRewriteResult as renderRewriteResultView,
  getDefaultAnalyzeCompareBasisSelection as getDefaultAnalyzeCompareBasisSelectionView,
  getAnalyzeCompareSelectionContext as getAnalyzeCompareSelectionContextView,
  analyzeCompareModelLabel as analyzeCompareModelLabelView,
  buildAnalyzeCompareBasisOptionLabel as buildAnalyzeCompareBasisOptionLabelView
} from "./analysis-review-view.js";
import { renderXhsTopSignalsBrowser } from "./xhs-top-signals-view.js";

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

function splitLineList(value = "") {
  return uniqueStrings(
    String(value || "")
      .split(/[\n，,、]/)
      .map((item) => item.trim())
      .filter(Boolean)
  );
}

function joinLineList(items = []) {
  return Array.isArray(items) ? items.join("\n") : "";
}

function uniqueStrings(items = []) {
  return [...new Set((Array.isArray(items) ? items : [items]).map((item) => String(item || "").trim()).filter(Boolean))];
}

const REFERENCE_METRIC_THRESHOLD = {
  likes: 30,
  favorites: 20,
  comments: 10,
  shares: 20,
  nearLikes: 15,
  nearFavorites: 10,
  nearComments: 5,
  nearShares: 10,
  directViews: 2000,
  supportViews: 1000
};

const SAMPLE_LIBRARY_RETRO_REMINDER_START_DATE = "2026-05-11";
const GENERATION_REFERENCE_IMAGE_LIMIT = 5;
const GENERATION_REFERENCE_IMAGE_MAX_FILE_BYTES = 4 * 1024 * 1024;
const GENERATION_REFERENCE_TEXT_MAX_FILE_BYTES = 512 * 1024;
const GENERATION_REFERENCE_TOTAL_MAX_BYTES = 12 * 1024 * 1024;
const sampleLibraryRetroChipPresets = {
  missReason: [
    "低表现",
    "标题偏弱",
    "开头不够抓人",
    "正文过长",
    "正文信息密度不稳",
    "标签不准",
    "合集不匹配",
    "风险判断偏差",
    "参考样本不够贴",
    "发布时间影响"
  ],
  validatedSignals: [
    "标题结构",
    "开头切口",
    "合集匹配",
    "标签匹配",
    "风格稳定",
    "情绪共鸣",
    "互动点明确",
    "风险预判准确",
    "参考样本有效"
  ],
  invalidatedSignals: [
    "标题判断失准",
    "标签判断失准",
    "合集判断失准",
    "风险偏高估",
    "风险偏低估",
    "表现高估",
    "表现低估",
    "正文长度失准",
    "互动预期失准"
  ],
  ruleImprovementCandidate: [
    "同类标题结构可提权",
    "同类合集可提权",
    "情绪共鸣标签可提权",
    "风险词权重需上调",
    "风险词权重需下调",
    "正文长度阈值需调整",
    "标签映射需补充",
    "参考样本权重需调整"
  ]
};

function buildSampleLibraryRetroChipGroupMarkup(args = {}) {
  return buildSampleLibraryRetroChipGroupMarkupView(args, {
    escapeHtml,
    uniqueStrings
  });
}

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
      `评论 >= ${REFERENCE_METRIC_THRESHOLD.comments}`,
      `分享 >= ${REFERENCE_METRIC_THRESHOLD.shares}`,
      `浏览 >= ${REFERENCE_METRIC_THRESHOLD.directViews}`
    ],
    { joiner, lastJoiner }
  );
}

function getReferenceThresholdAssistRuleText({ joiner = "、", lastJoiner = " 或" } = {}) {
  const nearRule = formatReferenceThresholdRule(
    [
      `点赞 >= ${REFERENCE_METRIC_THRESHOLD.nearLikes}`,
      `收藏 >= ${REFERENCE_METRIC_THRESHOLD.nearFavorites}`,
      `评论 >= ${REFERENCE_METRIC_THRESHOLD.nearComments}`,
      `分享 >= ${REFERENCE_METRIC_THRESHOLD.nearShares}`
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

function generationVariantLabel(variant) {
  const normalized = String(variant || "").trim();

  if (!normalized) return "生成稿";
  if (variant === "final") return "最终稿";
  if (variant === "safe") return "稳妥版";
  if (variant === "natural") return "自然版";
  if (variant === "expressive") return "表达版";
  return /[A-Za-z_-]/.test(normalized) ? "生成稿" : normalized;
}

function normalizePublishHashtag(value = "") {
  return String(value || "")
    .trim()
    .replace(/^#+/g, "")
    .trim();
}

function buildGenerationPublishCopyText(finalDraft = {}) {
  const body = String(finalDraft?.body || "").trim();
  const tags = uniqueStrings(["科普", ...(Array.isArray(finalDraft?.tags) ? finalDraft.tags : [])].map(normalizePublishHashtag).filter(Boolean));
  const tagLine = tags.map((tag) => `#${tag}`).join(" ");

  return [body, tagLine].filter(Boolean).join("\n\n");
}

function buildGenerationCoverImagePromptCopyText(finalDraft = {}) {
  return String(finalDraft?.coverImagePrompt || "").trim();
}

async function writeTextToClipboard(text = "") {
  if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "readonly");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

function findGenerationResultCandidate(candidateId = "", candidateIndex = "") {
  const items = Array.isArray(appState.latestGeneration?.scoredCandidates) ? appState.latestGeneration.scoredCandidates : [];
  const normalizedCandidateId = String(candidateId || "").trim();

  if (normalizedCandidateId) {
    const matched = items.find((item) => String(item?.id || "").trim() === normalizedCandidateId);

    if (matched) {
      return matched;
    }
  }

  const index = Number(candidateIndex);
  return Number.isInteger(index) && index >= 0 ? items[index] || null : null;
}

function predictionMatchedLabel(value) {
  return value === true ? "预判命中" : "待复盘";
}

function lifecycleSourceLabel(source) {
  const normalized = String(source || "").trim();

  if (!normalized) return "手动记录";
  if (source === "false_positive_reflow") return "误报回流";
  if (source === "analysis-compare") return "模型对比检测";
  if (source === "generation_final") return "最终推荐稿";
  if (source === "generation_candidate") return "生成候选稿";
  if (source === "generation") return "生成稿";
  if (source === "rewrite") return "改写稿";
  if (source === "analysis") return "检测记录";
  if (normalized === "manual") return "手动记录";
  return /[A-Za-z_-]/.test(normalized) ? "手动记录" : normalized;
}

function compactText(value, maxLength = 80) {
  const text = String(value || "").replace(/\s+/g, " ").trim();

  if (!text) {
    return "";
  }

  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

function buildGenerationBlockerReasonsMarkup(item = {}) {
  const verdict = String(item?.analysis?.finalVerdict || item?.analysis?.verdict || "").trim();
  const blockerReasons = Array.isArray(item?.blockerReasons) ? item.blockerReasons.filter(Boolean) : [];

  if (!["manual_review", "hard_block"].includes(verdict) || !blockerReasons.length) {
    return "";
  }

  return `
    <div class="generation-blocker-box">
      <span>当前卡点</span>
      <ul>
        ${blockerReasons.map((reason) => `<li>${escapeHtml(reason)}</li>`).join("")}
      </ul>
    </div>
  `;
}

function isAdminDataInitialLoading() {
  return appState.adminDataLoading?.phase === "initial";
}

function isAdminDataRefreshing() {
  return appState.adminDataLoading?.phase === "refresh";
}

function isSummaryRefreshing() {
  return appState.summaryLoading?.phase === "refresh";
}

function isSampleLibraryInitialLoading() {
  return appState.sampleLibraryLoading?.phase === "initial";
}

function isSampleLibraryRefreshing() {
  return appState.sampleLibraryLoading?.phase === "refresh";
}

function buildAdminDataLoadingBlockMarkup(message = "加载中...", { count = 2, isRefreshing = false } = {}) {
  const cards = Array.from({ length: Math.max(1, Number(count) || 1) }, () => `
      <article class="admin-data-loading-item">
        <strong>${escapeHtml(message)}</strong>
        <p>正在同步这一区块的数据，请稍候。</p>
      </article>
    `).join("");

  return `
    <div class="admin-data-loading-block" data-loading="${escapeHtml(String(isRefreshing))}">
      ${cards}
    </div>
  `;
}

function syncAdminDataLoadingUI() {
  const isRefreshing = isAdminDataRefreshing();
  const loadingTargets = [
    "review-queue",
    "feedback-priority-list",
    "feedback-log-secondary-list"
  ];

  loadingTargets.forEach((id) => {
    const node = byId(id);

    if (node) {
      node.dataset.loading = isRefreshing ? "true" : "";
    }
  });

  const styleProfileButton = byId("generation-style-profile-button");

  if (styleProfileButton) {
    const defaultLabel = styleProfileButton.dataset.label || styleProfileButton.textContent || "查看 / 编辑当前风格画像";
    styleProfileButton.dataset.label = defaultLabel;
    styleProfileButton.dataset.loading = isRefreshing ? "true" : "";

    if (isAdminDataInitialLoading()) {
      styleProfileButton.disabled = true;
      styleProfileButton.textContent = "画像加载中...";
      return;
    }

    styleProfileButton.disabled = false;
    styleProfileButton.textContent = isRefreshing ? "同步画像中..." : defaultLabel;
  }
}

function setAdminDataLoadingState(phase = "idle", error = "") {
  appState.adminDataLoading = {
    phase,
    error: String(error || "").trim()
  };
  syncAdminDataLoadingUI();
}

function buildSummaryLoadingPlaceholdersMarkup() {
  return [
    {
      label: "待处理误判",
      meta: "正在同步误判与回流数据。"
    },
    {
      label: "待补好样本",
      meta: "正在汇总学习样本与参考候选。"
    },
    {
      label: "今日内容流转",
      meta: "正在整理当前待办和工作节奏。"
    }
  ]
    .map(
      ({ label, meta }) => `
        <article class="summary-card summary-card-loading">
          <span>${escapeHtml(label)}</span>
          <strong>...</strong>
          <p class="summary-card-meta">${escapeHtml(meta)}</p>
          <em class="summary-card-action">加载中...</em>
        </article>
      `
    )
    .join("");
}

function syncSummaryLoadingUI() {
  const gridNode = byId("summary-grid");

  if (!gridNode) {
    return;
  }

  gridNode.dataset.loading = isSummaryRefreshing() ? "true" : "";
}

function setSummaryLoadingState(phase = "idle", error = "") {
  appState.summaryLoading = {
    phase,
    error: String(error || "").trim()
  };
  syncSummaryLoadingUI();
}

function renderSummaryLoadingPlaceholders() {
  const gridNode = byId("summary-grid");

  if (!gridNode) {
    return;
  }

  gridNode.innerHTML = buildSummaryLoadingPlaceholdersMarkup();
}

function syncSampleLibraryLoadingUI() {
  const loadingTargets = [
    "sample-library-record-list",
    "sample-library-calibration-review-queue"
  ];

  loadingTargets.forEach((id) => {
    const node = byId(id);

    if (node) {
      node.dataset.loading = isSampleLibraryRefreshing() ? "true" : "";
    }
  });

  const countNode = byId("sample-library-list-count");

  if (countNode) {
    countNode.dataset.loading = isSampleLibraryRefreshing() ? "true" : "";
  }
}

function setSampleLibraryLoadingState(phase = "idle", error = "") {
  appState.sampleLibraryLoading = {
    phase,
    error: String(error || "").trim()
  };
  syncSampleLibraryLoadingUI();
}

function renderSampleLibraryLoadingPlaceholders() {
  renderSampleLibraryList([]);
  renderSampleLibraryCalibrationReviewQueue([]);
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
        <strong>${escapeHtml(preview.changeType === "whitelist" ? "白名单生效预演" : "违规词库生效预演")}</strong>
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

  document.querySelectorAll(`[data-visible-with-tab]`).forEach((node) => {
    const shouldShow = node.dataset.visibleWithTab === targetId;
    node.hidden = !shouldShow;
    node.classList.toggle("is-visible", shouldShow);
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

function revealGenerationDraftInbox() {
  activateTab("main-workbench", "generation-workbench-pane");
  byId("generation-draft-inbox-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function revealSampleLibraryReflowPane() {
  activateTab("data-maintenance", "sample-library-pane");
  byId("sample-library-reflow-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function openSampleLibraryRecord(recordId = "", step = "base") {
  revealSampleLibraryPane();
  appState.sampleLibraryFilter = "all";
  appState.sampleLibraryCollectionFilter = "all";
  appState.selectedSampleLibraryRecordId = String(recordId || "");
  if (byId("sample-library-filter")) {
    byId("sample-library-filter").value = "all";
  }
  if (byId("sample-library-collection-filter")) {
    byId("sample-library-collection-filter").value = "all";
  }
  renderSampleLibraryWorkspace();
  openSampleLibraryRecordInlineEditorModal(recordId);
}

function focusSampleLibraryRecordFromPools(recordId = "", step = "base") {
  closeSampleLibraryPoolsModal();
  openSampleLibraryRecord(recordId, step);
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
  latestAnalyzeCompareResult: null,
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
    reviewQueue: [],
    styleProfile: null
  },
  adminDataLoading: {
    phase: "initial",
    error: ""
  },
  summaryData: null,
  summaryLoading: {
    phase: "initial",
    error: ""
  },
  collectionTypeOptions: [],
  sampleLibraryRecords: [],
  sampleLibraryLoading: {
    phase: "initial",
    error: ""
  },
  selectedSampleLibraryRecordId: "",
  sampleLibraryDetailStep: "base",
  sampleLibraryCollectionFilter: "all",
  sampleLibraryFilter: "all",
  sampleLibrarySearch: "",
  sampleLibraryMetricFilters: {
    likes: "",
    favorites: "",
    comments: "",
    views: "",
    shares: ""
  },
  sampleLibraryImportDrafts: [],
  sampleLibraryImportMessage: "",
  externalReferenceSamples: [],
  externalReferenceSamplesModal: {
    open: false,
    loading: false,
    message: ""
  },
  sampleLibraryAccountPlanner: {
    loading: false,
    message: "",
    summary: null,
    cards: [],
    selectedPlanId: ""
  },
  xhsAccountDiagnosis: {
    loading: false,
    message: "",
    result: null,
    generatedAt: "",
    currentRunResult: null,
    currentRunGeneratedAt: "",
    subscription: null,
    canSubscribe: false,
    report: null
  },
  xhsTopSignals: {
    loading: false,
    message: "",
    redId: "",
    track: "",
    keyword: "",
    tags: "",
    activeFilter: "daily",
    items: {
      dailyTop: [],
      weeklyTop: [],
      lowTop: []
    },
    generatedAt: "",
    selectedSignalId: ""
  },
  draftIdeas: {
    loading: false,
    message: "",
    items: [],
    draftIdeasStatusView: "draft",
    draftIdeasSortOrder: "newest"
  },
  generationReferenceAssets: {
    images: [],
    textFiles: [],
    message: ""
  },
  generationReferenceSearch: {
    open: false,
    loading: false,
    message: "",
    items: [],
    selectedIndices: []
  },
  generationThemeInspiration: {
    open: false,
    loading: false,
    items: [],
    selectedThemeId: "",
    message: "",
    resultMessage: "",
    requestId: 0
  },
  generationReferenceAssetsPending: Promise.resolve(),
  generationReferenceAssetsLocked: false,
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
    tab: "reference",
    search: "",
    metricFilters: {
      likes: "",
      favorites: "",
      comments: "",
      views: "",
      shares: ""
    }
  }
};

const presetAnalyzeTags = [
  "两性",
  "身体探索",
  "关系沟通",
  "亲密关系",
  "愉悦",
  "大人也要玩玩具",
  "悦己",
  "深夜话题",
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
const analyzeCompareApi = "/api/analyze/compare";
const sampleLibraryApi = "/api/sample-library";
const sampleLibraryMarkdownImportParseApi = "/api/sample-library/markdown-import/parse";
const sampleLibraryMarkdownImportCommitApi = "/api/sample-library/markdown-import/commit";
const sampleLibraryCalibrationReplayApi = "/api/sample-library/calibration-replay";
const sampleLibraryExternalSamplesApi = "/api/sample-library/external-reference-samples";
const sampleLibraryAccountPlannerParseApi = "/api/sample-library/account-planner/parse";
const sampleLibraryAccountPlannerAnalyzeApi = "/api/sample-library/account-planner/analyze";
const xhsAccountDiagnosisApi = "/api/xhs/account-diagnosis";
const xhsTopSignalsApi = "/api/xhs/top-signals";
const draftIdeasApi = "/api/draft-ideas";
const innerSpaceTermsApi = "/api/admin/inner-space-terms";
const styleProfileAdminApi = "/api/admin/style-profile";
const generationThemeInspirationsApi = "/api/generate-theme-inspirations";
let generationReferenceSearchRequestSequence = 0;
let generationThemeInspirationRequestSequence = 0;

function syncBodyModalState() {
  const sampleLibraryModalOpen = byId("sample-library-modal")?.hidden === false;
  const lexiconWorkspaceModalOpen = byId("lexicon-workspace-modal")?.hidden === false;
  const sampleLibraryPoolsModalOpen = byId("sample-library-pools-modal")?.hidden === false;
  const sampleLibraryExternalSamplesModalOpen = byId("sample-library-external-samples-modal")?.hidden === false;
  const generationThemeInspirationModalOpen = byId("generation-theme-inspiration-modal")?.hidden === false;
  const generationReferenceSearchModalOpen = byId("generation-reference-search-modal")?.hidden === false;
  document.body.classList.toggle(
    "modal-open",
    sampleLibraryModalOpen ||
      lexiconWorkspaceModalOpen ||
      sampleLibraryPoolsModalOpen ||
      sampleLibraryExternalSamplesModalOpen ||
      generationThemeInspirationModalOpen ||
      generationReferenceSearchModalOpen
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
  hideSaveButton = false,
  hideCancelButton = false
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
    cancelButton.hidden = hideCancelButton;
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
    cancelButton.hidden = false;
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

function formatUiDateTime(value = "") {
  const text = String(value || "").trim();

  if (!text) {
    return "";
  }

  const timestamp = Date.parse(text);

  if (!Number.isFinite(timestamp)) {
    return text;
  }

  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

function openXhsAccountDiagnosisModal({ message = "", useLatestStoredResult = true } = {}) {
  appState.sampleLibraryModal = {
    kind: "xhs-account-diagnosis"
  };

  const result = useLatestStoredResult ? appState.xhsAccountDiagnosis?.result || null : appState.xhsAccountDiagnosis?.currentRunResult || null;
  const generatedAt = useLatestStoredResult
    ? appState.xhsAccountDiagnosis?.generatedAt || ""
    : appState.xhsAccountDiagnosis?.currentRunGeneratedAt || "";

  renderSampleLibraryModal({
    title: "小红书账号现状与对标账号",
    subtitle: generatedAt ? `展示当前分析结果 · ${formatUiDateTime(generatedAt)}` : "展示当前分析结果。",
    body: buildXhsAccountDiagnosisModalMarkupView(
      {
        result,
        subscription: appState.xhsAccountDiagnosis?.subscription || null,
        message,
        canSubscribe: appState.xhsAccountDiagnosis?.canSubscribe === true,
        report: appState.xhsAccountDiagnosis?.report || null
      },
      {
        escapeHtml
      }
    ),
    hideSaveButton: true,
    hideCancelButton: true,
    cancelLabel: "关闭"
  });
  setSampleLibraryModalMessage("");
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
  setAdminDataLoadingState("idle");
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
  return buildSamplePoolActionMarkupView(record, pool, {
    escapeHtml,
    getSampleRecordPublish,
    sampleLibraryPoolLabel
  });
}

function renderSamplePoolCards(items = [], pool = "reference") {
  return renderSamplePoolCardsView(items, pool, {
    escapeHtml,
    getSampleRecordTitle,
    getSampleRecordPublish,
    getSampleRecordReference,
    getSampleRecordTags,
    getSamplePoolWhyLabel,
    getSamplePoolWhyHelperText,
    sampleLibraryPoolLabel,
    collectionTypeLabel,
    getSampleRecordCollectionType,
    publishStatusLabel,
    successTierLabel,
    joinCSV,
    buildSamplePoolActionMarkup
  });
}

function syncSampleLibraryPoolsModalSearchResults() {
  const modal = byId("sample-library-pools-modal");
  const contentNode = byId("sample-library-pools-modal-content");

  if (!modal || !contentNode) {
    return;
  }

  const pool = String(appState.sampleLibraryPoolsModal?.tab || "reference").trim() || "reference";
  const poolSearch = String(appState.sampleLibraryPoolsModal?.search || "");
  const poolMetricFilters = appState.sampleLibraryPoolsModal?.metricFilters || {};
  const allRecords = Array.isArray(appState.sampleLibraryRecords) ? appState.sampleLibraryRecords : [];
  const filteredRecords = filterSamplePoolRecords(allRecords, {
    search: poolSearch,
    metricFilters: poolMetricFilters
  });
  const summary = buildSamplePoolSummary(appState.sampleLibraryRecords);
  const filteredSummary = buildSamplePoolSummary(filteredRecords);
  const description = buildSamplePoolDescription(pool);
  const poolRecords = allRecords.filter((record) => classifySampleLibraryPool(record) === pool);
  const items = filteredRecords.filter((record) => classifySampleLibraryPool(record) === pool);
  const hasPoolFilters =
    Boolean(poolSearch.trim()) ||
    Object.values(poolMetricFilters).some((value) => String(value || "").trim());
  const emptyMessage = hasPoolFilters && !items.length && poolRecords.length ? "当前筛选下没有匹配的记录。" : description.empty;
  const helperNode = contentNode.querySelector('[data-role="sample-pool-search-helper"]');
  const listNode = contentNode.querySelector('[data-role="sample-pool-card-list"]');

  modal.querySelectorAll("[data-sample-pool-tab]").forEach((button) => {
    const tab = String(button.dataset.samplePoolTab || "reference");
    button.textContent = formatSamplePoolTabLabel(tab, filteredSummary[tab] || 0);
    button.setAttribute("aria-selected", String(tab === pool));
  });

  if (helperNode) {
    helperNode.textContent = hasPoolFilters
      ? `当前筛选：参考 ${filteredSummary.reference} / 普通 ${filteredSummary.regular} / 反例 ${filteredSummary.negative}`
      : `全部样本：参考 ${summary.reference} / 普通 ${summary.regular} / 反例 ${summary.negative}`;
  }

  if (listNode) {
    listNode.innerHTML = renderSamplePoolCards(items, pool) || `<div class="result-card muted">${escapeHtml(emptyMessage)}</div>`;
  }
}

function renderSampleLibraryPoolsModal() {
  const modal = byId("sample-library-pools-modal");
  const contentNode = byId("sample-library-pools-modal-content");

  if (!modal || !contentNode) {
    return;
  }

  const pool = String(appState.sampleLibraryPoolsModal?.tab || "reference").trim() || "reference";
  const poolSearch = String(appState.sampleLibraryPoolsModal?.search || "");
  const poolMetricFilters = appState.sampleLibraryPoolsModal?.metricFilters || {};
  const allRecords = Array.isArray(appState.sampleLibraryRecords) ? appState.sampleLibraryRecords : [];
  const filteredRecords = filterSamplePoolRecords(allRecords, {
    search: poolSearch,
    metricFilters: poolMetricFilters
  });
  const summary = buildSamplePoolSummary(appState.sampleLibraryRecords);
  const filteredSummary = buildSamplePoolSummary(filteredRecords);
  const description = buildSamplePoolDescription(pool);
  const poolRecords = allRecords.filter((record) => classifySampleLibraryPool(record) === pool);
  const items = filteredRecords.filter((record) => classifySampleLibraryPool(record) === pool);
  const hasPoolFilters =
    Boolean(poolSearch.trim()) ||
    Object.values(poolMetricFilters).some((value) => String(value || "").trim());
  const emptyMessage = hasPoolFilters && !items.length && poolRecords.length ? "当前筛选下没有匹配的记录。" : description.empty;

  modal.querySelectorAll("[data-sample-pool-tab]").forEach((button) => {
    const tab = String(button.dataset.samplePoolTab || "reference");
    button.textContent = formatSamplePoolTabLabel(tab, filteredSummary[tab] || 0);
    button.setAttribute("aria-selected", String(tab === pool));
  });

  contentNode.innerHTML = `
    <section class="sample-pool-panel">
      <div class="sample-pool-panel-head">
        <div>
          <strong>${escapeHtml(description.title)}</strong>
          <p>${escapeHtml(description.subtitle)}</p>
        </div>
      </div>
      <label class="sample-pool-toolbar">
        <span>按标题搜索全部样本池</span>
        <input name="samplePoolTitleFilter" value="${escapeHtml(poolSearch)}" placeholder="输入标题关键词，统一筛选 3 个样本池" />
      </label>
      <div class="sample-pool-metric-filters">
        <label>
          <span>最低点赞</span>
          <input name="samplePoolLikesFilter" type="number" min="0" step="1" value="${escapeHtml(String(poolMetricFilters.likes || ""))}" placeholder="例如 30" />
        </label>
        <label>
          <span>最低收藏</span>
          <input name="samplePoolFavoritesFilter" type="number" min="0" step="1" value="${escapeHtml(String(poolMetricFilters.favorites || ""))}" placeholder="例如 10" />
        </label>
        <label>
          <span>最低评论</span>
          <input name="samplePoolCommentsFilter" type="number" min="0" step="1" value="${escapeHtml(String(poolMetricFilters.comments || ""))}" placeholder="例如 5" />
        </label>
        <label>
          <span>最低浏览</span>
          <input name="samplePoolViewsFilter" type="number" min="0" step="1" value="${escapeHtml(String(poolMetricFilters.views || ""))}" placeholder="例如 1000" />
        </label>
        <label>
          <span>最低分享</span>
          <input name="samplePoolSharesFilter" type="number" min="0" step="1" value="${escapeHtml(String(poolMetricFilters.shares || ""))}" placeholder="例如 10" />
        </label>
      </div>
      <div class="item-actions">
        <button type="button" class="button button-ghost button-small" data-action="clear-sample-pool-filters">
          清空全部筛选
        </button>
      </div>
      <p class="helper-text" data-role="sample-pool-search-helper">
        ${
          hasPoolFilters
            ? escapeHtml(`当前筛选：参考 ${filteredSummary.reference} / 普通 ${filteredSummary.regular} / 反例 ${filteredSummary.negative}`)
            : escapeHtml(`全部样本：参考 ${summary.reference} / 普通 ${summary.regular} / 反例 ${summary.negative}`)
        }
      </p>
      <div class="sample-pool-card-list" data-role="sample-pool-card-list">
        ${renderSamplePoolCards(items, pool) || `<div class="result-card muted">${escapeHtml(emptyMessage)}</div>`}
      </div>
    </section>
  `;
}

function openSampleLibraryPoolsModal(pool = "reference") {
  appState.sampleLibraryPoolsModal = {
    open: true,
    tab: ["reference", "regular", "negative"].includes(pool) ? pool : "reference",
    search: "",
    metricFilters: {
      likes: "",
      favorites: "",
      comments: "",
      views: "",
      shares: ""
    }
  };
  renderSampleLibraryPoolsModal();
  setSampleLibraryPoolsModalOpen(true);
}

function closeSampleLibraryPoolsModal() {
  appState.sampleLibraryPoolsModal = {
    open: false,
    tab: String(appState.sampleLibraryPoolsModal?.tab || "reference"),
    search: "",
    metricFilters: {
      likes: "",
      favorites: "",
      comments: "",
      views: "",
      shares: ""
    }
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
    const errorMessage =
      payload?.error ||
      payload?.message ||
      (payload && typeof payload === "object" ? JSON.stringify(payload) : "") ||
      raw ||
      "请求失败";
    const error = new Error(errorMessage);
    if (typeof payload?.errorCode === "string" && payload.errorCode.trim()) {
      error.code = payload.errorCode.trim();
    }
    throw error;
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

function getPlatformOutcomeOption(status = "published_passed") {
  return getPlatformOutcomeOptionView(status);
}

function buildPlatformOutcomeActions(source = "analysis", options = {}) {
  return buildPlatformOutcomeActionsView(source, options, { escapeHtml });
}

function buildPlatformOutcomeModalMarkup({ publishStatus = "published_passed", notes = "", views = 0, shares = 0 } = {}) {
  return buildPlatformOutcomeModalMarkupView({ publishStatus, notes, views, shares }, {
    escapeHtml,
    getPlatformOutcomeOption
  });
}

function openPlatformOutcomeModal({
  source = "analysis",
  publishStatus = "published_passed",
  candidateId = "",
  candidateIndex = "",
  notes = "",
  views = 0,
  shares = 0
} = {}) {
  appState.sampleLibraryModal = {
    kind: "platform-outcome",
    source,
    publishStatus,
    candidateId,
    candidateIndex,
    notes,
    views,
    shares
  };

  renderSampleLibraryModal({
    title: "回填平台结果",
    subtitle: `${lifecycleSourceLabel(source)} · ${publishStatusLabel(publishStatus)}`,
    body: buildPlatformOutcomeModalMarkup({ publishStatus, notes, views, shares }),
    saveLabel: "确认回填"
  });
}

function readPlatformOutcomeModalPayload() {
  const contentNode = byId("sample-library-modal-content");

  return {
    notes: contentNode?.querySelector('[name="platformOutcomeNotes"]')?.value || "",
    views: contentNode?.querySelector('[name="platformOutcomeViews"]')?.value || 0,
    shares: contentNode?.querySelector('[name="platformOutcomeShares"]')?.value || 0
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

function parseDateOnlyValue(value = "") {
  const normalized = String(value || "").trim();

  if (!normalized) {
    return null;
  }

  const date = /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? new Date(`${normalized}T00:00:00`) : new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getDaysSinceDate(value = "", now = new Date()) {
  const sourceDate = parseDateOnlyValue(value);
  const nowDate = now instanceof Date ? now : new Date(now);

  if (!sourceDate || Number.isNaN(nowDate.getTime())) {
    return null;
  }

  const sourceDay = new Date(sourceDate.getFullYear(), sourceDate.getMonth(), sourceDate.getDate());
  const currentDay = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate());
  return Math.max(0, Math.floor((currentDay.getTime() - sourceDay.getTime()) / 86400000));
}

function buildSampleLibraryRetroTimingHint({ publish = {} } = {}) {
  const publishStatus = String(publish?.status || "not_published").trim() || "not_published";
  const publishedAt = String(publish?.publishedAt || "").trim();
  const daysSincePublish = getDaysSinceDate(publishedAt);

  if (publishStatus === "not_published") {
    return {
      text: "建议先同步发布结果；建议至少等到 T+7 再做发布后复盘。",
      state: "pending"
    };
  }

  if (!publishedAt || daysSincePublish === null) {
    return {
      text: "建议补充发布时间；建议至少等到 T+7 再做发布后复盘。",
      state: "pending"
    };
  }

  if (daysSincePublish < 7) {
    return {
      text: `已发布 ${daysSincePublish} 天，建议先持续观察；建议至少等到 T+7 再做发布后复盘。`,
      state: "pending"
    };
  }

  return {
    text: `已发布 ${daysSincePublish} 天，当前适合做终局复盘和参考样本确认。`,
    state: "final-review"
  };
}

function getSampleLibraryRetroTimingHintClassName(state = "pending") {
  if (state === "final-review") {
    return "sample-library-retro-timing-hint sample-library-retro-timing-hint--final-review";
  }

  return "sample-library-retro-timing-hint sample-library-retro-timing-hint--pending";
}

function syncStyleProfileStateFromPayload(payload = {}) {
  const styleProfile = payload?.styleProfile;

  if (!styleProfile || typeof styleProfile !== "object") {
    return null;
  }

  appState.adminData = {
    ...appState.adminData,
    styleProfile
  };

  return styleProfile;
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

function getActiveSampleLibraryCalibrationPrefillRecord() {
  const modalState = appState.sampleLibraryModal || {};
  const recordId =
    modalState.kind === "record-list-inline-editor"
      ? String(modalState.selectedRecordId || "")
      : String(modalState.recordId || "");

  if (!recordId) {
    return null;
  }

  return appState.sampleLibraryRecords.find((item) => String(item?.id || "") === recordId) || null;
}

function getSampleLibraryCalibrationPredictionPrefillSource() {
  return resolveSampleLibraryCalibrationPrefillSource({
    latestAnalyzePayload: appState.latestAnalyzePayload || null,
    latestAnalysis: appState.latestAnalysis || null,
    latestRewrite: appState.latestRewrite || null,
    record: getActiveSampleLibraryCalibrationPrefillRecord()
  });
}

function buildSampleLibraryCalibrationPredictionFromCurrentState() {
  return buildSampleLibraryCalibrationPrediction(
    getSampleLibraryCalibrationPredictionPrefillSource(),
    getSelectedModelSelections()
  );
}

function getSampleLibraryReferenceApplicationState({ recordOverride = null, calibrationOverride = null } = {}) {
  const modalState = appState.sampleLibraryModal || {};
  const baseRecord = recordOverride || getActiveSampleLibraryCalibrationPrefillRecord();

  if (!baseRecord) {
    return {
      canApply: false,
      requirementMessage: "当前没有可应用的样本记录。",
      buttonLabel: "应用为参考样本",
      helperText: ""
    };
  }

  if (modalState.kind === "record-list-inline-editor") {
    const draft = calibrationOverride ? null : readSampleLibraryRecordInlineEditorDraftFromModal();
    const effectiveDraft = draft || modalState.draft || buildSampleLibraryRecordInlineEditorDraft(baseRecord);
    return deriveSampleLibraryReferenceApplication({
      record: {
        ...baseRecord,
        reference: effectiveDraft.reference,
        publish: effectiveDraft.publish,
        calibration: effectiveDraft.calibration
      },
      calibration: calibrationOverride || effectiveDraft.calibration
    });
  }

  return deriveSampleLibraryReferenceApplication({
    record: baseRecord,
    calibration: calibrationOverride || getSampleRecordCalibration(baseRecord)
  });
}

function getSampleLibraryCalibrationPredictionPrefillSourceSummary() {
  return getSampleLibraryCalibrationPredictionPrefillSource().summary;
}

function deriveSampleLibraryActualPerformanceTier(publish = {}) {
  const status = String(publish?.status || "not_published").trim() || "not_published";
  const likes = Number(publish?.metrics?.likes || 0) || 0;
  const favorites = Number(publish?.metrics?.favorites || 0) || 0;
  const comments = Number(publish?.metrics?.comments || 0) || 0;
  const views = Number(publish?.metrics?.views || 0) || 0;
  const shares = Number(publish?.metrics?.shares || 0) || 0;

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
    shares >= REFERENCE_METRIC_THRESHOLD.shares ||
    views >= REFERENCE_METRIC_THRESHOLD.directViews ||
    ((likes >= REFERENCE_METRIC_THRESHOLD.nearLikes ||
      favorites >= REFERENCE_METRIC_THRESHOLD.nearFavorites ||
      comments >= REFERENCE_METRIC_THRESHOLD.nearComments ||
      shares >= REFERENCE_METRIC_THRESHOLD.nearShares) &&
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
  const compareButton = byId("analyze-compare-button");
  const rewriteButton = byId("rewrite-button");

  setGatedButtonState(analyzeButton, enabled, requirementMessage);
  setGatedButtonState(compareButton, enabled, requirementMessage);
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

function formatAnalysisScore(value) {
  const number = Number(value);

  if (!Number.isFinite(number) || number <= 0) {
    return "";
  }

  return Number.isInteger(number) ? String(number) : number.toFixed(2);
}

function describeMemoryCalibration(memoryCalibration = {}) {
  const calibration = memoryCalibration && typeof memoryCalibration === "object" ? memoryCalibration : {};

  if (!calibration.applied) {
    return null;
  }

  const fromVerdict = verdictLabel(calibration.fromVerdict || "pass");
  const toVerdict = verdictLabel(calibration.toVerdict || calibration.fromVerdict || "pass");
  const direction = String(calibration.direction || "").trim();
  const reasons = (Array.isArray(calibration.reasons) ? calibration.reasons : [])
    .map((item) => String(item || "").trim())
    .filter(Boolean);
  const categories = uniqueStrings(calibration.categories || []);
  const scoreParts = [
    formatAnalysisScore(calibration.riskScore) ? `风险记忆分 ${formatAnalysisScore(calibration.riskScore)}` : "",
    formatAnalysisScore(calibration.safeScore) ? `安全记忆分 ${formatAnalysisScore(calibration.safeScore)}` : ""
  ].filter(Boolean);
  const isSafetySoften = direction === "safety_soften";

  return {
    label: isSafetySoften ? "安全放宽" : "风险上调",
    toneClass: isSafetySoften ? "model-scope-banner-memory-safe" : "model-scope-banner-memory-risk",
    title:
      isSafetySoften
        ? `基础合并结论：${fromVerdict}，长期记忆校准后调整为 ${toVerdict}`
        : `基础合并结论：${fromVerdict}，长期记忆校准后提升为 ${toVerdict}`,
    detail: [
      ...reasons,
      categories.length ? `相关记忆类别：${categories.join("、")}` : "",
      scoreParts.join("；")
    ]
      .filter(Boolean)
      .join("；")
  };
}

function renderAnalysis(result, falsePositiveSource = null) {
  return renderAnalysisView(result, falsePositiveSource, {
    byId,
    escapeHtml,
    verdictLabel,
    providerLabel,
    formatConfidence,
    buildFalsePositiveActionMarkup,
    describeMemoryCalibration,
    buildPlatformOutcomeActions,
    syncLifecycleResultActions
  });
}

function renderRewriteResult(result) {
  return renderRewriteResultView(result, {
    byId,
    escapeHtml,
    normalizeRewritePayload,
    verdictLabel,
    providerLabel,
    uniqueStrings,
    buildRewriteBodyMarkup,
    buildCrossReviewMarkup,
    buildPlatformOutcomeActions,
    syncLifecycleResultActions
  });
}

function buildCrossReviewMarkup(review, { embedded = false } = {}) {
  return buildCrossReviewMarkupView(review, { embedded }, {
    escapeHtml,
    verdictLabel,
    consensusLabel,
    providerLabel,
    formatConfidence,
    joinCSV,
    renderInfoPills
  });
}

function buildAnalyzeCompareSummaryMarkup(result = {}) {
  return buildAnalyzeCompareSummaryMarkupView(result, {
    escapeHtml,
    verdictLabel,
    formatDate
  });
}

function getDefaultAnalyzeCompareBasisSelection(result = {}) {
  return getDefaultAnalyzeCompareBasisSelectionView(result);
}

function getAnalyzeCompareSelectionContext(selection = "") {
  return getAnalyzeCompareSelectionContextView(selection, { appState });
}

function getActiveAnalyzeCompareBasisSelection() {
  if (appState.sampleLibraryModal?.kind === "analysis-compare") {
    return String(appState.sampleLibraryModal.compareBasisSelection || "").trim();
  }

  return "";
}

function analyzeCompareModelLabel(item = {}) {
  return analyzeCompareModelLabelView(item, { providerLabel });
}

function buildAnalyzeCompareBasisOptionLabel(item = {}) {
  return buildAnalyzeCompareBasisOptionLabelView(item, {
    verdictLabel,
    analyzeCompareModelLabel
  });
}

function buildAnalyzeCompareContentActionsMarkup(result = {}) {
  return buildAnalyzeCompareContentActionsMarkupView(result, {
    appState,
    escapeHtml,
    verdictLabel,
    analyzeCompareModelLabel,
    buildAnalyzeCompareBasisOptionLabel,
    buildPlatformOutcomeActions
  });
}

function buildAnalyzeCompareCardMarkup(item = {}) {
  return buildAnalyzeCompareCardMarkupView(item, {
    escapeHtml,
    verdictLabel,
    providerLabel,
    renderInfoPills,
    analyzeCompareModelLabel,
    describeMemoryCalibration
  });
}

function buildAnalyzeCompareModalMarkup(result = {}) {
  return buildAnalyzeCompareModalMarkupView(result, {
    escapeHtml,
    buildAnalyzeCompareSummaryMarkup,
    buildAnalyzeCompareContentActionsMarkup,
    buildAnalyzeCompareCardMarkup
  });
}

function renderAnalyzeCompareModal(result = {}) {
  return renderAnalyzeCompareModalView(result, {
    renderSampleLibraryModal,
    buildAnalyzeCompareModalMarkup
  });
}

function openAnalyzeCompareModal(result = {}) {
  appState.sampleLibraryModal = {
    kind: "analysis-compare",
    result,
    compareBasisSelection: getDefaultAnalyzeCompareBasisSelection(result)
  };
  renderAnalyzeCompareModal(result);
}

function renderCrossReviewResult(result) {
  return renderCrossReviewResultView(result, {
    byId,
    buildCrossReviewMarkup
  });
}

function getManualReviewRetroReminderQueueItems(records = []) {
  return (Array.isArray(records) ? records : [])
    .filter((record) => isDueForSampleLibraryFinalRetroReview(record))
    .sort((left, right) =>
      String(right?.updatedAt || right?.createdAt || "").localeCompare(String(left?.updatedAt || left?.createdAt || ""))
    )
    .map((record) => {
      const publish = getSampleRecordPublish(record);
      const title = getSampleRecordTitle(record) || "未命名样本记录";
      const summary = compactText(getSampleRecordBody(record) || getSampleRecordCoverText(record), 88) || "未填写正文";

      return {
        id: String(record?.id || ""),
        title,
        summary,
        publishStatus: publish.status || "not_published",
        publishedAt: publish.publishedAt || "",
        collectionType: getSampleRecordCollectionType(record),
        reason: "T+7 终局复盘提醒"
      };
    });
}

function getReviewQueueDisplayState(items = []) {
  const retroReminderItems = getManualReviewRetroReminderQueueItems(appState.sampleLibraryRecords || []);
  const reviewItems = Array.isArray(items) ? items : [];

  return {
    retroReminderItems,
    reviewItems,
    totalCount: retroReminderItems.length + reviewItems.length
  };
}

function buildReviewQueueDetailedMarkup({ retroReminderItems = [], reviewItems = [] } = {}) {
  return retroReminderItems.length || reviewItems.length
    ? `${retroReminderItems
        .map(
          (item) => `
            <article class="queue-item">
              <strong>${escapeHtml(item.title)}</strong>
              <div class="meta-row">
                <span class="meta-pill">${escapeHtml(item.reason)}</span>
                <span class="meta-pill">${escapeHtml(publishStatusLabel(item.publishStatus))}</span>
                <span class="meta-pill">${escapeHtml(collectionTypeLabel(item.collectionType))}</span>
                ${item.publishedAt ? `<span class="meta-pill">发布时间 ${escapeHtml(formatDate(item.publishedAt))}</span>` : ""}
              </div>
              <p>${escapeHtml(item.summary)}</p>
              <p>已到 T+7，可直接进入发布后复盘，确认实际表现、偏差原因，以及是否继续保留为参考样本。</p>
              <div class="item-actions">
                <button
                  type="button"
                  class="button button-small"
                  data-action="open-sample-library-calibration"
                  data-id="${escapeHtml(item.id)}"
                >
                  进入发布后复盘
                </button>
              </div>
            </article>
          `
        )
        .join("")}${reviewItems
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
                    : `建议加入违规词库：${escapeHtml(matchLabel(item.recommendedLexiconDraft?.match || "exact"))} /
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
                  ${item.recommendedLexiconDraft?.targetScope === "whitelist" ? "加入白名单" : "加入违规词库"}
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
        .join("")}`
    : '<div class="result-card muted">当前没有待复核候选词</div>';
}

function buildReviewQueueModalMarkup(items = []) {
  const { retroReminderItems, reviewItems, totalCount } = getReviewQueueDisplayState(items);

  return `
    <div class="sample-library-modal-stack">
      <section class="sample-library-modal-section">
        <div class="sample-library-modal-section-head">
          <strong>人工复核与发布后复盘</strong>
          <p>${escapeHtml(`当前共 ${totalCount} 项待处理，其中候选词 / 语境 ${reviewItems.length} 项，T+7 终局复盘提醒 ${retroReminderItems.length} 项。`)}</p>
        </div>
        <div class="admin-list">
          ${buildReviewQueueDetailedMarkup({ retroReminderItems, reviewItems })}
        </div>
      </section>
    </div>
  `;
}

function renderReviewQueueModal(items = []) {
  renderSampleLibraryModal({
    title: "人工复核队列",
    subtitle: "统一处理候选词 / 语境复核，以及到期的发布后复盘提醒。",
    body: buildReviewQueueModalMarkup(items),
    hideSaveButton: true,
    cancelLabel: "关闭"
  });
}

function openReviewQueueModal() {
  appState.sampleLibraryModal = {
    kind: "review-queue-list"
  };

  renderReviewQueueModal(appState.adminData.reviewQueue || []);
}

function renderQueue(items) {
  const node = byId("review-queue");

  if (!node) {
    return;
  }

  if (isAdminDataInitialLoading()) {
    node.innerHTML = buildAdminDataLoadingBlockMarkup("加载中...", { count: 1, isRefreshing: false });
    return;
  }

  const { retroReminderItems, reviewItems, totalCount } = getReviewQueueDisplayState(items);

  node.innerHTML = `
    <article class="review-queue-entry-card">
      <div class="review-queue-entry-head">
        <p>候选词 / 语境复核、白名单预演和到期复盘都收进弹窗里处理，主页面只保留一个入口。</p>
      </div>
      <div class="review-queue-entry-metrics">
        <span class="meta-pill">共 ${escapeHtml(String(totalCount))} 项</span>
        <span class="meta-pill">规则复核 ${escapeHtml(String(reviewItems.length))} 项</span>
        <span class="meta-pill">T+7 复盘 ${escapeHtml(String(retroReminderItems.length))} 项</span>
      </div>
      <div class="item-actions">
        <button
          type="button"
          class="button"
          id="review-queue-open-button"
          data-action="open-review-queue-modal"
        >
          打开复核队列
        </button>
      </div>
    </article>
  `;

  if (appState.sampleLibraryModal?.kind === "review-queue-list" && byId("sample-library-modal")?.hidden === false) {
    renderReviewQueueModal(items);
  }
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
  return buildLexiconListMarkupView(items, scope, {
    escapeHtml,
    verdictLabel,
    matchLabel,
    lexiconLevelLabel,
    inferLexiconLevel
  });
}

function renderFeedbackLog(items) {
  const priorityNode = byId("feedback-priority-list");
  const pendingNode = byId("feedback-log-list");
  const completedNode = byId("feedback-log-secondary-list");

  if (isAdminDataInitialLoading()) {
    if (priorityNode) {
      priorityNode.innerHTML = buildAdminDataLoadingBlockMarkup("加载中...", { count: 2, isRefreshing: false });
    }

    if (pendingNode) {
      pendingNode.innerHTML = buildAdminDataLoadingBlockMarkup("加载中...", { count: 1, isRefreshing: false });
    }

    if (completedNode) {
      completedNode.innerHTML = buildAdminDataLoadingBlockMarkup("加载中...", { count: 2, isRefreshing: false });
    }
    return;
  }
  const markup = renderFeedbackLogView(items, {
    escapeHtml,
    compactText,
    verdictLabel,
    matchLabel,
    lexiconLevelLabel,
    inferLexiconLevel,
    formatDate,
    reviewAuditLabel
  });
  const parser = document.createElement("div");
  parser.innerHTML = markup;
  const sections = parser.querySelectorAll(".sample-library-modal-section .admin-list");

  if (priorityNode) {
    priorityNode.innerHTML = sections[0]?.innerHTML || '<div class="result-card muted">当前没有待优先处理的反馈</div>';
  }

  if (pendingNode) {
    pendingNode.innerHTML = sections[0]?.innerHTML
      ? '<div class="result-card muted">待优先处理的违规反馈已单独置顶显示</div>'
      : '<div class="result-card muted">当前没有待处理违规反馈</div>';
  }

  if (completedNode) {
    completedNode.innerHTML = sections[1]?.innerHTML || '<div class="result-card muted">当前没有已处理的违规反馈</div>';
  }
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
    return "暂无误报样本";
  }

  if (pendingCount === 0) {
    return `待确认 0 条，历史案例 ${historyCount} 条。`;
  }

  if (historyCount === 0) {
    return `待确认 ${pendingCount} 条，历史案例 0 条。`;
  }

  return `待确认 ${pendingCount} 条，历史案例 ${historyCount} 条。`;
}

function renderFalsePositiveLog(items) {
  appState.falsePositiveLog = Array.isArray(items) ? items : [];
  const previewButton = byId("false-positive-preview-open-button");

  if (isAdminDataInitialLoading()) {
    if (previewButton) {
      previewButton.hidden = true;
    }

    if (appState.sampleLibraryModal?.kind === "false-positive-list" && byId("sample-library-modal")?.hidden === false) {
      renderFalsePositiveListModal();
    }
    return;
  }

  if (previewButton) {
    previewButton.hidden = appState.falsePositiveLog.length === 0;
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
      views: Number(source.metrics?.views ?? source.views ?? 0) || 0,
      shares: Number(source.metrics?.shares ?? source.shares ?? 0) || 0
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

function isDueForSampleLibraryFinalRetroReview(record = {}) {
  const publish = getSampleRecordPublish(record);
  const calibration = getSampleRecordCalibration(record);
  const daysSincePublish = getDaysSinceDate(publish.publishedAt);
  const publishedAtDate = parseDateOnlyValue(publish.publishedAt);
  const reminderStartDate = parseDateOnlyValue(SAMPLE_LIBRARY_RETRO_REMINDER_START_DATE);

  return (
    hasTrackedLifecycle(record) &&
    publish.status !== "not_published" &&
    publishedAtDate &&
    reminderStartDate &&
    publishedAtDate.getTime() >= reminderStartDate.getTime() &&
    daysSincePublish !== null &&
    daysSincePublish >= 7 &&
    !calibration.retro.reviewedAt
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
    publish.metrics.shares > 0 ||
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
  const shares = Number(metrics?.shares || 0) || 0;

  const nearQualified =
    likes >= REFERENCE_METRIC_THRESHOLD.nearLikes ||
    favorites >= REFERENCE_METRIC_THRESHOLD.nearFavorites ||
    comments >= REFERENCE_METRIC_THRESHOLD.nearComments ||
    shares >= REFERENCE_METRIC_THRESHOLD.nearShares;
  const highViews = views >= REFERENCE_METRIC_THRESHOLD.supportViews;
  const directEngagementQualified =
    likes >= REFERENCE_METRIC_THRESHOLD.likes ||
    favorites >= REFERENCE_METRIC_THRESHOLD.favorites ||
    comments >= REFERENCE_METRIC_THRESHOLD.comments ||
    shares >= REFERENCE_METRIC_THRESHOLD.shares;
  const directViewsQualified = views >= REFERENCE_METRIC_THRESHOLD.directViews;

  if (directEngagementQualified) {
    return {
      qualified: true,
      reason: "互动直达达标",
      mode: "engagement",
      nearQualified: true,
      highViews
    };
  }

  if (directViewsQualified) {
    return {
      qualified: true,
      reason: "浏览直达达标",
      mode: "views_direct",
      nearQualified,
      highViews: true
    };
  }

  if (nearQualified && highViews) {
    return {
      qualified: true,
      reason: "互动接近达标，已由高浏览补足",
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

function formatSamplePoolTabLabel(pool = "reference", count = 0) {
  const normalizedCount = Math.max(0, Number(count) || 0);
  return `${sampleLibraryPoolLabel(pool)}（${String(normalizedCount)}）`;
}

function filterSamplePoolRecordsByTitle(records = [], search = "") {
  const normalizedRecords = Array.isArray(records) ? records : [];
  const keyword = String(search || "")
    .trim()
    .toLowerCase();

  if (!keyword) {
    return normalizedRecords;
  }

  return normalizedRecords.filter((record) => String(getSampleRecordTitle(record) || "").toLowerCase().includes(keyword));
}

function filterSamplePoolRecords(records = [], { search = "", metricFilters = {} } = {}) {
  const normalizedRecords = filterSamplePoolRecordsByTitle(records, search);
  const minimumLikes = normalizeSampleLibraryMetricFilterValue(metricFilters.likes);
  const minimumFavorites = normalizeSampleLibraryMetricFilterValue(metricFilters.favorites);
  const minimumComments = normalizeSampleLibraryMetricFilterValue(metricFilters.comments);
  const minimumViews = normalizeSampleLibraryMetricFilterValue(metricFilters.views);
  const minimumShares = normalizeSampleLibraryMetricFilterValue(metricFilters.shares);

  return normalizedRecords.filter((record) => {
    const publish = getSampleRecordPublish(record);
    const metrics = publish?.metrics || publish || {};
    const likes = Number(metrics.likes || 0) || 0;
    const favorites = Number(metrics.favorites || 0) || 0;
    const comments = Number(metrics.comments || 0) || 0;
    const views = Number(metrics.views || 0) || 0;
    const shares = Number(metrics.shares || 0) || 0;

    return (
      likes >= minimumLikes &&
      favorites >= minimumFavorites &&
      comments >= minimumComments &&
      views >= minimumViews &&
      shares >= minimumShares
    );
  });
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
    return `${qualification.reason || "已达参考门槛"}，会参与生成、改写和内容校验提示。`;
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

function getSamplePoolWhyHelperText(record = {}) {
  const pool = classifySampleLibraryPool(record);
  const qualification = getReferenceQualification(record);

  if (pool !== "reference") {
    return "";
  }

  if (qualification.mode === "engagement") {
    return "说明：点赞、收藏、评论或分享里，至少一项已经单独达到参考门槛。";
  }

  if (qualification.mode === "views_direct") {
    return "说明：当前由浏览数单独达到参考门槛，不依赖互动补足。";
  }

  if (qualification.mode === "views_assist") {
    return "说明：互动已接近参考门槛，再由高浏览补足后进入参考池。";
  }

  return "";
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

function sortSampleLibraryRecordsByPublishedAtDesc(items = []) {
  return [...(Array.isArray(items) ? items : [])].sort((left, right) => {
    const leftPublish = getSampleRecordPublish(left);
    const rightPublish = getSampleRecordPublish(right);
    const leftSortTime = new Date(leftPublish.publishedAt || left.updatedAt || left.createdAt || 0).getTime() || 0;
    const rightSortTime = new Date(rightPublish.publishedAt || right.updatedAt || right.createdAt || 0).getTime() || 0;

    return rightSortTime - leftSortTime;
  });
}

function normalizeSampleLibraryMetricFilterValue(value = "") {
  const normalized = Number(String(value ?? "").trim());

  if (!Number.isFinite(normalized) || normalized <= 0) {
    return 0;
  }

  return normalized;
}

function filterSampleLibraryRecords(items = []) {
  const normalizedItems = Array.isArray(items) ? items : [];
  const filter = String(appState.sampleLibraryFilter || "all").trim() || "all";
  const collectionFilter = String(appState.sampleLibraryCollectionFilter || "all").trim() || "all";

  return sortSampleLibraryRecordsByPublishedAtDesc(
    normalizedItems.filter((item) => {
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

      return true;
    })
  );
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
  return buildSampleLibraryRecordCardMarkupView(item, { action, actionId, isActive }, {
    escapeHtml,
    getSampleRecordReference,
    getSampleRecordPublish,
    getSampleRecordCalibration,
    getSampleLibraryCalibrationListState,
    getSampleRecordTitle,
    getSampleRecordBody,
    getSampleRecordCoverText,
    getSampleRecordCollectionType,
    getSampleRecordTags,
    getSampleLibraryRecordStepLabel,
    buildSampleLibraryRecordActionAttributes,
    successTierLabel,
    publishStatusLabel,
    riskLevelLabel,
    collectionTypeLabel,
    lifecycleSourceLabel,
    formatDate,
    compactText,
    joinCSV
  });
}

function sampleLibraryRecordListSummaryText(count, filterLabel, collectionLabel) {
  if (!count) {
    return "暂无样本记录";
  }

  return `${count} 条记录 · ${filterLabel} · ${collectionLabel}`;
}

function renderSampleLibraryList(items = []) {
  const listNode = byId("sample-library-record-list");
  const countNode = byId("sample-library-list-count");
  const previewOpenButton = byId("sample-library-record-preview-open-button");

  if (!listNode) {
    return;
  }

  if (isSampleLibraryInitialLoading()) {
    if (countNode) {
      countNode.textContent = "加载中...";
    }

    if (previewOpenButton) {
      previewOpenButton.hidden = true;
    }

    listNode.innerHTML = "";
    return;
  }

  const filterLabel = sampleLibraryFilterLabel(appState.sampleLibraryFilter);
  const collectionLabel = sampleLibraryCollectionFilterLabel(appState.sampleLibraryCollectionFilter);

  if (countNode) {
    countNode.textContent = `${items.length} 条 · ${filterLabel} · ${collectionLabel}`;
  }

  if (previewOpenButton) {
    previewOpenButton.hidden = items.length === 0;
  }

  listNode.innerHTML = `<div class="result-card muted">${escapeHtml(
    sampleLibraryRecordListSummaryText(items.length, filterLabel, collectionLabel)
  )}</div>`;
}

function buildSampleLibraryRecordListModalMarkup(items = []) {
  return buildSampleLibraryRecordListModalMarkupView(items, {
    escapeHtml,
    buildSampleLibraryRecordCardMarkup,
    sampleLibraryFilterLabel,
    sampleLibraryCollectionFilterLabel,
    selectedSampleLibraryRecordId: appState.selectedSampleLibraryRecordId,
    sampleLibraryFilter: appState.sampleLibraryFilter,
    sampleLibraryCollectionFilter: appState.sampleLibraryCollectionFilter
  });
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
    titleFilter: "",
    draft,
    initialSnapshot: structuredClone(draft)
  };
  renderSampleLibraryRecordInlineEditorModal();
}

function buildSampleLibraryRecordInlineEditorDraft(record = {}) {
  return buildSampleLibraryRecordInlineEditorDraftView(record, {
    getSampleRecordNote,
    getSampleRecordReference,
    getSampleRecordPublish,
    getSampleRecordCalibration,
    getSampleRecordCollectionType
  });
}

function buildSampleLibraryRecordInlineEditorPatchPayload(recordId = "", draft = {}) {
  return buildSampleLibraryRecordInlineEditorPatchPayloadView(recordId, draft);
}

function isSampleLibraryRecordInlineEditorDirty({ draft = null, initialSnapshot = null } = {}) {
  return isSampleLibraryRecordInlineEditorDirtyView({ draft, initialSnapshot });
}

function filterSampleLibraryRecordInlineEditorItems(items = [], titleFilter = "") {
  return filterSampleLibraryRecordInlineEditorItemsView(items, titleFilter, {
    getSampleRecordTitle
  });
}

function getSampleLibraryRecordInlineEditorFilterSummaryText(count = 0) {
  return getSampleLibraryRecordInlineEditorFilterSummaryTextView(count, {
    sampleLibraryFilterLabel,
    sampleLibraryCollectionFilterLabel,
    sampleLibraryFilter: appState.sampleLibraryFilter,
    sampleLibraryCollectionFilter: appState.sampleLibraryCollectionFilter
  });
}

function buildSampleLibraryRecordInlineEditorSidebarListMarkup(items = [], modalState = {}) {
  return buildSampleLibraryRecordInlineEditorSidebarListMarkupView(items, modalState, {
    escapeHtml,
    compactText,
    getSampleRecordTitle,
    getSampleRecordNote,
    getSampleRecordPublish,
    getSampleRecordReference,
    successTierLabel,
    publishStatusLabel
  });
}

function buildSampleLibraryRecordInlineEditorSidebarMarkup(items = [], modalState = {}) {
  return buildSampleLibraryRecordInlineEditorSidebarMarkupView(items, modalState, {
    escapeHtml,
    isSampleLibraryRecordInlineEditorDirty,
    getSampleLibraryRecordInlineEditorFilterSummaryText,
    buildSampleLibraryRecordInlineEditorSidebarListMarkup
  });
}

function readSampleLibraryRecordInlineEditorDraftFromModal() {
  return readSampleLibraryRecordInlineEditorDraftFromModalView(byId("sample-library-modal-content"), appState.sampleLibraryModal, {
    splitCSV,
    readSampleLibraryRetroChipFieldValue,
    readSampleLibraryRetroChipListValue
  });
}

function syncSampleLibraryRecordInlineEditorFilterResults() {
  const modalState = appState.sampleLibraryModal;

  if (modalState?.kind !== "record-list-inline-editor") {
    return;
  }

  const contentNode = byId("sample-library-modal-content");

  if (!contentNode) {
    return;
  }

  const allItems = filterSampleLibraryRecords(appState.sampleLibraryRecords);
  const items = filterSampleLibraryRecordInlineEditorItems(allItems, modalState.titleFilter || "");
  const summaryNode = contentNode.querySelector('[data-role="record-inline-editor-filter-summary"]');
  const helperNode = contentNode.querySelector('[data-role="record-inline-editor-filter-helper"]');
  const listNode = contentNode.querySelector('[data-role="record-inline-editor-filter-list"]');

  if (summaryNode) {
    summaryNode.textContent = getSampleLibraryRecordInlineEditorFilterSummaryText(items.length);
  }

  if (helperNode) {
    helperNode.textContent = isSampleLibraryRecordInlineEditorDirty(modalState)
      ? "当前记录有未保存修改，切换前请先保存。"
      : "左侧切换记录，右侧统一编辑四块信息。";
  }

  if (listNode) {
    listNode.innerHTML = buildSampleLibraryRecordInlineEditorSidebarListMarkup(items, modalState);
  }
}

function buildSampleLibraryRecordInlineEditorModalMarkup({ sidebarItems = [], selectedRecord = null, modalState = {} } = {}) {
  return buildSampleLibraryRecordInlineEditorModalMarkupView(
    { sidebarItems, selectedRecord, modalState },
    {
      escapeHtml,
      compactText,
      getSampleRecordTitle,
      buildSampleLibraryRecordInlineEditorSidebarMarkup,
      buildSampleLibraryRecordInlineEditorDraft,
      getSampleLibraryReferenceApplicationState,
      buildSampleLibraryBaseEditorSectionMarkup,
      buildSampleLibraryReferenceEditorSectionMarkup,
      buildSampleLibraryLifecycleEditorSectionMarkup,
      buildSampleLibraryCalibrationEditorSectionsMarkup,
      buildSampleLibraryCalibrationRetroComparison,
      predictionMatchedLabel
    }
  );
}

function renderSampleLibraryRecordInlineEditorModal() {
  const modalState = appState.sampleLibraryModal || {};
  const allItems = filterSampleLibraryRecords(appState.sampleLibraryRecords);
  const items = filterSampleLibraryRecordInlineEditorItems(allItems, modalState.titleFilter || "");
  const selectedRecord =
    allItems.find((item) => String(item.id || "") === String(modalState?.selectedRecordId || "")) ||
    allItems[0] ||
    null;
  const selectedRecordId = String(selectedRecord?.id || "");
  const selectionChanged = selectedRecordId !== String(modalState?.selectedRecordId || "");
  const draft = selectionChanged ? buildSampleLibraryRecordInlineEditorDraft(selectedRecord || {}) : modalState.draft;
  const initialSnapshot = selectionChanged ? structuredClone(draft) : modalState.initialSnapshot;

  appState.sampleLibraryModal = {
    ...modalState,
    kind: "record-list-inline-editor",
    selectedRecordId,
    titleFilter: String(modalState?.titleFilter || ""),
    draft: draft || buildSampleLibraryRecordInlineEditorDraft(selectedRecord || {}),
    initialSnapshot: initialSnapshot || structuredClone(draft || buildSampleLibraryRecordInlineEditorDraft(selectedRecord || {}))
  };

  renderSampleLibraryModal({
    title: "完整记录内联编辑",
    subtitle: "左侧切换记录，右侧一次性查看并编辑基础内容、参考属性、生命周期和预判复盘。",
    body: buildSampleLibraryRecordInlineEditorModalMarkup({
      sidebarItems: items,
      selectedRecord,
      modalState: appState.sampleLibraryModal || {}
    }),
    saveLabel: "保存整条记录",
    cancelLabel: "关闭"
  });
}

function buildSampleLibraryRecordInlineEditorSwitchConfirmModalMarkup(returnTo = null) {
  return buildSampleLibraryRecordInlineEditorSwitchConfirmModalMarkupView(returnTo, {
    escapeHtml,
    compactText,
    getSampleRecordTitle,
    getSampleRecordBody,
    sampleLibraryRecords: appState.sampleLibraryRecords
  });
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
  return buildSampleLibraryRecordInlineEditorCloseConfirmModalMarkupView(returnTo, {
    escapeHtml,
    compactText,
    getSampleRecordTitle,
    getSampleRecordBody,
    sampleLibraryRecords: appState.sampleLibraryRecords
  });
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

  syncStyleProfileStateFromPayload(response);
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
      const dueFinalRetroReview = isDueForSampleLibraryFinalRetroReview(item);
      const highConfidenceMismatch =
        calibrationState.key === "calibration_mismatch" && Number(calibration.prediction.confidence || 0) >= 70;

      if (!dueFinalRetroReview && !highConfidenceMismatch) {
        return null;
      }

      return {
        item,
        publish,
        calibration,
        calibrationState,
        queueReason: dueFinalRetroReview ? "T+7 终局复盘提醒" : "高置信偏差",
        queuePriority: dueFinalRetroReview ? 2 : 1
      };
    })
    .filter(Boolean)
    .sort((left, right) => {
      const leftScore = Number(left.queuePriority || 0);
      const rightScore = Number(right.queuePriority || 0);

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

  if (isSampleLibraryInitialLoading()) {
    queueNode.innerHTML = buildAdminDataLoadingBlockMarkup("加载中...", { count: 2, isRefreshing: false });
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

function buildSampleLibraryModalTagPickerMarkup(tags = []) {
  return buildSampleLibraryModalTagPickerMarkupView(tags, {
    escapeHtml,
    joinCSV,
    buildAnalyzeTagSelectionMarkup
  });
}

function buildSampleLibraryModalSectionMarkup({ title = "", description = "", body = "", className = "" } = {}) {
  return buildSampleLibraryModalSectionMarkupView({ title, description, body, className }, { escapeHtml });
}

function readStyleProfileModalPayload() {
  return readStyleProfileModalPayloadView(byId("sample-library-modal-content"), {
    splitCSV,
    splitLineList
  });
}

function renderStyleProfileModal() {
  const profile = appState.sampleLibraryModal?.profile || appState.adminData.styleProfile || null;
  const sourceCount = Array.isArray(profile?.current?.sourceSampleIds) ? profile.current.sourceSampleIds.length : 0;

  renderSampleLibraryModal({
    title: "当前风格画像",
    subtitle: profile?.current
      ? `当前生效画像 · ${sourceCount} 条来源样本`
      : "当前还没有自动沉淀画像",
    body: buildStyleProfileModalMarkup(profile, {
      buildSampleLibraryModalSectionMarkup,
      escapeHtml,
      joinCSV,
      joinLineList,
      formatDate,
      buildStyleProfileGenerationLabel: (meta) => buildStyleProfileGenerationLabel(meta, { providerLabel })
    }),
    saveLabel: "保存画像"
  });
}

async function openStyleProfileModal() {
  const response = await apiJson(styleProfileAdminApi);
  const profile = response.profile && typeof response.profile === "object" ? response.profile : null;

  appState.adminData = {
    ...appState.adminData,
    styleProfile: profile
  };
  appState.sampleLibraryModal = {
    kind: "style-profile",
    profile
  };

  renderStyleProfileModal();
}

async function saveStyleProfileModal() {
  const response = await apiJson(styleProfileAdminApi, {
    method: "PATCH",
    body: JSON.stringify({
      profile: readStyleProfileModalPayload()
    })
  });
  const profile = response.profile && typeof response.profile === "object" ? response.profile : null;

  appState.adminData = {
    ...appState.adminData,
    styleProfile: profile
  };
  appState.sampleLibraryModal = {
    kind: "style-profile",
    profile
  };
  renderStyleProfileModal();
  setSampleLibraryModalMessage("风格画像已保存；后续自动沉淀会保留已手动修订字段。");
}

function buildSampleLibraryBaseEditorSectionMarkup({
  title = "",
  body = "",
  coverText = "",
  collectionType = "",
  tags = [],
  views = 0,
  shares = 0,
  includeViews = false,
  includePrefillActions = false
} = {}) {
  return buildSampleLibraryBaseEditorSectionMarkupView(
    {
      title,
      body,
      coverText,
      collectionType,
      tags,
      views,
      shares,
      includeViews,
      includePrefillActions
    },
    {
      escapeHtml,
      buildCollectionTypeOptionsMarkup,
      collectionTypeOptions: appState.collectionTypeOptions,
      buildSampleLibraryModalTagPickerMarkup,
      buildSampleLibraryModalSectionMarkup
    }
  );
}

function buildSampleLibraryReferenceEditorSectionMarkup(reference = {}, { notesFieldName = "notes" } = {}) {
  return buildSampleLibraryReferenceEditorSectionMarkupView(reference, { notesFieldName }, {
    escapeHtml,
    getReferenceThresholdReferenceDescription,
    buildSampleLibraryModalSectionMarkup
  });
}

function buildSampleLibraryReferenceModalMarkup(record) {
  return buildSampleLibraryReferenceModalMarkupView(record, {
    getSampleRecordReference,
    buildSampleLibraryReferenceEditorSectionMarkup
  });
}

function buildSampleLibraryLifecycleEditorSectionMarkup(publish = {}, { notesFieldName = "notes" } = {}) {
  return buildSampleLibraryLifecycleEditorSectionMarkupView(publish, { notesFieldName }, {
    escapeHtml,
    buildSampleLibraryModalSectionMarkup
  });
}

function buildSampleLibraryLifecycleModalMarkup(record) {
  return buildSampleLibraryLifecycleModalMarkupView(record, {
    getSampleRecordPublish,
    buildSampleLibraryLifecycleEditorSectionMarkup
  });
}

function buildSampleLibraryCalibrationEvidenceMarkup(prediction = {}) {
  return buildSampleLibraryCalibrationEvidenceMarkupView(prediction, {
    buildSampleLibraryCalibrationEvidenceState,
    escapeHtml
  });
}

function syncSampleLibraryCalibrationEvidencePanel(root = byId("sample-library-modal-content"), prediction = {}) {
  const panel = root?.querySelector?.('[data-role="sample-library-calibration-evidence"]');

  if (!panel) {
    return;
  }

  panel.innerHTML = buildSampleLibraryCalibrationEvidenceMarkup(prediction);
}

function buildSampleLibraryCalibrationEditorSectionsMarkup(args = {}) {
  return buildSampleLibraryCalibrationEditorSectionsMarkupView(args, {
    buildSampleLibraryModalSectionMarkup,
    buildSampleLibraryCalibrationEvidenceMarkup,
    buildSampleLibraryRetroChipGroupMarkup,
    escapeHtml,
    getSampleLibraryCalibrationPredictionPrefillSourceSummary,
    getSampleLibraryRetroTimingHintClassName,
    joinCSV,
    parseSampleLibraryRetroChipField,
    sampleLibraryRetroChipPresets
  });
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
  const referenceAction = getSampleLibraryReferenceApplicationState({
    recordOverride: record,
    calibrationOverride: {
      prediction: calibration.prediction,
      retro: effectiveRetro
    }
  });
  const retroTimingHint = buildSampleLibraryRetroTimingHint({ publish });

  return `
    <div class="sample-library-modal-stack compact-form">
      ${buildSampleLibraryCalibrationEditorSectionsMarkup({
        prediction: calibration.prediction,
        retro: effectiveRetro,
        comparison,
        comparisonStatusLabel: predictionMatchedLabel(comparison.matched),
        missReasonSuggestion: comparison.missReasonSuggestion,
        referenceAction,
        retroTimingHint
      })}
    </div>
  `;
}

function buildSampleLibraryNoteModalMarkup(options = {}) {
  return buildSampleLibraryNoteModalMarkupView(options, {
    buildSampleLibraryBaseEditorSectionMarkup
  });
}

function buildSampleLibraryCreateModalMarkup() {
  return buildSampleLibraryCreateModalMarkupView({
    buildSampleLibraryBaseEditorSectionMarkup
  });
}

function buildSampleLibraryBaseModalMarkup(record = {}) {
  return buildSampleLibraryBaseModalMarkupView(record, {
    buildSampleLibraryBaseEditorSectionMarkup,
    getSampleRecordNote,
    getSampleRecordCollectionType
  });
}

function readSampleLibraryCreateModalPayload() {
  return readSampleLibraryCreateModalPayloadView(byId("sample-library-modal-content"), {
    splitCSV
  });
}

function readSampleLibraryModalBasePayload() {
  return readSampleLibraryModalBasePayloadView(byId("sample-library-modal-content"), {
    splitCSV
  });
}

function getSampleLibraryCreateRequirementMessage(root = byId("sample-library-modal-content")) {
  return getSampleLibraryCreateRequirementMessageView(root);
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
          views: payload.views || 0,
          shares: payload.shares || 0
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

  syncStyleProfileStateFromPayload(response);
  appState.sampleLibraryRecords = Array.isArray(response.items) ? response.items : appState.sampleLibraryRecords;
  appState.sampleLibraryFilter = "all";
  appState.sampleLibraryCollectionFilter = "all";
  appState.sampleLibrarySearch = "";
  appState.sampleLibraryMetricFilters = {
    likes: "",
    favorites: "",
    comments: "",
    views: "",
    shares: ""
  };
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
  if (byId("sample-library-likes-filter")) {
    byId("sample-library-likes-filter").value = "";
  }
  if (byId("sample-library-favorites-filter")) {
    byId("sample-library-favorites-filter").value = "";
  }
  if (byId("sample-library-comments-filter")) {
    byId("sample-library-comments-filter").value = "";
  }
  if (byId("sample-library-views-filter")) {
    byId("sample-library-views-filter").value = "";
  }
  if (byId("sample-library-shares-filter")) {
    byId("sample-library-shares-filter").value = "";
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
  return buildSampleLibraryDeleteModalMarkupView(record, {
    escapeHtml,
    compactText,
    getSampleRecordTitle,
    getSampleRecordBody,
    getSampleRecordCoverText
  });
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

function buildFeedbackRuleQueueModalMarkup(modalState = {}) {
  return buildFeedbackRuleQueueModalMarkupView(modalState, {
    escapeHtml
  });
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
  return readFeedbackRuleQueueModalPayloadView(byId("sample-library-modal-content"));
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
  return buildFeedbackFalsePositiveModalMarkupView(modalState, {
    escapeHtml,
    compactText,
    buildSampleLibraryModalTagPickerMarkup
  });
}

function openFeedbackFalsePositiveModal({
  title = "",
  body = "",
  tags = [],
  userNotes = "",
  analysisVerdict = "",
  analysisScore = 0,
  noteId = "",
  createdAt = "",
  sourceLabel = "这条反馈"
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
    createdAt,
    sourceLabel
  };

  renderSampleLibraryModal({
    title: "确认误报案例",
    subtitle: `确认后会把${String(sourceLabel || "这条内容")}转入误报待确认列表。`,
    body: buildFeedbackFalsePositiveModalMarkup(appState.sampleLibraryModal),
    saveLabel: "确认记录为误报"
  });
}

function readFeedbackFalsePositiveModalPayload() {
  return readFeedbackFalsePositiveModalPayloadView(byId("sample-library-modal-content"), {
    splitCSV
  });
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
  if (String(modalState?.noteId || "").trim() || String(modalState?.createdAt || "").trim()) {
    await apiJson("/api/admin/feedback", {
      method: "DELETE",
      body: JSON.stringify({
        noteId: modalState.noteId,
        createdAt: modalState.createdAt
      })
    });
  }
  await refreshAll();
  ensureSupportWorkspaceOpen();
  revealSampleLibraryReflowPane();
  byId("sample-library-reflow-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function buildAnalyzePayloadFromSampleLibraryRecord(record = {}) {
  const note = getSampleRecordNote(record);

  return {
    title: String(note?.title || "").trim(),
    body: String(note?.body || "").trim(),
    coverText: String(note?.coverText || "").trim(),
    collectionType: String(getSampleRecordCollectionType(record) || "").trim(),
    tags: getSampleRecordTags(record)
  };
}

function buildSampleLibraryDetailModalConfig(kind, record) {
  return buildSampleLibraryDetailModalConfigView(kind, record, {
    getSampleRecordTitle,
    buildSampleLibraryReferenceModalMarkup,
    buildSampleLibraryLifecycleModalMarkup,
    buildSampleLibraryCalibrationModalMarkup
  });
}

function readSampleLibraryModalReferencePayload() {
  return readSampleLibraryModalReferencePayloadView(byId("sample-library-modal-content"));
}

function readSampleLibraryModalLifecyclePayload() {
  return readSampleLibraryModalLifecyclePayloadView(byId("sample-library-modal-content"));
}

function readSampleLibraryModalCalibrationPayload() {
  return readSampleLibraryModalCalibrationPayloadView(byId("sample-library-modal-content"), {
    readSampleLibraryRetroChipFieldValue,
    readSampleLibraryRetroChipListValue,
    splitCSV,
    uniqueStrings
  });
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
  const plannerNode = byId("sample-library-account-planner-panel");

  if (!workspaceNode && !listNode && !queueNode && !plannerNode) {
    return;
  }

  renderCollectionTypeSelectors();
  const filteredItems = filterSampleLibraryRecords(appState.sampleLibraryRecords);

  renderSampleLibraryList(filteredItems);
  syncSampleLibraryAccountPlannerPanel();
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

  const hasExistingSampleLibraryRecords = appState.sampleLibraryRecords.length > 0;
  const phase = hasExistingSampleLibraryRecords ? "refresh" : "initial";

  setSampleLibraryLoadingState(phase);

  if (phase === "initial") {
    renderSampleLibraryLoadingPlaceholders();
  }

  try {
    const payload = await apiJson(sampleLibraryApi);
    appState.sampleLibraryRecords = Array.isArray(payload?.items) ? payload.items : [];
  } catch {
    appState.sampleLibraryRecords = Array.isArray(appState.sampleLibraryRecords) ? appState.sampleLibraryRecords : [];
  }

  setSampleLibraryLoadingState("idle");
  renderSampleLibraryWorkspace();
  return appState.sampleLibraryRecords;
}

function renderGenerationResult(result = {}) {
  const recommended = (result.scoredCandidates || []).find(
    (item) => String(item?.id || "") === String(result.recommendedCandidateId || "")
  );
  const displayItem = recommended || (result.scoredCandidates || [])[0] || null;
  const displayIndex = displayItem ? Math.max(0, (result.scoredCandidates || []).indexOf(displayItem)) : 0;
  const finalDraft = displayItem?.finalDraft || displayItem || {};
  const variantLabel = generationVariantLabel(finalDraft.variant || displayItem?.variant || "final");
  const repair = displayItem?.repair || {};
  const blockerReasonsMarkup = buildGenerationBlockerReasonsMarkup(displayItem);
  const repairSummary = buildGenerationRepairSummary(repair);
  const hotArticleFormulaMarkup = buildGenerationHotArticleFormulaMarkup(
    displayItem?.hotArticleFormula || result.hotArticleFormula || {}
  );
  const referenceWarnings = Array.isArray(result.referenceAssets?.warnings)
    ? result.referenceAssets.warnings.map((item) => String(item || "").trim()).filter(Boolean)
    : [];
  const repairMarkup = repair.attempted
    ? `
      <div class="generation-repair-banner${repair.applied ? "" : " is-muted"}">
        <span>${escapeHtml(repairSummary.title)}</span>
        <p>${escapeHtml(repairSummary.description)}</p>
      </div>
    `
    : "";
  const referenceWarningsMarkup = referenceWarnings.length
    ? `
      <div class="generation-blocker-box">
        <span>临时参考提醒</span>
        <ul>
          <li>部分临时参考素材已跳过或暂不可用，当前结果未使用这些内容。</li>
          ${referenceWarnings.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
        </ul>
      </div>
    `
    : "";
  const cardMarkup = displayItem
    ? `
      <article class="generation-candidate-card is-recommended">
        <div class="meta-row">
          <span class="meta-pill">${escapeHtml(variantLabel)}</span>
          ${repair.attempted ? `<span class="meta-pill">${escapeHtml(repair.applied ? "修复后评分" : "修复未完成")}</span>` : ""}
          <span class="meta-pill">综合分 ${escapeHtml(String(displayItem.scores?.total ?? 0))}</span>
          <span class="meta-pill">风格分 ${escapeHtml(String(displayItem.style?.score ?? 0))}</span>
          <span class="meta-pill">活人感 ${escapeHtml(String(displayItem.humanizer?.total ?? 0))} / 50</span>
          <span class="meta-pill">${escapeHtml(verdictLabel(displayItem.analysis?.finalVerdict || displayItem.analysis?.verdict || "pass"))}</span>
        </div>
        <strong>${escapeHtml(finalDraft.title || "未生成标题")}</strong>
        <p>${escapeHtml(finalDraft.coverText || "未生成封面文案")}</p>
        <div class="rewrite-body-reader generation-body-reader">${escapeHtml(finalDraft.body || "未生成正文")}</div>
        <p class="helper-text">标签：${escapeHtml(joinCSV(finalDraft.tags) || "未生成")}</p>
        ${repairMarkup}
        ${referenceWarningsMarkup}
        ${hotArticleFormulaMarkup}
        ${blockerReasonsMarkup}
        <p class="helper-text">${escapeHtml((displayItem.humanizer?.issues || []).slice(0, 3).join("；") || "当前去 AI 痕迹表现稳定。")}</p>
        <p class="helper-text">${escapeHtml(finalDraft.generationNotes || displayItem.generationNotes || "暂无生成说明")}</p>
        <p class="helper-text">${escapeHtml(finalDraft.safetyNotes || displayItem.safetyNotes || "暂无安全注意点")}</p>
        <div class="generation-cover-image-prompt-block">
          <p class="helper-text">封面图 Prompt</p>
          <div class="rewrite-body-reader generation-cover-image-prompt-reader">${escapeHtml(finalDraft.coverImagePrompt || "未生成")}</div>
        </div>
        <div class="item-actions">
          <button
            type="button"
            class="button button-small button-secondary"
            data-action="copy-generation-publish"
            data-candidate-id="${escapeHtml(String(displayItem.id || ""))}"
            data-candidate-index="${escapeHtml(String(displayIndex))}"
          >
            复制发布稿
          </button>
          <button
            type="button"
            class="button button-small button-secondary"
            data-action="copy-generation-cover-image-prompt"
            data-candidate-id="${escapeHtml(String(displayItem.id || ""))}"
            data-candidate-index="${escapeHtml(String(displayIndex))}"
          >
            复制封面图 Prompt
          </button>
          <button
            type="button"
            class="button button-ghost button-small"
            data-action="add-generation-candidate-to-draft"
            data-candidate-id="${escapeHtml(String(displayItem.id || ""))}"
            data-candidate-index="${escapeHtml(String(displayIndex))}"
          >
            加入草稿区
          </button>
        </div>
        <p class="helper-text">复制发布稿会带上正文、#科普 和标签，便于直接粘贴发布。</p>
        <p class="helper-text action-gate-hint" id="generation-publish-copy-hint" aria-live="polite"></p>
        <p class="helper-text action-gate-hint" id="generation-cover-image-prompt-copy-hint" aria-live="polite"></p>
      </article>
    `
    : '<div class="muted">没有生成结果</div>';

  byId("generation-result").innerHTML = `
    <div class="model-scope-banner">
      <span class="model-scope-kicker">最终稿</span>
      <strong>${escapeHtml(result.recommendationReason || "暂无推荐")}</strong>
    </div>
    ${cardMarkup}
  `;
  syncLifecycleResultActions();
}

function buildGenerationRepairSummary(repair = {}) {
  const attempts = Math.max(0, Number(repair?.attempts) || 0);
  const invalidDraftCount = Math.max(0, Number(repair?.invalidDraftCount) || 0);
  const invalidDraftLabel = invalidDraftCount > 0 ? `，跳过 ${invalidDraftCount} 次无效结果` : "";

  if (repair?.applied) {
    return {
      title: `已自动修复 ${Math.max(1, attempts)} 轮${invalidDraftLabel}`,
      description:
        String(repair?.rewrite?.rewriteNotes || "").trim() ||
        String(repair?.reason || "").trim() ||
        `已根据风险点完成 ${Math.max(1, attempts)} 轮自动修复。`
    };
  }

  return {
    title: attempts > 0 ? `已尝试自动修复 ${attempts} 轮${invalidDraftLabel}` : "已尝试自动修复",
    description:
      String(repair?.error || "").trim() ||
      String(repair?.reason || "").trim() ||
      "本稿已尝试自动修复，但仍需人工确认。"
  };
}

function buildGenerationHotArticleFormulaMarkup(hotArticleFormula = {}) {
  const status = String(hotArticleFormula?.status || "").trim();

  if (!status || status === "skipped") {
    return "";
  }

  if (status === "error") {
    return `
      <div class="generation-blocker-box is-muted">
        <span>爆款公式来源</span>
        <p>${escapeHtml(hotArticleFormula.message || "爆文规律暂不可用，本次已按本地样本和风格画像生成。")}</p>
      </div>
    `;
  }

  const references = Array.isArray(hotArticleFormula.references) ? hotArticleFormula.references.slice(0, 3) : [];
  const referencesMarkup = references.length
    ? `
      <ul>
        ${references
          .map(
            (item) => `
              <li>
                <a href="${escapeHtml(item.noteLink || "#")}" target="_blank" rel="noreferrer">${escapeHtml(item.title || "未命名爆文")}</a>
                ${item.authorNickname ? ` - <a href="${escapeHtml(item.authorLink || "#")}" target="_blank" rel="noreferrer">@${escapeHtml(item.authorNickname)}</a>` : ""}
                <span>互动数据：收藏 ${escapeHtml(String(item.collectedCount || 0))} / 分享 ${escapeHtml(String(item.sharedCount || 0))} / 评论 ${escapeHtml(String(item.commentsCount || 0))} / 点赞 ${escapeHtml(String(item.likedCount || 0))}</span>
              </li>
            `
          )
          .join("")}
      </ul>
    `
    : "";

  return `
    <div class="generation-blocker-box">
      <span>爆款公式来源</span>
      <p>${escapeHtml(hotArticleFormula.formula || "暂无公式摘要")}</p>
      <p class="helper-text">关键词：${escapeHtml(hotArticleFormula.keyword || "未识别")} · 样本数：${escapeHtml(String(hotArticleFormula.itemCount || 0))}</p>
      <p class="helper-text">标题规律：${escapeHtml(joinCSV(hotArticleFormula.titlePatterns) || "暂无")}</p>
      <p class="helper-text">开头规律：${escapeHtml(joinCSV(hotArticleFormula.openingPatterns) || "暂无")}</p>
      <p class="helper-text">高频关键词：${escapeHtml(joinCSV(hotArticleFormula.highFrequencyKeywords) || "暂无")}</p>
      ${referencesMarkup}
    </div>
  `;
}

function buildInnerSpaceTermsListMarkup(items = []) {
  return buildInnerSpaceTermsListMarkupView(items, {
    escapeHtml,
    innerSpaceTermCategoryLabel
  });
}

function renderAdminData(data) {
  renderFeedbackLog(data.feedbackLog);
  renderFalsePositiveLog(data.falsePositiveLog || []);
}

function renderAdminDataLoadingPlaceholders() {
  renderQueue(appState.adminData.reviewQueue || []);
  renderAdminData(appState.adminData);
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
  const hasExistingAdminData =
    appState.adminData.reviewQueue.length ||
    appState.adminData.seedLexicon.length ||
    appState.adminData.customLexicon.length ||
    appState.adminData.innerSpaceTerms.length ||
    appState.adminData.feedbackLog.length ||
    appState.adminData.falsePositiveLog.length ||
    Boolean(appState.adminData.styleProfile);
  const phase = hasExistingAdminData ? "refresh" : "initial";

  setAdminDataLoadingState(phase);

  if (phase === "initial") {
    renderAdminDataLoadingPlaceholders();
  }

  const adminData = await apiJson("/api/admin/data");

  appState.adminData = {
    seedLexicon: Array.isArray(adminData.seedLexicon) ? adminData.seedLexicon : [],
    customLexicon: Array.isArray(adminData.customLexicon) ? adminData.customLexicon : [],
    innerSpaceTerms: Array.isArray(adminData.innerSpaceTerms) ? adminData.innerSpaceTerms : [],
    feedbackLog: Array.isArray(adminData.feedbackLog) ? adminData.feedbackLog : [],
    falsePositiveLog: Array.isArray(adminData.falsePositiveLog) ? adminData.falsePositiveLog : [],
    reviewQueue: Array.isArray(adminData.reviewQueue) ? adminData.reviewQueue : [],
    styleProfile: adminData.styleProfile && typeof adminData.styleProfile === "object" ? adminData.styleProfile : null
  };

  if (!Array.isArray(adminData.innerSpaceTerms)) {
    await refreshInnerSpaceTermsState();
  }

  return appState.adminData;
}

async function refreshAll() {
  const hasExistingSummary = Boolean(appState.summaryData);
  const summaryPhase = hasExistingSummary ? "refresh" : "initial";
  const refreshAccountPlannerSafely =
    typeof refreshSampleLibraryAccountPlannerState === "function" ? refreshSampleLibraryAccountPlannerState : async () => {};
  const refreshXhsAccountDiagnosisSafely =
    typeof refreshXhsAccountDiagnosisState === "function" ? refreshXhsAccountDiagnosisState : async () => {};
  const refreshDraftIdeasSafely = typeof refreshDraftIdeas === "function" ? refreshDraftIdeas : async () => {};

  setSummaryLoadingState(summaryPhase);

  if (summaryPhase === "initial") {
    renderSummaryLoadingPlaceholders();
  }

  const [summary, collectionTypePayload] = await Promise.all([
    apiJson("/api/summary"),
    apiJson(collectionTypesApi),
    refreshAdminDataState(),
    refreshSampleLibraryWorkspace(),
    refreshAccountPlannerSafely(),
    refreshXhsAccountDiagnosisSafely(),
    refreshDraftIdeasSafely()
  ]);
  appState.collectionTypeOptions = Array.isArray(collectionTypePayload.options) ? collectionTypePayload.options : [];
  appState.summaryData = summary && typeof summary === "object" ? summary : {};
  setSummaryLoadingState("idle");
  setAdminDataLoadingState("idle");
  renderSummary(appState.summaryData);
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

async function readGenerationReferenceImageFiles(fileList) {
  const files = Array.from(fileList || []).filter(Boolean);

  if (!files.length) {
    return { files: [], failedCount: 0 };
  }

  const settled = await Promise.allSettled(
    files.map(async (file) => ({
      name: String(file?.name || "").trim() || "未命名图片",
      type: String(file?.type || "").trim() || "application/octet-stream",
      size: Number(file?.size ?? 0) || 0,
      dataUrl: await fileToDataUrl(file)
    }))
  );

  return {
    files: settled.filter((result) => result.status === "fulfilled").map((result) => result.value),
    failedCount: settled.filter((result) => result.status === "rejected").length
  };
}

async function readGenerationReferenceTextFiles(fileList) {
  const files = Array.from(fileList || []).filter(Boolean);

  if (!files.length) {
    return { files: [], failedCount: 0 };
  }

  const settled = await Promise.allSettled(
    files.map(async (file) => ({
      name: String(file?.name || "").trim() || "未命名文本",
      size: Number(file?.size ?? 0) || 0,
      contentBase64: await fileToBase64(file)
    }))
  );

  return {
    files: settled.filter((result) => result.status === "fulfilled").map((result) => result.value),
    failedCount: settled.filter((result) => result.status === "rejected").length
  };
}

async function awaitGenerationReferenceAssetsReady() {
  await appState.generationReferenceAssetsPending;
}

function getGenerationReferenceAssetsTotalBytes() {
  const images = Array.isArray(appState.generationReferenceAssets?.images) ? appState.generationReferenceAssets.images : [];
  const textFiles = Array.isArray(appState.generationReferenceAssets?.textFiles) ? appState.generationReferenceAssets.textFiles : [];

  return [...images, ...textFiles].reduce((total, file) => total + (Number(file?.size ?? 0) || 0), 0);
}

function serializeGenerationReferenceAssets() {
  return {
    images: appState.generationReferenceAssets.images.map((file) => ({
      name: file.name,
      type: file.type,
      size: file.size,
      dataUrl: file.dataUrl
    })),
    textFiles: appState.generationReferenceAssets.textFiles.map((file) => ({
      name: file.name,
      contentBase64: file.contentBase64
    }))
  };
}

async function captureGenerationReferenceAssetsForRequest() {
  appState.generationReferenceAssetsLocked = true;
  await awaitGenerationReferenceAssetsReady();
  return serializeGenerationReferenceAssets();
}

function releaseGenerationReferenceAssetsRequestLock() {
  appState.generationReferenceAssetsLocked = false;
}

function collectAcceptedGenerationReferenceFiles(
  files = [],
  {
    maxFileBytes = 0,
    currentTotalBytes = 0,
    maxTotalBytes = GENERATION_REFERENCE_TOTAL_MAX_BYTES,
    oversizeMessage = "",
    totalMessage = ""
  } = {}
) {
  const acceptedFiles = [];
  const messages = [];
  let nextTotalBytes = currentTotalBytes;
  let hasOversize = false;
  let hasTotalOverflow = false;

  files.forEach((file) => {
    const size = Number(file?.size ?? 0) || 0;

    if (maxFileBytes > 0 && size > maxFileBytes) {
      hasOversize = true;
      return;
    }

    if (size > 0 && nextTotalBytes + size > maxTotalBytes) {
      hasTotalOverflow = true;
      return;
    }

    acceptedFiles.push(file);
    nextTotalBytes += size;
  });

  if (hasOversize && oversizeMessage) {
    messages.push(oversizeMessage);
  }

  if (hasTotalOverflow && totalMessage) {
    messages.push(totalMessage);
  }

  return {
    acceptedFiles,
    messages
  };
}

function resetGenerationReferenceAssets() {
  appState.generationReferenceAssets = {
    images: [],
    textFiles: [],
    message: ""
  };
  renderGenerationReferenceAssets();
}

function renderGenerationReferenceAssets() {
  const container = byId("generation-reference-assets-preview");

  if (!container) {
    return;
  }

  const { images = [], textFiles = [], message = "" } = appState.generationReferenceAssets || {};
  const hasAssets = images.length || textFiles.length;

  if (!hasAssets && !message) {
    container.innerHTML = '<span class="helper-text">暂未添加临时参考素材。</span>';
    return;
  }

  const imageMarkup = images.length
    ? `
        <div class="generation-reference-section">
          <strong>参考图片</strong>
          <div class="generation-reference-chip-list">
            ${images
              .map(
                (file, index) => `
                  <button
                    type="button"
                    class="generation-reference-chip"
                    data-action="remove-generation-reference-image"
                    data-index="${index}"
                  >
                    <span>${escapeHtml(file?.name || `参考图片 ${index + 1}`)}</span>
                    <span aria-hidden="true">移除</span>
                  </button>
                `
              )
              .join("")}
          </div>
        </div>
      `
    : "";

  const textMarkup = textFiles.length
    ? `
        <div class="generation-reference-section">
          <strong>参考文本</strong>
          <div class="generation-reference-chip-list">
            ${textFiles
              .map(
                (file, index) => `
                  <button
                    type="button"
                    class="generation-reference-chip"
                    data-action="remove-generation-reference-text"
                    data-index="${index}"
                  >
                    <span>${escapeHtml(file?.name || `参考文本 ${index + 1}`)}</span>
                    <span aria-hidden="true">移除</span>
                  </button>
                `
              )
              .join("")}
          </div>
        </div>
      `
    : "";

  container.innerHTML = `
    ${message ? `<p class="helper-text">${escapeHtml(message)}</p>` : ""}
    ${imageMarkup}
    ${textMarkup}
  `;
}

function setGenerationReferenceSearchModalOpen(isOpen) {
  const modal = byId("generation-reference-search-modal");

  if (!modal) {
    return;
  }

  modal.hidden = !isOpen;
  syncBodyModalState();
}

function closeGenerationReferenceSearchModal() {
  appState.generationReferenceSearch = {
    ...appState.generationReferenceSearch,
    open: false
  };
  setGenerationReferenceSearchModalOpen(false);
}

function setGenerationThemeInspirationModalOpen(isOpen) {
  const modal = byId("generation-theme-inspiration-modal");
  const trigger = byId("generation-theme-inspiration-button");

  if (!modal) {
    return;
  }

  modal.hidden = !isOpen;

  if (trigger) {
    trigger.setAttribute("aria-expanded", isOpen ? "true" : "false");
  }

  syncBodyModalState();
}

function closeGenerationThemeInspirationModal() {
  appState.generationThemeInspiration = {
    ...appState.generationThemeInspiration,
    open: false,
    loading: false,
    message: ""
  };
  setGenerationThemeInspirationModalOpen(false);
}

function getSelectedGenerationThemeInspiration() {
  const state = appState.generationThemeInspiration || {};
  return getSelectedGenerationThemeInspirationView(state.items, state.selectedThemeId);
}

function renderGenerationThemeInspirationDetail(item = null) {
  return renderGenerationThemeInspirationDetailView(item, {
    byId,
    escapeHtml
  });
}

function renderGenerationThemeInspirationModal() {
  return renderGenerationThemeInspirationModalView(appState.generationThemeInspiration || {}, {
    byId,
    syncBodyModalState,
    setGenerationThemeInspirationModalOpen,
    escapeHtml,
    renderGenerationThemeInspirationDetail,
    getSelectedGenerationThemeInspiration
  });
}

function getSelectedSampleLibraryAccountPlannerCard() {
  const state = appState.sampleLibraryAccountPlanner || {};
  return getSelectedSampleLibraryAccountPlannerCardView(state.cards, state.selectedPlanId);
}

function renderSampleLibraryAccountPlannerDetail(card = null) {
  return renderSampleLibraryAccountPlannerDetailView(card, {
    byId,
    escapeHtml
  });
}

function renderSampleLibraryAccountPlannerResult() {
  return renderSampleLibraryAccountPlannerResultView(appState.sampleLibraryAccountPlanner || {}, {
    byId,
    escapeHtml,
    renderSampleLibraryAccountPlannerDetail
  });
}

function renderDraftIdeasList() {
  const state = appState.draftIdeas || {};
  const statusView = String(state.draftIdeasStatusView || "draft");
  const sortOrder = String(state.draftIdeasSortOrder || "newest");
  const items = (Array.isArray(state.items) ? state.items : [])
    .filter((item) => String(item?.status || "draft") === statusView)
    .sort((left, right) => {
      const leftTime = Date.parse(left?.createdAt || "") || 0;
      const rightTime = Date.parse(right?.createdAt || "") || 0;
      return sortOrder === "oldest" ? leftTime - rightTime : rightTime - leftTime;
    });

  byId("draft-ideas-sort-order") && (byId("draft-ideas-sort-order").value = sortOrder);
  byId("draft-ideas-status-view") && (byId("draft-ideas-status-view").value = statusView);
  document.querySelectorAll("[data-draft-ideas-status-view]").forEach((button) => {
    const selected = String(button.getAttribute("data-draft-ideas-status-view") || "") === statusView;
    button.classList.toggle("is-active", selected);
    button.setAttribute("aria-pressed", selected ? "true" : "false");
  });

  return renderDraftIdeasListView({ ...state, items }, {
    byId,
    escapeHtml
  });
}

function normalizeXhsTopSignalsItems(items = {}) {
  const groupedItems = items && typeof items === "object" ? items : {};

  return {
    dailyTop: Array.isArray(groupedItems.dailyTop) ? groupedItems.dailyTop : [],
    weeklyTop: Array.isArray(groupedItems.weeklyTop) ? groupedItems.weeklyTop : [],
    lowTop: Array.isArray(groupedItems.lowTop) ? groupedItems.lowTop : []
  };
}

function getVisibleXhsTopSignalsItems(state = appState.xhsTopSignals) {
  const normalizedState = state && typeof state === "object" ? state : {};
  const groupedItems = normalizeXhsTopSignalsItems(normalizedState.items);
  const activeFilter = String(normalizedState.activeFilter || "daily").trim() || "daily";

  if (activeFilter === "weekly") {
    return groupedItems.weeklyTop;
  }

  if (activeFilter === "low") {
    return groupedItems.lowTop;
  }

  return groupedItems.dailyTop;
}

function extractXhsAccountDiagnosisTopSignalDefaults(result = {}) {
  const account = result && typeof result === "object" ? result.account || {} : {};
  const raw = account && typeof account === "object" ? account._raw || {} : {};
  const works = Array.isArray(account?.works) ? account.works : [];
  const redId = String(account?.redId || raw?.redId || "").trim();
  const rawTags = Array.isArray(raw?.tags) ? raw.tags : [];
  const tagCandidates = uniqueStrings(
    rawTags
      .map((item) => String(item || "").trim())
      .filter(Boolean)
      .slice(0, 4)
  );
  const textSignals = [
    account?.desc,
    ...works.slice(0, 6).map((item) => item?.title)
  ]
    .map((item) => String(item || ""))
    .join(" ");
  const trackRules = [
    { track: "情感", pattern: /关系|情感|恋爱|亲密|伴侣|情侣|婚姻|边界|沟通|分手|暧昧|社交/ },
    { track: "女性健康", pattern: /女性|经期|卵巢|生育|妇科|身体|健康|疼痛|姨妈|避孕/ },
    { track: "成长", pattern: /成长|自洽|情绪|心理|自我|人生|边界感|内耗/ },
    { track: "科普", pattern: /科普|知识|误区|指南|真相|为什么|怎么/ }
  ];
  const matchedTracks = trackRules.filter((rule) => rule.pattern.test(textSignals)).map((rule) => rule.track);
  const track = matchedTracks[0] || tagCandidates[0] || "";
  const keywordRules = [
    { keyword: "关系沟通", pattern: /关系|沟通|伴侣|情侣|婚姻|亲密/ },
    { keyword: "边界", pattern: /边界|拒绝|分寸|底线/ },
    { keyword: "女性健康", pattern: /女性|经期|卵巢|妇科|身体|健康/ },
    { keyword: "情绪", pattern: /情绪|内耗|焦虑|自洽|心理/ }
  ];
  const keyword = keywordRules.find((rule) => rule.pattern.test(textSignals))?.keyword || tagCandidates[0] || track;

  return {
    redId,
    track,
    keyword,
    tags: tagCandidates
  };
}

function applyXhsTopSignalsDefaultsFromAccountDiagnosis({ force = false } = {}) {
  const defaults = extractXhsAccountDiagnosisTopSignalDefaults(appState.xhsAccountDiagnosis?.result);
  const trackField = byId("xhs-top-signals-track");
  const keywordField = byId("xhs-top-signals-keyword");
  const tagsField = byId("xhs-top-signals-tags");
  const currentState = appState.xhsTopSignals || {};
  const next = {
    redId: String(currentState.redId || "").trim(),
    track: String(currentState.track || "").trim(),
    keyword: String(currentState.keyword || "").trim(),
    tags: String(currentState.tags || "").trim()
  };
  const maybeApply = (field, key, value) => {
    const normalizedValue = Array.isArray(value) ? value.join(", ") : String(value || "").trim();

    if (!normalizedValue) {
      return;
    }

    const fieldValue = String(field?.value || "").trim();
    const hasCurrentValue = Boolean(fieldValue || next[key]);
    const userEdited = field?.dataset?.xhsTopSignalsUserEdited === "true";

    if (force || (!hasCurrentValue && !userEdited)) {
      next[key] = normalizedValue;

      if (field) {
        field.value = normalizedValue;
      }
    }
  };

  maybeApply(trackField, "track", defaults.track);
  maybeApply(keywordField, "keyword", defaults.keyword);
  maybeApply(tagsField, "tags", defaults.tags);

  appState.xhsTopSignals = {
    ...currentState,
    ...next
  };
}

function buildXhsTopSignalsRequestPayload() {
  return {
    redId: String(byId("xhs-top-signals-red-id")?.value || "").trim(),
    track: String(byId("xhs-top-signals-track")?.value || "").trim(),
    keyword: joinCSV(splitCSV(byId("xhs-top-signals-keyword")?.value || "")),
    tags: splitCSV(byId("xhs-top-signals-tags")?.value || "")
  };
}

function syncXhsTopSignalsPanel() {
  syncXhsTopSignalsRefreshButton();
  renderXhsTopSignalsBrowser(
    {
      ...(appState.xhsTopSignals || {}),
      items: normalizeXhsTopSignalsItems(appState.xhsTopSignals?.items)
    },
    {
      byId,
      escapeHtml
    }
  );
}

function syncXhsTopSignalsRefreshButton() {
  const state = appState.xhsTopSignals || {};
  const refreshButton = byId("xhs-top-signals-refresh");

  if (refreshButton) {
    setButtonBusy(refreshButton, Boolean(state.loading), "刷新中...");
  }
}

function syncXhsTopSignalsInputs() {
  const state = appState.xhsTopSignals || {};
  const redIdField = byId("xhs-top-signals-red-id");
  const trackField = byId("xhs-top-signals-track");
  const keywordField = byId("xhs-top-signals-keyword");
  const tagsField = byId("xhs-top-signals-tags");

  if (redIdField && redIdField.dataset.xhsTopSignalsUserEdited === "true") {
    redIdField.value = String(state.redId || "");
  }

  if (trackField && trackField.dataset.xhsTopSignalsUserEdited === "true") {
    trackField.value = String(state.track || "");
  }

  if (keywordField && keywordField.dataset.xhsTopSignalsUserEdited === "true") {
    keywordField.value = String(state.keyword || "");
  }

  if (tagsField && tagsField.dataset.xhsTopSignalsUserEdited === "true") {
    tagsField.value = String(state.tags || "");
  }
}

function bindXhsTopSignalsInputEditTracking() {
  [
    "xhs-top-signals-red-id",
    "xhs-top-signals-track",
    "xhs-top-signals-keyword",
    "xhs-top-signals-tags"
  ].forEach((id) => {
    const field = byId(id);

    if (!field || field.dataset.xhsTopSignalsEditTrackingBound === "true") {
      return;
    }

    field.dataset.xhsTopSignalsEditTrackingBound = "true";
    field.addEventListener("input", () => {
      field.dataset.xhsTopSignalsUserEdited = "true";
    });
    field.addEventListener("change", () => {
      field.dataset.xhsTopSignalsUserEdited = "true";
    });
  });
}

function setSampleLibraryExternalSamplesModalOpen(isOpen) {
  const modal = byId("sample-library-external-samples-modal");
  const trigger = byId("sample-library-external-samples-button");

  if (!modal) {
    return;
  }

  modal.hidden = !isOpen;

  if (trigger) {
    trigger.setAttribute("aria-expanded", isOpen ? "true" : "false");
  }

  syncBodyModalState();
}

function renderSampleLibraryExternalSamplesModal() {
  return renderSampleLibraryExternalSamplesModalView(
    {
      ...appState.externalReferenceSamplesModal,
      items: appState.externalReferenceSamples
    },
    {
      byId,
      syncBodyModalState,
      setSampleLibraryExternalSamplesModalOpen,
      escapeHtml
    }
  );
}

function syncSampleLibraryAccountPlannerPanel() {
  const summaryNode = byId("sample-library-account-planner-import-summary");
  const externalSamples = Array.isArray(appState.externalReferenceSamples) ? appState.externalReferenceSamples : [];

  if (summaryNode) {
    summaryNode.textContent = externalSamples.length
      ? `已导入 ${externalSamples.length} 条外部样本，会作为账号复盘的辅助对照。`
      : "可选：导入 Markdown / CSV 外部样本，补充账号外部对照。";
  }

  renderSampleLibraryAccountPlannerResult();
}

function syncXhsAccountDiagnosisPanel() {
  const latestButton = byId("xhs-account-diagnosis-open-latest");

  if (latestButton) {
    latestButton.disabled = !appState.xhsAccountDiagnosis?.result;
    latestButton.title = appState.xhsAccountDiagnosis?.result ? "" : "还没有已保存的分析结果";
  }
}

async function refreshXhsTopSignalsState({ useCache = false } = {}) {
  appState.xhsTopSignals = {
    ...appState.xhsTopSignals,
    loading: true,
    message: ""
  };
  syncXhsTopSignalsRefreshButton();
  renderXhsTopSignalsBrowser(
    {
      ...(appState.xhsTopSignals || {}),
      items: normalizeXhsTopSignalsItems(appState.xhsTopSignals?.items)
    },
    {
      byId,
      escapeHtml
    }
  );

  try {
    const requestPayload = useCache ? null : buildXhsTopSignalsRequestPayload();
    const response = useCache
      ? await apiJson(xhsTopSignalsApi)
      : await apiJson(xhsTopSignalsApi, {
          method: "POST",
          body: JSON.stringify(requestPayload)
        });
    const nextItems = normalizeXhsTopSignalsItems(response?.items);
    const nextFilter = String(appState.xhsTopSignals?.activeFilter || "daily").trim() || "daily";
    const visibleItems = getVisibleXhsTopSignalsItems({
      activeFilter: nextFilter,
      items: nextItems
    });
    const nextSelectedSignalId = visibleItems.find((item) => String(item?.id || "") === String(appState.xhsTopSignals?.selectedSignalId || ""))
      ? String(appState.xhsTopSignals?.selectedSignalId || "")
      : String(visibleItems[0]?.id || "");

    appState.xhsTopSignals = {
      ...appState.xhsTopSignals,
      loading: false,
      message:
        response?.generatedAt
          ? `已刷新 ${(Number(response?.resultCount) || visibleItems.length || 0)} 条 · ${formatUiDateTime(response.generatedAt)}`
          : "",
      redId: String(requestPayload?.redId || byId("xhs-top-signals-red-id")?.value || "").trim(),
      track: String(requestPayload?.track || byId("xhs-top-signals-track")?.value || "").trim(),
      keyword: String(byId("xhs-top-signals-keyword")?.value || "").trim(),
      tags: String(byId("xhs-top-signals-tags")?.value || "").trim(),
      accountContext: requestPayload?.redId ? response?.accountContext : {},
      items: nextItems,
      generatedAt: String(response?.generatedAt || "").trim(),
      selectedSignalId: nextSelectedSignalId
    };
    syncXhsTopSignalsInputs();
  } catch (error) {
    appState.xhsTopSignals = {
      ...appState.xhsTopSignals,
      loading: false,
      message: error?.message || "同类爆文刷新失败"
    };
  }

  syncXhsTopSignalsPanel();
  return appState.xhsTopSignals;
}

async function refreshDraftIdeas() {
  try {
    const payload = await apiJson(draftIdeasApi);
    appState.draftIdeas = {
      loading: false,
      message: "",
      items: Array.isArray(payload?.items) ? payload.items : []
    };
  } catch (error) {
    appState.draftIdeas = {
      ...appState.draftIdeas,
      loading: false,
      message: error?.message || "草稿区加载失败"
    };
  }

  renderDraftIdeasList();
}

async function refreshSampleLibraryAccountPlannerState() {
  try {
    const payload = await apiJson(sampleLibraryAccountPlannerAnalyzeApi);
    appState.sampleLibraryAccountPlanner = {
      ...appState.sampleLibraryAccountPlanner,
      loading: false,
      message: "",
      summary: payload?.summary || null,
      cards: Array.isArray(payload?.cards) ? payload.cards : [],
      selectedPlanId: String(payload?.cards?.[0]?.planId || appState.sampleLibraryAccountPlanner?.selectedPlanId || "")
    };
  } catch {
    appState.sampleLibraryAccountPlanner = {
      ...appState.sampleLibraryAccountPlanner,
      loading: false
    };
  }

  syncSampleLibraryAccountPlannerPanel();
  return appState.sampleLibraryAccountPlanner;
}

async function refreshXhsAccountDiagnosisState() {
  try {
    const payload = await apiJson(xhsAccountDiagnosisApi);
    appState.xhsAccountDiagnosis = {
      ...appState.xhsAccountDiagnosis,
      loading: false,
      message: "",
      currentRunResult: null,
      currentRunGeneratedAt: "",
      result: payload?.result || null,
      generatedAt: String(payload?.generatedAt || "").trim(),
      subscription: payload?.subscription && typeof payload.subscription === "object" ? payload.subscription : null,
      canSubscribe: false,
      report: payload?.report && typeof payload.report === "object" ? payload.report : null
    };
    applyXhsTopSignalsDefaultsFromAccountDiagnosis();
    syncXhsTopSignalsInputs();
  } catch {
    appState.xhsAccountDiagnosis = {
      ...appState.xhsAccountDiagnosis,
      loading: false
    };
  }

  syncXhsAccountDiagnosisPanel();
  return appState.xhsAccountDiagnosis;
}

async function refreshExternalReferenceSamples({ openModal = false, message = "" } = {}) {
  appState.externalReferenceSamplesModal = {
    ...appState.externalReferenceSamplesModal,
    open: openModal ? true : appState.externalReferenceSamplesModal.open,
    loading: true,
    message
  };
  renderSampleLibraryExternalSamplesModal();

  try {
    const payload = await apiJson(sampleLibraryExternalSamplesApi);
    appState.externalReferenceSamples = Array.isArray(payload?.items) ? payload.items : [];
    appState.externalReferenceSamplesModal = {
      ...appState.externalReferenceSamplesModal,
      open: openModal ? true : appState.externalReferenceSamplesModal.open,
      loading: false,
      message: ""
    };
  } catch (error) {
    appState.externalReferenceSamplesModal = {
      ...appState.externalReferenceSamplesModal,
      open: openModal ? true : appState.externalReferenceSamplesModal.open,
      loading: false,
      message: error?.message || "外部参考样本加载失败"
    };
  }

  syncSampleLibraryAccountPlannerPanel();
  renderSampleLibraryExternalSamplesModal();
}

function closeSampleLibraryExternalSamplesModal() {
  appState.externalReferenceSamplesModal = {
    ...appState.externalReferenceSamplesModal,
    open: false,
    loading: false,
    message: ""
  };
  setSampleLibraryExternalSamplesModalOpen(false);
}

async function importExternalReferenceSamples(files = []) {
  const payload = {
    files: await Promise.all(
      [...files].map(async (file) => ({
        name: file.name,
        contentBase64: await fileToBase64(file)
      }))
    )
  };

  return apiJson(`${sampleLibraryExternalSamplesApi}/import`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

function writeGenerationFieldValue(field, value) {
  if (!(field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement || field instanceof HTMLSelectElement)) {
    return;
  }

  field.value = String(value || "");
  field.dispatchEvent(new Event("input", { bubbles: true }));
}

function applyGenerationThemeInspirationPrefill(item = {}) {
  if (!item || typeof item !== "object") {
    return;
  }

  const form = byId("generation-workbench-form");

  if (!form) {
    return;
  }

  const briefingField = form.querySelector('[name="briefing"]');
  const referenceTitleField = form.querySelector('[name="referenceTitle"]');
  const collectionTypeField = form.querySelector('[name="collectionType"]');
  const tagReferencesField = form.querySelector('[name="tagReferences"]');

  if (!String(briefingField?.value || "").trim() && String(item.prefillBriefing || "").trim()) {
    writeGenerationFieldValue(briefingField, item.prefillBriefing);
  }

  if (!String(referenceTitleField?.value || "").trim() && String(item.prefillReferenceTitle || "").trim()) {
    writeGenerationFieldValue(referenceTitleField, item.prefillReferenceTitle);
  }

  if (!String(collectionTypeField?.value || "").trim() && String(item.prefillCollectionType || "").trim()) {
    writeGenerationFieldValue(collectionTypeField, item.prefillCollectionType);
  }

  if (String(item.prefillMaterialText || "").trim()) {
    appendGenerationMaterialText(item.prefillMaterialText);
  }

  const nextTagReferences = uniqueStrings([
    ...splitCSV(tagReferencesField?.value || ""),
    ...(Array.isArray(item.tags) ? item.tags : [])
  ]);
  writeGenerationFieldValue(tagReferencesField, joinCSV(nextTagReferences));

  appState.generationThemeInspiration = {
    ...appState.generationThemeInspiration,
    resultMessage: "已将主题灵感填入生成表单，可直接继续调整。"
  };
  closeGenerationThemeInspirationModal();
  setActionGateHint("generation-action-hint", appState.generationThemeInspiration.resultMessage);
  syncGenerationActions();
}

function readGenerationWorkbenchFieldValue(fieldName = "") {
  const form = byId("generation-workbench-form");
  const field = form?.querySelector?.(`[name="${fieldName}"]`);
  return String(field?.value || "");
}

function writeGenerationWorkbenchFieldValue(fieldName = "", value = "") {
  const form = byId("generation-workbench-form");
  const field = form?.querySelector?.(`[name="${fieldName}"]`);
  writeGenerationFieldValue(field, value);
}

function applySampleLibraryAccountPlannerCard() {
  const selectedCard = getSelectedSampleLibraryAccountPlannerCard();

  if (!selectedCard) {
    const resultNode = byId("sample-library-account-planner-detail-action-hint");
    if (resultNode) {
      resultNode.textContent = "请先选择一张下一篇建议卡。";
    }
    return;
  }

  applySampleLibraryAccountPlannerPrefillView(selectedCard, {
    readFieldValue: readGenerationWorkbenchFieldValue,
    writeFieldValue: writeGenerationWorkbenchFieldValue,
    appendMaterialText: appendGenerationMaterialText,
    splitCSV,
    joinCSV,
    uniqueStrings
  });

  appState.sampleLibraryAccountPlanner = {
    ...appState.sampleLibraryAccountPlanner,
    message: "已将下一篇建议填入生成工作台，可直接继续生成。"
  };
  setActionGateHint("sample-library-account-planner-detail-action-hint", appState.sampleLibraryAccountPlanner.message);
  setActionGateHint("generation-action-hint", appState.sampleLibraryAccountPlanner.message);
  syncGenerationActions();
}

function buildDraftIdeaPayload({
  title = "",
  briefing = "",
  collectionType = "",
  materialText = "",
  referenceTitle = "",
  tags = [],
  sourceType = "manual",
  sourceLabel = ""
} = {}) {
  return {
    title: String(title || "").trim(),
    briefing: String(briefing || "").trim(),
    collectionType: String(collectionType || "").trim() || "科普",
    materialText: String(materialText || "").trim(),
    referenceTitle: String(referenceTitle || "").trim(),
    tags: uniqueStrings(tags || []),
    sourceType: String(sourceType || "").trim() || "manual",
    sourceLabel: String(sourceLabel || "").trim()
  };
}

async function saveDraftIdea(payload = {}) {
  const response = await apiJson(draftIdeasApi, {
    method: "POST",
    body: JSON.stringify(payload)
  });

  appState.draftIdeas = {
    ...appState.draftIdeas,
    loading: false,
    message: "",
    items: Array.isArray(response?.items) ? response.items : []
  };
  renderDraftIdeasList();
  return response?.item || null;
}

async function addDraftIdeaFromAccountPlannerCard() {
  const selectedCard = getSelectedSampleLibraryAccountPlannerCard();

  if (!selectedCard) {
    return;
  }

  await saveDraftIdea(
    buildDraftIdeaPayload({
      title: selectedCard.planTitle,
      briefing: selectedCard.prefillBriefing,
      collectionType: selectedCard.prefillCollectionType,
      materialText: selectedCard.prefillMaterialText,
      referenceTitle: selectedCard.prefillReferenceTitle,
      tags: selectedCard.tags,
      sourceType: "account_planner",
      sourceLabel: "账号复盘卡"
    })
  );
  setActionGateHint("sample-library-account-planner-detail-action-hint", "已加入草稿区，可稍后继续写。");
  setActionGateHint("generation-action-hint", "已加入草稿区，可稍后继续写。");
}

async function addDraftIdeaFromThemeInspirationCard() {
  const selectedTheme = getSelectedGenerationThemeInspiration();

  if (!selectedTheme) {
    return;
  }

  await saveDraftIdea(
    buildDraftIdeaPayload({
      title: selectedTheme.themeTitle,
      briefing: selectedTheme.prefillBriefing,
      collectionType: selectedTheme.prefillCollectionType || "科普",
      materialText: selectedTheme.prefillMaterialText,
      referenceTitle: selectedTheme.prefillReferenceTitle,
      tags: selectedTheme.tags,
      sourceType: "theme_inspiration",
      sourceLabel: "主题灵感卡"
    })
  );
  setActionGateHint("generation-theme-inspiration-detail-action-hint", "已加入草稿区，可稍后继续写。");
  setActionGateHint("generation-action-hint", "已加入草稿区，可稍后继续写。");
}

async function addDraftIdeaFromGenerationCandidate(candidateId = "", candidateIndex = "") {
  const candidate = findGenerationResultCandidate(candidateId, candidateIndex);
  const finalDraft = candidate?.finalDraft || candidate || {};

  if (!String(finalDraft?.title || "").trim() && !String(finalDraft?.body || "").trim()) {
    return;
  }

  await saveDraftIdea(
    buildDraftIdeaPayload({
      title: finalDraft.title,
      briefing: finalDraft.title || "生成候选稿待继续完善",
      collectionType: appState.latestGeneration?.collectionType || "科普",
      materialText: finalDraft.body,
      referenceTitle: finalDraft.title,
      tags: finalDraft.tags,
      sourceType: "generation_candidate",
      sourceLabel: "生成候选稿"
    })
  );
  setActionGateHint("generation-action-hint", "已加入草稿区，可稍后继续写。");
}

function findMatchedXhsSignalById(signalId = "") {
  const result = appState.xhsAccountDiagnosis?.currentRunResult || appState.xhsAccountDiagnosis?.result || {};
  const matchedSignals = result?.matchedSignals && typeof result.matchedSignals === "object" ? result.matchedSignals : {};
  const allItems = [
    ...(Array.isArray(matchedSignals.dailyTop) ? matchedSignals.dailyTop : []),
    ...(Array.isArray(matchedSignals.weeklyTop) ? matchedSignals.weeklyTop : []),
    ...(Array.isArray(matchedSignals.lowTop) ? matchedSignals.lowTop : [])
  ];

  return allItems.find((item) => String(item?.id || "") === String(signalId || "")) || null;
}

function findXhsTopSignalById(signalId = "") {
  const visibleItems = getVisibleXhsTopSignalsItems();
  const explicitSignalId = String(signalId || "").trim();
  const selectedSignalId = String(appState.xhsTopSignals?.selectedSignalId || "").trim();
  const explicitMatch = explicitSignalId
    ? visibleItems.find((item) => String(item?.id || "") === explicitSignalId) || null
    : null;

  if (explicitMatch) {
    return explicitMatch;
  }

  const selectedMatch = selectedSignalId
    ? visibleItems.find((item) => String(item?.id || "") === selectedSignalId) || null
    : null;

  return selectedMatch || visibleItems[0] || null;
}

async function addMatchedXhsSignalToExternalSamples(signalId = "") {
  const signal = findMatchedXhsSignalById(signalId);

  if (!signal) {
    return;
  }

  const payload = {
    items: [
      {
        title: signal.title,
        body: signal.body,
        tags: signal.tags,
        collectionType: signal.track || "科普",
        notes: signal.analysis?.whySelected || "",
        publish: signal.publish,
        sourceType: signal.sourceType,
        author: signal.author,
        authorRedId: signal.authorRedId
      }
    ]
  };

  const response = await apiJson(sampleLibraryExternalSamplesApi, {
    method: "POST",
    body: JSON.stringify(payload)
  });

  appState.externalReferenceSamples = Array.isArray(response?.items) ? response.items : appState.externalReferenceSamples;
  setSampleLibraryModalMessage("已加入外部参考样本。");
}

async function addMatchedXhsSignalToDraftIdeas(signalId = "") {
  const signal = findMatchedXhsSignalById(signalId);

  if (!signal) {
    return;
  }

  await saveDraftIdea(
    buildDraftIdeaPayload({
      title: signal.title,
      briefing: signal.analysis?.reuseHint || signal.analysis?.whySelected || signal.title,
      collectionType: signal.track || "科普",
      materialText: signal.body,
      referenceTitle: signal.title,
      tags: signal.tags,
      sourceType: signal.sourceType,
      sourceLabel: "同类爆款信号"
    })
  );
  setSampleLibraryModalMessage("已生成灵感草稿。");
}

async function addXhsTopSignalToExternalSamples(signalId = "") {
  const signal = findXhsTopSignalById(signalId);

  if (!signal) {
    return;
  }

  const payload = {
    items: [
      {
        title: signal.title,
        body: signal.body,
        tags: signal.tags,
        collectionType: signal.track || "科普",
        notes: signal.analysis?.whySelected || "",
        publish: signal.publish,
        sourceType: signal.sourceType,
        author: signal.author,
        authorRedId: signal.authorRedId
      }
    ]
  };

  const response = await apiJson(sampleLibraryExternalSamplesApi, {
    method: "POST",
    body: JSON.stringify(payload)
  });

  appState.externalReferenceSamples = Array.isArray(response?.items) ? response.items : appState.externalReferenceSamples;
  syncSampleLibraryAccountPlannerPanel();
  renderSampleLibraryExternalSamplesModal();
  setSampleLibraryModalMessage("已加入外部参考样本。");
}

async function addXhsTopSignalToDraftIdeas(signalId = "") {
  const signal = findXhsTopSignalById(signalId);

  if (!signal) {
    return;
  }

  await saveDraftIdea(
    buildDraftIdeaPayload({
      title: signal.title,
      briefing: signal.analysis?.reuseHint || signal.analysis?.whySelected || signal.title,
      collectionType: signal.track || "科普",
      materialText: signal.body,
      referenceTitle: signal.title,
      tags: signal.tags,
      sourceType: signal.sourceType,
      sourceLabel: "同类爆文信号"
    })
  );
  setSampleLibraryModalMessage("已生成灵感草稿。");
}

async function refreshXhsMatchedSignals() {
  const currentResult = appState.xhsAccountDiagnosis?.currentRunResult || appState.xhsAccountDiagnosis?.result;
  const redId = String(currentResult?.account?.redId || byId("xhs-account-diagnosis-red-id")?.value || "").trim();

  if (!redId) {
    openXhsAccountDiagnosisModal({ message: "当前没有可刷新的账号结果。", useLatestStoredResult: false });
    return;
  }

  await runXhsAccountDiagnosisAnalysis({ forcedRedId: redId });
}

function loadDraftIdeaIntoGenerationForm(id = "") {
  const item = (Array.isArray(appState.draftIdeas?.items) ? appState.draftIdeas.items : []).find(
    (entry) => String(entry?.id || "") === String(id || "")
  );
  const form = byId("generation-workbench-form");

  if (!item || !form) {
    return;
  }

  writeGenerationFieldValue(form.querySelector('[name="mode"]'), "from_scratch");

  const briefingField = form.querySelector('[name="briefing"]');
  const referenceTitleField = form.querySelector('[name="referenceTitle"]');
  const collectionTypeField = form.querySelector('[name="collectionType"]');
  const tagReferencesField = form.querySelector('[name="tagReferences"]');

  if (!String(briefingField?.value || "").trim()) {
    writeGenerationFieldValue(briefingField, item.briefing);
  }
  if (!String(referenceTitleField?.value || "").trim()) {
    writeGenerationFieldValue(referenceTitleField, item.referenceTitle);
  }
  if (!String(collectionTypeField?.value || "").trim()) {
    writeGenerationFieldValue(collectionTypeField, item.collectionType);
  }
  if (String(item.materialText || "").trim()) {
    appendGenerationMaterialText(item.materialText);
  }
  writeGenerationFieldValue(
    tagReferencesField,
    joinCSV(uniqueStrings([...splitCSV(tagReferencesField?.value || ""), ...(item.tags || [])]))
  );

  activateTab("main-workbench", "generation-workbench-pane");
  byId("generation-workbench-pane")?.scrollIntoView({ behavior: "smooth", block: "start" });
  syncGenerationModeFields();
  syncGenerationActions();
  setActionGateHint("generation-action-hint", "已将草稿区选题载入生成工作台。");
}

async function markDraftIdeaUsed(id = "") {
  const response = await apiJson(draftIdeasApi, {
    method: "PATCH",
    body: JSON.stringify({ id, status: "used" })
  });

  appState.draftIdeas = {
    ...appState.draftIdeas,
    loading: false,
    message: "",
    items: Array.isArray(response?.items) ? response.items : []
  };
  renderDraftIdeasList();
}

async function removeDraftIdea(id = "") {
  const response = await apiJson(draftIdeasApi, {
    method: "DELETE",
    body: JSON.stringify({ id })
  });

  appState.draftIdeas = {
    ...appState.draftIdeas,
    loading: false,
    message: "",
    items: Array.isArray(response?.items) ? response.items : []
  };
  renderDraftIdeasList();
}

function appendGenerationMaterialText(nextText) {
  const field = byId("generation-workbench-form")?.querySelector('[name="materialText"]');
  const appended = String(nextText || "").trim();

  if (!(field instanceof HTMLTextAreaElement) || !appended) {
    return;
  }

  const currentValue = String(field.value || "");
  let separator = "";

  if (currentValue) {
    if (/\n\s*\n\s*$/.test(currentValue)) {
      separator = "";
    } else if (/\n\s*$/.test(currentValue)) {
      separator = "\n";
    } else {
      separator = "\n\n";
    }
  }

  field.value = `${currentValue}${separator}${appended}`;
  field.dispatchEvent(new Event("input", { bubbles: true }));
}

function appendMultipleGenerationMaterialTexts(texts = []) {
  const normalized = [
    ...new Set((Array.isArray(texts) ? texts : [texts]).map((item) => String(item || "").trim()).filter(Boolean))
  ];

  for (const text of normalized) {
    appendGenerationMaterialText(text);
  }
}

function syncGenerationReferenceSearchSelectionState() {
  const contentNode = byId("generation-reference-search-modal-content");
  const state = appState.generationReferenceSearch || {};
  const selectedIndices = Array.isArray(state.selectedIndices) ? state.selectedIndices : [];
  const selectedCount = selectedIndices.length;

  if (!contentNode) {
    return;
  }

  const applyButton = contentNode.querySelector('[data-action="apply-generation-reference-materials"]');

  if (applyButton) {
    applyButton.textContent = `回填已选 ${selectedCount} 条`;
    applyButton.disabled = selectedCount === 0;
  }
}

function renderGenerationReferenceSearchModal() {
  const modal = byId("generation-reference-search-modal");
  const contentNode = byId("generation-reference-search-modal-content");

  if (!modal || !contentNode) {
    return;
  }

  const state = appState.generationReferenceSearch || {};

  if (!state.open) {
    modal.hidden = true;
    syncBodyModalState();
    return;
  }

  const items = Array.isArray(state.items) ? state.items : [];
  const selectedIndices = Array.isArray(state.selectedIndices) ? state.selectedIndices : [];
  const selectedCount = selectedIndices.length;

  if (state.loading) {
    contentNode.innerHTML = '<div class="result-card muted">正在搜索参考资料...</div>';
  } else if (!items.length) {
    contentNode.innerHTML = '<div class="result-card muted">暂未找到可用的参考资料。</div>';
  } else {
    contentNode.innerHTML = `${items
      .map(
        (item, index) => `
          <article class="modal-card generation-reference-result-card">
            <div class="sample-library-modal-section-head">
              <div>
                <label class="generation-reference-selection">
                  <input
                    type="checkbox"
                    data-action="toggle-generation-reference-material"
                    data-index="${index}"
                    ${selectedIndices.includes(index) ? "checked" : ""}
                  />
                  <span class="generation-reference-selection-indicator" aria-hidden="true"></span>
                  <span>选择这条参考资料</span>
                </label>
                <strong>${escapeHtml(item?.title || `参考资料 ${index + 1}`)}</strong>
                <p>${escapeHtml(item?.reason || "未提供推荐理由")}</p>
              </div>
            </div>
            <div class="stack">
              <label>
                <span>参考文本</span>
                <p>${escapeHtml(item?.referenceText || "未提供参考文本")}</p>
              </label>
              <label>
                <span>来源链接</span>
                <p>${
                  item?.sourceUrl
                    ? `<a href="${escapeHtml(item.sourceUrl)}" target="_blank" rel="noreferrer">${escapeHtml(item.sourceUrl)}</a>`
                    : "未提供来源链接"
                }</p>
              </label>
            </div>
          </article>
        `
      )
      .join("")}
      <div class="item-actions">
        <button
          type="button"
          class="button button-small"
          data-action="apply-generation-reference-materials"
          ${selectedCount ? "" : "disabled"}
        >
          回填已选 ${selectedCount} 条
        </button>
      </div>`;
  }

  setGenerationReferenceSearchModalOpen(true);
}

async function refreshGenerationThemeInspirations({ forceRefresh = true } = {}) {
  const modal = byId("generation-theme-inspiration-modal");
  const button =
    modal?.querySelector?.('[data-action="refresh-generation-theme-inspiration"]') ||
    byId("generation-theme-inspiration-button");
  const requestId = ++generationThemeInspirationRequestSequence;

  appState.generationThemeInspiration = {
    ...appState.generationThemeInspiration,
    loading: true,
    message: "",
    requestId
  };
  renderGenerationThemeInspirationModal();
  setButtonBusy(button, true, "刷新中...");

  try {
    const payload = await apiJson(generationThemeInspirationsApi, {
      method: "POST",
      body: JSON.stringify({
        refresh: forceRefresh,
        collectionType: String(byId("generation-collection-type-select")?.value || "").trim(),
        modelSelection: getSelectedModelSelections()
      })
    });

    if (requestId !== generationThemeInspirationRequestSequence) {
      return;
    }

    const items = Array.isArray(payload?.items) ? payload.items : [];
    const selectedThemeId = String(appState.generationThemeInspiration?.selectedThemeId || "");
    const nextSelectedThemeId =
      items.find((item) => String(item?.themeId || "") === selectedThemeId)?.themeId || items[0]?.themeId || "";

    appState.generationThemeInspiration = {
      ...appState.generationThemeInspiration,
      loading: false,
      items,
      selectedThemeId: String(nextSelectedThemeId || ""),
      message: items.length ? "" : "本次没有生成可直接使用的主题灵感。",
      requestId
    };
  } catch (error) {
    if (requestId !== generationThemeInspirationRequestSequence) {
      return;
    }

    appState.generationThemeInspiration = {
      ...appState.generationThemeInspiration,
      loading: false,
      items: Array.isArray(appState.generationThemeInspiration?.items) ? appState.generationThemeInspiration.items : [],
      selectedThemeId: String(appState.generationThemeInspiration?.selectedThemeId || ""),
      message: error.message || "主题灵感加载失败",
      requestId
    };
  } finally {
    if (requestId === generationThemeInspirationRequestSequence) {
      setButtonBusy(button, false);
      renderGenerationThemeInspirationModal();
    }
  }
}

async function openGenerationThemeInspirationModal() {
  const cachedItems = Array.isArray(appState.generationThemeInspiration?.items) ? appState.generationThemeInspiration.items : [];

  appState.generationThemeInspiration = {
    ...appState.generationThemeInspiration,
    open: true,
    loading: cachedItems.length === 0,
    resultMessage: "",
    requestId: generationThemeInspirationRequestSequence
  };
  setGenerationThemeInspirationModalOpen(true);
  renderGenerationThemeInspirationModal();

  if (!cachedItems.length) {
    await refreshGenerationThemeInspirations({ forceRefresh: false });
  }
}

async function openGenerationReferenceSearchModal() {
  const resultNode = byId("generation-reference-search-result");
  const payload = getGenerationPayload({ includeReferenceAssets: false });
  const briefing = String(payload.brief?.briefing || "").trim();
  const requestId = ++generationReferenceSearchRequestSequence;

  if (!briefing) {
    if (resultNode) {
      resultNode.textContent = "请先填写一句话需求。";
    }
    syncGenerationActions();
    return;
  }

  appState.generationReferenceSearch = {
    open: true,
    loading: true,
    message: "",
    items: [],
    selectedIndices: []
  };
  renderGenerationReferenceSearchModal();

  if (resultNode) {
    resultNode.textContent = "正在搜索参考资料...";
  }

  try {
    const result = await apiJson("/api/generate-reference-materials", {
      method: "POST",
      body: JSON.stringify(payload)
    });

    if (requestId !== generationReferenceSearchRequestSequence) {
      return;
    }

    const items = Array.isArray(result?.items)
      ? result.items
      : Array.isArray(result?.materials)
        ? result.materials
        : [];

    appState.generationReferenceSearch = {
      ...appState.generationReferenceSearch,
      loading: false,
      message: String(result?.message || "").trim(),
      items,
      selectedIndices: []
    };

    if (resultNode) {
      resultNode.textContent = items.length ? "已生成候选参考资料。请选择需要回填的内容。" : "本次没有找到可回填的参考资料。";
    }
  } catch (error) {
    if (requestId !== generationReferenceSearchRequestSequence) {
      return;
    }

    appState.generationReferenceSearch = {
      ...appState.generationReferenceSearch,
      loading: false,
      message: error?.message || "参考资料搜索失败",
      items: [],
      selectedIndices: []
    };

    if (resultNode) {
      resultNode.textContent = error?.message || "参考资料搜索失败";
    }
  }

  renderGenerationReferenceSearchModal();
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
    return "请先选择 Markdown 文件并完成解析。";
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

async function parseSampleLibraryMarkdownFiles(files = []) {
  const payload = {
    files: await Promise.all(
      [...files].map(async (file) => ({
        name: file.name,
        contentBase64: await fileToBase64(file)
      }))
    )
  };

  return apiJson(sampleLibraryMarkdownImportParseApi, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

async function parseSampleLibraryAccountPlannerFiles(files = []) {
  const payload = {
    files: await Promise.all(
      [...files].map(async (file) => ({
        name: file.name,
        contentBase64: await fileToBase64(file)
      }))
    )
  };

  return apiJson(sampleLibraryAccountPlannerParseApi, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

function buildSampleLibraryAccountPlannerAnalyzePayload({ records = [], externalSamples = [] } = {}) {
  const normalizedRecords = (Array.isArray(records) ? records : []).map((record) => ({
    id: String(record?.id || "").trim(),
    note: {
      title: String(record?.note?.title || "").trim(),
      tags: Array.isArray(record?.note?.tags) ? record.note.tags : [],
      collectionType: String(record?.note?.collectionType || "").trim()
    },
    publish: {
      status: String(record?.publish?.status || "").trim(),
      publishedAt: String(record?.publish?.publishedAt || "").trim(),
      metrics: record?.publish?.metrics && typeof record.publish.metrics === "object" ? { ...record.publish.metrics } : {}
    },
    reference: record?.reference && typeof record.reference === "object" ? { ...record.reference } : {},
    calibration: {
      plannerSummary:
        record?.calibration?.plannerSummary && typeof record.calibration.plannerSummary === "object"
          ? { ...record.calibration.plannerSummary }
          : {},
      retro:
        record?.calibration?.retro && typeof record.calibration.retro === "object"
          ? { ...record.calibration.retro }
          : {}
    }
  }));

  const payload = {
    records: normalizedRecords
  };

  if (Array.isArray(externalSamples) && externalSamples.length) {
    payload.externalSamples = externalSamples.map((sample) => ({
      id: String(sample?.id || "").trim(),
      title: String(sample?.title || "").trim(),
      body: String(sample?.body || "")
        .trim()
        .slice(0, 180),
      tags: Array.isArray(sample?.tags) ? sample.tags : [],
      collectionType: String(sample?.collectionType || "").trim(),
      publish: {
        status: String(sample?.publish?.status || "").trim(),
        publishedAt: String(sample?.publish?.publishedAt || "").trim(),
        metrics: sample?.publish?.metrics && typeof sample.publish.metrics === "object" ? { ...sample.publish.metrics } : {}
      }
    }));
  }

  return payload;
}

async function runSampleLibraryAccountPlannerAnalysis() {
  const runButton = byId("sample-library-account-planner-run");
  const filteredRecords = filterSampleLibraryRecords(appState.sampleLibraryRecords);

  if (!filteredRecords.length) {
    appState.sampleLibraryAccountPlanner = {
      ...appState.sampleLibraryAccountPlanner,
      message: "请先准备至少一条学习样本记录，再运行账号级复盘。"
    };
    syncSampleLibraryAccountPlannerPanel();
    return;
  }

  appState.sampleLibraryAccountPlanner = {
    ...appState.sampleLibraryAccountPlanner,
    loading: true,
    message: ""
  };
  syncSampleLibraryAccountPlannerPanel();
  setButtonBusy(runButton, true, "分析中...");

  try {
    const response = await apiJson(sampleLibraryAccountPlannerAnalyzeApi, {
      method: "POST",
      body: JSON.stringify(
        buildSampleLibraryAccountPlannerAnalyzePayload({
          records: filteredRecords,
          externalSamples: appState.externalReferenceSamples
        })
      )
    });

    appState.sampleLibraryAccountPlanner = {
      ...appState.sampleLibraryAccountPlanner,
      loading: false,
      message: "",
      summary: response.summary || null,
      cards: Array.isArray(response.cards) ? response.cards : [],
      selectedPlanId: String(response.cards?.[0]?.planId || "")
    };
  } catch (error) {
    appState.sampleLibraryAccountPlanner = {
      ...appState.sampleLibraryAccountPlanner,
      loading: false,
      message: error?.message || "账号级复盘失败",
      summary: null,
      cards: [],
      selectedPlanId: ""
    };
  } finally {
    setButtonBusy(runButton, false);
    syncSampleLibraryAccountPlannerPanel();
  }
}

function buildXhsAccountDiagnosisRequestPayload({ forcedRedId = "" } = {}) {
  const singleRedId = String(forcedRedId || byId("xhs-account-diagnosis-red-id")?.value || "").trim();
  const multipleRedIds = String(byId("xhs-account-diagnosis-red-ids")?.value || "")
    .split(/[，,\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);

  if (multipleRedIds.length >= 2 && !forcedRedId) {
    return {
      redIds: multipleRedIds
    };
  }

  return {
    redId: singleRedId
  };
}

async function runXhsAccountDiagnosisAnalysis({ forcedRedId = "" } = {}) {
  const runButton = byId("xhs-account-diagnosis-run");
  const payload = buildXhsAccountDiagnosisRequestPayload({ forcedRedId });
  const redId = String(payload?.redId || "").trim();
  const redIds = Array.isArray(payload?.redIds) ? payload.redIds : [];

  if (!redId && redIds.length < 2) {
    openXhsAccountDiagnosisModal({ message: "请先填写小红书号，或输入至少 2 个小红书号做对比。" });
    return;
  }

  appState.xhsAccountDiagnosis = {
    ...appState.xhsAccountDiagnosis,
    loading: true,
    message: "",
    canSubscribe: false
  };
  setButtonBusy(runButton, true, "分析中...");

  try {
    const response = await apiJson(xhsAccountDiagnosisApi, {
      method: "POST",
      body: JSON.stringify(payload)
    });

    appState.xhsAccountDiagnosis = {
      ...appState.xhsAccountDiagnosis,
      loading: false,
      message: "",
      currentRunResult:
        response?.mode === "multi"
          ? response?.result || null
          : {
              account: response.account || null,
              diagnosis: response.diagnosis || null,
              similarAccounts: response.similarAccounts || { peer: [], benchmark: [] }
            },
      currentRunGeneratedAt: String(response.generatedAt || "").trim(),
      result:
        response?.mode === "multi"
          ? response?.result || null
          : {
              account: response.account || null,
              diagnosis: response.diagnosis || null,
              similarAccounts: response.similarAccounts || { peer: [], benchmark: [] }
            },
      generatedAt: String(response.generatedAt || "").trim(),
      canSubscribe: false,
      report: response?.report && typeof response.report === "object" ? response.report : null
    };
    applyXhsTopSignalsDefaultsFromAccountDiagnosis({ force: true });
    syncXhsTopSignalsInputs();
    syncXhsAccountDiagnosisPanel();
    openXhsAccountDiagnosisModal({ useLatestStoredResult: false });
  } catch (error) {
    await refreshXhsAccountDiagnosisState();
    appState.xhsAccountDiagnosis = {
      ...appState.xhsAccountDiagnosis,
      loading: false,
      message: error?.message || "账号诊断失败",
      currentRunResult: null,
      currentRunGeneratedAt: "",
      canSubscribe: error?.code === "XHS_ACCOUNT_NOT_FOUND"
    };
    syncXhsAccountDiagnosisPanel();
    openXhsAccountDiagnosisModal({ message: appState.xhsAccountDiagnosis.message, useLatestStoredResult: false });
  } finally {
    setButtonBusy(runButton, false);
  }
}

async function followSimilarXhsAccountDiagnosis(redId = "") {
  const normalizedId = String(redId || "").trim();

  if (!normalizedId) {
    return;
  }

  writeGenerationFieldValue(byId("xhs-account-diagnosis-red-id"), normalizedId);
  await runXhsAccountDiagnosisAnalysis({ forcedRedId: normalizedId });
}

async function subscribeXhsAccountDiagnosisSync() {
  const redId = String(byId("xhs-account-diagnosis-red-id")?.value || "").trim();

  if (!redId) {
    openXhsAccountDiagnosisModal({ message: "请先在输入框里填写当前要补采的小红书号。" });
    return;
  }

  const response = await apiJson(`${xhsAccountDiagnosisApi}/subscribe`, {
    method: "POST",
    body: JSON.stringify({ redId })
  });

  appState.xhsAccountDiagnosis = {
    ...appState.xhsAccountDiagnosis,
    currentRunResult: null,
    currentRunGeneratedAt: "",
    subscription: response?.subscription || null,
    canSubscribe: false
  };
  syncXhsAccountDiagnosisPanel();
  openXhsAccountDiagnosisModal({
    message: `已订阅补采（小红书号 ${redId}），系统会在 30 分钟后自动重查并更新最近报告。`,
    useLatestStoredResult: false
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
      views: Number(source?.metrics?.views ?? source?.views ?? 0) || 0,
      shares: Number(source?.metrics?.shares ?? source?.shares ?? 0) || 0
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

function removeSampleLibraryImportDraft(index) {
  const normalizedIndex = Number(index);

  if (!Number.isInteger(normalizedIndex) || normalizedIndex < 0) {
    return;
  }

  appState.sampleLibraryImportDrafts = appState.sampleLibraryImportDrafts.filter((_, itemIndex) => itemIndex !== normalizedIndex);
  renderSampleLibraryImportDrafts(appState.sampleLibraryImportDrafts, {
    message: appState.sampleLibraryImportMessage
  });
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
  const options = arguments[1] || {};
  const message = String(options?.message || "").trim();
  appState.sampleLibraryImportDrafts = Array.isArray(items) ? items : [];
  appState.sampleLibraryImportMessage = message;

  if (!resultNode) {
    syncSampleLibraryImportActions();
    return;
  }

  if (!appState.sampleLibraryImportDrafts.length) {
    resultNode.innerHTML = message
      ? `<div class="result-card-shell">${escapeHtml(message)}</div>`
      : '<div class="result-card muted">等待导入 Markdown</div>';
    syncSampleLibraryImportActions();
    return;
  }

  resultNode.innerHTML = `
    ${message ? `<div class="result-card-shell">${escapeHtml(message)}</div>` : ""}
    <div class="sample-library-import-list">
      ${appState.sampleLibraryImportDrafts
        .map((item, index) => {
          const status = String(item?.status || "").trim();
          const helperText = item?.error || (status === "ready" ? "已完成 Markdown 解析，可继续补全信息。" : "请确认解析结果后再导入。");
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
                <label>
                  <span>分享数</span>
                  <input name="shares" type="number" min="0" value="${escapeHtml(String(item?.shares ?? 0))}" />
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
                <button type="button" class="button button-ghost" data-action="sample-library-import-remove">移除这条</button>
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
      views: card.querySelector('[name="views"]')?.value || "0",
      shares: card.querySelector('[name="shares"]')?.value || "0"
    }
  ];

  const response = await apiJson(sampleLibraryMarkdownImportCommitApi, {
    method: "POST",
    body: JSON.stringify({ items })
  });

  syncStyleProfileStateFromPayload(response);
  if (Array.isArray(response.items) && response.items.length) {
    appState.selectedSampleLibraryRecordId = String(response.items[0]?.id || appState.selectedSampleLibraryRecordId || "");
  }

  appState.sampleLibraryFilter = "all";
  appState.sampleLibraryCollectionFilter = "all";
  appState.sampleLibrarySearch = "";
  appState.sampleLibraryMetricFilters = {
    likes: "",
    favorites: "",
    comments: "",
    views: "",
    shares: ""
  };
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
  if (byId("sample-library-likes-filter")) {
    byId("sample-library-likes-filter").value = "";
  }
  if (byId("sample-library-favorites-filter")) {
    byId("sample-library-favorites-filter").value = "";
  }
  if (byId("sample-library-comments-filter")) {
    byId("sample-library-comments-filter").value = "";
  }
  if (byId("sample-library-views-filter")) {
    byId("sample-library-views-filter").value = "";
  }
  if (byId("sample-library-shares-filter")) {
    byId("sample-library-shares-filter").value = "";
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

function getGenerationPayload({ referenceAssets, includeReferenceAssets = true } = {}) {
  const form = new FormData(byId("generation-workbench-form"));
  const payload = {
    mode: String(form.get("mode") || "from_scratch"),
    collectionType: String(form.get("collectionType") || "").trim(),
    brief: {
      collectionType: String(form.get("collectionType") || "").trim(),
      lengthMode: String(form.get("lengthMode") || "short").trim() || "short",
      briefing: String(form.get("briefing") || "").trim(),
      referenceTitle: String(form.get("referenceTitle") || "").trim(),
      topic: "",
      sellingPoints: "",
      audience: "",
      constraints: "",
      tagReferences: String(form.get("tagReferences") || "").trim()
    },
    draft: {
      title: String(form.get("draftTitle") || "").trim(),
      body: String(form.get("draftBody") || "").trim()
    },
    modelSelection: getSelectedModelSelections()
  };

  if (includeReferenceAssets) {
    payload.referenceAssets = {
      ...(referenceAssets || serializeGenerationReferenceAssets()),
      materialText: String(form.get("materialText") || "").trim()
    };
  }

  return payload;
}

async function handleGenerationReferenceImageSelection(event) {
  const input = event?.currentTarget;
  const selectedFiles = Array.from(input?.files || []);
  if (input) {
    input.value = "";
  }

  if (appState.generationReferenceAssetsLocked) {
    return;
  }

  const operation = () => {
      const currentImages = Array.isArray(appState.generationReferenceAssets?.images)
        ? appState.generationReferenceAssets.images
        : [];
      const currentTotalBytes = getGenerationReferenceAssetsTotalBytes();
      const { acceptedFiles: sizeAcceptedSelectedFiles, messages: limitMessages } = collectAcceptedGenerationReferenceFiles(selectedFiles, {
        maxFileBytes: GENERATION_REFERENCE_IMAGE_MAX_FILE_BYTES,
        currentTotalBytes,
        oversizeMessage: "单张参考图片不能超过 4 MB。",
        totalMessage: "临时参考素材总大小最多 12 MB。"
      });

      return readGenerationReferenceImageFiles(sizeAcceptedSelectedFiles)
        .then(({ files: selectedImages, failedCount }) => {
          const remainingSlots = Math.max(0, GENERATION_REFERENCE_IMAGE_LIMIT - currentImages.length);
          const acceptedImages = remainingSlots > 0 ? selectedImages.slice(0, remainingSlots) : [];
          const messageParts = [...limitMessages];

          if (selectedImages.length > acceptedImages.length) {
            messageParts.unshift("参考图片最多保留 5 张。");
          }
          if (failedCount) {
            messageParts.push("部分参考图片读取失败，已保留可用文件。");
          }

          appState.generationReferenceAssets = {
            ...appState.generationReferenceAssets,
            images: [...currentImages, ...acceptedImages],
            message: messageParts.join(" ")
          };

          renderGenerationReferenceAssets();
        })
        .catch(() => {
          appState.generationReferenceAssets = {
            ...appState.generationReferenceAssets,
            message: "参考图片读取失败，请重试。"
          };
          renderGenerationReferenceAssets();
        });
    };

  appState.generationReferenceAssetsPending = appState.generationReferenceAssetsPending.catch(() => {}).then(operation);
  await appState.generationReferenceAssetsPending;
}

async function handleGenerationReferenceTextSelection(event) {
  const input = event?.currentTarget;
  const selectedFiles = Array.from(input?.files || []);
  if (input) {
    input.value = "";
  }

  if (appState.generationReferenceAssetsLocked) {
    return;
  }

  const operation = () => {
      const currentTotalBytes = getGenerationReferenceAssetsTotalBytes();
      const { acceptedFiles: sizeAcceptedSelectedFiles, messages: limitMessages } = collectAcceptedGenerationReferenceFiles(
        selectedFiles,
        {
          maxFileBytes: GENERATION_REFERENCE_TEXT_MAX_FILE_BYTES,
          currentTotalBytes,
          oversizeMessage: "单个参考文本不能超过 512 KB。",
          totalMessage: "临时参考素材总大小最多 12 MB。"
        }
      );

      return readGenerationReferenceTextFiles(sizeAcceptedSelectedFiles)
        .then(({ files: selectedTextFiles, failedCount }) => {
          const messageParts = [...limitMessages];

          if (failedCount) {
            messageParts.push("部分参考文本读取失败，已保留可用文件。");
          }

          appState.generationReferenceAssets = {
            ...appState.generationReferenceAssets,
            textFiles: [...appState.generationReferenceAssets.textFiles, ...selectedTextFiles],
            message: messageParts.join(" ")
          };

          renderGenerationReferenceAssets();
        })
        .catch(() => {
          appState.generationReferenceAssets = {
            ...appState.generationReferenceAssets,
            message: "参考文本读取失败，请重试。"
          };
          renderGenerationReferenceAssets();
        });
    };

  appState.generationReferenceAssetsPending = appState.generationReferenceAssetsPending.catch(() => {}).then(operation);
  await appState.generationReferenceAssetsPending;
}

function removeGenerationReferenceAsset(kind, index) {
  const numericIndex = Number(index);

  if (!Number.isInteger(numericIndex) || numericIndex < 0) {
    return;
  }

  if (appState.generationReferenceAssetsLocked) {
    return;
  }

  if (kind === "image") {
    appState.generationReferenceAssets = {
      ...appState.generationReferenceAssets,
      images: appState.generationReferenceAssets.images.filter((_, itemIndex) => itemIndex !== numericIndex),
      message: ""
    };
  }

  if (kind === "text") {
    appState.generationReferenceAssets = {
      ...appState.generationReferenceAssets,
      textFiles: appState.generationReferenceAssets.textFiles.filter((_, itemIndex) => itemIndex !== numericIndex),
      message: ""
    };
  }

  renderGenerationReferenceAssets();
}

function syncGenerationModeFields() {
  const form = byId("generation-workbench-form");
  const mode = String(form?.querySelector('[name="mode"]')?.value || "from_scratch").trim();

  form?.querySelectorAll?.("[data-generation-mode-visible]")?.forEach((block) => {
    const visibleMode = String(block.getAttribute("data-generation-mode-visible") || "").trim();
    const isVisible = !visibleMode || visibleMode === mode;

    block.hidden = !isVisible;
    block.querySelectorAll("input, textarea, select").forEach((field) => {
      field.disabled = !isVisible;
    });
  });
}

function getGenerationBriefingImproveRequirementMessage() {
  const payload = getGenerationPayload();

  if (!String(payload.brief?.briefing || "").trim()) {
    return "请先填写一句话需求。";
  }

  return "";
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
    openReviewQueueModal();
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

async function saveLifecycleFromCurrent(source = "analysis", candidateId = "", candidateIndex = "") {
  const isAnalyzeCompare = source === "analysis-compare";
  const payload = {
    source: isAnalyzeCompare ? "analysis" : source,
    note: appState.latestAnalyzePayload || {},
    snapshots: {
      analysis: appState.latestAnalysis || null,
      rewrite: null,
      generation: null,
      crossReview: null
    }
  };

  if (isAnalyzeCompare) {
    const compareContext = getAnalyzeCompareSelectionContext(candidateId || candidateIndex);
    const compareAnalysis = compareContext.mergedAnalysis;
    const compareLabel = analyzeCompareModelLabel(compareContext.item) || "未命名模型";

    payload.source = "analysis";
    payload.name = `模型对比检测 / ${compareLabel}`;
    payload.snapshots.analysis = compareAnalysis || payload.snapshots.analysis;
  }

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
    const generatedName = finalDraft?.title || generationVariantLabel(finalDraft?.variant) || "未命名";
    payload.source = isRecommended ? "generation_final" : "generation_candidate";
    payload.name = `${isRecommended ? "最终推荐稿" : "生成候选稿"} / ${generatedName}`;
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
  syncStyleProfileStateFromPayload(response);
  appState.sampleLibraryRecords = Array.isArray(response.items) ? response.items : appState.sampleLibraryRecords;
  appState.sampleLibraryFilter = "all";
  appState.sampleLibraryCollectionFilter = "all";
  appState.sampleLibrarySearch = "";
  appState.sampleLibraryMetricFilters = {
    likes: "",
    favorites: "",
    comments: "",
    views: "",
    shares: ""
  };
  appState.selectedSampleLibraryRecordId = String(response.item?.id || "");
  byId("sample-library-search-input") && (byId("sample-library-search-input").value = "");
  byId("sample-library-filter") && (byId("sample-library-filter").value = "all");
  byId("sample-library-collection-filter") && (byId("sample-library-collection-filter").value = "all");
  byId("sample-library-likes-filter") && (byId("sample-library-likes-filter").value = "");
  byId("sample-library-favorites-filter") && (byId("sample-library-favorites-filter").value = "");
  byId("sample-library-comments-filter") && (byId("sample-library-comments-filter").value = "");
  byId("sample-library-views-filter") && (byId("sample-library-views-filter").value = "");
  byId("sample-library-shares-filter") && (byId("sample-library-shares-filter").value = "");
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
  views = 0,
  shares = 0
} = {}) {
  const saved = await saveLifecycleFromCurrent(source, candidateId, candidateIndex);
  const id = String(saved.item?.id || appState.selectedSampleLibraryRecordId || "").trim();

  if (!id) {
    throw new Error("未找到可回填的平台结果记录。");
  }

  const payload = {
    status: publishStatus,
    notes,
    views: Number(views || 0) || 0,
    shares: Number(shares || 0) || 0
  };

  const response = await apiJson(sampleLibraryApi, {
    method: "PATCH",
    body: JSON.stringify({
      id,
      publish: {
        status: payload.status,
        notes: payload.notes,
        metrics: {
          views: payload.views || 0,
          shares: payload.shares || 0
        }
      }
    })
  });
  syncStyleProfileStateFromPayload(response);
  appState.sampleLibraryRecords = Array.isArray(response.items) ? response.items : appState.sampleLibraryRecords;
  appState.selectedSampleLibraryRecordId = String(response.item?.id || id);
  renderSampleLibraryWorkspace();
  revealNoteLifecyclePane();
  return response;
}

const analyzeForm = byId("analyze-form");
analyzeForm?.addEventListener("input", syncAnalyzeActions);
analyzeForm?.addEventListener("change", syncAnalyzeActions);
initializeAnalyzeTagPicker();
byId("feedback-form")?.addEventListener("input", syncFeedbackActions);
byId("feedback-form")?.addEventListener("change", syncFeedbackActions);
byId("generation-workbench-form")?.addEventListener("input", syncGenerationActions);
byId("generation-workbench-form")?.addEventListener("change", syncGenerationActions);
byId("generation-workbench-form")?.addEventListener("change", syncGenerationModeFields);
byId("generation-reference-image-input")?.addEventListener("change", (event) => {
  handleGenerationReferenceImageSelection(event).catch(() => {});
});
byId("generation-reference-text-input")?.addEventListener("change", (event) => {
  handleGenerationReferenceTextSelection(event).catch(() => {});
});
byId("generation-briefing-improve")?.addEventListener("click", improveGenerationBriefingFromCurrentInput);
byId("generation-reference-search-button")?.addEventListener("click", () => {
  openGenerationReferenceSearchModal().catch(() => {});
});
byId("generation-theme-inspiration-button")?.addEventListener("click", () => {
  openGenerationThemeInspirationModal().catch(() => {});
});
byId("xhs-top-signals-refresh")?.addEventListener("click", async () => {
  await refreshXhsTopSignalsState();
});

byId("generation-top-signals-button")?.addEventListener("click", async () => {
  await refreshXhsAccountDiagnosisState();
  openXhsAccountDiagnosisModal({
    message: appState.xhsAccountDiagnosis?.result ? "" : "请先完成一次账号诊断，再查看同类爆文灵感。",
    useLatestStoredResult: true
  });
});
byId("generation-reference-assets-preview")?.addEventListener("click", (event) => {
  const button = event.target instanceof Element ? event.target.closest("[data-action]") : null;

  if (!button) {
    return;
  }

  if (button.dataset.action === "remove-generation-reference-image") {
    removeGenerationReferenceAsset("image", button.dataset.index);
  }

  if (button.dataset.action === "remove-generation-reference-text") {
    removeGenerationReferenceAsset("text", button.dataset.index);
  }
});
renderGenerationReferenceAssets();
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

  if (!String(payload.brief?.briefing || "").trim()) {
    return "请先填写一句话需求。";
  }

  return "";
}

function getGenerationReferenceSearchRequirementMessage() {
  const payload = getGenerationPayload({ includeReferenceAssets: false });

  if (!String(payload.brief?.briefing || "").trim()) {
    return "请先填写一句话需求。";
  }

  return "";
}

function syncGenerationReferenceSearchAction() {
  const searchButton = byId("generation-reference-search-button");
  const resultNode = byId("generation-reference-search-result");
  const requirementMessage = getGenerationReferenceSearchRequirementMessage();

  setGatedButtonState(searchButton, !requirementMessage, requirementMessage);

  if (!resultNode) {
    return;
  }

  if (requirementMessage) {
    resultNode.textContent = requirementMessage;
    return;
  }

  if (resultNode.textContent === "请先填写一句话需求。") {
    resultNode.textContent = "";
  }
}

function syncGenerationActions() {
  const requirementMessage = getGenerationRequirementMessage();
  const submitButton = byId("generation-workbench-form")?.querySelector('button[type="submit"]');
  const improveButton = byId("generation-briefing-improve");
  const improveRequirementMessage = getGenerationBriefingImproveRequirementMessage();

  setGatedButtonState(submitButton, !requirementMessage, requirementMessage);
  setGatedButtonState(improveButton, !improveRequirementMessage, improveRequirementMessage);
  setActionGateHint("generation-action-hint", requirementMessage);
  syncGenerationReferenceSearchAction();
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
  return getSampleLibraryCalibrationPredictionPrefillSource().requirementMessage;
}

function isSampleLibraryCalibrationPredictionFieldEmpty(name, field) {
  if (
    !(field instanceof HTMLInputElement) &&
    !(field instanceof HTMLSelectElement) &&
    !(field instanceof HTMLTextAreaElement)
  ) {
    return false;
  }

  const value = String(field.value || "").trim();

  if (name === "predictedStatus") {
    return !value || value === "not_published";
  }

  if (name === "predictionConfidence") {
    return !value || Number(value) === 0;
  }

  return !value;
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
      if (isSampleLibraryCalibrationPredictionFieldEmpty(name, field)) {
        field.value = value;
      }
    }
  });

  syncSampleLibraryCalibrationEvidencePanel(section, prediction);

  if (appState.sampleLibraryModal?.kind === "record-list-inline-editor") {
    appState.sampleLibraryModal = {
      ...appState.sampleLibraryModal,
      draft: readSampleLibraryRecordInlineEditorDraftFromModal()
    };
    syncSampleLibraryRecordInlineEditorFilterResults();
  }

  syncSampleLibraryDetailActions();
}

function setSampleLibraryCalibrationPrefillMessage(message = "") {
  const normalizedMessage = String(message || "").trim();
  const contentNode = byId("sample-library-modal-content");
  const inlineMessageNode = contentNode?.querySelector?.('[data-role="sample-library-calibration-prefill-message"]');

  if (inlineMessageNode) {
    inlineMessageNode.textContent = normalizedMessage;
  }

  setSampleLibraryModalMessage(normalizedMessage);
}

async function patchSampleLibraryRecordAndRefresh(payload, { recordId = "", nextStep = "base" } = {}) {
  const response = await apiJson(sampleLibraryApi, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });

  syncStyleProfileStateFromPayload(response);
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

function syncRecordInlineEditorAfterReferenceApplication(updatedRecord = null, calibrationPayload = null) {
  const modalState = appState.sampleLibraryModal || {};

  if (modalState.kind !== "record-list-inline-editor" || !updatedRecord) {
    return;
  }

  const currentDraft = readSampleLibraryRecordInlineEditorDraftFromModal();
  const persistedDraft = buildSampleLibraryRecordInlineEditorDraft(updatedRecord);
  const nextCalibration = calibrationPayload || persistedDraft.calibration;
  const nextReference = persistedDraft.reference;

  appState.sampleLibraryModal = {
    ...modalState,
    selectedRecordId: String(updatedRecord.id || modalState.selectedRecordId || ""),
    draft: {
      ...currentDraft,
      reference: nextReference,
      calibration: nextCalibration
    },
    initialSnapshot: {
      ...(modalState.initialSnapshot || {}),
      reference: structuredClone(nextReference),
      calibration: structuredClone(nextCalibration)
    }
  };
  renderSampleLibraryRecordInlineEditorModal();
}

function renderCalibrationModalAfterReferenceApplication(updatedRecord = null) {
  const modalState = appState.sampleLibraryModal || {};

  if (modalState.kind !== "calibration" || !updatedRecord) {
    return;
  }

  appState.sampleLibraryModal = {
    ...modalState,
    recordId: String(updatedRecord.id || modalState.recordId || "")
  };
  renderSampleLibraryModal(buildSampleLibraryDetailModalConfig("calibration", updatedRecord));
}

async function applySampleLibraryReferenceFromRetro() {
  const modalState = appState.sampleLibraryModal || {};
  const record = getActiveSampleLibraryCalibrationPrefillRecord();

  if (!record) {
    throw new Error("当前没有可应用的样本记录。");
  }

  const calibrationPayload =
    modalState.kind === "record-list-inline-editor" || modalState.kind === "calibration"
      ? readSampleLibraryModalCalibrationPayload()
      : getSampleRecordCalibration(record);
  const applyState = getSampleLibraryReferenceApplicationState({
    recordOverride:
      modalState.kind === "record-list-inline-editor"
        ? {
            ...record,
            reference: readSampleLibraryRecordInlineEditorDraftFromModal().reference,
            publish: readSampleLibraryRecordInlineEditorDraftFromModal().publish,
            calibration: readSampleLibraryRecordInlineEditorDraftFromModal().calibration
          }
        : record,
    calibrationOverride: calibrationPayload
  });

  if (!applyState.canApply) {
    throw new Error(applyState.requirementMessage || "当前还不能应用为参考样本。");
  }

  const response = await patchSampleLibraryRecordAndRefresh(
    {
      id: String(record.id || ""),
      reference: applyState.reference,
      calibration: calibrationPayload
    },
    { recordId: String(record.id || ""), nextStep: "calibration" }
  );

  if (modalState.kind === "record-list-inline-editor") {
    syncRecordInlineEditorAfterReferenceApplication(response.item || null, calibrationPayload);
  } else if (modalState.kind === "calibration") {
    renderCalibrationModalAfterReferenceApplication(response.item || null);
  }

  setSampleLibraryModalMessage(applyState.successMessage || "已应用为参考样本。");
  syncSampleLibraryDetailActions();
  return response;
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
    views: payload.views,
    shares: payload.shares
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
  syncStyleProfileStateFromPayload(response);
  appState.sampleLibraryRecords = Array.isArray(response.items) ? response.items : [];
  appState.selectedSampleLibraryRecordId = "";
  renderSampleLibraryWorkspace();
}

async function saveSampleLibraryDetailModal() {
  const modalState = appState.sampleLibraryModal;

  if (modalState?.kind === "style-profile") {
    await saveStyleProfileModal();
    return;
  }

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

function syncSampleLibraryDetailActions() {
  const modalState = appState.sampleLibraryModal || {};
  const calibrationPrefillMessage = getSampleLibraryCalibrationPredictionPrefillRequirementMessage();
  const baseButton = byId("sample-library-base-section")?.querySelector('[data-action="open-sample-library-base-modal"]');
  const referenceButton = byId("sample-library-reference-section")?.querySelector('[data-action="open-sample-library-reference-modal"]');
  const lifecycleButton = byId("sample-library-lifecycle-section")?.querySelector('[data-action="open-sample-library-lifecycle-modal"]');
  const calibrationPrefillButton =
    byId("sample-library-modal-content")?.querySelector(
      '[data-action="prefill-sample-library-modal-calibration-prediction"]'
    ) || null;
  const applyReferenceButton =
    byId("sample-library-modal-content")?.querySelector('[data-action="apply-sample-library-reference-from-retro"]') || null;
  const applyReferenceStatus =
    byId("sample-library-modal-content")?.querySelector('[data-role="sample-library-reference-application-status"]') || null;
  const calibrationButton = byId("sample-library-calibration-section")?.querySelector('[data-action="open-sample-library-calibration-modal"]');
  const applyReferenceState =
    modalState.kind === "calibration" || modalState.kind === "record-list-inline-editor"
      ? getSampleLibraryReferenceApplicationState()
      : {
          canApply: false,
          requirementMessage: "",
          buttonLabel: "应用为参考样本"
        };

  setGatedButtonState(baseButton, true, "");
  setGatedButtonState(referenceButton, true, "");
  setGatedButtonState(lifecycleButton, true, "");
  setGatedButtonState(calibrationPrefillButton, !calibrationPrefillMessage, calibrationPrefillMessage);
  if (applyReferenceButton) {
    applyReferenceButton.textContent = applyReferenceState.buttonLabel || "应用为参考样本";
  }
  if (applyReferenceStatus) {
    applyReferenceStatus.textContent = applyReferenceState.statusSummary || "当前参考状态：未启用";
  }
  setGatedButtonState(applyReferenceButton, applyReferenceState.canApply, applyReferenceState.requirementMessage);
  setGatedButtonState(calibrationButton, true, "");
  setActionGateHint("sample-library-base-action-hint", "");
  setActionGateHint("sample-library-reference-action-hint", "");
  setActionGateHint("sample-library-lifecycle-action-hint", "");
  setActionGateHint("sample-library-calibration-action-hint", "");
}

function getLifecycleSaveRequirementMessage(source = "analysis", candidateId = "", candidateIndex = "") {
  if (source === "analysis-compare") {
    if (!hasMeaningfulNoteDraft(appState.latestAnalyzePayload || {})) {
      return "请先完成一次带内容的全部模型对比检测。";
    }

    if (!String(appState.latestAnalyzePayload?.collectionType || "").trim()) {
      return "请先选择合集类型后再保存对比检测结果。";
    }

    const compareContext = getAnalyzeCompareSelectionContext(candidateId || candidateIndex);

    if (!compareContext.item || !compareContext.mergedAnalysis) {
      return "当前模型对比结果已失效，请重新运行全部模型对比检测。";
    }

    return "";
  }

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

function openResultPanel(id) {
  const panel = byId(id);

  if (panel && "open" in panel) {
    panel.open = true;
  }
}

async function runRewriteFromPayload(payload, { pendingMessage = "", errorMessage = "" } = {}) {
  openResultPanel("rewrite-result-panel");
  byId("rewrite-result").innerHTML = `<div class="result-card-shell muted">${escapeHtml(
    pendingMessage || "正在生成合规改写；如果复判还没过，会继续自动改写，直到通过或达到最大轮次..."
  )}</div>`;

  const result = await apiJson("/api/rewrite", {
    method: "POST",
    body: JSON.stringify({
      ...payload,
      modelSelection: getSelectedModelSelections()
    })
  }).catch((error) => {
    byId("rewrite-result").innerHTML = `
      <div class="result-card-shell muted">${escapeHtml(error.message || errorMessage || "改写失败")}</div>
    `;
    throw error;
  });

  appState.latestAnalyzePayload = payload;
  appState.latestAnalysis = result.beforeAnalysis || result.analysis || appState.latestAnalysis;
  appState.latestRewrite = normalizeRewritePayload(result.rewrite);
  appState.latestGeneration = null;
  try {
    renderRewriteResult({
      ...result,
      rewrite: appState.latestRewrite
    });
  } catch (error) {
    byId("rewrite-result").innerHTML = `
      <div class="result-card-shell muted">${escapeHtml(error?.message || "改写结果渲染失败")}</div>
    `;
    throw error;
  }

  const falsePositiveSources = buildFalsePositiveCaptureSources({
    analyzePayload: appState.latestAnalyzePayload,
    analysisSnapshot: appState.latestAnalysis,
    rewriteSnapshot: appState.latestRewrite
  });
  appState.latestAnalysisFalsePositiveSource = falsePositiveSources.analysis;
  renderAnalysis(appState.latestAnalysis, appState.latestAnalysisFalsePositiveSource);

  return result;
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

byId("analyze-compare-button").addEventListener("click", async () => {
  const compareButton = byId("analyze-compare-button");
  const requirementMessage = getAnalyzeActionRequirementMessage();

  if (requirementMessage) {
    syncAnalyzeActions();
    return;
  }

  setButtonBusy(compareButton, true, "对比中...");

  try {
    const result = await apiJson(analyzeCompareApi, {
      method: "POST",
      body: JSON.stringify({
        ...getAnalyzePayload(),
        modelSelection: getSelectedModelSelections()
      })
    });

    appState.latestAnalyzePayload = getAnalyzePayload();
    appState.latestAnalyzeCompareResult = result;
    openAnalyzeCompareModal(result);
  } catch (error) {
    appState.latestAnalyzePayload = getAnalyzePayload();
    appState.latestAnalyzeCompareResult = null;
    openAnalyzeCompareModal({
      errorMessage: error?.message || "模型对比检测失败",
      comparisons: [],
      ruleAnalysis: {},
      summary: {
        totalModels: 0,
        completedModels: 0,
        disagreementCount: 0,
        finalVerdicts: [],
        semanticVerdicts: [],
        comparedAt: new Date().toISOString()
      }
    });
  } finally {
    setButtonBusy(compareButton, false);
    syncAnalyzeActions();
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

  try {
    await runRewriteFromPayload(getAnalyzePayload(), {
      pendingMessage: "正在生成合规改写；如果复判还没过，会继续自动改写，直到通过或达到最大轮次...",
      errorMessage: "改写失败"
    });
  } catch (error) {
    byId("rewrite-result").innerHTML = `
      <div class="result-card-shell muted">${escapeHtml(error.message || "改写结果渲染失败")}</div>
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

async function improveGenerationBriefingFromCurrentInput() {
  const button = byId("generation-briefing-improve");
  const resultNode = byId("generation-briefing-improve-result");
  const requirementMessage = getGenerationBriefingImproveRequirementMessage();

  if (requirementMessage) {
    if (resultNode) {
      resultNode.textContent = requirementMessage;
    }
    syncGenerationActions();
    return;
  }

  setButtonBusy(button, true, "润色中...");

  if (resultNode) {
    resultNode.textContent = "正在扩展一句话需求...";
  }

  try {
    const payload = getGenerationPayload({ includeReferenceAssets: false });
    const result = await apiJson("/api/generate-note-briefing", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    const briefingField = byId("generation-workbench-form")?.querySelector('[name="briefing"]');
    const improvedBriefing = String(result?.briefing || "").trim();

    if (briefingField && improvedBriefing) {
      briefingField.value = improvedBriefing;
      briefingField.dispatchEvent(new Event("input", { bubbles: true }));
    }

    if (resultNode) {
      const notes = Array.isArray(result?.notes) ? result.notes.filter(Boolean) : [];
      resultNode.textContent = notes.length
        ? `本次补足：${notes.join("；")}`
        : "已完成 AI 润色优化。";
    }
  } catch (error) {
    if (resultNode) {
      resultNode.textContent = error.message || "AI 润色优化失败";
    }
  } finally {
    setButtonBusy(button, false);
    syncGenerationActions();
  }
}

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
    const referenceAssets = await captureGenerationReferenceAssetsForRequest();
    const payload = getGenerationPayload({ referenceAssets });
    const result = await apiJson("/api/generate-note", {
      method: "POST",
      body: JSON.stringify(payload)
    });

    appState.latestGeneration = {
      ...result,
      collectionType: result.collectionType || payload.collectionType || ""
    };
    renderGenerationResult(result);
    resetGenerationReferenceAssets();
  } catch (error) {
    byId("generation-result").innerHTML = `
      <div class="result-card-shell muted">${escapeHtml(error.message || "生成候选稿失败")}</div>
    `;
  } finally {
    releaseGenerationReferenceAssetsRequestLock();
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

byId("sample-library-account-planner-import-button")?.addEventListener("click", () => {
  byId("sample-library-account-planner-import-input")?.click();
});

byId("sample-library-import-input").addEventListener("change", async (event) => {
  const input = event.currentTarget;
  const files = input.files || [];

  if (!files.length) {
    return;
  }

  setSampleLibraryImportBlockOpen(true);
  byId("sample-library-import-result").innerHTML = '<div class="result-card-shell muted">正在解析 Markdown...</div>';

  try {
    const result = await parseSampleLibraryMarkdownFiles(files);
    renderSampleLibraryImportDrafts(result.items || [], { message: result.message || "" });
  } catch (error) {
    appState.sampleLibraryImportDrafts = [];
    byId("sample-library-import-result").innerHTML = `
      <div class="result-card-shell muted">${escapeHtml(error.message || "Markdown 解析失败")}</div>
    `;
    syncSampleLibraryImportActions();
  } finally {
    input.value = "";
  }
});

byId("sample-library-account-planner-import-input")?.addEventListener("change", async (event) => {
  const input = event.currentTarget;
  const files = [...(input.files || [])];

  if (!files.length) {
    return;
  }

  appState.externalReferenceSamplesModal = {
    ...appState.externalReferenceSamplesModal,
    open: true,
    loading: true,
    message: "正在导入外部参考样本..."
  };
  renderSampleLibraryExternalSamplesModal();

  try {
    const result = await importExternalReferenceSamples(files);
    appState.externalReferenceSamples = Array.isArray(result?.items) ? result.items : [];
    appState.externalReferenceSamplesModal = {
      ...appState.externalReferenceSamplesModal,
      open: true,
      loading: false,
      message: ""
    };
  } catch (error) {
    appState.externalReferenceSamplesModal = {
      ...appState.externalReferenceSamplesModal,
      open: true,
      loading: false,
      message: error?.message || "外部样本导入失败"
    };
  } finally {
    input.value = "";
    renderSampleLibraryExternalSamplesModal();
    syncSampleLibraryAccountPlannerPanel();
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

  const removeButton =
    event.target instanceof Element ? event.target.closest('[data-action="sample-library-import-remove"]') : null;
  if (removeButton) {
    removeSampleLibraryImportDraft(card.dataset.importIndex || "");
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

  if (appState.generationReferenceSearch?.open) {
    closeGenerationReferenceSearchModal();
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

  if (fieldName === "analyzeCompareBasisSelection" && modalState?.kind === "analysis-compare") {
    const nextSelection = event.target instanceof HTMLSelectElement ? String(event.target.value || "").trim() : "";
    const nextResult =
      modalState.result && typeof modalState.result === "object" ? modalState.result : appState.latestAnalyzeCompareResult || {};
    appState.sampleLibraryModal = {
      ...modalState,
      compareBasisSelection: nextSelection || getDefaultAnalyzeCompareBasisSelection(nextResult)
    };
    renderAnalyzeCompareModal(nextResult);
    return;
  }

  if (fieldName === "recordTitleFilter" && modalState?.kind === "record-list-inline-editor") {
    appState.sampleLibraryModal = {
      ...modalState,
      titleFilter: event.target instanceof HTMLInputElement ? event.target.value || "" : ""
    };
    syncSampleLibraryRecordInlineEditorFilterResults();
    return;
  }

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

  if (modalState?.kind === "calibration" || modalState?.kind === "record-list-inline-editor") {
    syncSampleLibraryDetailActions();
  }
});

byId("sample-library-modal-content")?.addEventListener("input", (event) => {
  const modalState = appState.sampleLibraryModal;
  const fieldName =
    event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement || event.target instanceof HTMLTextAreaElement
      ? String(event.target.name || "")
      : "";

  if (fieldName === "recordTitleFilter" && modalState?.kind === "record-list-inline-editor") {
    appState.sampleLibraryModal = {
      ...modalState,
      titleFilter: event.target instanceof HTMLInputElement ? event.target.value || "" : ""
    };
    syncSampleLibraryRecordInlineEditorFilterResults();
    return;
  }

  if (modalState?.kind === "record-list-inline-editor") {
    appState.sampleLibraryModal = {
      ...modalState,
      draft: readSampleLibraryRecordInlineEditorDraftFromModal()
    };
    syncSampleLibraryDetailActions();
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
    return;
  }

  if (modalState?.kind === "calibration") {
    syncSampleLibraryDetailActions();
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

byId("sample-library-pools-modal-content")?.addEventListener("input", (event) => {
  const fieldName = event.target instanceof HTMLInputElement ? String(event.target.name || "") : "";
  const inputValue = event.target instanceof HTMLInputElement ? event.target.value || "" : "";

  if (
    fieldName === "samplePoolTitleFilter" ||
    fieldName === "samplePoolLikesFilter" ||
    fieldName === "samplePoolFavoritesFilter" ||
    fieldName === "samplePoolCommentsFilter" ||
    fieldName === "samplePoolViewsFilter" ||
    fieldName === "samplePoolSharesFilter"
  ) {
    const nextMetricFilters = {
      ...(appState.sampleLibraryPoolsModal?.metricFilters || {
        likes: "",
        favorites: "",
        comments: "",
        views: "",
        shares: ""
      })
    };

    if (fieldName === "samplePoolLikesFilter") nextMetricFilters.likes = inputValue;
    if (fieldName === "samplePoolFavoritesFilter") nextMetricFilters.favorites = inputValue;
    if (fieldName === "samplePoolCommentsFilter") nextMetricFilters.comments = inputValue;
    if (fieldName === "samplePoolViewsFilter") nextMetricFilters.views = inputValue;
    if (fieldName === "samplePoolSharesFilter") nextMetricFilters.shares = inputValue;

    appState.sampleLibraryPoolsModal = {
      open: true,
      tab: String(appState.sampleLibraryPoolsModal?.tab || "reference"),
      search: fieldName === "samplePoolTitleFilter" ? inputValue : String(appState.sampleLibraryPoolsModal?.search || ""),
      metricFilters: nextMetricFilters
    };
    syncSampleLibraryPoolsModalSearchResults();
  }
});

byId("rewrite-model-selection")?.addEventListener("change", () => {
  syncCrossReviewModelSelectionRules();
});

byId("sample-library-filter")?.addEventListener("change", (event) => {
  appState.sampleLibraryFilter = String(event.currentTarget.value || "all");
  renderSampleLibraryWorkspace();
});

byId("sample-library-pools-button")?.addEventListener("click", () => {
  openSampleLibraryPoolsModal("reference");
});

byId("sample-library-external-samples-button")?.addEventListener("click", async () => {
  await refreshExternalReferenceSamples({ openModal: true });
});

byId("sample-library-account-planner-run")?.addEventListener("click", async () => {
  await runSampleLibraryAccountPlannerAnalysis();
});

byId("xhs-account-diagnosis-run")?.addEventListener("click", async () => {
  await runXhsAccountDiagnosisAnalysis();
});

byId("xhs-account-diagnosis-open-latest")?.addEventListener("click", async () => {
  await refreshXhsAccountDiagnosisState();
  openXhsAccountDiagnosisModal({
    message: appState.xhsAccountDiagnosis?.result ? "" : "还没有已保存的账号诊断结果。",
    useLatestStoredResult: true
  });
});

byId("sample-library-collection-filter")?.addEventListener("change", (event) => {
  appState.sampleLibraryCollectionFilter = String(event.currentTarget.value || "all");
  renderSampleLibraryWorkspace();
});

byId("draft-ideas-sort-order")?.addEventListener("change", (event) => {
  appState.draftIdeas = {
    ...appState.draftIdeas,
    draftIdeasSortOrder: String(event.currentTarget.value || "newest")
  };
  renderDraftIdeasList();
});

initializeTabs();
syncReferenceThresholdCopy();
renderSampleLibraryWorkspace();
renderDraftIdeasList();
syncXhsTopSignalsPanel();

document.addEventListener("click", async (event) => {
  const draftInboxNav = event.target instanceof Element ? event.target.closest('[data-action="reveal-generation-draft-inbox"]') : null;

  if (draftInboxNav) {
    event.preventDefault();
    revealGenerationDraftInbox();
    return;
  }

  const summaryAction = event.target.closest("[data-summary-action]");

  if (summaryAction) {
    await handleSummaryAction(summaryAction.dataset.summaryAction);
    return;
  }

  const retroChip = event.target.closest(".sample-library-retro-chip");

  if (retroChip) {
    toggleSampleLibraryRetroChipSelection(retroChip);
    return;
  }

  const samplePoolTab = event.target.closest("[data-sample-pool-tab]");

      if (samplePoolTab) {
        appState.sampleLibraryPoolsModal = {
          open: true,
          tab: String(samplePoolTab.dataset.samplePoolTab || "reference"),
          search: String(appState.sampleLibraryPoolsModal?.search || ""),
          metricFilters: {
            ...(appState.sampleLibraryPoolsModal?.metricFilters || {
              likes: "",
              favorites: "",
              comments: "",
              views: "",
              shares: ""
            })
          }
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

  const plannerCard = event.target.closest('[data-action="select-sample-library-account-planner-card"]');

  if (plannerCard) {
    appState.sampleLibraryAccountPlanner = {
      ...appState.sampleLibraryAccountPlanner,
      selectedPlanId: String(plannerCard.dataset.planId || "")
    };
    syncSampleLibraryAccountPlannerPanel();
    return;
  }

  const topSignalsFilter = event.target.closest("[data-xhs-top-signals-filter]");

  if (topSignalsFilter) {
    appState.xhsTopSignals = {
      ...appState.xhsTopSignals,
      activeFilter: String(topSignalsFilter.dataset.xhsTopSignalsFilter || "daily"),
      selectedSignalId: ""
    };
    syncXhsTopSignalsPanel();
    return;
  }

  const draftIdeasViewTab = event.target.closest("[data-draft-ideas-status-view]");

  if (draftIdeasViewTab) {
    appState.draftIdeas = {
      ...appState.draftIdeas,
      draftIdeasStatusView: String(draftIdeasViewTab.getAttribute("data-draft-ideas-status-view") || "draft")
    };
    renderDraftIdeasList();
    return;
  }

  const button = event.target.closest("button[data-action]");

  if (!button) {
    return;
  }

  const action = button.dataset.action;

  if (action === "open-style-profile-modal") {
    setButtonBusy(button, true, "加载中...");

    try {
      await openStyleProfileModal();
    } finally {
      setButtonBusy(button, false);
    }
    return;
  }

  if (action === "open-lexicon-workspace-modal") {
    openLexiconWorkspaceModal(button.dataset.tab || "custom");
    return;
  }

  if (action === "refresh-generation-theme-inspiration") {
    await refreshGenerationThemeInspirations();
    return;
  }

  if (action === "select-generation-theme-inspiration") {
    appState.generationThemeInspiration = {
      ...appState.generationThemeInspiration,
      selectedThemeId: String(button.dataset.themeId || "")
    };
    renderGenerationThemeInspirationModal();
    return;
  }

  if (action === "apply-generation-theme-inspiration") {
    const selectedThemeId = String(appState.generationThemeInspiration?.selectedThemeId || "");
    const selectedTheme = selectedThemeId
      ? getSelectedGenerationThemeInspiration()
      : null;
    const detailHintNode = byId("generation-theme-inspiration-detail-action-hint");
    const resultNode = byId("generation-action-hint");

    if (!selectedTheme) {
      detailHintNode && (detailHintNode.textContent = "请先选择一张主题灵感卡片。");
      resultNode && (resultNode.textContent = "请先选择一张主题灵感卡片。");
      return;
    }

    applyGenerationThemeInspirationPrefill(selectedTheme);
    return;
  }

  if (action === "add-generation-theme-inspiration-to-draft") {
    await addDraftIdeaFromThemeInspirationCard();
    return;
  }

  if (action === "clear-analysis-result") {
    appState.latestAnalysis = null;
    appState.latestAnalyzeCompareResult = null;
    appState.latestAnalysisFalsePositiveSource = null;
    byId("analysis-result").innerHTML = '<div class="muted">等待检测</div>';
    byId("cross-review-result").innerHTML = '<div class="muted">等待复判</div>';
    return;
  }

  if (action === "apply-sample-library-account-planner-card") {
    applySampleLibraryAccountPlannerCard();
    return;
  }

  if (action === "add-sample-library-account-planner-card-to-draft") {
    await addDraftIdeaFromAccountPlannerCard();
    return;
  }

  if (action === "clear-rewrite-result") {
    appState.latestRewrite = null;
    byId("rewrite-result").innerHTML = '<div class="muted">等待改写</div>';
    syncLifecycleResultActions();
    return;
  }

  if (action === "clear-cross-review-result") {
    appState.latestAnalyzeCompareResult = null;
    byId("cross-review-result").innerHTML = '<div class="muted">等待复判</div>';
    return;
  }

  if (action === "add-generation-candidate-to-draft") {
    await addDraftIdeaFromGenerationCandidate(button.dataset.candidateId || "", button.dataset.candidateIndex || "");
    return;
  }

  if (action === "load-draft-idea") {
    loadDraftIdeaIntoGenerationForm(button.dataset.id || "");
    return;
  }

  if (action === "mark-draft-idea-used") {
    await markDraftIdeaUsed(button.dataset.id || "");
    return;
  }

  if (action === "delete-draft-idea") {
    await removeDraftIdea(button.dataset.id || "");
    return;
  }

  if (action === "close-sample-library-external-samples-modal") {
    closeSampleLibraryExternalSamplesModal();
    return;
  }

  if (action === "delete-sample-library-external-sample") {
    const response = await apiJson(sampleLibraryExternalSamplesApi, {
      method: "DELETE",
      body: JSON.stringify({
        id: button.dataset.id || ""
      })
    });

    appState.externalReferenceSamples = Array.isArray(response?.items) ? response.items : [];
    appState.externalReferenceSamplesModal = {
      ...appState.externalReferenceSamplesModal,
      open: true,
      loading: false,
      message: ""
    };
    syncSampleLibraryAccountPlannerPanel();
    renderSampleLibraryExternalSamplesModal();
    return;
  }

  if (action === "clear-sample-library-external-samples") {
    const response = await apiJson(sampleLibraryExternalSamplesApi, {
      method: "DELETE",
      body: JSON.stringify({
        clear: true
      })
    });

    appState.externalReferenceSamples = Array.isArray(response?.items) ? response.items : [];
    appState.externalReferenceSamplesModal = {
      ...appState.externalReferenceSamplesModal,
      open: true,
      loading: false,
      message: ""
    };
    syncSampleLibraryAccountPlannerPanel();
    renderSampleLibraryExternalSamplesModal();
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

      if (action === "clear-sample-pool-filters") {
        appState.sampleLibraryPoolsModal = {
          open: true,
          tab: String(appState.sampleLibraryPoolsModal?.tab || "reference"),
          search: "",
          metricFilters: {
            likes: "",
            favorites: "",
            comments: "",
            views: "",
            shares: ""
          }
        };
        renderSampleLibraryPoolsModal();
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
      syncStyleProfileStateFromPayload(response);
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
      syncStyleProfileStateFromPayload(response);
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
      syncStyleProfileStateFromPayload(response);
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

  if (action === "subscribe-xhs-account-diagnosis-sync") {
    await subscribeXhsAccountDiagnosisSync();
    return;
  }

  if (action === "follow-similar-xhs-account-diagnosis") {
    await followSimilarXhsAccountDiagnosis(button.dataset.redId || "");
    return;
  }

  if (action === "save-xhs-matched-signal-external-sample") {
    await addMatchedXhsSignalToExternalSamples(button.dataset.signalId || "");
    return;
  }

  if (action === "save-xhs-matched-signal-draft-idea") {
    await addMatchedXhsSignalToDraftIdeas(button.dataset.signalId || "");
    return;
  }

  if (action === "save-xhs-top-signal-external-sample") {
    await addXhsTopSignalToExternalSamples(button.dataset.signalId || "");
    return;
  }

  if (action === "save-xhs-top-signal-draft-idea") {
    await addXhsTopSignalToDraftIdeas(button.dataset.signalId || "");
    return;
  }

  if (action === "select-xhs-top-signal") {
    appState.xhsTopSignals = {
      ...appState.xhsTopSignals,
      selectedSignalId: String(button.dataset.signalId || "")
    };
    syncXhsTopSignalsPanel();
    return;
  }

  if (action === "refresh-xhs-matched-signals") {
    await refreshXhsMatchedSignals();
    return;
  }

  if (action === "close-lexicon-workspace-modal") {
    closeLexiconWorkspaceModal();
    return;
  }

  if (action === "close-generation-theme-inspiration-modal") {
    closeGenerationThemeInspirationModal();
    return;
  }

  if (action === "close-generation-reference-search-modal") {
    closeGenerationReferenceSearchModal();
    return;
  }

  if (action === "apply-generation-reference-materials") {
    const items = Array.isArray(appState.generationReferenceSearch?.items) ? appState.generationReferenceSearch.items : [];
    const selectedIndices = Array.isArray(appState.generationReferenceSearch?.selectedIndices)
      ? appState.generationReferenceSearch.selectedIndices
      : [];
    const selectedTexts = selectedIndices
      .map((index) => items[index])
      .map((item) => String(item?.referenceText || "").trim())
      .filter(Boolean);

    if (!selectedTexts.length) {
      const resultNode = byId("generation-reference-search-result");

      if (resultNode) {
        resultNode.textContent = "请先选择至少 1 条可回填的参考资料。";
      }
      return;
    }

    appendMultipleGenerationMaterialTexts(selectedTexts);
    closeGenerationReferenceSearchModal();
    const resultNode = byId("generation-reference-search-result");

    if (resultNode) {
      resultNode.textContent = `已回填 ${selectedTexts.length} 条参考资料到素材文本。`;
    }
    return;
  }

    if (action === "prefill-sample-library-modal-calibration-prediction") {
      const prefillSource = getSampleLibraryCalibrationPredictionPrefillSource();
      const requirementMessage = prefillSource.requirementMessage;

    if (requirementMessage) {
        setSampleLibraryCalibrationPrefillMessage(requirementMessage);
        return;
      }

      const prediction = buildSampleLibraryCalibrationPredictionFromCurrentState();
      setSampleLibraryCalibrationPredictionFields(byId("sample-library-modal-content"), prediction);
      setSampleLibraryCalibrationPrefillMessage(prediction.successMessage || prefillSource.successMessage || "已预填预判字段。");
      return;
    }

  if (action === "apply-sample-library-reference-from-retro") {
    const applyState = getSampleLibraryReferenceApplicationState();

    if (!applyState.canApply) {
      setSampleLibraryModalMessage(applyState.requirementMessage || "当前还不能应用为参考样本。");
      return;
    }

    setButtonBusy(button, true, "应用中...");

    try {
      await applySampleLibraryReferenceFromRetro();
    } finally {
      setButtonBusy(button, false);
    }
    return;
  }

  if (action === "rewrite-sample-library-calibration-record") {
    const modalState = appState.sampleLibraryModal;
    const recordId =
      String(modalState?.selectedRecordId || modalState?.recordId || "").trim() || String(appState.selectedSampleLibraryRecordId || "").trim();
    const record = appState.sampleLibraryRecords.find((item) => String(item?.id || "").trim() === recordId);
    const payload = buildAnalyzePayloadFromSampleLibraryRecord(record || {});

    if (!hasMeaningfulNoteDraft(payload) || !String(payload.collectionType || "").trim()) {
      setSampleLibraryModalMessage("这条记录还缺少标题/正文或合集类型，暂时不能直接合规改写。");
      return;
    }

    setButtonBusy(button, true, "改写中...");

    try {
      await runRewriteFromPayload(payload, {
        pendingMessage: "正在根据这条记录生成合规改写...",
        errorMessage: "改写失败"
      });
    } finally {
      setButtonBusy(button, false);
      syncSampleLibraryPrefillActions();
      syncLifecycleResultActions();
    }
    return;
  }

  if (action === "save-platform-outcome") {
    const source = button.dataset.source || "analysis";
    const requirementMessage = getLifecycleSaveRequirementMessage(source, button.dataset.candidateId, button.dataset.candidateIndex);

    if (requirementMessage) {
      if (source === "analysis-compare") {
        setSampleLibraryModalMessage(requirementMessage);
      } else {
        syncLifecycleResultActions();
      }
      return;
    }

        openPlatformOutcomeModal({
          source,
          publishStatus: button.dataset.publishStatus,
          candidateId: button.dataset.candidateId,
          candidateIndex: button.dataset.candidateIndex,
          notes: button.dataset.note || "",
          views: 0,
          shares: 0
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
      createdAt: button.dataset.createdAt || "",
      sourceLabel: "这条反馈"
    });
    return;
  }

  if (action === "open-analyze-compare-false-positive") {
    const activeSelection = getActiveAnalyzeCompareBasisSelection();
    const compareContext = getAnalyzeCompareSelectionContext(activeSelection);
    const payload = appState.latestAnalyzePayload || {};
    const mergedAnalysis = compareContext.mergedAnalysis || {};
    const compareLabel = button.dataset.modelLabel || analyzeCompareModelLabel(compareContext.item);

    openFeedbackFalsePositiveModal({
      title: payload.title || "",
      body: payload.body || "",
      tags: Array.isArray(payload.tags) ? payload.tags : [],
      userNotes: button.dataset.userNotes || "",
      analysisVerdict: button.dataset.analysisVerdict || mergedAnalysis.finalVerdict || mergedAnalysis.verdict || "",
      analysisScore: Number(button.dataset.analysisScore || mergedAnalysis.score || 0),
      sourceLabel:
        button.dataset.sourceLabel ||
        (compareLabel
          ? `这次全部模型对比检测（当前保存基准：${compareLabel}）`
          : "这次全部模型对比检测")
    });
    return;
  }

  if (action === "save-analyze-compare-lifecycle") {
    const activeSelection = getActiveAnalyzeCompareBasisSelection();
    const requirementMessage = getLifecycleSaveRequirementMessage("analysis-compare", activeSelection);

    if (requirementMessage) {
      setSampleLibraryModalMessage(requirementMessage);
      return;
    }

    setButtonBusy(button, true, "保存中...");

    try {
      await saveLifecycleFromCurrent("analysis-compare", activeSelection);
      await refreshAll();
      const savedContext = getAnalyzeCompareSelectionContext(activeSelection);
      const basisLabel = analyzeCompareModelLabel(savedContext.item);
      setSampleLibraryModalMessage(
        basisLabel
          ? `已按 ${basisLabel} 的合并结论保存当前内容为生命周期记录。`
          : "已保存当前模型对比结果为生命周期记录。"
      );
    } finally {
      setButtonBusy(button, false);
    }
    return;
  }

  if (action === "open-false-positive-list-modal") {
    openFalsePositiveListModal();
    return;
  }

  if (action === "open-review-queue-modal") {
    ensureSupportWorkspaceOpen();
    openReviewQueueModal();
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

    if (action === "copy-generation-publish") {
      const resultItem = findGenerationResultCandidate(button.dataset.candidateId, button.dataset.candidateIndex);
      const finalDraft = resultItem?.finalDraft || resultItem || {};
      const copyText = buildGenerationPublishCopyText(finalDraft);
      const hintNode = byId("generation-publish-copy-hint");

      if (!copyText) {
        if (hintNode) {
          hintNode.textContent = "当前还没有可复制的发布稿内容。";
        }
        return;
      }

      await writeTextToClipboard(copyText);

      if (hintNode) {
        hintNode.textContent = "已复制发布稿：正文、#科普 和标签都带上了。";
      }
      return;
    }

    if (action === "copy-generation-cover-image-prompt") {
      const resultItem = findGenerationResultCandidate(button.dataset.candidateId, button.dataset.candidateIndex);
      const finalDraft = resultItem?.finalDraft || resultItem || {};
      const copyText = buildGenerationCoverImagePromptCopyText(finalDraft);
      const hintNode = byId("generation-cover-image-prompt-copy-hint");

      if (!copyText) {
        if (hintNode) {
          hintNode.textContent = "当前还没有可复制的封面图 Prompt。";
        }
        return;
      }

      await writeTextToClipboard(copyText);

      if (hintNode) {
        hintNode.textContent = "已复制封面图 Prompt，可直接去出图。";
      }
      return;
    }

    await refreshAll();
    } catch (error) {
      const target =
        button.closest(".admin-item") || byId("feedback-result") || byId("lexicon-workspace-result");
      target.insertAdjacentHTML(
        "beforeend",
        `<p class="helper-text">${escapeHtml(error.message || "操作失败")}</p>`
      );
  } finally {
    setButtonBusy(button, false);
  }
});

document.addEventListener("change", (event) => {
  const target = event.target instanceof Element ? event.target.closest('[data-action="toggle-generation-reference-material"]') : null;

  if (!target) {
    return;
  }

  const index = Number(target.dataset.index);
  const current = Array.isArray(appState.generationReferenceSearch?.selectedIndices)
    ? appState.generationReferenceSearch.selectedIndices
    : [];
  const next = target.checked ? [...new Set([...current, index])].sort((a, b) => a - b) : current.filter((item) => item !== index);

  appState.generationReferenceSearch = {
    ...appState.generationReferenceSearch,
    selectedIndices: next
  };
  syncGenerationReferenceSearchSelectionState();
});

renderModelSelectionControls(defaultModelSelectionOptions);
renderCollectionTypeSelectors();
syncSampleLibraryCreateButtonExpanded(false);
bindXhsTopSignalsInputEditTracking();

refreshAll().catch((error) => {
  byId("analysis-result").innerHTML = `
    <div class="result-card-shell muted">${escapeHtml(error.message || "初始化失败")}</div>
  `;
});

refreshXhsTopSignalsState({ useCache: true }).catch(() => {});
loadModelSelectionOptions().catch(() => {});
loadCollectionTypeOptions().catch(() => {});

syncAnalyzeActions();
syncFeedbackActions();
syncGenerationModeFields();
syncGenerationActions();
syncSampleLibraryCreateActions();
syncSampleLibraryImportActions();
syncSampleLibraryPrefillActions();
syncSampleLibraryDetailActions();
syncLifecycleResultActions();
