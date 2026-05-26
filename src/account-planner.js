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
  const reference = item?.reference && typeof item.reference === "object" ? item.reference : item?.reference || {};
  const plannerSummary =
    item?.calibration?.plannerSummary && typeof item.calibration.plannerSummary === "object"
      ? item.calibration.plannerSummary
      : {};

  return {
    sourceType,
    id: normalizeString(item?.id || `${sourceType}-${normalizeString(note?.title).slice(0, 12)}`),
    title: normalizeString(note?.title || item?.title),
    body: normalizeString(note?.body || item?.body || plannerSummary.summary),
    tags: uniqueStrings(note?.tags || item?.tags || []),
    collectionType: normalizeString(note?.collectionType || item?.collectionType) || "科普",
    publish: {
      status: normalizeString(publish.status || item?.publishStatus) || "not_published",
      metrics: normalizeMetrics(publish.metrics || item?.metrics || item),
      publishedAt: normalizeString(publish.publishedAt || item?.publishedAt)
    },
    reference: {
      enabled: reference.enabled === true,
      tier: normalizeString(reference.tier)
    },
    plannerSummary: {
      summary: normalizeString(plannerSummary.summary),
      keyPoints: uniqueStrings(plannerSummary.keyPoints || []),
      riskBoundary: uniqueStrings(plannerSummary.riskBoundary || []),
      suggestedTopic: normalizeString(plannerSummary.suggestedTopic),
      provider: normalizeString(plannerSummary.provider),
      model: normalizeString(plannerSummary.model),
      createdAt: normalizeString(plannerSummary.createdAt)
    },
    retro: item?.calibration?.retro && typeof item.calibration.retro === "object" ? item.calibration.retro : {}
  };
}

