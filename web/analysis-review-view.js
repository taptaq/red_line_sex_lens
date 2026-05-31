function localEscapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function localVerdictLabel(value = "") {
  const normalized = String(value || "").trim();

  if (normalized === "hard_block") return "高风险拦截";
  if (normalized === "manual_review") return "人工复核";
  if (normalized === "observe") return "观察通过";
  if (normalized === "pass") return "通过";

  return normalized || "通过";
}

export const platformOutcomeOptions = [
  { status: "published_passed", label: "平台通过", note: "平台通过，已记录为可观察样本。" },
  { status: "violation", label: "平台违规", note: "平台反馈违规，已记录为检测校准信号。" },
  { status: "positive_performance", label: "效果好", note: "平台通过且表现好，已作为生成风格参考。" },
  { status: "limited", label: "效果一般", note: "平台通过但表现一般，已记录为待观察样本。" },
  { status: "false_positive", label: "系统误判", note: "平台放行但系统偏严，已进入误判降权候选。" }
];

export function getPlatformOutcomeOption(status = "published_passed") {
  return platformOutcomeOptions.find((item) => item.status === String(status || "").trim()) || platformOutcomeOptions[0] || {};
}

export function buildPlatformOutcomeActions(source = "analysis", options = {}, helpers = {}) {
  const escapeHtml = helpers.escapeHtml || localEscapeHtml;
  const candidateId = options.candidateId || "";
  const candidateIndex = options.candidateIndex ?? "";
  const buttons = platformOutcomeOptions
    .map(
      (item) => `
        <button
          type="button"
          class="button button-ghost button-small"
          data-action="save-platform-outcome"
          data-source="${escapeHtml(source)}"
          data-publish-status="${escapeHtml(item.status)}"
          data-note="${escapeHtml(item.note)}"
          data-candidate-id="${escapeHtml(candidateId)}"
          data-candidate-index="${escapeHtml(String(candidateIndex))}"
        >
          ${escapeHtml(item.label)}
        </button>
      `
    )
    .join("");

  return `
    <div class="platform-outcome-actions">
      <span class="helper-text">平台结果回填</span>
      <div class="item-actions">${buttons}</div>
    </div>
  `;
}

export function buildPlatformOutcomeModalMarkup({ publishStatus = "published_passed", notes = "", views = 0, shares = 0 } = {}, helpers = {}) {
  const escapeHtml = helpers.escapeHtml || localEscapeHtml;
  const getOption = helpers.getPlatformOutcomeOption || getPlatformOutcomeOption;
  const option = getOption(publishStatus);

  return `
    <div class="sample-library-modal-stack compact-form">
      <section class="sample-library-modal-section">
        <div class="sample-library-modal-section-head">
          <strong>${escapeHtml(option.label || "平台结果回填")}</strong>
          <p>${escapeHtml(option.note || "补充这次平台结果的关键回填信息。")}</p>
        </div>
        <div class="sample-library-modal-grid">
          <label>
            <span>平台结果</span>
            <input value="${escapeHtml(option.label || "平台结果")}" disabled />
          </label>
          <label>
            <span>浏览数</span>
            <input name="platformOutcomeViews" type="number" min="0" value="${escapeHtml(String(views || 0))}" />
          </label>
          <label>
            <span>分享数</span>
            <input name="platformOutcomeShares" type="number" min="0" value="${escapeHtml(String(shares || 0))}" />
          </label>
        </div>
        <label>
          <span>回填备注</span>
          <textarea name="platformOutcomeNotes" rows="3" placeholder="例如：发布 24h 后稳定通过">${escapeHtml(notes || option.note || "")}</textarea>
        </label>
      </section>
    </div>
  `;
}

