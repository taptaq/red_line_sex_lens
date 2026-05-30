function formatMetric(value) {
  const number = Number(value || 0);

  if (!Number.isFinite(number)) {
    return "0";
  }

  if (number >= 10000) {
    return `${(number / 10000).toFixed(number >= 100000 ? 0 : 1)}w`;
  }

  return String(Math.round(number));
}

function formatDateTime(value = "") {
  const text = String(value || "").trim();

  if (!text) {
    return "-";
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

function renderAccountList(items = [], escapeHtml = (value) => String(value || "")) {
  const rows = Array.isArray(items) ? items.filter(Boolean) : [];

  if (!rows.length) {
    return '<p class="helper-text">当前还没有可展示的账号。</p>';
  }

  return `
    <div class="xhs-account-diagnosis-list">
      ${rows
        .map(
          (item) => `
            <article class="sample-library-account-planner-card">
              <strong>${escapeHtml(item.nickname || item.redId || "未命名账号")}</strong>
              <p>粉丝 ${escapeHtml(formatMetric(item.fans))} · 近30天互动 ${escapeHtml(formatMetric(item.interactiveCountThirty))}</p>
              <p>${escapeHtml(item.reason || "可以先看它的选题和互动表现。")}</p>
              <div class="item-actions">
                <button type="button" class="button button-ghost button-small" data-action="follow-similar-xhs-account-diagnosis" data-red-id="${escapeHtml(item.redId || "")}">
                  继续分析
                </button>
              </div>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function renderSimilarFollowups(items = [], escapeHtml = (value) => String(value || "")) {
  const rows = Array.isArray(items) ? items.filter(Boolean) : [];

  if (!rows.length) {
    return "";
  }

  return `
    <section class="sample-library-account-planner-card">
      <strong>自动延伸分析</strong>
      <div class="xhs-account-diagnosis-list">
        ${rows
          .map(
            (item) => `
              <article class="sample-library-account-planner-card">
                <strong>${escapeHtml(item?.account?.nickname || item?.account?.redId || "未命名账号")}</strong>
                <p>小红书号 ${escapeHtml(item?.account?.redId || "-")}</p>
                <p>${escapeHtml(item?.diagnosis?.summary || "暂无延伸分析摘要。")}</p>
              </article>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}

function renderMatchedSignalSection(title = "", items = [], escapeHtml = (value) => String(value || "")) {
  const rows = Array.isArray(items) ? items.filter(Boolean) : [];

  if (!rows.length) {
    return "";
  }

  return `
    <section class="sample-library-account-planner-card">
      <strong>${escapeHtml(title)}</strong>
      <div class="xhs-account-diagnosis-list">
        ${rows
          .map(
            (item) => `
              <article class="sample-library-account-planner-card">
                <strong>${escapeHtml(item.title || "未命名样本")}</strong>
                <p>${escapeHtml(item.author || "未知作者")} · ${escapeHtml(item.track || "")} · ${escapeHtml(item.accountTier || "")}</p>
                <p>${escapeHtml(item.analysis?.whySelected || item.analysis?.reuseHint || "可作为同类爆款参考。")}</p>
                <div class="item-actions">
                  <button type="button" class="button button-ghost button-small" data-action="save-xhs-matched-signal-external-sample" data-signal-id="${escapeHtml(item.id || "")}">
                    加入外部参考样本
                  </button>
                  <button type="button" class="button button-ghost button-small" data-action="save-xhs-matched-signal-draft-idea" data-signal-id="${escapeHtml(item.id || "")}">
                    生成灵感草稿
                  </button>
                </div>
              </article>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}

function buildSubscriptionStatusMarkup(subscription = null, escapeHtml = (value) => String(value || "")) {
  if (!subscription || typeof subscription !== "object") {
    return "";
  }

  const statusMap = {
    scheduled: "已订阅补采，等待自动重查",
    running: "补采任务执行中",
    completed: "补采任务已完成",
    failed: "补采任务失败"
  };

  return `
    <section class="sample-library-account-planner-card">
      <strong>补采状态</strong>
      <p>${escapeHtml(statusMap[String(subscription.status || "").trim()] || "补采状态未知")}</p>
      <p class="helper-text">计划时间：${escapeHtml(formatDateTime(subscription.scheduledAt))}</p>
      ${subscription.nextRetryAt ? `<p class="helper-text">下次重试：${escapeHtml(formatDateTime(subscription.nextRetryAt))}</p>` : ""}
      ${Number(subscription.retryCount || 0) > 0 ? `<p class="helper-text">已重试：${escapeHtml(String(subscription.retryCount))} 次</p>` : ""}
      ${subscription.lastCompletedAt ? `<p class="helper-text">最近完成：${escapeHtml(formatDateTime(subscription.lastCompletedAt))}</p>` : ""}
      ${subscription.lastError ? `<p class="helper-text">最近错误：${escapeHtml(subscription.lastError)}</p>` : ""}
    </section>
  `;
}

function buildReportActionsMarkup(report = null, escapeHtml = (value) => String(value || "")) {
  if (!report || typeof report !== "object") {
    return "";
  }

  if (!report.resultAvailable) {
    return "";
  }

  const htmlPath = String(report.htmlPath || "").trim();
  const reportDataPath = String(report.reportDataPath || "").trim();

  if (!htmlPath && !reportDataPath) {
    return "";
  }

  return `
    <div class="item-actions">
      <button type="button" class="button button-ghost" data-action="refresh-xhs-matched-signals">刷新同类爆文信号</button>
      ${htmlPath ? `<a class="button button-ghost" href="${escapeHtml(htmlPath)}" target="_blank" rel="noreferrer">查看 HTML 报告</a>` : ""}
      ${reportDataPath ? `<a class="button button-ghost" href="${escapeHtml(reportDataPath)}" target="_blank" rel="noreferrer">查看报告 JSON</a>` : ""}
    </div>
  `;
}

export function buildXhsAccountDiagnosisModalMarkup(state = {}, helpers = {}) {
  const { escapeHtml = (value) => String(value || "") } = helpers;
  const result = state?.result && typeof state.result === "object" ? state.result : null;
  const subscription = state?.subscription && typeof state.subscription === "object" ? state.subscription : null;
  const message = String(state?.message || "").trim();
  const canSubscribe = state?.canSubscribe === true;
  const report = state?.report && typeof state.report === "object" ? state.report : null;

  if (!result || typeof result !== "object") {
    return `
      <div class="xhs-account-diagnosis-modal-stack">
        ${message ? `<div class="result-card muted"><strong>提示</strong><p>${escapeHtml(message)}</p></div>` : ""}
        ${
          canSubscribe
            ? `<div class="item-actions"><button type="button" class="button" data-action="subscribe-xhs-account-diagnosis-sync">开始补采，30 分钟后自动重查</button></div>`
            : ""
        }
        ${buildReportActionsMarkup(report, escapeHtml)}
        ${buildSubscriptionStatusMarkup(subscription, escapeHtml)}
        <div class="result-card muted">还没有可展示的账号诊断结果。</div>
      </div>
    `;
  }

  const account = result.account && typeof result.account === "object" ? result.account : {};
  const diagnosis = result.diagnosis && typeof result.diagnosis === "object" ? result.diagnosis : {};
  const similarAccounts = result.similarAccounts && typeof result.similarAccounts === "object" ? result.similarAccounts : {};
  const matchedSignals = result.matchedSignals && typeof result.matchedSignals === "object" ? result.matchedSignals : {};
  const similarFollowups = Array.isArray(result.similarFollowups) ? result.similarFollowups : [];
  const strengths = Array.isArray(diagnosis.strengths) ? diagnosis.strengths : [];
  const risks = Array.isArray(diagnosis.risks) ? diagnosis.risks : [];
  const nextActions = Array.isArray(diagnosis.nextActions) ? diagnosis.nextActions : [];

  return `
    <div class="xhs-account-diagnosis-modal-stack">
      ${message ? `<div class="result-card muted"><strong>提示</strong><p>${escapeHtml(message)}</p></div>` : ""}
      ${
        canSubscribe
          ? `<div class="item-actions"><button type="button" class="button" data-action="subscribe-xhs-account-diagnosis-sync">开始补采，30 分钟后自动重查</button></div>`
          : ""
      }
      ${buildReportActionsMarkup(report, escapeHtml)}
      ${buildSubscriptionStatusMarkup(subscription, escapeHtml)}
      <section class="sample-library-account-planner-summary result-card-shell">
        <div class="tab-panel-head">
          <strong>${escapeHtml(account.nickname || "账号诊断结果")}</strong>
          <span>小红书号 ${escapeHtml(account.redId || "-")}</span>
        </div>
        <p>${escapeHtml(account.desc || "暂无简介")}</p>
        <div class="meta-row">
          <span class="meta-pill">粉丝 ${escapeHtml(formatMetric(account.metrics?.fans))}</span>
          <span class="meta-pill">总赞 ${escapeHtml(formatMetric(account.metrics?.liked))}</span>
          <span class="meta-pill">总藏 ${escapeHtml(formatMetric(account.metrics?.collected))}</span>
          <span class="meta-pill">近30天发文 ${escapeHtml(formatMetric(account.metrics?.noteCountThirty))}</span>
          <span class="meta-pill">近30天互动 ${escapeHtml(formatMetric(account.metrics?.interactiveCountThirty))}</span>
          <span class="meta-pill">诊断分 ${escapeHtml(formatMetric(diagnosis.score))}</span>
        </div>
      </section>

      <section class="sample-library-account-planner-card">
        <strong>诊断结论</strong>
        <p>${escapeHtml(diagnosis.summary || "暂无诊断总结。")}</p>
        ${
          strengths.length
            ? `<div><strong>当前优势</strong><ul>${strengths.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></div>`
            : ""
        }
        ${
          risks.length
            ? `<div><strong>当前风险</strong><ul>${risks.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></div>`
            : ""
        }
        ${
          nextActions.length
            ? `<div><strong>下一步动作</strong><ol>${nextActions.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ol></div>`
            : ""
        }
      </section>

      <section class="sample-library-account-planner-card">
        <strong>同阶对标</strong>
        ${renderAccountList(similarAccounts.peer, escapeHtml)}
      </section>

      <section class="sample-library-account-planner-card">
        <strong>高阶标杆</strong>
        ${renderAccountList(similarAccounts.benchmark, escapeHtml)}
      </section>
      ${renderMatchedSignalSection("同类今日起量", matchedSignals.dailyTop, escapeHtml)}
      ${renderMatchedSignalSection("同类七日稳定", matchedSignals.weeklyTop, escapeHtml)}
      ${renderMatchedSignalSection("同类低粉可复制", matchedSignals.lowTop, escapeHtml)}
      ${renderSimilarFollowups(similarFollowups, escapeHtml)}
    </div>
  `;
}
