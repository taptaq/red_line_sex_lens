import fs from "node:fs";
import path from "node:path";

function normalizeString(value = "") {
  return String(value || "").trim();
}

const testOverrides = {
  fetchJson: null,
  lookupAccountDiagnosis: null
};

function normalizeMetric(value) {
  const text = String(value ?? "").trim().replace(/,/g, "");
  if (/万|w/i.test(text)) {
    const number = Number(text.replace(/万|w\+?/gi, ""));
    return Number.isFinite(number) ? Math.round(number * 10000) : 0;
  }

  const number = Number(text);
  return Number.isFinite(number) ? number : 0;
}

function getDefaultRankDate(now = new Date()) {
  const current = now instanceof Date && !Number.isNaN(now.getTime()) ? now : new Date();
  const cutoff = new Date(current);
  cutoff.setHours(19, 0, 0, 0);
  const queryDate = new Date(current);
  queryDate.setDate(queryDate.getDate() - (current >= cutoff ? 1 : 2));
  return queryDate.toISOString().slice(0, 10);
}

function getApiKey() {
  const apiKey = normalizeString(process.env.REDFOX_API_KEY) || readApiKeyFromDotEnv();
  if (!apiKey) {
    throw new Error("缺少 REDFOX_API_KEY，暂时无法获取外部爆款信号。");
  }
  return apiKey;
}

