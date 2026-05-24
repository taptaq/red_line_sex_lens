function localEscapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function buildSampleLibraryRecordListModalMarkup(items = [], helpers = {}) {
  const escapeHtml = helpers.escapeHtml || localEscapeHtml;
  const buildSampleLibraryRecordCardMarkup = helpers.buildSampleLibraryRecordCardMarkup;
  const sampleLibraryFilterLabel = helpers.sampleLibraryFilterLabel || ((value = "all") => value);
  const sampleLibraryCollectionFilterLabel = helpers.sampleLibraryCollectionFilterLabel || ((value = "all") => value);
  const selectedSampleLibraryRecordId = String(helpers.selectedSampleLibraryRecordId || "");
  const sampleLibraryFilter = helpers.sampleLibraryFilter || "all";
  const sampleLibraryCollectionFilter = helpers.sampleLibraryCollectionFilter || "all";

  const listMarkup = items.length
    ? items
        .map((item) =>
          buildSampleLibraryRecordCardMarkup(item, {
            action: "open-sample-library-record-from-modal",
            actionId: String(item?.id || ""),
            isActive: String(item?.id || "") === selectedSampleLibraryRecordId
          })
        )
        .join("")
    : '<div class="result-card muted">当前没有样本记录</div>';

  return `
    <div class="sample-library-modal-stack">
      <section class="sample-library-modal-section">
        <div class="sample-library-modal-section-head">
          <strong>当前筛选下的完整记录列表</strong>
          <p>${escapeHtml(
            `${items.length} 条 · ${sampleLibraryFilterLabel(sampleLibraryFilter)} · ${sampleLibraryCollectionFilterLabel(
              sampleLibraryCollectionFilter
            )}`
          )}</p>
        </div>
        <div class="admin-list">${listMarkup}</div>
      </section>
    </div>
  `;
}

export function buildSampleLibraryRecordInlineEditorDraft(record = {}, helpers = {}) {
  const getSampleRecordNote = helpers.getSampleRecordNote || ((value = {}) => value?.note || value || {});
  const getSampleRecordReference = helpers.getSampleRecordReference || ((value = {}) => value?.reference || {});
  const getSampleRecordPublish = helpers.getSampleRecordPublish || ((value = {}) => value?.publish || {});
  const getSampleRecordCalibration = helpers.getSampleRecordCalibration || ((value = {}) => value?.calibration || {});
  const getSampleRecordCollectionType =
    helpers.getSampleRecordCollectionType ||
    ((value = {}) => String(value?.note?.collectionType || value?.collectionType || "").trim());
  const note = getSampleRecordNote(record) || {};
  const reference = getSampleRecordReference(record) || {};
  const publish = getSampleRecordPublish(record) || {};
  const calibration = getSampleRecordCalibration(record) || {};

  return {
    note: {
      title: String(note.title || ""),
      body: String(note.body || ""),
      coverText: String(note.coverText || ""),
      collectionType: String(getSampleRecordCollectionType(record) || ""),
      tags: Array.isArray(note.tags) ? [...note.tags] : []
    },
    reference: {
      enabled: reference.enabled === true,
      tier: String(reference.tier || ""),
      notes: String(reference.notes || "")
    },
    publish: {
      status: String(publish.status || "not_published") || "not_published",
      publishedAt: String(publish.publishedAt || ""),
      platformReason: String(publish.platformReason || ""),
      notes: String(publish.notes || ""),
      metrics: {
        likes: Number(publish?.metrics?.likes ?? 0) || 0,
        favorites: Number(publish?.metrics?.favorites ?? 0) || 0,
        comments: Number(publish?.metrics?.comments ?? 0) || 0,
        views: Number(publish?.metrics?.views ?? 0) || 0,
        shares: Number(publish?.metrics?.shares ?? 0) || 0
      }
    },
    calibration: {
      prediction: {
        predictedStatus: String(calibration?.prediction?.predictedStatus || "not_published") || "not_published",
        predictedRiskLevel: String(calibration?.prediction?.predictedRiskLevel || ""),
        predictedPerformanceTier: String(calibration?.prediction?.predictedPerformanceTier || ""),
        confidence: Number(calibration?.prediction?.confidence ?? 0) || 0,
        reason: String(calibration?.prediction?.reason || ""),
        model: String(calibration?.prediction?.model || ""),
        createdAt: String(calibration?.prediction?.createdAt || "")
      },
      retro: {
        actualPerformanceTier: String(calibration?.retro?.actualPerformanceTier || ""),
        predictionMatched: calibration?.retro?.predictionMatched === true,
        missReason: String(calibration?.retro?.missReason || ""),
        validatedSignals: Array.isArray(calibration?.retro?.validatedSignals) ? [...calibration.retro.validatedSignals] : [],
        invalidatedSignals: Array.isArray(calibration?.retro?.invalidatedSignals) ? [...calibration.retro.invalidatedSignals] : [],
        shouldBecomeReference: calibration?.retro?.shouldBecomeReference === true,
        ruleImprovementCandidate: String(calibration?.retro?.ruleImprovementCandidate || ""),
        notes: String(calibration?.retro?.notes || ""),
        reviewedAt: String(calibration?.retro?.reviewedAt || "")
      }
    }
  };
}

