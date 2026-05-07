function normalizeString(value = "") {
  return String(value || "").trim();
}

function uniqueStrings(items = []) {
  return [...new Set((Array.isArray(items) ? items : [items]).map((item) => normalizeString(item)).filter(Boolean))];
}

function buildCardSearchText(card = {}) {
  return uniqueStrings([
    card.summary,
    card.title,
    card.collectionType,
    ...(Array.isArray(card.riskCategories) ? card.riskCategories : [])
  ]).join("\n");
}

function decorateCard(card = {}) {
  return {
    ...card,
    sourceIds: uniqueStrings(card.sourceIds),
    riskCategories: uniqueStrings(card.riskCategories),
    collectionType: normalizeString(card.collectionType),
    summary: normalizeString(card.summary),
    searchText: normalizeString(card.searchText) || buildCardSearchText(card)
  };
}

function buildRiskPatternSummary(category, items = []) {
  const reasons = uniqueStrings(items.map((item) => item.platformReason));
  const phrases = uniqueStrings(items.flatMap((item) => item.suspiciousPhrases || [])).slice(0, 3);
  const parts = [`${category} 场景近期重复出现`];

  if (reasons.length > 0) {
    parts.push(`平台反馈集中在${reasons.join("、")}`);
  }

  if (phrases.length > 0) {
    parts.push(`高频线索包括${phrases.join("、")}`);
  }

  return `${parts.join("，")}。`;
}

function buildRewriteStrategySummary(category, items = []) {
  const phrases = uniqueStrings(items.flatMap((item) => item.suspiciousPhrases || [])).slice(0, 3);
  const parts = [`${category} 场景改写时优先做局部弱化，保留原本分享节奏`];

  if (phrases.length > 0) {
    parts.push(`先替换${phrases.join("、")}等高风险表达`);
  }

  parts.push("避免继续强化动作感、交易感和刺激感");
  return `${parts.join("，")}。`;
}

function buildRiskBoundarySummary(category, items = []) {
  const hasConfirmedEvidence = items.some((item) => {
    const signal = normalizeString(item?.falsePositiveAudit?.signal);
    return item?.status === "platform_passed_confirmed" || signal === "strict_confirmed";
  });
  const parts = [`${category} 场景下，中性经验分享和克制表达通常可以保留`];

  parts.push("不要为了求稳把正常分享过度改写成说明书");

  if (hasConfirmedEvidence) {
    parts.push("已有确认误报样本支持这条边界提醒");
  }

  return `${parts.join("，")}。`;
}

function getFeedbackCategories(item = {}) {
  return uniqueStrings(item?.feedbackModelSuggestion?.contextCategories || []);
}

function getFalsePositiveCategories(item = {}) {
  return uniqueStrings([
    ...(Array.isArray(item?.riskCategories) ? item.riskCategories : []),
    ...(Array.isArray(item?.analysisSnapshot?.categories) ? item.analysisSnapshot.categories : []),
    normalizeString(item?.falsePositiveAudit?.inferredCategory)
  ]);
}

function mergeGovernanceFields(base = {}, existing = {}) {
  const governanceFields = [
    "manualConfirmed",
    "manualSuppressed",
    "manualArchived",
    "conflictingEvidence",
    "archivedAt",
    "suppressedAt",
    "notes"
  ];
  const merged = { ...base };

  for (const field of governanceFields) {
    if (Object.prototype.hasOwnProperty.call(existing, field) && existing[field] !== undefined) {
      merged[field] = existing[field];
    }
  }

  return merged;
}

export function buildCandidateRiskPatternCards(feedbackItems = []) {
  const groups = new Map();

  for (const item of Array.isArray(feedbackItems) ? feedbackItems : []) {
    const sourceId = normalizeString(item?.id || item?.noteId);
    const categories = getFeedbackCategories(item);

    for (const category of categories) {
      const key = `risk-pattern:${category}`;
      const current = groups.get(key) || {
        id: key,
        kind: "risk_pattern_card",
        status: "candidate",
        confidence: 0.82,
        sourceQuality: "imported",
        sourceIds: [],
        riskCategories: [category],
        summary: ""
      };

      current.sourceIds = uniqueStrings([...current.sourceIds, sourceId]);
      current.summary = buildRiskPatternSummary(category, [...(current.items || []), item]);
      current.items = [...(current.items || []), item];
      groups.set(key, current);
    }
  }

  return [...groups.values()].map(({ items, ...card }) => decorateCard(card));
}

export function buildCandidateRewriteStrategyCards(feedbackItems = []) {
  const groups = new Map();

  for (const item of Array.isArray(feedbackItems) ? feedbackItems : []) {
    const sourceId = normalizeString(item?.id || item?.noteId);
    const categories = getFeedbackCategories(item);

    for (const category of categories) {
      const key = `rewrite-strategy:${category}`;
      const current = groups.get(key) || {
        id: key,
        kind: "rewrite_strategy_card",
        status: "candidate",
        confidence: 0.78,
        sourceQuality: "imported",
        sourceIds: [],
        riskCategories: [category],
        summary: ""
      };

      current.sourceIds = uniqueStrings([...current.sourceIds, sourceId]);
      current.summary = buildRewriteStrategySummary(category, [...(current.items || []), item]);
      current.items = [...(current.items || []), item];
      groups.set(key, current);
    }
  }

  return [...groups.values()].map(({ items, ...card }) => decorateCard(card));
}

