import test from "node:test";
import assert from "node:assert/strict";

function createJsonResponse(status, payload) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() {
      return payload;
    }
  };
}

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

test("suggestFeedbackCandidates uses DMXAPI Qwen first when available", async () => {
  await withEnv(
    {
      GLM_API_KEY: "",
      DASHSCOPE_API_KEY: "dashscope-test",
      DEEPSEEK_API_KEY: "",
      DMXAPI_API_KEY: "dmxapi-test",
      QWEN_FEEDBACK_MODEL: "qwen-plus",
      QWEN_DMXAPI_MODEL: "qwen3.5-plus-free"
    },
    async () => {
      const calls = [];
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async (url) => {
        calls.push(String(url));
        return createJsonResponse(200, {
          model: "qwen3.5-plus-free",
          choices: [
            {
              message: {
                content: JSON.stringify({
                  suspiciousPhrases: ["边界短语"],
                  contextCategories: ["soft-sell"],
                  summary: "fallback ok",
                  notes: "",
                  confidence: 0.82
                })
              }
            }
          ]
        });
      };

      try {
        const { suggestFeedbackCandidates } = await importFresh("../src/glm.js");
        const result = await suggestFeedbackCandidates({
          noteContent: "测试文案",
          platformReason: "疑似导流"
        });

        assert.equal(result.provider, "qwen");
        assert.equal(result.model, "qwen3.5-plus-free");
        assert.deepEqual(result.suspiciousPhrases, ["边界短语"]);
        assert.deepEqual(calls, ["https://www.dmxapi.cn/v1/chat/completions"]);
      } finally {
        globalThis.fetch = originalFetch;
      }
    }
  );
});

test("suggestFeedbackCandidates respects an explicit qwen selection", async () => {
  await withEnv(
    {
      GLM_API_KEY: "glm-test",
      DASHSCOPE_API_KEY: "dashscope-test",
      DEEPSEEK_API_KEY: "deepseek-test",
      DMXAPI_API_KEY: "dmxapi-test",
      QWEN_FEEDBACK_MODEL: "qwen-plus",
      QWEN_DMXAPI_MODEL: "qwen3.5-plus-free"
    },
    async () => {
      const calls = [];
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async (url, options = {}) => {
        const body = JSON.parse(String(options.body || "{}"));
        calls.push({ url: String(url), model: body.model });
        return createJsonResponse(200, {
          model: "qwen3.5-plus-free",
          choices: [
            {
              message: {
                content: JSON.stringify({
                  suspiciousPhrases: ["明确选择千问"],
                  contextCategories: ["soft-sell"],
                  summary: "qwen selected",
                  notes: "",
                  confidence: 0.8
                })
              }
            }
          ]
        });
      };

      try {
        const { suggestFeedbackCandidates } = await importFresh("../src/glm.js");
        const result = await suggestFeedbackCandidates({
          noteContent: "测试文案",
          platformReason: "疑似导流",
          modelSelection: "qwen"
        });

        assert.equal(result.provider, "qwen");
        assert.deepEqual(calls, [{ url: "https://www.dmxapi.cn/v1/chat/completions", model: "qwen3.5-plus-free" }]);
      } finally {
        globalThis.fetch = originalFetch;
      }
    }
  );
});

test("callRoutedTextProviderJson uses DMXAPI GLM first when available", async () => {
  await withEnv(
    {
      GLM_API_KEY: "glm-test",
      DMXAPI_API_KEY: "dmxapi-test",
      GLM_DMXAPI_MODEL: "glm-5.1-free",
      GLM_TEXT_MODEL: "glm-4.6v"
    },
    async () => {
      const calls = [];
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async (url, options = {}) => {
        const body = JSON.parse(String(options.body || "{}"));
        calls.push({ url: String(url), model: body.model, stream: body.stream, top_p: body.top_p });

        return createJsonResponse(200, {
          model: "glm-5.1-free",
          choices: [
            {
              message: {
                content: JSON.stringify({
                  verdict: "pass",
                  confidence: 0.88
                })
              }
            }
          ]
        });
      };

      try {
        const { callRoutedTextProviderJson } = await importFresh("../src/glm.js");
        const result = await callRoutedTextProviderJson({
          provider: "glm",
          model: "glm-4.6v",
          messages: [{ role: "user", content: "hello" }],
          timeoutMs: 1000
        });

        assert.equal(result.model, "glm-5.1-free");
        assert.equal(result.route, "dmxapi");
        assert.equal(result.routeLabel, "DMXAPI");
        assert.deepEqual(calls, [
          {
            url: "https://www.dmxapi.cn/v1/chat/completions",
            model: "glm-5.1-free",
            stream: false,
            top_p: undefined
          }
        ]);
      } finally {
        globalThis.fetch = originalFetch;
      }
    }
  );
});

test("callRoutedTextProviderJson sends json_object response_format to DMXAPI first", async () => {
  await withEnv(
    {
      GLM_API_KEY: "glm-test",
      DMXAPI_API_KEY: "dmxapi-test",
      GLM_DMXAPI_MODEL: "glm-5.1-free",
      GLM_TEXT_MODEL: "glm-4.6v"
    },
    async () => {
      const calls = [];
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async (url, options = {}) => {
        const body = JSON.parse(String(options.body || "{}"));
        calls.push({ url: String(url), body });

        return createJsonResponse(200, {
          model: "glm-5.1-free",
          choices: [
            {
              message: {
                content: JSON.stringify({
                  verdict: "pass",
                  confidence: 0.91
                })
              }
            }
          ]
        });
      };

      try {
        const { callRoutedTextProviderJson } = await importFresh("../src/glm.js");
        await callRoutedTextProviderJson({
          provider: "glm",
          model: "glm-4.6v",
          messages: [{ role: "user", content: "hello" }],
          timeoutMs: 1000
        });

        assert.equal(calls.length, 1);
        assert.equal(calls[0].url, "https://www.dmxapi.cn/v1/chat/completions");
        assert.deepEqual(calls[0].body.response_format, { type: "json_object" });
      } finally {
        globalThis.fetch = originalFetch;
      }
    }
  );
});

