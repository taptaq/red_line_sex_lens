function defaultEscapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function normalizeItems(items = []) {
  return Array.isArray(items) ? items.filter(Boolean) : [];
}

function normalizeGroupedItems(items = {}) {
  if (Array.isArray(items)) {
    return {
      dailyTop: normalizeItems(items),
      weeklyTop: [],
      lowTop: []
    };
  }

  const groupedItems = items && typeof items === "object" ? items : {};

  return {
    dailyTop: normalizeItems(groupedItems.dailyTop),
    weeklyTop: normalizeItems(groupedItems.weeklyTop),
    lowTop: normalizeItems(groupedItems.lowTop)
  };
}

function getVisibleItems(state = {}) {
  const groupedItems = normalizeGroupedItems(state?.items);
  const activeFilter = String(state?.activeFilter || "daily").trim() || "daily";

  if (activeFilter === "weekly") {
    return groupedItems.weeklyTop;
  }

  if (activeFilter === "low") {
    return groupedItems.lowTop;
  }

  return groupedItems.dailyTop;
}

function buildQuickActionMarkup(item, escapeHtml) {
  const signalId = escapeHtml(item?.id || "");

  return `
    <div class="item-actions xhs-top-signals-card-actions">
      <button type="button" class="button button-ghost button-small" data-action="save-xhs-top-signal-external-sample" data-signal-id="${signalId}">
        加入外部参考样本
      </button>
      <button type="button" class="button button-ghost button-small" data-action="save-xhs-top-signal-draft-idea" data-signal-id="${signalId}">
        生成灵感草稿
      </button>
    </div>
  `;
}

export function buildXhsTopSignalsCardsMarkup(items = [], options = {}) {
  const escapeHtml = options.escapeHtml || defaultEscapeHtml;
  const normalizedItems = normalizeItems(items);

  if (!normalizedItems.length) {
    return '<div class="result-card muted">当前筛选下还没有可展示的同类爆文。</div>';
  }

  return normalizedItems
    .map((item) => {
      const title = escapeHtml(item?.title || "未命名样本");
      const author = escapeHtml(item?.author || "未知作者");
      const track = escapeHtml(item?.track || "");
      const summary = escapeHtml(item?.analysis?.whySelected || item?.analysis?.reuseHint || "可作为同类信号参考。");
      const sourceLabel = escapeHtml(item?.sourceTypeLabel || item?.sourceType || "同类爆文");
      const signalId = escapeHtml(item?.id || "");
      const selectedClass = item?.selected ? " is-selected" : "";

      return `
        <article class="xhs-top-signals-card${selectedClass}">
          <button type="button" class="xhs-top-signals-card-button" data-action="select-xhs-top-signal" data-signal-id="${signalId}">
            <span class="xhs-top-signals-source-pill">${sourceLabel}</span>
            <strong>${title}</strong>
            <p>${author}${track ? ` · ${track}` : ""}</p>
            <p>${summary}</p>
          </button>
          ${buildQuickActionMarkup(item, escapeHtml)}
        </article>
      `;
    })
    .join("");
}

export function buildXhsTopSignalsDetailMarkup(item, options = {}) {
  const escapeHtml = options.escapeHtml || defaultEscapeHtml;

  if (!item) {
    return '<div class="result-card muted">选择一条同类爆文后，这里会展开详情和快捷动作。</div>';
  }

  const title = escapeHtml(item?.title || "未命名样本");
  const body = escapeHtml(item?.body || "暂无正文预览");
  const whySelected = escapeHtml(item?.analysis?.whySelected || "暂无入选说明");
  const reuseHint = escapeHtml(item?.analysis?.reuseHint || "暂无复用提示");
  const workUrl = String(item?.workUrl || "").trim();

  return `
    <article class="xhs-top-signals-detail-card">
      <div class="xhs-top-signals-detail-copy">
        <strong>${title}</strong>
        <p>${whySelected}</p>
        <p>${reuseHint}</p>
        <p>${body}</p>
      </div>
      ${buildQuickActionMarkup(item, escapeHtml)}
      ${workUrl ? `<a class="xhs-top-signals-detail-link" href="${escapeHtml(workUrl)}" target="_blank" rel="noreferrer">查看原文</a>` : ""}
    </article>
  `;
}

export function renderXhsTopSignalsBrowser(state = {}, helpers = {}) {
  const byId = helpers.byId;
  const escapeHtml = helpers.escapeHtml || defaultEscapeHtml;
  const queryTopSignalsFilterButtons =
    helpers.queryTopSignalsFilterButtons ||
    (() =>
      typeof document !== "undefined" && document?.querySelectorAll
        ? Array.from(document.querySelectorAll("[data-xhs-top-signals-filter]"))
        : []);
  const statusNode = byId?.("xhs-top-signals-status");
  const listNode = byId?.("xhs-top-signals-list");
  const detailNode = byId?.("xhs-top-signals-detail");

  if (!statusNode || !listNode || !detailNode) {
    return;
  }

  const items = getVisibleItems(state);
  const selectedSignalId = String(state?.selectedSignalId || "");
  const accountContext = state?.accountContext && typeof state.accountContext === "object" ? state.accountContext : {};
  const matchedSelection = selectedSignalId ? items.find((item) => String(item?.id || "") === selectedSignalId) : null;
  const effectiveSelectedSignalId = matchedSelection ? String(matchedSelection?.id || "") : String(items[0]?.id || "");
  const decoratedItems = items.map((item) => ({
    ...item,
    selected: Boolean(effectiveSelectedSignalId) && String(item?.id || "") === effectiveSelectedSignalId
  }));
  const selectedItem = decoratedItems.find((item) => item.selected) || null;

  const matchingContextParts = [
    String(accountContext?.derivedTrack || "").trim() ? `自动匹配赛道：${String(accountContext.derivedTrack || "").trim()}` : "",
    String(accountContext?.nickname || "").trim() ? `账号：${String(accountContext.nickname || "").trim()}` : "",
    String(accountContext?.redId || "").trim() ? `小红书号：${String(accountContext.redId || "").trim()}` : "",
    Array.isArray(accountContext?.derivedTags) && accountContext.derivedTags.length
      ? `参考标签：${accountContext.derivedTags.map((item) => String(item || "").trim()).filter(Boolean).join("、")}`
      : ""
  ].filter(Boolean);
  const statusParts = [String(state?.message || `已载入 ${decoratedItems.length} 条同类爆文信号`).trim(), ...matchingContextParts].filter(Boolean);

  statusNode.innerHTML = escapeHtml(statusParts.join(" · "));
  listNode.innerHTML = buildXhsTopSignalsCardsMarkup(decoratedItems, { escapeHtml });
  detailNode.innerHTML = buildXhsTopSignalsDetailMarkup(selectedItem, { escapeHtml });
  const activeFilter = String(state?.activeFilter || "daily").trim() || "daily";

  queryTopSignalsFilterButtons().forEach((button) => {
    const isActive = String(button?.dataset?.xhsTopSignalsFilter || "") === activeFilter;
    button.setAttribute("aria-selected", isActive ? "true" : "false");
    button.tabIndex = isActive ? 0 : -1;
  });
}
