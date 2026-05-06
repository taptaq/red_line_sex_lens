import { getSuccessSampleWeight } from "./success-samples.js";
import { ensureArray, normalizeText } from "./normalizer.js";

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

function normalizeProfile(profile = {}, fallback = {}) {
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
    updatedAt
  };
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
    updatedAt: now
  };
}

export function buildAutoStyleProfileState(profileState = {}, successSamples = [], options = {}) {
  const currentState = sanitizeStyleProfileState(profileState);
  const current = currentState.current || {};
  const nextCurrent = buildStyleProfile(successSamples, {
    id: current.id || options.id,
    topic: String(options.topic || "").trim() || current.topic,
    name: String(options.name || "").trim() || current.name
  });

  if (current?.createdAt) {
    nextCurrent.createdAt = current.createdAt;
  }

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
