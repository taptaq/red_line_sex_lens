import crypto from "node:crypto";

function normalizeString(value) {
  return String(value || "").trim();
}

function uniqueStrings(items = []) {
  return [...new Set((Array.isArray(items) ? items : [items]).map((item) => normalizeString(item)).filter(Boolean))];
}

function hasBinaryMediaGarbage(value = "") {
  const text = String(value || "");

  if (!text) {
    return false;
  }

  const controlChars = text.match(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g) || [];

  return (
    /ftyp(?:isom|mp4|m4v|qt)/i.test(text) ||
    /\b(?:moov|mdat|hvcC|VideoHandler)\b/.test(text.slice(0, 1000)) ||
    controlChars.length / Math.max(text.length, 1) > 0.05
  );
}

function isMediaSourceSample(item = {}) {
  const notes = normalizeString(item.notes);
  const sourceUrl = normalizeString(item.sourceUrl || item.url || item.link || item.originalUrl);

  return /\.(?:mp4|mov|m4v|webm|mkv|avi|mp3|m4a|aac|wav|ogg|flac)(?:[?#]|$)/i.test(`${sourceUrl}\n${notes}`);
}

function buildCleanVideoNotes(notes = "") {
  const preserved = normalizeString(notes)
    .split("\n")
    .map((line) => normalizeString(line))
    .filter(Boolean)
    .filter((line) => !hasBinaryMediaGarbage(line))
    .filter((line) => line.startsWith("来源:") || line.startsWith("链接:") || line.startsWith("作者:"))
    .filter((line) => !line.startsWith("- 3秒钩子:"))
    .filter((line) => !line.startsWith("- 封面标题:"))
    .filter((line) => !line.startsWith("- 笔记标题:"));
  const withoutDuplicateType = preserved.filter((line) => line !== "类型: 视频");

  return [
    ...withoutDuplicateType,
    "类型: 视频",
    "",
    "小红书传播拆解:",
    "- 3秒钩子: 这条视频里有什么可复用的信息？",
    "- 封面标题: 视频素材待拆解",
    "- 笔记标题: 视频素材拆解记录",
    "- 正文结构: 视频信息 → 关键发现 → 可复用角度 → 结尾提问",
    "- 话题标签: #视频",
    "- 评论区引导: 你想重点拆哪一段？"
  ].join("\n");
}

function sanitizePersistedMediaSample(item = {}) {
  const body = normalizeString(item.body);
  const notes = normalizeString(item.notes);

  if (!isMediaSourceSample(item) && !hasBinaryMediaGarbage(body) && !hasBinaryMediaGarbage(notes)) {
    return item;
  }

  if (!hasBinaryMediaGarbage(body) && !hasBinaryMediaGarbage(notes)) {
    return item;
  }

  return {
    ...item,
    title: normalizeString(item.title) && normalizeString(item.title) !== "（无标题）" ? item.title : "视频素材",
    body: "视频链接已保存。\n\n[视频内容]\n（未提取视频字幕，仅保存文案）",
    tags: uniqueStrings([...(Array.isArray(item.tags) ? item.tags : []), "视频"]),
    notes: buildCleanVideoNotes(notes)
  };
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

export function normalizeExternalReferenceSample(item = {}) {
  const sanitizedItem = sanitizePersistedMediaSample(item);
  const publish = item?.publish && typeof item.publish === "object" ? item.publish : {};
  const now = new Date().toISOString();

  return {
    id: normalizeString(sanitizedItem.id) || `external-sample-${crypto.randomUUID()}`,
    title: normalizeString(sanitizedItem.title),
    body: normalizeString(sanitizedItem.body),
    tags: uniqueStrings(sanitizedItem.tags || []),
    collectionType: normalizeString(sanitizedItem.collectionType) || "科普",
    notes: normalizeString(sanitizedItem.notes),
    createdAt: normalizeString(sanitizedItem.createdAt) || now,
    updatedAt: now,
    publish: {
      status: normalizeString(publish.status || sanitizedItem.publishStatus) || "positive_performance",
      publishedAt: normalizeString(publish.publishedAt || sanitizedItem.publishedAt),
      platformReason: normalizeString(publish.platformReason || sanitizedItem.platformReason),
      notes: normalizeString(publish.notes || sanitizedItem.publishNotes),
      metrics: normalizeMetrics(publish.metrics || sanitizedItem.metrics || sanitizedItem)
    }
  };
}