test("callRoutedTextProviderJson falls back to plain DMXAPI request when response_format is unsupported", async () => {
  await withEnv(
    {
      GLM_API_KEY: "glm-test",
      DMXAPI_API_KEY: "dmxapi-test",
      GLM_DMXAPI_MODEL: "glm-5.1-free",
      GLM_TEXT_MODEL: "glm-4.6v"
    },
    async () => {
      const calls = [];
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async (url, options = {}) => {
        const body = JSON.parse(String(options.body || "{}"));
        calls.push({ url: String(url), body });

        if (calls.length === 1) {
          return createJsonResponse(400, { error: { message: "unsupported response_format" } });
        }

        return createJsonResponse(200, {
          model: "glm-5.1-free",
          choices: [
            {
              message: {
                content: JSON.stringify({
                  verdict: "pass",
                  confidence: 0.89
                })
              }
            }
          ]
        });
      };

      try {
        const { callRoutedTextProviderJson } = await importFresh("../src/glm.js");
        const result = await callRoutedTextProviderJson({
          provider: "glm",
          model: "glm-4.6v",
          messages: [{ role: "user", content: "hello" }],
          timeoutMs: 1000
        });

        assert.equal(result.model, "glm-5.1-free");
        assert.equal(calls.length, 2);
        assert.deepEqual(calls[0].body.response_format, { type: "json_object" });
        assert.equal("response_format" in calls[1].body, false);
      } finally {
        globalThis.fetch = originalFetch;
      }
    }
  );
});

test("callRoutedTextProviderJson falls back to official Kimi after DMXAPI failure", async () => {
  await withEnv(
    {
      DMXAPI_API_KEY: "dmxapi-test",
      KIMI_API_KEY: "kimi-test",
      KIMI_BASE_URL: "https://api.moonshot.cn/v1/chat/completions",
      KIMI_DMXAPI_MODEL: "kimi-k2.6-free",
      KIMI_TEXT_MODEL: "moonshot-v1-8k"
    },
    async () => {
      const calls = [];
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async (url, options = {}) => {
        const body = JSON.parse(String(options.body || "{}"));
        calls.push({ url: String(url), model: body.model, stream: body.stream, top_p: body.top_p });

        if (String(url) === "https://www.dmxapi.cn/v1/chat/completions") {
          return createJsonResponse(500, { error: { message: "dmxapi unavailable" } });
        }

        return createJsonResponse(200, {
          model: "moonshot-v1-8k",
          choices: [
            {
              message: {
                content: JSON.stringify({
                  verdict: "pass",
                  confidence: 0.8
                })
              }
            }
          ]
        });
      };

      try {
        const { callRoutedTextProviderJson } = await importFresh("../src/glm.js");
        const result = await callRoutedTextProviderJson({
          provider: "kimi",
          model: "moonshot-v1-8k",
          messages: [{ role: "user", content: "hello" }],
          timeoutMs: 1000
        });

        assert.equal(result.model, "moonshot-v1-8k");
        assert.equal(result.route, "official");
        assert.equal(result.routeLabel, "官方");
        assert.equal(calls[0].url, "https://www.dmxapi.cn/v1/chat/completions");
        assert.equal(calls[0].model, "kimi-k2.6-free");
        assert.equal(calls[0].stream, false);
        assert.equal(calls[0].top_p, undefined);
        assert.equal(calls[1].url, "https://api.moonshot.cn/v1/chat/completions");
        assert.equal(calls[1].model, "moonshot-v1-8k");
      } finally {
        globalThis.fetch = originalFetch;
      }
    }
  );
});

test("runSemanticReview falls back to DashScope Qwen after DMXAPI permission failure", async () => {
  await withEnv(
    {
      DASHSCOPE_API_KEY: "dashscope-test",
      DMXAPI_API_KEY: "dmxapi-test",
      GLM_API_KEY: "",
      DEEPSEEK_API_KEY: "",
      QWEN_SEMANTIC_MODEL: "qwen-plus",
      QWEN_DMXAPI_MODEL: "qwen3.5-plus-free"
    },
    async () => {
      const calls = [];
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async (url, options = {}) => {
        const body = JSON.parse(String(options.body || "{}"));
        calls.push({ url: String(url), model: body.model });
        if (body.model === "glm-5.1-free") {
          return createJsonResponse(500, { error: { message: "glm dmxapi unavailable" } });
        }
        if (String(url) === "https://www.dmxapi.cn/v1/chat/completions") {
          return createJsonResponse(403, { error: { message: "forbidden: model access denied" } });
        }

        return createJsonResponse(200, {
          model: "qwen-plus",
          choices: [
            {
              message: {
                content: JSON.stringify({
                  verdict: "observe",
                  confidence: 0.61,
                  categories: ["边界表达"],
                  reasons: ["fallback review"],
                  implicitSignals: [],
                  safeSignals: ["沟通语境"],
                  summary: "dmxapi fallback success",
                  suggestion: ""
                })
              }
            }
          ]
        });
      };

      try {
        const { runSemanticReview } = await importFresh("../src/semantic-review.js");
        const result = await runSemanticReview({
          input: { title: "测试标题", body: "测试正文", tags: ["关系"] },
          analysis: { verdict: "manual_review", hits: [], suggestions: [] }
        });

        assert.equal(result.status, "ok");
        assert.equal(result.review.provider, "qwen");
        assert.equal(result.review.model, "qwen-plus");
        assert.equal(result.providersTried[1].attemptedRoutes[0].routeLabel, "DMXAPI");
        assert.equal(result.providersTried[1].attemptedRoutes[1].routeLabel, "官方");
        assert.ok(
          calls.some(
            (call) =>
              call.url === "https://www.dmxapi.cn/v1/chat/completions" &&
              call.model === "qwen3.5-plus-free"
          )
        );
        assert.ok(
          calls.some(
            (call) =>
              call.url === "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions" &&
              call.model === "qwen-plus"
          )
        );
      } finally {
        globalThis.fetch = originalFetch;
      }
    }
  );
});

