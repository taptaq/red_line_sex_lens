const TIER_PRIORITY = {
  "": 0,
  passed: 1,
  performed: 2,
  featured: 3
};

function normalizeString(value = "") {
  return String(value || "").trim();
}

function normalizeStatus(value = "") {
  const normalized = normalizeString(value);

  if (["published_passed", "positive_performance", "limited", "violation", "false_positive"].includes(normalized)) {
    return normalized;
  }

  return "not_published";
}

function normalizeTier(value = "") {
  const normalized = normalizeString(value);
  return ["passed", "performed", "featured"].includes(normalized) ? normalized : "";
}

function normalizePerformanceTier(value = "") {
  const normalized = normalizeString(value);
  return ["low", "medium", "high"].includes(normalized) ? normalized : "";
}

function isPositiveReferenceStatus(status = "") {
  return ["published_passed", "positive_performance"].includes(normalizeStatus(status));
}

function successTierLabel(tier = "") {
  if (tier === "featured") return "人工精选标杆";
  if (tier === "performed") return "过审且表现好";
  return "仅过审";
}

function buildReferenceStatusSummary(reference = {}) {
  const enabled = reference?.enabled === true;
  const tier = normalizeTier(reference?.tier);

  if (!enabled) {
    return "当前参考状态：未启用";
  }

  return `当前参考状态：已启用 · ${successTierLabel(tier || "passed")}`;
}

function chooseHigherTier(left = "", right = "") {
  const normalizedLeft = normalizeTier(left);
  const normalizedRight = normalizeTier(right);
  return (TIER_PRIORITY[normalizedLeft] || 0) >= (TIER_PRIORITY[normalizedRight] || 0) ? normalizedLeft : normalizedRight;
}

function deriveRecommendedTier({ reference = {}, publish = {}, retro = {} } = {}) {
  const existingTier = normalizeTier(reference.tier);
  const actualPerformanceTier = normalizePerformanceTier(retro.actualPerformanceTier);
  const publishStatus = normalizeStatus(publish.status);
  const recommendedTier =
    publishStatus === "positive_performance" || actualPerformanceTier === "high" ? "performed" : "passed";

  return chooseHigherTier(existingTier, recommendedTier) || recommendedTier;
}

export function deriveSampleLibraryReferenceApplication({ record = {}, calibration = {} } = {}) {
  const reference = record?.reference && typeof record.reference === "object" ? record.reference : {};
  const publish = record?.publish && typeof record.publish === "object" ? record.publish : {};
  const retro = calibration?.retro && typeof calibration.retro === "object" ? calibration.retro : {};
  const shouldBecomeReference = retro.shouldBecomeReference === true;

  if (!shouldBecomeReference) {
    return {
      canApply: false,
      requirementMessage: "请先勾选“应转参考样本”，再显式应用到参考样本池。",
      buttonLabel: reference.enabled === true ? "更新参考样本" : "应用为参考样本",
      statusSummary: buildReferenceStatusSummary(reference)
    };
  }

  if (!isPositiveReferenceStatus(publish.status)) {
    return {
      canApply: false,
      requirementMessage: "当前发布结果不是正向样本，暂不建议转为参考样本。",
      buttonLabel: reference.enabled === true ? "更新参考样本" : "应用为参考样本",
      statusSummary: buildReferenceStatusSummary(reference)
    };
  }

  const tier = deriveRecommendedTier({ reference, publish, retro });
  const selectedBy = normalizeString(reference.selectedBy) || "calibration_retro";
  const notes = normalizeString(reference.notes) || "来自发布后复盘手动应用";
  const alreadyEnabled = reference.enabled === true;

  return {
    canApply: true,
    requirementMessage: "",
    buttonLabel: alreadyEnabled ? "更新参考样本" : "应用为参考样本",
    statusSummary: buildReferenceStatusSummary(reference),
    helperText: alreadyEnabled
      ? "会按当前复盘结果同步这条记录的参考属性，不会静默改成更高的人工精选等级。"
      : "需要手动点击后才会真正启用，不会随着保存复盘自动升级。",
    reference: {
      enabled: true,
      tier,
      selectedBy,
      notes
    },
    successMessage: alreadyEnabled
      ? `已按复盘结果更新参考属性，当前等级：${successTierLabel(tier)}。`
      : `已应用为参考样本，当前等级：${successTierLabel(tier)}。`
  };
}