export function renderAnalysis(result, falsePositiveSource = null, helpers = {}) {
  const {
    byId,
    escapeHtml = localEscapeHtml,
    verdictLabel,
    providerLabel,
    formatConfidence,
    buildFalsePositiveActionMarkup,
    describeMemoryCalibration,
    buildPlatformOutcomeActions,
    syncLifecycleResultActions
  } = helpers;

  const falsePositiveMarkup = falsePositiveSource ? buildFalsePositiveActionMarkup(falsePositiveSource) : "";
  const externalSensitiveWords =
    result?.externalSensitiveWords && typeof result.externalSensitiveWords === "object" ? result.externalSensitiveWords : null;
  const analysisCompleteness =
    result?.analysisCompleteness && typeof result.analysisCompleteness === "object" ? result.analysisCompleteness : null;
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
  const ruleModelLabel = escapeHtml(result.modelTrace?.label || "本地规则引擎 / 规则词库 + 组合规则");
  const semanticAttemptLabels = (Array.isArray(result.semanticReview?.providersTried) ? result.semanticReview.providersTried : [])
    .flatMap((item) => {
      const attempts = Array.isArray(item.attemptedRoutes) && item.attemptedRoutes.length
        ? item.attemptedRoutes
        : [{ routeLabel: item.routeLabel || "", model: item.model || "" }];

      return attempts
        .map((attempt) => [attempt.routeLabel || "", providerLabel(item.provider), attempt.model || ""].filter(Boolean).join(" / "))
        .filter(Boolean);
    });
  const semanticAttemptMessages = (Array.isArray(result.semanticReview?.providersTried) ? result.semanticReview.providersTried : [])
    .flatMap((item) => {
      const attempts = Array.isArray(item.attemptedRoutes) && item.attemptedRoutes.length ? item.attemptedRoutes : [item];

      return attempts
        .map((attempt) => {
          const label = [attempt.routeLabel || item.routeLabel || "", providerLabel(item.provider), attempt.model || item.model || ""]
            .filter(Boolean)
            .join(" / ");
          const message = String(attempt.message || item.message || "").trim();

          if (!label && !message) {
            return "";
          }

          return message ? `${label}：${message}` : label;
        })
        .filter(Boolean);
    });
  const semanticModelLabel = semantic
    ? escapeHtml(
        semantic.modelTrace?.label ||
          [semantic.routeLabel || "", providerLabel(semantic.provider), semantic.model || "未标记模型"].filter(Boolean).join(" / ")
      )
    : "";
  const semanticReasons = semantic?.reasons?.length
    ? semantic.reasons.map((item) => `<li>${escapeHtml(item)}</li>`).join("")
    : "<li>当前未返回明确语义原因</li>";
  const semanticSignals = semantic?.implicitSignals?.length
    ? semantic.implicitSignals.map((item) => `<li>${escapeHtml(item)}</li>`).join("")
    : "<li>未检测到明显隐含风险信号</li>";
  const semanticFooter =
    result.semanticReview?.status === "ok"
      ? `<p class="helper-text">语义复判模型：${semanticModelLabel}；置信度：${escapeHtml(formatConfidence(semantic.confidence))}</p>`
      : semanticAttemptLabels.length
        ? `<p class="helper-text">${escapeHtml(
            `语义复判未成功。已尝试以下模型：${semanticAttemptLabels.join("；")}${
              semanticAttemptMessages.length ? `。失败原因：${semanticAttemptMessages.join("；")}` : ""
            }`
          )}</p>`
        : `<p class="helper-text">${escapeHtml(
            result.semanticReview?.message
              ? `语义复判模型：本地检测（未调用模型）。${result.semanticReview.message}`
              : "语义复判模型：本地检测（未调用模型）"
          )}</p>`;
  const falsePositiveHints = Array.isArray(result.falsePositiveHints) ? result.falsePositiveHints : [];
  const whitelistHits = Array.isArray(result.whitelistHits) ? result.whitelistHits : [];
  const referenceSampleHints = Array.isArray(result.referenceSampleHints) ? result.referenceSampleHints : [];
  const downgradeEvidence = [
    ...falsePositiveHints.map((item) => `规则偏严反例：${item.title || item.sourceId || "已确认误报样本"}`),
    ...whitelistHits.map((item) => `宽松白名单：${item.phrase || item}`)
  ];
  const downgradeMarkup = downgradeEvidence.length
    ? `
      <div class="model-scope-banner">
        <span class="model-scope-kicker">降权提示</span>
        <strong>${escapeHtml(result.softenedByFalsePositive ? "已按反例信号降为观察" : "发现可参考的反例信号")}</strong>
        <p>${escapeHtml(downgradeEvidence.join("；"))}</p>
      </div>
    `
    : "";
  const externalSummaryPills = externalSensitiveWords
    ? [
        externalSensitiveWords.platform === "xiaohongshu" ? "外部违禁词：小红书" : "",
        externalSensitiveWords.hitCount > 0 ? `命中 ${externalSensitiveWords.hitCount} 项` : "未命中外部违禁词",
        externalSensitiveWords.status === "ok" && externalSensitiveWords.severity
          ? `外部等级 ${escapeHtml(verdictLabel(externalSensitiveWords.severity))}`
          : "",
        externalSensitiveWords.raisedVerdict ? "外部检测抬高了结论" : "",
        analysisCompleteness?.isComplete === false ? "结果不完整" : ""
      ]
        .filter(Boolean)
        .map((item) => `<span class="meta-pill meta-pill-soft">${item}</span>`)
        .join("")
    : "";
  const externalSuggestionsMarkup =
    externalSensitiveWords?.status === "ok" && Array.isArray(externalSensitiveWords.suggestions) && externalSensitiveWords.suggestions.length
      ? `<ul>${externalSensitiveWords.suggestions
          .map(
            (item) =>
              `<li><strong>${escapeHtml(item.term || "未命名词")}</strong> -> ${escapeHtml(item.replacement || "未提供替换词")} ${
                item.reason ? `（${escapeHtml(item.reason)}）` : ""
              }</li>`
          )
          .join("")}</ul>`
      : externalSensitiveWords?.status === "error"
        ? `<p class="helper-text">结果不完整：外部违禁词检测失败。${escapeHtml(externalSensitiveWords.message || "")}</p>`
        : "<p class=\"helper-text\">当前未命中外部违禁词。</p>";
  const externalOptimizedTextMarkup =
    externalSensitiveWords?.status === "ok" && String(externalSensitiveWords.optimizedText || "").trim()
      ? `<div><strong>外部建议优化文案</strong><p>${escapeHtml(externalSensitiveWords.optimizedText)}</p></div>`
      : "";
  const referenceSampleEvidence = referenceSampleHints
    .map((item) => String(item?.message || item?.title || "").trim())
    .filter(Boolean);
  const referenceSampleMarkup = referenceSampleEvidence.length
    ? `
      <div class="model-scope-banner">
        <span class="model-scope-kicker">参考样本提示</span>
        <strong>${escapeHtml(result.softenedByReferenceSamples ? "已按参考样本降为观察" : "发现可参考的安全样本")}</strong>
        <p>${escapeHtml(referenceSampleEvidence.join("；"))}</p>
      </div>
    `
    : "";
  const memoryCalibrationKicker = "长期记忆校准";
  const memoryCalibrationLead = "基础合并结论";
  const memoryCalibrationSafeLabel = "安全放宽";
  const memoryCalibrationRiskLabel = "风险上调";
  const memoryCalibrationSafeToneClass = "model-scope-banner-memory-safe";
  const memoryCalibrationRiskToneClass = "model-scope-banner-memory-risk";
  const memoryCalibrationSummary = describeMemoryCalibration(result.memoryCalibration);
  const memoryCalibrationMarkup = memoryCalibrationSummary
    ? `
      <div class="model-scope-banner model-scope-banner-review ${escapeHtml(memoryCalibrationSummary.toneClass || "")}">
        <span class="model-scope-kicker">${memoryCalibrationKicker}</span>
        <span class="memory-calibration-label">${escapeHtml(
          memoryCalibrationSummary.label ||
            (memoryCalibrationSummary.toneClass === memoryCalibrationSafeToneClass
              ? memoryCalibrationSafeLabel
              : memoryCalibrationRiskLabel)
        )}</span>
        <strong>${escapeHtml(memoryCalibrationSummary.title)}</strong>
        <p>${escapeHtml(memoryCalibrationSummary.detail || `${memoryCalibrationLead}已结合长期记忆校准。`)}</p>
      </div>
    `
    : "";

  byId("analysis-result").innerHTML = `
    <div class="verdict verdict-${result.finalVerdict || result.verdict}">
      <span>综合结论</span>
      <strong>${verdictLabel(result.finalVerdict || result.verdict)}</strong>
      <em>规则分 ${result.score}</em>
    </div>
    <p class="helper-text">规则检测：${escapeHtml(verdictLabel(result.verdict))}；语义复判：${escapeHtml(
      semantic ? verdictLabel(semantic.verdict) : "未启用/未返回"
    )}</p>
    <p class="helper-text">规则检测模型：${ruleModelLabel}</p>
    ${memoryCalibrationMarkup}
    ${referenceSampleMarkup}
    ${
      externalSensitiveWords
        ? `
      <div>
        <h3>外部违禁词摘要</h3>
        <div class="meta-row">${externalSummaryPills}</div>
        ${
          analysisCompleteness?.isComplete === false
            ? `<p class="helper-text">结果不完整：外部违禁词检测失败</p>`
            : ""
        }
      </div>
    `
        : ""
    }
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
    ${
      externalSensitiveWords
        ? `
      <div>
        <h3>外部违禁词命中与建议</h3>
        ${externalSuggestionsMarkup}
        ${externalOptimizedTextMarkup}
      </div>
    `
        : ""
    }
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
    ${downgradeMarkup}
    ${falsePositiveMarkup}
    <div class="item-actions">
      <button type="button" class="button button-small" data-action="save-lifecycle-analysis">
        保存为生命周期记录
      </button>
    </div>
    ${buildPlatformOutcomeActions("analysis")}
    <p class="helper-text action-gate-hint" id="analysis-lifecycle-action-hint" aria-live="polite"></p>
  `;
  syncLifecycleResultActions();
}

