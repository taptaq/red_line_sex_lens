import { analyzePost } from "./analyzer.js";
import { runCrossModelReview } from "./cross-review.js";
import { deriveFailureReasonTags } from "./feedback.js";
import { callRoutedTextProviderJson, rewritePostForCompliance } from "./glm.js";
import { formatInnerSpaceTermsPrompt } from "./inner-space-terms.js";
import { getRewriteProviderSelection, getRewriteSelectionModel } from "./model-selection.js";
import { ensureArray } from "./normalizer.js";
import { runSemanticReview } from "./semantic-review.js";
import { scoreContentAgainstStyleProfile } from "./style-profile.js";
import { rankSamplesByWeight } from "./sample-weight.js";

const variants = ["safe", "natural", "expressive"];
const finalCandidateVariants = new Set(["final", ...variants]);
const verdictPenalty = {
  pass: 0,
  observe: 12,
  manual_review: 38,
  hard_block: 90
};
const genericGeneratedTags = new Set(["日常", "好物", "分享", "记录", "生活", "推荐", "合集"]);
const defaultGenerationBodyEmojis = ["🙂", "✨", "🫶"];
const invalidRepairTextPattern =
  /^(?:未生成(?:标题|封面文案|正文)?|标签待补|待补(?:充)?|暂无(?:内容|结果)?|无|空|n\/a)$/iu;
const invalidRepairTextContainsPattern =
  /抱歉[，,、 ]?.*(?:补充|提供)|还需要你补充|请(?:先)?补充|请(?:先)?提供|待补(?:充)?|占位/u;
const invalidRepairTagPattern =
  /^(?:标签待补|待补标签|未生成(?:标签)?|暂无标签|补充标签|占位标签|标签)$/iu;

function uniqueStrings(items = []) {
  return [...new Set((Array.isArray(items) ? items : [items]).map((item) => String(item || "").trim()).filter(Boolean))];
}