function readApiKeyFromDotEnv() {
  try {
    const envPath = path.resolve(process.cwd(), ".env");
    if (!fs.existsSync(envPath)) {
      return "";
    }

    const content = fs.readFileSync(envPath, "utf8");
    const line = content.split(/\r?\n/).find((entry) => /^\s*REDFOX_API_KEY\s*=/.test(entry));
    const value = normalizeString(line?.split("=").slice(1).join("=")).replace(/^['"]|['"]$/g, "");

    if (value) {
      process.env.REDFOX_API_KEY = value;
    }

    return value;
  } catch {
    return "";
  }
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
  "综合杂项": ["杂项", "其他", "综合杂项", "杂货", "综合类"],
  "星座情感": ["星座", "情感", "爱情", "恋爱", "感情", "关系", "亲密", "两性", "情侣", "星座运势", "情感咨询", "脱单", "表白", "分手", "复合", "塔罗", "占卜"],
  "时尚穿搭": ["时尚", "穿搭", "衣服", "服装", "搭配", "穿衣", "时装", "潮流穿搭", "服饰", "OOTD", "ootd", "裙子", "裤子", "外套", "大衣", "西装", "毛衣", "T恤"],
  "婚庆婚礼": ["婚庆", "婚礼", "结婚", "婚纱", "婚宴", "求婚", "订婚", "婚庆策划", "新娘", "新郎", "伴娘", "钻戒"],
  "拍摄记录": ["拍摄", "记录", "摄影", "拍照", "照片", "视频", "vlog", "Vlog", "VLOG", "摄像", "短视频", "相机", "镜头"],
  "学习教育": ["学习", "教育", "培训", "课程", "考试", "学校", "教育机构", "学习方法", "考研", "考公", "留学", "英语", "编程", "技能"],
  "化妆美容": ["化妆", "美容", "美妆", "妆容", "护肤", "彩妆", "化妆品", "美容护肤", "化妆教程", "美颜", "睫毛膏", "口红", "粉底", "眉笔", "眼影", "腮红", "遮瑕", "定妆", "精华", "面霜", "水乳", "防晒", "面膜"],
  "居家装修": ["居家", "装修", "家居", "家装", "房子装修", "室内设计", "软装", "硬装", "家居好物", "家具", "收纳", "整理"],
  "旅行度假": ["旅行", "度假", "旅游", "出游", "旅行攻略", "景点", "旅游攻略", "自由行", "跟团游", "自驾游", "酒店", "民宿"],
  "亲子育儿": ["亲子", "育儿", "宝宝", "儿童", "带娃", "育儿经", "亲子活动", "母婴", "幼儿", "小孩", "奶粉", "尿布", "儿童玩具", "宝宝玩具"],
  "个人护理": ["个人护理", "护理", "护肤", "身体护理", "美容护理", "护理产品", "个人清洁", "洗发水", "沐浴露", "牙膏", "卫生巾", "愉悦", "悦己"],
  "美味佳肴": ["美味", "佳肴", "美食", "做饭", "烹饪", "菜谱", "美食推荐", "餐厅", "探店", "食谱", "好吃", "甜品", "烘焙", "奶茶", "咖啡", "零食"],
  "职业发展": ["职业", "发展", "工作", "职场", "求职", "面试", "职业规划", "跳槽", "升职", "加薪", "简历", "副业", "创业"],
  "宠物天地": ["宠物", "猫", "狗", "养猫", "养狗", "萌宠", "宠物猫", "宠物狗", "铲屎官", "喵星人", "汪星人", "猫粮", "狗粮"],
  "潮流鞋包": ["潮流", "鞋包", "鞋子", "包包", "潮鞋", "名牌包", "运动鞋", "高跟鞋", "手提包", "球鞋", "帆布鞋", "靴子"],
  "日常生活": ["日常", "生活", "日常记录", "生活日常", "vlog日常", "生活分享", "好物推荐"],
  "科学探索": ["科学", "探索", "身体探索", "小玩具", "科普", "科学知识", "实验", "发现", "研究", "科技探索"],
  "新闻资讯": ["新闻", "资讯", "热点", "时事", "新闻报道", "新闻资讯", "最新消息"],
  "体育锻炼": ["体育", "锻炼", "运动", "健身", "减肥", "瘦身", "体育运动", "健身房", "瑜伽", "跑步", "游泳", "篮球", "足球"]
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

function normalizeCategoryInput(value = "") {
  const normalizedValue = normalizeString(value);

  if (!normalizedValue) {
    return "";
  }

  if (Object.prototype.hasOwnProperty.call(CATEGORY_KEYWORDS, normalizedValue)) {
    return normalizedValue;
  }

  return matchCategory(normalizedValue);
}

function normalizeKeywordList(value = "") {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeString(item)).filter(Boolean);
  }

  return String(value || "")
    .split(/[，,、]/)
    .map((item) => normalizeString(item))
    .filter(Boolean);
}

function deriveTopicFromStandaloneFilters({ track = "", keyword = "", tags = [] } = {}) {
  return deriveTopicCandidatesFromStandaloneFilters({ track, keyword, tags })[0] || "综合全部";
}

function deriveTopicCandidatesFromStandaloneFilters({ track = "", keyword = "", tags = [] } = {}) {
  const normalizedTrack = normalizeCategoryInput(track);

  if (normalizedTrack) {
    return [normalizedTrack];
  }

  return ["综合全部"];
}

async function fetchJson(url, { headers = {}, params = {} } = {}) {
  if (typeof testOverrides.fetchJson === "function") {
    return testOverrides.fetchJson(url, { headers, params });
  }

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
  const anaAdd = item.anaAdd && typeof item.anaAdd === "object" ? item.anaAdd : {};
  const body = normalizeString(item.desc || item.content || item.summary);
  const title = normalizeString(item.title) || body.replace(/\s+/g, " ").slice(0, 28);
  const metrics = {
    likes: normalizeMetric(item.likedCount || item.likeCount || item.useLikeCount || anaAdd.useLikeCount || item.liked || item.likes),
    favorites: normalizeMetric(item.collectedCount || anaAdd.collectedCount || item.collectCount || item.collected || item.favorites),
    comments: normalizeMetric(item.commentCount || item.useCommentCount || anaAdd.useCommentCount || item.comments),
    shares: normalizeMetric(item.shareCount || item.useShareCount || anaAdd.useShareCount || item.shares),
    views: normalizeMetric(item.viewCount || item.pred_readnum || item.views)
  };

  return {
    id: normalizeString(item.id || item.noteId || item.photoJumpUrl || item.title || body),
    sourceType,
    title,
    body,
    author: normalizeString(item.author || item.nickname || item.accountName || item.userName),
    authorRedId: normalizeString(item.authorRedId || item.redId || item.userId || item.accountId || item.userJumpUrl),
    accountTier: normalizeTier(item.userAttribute || item.level || item.accountTier),
    track: normalizeString(category || item.category || item.track || "综合全部"),
    tags: Array.isArray(item.tags) ? item.tags.map((entry) => normalizeString(entry)).filter(Boolean) : [],
    workUrl: normalizeString(item.workUrl || item.noteLink || item.photoJumpUrl),
    authorUrl: normalizeString(item.authorUrl || item.authorLink || item.userJumpUrl),
    publish: {
      status: "positive_performance",
      publishedAt: normalizeString(item.publishTime || item.publicTime || item.date || item.createdAt),
      metrics
    },
    analysis: {
      whySelected: normalizeString(item.reason || item.analysis || item.titlePattern || item.contentPattern || "同类账号可借鉴样本"),
      hookPattern: normalizeString(item.titlePattern || item.title || ""),
      structurePattern: normalizeString(item.contentPattern || item.desc || ""),
      tonePattern: normalizeString(item.tone || ""),
      reuseHint: normalizeString(item.suggestion || item.reason || "")
    }
  };
}

function rankSignalItems(items = [], { sourceType = "", topic = "", allowedTiers = new Set(), maxPerSource = 6 } = {}) {
  const seen = new Set();
  return items
    .map((item) => normalizeSignalItem(item, sourceType, topic))
    .filter((item) => item.title || item.body)
    .filter((item) => {
      const key = normalizeString(item.workUrl || item.id || `${item.title}|${item.body.slice(0, 60)}`);
      if (!key || seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    })
    .map((item) => ({ ...item, _matchScore: scoreSignalMatch(item, { allowedTiers, topic }) }))
    .filter((item) => item._matchScore >= 4)
    .sort((left, right) => right._matchScore - left._matchScore)
    .slice(0, maxPerSource)
    .map(({ _matchScore, ...rest }) => rest);
}

async function fetchTopSignalsRanked({ headers, rankDate = "", topic = "", allowedTiers, maxPerSource = 6 } = {}) {
  const queryRankDate = normalizeString(rankDate) || getDefaultRankDate();
  const [dailyPayload, weeklyPayload, lowPayload] = await Promise.all([
    fetchJson("https://redfox.hk/story/api/cozeSkill/getXhsCozeSkillDataOne", {
      headers,
      params: {
        rankDate: queryRankDate,
        source: "小红书单日数据爆款文章-GitHub",
        category: topic
      }
    }),
    fetchJson("https://redfox.hk/story/api/cozeSkill/getXhsCozeSkillDataSeven", {
      headers,
      params: {
        rankDate: queryRankDate,
        source: "小红书七日数据爆款文章-GitHub",
        category: topic
      }
    }),
    fetchJson("https://redfox.hk/story/api/cozeSkill/getXhsCozeSkillDataLowFans", {
      headers,
      params: {
        rankDate: queryRankDate,
        source: "小红书冷门账号爆款文章-GitHub",
        category: topic
      }
    })
  ]);

  return {
    dailyTop: rankSignalItems(extractArticles(dailyPayload), {
      sourceType: "daily_top",
      topic,
      allowedTiers,
      maxPerSource
    }),
    weeklyTop: rankSignalItems(extractArticles(weeklyPayload), {
      sourceType: "weekly_top",
      topic,
      allowedTiers,
      maxPerSource
    }),
    lowTop: rankSignalItems(extractArticles(lowPayload), {
      sourceType: "low_top",
      topic,
      allowedTiers,
      maxPerSource
    })
  };
}

async function lookupAccountDiagnosisForTopSignals(redId = "") {
  if (typeof testOverrides.lookupAccountDiagnosis === "function") {
    return testOverrides.lookupAccountDiagnosis(normalizeString(redId));
  }

  const { summarizeXhsAccountDiagnosis } = await import("./xhs-account-diagnosis.js");
  return summarizeXhsAccountDiagnosis({
    redId,
    querySimilar: async () => ({})
  });
}

export async function fetchMatchedTopSignals(accountDiagnosis = {}, { rankDate = "", maxPerSource = 6 } = {}) {
  const apiKey = getApiKey();
  const headers = { "X-API-KEY": apiKey };
  const accountTier = normalizeTier(accountDiagnosis?.account?.userAttribute || accountDiagnosis?.account?._raw?.userAttribute || "");
  const allowedTiers = allowedTargetTiers(accountTier);
  const topic = buildTrackHint(accountDiagnosis);

  return {
    topic,
    accountTier,
    ...(await fetchTopSignalsRanked({ headers, rankDate, topic, allowedTiers, maxPerSource }))
  };
}

export async function fetchStandaloneTopSignals({ track = "", keyword = "", tags = [], rankDate = "", maxPerSource = 6 } = {}) {
  const apiKey = getApiKey();
  const headers = { "X-API-KEY": apiKey };
  const topicCandidates = deriveTopicCandidatesFromStandaloneFilters({ track, keyword, tags });
  const allowedTiers = new Set(["素人", "尾部KOL", "腰部KOL", "头部KOL", "品牌/企业", "明星"]);
  let fallbackSignals = null;

  for (const topic of topicCandidates) {
    const signals = await fetchTopSignalsRanked({ headers, rankDate, topic, allowedTiers, maxPerSource });
    const resultCount =
      (Array.isArray(signals.dailyTop) ? signals.dailyTop.length : 0) +
      (Array.isArray(signals.weeklyTop) ? signals.weeklyTop.length : 0) +
      (Array.isArray(signals.lowTop) ? signals.lowTop.length : 0);

    if (resultCount > 0) {
      return {
        topic,
        attemptedTopics: topicCandidates.slice(0, topicCandidates.indexOf(topic) + 1),
        ...signals
      };
    }

    fallbackSignals = { topic, ...signals };
  }

  return {
    topic: fallbackSignals?.topic || topicCandidates[0] || "综合全部",
    attemptedTopics: topicCandidates,
    ...(fallbackSignals || { dailyTop: [], weeklyTop: [], lowTop: [] })
  };
}

export async function buildStandaloneTopSignalsContext({ redId = "", track = "", keyword = "", tags = [] } = {}) {
  const normalizedRedId = normalizeString(redId);
  const normalizedTrack = normalizeCategoryInput(track);
  const normalizedKeywords = normalizeKeywordList(keyword);
  const normalizedKeyword = normalizedKeywords.join(", ");
  const normalizedTags = Array.isArray(tags) ? tags.map((item) => normalizeString(item)).filter(Boolean) : [];
  const accountDiagnosis = normalizedRedId ? await lookupAccountDiagnosisForTopSignals(normalizedRedId) : null;
  const accountTrack = accountDiagnosis ? buildTrackHint(accountDiagnosis) : "";
  const derivedTrack = normalizedTrack || (accountTrack === "综合全部" ? "" : accountTrack);
  const derivedTags = normalizedTags.length
    ? normalizedTags
    : Array.isArray(accountDiagnosis?.account?._raw?.tags)
      ? accountDiagnosis.account._raw.tags.map((item) => normalizeString(item)).filter(Boolean)
      : [];

  const signals = await fetchStandaloneTopSignals({
    track: derivedTrack,
    keyword: normalizedKeyword,
    tags: derivedTags
  });

  return {
    accountContext: {
      redId: normalizedRedId,
      nickname: normalizeString(accountDiagnosis?.account?.nickname),
      derivedTrack: normalizeString(signals?.topic || derivedTrack),
      derivedTags
    },
    filters: {
      track: normalizeString(signals?.topic || derivedTrack || normalizedTrack),
      keyword: normalizedKeyword,
      tags: normalizedTags.length ? normalizedTags : derivedTags
    },
    items: {
      dailyTop: Array.isArray(signals?.dailyTop) ? signals.dailyTop : [],
      weeklyTop: Array.isArray(signals?.weeklyTop) ? signals.weeklyTop : [],
      lowTop: Array.isArray(signals?.lowTop) ? signals.lowTop : []
    }
  };
}

export function __setXhsTopSignalsTestOverrides(overrides = {}) {
  if (Object.prototype.hasOwnProperty.call(overrides, "fetchJson")) {
    testOverrides.fetchJson = typeof overrides.fetchJson === "function" ? overrides.fetchJson : null;
  }

  if (Object.prototype.hasOwnProperty.call(overrides, "lookupAccountDiagnosis")) {
    testOverrides.lookupAccountDiagnosis = typeof overrides.lookupAccountDiagnosis === "function" ? overrides.lookupAccountDiagnosis : null;
  }
}

export function __resetXhsTopSignalsTestOverrides() {
  testOverrides.fetchJson = null;
  testOverrides.lookupAccountDiagnosis = null;
}
