import { callRoutedTextProviderJson } from "./glm.js";

function normalizeString(value) {
  return String(value || "").trim();
}

function uniqueStrings(items = []) {
  return [...new Set((Array.isArray(items) ? items : [items]).map((item) => normalizeString(item)).filter(Boolean))];
}

function normalizeMetric(value) {
  const number = Number(String(value ?? "").trim());
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : 0;
}

function normalizeMetrics(metrics = {}) {
  return {
    likes: normalizeMetric(metrics.likes),
    favorites: normalizeMetric(metrics.favorites),
    comments: normalizeMetric(metrics.comments),
    views: normalizeMetric(metrics.views),
    shares: normalizeMetric(metrics.shares)
  };
}

function normalizeSourceSample(item = {}, { sourceType = "local" } = {}) {
  const note = item?.note && typeof item.note === "object" ? item.note : item;
  const publish = item?.publish && typeof item.publish === "object" ? item.publish : item?.publish || {};

  return {
    sourceType,
    id: normalizeString(item?.id || `${sourceType}-${normalizeString(note?.title).slice(0, 12)}`),
    title: normalizeString(note?.title || item?.title),
    body: normalizeString(note?.body || item?.body),
    tags: uniqueStrings(note?.tags || item?.tags || []),
    collectionType: normalizeString(note?.collectionType || item?.collectionType) || "科普",
    publish: {
      status: normalizeString(publish.status || item?.publishStatus) || "not_published",
      metrics: normalizeMetrics(publish.metrics || item?.metrics || item)
    },
    retro: item?.calibration?.retro && typeof item.calibration.retro === "object" ? item.calibration.retro : {}
  };
}

function scoreSample(sample = {}) {
  const metrics = sample?.publish?.metrics || {};
  const status = normalizeString(sample?.publish?.status);
  const baseScore =
    Number(metrics.likes || 0) +
    Number(metrics.favorites || 0) * 2 +
    Number(metrics.comments || 0) * 2 +
    Number(metrics.shares || 0) * 3 +
    Math.floor(Number(metrics.views || 0) / 100);

  if (status === "positive_performance") {
    return baseScore + 40;
  }

  if (status === "published_passed") {
    return baseScore + 12;
  }

  return baseScore;
}

function compareSamplesByScore(left, right) {
  return scoreSample(right) - scoreSample(left);
}

function deriveEstimatedValue(sample = {}) {
  const score = scoreSample(sample);
  if (score >= 120) return "high";
  if (score >= 50) return "medium";
  return "observe";
}

function buildTopicLabel(sample = {}) {
  const tags = Array.isArray(sample.tags) ? sample.tags.filter(Boolean) : [];
  if (tags.length) {
    return tags[0];
  }

  if (sample.collectionType) {
    return sample.collectionType;
  }

  return normalizeString(sample.title).slice(0, 12) || "当前有效方向";
}

function buildPlannerCardFromSample(sample = {}, { index = 0, sourceSignals = [] } = {}) {
  const topicLabel = buildTopicLabel(sample);
  const titleSeed = normalizeString(sample.title) || `${topicLabel}路线`;
  const bodyExcerpt = normalizeString(sample.body).slice(0, 120);
  const boundaryNotes =
    sample.sourceType === "local" && sample?.retro?.ruleImprovementCandidate
      ? [normalizeString(sample.retro.ruleImprovementCandidate)]
      : ["避免病理化", "不做医疗诊断"];

  return {
    planId: `plan-${index + 1}`,
    planTitle: `继续放大${topicLabel}路线`,
    estimatedValue: deriveEstimatedValue(sample),
    whyThisWorks: `这条建议来自${sample.sourceType === "local" ? "账号本地高表现记录" : "外部参考样本"}，当前更适合继续做${topicLabel}这条线。`,
    titleFormula: "反常识提问 + 解释原因 + 安抚落点",
    bodyStructure: ["先抛一个常见误解", "用轻科普解释原因", "给出可执行的安抚或判断边界"],
    riskBoundary: uniqueStrings(boundaryNotes),
    sourceSignals: uniqueStrings(sourceSignals),
    tags: sample.tags.slice(0, 3),
    prefillBriefing: `写一篇${sample.collectionType || "科普"}向内容，围绕“${titleSeed}”展开，重点解释原因并给出温和结论。`,
    prefillReferenceTitle: titleSeed,
    prefillMaterialText: uniqueStrings([
      bodyExcerpt ? `参考摘要：${bodyExcerpt}` : "",
      "结构重点：反常识提问 -> 解释原因 -> 安抚落点"
    ]).join("\n"),
    prefillCollectionType: sample.collectionType || "科普",
    prefillTone: "温和"
  };
}