test("runSemanticReview uses DMXAPI GLM first and records route metadata", async () => {
  await withEnv(
    {
      GLM_API_KEY: "glm-test",
      DASHSCOPE_API_KEY: "",
      DEEPSEEK_API_KEY: "",
      DMXAPI_API_KEY: "dmxapi-test",
      GLM_SEMANTIC_MODEL: "glm-4.6v",
      GLM_DMXAPI_MODEL: "glm-5.1-free"
    },
    async () => {
      const calls = [];
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async (url, options = {}) => {
        const body = JSON.parse(String(options.body || "{}"));
        calls.push({ url: String(url), model: body.model });

        return createJsonResponse(200, {
          model: "glm-5.1-free",
          choices: [
            {
              message: {
                content: JSON.stringify({
                  verdict: "observe",
                  confidence: 0.72,
                  categories: ["教育语境"],
                  reasons: ["glm via dmxapi"],
                  implicitSignals: [],
                  safeSignals: ["科普"],
                  summary: "glm dmxapi ok",
                  suggestion: ""
                })
              }
            }
          ]
        });
      };

      try {
        const { runSemanticReview } = await importFresh("../src/semantic-review.js");
        const result = await runSemanticReview({
          input: { title: "测试标题", body: "测试正文", tags: ["关系"] },
          analysis: { verdict: "manual_review", hits: [], suggestions: [] }
        });

        assert.equal(result.status, "ok");
        assert.equal(result.review.provider, "glm");
        assert.equal(result.review.model, "glm-5.1-free");
        assert.equal(result.review.route, "dmxapi");
        assert.equal(result.review.routeLabel, "DMXAPI");
        assert.equal(result.providersTried[0].routeLabel, "DMXAPI");
        assert.equal(calls[0].url, "https://www.dmxapi.cn/v1/chat/completions");
        assert.equal(calls[0].model, "glm-5.1-free");
      } finally {
        globalThis.fetch = originalFetch;
      }
    }
  );
});

test("callRoutedTextProviderJson supports DMXAPI-only MiniMax provider", async () => {
  await withEnv(
    {
      DMXAPI_API_KEY: "dmxapi-test",
      MINIMAX_DMXAPI_MODEL: "MiniMax-M2.7-free"
    },
    async () => {
      const calls = [];
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async (url, options = {}) => {
        const body = JSON.parse(String(options.body || "{}"));
        calls.push({ url: String(url), model: body.model });

        return createJsonResponse(200, {
          model: "MiniMax-M2.7-free",
          choices: [
            {
              message: {
                content: JSON.stringify({
                  verdict: "observe",
                  confidence: 0.58
                })
              }
            }
          ]
        });
      };

      try {
        const { callRoutedTextProviderJson } = await importFresh("../src/glm.js");
        const result = await callRoutedTextProviderJson({
          provider: "minimax",
          messages: [{ role: "user", content: "test" }],
          timeoutMs: 1000
        });

        assert.equal(result.model, "MiniMax-M2.7-free");
        assert.equal(result.route, "dmxapi");
        assert.equal(result.routeLabel, "DMXAPI");
        assert.deepEqual(calls, [{ url: "https://www.dmxapi.cn/v1/chat/completions", model: "MiniMax-M2.7-free" }]);
      } finally {
        globalThis.fetch = originalFetch;
      }
    }
  );
});

test("runSemanticReview can return MiniMax as a standalone provider", async () => {
  await withEnv(
    {
      GLM_API_KEY: "",
      DASHSCOPE_API_KEY: "",
      DEEPSEEK_API_KEY: "",
      DMXAPI_API_KEY: "dmxapi-test",
      MINIMAX_DMXAPI_MODEL: "MiniMax-M2.7-free"
    },
    async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async (url, options = {}) => {
        const body = JSON.parse(String(options.body || "{}"));

        if (body.model === "glm-5.1-free" || body.model === "qwen3.5-plus-free" || body.model === "mimo-v2.5-free") {
          return createJsonResponse(500, { error: { message: "upstream unavailable" } });
        }

        if (body.model === "MiniMax-M2.7-free") {
          return createJsonResponse(200, {
            model: "MiniMax-M2.7-free",
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    verdict: "observe",
                    confidence: 0.63,
                    categories: ["边界表达"],
                    reasons: ["minimax semantic ok"],
                    implicitSignals: [],
                    safeSignals: ["沟通语境"],
                    summary: "minimax semantic success",
                    suggestion: ""
                  })
                }
              }
            ]
          });
        }

        return createJsonResponse(500, { error: { message: "unexpected model" } });
      };

      try {
        const { runSemanticReview } = await importFresh("../src/semantic-review.js");
        const result = await runSemanticReview({
          input: { title: "测试标题", body: "测试正文", tags: ["关系"] },
          analysis: { verdict: "manual_review", hits: [], suggestions: [] }
        });

        assert.equal(result.status, "ok");
        assert.equal(result.review.provider, "minimax");
        assert.equal(result.review.model, "MiniMax-M2.7-free");
        const minimaxAttempt = result.providersTried.find((item) => item.provider === "minimax");
        assert.ok(minimaxAttempt);
        assert.equal(minimaxAttempt.status, "ok");
        assert.equal(minimaxAttempt.routeLabel, "DMXAPI");
      } finally {
        globalThis.fetch = originalFetch;
      }
    }
  );
});

