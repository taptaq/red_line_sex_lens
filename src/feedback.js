import { loadLexicon, loadReviewQueue, saveReviewQueue } from "./data-store.js";
import { deriveFeedbackNoteId } from "./feedback-identity.js";
import { normalizeText } from "./normalizer.js";

export const severityRank = {
  pass: 0,
  observe: 1,
  manual_review: 2,
  hard_block: 3
};

export const abstractReasonPhraseLabels = [
  "两性用品",
  "不当两性联想",
  "低俗夸张描述",
  "低俗情景演绎",
  "违规宣传",
  "违反平台规则",
  "相关物品",
  "其他违反平台规则的内容"
];

const abstractReasonPhrasePatterns = abstractReasonPhraseLabels.map((label) => new RegExp(label, "u"));

const contextCandidateTemplates = {
  导流与私域: [
    {
      label: "联系方式 + 转化意图组合",
      pattern:
        "(?:微信|vx|私信|小窗|联系|二维码).{0,12}(?:完整版|获取|领取|咨询|下单|购买|链接)|(?:完整版|获取|领取|咨询|下单|购买|链接).{0,12}(?:微信|vx|私信|小窗|联系|二维码)",
      riskLevel: "hard_block"
    }
  ],
  未成年人边界: [
    {
      label: "未成年人 + 亲密敏感表达组合",
      pattern:
        "(?:未成年|18岁以下|小学生|初中生|高中生|学生情侣).{0,12}(?:两性|性|亲密|自我愉悦|身体探索|敏感)|(?:两性|性|亲密|自我愉悦|身体探索|敏感).{0,12}(?:未成年|18岁以下|小学生|初中生|高中生|学生情侣)",
      riskLevel: "hard_block"
    }
  ],
  两性用品宣传与展示: [
    {
      label: "两性用品宣传/展示语境",
      pattern:
        "(?:两性用品|情趣用品|愉悦玩具|感官交互装置|成人用品).{0,16}(?:展示|宣传|售卖|推荐|演示|情景演绎|夸张描述)|(?:展示|宣传|售卖|推荐|演示|情景演绎|夸张描述).{0,16}(?:两性用品|情趣用品|愉悦玩具|感官交互装置|成人用品)",
      riskLevel: "manual_review"
    }
  ],
  低俗挑逗与擦边: [
    {
      label: "敏感物品展示 + 低俗演绎组合",
      pattern:
        "(?:私密|敏感部位|两性用品|情趣用品|愉悦玩具).{0,16}(?:低俗|挑逗|擦边|情景演绎|夸张描述)|(?:低俗|挑逗|擦边|情景演绎|夸张描述).{0,16}(?:私密|敏感部位|两性用品|情趣用品|愉悦玩具)",
      riskLevel: "manual_review"
    }
  ],
  步骤化敏感内容: [
    {
      label: "步骤教学 + 敏感亲密表达组合",
      pattern:
        "(?:教程|步骤|实操|完整流程|怎么做).{0,16}(?:两性|亲密|私密|敏感部位|自我愉悦)|(?:两性|亲密|私密|敏感部位|自我愉悦).{0,16}(?:教程|步骤|实操|完整流程|怎么做)",
      riskLevel: "manual_review"
    }
  ],
  绝对化与功效承诺: [
    {
      label: "功效承诺 + 敏感表达组合",
      pattern:
        "(?:最好|最佳|永久|根治|见效|安全|修复|治疗).{0,12}(?:两性|亲密|私密|敏感)|(?:两性|亲密|私密|敏感).{0,12}(?:最好|最佳|永久|根治|见效|安全|修复|治疗)",
      riskLevel: "manual_review"
    }
  ]
};

export const feedbackContextCategories = Object.keys(contextCandidateTemplates);

function uniqueStrings(items = []) {
  const list = Array.isArray(items) ? items : [items];
  return [...new Set(list.map((item) => String(item || "").trim()).filter(Boolean))];
}

function uniqueObjectsBy(items = [], keySelector) {
  const seen = new Set();
  const next = [];

  for (const item of items) {
    const key = keySelector(item);

    if (!key || seen.has(key)) {
      continue;
    }

    seen.add(key);
    next.push(item);
  }

  return next;
}

