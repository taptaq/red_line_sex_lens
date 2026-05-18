const MAX_MERGED_TEXT_LENGTH = 12000;
const MAX_IMAGE_COUNT = 5;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const MAX_TEXT_FILE_BYTES = 512 * 1024;
const MAX_TOTAL_BYTES = 12 * 1024 * 1024;

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

function extractBase64Payload(input) {
  const normalized = String(input || "").trim();

  if (!normalized) {
    return "";
  }

  if (normalized.startsWith("data:")) {
    const commaIndex = normalized.indexOf(",");
    return commaIndex === -1 ? "" : normalized.slice(commaIndex + 1).replace(/\s+/g, "");
  }

  return normalized.replace(/\s+/g, "");
}

function estimateBase64DecodedBytes(input) {
  const payload = extractBase64Payload(input);

  if (!payload) {
    return 0;
  }

  const sanitized = payload.replace(/=+$/g, "");
  return Math.floor((sanitized.length * 3) / 4);
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
  const materialText = String(referenceAssets?.materialText || "").trim();
  const textFiles = normalizeAssetList(referenceAssets?.textFiles);
  const images = normalizeAssetList(referenceAssets?.images);
  const warnings = [];
  const acceptedTextFiles = [];
  const acceptedImages = [];
  const textFileNames = [];
  const imageFileNames = [];
  const mergedTextParts = materialText ? [materialText] : [];
  const imageSummaries = [];
  let totalAcceptedBytes = 0;

  for (const [index, file] of textFiles.entries()) {
    const fileName = normalizeFileName(file?.name, `text-${index + 1}`);
    const estimatedBytes = estimateBase64DecodedBytes(file?.contentBase64 ?? file?.base64 ?? file?.content);

    if (estimatedBytes > MAX_TEXT_FILE_BYTES) {
      warnings.push(`Text reference "${fileName}" was skipped because it exceeded the 512 KB limit.`);
      continue;
    }

    if (estimatedBytes > 0 && totalAcceptedBytes + estimatedBytes > MAX_TOTAL_BYTES) {
      warnings.push(`Text reference "${fileName}" was skipped because total temporary reference assets exceeded the 12 MB limit.`);
      continue;
    }

    acceptedTextFiles.push(file);
    textFileNames.push(fileName);
    totalAcceptedBytes += estimatedBytes;
  }

  for (const [index, image] of images.entries()) {
    const fileName = normalizeFileName(image?.name, `image-${index + 1}`);
    const estimatedBytes = estimateBase64DecodedBytes(image?.imageDataUrl ?? image?.dataUrl ?? image?.content ?? "");

    if (acceptedImages.length >= MAX_IMAGE_COUNT) {
      warnings.push(`Image reference "${fileName}" was skipped because only 5 images are allowed.`);
      continue;
    }

    if (estimatedBytes > MAX_IMAGE_BYTES) {
      warnings.push(`Image reference "${fileName}" was skipped because it exceeded the 4 MB limit.`);
      continue;
    }

    if (estimatedBytes > 0 && totalAcceptedBytes + estimatedBytes > MAX_TOTAL_BYTES) {
      warnings.push(`Image reference "${fileName}" was skipped because total temporary reference assets exceeded the 12 MB limit.`);
      continue;
    }

    acceptedImages.push(image);
    imageFileNames.push(fileName);
    totalAcceptedBytes += estimatedBytes;
  }

  for (const [index, file] of acceptedTextFiles.entries()) {
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

  for (const [index, image] of acceptedImages.entries()) {
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
