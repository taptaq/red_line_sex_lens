import { buildMarkdownImportDraftFromText, extractMarkdownText } from "./pdf-sample-import.js";

function normalizeString(value) {
  return String(value || "").trim();
}

function normalizeMetric(value) {
  const number = Number(String(value ?? "").trim());
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : 0;
}

function splitCSV(value = "") {
  return String(value || "")
    .split(/[，,、]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function getFileExtension(fileName = "") {
  const match = String(fileName || "").trim().toLowerCase().match(/\.([a-z0-9]+)$/);
  return match ? match[1] : "";
}

function parseFrontMatter(text = "") {
  const lines = String(text || "").split(/\r?\n/);

  if (String(lines[0] || "").trim() !== "---") {
    return {};
  }

  const values = {};
  for (let index = 1; index < lines.length; index += 1) {
    const line = String(lines[index] || "");
    const trimmed = line.trim();

    if (trimmed === "---" || trimmed === "...") {
      break;
    }

    const separatorIndex = line.indexOf(":");
    if (separatorIndex === -1) {
      continue;
    }

    const key = normalizeString(line.slice(0, separatorIndex));
    const value = normalizeString(line.slice(separatorIndex + 1));
    if (key) {
      values[key] = value;
    }
  }

  return values;
}

function buildImportedSample(item = {}) {
  const title = normalizeString(item.title);
  const body = normalizeString(item.body);

  return {
    title,
    body,
    tags: [...new Set(splitCSV(item.tags))],
    collectionType: normalizeString(item.collectionType) || "科普",
    publish: {
      status: normalizeString(item.publishStatus) || "positive_performance",
      publishedAt: normalizeString(item.publishedAt),
      platformReason: normalizeString(item.platformReason),
      notes: normalizeString(item.publishNotes),
      metrics: {
        likes: normalizeMetric(item.likes),
        favorites: normalizeMetric(item.favorites),
        comments: normalizeMetric(item.comments),
        views: normalizeMetric(item.views),
        shares: normalizeMetric(item.shares)
      }
    }
  };
}

function parseCsvLine(line = "") {
  const values = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const nextCharacter = line[index + 1];

    if (character === '"') {
      if (inQuotes && nextCharacter === '"') {
        current += '"';
        index += 1;
        continue;
      }

      inQuotes = !inQuotes;
      continue;
    }

    if (character === "," && !inQuotes) {
      values.push(current);
      current = "";
      continue;
    }

    current += character;
  }

  values.push(current);
  return values.map((value) => String(value || "").trim());
}

function parseCsvText(text = "") {
  const lines = String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) {
    return [];
  }

  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const row = parseCsvLine(line);
    const item = {};

    headers.forEach((header, index) => {
      item[header] = row[index] ?? "";
    });

    return buildImportedSample(item);
  });
}

async function parseCsvFile(file = {}) {
  const fileName = normalizeString(file?.name);
  const contentBase64 = normalizeString(file?.contentBase64);

  if (!fileName || !contentBase64) {
    return [];
  }

  const text = await extractMarkdownText(Buffer.from(contentBase64, "base64"));
  return parseCsvText(text);
}

async function parseMarkdownFile(file = {}) {
  const fileName = normalizeString(file?.name);
  const contentBase64 = normalizeString(file?.contentBase64);

  if (!fileName || !contentBase64) {
    return [];
  }

  const text = await extractMarkdownText(Buffer.from(contentBase64, "base64"));
  const draft = buildMarkdownImportDraftFromText({ fileName, text });
  const frontMatter = parseFrontMatter(text);

  if (!draft.title || !draft.body) {
    return [];
  }

  return [
    buildImportedSample({
      ...frontMatter,
      title: frontMatter.title || draft.title,
      body: draft.body
    })
  ];
}

export async function parseAccountPlannerImportFiles(files = []) {
  const importedItems = [];

  for (const file of Array.isArray(files) ? files : []) {
    const extension = getFileExtension(file?.name);

    if (extension === "csv") {
      importedItems.push(...(await parseCsvFile(file)));
      continue;
    }

    if (extension === "md" || extension === "markdown") {
      importedItems.push(...(await parseMarkdownFile(file)));
    }
  }

  return importedItems.filter((item) => item.title && item.body);
}
