import { callRoutedTextProviderJson } from "./glm.js";

function isHighPerformingPublishedRecord(record = {}) {
  const status = String(record?.publish?.status || "").trim();
  const metrics = record?.publish?.metrics || {};

  if (!["published_passed", "positive_performance"].includes(status)) {
    return false;
  }

  return (
    Number(metrics.likes || 0) >= 30 ||
    Number(metrics.favorites || 0) >= 20 ||
    Number(metrics.comments || 0) >= 10 ||
    Number(metrics.shares || 0) >= 20 ||
    Number(metrics.views || 0) >= 2000
  );
}

export function collectThemeInspirationSourceRecords(records = []) {
  return (Array.isArray(records) ? records : []).filter(isHighPerformingPublishedRecord);
}

function normalizeToken(value) {
  return String(value || "").trim().toLowerCase();
}

const GENERIC_CLUSTER_TERMS = new Set([
  "科普",
  "攻略",
  "经验",
  "指南",
  "分享",
  "记录",
  "建议",
  "知识",
  "常识"
].map((term) => term.toLowerCase()));

function extractSearchTokens(record = {}) {
  const note = record?.note || {};
  const text = [
    String(note.title || ""),
    String(note.body || "").slice(0, 200),
    String(note.collectionType || ""),
    ...(Array.isArray(note.tags) ? note.tags : [])
  ]
    .join(" ")
    .toLowerCase();

  return text
    .split(/[\s,.;:!?()[\]{}"'"'，。！？、：；《》“”‘’/\\|-]+/u)
    .map((token) => token.trim())
    .filter(Boolean);
}

function isUsefulClusterTerm(term) {
  return term && term.length >= 2 && !GENERIC_CLUSTER_TERMS.has(term);
}

function extractSignatureTerms(record = {}) {
  const note = record?.note || {};
  const tags = Array.isArray(note.tags) ? note.tags.map(normalizeToken).filter(isUsefulClusterTerm) : [];
  const collectionType = normalizeToken(note.collectionType);
  const titleTokens = extractSearchTokens({ note: { title: note.title } }).filter(isUsefulClusterTerm).slice(0, 3);
  const bodyTokens = extractSearchTokens({ note: { body: note.body } }).filter(isUsefulClusterTerm).slice(0, 6);

  return [...new Set([...tags, ...titleTokens, ...bodyTokens, isUsefulClusterTerm(collectionType) ? collectionType : ""].filter(Boolean))];
}

function buildRecordTermSet(record = {}) {
  const searchTokens = extractSearchTokens(record).filter(isUsefulClusterTerm);
  const signatureTerms = extractSignatureTerms(record);
  return new Set([...signatureTerms, ...searchTokens]);
}

function countSharedTerms(left, right) {
  let overlap = 0;
  for (const term of left) {
    if (right.has(term)) {
      overlap += 1;
    }
  }
  return overlap;
}

function shouldConnectRecords(leftTerms, rightTerms) {
  return countSharedTerms(leftTerms, rightTerms) >= 2;
}

function compareRecordIds(left, right) {
  return String(left || "").localeCompare(String(right || ""), "zh-Hans-CN");
}

function normalizeConfidenceScore(value) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
}

const GENERIC_THEME_TITLES = new Set([
  "身体探索",
  "两性科普",
  "情绪问题",
  "亲密关系",
  "情绪反应",
  "关系沟通",
  "新手指南"
].map((term) => term.toLowerCase()));

function normalizeDedupeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/gu, " ");
}

function buildThemeInspirationDedupeKey(item = {}) {
  const normalizedTitle = normalizeDedupeText(item?.themeTitle);
  const normalizedBriefing = normalizeDedupeText(item?.prefillBriefing);
  return `${normalizedTitle}::${normalizedBriefing}`;
}

function isGenericThemeTitle(value) {
  const normalizedTitle = normalizeDedupeText(value);
  if (!normalizedTitle) {
    return true;
  }

  if (GENERIC_THEME_TITLES.has(normalizedTitle)) {
    return true;
  }

  return normalizedTitle.length <= 4 && /^(身体|情绪|两性|关系|科普|指南|问题|探索)+$/u.test(normalizedTitle);
}

