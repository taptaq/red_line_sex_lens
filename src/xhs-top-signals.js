function normalizeString(value = "") {
  return String(value || "").trim();
}

function normalizeMetric(value) {
  const number = Number(String(value ?? "").trim().replace(/w\+?/i, "0000"));
  return Number.isFinite(number) ? number : 0;
}

function getApiKey() {
  const apiKey = normalizeString(process.env.REDFOX_API_KEY);
  if (!apiKey) {
    throw new Error("缺少 REDFOX_API_KEY，暂时无法获取外部爆款信号。");
  }
  return apiKey;
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

const CATEGORY_KEYWORDS = {
  "综合全部": ["综合", "全部", "热门", "总榜"],
  "星座情感": ["情感", "恋爱", "关系", "亲密", "两性", "星座"],
  "学习教育": ["学习", "教育", "科普", "知识"],
  "日常生活": ["日常", "生活", "分享"],
  "拍摄记录": ["记录", "vlog", "故事"],
  "美味佳肴": ["美食", "做饭", "探店"],
  "时尚穿搭": ["穿搭", "衣服", "搭配"],
  "化妆美容": ["美妆", "护肤", "化妆"]
};

function matchCategory(keyword = "") {
  const text = normalizeString(keyword).toLowerCase();
  if (!text) return "综合全部";
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((entry) => text.includes(entry.toLowerCase()))) {
      return category;
    }
  }
  return "综合全部";
}

function buildTrackHint(accountDiagnosis = {}) {
  const account = accountDiagnosis?.account || {};
  const text = [account.desc, account.nickname, ...(Array.isArray(account?._raw?.tags) ? account._raw.tags : [])].join(" ");
  return matchCategory(text);
}

async function fetchJson(url, { headers = {}, params = {} } = {}) {
  const finalUrl = new URL(url);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim()) {
      finalUrl.searchParams.set(key, String(value).trim());
    }
  });

  const response = await fetch(finalUrl, {
    method: "GET",
    headers
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(`外部爆款接口失败（${response.status}）${message ? `：${message}` : ""}`);
  }

  const payload = await response.json();
  if (Number(payload?.code) && Number(payload.code) !== 2000) {
    throw new Error(payload?.msg || "外部爆款接口返回异常。");
  }
  return payload;
}

function extractArticles(payload = {}) {
  const raw = payload?.data;
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.list)) return raw.list;
  if (Array.isArray(raw?.records)) return raw.records;
  if (Array.isArray(payload?.list)) return payload.list;
  return [];
}

function scoreSignalMatch(item = {}, { allowedTiers, topic } = {}) {
  let score = 0;
  const sourceTier = normalizeTier(item.accountTier || item.userAttribute || item.level || "");
  const sourceTrack = normalizeString(item.category || item.track || item.collectionType || "综合全部");

  if (allowedTiers.has(sourceTier)) score += 3;
  if (sourceTrack === topic) score += 4;
  else if (sourceTrack.includes(topic) || topic.includes(sourceTrack)) score += 2;
  if (/科普|分享|经验|故事|情绪|关系/.test(normalizeString(item.title || item.desc || ""))) score += 1;
  score += Math.min(3, Math.floor(normalizeMetric(item.interactiveCount || item.interactiveCountThirty || item.likedCount || item.likeCount) / 1000));
  return score;
}

function normalizeSignalItem(item = {}, sourceType = "", category = "") {
  const metrics = {
    likes: normalizeMetric(item.likedCount || item.likeCount || item.liked || item.likes),
    favorites: normalizeMetric(item.collectedCount || item.collectCount || item.collected || item.favorites),
    comments: normalizeMetric(item.commentCount || item.comments),
    shares: normalizeMetric(item.shareCount || item.shares),
    views: normalizeMetric(item.viewCount || item.views)
  };

  return {
    id: normalizeString(item.id || item.noteId || item.title),
    sourceType,
    title: normalizeString(item.title),
    body: normalizeString(item.desc || item.content || item.summary),
    author: normalizeString(item.author || item.nickname || item.accountName),
    authorRedId: normalizeString(item.authorRedId || item.redId || item.userId || item.accountId),
    accountTier: normalizeTier(item.userAttribute || item.level || item.accountTier),
    track: normalizeString(category || item.category || item.track || "综合全部"),
    tags: Array.isArray(item.tags) ? item.tags.map((entry) => normalizeString(entry)).filter(Boolean) : [],
    publish: {
      status: "positive_performance",
      publishedAt: normalizeString(item.publishTime || item.date || item.createdAt),
      metrics
    },
    analysis: {
      whySelected: normalizeString(item.reason || item.titlePattern || item.contentPattern || "同类账号可借鉴样本"),
      hookPattern: normalizeString(item.titlePattern || item.title || ""),
      structurePattern: normalizeString(item.contentPattern || item.desc || ""),
      tonePattern: normalizeString(item.tone || ""),
      reuseHint: normalizeString(item.suggestion || item.reason || "")
    }
  };
}

export async function fetchMatchedTopSignals(accountDiagnosis = {}, { rankDate = "", maxPerSource = 6 } = {}) {
  const apiKey = getApiKey();
  const headers = { "X-API-KEY": apiKey };
  const accountTier = normalizeTier(accountDiagnosis?.account?.userAttribute || accountDiagnosis?.account?._raw?.userAttribute || "");
  const allowedTiers = allowedTargetTiers(accountTier);
  const topic = buildTrackHint(accountDiagnosis);

  const [dailyPayload, weeklyPayload, lowPayload] = await Promise.all([
    fetchJson("https://redfox.hk/story/api/cozeSkill/getXhsCozeSkillDataOne", {
      headers,
      params: {
        rankDate,
        source: "red-line-sex-lens",
        category: topic
      }
    }),
    fetchJson("https://redfox.hk/story/api/cozeSkill/getXhsCozeSkillDataSeven", {
      headers,
      params: {
        rankDate,
        source: "red-line-sex-lens",
        category: topic
      }
    }),
    fetchJson("https://redfox.hk/story/api/cozeSkill/getXhsCozeSkillDataLowFans", {
      headers,
      params: {
        rankDate,
        source: "red-line-sex-lens",
        category: topic
      }
    })
  ]);

  const rankItems = (items = [], sourceType = "") =>
    items
      .map((item) => normalizeSignalItem(item, sourceType, topic))
      .map((item) => ({ ...item, _matchScore: scoreSignalMatch(item, { allowedTiers, topic }) }))
      .filter((item) => item._matchScore >= 4)
      .sort((left, right) => right._matchScore - left._matchScore)
      .slice(0, maxPerSource)
      .map(({ _matchScore, ...rest }) => rest);

  return {
    topic,
    accountTier,
    dailyTop: rankItems(extractArticles(dailyPayload), "daily_top"),
    weeklyTop: rankItems(extractArticles(weeklyPayload), "weekly_top"),
    lowTop: rankItems(extractArticles(lowPayload), "low_top")
  };
}
