function normalizeString(value) {
  return String(value || "").trim();
}

function normalizeStatus(value = "") {
  const normalized = normalizeString(value);

  if (
    ["not_published", "published_passed", "limited", "violation", "false_positive", "positive_performance"].includes(
      normalized
    )
  ) {
    return normalized;
  }

  return "not_published";
}

function normalizeRiskLevel(value = "") {
  const normalized = normalizeString(value);
  return ["low", "medium", "high"].includes(normalized) ? normalized : "";
}

function normalizePerformanceTier(value = "") {
  const normalized = normalizeString(value);
  return ["low", "medium", "high"].includes(normalized) ? normalized : "";
}

function normalizeMetric(value) {
  const number = Number(String(value ?? "").trim());
  return Number.isFinite(number) && number >= 0 ? Math.floor(number) : 0;
}

function getRecordPublish(record = {}) {
  const publish = record?.publish && typeof record.publish === "object" ? record.publish : {};

  return {
    status: normalizeStatus(publish.status),
    metrics: {
      likes: normalizeMetric(publish.metrics?.likes),
      favorites: normalizeMetric(publish.metrics?.favorites),
      comments: normalizeMetric(publish.metrics?.comments),
      views: normalizeMetric(publish.metrics?.views)
    }
  };
}

function getRecordPrediction(record = {}) {
  const prediction =
    record?.calibration?.prediction && typeof record.calibration.prediction === "object" ? record.calibration.prediction : {};

  return {
    predictedStatus: normalizeStatus(prediction.predictedStatus),
    predictedRiskLevel: normalizeRiskLevel(prediction.predictedRiskLevel),
    predictedPerformanceTier: normalizePerformanceTier(prediction.predictedPerformanceTier),
    confidence: normalizeMetric(prediction.confidence)
  };
}

function getRecordRetro(record = {}) {
  const retro = record?.calibration?.retro && typeof record.calibration.retro === "object" ? record.calibration.retro : {};

  return {
    shouldBecomeReference: retro.shouldBecomeReference === true
  };
}

function getReference(record = {}) {
  const reference = record?.reference && typeof record.reference === "object" ? record.reference : {};

  return {
    enabled: reference.enabled === true,
    tier: normalizeString(reference.tier)
  };
}

function getTitle(record = {}) {
  return normalizeString(record?.note?.title || record?.title || "") || "未命名样本记录";
}

function deriveActualPerformanceTier(publish = {}) {
  const status = normalizeStatus(publish?.status);
  const likes = normalizeMetric(publish?.metrics?.likes);
  const favorites = normalizeMetric(publish?.metrics?.favorites);
  const comments = normalizeMetric(publish?.metrics?.comments);
  const views = normalizeMetric(publish?.metrics?.views);

  if (status === "not_published") {
    return "";
  }

  if (status === "violation" || status === "limited") {
    return "low";
  }

  if (status === "positive_performance" || likes >= 100 || favorites >= 20 || comments >= 10) {
    return "high";
  }

  if (
    likes >= 20 ||
    favorites >= 10 ||
    comments >= 10 ||
    ((likes >= 16 || favorites >= 4 || comments >= 5) && views >= 3000) ||
    status === "published_passed" ||
    status === "false_positive"
  ) {
    return "medium";
  }

  return "low";
}

function buildReplayPrediction(record = {}, { mode = "balanced" } = {}) {
  const prediction = getRecordPrediction(record);
  const reference = getReference(record);
  const referenceIsStrong = reference.tier === "performed" || reference.tier === "featured";
  let predictedStatus = prediction.predictedStatus;

  if (mode === "strict_risk") {
    if (prediction.predictedRiskLevel === "high") {
      predictedStatus = "violation";
    } else if (prediction.predictedRiskLevel === "medium") {
      predictedStatus = "limited";
    } else if (predictedStatus === "not_published") {
      predictedStatus = prediction.predictedPerformanceTier === "high" || referenceIsStrong ? "positive_performance" : "published_passed";
    }
  } else if (mode === "performance_first") {
    if ((prediction.predictedPerformanceTier === "high" || referenceIsStrong) && prediction.predictedRiskLevel !== "high") {
      predictedStatus = "positive_performance";
    } else if (prediction.predictedRiskLevel === "high") {
      predictedStatus = "violation";
    } else if (prediction.predictedRiskLevel === "medium") {
      predictedStatus = "limited";
    } else if (predictedStatus === "not_published") {
      predictedStatus = "published_passed";
    }
  } else if (predictedStatus === "not_published") {
    if (prediction.predictedRiskLevel === "high") {
      predictedStatus = "violation";
    } else if (prediction.predictedRiskLevel === "medium") {
      predictedStatus = "limited";
    } else if (prediction.predictedPerformanceTier === "high" || referenceIsStrong) {
      predictedStatus = "positive_performance";
    } else if (prediction.predictedRiskLevel === "low" || prediction.predictedPerformanceTier || reference.enabled) {
      predictedStatus = "published_passed";
    }
  }

  let predictedPerformanceTier = prediction.predictedPerformanceTier;
  if (!predictedPerformanceTier) {
    if (predictedStatus === "positive_performance" || (mode === "performance_first" && reference.enabled)) {
      predictedPerformanceTier = "high";
    } else if (predictedStatus === "published_passed" || predictedStatus === "false_positive") {
      predictedPerformanceTier = "medium";
    } else if (predictedStatus === "limited" || predictedStatus === "violation") {
      predictedPerformanceTier = "low";
    }
  } else if (mode === "strict_risk" && (predictedStatus === "limited" || predictedStatus === "violation")) {
    predictedPerformanceTier = "low";
  }

  return {
    predictedStatus,
    predictedRiskLevel: prediction.predictedRiskLevel,
    predictedPerformanceTier,
    confidence: prediction.confidence
  };
}