export function buildThemeInspirationAngleCards(items = []) {
  const cards = [];

  for (const item of Array.isArray(items) ? items : []) {
    const baseThemeId = String(item?.themeId || "").trim() || `theme-${cards.length + 1}`;
    const sourceThemeTitle = String(item?.themeTitle || "").trim();
    const expandAngles = Array.isArray(item?.expandAngles) ? item.expandAngles.map((entry) => String(entry || "").trim()).filter(Boolean) : [];
    const primaryAngles = expandAngles.length ? expandAngles : [sourceThemeTitle].filter(Boolean);

    for (const [index, angleTitle] of primaryAngles.entries()) {
      const relatedAngles = primaryAngles.filter((entry, candidateIndex) => candidateIndex !== index);
      cards.push({
        ...item,
        themeId: `${baseThemeId}-angle-${index + 1}`,
        sourceThemeTitle,
        themeTitle: angleTitle,
        expandAngles: relatedAngles,
        prefillBriefing: [String(item?.prefillBriefing || "").trim(), `本次重点角度：${angleTitle}`].filter(Boolean).join(" "),
        prefillReferenceTitle: angleTitle || String(item?.prefillReferenceTitle || "").trim(),
        prefillMaterialText: [String(item?.prefillMaterialText || "").trim(), `重点角度：${angleTitle}`].filter(Boolean).join("\n")
      });
    }
  }

  return cards;
}

export function mergeThemeInspirationItems({ cachedItems = [], nextItems = [] } = {}) {
  const merged = [];
  const seenTitles = new Set();
  const seenBriefings = new Set();

  for (const rawItem of [...(Array.isArray(nextItems) ? nextItems : []), ...(Array.isArray(cachedItems) ? cachedItems : [])]) {
    const item = normalizeThemeInspirationItems([rawItem])[0];

    if (!item || typeof item !== "object") {
      continue;
    }

    const normalizedTitle = normalizeDedupeText(item.themeTitle);
    const normalizedBriefing = normalizeDedupeText(item.prefillBriefing);

    if (!normalizedTitle || seenTitles.has(normalizedTitle) || seenBriefings.has(normalizedBriefing)) {
      continue;
    }

    seenTitles.add(normalizedTitle);
    if (normalizedBriefing) {
      seenBriefings.add(normalizedBriefing);
    }
    merged.push(item);
  }

  return merged.slice(0, 12);
}

function extractJsonBlock(text) {
  const content = String(text || "")
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "");

  try {
    return JSON.parse(content);
  } catch {}

  const start = content.indexOf("{");
  const end = content.lastIndexOf("}");

  if (start === -1 || end <= start) {
    return null;
  }

  try {
    return JSON.parse(content.slice(start, end + 1));
  } catch {
    return null;
  }
}

export function buildThemeInspirationClusters(records = []) {
  const sourceRecords = collectThemeInspirationSourceRecords(records);
  const normalizedRecords = sourceRecords
    .map((record) => ({
      record,
      id: String(record?.id || ""),
      terms: buildRecordTermSet(record)
    }))
    .sort((left, right) => compareRecordIds(left.id, right.id));

  const adjacency = normalizedRecords.map(() => new Set());

  for (let index = 0; index < normalizedRecords.length; index += 1) {
    for (let candidateIndex = index + 1; candidateIndex < normalizedRecords.length; candidateIndex += 1) {
      if (shouldConnectRecords(normalizedRecords[index].terms, normalizedRecords[candidateIndex].terms)) {
        adjacency[index].add(candidateIndex);
        adjacency[candidateIndex].add(index);
      }
    }
  }

  const visited = new Set();
  const clusters = [];

  for (let index = 0; index < normalizedRecords.length; index += 1) {
    if (visited.has(index)) {
      continue;
    }

    const stack = [index];
    const component = [];
    visited.add(index);

    while (stack.length > 0) {
      const currentIndex = stack.pop();
      component.push(normalizedRecords[currentIndex]);

      const neighbors = Array.from(adjacency[currentIndex]).sort((left, right) =>
        compareRecordIds(normalizedRecords[left].id, normalizedRecords[right].id)
      );
      for (const neighborIndex of neighbors) {
        if (!visited.has(neighborIndex)) {
          visited.add(neighborIndex);
          stack.push(neighborIndex);
        }
      }
    }

    component.sort((left, right) => compareRecordIds(left.id, right.id));
    const signatureTerms = [...new Set(component.flatMap((entry) => Array.from(entry.terms)))].sort((left, right) =>
      left.localeCompare(right, "zh-Hans-CN")
    );

    clusters.push({
      id: `cluster-${clusters.length + 1}`,
      records: component.map((entry) => entry.record),
      recordIds: component.map((entry) => entry.id),
      signatureTerms
    });
  }

  return clusters;
}

