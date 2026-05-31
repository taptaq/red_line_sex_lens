function normalizeString(value = "") {
  return String(value || "").trim();
}

function normalizeNumber(value = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function formatDateDaysBefore(now = new Date(), days = 7) {
  const date = new Date(now);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

function uniqueStrings(items = []) {
  return [...new Set((Array.isArray(items) ? items : [items]).map((item) => normalizeString(item)).filter(Boolean))];
}

function stripGenerationFiller(value = "") {
  return normalizeString(value)
    .replace(/^(?:帮我|请)?(?:写|生成|创作|起草)(?:一篇|一个|一下)?(?:关于|有关)?/u, "")
    .replace(/(?:的)?(?:小红书)?(?:笔记|文案|内容|文章)$/u, "")
    .replace(/[，。,.!！?？]+$/u, "")
    .trim();
}

export function deriveHotArticleKeyword({ brief = {}, draft = {} } = {}) {
  const tagReferences = normalizeString(brief.tagReferences)
    .split(/[\n，,、]/u)
    .map(stripGenerationFiller)
    .filter(Boolean);
  const draftTags = Array.isArray(draft.tags) ? draft.tags.map(stripGenerationFiller).filter(Boolean) : [];
  const candidates = [
    brief.topic,
    brief.referenceTitle,
    brief.briefing,
    ...tagReferences,
    draft.title,
    ...draftTags
  ];

  return stripGenerationFiller(candidates.find((item) => stripGenerationFiller(item)) || "");
}

export function normalizeHotArticleRecord(record = {}) {
  const noteId = normalizeString(record.noteId || record.id || record.note_id);
  const authorId = normalizeString(record.authorId || record.userId || record.author_id);
  const noteLink = normalizeString(
    record.noteLink || record.shareInfoLink || record.link || (noteId ? `https://www.xiaohongshu.com/explore/${noteId}` : "")
  );
  const authorLink = normalizeString(
    record.authorLink || record.userLink || (authorId ? `https://www.xiaohongshu.com/user/profile/${authorId}` : "")
  );

  return {
    noteId,
    title: normalizeString(record.title),
    desc: normalizeString(record.desc || record.body || record.content || record.description),
    createTime: normalizeString(record.createTime || record.createdAt || record.publishTime),
    authorId,
    authorNickname: normalizeString(record.authorNickname || record.nickname || record.authorName),
    authorFans: normalizeNumber(record.authorFans || record.fansCount),
    noteLink,
    authorLink,
    likedCount: normalizeNumber(record.likedCount || record.likeCount || record.likes),
    collectedCount: normalizeNumber(record.collectedCount || record.collectCount || record.favorites),
    commentsCount: normalizeNumber(record.commentsCount || record.commentCount || record.comments),
    sharedCount: normalizeNumber(record.sharedCount || record.shareCount || record.shares),
    interactiveCount: normalizeNumber(record.interactiveCount || record.interactionCount || record.engagement),
    totalScore: normalizeNumber(record.totalScore || record.score)
  };
}

export function buildSkippedHotArticleFormula(reason = "skipped", extra = {}) {
  return {
    status: "skipped",
    reason: normalizeString(reason) || "skipped",
    keyword: normalizeString(extra.keyword),
    timeWindowDays: normalizeNumber(extra.timeWindowDays),
    itemCount: 0,
    formula: "",
    titlePatterns: [],
    openingPatterns: [],
    structurePatterns: [],
    highFrequencyKeywords: [],
    tagStrategies: [],
    interactionPrompts: [],
    references: []
  };
}

function detectTitlePatterns(items = []) {
  const titles = items.map((item) => item.title).join("\n");
  return uniqueStrings([
    /\d|[一二三四五六七八九十]+个/u.test(titles) ? "数字型标题" : "",
    /为什么|怎么|如何|吗|？|\?/u.test(titles) ? "疑问标题" : "",
    /！|!|居然|竟然|不是/u.test(titles) ? "反差感叹标题" : ""
  ]);
}

function detectOpeningPatterns(items = []) {
  const text = items.map((item) => item.desc).join("\n");
  return uniqueStrings([
    /误会|误区|不是|别再|很多人/u.test(text) ? "误区反转开场" : "",
    /痛点|焦虑|内耗|安全感|边界/u.test(text) ? "痛点共鸣开场" : "",
    /先说|直接说|说结论/u.test(text) ? "直接给结论" : ""
  ]);
}

function detectStructurePatterns(items = []) {
  const text = items.map((item) => `${item.title}\n${item.desc}`).join("\n");
  return uniqueStrings([
    /分点|步骤|技巧|方法|清单|\d/u.test(text) ? "分点干货结构" : "",
    /误区|原因|为什么/u.test(text) ? "解释原因结构" : "",
    /建议|行动|执行|怎么做/u.test(text) ? "行动建议收尾" : ""
  ]);
}

function extractHighFrequencyKeywords(items = []) {
  const dictionary = ["边界感", "安全感", "亲密关系", "关系沟通", "沟通", "情绪", "内耗", "表达", "误区", "建议"];
  const text = items.map((item) => `${item.title}\n${item.desc}`).join("\n");
  return dictionary
    .map((word) => ({ word, count: (text.match(new RegExp(word, "gu")) || []).length }))
    .filter((item) => item.count > 0)
    .sort((left, right) => right.count - left.count)
    .map((item) => item.word)
    .slice(0, 8);
}

function extractInteractionPrompts(items = []) {
  const text = items.map((item) => item.desc).join("\n");
  return uniqueStrings([
    /评论区/u.test(text) ? "评论区告诉我" : "",
    /你们|大家/u.test(text) ? "你们遇到过吗" : ""
  ]);
}

function buildReferences(items = []) {
  return [...items]
    .sort((left, right) => right.interactiveCount - left.interactiveCount)
    .slice(0, 3)
    .map((item) => ({
      title: item.title,
      noteLink: item.noteLink,
      authorNickname: item.authorNickname,
      authorLink: item.authorLink,
      likedCount: item.likedCount,
      collectedCount: item.collectedCount,
      commentsCount: item.commentsCount,
      sharedCount: item.sharedCount,
      interactiveCount: item.interactiveCount
    }));
}

export function summarizeHotArticleFormula({ keyword = "", timeWindowDays = 0, items = [] } = {}) {
  const normalizedItems = Array.isArray(items) ? items.map(normalizeHotArticleRecord).filter((item) => item.title || item.desc) : [];

  if (!normalizedItems.length) {
    return buildSkippedHotArticleFormula("no_items", { keyword, timeWindowDays });
  }

  const titlePatterns = detectTitlePatterns(normalizedItems);
  const openingPatterns = detectOpeningPatterns(normalizedItems);
  const structurePatterns = detectStructurePatterns(normalizedItems);
  const interactionPrompts = extractInteractionPrompts(normalizedItems);
  const formulaParts = uniqueStrings([
    titlePatterns[0],
    openingPatterns[0],
    structurePatterns[0],
    interactionPrompts.length ? "互动收尾" : ""
  ]);

  return {
    status: "ok",
    keyword: normalizeString(keyword),
    timeWindowDays: normalizeNumber(timeWindowDays),
    itemCount: normalizedItems.length,
    formula: formulaParts.join(" + ") || "标题钩子 + 结构化正文 + 稳定标签",
    titlePatterns,
    openingPatterns,
    structurePatterns,
    highFrequencyKeywords: extractHighFrequencyKeywords(normalizedItems),
    tagStrategies: ["1 个宽标签 + 2-4 个细分场景标签"],
    interactionPrompts,
    references: buildReferences(normalizedItems)
  };
}

function unwrapHotArticleItems(payload = {}) {
  const data = payload?.data && typeof payload.data === "object" ? payload.data : payload;
  return [
    ...(Array.isArray(data?.articles) ? data.articles : []),
    ...(Array.isArray(data?.items) ? data.items : []),
    ...(Array.isArray(data?.latestHotArticles) ? data.latestHotArticles : [])
  ];
}

async function defaultRequestImpl({ url, headers, body }) {
  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body)
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${text.slice(0, 160)}`);
  }

  if (payload?.code && payload.code !== 2000) {
    throw new Error(payload?.msg || "Redfox hot article API failed");
  }

  return payload;
}

async function fetchHotArticlePayload({ keyword, now, timeWindowDays, requestImpl }) {
  const endpoint = normalizeString(process.env.XHS_HOT_ARTICLES_API_URL) || "https://redfox.hk/story/api/xhs/search/search";
  const apiKey = normalizeString(process.env.REDFOX_API_KEY);

  if (!apiKey) {
    throw new Error("缺少 REDFOX_API_KEY");
  }

  const body = {
    keyword,
    pageNum: 1,
    pageSize: 50,
    maxItems: 50,
    startDate: formatDateDaysBefore(now, timeWindowDays),
    endDate: "",
    source: "red-line-sex-lens-generation"
  };

  return requestImpl({
    url: endpoint,
    headers: {
      "Content-Type": "application/json",
      "X-API-KEY": apiKey
    },
    body
  });
}

export async function fetchHotArticleFormula({
  brief = {},
  draft = {},
  now = new Date(),
  requestImpl = defaultRequestImpl
} = {}) {
  const keyword = deriveHotArticleKeyword({ brief, draft });

  if (!keyword) {
    return buildSkippedHotArticleFormula("no_keyword");
  }

  try {
    const firstPayload = await fetchHotArticlePayload({ keyword, now, timeWindowDays: 7, requestImpl });
    const firstItems = unwrapHotArticleItems(firstPayload);

    if (firstItems.length >= 3) {
      return summarizeHotArticleFormula({ keyword, timeWindowDays: 7, items: firstItems });
    }

    const expandedPayload = await fetchHotArticlePayload({ keyword, now, timeWindowDays: 30, requestImpl });
    const expandedItems = unwrapHotArticleItems(expandedPayload);
    return summarizeHotArticleFormula({ keyword, timeWindowDays: 30, items: expandedItems });
  } catch (error) {
    return {
      status: "error",
      keyword,
      timeWindowDays: 0,
      itemCount: 0,
      formula: "",
      titlePatterns: [],
      openingPatterns: [],
      structurePatterns: [],
      highFrequencyKeywords: [],
      tagStrategies: [],
      interactionPrompts: [],
      references: [],
      message: `爆文数据获取失败：${error?.message || "未知错误"}`
    };
  }
}
