function localEscapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function localCompactText(value, maxLength = 120) {
  const text = String(value || "")
    .replace(/\s+/g, " ")
    .trim();

  if (!text) {
    return "";
  }

  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

function localJoinCSV(items = []) {
  return Array.isArray(items) ? items.join(", ") : "";
}

function localFormatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "未知时间" : date.toLocaleString("zh-CN");
}

function localVerdictLabel(verdict) {
  if (verdict === "hard_block") return "高风险拦截";
  if (verdict === "manual_review") return "人工复核";
  if (verdict === "observe") return "观察通过";
  return "通过";
}

function localMatchLabel(match) {
  if (match === "regex") return "正则";
  return "精确词";
}

function localLexiconLevelLabel(level) {
  if (level === "l1") return "一级词库";
  if (level === "l3") return "三级词库";
  return "二级词库";
}

function localInnerSpaceTermCategoryLabel(category) {
  if (category === "actions") return "操作篇";
  if (category === "states") return "状态篇";
  if (category === "map") return "地形篇";
  if (category === "protocol") return "协议篇";
  return "装备篇";
}

function localInferLexiconLevel(level, riskLevel) {
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

export function buildInnerSpaceTermsListMarkup(items = [], helpers = {}) {
  const escapeHtml = helpers.escapeHtml || localEscapeHtml;
  const innerSpaceTermCategoryLabel = helpers.innerSpaceTermCategoryLabel || localInnerSpaceTermCategoryLabel;
  const normalizedItems = Array.isArray(items) ? items : [];

  return normalizedItems.length
    ? normalizedItems
        .slice()
        .sort((left, right) => Number(right.priority || 0) - Number(left.priority || 0))
        .map(
          (item) => `
            <article class="admin-item">
              <strong>${escapeHtml(item.term || "未命名术语")}</strong>
              <div class="meta-row">
                <span class="meta-pill">${escapeHtml(innerSpaceTermCategoryLabel(item.category))}</span>
                <span class="meta-pill">优先级 ${escapeHtml(String(item.priority || 0))}</span>
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

export function buildLexiconListMarkup(items = [], scope = "custom", helpers = {}) {
  const escapeHtml = helpers.escapeHtml || localEscapeHtml;
  const verdictLabel = helpers.verdictLabel || localVerdictLabel;
  const matchLabel = helpers.matchLabel || localMatchLabel;
  const lexiconLevelLabel = helpers.lexiconLevelLabel || localLexiconLevelLabel;
  const inferLexiconLevel = helpers.inferLexiconLevel || localInferLexiconLevel;
  const groups = [
    { key: "l1", label: "一级词库" },
    { key: "l2", label: "二级词库" },
    { key: "l3", label: "三级词库" }
  ];

  return Array.isArray(items) && items.length
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

export function renderFeedbackLog(items = [], helpers = {}) {
  const escapeHtml = helpers.escapeHtml || localEscapeHtml;
  const compactText = helpers.compactText || localCompactText;
  const verdictLabel = helpers.verdictLabel || localVerdictLabel;
  const matchLabel = helpers.matchLabel || localMatchLabel;
  const lexiconLevelLabel = helpers.lexiconLevelLabel || localLexiconLevelLabel;
  const inferLexiconLevel = helpers.inferLexiconLevel || localInferLexiconLevel;
  const formatDate = helpers.formatDate || localFormatDate;
  const reviewAuditLabel = helpers.reviewAuditLabel || ((audit = {}) => String(audit?.label || "").trim() || "未记录审核");
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
        ${canSendToReview ? `<p class="helper-text">当前条目可继续送入人工复核或规则维护。</p>` : ""}
        <div class="item-actions">
          <button
            type="button"
            class="button button-small"
            data-action="send-feedback-to-review-queue"
            data-suspicious-phrases="${escapeHtml(joinCSV(item.suspiciousPhrases))}"
            data-feedback-model-suspicious-phrases="${escapeHtml(joinCSV(item.feedbackModelSuggestion?.suspiciousPhrases || []))}"
            data-feedback-model-context-categories="${escapeHtml(joinCSV(item.feedbackModelSuggestion?.contextCategories || []))}"
            data-platform-reason="${escapeHtml(item.platformReason || "")}"
          >
            加入规则复核
          </button>
          <button
            type="button"
            class="button button-ghost button-small"
            data-action="send-feedback-to-false-positive"
            data-id="${escapeHtml(item.id)}"
          >
            标记为误报
          </button>
        </div>
      </article>
    `;
  };

  return `
    <div class="sample-library-modal-stack">
      <section class="sample-library-modal-section">
        <div class="sample-library-modal-section-head">
          <strong>待处理误判</strong>
          <p>需要进一步判断的反馈会先放在这里，方便人工复核和规则补充。</p>
        </div>
        <div class="admin-list">
          ${pendingFeedbackItems.length
            ? pendingFeedbackItems.map((item) => buildFeedbackItemMarkup(item)).join("")
            : '<div class="result-card muted">当前没有待处理反馈</div>'}
        </div>
      </section>
      <section class="sample-library-modal-section">
        <div class="sample-library-modal-section-head">
          <strong>已处理反馈</strong>
          <p>已经完成处理的反馈仍然保留，方便后续回看和抽样复查。</p>
        </div>
        <div class="admin-list">
          ${completedFeedbackItems.length
            ? completedFeedbackItems.map((item) => buildFeedbackItemMarkup(item)).join("")
            : '<div class="result-card muted">当前没有已处理反馈</div>'}
        </div>
      </section>
    </div>
  `;
}

export function renderFalsePositiveLog(items = [], helpers = {}) {
  const escapeHtml = helpers.escapeHtml || localEscapeHtml;
  const verdictLabel = helpers.verdictLabel || localVerdictLabel;
  const compactText = helpers.compactText || localCompactText;
  const formatDate = helpers.formatDate || localFormatDate;
  const getSortedFalsePositiveGroups = helpers.getSortedFalsePositiveGroups || ((records = []) => {
    const normalizedItems = Array.isArray(records) ? records : [];
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
  });
  const falsePositiveStatusLabel = helpers.falsePositiveStatusLabel || ((status = "") => String(status || "").trim() || "待观察");
  const falsePositiveSourceLabel = helpers.falsePositiveSourceLabel || ((source = "") => String(source || "").trim());
  const falsePositiveAuditLabel = helpers.falsePositiveAuditLabel || ((audit = {}) => String(audit?.label || "").trim() || "未生成审核结论");
  const buildLongTextDetails = helpers.buildLongTextDetails || ((label, value, emptyText = "未填写") => {
    const normalized = String(value || "").trim();

    if (!normalized) {
      return `<div class="false-positive-text-empty">${escapeHtml(emptyText)}</div>`;
    }

    return `
      <details class="false-positive-text-details">
        <summary class="false-positive-text-summary">${escapeHtml(label)}全文</summary>
        <div class="false-positive-text-reader">${escapeHtml(normalized)}</div>
      </details>
    `;
  });

  const groups = getSortedFalsePositiveGroups(items);
  const pendingItems = groups.pendingItems || [];
  const historyItems = groups.historyItems || [];
  const renderGroup = (groupItems, emptyText) =>
    groupItems.length
      ? groupItems
          .map(
            (item) => `
              <article class="admin-item false-positive-admin-item">
                <strong>${escapeHtml(item.title || "未命名误报样本")}</strong>
                <div class="meta-row">
                  <span class="meta-pill">${escapeHtml(falsePositiveStatusLabel(item.status))}</span>
                  ${item.source ? `<span class="meta-pill">${escapeHtml(falsePositiveSourceLabel(item.source) || item.source)}</span>` : ""}
                  <span class="meta-pill">权重 ${escapeHtml(String(item.sampleWeight ?? "-"))}</span>
                  <span class="meta-pill">${escapeHtml(falsePositiveAuditLabel(item.falsePositiveAudit || {}))}</span>
                  <span class="meta-pill">${escapeHtml(verdictLabel(item.analysisSnapshot?.verdict || "pass"))}</span>
                  ${item.updatedAt ? `<span class="meta-pill">${escapeHtml(formatDate(item.updatedAt))}</span>` : ""}
                </div>
                <div class="false-positive-admin-layout">
                  <div class="false-positive-admin-content">
                    <div class="false-positive-admin-details">
                      ${buildLongTextDetails("正文", item.body, "未填写正文")}
                      ${buildLongTextDetails("封面", item.coverText, "未填写封面")}
                      ${buildLongTextDetails("备注", String(item.userNotes || item.notes || "").trim(), "暂无备注")}
                    </div>
                    <p class="false-positive-admin-tags">标签：${escapeHtml((Array.isArray(item.tags) ? item.tags : []).filter(Boolean).join("、") || "未填写")}</p>
                    <p class="false-positive-admin-verdict">
                      规则结论：${escapeHtml(verdictLabel(item.analysisSnapshot?.verdict || "pass"))}，规则分 ${escapeHtml(String(item.analysisSnapshot?.score ?? 0))}
                    </p>
                  </div>
                  <div class="false-positive-admin-side">
                    <div class="false-positive-admin-state">
                      <span>样本状态</span>
                      <strong>${escapeHtml(falsePositiveStatusLabel(item.status))}</strong>
                      <p>${escapeHtml(item.status === "platform_passed_confirmed" ? "该样本已过观察期确认，可作为更强的偏严证据。" : "该样本仍在观察期，建议继续留意平台是否维持放行。")}</p>
                    </div>
                  </div>
                </div>
              </article>
            `
          )
          .join("")
      : `<div class="result-card muted">${escapeHtml(emptyText)}</div>`;

  return `
    <div class="sample-library-modal-stack">
      <section class="sample-library-modal-section">
        <div class="sample-library-modal-section-head">
          <strong>待确认误报</strong>
          <p>先确认这批样本是否要继续保留为误报参考，再决定是否进入参考样本池。</p>
        </div>
        <div class="admin-list">${renderGroup(pendingItems, "当前没有待确认误报。")}</div>
      </section>
      <section class="sample-library-modal-section">
        <div class="sample-library-modal-section-head">
          <strong>误报历史</strong>
          <p>已确认的误报仍然会保留在历史区，方便后续回看和权重调整。</p>
        </div>
        <div class="admin-list">${renderGroup(historyItems, "当前没有误报历史。")}</div>
      </section>
    </div>
  `;
}