export function normalizeThemeInspirationItems(items = []) {
  const seenTitles = new Set();
  const seenBriefings = new Set();

  return (Array.isArray(items) ? items : [])
    .filter((item) => item && typeof item === "object")
    .map((item, index) => ({
      themeId: String(item.themeId || `theme-${index + 1}`).trim(),
      themeTitle: String(item.themeTitle || "").trim(),
      hookAngle: String(item.hookAngle || "").trim(),
      whyNow: String(item.whyNow || "").trim(),
      discussionSignal: String(item.discussionSignal || "").trim(),
      sourceSignals: Array.isArray(item.sourceSignals)
        ? item.sourceSignals.map((value) => String(value || "").trim()).filter(Boolean)
        : [],
      expandAngles: Array.isArray(item.expandAngles)
        ? item.expandAngles.map((value) => String(value || "").trim()).filter(Boolean)
        : [],
      boundaryNotes: Array.isArray(item.boundaryNotes)
        ? item.boundaryNotes.map((value) => String(value || "").trim()).filter(Boolean)
        : [],
      confidenceScore: normalizeConfidenceScore(item.confidenceScore),
      tags: Array.isArray(item.tags) ? item.tags.map((value) => String(value || "").trim()).filter(Boolean) : [],
      prefillBriefing: String(item.prefillBriefing || "").trim(),
      prefillTopic: String(item.prefillTopic || "").trim(),
      prefillConstraints: String(item.prefillConstraints || "").trim(),
      prefillReferenceTitle: String(item.prefillReferenceTitle || "").trim(),
      prefillMaterialText: String(item.prefillMaterialText || "").trim(),
      prefillCollectionType: String(item.prefillCollectionType || "科普").trim(),
      prefillTone: String(item.prefillTone || "温和").trim()
    }))
    .filter((item) => item.themeTitle && item.prefillBriefing)
    .filter((item) => !isGenericThemeTitle(item.themeTitle))
    .sort((left, right) => right.confidenceScore - left.confidenceScore)
    .filter((item) => {
      const normalizedTitle = normalizeDedupeText(item.themeTitle);
      const normalizedBriefing = normalizeDedupeText(item.prefillBriefing);

      if (seenTitles.has(normalizedTitle) || seenBriefings.has(normalizedBriefing)) {
        return false;
      }

      seenTitles.add(normalizedTitle);
      seenBriefings.add(normalizedBriefing);
      return true;
    })
    .slice(0, 12);
}

function buildThemeInspirationSummarizeMessages({ clusters = [], referenceSamples = [] } = {}) {
  const clusterSummary = clusters.map((cluster, index) => ({
    clusterId: cluster.id || `cluster-${index + 1}`,
    recordIds: Array.isArray(cluster.recordIds) ? cluster.recordIds : [],
    signatureTerms: Array.isArray(cluster.signatureTerms) ? cluster.signatureTerms : [],
    notes: (Array.isArray(cluster.records) ? cluster.records : []).map((record) => ({
      title: String(record?.note?.title || "").trim(),
      body: String(record?.note?.body || "").trim().slice(0, 240),
      tags: Array.isArray(record?.note?.tags) ? record.note.tags : [],
      metrics: record?.publish?.metrics || {}
    }))
  }));
  const referenceSummary = (Array.isArray(referenceSamples) ? referenceSamples : []).slice(0, 6).map((sample) => ({
    title: String(sample?.title || "").trim(),
    body: String(sample?.body || "").trim().slice(0, 180),
    tags: Array.isArray(sample?.tags) ? sample.tags : []
  }));

  return [
    {
      role: "system",
      content: [
        "你是主题灵感整理助手。",
        "你的任务是从高表现已发布内容中，提炼出有意思、高反差、高讨论、可延展的新主题卡。",
        "不要输出过泛主题，不要只是复述原标题。",
        "主题要偏科普、身体探索、关系沟通、情绪反应等安全表达。",
        "只返回 JSON。"
      ].join("\n")
    },
    {
      role: "user",
      content: [
        "请基于下面的主题聚类和参考样本，生成 3-8 张主题灵感卡。",
        "每张卡都要包含：themeTitle、hookAngle、whyNow、discussionSignal、sourceSignals、expandAngles、boundaryNotes、confidenceScore、tags、prefillBriefing、prefillReferenceTitle、prefillMaterialText、prefillCollectionType、prefillTone。",
        "prefillBriefing 要能直接回填到当前生成表单里的一句话需求。",
        "prefillMaterialText 要简洁，不要太长。",
        "",
        "主题聚类：",
        JSON.stringify(clusterSummary, null, 2),
        "",
        "参考样本：",
        JSON.stringify(referenceSummary, null, 2),
        "",
        "输出格式：",
        "{",
        '  "items": [',
        '    {',
        '      "themeTitle": "主题名",',
        '      "hookAngle": "反差切入口",',
        '      "whyNow": "为什么值得写",',
        '      "discussionSignal": "讨论潜力说明",',
        '      "sourceSignals": ["来自哪些高表现内容"],',
        '      "expandAngles": ["可延展角度 1"],',
        '      "boundaryNotes": ["边界提醒"],',
        '      "confidenceScore": 0.9,',
        '      "tags": ["身体探索"],',
        '      "prefillBriefing": "可直接回填的一句话需求",',
        '      "prefillReferenceTitle": "建议标题方向",',
        '      "prefillMaterialText": "参考摘要",',
        '      "prefillCollectionType": "科普",',
        '      "prefillTone": "温和"',
        "    }",
        "  ]",
        "}"
      ].join("\n")
    }
  ];
}

