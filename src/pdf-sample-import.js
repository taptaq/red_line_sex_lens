function splitNonEmptyLines(text = "") {
  return String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function buildTitleFromFileName(fileName = "") {
  return String(fileName || "")
    .trim()
    .replace(/\.(?:md|markdown)$/i, "")
    .replace(/【[^】]*】/g, "")
    .trim();
}

function normalizeForTitleComparison(value = "") {
  return String(value || "")
    .normalize("NFKC")
    .replace(/【[^】]*】/g, "")
    .replace(/[\s\p{P}\p{S}\uFFFD_]+/gu, "")
    .toLowerCase();
}

function stripMarkdownInlineSyntax(line = "") {
  return String(line || "")
    .replace(/!\[([^\]]*)\]\((?:[^()\\]|\\.)*\)/g, "$1")
    .replace(/\[([^\]]+)\]\((?:[^()\\]|\\.)*\)/g, "$1")
    .replace(/<(https?:\/\/[^>\s]+)>/gi, "$1")
    .replace(/<([^\s@>]+@[^\s@>]+)>/g, "$1")
    .replace(/<\/?[^>]+>/g, " ")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/(\*|_)(.*?)\1/g, "$2")
    .replace(/~~(.*?)~~/g, "$1")
    .replace(/\\([\\`*_{}\[\]()#+\-.!>~|])/g, "$1")
    .replace(/[*_~]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeMarkdownLine(line = "") {
  let normalized = String(line || "").trim();

  if (!normalized) {
    return "";
  }

  if (/^([-*_]\s*){3,}$/u.test(normalized)) {
    return "";
  }

  normalized = normalized
    .replace(/^#{1,6}\s*/u, "")
    .replace(/^>\s*/u, "")
    .replace(/^(?:[-*+]\s+|\d+[.)]\s+)/u, "")
    .replace(/^\[(?: |x|X)\]\s+/u, "")
    .replace(/^\|/u, "")
    .replace(/\|$/u, "")
    .replace(/\s*\|\s*/gu, " ");

  return stripMarkdownInlineSyntax(normalized);
}

function collapseBlankLines(lines = []) {
  const normalized = [];
  let previousWasBlank = true;

  for (const line of Array.isArray(lines) ? lines : []) {
    const value = String(line || "").trim();

    if (!value) {
      if (!previousWasBlank) {
        normalized.push("");
      }
      previousWasBlank = true;
      continue;
    }

    normalized.push(value);
    previousWasBlank = false;
  }

  if (normalized[normalized.length - 1] === "") {
    normalized.pop();
  }

  return normalized;
}

function buildBodyFromMarkdownText(text = "") {
  const lines = String(text || "").split(/\r?\n/);
  const bodyLines = [];
  let inCodeFence = false;
  let inFrontMatter = false;
  let frontMatterResolved = false;

  for (const [index, rawLine] of lines.entries()) {
    const trimmed = String(rawLine || "").trim();

    if (!frontMatterResolved && index === 0 && trimmed === "---") {
      inFrontMatter = true;
      continue;
    }

    if (inFrontMatter) {
      if (trimmed === "---" || trimmed === "...") {
        inFrontMatter = false;
        frontMatterResolved = true;
      }
      continue;
    }

    frontMatterResolved = true;

    if (/^(```|~~~)/u.test(trimmed)) {
      inCodeFence = !inCodeFence;
      continue;
    }

    if (!trimmed) {
      bodyLines.push("");
      continue;
    }

    const normalizedLine = inCodeFence ? stripMarkdownInlineSyntax(trimmed) : normalizeMarkdownLine(trimmed);
    bodyLines.push(normalizedLine);
  }

  return collapseBlankLines(bodyLines).join("\n").trim();
}

