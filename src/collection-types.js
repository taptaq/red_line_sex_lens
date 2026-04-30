export const predefinedCollectionTypes = [
  "SBTI内太空愉悦档案",
  "双人联机计划",
  "内太空放映室",
  "脑洞+神评",
  "科普",
  "MBTI内太空愉悦档案",
  "疗愈指南",
  "身体探索",
  "伪装学大师",
  "造船手记"
];

export function normalizeCollectionType(value = "") {
  return String(value || "").trim();
}

export function buildCollectionTypeOptions(custom = []) {
  const seen = new Set();

  return [...predefinedCollectionTypes, ...(Array.isArray(custom) ? custom : [])]
    .map((item) => normalizeCollectionType(item))
    .filter((item) => {
      if (!item || seen.has(item)) {
        return false;
      }

      seen.add(item);
      return true;
    });
}

export function assertValidCollectionType(value = "", options = []) {
  const normalized = normalizeCollectionType(value);
  const allowed = buildCollectionTypeOptions(options);

  if (!normalized || !allowed.includes(normalized)) {
    const error = new Error("合集类型无效或未选择。");
    error.statusCode = 400;
    throw error;
  }

  return normalized;
}