export function renderRewriteResult(result, helpers = {}) {
  const {
    byId,
    escapeHtml = localEscapeHtml,
    normalizeRewritePayload,
    verdictLabel,
    providerLabel,
    uniqueStrings,
    buildRewriteBodyMarkup,
    buildCrossReviewMarkup,
    buildPlatformOutcomeActions,
    syncLifecycleResultActions
  } = helpers;

  if (!result?.rewrite) {
    byId("rewrite-result").innerHTML = '<div class="muted">等待改写</div>';
    return;
  }

  const rewrite = normalizeRewritePayload(result.rewrite);
  const before = result.beforeAnalysis || result.analysis || {};
  const after = result.afterAnalysis || {};
  const tags = rewrite.tags.length
    ? rewrite.tags.map((item) => `<li>${escapeHtml(item)}</li>`).join("")
    : "<li>未生成标签</li>";
  const embeddedCrossReview = result.afterCrossReview
    ? `
        <section class="rewrite-followup">
          <div class="rewrite-followup-head">
            <strong>改写后交叉复判</strong>
            <span>自动对改写后的版本再次做多模型复判，方便直接看最终一致性。</span>
          </div>
          ${buildCrossReviewMarkup(result.afterCrossReview, { embedded: true })}
        </section>
      `
    : "";
  const rewriteSummary = result.rewriteAccepted
    ? `本次自动改写 ${result.rewriteAttempts || 1} 轮，复判结果已达到通过区间。`
    : `本次已自动改写 ${result.rewriteAttempts || 1} 轮，但结果仍需人工复核，建议继续人工改写。`;
  const rewriteProviderName = providerLabel(rewrite.provider);
  const retryRounds = (Array.isArray(result.rounds) ? result.rounds : []).filter(
    (round) => round?.guidance && Array.isArray(round.guidance.focusPoints) && round.guidance.focusPoints.length
  );
  const retryGuidanceMarkup = retryRounds.length
    ? `
        <section class="rewrite-followup">
          <div class="rewrite-followup-head">
            <strong>逐轮修正建议</strong>
            <span>每轮没过的时候，系统会把当轮复判暴露出来的风险点整理成下一轮改写提示，避免盲目重复改写。</span>
          </div>
          <div class="rewrite-iteration-grid">
            ${retryRounds
              .map((round) => {
                const normalizedRoundRewrite = normalizeRewritePayload(round.rewrite);
                const focusPoints = round.guidance.focusPoints
                  .map((item) => `<li>${escapeHtml(item)}</li>`)
                  .join("");
                const actualChanges = (
                  normalizedRoundRewrite.appliedPatches.length
                    ? normalizedRoundRewrite.appliedPatches.map((patch) => {
                        const changeSummary = patch.target && patch.replaceWith ? `${patch.target} -> ${patch.replaceWith}` : patch.replaceWith;
                        const meta = uniqueStrings([patch.addresses, patch.reason]).join("；");

                        return `<li><strong>${escapeHtml(patch.field)}</strong>：${escapeHtml(changeSummary || "已做局部修补")}${
                          meta ? `（${escapeHtml(meta)}）` : ""
                        }</li>`;
                      })
                    : [
                        `<li>${escapeHtml(
                          normalizedRoundRewrite.rewriteNotes ||
                            (normalizedRoundRewrite.rewriteMode === "field_fallback"
                              ? "本轮改为字段级兜底重写"
                              : "本轮未返回可展示的局部 patch")
                        )}</li>`
                      ]
                ).join("");
                const remainingRisks = uniqueStrings([
                  ...(round.afterAnalysis?.suggestions || []),
                  ...(round.afterAnalysis?.semanticReview?.status === "ok"
                    ? round.afterAnalysis.semanticReview.review?.reasons || []
                    : []),
                  ...(round.afterCrossReview?.aggregate?.reasons || []),
                  ...(round.afterCrossReview?.aggregate?.falseNegativeSignals || [])
                ])
                  .slice(0, 5)
                  .map((item) => `<li>${escapeHtml(item)}</li>`)
                  .join("");

                return `
                  <article class="rewrite-iteration-card">
                    <div class="rewrite-iteration-head">
                      <strong>第 ${escapeHtml(String(round.attempt || 0))} 轮复盘</strong>
                      <span>${escapeHtml(
                        `${verdictLabel(round.guidance.mergedVerdict || "manual_review")} / ${verdictLabel(
                          round.guidance.reviewVerdict || "manual_review"
                        )}`
                      )}</span>
                    </div>
                    <p>${escapeHtml(round.guidance.summary || "未提供摘要")}</p>
                    <div class="rewrite-iteration-section">
                      <strong>系统建议</strong>
                      <ul>${focusPoints}</ul>
                    </div>
                    <div class="rewrite-iteration-section">
                      <strong>实际修改</strong>
                      <ul>${actualChanges}</ul>
                    </div>
                    <div class="rewrite-iteration-section">
                      <strong>剩余风险</strong>
                      <ul>${remainingRisks || "<li>本轮未返回额外剩余风险</li>"}</ul>
                    </div>
                  </article>
                `;
              })
              .join("")}
          </div>
        </section>
      `
    : "";

  byId("rewrite-result").innerHTML = `
    <div class="rewrite-hero">
      <div class="verdict verdict-${escapeHtml(after.finalVerdict || after.verdict || "observe")}">
        <span>改写完成</span>
        <strong>${escapeHtml(rewrite.model || "GLM")}</strong>
        <em>${escapeHtml(verdictLabel(after.finalVerdict || after.verdict || "observe"))}</em>
      </div>
      <div class="rewrite-meta-grid">
        <article class="rewrite-meta-card">
          <span>改写模型来源</span>
          <strong>${escapeHtml(rewriteProviderName)}</strong>
        </article>
        <article class="rewrite-meta-card">
          <span>人味化处理</span>
          <strong>${escapeHtml(rewrite.humanized ? "已启用 humanizer 二次润色" : "未启用或本轮回退到基础改写")}</strong>
        </article>
        <article class="rewrite-meta-card">
          <span>综合结论</span>
          <strong>${escapeHtml(verdictLabel(before.finalVerdict || before.verdict || "observe"))} -> ${escapeHtml(
      verdictLabel(after.finalVerdict || after.verdict || "observe")
    )}</strong>
        </article>
        <article class="rewrite-meta-card">
          <span>规则结论</span>
          <strong>${escapeHtml(verdictLabel(before.verdict || "observe"))} -> ${escapeHtml(
      verdictLabel(after.verdict || "observe")
    )}</strong>
        </article>
        <article class="rewrite-meta-card">
          <span>风险分</span>
          <strong>${escapeHtml(String(before.score ?? 0))} -> ${escapeHtml(String(after.score ?? 0))}</strong>
        </article>
        <article class="rewrite-meta-card">
          <span>活人感</span>
          <strong>${escapeHtml(String(rewrite.humanizer?.total ?? "-"))} / 50</strong>
        </article>
      </div>
    </div>
    <div class="model-scope-banner model-scope-banner-rewrite">
      <span class="model-scope-kicker">改写模型来源</span>
      <strong>${escapeHtml(rewriteProviderName)}</strong>
      <p>本区只展示改写模型输出。交叉复判始终使用独立复判模型，不会复用当前改写模型。</p>
    </div>
    <p class="helper-text">${escapeHtml(rewriteSummary)}</p>
    ${retryGuidanceMarkup}
    <div class="rewrite-grid">
      <div class="rewrite-block">
        <strong>改写标题</strong>
        <p>${escapeHtml(rewrite.title || "未生成")}</p>
      </div>
      <div class="rewrite-block">
        <strong>改写封面文案</strong>
        <p>${escapeHtml(rewrite.coverText || "未生成")}</p>
      </div>
      <div class="rewrite-block rewrite-block-body">
        <strong>改写正文</strong>
        ${buildRewriteBodyMarkup(rewrite.body)}
      </div>
      <div class="rewrite-block">
        <strong>推荐标签</strong>
        <ul>${tags}</ul>
      </div>
    </div>
    <p class="helper-text">改写说明：${escapeHtml(rewrite.rewriteNotes || "未提供")}</p>
    <p class="helper-text">人工留意：${escapeHtml(rewrite.safetyNotes || "暂无")}</p>
    <p class="helper-text">去 AI 痕迹：${escapeHtml((rewrite.humanizer?.issues || []).slice(0, 3).join("；") || "当前活人感信号稳定。")}</p>
    <p class="helper-text">改写后语义摘要：${escapeHtml(
      after.semanticReview?.status === "ok" ? after.semanticReview.review?.summary || "未提供" : after.semanticReview?.message || "未返回"
    )}</p>
    ${embeddedCrossReview}
    <div class="item-actions">
      <button type="button" class="button button-small" data-action="save-lifecycle-rewrite">
        保存改写稿生命周期
      </button>
    </div>
    ${buildPlatformOutcomeActions("rewrite")}
    <p class="helper-text action-gate-hint" id="rewrite-lifecycle-action-hint" aria-live="polite"></p>
  `;
  syncLifecycleResultActions();
}