function summarizeText(value = "", maxLength = 80) {
  const text = String(value || "").replace(/\s+/g, " ").trim();

  if (!text) {
    return "";
  }

  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

export function inferFeedbackCategory(reason = "") {
  const text = String(reason);

  if (/未成年/.test(text)) {
    return { suggestedCategory: "未成年人边界", suggestedRiskLevel: "hard_block" };
  }
  if (/(导流|私信|站外|二维码|联系)/.test(text)) {
    return { suggestedCategory: "导流与私域", suggestedRiskLevel: "hard_block" };
  }
  if (/(两性用品|情趣用品|成人用品|愉悦玩具|感官交互装置)/.test(text)) {
    return { suggestedCategory: "两性用品宣传与展示", suggestedRiskLevel: "manual_review" };
  }
  if (/(低俗|暗示|擦边)/.test(text)) {
    return { suggestedCategory: "低俗挑逗与擦边", suggestedRiskLevel: "manual_review" };
  }
  if (/(步骤|教程|演示|实操|流程)/.test(text)) {
    return { suggestedCategory: "步骤化敏感内容", suggestedRiskLevel: "manual_review" };
  }
  if (/(夸大|功效|宣传|治疗)/.test(text)) {
    return { suggestedCategory: "绝对化与功效承诺", suggestedRiskLevel: "manual_review" };
  }

  return { suggestedCategory: "待人工判断", suggestedRiskLevel: "manual_review" };
}

export function mergeSuspiciousPhrases(...groups) {
  return uniqueStrings(groups.flat());
}

function cleanPhrase(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function canonicalizePhrase(value = "") {
  return normalizeText(cleanPhrase(value));
}

function dedupePhrases(items = []) {
  return uniqueObjectsBy(
    items
      .map((item) => {
        const phrase = cleanPhrase(item);
        return phrase ? { phrase, canonical: canonicalizePhrase(phrase) } : null;
      })
      .filter(Boolean),
    (item) => item.canonical
  ).map((item) => item.phrase);
}

export function getCandidatePhraseIssue(phrase = "") {
  const text = cleanPhrase(phrase);

  if (!text) {
    return "候选词为空";
  }

  if (text.length <= 1) {
    return "候选词过短";
  }

  if (abstractReasonPhrasePatterns.some((pattern) => pattern.test(text))) {
    return "更像平台原因标签，不适合作为直接匹配词";
  }

  return "";
}

export function isValidLexiconCandidatePhrase(phrase = "") {
  return !getCandidatePhraseIssue(phrase);
}

function buildCandidateKey(candidate) {
  if (candidate.match === "regex") {
    return `regex:${String(candidate.pattern || "").trim()}`;
  }

  return `exact:${canonicalizePhrase(candidate.phrase || candidate.term || "")}`;
}

function createExactCandidateSeed(phrase, inferred) {
  return {
    phrase,
    match: "exact",
    category: inferred.suggestedCategory || "待人工判断",
    riskLevel: inferred.suggestedRiskLevel || "manual_review",
    notes: ""
  };
}

function createContextCandidateSeeds(item, inferred) {
  const categories = uniqueStrings([
    inferred.suggestedCategory,
    ...(item.analysisSnapshot?.categories || []),
    ...(item.feedbackModelSuggestion?.contextCategories || [])
  ]).filter((category) => feedbackContextCategories.includes(category));
  const text = `${item.noteContent || item.body || ""}\n${item.platformReason || ""}`;

  if (!categories.length) {
    return [];
  }

  return categories.flatMap((category) =>
    (contextCandidateTemplates[category] || []).map((template) => ({
      phrase: template.label,
      match: "regex",
      pattern: template.pattern,
      category,
      riskLevel: template.riskLevel || inferred.suggestedRiskLevel || "manual_review",
      notes: [
        `由违规原因回流自动推断的语境候选；原始原因：${String(item.platformReason || "").trim()}`,
        item.feedbackModelSuggestion?.contextCategories?.includes(category)
          ? `GLM(${String(item.feedbackModelSuggestion?.model || "").trim() || "未标记模型"}) 也建议关注该语境`
          : ""
      ]
        .filter(Boolean)
        .join("；"),
      sourceText: text
    }))
  );
}

function topAnalysisHits(hits = [], limit = 3) {
  return (Array.isArray(hits) ? hits : []).slice(0, limit).map((hit) => ({
    category: String(hit.category || "").trim(),
    riskLevel: String(hit.riskLevel || "").trim(),
    reason: String(hit.reason || hit.evidence || "").trim()
  }));
}

export function buildAnalysisSnapshot(analysis) {
  if (!analysis || typeof analysis !== "object") {
    return null;
  }

  const verdict = String(analysis.verdict || "").trim();
  const score = Number(analysis.score);
  const categories = uniqueStrings(analysis.categories);
  const suggestions = uniqueStrings(analysis.suggestions).slice(0, 3);
  const topHits = topAnalysisHits(analysis.hits);

  if (!verdict && !categories.length && !topHits.length && !suggestions.length && !Number.isFinite(score)) {
    return null;
  }

  return {
    verdict: verdict || "pass",
    score: Number.isFinite(score) ? score : 0,
    categories,
    hitCount: Array.isArray(analysis.hits) ? analysis.hits.length : 0,
    topHits,
    suggestions
  };
}

export function buildReviewAudit({ platformReason = "", analysisSnapshot = null }) {
  const inferred = inferFeedbackCategory(platformReason);
  const expectedRiskLevel = inferred.suggestedRiskLevel || "manual_review";
  const analyzerVerdict = String(analysisSnapshot?.verdict || "").trim() || "pass";
  const expectedRank = severityRank[expectedRiskLevel] ?? severityRank.manual_review;
  const analyzerRank = severityRank[analyzerVerdict] ?? severityRank.pass;

  if (!analysisSnapshot) {
    return {
      signal: "not_reviewed",
      label: "未完成规则复盘",
      expectedRiskLevel,
      analyzerVerdict: "unknown",
      inferredCategory: inferred.suggestedCategory,
      notes: "缺少可复盘的内容文本，暂未对当前规则进行回看。"
    };
  }

  if (analyzerRank + 1 < expectedRank) {
    return {
      signal: "rule_gap",
      label: "规则可能漏判",
      expectedRiskLevel,
      analyzerVerdict,
      inferredCategory: inferred.suggestedCategory,
      notes: "平台原因推断出的风险等级明显高于当前规则结论，建议优先补规则。"
    };
  }

  if (analyzerRank > expectedRank) {
    return {
      signal: "rule_strict",
      label: "规则可能偏严",
      expectedRiskLevel,
      analyzerVerdict,
      inferredCategory: inferred.suggestedCategory,
      notes: "当前规则给出的风险高于平台原因推断，可关注误杀。"
    };
  }

  return {
    signal: "aligned",
    label: "规则基本一致",
    expectedRiskLevel,
    analyzerVerdict,
    inferredCategory: inferred.suggestedCategory,
    notes: "平台原因与当前规则判断大体一致，可继续积累样本。"
  };
}

function sanitizeAnalysisSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== "object") {
    return null;
  }

  const verdict = String(snapshot.verdict || "").trim();
  const score = Number(snapshot.score);
  const categories = uniqueStrings(snapshot.categories);
  const suggestions = uniqueStrings(snapshot.suggestions);
  const topHits = topAnalysisHits(snapshot.topHits || snapshot.hits);
  const hitCount = Number(snapshot.hitCount);

  if (!verdict && !categories.length && !suggestions.length && !topHits.length && !Number.isFinite(score)) {
    return null;
  }

  return {
    verdict: verdict || "pass",
    score: Number.isFinite(score) ? score : 0,
    categories,
    hitCount: Number.isFinite(hitCount) ? hitCount : topHits.length,
    topHits,
    suggestions
  };
}

