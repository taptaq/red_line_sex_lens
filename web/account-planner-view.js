export function getSelectedSampleLibraryAccountPlannerCard(cards = [], selectedPlanId = "") {
  const items = Array.isArray(cards) ? cards : [];
  const normalizedId = String(selectedPlanId || "").trim();

  return items.find((item) => String(item?.planId || "").trim() === normalizedId) || items[0] || null;
}

function formatAccountPlannerGapLabel(value = "") {
  const text = String(value || "").trim();

  if (!text) {
    return "";
  }

  if (text.startsWith("可补充视角：")) {
    return text;
  }

  return `可补充视角：${text}`;
}

function formatAccountPlannerEstimatedValueLabel(value = "") {
  const normalized = String(value || "").trim().toLowerCase();

  if (normalized === "high") {
    return "高优先";
  }

  if (normalized === "medium") {
    return "可尝试";
  }

  return "先观察";
}

export function renderSampleLibraryAccountPlannerDetail(card = null, helpers = {}) {
  const { byId, escapeHtml } = helpers;
  const detailNode = byId?.("sample-library-account-planner-detail");

  if (!detailNode) {
    return;
  }

  if (!card) {
    detailNode.innerHTML = `
      <article class="sample-library-account-planner-card sample-library-account-planner-card-detail muted">
        <strong>查看下一篇建议</strong>
        <p>运行一次账号级复盘后，这里会展示对应卡片的标题公式、正文结构、边界提醒和预填信息。</p>
      </article>
    `;
    return;
  }

  const structure = Array.isArray(card.bodyStructure) ? card.bodyStructure.filter(Boolean) : [];
  const boundaries = Array.isArray(card.riskBoundary) ? card.riskBoundary.filter(Boolean) : [];
  const signals = Array.isArray(card.sourceSignals) ? card.sourceSignals.filter(Boolean) : [];
  const tags = Array.isArray(card.tags) ? card.tags.filter(Boolean) : [];

  detailNode.innerHTML = `
    <article class="sample-library-account-planner-card sample-library-account-planner-card-detail">
      <div class="meta-row">
        <span class="meta-pill">价值 ${escapeHtml(formatAccountPlannerEstimatedValueLabel(card.estimatedValue || "observe"))}</span>
        ${tags.map((tag) => `<span class="meta-pill">${escapeHtml(tag)}</span>`).join("")}
      </div>
      <strong>${escapeHtml(card.planTitle || "未命名建议")}</strong>
      <p>${escapeHtml(card.whyThisWorks || "暂无建议说明。")}</p>
      <div>
        <strong>标题公式</strong>
        <p>${escapeHtml(card.titleFormula || "暂无标题公式")}</p>
      </div>
      ${
        structure.length
          ? `<div><strong>正文结构</strong><ol>${structure.map((entry) => `<li>${escapeHtml(entry)}</li>`).join("")}</ol></div>`
          : ""
      }
      ${
        boundaries.length
          ? `<div><strong>边界提醒</strong><ul>${boundaries.map((entry) => `<li>${escapeHtml(entry)}</li>`).join("")}</ul></div>`
          : ""
      }
      ${
        signals.length
          ? `<div><strong>参考来源</strong><ul>${signals.map((entry) => `<li>${escapeHtml(entry)}</li>`).join("")}</ul></div>`
          : ""
      }
      <div class="item-actions">
        <button type="button" class="button button-small" data-action="apply-sample-library-account-planner-card">
          一键填入生成表单
        </button>
        <button type="button" class="button button-ghost button-small" data-action="add-sample-library-account-planner-card-to-draft">
          加入草稿区
        </button>
      </div>
    </article>
  `;
}

