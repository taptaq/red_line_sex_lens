import { getSuccessSampleWeight } from "./success-samples.js";
import { ensureArray, normalizeText } from "./normalizer.js";
import { callDeepSeekJson, callKimiJson, callQwenJson } from "./glm.js";
import { providerDisplayLabel } from "./provider-display.js";

const STYLE_PROFILE_EDITABLE_FIELDS = [
  "topic",
  "name",
  "titleStyle",
  "bodyStructure",
  "tone",
  "preferredTags",
  "avoidExpressions",
  "generationGuidelines"
];
const STYLE_PROFILE_MODEL_CHAIN = [
  { provider: "qwen", caller: callQwenJson },
  { provider: "kimi", caller: callKimiJson },
  { provider: "deepseek", caller: callDeepSeekJson }
];
const STYLE_PROFILE_LIST_FIELDS = new Set(["preferredTags", "avoidExpressions", "generationGuidelines"]);

function uniqueStrings(items = []) {
  return [...new Set((Array.isArray(items) ? items : [items]).map((item) => String(item || "").trim()).filter(Boolean))];
}

function topTags(samples = []) {
  const counts = new Map();

  for (const sample of samples) {
    for (const tag of ensureArray(sample.tags)) {
      const normalized = String(tag || "").trim();

      if (normalized) {
        counts.set(normalized, (counts.get(normalized) || 0) + getSuccessSampleWeight(sample));
      }
    }
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([tag]) => tag)
    .slice(0, 8);
}

function averageLength(items = []) {
  const values = items.map((item) => String(item || "").trim().length).filter((value) => value > 0);

  if (!values.length) {
    return 0;
  }

  return Math.round(values.reduce((total, value) => total + value, 0) / values.length);
}

function normalizeTopic(value = "") {
  return String(value || "").trim() || "通用风格";
}

function normalizeStyleProfileAttempt(item = {}) {
  return {
    provider: String(item.provider || "").trim(),
    label: String(item.label || providerDisplayLabel(item.provider)).trim(),
    model: String(item.model || "").trim(),
    route: String(item.route || "").trim(),
    routeLabel: String(item.routeLabel || "").trim(),
    status: String(item.status || "").trim() || "error",
    message: String(item.message || "").trim()
  };
}

function buildLocalRuleGenerationMeta({ generatedAt = new Date().toISOString(), attemptedProviders = [] } = {}) {
  return {
    method: "local_rule_fallback",
    provider: "",
    providerLabel: "本地规则",
    model: "",
    route: "",
    routeLabel: "",
    generatedAt,
    attemptedProviders
  };
}

function sanitizeStyleProfileGenerationMeta(meta = {}, fallback = {}) {
  const source = meta && typeof meta === "object" ? meta : fallback && typeof fallback === "object" ? fallback : {};
  const method = ["model_summary", "local_rule_fallback"].includes(String(source.method || "").trim())
    ? String(source.method || "").trim()
    : "local_rule_fallback";
  const provider = String(source.provider || "").trim();
  const providerLabel =
    String(source.providerLabel || "").trim() || (provider ? providerDisplayLabel(provider) : "本地规则");
  const attemptedProviders = (Array.isArray(source.attemptedProviders) ? source.attemptedProviders : [])
    .map(normalizeStyleProfileAttempt)
    .filter((item) => item.provider || item.label || item.message);

  return {
    method,
    provider,
    providerLabel,
    model: String(source.model || "").trim(),
    route: String(source.route || "").trim(),
    routeLabel: String(source.routeLabel || "").trim(),
    generatedAt: String(source.generatedAt || fallback.generatedAt || new Date().toISOString()).trim() || new Date().toISOString(),
    attemptedProviders
  };
}

function tryParseJsonBlock(value = "") {
  const text = String(value || "").trim();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {}

  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    return null;
  }

  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

