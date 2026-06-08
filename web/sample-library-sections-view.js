function localEscapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function buildSampleLibraryModalTagPickerMarkup(tags = [], helpers = {}) {
  const escapeHtml = helpers.escapeHtml || localEscapeHtml;
  const joinCSV = helpers.joinCSV || ((items = []) => (Array.isArray(items) ? items.join(", ") : ""));
  const buildAnalyzeTagSelectionMarkup = helpers.buildAnalyzeTagSelectionMarkup || ((items = []) => joinCSV(items));
  const selectedMarkup = buildAnalyzeTagSelectionMarkup(tags);

  return `
    <div class="tag-picker field-wide sample-library-modal-tag-picker">
      <input name="tags" type="hidden" value="${escapeHtml(joinCSV(tags))}" />
      <button
        type="button"
        class="tag-picker-trigger sample-library-modal-tag-trigger"
        aria-expanded="false"
        aria-controls="sample-library-modal-tag-dropdown"
      >
        <span class="tag-picker-trigger-head">
          <span class="tag-picker-trigger-label">标签</span>
          <span class="tag-picker-trigger-caret" aria-hidden="true">▾</span>
        </span>
        <span class="tag-picker-selected sample-library-modal-tag-selected" role="group" aria-label="已选标签" aria-live="polite">
          ${selectedMarkup}
        </span>
      </button>
      <div class="tag-picker-dropdown sample-library-modal-tag-dropdown" id="sample-library-modal-tag-dropdown" hidden>
        <div class="tag-picker-dropdown-head">
          <strong>选择预置标签</strong>
          <button type="button" class="tag-picker-clear sample-library-modal-tag-clear">清空</button>
        </div>
        <div class="tag-picker-options sample-library-modal-tag-options"></div>
        <div class="tag-picker-custom">
          <input type="text" class="sample-library-modal-tag-custom" placeholder="输入自定义标签" />
          <button type="button" class="button button-ghost button-small sample-library-modal-tag-add">添加</button>
        </div>
      </div>
    </div>
  `;
}

export function buildSampleLibraryModalSectionMarkup({ title = "", description = "", body = "", className = "" } = {}, helpers = {}) {
  const escapeHtml = helpers.escapeHtml || localEscapeHtml;

  return `
    <section class="sample-library-modal-section${className ? ` ${className}` : ""}">
      <div class="sample-library-modal-section-head">
        <strong>${escapeHtml(title)}</strong>
        <p>${escapeHtml(description)}</p>
      </div>
      ${body}
    </section>
  `;
}