export function buildCandidateRiskBoundaryCards(falsePositiveItems = [], referenceRecords = []) {
  const groups = new Map();

  for (const item of Array.isArray(falsePositiveItems) ? falsePositiveItems : []) {
    const sourceId = normalizeString(item?.id);
    const categories = getFalsePositiveCategories(item);

    for (const category of categories) {
      const key = `risk-boundary:${category}`;
      const current = groups.get(key) || {
        id: key,
        kind: "risk_boundary_card",
        status: "candidate",
        confidence: 0.76,
        sourceQuality: "manual_verified",
        sourceIds: [],
        riskCategories: [category],
        summary: "",
        manualConfirmed: false
      };

      current.sourceIds = uniqueStrings([...current.sourceIds, sourceId]);
      current.manualConfirmed =
        current.manualConfirmed ||
        item?.status === "platform_passed_confirmed" ||
        normalizeString(item?.falsePositiveAudit?.signal) === "strict_confirmed";
      current.summary = buildRiskBoundarySummary(category, [...(current.items || []), item]);
      current.items = [...(current.items || []), item];
      groups.set(key, current);
    }
  }

  const referenceCollectionTypes = uniqueStrings(
    (Array.isArray(referenceRecords) ? referenceRecords : [])
      .filter((record) => record?.reference?.enabled === true)
      .map((record) => record?.note?.collectionType)
  );

  for (const card of groups.values()) {
    if (!card.collectionType && referenceCollectionTypes.length === 1) {
      card.collectionType = referenceCollectionTypes[0];
    }
  }

  return [...groups.values()].map(({ items, ...card }) => decorateCard(card));
}

export function finalizeMemoryCards(cards = [], existingCards = []) {
  const existingById = new Map(
    (Array.isArray(existingCards) ? existingCards : [])
      .filter((card) => normalizeString(card?.id))
      .map((card) => [normalizeString(card.id), card])
  );

  return (Array.isArray(cards) ? cards : []).map((incoming) => {
    const existing = existingById.get(normalizeString(incoming?.id)) || {};
    const card = mergeGovernanceFields(decorateCard({ ...existing, ...incoming }), existing);
    const supportCount = Array.isArray(card.sourceIds) ? uniqueStrings(card.sourceIds).length : 0;
    const manualConfirmed = card.manualConfirmed === true;
    const manuallyArchived = card.manualArchived === true || Boolean(normalizeString(card.archivedAt));
    const manuallySuppressed = card.manualSuppressed === true || card.conflictingEvidence === true;

    if (manuallyArchived) {
      return {
        ...card,
        status: "archived"
      };
    }

    if (manuallySuppressed) {
      return {
        ...card,
        status: "suppressed"
      };
    }

    if (card.status === "candidate" && (supportCount >= 2 || manualConfirmed)) {
      return {
        ...card,
        status: "active"
      };
    }

    if (card.status === "active" && supportCount === 0 && !manualConfirmed) {
      return {
        ...card,
        status: "suppressed"
      };
    }

    return { ...card };
  });
}

export function activateMemoryCards(cards = []) {
  return finalizeMemoryCards(cards);
}

export function buildMemoryAuditSummary({ documents = [], cards = [] } = {}) {
  const documentItems = Array.isArray(documents) ? documents : [];
  const cardItems = Array.isArray(cards) ? cards : [];
  const documentSourceIds = new Set(
    documentItems.flatMap((item) => (Array.isArray(item?.sourceIds) ? item.sourceIds : [])).map((item) => normalizeString(item)).filter(Boolean)
  );
  const byStatus = {};
  const byKind = {};
  const missingSourceIdCards = [];
  const orphanCards = [];

  for (const card of cardItems) {
    const status = normalizeString(card?.status) || "candidate";
    const kind = normalizeString(card?.kind) || "unknown";
    const sourceIds = uniqueStrings(card?.sourceIds || []);

    byStatus[status] = (byStatus[status] || 0) + 1;
    byKind[kind] = (byKind[kind] || 0) + 1;

    if (!sourceIds.length) {
      missingSourceIdCards.push(normalizeString(card?.id));
      continue;
    }

    if (!sourceIds.some((sourceId) => documentSourceIds.has(sourceId))) {
      orphanCards.push(normalizeString(card?.id));
    }
  }

  return {
    ok: true,
    documents: documentItems.length,
    cards: cardItems.length,
    activeCards: byStatus.active || 0,
    candidateCards: byStatus.candidate || 0,
    suppressedCards: byStatus.suppressed || 0,
    archivedCards: byStatus.archived || 0,
    byStatus,
    byKind,
    missingSourceIdCards,
    orphanCards
  };
}