function sanitizeStyleProfileManualOverrides(overrides = {}) {
  if (!overrides || typeof overrides !== "object") {
    return null;
  }

  const sanitized = {};

  for (const field of STYLE_PROFILE_EDITABLE_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(overrides, field)) {
      continue;
    }

    if (["preferredTags", "avoidExpressions", "generationGuidelines"].includes(field)) {
      const values = uniqueStrings(overrides[field]);

      if (values.length) {
        sanitized[field] = values;
      }
      continue;
    }

    const text = String(overrides[field] || "").trim();

    if (!text) {
      continue;
    }

    sanitized[field] = field === "topic" ? normalizeTopic(text) : text;
  }

  return Object.keys(sanitized).length ? sanitized : null;
}

function cloneEditableFieldValue(field, value) {
  return STYLE_PROFILE_LIST_FIELDS.has(field) ? uniqueStrings(value) : String(value || "").trim();
}

function normalizeEditableFieldValue(field, value) {
  if (STYLE_PROFILE_LIST_FIELDS.has(field)) {
    return uniqueStrings(value);
  }

  const text = String(value || "").trim();
  return field === "topic" ? normalizeTopic(text) : text;
}

function areEditableFieldValuesEqual(field, left, right) {
  if (STYLE_PROFILE_LIST_FIELDS.has(field)) {
    const leftValues = uniqueStrings(left);
    const rightValues = uniqueStrings(right);

    return leftValues.length === rightValues.length && leftValues.every((value, index) => value === rightValues[index]);
  }

  return normalizeEditableFieldValue(field, left) === normalizeEditableFieldValue(field, right);
}

function applyEditableFields(target = {}, source = {}) {
  const next = { ...target };

  for (const field of STYLE_PROFILE_EDITABLE_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(source, field)) {
      continue;
    }

    next[field] = cloneEditableFieldValue(field, source[field]);
  }

  return next;
}

function buildNormalizedProfileCore(profile = {}, fallback = {}) {
  if (!profile || typeof profile !== "object") {
    return null;
  }

  const topic = normalizeTopic(profile.topic || fallback.topic);
  const now = new Date().toISOString();
  const createdAt = String(profile.createdAt || fallback.createdAt || now).trim() || now;
  const updatedAt = String(profile.updatedAt || fallback.updatedAt || createdAt).trim() || createdAt;

  return {
    id: String(profile.id || fallback.id || "style-profile-current").trim() || "style-profile-current",
    status: "active",
    topic,
    name: String(profile.name || fallback.name || `${topic}画像`).trim() || `${topic}画像`,
    sourceSampleIds: uniqueStrings(profile.sourceSampleIds || fallback.sourceSampleIds),
    titleStyle: String(profile.titleStyle || fallback.titleStyle || "").trim(),
    bodyStructure: String(profile.bodyStructure || fallback.bodyStructure || "").trim(),
    tone: String(profile.tone || fallback.tone || "").trim(),
    preferredTags: uniqueStrings(profile.preferredTags || fallback.preferredTags),
    avoidExpressions: uniqueStrings(profile.avoidExpressions || fallback.avoidExpressions),
    generationGuidelines: uniqueStrings(profile.generationGuidelines || fallback.generationGuidelines),
    createdAt,
    updatedAt,
    generationMeta: sanitizeStyleProfileGenerationMeta(profile.generationMeta, fallback.generationMeta)
  };
}

function sanitizeStyleProfileAutoBase(profile = {}, fallback = {}) {
  const normalized = buildNormalizedProfileCore(profile, fallback);
  return normalized || null;
}

function isLegacyMirroredManualOverrides(profile = {}, manualOverrides = null) {
  const sanitizedOverrides = sanitizeStyleProfileManualOverrides(manualOverrides);

  if (!profile || typeof profile !== "object" || !sanitizedOverrides || profile.autoBase) {
    return false;
  }

  const keys = Object.keys(sanitizedOverrides);

  if (keys.length < 6) {
    return false;
  }

  return keys.every((field) => areEditableFieldValuesEqual(field, sanitizedOverrides[field], profile[field]));
}

function retainExplicitManualOverrides(overrides = null, autoBase = null) {
  const sanitizedOverrides = sanitizeStyleProfileManualOverrides(overrides);

  if (!sanitizedOverrides) {
    return null;
  }

  if (!autoBase) {
    return sanitizedOverrides;
  }

  const next = {};

  for (const [field, value] of Object.entries(sanitizedOverrides)) {
    if (!areEditableFieldValuesEqual(field, value, autoBase[field])) {
      next[field] = cloneEditableFieldValue(field, value);
    }
  }

  return Object.keys(next).length ? next : null;
}