async function summarizeThemeInspirationJsonWithModel({ clusters = [], referenceSamples = [], modelSelection = "auto" } = {}) {
  const provider = "deepseek";
  const model = String(process.env.DEEPSEEK_FEEDBACK_MODEL || "deepseek-v4-flash").trim();
  const result = await callRoutedTextProviderJson({
    provider,
    model,
    temperature: 0.6,
    maxTokens: 2400,
    messages: buildThemeInspirationSummarizeMessages({
      clusters,
      referenceSamples
    }),
    missingKeyMessage: `主题灵感缺少 ${provider} 可用密钥。`,
    scene: "generation",
    fallbackParser: extractJsonBlock
  });

  return {
    ...result.parsed,
    provider,
    model: result.model || model,
    route: result.route,
    routeLabel: result.routeLabel,
    attemptedRoutes: result.attemptedRoutes || [],
    rawText: String(result.text || "").trim(),
    parsedKeys: result.parsed && typeof result.parsed === "object" ? Object.keys(result.parsed) : [],
    message: String(result.parsed?.message || "").trim()
  };
}

export async function summarizeThemeInspirationClusters({
  clusters = [],
  referenceSamples = [],
  modelSelection = "auto",
  summarizeJson = summarizeThemeInspirationJsonWithModel
} = {}) {
  if (!Array.isArray(clusters) || !clusters.length) {
    return {
      items: [],
      modelTrace: {
        provider: "",
        model: "",
        route: "",
        routeLabel: "",
        attemptedRoutes: []
      },
      diagnostics: {
        rawModelTextLength: 0,
        parsedKeys: [],
        summarizerMessage: ""
      }
    };
  }

  const payload = await summarizeJson({
    clusters,
    referenceSamples,
    modelSelection
  });
  const rawItems = Array.isArray(payload)
    ? payload
    : payload?.items || payload?.themes || [];
  const payloadObject = payload && typeof payload === "object" && !Array.isArray(payload) ? payload : {};
  const normalizedThemeItems = normalizeThemeInspirationItems(rawItems);
  const angleCards = buildThemeInspirationAngleCards(normalizedThemeItems);

  return {
    items: angleCards,
    modelTrace: {
      provider: String(payloadObject?.provider || "").trim(),
      model: String(payloadObject?.model || "").trim(),
      route: String(payloadObject?.route || "").trim(),
      routeLabel: String(payloadObject?.routeLabel || "").trim(),
      attemptedRoutes: Array.isArray(payloadObject?.attemptedRoutes) ? payloadObject.attemptedRoutes : []
    },
    diagnostics: {
      rawModelTextLength: String(payloadObject?.rawText || "").trim().length,
      parsedKeys: Array.isArray(payloadObject?.parsedKeys) ? payloadObject.parsedKeys : Array.isArray(payload) ? ["0"] : [],
      summarizerMessage: String(payloadObject?.message || "").trim()
    }
  };
}