function normalizeGeneratedTagValue(value = "") {
  return String(value || "")
    .trim()
    .replace(/^[#＃\s]+/g, "")
    .replace(/[，。、,.;；:：!！?？]+$/g, "")
    .trim();
}

function simplifyGeneratedTag(value = "") {
  return normalizeGeneratedTagValue(value).replace(/\s+/g, "").toLowerCase();
}

function isMeaningfulGeneratedTag(value = "") {
  return simplifyGeneratedTag(value).length >= 2;
}

function isGenericGeneratedTag(value = "") {
  return genericGeneratedTags.has(normalizeGeneratedTagValue(value));
}

function isPrefixExpandedDuplicateTag(existingTag = "", nextTag = "") {
  const existing = simplifyGeneratedTag(existingTag);
  const next = simplifyGeneratedTag(nextTag);

  if (!existing || !next || existing === next) {
    return false;
  }

  return existing.startsWith(next) || next.startsWith(existing);
}

function sanitizeGeneratedTags(tags = []) {
  const normalized = uniqueStrings(ensureArray(tags).map((tag) => normalizeGeneratedTagValue(tag)).filter(isMeaningfulGeneratedTag));
  const meaningfulTags = normalized.filter((tag) => !isGenericGeneratedTag(tag));
  const shouldDropGenericTags = meaningfulTags.length >= 3;
  const cleaned = [];

  for (const tag of normalized) {
    if (shouldDropGenericTags && isGenericGeneratedTag(tag)) {
      continue;
    }

    let shouldSkip = false;

    for (let index = 0; index < cleaned.length; index += 1) {
      const current = cleaned[index];

      if (!isPrefixExpandedDuplicateTag(current, tag)) {
        continue;
      }

      const currentSimple = simplifyGeneratedTag(current);
      const nextSimple = simplifyGeneratedTag(tag);

      if (nextSimple.startsWith(currentSimple) && nextSimple.length > currentSimple.length) {
        cleaned[index] = tag;
      }

      shouldSkip = true;
      break;
    }

    if (!shouldSkip) {
      cleaned.push(tag);
    }
  }

  return cleaned.slice(0, 6);
}

function countEmojiCharacters(value = "") {
  return (String(value || "").match(/\p{Extended_Pictographic}/gu) || []).length;
}

function countChineseCharacters(value = "") {
  return (String(value || "").match(/\p{Script=Han}/gu) || []).length;
}

function extractGenerationBodyPrimaryText(value = "") {
  const normalized = String(value || "").replace(/\r\n/g, "\n").trim();

  if (!normalized) {
    return "";
  }

  const markerPattern =
    /\n{2,}(?:[#*>\-•\d.\s【\[]*)?(?:科普补充|补充科普|小科普|科普时间|延伸科普|补充说明|安全提醒|温馨提醒|补充提醒)(?:[\]】:\-—：\s]|$)/u;
  const markerMatch = normalized.match(markerPattern);

  if (!markerMatch || typeof markerMatch.index !== "number") {
    return normalized;
  }

  return normalized.slice(0, markerMatch.index).trim();
}

function countPrimaryChineseCharacters(value = "") {
  return countChineseCharacters(extractGenerationBodyPrimaryText(value));
}

function getGenerationBodyMinChineseChars(lengthMode = "short") {
  return String(lengthMode || "").trim() === "long" ? 1100 : 800;
}

function getGenerationBodyMaxChineseChars(lengthMode = "short") {
  return String(lengthMode || "").trim() === "long" ? 1600 : 1000;
}

function getGenerationMaxTokens() {
  return Math.max(1200, Number(process.env.GENERATION_MAX_TOKENS || 6400));
}

function getGenerationExpansionMaxTokens() {
  return Math.max(1600, Number(process.env.GENERATION_EXPANSION_MAX_TOKENS || 7200));
}

function getGenerationRepairMaxAttempts() {
  return Math.max(1, Number(process.env.GENERATION_REPAIR_MAX_ATTEMPTS || 2));
}

function splitGenerationBodySections(value = "") {
  const normalized = String(value || "").replace(/\r\n/g, "\n").trim();

  if (!normalized) {
    return { primary: "", tail: "" };
  }

  const markerPattern =
    /\n{2,}(?:[#*>\-•\d.\s【\[]*)?(?:科普补充|补充科普|小科普|科普时间|延伸科普|补充说明|安全提醒|温馨提醒|补充提醒)(?:[\]】:\-—：\s]|$)/u;
  const markerMatch = normalized.match(markerPattern);

  if (!markerMatch || typeof markerMatch.index !== "number") {
    return { primary: normalized, tail: "" };
  }

  return {
    primary: normalized.slice(0, markerMatch.index).trim(),
    tail: normalized.slice(markerMatch.index).trim()
  };
}

function pickSpreadIndices(total = 0, count = 0) {
  if (total <= 0 || count <= 0) {
    return [];
  }

  if (count >= total) {
    return Array.from({ length: total }, (_, index) => index);
  }

  const indices = [];

  for (let index = 0; index < count; index += 1) {
    const position = Math.floor(((index + 1) * total) / (count + 1));
    indices.push(Math.max(0, Math.min(total - 1, position)));
  }

  return [...new Set(indices)];
}

function splitParagraphIntoSentences(paragraph = "") {
  return String(paragraph || "")
    .match(/[^。！？!?。\n]+(?:[。！？!?]+)?/gu)
    ?.map((item) => item.trim())
    .filter(Boolean) || [];
}

function splitLongSentenceIntoClauses(sentence = "") {
  const normalized = String(sentence || "").trim();

  if (!normalized) {
    return [];
  }

  const clauses =
    normalized
      .match(/[^，,；;：:\n]+(?:[，,；;：:]+)?/gu)
      ?.map((item) => item.trim())
      .filter(Boolean) || [];

  return clauses.length ? clauses : [normalized];
}

function splitParagraphIntoReadableUnits(paragraph = "") {
  const sentences = splitParagraphIntoSentences(paragraph);

  if (!sentences.length) {
    return [];
  }

  const units = [];

  for (const sentence of sentences) {
    if (countChineseCharacters(sentence) <= 90) {
      units.push(sentence);
      continue;
    }

    units.push(...splitLongSentenceIntoClauses(sentence));
  }

  return units.filter(Boolean);
}

function rebalanceGenerationBodyParagraphs(value = "") {
  const { primary, tail } = splitGenerationBodySections(value);

  if (!primary) {
    return tail;
  }

  const paragraphs = primary.split(/\n\s*\n/).map((item) => item.trim()).filter(Boolean);
  const rebuiltParagraphs = [];

  for (const paragraph of paragraphs) {
    const sentences = splitParagraphIntoReadableUnits(paragraph);

    if (!sentences.length) {
      rebuiltParagraphs.push(paragraph);
      continue;
    }

    const sentenceCount = sentences.length;
    const paragraphHanChars = countChineseCharacters(paragraph);

    if (sentenceCount <= 3 && paragraphHanChars <= 120) {
      rebuiltParagraphs.push(paragraph);
      continue;
    }

    let chunk = [];
    let chunkHanChars = 0;

    for (const sentence of sentences) {
      chunk.push(sentence);
      chunkHanChars += countChineseCharacters(sentence);
      const chunkSentenceCount = chunk.length;
      const shouldFlush =
        chunkSentenceCount >= 3 ||
        (chunkSentenceCount >= 2 && (chunkHanChars >= 55 || sentenceCount >= 5)) ||
        chunkHanChars >= 95;

      if (!shouldFlush) {
        continue;
      }

      rebuiltParagraphs.push(chunk.join(""));
      chunk = [];
      chunkHanChars = 0;
    }

    if (chunk.length) {
      rebuiltParagraphs.push(chunk.join(""));
    }
  }

  return [rebuiltParagraphs.join("\n\n"), tail].filter(Boolean).join("\n\n");
}

function compactGenerationBodyToMaxChineseChars(value = "", lengthMode = "short") {
  const { primary, tail } = splitGenerationBodySections(value);
  const maxChineseChars = getGenerationBodyMaxChineseChars(lengthMode);

  if (!primary || countChineseCharacters(primary) <= maxChineseChars) {
    return value;
  }

  const sentences = splitParagraphIntoSentences(primary);
  const readableUnits = splitParagraphIntoReadableUnits(primary);

  if (!readableUnits.length) {
    return value;
  }

  const keptSentences = [];
  let currentHanChars = 0;

  for (const sentence of readableUnits) {
    const sentenceHanChars = countChineseCharacters(sentence);

    if (!keptSentences.length || currentHanChars + sentenceHanChars <= maxChineseChars) {
      keptSentences.push(sentence);
      currentHanChars += sentenceHanChars;
      continue;
    }

    break;
  }

  const compactedPrimary = rebalanceGenerationBodyParagraphs(keptSentences.join(""));
  return [compactedPrimary, tail].filter(Boolean).join("\n\n");
}

function normalizeGenerationBody(value = "", { lengthMode = "short" } = {}) {
  const compactedBody = compactGenerationBodyToMaxChineseChars(value, lengthMode);
  const body = rebalanceGenerationBodyParagraphs(compactedBody);

  if (!body) {
    return "";
  }

  const missingCount = Math.max(0, 3 - countEmojiCharacters(body));

  if (!missingCount) {
    return body;
  }

  const { primary, tail } = splitGenerationBodySections(body);
  const paragraphs = primary.split(/\n\s*\n/).map((item) => item.trim()).filter(Boolean);

  if (!paragraphs.length) {
    return [body, ...defaultGenerationBodyEmojis.slice(0, missingCount)].join("\n\n");
  }

  const sentenceRefs = [];

  paragraphs.forEach((paragraph, paragraphIndex) => {
    splitParagraphIntoSentences(paragraph).forEach((sentence, sentenceIndex) => {
      if (!countEmojiCharacters(sentence)) {
        sentenceRefs.push({ paragraphIndex, sentenceIndex });
      }
    });
  });

  const targetRefs = pickSpreadIndices(sentenceRefs.length, Math.min(missingCount, sentenceRefs.length)).map(
    (position) => sentenceRefs[position]
  );
  const targetRefKeys = new Set(targetRefs.map((item) => `${item.paragraphIndex}:${item.sentenceIndex}`));

  let emojiCursor = 0;
  const rewrittenParagraphs = paragraphs.map((paragraph, paragraphIndex) => {
    const sentences = splitParagraphIntoSentences(paragraph);

    return sentences
      .map((sentence, sentenceIndex) => {
        const key = `${paragraphIndex}:${sentenceIndex}`;

        if (!targetRefKeys.has(key) || emojiCursor >= missingCount) {
          return sentence;
        }

        const emoji = defaultGenerationBodyEmojis[emojiCursor];
        emojiCursor += 1;

        return `${sentence}${emoji}`;
      })
      .join("");
  });

  const trailingEmojiParagraphs = defaultGenerationBodyEmojis.slice(emojiCursor, missingCount).map((emoji) => `${emoji}`);

  return [rewrittenParagraphs.join("\n\n"), tail, ...trailingEmojiParagraphs].filter(Boolean).join("\n\n");
}

function normalizeCoverComparisonText(value = "") {
  return String(value || "")
    .toLowerCase()
    .replace(/\p{Extended_Pictographic}/gu, "")
    .replace(/[#＃\s\p{P}\p{S}]+/gu, "")
    .trim();
}

function isCoverTextTooSimilarToTitle({ title = "", coverText = "" } = {}) {
  const normalizedTitle = normalizeCoverComparisonText(title);
  const normalizedCover = normalizeCoverComparisonText(coverText);

  if (!normalizedTitle || !normalizedCover) {
    return false;
  }

  if (normalizedTitle === normalizedCover) {
    return true;
  }

  const shorter = normalizedTitle.length <= normalizedCover.length ? normalizedTitle : normalizedCover;
  const longer = shorter === normalizedTitle ? normalizedCover : normalizedTitle;

  return shorter.length >= 4 && longer.includes(shorter);
}

function parseTagReferenceInput(value = "") {
  return uniqueStrings(
    String(value || "")
      .split(/[\n，,、]/)
      .map((item) => item.trim())
      .filter(Boolean)
  );
}

function collectReferenceSampleTopTags(samples = [], limit = 8) {
  const counts = new Map();

  for (const sample of Array.isArray(samples) ? samples : []) {
    const weight = Math.max(1, Number(sample?.sampleWeight) || 1);

    for (const tag of ensureArray(sample?.tags)) {
      const normalized = String(tag || "").trim();

      if (!normalized) {
        continue;
      }

      counts.set(normalized, (counts.get(normalized) || 0) + weight);
    }
  }

  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1])
    .map(([tag]) => tag)
    .slice(0, limit);
}

function buildGenerationTagGuidance({ brief = {}, styleProfile = null, referenceSamples = [] } = {}) {
  const userTagReferences = parseTagReferenceInput(brief.tagReferences);
  const profileTags = uniqueStrings(styleProfile?.preferredTags || []);
  const referenceTags = collectReferenceSampleTopTags(referenceSamples);

  return {
    userTagReferences,
    profileTags,
    referenceTags
  };
}

function stringifyReferenceSamples(samples = []) {
  return rankSamplesByWeight(samples)
    .slice(0, 5)
    .map((sample, index) =>
      [
        `参考样本 ${index + 1}（${sample.tier || "passed"}，权重 ${sample.sampleWeight}）：`,
        `标题：${sample.title || ""}`,
        `正文摘要：${String(sample.body || "").slice(0, 220)}`,
        `标签：${ensureArray(sample.tags).join("、")}`
      ].join("\n")
    )
    .join("\n\n");
}

function normalizeMemorySampleTitle(sample = {}) {
  return String(sample.payload?.note?.title || sample.payload?.title || sample.title || "").trim();
}

function normalizeMemorySampleBody(sample = {}) {
  return String(sample.payload?.note?.body || sample.payload?.body || sample.body || "").trim();
}

function stringifySharedMemoryContext(memoryContext = null) {
  if (!memoryContext || typeof memoryContext !== "object") {
    return "";
  }

  const referenceSection = ensureArray(memoryContext.referenceSamples)
    .slice(0, 3)
    .map((sample, index) => {
      const title = normalizeMemorySampleTitle(sample);
      const body = normalizeMemorySampleBody(sample);
      const lines = [`共享参考 ${index + 1}：${title || "未命名样本"}`];

      if (body) {
        lines.push(`可借鉴正文节奏：${body.slice(0, 140)}`);
      }

      return lines.join("\n");
    })
    .join("\n\n");
  const memoryCardSection = ensureArray(memoryContext.memoryCards)
    .slice(0, 4)
    .map((card, index) => {
      const kind = String(card.kind || "").trim();
      const label =
        kind === "risk_boundary_card"
          ? "风险边界卡"
          : kind === "style_experience_card"
            ? "风格经验卡"
            : "经验卡";
      const summary = String(card.summary || card.title || "").trim();

      return summary ? `${label} ${index + 1}：${summary}` : "";
    })
    .filter(Boolean)
    .join("\n");

  return [
    referenceSection ? `共享记忆参考：\n${referenceSection}` : "",
    memoryCardSection ? `共享记忆卡：\n${memoryCardSection}` : ""
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function buildGenerationMessages({
  mode = "from_scratch",
  brief = {},
  draft = {},
  styleProfile = null,
  referenceSamples = [],
  innerSpaceTerms = [],
  memoryContext = null
} = {}) {
  const lengthMode = String(brief.lengthMode || "short").trim() === "long" ? "long" : "short";
  const lengthInstruction =
    lengthMode === "long"
      ? "长文档：正文控制在 1100-1600 个中文字符左右，按中文字符数理解，不是按英文单词、空格、emoji 或 markdown 符号凑长度；这里只算正文主体，不包含末尾额外附加的科普补充、补充说明或安全提醒小节；信息更完整，但仍然要自然分段，每段 2-4 句，避免一整坨长段。"
      : "短文档：正文控制在 800-1000 个中文字符左右，按中文字符数理解，不是按英文单词、空格、emoji 或 markdown 符号凑长度；这里只算正文主体，不包含末尾额外附加的科普补充、补充说明或安全提醒小节；表达紧凑但不能干瘪，同样要自然分段，每段 2-4 句。";
  const terminologyPrompt = formatInnerSpaceTermsPrompt(innerSpaceTerms);
  const sharedMemoryPrompt = stringifySharedMemoryContext(memoryContext);
  const tagGuidance = buildGenerationTagGuidance({ brief, styleProfile, referenceSamples });
  return [
    {
      role: "system",
      content: [
        "你是小红书内容生成助手，目标是生成合规、自然、符合账号风格的笔记。",
        "不要帮助规避平台审核，不要输出低俗擦边、导流、夸大承诺或教程化敏感内容。",
        "标题一定要吸睛，带一点高反差，但不能低俗、不能标题党过头。",
        "封面文案也要尽可能吸睛、高反差，但要比标题更短、更冲击，像一眼能扫到的封面钩子。",
        "正文要像真人在说话，要有人味、自然感、大白话感，不要像说明书或模板稿。",
        "表达围绕内太空主题展开，敏感词尽量转成自然的内太空黑话表达，但不要为了隐晦而写得难懂。",
        "要自然融入内太空的相关元素，整体表达要符合账号主题。",
        "尽量把内太空元素落在标题、封面文案、正文开头三者里至少两处。",
        "可以适当加 emoji，但不要堆太多，点到为止；正文至少包含 3 个 emoji，并且要自然分散。",
        "不要输出一大段长文不分段，必须注意阅读节奏和段落呼吸感。",
        "请生成 1 个最终候选稿。",
        "只返回 JSON。"
      ].join("\n")
    },
    {
      role: "user",
      content: [
        `生成模式：${mode === "draft_optimize" ? "草稿优化" : "从零生成"}`,
        `合集类型：${brief.collectionType || ""}`,
        `文案长度偏好：${lengthMode === "long" ? "长文档" : "短文档"}`,
        brief.briefing ? `需求说明：${brief.briefing}` : "",
        brief.referenceTitle ? `参考标题：${brief.referenceTitle}` : "",
        brief.topic ? `主题：${brief.topic}` : "",
        brief.sellingPoints ? `卖点：${brief.sellingPoints}` : "",
        brief.audience ? `目标人群：${brief.audience}` : "",
        brief.constraints ? `注意事项：${brief.constraints}` : "",
        `标签参考项：${tagGuidance.userTagReferences.join(", ")}`,
        `原始标题：${draft.title || ""}`,
        `原始正文：${draft.body || ""}`,
        `原始封面：${draft.coverText || ""}`,
        `原始标签：${ensureArray(draft.tags).join("、")}`,
        "",
        "当前生效风格画像：",
        JSON.stringify(styleProfile || {}, null, 2),
        tagGuidance.profileTags.length ? `风格画像偏好标签：${tagGuidance.profileTags.join("、")}` : "",
        "",
        "可参考成功样本：",
        stringifyReferenceSamples(referenceSamples),
        tagGuidance.referenceTags.length ? `参考样本高频标签：${tagGuidance.referenceTags.join("、")}` : "",
        "",
        sharedMemoryPrompt ? "共享记忆提示：" : "",
        sharedMemoryPrompt,
        sharedMemoryPrompt ? "" : "",
        terminologyPrompt,
        terminologyPrompt ? "" : "",
        "生成规则：",
        "1. 标题一定要吸睛、高反差，让人想点开，但不能显得油腻、夸张或低俗。",
        "2. 封面文案要比标题更短、更像一眼能扫到的封面钩子，尽量吸睛、高反差，但不要低俗或过火。",
        "3. 封面文案和标题不要只是重复复述，二者要形成一主一辅的点击配合。",
        "4. 正文必须分段清楚，读起来顺，不要一整段铺到底。",
        "5. 语气自然，像真实的人在分享，用大白话，减少机器感。",
        "6. 适当加入 emoji，起点缀作用，不要密集堆砌；正文至少包含 3 个 emoji。",
        "7. 要自然融入内太空相关元素，整体表达要符合账号主题；尽量把内太空元素落在标题、封面文案、正文开头三者中的至少两处；涉及敏感表达时，优先用自然的内太空黑话替代。",
        "8. 不要写成教程化敏感步骤，不要出现明显导流、露骨挑逗或夸大承诺。",
        `9. ${lengthInstruction}`,
        "10. 标签由你自动生成 3-6 个，优先参考用户提供的标签参考项、风格画像偏好标签和参考样本高频标签。",
        "11. 可以结合小红书常见的热门标签、细分标签表达方式，但不要硬蹭无关热词，也不要机械照抄参考标签。",
        "12. 避免只给过于空泛的大词标签，比如泛泛的情绪词、成长词、关系词；优先输出和当前主题强相关的表达。",
        "13. 至少包含 1 个更具体的场景标签，可以从人群、问题、场景、情绪、阶段或需求切入，让标签更细分可检索。",
        "14. 不要 3-6 个标签全部都是泛热门词，热门标签最多点到为止，剩余标签要体现内容的具体语境。",
        "15. 避免输出语义非常接近的重复标签；如果已经有“亲密关系”这一类宽标签，就不要再连续给出多个几乎同义的宽泛标签。",
        "16. 标签之间要有分工，尽量覆盖主题、人群、场景、问题或需求中的不同维度，而不是换个说法重复同一层意思。",
        "17. 标签结构上优先采用“1 个相对宽一点的主标签 + 2-4 个更细分的标签”的组合，让标签既能概括主题，也能承接具体检索场景。",
        "18. 不要把 3-6 个名额都分配给同一层级的大词，除非用户明确要求，否则宽标签尽量控制在 1 个以内。",
        "19. 细分标签优先从具体场景、人群阶段、痛点问题、情绪状态或需求目标里提炼，提升标签的信息量和区分度。",
        "",
        "输出格式：",
        "{",
        '  "candidate": {"variant":"final","title":"标题","body":"正文","coverText":"封面文案","tags":["标签"],"generationNotes":"生成说明","safetyNotes":"安全注意点","referencedSampleIds":["sample-id"]}',
        "}",
        "要求：不要照抄参考样本；直接给出你判断最适合发布的一版最终稿；正文必须完整，不要只给摘要。"
      ].join("\n")
    }
  ];
}

export function buildGenerationBriefingMessages({ mode = "from_scratch", brief = {}, draft = {} } = {}) {
  return [
    {
      role: "system",
      content: [
        "你是小红书内容生成工作台里的需求润色助手。",
        "你的任务是把用户输入的一句话需求，扩展成更完整、更好用的生成说明。",
        "只能补足表达层面的清晰度、结构化程度、语气要求、目标读者、内容重点和边界提醒。",
        "不要改变用户原意，不要凭空发明具体经历、具体数据或未被用户提到的强结论。",
        "如果信息不足，就用更通用但实用的描述补齐，不要过度脑补。",
        "只返回 JSON。"
      ].join("\n")
    },
    {
      role: "user",
      content: [
        `当前模式：${mode === "draft_optimize" ? "草稿优化" : "从零生成"}`,
        `合集类型：${brief.collectionType || ""}`,
        `原始一句话需求：${brief.briefing || ""}`,
        `参考标题：${brief.referenceTitle || ""}`,
        `现有标签提示词：${brief.tagReferences || ""}`,
        `草稿标题：${draft.title || ""}`,
        `草稿正文：${draft.body || ""}`,
        "",
        "请把这条一句话需求扩展成更完整的生成说明，优先补足：",
        "1. 这篇内容想解决什么问题",
        "2. 希望用什么语气写",
        "3. 更适合写给谁看",
        "4. 要强调哪些重点",
        "5. 有哪些边界提醒",
        "",
        "只返回 JSON。",
        "",
        "输出格式：",
        "{",
        '  "briefing": "扩展后的完整说明，保持一段自然中文即可",',
        '  "notes": ["本次主要补足了什么，可以 1-3 条"]',
        "}"
      ].join("\n")
    }
  ];
}

export function normalizeGenerationCandidate(candidate = {}, index = 0, options = {}) {
  const normalizedVariant = String(candidate.variant || "").trim();
  const variant = finalCandidateVariants.has(normalizedVariant) ? normalizedVariant : variants[index] || "safe";

  return {
    id: String(candidate.id || `candidate-${variant}-${index + 1}`).trim(),
    variant,
    title: String(candidate.title || "").trim(),
    body: normalizeGenerationBody(candidate.body || candidate.content || "", options),
    coverText: String(candidate.coverText || "").trim(),
    tags: sanitizeGeneratedTags(candidate.tags),
    generationNotes: String(candidate.generationNotes || candidate.rewriteNotes || "").trim(),
    safetyNotes: String(candidate.safetyNotes || "").trim(),
    referencedSampleIds: uniqueStrings(candidate.referencedSampleIds)
  };
}

function looksLikeLeakedRepairPrompt(candidate = {}) {
  const body = String(candidate.body || "").trim();

  if (!body) {
    return false;
  }

  const promptLeakPattern =
    /你好像忘记|忘记粘贴|请把下面这几块内容贴给我|当前合规改写后的具体文本|当前合规改写标题|当前合规改写正文|当前合规改写封面文案|直接给你输出\s*json|输出\s*json\s*结果/iu;

  return promptLeakPattern.test(body);
}

function isInvalidRepairTextValue(value = "") {
  const normalized = String(value || "").trim();

  if (!normalized) {
    return true;
  }

  return invalidRepairTextPattern.test(normalized) || invalidRepairTextContainsPattern.test(normalized);
}

function pickRepairTextValue(rewriteValue, previousValue, candidateValue) {
  const rewriteText = String(rewriteValue || "").trim();

  if (rewriteText && !isInvalidRepairTextValue(rewriteText)) {
    return rewriteText;
  }

  return String(previousValue || "").trim() || String(candidateValue || "").trim();
}

function sanitizeRepairTags(tags = []) {
  return sanitizeGeneratedTags(tags).filter((tag) => !invalidRepairTagPattern.test(String(tag || "").trim()));
}

function mergeGenerationRepairDraft(previousDraft = {}, rewrite = {}, candidate = {}) {
  const previousTags = sanitizeGeneratedTags(previousDraft?.tags || candidate?.tags || []);
  const rewriteTags = sanitizeRepairTags(rewrite?.tags || []);
  const nextTitle = pickRepairTextValue(rewrite?.title, previousDraft?.title, candidate?.title);
  const nextBody = pickRepairTextValue(rewrite?.body || rewrite?.content, previousDraft?.body, candidate?.body);
  const nextCoverText = pickRepairTextValue(rewrite?.coverText, previousDraft?.coverText, candidate?.coverText);
  const nextTags = rewriteTags.length >= 2 || !previousTags.length ? rewriteTags : previousTags;
  const nextReferencedSampleIds = uniqueStrings(
    Array.isArray(rewrite?.referencedSampleIds) && rewrite.referencedSampleIds.length
      ? rewrite.referencedSampleIds
      : previousDraft?.referencedSampleIds || candidate?.referencedSampleIds || []
  );

  return {
    ...rewrite,
    id: candidate.id,
    variant: candidate.variant,
    title: nextTitle,
    body: nextBody,
    coverText: nextCoverText,
    tags: nextTags,
    referencedSampleIds: nextReferencedSampleIds,
    generationNotes:
      String(rewrite?.rewriteNotes || "").trim() ||
      String(rewrite?.generationNotes || "").trim() ||
      String(previousDraft?.generationNotes || "").trim() ||
      String(candidate?.generationNotes || "").trim(),
    safetyNotes:
      String(rewrite?.safetyNotes || "").trim() ||
      String(previousDraft?.safetyNotes || "").trim() ||
      String(candidate?.safetyNotes || "").trim()
  };
}

function extractRawGenerationCandidate(payload = {}) {
  if (payload?.candidate && typeof payload.candidate === "object") {
    return payload.candidate;
  }

  if (ensureArray(payload?.candidates)[0] && typeof ensureArray(payload.candidates)[0] === "object") {
    return ensureArray(payload.candidates)[0];
  }

  return looksLikeGenerationCandidatePayload(payload) ? payload : null;
}

function buildCoverTextRepairMessages({ candidate = {}, brief = {} } = {}) {
  return [
    {
      role: "system",
      content: [
        "你是小红书内容生成助手。",
        "当前只重写封面文案，不要改标题，不要改正文，不要改标签。",
        "封面文案要比标题更短、更冲击，像一眼能扫到的封面钩子。",
        "只返回 JSON。"
      ].join("\n")
    },
    {
      role: "user",
      content: [
        `合集类型：${brief.collectionType || ""}`,
        `主题：${brief.topic || ""}`,
        `标题：${candidate.title || ""}`,
        `当前封面文案：${candidate.coverText || ""}`,
        `正文摘要：${String(candidate.body || "").slice(0, 220)}`,
        "",
        "当前封面文案和标题太像了，吸引点不够分开。",
        "请只重写封面文案，要求：",
        "1. 保持和标题同主题，但不要重复复述标题。",
        "2. 尽可能吸睛、高反差。",
        "3. 比标题更短、更冲击。",
        "4. 不要低俗，不要标题党过头。",
        "",
        "输出格式：",
        "{",
        '  "coverText": "重写后的封面文案"',
        "}"
      ].join("\n")
    }
  ];
}

function buildBodyExpansionMessages({ candidate = {}, brief = {} } = {}) {
  const minChineseChars = getGenerationBodyMinChineseChars(brief.lengthMode);
  const currentChineseChars = countPrimaryChineseCharacters(candidate.body || "");

  return [
    {
      role: "system",
      content: [
        "你是小红书内容生成助手。",
        "当前只扩写正文，不要改标题，不要改封面文案，不要改标签。",
        "保留原本的语气、结构、主题、内太空元素和整体风格。",
        "可以补充更具体的场景、解释、提醒和衔接，但不要写成教程化敏感步骤。",
        "只返回 JSON。"
      ].join("\n")
    },
    {
      role: "user",
      content: [
        `合集类型：${brief.collectionType || ""}`,
        `主题：${brief.topic || ""}`,
        `文案长度偏好：${String(brief.lengthMode || "").trim() === "long" ? "长文档" : "短文档"}`,
        `标题：${candidate.title || ""}`,
        `封面文案：${candidate.coverText || ""}`,
        `当前标签：${ensureArray(candidate.tags).join("、")}`,
        "",
        `当前正文偏短，当前大约只有 ${currentChineseChars} 个中文字符，请至少扩写到 ${minChineseChars} 个中文字符。`,
        "要求：",
        "1. 只扩写正文，标题、封面文案、标签保持不变。",
        "2. 延续现在的表达风格和段落节奏，不要重写成另一篇。",
        "3. 按中文字符数理解，不是按英文单词、空格、emoji 或 markdown 符号凑长度。",
        "4. 这里的字数只算正文主体，不包含末尾额外附加的科普补充、补充说明或安全提醒小节。",
        "5. 保持自然分段，每段 2-4 句，读起来像真人分享。",
        "6. 自然保留或补足内太空相关元素，但不要生硬堆砌。",
        "7. 正文补充后仍要合规、自然，不要低俗，不要导流，不要夸大承诺。",
        "",
        "当前正文：",
        String(candidate.body || "").trim(),
        "",
        "输出格式：",
        "{",
        '  "body": "扩写后的完整正文"',
        "}"
      ].join("\n")
    }
  ];
}

function looksLikeGenerationCandidatePayload(payload = {}) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return false;
  }

  return [
    payload.title,
    payload.body,
    payload.content,
    payload.coverText,
    payload.tags,
    payload.generationNotes,
    payload.rewriteNotes,
    payload.safetyNotes,
    payload.referencedSampleIds
  ].some((value) => {
    if (Array.isArray(value)) {
      return value.length > 0;
    }

    return Boolean(String(value || "").trim());
  });
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

async function generateJsonWithModel({ messages, modelSelection = "auto", maxTokens = getGenerationMaxTokens() }) {
  const provider = getRewriteProviderSelection(modelSelection);
  const model = getRewriteSelectionModel(modelSelection);
  const result = await callRoutedTextProviderJson({
    provider,
    model,
    temperature: 0.7,
    maxTokens,
    messages,
    missingKeyMessage: `生成工作台缺少 ${provider} 可用密钥。`,
    scene: "generation",
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

async function improveBriefingJsonWithModel({ messages, modelSelection = "auto" }) {
  const provider = getRewriteProviderSelection(modelSelection);
  const model = getRewriteSelectionModel(modelSelection);
  const result = await callRoutedTextProviderJson({
    provider,
    model,
    temperature: 0.6,
    maxTokens: Number(process.env.GENERATION_BRIEFING_MAX_TOKENS || 900),
    messages,
    missingKeyMessage: `生成工作台缺少 ${provider} 可用密钥。`,
    scene: "generation",
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

export async function improveGenerationBriefing({
  mode = "from_scratch",
  brief = {},
  draft = {},
  modelSelection = "auto",
  improveJson = improveBriefingJsonWithModel
} = {}) {
  const messages = buildGenerationBriefingMessages({
    mode,
    brief,
    draft
  });
  const payload = await improveJson({ messages, modelSelection });

  return {
    briefing: String(payload?.briefing || brief?.briefing || "").trim(),
    notes: uniqueStrings(ensureArray(payload?.notes)),
    modelTrace: {
      provider: payload.provider || "",
      model: payload.model || "",
      route: payload.route || "",
      routeLabel: payload.routeLabel || "",
      attemptedRoutes: payload.attemptedRoutes || []
    }
  };
}

export async function generateNoteCandidates({
  mode = "from_scratch",
  brief = {},
  draft = {},
  styleProfile = null,
  referenceSamples = [],
  innerSpaceTerms = [],
  memoryContext = null,
  modelSelection = "auto",
  generateJson = generateJsonWithModel
} = {}) {
  const messages = buildGenerationMessages({
    mode,
    brief,
    draft,
    styleProfile,
    referenceSamples,
    innerSpaceTerms,
    memoryContext
  });
  const payload = await generateJson({ messages, modelSelection });
  const rawCandidate = extractRawGenerationCandidate(payload);
  let normalizedCandidate = rawCandidate ? normalizeGenerationCandidate(rawCandidate, 0, { lengthMode: brief.lengthMode }) : null;

  if (normalizedCandidate) {
    const minChineseChars = getGenerationBodyMinChineseChars(brief.lengthMode);
    let expansionAttempts = 0;

    while (countPrimaryChineseCharacters(normalizedCandidate.body) < minChineseChars && expansionAttempts < 1) {
      expansionAttempts += 1;

      try {
        const expandedPayload = await generateJson({
          messages: buildBodyExpansionMessages({
            candidate: normalizedCandidate,
            brief
          }),
          modelSelection,
          maxTokens: getGenerationExpansionMaxTokens()
        });
        const expandedCandidate = extractRawGenerationCandidate(expandedPayload);
        const expandedBody = String(
          expandedCandidate?.body || expandedPayload?.body || expandedCandidate?.content || expandedPayload?.content || ""
        ).trim();

        if (!expandedBody) {
          break;
        }

        normalizedCandidate = normalizeGenerationCandidate(
          {
            ...normalizedCandidate,
            body: expandedBody
          },
          0,
          { lengthMode: brief.lengthMode }
        );
      } catch {
        break;
      }
    }
  }

  if (normalizedCandidate && isCoverTextTooSimilarToTitle(normalizedCandidate)) {
    try {
      const repairedPayload = await generateJson({
        messages: buildCoverTextRepairMessages({
          candidate: normalizedCandidate,
          brief
        }),
        modelSelection
      });
      const repairedCandidate = extractRawGenerationCandidate(repairedPayload);
      const repairedCoverText = String(
        repairedCandidate?.coverText || repairedPayload?.coverText || repairedCandidate?.title || repairedPayload?.title || ""
      ).trim();

      if (repairedCoverText && !isCoverTextTooSimilarToTitle({ title: normalizedCandidate.title, coverText: repairedCoverText })) {
        normalizedCandidate.coverText = repairedCoverText;
      }
    } catch {}
  }

  const candidates = normalizedCandidate ? [normalizedCandidate] : [];

  return {
    mode,
    candidates,
    modelTrace: {
      provider: payload.provider || "",
      model: payload.model || "",
      route: payload.route || "",
      routeLabel: payload.routeLabel || "",
      attemptedRoutes: payload.attemptedRoutes || []
    }
  };
}

function normalizeVerdict(value = "") {
  const verdict = String(value || "").trim();
  return ["pass", "observe", "manual_review", "hard_block"].includes(verdict) ? verdict : "manual_review";
}

function isAcceptedVerdict(value = "") {
  return ["pass", "observe"].includes(normalizeVerdict(value));
}

function scoreCompleteness(candidate = {}, brief = {}) {
  const text = `${candidate.title || ""}\n${candidate.body || ""}\n${candidate.coverText || ""}\n${ensureArray(candidate.tags).join(" ")}`;
  const topic = String(brief.topic || "").trim();
  const hasTopic = !topic || text.includes(topic);
  const hasBody = String(candidate.body || "").trim().length >= 120;
  const hasCover = Boolean(String(candidate.coverText || "").trim());
  const hasTags = ensureArray(candidate.tags).length >= 2;
  const score = Math.max(0, Math.min(100, (hasTopic ? 30 : 0) + (hasBody ? 35 : 0) + (hasCover ? 15 : 0) + (hasTags ? 20 : 0)));

  return {
    score,
    reasons: [
      hasTopic ? "覆盖主题" : "主题覆盖不明显",
      hasBody ? "正文完整" : "正文偏短",
      hasCover ? "包含封面文案" : "缺少封面文案",
      hasTags ? "标签数量足够" : "标签偏少"
    ]
  };
}

function rankScoredCandidate(item) {
  const verdict = normalizeVerdict(item.analysis?.finalVerdict || item.analysis?.verdict);
  const riskScore = Math.max(0, 100 - (verdictPenalty[verdict] || 0) - Math.min(50, Number(item.analysis?.score) || 0));
  const variantPenalty = item.variant === "expressive" && isAcceptedVerdict(verdict) ? 8 : 0;

  return {
    riskScore,
    total: Math.round(riskScore * 0.5 + item.style.score * 0.3 + item.completeness.score * 0.2 - variantPenalty)
  };
}

function getRecommendationBucket(item) {
  const verdict = normalizeVerdict(item.analysis?.finalVerdict || item.analysis?.verdict);

  if (verdict === "hard_block") {
    return 0;
  }

  if (verdict === "manual_review") {
    return 1;
  }

  return item.variant === "expressive" ? 2 : 3;
}

function buildRepairReason(analysis = {}, crossReview = null) {
  return uniqueStrings([
    ...(analysis?.suggestions || []),
    ...(analysis?.semanticReview?.status === "ok" ? analysis.semanticReview.review?.reasons || [] : []),
    ...(crossReview?.aggregate?.reasons || [])
  ])
    .slice(0, 5)
    .join("；");
}

function collectGenerationBlockerReasons(analysis = {}, crossReview = null) {
  return uniqueStrings([
    ...(analysis?.suggestions || []),
    ...(analysis?.semanticReview?.status === "ok" ? analysis.semanticReview.review?.reasons || [] : []),
    ...(crossReview?.aggregate?.reasons || [])
  ]).slice(0, 6);
}

function buildRepairReasonTags(analysis = {}, crossReview = null) {
  return deriveFailureReasonTags({
    texts: [
      ...(analysis?.suggestions || []),
      ...(analysis?.semanticReview?.status === "ok" ? analysis.semanticReview.review?.reasons || [] : []),
      ...(crossReview?.aggregate?.reasons || [])
    ],
    categories: analysis?.categories || [],
    topHits: analysis?.hits || []
  });
}

function shouldRepairCandidate(analysis = {}, crossReview = null) {
  const analysisVerdict = analysis?.finalVerdict || analysis?.verdict || "manual_review";
  const reviewVerdict =
    crossReview?.aggregate?.recommendedVerdict ||
    crossReview?.aggregate?.analysisVerdict ||
    analysisVerdict;

  return !isAcceptedVerdict(analysisVerdict) || !isAcceptedVerdict(reviewVerdict);
}

export async function repairGenerationCandidate({
  candidate = {},
  analysis = {},
  modelSelection = "auto",
  innerSpaceTerms = []
} = {}) {
  return rewritePostForCompliance({
    input: candidate,
    analysis,
    modelSelection,
    innerSpaceTerms
  });
}

export async function scoreGenerationCandidates({
  candidates = [],
  styleProfile = null,
  brief = {},
  modelSelection = {},
  innerSpaceTerms = [],
  analyzeCandidate = analyzePost,
  semanticReviewCandidate = runSemanticReview,
  crossReviewCandidate = runCrossModelReview,
  repairCandidate = null
} = {}) {
  const scoredCandidates = [];

  for (const candidate of candidates) {
    const originalAnalysis = await analyzeCandidate(candidate);
    const originalSemanticReview = await semanticReviewCandidate({
      input: candidate,
      analysis: originalAnalysis,
      modelSelection: modelSelection.semantic
    });
    let mergedAnalysis = {
      ...originalAnalysis,
      semanticReview: originalSemanticReview
    };
    let crossReview = await crossReviewCandidate({
      input: candidate,
      analysis: mergedAnalysis,
      modelSelection: modelSelection.crossReview
    });
    let finalDraft = candidate;
    const repair = {
      attempted: false,
      applied: false,
      reason: "",
      reasonTags: [],
      error: "",
      invalidDraftCount: 0,
      rewrite: null,
      attempts: 0,
      beforeAnalysis: mergedAnalysis,
      beforeCrossReview: crossReview
    };

    while (repairCandidate && shouldRepairCandidate(mergedAnalysis, crossReview) && repair.attempts < getGenerationRepairMaxAttempts()) {
      repair.attempted = true;
      repair.reason = buildRepairReason(mergedAnalysis, crossReview) || "候选稿未达到直接推荐区间，已按风险点继续自动修复。";
      repair.reasonTags = buildRepairReasonTags(mergedAnalysis, crossReview);

      try {
        const rewrite = await repairCandidate({
          candidate: finalDraft,
          analysis: mergedAnalysis,
          crossReview,
          modelSelection: modelSelection.rewrite,
          innerSpaceTerms
        });
        repair.attempts += 1;
        const nextDraft = {
          ...normalizeGenerationCandidate(
            mergeGenerationRepairDraft(finalDraft, rewrite, candidate),
            variants.indexOf(candidate.variant),
            { lengthMode: brief.lengthMode }
          ),
          repairedFromCandidateId: candidate.id
        };

        if (looksLikeLeakedRepairPrompt(nextDraft)) {
          repair.invalidDraftCount += 1;
          repair.error = "自动修复返回了无效稿件，已保留修复前版本。";
          continue;
        }

        finalDraft = nextDraft;
        const repairedAnalysis = await analyzeCandidate(finalDraft);
        const repairedSemanticReview = await semanticReviewCandidate({
          input: finalDraft,
          analysis: repairedAnalysis,
          modelSelection: modelSelection.semantic
        });
        mergedAnalysis = {
          ...repairedAnalysis,
          semanticReview: repairedSemanticReview
        };
        crossReview = await crossReviewCandidate({
          input: finalDraft,
          analysis: mergedAnalysis,
          modelSelection: modelSelection.crossReview
        });
        repair.applied = true;
        repair.rewrite = rewrite;
        repair.error = "";
      } catch (error) {
        repair.error = error?.message || "自动修复失败";
        break;
      }
    }

    const style = scoreContentAgainstStyleProfile(finalDraft, styleProfile);
    const completeness = scoreCompleteness(finalDraft, brief);
    const scores = rankScoredCandidate({ analysis: mergedAnalysis, style, completeness });
    const blockerReasons = collectGenerationBlockerReasons(mergedAnalysis, crossReview);

    scoredCandidates.push({
      ...candidate,
      finalDraft,
      analysis: mergedAnalysis,
      crossReview,
      blockerReasons,
      repair,
      style,
      completeness,
      scores
    });
  }

  scoredCandidates.sort((left, right) => {
    const bucketDelta = getRecommendationBucket(right) - getRecommendationBucket(left);

    if (bucketDelta !== 0) {
      return bucketDelta;
    }

    return right.scores.total - left.scores.total;
  });
  const recommended = scoredCandidates[0] || null;
  const recommendedVerdict = normalizeVerdict(recommended?.analysis?.finalVerdict || recommended?.analysis?.verdict);
  const recommendationReason = recommended
    ? recommendedVerdict === "pass" || recommendedVerdict === "observe"
      ? "当前最终稿：合规风险更低，风格匹配和内容完整度综合分最高。"
      : "当前最终稿仍需人工复核：已完成生成，但还没有达到可直接发布区间。"
    : "当前没有生成出可用最终稿。";

  return {
    recommendedCandidateId: recommended?.id || "",
    recommendationReason,
    scoredCandidates
  };
}