function sanitizeReviewAudit(audit) {
  if (!audit || typeof audit !== "object") {
    return null;
  }

  const signal = String(audit.signal || "").trim();
  const label = String(audit.label || "").trim();
  const expectedRiskLevel = String(audit.expectedRiskLevel || "").trim();
  const analyzerVerdict = String(audit.analyzerVerdict || "").trim();
  const inferredCategory = String(audit.inferredCategory || "").trim();
  const notes = String(audit.notes || "").trim();

  if (!signal && !label && !expectedRiskLevel && !analyzerVerdict && !inferredCategory && !notes) {
    return null;
  }

  return {
    signal,
    label,
    expectedRiskLevel,
    analyzerVerdict,
    inferredCategory,
    notes
  };
}

function chooseStricterRiskLevel(left = "manual_review", right = "manual_review") {
  return (severityRank[left] ?? 0) >= (severityRank[right] ?? 0) ? left : right;
}

function buildPriorityScore(item) {
  const hitCount = Math.max(1, Number(item.hitCount) || 1);
  const baseByRisk = {
    hard_block: 80,
    manual_review: 48,
    observe: 20,
    pass: 6
  };
  const signalBoost = {
    rule_gap: 24,
    aligned: 8,
    rule_strict: 4,
    not_reviewed: 0
  };

  return (
    (baseByRisk[item.suggestedRiskLevel] || 12) +
    Math.min(hitCount, 6) * 14 +
    Math.min((item.sourceCount || 1) - 1, 4) * 6 +
    (signalBoost[item.reviewAuditSignal] || 0)
  );
}

