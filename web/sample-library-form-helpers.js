export function readSampleLibraryCreateModalPayload(contentNode, helpers = {}) {
  const splitCSV = helpers.splitCSV || ((value = "") => String(value || "").split(",").map((item) => item.trim()).filter(Boolean));
  const contentType = contentNode?.querySelector('[name="contentType"]')?.value || "image_text";

  return {
    title: contentNode?.querySelector('[name="title"]')?.value || "",
    body: contentNode?.querySelector('[name="body"]')?.value || "",
    coverText: contentNode?.querySelector('[name="coverText"]')?.value || "",
    contentType,
    videoScript: contentType === "video" ? contentNode?.querySelector('[name="videoScript"]')?.value || "" : "",
    collectionType: contentNode?.querySelector('[name="collectionType"]')?.value || "",
    tags: splitCSV(contentNode?.querySelector('[name="tags"]')?.value || ""),
    views: contentNode?.querySelector('[name="views"]')?.value || 0,
    shares: contentNode?.querySelector('[name="shares"]')?.value || 0
  };
}

export function readSampleLibraryModalBasePayload(contentNode, helpers = {}) {
  const splitCSV = helpers.splitCSV || ((value = "") => String(value || "").split(",").map((item) => item.trim()).filter(Boolean));
  const contentType = contentNode?.querySelector('[name="contentType"]')?.value || "image_text";

  return {
    title: contentNode?.querySelector('[name="title"]')?.value || "",
    body: contentNode?.querySelector('[name="body"]')?.value || "",
    coverText: contentNode?.querySelector('[name="coverText"]')?.value || "",
    contentType,
    videoScript: contentType === "video" ? contentNode?.querySelector('[name="videoScript"]')?.value || "" : "",
    collectionType: contentNode?.querySelector('[name="collectionType"]')?.value || "",
    tags: splitCSV(contentNode?.querySelector('[name="tags"]')?.value || "")
  };
}

export function getSampleLibraryCreateRequirementMessage(root, helpers = {}) {
  const title = String(root?.querySelector('[name="title"]')?.value || "").trim();
  const body = String(root?.querySelector('[name="body"]')?.value || "").trim();
  const coverText = String(root?.querySelector('[name="coverText"]')?.value || "").trim();
  const collectionType = String(root?.querySelector('[name="collectionType"]')?.value || "").trim();

  if (!title && !body && !coverText) {
    return "请至少填写标题、正文或封面文案。";
  }

  if (!collectionType) {
    return "请先选择合集类型。";
  }

  return "";
}

export function readFeedbackRuleQueueModalPayload(contentNode) {
  return {
    source: contentNode?.querySelector('[name="source"]')?.value || "",
    category: contentNode?.querySelector('[name="category"]')?.value || "",
    xhsReason: contentNode?.querySelector('[name="xhsReason"]')?.value || ""
  };
}

export function readFeedbackFalsePositiveModalPayload(contentNode, helpers = {}) {
  const splitCSV = helpers.splitCSV || ((value = "") => String(value || "").split(",").map((item) => item.trim()).filter(Boolean));

  return {
    tags: splitCSV(contentNode?.querySelector('[name="tags"]')?.value || ""),
    userNotes: contentNode?.querySelector('[name="userNotes"]')?.value || ""
  };
}

export function readSampleLibraryModalReferencePayload(contentNode) {
  const tier = String(contentNode?.querySelector('[name="tier"]')?.value || "").trim();
  const enabled = contentNode?.querySelector('[name="enabled"]')?.checked === true || Boolean(tier);

  return {
    enabled,
    tier: enabled ? tier || "passed" : "",
    notes: contentNode?.querySelector('[name="notes"]')?.value || ""
  };
}

export function readSampleLibraryModalLifecyclePayload(contentNode) {
  return {
    status: contentNode?.querySelector('[name="status"]')?.value || "not_published",
    publishedAt: contentNode?.querySelector('[name="publishedAt"]')?.value || "",
    platformReason: contentNode?.querySelector('[name="platformReason"]')?.value || "",
    notes: contentNode?.querySelector('[name="notes"]')?.value || "",
    metrics: {
      likes: contentNode?.querySelector('[name="likes"]')?.value || 0,
      favorites: contentNode?.querySelector('[name="favorites"]')?.value || 0,
      comments: contentNode?.querySelector('[name="comments"]')?.value || 0,
      views: contentNode?.querySelector('[name="views"]')?.value || 0,
      shares: contentNode?.querySelector('[name="shares"]')?.value || 0
    }
  };
}