function buildFallbackAccountPlannerSummary({ localRecords = [], externalSamples = [] } = {}) {
  const normalizedLocal = localRecords
    .map((item) => normalizeSourceSample(item, { sourceType: "local" }))
    .filter((item) => item.title && item.body);
  const normalizedExternal = externalSamples
    .map((item) => normalizeSourceSample(item, { sourceType: "external" }))
    .filter((item) => item.title && item.body);

  const highLocal = normalizedLocal
    .filter((item) => ["published_passed", "positive_performance"].includes(item.publish.status))
    .sort(compareSamplesByScore);
  const highExternal = normalizedExternal
    .filter((item) => ["published_passed", "positive_performance"].includes(item.publish.status))
    .sort(compareSamplesByScore);

  const strengths = uniqueStrings(highLocal.slice(0, 2).map((item) => `${buildTopicLabel(item)}相关内容最近更稳定`));
  const externalTopics = uniqueStrings(highExternal.slice(0, 2).map((item) => buildTopicLabel(item)));
  const gaps = externalTopics.length
    ? [`可补充的外部参考方向：${externalTopics.join("、")}`]
    : ["外部参考样本还不够多，建议继续补充对照内容。"];

  const seedSamples = [...highLocal.slice(0, 2), ...highExternal.slice(0, 2)].slice(0, 5);
  const cards = seedSamples.map((item, index) =>
    buildPlannerCardFromSample(item, {
      index,
      sourceSignals: uniqueStrings([
        item.sourceType === "local" ? `本地高表现记录：${item.title}` : `外部参考样本：${item.title}`,
        item.tags.length ? `标签信号：${item.tags.join("、")}` : "",
        item.publish.metrics.views ? `浏览 ${item.publish.metrics.views}` : ""
      ])
    })
  );

  return {
    summary: {
      strengths: strengths.length ? strengths : ["先从近期已发布内容里观察到的高表现路线继续放大。"],
      gaps,
      nextMove: cards[0]
        ? `先从“${cards[0].planTitle}”开始，再观察这个角度能否稳定承接最近的高表现信号。`
        : "当前样本不足，建议先补充近 10-30 篇内容和外部对照样本。"
    },
    cards,
    modelTrace: {
      provider: "",
      model: "",
      route: "",
      routeLabel: "",
      attemptedRoutes: []
    }
  };
}

function normalizeCard(item = {}, index = 0) {
  return {
    planId: normalizeString(item.planId || `plan-${index + 1}`),
    planTitle: normalizeString(item.planTitle),
    estimatedValue: normalizeString(item.estimatedValue) || "observe",
    whyThisWorks: normalizeString(item.whyThisWorks),
    titleFormula: normalizeString(item.titleFormula),
    bodyStructure: uniqueStrings(item.bodyStructure || []),
    riskBoundary: uniqueStrings(item.riskBoundary || []),
    sourceSignals: uniqueStrings(item.sourceSignals || []),
    tags: uniqueStrings(item.tags || []),
    prefillBriefing: normalizeString(item.prefillBriefing),
    prefillReferenceTitle: normalizeString(item.prefillReferenceTitle),
    prefillMaterialText: normalizeString(item.prefillMaterialText),
    prefillCollectionType: normalizeString(item.prefillCollectionType) || "科普",
    prefillTone: normalizeString(item.prefillTone) || "温和"
  };
}

function normalizeModelTrace(payload = {}) {
  return {
    provider: normalizeString(payload.provider),
    model: normalizeString(payload.model),
    route: normalizeString(payload.route),
    routeLabel: normalizeString(payload.routeLabel),
    attemptedRoutes: Array.isArray(payload.attemptedRoutes) ? payload.attemptedRoutes : []
  };
}

export function normalizeAccountPlannerSummary(summary = {}) {
  return {
    summary: {
      strengths: uniqueStrings(summary?.summary?.strengths || summary?.strengths || []),
      gaps: uniqueStrings(summary?.summary?.gaps || summary?.gaps || []),
      nextMove: normalizeString(summary?.summary?.nextMove || summary?.nextMove)
    },
    cards: (Array.isArray(summary?.cards) ? summary.cards : [])
      .map((item, index) => normalizeCard(item, index))
      .filter((item) => item.planTitle && item.prefillBriefing),
    modelTrace: normalizeModelTrace(summary?.modelTrace || summary)
  };
}