export function renderSampleLibraryAccountPlannerResult(state = {}, helpers = {}) {
  const { byId, escapeHtml, renderSampleLibraryAccountPlannerDetail: renderDetail = renderSampleLibraryAccountPlannerDetail } = helpers;
  const resultNode = byId?.("sample-library-account-planner-result");

  if (!resultNode) {
    return;
  }

  if (state.loading) {
    resultNode.innerHTML = '<div class="result-card muted">正在生成账号级复盘与下一篇建议...</div>';
    renderDetail(null, helpers);
    return;
  }

  const cards = Array.isArray(state.cards) ? state.cards : [];
  const summary = state.summary && typeof state.summary === "object" ? state.summary : {};
  const modelTrace = state.modelTrace && typeof state.modelTrace === "object" ? state.modelTrace : {};
  const traceLabel =
    modelTrace.provider || modelTrace.model
      ? `模型总结：${[modelTrace.provider, modelTrace.model].filter(Boolean).join(" / ")}${
          modelTrace.routeLabel ? ` · ${modelTrace.routeLabel}` : ""
        }`
      : "分析来源：本地兜底";

  if (!cards.length) {
    const message = String(state.message || "").trim() || "先导入外部样本并运行复盘，这里会出现 3-5 张下一篇建议卡。";
    resultNode.innerHTML = `<div class="result-card muted">${escapeHtml(message)}</div>`;
    renderDetail(null, helpers);
    return;
  }

  const selectedCard = getSelectedSampleLibraryAccountPlannerCard(cards, state.selectedPlanId);
  resultNode.innerHTML = `
    <section class="sample-library-account-planner-summary result-card-shell">
      <div class="tab-panel-head">
        <strong>账号级复盘结论</strong>
        <span>${escapeHtml(summary.nextMove || "先从下面最靠前的建议卡开始。")}</span>
      </div>
      ${traceLabel ? `<p class="helper-text">${escapeHtml(traceLabel)}</p>` : ""}
      <div class="meta-row">
        ${(Array.isArray(summary.strengths) ? summary.strengths : [])
          .slice(0, 2)
          .map((item) => `<span class="meta-pill">${escapeHtml(item)}</span>`)
          .join("")}
        ${(Array.isArray(summary.gaps) ? summary.gaps : [])
          .slice(0, 2)
          .map((item) => `<span class="meta-pill meta-pill-soft">${escapeHtml(formatAccountPlannerGapLabel(item))}</span>`)
          .join("")}
      </div>
    </section>
    <div class="sample-library-account-planner-card-list">
      ${cards
        .map((card) => {
          const selected = String(card?.planId || "").trim() === String(selectedCard?.planId || "").trim();
          return `
            <article class="sample-library-account-planner-card${selected ? " is-selected" : ""}">
              <button
                type="button"
                class="sample-library-account-planner-card-button"
                data-action="select-sample-library-account-planner-card"
                data-plan-id="${escapeHtml(String(card?.planId || ""))}"
                aria-pressed="${selected ? "true" : "false"}"
              >
                <div class="meta-row">
                  <span class="meta-pill">价值 ${escapeHtml(formatAccountPlannerEstimatedValueLabel(card?.estimatedValue || "observe"))}</span>
                </div>
                <strong>${escapeHtml(card?.planTitle || "未命名建议")}</strong>
                <p>${escapeHtml(card?.whyThisWorks || "暂无说明")}</p>
              </button>
            </article>
          `;
        })
        .join("")}
    </div>
  `;

  renderDetail(selectedCard, helpers);
}