export function buildSampleLibraryRecordInlineEditorPatchPayload(recordId = "", draft = {}) {
  return {
    id: String(recordId || ""),
    note: {
      title: String(draft?.note?.title || ""),
      body: String(draft?.note?.body || ""),
      coverText: String(draft?.note?.coverText || ""),
      collectionType: String(draft?.note?.collectionType || ""),
      tags: Array.isArray(draft?.note?.tags) ? [...draft.note.tags] : []
    },
    reference: {
      enabled: draft?.reference?.enabled === true,
      tier: String(draft?.reference?.tier || ""),
      notes: String(draft?.reference?.notes || "")
    },
    publish: {
      status: String(draft?.publish?.status || "not_published") || "not_published",
      publishedAt: String(draft?.publish?.publishedAt || ""),
      platformReason: String(draft?.publish?.platformReason || ""),
      notes: String(draft?.publish?.notes || ""),
      metrics: {
        likes: Number(draft?.publish?.metrics?.likes ?? 0) || 0,
        favorites: Number(draft?.publish?.metrics?.favorites ?? 0) || 0,
        comments: Number(draft?.publish?.metrics?.comments ?? 0) || 0,
        views: Number(draft?.publish?.metrics?.views ?? 0) || 0,
        shares: Number(draft?.publish?.metrics?.shares ?? 0) || 0
      }
    },
    calibration: {
      prediction: {
        predictedStatus: String(draft?.calibration?.prediction?.predictedStatus || "not_published") || "not_published",
        predictedRiskLevel: String(draft?.calibration?.prediction?.predictedRiskLevel || ""),
        predictedPerformanceTier: String(draft?.calibration?.prediction?.predictedPerformanceTier || ""),
        confidence: Number(draft?.calibration?.prediction?.confidence ?? 0) || 0,
        reason: String(draft?.calibration?.prediction?.reason || ""),
        model: String(draft?.calibration?.prediction?.model || ""),
        createdAt: String(draft?.calibration?.prediction?.createdAt || "")
      },
      retro: {
        actualPerformanceTier: String(draft?.calibration?.retro?.actualPerformanceTier || ""),
        predictionMatched: draft?.calibration?.retro?.predictionMatched === true,
        missReason: String(draft?.calibration?.retro?.missReason || ""),
        validatedSignals: Array.isArray(draft?.calibration?.retro?.validatedSignals) ? [...draft.calibration.retro.validatedSignals] : [],
        invalidatedSignals: Array.isArray(draft?.calibration?.retro?.invalidatedSignals)
          ? [...draft.calibration.retro.invalidatedSignals]
          : [],
        shouldBecomeReference: draft?.calibration?.retro?.shouldBecomeReference === true,
        ruleImprovementCandidate: String(draft?.calibration?.retro?.ruleImprovementCandidate || ""),
        notes: String(draft?.calibration?.retro?.notes || ""),
        reviewedAt: String(draft?.calibration?.retro?.reviewedAt || "")
      }
    }
  };
}

export function isSampleLibraryRecordInlineEditorDirty({ draft = null, initialSnapshot = null } = {}) {
  return JSON.stringify(draft || {}) !== JSON.stringify(initialSnapshot || {});
}