function buildManualOverridesFromPatch(patch = {}, { currentOverrides = null, autoBase = null } = {}) {
  const existing = sanitizeStyleProfileManualOverrides(currentOverrides) || {};
  const baseline = autoBase && typeof autoBase === "object" ? autoBase : {};
  const next = { ...existing };

  for (const field of STYLE_PROFILE_EDITABLE_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(patch, field)) {
      continue;
    }

    const normalizedValue = normalizeEditableFieldValue(field, patch[field]);
    const isEmptyValue = STYLE_PROFILE_LIST_FIELDS.has(field) ? normalizedValue.length === 0 : !normalizedValue;

    if (isEmptyValue || areEditableFieldValuesEqual(field, normalizedValue, baseline[field])) {
      delete next[field];
      continue;
    }

    next[field] = cloneEditableFieldValue(field, normalizedValue);
  }

  return Object.keys(next).length ? next : null;
}

function applyStyleProfileManualOverrides(profile = {}, overrides = null) {
  const base = profile && typeof profile === "object" ? { ...profile } : {};
  const sanitizedOverrides = sanitizeStyleProfileManualOverrides(overrides);

  if (!sanitizedOverrides) {
    delete base.manualOverrides;
    return base;
  }

  for (const [field, value] of Object.entries(sanitizedOverrides)) {
    base[field] = Array.isArray(value) ? [...value] : value;
  }

  base.manualOverrides = sanitizedOverrides;
  return base;
}

function normalizeProfile(profile = {}, fallback = {}) {
  if (!profile || typeof profile !== "object") {
    return null;
  }

  const normalized = buildNormalizedProfileCore(profile, fallback);
  const autoBase = sanitizeStyleProfileAutoBase(profile.autoBase || fallback.autoBase);
  let manualOverrides = sanitizeStyleProfileManualOverrides(profile.manualOverrides || fallback.manualOverrides);

  if (isLegacyMirroredManualOverrides(profile, manualOverrides)) {
    manualOverrides = null;
  } else {
    manualOverrides = retainExplicitManualOverrides(manualOverrides, autoBase);
  }

  const nextProfile = applyStyleProfileManualOverrides(normalized, manualOverrides);

  if (autoBase) {
    nextProfile.autoBase = autoBase;
  }

  return nextProfile;
}

function pickLegacyCurrent(profileState = {}) {
  if (profileState?.current && typeof profileState.current === "object") {
    return profileState.current;
  }

  const versions = Array.isArray(profileState.versions) ? profileState.versions : [];
  const activeVersion = versions.find((item) => String(item?.status || "").trim() === "active");

  if (activeVersion) {
    return activeVersion;
  }

  if (versions.length) {
    return versions
      .slice()
      .sort(
        (left, right) =>
          new Date(right.updatedAt || right.confirmedAt || right.createdAt || 0).getTime() -
          new Date(left.updatedAt || left.confirmedAt || left.createdAt || 0).getTime()
      )[0];
  }

  if (profileState?.draft && typeof profileState.draft === "object") {
    return profileState.draft;
  }

  return null;
}

export function sanitizeStyleProfileState(profileState = {}) {
  const current = normalizeProfile(pickLegacyCurrent(profileState));

  return {
    draft: null,
    current,
    versions: []
  };
}

