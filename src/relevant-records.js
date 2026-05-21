function normalizeToken(value = "") {
  return String(value || "").trim().toLowerCase();
}

function normalizeTextTokens(value = "") {
  return String(value || "")
    .toLowerCase()
    .split(/[\s,.;:!?()[\]{}"'"'，。！？、：；《》“”‘’/\\|-]+/u)
    .map((token) => token.trim())
    .filter(Boolean);
}

function uniqueStrings(items = []) {
  return [...new Set((Array.isArray(items) ? items : [items]).map((item) => String(item || "").trim()).filter(Boolean))];
}

function getRecordTags(record = {}) {
  return Array.isArray(record?.note?.tags) ? record.note.tags.map(normalizeToken).filter(Boolean) : [];
}

function getRecordCollectionType(record = {}) {
  return normalizeToken(record?.note?.collectionType);
}

function getRecordTitleTokens(record = {}) {
  return normalizeTextTokens(record?.note?.title || "");
}

function getRecordBodyTokens(record = {}) {
  return normalizeTextTokens(String(record?.note?.body || "").slice(0, 240));
}

function countOverlap(left = [], right = []) {
  const rightSet = new Set(right);
  let count = 0;

  for (const item of left) {
    if (rightSet.has(item)) {
      count += 1;
    }
  }

  return count;
}

function buildCompactReasonList({
  tagOverlap = 0,
  collectionTypeMatched = false,
  titleOverlap = 0,
  bodyOverlap = 0,
  publishStatus = "",
  likes = 0
} = {}) {
  const reasons = [];

  if (tagOverlap > 0) {
    reasons.push(`标签重合 ${tagOverlap} 项`);
  }

  if (collectionTypeMatched) {
    reasons.push("合集匹配");
  }

  if (titleOverlap > 0) {
    reasons.push(`标题短语命中 ${titleOverlap} 项`);
  }

  if (bodyOverlap > 0) {
    reasons.push(`正文词命中 ${bodyOverlap} 项`);
  }

  if (publishStatus === "positive_performance") {
    reasons.push("历史表现高");
  } else if (likes >= 30) {
    reasons.push("历史通过且互动不低");
  }

  return reasons;
}

function scoreRecord({
  currentTags = [],
  currentCollectionType = "",
  currentTitleTokens = [],
  currentBodyTokens = [],
  record = {}
} = {}) {
  const tags = getRecordTags(record);
  const collectionType = getRecordCollectionType(record);
  const titleTokens = getRecordTitleTokens(record);
  const bodyTokens = getRecordBodyTokens(record);
  const publishStatus = String(record?.publish?.status || "").trim();
  const likes = Number(record?.publish?.metrics?.likes || 0) || 0;

  const tagOverlap = countOverlap(currentTags, tags);
  const titleOverlap = countOverlap(currentTitleTokens, titleTokens);
  const bodyOverlap = countOverlap(currentBodyTokens, bodyTokens);
  const collectionTypeMatched = Boolean(currentCollectionType && currentCollectionType === collectionType);

  let score = 0;
  score += tagOverlap * 5;
  score += titleOverlap * 3;
  score += Math.min(bodyOverlap, 4) * 2;
  score += collectionTypeMatched ? 4 : 0;
  score += publishStatus === "positive_performance" ? 6 : publishStatus === "published_passed" ? 2 : 0;

  return {
    id: String(record?.id || "").trim(),
    score,
    reasons: buildCompactReasonList({
      tagOverlap,
      collectionTypeMatched,
      titleOverlap,
      bodyOverlap,
      publishStatus,
      likes
    }),
    record
  };
}

export function rankRelevantHistoricalRecords({
  title = "",
  body = "",
  tags = [],
  collectionType = "",
  records = []
} = {}) {
  const currentTags = uniqueStrings((Array.isArray(tags) ? tags : [tags]).map(normalizeToken).filter(Boolean));
  const currentCollectionType = normalizeToken(collectionType);
  const currentTitleTokens = normalizeTextTokens(title);
  const currentBodyTokens = normalizeTextTokens(String(body || "").slice(0, 240));

  return (Array.isArray(records) ? records : [])
    .map((record) =>
      scoreRecord({
        currentTags,
        currentCollectionType,
        currentTitleTokens,
        currentBodyTokens,
        record
      })
    )
    .filter((item) => item.id && item.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return left.id.localeCompare(right.id, "zh-Hans-CN");
    });
}