export function filterSampleLibraryRecordInlineEditorItems(items = [], titleFilter = "", helpers = {}) {
  const getSampleRecordTitle = helpers.getSampleRecordTitle || ((item = {}) => String(item?.title || "").trim());
  const normalizedItems = Array.isArray(items) ? items : [];
  const keyword = String(titleFilter || "")
    .trim()
    .toLowerCase();

  if (!keyword) {
    return normalizedItems;
  }

  return normalizedItems.filter((item) => String(getSampleRecordTitle(item) || "").toLowerCase().includes(keyword));
}

export function getSampleLibraryRecordInlineEditorFilterSummaryText(count = 0, helpers = {}) {
  const sampleLibraryFilterLabel = helpers.sampleLibraryFilterLabel || ((value = "all") => value);
  const sampleLibraryCollectionFilterLabel = helpers.sampleLibraryCollectionFilterLabel || ((value = "all") => value);
  const sampleLibraryFilter = helpers.sampleLibraryFilter || "all";
  const sampleLibraryCollectionFilter = helpers.sampleLibraryCollectionFilter || "all";

  return `${count} 条 · ${sampleLibraryFilterLabel(sampleLibraryFilter)} · ${sampleLibraryCollectionFilterLabel(
    sampleLibraryCollectionFilter
  )}`;
}

export function buildSampleLibraryRecordInlineEditorSidebarListMarkup(items = [], modalState = {}, helpers = {}) {
  const escapeHtml = helpers.escapeHtml || localEscapeHtml;
  const compactText = helpers.compactText || ((value = "") => String(value || "").trim());
  const getSampleRecordTitle = helpers.getSampleRecordTitle || ((item = {}) => String(item?.title || "").trim());
  const getSampleRecordNote = helpers.getSampleRecordNote || ((item = {}) => item?.note || item || {});
  const getSampleRecordPublish = helpers.getSampleRecordPublish || ((item = {}) => item?.publish || {});
  const getSampleRecordReference = helpers.getSampleRecordReference || ((item = {}) => item?.reference || {});
  const successTierLabel = helpers.successTierLabel || ((value = "") => value);
  const publishStatusLabel = helpers.publishStatusLabel || ((value = "") => value);
  const selectedRecordId = String(modalState?.selectedRecordId || "");

  if (!items.length) {
    return '<div class="result-card muted">当前筛选下没有记录。</div>';
  }

  return items
    .map((item) => {
      const isActive = String(item.id || "") === selectedRecordId;
      const note = getSampleRecordNote(item);
      const publish = getSampleRecordPublish(item);
      const reference = getSampleRecordReference(item);

      return `
        <button
          type="button"
          class="sample-library-record-inline-editor-sidebar-item${isActive ? " is-active" : ""}"
          data-action="switch-sample-library-record-inline-editor-record"
          data-id="${escapeHtml(item.id || "")}"
        >
          <strong>${escapeHtml(getSampleRecordTitle(item) || "未命名样本记录")}</strong>
          <span>${escapeHtml(compactText(note.body || note.coverText || "未填写正文", 54))}</span>
          <span class="sample-library-record-inline-editor-sidebar-meta">
            ${escapeHtml(reference.enabled ? successTierLabel(reference.tier || "passed") : "未启用参考")} ·
            ${escapeHtml(publishStatusLabel(publish.status || "not_published"))}
          </span>
        </button>
      `;
    })
    .join("");
}