test("runSemanticReview sends a larger default token budget to reduce truncated JSON", async () => {
  await withEnv(
    {
      GLM_API_KEY: "glm-test",
      DASHSCOPE_API_KEY: "",
      DEEPSEEK_API_KEY: "",
      DMXAPI_API_KEY: "dmxapi-test",
      GLM_SEMANTIC_MODEL: "glm-4.6v",
      GLM_DMXAPI_MODEL: "glm-5.1-free"
    },
    async () => {
      const calls = [];
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async (url, options = {}) => {
        const body = JSON.parse(String(options.body || "{}"));
        calls.push({ url: String(url), model: body.model, max_tokens: body.max_tokens });

        return createJsonResponse(200, {
          model: "glm-5.1-free",
          choices: [
            {
              message: {
                content: JSON.stringify({
                  verdict: "observe",
                  confidence: 0.72,
                  categories: ["教育语境"],
                  reasons: ["glm via dmxapi"],
                  implicitSignals: [],
                  safeSignals: ["科普"],
                  summary: "glm dmxapi ok",
                  suggestion: ""
                })
              }
            }
          ]
        });
      };

      try {
        const { runSemanticReview } = await importFresh("../src/semantic-review.js");
        await runSemanticReview({
          input: { title: "测试标题", body: "测试正文", tags: ["关系"] },
          analysis: { verdict: "manual_review", hits: [], suggestions: [] }
        });

        assert.equal(calls[0].url, "https://www.dmxapi.cn/v1/chat/completions");
        assert.equal(calls[0].model, "glm-5.1-free");
        assert.equal(calls[0].max_tokens, 900);
      } finally {
        globalThis.fetch = originalFetch;
      }
    }
  );
});

test("suggestFeedbackCandidates falls back to DashScope Qwen for DMXAPI 400 errors", async () => {
  await withEnv(
    {
      GLM_API_KEY: "",
      DASHSCOPE_API_KEY: "dashscope-test",
      DEEPSEEK_API_KEY: "",
      DMXAPI_API_KEY: "dmxapi-test",
      QWEN_DMXAPI_MODEL: "qwen3.5-plus-free"
    },
    async () => {
      const calls = [];
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async (url) => {
        calls.push(String(url));
        if (calls.length === 1) {
          return createJsonResponse(400, { error: { message: "invalid parameter: temperature" } });
        }

        return createJsonResponse(200, {
          model: "qwen-plus",
          choices: [
            {
              message: {
                content: JSON.stringify({
                  suspiciousPhrases: ["400 fallback"],
                  contextCategories: [],
                  summary: "fallback from 400",
                  notes: "",
                  confidence: 0.76
                })
              }
            }
          ]
        });
      };

      try {
        const { suggestFeedbackCandidates } = await importFresh("../src/glm.js");
        const result = await suggestFeedbackCandidates({
          noteContent: "测试文案",
          platformReason: "疑似导流"
        });

        assert.equal(result.provider, "qwen");
        assert.equal(result.model, "qwen-plus");
        assert.deepEqual(result.suspiciousPhrases, ["400 fallback"]);
        assert.equal(calls[0], "https://www.dmxapi.cn/v1/chat/completions");
        assert.equal(calls[1], "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions");
      } finally {
        globalThis.fetch = originalFetch;
      }
    }
  );
});

test("suggestFeedbackCandidates skips DMXAPI and uses DashScope when DMXAPI is not configured", async () => {
  await withEnv(
    {
      GLM_API_KEY: "",
      DASHSCOPE_API_KEY: "dashscope-test",
      DEEPSEEK_API_KEY: "",
      DMXAPI_API_KEY: ""
    },
    async () => {
      const calls = [];
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async (url) => {
        calls.push(String(url));
        return createJsonResponse(200, {
          model: "qwen-plus",
          choices: [
            {
              message: {
                content: JSON.stringify({
                  suspiciousPhrases: ["official only"],
                  contextCategories: [],
                  summary: "dashscope only",
                  notes: "",
                  confidence: 0.7
                })
              }
            }
          ]
        });
      };

      try {
        const { suggestFeedbackCandidates } = await importFresh("../src/glm.js");
        const result = await suggestFeedbackCandidates({
          noteContent: "测试文案",
          platformReason: "疑似导流"
        });

        assert.equal(result.model, "qwen-plus");
        assert.deepEqual(calls, ["https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions"]);
      } finally {
        globalThis.fetch = originalFetch;
      }
    }
  );
});