export function buildStyleProfile(successSamples = [], options = {}) {
  const sourceSamples = (Array.isArray(successSamples) ? successSamples : [])
    .filter((item) => getSuccessSampleWeight(item) >= 2)
    .sort((a, b) => getSuccessSampleWeight(b) - getSuccessSampleWeight(a))
    .slice(0, 12);
  const titleLength = averageLength(sourceSamples.map((item) => item.title));
  const bodyLength = averageLength(sourceSamples.map((item) => item.body));
  const preferredTags = topTags(sourceSamples);
  const now = new Date().toISOString();
  const topic = normalizeTopic(options.topic);

  return {
    id: String(options.id || "style-profile-current").trim() || "style-profile-current",
    status: "active",
    topic,
    name: String(options.name || "").trim() || `${topic}画像`,
    sourceSampleIds: sourceSamples.map((item) => String(item.id || "").trim()).filter(Boolean),
    titleStyle: titleLength
      ? `标题平均约 ${titleLength} 字，优先保持清晰、克制、带一点真实经验感。`
      : "标题保持清晰、克制、真实，不使用夸张承诺。",
    bodyStructure: bodyLength
      ? `正文平均约 ${bodyLength} 字，优先短段落、先结论后场景，再给可执行建议。`
      : "正文使用短段落，先讲结论，再讲场景和建议。",
    tone: "温和、克制、像朋友提醒，避免强营销和夸张刺激。",
    preferredTags,
    avoidExpressions: ["绝对化承诺", "强导流", "低俗擦边", "过度教程化"],
    generationGuidelines: [
      "保留科普、沟通、经验分享语境",
      "减少刺激性标题党表达",
      "正文给出具体但不过度细节化的建议"
    ],
    createdAt: now,
    updatedAt: now,
    generationMeta: sanitizeStyleProfileGenerationMeta(options.generationMeta, buildLocalRuleGenerationMeta({ generatedAt: now }))
  };
}

function sanitizeGeneratedStyleProfilePatch(payload = {}) {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const sanitized = sanitizeStyleProfileManualOverrides(payload);

  if (!sanitized?.titleStyle || !sanitized?.bodyStructure || !sanitized?.tone) {
    return null;
  }

  return sanitized;
}

function buildStyleProfilePromptMessages(referenceSamples = [], { topic = "", name = "" } = {}) {
  const normalizedSamples = (Array.isArray(referenceSamples) ? referenceSamples : []).map((sample) => ({
    id: String(sample.id || "").trim(),
    title: String(sample.title || "").trim(),
    coverText: String(sample.coverText || "").trim(),
    body: String(sample.body || "").trim(),
    tags: ensureArray(sample.tags),
    collectionType: String(sample.collectionType || sample.note?.collectionType || "").trim(),
    source: String(sample.source || "").trim(),
    referenceTier: String(sample.referenceTier || sample.reference?.tier || sample.tier || "").trim(),
    referenceSelectedBy: String(sample.referenceSelectedBy || sample.reference?.selectedBy || "").trim(),
    publishStatus: String(sample.publishStatus || sample.publish?.status || sample.status || "").trim(),
    platformReason: String(sample.platformReason || sample.publish?.platformReason || "").trim(),
    publishedAt: String(sample.publishedAt || sample.publish?.publishedAt || "").trim(),
    notes: String(sample.notes || "").trim(),
    sampleWeight: getSuccessSampleWeight(sample),
    metrics: sample.metrics || {},
    analysisSnapshot: sample.analysisSnapshot || null,
    rewriteSnapshot: sample.rewriteSnapshot || null
  }));

  return [
    {
      role: "system",
      content:
        "你是小红书中文内容风格编辑。请根据参考样本总结稳定风格画像，只输出 JSON 对象，不要输出 markdown、代码块或额外解释。"
    },
    {
      role: "user",
      content: [
        `目标主题：${normalizeTopic(topic)}`,
        `画像名称偏好：${String(name || "").trim() || `${normalizeTopic(topic)}画像`}`,
        "请根据以下参考样本，总结一份风格画像。",
        "输出 JSON 字段必须包含：topic, name, titleStyle, bodyStructure, tone, preferredTags, avoidExpressions, generationGuidelines。",
        "约束：",
        "1. preferredTags / avoidExpressions / generationGuidelines 必须是字符串数组。",
        "2. titleStyle / bodyStructure / tone 必须是自然中文，不要空泛套话。",
        "3. 不要编造不存在的样本内容或平台数据。",
        "4. 优先根据标题、封面文案、正文结构、标签、合集类型、入池层级、发布时间、互动指标与备注来归纳真实风格差异。",
        `参考样本：${JSON.stringify(normalizedSamples, null, 2)}`
      ].join("\n")
    }
  ];
}