export function buildSampleLibraryRecordInlineEditorSidebarMarkup(items = [], modalState = {}, helpers = {}) {
  const escapeHtml = helpers.escapeHtml || localEscapeHtml;
  const isSampleLibraryRecordInlineEditorDirtyHelper =
    helpers.isSampleLibraryRecordInlineEditorDirty || isSampleLibraryRecordInlineEditorDirty;
  const getSampleLibraryRecordInlineEditorFilterSummaryTextHelper =
    helpers.getSampleLibraryRecordInlineEditorFilterSummaryText || getSampleLibraryRecordInlineEditorFilterSummaryText;
  const buildSampleLibraryRecordInlineEditorSidebarListMarkupHelper =
    helpers.buildSampleLibraryRecordInlineEditorSidebarListMarkup || buildSampleLibraryRecordInlineEditorSidebarListMarkup;
  const dirty = isSampleLibraryRecordInlineEditorDirtyHelper(modalState);
  const titleFilter = String(modalState?.titleFilter || "");
  const sidebarItemsMarkup = buildSampleLibraryRecordInlineEditorSidebarListMarkupHelper(items, modalState, helpers);

  return `
    <aside class="sample-library-record-inline-editor-sidebar-panel">
      <div class="sample-library-record-inline-editor-sidebar-head">
        <strong>当前筛选记录</strong>
        <p data-role="record-inline-editor-filter-summary">${escapeHtml(getSampleLibraryRecordInlineEditorFilterSummaryTextHelper(items.length, helpers))}</p>
        <label class="sample-library-record-inline-editor-filter">
          <span>按标题筛选</span>
          <input name="recordTitleFilter" value="${escapeHtml(titleFilter)}" placeholder="按标题筛选记录" />
        </label>
        <p class="helper-text" data-role="record-inline-editor-filter-helper">${dirty ? "当前记录有未保存修改，切换前请先保存。" : "左侧切换记录，右侧统一编辑四块信息。"}</p>
      </div>
      <div class="sample-library-record-inline-editor-sidebar-list" data-role="record-inline-editor-filter-list">${sidebarItemsMarkup}</div>
    </aside>
  `;
}

export function readSampleLibraryRecordInlineEditorDraftFromModal(contentNode = null, modalState = {}, helpers = {}) {
  const splitCSV = helpers.splitCSV || ((value = "") => String(value || "").split(",").map((item) => item.trim()).filter(Boolean));
  const readSampleLibraryRetroChipFieldValue = helpers.readSampleLibraryRetroChipFieldValue || (() => "");
  const readSampleLibraryRetroChipListValue = helpers.readSampleLibraryRetroChipListValue || (() => []);
  const noteTags = splitCSV(contentNode?.querySelector('[name="tags"]')?.value || "");
  const referenceTier = String(contentNode?.querySelector('[name="tier"]')?.value || "").trim();
  const referenceEnabled = contentNode?.querySelector('[name="enabled"]')?.checked === true || Boolean(referenceTier);

  return {
    note: {
      title: contentNode?.querySelector('[name="title"]')?.value || "",
      body: contentNode?.querySelector('[name="body"]')?.value || "",
      coverText: contentNode?.querySelector('[name="coverText"]')?.value || "",
      collectionType: contentNode?.querySelector('[name="collectionType"]')?.value || "",
      tags: noteTags
    },
    reference: {
      enabled: referenceEnabled,
      tier: referenceEnabled ? referenceTier || "passed" : "",
      notes: contentNode?.querySelector('[name="referenceNotes"]')?.value || ""
    },
    publish: {
      status: contentNode?.querySelector('[name="status"]')?.value || "not_published",
      publishedAt: contentNode?.querySelector('[name="publishedAt"]')?.value || "",
      platformReason: contentNode?.querySelector('[name="platformReason"]')?.value || "",
      notes: contentNode?.querySelector('[name="publishNotes"]')?.value || "",
      metrics: {
        likes: Number(contentNode?.querySelector('[name="likes"]')?.value || 0) || 0,
        favorites: Number(contentNode?.querySelector('[name="favorites"]')?.value || 0) || 0,
        comments: Number(contentNode?.querySelector('[name="comments"]')?.value || 0) || 0,
        views: Number(contentNode?.querySelector('[name="views"]')?.value || 0) || 0,
        shares: Number(contentNode?.querySelector('[name="shares"]')?.value || 0) || 0
      }
    },
    calibration: {
      prediction: {
        predictedStatus: contentNode?.querySelector('[name="predictedStatus"]')?.value || "not_published",
        predictedRiskLevel: contentNode?.querySelector('[name="predictedRiskLevel"]')?.value || "",
        predictedPerformanceTier: contentNode?.querySelector('[name="predictedPerformanceTier"]')?.value || "",
        confidence: Number(contentNode?.querySelector('[name="predictionConfidence"]')?.value || 0) || 0,
        reason: contentNode?.querySelector('[name="predictionReason"]')?.value || "",
        model: contentNode?.querySelector('[name="predictionModel"]')?.value || "",
        createdAt: contentNode?.querySelector('[name="predictionCreatedAt"]')?.value || ""
      },
      retro: {
        actualPerformanceTier: contentNode?.querySelector('[name="actualPerformanceTier"]')?.value || "",
        predictionMatched: contentNode?.querySelector('[name="predictionMatched"]')?.checked === true,
        missReason: readSampleLibraryRetroChipFieldValue(contentNode, "missReason"),
        validatedSignals: readSampleLibraryRetroChipListValue(contentNode, "validatedSignals"),
        invalidatedSignals: readSampleLibraryRetroChipListValue(contentNode, "invalidatedSignals"),
        shouldBecomeReference: contentNode?.querySelector('[name="shouldBecomeReference"]')?.checked === true,
        ruleImprovementCandidate: readSampleLibraryRetroChipFieldValue(contentNode, "ruleImprovementCandidate"),
        notes: contentNode?.querySelector('[name="retroNotes"]')?.value || "",
        reviewedAt: contentNode?.querySelector('[name="reviewedAt"]')?.value || ""
      }
    },
    recordId: String(modalState?.selectedRecordId || "")
  };
}