function stripLeadingTitleFragments(body = "", title = "") {
  const lines = splitNonEmptyLines(body);
  const normalizedTitle = normalizeForTitleComparison(title);

  while (lines.length > 0) {
    const normalizedLine = normalizeForTitleComparison(lines[0]);

    if (!normalizedLine) {
      lines.shift();
      continue;
    }

    const isLongContainedFragment = normalizedLine.length >= 4 && normalizedTitle.includes(normalizedLine);
    const isShortTrailingFragment = normalizedTitle.endsWith(normalizedLine);

    if (!isLongContainedFragment && !isShortTrailingFragment) {
      break;
    }

    lines.shift();
  }

  return lines.join("\n").trim();
}

function normalizeMetric(value) {
  const normalized = Number(String(value ?? "").trim());
  return Number.isFinite(normalized) && normalized > 0 ? Math.floor(normalized) : 0;
}

function resolveMetricValue(item = {}, key) {
  if (Object.prototype.hasOwnProperty.call(item || {}, key)) {
    return item[key];
  }

  return item?.publish?.metrics?.[key] ?? item?.metrics?.[key];
}

export function buildMarkdownImportDraftFromText({ fileName = "", text = "" } = {}) {
  const title = buildTitleFromFileName(fileName);
  const body = stripLeadingTitleFragments(buildBodyFromMarkdownText(text), title);
  const status = title && body ? "ready" : "needs_review";

  return {
    fileName: String(fileName || "").trim(),
    status,
    title,
    body,
    error: status === "ready" ? "" : "Markdown 解析结果缺少可用正文，请手动补充后再导入。"
  };
}

export function normalizeMarkdownImportCommitItem(item = {}) {
  const tags = String(item.tags || "")
    .split(/[，,、]/)
    .map((tag) => tag.trim())
    .filter(Boolean);
  const title = String(item.title || "").trim();
  const coverText = String(item.coverText || "").trim() || title;
  const referenceTier = String(item.referenceTier || "").trim();
  const referenceEnabled = item.referenceEnabled === true || Boolean(referenceTier);
  const publishStatus = String(item.publishStatus || "").trim() || "not_published";

  return {
    title,
    coverText,
    body: String(item.body || "").trim(),
    collectionType: String(item.collectionType || "").trim(),
    tags: [...new Set(tags)],
    reference: {
      enabled: referenceEnabled,
      tier: referenceEnabled ? referenceTier || "passed" : "",
      notes: String(item.referenceNotes || "").trim()
    },
    publish: {
      status: publishStatus,
      publishedAt: String(item.publishedAt || "").trim(),
      platformReason: String(item.platformReason || "").trim(),
      notes: String(item.publishNotes || "").trim()
    },
    likes: normalizeMetric(resolveMetricValue(item, "likes")),
    favorites: normalizeMetric(resolveMetricValue(item, "favorites")),
    comments: normalizeMetric(resolveMetricValue(item, "comments")),
    views: normalizeMetric(resolveMetricValue(item, "views"))
  };
}

export async function parseMarkdownImportFiles(files = [], { extractText = extractMarkdownText } = {}) {
  const items = [];

  for (const file of Array.isArray(files) ? files : []) {
    const fileName = String(file?.name || "").trim();
    const contentBase64 = String(file?.contentBase64 || "").trim();

    if (!fileName || !contentBase64) {
      items.push({
        fileName,
        status: "error",
        title: "",
        body: "",
        error: "缺少 Markdown 文件名或内容。"
      });
      continue;
    }

    try {
      const text = await extractText(Buffer.from(contentBase64, "base64"));
      items.push(buildMarkdownImportDraftFromText({ fileName, text }));
    } catch (error) {
      items.push({
        fileName,
        status: "error",
        title: "",
        body: "",
        error: error instanceof Error ? error.message : "Markdown 解析失败"
      });
    }
  }

  return items;
}

export async function extractMarkdownText(buffer, parser = null) {
  if (typeof parser === "function") {
    const result = await parser(buffer);
    return String(result?.text || result || "").trim();
  }

  return Buffer.isBuffer(buffer) ? buffer.toString("utf8").trim() : String(buffer || "").trim();
}