test("runCrossModelReview falls back to official DeepSeek after DMXAPI failure", async () => {
  await withEnv(
    {
      GLM_API_KEY: "",
      DASHSCOPE_API_KEY: "",
      DEEPSEEK_API_KEY: "deepseek-test",
      DMXAPI_API_KEY: "dmxapi-test",
      DEEPSEEK_CROSS_REVIEW_MODEL: "deepseek-v4-flash",
      DEEPSEEK_DMXAPI_MODEL: "mimo-v2.5-free"
    },
    async () => {
      const calls = [];
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async (url, options = {}) => {
        const body = JSON.parse(String(options.body || "{}"));
        calls.push({ url: String(url), model: body.model });
        if (
          String(url) === "https://www.dmxapi.cn/v1/chat/completions" &&
          body.model === "mimo-v2.5-free"
        ) {
          return createJsonResponse(500, { error: { message: "dmxapi upstream unavailable" } });
        }

        return createJsonResponse(200, {
          model: "deepseek-v4-flash",
          choices: [
            {
              message: {
                content: JSON.stringify({
                  verdict: "observe",
                  confidence: 0.64,
                  categories: ["边界表达"],
                  reasons: ["official deepseek fallback"],
                  falsePositiveRisk: "",
                  falseNegativeRisk: "",
                  summary: "deepseek official success"
                })
              }
            }
          ]
        });
      };

      try {
        const { runCrossModelReview } = await importFresh("../src/cross-review.js");
        const result = await runCrossModelReview({
          input: { title: "测试标题", body: "测试正文", tags: ["关系"] },
          analysis: { verdict: "manual_review", hits: [], suggestions: [] }
        });

        const mimoResult = result.providers.find((item) => item.provider === "mimo");
        const deepseekResult = result.providers.find((item) => item.provider === "deepseek");
        assert.ok(mimoResult);
        assert.equal(mimoResult.status, "error");
        assert.equal(mimoResult.model, "mimo-v2.5-free");
        assert.equal(deepseekResult.status, "ok");
        assert.equal(deepseekResult.review.model, "deepseek-v4-flash");
        assert.ok(
          calls.some(
            (call) =>
              call.url === "https://www.dmxapi.cn/v1/chat/completions" &&
              call.model === "mimo-v2.5-free"
          )
        );
        assert.ok(
          calls.some(
            (call) => call.url === "https://api.deepseek.com/chat/completions" && call.model === "deepseek-v4-flash"
          )
        );
      } finally {
        globalThis.fetch = originalFetch;
      }
    }
  );
});

test("runSemanticReview falls back to official DeepSeek after DMXAPI returns reasoning without final JSON", async () => {
  await withEnv(
    {
      GLM_API_KEY: "",
      DASHSCOPE_API_KEY: "",
      DEEPSEEK_API_KEY: "deepseek-test",
      DMXAPI_API_KEY: "dmxapi-test",
      DEEPSEEK_SEMANTIC_MODEL: "deepseek-v4-flash",
      DEEPSEEK_DMXAPI_MODEL: "mimo-v2.5-free"
    },
    async () => {
      const calls = [];
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async (url, options = {}) => {
        const body = JSON.parse(String(options.body || "{}"));
        calls.push({ url: String(url), model: body.model });

        if (String(url) === "https://www.dmxapi.cn/v1/chat/completions" && body.model !== "mimo-v2.5-free") {
          return createJsonResponse(500, { error: { message: "non-deepseek dmxapi unavailable" } });
        }

        if (
          String(url) === "https://www.dmxapi.cn/v1/chat/completions" &&
          body.model === "mimo-v2.5-free"
        ) {
          return createJsonResponse(200, {
            model: "mimo-v2.5-free",
            choices: [
              {
                message: {
                  content: [],
                  reasoning_content: [{ type: "text", text: "先分析语义风险，再决定输出结构。" }]
                }
              }
            ]
          });
        }

        return createJsonResponse(200, {
          model: "deepseek-v4-flash",
          choices: [
            {
              message: {
                content: JSON.stringify({
                  verdict: "observe",
                  confidence: 0.67,
                  categories: ["边界表达"],
                  reasons: ["official deepseek semantic fallback"],
                  implicitSignals: [],
                  safeSignals: ["沟通语境"],
                  summary: "official semantic fallback success",
                  suggestion: ""
                })
              }
            }
          ]
        });
      };

      try {
        const { runSemanticReview } = await importFresh("../src/semantic-review.js");
        const result = await runSemanticReview({
          input: { title: "测试标题", body: "测试正文", tags: ["关系"] },
          analysis: { verdict: "manual_review", hits: [], suggestions: [] }
        });

        assert.equal(result.status, "ok");
        assert.equal(result.review.provider, "deepseek");
        assert.equal(result.review.model, "deepseek-v4-flash");
        const mimoAttempt = result.providersTried.find((item) => item.provider === "mimo");
        const deepseekAttempt = result.providersTried.find((item) => item.provider === "deepseek");
        assert.ok(mimoAttempt);
        assert.equal(mimoAttempt.status, "error");
        assert.equal(mimoAttempt.model, "mimo-v2.5-free");
        assert.ok(deepseekAttempt);
        assert.equal(deepseekAttempt.status, "ok");
        assert.equal(deepseekAttempt.model, "deepseek-v4-flash");
        assert.equal(deepseekAttempt.routeLabel, "官方");
        assert.ok(
          calls.some(
            (call) =>
              call.url === "https://www.dmxapi.cn/v1/chat/completions" &&
              call.model === "mimo-v2.5-free"
          )
        );
        assert.ok(
          calls.some(
            (call) => call.url === "https://api.deepseek.com/chat/completions" && call.model === "deepseek-v4-flash"
          )
        );
      } finally {
        globalThis.fetch = originalFetch;
      }
    }
  );
});