export function buildSampleLibraryRecordInlineEditorModalMarkup({ sidebarItems = [], selectedRecord = null, modalState = {} } = {}, helpers = {}) {
  const escapeHtml = helpers.escapeHtml || localEscapeHtml;
  const compactText = helpers.compactText || ((value = "") => String(value || "").trim());
  const getSampleRecordTitle = helpers.getSampleRecordTitle || ((record = {}) => String(record?.title || "").trim());
  const buildSampleLibraryRecordInlineEditorSidebarMarkup = helpers.buildSampleLibraryRecordInlineEditorSidebarMarkup;
  const buildSampleLibraryRecordInlineEditorDraft = helpers.buildSampleLibraryRecordInlineEditorDraft;
  const getSampleLibraryReferenceApplicationState = helpers.getSampleLibraryReferenceApplicationState;
  const buildSampleLibraryBaseEditorSectionMarkup = helpers.buildSampleLibraryBaseEditorSectionMarkup;
  const buildSampleLibraryReferenceEditorSectionMarkup = helpers.buildSampleLibraryReferenceEditorSectionMarkup;
  const buildSampleLibraryLifecycleEditorSectionMarkup = helpers.buildSampleLibraryLifecycleEditorSectionMarkup;
  const buildSampleLibraryCalibrationEditorSectionsMarkup = helpers.buildSampleLibraryCalibrationEditorSectionsMarkup;
  const buildSampleLibraryCalibrationRetroComparison = helpers.buildSampleLibraryCalibrationRetroComparison;
  const predictionMatchedLabel = helpers.predictionMatchedLabel || ((value) => (value === true ? "预判命中" : "待复盘"));

  const draft = modalState?.draft || buildSampleLibraryRecordInlineEditorDraft(selectedRecord || {});
  const comparisonMatched = draft?.calibration?.retro?.predictionMatched === true;
  const referenceAction = selectedRecord
    ? getSampleLibraryReferenceApplicationState({
        recordOverride: {
          ...selectedRecord,
          reference: draft.reference,
          publish: draft.publish,
          calibration: draft.calibration
        },
        calibrationOverride: draft.calibration
      })
    : null;

  return `
    <div class="sample-library-record-inline-editor-layout">
      <!-- data-action="switch-sample-library-record-inline-editor-record" -->
      <div class="sample-library-record-inline-editor-sidebar">
        ${buildSampleLibraryRecordInlineEditorSidebarMarkup(sidebarItems, modalState)}
      </div>
      <div class="sample-library-record-inline-editor-detail">
        ${
          selectedRecord
            ? `
              <div class="sample-library-record-inline-editor-detail-head">
                <div>
                  <strong>${escapeHtml(getSampleRecordTitle(selectedRecord) || "未命名样本记录")}</strong>
                  <p>${escapeHtml(compactText(draft.note.body || draft.note.coverText || "未填写正文", 160))}</p>
                </div>
                <div class="item-actions">
                  <button
                    type="button"
                    class="button button-danger button-small"
                    data-action="open-sample-library-delete-modal"
                    data-id="${escapeHtml(selectedRecord.id || "")}"
                  >
                    删除记录
                  </button>
                </div>
              </div>
              <p class="helper-text">四块信息会在点击“保存整条记录”后统一提交到这条学习样本。</p>
              <div class="sample-library-modal-stack compact-form">
                ${buildSampleLibraryBaseEditorSectionMarkup({
                  title: draft.note.title,
                  body: draft.note.body,
                  coverText: draft.note.coverText,
                  collectionType: draft.note.collectionType,
                  tags: draft.note.tags
                })}
                ${buildSampleLibraryReferenceEditorSectionMarkup(draft.reference, { notesFieldName: "referenceNotes" })}
                ${buildSampleLibraryLifecycleEditorSectionMarkup(draft.publish, { notesFieldName: "publishNotes" })}
                ${buildSampleLibraryCalibrationEditorSectionsMarkup({
                  prediction: draft.calibration.prediction,
                  retro: draft.calibration.retro,
                  comparison: buildSampleLibraryCalibrationRetroComparison({
                    prediction: draft.calibration.prediction,
                    publish: draft.publish
                  }),
                  comparisonStatusLabel: predictionMatchedLabel(comparisonMatched),
                  missReasonSuggestion: draft.calibration.retro.missReason,
                  referenceAction
                })}
              </div>
            `
            : '<div class="result-card muted">当前标题筛选下没有可编辑的记录。</div>'
        }
      </div>
    </div>
  `;
}

