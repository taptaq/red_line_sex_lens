export function buildSamplePoolActionMarkup(record = {}, pool = "reference", helpers = {}) {
  const {
    escapeHtml = (value = "") => String(value || ""),
    getSampleRecordPublish = (value = {}) => value?.publish || {},
    sampleLibraryPoolLabel = (value = "") => String(value || "")
  } = helpers;
  const recordId = escapeHtml(String(record?.id || ""));
  const publish = getSampleRecordPublish(record);

  if (pool === "negative") {
    const primaryAction = ["limited", "violation", "false_positive"].includes(publish.status)
      ? `
        <button type="button" class="button button-small" data-action="open-sample-library-lifecycle-from-pool" data-id="${recordId}">
          调整生命周期
        </button>
      `
      : `
        <button type="button" class="button button-small" data-action="restore-sample-from-negative-pool" data-id="${recordId}">
          退回普通样本
        </button>
      `;

    return `
      ${primaryAction}
      <button type="button" class="button button-danger button-small" data-action="open-sample-library-delete-modal" data-id="${recordId}">
        删除样本
      </button>
      <button type="button" class="button button-ghost button-small" data-action="open-sample-library-record" data-id="${recordId}">
        回到原记录
      </button>
    `;
  }

  if (pool === "regular") {
    return `
      <button type="button" class="button button-small" data-action="promote-sample-to-reference" data-id="${recordId}">
        设为参考候选
      </button>
      <button type="button" class="button button-ghost button-small" data-action="mark-sample-as-negative" data-id="${recordId}">
        标记为反例
      </button>
      <button type="button" class="button button-danger button-small" data-action="open-sample-library-delete-modal" data-id="${recordId}">
        删除样本
      </button>
      <button type="button" class="button button-ghost button-small" data-action="open-sample-library-record" data-id="${recordId}">
        回到原记录
      </button>
    `;
  }

  return `
    <button type="button" class="button button-small" data-action="adjust-reference-sample" data-id="${recordId}">
      调整参考等级
    </button>
    <button type="button" class="button button-ghost button-small" data-action="remove-sample-from-reference-pool" data-id="${recordId}">
      移出参考池
    </button>
    <button type="button" class="button button-danger button-small" data-action="open-sample-library-delete-modal" data-id="${recordId}">
      删除样本
    </button>
    <button type="button" class="button button-ghost button-small" data-action="open-sample-library-record" data-id="${recordId}">
      回到原记录
    </button>
  `;
}

export function renderSamplePoolCards(items = [], pool = "reference", helpers = {}) {
  const {
    escapeHtml = (value = "") => String(value || ""),
    getSampleRecordTitle = (value = {}) => String(value?.title || "").trim(),
    getSampleRecordPublish = (value = {}) => value?.publish || {},
    getSampleRecordReference = (value = {}) => value?.reference || {},
    getSampleRecordTags = (value = {}) => (Array.isArray(value?.tags) ? value.tags : []),
    getSamplePoolWhyLabel = () => "",
    getSamplePoolWhyHelperText = () => "",
    sampleLibraryPoolLabel = (value = "") => String(value || ""),
    collectionTypeLabel = (value = "") => String(value || ""),
    getSampleRecordCollectionType = (value = {}) => String(value?.collectionType || "").trim(),
    publishStatusLabel = (value = "") => String(value || ""),
    successTierLabel = (value = "") => String(value || ""),
    joinCSV = (items = []) => (Array.isArray(items) ? items.join(", ") : ""),
    buildSamplePoolActionMarkup = () => ""
  } = helpers;
  const records = Array.isArray(items) ? items : [];

  if (!records.length) {
    return "";
  }

  return records
    .map((record) => {
      const title = getSampleRecordTitle(record) || "未命名样本";
      const publish = getSampleRecordPublish(record);
      const reference = getSampleRecordReference(record);
      const tags = getSampleRecordTags(record);
      const whyLabel = getSamplePoolWhyLabel(record);
      const whyHelper = getSamplePoolWhyHelperText(record);

      return `
        <article class="sample-pool-card result-card-shell">
          <div class="sample-pool-card-head">
            <div>
              <strong>${escapeHtml(title)}</strong>
              <p>${escapeHtml(whyLabel)}</p>
              ${whyHelper ? `<p class="sample-pool-why-helper">${escapeHtml(whyHelper)}</p>` : ""}
            </div>
            <span class="meta-pill">${escapeHtml(sampleLibraryPoolLabel(pool))}</span>
          </div>
          <div class="meta-row">
            <span class="meta-pill">${escapeHtml(collectionTypeLabel(getSampleRecordCollectionType(record)))}</span>
            <span class="meta-pill">${escapeHtml(publishStatusLabel(publish.status))}</span>
            <span class="meta-pill">${escapeHtml(reference.enabled ? successTierLabel(reference.tier || "passed") : "未启用参考")}</span>
          </div>
          <div class="meta-row sample-library-metric-grid">
            <span class="meta-pill sample-library-metric-pill">赞 ${escapeHtml(String(publish.metrics.likes || 0))}</span>
            <span class="meta-pill sample-library-metric-pill">藏 ${escapeHtml(String(publish.metrics.favorites || 0))}</span>
            <span class="meta-pill sample-library-metric-pill">评 ${escapeHtml(String(publish.metrics.comments || 0))}</span>
            <span class="meta-pill sample-library-metric-pill">浏览 ${escapeHtml(String(publish.metrics.views || 0))}</span>
            <span class="meta-pill sample-library-metric-pill">分享 ${escapeHtml(String(publish.metrics.shares || 0))}</span>
          </div>
          <p class="helper-text">标签：${escapeHtml(joinCSV(tags) || "未填写")}</p>
          <div class="item-actions">
            ${buildSamplePoolActionMarkup(record, pool)}
          </div>
        </article>
      `;
    })
    .join("");
}

