function normalizeString(value = "") {
  return String(value || "").trim();
}

function buildProhibitedWordsContent(input = {}) {
  return [input.title, input.body, input.coverText, ...(Array.isArray(input.tags) ? input.tags : [])]
    .map((item) => normalizeString(item))
    .filter(Boolean)
    .join("\n");
}

async function defaultRequestImpl({ url, headers, body }) {
  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(`外部违禁词接口失败（${response.status}）${message ? `：${message}` : ""}`);
  }

  return response.json();
}

export function mapExternalSensitiveSeverity(input = {}) {
  const level = normalizeString(input.level || input.severity || input.riskLevel).toLowerCase();

  if (level === "high" || level === "hard_block") {
    return "hard_block";
  }

  if (level === "medium" || level === "manual_review") {
    return "manual_review";
  }

  if (level === "low" || level === "observe") {
    return "observe";
  }

  return "observe";
}

export function normalizeProhibitedWordsResult(payload = {}) {
  const suggestions = Array.isArray(payload.suggestions)
    ? payload.suggestions
        .filter((item) => item && typeof item === "object")
        .map((item) => ({
          term: normalizeString(item.term || item.word),
          replacement: normalizeString(item.replacement || item.safeWord),
          reason: normalizeString(item.reason || item.note)
        }))
        .filter((item) => item.term || item.replacement || item.reason)
    : [];

  return {
    status: "ok",
    platform: "xiaohongshu",
    hitCount: Number(payload.hitCount || suggestions.length || 0) || 0,
    severity: mapExternalSensitiveSeverity(payload),
    highlightedText: normalizeString(payload.highlightedText || payload.markedText),
    suggestions,
    optimizedText: normalizeString(payload.optimizedText || payload.safeText),
    message: "",
    raw: payload && typeof payload === "object" ? structuredClone(payload) : {}
  };
}

export function normalizeProhibitedWordsFailure(error) {
  return {
    status: "error",
    platform: "xiaohongshu",
    hitCount: 0,
    severity: "unknown",
    highlightedText: "",
    suggestions: [],
    optimizedText: "",
    message: `外部违禁词检测失败：${error?.message || "未知错误"}`,
    raw: null
  };
}

export async function checkProhibitedWords(input = {}, { requestImpl = defaultRequestImpl } = {}) {
  const apiKey = normalizeString(process.env.REDFOX_API_KEY);
  const endpoint = normalizeString(process.env.PROHIBITED_WORD_API_URL) || "https://redfox.hk/story/api/cozeSkill/sensitiveWordSearch";
  const content = buildProhibitedWordsContent(input);

  if (!apiKey) {
    return normalizeProhibitedWordsFailure(new Error("缺少 REDFOX_API_KEY"));
  }

  try {
    const payload = await requestImpl({
      url: endpoint,
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey
      },
      body: {
        platform: "xiaohongshu",
        content,
        source: "red-line-sex-lens"
      }
    });

    return normalizeProhibitedWordsResult(payload);
  } catch (error) {
    return normalizeProhibitedWordsFailure(error);
  }
}