function priorityLabel(score) {
  if (score >= 110) return "最高优先";
  if (score >= 78) return "高优先";
  if (score >= 46) return "中优先";
  return "低优先";
}

function sortReviewQueue(items = []) {
  return [...items].sort((a, b) => {
    const scoreGap = (b.priorityScore || 0) - (a.priorityScore || 0);

    if (scoreGap !== 0) {
      return scoreGap;
    }

    const hitGap = (b.hitCount || 0) - (a.hitCount || 0);

    if (hitGap !== 0) {
      return hitGap;
    }

    return String(b.lastSeenAt || b.createdAt || "").localeCompare(String(a.lastSeenAt || a.createdAt || ""));
  });
}

export function sanitizeScreenshotMeta(screenshot) {
  if (!screenshot || typeof screenshot !== "object") {
    return null;
  }

  const name = String(screenshot.name || "").trim();
  const type = String(screenshot.type || "").trim();
  const size =
    typeof screenshot.size === "number" && Number.isFinite(screenshot.size) && screenshot.size >= 0
      ? screenshot.size
      : undefined;

  if (!name && !type && size === undefined) {
    return null;
  }

  return { name, type, size };
}

export function sanitizeScreenshotRecognition(recognition) {
  if (!recognition || typeof recognition !== "object") {
    return null;
  }

  const model = String(recognition.model || "").trim();
  const platformReason = String(recognition.platformReason || "").trim();
  const suspiciousPhrases = uniqueStrings(recognition.suspiciousPhrases);
  const extractedText = String(recognition.extractedText || "").trim();
  const summary = String(recognition.summary || "").trim();
  const notes = String(recognition.notes || "").trim();
  const confidence =
    typeof recognition.confidence === "number" && Number.isFinite(recognition.confidence)
      ? Math.max(0, Math.min(1, recognition.confidence))
      : null;

  if (
    !model &&
    !platformReason &&
    suspiciousPhrases.length === 0 &&
    !extractedText &&
    !summary &&
    !notes &&
    confidence === null
  ) {
    return null;
  }

  return {
    model,
    platformReason,
    suspiciousPhrases,
    extractedText,
    summary,
    notes,
    confidence,
    recognizedAt: String(recognition.recognizedAt || "").trim() || new Date().toISOString()
  };
}

export function sanitizeFeedbackModelSuggestion(suggestion) {
  if (!suggestion || typeof suggestion !== "object") {
    return null;
  }

  const provider = String(suggestion.provider || "").trim();
  const model = String(suggestion.model || "").trim();
  const suspiciousPhrases = dedupePhrases(suggestion.suspiciousPhrases);
  const contextCategories = uniqueStrings(suggestion.contextCategories).filter((category) =>
    feedbackContextCategories.includes(category)
  );
  const summary = String(suggestion.summary || "").trim();
  const notes = String(suggestion.notes || "").trim();
  const confidence =
    typeof suggestion.confidence === "number" && Number.isFinite(suggestion.confidence)
      ? Math.max(0, Math.min(1, suggestion.confidence))
      : null;

  if (!model && !suspiciousPhrases.length && !contextCategories.length && !summary && !notes && confidence === null) {
    return null;
  }

  return {
    provider,
    model,
    suspiciousPhrases,
    contextCategories,
    summary,
    notes,
    confidence,
    reviewedAt: String(suggestion.reviewedAt || "").trim() || new Date().toISOString()
  };
}

