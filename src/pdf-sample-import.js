function splitNonEmptyLines(text = "") {
  return String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function splitTrimmedLines(text = "") {
  return String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim());
}

function buildTitleFromFileName(fileName = "") {
  return String(fileName || "")
    .trim()
    .replace(/\.pdf$/i, "")
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

function buildBodyFromPdfText(text = "") {
  const lines = splitTrimmedLines(text);
  let startIndex = 0;

  while (startIndex < lines.length && !lines[startIndex]) {
    startIndex += 1;
  }

  while (startIndex < lines.length && /^\d+$/.test(lines[startIndex])) {
    startIndex += 1;
  }

  while (startIndex < lines.length && !lines[startIndex]) {
    startIndex += 1;
  }

  while (startIndex < lines.length && lines[startIndex]) {
    startIndex += 1;
  }

  while (startIndex < lines.length && !lines[startIndex]) {
    startIndex += 1;
  }

  return lines.slice(startIndex).filter(Boolean).join("\n").trim();
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

export function buildPdfImportDraftFromText({ fileName = "", text = "" } = {}) {
  const title = buildTitleFromFileName(fileName);
  const body = stripLeadingTitleFragments(buildBodyFromPdfText(text), title);
  const status = title && body ? "ready" : "needs_review";

  return {
    fileName: String(fileName || "").trim(),
    status,
    title,
    body,
    error: status === "ready" ? "" : "PDF 解析结果缺少可用正文，请手动补充后再导入。"
  };
}

export function normalizePdfImportCommitItem(item = {}) {
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
    likes: normalizeMetric(item.likes),
    favorites: normalizeMetric(item.favorites),
    comments: normalizeMetric(item.comments)
  };
}

export async function parsePdfImportFiles(files = [], { extractText = extractPdfText } = {}) {
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
        error: "缺少 PDF 文件名或内容。"
      });
      continue;
    }

    try {
      const text = await extractText(Buffer.from(contentBase64, "base64"));
      items.push(buildPdfImportDraftFromText({ fileName, text }));
    } catch (error) {
      items.push({
        fileName,
        status: "error",
        title: "",
        body: "",
        error: error instanceof Error ? error.message : "PDF 解析失败"
      });
    }
  }

  return items;
}

export async function extractPdfText(buffer, parser = null) {
  const parse = parser || (await import("pdf-parse")).default;
  const result = await parse(buffer);
  return String(result?.text || "").trim();
}