export function buildSampleLibraryRecordCardMarkup(item = {}, { action = "", actionId = "", isActive = false } = {}, helpers = {}) {
  const {
    escapeHtml = (value = "") => String(value || ""),
    getSampleRecordReference = (value = {}) => value?.reference || {},
    getSampleRecordPublish = (value = {}) => value?.publish || {},
    getSampleRecordCalibration = (value = {}) => value?.calibration || { prediction: {}, retro: {} },
    getSampleLibraryCalibrationListState = () => ({ key: "calibration_unknown", label: "未校准" }),
    getSampleRecordTitle = (value = {}) => String(value?.title || "").trim(),
    getSampleRecordBody = (value = {}) => String(value?.body || "").trim(),
    getSampleRecordCoverText = (value = {}) => String(value?.coverText || "").trim(),
    getSampleRecordCollectionType = (value = {}) => String(value?.collectionType || "").trim(),
    getSampleRecordTags = (value = {}) => (Array.isArray(value?.tags) ? value.tags : []),
    getSampleLibraryRecordStepLabel = () => "未完成校准闭环",
    buildSampleLibraryRecordActionAttributes = ({ action = "", id = "" } = {}) =>
      action ? `data-action="${String(action)}" data-id="${String(id || "")}"` : "",
    successTierLabel = (value = "") => String(value || ""),
    publishStatusLabel = (value = "") => String(value || ""),
    riskLevelLabel = (value = "") => String(value || ""),
    collectionTypeLabel = (value = "") => String(value || ""),
    lifecycleSourceLabel = (value = "") => String(value || ""),
    formatDate = (value = "") => String(value || ""),
    compactText = (value = "", maxLength = 96) => String(value || "").slice(0, maxLength),
    joinCSV = (items = []) => (Array.isArray(items) ? items.join(", ") : "")
  } = helpers;
  const itemId = String(item?.id || "");
  const reference = getSampleRecordReference(item);
  const publish = getSampleRecordPublish(item);
  const calibration = getSampleRecordCalibration(item);
  const calibrationState = getSampleLibraryCalibrationListState(item);
  const title = getSampleRecordTitle(item) || "未命名样本记录";
  const body = getSampleRecordBody(item);
  const collectionType = getSampleRecordCollectionType(item);
  const tags = getSampleRecordTags(item);
  const stepLabel = getSampleLibraryRecordStepLabel(item);
  const actionAttributes =
    buildSampleLibraryRecordActionAttributes({
      action,
      id: actionId || itemId
    }) || `data-sample-library-record-id="${escapeHtml(itemId)}"`;

  return `
    <button
      type="button"
      class="sample-library-record-card admin-item${isActive ? " is-active" : ""}"
      ${actionAttributes}
    >
      <strong>${escapeHtml(title)}</strong>
      <div class="meta-row">
        <span class="meta-pill">${escapeHtml(reference.enabled ? successTierLabel(reference.tier) : "待补全")}</span>
        <span class="meta-pill">${escapeHtml(publishStatusLabel(publish.status))}</span>
        <span class="meta-pill sample-library-calibration-pill is-${escapeHtml(calibrationState.key)}">${escapeHtml(calibrationState.label)}</span>
        ${
          calibration.prediction.predictedRiskLevel
            ? `<span class="meta-pill sample-library-calibration-pill is-risk">${escapeHtml(
                riskLevelLabel(calibration.prediction.predictedRiskLevel)
              )}</span>`
            : ""
        }
        <span class="meta-pill">${escapeHtml(collectionTypeLabel(collectionType))}</span>
        <span class="meta-pill">浏览 ${escapeHtml(String(publish.metrics.views || 0))}</span>
        <span class="meta-pill">分享 ${escapeHtml(String(publish.metrics.shares || 0))}</span>
        <span class="meta-pill">${escapeHtml(lifecycleSourceLabel(item?.source || "manual"))}</span>
        <span class="meta-pill">${escapeHtml(formatDate(item?.updatedAt || item?.createdAt))}</span>
      </div>
      <p>${escapeHtml(compactText(body || getSampleRecordCoverText(item), 96) || "未填写正文")}</p>
      <p>标签：${escapeHtml(joinCSV(tags) || "未填写")}</p>
      <p class="sample-library-record-step">${escapeHtml(stepLabel)}</p>
    </button>
  `;
}

export function buildSampleLibraryRecordListMarkup(items = [], helpers = {}) {
  const {
    buildSampleLibraryRecordCardMarkup,
    selectedSampleLibraryRecordId
  } = helpers;

  return items.length
    ? items
        .map((item) =>
          buildSampleLibraryRecordCardMarkup(item, {
            isActive: String(item?.id || "") === selectedSampleLibraryRecordId
          })
        )
        .join("")
    : '<div class="result-card muted">当前没有样本记录</div>';
}