export function normalizeFeedbackItems(input) {
  const items = Array.isArray(input) ? input : [input];

  return items.filter(Boolean).map((item, index) => {
    const noteContent = String(item.noteContent || item.body || "").trim();

    return {
      source: item.source || "xiaohongshu",
      noteId: deriveFeedbackNoteId(
        {
          ...item,
          noteContent
        },
        String(index)
      ),
      title: item.title || "",
      body: noteContent,
      noteContent,
      noteExcerpt: summarizeText(noteContent),
      platformReason: String(item.platformReason || "").trim(),
      decision: item.decision || "",
      suspiciousPhrases: dedupePhrases(item.suspiciousPhrases),
      screenshot: sanitizeScreenshotMeta(item.screenshot),
      screenshotRecognition: sanitizeScreenshotRecognition(item.screenshotRecognition),
      feedbackModelSuggestion: sanitizeFeedbackModelSuggestion(item.feedbackModelSuggestion),
      analysisSnapshot: sanitizeAnalysisSnapshot(item.analysisSnapshot),
      reviewAudit: sanitizeReviewAudit(item.reviewAudit),
      createdAt: item.createdAt || new Date().toISOString()
    };
  });
}

export function deriveReviewCandidates(feedbackItems, { existingQueue = [], lexicon = [] } = {}) {
  const knownCandidates = new Set(
    lexicon
      .map((entry) => ({
        match: entry.match === "regex" ? "regex" : "exact",
        phrase: entry.term || "",
        pattern: entry.pattern || ""
      }))
      .map((entry) => buildCandidateKey(entry))
      .filter(Boolean)
  );
  const nextCandidates = existingQueue.map((item) => {
    const normalized = {
      ...item,
      match: item.match === "regex" ? "regex" : "exact",
      pattern: String(item.pattern || "").trim(),
      canonicalPhrase: String(item.canonicalPhrase || canonicalizePhrase(item.phrase)).trim(),
      hitCount: Math.max(1, Number(item.hitCount) || 1),
      sourceCount: Math.max(1, Number(item.sourceCount) || 1),
      lastSeenAt: item.lastSeenAt || item.createdAt || new Date().toISOString(),
      platformReasons: uniqueStrings(item.platformReasons || [item.platformReason])
    };

    normalized.priorityScore = buildPriorityScore(normalized);
    normalized.priorityLabel = priorityLabel(normalized.priorityScore);
    return normalized;
  });
  const candidateByCanonical = new Map(
    nextCandidates
      .map((item) => {
        const key = buildCandidateKey(item);
        return key ? [key, item] : null;
      })
      .filter(Boolean)
  );

  for (const item of feedbackItems) {
    const inferred = inferFeedbackCategory(item.platformReason);
    const auditSignal = item.reviewAudit?.signal || "";
    const userExactSeeds = item.suspiciousPhrases
      .map((phrase) => cleanPhrase(phrase))
      .filter(Boolean)
      .filter((phrase) => isValidLexiconCandidatePhrase(phrase))
      .map((phrase) => createExactCandidateSeed(phrase, inferred));
    const modelExactSeeds = (item.feedbackModelSuggestion?.suspiciousPhrases || [])
      .map((phrase) => cleanPhrase(phrase))
      .filter(Boolean)
      .filter((phrase) => isValidLexiconCandidatePhrase(phrase))
      .map((phrase) => ({
        ...createExactCandidateSeed(phrase, inferred),
        notes: `由 GLM(${String(item.feedbackModelSuggestion?.model || "").trim() || "未标记模型"}) 根据笔记内容与平台原因补充建议`
      }));
    const exactSeeds = uniqueObjectsBy([...userExactSeeds, ...modelExactSeeds], (seed) =>
      buildCandidateKey({ match: seed.match, phrase: seed.phrase, pattern: seed.pattern })
    );
    const shouldAddContextSeeds =
      exactSeeds.length === 0 ||
      auditSignal === "rule_gap" ||
      (item.feedbackModelSuggestion?.contextCategories || []).length > 0;
    const candidateSeeds = [
      ...exactSeeds,
      ...(shouldAddContextSeeds ? createContextCandidateSeeds(item, inferred) : [])
    ];

    for (const seed of candidateSeeds) {
      const cleanedPhrase = cleanPhrase(seed.phrase);
      const canonicalPhrase = canonicalizePhrase(cleanedPhrase);
      const candidateKey = buildCandidateKey({
        match: seed.match,
        phrase: cleanedPhrase,
        pattern: seed.pattern
      });

      if (!cleanedPhrase || !candidateKey || knownCandidates.has(candidateKey)) {
        continue;
      }

      const current = candidateByCanonical.get(candidateKey);
      const seenAt = new Date().toISOString();

      if (current) {
        current.phrase = current.phrase || cleanedPhrase;
        current.match = current.match || seed.match || "exact";
        current.pattern = current.pattern || seed.pattern || "";
        current.notes = current.notes || seed.notes || "";
        current.sourceNoteId = item.noteId;
        current.sourceNoteExcerpt = summarizeText(item.noteContent || item.body);
        current.platformReason = item.platformReason || current.platformReason;
        current.platformReasons = uniqueStrings([...(current.platformReasons || []), item.platformReason]);
        const stricterRiskLevel = chooseStricterRiskLevel(
          current.suggestedRiskLevel || "manual_review",
          seed.riskLevel || inferred.suggestedRiskLevel || "manual_review"
        );
        current.suggestedRiskLevel = stricterRiskLevel;
        if (!current.suggestedCategory || stricterRiskLevel === seed.riskLevel) {
          current.suggestedCategory = seed.category || inferred.suggestedCategory;
        }
        current.reviewAuditSignal = current.reviewAuditSignal || auditSignal;
        if (auditSignal === "rule_gap") {
          current.reviewAuditSignal = "rule_gap";
        }
        current.hitCount = Math.max(1, Number(current.hitCount) || 1) + 1;
        current.sourceCount = Math.max(1, Number(current.sourceCount) || 1) + 1;
        current.lastSeenAt = seenAt;
        current.priorityScore = buildPriorityScore(current);
        current.priorityLabel = priorityLabel(current.priorityScore);
        continue;
      }

      const nextItem = {
        id: `candidate-${Date.now()}-${nextCandidates.length + 1}`,
        phrase: cleanedPhrase,
        match: seed.match || "exact",
        pattern: seed.pattern || "",
        canonicalPhrase,
        sourceNoteId: item.noteId,
        sourceNoteExcerpt: summarizeText(item.noteContent || item.body),
        platformReason: item.platformReason,
        platformReasons: uniqueStrings([item.platformReason]),
        status: "pending_review",
        createdAt: seenAt,
        lastSeenAt: seenAt,
        hitCount: 1,
        sourceCount: 1,
        reviewAuditSignal: auditSignal,
        suggestedCategory: seed.category || inferred.suggestedCategory,
        suggestedRiskLevel: seed.riskLevel || inferred.suggestedRiskLevel,
        notes: seed.notes || ""
      };

      nextItem.priorityScore = buildPriorityScore(nextItem);
      nextItem.priorityLabel = priorityLabel(nextItem.priorityScore);
      nextCandidates.push(nextItem);
      candidateByCanonical.set(candidateKey, nextItem);
      knownCandidates.add(candidateKey);
    }
  }

  const sorted = sortReviewQueue(nextCandidates);
  return sorted;
}

export async function createReviewCandidates(feedbackItems, { reset = false } = {}) {
  const [existingQueue, lexicon] = await Promise.all([reset ? [] : loadReviewQueue(), loadLexicon()]);
  const sorted = deriveReviewCandidates(feedbackItems, {
    existingQueue,
    lexicon
  });
  await saveReviewQueue(sorted);
  return sorted;
}