export function buildCrossReviewMarkup(review, { embedded = false } = {}, helpers = {}) {
  const {
    escapeHtml = localEscapeHtml,
    verdictLabel,
    consensusLabel,
    providerLabel,
    formatConfidence,
    joinCSV,
    renderInfoPills
  } = helpers;

  if (!review) {
    return '<div class="muted">等待复判</div>';
  }

  const aggregate = review.aggregate || {};
  const recommendedVerdict = aggregate.recommendedVerdict || "manual_review";
  const analysisVerdict = aggregate.analysisVerdict || "pass";
  const consensus = aggregate.consensus || "unavailable";
  const availableReviews = Number(aggregate.availableReviews || 0);
  const configuredProviders = Number(aggregate.configuredProviders || 0);
  const providerCards = (review.providers || [])
    .map((item) => {
      if (item.status === "ok") {
        return `
          <article class="review-provider-card review-provider-card-ok">
            <div class="review-provider-head">
              <div>
                <strong>${escapeHtml(item.label)}</strong>
                <p class="review-provider-model">${escapeHtml(item.review.model || "未标记模型")}</p>
              </div>
              <span class="review-status-pill review-status-pill-ok">已返回</span>
            </div>
            <div class="meta-row">
              <span class="meta-pill review-pill-strong">${escapeHtml(verdictLabel(item.review.verdict))}</span>
              <span class="meta-pill">置信度 ${escapeHtml(formatConfidence(item.review.confidence))}</span>
            </div>
            <div class="review-provider-summary">
              <span>一句话总结</span>
              <p>${escapeHtml(item.review.summary || "当前模型未补充摘要")}</p>
            </div>
            <div class="review-provider-block">
              <span>风险类别</span>
              <div class="meta-row">${renderInfoPills(item.review.categories, "未提供", "meta-pill-soft")}</div>
            </div>
            <div class="review-provider-block">
              <span>复判原因</span>
              <p>${escapeHtml(joinCSV(item.review.reasons) || "未提供")}</p>
            </div>
            <div class="review-provider-split">
              <div class="review-provider-block">
                <span>误杀提示</span>
                <p>${escapeHtml(item.review.falsePositiveRisk || "未发现明显信号")}</p>
              </div>
              <div class="review-provider-block">
                <span>漏判提示</span>
                <p>${escapeHtml(item.review.falseNegativeRisk || "未发现明显信号")}</p>
              </div>
            </div>
          </article>
        `;
      }

      return `
        <article class="review-provider-card review-provider-card-muted">
          <div class="review-provider-head">
            <div>
              <strong>${escapeHtml(item.label)}</strong>
              <p class="review-provider-model">${escapeHtml(item.model || "未标记模型")}</p>
            </div>
            <span class="review-status-pill ${
              item.status === "unconfigured" ? "review-status-pill-muted" : "review-status-pill-warn"
            }">${escapeHtml(item.status === "unconfigured" ? "未配置" : "不可用")}</span>
          </div>
          <div class="review-provider-block">
            <span>状态说明</span>
            <p>${escapeHtml(item.message || "暂无信息")}</p>
          </div>
        </article>
      `;
    })
    .join("");

  return `
    <section class="cross-review-shell${embedded ? " is-embedded" : ""}">
      <div class="cross-review-top">
        <div class="verdict verdict-${recommendedVerdict}">
          <span>交叉复判</span>
          <strong>${escapeHtml(verdictLabel(recommendedVerdict))}</strong>
          <em>${escapeHtml(consensusLabel(consensus))}</em>
        </div>
        <div class="cross-review-intro">
          <strong>${availableReviews ? "多模型复判已完成" : "当前暂无成功复判结果"}</strong>
          <p class="helper-text">${
            availableReviews
              ? "下面按总览、风险信号、模型意见三个层次展示，方便你快速判断是否需要人工复核。"
              : "请先检查模型密钥、权限或超时设置，当前还没有可用的复判返回。"
          }</p>
        </div>
      </div>

      <div class="model-scope-banner model-scope-banner-review">
        <span class="model-scope-kicker">复判模型组</span>
        <strong>按当前可用复判模型组逐个比对</strong>
        <p>当前交叉复判会自动避开已选改写模型，确保复判模型不与改写模型重复，避免同模型自己给自己复判。</p>
      </div>

      <div class="cross-review-stats">
        <article class="cross-review-stat">
          <span>规则检测</span>
          <strong>${escapeHtml(verdictLabel(analysisVerdict))}</strong>
        </article>
        <article class="cross-review-stat">
          <span>复判建议</span>
          <strong>${escapeHtml(verdictLabel(recommendedVerdict))}</strong>
        </article>
        <article class="cross-review-stat">
          <span>共识状态</span>
          <strong>${escapeHtml(consensusLabel(consensus))}</strong>
        </article>
        <article class="cross-review-stat">
          <span>模型可用数</span>
          <strong>${escapeHtml(String(availableReviews))} / ${escapeHtml(String(configuredProviders))}</strong>
        </article>
      </div>

      <div class="cross-review-signals">
        <article class="cross-review-signal-card">
          <span class="cross-review-signal-label">风险类别</span>
          <div class="meta-row">${renderInfoPills(aggregate.categories, "未提供", "meta-pill-soft")}</div>
        </article>
        <article class="cross-review-signal-card">
          <span class="cross-review-signal-label">误杀信号</span>
          <div class="meta-row">${renderInfoPills(aggregate.falsePositiveSignals, "未发现明显信号", "meta-pill-soft")}</div>
        </article>
        <article class="cross-review-signal-card">
          <span class="cross-review-signal-label">漏判信号</span>
          <div class="meta-row">${renderInfoPills(aggregate.falseNegativeSignals, "未发现明显信号", "meta-pill-soft")}</div>
        </article>
      </div>

      <div class="cross-review-models-head">
        <strong>模型意见对比</strong>
        <span>逐个查看每个复判模型给出的结论、摘要和风险提示。</span>
      </div>
      <div class="review-provider-grid">${providerCards}</div>
    </section>
  `;
}

