function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function buildRewriteBodyMarkup(body = "") {
  const normalized = String(body || "").trim();

  if (!normalized) {
    return '<p class="rewrite-body-empty">未生成</p>';
  }

  const paragraphCount = normalized.split(/\n\s*\n/).filter(Boolean).length;

  return `
    <details class="rewrite-body-details" open>
      <summary class="rewrite-body-summary">正文全文 · ${paragraphCount} 段</summary>
      <div class="rewrite-body-reader">${escapeHtml(normalized)}</div>
    </details>
  `;
}
