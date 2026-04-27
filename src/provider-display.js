import "./env.js";

const mimoDmxapiModel = String(process.env.MIMO_DMXAPI_MODEL || process.env.DEEPSEEK_DMXAPI_MODEL || "mimo-v2.5-free").trim();

export function providerDisplayLabel(provider = "") {
  if (provider === "kimi") return "Kimi";
  if (provider === "glm") return "智谱 GLM";
  if (provider === "qwen") return "通义千问";
  if (provider === "minimax") return "MiniMax";
  if (provider === "deepseek") return "深度求索";
  if (provider === "mimo") return "Mimo";
  return String(provider || "").trim() || "未标记模型";
}

export function resolveDisplayProvider({ provider = "", route = "", model = "" } = {}) {
  const normalizedProvider = String(provider || "").trim();
  const normalizedRoute = String(route || "").trim();
  const normalizedModel = String(model || "").trim();

  if (
    normalizedProvider === "deepseek" &&
    normalizedRoute === "dmxapi" &&
    normalizedModel &&
    normalizedModel === mimoDmxapiModel
  ) {
    return {
      provider: "mimo",
      label: providerDisplayLabel("mimo")
    };
  }

  return {
    provider: normalizedProvider,
    label: providerDisplayLabel(normalizedProvider)
  };
}

export function splitProviderResultForDisplay(result, fallback = {}) {
  const fallbackProvider = String(result?.provider || fallback.provider || "").trim();
  const fallbackLabel = String(result?.label || fallback.label || providerDisplayLabel(fallbackProvider)).trim();
  const fallbackModel = String(result?.model || fallback.model || "").trim();
  const attempts = Array.isArray(result?.attemptedRoutes)
    ? result.attemptedRoutes.filter((item) => item && typeof item === "object")
    : [];

  if (!attempts.length) {
    const identity = resolveDisplayProvider({
      provider: fallbackProvider,
      route: result?.review?.route || result?.route || "",
      model: result?.review?.model || fallbackModel
    });

    return [
      {
        ...result,
        provider: identity.provider,
        label: identity.label || fallbackLabel
      }
    ];
  }

  const resolvedAttempts = attempts.map((attempt) => ({
    attempt,
    identity: resolveDisplayProvider({
      provider: fallbackProvider,
      route: attempt.route || "",
      model: attempt.model || fallbackModel
    })
  }));
  const uniqueProviders = [...new Set(resolvedAttempts.map((item) => item.identity.provider))].filter(Boolean);

  if (uniqueProviders.length <= 1) {
    const identity = resolvedAttempts[0]?.identity || resolveDisplayProvider({
      provider: fallbackProvider,
      route: result?.review?.route || result?.route || "",
      model: result?.review?.model || fallbackModel
    });

    return [
      {
        ...result,
        provider: identity.provider,
        label: identity.label,
        attemptedRoutes: attempts
      }
    ];
  }

  return resolvedAttempts.map(({ attempt, identity }) => {
    const isReviewAttempt =
      result?.status === "ok" &&
      result?.review &&
      String(result.review.route || "").trim() === String(attempt.route || "").trim() &&
      String(result.review.model || "").trim() === String(attempt.model || result.review.model || "").trim();

    return {
      provider: identity.provider,
      label: identity.label,
      status: attempt.status || result?.status || "error",
      model: String(attempt.model || result?.review?.model || fallbackModel).trim(),
      route: String(attempt.route || "").trim(),
      routeLabel: String(attempt.routeLabel || "").trim(),
      attemptedRoutes: [attempt],
      message: String(attempt.message || result?.message || "").trim(),
      ...(isReviewAttempt ? { review: result.review } : {})
    };
  });
}
