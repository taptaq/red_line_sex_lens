import test from "node:test";
import assert from "node:assert/strict";

import { summarizeGenerationReferenceImage } from "../src/glm.js";

test("summarizeGenerationReferenceImage trims the returned summary and sends a normalized data URL", async (t) => {
  const originalFetch = globalThis.fetch;
  const originalApiKey = process.env.GLM_API_KEY;
  let capturedRequestBody = null;

  process.env.GLM_API_KEY = "glm-test";
  globalThis.fetch = async (_url, options = {}) => {
    capturedRequestBody = JSON.parse(String(options.body || "{}"));

    return {
      ok: true,
      json: async () => ({
        model: "glm-4.6v",
        choices: [
          {
            message: {
              content: JSON.stringify({
                summary: "  soft pose and bright window light  "
              })
            }
          }
        ]
      })
    };
  };

  t.after(() => {
    globalThis.fetch = originalFetch;
    process.env.GLM_API_KEY = originalApiKey;
  });

  const result = await summarizeGenerationReferenceImage({
    imageDataUrl: "AAAA",
    mimeType: "image/png",
    fileName: "pose.png"
  });

  assert.deepEqual(result, { summary: "soft pose and bright window light" });
  assert.equal(typeof capturedRequestBody?.model, "string");
  assert.equal(Boolean(capturedRequestBody?.model), true);
  assert.equal(capturedRequestBody?.messages?.[1]?.content?.[0]?.image_url?.url, "data:image/png;base64,AAAA");
  assert.match(capturedRequestBody?.messages?.[0]?.content || "", /输出必须是 JSON/);
  assert.match(capturedRequestBody?.messages?.[1]?.content?.[1]?.text || "", /参考图片/);
});