export function buildSampleLibraryRecordInlineEditorSwitchConfirmModalMarkup(returnTo = null, helpers = {}) {
  const escapeHtml = helpers.escapeHtml || localEscapeHtml;
  const compactText = helpers.compactText || ((value = "") => String(value || "").trim());
  const getSampleRecordTitle = helpers.getSampleRecordTitle || ((record = {}) => String(record?.title || "").trim());
  const getSampleRecordBody = helpers.getSampleRecordBody || ((record = {}) => String(record?.body || "").trim());
  const sampleLibraryRecords = Array.isArray(helpers.sampleLibraryRecords) ? helpers.sampleLibraryRecords : [];
  const selectedRecordId = String(returnTo?.selectedRecordId || "");
  const record = sampleLibraryRecords.find((item) => String(item?.id || "") === selectedRecordId) || sampleLibraryRecords[0] || null;

  return `
    <div class="sample-library-modal-stack">
      <section class="sample-library-modal-section">
        <div class="sample-library-modal-section-head">
          <strong>是否切换并丢弃未保存修改？</strong>
          <p>继续切换后，当前这条记录里尚未保存的修改会被丢弃，你可以先返回编辑再决定是否保存。</p>
        </div>
        <article class="sample-library-detail-summary-card">
          <strong>${escapeHtml(getSampleRecordTitle(record) || "未命名样本记录")}</strong>
          <p>${escapeHtml(compactText(returnTo?.draft?.note?.body || returnTo?.draft?.note?.coverText || getSampleRecordBody(record), 180) || "未填写正文")}</p>
        </article>
      </section>
    </div>
  `;
}

export function buildSampleLibraryRecordInlineEditorCloseConfirmModalMarkup(returnTo = null, helpers = {}) {
  return buildSampleLibraryRecordInlineEditorSwitchConfirmModalMarkup(returnTo, helpers).replace("是否切换并丢弃未保存修改？", "是否关闭并丢弃未保存修改？").replace(
    "继续切换后，当前这条记录里尚未保存的修改会被丢弃，你可以先返回编辑再决定是否保存。",
    "继续关闭后，当前这条记录里尚未保存的修改会被丢弃，你可以先返回编辑再决定是否保存。"
  );
}

export function buildSampleLibraryNoteModalMarkup(options = {}, helpers = {}) {
  const buildSampleLibraryBaseEditorSectionMarkup = helpers.buildSampleLibraryBaseEditorSectionMarkup;
  return `
    <div class="sample-library-modal-stack compact-form">
      ${buildSampleLibraryBaseEditorSectionMarkup(options)}
    </div>
  `;
}

export function buildSampleLibraryCreateModalMarkup(helpers = {}) {
  return buildSampleLibraryNoteModalMarkup(
    {
      includeViews: true,
      includePrefillActions: true
    },
    helpers
  );
}

