function splitCSV(value) {
  return String(value || "")
    .split(/[，,、]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeTextValue(value) {
  return String(value || "").trim();
}

function pickFirstDefined(source = {}, keys = []) {
  for (const key of keys) {
    if (source && Object.prototype.hasOwnProperty.call(source, key) && source[key] !== undefined) {
      return source[key];
    }
  }

  return undefined;
}

function unwrapRewritePayload(payload) {
  let current = payload;
  const candidateKeys = ["rewrite", "result", "data", "content", "output", "post"];

  for (let depth = 0; depth < 3; depth += 1) {
    if (!current || typeof current !== "object" || Array.isArray(current)) {
      break;
    }

    if (pickFirstDefined(current, ["title", "body", "content", "text", "正文", "改写正文"]) !== undefined) {
      return current;
    }

    const nestedKey = candidateKeys.find((key) => current[key] && typeof current[key] === "object");
    if (!nestedKey) {
      break;
    }

    current = current[nestedKey];
  }

  return current || payload;
}

function normalizeTagListValue(value) {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeTextValue(item)).filter(Boolean);
  }

  if (typeof value === "string") {
    return splitCSV(value);
  }

  return [];
}

function normalizeRewritePayload(payload) {
  const source = unwrapRewritePayload(payload);

  return {
    model: normalizeTextValue(pickFirstDefined(source, ["model", "modelName", "rewriteModel"])) || "",
    title: normalizeTextValue(pickFirstDefined(source, ["title", "headline", "heading", "标题", "改写标题"])),
    body: normalizeTextValue(
      pickFirstDefined(source, ["body", "content", "text", "正文", "改写正文", "正文内容", "mainText", "bodyText"])
    ),
    coverText: normalizeTextValue(
      pickFirstDefined(source, ["coverText", "cover", "cover_text", "coverCopy", "封面文案", "改写封面文案", "封面"])
    ),
    tags: normalizeTagListValue(
      pickFirstDefined(source, ["tags", "tagList", "hashtags", "labels", "keywords", "recommendedTags", "推荐标签", "标签"])
    ),
    rewriteNotes: normalizeTextValue(
      pickFirstDefined(source, ["rewriteNotes", "notes", "rewriteReason", "rewriteSummary", "改写说明", "润色说明", "修改说明", "说明"])
    ),
    safetyNotes: normalizeTextValue(
      pickFirstDefined(source, ["safetyNotes", "riskNotes", "warnings", "attention", "人工留意", "安全提示", "注意事项", "风险提示"])
    )
  };
}

function hasMeaningfulNoteDraft(note = {}) {
  return Boolean(
    normalizeTextValue(note.title) ||
      normalizeTextValue(note.body) ||
      normalizeTextValue(note.coverText) ||
      splitCSV(note.tags || []).length ||
      (Array.isArray(note.tags) ? note.tags.length : 0)
  );
}

function verdictLabel(verdict) {
  if (verdict === "hard_block") return "高风险拦截";
  if (verdict === "manual_review") return "人工复核";
  if (verdict === "observe") return "观察通过";
  return "通过";
}

function getRecordAnalysisSnapshot(record = {}) {
  if (record?.snapshots?.analysis && typeof record.snapshots.analysis === "object") {
    return record.snapshots.analysis;
  }

  if (record?.analysisSnapshot && typeof record.analysisSnapshot === "object") {
    return record.analysisSnapshot;
  }

  return null;
}

function getRecordRewriteSnapshot(record = {}) {
  if (record?.snapshots?.rewrite && typeof record.snapshots.rewrite === "object") {
    return record.snapshots.rewrite;
  }

  if (record?.rewriteSnapshot && typeof record.rewriteSnapshot === "object") {
    return record.rewriteSnapshot;
  }

  return null;
}

function buildResolvedSource({
  kind = "none",
  analysis = null,
  rewrite = null,
  summary = "",
  requirementMessage = "",
  successMessage = ""
} = {}) {
  return {
    kind,
    analysis,
    rewrite,
    summary,
    requirementMessage,
    successMessage
  };
}

