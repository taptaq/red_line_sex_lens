function normalizeString(value = "") {
  return String(value || "").trim();
}

function normalizeSignalList(value = []) {
  const items = Array.isArray(value) ? value : [value];
  return [...new Set(items.map((item) => normalizeString(item)).filter(Boolean))];
}

export function buildRetroWeightHints(records = []) {
  const validatedSignals = [];
  const invalidatedSignals = [];
  const ruleCandidates = [];
  let referenceBoostCount = 0;

  for (const record of Array.isArray(records) ? records : []) {
    const retro = record?.calibration?.retro && typeof record.calibration.retro === "object" ? record.calibration.retro : {};

    validatedSignals.push(...normalizeSignalList(retro.validatedSignals));
    invalidatedSignals.push(...normalizeSignalList(retro.invalidatedSignals));

    if (retro.ruleImprovementCandidate) {
      ruleCandidates.push(normalizeString(retro.ruleImprovementCandidate));
    }

    if (retro.shouldBecomeReference === true) {
      referenceBoostCount += 1;
    }
  }

  const uniqueValidatedSignals = [...new Set(validatedSignals)];
  const uniqueInvalidatedSignals = [...new Set(invalidatedSignals)];

  return {
    validatedSignals: uniqueValidatedSignals,
    invalidatedSignals: uniqueInvalidatedSignals,
    ruleCandidates: [...new Set(ruleCandidates.filter(Boolean))],
    styleHints: [
      ...uniqueValidatedSignals.map((item) => `已验证：${item}`),
      ...uniqueInvalidatedSignals.map((item) => `被推翻：${item}`)
    ],
    referenceBoostCount
  };
}
