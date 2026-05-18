const MAX_MERGED_TEXT_LENGTH = 12000;

function normalizeAssetList(value) {
  return Array.isArray(value) ? value.filter((item) => item && typeof item === "object") : [];
}

function normalizeFileName(value, fallback = "") {
  const normalized = String(value ?? "").trim();
  return normalized || String(fallback || "").trim();
}

function validateBase64(input) {
  const normalized = String(input || "").replace(/\s+/g, "");

  if (!normalized) {
    throw new Error("empty base64 content");
  }

  if (/[^A-Za-z0-9+/=]/.test(normalized)) {
    throw new Error("invalid base64 content");
  }

  const padLength = (4 - (normalized.length % 4)) % 4;
  return `${normalized}${"=".repeat(padLength)}`;
}

function decodeTextFileContent(file) {
  const base64 = validateBase64(file?.contentBase64 ?? file?.base64 ?? file?.content);
  return Buffer.from(base64, "base64").toString("utf8");
}

function cleanMergedText(text) {
  return String(text || "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, MAX_MERGED_TEXT_LENGTH);
}

export async function summarizeGenerationReferenceAssets({
  referenceAssets = {},
  summarizeImage = async () => ({ summary: "" }),
  modelSelection = "auto"
} = {}) {
  const textFiles = normalizeAssetList(referenceAssets?.textFiles);
  const images = normalizeAssetList(referenceAssets?.images);
  const warnings = [];
  const textFileNames = textFiles.map((file, index) => normalizeFileName(file?.name, `text-${index + 1}`));
  const imageFileNames = images.map((file, index) => normalizeFileName(file?.name, `image-${index + 1}`));
  const mergedTextParts = [];
  const imageSummaries = [];

  for (const [index, file] of textFiles.entries()) {
    const fileName = textFileNames[index];

    try {
      const decoded = decodeTextFileContent(file);

      if (decoded.trim()) {
        mergedTextParts.push(decoded);
      }
    } catch (error) {
      warnings.push(`Text reference "${fileName}" could not be decoded: ${error instanceof Error ? error.message : "unknown error"}`);
    }
  }

  for (const [index, image] of images.entries()) {
    const fileName = imageFileNames[index];

    try {
      const result = await summarizeImage({
        imageDataUrl: image?.imageDataUrl ?? image?.dataUrl ?? image?.content ?? "",
        mimeType: image?.mimeType ?? image?.type ?? "image/png",
        fileName,
        modelSelection
      });
      const summary = String(result?.summary || "").trim();

      if (summary) {
        imageSummaries.push({ name: fileName, summary });
      }
    } catch (error) {
      warnings.push(`Image reference "${fileName}" could not be summarized: ${error instanceof Error ? error.message : "unknown error"}`);
    }
  }

  return {
    imageSummaries,
    mergedText: cleanMergedText(mergedTextParts.join("\n\n")),
    textFileNames,
    imageFileNames,
    warnings
  };
}