test("runSemanticReview accepts final JSON embedded in Mimo reasoning_content", async () => {
  await withEnv(
    {
      GLM_API_KEY: "",
      DASHSCOPE_API_KEY: "",
      DEEPSEEK_API_KEY: "deepseek-test",
      DMXAPI_API_KEY: "dmxapi-test",
      DEEPSEEK_SEMANTIC_MODEL: "deepseek-v4-flash",
      DEEPSEEK_DMXAPI_MODEL: "mimo-v2.5-free"
    },
    async () => {
      const calls = [];
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async (url, options = {}) => {
        const body = JSON.parse(String(options.body || "{}"));
        calls.push({ url: String(url), model: body.model });

        if (String(url) === "https://www.dmxapi.cn/v1/chat/completions" && body.model !== "mimo-v2.5-free") {
          return createJsonResponse(500, { error: { message: "non-deepseek dmxapi unavailable" } });
        }

        if (
          String(url) === "https://www.dmxapi.cn/v1/chat/completions" &&
          body.model === "mimo-v2.5-free"
        ) {
          return createJsonResponse(200, {
            model: "mimo-v2.5-free",
            choices: [
              {
                message: {
                  content: [],
                  reasoning_content: [
                    { type: "text", text: "先分析语义风险，再决定输出结构。" },
                    {
                      type: "text",
                      text:
                        '最终输出：```json\n{"verdict":"observe","confidence":0.71,"categories":["边界表达"],"reasons":["mimo reasoning 内含最终 JSON"],"implicitSignals":[],"safeSignals":["沟通语境"],"summary":"mimo reasoning parse success","suggestion":""}\n```'
                    }
                  ]
                }
              }
            ]
          });
        }

        return createJsonResponse(200, {
          model: "deepseek-v4-flash",
          choices: [
            {
              message: {
                content: JSON.stringify({
                  verdict: "manual_review",
                  confidence: 0.91,
                  categories: ["不应触发回退"],
                  reasons: ["这条结果不该被使用"],
                  implicitSignals: [],
                  safeSignals: [],
                  summary: "unexpected fallback",
                  suggestion: ""
                })
              }
            }
          ]
        });
      };

      try {
        const { runSemanticReview } = await importFresh("../src/semantic-review.js");
        const result = await runSemanticReview({
          input: { title: "测试标题", body: "测试正文", tags: ["关系"] },
          analysis: { verdict: "manual_review", hits: [], suggestions: [] }
        });

        assert.equal(result.status, "ok");
        assert.equal(result.review.provider, "mimo");
        assert.equal(result.review.model, "mimo-v2.5-free");
        assert.equal(result.review.verdict, "observe");
        assert.deepEqual(result.review.reasons, ["mimo reasoning 内含最终 JSON"]);
        assert.equal(
          calls.filter(
            (call) =>
              call.url === "https://www.dmxapi.cn/v1/chat/completions" &&
              call.model === "mimo-v2.5-free"
          ).length,
          1
        );
        assert.equal(
          calls.some(
            (call) => call.url === "https://api.deepseek.com/chat/completions" && call.model === "deepseek-v4-flash"
          ),
          false
        );
      } finally {
        globalThis.fetch = originalFetch;
      }
    }
  );
});

test("runSemanticReview filters placeholder reasons from Mimo structured output", async () => {
  await withEnv(
    {
      GLM_API_KEY: "",
      DASHSCOPE_API_KEY: "",
      DEEPSEEK_API_KEY: "deepseek-test",
      DMXAPI_API_KEY: "dmxapi-test",
      DEEPSEEK_SEMANTIC_MODEL: "deepseek-v4-flash",
      DEEPSEEK_DMXAPI_MODEL: "mimo-v2.5-free"
    },
    async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async (url, options = {}) => {
        const body = JSON.parse(String(options.body || "{}"));

        if (String(url) === "https://www.dmxapi.cn/v1/chat/completions" && body.model === "mimo-v2.5-free") {
          return createJsonResponse(200, {
            model: "mimo-v2.5-free",
            choices: [
              {
                message: {
                  parsed: {
                    verdict: "manual_review",
                    confidence: 0.64,
                    categories: ["边界表达"],
                    reasons: ["一句话原因1", "正文里存在导流暗示"],
                    implicitSignals: [],
                    safeSignals: ["沟通语境"],
                    summary: "placeholder cleanup success",
                    suggestion: ""
                  }
                }
              }
            ]
          });
        }

        return createJsonResponse(200, {
          model: "deepseek-v4-flash",
          choices: [
            {
              message: {
                content: JSON.stringify({
                  verdict: "manual_review",
                  confidence: 0.91,
                  categories: ["不应触发回退"],
                  reasons: ["这条结果不该被使用"],
                  implicitSignals: [],
                  safeSignals: [],
                  summary: "unexpected fallback",
                  suggestion: ""
                })
              }
            }
          ]
        });
      };

      try {
        const { runSemanticReview } = await importFresh("../src/semantic-review.js");
        const result = await runSemanticReview({
          input: { title: "测试标题", body: "测试正文", tags: ["关系"] },
          analysis: { verdict: "manual_review", hits: [], suggestions: [] },
          modelSelection: "mimo"
        });

        assert.equal(result.status, "ok");
        assert.equal(result.review.provider, "mimo");
        assert.deepEqual(result.review.reasons, ["正文里存在导流暗示"]);
      } finally {
        globalThis.fetch = originalFetch;
      }
    }
  );
});