export function buildAnalyzeCompareSummaryMarkup(result = {}, helpers = {}) {
  const escapeHtml = helpers.escapeHtml || localEscapeHtml;
  const verdictLabel = helpers.verdictLabel || localVerdictLabel;
  const formatDate = helpers.formatDate || ((value) => String(value || ""));
  const summary = result?.summary && typeof result.summary === "object" ? result.summary : {};
  const ruleAnalysis = result?.ruleAnalysis && typeof result.ruleAnalysis === "object" ? result.ruleAnalysis : {};
  const finalVerdictLabels = (Array.isArray(summary.finalVerdicts) ? summary.finalVerdicts : [])
    .filter(Boolean)
    .map((item) => verdictLabel(item))
    .join("、");
  const disagreementCount = Math.max(0, Number(summary.disagreementCount || 0));
  const disagreementHeadline = disagreementCount > 0 ? "有分歧" : "无分歧";
  const disagreementMeta = disagreementCount > 0
    ? `存在不同最终结论：${finalVerdictLabels || "请查看各模型详情"}`
    : `最终结论一致：${finalVerdictLabels || "当前没有最终结论"}`;
  const semanticVerdictLabels = (Array.isArray(summary.semanticVerdicts) ? summary.semanticVerdicts : [])
    .filter(Boolean)
    .map((item) => verdictLabel(item))
    .join("、");
  const semanticVerdictCount = Array.isArray(summary.semanticVerdicts) ? summary.semanticVerdicts.filter(Boolean).length : 0;
  const semanticDistributionMeta = [semanticVerdictLabels || "暂无语义结论", formatDate(summary.comparedAt || "")]
    .filter(Boolean)
    .join(" · ");

  return `
    <section class="sample-library-modal-section">
      <div class="sample-library-modal-section-head">
        <strong>对比总览</strong>
        <p>同一份规则检测只跑一次，下面横向对比不同模型的语义复判和合并后的最终结论。</p>
      </div>
      <div class="analyze-compare-summary-grid">
        <article class="analyze-compare-summary-card">
          <span>规则基底</span>
          <strong>${escapeHtml(verdictLabel(ruleAnalysis.verdict || "pass"))}</strong>
          <p>${escapeHtml(ruleAnalysis.modelTrace?.label || "本地规则引擎 / 规则词库 + 组合规则")}</p>
        </article>
        <article class="analyze-compare-summary-card">
          <span>已对比模型</span>
          <strong>${escapeHtml(String(summary.totalModels || 0))}</strong>
          <p>${escapeHtml(`成功返回 ${summary.completedModels || 0} 个`)}</p>
        </article>
        <article class="analyze-compare-summary-card">
          <span>结论分歧</span>
          <strong>${escapeHtml(disagreementHeadline)}</strong>
          <p>${escapeHtml(disagreementMeta)}</p>
        </article>
        <article class="analyze-compare-summary-card">
          <span>语义结论分布</span>
          <strong>${escapeHtml(semanticVerdictCount ? `${semanticVerdictCount} 种语义结果` : "暂无语义结论")}</strong>
          <p>${escapeHtml(semanticDistributionMeta)}</p>
        </article>
      </div>
    </section>
  `;
}

