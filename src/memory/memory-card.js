function normalizeString(value = "") {
  return String(value || "").trim();
}

function uniqueStrings(items = []) {
  return [...new Set((Array.isArray(items) ? items : [items]).map((item) => normalizeString(item)).filter(Boolean))];
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

export function buildCandidateRiskPatternCards(feedbackItems = []) {
  const groups = new Map();

  for (const item of Array.isArray(feedbackItems) ? feedbackItems : []) {
    const sourceId = normalizeString(item?.id || item?.noteId);
    const categories = uniqueStrings(item?.feedbackModelSuggestion?.contextCategories || []);

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

  return [...groups.values()].map(({ items, ...card }) => card);
}

export function activateMemoryCards(cards = []) {
  return (Array.isArray(cards) ? cards : []).map((card) => {
    const supportCount = Array.isArray(card.sourceIds) ? uniqueStrings(card.sourceIds).length : 0;
    const manualConfirmed = card.manualConfirmed === true;

    if (card.status === "candidate" && (supportCount >= 2 || manualConfirmed)) {
      return {
        ...card,
        status: "active"
      };
    }

    return { ...card };
  });
}