test("runSemanticReview accepts final JSON embedded in Mimo choice-level reasoning_content", async () => {
  await withEnv(
    {
      GLM_API_KEY: "",
      DASHSCOPE_API_KEY: "",
      DEEPSEEK_API_KEY: "deepseek-test",
      DMXAPI_API_KEY: "dmxapi-test",
      DEEPSEEK_SEMANTIC_MODEL: "deepseek-v4-flash",
      DEEPSEEK_DMXAPI_MODEL: "mimo-v2.5-free"
    },
    async () => {
      const calls = [];
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async (url, options = {}) => {
        const body = JSON.parse(String(options.body || "{}"));
        calls.push({ url: String(url), model: body.model });

        if (String(url) === "https://www.dmxapi.cn/v1/chat/completions" && body.model !== "mimo-v2.5-free") {
          return createJsonResponse(500, { error: { message: "non-deepseek dmxapi unavailable" } });
        }

        if (
          String(url) === "https://www.dmxapi.cn/v1/chat/completions" &&
          body.model === "mimo-v2.5-free"
        ) {
          return createJsonResponse(200, {
            model: "mimo-v2.5-free",
            choices: [
              {
                message: {
                  content: []
                },
                reasoning_content: [
                  { type: "text", text: "先分析语义风险，再决定输出结构。" },
                  {
                    type: "text",
                    text:
                      '最终输出：```json\n{"verdict":"observe","confidence":0.73,"categories":["边界表达"],"reasons":["mimo choice reasoning 内含最终 JSON"],"implicitSignals":[],"safeSignals":["沟通语境"],"summary":"mimo choice reasoning parse success","suggestion":""}\n```'
                  }
                ]
              }
            ]
          });
        }

        return createJsonResponse(200, {
          model: "deepseek-v4-flash",
          choices: [
            {
              message: {
                content: JSON.stringify({
                  verdict: "manual_review",
                  confidence: 0.91,
                  categories: ["不应触发回退"],
                  reasons: ["这条结果不该被使用"],
                  implicitSignals: [],
                  safeSignals: [],
                  summary: "unexpected fallback",
                  suggestion: ""
                })
              }
            }
          ]
        });
      };

      try {
        const { runSemanticReview } = await importFresh("../src/semantic-review.js");
        const result = await runSemanticReview({
          input: { title: "测试标题", body: "测试正文", tags: ["关系"] },
          analysis: { verdict: "manual_review", hits: [], suggestions: [] }
        });

        assert.equal(result.status, "ok");
        assert.equal(result.review.provider, "mimo");
        assert.equal(result.review.model, "mimo-v2.5-free");
        assert.equal(result.review.verdict, "observe");
        assert.deepEqual(result.review.reasons, ["mimo choice reasoning 内含最终 JSON"]);
        assert.equal(
          calls.some(
            (call) => call.url === "https://api.deepseek.com/chat/completions" && call.model === "deepseek-v4-flash"
          ),
          false
        );
      } finally {
        globalThis.fetch = originalFetch;
      }
    }
  );
});

test("runSemanticReview sends structured json_schema format to Mimo DMXAPI and accepts message.parsed", async () => {
  await withEnv(
    {
      GLM_API_KEY: "",
      DASHSCOPE_API_KEY: "",
      DEEPSEEK_API_KEY: "deepseek-test",
      DMXAPI_API_KEY: "dmxapi-test",
      DEEPSEEK_SEMANTIC_MODEL: "deepseek-v4-flash",
      DEEPSEEK_DMXAPI_MODEL: "mimo-v2.5-free"
    },
    async () => {
      const calls = [];
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async (url, options = {}) => {
        const body = JSON.parse(String(options.body || "{}"));
        calls.push({ url: String(url), body });

        if (String(url) === "https://www.dmxapi.cn/v1/chat/completions" && body.model === "mimo-v2.5-free") {
          if (body.response_format?.type === "json_schema") {
            return createJsonResponse(200, {
              model: "mimo-v2.5-free",
              choices: [
                {
                  message: {
                    content: [],
                    parsed: {
                      verdict: "observe",
                      confidence: 0.78,
                      categories: ["边界表达"],
                      reasons: ["mimo structured output parsed success"],
                      implicitSignals: [],
                      safeSignals: ["沟通语境"],
                      summary: "mimo parsed payload success",
                      suggestion: ""
                    }
                  }
                }
              ]
            });
          }

          return createJsonResponse(200, {
            model: "mimo-v2.5-free",
            choices: [
              {
                message: {
                  content: [],
                  reasoning_content: [{ type: "text", text: "只返回了思考过程，没有最终 JSON。" }]
                }
              }
            ]
          });
        }

        return createJsonResponse(200, {
          model: "deepseek-v4-flash",
          choices: [
            {
              message: {
                content: JSON.stringify({
                  verdict: "manual_review",
                  confidence: 0.91,
                  categories: ["不应触发回退"],
                  reasons: ["这条结果不该被使用"],
                  implicitSignals: [],
                  safeSignals: [],
                  summary: "unexpected fallback",
                  suggestion: ""
                })
              }
            }
          ]
        });
      };

      try {
        const { runSemanticReview } = await importFresh("../src/semantic-review.js");
        const result = await runSemanticReview({
          input: { title: "测试标题", body: "测试正文", tags: ["关系"] },
          analysis: { verdict: "manual_review", hits: [], suggestions: [] },
          modelSelection: "mimo"
        });

        assert.equal(result.status, "ok");
        assert.equal(result.review.provider, "mimo");
        assert.equal(result.review.model, "mimo-v2.5-free");
        assert.equal(result.review.verdict, "observe");
        assert.deepEqual(result.review.reasons, ["mimo structured output parsed success"]);
        const mimoCall = calls.find(
          (call) =>
            call.url === "https://www.dmxapi.cn/v1/chat/completions" &&
            call.body.model === "mimo-v2.5-free"
        );
        assert.ok(mimoCall);
        assert.equal(mimoCall.body.response_format?.type, "json_schema");
        assert.equal(mimoCall.body.response_format?.json_schema?.name, "semantic_review");
        assert.equal(calls.some((call) => call.url === "https://api.deepseek.com/chat/completions"), false);
      } finally {
        globalThis.fetch = originalFetch;
      }
    }
  );
});

