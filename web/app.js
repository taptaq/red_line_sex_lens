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

function reviewStatusLabel(status) {
  if (status === "pending_review") return "待复核";
  if (status === "approved") return "已采纳";
  if (status === "rejected") return "已驳回";
  return String(status || "").trim() || "待复核";
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

function compactText(value, maxLength = 80) {
  const text = String(value || "").replace(/\s+/g, " ").trim();

  if (!text) {
    return "";
  }

  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

function activateTab(targetId) {
  document.querySelectorAll(".tab-button[data-tab-target]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.tabTarget === targetId);
  });

  document.querySelectorAll(".tab-panel").forEach((panel) => {
    panel.classList.toggle("is-active", panel.id === targetId);
  });
}

const appState = {
  latestAnalyzePayload: null,
  latestAnalysis: null,
  latestRewrite: null
};

async function readJson(response) {
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload?.error || "请求失败");
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

function providerLabel(provider) {
  if (provider === "glm") return "智谱 GLM";
  if (provider === "qwen") return "通义千问";
  if (provider === "deepseek") return "深度求索";
  return String(provider || "").trim() || "未标记模型";
}

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "未知时间" : date.toLocaleString("zh-CN");
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

function hasAnalyzeInput() {
  const payload = getAnalyzePayload();

  return Boolean(
    String(payload.title || "").trim() ||
      String(payload.body || "").trim() ||
      String(payload.coverText || "").trim() ||
      payload.tags.length
  );
}

function syncAnalyzeActions() {
  const enabled = hasAnalyzeInput();
  const analyzeButton = byId("analyze-button");
  const rewriteButton = byId("rewrite-button");
  const crossReviewButton = byId("cross-review-button");

  if (analyzeButton && !analyzeButton.dataset.busy) {
    analyzeButton.disabled = !enabled;
  }

  if (rewriteButton && !rewriteButton.dataset.busy) {
    rewriteButton.disabled = !enabled;
  }

  if (crossReviewButton && !crossReviewButton.dataset.busy) {
    crossReviewButton.disabled = !enabled;
  }
}

function renderSummary(summary) {
  const cards = [
    ["种子词库", summary.seedLexiconCount],
    ["自定义词库", summary.customLexiconCount],
    ["反馈日志", summary.feedbackCount],
    ["复核队列", summary.reviewQueueCount]
  ];

  byId("summary-grid").innerHTML = cards
    .map(
      ([label, value]) => `
        <div class="summary-card">
          <span>${label}</span>
          <strong>${value}</strong>
        </div>
      `
    )
    .join("");
}

function renderAnalysis(result) {
  const hits = result.hits.length
    ? result.hits
        .map(
          (hit) => `
            <li>
              <strong>${escapeHtml(hit.category)}</strong>
              <span>${escapeHtml(hit.reason)}</span>
            </li>
          `
        )
        .join("")
    : "<li><strong>无命中</strong><span>未检测到明显高风险规则</span></li>";

  const suggestions = result.suggestions.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  const semantic = result.semanticReview?.status === "ok" ? result.semanticReview.review : null;
  const semanticReasons = semantic?.reasons?.length
    ? semantic.reasons.map((item) => `<li>${escapeHtml(item)}</li>`).join("")
    : "<li>当前未返回明确语义原因</li>";
  const semanticSignals = semantic?.implicitSignals?.length
    ? semantic.implicitSignals.map((item) => `<li>${escapeHtml(item)}</li>`).join("")
    : "<li>未检测到明显隐含风险信号</li>";
  const semanticFooter =
    result.semanticReview?.status === "ok"
      ? `<p class="helper-text">语义模型：${escapeHtml(
          `${providerLabel(semantic.provider)} / ${semantic.model || "未标记模型"}`
        )}；置信度：${escapeHtml(formatConfidence(semantic.confidence))}</p>`
      : `<p class="helper-text">${escapeHtml(
          result.semanticReview?.message || "当前未启用语义复判，先展示规则检测结果。"
        )}</p>`;

  byId("analysis-result").innerHTML = `
    <div class="verdict verdict-${result.finalVerdict || result.verdict}">
      <span>综合结论</span>
      <strong>${verdictLabel(result.finalVerdict || result.verdict)}</strong>
      <em>规则分 ${result.score}</em>
    </div>
    <p class="helper-text">规则检测：${escapeHtml(verdictLabel(result.verdict))}；语义复判：${escapeHtml(
      semantic ? verdictLabel(semantic.verdict) : "未启用/未返回"
    )}</p>
    <div class="columns">
      <div>
        <h3>规则命中</h3>
        <ul>${hits}</ul>
      </div>
      <div>
        <h3>规则建议</h3>
        <ul>${suggestions}</ul>
      </div>
    </div>
    <div class="columns">
      <div>
        <h3>语义判断</h3>
        <ul>${semanticReasons}</ul>
      </div>
      <div>
        <h3>隐含信号</h3>
        <ul>${semanticSignals}</ul>
      </div>
    </div>
    <p class="helper-text">语义摘要：${escapeHtml(semantic?.summary || "当前未返回语义摘要")}</p>
    <p class="helper-text">语义改写建议：${escapeHtml(semantic?.suggestion || "暂无补充建议")}</p>
    ${semanticFooter}
  `;
}

function renderRewriteResult(result) {
  if (!result?.rewrite) {
    byId("rewrite-result").innerHTML = '<div class="muted">等待改写</div>';
    return;
  }

  const before = result.beforeAnalysis || result.analysis || {};
  const after = result.afterAnalysis || {};
  const tags = result.rewrite.tags.length
    ? result.rewrite.tags.map((item) => `<li>${escapeHtml(item)}</li>`).join("")
    : "<li>未生成标签</li>";

  byId("rewrite-result").innerHTML = `
    <div class="verdict verdict-${escapeHtml(after.finalVerdict || after.verdict || "observe")}">
      <span>改写完成</span>
      <strong>${escapeHtml(result.rewrite.model || "GLM")}</strong>
      <em>${escapeHtml(verdictLabel(after.finalVerdict || after.verdict || "observe"))}</em>
    </div>
    <p class="helper-text">人味化处理：${escapeHtml(result.rewrite.humanized ? "已启用 humanizer 二次润色" : "未启用或本轮回退到基础改写")}</p>
    <p class="helper-text">综合结论：${escapeHtml(
      verdictLabel(before.finalVerdict || before.verdict || "observe")
    )} -> ${escapeHtml(verdictLabel(after.finalVerdict || after.verdict || "observe"))}</p>
    <p class="helper-text">规则结论：${escapeHtml(verdictLabel(before.verdict || "observe"))} -> ${escapeHtml(
      verdictLabel(after.verdict || "observe")
    )}</p>
    <p class="helper-text">风险分：${escapeHtml(String(before.score ?? 0))} -> ${escapeHtml(String(after.score ?? 0))}</p>
    <div class="rewrite-grid">
      <div class="rewrite-block">
        <strong>改写标题</strong>
        <p>${escapeHtml(result.rewrite.title || "未生成")}</p>
      </div>
      <div class="rewrite-block">
        <strong>改写封面文案</strong>
        <p>${escapeHtml(result.rewrite.coverText || "未生成")}</p>
      </div>
      <div class="rewrite-block">
        <strong>改写正文</strong>
        <p>${escapeHtml(result.rewrite.body || "未生成")}</p>
      </div>
      <div class="rewrite-block">
        <strong>推荐标签</strong>
        <ul>${tags}</ul>
      </div>
    </div>
    <p class="helper-text">改写说明：${escapeHtml(result.rewrite.rewriteNotes || "未提供")}</p>
    <p class="helper-text">人工留意：${escapeHtml(result.rewrite.safetyNotes || "暂无")}</p>
    <p class="helper-text">改写后语义摘要：${escapeHtml(
      after.semanticReview?.status === "ok" ? after.semanticReview.review?.summary || "未提供" : after.semanticReview?.message || "未返回"
    )}</p>
    <div class="item-actions">
      <button type="button" class="button button-small" data-action="prefill-rewrite-pair-current">
        记为前后对照样本
      </button>
    </div>
  `;
}

function renderCrossReviewResult(result) {
  if (!result?.review) {
    byId("cross-review-result").innerHTML = '<div class="muted">等待复判</div>';
    return;
  }

  const providerCards = result.review.providers
    .map((item) => {
      if (item.status === "ok") {
        return `
          <div class="review-provider-card">
            <strong>${escapeHtml(item.label)}</strong>
            <p>模型：${escapeHtml(item.review.model)}</p>
            <p>结论：${escapeHtml(verdictLabel(item.review.verdict))}</p>
            <p>分类：${escapeHtml(joinCSV(item.review.categories) || "未提供")}</p>
            <p>原因：${escapeHtml(joinCSV(item.review.reasons) || item.review.summary || "未提供")}</p>
          </div>
        `;
      }

      return `
        <div class="review-provider-card">
          <strong>${escapeHtml(item.label)}</strong>
          <p>状态：${escapeHtml(item.status === "unconfigured" ? "未配置" : "不可用")}</p>
          <p>${escapeHtml(item.message || "暂无信息")}</p>
        </div>
      `;
    })
    .join("");

  byId("cross-review-result").innerHTML = `
    <div class="verdict verdict-${result.review.aggregate.recommendedVerdict}">
      <span>交叉复判</span>
      <strong>${escapeHtml(verdictLabel(result.review.aggregate.recommendedVerdict))}</strong>
      <em>${escapeHtml(consensusLabel(result.review.aggregate.consensus))}</em>
    </div>
    <p class="helper-text">${result.review.aggregate.availableReviews ? "以下是各模型的复判意见汇总。" : "当前还没有成功返回的复判结果，请先检查模型密钥、权限或超时设置。"}</p>
    <p class="helper-text">规则检测：${escapeHtml(verdictLabel(result.review.aggregate.analysisVerdict || "pass"))}；复判建议：${escapeHtml(verdictLabel(result.review.aggregate.recommendedVerdict))}</p>
    <p class="helper-text">当前可用复判模型：${escapeHtml(String(result.review.aggregate.availableReviews))} / 已配置提供方：${escapeHtml(String(result.review.aggregate.configuredProviders))}</p>
    <p class="helper-text">风险类别：${escapeHtml(joinCSV(result.review.aggregate.categories) || "未提供")}</p>
    <p class="helper-text">误杀信号：${escapeHtml(joinCSV(result.review.aggregate.falsePositiveSignals) || "未发现明显信号")}</p>
    <p class="helper-text">漏判信号：${escapeHtml(joinCSV(result.review.aggregate.falseNegativeSignals) || "未发现明显信号")}</p>
    <div class="review-provider-grid">${providerCards}</div>
  `;
}

function renderQueue(items) {
  byId("review-queue").innerHTML = items.length
    ? items
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
                  : `建议入库：${escapeHtml(matchLabel(item.recommendedLexiconDraft?.match || "exact"))} /
                ${escapeHtml(lexiconLevelLabel(inferLexiconLevel(item.recommendedLexiconDraft?.lexiconLevel, item.recommendedLexiconDraft?.riskLevel || item.suggestedRiskLevel)))} /
                ${escapeHtml(item.recommendedLexiconDraft?.category || item.suggestedCategory || "待人工判断")} /
                ${escapeHtml(verdictLabel(item.recommendedLexiconDraft?.riskLevel || item.suggestedRiskLevel || "manual_review"))}`
              }</p>
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
                  ${item.recommendedLexiconDraft?.blocked ? "disabled" : ""}
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
                  按建议入库
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
        .join("")
    : '<div class="result-card muted">当前没有待复核候选词</div>';
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

function renderLexiconList(containerId, items, scope) {
  const groups = [
    { key: "l1", label: "一级词库" },
    { key: "l2", label: "二级词库" },
    { key: "l3", label: "三级词库" }
  ];

  byId(containerId).innerHTML = items.length
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

function renderFeedbackLog(items) {
  byId("feedback-log-list").innerHTML = items.length
    ? items
        .slice()
        .reverse()
        .map(
          (item) => {
            const notePreview = compactText(item.noteContent || item.body, 96);

            return `
            <article class="admin-item">
              <strong>${escapeHtml(notePreview || "未填写笔记内容")}</strong>
              <div class="meta-row">
                <span class="meta-pill">${escapeHtml(reviewAuditLabel(item.reviewAudit))}</span>
                <span class="meta-pill">${escapeHtml(verdictLabel(item.analysisSnapshot?.verdict || "pass"))}</span>
                <span class="meta-pill">${escapeHtml(item.decision || "未记录处理结果")}</span>
                <span class="meta-pill">${escapeHtml(formatDate(item.createdAt))}</span>
              </div>
              <p>${escapeHtml(item.platformReason || "未记录违规原因")}</p>
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
              <p>
                规则命中：${escapeHtml(joinCSV(item.analysisSnapshot?.categories) || "未发现明显命中")}；
                风险分：${escapeHtml(String(item.analysisSnapshot?.score ?? 0))}
              </p>
              <div class="item-actions">
                <button
                  type="button"
                  class="button button-danger button-small"
                  data-action="delete-feedback"
                  data-note-id="${escapeHtml(item.noteId)}"
                  data-created-at="${escapeHtml(item.createdAt)}"
                >
                  删除
                </button>
              </div>
            </article>
          `;
          }
        )
        .join("")
    : '<div class="result-card muted">当前没有反馈日志</div>';
}

function renderRewritePairList(items) {
  byId("rewrite-pair-list").innerHTML = items.length
    ? items
        .slice()
        .reverse()
        .map(
          (item) => `
            <article class="admin-item">
              <strong>${escapeHtml(item.name || "未命名改写样本")}</strong>
              <div class="meta-row">
                <span class="meta-pill">${escapeHtml(verdictLabel(item.beforeAnalysis?.verdict || "pass"))}</span>
                <span class="meta-pill">${escapeHtml(verdictLabel(item.afterAnalysis?.verdict || "pass"))}</span>
                <span class="meta-pill">风险分 ${escapeHtml(String(item.beforeAnalysis?.score ?? 0))} -> ${escapeHtml(String(item.afterAnalysis?.score ?? 0))}</span>
                <span class="meta-pill">${escapeHtml(formatDate(item.createdAt))}</span>
              </div>
              <p>修改策略：${escapeHtml(item.rewriteStrategy || "未填写")}</p>
              <p>有效改动：${escapeHtml(item.effectiveChanges || "未填写")}</p>
              <p>修改前：${escapeHtml(compactText(item.before?.body || item.before?.title, 96) || "未填写")}</p>
              <p>修改后：${escapeHtml(compactText(item.after?.body || item.after?.title, 96) || "未填写")}</p>
              <div class="item-actions">
                <button
                  type="button"
                  class="button button-danger button-small"
                  data-action="delete-rewrite-pair"
                  data-id="${escapeHtml(item.id)}"
                  data-created-at="${escapeHtml(item.createdAt)}"
                >
                  删除
                </button>
              </div>
            </article>
          `
        )
        .join("")
    : '<div class="result-card muted">当前没有改写前后样本</div>';
}

function renderReviewQueueAdmin(items) {
  byId("review-queue-admin-list").innerHTML = items.length
    ? items
        .map(
          (item) => `
            <article class="admin-item">
              <strong>${escapeHtml(item.phrase)}</strong>
              <div class="meta-row">
                <span class="meta-pill">${escapeHtml(item.priorityLabel || "中优先")}</span>
                <span class="meta-pill">命中 ${escapeHtml(String(item.hitCount || 1))} 次</span>
                <span class="meta-pill">${escapeHtml(matchLabel(item.match || "exact"))}</span>
                <span class="meta-pill">${escapeHtml(item.suggestedCategory || "待人工判断")}</span>
                <span class="meta-pill">${escapeHtml(verdictLabel(item.suggestedRiskLevel || "manual_review"))}</span>
                <span class="meta-pill">${escapeHtml(reviewStatusLabel(item.status || "pending_review"))}</span>
              </div>
              <p>${escapeHtml(item.platformReason || "待补充平台原因")}</p>
              <p>优先级分数：${escapeHtml(String(item.priorityScore || 0))}</p>
              ${
                item.match === "regex" && item.pattern
                  ? `<p>语境规则：<code>${escapeHtml(item.pattern)}</code></p>`
                  : ""
              }
              <p>来源内容：${escapeHtml(compactText(item.sourceNoteExcerpt || item.sourceNoteId, 96) || "未标记")}</p>
              <p>${
                item.recommendedLexiconDraft?.blocked
                  ? `当前不建议直接入库：${escapeHtml(item.recommendedLexiconDraft.blockedReason || "更像平台原因标签")}`
                  : `建议入库：${escapeHtml(matchLabel(item.recommendedLexiconDraft?.match || "exact"))} /
                ${escapeHtml(lexiconLevelLabel(inferLexiconLevel(item.recommendedLexiconDraft?.lexiconLevel, item.recommendedLexiconDraft?.riskLevel || item.suggestedRiskLevel)))} /
                ${escapeHtml(item.recommendedLexiconDraft?.category || item.suggestedCategory || "待人工判断")} /
                ${escapeHtml(verdictLabel(item.recommendedLexiconDraft?.riskLevel || item.suggestedRiskLevel || "manual_review"))}`
              }</p>
              <p>建议原因：${escapeHtml(item.recommendedLexiconDraft?.xhsReason || "暂无建议原因")}</p>
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
                  ${item.recommendedLexiconDraft?.blocked ? "disabled" : ""}
                >
                  填入表单
                </button>
                <button
                  type="button"
                  class="button button-alt button-small"
                  data-action="promote-review"
                  data-id="${escapeHtml(item.id)}"
                  ${item.recommendedLexiconDraft?.blocked ? "disabled" : ""}
                >
                  按建议入库
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
        .join("")
    : '<div class="result-card muted">当前没有待维护的复核项</div>';
}

function renderAdminData(data) {
  renderLexiconList("seed-lexicon-list", data.seedLexicon, "seed");
  renderLexiconList("custom-lexicon-list", data.customLexicon, "custom");
  renderFeedbackLog(data.feedbackLog);
  renderRewritePairList(data.rewritePairs || []);
}

async function refreshAll() {
  const [summary, adminData] = await Promise.all([
    apiJson("/api/summary"),
    apiJson("/api/admin/data")
  ]);

  renderSummary(summary);
  renderQueue(adminData.reviewQueue);
  renderAdminData(adminData);
}

async function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("读取截图失败"));
    reader.readAsDataURL(file);
  });
}

function getAnalyzePayload() {
  const form = new FormData(byId("analyze-form"));

  return {
    title: form.get("title"),
    body: form.get("body"),
    coverText: form.get("coverText"),
    tags: splitCSV(form.get("tags"))
  };
}

function syncRewritePairPrefillButton() {
  const button = byId("rewrite-pair-prefill");

  if (!button) {
    return;
  }

  const enabled = Boolean(appState.latestAnalyzePayload && appState.latestRewrite && appState.latestAnalysis);

  if (!button.dataset.busy) {
    button.disabled = !enabled;
  }
}

function fillRewritePairFormFromCurrent() {
  if (!appState.latestAnalyzePayload || !appState.latestRewrite || !appState.latestAnalysis) {
    return;
  }

  const form = byId("rewrite-pair-form");
  const before = appState.latestAnalyzePayload;
  const after = appState.latestRewrite;

  form.elements.name.value = form.elements.name.value || "当前改写对照样本";
  form.elements.beforeTitle.value = before.title || "";
  form.elements.beforeBody.value = before.body || "";
  form.elements.beforeCoverText.value = before.coverText || "";
  form.elements.beforeTags.value = joinCSV(before.tags || []);
  form.elements.afterTitle.value = after.title || "";
  form.elements.afterBody.value = after.body || "";
  form.elements.afterCoverText.value = after.coverText || "";
  form.elements.afterTags.value = joinCSV(after.tags || []);
  form.elements.rewriteStrategy.value = after.rewriteNotes || form.elements.rewriteStrategy.value;
  form.elements.effectiveChanges.value = after.safetyNotes || form.elements.effectiveChanges.value;
  activateTab("rewrite-pairs-pane");
  byId("rewrite-pair-result").innerHTML =
    '<div class="result-card-shell">已用当前改写结果填充前后样本，可补充平台原因或改写策略后保存。</div>';
}

const analyzeForm = byId("analyze-form");
analyzeForm.addEventListener("input", syncAnalyzeActions);
analyzeForm.addEventListener("change", syncAnalyzeActions);

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

byId("feedback-screenshot").addEventListener("change", async (event) => {
  const file = event.currentTarget.files?.[0];
  feedbackState.recognition = null;

  if (!file) {
    feedbackState.screenshot = null;
    renderScreenshotRecognition(null, null);
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
  }
});

byId("analyze-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const analyzeButton = byId("analyze-button");

  if (!hasAnalyzeInput()) {
    syncAnalyzeActions();
    return;
  }

  setButtonBusy(analyzeButton, true, "检测中...");

  try {
    const result = await apiJson("/api/analyze", {
      method: "POST",
      body: JSON.stringify(getAnalyzePayload())
    });

    appState.latestAnalyzePayload = getAnalyzePayload();
    appState.latestAnalysis = result;
    appState.latestRewrite = null;
    renderAnalysis(result);
  } catch (error) {
    byId("analysis-result").innerHTML = `
      <div class="result-card-shell muted">${escapeHtml(error.message || "检测失败")}</div>
    `;
  } finally {
    setButtonBusy(analyzeButton, false);
    syncAnalyzeActions();
    syncRewritePairPrefillButton();
  }
});

byId("rewrite-button").addEventListener("click", async () => {
  const rewriteButton = byId("rewrite-button");

  if (!hasAnalyzeInput()) {
    syncAnalyzeActions();
    return;
  }

  setButtonBusy(rewriteButton, true, "改写中...");
  byId("rewrite-result").innerHTML =
    '<div class="result-card-shell muted">正在调用 GLM 生成合规改写...</div>';

  try {
    const result = await apiJson("/api/rewrite", {
      method: "POST",
      body: JSON.stringify(getAnalyzePayload())
    });

    appState.latestAnalyzePayload = getAnalyzePayload();
    appState.latestAnalysis = result.analysis;
    appState.latestRewrite = result.rewrite;
    renderAnalysis(result.analysis);
    renderRewriteResult(result);
  } catch (error) {
    byId("rewrite-result").innerHTML = `
      <div class="result-card-shell muted">${escapeHtml(error.message || "改写失败")}</div>
    `;
  } finally {
    setButtonBusy(rewriteButton, false);
    syncAnalyzeActions();
    syncRewritePairPrefillButton();
  }
});

byId("cross-review-button").addEventListener("click", async () => {
  const crossReviewButton = byId("cross-review-button");

  if (!hasAnalyzeInput()) {
    syncAnalyzeActions();
    return;
  }

  setButtonBusy(crossReviewButton, true, "复判中...");
  byId("cross-review-result").innerHTML =
    '<div class="result-card-shell muted">正在调用不同模型进行交叉复判...</div>';

  try {
    const result = await apiJson("/api/cross-review", {
      method: "POST",
      body: JSON.stringify(getAnalyzePayload())
    });

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

byId("feedback-recognize").addEventListener("click", async () => {
  const recognizeButton = byId("feedback-recognize");

  if (!feedbackState.screenshot) {
    byId("feedback-screenshot-result").innerHTML =
      '<div class="result-card-shell muted">请先选择一张违规截图。</div>';
    return;
  }

  byId("feedback-screenshot-result").innerHTML =
    '<div class="result-card-shell muted">正在调用 GLM 识别截图...</div>';
  setButtonBusy(recognizeButton, true, "识别中...");

  try {
    const result = await apiJson("/api/feedback/extract-screenshot", {
      method: "POST",
      body: JSON.stringify({ screenshot: feedbackState.screenshot })
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
  }
});

byId("feedback-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const formElement = event.currentTarget;
  const submitButton = formElement.querySelector('button[type="submit"]');
  const form = new FormData(formElement);
  setButtonBusy(submitButton, true, "写入中...");

  try {
    const result = await apiJson("/api/feedback", {
      method: "POST",
      body: JSON.stringify({
        noteContent: form.get("noteContent"),
        platformReason: form.get("platformReason"),
        suspiciousPhrases: splitCSV(form.get("suspiciousPhrases")),
        screenshot: feedbackState.screenshot,
        screenshotRecognition: feedbackState.recognition
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
  }
});

async function handleLexiconSubmit(event, scope, resultId, busyText) {
  event.preventDefault();
  const formElement = event.currentTarget;
  const submitButton = formElement.querySelector('button[type="submit"]');
  const form = new FormData(formElement);
  setButtonBusy(submitButton, true, busyText);

  try {
    await apiJson("/api/admin/lexicon", {
      method: "POST",
      body: JSON.stringify({
        scope,
        entry: buildLexiconEntry(form)
      })
    });

    byId(resultId).innerHTML = '<div class="result-card-shell">操作成功，列表已更新。</div>';
    formElement.reset();
    await refreshAll();
  } catch (error) {
    byId(resultId).innerHTML = `
      <div class="result-card-shell muted">${escapeHtml(error.message || "保存失败")}</div>
    `;
  } finally {
    setButtonBusy(submitButton, false);
  }
}

byId("seed-lexicon-form").addEventListener("submit", (event) =>
  handleLexiconSubmit(event, "seed", "seed-lexicon-result", "保存中...")
);

byId("custom-lexicon-form").addEventListener("submit", (event) =>
  handleLexiconSubmit(event, "custom", "custom-lexicon-result", "保存中...")
);

byId("rewrite-pair-prefill").addEventListener("click", () => {
  fillRewritePairFormFromCurrent();
});

byId("rewrite-pair-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const formElement = event.currentTarget;
  const submitButton = formElement.querySelector('button[type="submit"]');
  const form = new FormData(formElement);
  setButtonBusy(submitButton, true, "保存中...");

  try {
    const result = await apiJson("/api/rewrite-pairs", {
      method: "POST",
      body: JSON.stringify({
        name: form.get("name"),
        beforePlatformReason: form.get("beforePlatformReason"),
        rewriteStrategy: form.get("rewriteStrategy"),
        effectiveChanges: form.get("effectiveChanges"),
        rewriteModel: appState.latestRewrite?.model || "",
        before: {
          title: form.get("beforeTitle"),
          body: form.get("beforeBody"),
          coverText: form.get("beforeCoverText"),
          tags: splitCSV(form.get("beforeTags"))
        },
        after: {
          title: form.get("afterTitle"),
          body: form.get("afterBody"),
          coverText: form.get("afterCoverText"),
          tags: splitCSV(form.get("afterTags"))
        }
      })
    });

    byId("rewrite-pair-result").innerHTML = `
      <div class="verdict verdict-observe">
        <span>样本已保存</span>
        <strong>${escapeHtml(verdictLabel(result.beforeAnalysis?.verdict || "pass"))} -> ${escapeHtml(
          verdictLabel(result.afterAnalysis?.verdict || "pass")
        )}</strong>
        <em>风险分 ${escapeHtml(String(result.beforeAnalysis?.score ?? 0))} -> ${escapeHtml(
          String(result.afterAnalysis?.score ?? 0)
        )}</em>
      </div>
    `;
    formElement.reset();
    await refreshAll();
  } catch (error) {
    byId("rewrite-pair-result").innerHTML = `
      <div class="result-card-shell muted">${escapeHtml(error.message || "保存改写样本失败")}</div>
    `;
  } finally {
    setButtonBusy(submitButton, false);
  }
});

document.querySelectorAll(".tab-button[data-tab-target]").forEach((button) => {
  button.addEventListener("click", () => activateTab(button.dataset.tabTarget));
});

activateTab("custom-lexicon-pane");

document.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");

  if (!button) {
    return;
  }

  const action = button.dataset.action;

  if (action === "prefill-custom-draft") {
    const form = byId("custom-lexicon-form");

    form.elements.match.value = button.dataset.match || "exact";
    form.elements.source.value = button.dataset.source || "";
    form.elements.category.value = button.dataset.category || "";
    form.elements.riskLevel.value = button.dataset.riskLevel || "manual_review";
    form.elements.lexiconLevel.value = button.dataset.lexiconLevel || inferLexiconLevel("", button.dataset.riskLevel);
    form.elements.xhsReason.value = button.dataset.xhsReason || "";
    activateTab("custom-lexicon-pane");
    byId("custom-lexicon-result").innerHTML =
      '<div class="result-card-shell">已将推荐草稿填入自定义词库表单，可先调整再保存。</div>';
    return;
  }

  if (action === "prefill-rewrite-pair-current") {
    fillRewritePairFormFromCurrent();
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

    if (action === "delete-feedback") {
      await apiJson("/api/admin/feedback", {
        method: "DELETE",
        body: JSON.stringify({
          noteId: button.dataset.noteId,
          createdAt: button.dataset.createdAt
        })
      });
    }

    if (action === "delete-rewrite-pair") {
      await apiJson("/api/admin/rewrite-pairs", {
        method: "DELETE",
        body: JSON.stringify({
          id: button.dataset.id,
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

    await refreshAll();
  } catch (error) {
    const target =
      button.closest(".admin-item") || byId("feedback-result") || byId("custom-lexicon-result");
    target.insertAdjacentHTML(
      "beforeend",
      `<p class="helper-text">${escapeHtml(error.message || "操作失败")}</p>`
    );
  } finally {
    setButtonBusy(button, false);
  }
});

refreshAll().catch((error) => {
  byId("analysis-result").innerHTML = `
    <div class="result-card-shell muted">${escapeHtml(error.message || "初始化失败")}</div>
  `;
});

syncAnalyzeActions();
syncRewritePairPrefillButton();