export function applySampleLibraryAccountPlannerPrefill(card = {}, helpers = {}) {
  const {
    readFieldValue = () => "",
    writeFieldValue = () => {},
    appendMaterialText = () => {},
    splitCSV = (value = "") => String(value || "").split(/[，,、]/).map((item) => item.trim()).filter(Boolean),
    joinCSV = (items = []) => items.join(", "),
    uniqueStrings = (items = []) => [...new Set(items)]
  } = helpers;

  if (!card || typeof card !== "object") {
    return;
  }

  if (!String(readFieldValue("briefing") || "").trim() && String(card.prefillBriefing || "").trim()) {
    writeFieldValue("briefing", card.prefillBriefing);
  }

  if (!String(readFieldValue("referenceTitle") || "").trim() && String(card.prefillReferenceTitle || "").trim()) {
    writeFieldValue("referenceTitle", card.prefillReferenceTitle);
  }

  if (!String(readFieldValue("collectionType") || "").trim() && String(card.prefillCollectionType || "").trim()) {
    writeFieldValue("collectionType", card.prefillCollectionType);
  }

  const nextTagReferences = uniqueStrings([
    ...splitCSV(readFieldValue("tagReferences") || ""),
    ...(Array.isArray(card.tags) ? card.tags : [])
  ]);
  writeFieldValue("tagReferences", joinCSV(nextTagReferences));

  const materialSections = uniqueStrings([
    String(card.prefillMaterialText || "").trim(),
    Array.isArray(card.riskBoundary) && card.riskBoundary.length ? `边界提醒：${card.riskBoundary.join("；")}` : "",
    Array.isArray(card.sourceSignals) && card.sourceSignals.length ? `参考来源：${card.sourceSignals.join("；")}` : ""
  ]);

  if (materialSections.length) {
    appendMaterialText(materialSections.join("\n"));
  }
}

export function renderSampleLibraryExternalSamplesModal(state = {}, helpers = {}) {
  const { byId, syncBodyModalState, setSampleLibraryExternalSamplesModalOpen, escapeHtml } = helpers;
  const modal = byId?.("sample-library-external-samples-modal");
  const contentNode = byId?.("sample-library-external-samples-modal-content");

  if (!modal || !contentNode) {
    return;
  }

  if (!state.open) {
    modal.hidden = true;
    syncBodyModalState?.();
    return;
  }

  const items = Array.isArray(state.items) ? state.items : [];
  const message = String(state.message || "").trim();

  if (state.loading) {
    contentNode.innerHTML = '<div class="result-card muted">正在加载外部参考样本...</div>';
    setSampleLibraryExternalSamplesModalOpen?.(true);
    return;
  }

  if (!items.length) {
    contentNode.innerHTML = `
      <div class="result-card muted">
        <strong>${escapeHtml(message || "还没有外部参考样本")}</strong>
        <p>导入 Markdown / CSV 后，这里会作为账号级复盘的辅助证据层长期保留。</p>
      </div>
    `;
    setSampleLibraryExternalSamplesModalOpen?.(true);
    return;
  }

  contentNode.innerHTML = `
    ${message ? `<p class="helper-text">${escapeHtml(message)}</p>` : ""}
    <div class="sample-library-external-samples-list">
      ${items
        .map((item) => {
          const tags = Array.isArray(item.tags) ? item.tags.filter(Boolean) : [];
          const metrics = item?.publish?.metrics || {};
          return `
            <article class="sample-library-external-sample-card">
              <div class="sample-library-section-head">
                <div>
                  <strong>${escapeHtml(item.title || "未命名外部样本")}</strong>
                  <p>${escapeHtml(String(item.body || "").slice(0, 120) || "暂无正文摘要")}</p>
                </div>
                <button
                  type="button"
                  class="button button-ghost button-small"
                  data-action="delete-sample-library-external-sample"
                  data-id="${escapeHtml(String(item.id || ""))}"
                >
                  删除
                </button>
              </div>
              <div class="meta-row">
                <span class="meta-pill">${escapeHtml(item.collectionType || "科普")}</span>
                ${tags.map((tag) => `<span class="meta-pill">${escapeHtml(tag)}</span>`).join("")}
                <span class="meta-pill">赞 ${escapeHtml(String(metrics.likes || 0))}</span>
                <span class="meta-pill">浏览 ${escapeHtml(String(metrics.views || 0))}</span>
              </div>
            </article>
          `;
        })
        .join("")}
    </div>
  `;

  setSampleLibraryExternalSamplesModalOpen?.(true);
}