export function buildSampleLibraryBaseEditorSectionMarkup(
  {
    title = "",
    body = "",
    coverText = "",
    collectionType = "",
    contentType = "image_text",
    videoScript = "",
    tags = [],
    views = 0,
    shares = 0,
    includeViews = false,
    includePrefillActions = false
  } = {},
  helpers = {}
) {
  const escapeHtml = helpers.escapeHtml || localEscapeHtml;
  const buildCollectionTypeOptionsMarkup = helpers.buildCollectionTypeOptionsMarkup || (() => "");
  const collectionTypeOptions = Array.isArray(helpers.collectionTypeOptions) ? helpers.collectionTypeOptions : [];
  const buildSampleLibraryModalTagPickerMarkup =
    helpers.buildSampleLibraryModalTagPickerMarkup || ((items = []) => buildSampleLibraryModalTagPickerMarkup(items, helpers));
  const buildSampleLibraryModalSectionMarkup =
    helpers.buildSampleLibraryModalSectionMarkup || ((args = {}) => buildSampleLibraryModalSectionMarkup(args, helpers));

  const bodyMarkup = `
        <label>
          <span>标题</span>
          <input name="title" value="${escapeHtml(title)}" placeholder="样本标题" />
        </label>
        <label>
          <span>正文</span>
          <textarea name="body" rows="6" placeholder="样本正文">${escapeHtml(body)}</textarea>
        </label>
        <label>
          <span>封面文案</span>
          <input name="coverText" value="${escapeHtml(coverText)}" placeholder="封面文案" />
        </label>
        <label>
          <span>合集类型</span>
          <select name="collectionType">
            ${buildCollectionTypeOptionsMarkup({
              options: collectionTypeOptions,
              value: collectionType
            })}
          </select>
        </label>
        <div class="sample-library-create-metrics">
          ${buildSampleLibraryModalTagPickerMarkup(tags)}
          <label>
            <span>类型</span>
            <select name="contentType">
              <option value="image_text"${contentType !== "video" ? " selected" : ""}>图文</option>
              <option value="video"${contentType === "video" ? " selected" : ""}>视频</option>
            </select>
          </label>
          <label class="field-wide" data-role="sample-library-video-script-field"${contentType === "video" ? "" : " hidden"}>
            <span>视频脚本</span>
            <textarea name="videoScript" rows="4" placeholder="填写分镜、口播或字幕脚本">${escapeHtml(videoScript)}</textarea>
          </label>
          ${
            includeViews
              ? `
                <label>
                  <span>浏览数</span>
                  <input name="views" type="number" min="0" value="${escapeHtml(String(views || 0))}" placeholder="浏览数" />
                </label>
                <label>
                  <span>分享数</span>
                  <input name="shares" type="number" min="0" value="${escapeHtml(String(shares || 0))}" placeholder="分享数" />
                </label>
              `
              : ""
          }
        </div>
        ${
          includePrefillActions
            ? `
              <div class="inline-actions inline-actions-row">
                <button type="button" class="button button-ghost" data-action="prefill-sample-library-create-analysis">
                  从当前检测填充
                </button>
                <button type="button" class="button button-ghost" data-action="prefill-sample-library-create-rewrite">
                  从当前改写填充
                </button>
              </div>
            `
            : ""
        }
  `;

  return buildSampleLibraryModalSectionMarkup({
    title: "基础内容",
    description: "先把标题、正文、封面文案和标签整理好，后续筛选都会基于这里。",
    body: bodyMarkup
  });
}

export function buildSampleLibraryReferenceEditorSectionMarkup(reference = {}, { notesFieldName = "notes" } = {}, helpers = {}) {
  const escapeHtml = helpers.escapeHtml || localEscapeHtml;
  const getReferenceThresholdReferenceDescription = helpers.getReferenceThresholdReferenceDescription || (() => "");
  const buildSampleLibraryModalSectionMarkup =
    helpers.buildSampleLibraryModalSectionMarkup || ((args = {}) => buildSampleLibraryModalSectionMarkup(args, helpers));

  return buildSampleLibraryModalSectionMarkup({
    title: "参考属性",
    description: getReferenceThresholdReferenceDescription(),
    body: `
      <label class="sample-library-checkbox">
        <input type="checkbox" name="enabled"${reference.enabled ? " checked" : ""} />
        <span>启用为参考样本</span>
      </label>
      <label>
        <span>参考等级</span>
        <select name="tier">
          <option value=""${!reference.tier ? " selected" : ""}>未启用</option>
          <option value="passed"${reference.tier === "passed" ? " selected" : ""}>仅过审</option>
          <option value="performed"${reference.tier === "performed" ? " selected" : ""}>过审且表现好</option>
          <option value="featured"${reference.tier === "featured" ? " selected" : ""}>人工精选标杆</option>
        </select>
      </label>
      <label>
        <span>备注</span>
        <textarea name="${escapeHtml(notesFieldName)}" rows="3" placeholder="例如：适合作为情绪沟通类参考">${escapeHtml(
          reference.notes || ""
        )}</textarea>
      </label>
    `
  });
}