function extractJsonBlock(text = "") {
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

function buildAccountPlannerSummarizeMessages({ localSamples = [], externalSamples = [], fallback = null } = {}) {
  const localSummary = localSamples.slice(0, 10).map((sample) => ({
    id: sample.id,
    title: sample.title,
    collectionType: sample.collectionType,
    tags: sample.tags,
    publishStatus: sample.publish.status,
    metrics: sample.publish.metrics,
    retro: sample.retro,
    body: sample.body.slice(0, 220)
  }));
  const externalSummary = externalSamples.slice(0, 10).map((sample) => ({
    id: sample.id,
    title: sample.title,
    collectionType: sample.collectionType,
    tags: sample.tags,
    publishStatus: sample.publish.status,
    metrics: sample.publish.metrics,
    body: sample.body.slice(0, 180)
  }));

  return [
    {
      role: "system",
      content: [
        "你是账号级内容复盘与下一篇规划助手。",
        "你的任务是先从账号最近样本里总结稳定强项和近期偏差，再给出 3-5 个下一篇建议卡。",
        "账号样本优先，外部样本只作为辅助对照，不要让外部样本覆盖账号本身的信号。",
        "建议卡必须能直接回填到生成工作台，所以 prefill 字段要具体、简洁、可执行。",
        "只返回 JSON。"
      ].join("\n")
    },
    {
      role: "user",
      content: [
        "请基于下面的账号样本、本地发布表现和外部对照样本，生成账号级复盘结论与下一篇建议卡。",
        "",
        "账号本地样本：",
        JSON.stringify(localSummary, null, 2),
        "",
        "外部对照样本：",
        JSON.stringify(externalSummary, null, 2),
        "",
        "启发式兜底建议（仅在你需要时参考，不要机械照抄）：",
        JSON.stringify(fallback, null, 2),
        "",
        "输出格式：",
        "{",
        '  "summary": {',
        '    "strengths": ["稳定强项 1"],',
        '    "gaps": ["近期偏差 1"],',
        '    "nextMove": "一句话说清下一步最值得先做什么"',
        "  },",
        '  "cards": [',
        "    {",
        '      "planTitle": "下一篇方向标题",',
        '      "estimatedValue": "high",',
        '      "whyThisWorks": "为什么这个方向值得做",',
        '      "titleFormula": "建议标题公式",',
        '      "bodyStructure": ["步骤 1", "步骤 2"],',
        '      "riskBoundary": ["边界提醒"],',
        '      "sourceSignals": ["参考来源"],',
        '      "tags": ["标签"],',
        '      "prefillBriefing": "可直接回填的一句话需求",',
        '      "prefillReferenceTitle": "建议标题方向",',
        '      "prefillMaterialText": "结构和参考摘要",',
        '      "prefillCollectionType": "科普",',
        '      "prefillTone": "温和"',
        "    }",
        "  ]",
        "}"
      ].join("\n")
    }
  ];
}

async function summarizeAccountPlannerJsonWithModel({
  localRecords = [],
  externalSamples = [],
  fallback = null,
  modelSelection = "auto"
} = {}) {
  const provider = "deepseek";
  const model = String(process.env.DEEPSEEK_FEEDBACK_MODEL || "deepseek-v4-flash").trim();
  const normalizedLocal = localRecords
    .map((item) => normalizeSourceSample(item, { sourceType: "local" }))
    .filter((item) => item.title && item.body)
    .sort(compareSamplesByScore);
  const normalizedExternal = externalSamples
    .map((item) => normalizeSourceSample(item, { sourceType: "external" }))
    .filter((item) => item.title && item.body)
    .sort(compareSamplesByScore);

  const result = await callRoutedTextProviderJson({
    provider,
    model,
    temperature: 0.5,
    maxTokens: 2600,
    messages: buildAccountPlannerSummarizeMessages({
      localSamples: normalizedLocal,
      externalSamples: normalizedExternal,
      fallback
    }),
    missingKeyMessage: `账号级复盘缺少 ${provider} 可用密钥。`,
    scene: "generation",
    selection: modelSelection,
    fallbackParser: extractJsonBlock
  });

  return {
    ...result.parsed,
    provider,
    model: result.model || model,
    route: result.route,
    routeLabel: result.routeLabel,
    attemptedRoutes: result.attemptedRoutes || []
  };
}

export async function summarizeAccountPlanner({
  localRecords = [],
  externalSamples = [],
  summarize = summarizeAccountPlannerJsonWithModel,
  modelSelection = "auto"
} = {}) {
  const fallback = buildFallbackAccountPlannerSummary({ localRecords, externalSamples });
  const normalizedFallback = normalizeAccountPlannerSummary(fallback);

  if (typeof summarize !== "function") {
    return normalizedFallback;
  }

  const custom = await summarize({
    localRecords,
    externalSamples,
    fallback: normalizedFallback,
    modelSelection
  });
  const normalizedCustom = normalizeAccountPlannerSummary(custom);

  return {
    summary: {
      strengths: normalizedCustom.summary.strengths.length ? normalizedCustom.summary.strengths : normalizedFallback.summary.strengths,
      gaps: normalizedCustom.summary.gaps.length ? normalizedCustom.summary.gaps : normalizedFallback.summary.gaps,
      nextMove: normalizedCustom.summary.nextMove || normalizedFallback.summary.nextMove
    },
    cards: normalizedCustom.cards.length ? normalizedCustom.cards : normalizedFallback.cards,
    modelTrace:
      normalizedCustom.modelTrace.provider ||
      normalizedCustom.modelTrace.model ||
      normalizedCustom.modelTrace.route ||
      normalizedCustom.modelTrace.routeLabel ||
      normalizedCustom.modelTrace.attemptedRoutes.length
        ? normalizedCustom.modelTrace
        : normalizedFallback.modelTrace
  };
}