export function getDefaultAnalyzeCompareBasisSelection(result = {}) {
  const comparisons = Array.isArray(result?.comparisons) ? result.comparisons : [];
  const defaultItem =
    comparisons.find((entry) => entry?.semanticReview?.status === "ok" && entry?.mergedAnalysis && typeof entry.mergedAnalysis === "object") ||
    comparisons.find((entry) => entry?.mergedAnalysis && typeof entry.mergedAnalysis === "object") ||
    comparisons[0] ||
    null;

  return String(defaultItem?.selection || "").trim();
}

export function getAnalyzeCompareSelectionContext(selection = "", helpers = {}) {
  const appState = helpers.appState || {};
  const result = appState.latestAnalyzeCompareResult && typeof appState.latestAnalyzeCompareResult === "object"
    ? appState.latestAnalyzeCompareResult
    : appState.sampleLibraryModal?.result && typeof appState.sampleLibraryModal.result === "object"
      ? appState.sampleLibraryModal.result
      : null;
  const comparisons = Array.isArray(result?.comparisons) ? result.comparisons : [];
  const modalBasisSelection =
    appState.sampleLibraryModal?.kind === "analysis-compare"
      ? String(appState.sampleLibraryModal.compareBasisSelection || "").trim()
      : "";
  const normalizedSelection = String(selection || modalBasisSelection || "").trim();
  const explicitItem = normalizedSelection
    ? comparisons.find((entry) => String(entry?.selection || "") === normalizedSelection)
    : null;
  const item =
    explicitItem ||
    comparisons.find((entry) => entry?.semanticReview?.status === "ok" && entry?.mergedAnalysis && typeof entry.mergedAnalysis === "object") ||
    comparisons.find((entry) => entry?.mergedAnalysis && typeof entry.mergedAnalysis === "object") ||
    comparisons[0] ||
    null;

  return {
    result,
    item: item || null,
    mergedAnalysis: item?.mergedAnalysis && typeof item.mergedAnalysis === "object" ? item.mergedAnalysis : null
  };
}

export function analyzeCompareModelLabel(item = {}, helpers = {}) {
  const providerLabel = helpers.providerLabel || ((value) => String(value || "").trim() || "未标记模型");
  if (!item || typeof item !== "object") {
    return "";
  }

  const explicitLabel = String(item?.label || "").trim();

  if (explicitLabel) {
    return explicitLabel;
  }

  const semanticReview = item?.semanticReview && typeof item.semanticReview === "object" ? item.semanticReview : {};
  const attempts = Array.isArray(semanticReview.providersTried) ? semanticReview.providersTried : [];
  const primaryAttempt = attempts.find((attempt) => attempt && (attempt.routeLabel || attempt.provider || attempt.model)) || null;
  const routeLabel = String(primaryAttempt?.routeLabel || semanticReview?.routeLabel || item?.routeLabel || "").trim();
  const provider = String(primaryAttempt?.provider || semanticReview?.provider || item?.provider || item?.selection || "").trim();
  const model = String(primaryAttempt?.model || semanticReview?.model || item?.model || "").trim();
  const composedLabel = [routeLabel, providerLabel(provider), model].filter(Boolean).join(" / ");

  if (composedLabel) {
    return composedLabel;
  }

  const selectionLabel = String(item?.selection || "").trim();

  if (!selectionLabel) {
    return "";
  }

  const providerText = providerLabel(selectionLabel);
  return providerText && providerText !== selectionLabel ? providerText : selectionLabel;
}

export function buildAnalyzeCompareBasisOptionLabel(item = {}, helpers = {}) {
  const verdictLabel = helpers.verdictLabel || localVerdictLabel;
  const analyzeCompareModelLabelHelper = helpers.analyzeCompareModelLabel || analyzeCompareModelLabel;
  const label = analyzeCompareModelLabelHelper(item, helpers) || "未命名模型";
  const mergedAnalysis = item?.mergedAnalysis && typeof item.mergedAnalysis === "object" ? item.mergedAnalysis : {};
  const semanticReview = item?.semanticReview && typeof item.semanticReview === "object" ? item.semanticReview : {};
  const verdict = verdictLabel(mergedAnalysis.finalVerdict || mergedAnalysis.verdict || "pass");
  const status = describeAnalyzeCompareSemanticState(semanticReview).statusLabel;

  return `${label} · ${verdict} · ${status}`;
}