export function buildSampleLibraryLifecycleEditorSectionMarkup(publish = {}, { notesFieldName = "notes" } = {}, helpers = {}) {
  const escapeHtml = helpers.escapeHtml || localEscapeHtml;
  const buildSampleLibraryModalSectionMarkup =
    helpers.buildSampleLibraryModalSectionMarkup || ((args = {}) => buildSampleLibraryModalSectionMarkup(args, helpers));

  return buildSampleLibraryModalSectionMarkup({
    title: "生命周期属性",
    description: "发布后回填结果，便于后续判断哪些内容真正可复用。",
    body: `
        <div class="lifecycle-primary-grid">
          <label>
            <span>发布状态</span>
            <select name="status">
              <option value="not_published"${publish.status === "not_published" ? " selected" : ""}>未发布</option>
              <option value="published_passed"${publish.status === "published_passed" ? " selected" : ""}>已发布通过</option>
              <option value="limited"${publish.status === "limited" ? " selected" : ""}>疑似限流</option>
              <option value="violation"${publish.status === "violation" ? " selected" : ""}>平台判违规</option>
              <option value="false_positive"${publish.status === "false_positive" ? " selected" : ""}>系统误报 / 平台放行</option>
              <option value="positive_performance"${publish.status === "positive_performance" ? " selected" : ""}>过审且表现好</option>
            </select>
          </label>
          <label>
            <span>发布时间</span>
            <input name="publishedAt" type="date" value="${escapeHtml(String(publish.publishedAt || "").slice(0, 10))}" />
          </label>
        </div>
        <div class="lifecycle-metrics-grid">
          <label>
            <span>点赞</span>
            <input name="likes" type="number" min="0" value="${escapeHtml(String(publish.metrics.likes || 0))}" />
          </label>
          <label>
            <span>收藏</span>
            <input name="favorites" type="number" min="0" value="${escapeHtml(String(publish.metrics.favorites || 0))}" />
          </label>
          <label>
            <span>评论</span>
            <input name="comments" type="number" min="0" value="${escapeHtml(String(publish.metrics.comments || 0))}" />
          </label>
          <label>
            <span>浏览数</span>
            <input name="views" type="number" min="0" value="${escapeHtml(String(publish.metrics.views || 0))}" />
          </label>
          <label>
            <span>分享数</span>
            <input name="shares" type="number" min="0" value="${escapeHtml(String(publish.metrics.shares || 0))}" />
          </label>
        </div>
        <label class="field-wide">
          <span>平台原因</span>
          <input name="platformReason" value="${escapeHtml(publish.platformReason || "")}" placeholder="例如：疑似导流、低俗等" />
        </label>
        <label class="field-wide">
          <span>回填备注</span>
          <textarea name="${escapeHtml(notesFieldName)}" rows="3" placeholder="例如：发布 24h 后稳定通过">${escapeHtml(
            publish.notes || ""
          )}</textarea>
        </label>
    `
  });
}

export function buildSampleLibraryReferenceModalMarkup(record = {}, helpers = {}) {
  const getSampleRecordReference = helpers.getSampleRecordReference || ((value = {}) => value?.reference || {});
  const buildSampleLibraryReferenceEditorSectionMarkup =
    helpers.buildSampleLibraryReferenceEditorSectionMarkup ||
    ((reference = {}, options = {}) => buildSampleLibraryReferenceEditorSectionMarkup(reference, options, helpers));
  const reference = getSampleRecordReference(record);

  return `
    <div class="sample-library-modal-stack compact-form">
      ${buildSampleLibraryReferenceEditorSectionMarkup(reference)}
    </div>
  `;
}

export function buildSampleLibraryLifecycleModalMarkup(record = {}, helpers = {}) {
  const getSampleRecordPublish = helpers.getSampleRecordPublish || ((value = {}) => value?.publish || {});
  const buildSampleLibraryLifecycleEditorSectionMarkup =
    helpers.buildSampleLibraryLifecycleEditorSectionMarkup ||
    ((publish = {}, options = {}) => buildSampleLibraryLifecycleEditorSectionMarkup(publish, options, helpers));
  const publish = getSampleRecordPublish(record);

  return `
    <div class="sample-library-modal-stack compact-form">
      ${buildSampleLibraryLifecycleEditorSectionMarkup(publish)}
    </div>
  `;
}
