function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderMetaPills(items = []) {
  return Array.isArray(items) ? items.filter(Boolean).map((item) => `<span class="meta-pill">${escapeHtml(item)}</span>`).join("") : "";
}

function renderSelectedSummary(selectedCount = 0, totalCount = 0) {
  if (!totalCount) {
    return "等待加载外部样本";
  }

  if (!selectedCount) {
    return `已发现 ${totalCount} 条候选样本，尚未选择同步项`;
  }

  return `已选择 ${selectedCount} / ${totalCount} 条候选样本`;
}

export function buildXhsConnectorItemKey(item = {}) {
  const noteId = String(item?.noteId || item?.note_id || "").trim();
  if (noteId) {
    return `note:${noteId}`;
  }

  const url = String(item?.url || "").trim();
  if (url) {
    return `url:${url}`;
  }

  const provider = String(item?.provider || "").trim();
  const title = String(item?.title || "").trim();
  const authorName = String(item?.authorName || item?.author_name || "").trim();
  const publishedAt = String(item?.publishedAt || item?.publish_time || "").trim();
  const bodyPreview = String(item?.bodyPreview || item?.desc || item?.body || "").trim();

  return `fallback:${[provider, title, authorName, publishedAt, bodyPreview].filter(Boolean).join("|")}`;
}

export function buildXhsConnectorPanelMarkup() {
  return `
    <section id="sample-library-xhs-connector-panel" class="sample-library-xhs-connector-panel result-card-shell">
      <div class="sample-library-section-head">
        <div>
          <p class="eyebrow">XHS Connector</p>
          <h3>样本库连接面板</h3>
        </div>
        <p>先在这里发现外部样本，再决定是否导入或同步到本地样本库。</p>
      </div>
      <div class="sample-library-xhs-connector-form">
        <label>
          <span>来源类型</span>
          <select name="xhsConnectorSourceType">
            <option value="note">笔记</option>
            <option value="profile">作者主页</option>
            <option value="search">搜索结果</option>
          </select>
        </label>
        <label class="field-wide">
          <span>检索词</span>
          <input name="xhsConnectorQuery" type="text" placeholder="输入话题、标题或作者名" />
        </label>
        <div class="item-actions sample-library-xhs-connector-actions">
          <button type="button" class="button button-ghost" data-action="xhs-connector-discover">发现外部样本</button>
          <button type="button" class="button button-ghost" data-action="xhs-connector-sync-preview">预览发布同步</button>
        </div>
      </div>
      <div id="sample-library-xhs-connector-result" class="sample-library-xhs-connector-result">
        ${buildXhsConnectorDiscoveryResultMarkup([])}
      </div>
    </section>
  `;
}

export function buildXhsConnectorDiscoveryResultMarkup(items = []) {
  const records = Array.isArray(items) ? items : [];

  if (!records.length) {
    return '<div class="result-card-shell muted">等待发现外部样本</div>';
  }

  return `
    <div class="sample-library-xhs-connector-list">
      ${records
        .map((item) => {
          const selected = item?.selected === true;
          const itemKey = buildXhsConnectorItemKey(item);
          const title = String(item?.title || "未命名外部样本").trim();
          const bodyPreview = String(item?.bodyPreview || item?.desc || "暂无摘要").trim();
          const meta = [
            item?.provider ? `来源 ${item.provider}` : "",
            item?.authorName ? `作者 ${item.authorName}` : "",
            item?.publishedAt ? `时间 ${item.publishedAt}` : ""
          ];
          const metrics = item?.metrics || {};

          return `
            <article class="sample-library-xhs-connector-card result-card-shell${selected ? " is-selected" : ""}">
              <div class="sample-library-xhs-connector-card-head">
                <label class="sample-library-xhs-connector-select">
                  <input type="checkbox" name="xhsConnectorSelectedItem" value="${escapeHtml(itemKey)}"${selected ? " checked" : ""} />
                  <span>选择</span>
                </label>
                <div class="meta-row">
                  ${renderMetaPills(meta)}
                </div>
              </div>
              <strong>${escapeHtml(title)}</strong>
              <p>${escapeHtml(bodyPreview)}</p>
              <div class="meta-row">
                <span class="meta-pill">赞 ${escapeHtml(String(metrics.likes || 0))}</span>
                <span class="meta-pill">藏 ${escapeHtml(String(metrics.favorites || 0))}</span>
                <span class="meta-pill">评 ${escapeHtml(String(metrics.comments || 0))}</span>
                <span class="meta-pill">浏览 ${escapeHtml(String(metrics.views || 0))}</span>
                <span class="meta-pill">分享 ${escapeHtml(String(metrics.shares || 0))}</span>
              </div>
            </article>
          `;
        })
        .join("")}
    </div>
  `;
}

export function buildXhsConnectorSyncPreviewMarkup({ summary = {}, matched = [], unmatched = [] } = {}) {
  const matchedCount = Array.isArray(matched) ? matched.length : 0;
  const unmatchedCount = Array.isArray(unmatched) ? unmatched.length : 0;
  const totalCount = matchedCount + unmatchedCount;
  const summaryLabel = renderSelectedSummary(Number(summary.selectedCount || 0), Number(summary.totalCount || totalCount));

  return `
    <section class="sample-library-xhs-connector-sync-preview result-card-shell">
      <div class="sample-library-section-head">
        <div>
          <p class="eyebrow">Sync Preview</p>
          <h3>发布同步预览</h3>
        </div>
        <p>${escapeHtml(summaryLabel)}</p>
      </div>
      <div class="meta-row">
        <span class="meta-pill">匹配 ${escapeHtml(String(matchedCount))}</span>
        <span class="meta-pill">未匹配 ${escapeHtml(String(unmatchedCount))}</span>
        <span class="meta-pill">总计 ${escapeHtml(String(totalCount))}</span>
      </div>
      <div class="sample-library-xhs-connector-list">
        <section class="sample-library-xhs-connector-card">
          <strong>匹配项</strong>
          <p>${escapeHtml(matchedCount ? "将以这些样本作为同步目标。" : "当前没有可同步的匹配项。")}</p>
        </section>
        <section class="sample-library-xhs-connector-card">
          <strong>未匹配项</strong>
          <p>${escapeHtml(unmatchedCount ? "这些样本暂时不会进入同步结果。" : "当前没有未匹配项。")}</p>
        </section>
      </div>
    </section>
  `;
}
