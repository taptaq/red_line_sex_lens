function normalizeString(value) {
  return String(value || "").trim();
}

function uniqueStrings(items = []) {
  return [...new Set((Array.isArray(items) ? items : [items]).flatMap((item) => String(item || "").split(/[，,、\n]/)).map((item) => item.trim()).filter(Boolean))];
}

function slugify(value = "") {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function normalizeCategory(value = "") {
  const normalized = normalizeString(value).toLowerCase();
  return ["equipment", "actions", "states", "map", "protocol"].includes(normalized) ? normalized : "equipment";
}

function normalizePriority(value = 50) {
  const number = Number(String(value ?? "").trim());
  if (!Number.isFinite(number)) {
    return 50;
  }

  return Math.max(0, Math.min(100, Math.round(number)));
}

export function innerSpaceTermCategoryLabel(category = "") {
  if (category === "actions") return "操作篇";
  if (category === "states") return "状态篇";
  if (category === "map") return "地形篇";
  if (category === "protocol") return "协议篇";
  return "装备篇";
}

export function sanitizeInnerSpaceTerm(entry = {}) {
  const term = normalizeString(entry.term);

  if (!term) {
    const error = new Error("术语项缺少 term。");
    error.statusCode = 400;
    throw error;
  }

  return {
    id: normalizeString(entry.id) || `${slugify(term) || "inner-space-term"}-${Date.now()}`,
    category: normalizeCategory(entry.category),
    term,
    aliases: uniqueStrings(entry.aliases || []),
    literal: normalizeString(entry.literal || entry.original),
    metaphor: normalizeString(entry.metaphor || entry.logic),
    scene: uniqueStrings(entry.scene || []),
    collectionTypes: uniqueStrings(entry.collectionTypes || []),
    preferredUsage: normalizeString(entry.preferredUsage),
    avoidUsage: normalizeString(entry.avoidUsage),
    example: normalizeString(entry.example),
    enabled: entry.enabled !== false,
    priority: normalizePriority(entry.priority)
  };
}

export function sanitizeInnerSpaceTerms(items = []) {
  return (Array.isArray(items) ? items : []).map((item) => sanitizeInnerSpaceTerm(item));
}

export function filterInnerSpaceTerms(items = [], { collectionType = "", limit = 12 } = {}) {
  const normalizedCollectionType = normalizeString(collectionType);

  return sanitizeInnerSpaceTerms(items)
    .filter((item) => item.enabled)
    .sort((left, right) => {
      const leftMatched =
        !normalizedCollectionType || !left.collectionTypes.length || left.collectionTypes.includes(normalizedCollectionType) ? 1 : 0;
      const rightMatched =
        !normalizedCollectionType || !right.collectionTypes.length || right.collectionTypes.includes(normalizedCollectionType) ? 1 : 0;

      if (leftMatched !== rightMatched) {
        return rightMatched - leftMatched;
      }

      if (left.priority !== right.priority) {
        return right.priority - left.priority;
      }

      return left.term.localeCompare(right.term, "zh-Hans-CN");
    })
    .filter((item) => !normalizedCollectionType || !item.collectionTypes.length || item.collectionTypes.includes(normalizedCollectionType))
    .slice(0, Math.max(1, Number(limit) || 12));
}

export function formatInnerSpaceTermsPrompt(items = []) {
  const normalized = sanitizeInnerSpaceTerms(items).filter((item) => item.enabled).slice(0, 12);

  if (!normalized.length) {
    return "";
  }

  return [
    "内太空术语参考：",
    ...normalized.map((item, index) =>
      [
        `${index + 1}. ${item.term}${item.aliases.length ? `（别名：${item.aliases.join("、")}）` : ""}`,
        item.literal ? `原意：${item.literal}` : "",
        item.preferredUsage ? `推荐用法：${item.preferredUsage}` : "",
        item.avoidUsage ? `避免用法：${item.avoidUsage}` : "",
        item.example ? `示例：${item.example}` : ""
      ]
        .filter(Boolean)
        .join("；")
    ),
    "如果适合当前语境，可以优先使用这些内太空表达；但不要生硬堆砌，不要为了隐晦而降低可读性。"
  ].join("\n");
}
