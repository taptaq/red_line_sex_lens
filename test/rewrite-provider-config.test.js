import test from "node:test";
import assert from "node:assert/strict";

import { getRewriteProviderConfig } from "../src/glm.js";

test("rewrite provider defaults to glm when REWRITE_PROVIDER is not set", () => {
  const previousProvider = process.env.REWRITE_PROVIDER;
  const previousGlmModel = process.env.GLM_TEXT_MODEL;

  delete process.env.REWRITE_PROVIDER;
  process.env.GLM_TEXT_MODEL = "glm-test-model";

  const config = getRewriteProviderConfig();

  assert.equal(config.provider, "glm");
  assert.equal(config.envKey, "GLM_API_KEY");
  assert.match(config.endpoint, /bigmodel/);
  assert.deepEqual(config.models, ["glm-test-model", "glm-4.7"]);

  if (previousProvider === undefined) {
    delete process.env.REWRITE_PROVIDER;
  } else {
    process.env.REWRITE_PROVIDER = previousProvider;
  }

  if (previousGlmModel === undefined) {
    delete process.env.GLM_TEXT_MODEL;
  } else {
    process.env.GLM_TEXT_MODEL = previousGlmModel;
  }
});

test("rewrite provider switches to kimi when REWRITE_PROVIDER is kimi", () => {
  const previousProvider = process.env.REWRITE_PROVIDER;
  const previousKimiModel = process.env.KIMI_TEXT_MODEL;
  const previousKimiBaseUrl = process.env.KIMI_BASE_URL;

  process.env.REWRITE_PROVIDER = "kimi";
  process.env.KIMI_TEXT_MODEL = "moonshot-test-model";
  process.env.KIMI_BASE_URL = "https://kimi.example.com/v1/chat/completions";

  const config = getRewriteProviderConfig();

  assert.equal(config.provider, "kimi");
  assert.equal(config.envKey, "KIMI_API_KEY");
  assert.equal(config.endpoint, "https://kimi.example.com/v1/chat/completions");
  assert.deepEqual(config.models, ["moonshot-test-model"]);

  if (previousProvider === undefined) {
    delete process.env.REWRITE_PROVIDER;
  } else {
    process.env.REWRITE_PROVIDER = previousProvider;
  }

  if (previousKimiModel === undefined) {
    delete process.env.KIMI_TEXT_MODEL;
  } else {
    process.env.KIMI_TEXT_MODEL = previousKimiModel;
  }

  if (previousKimiBaseUrl === undefined) {
    delete process.env.KIMI_BASE_URL;
  } else {
    process.env.KIMI_BASE_URL = previousKimiBaseUrl;
  }
});

test("rewrite provider falls back to glm when REWRITE_PROVIDER is unsupported", () => {
  const previousProvider = process.env.REWRITE_PROVIDER;

  process.env.REWRITE_PROVIDER = "unknown-provider";

  const config = getRewriteProviderConfig();

  assert.equal(config.provider, "glm");
  assert.equal(config.envKey, "GLM_API_KEY");

  if (previousProvider === undefined) {
    delete process.env.REWRITE_PROVIDER;
  } else {
    process.env.REWRITE_PROVIDER = previousProvider;
  }
});
