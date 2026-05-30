function normalizeString(value = "") {
  return String(value || "").trim();
}

function normalizeMetric(value) {
  const number = Number(String(value ?? "").trim());
  return Number.isFinite(number) ? number : 0;
}

function normalizeTier(value = "") {
  const text = normalizeString(value).toLowerCase();
  if (!text) return "素人";
  if (text.includes("品牌") || text.includes("企业")) return "品牌/企业";
  if (text.includes("头部")) return "头部KOL";
  if (text.includes("腰部")) return "腰部KOL";
  if (text.includes("尾部")) return "尾部KOL";
  if (text.includes("明星")) return "明星";
  return "素人";
}

function allowedTargetTiers(accountTier = "") {
  const normalized = normalizeTier(accountTier);
  if (normalized === "品牌/企业") return new Set(["品牌/企业"]);
  if (normalized === "头部KOL") return new Set(["腰部KOL", "头部KOL"]);
  if (normalized === "腰部KOL") return new Set(["尾部KOL", "腰部KOL", "头部KOL"]);
  if (normalized === "尾部KOL") return new Set(["素人", "尾部KOL", "腰部KOL"]);
  return new Set(["素人", "尾部KOL"]);
}

function normalizeTrack(value = "") {
  const text = normalizeString(value);
  return text || "综合全部";
}

function topicHint(result = {}) {
  const account = result.account || {};
  const tags = Array.isArray(account?._raw?.tags) ? account._raw.tags : [];
  return normalizeTrack(tags[0] || account?._raw?.category || account?.userAttribute || "");
}

function scoreSignalMatch(item = {}, { allowedTiers, topic } = {}) {
  let score = 0;
  const sourceTier = normalizeTier(item.accountTier || item.userAttribute || item.level || "");
  const sourceTrack = normalizeTrack(item.track || item.category || item.collectionType || "");
  if (allowedTiers?.has(sourceTier)) {
    score += 3;
  }
  if (sourceTrack === topic) {
    score += 4;
  } else if (sourceTrack.includes(topic) || topic.includes(sourceTrack)) {
    score += 2;
  }
  if (/科普|解释|经验|故事/.test(normalizeString(item.tone || item.reason || item.title))) {
    score += 1;
  }
  score += Math.min(3, Math.floor(normalizeMetric(item.interactiveCountThirty || item.interactiveCount || item.likes) / 1000));
  return score;
}

function normalizeSignalItem(item = {}, sourceType = "") {
  return {
    id: normalizeString(item.id) || `${sourceType}-${normalizeString(item.authorRedId || item.redId || item.title).slice(0, 24)}`,
    sourceType,
    title: normalizeString(item.title),
    body: normalizeString(item.body || item.desc || item.summary),
    author: normalizeString(item.author || item.nickname || item.accountName),
    authorRedId: normalizeString(item.authorRedId || item.redId || item.userId || item.accountId),
    accountTier: normalizeTier(item.accountTier || item.userAttribute || item.level || ""),
    track: normalizeTrack(item.track || item.category || item.collectionType),
    tone: normalizeString(item.tone || item.reason),
    tags: Array.isArray(item.tags) ? item.tags.map((entry) => normalizeString(entry)).filter(Boolean) : [],
    publish: {
      status: "positive_performance",
      publishedAt: normalizeString(item.publishedAt || item.date || item.publishTime),
      metrics: {
        likes: normalizeMetric(item.likes || item.likeCount || item.likedCount),
        favorites: normalizeMetric(item.favorites || item.collectCount || item.collectedCount),
        comments: normalizeMetric(item.comments || item.commentCount),
        views: normalizeMetric(item.views || item.viewCount),
        shares: normalizeMetric(item.shares || item.shareCount)
      }
    },
    analysis: {
      whySelected: normalizeString(item.whySelected || item.reason),
      hookPattern: normalizeString(item.hookPattern || item.titlePattern),
      structurePattern: normalizeString(item.structurePattern || item.contentPattern),
      tonePattern: normalizeString(item.tonePattern || item.tone),
      reuseHint: normalizeString(item.reuseHint || item.suggestion)
    }
  };
}

export function buildMatchedTopSignals(
  accountDiagnosis = {},
  {
    dailyItems = [],
    weeklyItems = [],
    lowItems = []
  } = {}
) {
  const accountTier = normalizeTier(accountDiagnosis?.account?.userAttribute || accountDiagnosis?.account?._raw?.userAttribute || "");
  const topic = topicHint(accountDiagnosis);
  const allowedTiers = allowedTargetTiers(accountTier);

  const rankItems = (items = [], sourceType = "") =>
    (Array.isArray(items) ? items : [])
      .map((item) => normalizeSignalItem(item, sourceType))
      .map((item) => ({ ...item, _matchScore: scoreSignalMatch(item, { allowedTiers, topic }) }))
      .filter((item) => item._matchScore >= 4)
      .sort((left, right) => right._matchScore - left._matchScore)
      .slice(0, 6)
      .map(({ _matchScore, ...rest }) => rest);

  return {
    dailyTop: rankItems(dailyItems, "daily_top"),
    weeklyTop: rankItems(weeklyItems, "weekly_top"),
    lowTop: rankItems(lowItems, "low_top")
  };
}
