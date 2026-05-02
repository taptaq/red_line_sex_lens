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

function normalizeEditableProfileText(value = "", fallback = "") {
  const next = String(value || "").trim();
  return next || String(fallback || "").trim();
}

function normalizeEditablePreferredTags(value = [], fallback = []) {
  if (Array.isArray(value)) {
    return uniqueStrings(value);
  }

  if (typeof value === "string") {
    return uniqueStrings(
      value
        .split(/[,\n]/)
        .map((item) => item.trim())
        .filter(Boolean)
    );
  }

  return uniqueStrings(fallback);
}

function normalizeVersions(profileState = {}) {
  const versions = Array.isArray(profileState.versions) ? profileState.versions : [];
  const current = profileState.current && typeof profileState.current === "object" ? profileState.current : null;
  const byId = new Map();

  for (const version of versions) {
    if (version?.id) {
      byId.set(String(version.id), version);
    }
  }

  if (current?.id && !byId.has(String(current.id))) {
    byId.set(String(current.id), current);
  }

  return [...byId.values()];
}

function normalizeProfileFingerprintList(items = []) {
  return uniqueStrings(items).sort();
}

function buildStyleProfileFingerprint(profile = {}) {
  if (!profile || typeof profile !== "object") {
    return "";
  }

  return JSON.stringify({
    topic: normalizeTopic(profile.topic),
    name: String(profile.name || "").trim(),
    sourceSampleIds: normalizeProfileFingerprintList(profile.sourceSampleIds),
    titleStyle: String(profile.titleStyle || "").trim(),
    bodyStructure: String(profile.bodyStructure || "").trim(),
    tone: String(profile.tone || "").trim(),
    preferredTags: normalizeProfileFingerprintList(profile.preferredTags),
    avoidExpressions: normalizeProfileFingerprintList(profile.avoidExpressions),
    generationGuidelines: normalizeProfileFingerprintList(profile.generationGuidelines)
  });
}

export function sanitizeStyleProfileState(profileState = {}) {
  const draft = profileState?.draft && typeof profileState.draft === "object" ? profileState.draft : null;
  const current = profileState?.current && typeof profileState.current === "object" ? profileState.current : null;
  const versions = normalizeVersions(profileState);
  const dedupedVersions = [];
  const seenFingerprints = new Set();

  if (current) {
    const currentFingerprint = buildStyleProfileFingerprint(current);
    if (currentFingerprint) {
      seenFingerprints.add(currentFingerprint);
    }
    dedupedVersions.push({ ...current, status: "active" });
  }

  versions
    .slice()
    .sort(
      (left, right) =>
        new Date(right.updatedAt || right.confirmedAt || right.createdAt || 0).getTime() -
        new Date(left.updatedAt || left.confirmedAt || left.createdAt || 0).getTime()
    )
    .forEach((item) => {
      if (current?.id && String(item.id || "").trim() === String(current.id || "").trim()) {
        return;
      }

      const fingerprint = buildStyleProfileFingerprint(item);
      if (!fingerprint || seenFingerprints.has(fingerprint)) {
        return;
      }

      seenFingerprints.add(fingerprint);
      dedupedVersions.push({ ...item, status: "archived" });
    });

  return {
    draft,
    current: current ? { ...current, status: "active" } : null,
    versions: dedupedVersions
  };
}

