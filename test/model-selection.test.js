import test from "node:test";
import assert from "node:assert/strict";

import {
  buildFeedbackModelSelectionOptionsPayload,
  buildModelSelectionOptionsPayload,
  filterProviderConfigsBySelection,
  getRewriteSelectionModel,
  normalizeFeedbackModelSelectionState,
  normalizeModelSelectionState
} from "../src/model-selection.js";

test("normalizeModelSelectionState keeps defaults and supported overrides", () => {
  assert.deepEqual(normalizeModelSelectionState(), {
    semantic: "auto",
    rewrite: "auto",
    crossReview: "group"
  });

  assert.deepEqual(
    normalizeModelSelectionState({
      semantic: "qwen",
      rewrite: "mimo",
      crossReview: "mimo"
    }),
    {
      semantic: "qwen",
      rewrite: "mimo",
      crossReview: "mimo"
    }
  );

  assert.deepEqual(
    normalizeModelSelectionState({
      semantic: "unknown",
      rewrite: "not-real",
      crossReview: ""
    }),
    {
      semantic: "auto",
      rewrite: "auto",
      crossReview: "group"
    }
  );
});

test("buildModelSelectionOptionsPayload exposes the three main-workbench model selectors", () => {
  const payload = buildModelSelectionOptionsPayload();

  assert.equal(Array.isArray(payload.semantic), true);
  assert.equal(Array.isArray(payload.rewrite), true);
  assert.equal(Array.isArray(payload.crossReview), true);
  assert.equal(payload.semantic[0]?.value, "auto");
  assert.equal(payload.rewrite[0]?.value, "auto");
  assert.equal(payload.crossReview[0]?.value, "group");
  assert.match(payload.semantic.map((item) => item.value).join(","), /glm/);
  assert.match(payload.semantic.map((item) => item.value).join(","), /mimo/);
  assert.match(payload.rewrite.map((item) => item.value).join(","), /kimi/);
  assert.match(payload.rewrite.map((item) => item.value).join(","), /mimo/);
  assert.match(payload.crossReview.map((item) => item.value).join(","), /kimi/);
  assert.match(payload.crossReview.map((item) => item.value).join(","), /deepseek/);
  assert.match(payload.crossReview.map((item) => item.value).join(","), /mimo/);
});

test("feedback model selection payload exposes screenshot and suggestion selectors", () => {
  const payload = buildFeedbackModelSelectionOptionsPayload();

  assert.equal(Array.isArray(payload.feedbackScreenshot), true);
  assert.equal(Array.isArray(payload.feedbackSuggestion), true);
  assert.equal(payload.feedbackScreenshot[0]?.value, "auto");
  assert.equal(payload.feedbackSuggestion[0]?.value, "auto");
  assert.match(payload.feedbackScreenshot.map((item) => item.value).join(","), /glm/);
  assert.match(payload.feedbackSuggestion.map((item) => item.value).join(","), /qwen/);
  assert.match(payload.feedbackSuggestion.map((item) => item.value).join(","), /mimo/);
});

test("normalizeFeedbackModelSelectionState keeps defaults and supported feedback overrides", () => {
  assert.deepEqual(normalizeFeedbackModelSelectionState(), {
    feedbackScreenshot: "auto",
    feedbackSuggestion: "auto"
  });

  assert.deepEqual(
    normalizeFeedbackModelSelectionState({
      feedbackScreenshot: "glm",
      feedbackSuggestion: "mimo"
    }),
    {
      feedbackScreenshot: "glm",
      feedbackSuggestion: "mimo"
    }
  );
});

test("getRewriteSelectionModel resolves mimo separately from deepseek", () => {
  assert.equal(getRewriteSelectionModel("mimo"), process.env.MIMO_DMXAPI_MODEL || process.env.DEEPSEEK_DMXAPI_MODEL || "mimo-v2.5-free");
  assert.equal(getRewriteSelectionModel("deepseek"), process.env.DEEPSEEK_FEEDBACK_MODEL || "deepseek-v4-flash");
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
});