test("runSemanticReview retries Mimo without response_format when the first structured request only returns reasoning", async () => {
  await withEnv(
    {
      GLM_API_KEY: "",
      DASHSCOPE_API_KEY: "",
      DEEPSEEK_API_KEY: "deepseek-test",
      DMXAPI_API_KEY: "dmxapi-test",
      DEEPSEEK_SEMANTIC_MODEL: "deepseek-v4-flash",
      DEEPSEEK_DMXAPI_MODEL: "mimo-v2.5-free"
    },
    async () => {
      const calls = [];
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async (url, options = {}) => {
        const body = JSON.parse(String(options.body || "{}"));
        calls.push({ url: String(url), body });

        if (String(url) === "https://www.dmxapi.cn/v1/chat/completions" && body.model === "mimo-v2.5-free") {
          if (body.response_format?.type === "json_schema") {
            return createJsonResponse(200, {
              model: "mimo-v2.5-free",
              choices: [
                {
                  message: {
                    content: [],
                    reasoning_content: [{ type: "text", text: "先想一下，但没有最终 JSON。" }]
                  }
                }
              ]
            });
          }

          return createJsonResponse(200, {
            model: "mimo-v2.5-free",
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    verdict: "observe",
                    confidence: 0.72,
                    categories: ["边界表达"],
                    reasons: ["普通请求返回了完整 JSON"],
                    implicitSignals: [],
                    safeSignals: ["沟通语境"],
                    summary: "retry without response_format success",
                    suggestion: ""
                  })
                }
              }
            ]
          });
        }

        return createJsonResponse(200, {
          model: "deepseek-v4-flash",
          choices: [
            {
              message: {
                content: JSON.stringify({
                  verdict: "manual_review",
                  confidence: 0.91,
                  categories: ["不应触发回退"],
                  reasons: ["这条结果不该被使用"],
                  implicitSignals: [],
                  safeSignals: [],
                  summary: "unexpected fallback",
                  suggestion: ""
                })
              }
            }
          ]
        });
      };

      try {
        const { runSemanticReview } = await importFresh("../src/semantic-review.js");
        const result = await runSemanticReview({
          input: { title: "测试标题", body: "测试正文", tags: ["关系"] },
          analysis: { verdict: "manual_review", hits: [], suggestions: [] },
          modelSelection: "mimo"
        });

        assert.equal(result.status, "ok");
        assert.equal(result.review.verdict, "observe");
        assert.deepEqual(result.review.reasons, ["普通请求返回了完整 JSON"]);
        assert.equal(
          calls.filter(
            (call) =>
              call.url === "https://www.dmxapi.cn/v1/chat/completions" &&
              call.body.model === "mimo-v2.5-free"
          ).length,
          2
        );
        assert.equal(calls.some((call) => call.url === "https://api.deepseek.com/chat/completions"), false);
      } finally {
        globalThis.fetch = originalFetch;
      }
    }
  );
});

test("runCrossModelReview sends a larger default token budget to reduce truncated JSON", async () => {
  await withEnv(
    {
      GLM_API_KEY: "",
      DASHSCOPE_API_KEY: "",
      DEEPSEEK_API_KEY: "deepseek-test",
      DMXAPI_API_KEY: "dmxapi-test",
      DEEPSEEK_CROSS_REVIEW_MODEL: "deepseek-v4-flash",
      DEEPSEEK_DMXAPI_MODEL: "mimo-v2.5-free"
    },
    async () => {
      const calls = [];
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async (url, options = {}) => {
        const body = JSON.parse(String(options.body || "{}"));
        calls.push({ url: String(url), model: body.model, max_tokens: body.max_tokens });

        return createJsonResponse(200, {
          model: "mimo-v2.5-free",
          choices: [
            {
              message: {
                content: JSON.stringify({
                  verdict: "observe",
                  confidence: 0.64,
                  categories: ["边界表达"],
                  reasons: ["dmxapi mimo ok"],
                  falsePositiveRisk: "",
                  falseNegativeRisk: "",
                  summary: "deepseek dmxapi success"
                })
              }
            }
          ]
        });
      };

      try {
        const { runCrossModelReview } = await importFresh("../src/cross-review.js");
        await runCrossModelReview({
          input: { title: "测试标题", body: "测试正文", tags: ["关系"] },
          analysis: { verdict: "manual_review", hits: [], suggestions: [] }
        });

        const deepseekDmxapiCall = calls.find(
          (call) =>
            call.url === "https://www.dmxapi.cn/v1/chat/completions" &&
            call.model === "mimo-v2.5-free"
        );
        assert.ok(deepseekDmxapiCall);
        assert.equal(deepseekDmxapiCall.max_tokens, 900);
      } finally {
        globalThis.fetch = originalFetch;
      }
    }
  );
});

test("callDeepSeekJson repairs truncated official JSON responses", async () => {
  await withEnv(
    {
      DMXAPI_API_KEY: "",
      DEEPSEEK_API_KEY: "deepseek-test",
      DEEPSEEK_FEEDBACK_MODEL: "deepseek-v4-flash"
    },
    async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async () =>
        createJsonResponse(200, {
          model: "deepseek-v4-flash",
          choices: [
            {
              message: {
                content: `{
  "verdict": "manual_review",
  "confidence": 0.7,
  "categories": ["低俗擦边", "软色情内容", "性玩具宣传"],
  "reasons": [
    "以人格分类形式隐晦推广成人玩具,情感化描述具有擦边暗示",
    "拟人化将玩具作为情感寄托,营造赛博恋爱氛围,可能软色情"
`
              }
            }
          ]
        });

      try {
        const { callDeepSeekJson } = await importFresh("../src/glm.js");
        const result = await callDeepSeekJson({
          model: "deepseek-v4-flash",
          messages: [{ role: "user", content: "hello" }]
        });

        assert.equal(result.route, "official");
        assert.equal(result.model, "deepseek-v4-flash");
        assert.equal(result.parsed.verdict, "manual_review");
        assert.deepEqual(result.parsed.categories, ["低俗擦边", "软色情内容", "性玩具宣传"]);
        assert.deepEqual(result.parsed.reasons, [
          "以人格分类形式隐晦推广成人玩具,情感化描述具有擦边暗示",
          "拟人化将玩具作为情感寄托,营造赛博恋爱氛围,可能软色情"
        ]);
      } finally {
        globalThis.fetch = originalFetch;
      }
    }
  );
});
