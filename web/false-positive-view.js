function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function compactText(value, maxLength = 120) {
  const text = String(value || "")
    .replace(/\s+/g, " ")
    .trim();

  if (!text) {
    return "";
  }

  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

function paragraphCount(value) {
  const normalized = String(value || "").trim();

  if (!normalized) {
    return 0;
  }

  return normalized.split(/\n\s*\n/).filter(Boolean).length || 1;
}

function verdictLabel(verdict) {
  if (verdict === "hard_block") return "高风险拦截";
  if (verdict === "manual_review") return "人工复核";
  if (verdict === "observe") return "观察通过";
  return "通过";
}

function falsePositiveStatusLabel(status) {
  if (status === "platform_passed_confirmed") return "已确认";
  if (status === "platform_passed_pending") return "待观察";
  return String(status || "").trim() || "待观察";
}

function falsePositiveStatusOptionLabel(status) {
  if (status === "platform_passed_confirmed") return "观察期后仍正常";
  if (status === "platform_passed_pending") return "已发出，目前正常";
  return falsePositiveStatusLabel(status);
}

function falsePositiveAuditLabel(audit) {
  const label = String(audit?.label || "").trim();
  const signal = String(audit?.signal || "").trim();
  let signalLabel = "";

  if (signal === "strict_pending") signalLabel = "偏严待确认";
  if (signal === "strict_confirmed") signalLabel = "偏严已确认";
  if (signal === "not_enough_evidence") signalLabel = "证据不足";

  if (label && signalLabel) {
    return `${label} / ${signalLabel}`;
  }

  return label || signalLabel || "未生成审核结论";
}

function normalizeSource(source = {}) {
  const sourceType = String(source.sourceType || source.kind || "analysis").trim() || "analysis";
  const rewriteSnapshot =
    source.rewriteSnapshot && typeof source.rewriteSnapshot === "object" ? source.rewriteSnapshot : null;
  const sourceContent = sourceType === "rewrite" && rewriteSnapshot ? rewriteSnapshot : source;

  return {
    sourceType,
    title: String(sourceContent.title || "").trim(),
    body: String(sourceContent.body || "").trim(),
    coverText: String(sourceContent.coverText || "").trim(),
    tags: Array.isArray(sourceContent.tags) ? sourceContent.tags.map((tag) => String(tag || "").trim()).filter(Boolean) : [],
    analysisSnapshot:
      source.analysisSnapshot && typeof source.analysisSnapshot === "object" ? source.analysisSnapshot : null,
    rewriteSnapshot
  };
}

export function buildLongTextDetails(label, value, emptyText = "未填写") {
  const normalized = String(value || "").trim();

  if (!normalized) {
    return `<div class="false-positive-text-empty">${escapeHtml(emptyText)}</div>`;
  }

  const count = paragraphCount(normalized);

  return `
    <details class="false-positive-text-details">
      <summary class="false-positive-text-summary">${escapeHtml(label)}全文 · ${escapeHtml(String(count))} 段</summary>
      <div class="false-positive-text-reader">${escapeHtml(normalized)}</div>
    </details>
  `;
}

export function buildFalsePositiveCaptureSources({
  analyzePayload = {},
  analysisSnapshot = null,
  rewriteSnapshot = null
} = {}) {
  const analysisContent = analyzePayload && typeof analyzePayload === "object" ? analyzePayload : {};
  const rewriteContent =
    rewriteSnapshot && typeof rewriteSnapshot === "object"
      ? rewriteSnapshot
      : analysisContent && typeof analysisContent === "object"
        ? analysisContent
        : {};

  return {
    analysis: {
      sourceType: "analysis",
      title: String(analysisContent.title || "").trim(),
      body: String(analysisContent.body || "").trim(),
      coverText: String(analysisContent.coverText || "").trim(),
      tags: Array.isArray(analysisContent.tags)
        ? analysisContent.tags.map((tag) => String(tag || "").trim()).filter(Boolean)
        : [],
      analysisSnapshot: analysisSnapshot && typeof analysisSnapshot === "object" ? analysisSnapshot : null,
      rewriteSnapshot: null
    },
    rewrite: {
      sourceType: "rewrite",
      title: String(rewriteContent.title || "").trim(),
      body: String(rewriteContent.body || "").trim(),
      coverText: String(rewriteContent.coverText || "").trim(),
      tags: Array.isArray(rewriteContent.tags) ? rewriteContent.tags.map((tag) => String(tag || "").trim()).filter(Boolean) : [],
      analysisSnapshot: analysisSnapshot && typeof analysisSnapshot === "object" ? analysisSnapshot : null,
      rewriteSnapshot: rewriteContent
    }
  };
}

export function buildFalsePositiveEntryMarkup(item = {}) {
  const analysisVerdict = item.analysisSnapshot?.verdict || "pass";
  const audit = item.falsePositiveAudit || {};
  const title = String(item.title || "").trim() || "未命名误报样本";
  const status = falsePositiveStatusLabel(item.status);
  const updatedAt = String(item.updatedAt || item.createdAt || "").trim();
  const noteText = String(item.userNotes || audit.notes || "").trim();

  return `
    <article class="admin-item false-positive-admin-item">
      <strong>${escapeHtml(title)}</strong>
      <div class="meta-row">
        <span class="meta-pill">${escapeHtml(status)}</span>
        <span class="meta-pill">${escapeHtml(falsePositiveAuditLabel(audit))}</span>
        <span class="meta-pill">${escapeHtml(verdictLabel(analysisVerdict))}</span>
        ${updatedAt ? `<span class="meta-pill">${escapeHtml(updatedAt)}</span>` : ""}
      </div>
      <div class="false-positive-admin-layout">
        <div class="false-positive-admin-content">
          <div class="false-positive-admin-details">
            ${buildLongTextDetails("正文", item.body, "未填写正文")}
            ${buildLongTextDetails("封面", item.coverText, "未填写封面")}
            ${buildLongTextDetails("备注", noteText, "暂无备注")}
          </div>
          <p class="false-positive-admin-tags">标签：${escapeHtml((Array.isArray(item.tags) ? item.tags : []).filter(Boolean).join("、") || "未填写")}</p>
          <p class="false-positive-admin-verdict">
            规则结论：${escapeHtml(verdictLabel(analysisVerdict))}，规则分 ${escapeHtml(String(item.analysisSnapshot?.score ?? 0))}
          </p>
        </div>
        <div class="false-positive-admin-side">
          <div class="false-positive-admin-state">
            <span>样本状态</span>
            <strong>${escapeHtml(status)}</strong>
            <p>${escapeHtml(item.status === "platform_passed_confirmed" ? "该样本已过观察期确认，可作为更强的偏严证据。" : "该样本仍在观察期，建议继续留意平台是否维持放行。")}</p>
          </div>
          <div class="false-positive-admin-actions">
            ${
              item.status !== "platform_passed_confirmed"
                ? `
              <button
                type="button"
                class="button button-alt button-small"
                data-action="confirm-false-positive"
                data-id="${escapeHtml(item.id)}"
              >
                标记已确认
              </button>
            `
                : '<span class="meta-pill">已确认</span>'
            }
            <button
              type="button"
              class="button button-danger button-small"
              data-action="delete-false-positive"
              data-id="${escapeHtml(item.id)}"
            >
              删除无效样本
            </button>
          </div>
        </div>
      </div>
    </article>
  `;
}

export function buildFalsePositiveActionMarkup(source = {}) {
  const normalized = normalizeSource(source);
  const sourceLabel = normalized.sourceType === "rewrite" ? "改写结果" : "规则检测结果";
  const snapshot = normalized.analysisSnapshot || {};
  const verdict = String(snapshot.verdict || "").trim() || "pass";
  const score = Number(snapshot.score ?? 0);
  const tagsMarkup = normalized.tags.length
    ? normalized.tags
        .map(
          (tag) => `
            <span class="meta-pill meta-pill-soft">${escapeHtml(tag)}</span>
          `
        )
        .join("")
    : '<span class="meta-pill meta-pill-soft">未提供标签</span>';

  return `
    <section class="false-positive-capture" data-false-positive-source="${escapeHtml(JSON.stringify(normalized))}">
      <div class="false-positive-capture-head">
        <div>
          <strong>记录为误报样本</strong>
          <p>把当前结果先沉淀为样本，后续可以再确认是观察通过还是正式放行。</p>
        </div>
        <span class="false-positive-capture-source">${escapeHtml(sourceLabel)}</span>
      </div>
      <div class="false-positive-capture-preview">
        <article class="false-positive-capture-summary">
          <span>样本摘要</span>
          <strong>${escapeHtml(normalized.title || "未命名样本")}</strong>
          <p>${escapeHtml(compactText(normalized.body || normalized.coverText || normalized.title || "未提供内容"))}</p>
        </article>
        <div class="false-positive-capture-meta">
          <div class="meta-row">${tagsMarkup}</div>
          <p class="helper-text">结果结论：${escapeHtml(verdictLabel(verdict))} / 规则分 ${escapeHtml(String(score))}</p>
        </div>
      </div>
      <form class="false-positive-capture-form">
        <label class="false-positive-capture-status">
          <span>样本状态</span>
          <select name="status">
            <option value="platform_passed_pending" selected>${escapeHtml(
              falsePositiveStatusOptionLabel("platform_passed_pending")
            )}</option>
            <option value="platform_passed_confirmed">${escapeHtml(
              falsePositiveStatusOptionLabel("platform_passed_confirmed")
            )}</option>
          </select>
        </label>
        <button type="submit" class="button button-small">记录为误报样本</button>
      </form>
      <p class="helper-text false-positive-capture-note">
        “已发出，目前正常”表示先记录待观察；“观察期后仍正常”表示平台放行已完成确认。
      </p>
      <div class="false-positive-capture-result muted">等待记录</div>
    </section>
  `;
}
