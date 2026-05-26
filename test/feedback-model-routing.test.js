import test from "node:test";
import assert from "node:assert/strict";

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

test("recognizeFeedbackScreenshot routes kimi selections through the Kimi official endpoint", async () => {
  await withEnv(
    {
      KIMI_API_KEY: "kimi-test-key",
      KIMI_BASE_URL: "https://kimi.example.com/v1/chat/completions",
      KIMI_TEXT_MODEL: "kimi-k2.6"
    },
    async () => {
      const requests = [];
      const originalFetch = global.fetch;
      global.fetch = async (url, options = {}) => {
        requests.push({
          url,
          headers: options.headers || {},
          body: JSON.parse(String(options.body || "{}"))
        });

        return {
          ok: true,
          status: 200,
          json: async () => ({
            model: "kimi-k2.6-live",
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    platformReason: "疑似导流",
                    suspiciousPhrases: ["加我"],
                    extractedText: "疑似导流提醒",
                    summary: "平台提示疑似导流",
                    notes: "",
                    confidence: 0.92
                  })
                }
              }
            ]
          })
        };
      };

      try {
        const { recognizeFeedbackScreenshot } = await importFresh("../src/glm.js");
        const result = await recognizeFeedbackScreenshot({
          imageDataUrl: "data:image/png;base64,ZmFrZQ==",
          mimeType: "image/png",
          fileName: "feedback.png",
          modelSelection: "kimi"
        });

        assert.equal(requests.length >= 1, true);
        assert.equal(requests[0].url, "https://kimi.example.com/v1/chat/completions");
        assert.equal(requests[0].headers.Authorization, "Bearer kimi-test-key");
        assert.equal(requests[0].body.model, "kimi-k2.6");
        assert.deepEqual(requests[0].body.thinking, { type: "disabled" });
        assert.equal(result.model, "kimi-k2.6-live");
        assert.equal(result.platformReason, "疑似导流");
      } finally {
        global.fetch = originalFetch;
      }
    }
  );
});