export function buildStyleProfileDraft(successSamples = [], options = {}) {
  const sourceSamples = (Array.isArray(successSamples) ? successSamples : [])
    .filter((item) => getSuccessSampleWeight(item) >= 2)
    .sort((a, b) => getSuccessSampleWeight(b) - getSuccessSampleWeight(a))
    .slice(0, 12);
  const titleLength = averageLength(sourceSamples.map((item) => item.title));
  const bodyLength = averageLength(sourceSamples.map((item) => item.body));
  const preferredTags = topTags(sourceSamples);
  const now = new Date().toISOString();

  return {
    id: `style-profile-draft-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    status: "draft",
    topic: normalizeTopic(options.topic),
    name: String(options.name || "").trim() || `${normalizeTopic(options.topic)}画像`,
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
  const draft = buildStyleProfileDraft(successSamples, options);
  const nextState = confirmStyleProfileDraft(
    {
      ...profileState,
      draft
    },
    {
      topic: options.topic,
      name: options.name
    }
  );

  return sanitizeStyleProfileState(nextState);
}

export function confirmStyleProfileDraft(profileState = {}, overrides = {}) {
  const draft = profileState?.draft;

  if (!draft) {
    const error = new Error("当前没有待确认的风格画像。");
    error.statusCode = 400;
    throw error;
  }

  const now = new Date().toISOString();
  const current = {
    ...draft,
    ...overrides,
    status: "active",
    topic: normalizeTopic(overrides.topic || draft.topic),
    name: String(overrides.name || draft.name || "").trim() || `${normalizeTopic(overrides.topic || draft.topic)}画像`,
    confirmedAt: now,
    updatedAt: now
  };
  const versions = normalizeVersions(profileState).map((item) => ({
    ...item,
    status: item.id === current.id ? "active" : "archived"
  }));
  const currentIndex = versions.findIndex((item) => item.id === current.id);

  if (currentIndex >= 0) {
    versions[currentIndex] = current;
  } else {
    versions.push(current);
  }

  return sanitizeStyleProfileState({
    draft: null,
    current,
    versions
  });
}

export function updateStyleProfileDraft(profileState = {}, updates = {}) {
  const draft = profileState?.draft;

  if (!draft) {
    const error = new Error("当前没有待确认的风格画像。");
    error.statusCode = 400;
    throw error;
  }

  const previousUpdatedAt = new Date(draft.updatedAt || draft.createdAt || 0).getTime();
  const nextUpdatedAtMs = Math.max(Date.now(), previousUpdatedAt + 1);
  const nextDraft = {
    ...draft,
    topic: normalizeTopic(updates.topic || draft.topic),
    tone: normalizeEditableProfileText(updates.tone, draft.tone),
    titleStyle: normalizeEditableProfileText(updates.titleStyle, draft.titleStyle),
    bodyStructure: normalizeEditableProfileText(updates.bodyStructure, draft.bodyStructure),
    preferredTags: normalizeEditablePreferredTags(updates.preferredTags, draft.preferredTags),
    updatedAt: new Date(nextUpdatedAtMs).toISOString()
  };

  return sanitizeStyleProfileState({
    ...profileState,
    draft: nextDraft
  });
}

export function updateActiveStyleProfile(profileState = {}, updates = {}) {
  const current = getActiveStyleProfile(profileState);

  if (!current) {
    const error = new Error("当前没有可编辑的风格画像。");
    error.statusCode = 400;
    throw error;
  }

  const now = new Date().toISOString();
  const nextCurrent = {
    ...current,
    topic: normalizeTopic(updates.topic || current.topic),
    tone: normalizeEditableProfileText(updates.tone, current.tone),
    titleStyle: normalizeEditableProfileText(updates.titleStyle, current.titleStyle),
    bodyStructure: normalizeEditableProfileText(updates.bodyStructure, current.bodyStructure),
    preferredTags: normalizeEditablePreferredTags(updates.preferredTags, current.preferredTags),
    updatedAt: now
  };
  const versions = normalizeVersions(profileState).map((item) => (item.id === nextCurrent.id ? nextCurrent : item));

  return sanitizeStyleProfileState({
    ...profileState,
    draft: null,
    current: nextCurrent,
    versions
  });
}

export function getActiveStyleProfile(profileState = {}, profileId = "") {
  const id = String(profileId || "").trim();
  const versions = normalizeVersions(profileState);

  if (id) {
    const selected = versions.find((item) => String(item.id || "").trim() === id);
    return selected ? { ...selected, status: "active" } : null;
  }

  return profileState.current || versions.find((item) => item.status === "active") || null;
}

export function setActiveStyleProfileVersion(profileState = {}, profileId = "") {
  const id = String(profileId || "").trim();
  const versions = normalizeVersions(profileState);
  const target = versions.find((item) => String(item.id || "").trim() === id);

  if (!target) {
    const error = new Error("未找到要启用的风格画像版本。");
    error.statusCode = 404;
    throw error;
  }

  const now = new Date().toISOString();
  const nextCurrent = {
    ...target,
    status: "active",
    activatedAt: now,
    updatedAt: now
  };

  return sanitizeStyleProfileState({
    ...profileState,
    current: nextCurrent,
    versions: versions.map((item) => (item.id === id ? nextCurrent : { ...item, status: "archived" }))
  });
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