function statusMatches(predictedStatus = "not_published", actualStatus = "not_published") {
  return (
    predictedStatus === actualStatus ||
    (predictedStatus === "published_passed" && actualStatus === "positive_performance") ||
    (predictedStatus === "positive_performance" && actualStatus === "published_passed")
  );
}

function buildReplayComparison(record = {}, options = {}) {
  const publish = getRecordPublish(record);
  const replayPrediction = buildReplayPrediction(record, options);
  const actualPerformanceTier = deriveActualPerformanceTier(publish);
  const matchedStatus = statusMatches(replayPrediction.predictedStatus, publish.status);
  const matchedPerformance =
    !replayPrediction.predictedPerformanceTier ||
    !actualPerformanceTier ||
    replayPrediction.predictedPerformanceTier === actualPerformanceTier;
  const matched = matchedStatus && matchedPerformance;
  let mismatchReason = "";

  if (!matchedStatus) {
    mismatchReason = `发布状态偏差：预期 ${replayPrediction.predictedStatus}，实际 ${publish.status}`;
  } else if (!matchedPerformance) {
    mismatchReason = `表现预估偏差：预期 ${replayPrediction.predictedPerformanceTier}，实际 ${actualPerformanceTier}`;
  }

  return {
    replayPrediction,
    actualStatus: publish.status,
    actualPerformanceTier,
    matched,
    mismatchReason
  };
}

function isReplayableRecord(record = {}) {
  const publish = getRecordPublish(record);
  const prediction = getRecordPrediction(record);

  return (
    publish.status !== "not_published" &&
    Boolean(
      prediction.predictedStatus !== "not_published" ||
        prediction.predictedRiskLevel ||
        prediction.predictedPerformanceTier
    )
  );
}

function isReferenceCandidate(record = {}, actualPerformanceTier = "") {
  const publish = getRecordPublish(record);
  const retro = getRecordRetro(record);
  const reference = getReference(record);

  return reference.enabled || retro.shouldBecomeReference || publish.status === "positive_performance" || actualPerformanceTier === "high";
}

export function replayCalibratedSamples(records = [], options = {}) {
  const replayable = (Array.isArray(records) ? records : []).filter((record) => isReplayableRecord(record));
  const comparisons = replayable.map((record) => {
    const comparison = buildReplayComparison(record, options);
    const highRiskMiss =
      comparison.matched === false &&
      (comparison.replayPrediction.predictedRiskLevel === "high" ||
        comparison.actualStatus === "violation" ||
        comparison.actualStatus === "limited");
    const referenceCandidateAffected =
      comparison.matched === false && isReferenceCandidate(record, comparison.actualPerformanceTier);

    return {
      title: getTitle(record),
      matched: comparison.matched,
      highRiskMiss,
      referenceCandidateAffected,
      reason: comparison.mismatchReason,
      predictedStatus: comparison.replayPrediction.predictedStatus,
      actualStatus: comparison.actualStatus
    };
  });
  const mismatches = comparisons
    .filter((item) => item.matched === false)
    .sort((left, right) => {
      const leftScore = Number(left.highRiskMiss) * 2 + Number(left.referenceCandidateAffected);
      const rightScore = Number(right.highRiskMiss) * 2 + Number(right.referenceCandidateAffected);

      if (leftScore !== rightScore) {
        return rightScore - leftScore;
      }

      return left.title.localeCompare(right.title, "zh-Hans-CN");
    });

  return {
    total: comparisons.length,
    matched: comparisons.filter((item) => item.matched).length,
    mismatched: mismatches.length,
    highRiskMisses: comparisons.filter((item) => item.highRiskMiss).length,
    referenceCandidatesAffected: comparisons.filter((item) => item.referenceCandidateAffected).length,
    preview: mismatches.slice(0, 5)
  };
}