export function resolveSampleLibraryCalibrationPrefillSource({
  latestAnalyzePayload = null,
  latestAnalysis = null,
  latestRewrite = null,
  record = null
} = {}) {
  const currentRewrite = normalizeRewritePayload(latestRewrite);
  const currentHasRewrite = hasMeaningfulNoteDraft(currentRewrite);
  const currentHasAnalyze = hasMeaningfulNoteDraft(latestAnalyzePayload || {}) && Boolean(latestAnalysis);

  const recordAnalysis = getRecordAnalysisSnapshot(record);
  const recordRewrite = normalizeRewritePayload(getRecordRewriteSnapshot(record));
  const recordHasRewrite = hasMeaningfulNoteDraft(recordRewrite);
  const recordHasAnalyze = Boolean(recordAnalysis);

  if (currentHasAnalyze && currentHasRewrite) {
    return buildResolvedSource({
      kind: "current-rewrite-analysis",
      analysis: latestAnalysis,
      rewrite: currentRewrite,
      summary: "当前预填来源：当前改写结果（同时参考当前检测结论）。",
      requirementMessage: "",
      successMessage: "已根据当前检测/改写结果预填预判字段。"
    });
  }

  if (currentHasAnalyze) {
    return buildResolvedSource({
      kind: "current-analysis",
      analysis: latestAnalysis,
      rewrite: null,
      summary: "当前预填来源：当前检测结果。",
      requirementMessage: "",
      successMessage: "已根据当前检测结果预填预判字段。"
    });
  }

  if (recordHasAnalyze && recordHasRewrite) {
    return buildResolvedSource({
      kind: "record-rewrite-analysis",
      analysis: recordAnalysis,
      rewrite: recordRewrite,
      summary: "当前预填来源：这条记录的已保存改写结果（同时参考已保存检测结论）。",
      requirementMessage: "",
      successMessage: "已根据这条记录的已保存检测/改写结果预填预判字段。"
    });
  }

  if (recordHasAnalyze) {
    return buildResolvedSource({
      kind: "record-analysis",
      analysis: recordAnalysis,
      rewrite: null,
      summary: "当前预填来源：这条记录的已保存检测结果。",
      requirementMessage: "",
      successMessage: "已根据这条记录的已保存检测结果预填预判字段。"
    });
  }

  if (currentHasRewrite) {
    return buildResolvedSource({
      kind: "current-rewrite-only",
      analysis: null,
      rewrite: currentRewrite,
      summary: "当前有改写结果，但仍需先完成一次当前检测后才能预填。",
      requirementMessage: "请先生成当前检测结论，再预填预判。",
      successMessage: ""
    });
  }

  if (recordHasRewrite) {
    return buildResolvedSource({
      kind: "record-rewrite-only",
      analysis: null,
      rewrite: recordRewrite,
      summary: "当前预填来源：这条记录只有已保存改写结果，仍需补齐检测快照后才能预填。",
      requirementMessage: "这条记录缺少已保存检测结论，请先重新检测后再预填预判。",
      successMessage: ""
    });
  }

  return buildResolvedSource({
    kind: "none",
    analysis: null,
    rewrite: null,
    summary: "当前预填来源：暂无当前检测结果，也没有可用的已保存检测快照。",
    requirementMessage: "请先完成一次有效检测或改写，再预填预判。",
    successMessage: ""
  });
}

export function buildSampleLibraryCalibrationPrediction(source = {}, selectedModels = {}) {
  const analysis = source?.analysis && typeof source.analysis === "object" ? source.analysis : null;
  const rewrite = source?.rewrite && typeof source.rewrite === "object" ? source.rewrite : null;
  const hasRewrite = hasMeaningfulNoteDraft(rewrite || {});
  const verdict = normalizeTextValue(analysis?.finalVerdict || analysis?.verdict) || "pass";
  const score = Number(analysis?.score || 0);
  const semanticSummary = normalizeTextValue(analysis?.semanticReview?.review?.summary);

  let predictedStatus = "published_passed";
  let predictedRiskLevel = "low";
  let predictedPerformanceTier = "medium";
  let confidence = 72;

  if (verdict === "hard_block") {
    predictedStatus = "violation";
    predictedRiskLevel = "high";
    predictedPerformanceTier = "low";
    confidence = Math.max(82, Math.min(98, Math.round(score || 88)));
  } else if (verdict === "manual_review") {
    predictedStatus = "limited";
    predictedRiskLevel = "medium";
    predictedPerformanceTier = "low";
    confidence = Math.max(60, Math.min(86, Math.round(score || 68)));
  } else if (verdict === "observe") {
    predictedStatus = "published_passed";
    predictedRiskLevel = "low";
    predictedPerformanceTier = "medium";
    confidence = Math.max(58, Math.min(82, 72 - Math.round((score || 0) / 4)));
  } else if (score >= 60) {
    predictedStatus = "limited";
    predictedRiskLevel = "medium";
    predictedPerformanceTier = "low";
    confidence = 66;
  }

  const reasonParts = [
    `当前检测结论：${verdictLabel(verdict)}`,
    Number.isFinite(score) ? `规则分 ${Math.round(score)}` : "",
    semanticSummary,
    hasRewrite && rewrite.rewriteNotes ? `改写说明：${rewrite.rewriteNotes}` : "",
    hasRewrite && rewrite.safetyNotes ? `安全提示：${rewrite.safetyNotes}` : ""
  ].filter(Boolean);

  return {
    predictedStatus,
    predictedRiskLevel,
    predictedPerformanceTier,
    confidence,
    reason: reasonParts.join("；"),
    model: hasRewrite ? rewrite.model || selectedModels.rewrite || "" : selectedModels.semantic || "",
    createdAt: new Date().toISOString().slice(0, 10)
  };
}