export function buildSampleLibraryBaseModalMarkup(record = {}, helpers = {}) {
  const getSampleRecordNote = helpers.getSampleRecordNote || ((value = {}) => value?.note || value || {});
  const getSampleRecordCollectionType = helpers.getSampleRecordCollectionType || ((value = {}) => String(value?.collectionType || "").trim());
  const note = getSampleRecordNote(record);

  return buildSampleLibraryNoteModalMarkup(
    {
      title: note.title || "",
      body: note.body || "",
      coverText: note.coverText || "",
      collectionType: getSampleRecordCollectionType(record),
      tags: note.tags || []
    },
    helpers
  );
}

export function buildSampleLibraryDeleteModalMarkup(record = {}, helpers = {}) {
  const escapeHtml = helpers.escapeHtml || localEscapeHtml;
  const compactText = helpers.compactText || ((value = "") => String(value || "").trim());
  const getSampleRecordTitle = helpers.getSampleRecordTitle || ((value = {}) => String(value?.title || "").trim());
  const getSampleRecordBody = helpers.getSampleRecordBody || ((value = {}) => String(value?.body || "").trim());
  const getSampleRecordCoverText = helpers.getSampleRecordCoverText || ((value = {}) => String(value?.coverText || "").trim());

  return `
    <div class="sample-library-modal-stack">
      <section class="sample-library-modal-section">
        <div class="sample-library-modal-section-head">
          <strong>确认删除这条学习样本？</strong>
          <p>删除后这条记录会从学习样本列表中移除，相关参考属性和生命周期回填也会一起消失。</p>
        </div>
        <article class="sample-library-detail-summary-card">
          <strong>${escapeHtml(getSampleRecordTitle(record) || "未命名样本记录")}</strong>
          <p>${escapeHtml(compactText(getSampleRecordBody(record) || getSampleRecordCoverText(record), 180) || "未填写正文")}</p>
        </article>
      </section>
    </div>
  `;
}

export function buildFeedbackRuleQueueModalMarkup(modalState = {}, helpers = {}) {
  const escapeHtml = helpers.escapeHtml || localEscapeHtml;
  return `
    <div class="sample-library-modal-stack compact-form">
      <section class="sample-library-modal-section">
        <div class="sample-library-modal-section-head">
          <strong>加入规则复核</strong>
          <p>先确认这次要带过去的候选词、语境和平台原因，再跳转到规则维护。</p>
        </div>
        <label>
          <span>候选词</span>
          <input name="source" value="${escapeHtml(modalState.source || "")}" placeholder="候选词" />
        </label>
        <label>
          <span>语境分类</span>
          <input name="category" value="${escapeHtml(modalState.category || "")}" placeholder="待人工判断" />
        </label>
        <label>
          <span>平台原因</span>
          <textarea name="xhsReason" rows="3" placeholder="补充平台原因">${escapeHtml(modalState.xhsReason || "")}</textarea>
        </label>
      </section>
    </div>
  `;
}

export function buildFeedbackFalsePositiveModalMarkup(modalState = {}, helpers = {}) {
  const escapeHtml = helpers.escapeHtml || localEscapeHtml;
  const compactText = helpers.compactText || ((value = "") => String(value || "").trim());
  const buildSampleLibraryModalTagPickerMarkup = helpers.buildSampleLibraryModalTagPickerMarkup;

  return `
    <div class="sample-library-modal-stack compact-form">
      <section class="sample-library-modal-section">
        <div class="sample-library-modal-section-head">
          <strong>记录为误报案例</strong>
          <p>先确认标题、正文摘要和备注，再把它转入误报待确认列表。</p>
        </div>
        <article class="sample-library-detail-summary-card">
          <strong>${escapeHtml(modalState.title || "未命名反馈")}</strong>
          <p>${escapeHtml(compactText(modalState.body || "", 180) || "未填写正文")}</p>
        </article>
        ${buildSampleLibraryModalTagPickerMarkup(modalState.tags || [])}
        <label>
          <span>备注</span>
          <textarea name="userNotes" rows="3" placeholder="补充误报备注">${escapeHtml(modalState.userNotes || "")}</textarea>
        </label>
      </section>
    </div>
  `;
}
