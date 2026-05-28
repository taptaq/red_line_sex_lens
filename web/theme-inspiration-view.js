export function getSelectedGenerationThemeInspiration(items = [], selectedThemeId = "") {
  const normalizedItems = Array.isArray(items) ? items : [];
  const normalizedSelectedThemeId = String(selectedThemeId || "");

  return normalizedItems.find((item) => String(item?.themeId || "") === normalizedSelectedThemeId) || normalizedItems[0] || null;
}

export function renderGenerationThemeInspirationDetail(item = null, helpers = {}) {
  const { byId, escapeHtml } = helpers;
  const detailNode = byId?.("generation-theme-inspiration-modal-detail");

  if (!detailNode) {
    return;
  }

  if (!item) {
    detailNode.innerHTML = `
      <section class="generation-theme-card generation-theme-card-detail muted">
        <strong>查看主题详情</strong>
        <p>选择左侧主题后，这里会展示切入角度、边界提醒和预填信息。</p>
      </section>
    `;
    return;
  }

  const tags = Array.isArray(item.tags) ? item.tags.filter(Boolean) : [];
  const sourceSignals = Array.isArray(item.sourceSignals) ? item.sourceSignals.filter(Boolean) : [];
  const expandAngles = Array.isArray(item.expandAngles) ? item.expandAngles.filter(Boolean) : [];
  const boundaryNotes = Array.isArray(item.boundaryNotes) ? item.boundaryNotes.filter(Boolean) : [];
  const sourceThemeTitle = String(item.sourceThemeTitle || "").trim();

  detailNode.innerHTML = `
    <section class="generation-theme-card generation-theme-card-detail">
      <div class="meta-row">
        ${tags.map((tag) => `<span class="meta-pill">${escapeHtml(tag)}</span>`).join("")}
      </div>
      ${sourceThemeTitle ? `<p class="helper-text">来源主题：${escapeHtml(sourceThemeTitle)}</p>` : ""}
      <strong>${escapeHtml(item.themeTitle || "未命名灵感角度")}</strong>
      <p>${escapeHtml(item.hookAngle || "暂无切入角度说明。")}</p>
      <p class="helper-text">${escapeHtml(item.whyNow || "暂无为什么值得做的说明。")}</p>
      <p class="helper-text">${escapeHtml(item.discussionSignal || "暂无讨论信号。")}</p>
      ${
        sourceSignals.length
          ? `<div><strong>来源信号</strong><ul>${sourceSignals.map((entry) => `<li>${escapeHtml(entry)}</li>`).join("")}</ul></div>`
          : ""
      }
      ${
        expandAngles.length
          ? `<div><strong>相关角度</strong><ul>${expandAngles.map((entry) => `<li>${escapeHtml(entry)}</li>`).join("")}</ul></div>`
          : ""
      }
      ${
        boundaryNotes.length
          ? `<div><strong>边界提醒</strong><ul>${boundaryNotes.map((entry) => `<li>${escapeHtml(entry)}</li>`).join("")}</ul></div>`
          : ""
      }
      <div class="item-actions">
        <button type="button" class="button button-small" data-action="apply-generation-theme-inspiration">
          一键填入生成表单
        </button>
        <button type="button" class="button button-ghost button-small" data-action="add-generation-theme-inspiration-to-draft">
          加入草稿区
        </button>
      </div>
      <p class="helper-text action-gate-hint" id="generation-theme-inspiration-detail-action-hint" aria-live="polite"></p>
    </section>
  `;
}

export function renderGenerationThemeInspirationModal(state = {}, helpers = {}) {
  const {
    byId,
    syncBodyModalState,
    setGenerationThemeInspirationModalOpen,
    escapeHtml,
    renderGenerationThemeInspirationDetail: renderDetail = renderGenerationThemeInspirationDetail,
    getSelectedGenerationThemeInspiration: getSelected = getSelectedGenerationThemeInspiration
  } = helpers;
  const modal = byId?.("generation-theme-inspiration-modal");
  const contentNode = byId?.("generation-theme-inspiration-modal-content");

  if (!modal || !contentNode) {
    return;
  }

  if (!state.open) {
    modal.hidden = true;
    syncBodyModalState?.();
    return;
  }

  if (state.loading) {
    contentNode.innerHTML =
      '<article class="generation-theme-card muted"><strong>正在加载主题灵感</strong><p>先整理高表现内容里的可用主题方向。</p></article>';
    renderDetail(null, { byId, escapeHtml });
    setGenerationThemeInspirationModalOpen?.(true);
    return;
  }

  const items = Array.isArray(state.items) ? state.items : [];

  if (!items.length) {
    const emptyMessage = String(state.message || "").trim();
    contentNode.innerHTML = `
      <article class="generation-theme-card muted">
        <strong>${escapeHtml(emptyMessage || "这次还没有可用灵感")}</strong>
        <p>${
          emptyMessage
            ? "可以稍后再试一次刷新，看看新的高表现内容是否已经整理完成。"
            : "可以稍后刷新，看看新一轮高表现内容有没有跑出新主题。"
        }</p>
      </article>
    `;
    renderDetail(null, { byId, escapeHtml });
    setGenerationThemeInspirationModalOpen?.(true);
    return;
  }

  const selectedTheme = getSelected(items, state.selectedThemeId);
  contentNode.innerHTML = items
    .map((item) => {
      const isSelected = String(item?.themeId || "") === String(selectedTheme?.themeId || "");
      const tags = Array.isArray(item?.tags) ? item.tags.filter(Boolean).slice(0, 3) : [];
      const sourceThemeTitle = String(item?.sourceThemeTitle || "").trim();
      return `
        <article class="generation-theme-card${isSelected ? " is-selected" : ""}">
          <button
            type="button"
            class="generation-theme-card-button"
            data-action="select-generation-theme-inspiration"
            data-theme-id="${escapeHtml(String(item?.themeId || ""))}"
            aria-pressed="${isSelected ? "true" : "false"}"
          >
            ${sourceThemeTitle ? `<span class="generation-theme-source-label">${escapeHtml(sourceThemeTitle)}</span>` : ""}
            <strong>${escapeHtml(item?.themeTitle || "未命名灵感角度")}</strong>
            <p>${escapeHtml(item?.hookAngle || item?.whyNow || "暂无说明")}</p>
            <p class="helper-text">${escapeHtml(item?.discussionSignal || "暂无讨论信号")}</p>
            <div class="meta-row">
              ${tags.map((tag) => `<span class="meta-pill">${escapeHtml(tag)}</span>`).join("")}
            </div>
          </button>
        </article>
      `;
    })
    .join("");

  renderDetail(selectedTheme, { byId, escapeHtml });
  setGenerationThemeInspirationModalOpen?.(true);
}