function buildStyleProfileAttemptFromError(provider, error) {
  const attemptedRoutes = Array.isArray(error?.attemptedRoutes) ? error.attemptedRoutes : [];
  const lastAttempt = attemptedRoutes[attemptedRoutes.length - 1] || {};

  return normalizeStyleProfileAttempt({
    provider,
    label: providerDisplayLabel(provider),
    model: lastAttempt.model || error?.model || "",
    route: lastAttempt.route || error?.route || "",
    routeLabel: lastAttempt.routeLabel || error?.routeLabel || "",
    status: "error",
    message: error?.message || `${provider} failed`
  });
}

async function defaultStyleProfileProviderGenerator({ provider, messages }) {
  const config = STYLE_PROFILE_MODEL_CHAIN.find((item) => item.provider === provider);

  if (!config) {
    throw new Error(`unknown style profile provider: ${provider}`);
  }

  return config.caller({
    temperature: 0.35,
    maxTokens: Number(process.env.STYLE_PROFILE_MAX_TOKENS || 1200),
    messages,
    missingKeyMessage: `风格画像生成缺少 ${providerDisplayLabel(provider)} 可用密钥。`,
    responseFormat: "json_object",
    fallbackParser: tryParseJsonBlock,
    scene: "style_profile"
  });
}

export async function generateStyleProfileWithFallback(referenceSamples = [], options = {}) {
  const topic = String(options.topic || "").trim();
  const name = String(options.name || "").trim();
  const generateWithProvider =
    typeof options.generateWithProvider === "function" ? options.generateWithProvider : defaultStyleProfileProviderGenerator;
  const baseProfile = buildStyleProfile(referenceSamples, { topic, name });
  const attemptedProviders = [];
  const messages = buildStyleProfilePromptMessages(referenceSamples, { topic, name });

  for (const candidate of STYLE_PROFILE_MODEL_CHAIN) {
    try {
      const result = await generateWithProvider({
        provider: candidate.provider,
        messages,
        referenceSamples,
        topic,
        name
      });
      const patch = sanitizeGeneratedStyleProfilePatch(result?.parsed || result);

      if (!patch) {
        throw new Error(`${providerDisplayLabel(candidate.provider)} 返回的画像字段不完整。`);
      }

      const model = String(result?.model || "").trim();
      const route = String(result?.route || "").trim();
      const routeLabel = String(result?.routeLabel || "").trim();
      attemptedProviders.push(
        normalizeStyleProfileAttempt({
          provider: candidate.provider,
          label: providerDisplayLabel(candidate.provider),
          model,
          route,
          routeLabel,
          status: "ok",
          message: ""
        })
      );

      return {
        ...baseProfile,
        ...patch,
        topic: patch.topic || baseProfile.topic,
        name: patch.name || baseProfile.name,
        preferredTags: patch.preferredTags || baseProfile.preferredTags,
        avoidExpressions: patch.avoidExpressions || baseProfile.avoidExpressions,
        generationGuidelines: patch.generationGuidelines || baseProfile.generationGuidelines,
        updatedAt: new Date().toISOString(),
        generationMeta: sanitizeStyleProfileGenerationMeta({
          method: "model_summary",
          provider: candidate.provider,
          providerLabel: providerDisplayLabel(candidate.provider),
          model,
          route,
          routeLabel,
          generatedAt: new Date().toISOString(),
          attemptedProviders
        })
      };
    } catch (error) {
      attemptedProviders.push(buildStyleProfileAttemptFromError(candidate.provider, error));
    }
  }

  return buildStyleProfile(referenceSamples, {
    topic,
    name,
    generationMeta: buildLocalRuleGenerationMeta({
      generatedAt: new Date().toISOString(),
      attemptedProviders
    })
  });
}

export function hydrateStyleProfileSourceSamples(profileState = {}, referenceSamples = []) {
  const sanitized = sanitizeStyleProfileState(profileState);
  const current = sanitized.current;

  if (!current) {
    return sanitized;
  }

  const sourceSamples = current.sourceSampleIds
    .map((id) => {
      const sample = (Array.isArray(referenceSamples) ? referenceSamples : []).find((item) => String(item?.id || "").trim() === id);

      if (!sample) {
        return null;
      }

      return {
        id,
        title: String(sample.title || sample.note?.title || "").trim(),
        collectionType: String(sample.collectionType || sample.note?.collectionType || "").trim()
      };
    })
    .filter(Boolean);

  return {
    ...sanitized,
    current: {
      ...current,
      sourceSamples
    }
  };
}