function describeAnalyzeCompareSemanticState(semanticReview = {}) {
  const failureMessage = String(semanticReview.message || "").trim();

  if (semanticReview.status === "ok") {
    return {
      statusLabel: "已完成",
      semanticVerdictLabel: ""
    };
  }

  if (semanticReview.status === "skipped") {
    return {
      statusLabel: "已跳过",
      semanticVerdictLabel: "已跳过"
    };
  }

  if (/超时/.test(failureMessage)) {
    return {
      statusLabel: "超时",
      semanticVerdictLabel: "超时"
    };
  }

  if (/缺少 .*密钥|缺少 .*API_KEY/i.test(failureMessage)) {
    return {
      statusLabel: "缺少密钥",
      semanticVerdictLabel: "缺少密钥"
    };
  }

  if (/不是有效 JSON|格式异常/.test(failureMessage)) {
    return {
      statusLabel: "返回格式异常",
      semanticVerdictLabel: "返回格式异常"
    };
  }

  if (/请求失败/.test(failureMessage)) {
    return {
      statusLabel: "请求失败",
      semanticVerdictLabel: "请求失败"
    };
  }

  return {
    statusLabel: "未返回",
    semanticVerdictLabel: "未返回"
  };
}

export function buildAnalyzeCompareContentActionsMarkup(result = {}, helpers = {}) {
  const escapeHtml = helpers.escapeHtml || localEscapeHtml;
  const comparisons = Array.isArray(result?.comparisons) ? result.comparisons : [];
  const compareContext = getAnalyzeCompareSelectionContext("", helpers);
  const mergedAnalysis = compareContext.mergedAnalysis || {};
  const analyzeCompareModelLabelHelper = helpers.analyzeCompareModelLabel || analyzeCompareModelLabel;
  const basisLabel = analyzeCompareModelLabelHelper(compareContext.item, helpers);
  const verdictLabel = helpers.verdictLabel || localVerdictLabel;
  const basisText = basisLabel ? `当前内容级保存基于 ${basisLabel} 的合并结论。` : "当前内容级保存将回退到这次检测的基础规则结论。";
  const basisVerdict = mergedAnalysis.finalVerdict || mergedAnalysis.verdict || result?.ruleAnalysis?.verdict || "pass";
  const compareFalsePositiveNotes = [
    "来自全部模型对比检测",
    "记录的是当前整条内容，不会重复给每个模型单独落一份内容样本",
    basisLabel ? `当前保存基准：${basisLabel}` : "",
    `综合结论：${verdictLabel(basisVerdict)}`
  ]
    .filter(Boolean)
    .join("；");
  const basisOptionsMarkup = comparisons.length
    ? comparisons
        .map((item) => {
          const optionValue = String(item?.selection || "").trim();
          const selected = optionValue && optionValue === String(compareContext.item?.selection || "").trim();

          return `
            <option value="${escapeHtml(optionValue)}" ${selected ? "selected" : ""}>
              ${escapeHtml(buildAnalyzeCompareBasisOptionLabel(item, helpers))}
            </option>
          `;
        })
        .join("")
    : `<option value="">当前没有可切换的模型结果</option>`;

  return `
    <section class="sample-library-modal-section">
      <div class="sample-library-modal-section-head">
        <strong>内容级操作</strong>
        <p>${escapeHtml(`${basisText} 误报样本、生命周期记录和平台结果回填都只保留一份，避免在各模型卡片里重复沉淀。`)}</p>
      </div>
      <div class="analyze-compare-content-actions">
        <label class="analyze-compare-basis-control">
          <span>保存基准</span>
          <select name="analyzeCompareBasisSelection" ${comparisons.length ? "" : "disabled"}>
            ${basisOptionsMarkup}
          </select>
        </label>
        <div class="analyze-compare-basis-row">
          <span class="analyze-compare-basis-pill">
            ${escapeHtml(`当前保存基准：${basisLabel || "基础规则结论"}`)}
          </span>
          <span class="meta-pill">${escapeHtml(`当前结论：${verdictLabel(basisVerdict)}`)}</span>
        </div>
        <div class="item-actions">
          <button
            type="button"
            class="button button-small"
            data-action="open-analyze-compare-false-positive"
            data-selection="${escapeHtml(compareContext.item?.selection || "")}"
            data-model-label="${escapeHtml(basisLabel)}"
            data-analysis-verdict="${escapeHtml(basisVerdict)}"
            data-analysis-score="${escapeHtml(String(mergedAnalysis.score ?? result?.ruleAnalysis?.score ?? 0))}"
            data-user-notes="${escapeHtml(compareFalsePositiveNotes)}"
            data-source-label="${escapeHtml(basisLabel ? `这次全部模型对比检测（当前保存基准：${basisLabel}）` : "这次全部模型对比检测")}"
          >
            记录这条内容为误报样本
          </button>
          <button
            type="button"
            class="button button-ghost button-small"
            data-action="save-analyze-compare-lifecycle"
            data-selection="${escapeHtml(compareContext.item?.selection || "")}"
          >
            保存这条内容为生命周期记录
          </button>
        </div>
        ${buildPlatformOutcomeActions("analysis-compare", { candidateId: compareContext.item?.selection || "" }, helpers)}
      </div>
    </section>
  `;
}

