import test from "node:test";
import assert from "node:assert/strict";

import {
  buildFeedbackModelSelectionOptionsPayload,
  buildModelSelectionOptionsPayload,
  filterProviderConfigsBySelection,
  getRewriteSelectionModel,
  getStandaloneDmxapiTextModels,
  normalizeFeedbackModelSelectionState,
  normalizeModelSelectionState
} from "../src/model-selection.js";

const standaloneDmxapiTextModels = getStandaloneDmxapiTextModels();

async function importFresh(modulePath) {
  return import(`${modulePath}?test=${Date.now()}-${Math.random()}`);
}

async function withEnv(overrides, run) {
  const previous = new Map();

  for (const [key, value] of Object.entries(overrides)) {
    previous.set(key, process.env[key]);
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  try {
    return await run();
  } finally {
    for (const [key, value] of previous.entries()) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

test("normalizeModelSelectionState keeps defaults and supported overrides", () => {
  assert.deepEqual(normalizeModelSelectionState(), {
    semantic: "auto",
    rewrite: "auto",
    generation: "auto",
    crossReview: "group"
  });

  assert.deepEqual(
    normalizeModelSelectionState({
      semantic: "qwen",
      rewrite: "deepseek",
      generation: "kimi",
      crossReview: "deepseek"
    }),
    {
      semantic: "qwen",
      rewrite: "deepseek",
      generation: "kimi",
      crossReview: "deepseek"
    }
  );

  assert.deepEqual(
    normalizeModelSelectionState({
      semantic: "gpt-5.4",
      rewrite: "claude-sonnet-4-6-ssvip",
      generation: "grok-4.2-nothinking",
      crossReview: "gemini-3.1-pro-preview-ssvip"
    }),
    {
      semantic: "gpt-5.4",
      rewrite: "claude-sonnet-4-6-ssvip",
      generation: "grok-4.2-nothinking",
      crossReview: "gemini-3.1-pro-preview-ssvip"
    }
  );

  assert.deepEqual(
    normalizeModelSelectionState({
      semantic: "unknown",
      rewrite: "not-real",
      generation: "bogus",
      crossReview: ""
    }),
    {
      semantic: "auto",
      rewrite: "auto",
      generation: "auto",
      crossReview: "group"
    }
  );
});

test("buildModelSelectionOptionsPayload exposes the four main-workbench model selectors", () => {
  const payload = buildModelSelectionOptionsPayload();
  const semanticValues = payload.semantic.map((item) => item.value);
  const rewriteValues = payload.rewrite.map((item) => item.value);
  const generationValues = payload.generation.map((item) => item.value);
  const crossReviewValues = payload.crossReview.map((item) => item.value);

  assert.equal(Array.isArray(payload.semantic), true);
  assert.equal(Array.isArray(payload.rewrite), true);
  assert.equal(Array.isArray(payload.generation), true);
  assert.equal(Array.isArray(payload.crossReview), true);
  assert.equal(payload.semantic[0]?.value, "auto");
  assert.equal(payload.rewrite[0]?.value, "auto");
  assert.equal(payload.generation[0]?.value, "auto");
  assert.equal(payload.crossReview[0]?.value, "group");
  assert.match(semanticValues.join(","), /glm/);
  assert.match(rewriteValues.join(","), /kimi/);
  assert.match(generationValues.join(","), /kimi/);
  assert.match(crossReviewValues.join(","), /kimi/);
  assert.match(crossReviewValues.join(","), /deepseek/);
  assert.doesNotMatch(semanticValues.join(","), /mimo/);
  assert.doesNotMatch(rewriteValues.join(","), /mimo/);
  assert.doesNotMatch(generationValues.join(","), /mimo/);
  assert.doesNotMatch(crossReviewValues.join(","), /mimo/);

  for (const model of standaloneDmxapiTextModels) {
    assert.ok(semanticValues.includes(model));
    assert.ok(rewriteValues.includes(model));
    assert.ok(generationValues.includes(model));
    assert.ok(crossReviewValues.includes(model));
  }
});

test("buildModelSelectionOptionsPayload reflects DMXAPI defaults while keeping Kimi as official-only", async () => {
  await withEnv(
    {
      GLM_DMXAPI_MODEL: undefined,
      MINIMAX_DMXAPI_MODEL: undefined,
      KIMI_DMXAPI_MODEL: undefined,
      KIMI_TEXT_MODEL: undefined,
      QWEN_DMXAPI_MODEL: undefined
    },
    async () => {
      const { buildModelSelectionOptionsPayload: buildPayload } = await importFresh("../src/model-selection.js");
      const payload = buildPayload();
      const semanticGlmOption = payload.semantic.find((item) => item.value === "glm");
      const semanticQwenOption = payload.semantic.find((item) => item.value === "qwen");
      const rewriteKimiOption = payload.rewrite.find((item) => item.value === "kimi");
      const rewriteQwenOption = payload.rewrite.find((item) => item.value === "qwen");
      const semanticMiniMaxOption = payload.semantic.find((item) => item.value === "minimax");

      assert.match(String(semanticGlmOption?.label || ""), /DMXAPI glm-5\.1/);
      assert.doesNotMatch(String(semanticGlmOption?.label || ""), /glm-5\.1-free/);
      assert.match(String(semanticQwenOption?.label || ""), /DMXAPI qwen3\.5-plus/);
      assert.doesNotMatch(String(semanticQwenOption?.label || ""), /qwen3\.5-plus-free/);
      assert.match(String(rewriteKimiOption?.label || ""), /kimi-k2\.5/);
      assert.doesNotMatch(String(rewriteKimiOption?.label || ""), /DMXAPI/);
      assert.doesNotMatch(String(rewriteKimiOption?.label || ""), /kimi-k2\.6-free/);
      assert.match(String(rewriteQwenOption?.label || ""), /DMXAPI qwen3\.5-plus/);
      assert.doesNotMatch(String(rewriteQwenOption?.label || ""), /qwen3\.5-plus-free/);
      assert.match(String(semanticMiniMaxOption?.label || ""), /MiniMax-M2\.5/);
      assert.doesNotMatch(String(semanticMiniMaxOption?.label || ""), /MiniMax-M2\.7-free/);
    }
  );
});

test("feedback model selection payload exposes screenshot and suggestion selectors", () => {
  const payload = buildFeedbackModelSelectionOptionsPayload();
  const screenshotValues = payload.feedbackScreenshot.map((item) => item.value);
  const suggestionValues = payload.feedbackSuggestion.map((item) => item.value);

  assert.equal(Array.isArray(payload.feedbackScreenshot), true);
  assert.equal(Array.isArray(payload.feedbackSuggestion), true);
  assert.equal(payload.feedbackScreenshot[0]?.value, "auto");
  assert.equal(payload.feedbackSuggestion[0]?.value, "auto");
  assert.match(screenshotValues.join(","), /glm/);
  assert.match(suggestionValues.join(","), /qwen/);
  assert.doesNotMatch(suggestionValues.join(","), /mimo/);

  for (const model of standaloneDmxapiTextModels) {
    assert.ok(suggestionValues.includes(model));
    assert.ok(!screenshotValues.includes(model));
  }
});

test("normalizeFeedbackModelSelectionState keeps defaults and supported feedback overrides", () => {
  assert.deepEqual(normalizeFeedbackModelSelectionState(), {
    feedbackScreenshot: "auto",
    feedbackSuggestion: "auto"
  });

  assert.deepEqual(
    normalizeFeedbackModelSelectionState({
      feedbackScreenshot: "glm",
      feedbackSuggestion: "deepseek"
    }),
    {
      feedbackScreenshot: "glm",
      feedbackSuggestion: "deepseek"
    }
  );

  assert.deepEqual(
    normalizeFeedbackModelSelectionState({
      feedbackScreenshot: "gpt-5.4",
      feedbackSuggestion: "gpt-5.4"
    }),
    {
      feedbackScreenshot: "auto",
      feedbackSuggestion: "gpt-5.4"
    }
  );
});

test("getRewriteSelectionModel resolves deepseek separately from other providers", () => {
  assert.equal(getRewriteSelectionModel("deepseek"), process.env.DEEPSEEK_FEEDBACK_MODEL || "deepseek-v4-flash");
  assert.equal(getRewriteSelectionModel("gpt-5.4"), "gpt-5.4");
});

test("filterProviderConfigsBySelection keeps all providers for default modes and narrows to a single provider when selected", () => {
  const providerConfigs = [
    { provider: "glm", model: "glm-4.6v" },
    { provider: "qwen", model: "qwen-plus" },
    { provider: "deepseek", model: "deepseek-v4-flash" }
  ];

  assert.deepEqual(filterProviderConfigsBySelection(providerConfigs, "auto").map((item) => item.provider), [
    "glm",
    "qwen",
    "deepseek"
  ]);
  assert.deepEqual(filterProviderConfigsBySelection(providerConfigs, "group").map((item) => item.provider), [
    "glm",
    "qwen",
    "deepseek"
  ]);
  assert.deepEqual(filterProviderConfigsBySelection(providerConfigs, "qwen").map((item) => item.provider), ["qwen"]);
  assert.deepEqual(filterProviderConfigsBySelection(providerConfigs, "gpt-5.4"), [
    {
      provider: "dmxapi_text",
      label: "DMXAPI / gpt-5.4",
      envKey: "DMXAPI_API_KEY",
      model: "gpt-5.4",
      routeMode: "dmxapi_only"
    }
  ]);
});
