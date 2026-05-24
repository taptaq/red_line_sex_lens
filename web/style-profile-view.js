export function buildStyleProfileGenerationLabel(meta = {}, { providerLabel } = {}) {
  const method = String(meta?.method || "").trim();
  const provider = String(meta?.provider || "").trim();
  const providerText = String(meta?.providerLabel || providerLabel?.(provider) || "本地规则").trim();
  const model = String(meta?.model || "").trim();
  const routeLabel = String(meta?.routeLabel || "").trim();

  if (method === "model_summary" && provider) {
    return [providerText, model, routeLabel].filter(Boolean).join(" · ");
  }

  if (method === "local_rule_fallback" && Array.isArray(meta?.attemptedProviders) && meta.attemptedProviders.length) {
    return "本地规则汇总（模型链路已回退）";
  }

  return "本地规则汇总";
}

export function buildStyleProfileModalMarkup(profileState = null, helpers = {}) {
  const {
    buildSampleLibraryModalSectionMarkup,
    escapeHtml,
    joinCSV,
    joinLineList,
    formatDate,
    buildStyleProfileGenerationLabel: buildGenerationLabel
  } = helpers;

  const current = profileState?.current && typeof profileState.current === "object" ? profileState.current : null;
  const sourceSampleIds = Array.isArray(current?.sourceSampleIds) ? current.sourceSampleIds.filter(Boolean) : [];
  const sourceSamples = Array.isArray(current?.sourceSamples) ? current.sourceSamples.filter(Boolean) : [];
  const preferredTags = joinCSV(current?.preferredTags || []);
  const avoidExpressions = joinLineList(current?.avoidExpressions || []);
  const generationGuidelines = joinLineList(current?.generationGuidelines || []);
  const generationLabel = buildGenerationLabel(current?.generationMeta);
  const generationTime = current?.generationMeta?.generatedAt ? formatDate(current.generationMeta.generatedAt) : "未知时间";
  const retroHintsSummary = String(current?.generationMeta?.retroHintsSummary || "")
    .trim()
    .replace(/\bstyleHints:\s*/g, "风格信号：")
    .replace(/\bruleCandidates:\s*/g, "规则候选：");
  const retroHintsMarkup = retroHintsSummary
    ? `
            <div class="style-profile-summary-card style-profile-retro-summary-card">
              <span class="style-profile-summary-label">反哺线索</span>
              <p>${escapeHtml(retroHintsSummary)}</p>
            </div>
          `
    : "";
  const summaryDescription = current
    ? `当前由 ${sourceSampleIds.length} 条参考样本沉淀；优先使用通义千问、Kimi、深度求索生成画像，失败后回退到本地规则汇总。`
    : "当前还没有自动沉淀画像；你可以先保存一版人工初始化画像，后续随着参考样本增加，系统会继续自动沉淀。";
  const sourceListMarkup = sourceSamples.length
    ? sourceSamples
        .map(
          (item) => `
            <article class="style-profile-source-item">
              <strong>${escapeHtml(item.title || item.id || "未命名参考样本")}</strong>
              <span class="style-profile-source-chip">${escapeHtml(item.id || "未标记 ID")}${item.collectionType ? ` · ${escapeHtml(item.collectionType)}` : ""}</span>
            </article>
          `
        )
        .join("")
    : sourceSampleIds.length
      ? sourceSampleIds
          .map(
            (item) => `
              <article class="style-profile-source-item">
                <strong>${escapeHtml(item)}</strong>
                <span class="style-profile-source-chip">${escapeHtml(item)}</span>
              </article>
            `
          )
          .join("")
      : '<p class="helper-text muted">当前还没有来源样本。</p>';

  return `
    <div class="sample-library-modal-stack compact-form">
      ${buildSampleLibraryModalSectionMarkup({
        title: "当前生效画像",
        description: summaryDescription,
        body: `
          <div class="style-profile-summary-grid">
            <div class="style-profile-summary-card">
              <span class="style-profile-summary-label">主题</span>
              <strong>${escapeHtml(current?.topic || "通用风格")}</strong>
            </div>
            <div class="style-profile-summary-card">
              <span class="style-profile-summary-label">名称</span>
              <strong>${escapeHtml(current?.name || "通用风格画像")}</strong>
            </div>
            <div class="style-profile-summary-card">
              <span class="style-profile-summary-label">更新时间</span>
              <strong>${escapeHtml(formatDate(current?.updatedAt))}</strong>
            </div>
            <div class="style-profile-summary-card">
              <span class="style-profile-summary-label">生成方式</span>
              <strong>${escapeHtml(generationLabel)}</strong>
              <span class="helper-text">${escapeHtml(generationTime)}</span>
            </div>
            ${retroHintsMarkup}
          </div>
          <p class="helper-text style-profile-helper-copy">优先使用通义千问、Kimi、深度求索生成画像，失败后回退到本地规则汇总。</p>
          <div class="style-profile-source-list">${sourceListMarkup}</div>
          <p class="helper-text style-profile-source-note">来源样本按权重优先排序；发布后复盘里被验证或被推翻的信号会轻微影响参考权重。</p>
        `
      })}
      ${buildSampleLibraryModalSectionMarkup({
        title: "手动修订",
        description: "这里改的是当前生效画像；来源样本和自动统计仍由系统维护。",
        body: `
          <div class="sample-library-modal-grid style-profile-modal-grid">
            <label>
              <span>主题</span>
              <input name="styleProfileTopic" value="${escapeHtml(current?.topic || "通用风格")}" placeholder="例如：亲密关系沟通" />
            </label>
            <label>
              <span>画像名称</span>
              <input name="styleProfileName" value="${escapeHtml(current?.name || "通用风格画像")}" placeholder="例如：亲密关系沟通画像" />
            </label>
            <label class="field-wide">
              <span>标题风格</span>
              <textarea name="styleProfileTitleStyle" rows="3" placeholder="总结标题节奏和语气">${escapeHtml(current?.titleStyle || "")}</textarea>
            </label>
            <label class="field-wide">
              <span>正文结构</span>
              <textarea name="styleProfileBodyStructure" rows="3" placeholder="总结正文展开顺序和结构">${escapeHtml(current?.bodyStructure || "")}</textarea>
            </label>
            <label class="field-wide">
              <span>语气</span>
              <textarea name="styleProfileTone" rows="3" placeholder="例如：温和、克制、像朋友提醒">${escapeHtml(current?.tone || "")}</textarea>
            </label>
            <label class="field-wide">
              <span>偏好标签</span>
              <input name="styleProfilePreferredTags" value="${escapeHtml(preferredTags)}" placeholder="逗号分隔，例如：沟通, 科普, 关系" />
            </label>
            <label class="field-wide">
              <span>避免表达</span>
              <textarea name="styleProfileAvoidExpressions" rows="4" placeholder="每行一条，或用逗号分隔">${escapeHtml(avoidExpressions)}</textarea>
            </label>
            <label class="field-wide">
              <span>生成指导</span>
              <textarea name="styleProfileGenerationGuidelines" rows="4" placeholder="每行一条，或用逗号分隔">${escapeHtml(generationGuidelines)}</textarea>
            </label>
          </div>
          <p class="helper-text style-profile-helper-copy">保存后，后续参考样本变化仍会自动更新画像基底，但这里手动修订过的字段不会被自动覆盖。</p>
        `
      })}
    </div>
  `;
}

export function readStyleProfileModalPayload(contentNode, helpers = {}) {
  const { splitCSV, splitLineList } = helpers;

  return {
    topic: contentNode?.querySelector('[name="styleProfileTopic"]')?.value || "",
    name: contentNode?.querySelector('[name="styleProfileName"]')?.value || "",
    titleStyle: contentNode?.querySelector('[name="styleProfileTitleStyle"]')?.value || "",
    bodyStructure: contentNode?.querySelector('[name="styleProfileBodyStructure"]')?.value || "",
    tone: contentNode?.querySelector('[name="styleProfileTone"]')?.value || "",
    preferredTags: splitCSV(contentNode?.querySelector('[name="styleProfilePreferredTags"]')?.value || ""),
    avoidExpressions: splitLineList(contentNode?.querySelector('[name="styleProfileAvoidExpressions"]')?.value || ""),
    generationGuidelines: splitLineList(contentNode?.querySelector('[name="styleProfileGenerationGuidelines"]')?.value || "")
  };
}
