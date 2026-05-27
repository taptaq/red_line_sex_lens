export function parseSampleLibraryRetroChipField(value = "", presetOptions = []) {
  const raw = String(value || "").trim();
  const options = Array.isArray(presetOptions) ? presetOptions : [];
  const selected = [];
  let remaining = raw;

  for (const option of options) {
    const normalizedOption = String(option || "").trim();

    if (!normalizedOption || !remaining.includes(normalizedOption)) {
      continue;
    }

    selected.push(normalizedOption);
    remaining = remaining.split(normalizedOption).join("");
  }

  remaining = remaining
    .replace(/[、，,]+/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return {
    selected: [...new Set(selected)],
    supplement: remaining
  };
}

export function serializeSampleLibraryRetroChipField(selected = [], supplement = "") {
  const chipText = (Array.isArray(selected) ? selected : [])
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .join("、");
  const noteText = String(supplement || "").trim();

  if (chipText && noteText) {
    return `${chipText}\n\n${noteText}`;
  }

  return chipText || noteText;
}

export function readSampleLibraryRetroChipFieldValue(contentNode, fieldName) {
  const normalizedFieldName = String(fieldName || "").trim();

  if (!contentNode || !normalizedFieldName) {
    return "";
  }

  const hiddenField = contentNode?.querySelector(`[name="${normalizedFieldName}"]`);

  const selected = Array.from(
    contentNode.querySelectorAll(
      `[name="${normalizedFieldName}"] ~ .sample-library-retro-chip-list .sample-library-retro-chip.is-selected`
    )
  )
    .map((node) => String(node.textContent || "").trim())
    .filter(Boolean);
  const supplement = contentNode?.querySelector(`[name="${normalizedFieldName}Supplement"]`)?.value || "";

  if (selected.length || String(supplement || "").trim()) {
    const serializedValue = serializeSampleLibraryRetroChipField(selected, supplement);

    if (hiddenField) {
      hiddenField.value = serializedValue;
    }

    return serializedValue;
  }

  return hiddenField?.value || "";
}

export function readSampleLibraryRetroChipListValue(contentNode, fieldName, helpers = {}) {
  const { splitCSV, uniqueStrings } = helpers;
  const normalizedFieldName = String(fieldName || "").trim();

  if (!contentNode || !normalizedFieldName) {
    return [];
  }

  const selected = Array.from(
    contentNode.querySelectorAll(
      `[name="${normalizedFieldName}"] ~ .sample-library-retro-chip-list .sample-library-retro-chip.is-selected`
    )
  )
    .map((node) => String(node.textContent || "").trim())
    .filter(Boolean);
  const supplement = String(contentNode?.querySelector(`[name="${normalizedFieldName}Supplement"]`)?.value || "").trim();
  const fallback = splitCSV?.(contentNode?.querySelector(`[name="${normalizedFieldName}"]`)?.value || "") || [];

  if (selected.length || supplement) {
    return uniqueStrings?.([...selected, ...(supplement ? [supplement] : [])]) || [...selected, ...(supplement ? [supplement] : [])];
  }

  return fallback;
}

export function toggleSampleLibraryRetroChipSelection(chipNode) {
  if (!chipNode?.classList) {
    return false;
  }

  const selected = chipNode.classList.toggle("is-selected");

  if (typeof chipNode.setAttribute === "function") {
    chipNode.setAttribute("aria-pressed", String(selected));
  }

  return selected;
}

export function buildSampleLibraryRetroChipGroupMarkup(
  {
    label = "",
    hiddenFieldName = "",
    hiddenFieldTag = "input",
    hiddenFieldValue = "",
    presetOptions = [],
    selected = [],
    supplementFieldName = "",
    supplementValue = "",
    supplementPlaceholder = "",
    supplementRows = 2
  } = {},
  helpers = {}
) {
  const {
    escapeHtml = (value = "") => String(value || ""),
    uniqueStrings = (items = []) => [...new Set((Array.isArray(items) ? items : [items]).map((item) => String(item || "").trim()).filter(Boolean))]
  } = helpers;
  const normalizedSelected = uniqueStrings(selected);
  const optionsMarkup = (Array.isArray(presetOptions) ? presetOptions : [])
    .map((option) => {
      const normalizedOption = String(option || "").trim();

      if (!normalizedOption) {
        return "";
      }

      return `<button type="button" class="sample-library-retro-chip${
        normalizedSelected.includes(normalizedOption) ? " is-selected" : ""
      }" aria-pressed="${normalizedSelected.includes(normalizedOption) ? "true" : "false"}">${escapeHtml(normalizedOption)}</button>`;
    })
    .join("");

  const hiddenFieldMarkup =
    hiddenFieldTag === "textarea"
      ? `<textarea name="${escapeHtml(hiddenFieldName)}" hidden aria-hidden="true">${escapeHtml(hiddenFieldValue)}</textarea>`
      : `<input type="hidden" name="${escapeHtml(hiddenFieldName)}" value="${escapeHtml(hiddenFieldValue)}" />`;
  const supplementControlMarkup =
    supplementRows > 1
      ? `<textarea
          class="sample-library-retro-supplement"
          name="${escapeHtml(supplementFieldName)}"
          rows="${Number(supplementRows) || 2}"
          placeholder="${escapeHtml(supplementPlaceholder)}"
        >${escapeHtml(supplementValue)}</textarea>`
      : `<input
          class="sample-library-retro-supplement"
          name="${escapeHtml(supplementFieldName)}"
          value="${escapeHtml(supplementValue)}"
          placeholder="${escapeHtml(supplementPlaceholder)}"
        />`;

  return `
    <label class="sample-library-retro-chip-group">
      <span>${escapeHtml(label)}</span>
      ${hiddenFieldMarkup}
      <div class="sample-library-retro-chip-list">${optionsMarkup}</div>
      ${supplementControlMarkup}
    </label>
  `;
}

export function deriveSampleLibraryCalibrationSignalCategories(prediction = {}) {
  const sourceSignals = Array.isArray(prediction?.evidenceSignals) ? prediction.evidenceSignals : [];
  const categories = [];

  for (const signal of sourceSignals) {
    const text = String(signal || "").trim();

    if (!text) {
      continue;
    }

    if (text.includes("标题")) categories.push("标题结构");
    if (text.includes("开头")) categories.push("开头切口");
    if (text.includes("合集")) categories.push("合集匹配");
    if (text.includes("标签")) categories.push("标签匹配");
    if (text.includes("正文")) categories.push("正文长度");
    if (text.includes("风格")) categories.push("风格稳定");
    if (text.includes("情绪")) categories.push("情绪共鸣");
    if (text.includes("互动")) categories.push("互动点明确");
    if (text.includes("风险")) categories.push("风险预判准确");
    if (text.includes("参考样本") || text.includes("样本")) categories.push("参考样本有效");
    if (text.includes("检测结论") || text.includes("检测级别")) categories.push("规则检测");
    if (text.includes("规则分") || text.includes("分数参考")) categories.push("分数参考");
  }

  return [...new Set(categories)];
}

export function buildSampleLibraryCalibrationEvidenceMarkup(prediction = {}, helpers = {}) {
  const buildSampleLibraryCalibrationEvidenceState =
    helpers.buildSampleLibraryCalibrationEvidenceState ||
    ((value = {}) => ({
      samples: Array.isArray(value?.evidenceSamples) ? value.evidenceSamples : [],
      signals: Array.isArray(value?.evidenceSignals) ? value.evidenceSignals : [],
      summary: String(value?.evidenceSummary || "").trim() || "当前还没有足够的匹配证据，建议先结合检测结果再判断。",
      confidence: Number(value?.confidence ?? 0) || 0,
      confidenceNote: Number(value?.confidence ?? 0)
        ? `当前置信度 ${Number(value?.confidence ?? 0)} / 100，这是一条温和提示，适合辅助人工复核。`
        : "当前置信度仍偏保守，建议把它当作辅助线索，不单独代替人工判断。"
    }));
  const escapeHtml = helpers.escapeHtml || ((value = "") => String(value || ""));
  const evidence = buildSampleLibraryCalibrationEvidenceState(prediction);
  const signalCategories = deriveSampleLibraryCalibrationSignalCategories(prediction);
  const manualReviewDetected =
    String(prediction?.predictedStatus || "").trim() === "limited" ||
    evidence.signals.some((signal) => String(signal || "").includes("人工复核"));
  const sampleItemsMarkup = evidence.samples
    .map((item) => {
      const label = String(item?.title || item?.id || "未命名样本").trim() || "未命名样本";
      return `<li>${escapeHtml(label)}</li>`;
    })
    .join("");
  const signalsMarkup = evidence.signals
    .map((signal) => `<span class="meta-pill">${escapeHtml(signal)}</span>`)
    .join("");

  return `
    <section class="sample-library-calibration-evidence" aria-label="预判依据">
      <div class="sample-library-calibration-evidence-head">
        <strong>预判依据</strong>
        <p>${escapeHtml(evidence.summary)}</p>
      </div>
      ${
        manualReviewDetected
          ? `
      <div class="item-actions">
        <button type="button" class="button button-ghost button-small" data-action="rewrite-sample-library-calibration-record">
          一键合规改写
        </button>
      </div>
      `
          : ""
      }
      <div class="sample-library-calibration-evidence-block">
        <span class="sample-library-calibration-evidence-label">命中样本</span>
        <ul class="sample-library-calibration-evidence-list">${sampleItemsMarkup}</ul>
      </div>
      <div class="sample-library-calibration-evidence-block">
        <span class="sample-library-calibration-evidence-label">证据信号</span>
        <div class="meta-row sample-library-calibration-evidence-signals">${signalsMarkup}</div>
      </div>
      <div class="sample-library-calibration-evidence-block">
        <span class="sample-library-calibration-evidence-label">可回看信号</span>
        <div class="meta-row sample-library-calibration-evidence-signals">
          ${
            signalCategories.length
              ? signalCategories.map((signal) => `<span class="meta-pill">${escapeHtml(signal)}</span>`).join("")
              : '<span class="meta-pill">当前还没有可回看的预判信号</span>'
          }
        </div>
      </div>
      <p class="sample-library-calibration-evidence-note">${escapeHtml(evidence.confidenceNote)}</p>
    </section>
  `;
}

export function deriveSampleLibraryRetroSignalSuggestions({ prediction = {}, comparison = {} } = {}) {
  const evidenceSignals = Array.isArray(prediction?.evidenceSignals) ? prediction.evidenceSignals : [];
  const validated = [];
  const invalidated = [];
  const predictedRiskLevel = String(prediction?.predictedRiskLevel || "").trim();
  const predictedPerformanceTier = String(prediction?.predictedPerformanceTier || "").trim();
  const actualPerformanceTier = String(comparison?.actualPerformanceTier || "").trim();
  const missReasonSuggestion = String(comparison?.missReasonSuggestion || "").trim();

  for (const signal of evidenceSignals) {
    const text = String(signal || "").trim();

    if (!text) {
      continue;
    }

    if (text.includes("标题")) validated.push("标题结构");
    if (text.includes("开头")) validated.push("开头切口");
    if (text.includes("合集")) validated.push("合集匹配");
    if (text.includes("标签")) validated.push("标签匹配");
    if (text.includes("风格")) validated.push("风格稳定");
    if (text.includes("情绪")) validated.push("情绪共鸣");
    if (text.includes("互动")) validated.push("互动点明确");
    if (text.includes("参考样本")) validated.push("参考样本有效");
  }

  if (comparison?.matched === true) {
    validated.push("风险预判准确");
  } else {
    if (missReasonSuggestion.includes("预判状态偏差")) {
      if (predictedRiskLevel === "high" || predictedRiskLevel === "medium") {
        invalidated.push("风险偏高估");
      } else if (predictedRiskLevel === "low") {
        invalidated.push("风险偏低估");
      }
    }

    if (predictedPerformanceTier && actualPerformanceTier && predictedPerformanceTier !== actualPerformanceTier) {
      if (predictedPerformanceTier === "high") {
        invalidated.push("表现高估");
      } else if (predictedPerformanceTier === "low") {
        invalidated.push("表现低估");
      } else {
        invalidated.push("互动预期失准");
      }
    }
  }

  return {
    validated: [...new Set(validated)],
    invalidated: [...new Set(invalidated)]
  };
}

export function buildSampleLibraryCalibrationEditorSectionsMarkup(args = {}, helpers = {}) {
  const {
    prediction = {},
    retro = {},
    comparison = null,
    comparisonStatusLabel = "待复盘",
    missReasonSuggestion = "",
    referenceAction = null,
    retroTimingHint = null
  } = args;
  const {
    buildSampleLibraryModalSectionMarkup = ({ title = "", description = "", body = "", className = "" } = {}) =>
      `
        <section class="sample-library-modal-section${className ? ` ${className}` : ""}">
          <div class="sample-library-modal-section-head">
            <strong>${String(title || "")}</strong>
            <p>${String(description || "")}</p>
          </div>
          ${body}
        </section>
      `,
    buildSampleLibraryCalibrationEvidenceMarkup: buildEvidenceMarkup = buildSampleLibraryCalibrationEvidenceMarkup,
    buildSampleLibraryRetroChipGroupMarkup: buildRetroChipGroupMarkup = buildSampleLibraryRetroChipGroupMarkup,
    escapeHtml = (value = "") => String(value || ""),
    getSampleLibraryCalibrationPredictionPrefillSourceSummary = () => "当前预填来源：未知",
    getSampleLibraryRetroTimingHintClassName = () => "",
    joinCSV = (items = []) => (Array.isArray(items) ? items.join(", ") : ""),
    parseSampleLibraryRetroChipField = (value = "") => ({ selected: [], supplement: String(value || "") }),
    uniqueStrings = (items = []) => [...new Set((Array.isArray(items) ? items : [items]).map((item) => String(item || "").trim()).filter(Boolean))],
    sampleLibraryRetroChipPresets = {}
  } = helpers;
  const prefillSourceSummary =
    (getSampleLibraryCalibrationPredictionPrefillSourceSummary || (() => "当前预填来源：未知"))();
  const missReasonValue = String(retro.missReason || "");
  const validatedSignalsValue = joinCSV(retro.validatedSignals);
  const invalidatedSignalsValue = joinCSV(retro.invalidatedSignals);
  const ruleImprovementCandidateValue = String(retro.ruleImprovementCandidate || "");
  const missReasonState = parseSampleLibraryRetroChipField(missReasonValue, sampleLibraryRetroChipPresets.missReason || []);
  const validatedSignalsState = parseSampleLibraryRetroChipField(
    validatedSignalsValue,
    sampleLibraryRetroChipPresets.validatedSignals || []
  );
  const invalidatedSignalsState = parseSampleLibraryRetroChipField(
    invalidatedSignalsValue,
    sampleLibraryRetroChipPresets.invalidatedSignals || []
  );
  const ruleImprovementCandidateState = parseSampleLibraryRetroChipField(
    ruleImprovementCandidateValue,
    sampleLibraryRetroChipPresets.ruleImprovementCandidate || []
  );
  const retroSignalSuggestions = deriveSampleLibraryRetroSignalSuggestions({
    prediction,
    comparison: {
      ...(comparison && typeof comparison === "object" ? comparison : {}),
      missReasonSuggestion
    }
  });
  const suggestionLead = comparison?.matched
    ? "建议优先关注：这次预判命中，先从被验证信号里选最贴近的项。"
    : "建议优先关注：这次预判有偏差，先从被推翻信号里选最贴近的项。";
  const suggestionParts = [
    retroSignalSuggestions.validated.length ? `被验证信号可优先看：${retroSignalSuggestions.validated.join("、")}` : "",
    retroSignalSuggestions.invalidated.length ? `被推翻信号可优先看：${retroSignalSuggestions.invalidated.join("、")}` : ""
  ].filter(Boolean);

  return `
      ${buildSampleLibraryModalSectionMarkup({
        title: "发布前预判",
        description: "这部分用于锁定当时的判断基线。",
        body: `
        <div class="lifecycle-primary-grid">
          <label>
            <span>预判发布状态</span>
            <select name="predictedStatus">
              <option value="not_published"${prediction.predictedStatus === "not_published" ? " selected" : ""}>未发布</option>
              <option value="published_passed"${prediction.predictedStatus === "published_passed" ? " selected" : ""}>已发布通过</option>
              <option value="limited"${prediction.predictedStatus === "limited" ? " selected" : ""}>疑似限流</option>
              <option value="violation"${prediction.predictedStatus === "violation" ? " selected" : ""}>平台判违规</option>
              <option value="false_positive"${prediction.predictedStatus === "false_positive" ? " selected" : ""}>系统误报 / 平台放行</option>
              <option value="positive_performance"${prediction.predictedStatus === "positive_performance" ? " selected" : ""}>过审且表现好</option>
            </select>
          </label>
          <label>
            <span>预判风险</span>
            <select name="predictedRiskLevel">
              <option value=""${!prediction.predictedRiskLevel ? " selected" : ""}>未预判</option>
              <option value="low"${prediction.predictedRiskLevel === "low" ? " selected" : ""}>低风险</option>
              <option value="medium"${prediction.predictedRiskLevel === "medium" ? " selected" : ""}>中风险</option>
              <option value="high"${prediction.predictedRiskLevel === "high" ? " selected" : ""}>高风险</option>
            </select>
          </label>
        </div>
        <div class="lifecycle-primary-grid">
          <label>
            <span>预判表现</span>
            <select name="predictedPerformanceTier">
              <option value=""${!prediction.predictedPerformanceTier ? " selected" : ""}>未判断</option>
              <option value="low"${prediction.predictedPerformanceTier === "low" ? " selected" : ""}>低表现</option>
              <option value="medium"${prediction.predictedPerformanceTier === "medium" ? " selected" : ""}>中等表现</option>
              <option value="high"${prediction.predictedPerformanceTier === "high" ? " selected" : ""}>高表现</option>
            </select>
          </label>
          <label>
            <span>置信度</span>
            <input name="predictionConfidence" type="number" min="0" max="100" value="${escapeHtml(String(prediction.confidence || 0))}" />
          </label>
        </div>
        <div class="lifecycle-primary-grid">
          <label>
            <span>预判模型</span>
            <input name="predictionModel" value="${escapeHtml(prediction.model || "")}" placeholder="例如：gpt-5.4" />
          </label>
          <label>
            <span>预判时间</span>
            <input name="predictionCreatedAt" type="date" value="${escapeHtml(String(prediction.createdAt || "").slice(0, 10))}" />
          </label>
        </div>
        <label>
          <span>预判理由</span>
          <textarea name="predictionReason" rows="3" placeholder="例如：标题结构接近高表现样本，但正文风险较低">${escapeHtml(
            prediction.reason || ""
          )}</textarea>
        </label>
        <div data-role="sample-library-calibration-evidence">
          ${buildEvidenceMarkup(prediction)}
        </div>
        <div class="item-actions">
          <button type="button" class="button button-ghost button-small" data-action="prefill-sample-library-modal-calibration-prediction">
            从当前检测预填预判
          </button>
        </div>
        <p class="helper-text">${escapeHtml(prefillSourceSummary)}</p>
        <p class="helper-text" data-role="sample-library-calibration-prefill-message" aria-live="polite"></p>
      `
      })}
      ${buildSampleLibraryModalSectionMarkup({
        title: "发布后复盘",
        description: "把真实结果和偏差原因转成后续可用的判断经验。",
        body: `
        <p class="helper-text ${escapeHtml(
          getSampleLibraryRetroTimingHintClassName(retroTimingHint?.state || "pending")
        )}">${escapeHtml(retroTimingHint?.text || "建议至少等到 T+7 再做发布后复盘。")}</p>
        <div class="lifecycle-primary-grid">
          <label>
            <span>实际表现</span>
            <select name="actualPerformanceTier">
              <option value=""${!retro.actualPerformanceTier ? " selected" : ""}>未判断</option>
              <option value="low"${retro.actualPerformanceTier === "low" ? " selected" : ""}>低表现</option>
              <option value="medium"${retro.actualPerformanceTier === "medium" ? " selected" : ""}>中等表现</option>
              <option value="high"${retro.actualPerformanceTier === "high" ? " selected" : ""}>高表现</option>
            </select>
          </label>
          <label>
            <span>复盘时间</span>
            <input name="reviewedAt" type="date" value="${escapeHtml(String(retro.reviewedAt || "").slice(0, 10))}" />
          </label>
        </div>
        <label class="sample-library-checkbox">
          <input type="checkbox" name="predictionMatched"${retro.predictionMatched ? " checked" : ""} />
          <span>预判命中</span>
        </label>
        <label class="sample-library-checkbox">
          <input type="checkbox" name="shouldBecomeReference"${retro.shouldBecomeReference ? " checked" : ""} />
          <span>应转参考样本</span>
        </label>
        <div class="item-actions">
          <button
            type="button"
            class="button button-ghost button-small"
            data-action="apply-sample-library-reference-from-retro"
          >
            ${escapeHtml(referenceAction?.buttonLabel || "应用为参考样本")}
          </button>
        </div>
        <p class="helper-text" data-role="sample-library-reference-application-status">${escapeHtml(
          referenceAction?.statusSummary || "当前参考状态：未启用"
        )}</p>
        <p class="helper-text">${escapeHtml(
          referenceAction?.helperText || "这里只是复盘建议，只有点击“应用为参考样本”后才会真正写入参考属性。"
        )}</p>
        <p class="helper-text sample-library-retro-suggestion">${escapeHtml(
          suggestionParts.length ? `${suggestionLead} ${suggestionParts.join("；")}` : suggestionLead
        )}</p>
        ${buildRetroChipGroupMarkup({
          label: "偏差原因",
          hiddenFieldName: "missReason",
          hiddenFieldValue: missReasonValue,
          presetOptions: sampleLibraryRetroChipPresets.missReason,
          selected: uniqueStrings(missReasonState.selected),
          supplementFieldName: "missReasonSupplement",
          supplementValue: missReasonState.supplement,
          supplementPlaceholder: "补充未覆盖的偏差原因"
        })}
        ${buildRetroChipGroupMarkup({
          label: "被验证信号",
          hiddenFieldName: "validatedSignals",
          hiddenFieldValue: validatedSignalsValue,
          presetOptions: sampleLibraryRetroChipPresets.validatedSignals,
          selected: uniqueStrings(validatedSignalsState.selected),
          supplementFieldName: "validatedSignalsSupplement",
          supplementValue: validatedSignalsState.supplement,
          supplementPlaceholder: "补充被验证的其他信号"
        })}
        ${buildRetroChipGroupMarkup({
          label: "被推翻信号",
          hiddenFieldName: "invalidatedSignals",
          hiddenFieldValue: invalidatedSignalsValue,
          presetOptions: sampleLibraryRetroChipPresets.invalidatedSignals,
          selected: uniqueStrings(invalidatedSignalsState.selected),
          supplementFieldName: "invalidatedSignalsSupplement",
          supplementValue: invalidatedSignalsState.supplement,
          supplementPlaceholder: "补充被推翻的其他信号"
        })}
        ${buildRetroChipGroupMarkup({
          label: "规则优化候选",
          hiddenFieldName: "ruleImprovementCandidate",
          hiddenFieldTag: "textarea",
          hiddenFieldValue: ruleImprovementCandidateValue,
          presetOptions: sampleLibraryRetroChipPresets.ruleImprovementCandidate,
          selected: uniqueStrings(ruleImprovementCandidateState.selected),
          supplementFieldName: "ruleImprovementCandidateSupplement",
          supplementValue: ruleImprovementCandidateState.supplement,
          supplementPlaceholder: "补充需要继续跟进的规则建议",
          supplementRows: 3
        })}
        <label>
          <span>复盘备注</span>
          <textarea name="retroNotes" rows="3" placeholder="例如：72 小时后表现稳定">${escapeHtml(retro.notes || "")}</textarea>
        </label>
        <p class="helper-text">${escapeHtml(comparisonStatusLabel)}${missReasonSuggestion ? ` · ${escapeHtml(missReasonSuggestion)}` : ""}</p>
      `
      })}
  `;
}