export function buildAnalyzeCompareCardMarkup(item = {}, helpers = {}) {
  const escapeHtml = helpers.escapeHtml || localEscapeHtml;
  const verdictLabel = helpers.verdictLabel || localVerdictLabel;
  const providerLabel = helpers.providerLabel || ((value) => String(value || "").trim() || "未标记模型");
  const renderInfoPills = helpers.renderInfoPills || ((items = [], emptyText = "未提供", extraClass = "") => {
    const tokens = Array.isArray(items) ? items.filter(Boolean) : [];
    if (!tokens.length) {
      return `<span class="meta-pill ${extraClass}">${escapeHtml(emptyText)}</span>`;
    }
    return tokens.map((itemValue) => `<span class="meta-pill ${extraClass}">${escapeHtml(itemValue)}</span>`).join("");
  });
  const semanticReview = item?.semanticReview && typeof item.semanticReview === "object" ? item.semanticReview : {};
  const mergedAnalysis = item?.mergedAnalysis && typeof item.mergedAnalysis === "object" ? item.mergedAnalysis : {};
  const modelLabel = (helpers.analyzeCompareModelLabel || analyzeCompareModelLabel)(item, helpers) || "未命名模型";
  const semantic = semanticReview.status === "ok" ? semanticReview.review || null : null;
  const attemptedRoutes = Array.isArray(semanticReview.providersTried) ? semanticReview.providersTried : [];
  const attemptedRouteLabels = attemptedRoutes
    .map((attempt) => [attempt.routeLabel || "", providerLabel(attempt.provider), attempt.model || ""].filter(Boolean).join(" / "))
    .filter(Boolean);
  const semanticState = describeAnalyzeCompareSemanticState(semanticReview);
  const failureMessage = String(semanticReview.message || "").trim();
  const statusLabel = semanticState.statusLabel;
  const statusClass = semanticReview.status === "ok" ? "is-ok" : semanticReview.status === "skipped" ? "is-muted" : "is-warn";
  const reasonsMarkup = semantic?.reasons?.length
    ? semantic.reasons.map((reason) => `<li>${escapeHtml(reason)}</li>`).join("")
    : `<li>${escapeHtml(semanticReview.message || "当前没有返回语义原因。")}</li>`;
  const signalsMarkup = semantic?.implicitSignals?.length
    ? semantic.implicitSignals.map((signal) => `<li>${escapeHtml(signal)}</li>`).join("")
    : "<li>未返回明显隐含信号</li>";
  const summaryText = semantic?.summary || semanticReview.message || "当前没有返回语义摘要。";
  const suggestionText = semantic?.suggestion || "暂无补充建议";
  const finalVerdict = mergedAnalysis.finalVerdict || mergedAnalysis.verdict || "pass";
  const semanticVerdict = semantic?.verdict ? verdictLabel(semantic.verdict) : semanticState.semanticVerdictLabel || "未启用/未返回";
  const failureDetailMarkup = !semantic && failureMessage ? `<p class="helper-text">失败原因：${escapeHtml(failureMessage)}</p>` : "";
  const memoryCalibrationSummary = helpers.describeMemoryCalibration ? helpers.describeMemoryCalibration(mergedAnalysis.memoryCalibration) : null;
  const memoryCalibrationMarkup = memoryCalibrationSummary
    ? `
        <section class="analyze-compare-block">
          <span>长期记忆校准</span>
          <p class="memory-calibration-label">${escapeHtml(memoryCalibrationSummary.label || "长期记忆校准")}</p>
          <p>${escapeHtml(memoryCalibrationSummary.title)}</p>
          <p>${escapeHtml(memoryCalibrationSummary.detail || "当前最终结论已结合长期记忆校准。")}</p>
        </section>
      `
    : "";

  return `
    <article class="analyze-compare-card">
      <div class="analyze-compare-card-head">
        <div>
          <strong>${escapeHtml(modelLabel)}</strong>
          <p>${escapeHtml(attemptedRouteLabels.join("；") || item.selection || "当前未记录调用链路")}</p>
        </div>
        <span class="analyze-compare-status ${escapeHtml(statusClass)}">${escapeHtml(statusLabel)}</span>
      </div>
      <div class="meta-row">
        <span class="meta-pill">${escapeHtml(`最终：${verdictLabel(finalVerdict)}`)}</span>
        <span class="meta-pill">${escapeHtml(`语义：${semanticVerdict}`)}</span>
        <span class="meta-pill">${escapeHtml(`耗时 ${Math.max(0, Number(item.durationMs || 0))}ms`)}</span>
      </div>
      ${failureDetailMarkup}
      <div class="analyze-compare-card-grid">
        <section class="analyze-compare-block">
          <span>语义摘要</span>
          <p>${escapeHtml(summaryText)}</p>
        </section>
        <section class="analyze-compare-block">
          <span>改写建议</span>
          <p>${escapeHtml(suggestionText)}</p>
        </section>
        <section class="analyze-compare-block">
          <span>语义原因</span>
          <ul>${reasonsMarkup}</ul>
        </section>
        <section class="analyze-compare-block">
          <span>隐含信号</span>
          <ul>${signalsMarkup}</ul>
        </section>
        ${memoryCalibrationMarkup}
      </div>
    </article>
  `;
}

export function buildAnalyzeCompareModalMarkup(result = {}, helpers = {}) {
  const escapeHtml = helpers.escapeHtml || localEscapeHtml;
  const comparisons = Array.isArray(result?.comparisons) ? result.comparisons : [];
  const errorMessage = String(result?.errorMessage || "").trim();
  const cardsMarkup = comparisons.length
    ? comparisons.map((item) => buildAnalyzeCompareCardMarkup(item, helpers)).join("")
    : `<div class="result-card muted">${escapeHtml(errorMessage || "当前没有可展示的模型对比结果。")}</div>`;

  return `
    <div class="sample-library-modal-stack analyze-compare-stack">
      ${buildAnalyzeCompareSummaryMarkup(result, helpers)}
      ${buildAnalyzeCompareContentActionsMarkup(result, helpers)}
      <section class="sample-library-modal-section">
        <div class="sample-library-modal-section-head">
          <strong>模型详情</strong>
          <p>默认先看每个模型的最终结论和语义摘要；只有需要时再继续看具体原因和隐含信号。</p>
        </div>
        <div class="analyze-compare-card-grid">${cardsMarkup}</div>
      </section>
    </div>
  `;
}

export function renderAnalyzeCompareModal(result = {}, helpers = {}) {
  const totalModels = Array.isArray(result?.comparisons) ? result.comparisons.length : 0;
  const renderSampleLibraryModal = helpers.renderSampleLibraryModal;

  return renderSampleLibraryModal({
    title: "全部模型对比检测",
    subtitle: `当前基于同一份规则检测，横向对比 ${totalModels} 个模型的语义复判与最终结论。`,
    body: buildAnalyzeCompareModalMarkup(result, helpers),
    cancelLabel: "关闭",
    hideSaveButton: true,
    hideCancelButton: true
  });
}

export function renderCrossReviewResult(result = {}, helpers = {}) {
  const byId = helpers.byId;
  if (!byId) {
    return;
  }
  byId("cross-review-result").innerHTML = buildCrossReviewMarkup(result?.review, {}, helpers);
}
