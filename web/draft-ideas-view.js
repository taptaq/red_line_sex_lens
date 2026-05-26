export function renderDraftIdeasList(state = {}, helpers = {}) {
  const { byId, escapeHtml } = helpers;
  const listNode = byId?.("draft-ideas-list");

  if (!listNode) {
    return;
  }

  const items = Array.isArray(state.items) ? state.items : [];
  const message = String(state.message || "").trim();

  if (state.loading) {
    listNode.innerHTML = '<div class="result-card muted">正在加载草稿区...</div>';
    return;
  }

  if (!items.length) {
    listNode.innerHTML = `
      <article class="result-card muted">
        <strong>${escapeHtml(message || "还没有待写选题")}</strong>
        <p>账号复盘卡、主题灵感卡和生成候选稿都可以一键加入这里，先存住再慢慢写。</p>
      </article>
    `;
    return;
  }

  listNode.innerHTML = items
    .map((item) => {
      const tags = Array.isArray(item.tags) ? item.tags.filter(Boolean) : [];
      const statusLabel = String(item.status || "").trim() === "used" ? "已使用" : "待写";

      return `
        <article class="draft-idea-card${item.status === "used" ? " is-used" : ""}">
          <div class="meta-row">
            <span class="meta-pill">${escapeHtml(statusLabel)}</span>
            ${item.sourceLabel ? `<span class="meta-pill meta-pill-soft">${escapeHtml(item.sourceLabel)}</span>` : ""}
          </div>
          <strong>${escapeHtml(item.title || "未命名草稿")}</strong>
          <p>${escapeHtml(item.briefing || "暂无一句话需求")}</p>
          ${tags.length ? `<p class="helper-text">标签：${escapeHtml(tags.join("、"))}</p>` : ""}
          <div class="item-actions">
            <button type="button" class="button button-small" data-action="load-draft-idea" data-id="${escapeHtml(item.id || "")}">
              载入生成工作台
            </button>
            <button
              type="button"
              class="button button-ghost button-small"
              data-action="mark-draft-idea-used"
              data-id="${escapeHtml(item.id || "")}"
            >
              标记已使用
            </button>
            <button
              type="button"
              class="button button-ghost button-small"
              data-action="delete-draft-idea"
              data-id="${escapeHtml(item.id || "")}"
            >
              删除
            </button>
          </div>
        </article>
      `;
    })
    .join("");
}