function derivePublishRecencyLabel(sample = {}) {
  const publishedAt = normalizeString(sample?.publish?.publishedAt);

  if (!publishedAt) {
    return "";
  }

  const timestamp = Date.parse(publishedAt);

  if (!Number.isFinite(timestamp)) {
    return "";
  }

  const ageDays = Math.max(0, Math.floor((Date.now() - timestamp) / 86400000));

  if (ageDays <= 7) {
    return "近 7 天";
  }

  if (ageDays <= 30) {
    return "近 30 天";
  }

  if (ageDays <= 90) {
    return "近 90 天";
  }

  return "90 天前";
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

function normalizePlannerTopicKey(value = "") {
  const normalized = normalizeString(value)
    .replace(/[路线方向内容话题]+$/g, "")
    .replace(/愉悦/g, "悦己")
    .replace(/自慰/g, "悦己");

  return normalized || "当前有效方向";
}

function buildFallbackTopicQuestion(topicLabel = "", sample = {}) {
  const normalizedTopic = normalizePlannerTopicKey(topicLabel);
  const title = normalizeString(sample.title);
  const body = normalizeString(sample.body);
  const combined = `${title}\n${body}`;

  if (/突然很空|放空|失落|空虚/.test(combined)) {
    return `为什么${normalizedTopic}之后会突然很空？`;
  }

  if (/是不是|正常吗|会不会/.test(combined)) {
    return `${normalizedTopic}之后这种反应正常吗？`;
  }

  if (/新手|第一次/.test(combined)) {
    return `第一次${normalizedTopic}后该怎么判断自己的状态？`;
  }

  return `${normalizedTopic}之后的反应，到底该怎么理解？`;
}

function buildFallbackWhyThisWorks(topicLabel = "", sample = {}) {
  const normalizedTopic = normalizePlannerTopicKey(topicLabel);
  const sourceLabel = sample.sourceType === "local" ? "账号本地高表现记录" : "外部参考样本";
  return `这条建议来自${sourceLabel}，更适合继续细化“${normalizedTopic}之后会发生什么”这一类具体问题。`;
}

function buildPlannerCardFromSample(sample = {}, { index = 0, sourceSignals = [] } = {}) {
  const topicLabel = buildTopicLabel(sample);
  const bodyExcerpt = normalizeString(sample.body).slice(0, 120);
  const boundaryNotes =
    sample.sourceType === "local" && sample?.retro?.ruleImprovementCandidate
      ? [normalizeString(sample.retro.ruleImprovementCandidate)]
      : ["避免病理化", "不做医疗诊断"];
  const concreteQuestion = buildFallbackTopicQuestion(topicLabel, sample);
  const normalizedTopic = normalizePlannerTopicKey(topicLabel);

  return {
    planId: `plan-${index + 1}`,
    planTitle: concreteQuestion,
    estimatedValue: deriveEstimatedValue(sample),
    whyThisWorks: buildFallbackWhyThisWorks(topicLabel, sample),
    titleFormula: "反常识提问 + 解释原因 + 安抚落点",
    bodyStructure: ["先抛一个常见误解", "用轻科普解释原因", "给出可执行的安抚或判断边界"],
    riskBoundary: uniqueStrings(boundaryNotes),
    sourceSignals: uniqueStrings(sourceSignals),
    tags: sample.tags.slice(0, 3),
    prefillBriefing: `写一篇${sample.collectionType || "科普"}向内容，围绕“${concreteQuestion}”展开，重点解释原因、正常化常见反应，并补上${normalizedTopic}相关边界提醒。`,
    prefillReferenceTitle: concreteQuestion,
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
    .filter((item) => item.title && (item.body || item.plannerSummary.summary));
  const normalizedExternal = externalSamples
    .map((item) => normalizeSourceSample(item, { sourceType: "external" }))
    .filter((item) => item.title && (item.body || item.plannerSummary.summary));

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
    : ["当前暂无稳定高表现样本，已自动退到已发布内容的观察型建议；若后续补充外部对照，可继续验证选题边界。"]; 

  const seedSamples = [...highLocal.slice(0, 3), ...highExternal.slice(0, 2)];
  const dedupedSeedSamples = [];
  const seenTopicKeys = new Set();

  for (const item of seedSamples) {
    const topicKey = normalizePlannerTopicKey(buildTopicLabel(item));

    if (seenTopicKeys.has(topicKey)) {
      continue;
    }

    seenTopicKeys.add(topicKey);
    dedupedSeedSamples.push(item);
  }

  const cards = dedupedSeedSamples.map((item, index) =>
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
        : "当前暂无稳定高表现样本，建议先继续发布并观察最近内容表现，系统会基于已发布样本持续生成观察型建议。"
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
  const prioritizedLocalSamples = [...localSamples]
    .sort((left, right) => {
      const leftReference = left?.reference?.enabled === true ? 1 : 0;
      const rightReference = right?.reference?.enabled === true ? 1 : 0;

      if (leftReference !== rightReference) {
        return rightReference - leftReference;
      }

      return compareSamplesByScore(left, right);
    })
    .slice(0, 10);

  const localSummary = prioritizedLocalSamples.map((sample) => ({
    id: sample.id,
    title: sample.title,
    collectionType: sample.collectionType,
    tags: sample.tags,
    publishStatus: sample.publish.status,
    metrics: sample.publish.metrics,
    publishedAt: sample.publish.publishedAt || "",
    publishRecencyLabel: derivePublishRecencyLabel(sample),
    referenceEnabled: sample.reference?.enabled === true,
    referenceTier: sample.reference?.tier || "",
    plannerSummary: sample.plannerSummary || null,
    retro: sample.retro,
    body: sample.plannerSummary?.summary || sample.body.slice(0, 220)
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

function buildPlannerSummaryMessages(sample = {}) {
  return [
    {
      role: "system",
      content: [
        "你是学习样本复盘摘要助手。",
        "你的任务是把单篇笔记压缩成适合账号级复盘使用的结构化摘要。",
        "只提炼选题、情绪/主题重点、边界提醒，不要复述整篇。",
        "只返回 JSON。"
      ].join("\n")
    },
    {
      role: "user",
      content: [
        "请基于下面这篇学习样本，输出一个结构化复盘摘要。",
        "",
        JSON.stringify(
          {
            title: sample.title,
            collectionType: sample.collectionType,
            tags: sample.tags,
            publishStatus: sample.publish?.status || "",
            metrics: sample.publish?.metrics || {},
            referenceEnabled: sample.reference?.enabled === true,
            referenceTier: sample.reference?.tier || "",
            retro: sample.retro || {},
            body: sample.body || ""
          },
          null,
          2
        ),
        "",
        "输出格式：",
        "{",
        '  "summary": "100-180 字内概括这篇内容的核心问题与结论",',
        '  "keyPoints": ["要点 1", "要点 2"],',
        '  "riskBoundary": ["边界提醒 1"],',
        '  "suggestedTopic": "适合下一步复盘继续观察的题目"',
        "}"
      ].join("\n")
    }
  ];
}

function normalizePlannerSummary(summary = {}) {
  return {
    summary: normalizeString(summary.summary),
    keyPoints: uniqueStrings(summary.keyPoints || []),
    riskBoundary: uniqueStrings(summary.riskBoundary || []),
    suggestedTopic: normalizeString(summary.suggestedTopic),
    provider: normalizeString(summary.provider),
    model: normalizeString(summary.model),
    createdAt: normalizeString(summary.createdAt) || new Date().toISOString()
  };
}

export async function summarizePlannerRecord(record = {}, { modelSelection = "auto" } = {}) {
  const sample = normalizeSourceSample(record, { sourceType: "local" });
  const provider = "deepseek";
  const model = String(process.env.DEEPSEEK_FEEDBACK_MODEL || "deepseek-v4-flash").trim();

  const result = await callRoutedTextProviderJson({
    provider,
    model,
    temperature: 0.4,
    maxTokens: 1200,
    messages: buildPlannerSummaryMessages(sample),
    missingKeyMessage: `学习样本摘要缺少 ${provider} 可用密钥。`,
    scene: "generation",
    selection: modelSelection,
    fallbackParser: extractJsonBlock
  });

  return normalizePlannerSummary({
    ...result.parsed,
    provider,
    model: result.model || model,
    createdAt: new Date().toISOString()
  });
}

export async function backfillPlannerSummaries({
  records = [],
  summarizeRecord = summarizePlannerRecord,
  modelSelection = "auto"
} = {}) {
  const normalizedRecords = Array.isArray(records) ? records : [];
  const items = [];
  let updatedCount = 0;

  for (const record of normalizedRecords) {
    const existing = record?.calibration?.plannerSummary;

    if (existing && typeof existing === "object" && normalizeString(existing.summary)) {
      items.push(record);
      continue;
    }

    const plannerSummary = normalizePlannerSummary(await summarizeRecord(record, { modelSelection }));
    items.push({
      ...record,
      calibration: {
        ...(record?.calibration && typeof record.calibration === "object" ? record.calibration : {}),
        plannerSummary
      }
    });
    updatedCount += 1;
  }

  return {
    items,
    updatedCount
  };
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
    maxTokens: 5200,
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
  const filteredLocalRecords = (Array.isArray(localRecords) ? localRecords : []).filter((item) => {
    const normalized = normalizeSourceSample(item, { sourceType: "local" });
    return normalized.reference.enabled === true || normalized.publish.status === "positive_performance";
  });

  const effectiveLocalRecords = filteredLocalRecords.length ? filteredLocalRecords : localRecords;
  const fallback = buildFallbackAccountPlannerSummary({ localRecords: effectiveLocalRecords, externalSamples });
  const normalizedFallback = normalizeAccountPlannerSummary(fallback);

  if (typeof summarize !== "function") {
    return normalizedFallback;
  }

  const custom = await summarize({
    localRecords: effectiveLocalRecords,
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
