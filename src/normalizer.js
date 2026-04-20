export function normalizeText(input = "") {
  return String(input)
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[，。！？、,.!?;；:："'`~\-_/\\|()[\]{}<>《》【】]/g, "");
}

export function ensureArray(value) {
  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }

  if (typeof value === "string" && value.trim()) {
    return value
      .split(/[,\n、]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

export function uniqueStrings(items) {
  return [...new Set(items.filter(Boolean))];
}

export function flattenPost(post = {}) {
  const tags = ensureArray(post.tags).join(" ");
  const comments = ensureArray(post.comments).join(" ");

  return {
    title: String(post.title || ""),
    body: String(post.body || ""),
    coverText: String(post.coverText || ""),
    tags,
    comments
  };
}