export function buildAutoStyleProfileState(profileState = {}, successSamples = [], options = {}) {
  const currentState = sanitizeStyleProfileState(profileState);
  const current = currentState.current || {};
  const nextCurrent =
    options.generatedProfile && typeof options.generatedProfile === "object"
      ? normalizeProfile(options.generatedProfile, {
          id: current.id || options.id,
          topic: String(options.topic || "").trim() || current.topic,
          name: String(options.name || "").trim() || current.name
        })
      : buildStyleProfile(successSamples, {
          id: current.id || options.id,
          topic: String(options.topic || "").trim() || current.topic,
          name: String(options.name || "").trim() || current.name
        });
  const previousAutoBase = sanitizeStyleProfileAutoBase(current.autoBase);
  const nextAutoBase = sanitizeStyleProfileAutoBase(nextCurrent, current);
  const nextOverrides = isLegacyMirroredManualOverrides(current, current.manualOverrides)
    ? null
    : retainExplicitManualOverrides(current.manualOverrides, previousAutoBase);
  const nextCurrentWithOverrides = applyStyleProfileManualOverrides(nextAutoBase, nextOverrides);
  nextCurrentWithOverrides.autoBase = nextAutoBase;

  if (current?.createdAt) {
    nextCurrentWithOverrides.createdAt = current.createdAt;
    if (nextCurrentWithOverrides.autoBase) {
      nextCurrentWithOverrides.autoBase.createdAt = current.createdAt;
    }
  }

  return sanitizeStyleProfileState({
    current: nextCurrentWithOverrides
  });
}

export function updateStyleProfileManualOverrides(profileState = {}, patch = {}) {
  const currentState = sanitizeStyleProfileState(profileState);
  const current = currentState.current || buildStyleProfile([], {});
  const autoBase = sanitizeStyleProfileAutoBase(current.autoBase, current) || sanitizeStyleProfileAutoBase(current);
  const nextOverrides = buildManualOverridesFromPatch(patch, {
    currentOverrides: current.manualOverrides,
    autoBase
  });
  const nextBaseProfile = applyEditableFields(
    {
      ...current,
      updatedAt: new Date().toISOString()
    },
    autoBase || current
  );
  const nextCurrent = applyStyleProfileManualOverrides(
    nextBaseProfile,
    nextOverrides
  );

  nextCurrent.autoBase = autoBase;

  return sanitizeStyleProfileState({
    current: nextCurrent
  });
}

export function getActiveStyleProfile(profileState = {}, profileId = "") {
  const sanitized = sanitizeStyleProfileState(profileState);
  const current = sanitized.current;
  const id = String(profileId || "").trim();

  if (!current) {
    return null;
  }

  if (id && id !== String(current.id || "").trim()) {
    return null;
  }

  return current;
}

export function scoreContentAgainstStyleProfile(content = {}, profile = null) {
  if (!profile || profile.status !== "active") {
    return {
      score: 50,
      reasons: ["当前没有已确认风格画像，使用中性风格分。"]
    };
  }

  const text = normalizeText([content.title, content.body, ensureArray(content.tags).join(" ")].join(" "));
  const preferredTags = ensureArray(profile.preferredTags);
  const matchedTags = preferredTags.filter((tag) => text.includes(normalizeText(tag)));
  const hasBody = String(content.body || "").trim().length >= 80;
  const avoidsHardSell = !/(全网最低|绝对|私信|加我|立刻下单)/i.test(String(content.title || "") + String(content.body || ""));
  const score = Math.max(0, Math.min(100, 50 + matchedTags.length * 8 + (hasBody ? 20 : 0) + (avoidsHardSell ? 14 : -18)));

  return {
    score,
    reasons: uniqueStrings([
      matchedTags.length ? `命中风格标签：${matchedTags.join("、")}` : "未明显命中画像标签",
      hasBody ? "正文长度足够承载经验和建议" : "正文偏短，风格表达可能不足",
      avoidsHardSell ? "未出现明显强营销表达" : "出现强营销或导流感表达"
    ])
  };
}