export function readSampleLibraryModalCalibrationPayload(contentNode, helpers = {}) {
  const readSampleLibraryRetroChipFieldValue = helpers.readSampleLibraryRetroChipFieldValue || (() => "");
  const readSampleLibraryRetroChipListValue = helpers.readSampleLibraryRetroChipListValue || (() => []);
  const splitCSV = helpers.splitCSV || ((value = "") => String(value || "").split(",").map((item) => item.trim()).filter(Boolean));
  const uniqueStrings =
    helpers.uniqueStrings || ((items = []) => [...new Set((Array.isArray(items) ? items : [items]).map((item) => String(item || "").trim()).filter(Boolean))]);

  return {
    prediction: {
      predictedStatus: contentNode?.querySelector('[name="predictedStatus"]')?.value || "not_published",
      predictedRiskLevel: contentNode?.querySelector('[name="predictedRiskLevel"]')?.value || "",
      predictedPerformanceTier: contentNode?.querySelector('[name="predictedPerformanceTier"]')?.value || "",
      confidence: contentNode?.querySelector('[name="predictionConfidence"]')?.value || 0,
      reason: contentNode?.querySelector('[name="predictionReason"]')?.value || "",
      model: contentNode?.querySelector('[name="predictionModel"]')?.value || "",
      createdAt: contentNode?.querySelector('[name="predictionCreatedAt"]')?.value || ""
    },
    retro: {
      actualPerformanceTier: contentNode?.querySelector('[name="actualPerformanceTier"]')?.value || "",
      predictionMatched: contentNode?.querySelector('[name="predictionMatched"]')?.checked === true,
      missReason: readSampleLibraryRetroChipFieldValue(contentNode, "missReason"),
      validatedSignals: readSampleLibraryRetroChipListValue(contentNode, "validatedSignals", {
        splitCSV,
        uniqueStrings
      }),
      invalidatedSignals: readSampleLibraryRetroChipListValue(contentNode, "invalidatedSignals", {
        splitCSV,
        uniqueStrings
      }),
      shouldBecomeReference: contentNode?.querySelector('[name="shouldBecomeReference"]')?.checked === true,
      ruleImprovementCandidate: readSampleLibraryRetroChipFieldValue(contentNode, "ruleImprovementCandidate"),
      notes: contentNode?.querySelector('[name="retroNotes"]')?.value || "",
      reviewedAt: contentNode?.querySelector('[name="reviewedAt"]')?.value || ""
    }
  };
}

export function buildSampleLibraryDetailModalConfig(kind, record, helpers = {}) {
  const getSampleRecordTitle = helpers.getSampleRecordTitle || ((value = {}) => String(value?.title || "").trim());
  const buildSampleLibraryReferenceModalMarkup = helpers.buildSampleLibraryReferenceModalMarkup || (() => "");
  const buildSampleLibraryLifecycleModalMarkup = helpers.buildSampleLibraryLifecycleModalMarkup || (() => "");
  const buildSampleLibraryCalibrationModalMarkup = helpers.buildSampleLibraryCalibrationModalMarkup || (() => "");

  if (kind === "reference") {
    return {
      title: "编辑参考属性",
      subtitle: getSampleRecordTitle(record) || "这条记录的参考样本设置",
      body: buildSampleLibraryReferenceModalMarkup(record),
      saveLabel: "保存参考属性"
    };
  }

  if (kind === "lifecycle") {
    return {
      title: "编辑生命周期属性",
      subtitle: getSampleRecordTitle(record) || "回填发布结果与互动表现",
      body: buildSampleLibraryLifecycleModalMarkup(record),
      saveLabel: "保存生命周期属性"
    };
  }

  return {
    title: "编辑预判复盘",
    subtitle: getSampleRecordTitle(record) || "把预判和真实结果放到同一条样本里复盘",
    body: buildSampleLibraryCalibrationModalMarkup(record),
    saveLabel: "保存预判复盘"
  };
}
