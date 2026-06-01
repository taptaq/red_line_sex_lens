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
      QWEN_DMXAPI_MODEL: "qwen3.6-flash"
    },
    async () => {
      const calls = [];
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async (url) => {
        calls.push(String(url));
        return createJsonResponse(200, {
          model: "qwen3.6-flash",
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
        assert.equal(result.model, "qwen3.6-flash");
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
      QWEN_DMXAPI_MODEL: "qwen3.6-flash"
    },
    async () => {
      const calls = [];
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async (url, options = {}) => {
        const body = JSON.parse(String(options.body || "{}"));
        calls.push({ url: String(url), model: body.model });
        return createJsonResponse(200, {
          model: "qwen3.6-flash",
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
        assert.deepEqual(calls, [{ url: "https://www.dmxapi.cn/v1/chat/completions", model: "qwen3.6-flash" }]);
      } finally {
        globalThis.fetch = originalFetch;
      }
    }
  );
});

test("suggestFeedbackCandidates respects a standalone DMXAPI model selection", async () => {
  await withEnv(
    {
      GLM_API_KEY: "glm-test",
      DASHSCOPE_API_KEY: "dashscope-test",
      DEEPSEEK_API_KEY: "deepseek-test",
      DMXAPI_API_KEY: "dmxapi-test"
    },
    async () => {
      const calls = [];
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async (url, options = {}) => {
        const body = JSON.parse(String(options.body || "{}"));
        calls.push({ url: String(url), model: body.model });
        return createJsonResponse(200, {
          model: "claude-sonnet-4-6-ssvip",
          choices: [
            {
              message: {
                content: JSON.stringify({
                  suspiciousPhrases: ["独立模型命中"],
                  contextCategories: ["soft-sell"],
                  summary: "standalone selected",
                  notes: "",
                  confidence: 0.83
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
          modelSelection: "claude-sonnet-4-6-ssvip"
        });

        assert.equal(result.model, "claude-sonnet-4-6-ssvip");
        assert.deepEqual(calls, [{ url: "https://www.dmxapi.cn/v1/chat/completions", model: "claude-sonnet-4-6-ssvip" }]);
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
      GLM_DMXAPI_MODEL: "glm-5.1",
      GLM_TEXT_MODEL: "glm-4.6v"
    },
    async () => {
      const calls = [];
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async (url, options = {}) => {
        const body = JSON.parse(String(options.body || "{}"));
        calls.push({ url: String(url), model: body.model, stream: body.stream, top_p: body.top_p, temperature: body.temperature });

        return createJsonResponse(200, {
          model: "glm-5.1",
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

        assert.equal(result.model, "glm-5.1");
        assert.equal(result.route, "dmxapi");
        assert.equal(result.routeLabel, "DMXAPI");
        assert.deepEqual(calls, [
          {
            url: "https://www.dmxapi.cn/v1/chat/completions",
            model: "glm-5.1",
            stream: false,
            temperature: 0.2,
            top_p: undefined
          }
        ]);
      } finally {
        globalThis.fetch = originalFetch;
      }
    }
  );
});

test("callRoutedTextProviderJson uses 七牛云 first for targeted models and falls back to DMXAPI", async () => {
  await withEnv(
    {
      QNAIGC_API_KEY: "qnaigc-test",
      DMXAPI_API_KEY: "dmxapi-test",
      QWEN_DMXAPI_MODEL: "qwen3.6-plus"
    },
    async () => {
      const calls = [];
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async (url, options = {}) => {
        const body = JSON.parse(String(options.body || "{}"));
        calls.push({ url: String(url), model: body.model });

        if (String(url) === "https://api.qnaigc.com/v1/chat/completions") {
          return createJsonResponse(500, { error: { message: "qnaigc unavailable" } });
        }

        return createJsonResponse(200, {
          model: "qwen3.6-plus",
          choices: [
            {
              message: {
                content: JSON.stringify({ verdict: "pass", confidence: 0.9 })
              }
            }
          ]
        });
      };

      try {
        const { callRoutedTextProviderJson } = await importFresh("../src/glm.js");
        const result = await callRoutedTextProviderJson({
          provider: "qwen",
          model: "qwen3.6-plus",
          messages: [{ role: "user", content: "hello" }],
          timeoutMs: 1000
        });

        assert.equal(result.route, "dmxapi");
        assert.equal(result.routeLabel, "DMXAPI");
        assert.deepEqual(calls, [
          { url: "https://api.qnaigc.com/v1/chat/completions", model: "qwen/qwen3.6-plus" },
          { url: "https://www.dmxapi.cn/v1/chat/completions", model: "qwen3.6-plus" }
        ]);
        assert.deepEqual(result.attemptedRoutes, [
          {
            route: "qnaigc",
            routeLabel: "七牛云",
            model: "qwen/qwen3.6-plus",
            status: "error",
            message: "qnaigc unavailable"
          },
          {
            route: "dmxapi",
            routeLabel: "DMXAPI",
            model: "qwen3.6-plus",
            status: "ok",
            message: ""
          }
        ]);
      } finally {
        globalThis.fetch = originalFetch;
      }
    }
  );
});

test("callRoutedTextProviderJson supports standalone DMXAPI text models", async () => {
  await withEnv(
    {
      DMXAPI_API_KEY: "dmxapi-test"
    },
    async () => {
      const calls = [];
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async (url, options = {}) => {
        const body = JSON.parse(String(options.body || "{}"));
        calls.push({ url: String(url), model: body.model, stream: body.stream });

        return createJsonResponse(200, {
          model: "gpt-5.4",
          choices: [
            {
              message: {
                content: JSON.stringify({
                  verdict: "pass",
                  confidence: 0.9
                })
              }
            }
          ]
        });
      };

      try {
        const { callRoutedTextProviderJson } = await importFresh("../src/glm.js");
        const result = await callRoutedTextProviderJson({
          provider: "dmxapi_text",
          model: "gpt-5.4",
          messages: [{ role: "user", content: "hello" }],
          timeoutMs: 1000
        });

        assert.equal(result.model, "gpt-5.4");
        assert.equal(result.route, "dmxapi");
        assert.equal(result.routeLabel, "DMXAPI");
        assert.deepEqual(calls, [{ url: "https://www.dmxapi.cn/v1/chat/completions", model: "gpt-5.4", stream: false }]);
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
      GLM_DMXAPI_MODEL: "glm-5.1",
      GLM_TEXT_MODEL: "glm-4.6v"
    },
    async () => {
      const calls = [];
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async (url, options = {}) => {
        const body = JSON.parse(String(options.body || "{}"));
        calls.push({ url: String(url), body });

        return createJsonResponse(200, {
          model: "glm-5.1",
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
      GLM_DMXAPI_MODEL: "glm-5.1",
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
          model: "glm-5.1",
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

        assert.equal(result.model, "glm-5.1");
        assert.equal(calls.length, 2);
        assert.deepEqual(calls[0].body.response_format, { type: "json_object" });
        assert.equal("response_format" in calls[1].body, false);
      } finally {
        globalThis.fetch = originalFetch;
      }
    }
  );
});

test("callRoutedTextProviderJson sends Kimi directly to the official Moonshot endpoint", async () => {
  await withEnv(
    {
      DMXAPI_API_KEY: "dmxapi-test",
      KIMI_API_KEY: "kimi-test",
      KIMI_BASE_URL: "https://api.moonshot.cn/v1/chat/completions",
      KIMI_TEXT_MODEL: "kimi-k2.6"
    },
    async () => {
      const calls = [];
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async (url, options = {}) => {
        const body = JSON.parse(String(options.body || "{}"));
        calls.push({
          url: String(url),
          model: body.model,
          temperature: body.temperature,
          stream: body.stream,
          top_p: body.top_p,
          response_format: body.response_format,
          thinking: body.thinking
        });

        return createJsonResponse(200, {
          model: "kimi-k2.6",
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
          model: "kimi-k2.6",
          messages: [{ role: "user", content: "hello" }],
          timeoutMs: 1000
        });

        assert.equal(result.model, "kimi-k2.6");
        assert.equal(result.route, "official");
        assert.equal(result.routeLabel, "官方");
        assert.equal(calls.length, 1);
        assert.equal(calls[0].url, "https://api.moonshot.cn/v1/chat/completions");
        assert.equal(calls[0].model, "kimi-k2.6");
        assert.equal(calls[0].temperature, 0.2);
        assert.equal(calls[0].stream, undefined);
        assert.equal(calls[0].top_p, undefined);
        assert.deepEqual(calls[0].response_format, { type: "json_object" });
        assert.deepEqual(calls[0].thinking, { type: "disabled" });
      } finally {
        globalThis.fetch = originalFetch;
      }
    }
  );
});

test("callRoutedTextProviderJson caps Kimi official temperature at 0.6 when caller passes a higher value", async () => {
  await withEnv(
    {
      DMXAPI_API_KEY: "dmxapi-test",
      KIMI_API_KEY: "kimi-test",
      KIMI_BASE_URL: "https://api.moonshot.cn/v1/chat/completions",
      KIMI_TEXT_MODEL: "kimi-k2.6"
    },
    async () => {
      const calls = [];
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async (url, options = {}) => {
        const body = JSON.parse(String(options.body || "{}"));
        calls.push({ url: String(url), model: body.model, temperature: body.temperature });

        return createJsonResponse(200, {
          model: "kimi-k2.6",
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
        await callRoutedTextProviderJson({
          provider: "kimi",
          model: "kimi-k2.6",
          messages: [{ role: "user", content: "hello" }],
          temperature: 0.7,
          timeoutMs: 1000
        });

        assert.equal(calls[0].temperature, 0.6);
      } finally {
        globalThis.fetch = originalFetch;
      }
    }
  );
});

test("callRoutedTextProviderJson pins Kimi official temperature to 0.6 even when caller passes a lower value", async () => {
  await withEnv(
    {
      DMXAPI_API_KEY: "dmxapi-test",
      KIMI_API_KEY: "kimi-test",
      KIMI_BASE_URL: "https://api.moonshot.cn/v1/chat/completions",
      KIMI_TEXT_MODEL: "kimi-k2.6"
    },
    async () => {
      const calls = [];
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async (url, options = {}) => {
        const body = JSON.parse(String(options.body || "{}"));
        calls.push({ url: String(url), model: body.model, temperature: body.temperature });

        return createJsonResponse(200, {
          model: "kimi-k2.6",
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
        await callRoutedTextProviderJson({
          provider: "kimi",
          model: "kimi-k2.6",
          messages: [{ role: "user", content: "hello" }],
          temperature: 0.5,
          timeoutMs: 1000
        });

        assert.equal(calls[0].temperature, 0.6);
      } finally {
        globalThis.fetch = originalFetch;
      }
    }
  );
});

test("rewritePostForCompliance omits temperature for standalone DMXAPI Claude selections that reject the parameter", async () => {
  await withEnv(
    {
      REWRITE_PROVIDER: "glm",
      DMXAPI_API_KEY: "dmxapi-test",
      GLM_API_KEY: "",
      KIMI_API_KEY: "",
      DEEPSEEK_API_KEY: ""
    },
    async () => {
      const calls = [];
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async (url, options = {}) => {
        const body = JSON.parse(String(options.body || "{}"));
        calls.push({ url: String(url), model: body.model, hasTemperature: Object.prototype.hasOwnProperty.call(body, "temperature") });

        return createJsonResponse(200, {
          model: "claude-sonnet-4-6-ssvip",
          choices: [
            {
              message: {
                content: JSON.stringify({
                  title: "改写标题",
                  body: "改写正文",
                  coverText: "改写封面",
                  tags: ["科普", "沟通"],
                  rewriteNotes: "去掉了更直白的刺激描述",
                  safetyNotes: "避免教程化表达"
                })
              }
            }
          ]
        });
      };

      try {
        const { rewritePostForCompliance } = await importFresh("../src/glm.js");
        const result = await rewritePostForCompliance({
          input: {
            title: "原标题",
            body: "原正文",
            coverText: "原封面",
            tags: ["科普"]
          },
          analysis: {
            verdict: "manual_review",
            finalVerdict: "manual_review",
            score: 42,
            suggestions: ["再收一点表达"]
          },
          modelSelection: "claude-sonnet-4-6-ssvip"
        });

        assert.equal(result.title, "改写标题");
        assert.equal(calls.length >= 1, true);
        assert.equal(calls.every((item) => item.url === "https://www.dmxapi.cn/v1/chat/completions"), true);
        assert.equal(calls.every((item) => item.model === "claude-sonnet-4-6-ssvip"), true);
        assert.equal(calls.every((item) => item.hasTemperature === false), true);
      } finally {
        globalThis.fetch = originalFetch;
      }
    }
  );
});

test("rewritePostForCompliance repairs lightly broken DMXAPI Claude rewrite JSON payloads", async () => {
  await withEnv(
    {
      REWRITE_PROVIDER: "glm",
      DMXAPI_API_KEY: "dmxapi-test",
      GLM_API_KEY: "",
      KIMI_API_KEY: "",
      DEEPSEEK_API_KEY: ""
    },
    async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async () =>
        createJsonResponse(200, {
          model: "claude-sonnet-4-6-ssvip",
          choices: [
            {
              message: {
                content:
                  '`json { "title": "👩 聊聊女性身心解压与身体关怀的健康科学", "body": "今天不聊高深理论，先从大家第一次选装备时最容易踩的坑聊起。\\n\\n很多人第一次选装备，全凭一腔热血和网页上的加粗大字。", "coverText": "新手第一件装备就选错了？", "tags": ["科普", "沟通"], "rewriteNotes": "改成了更偏教育和健康沟通的表达", "safetyNotes": "避免具体动作教程化描述" }'
              }
            }
          ]
        });

      try {
        const { rewritePostForCompliance } = await importFresh("../src/glm.js");
        const result = await rewritePostForCompliance({
          input: {
            title: "原标题",
            body: "原正文",
            coverText: "原封面",
            tags: ["科普"]
          },
          analysis: {
            verdict: "manual_review",
            finalVerdict: "manual_review",
            score: 42,
            suggestions: ["再收一点表达"]
          },
          modelSelection: "claude-sonnet-4-6-ssvip"
        });

        assert.equal(result.title, "👩 聊聊女性身心解压与身体关怀的健康科学");
        assert.match(result.body, /今天不聊高深理论/);
        assert.equal(result.coverText, "新手第一件装备就选错了？");
        assert.deepEqual(result.tags, ["科普", "沟通"]);
      } finally {
        globalThis.fetch = originalFetch;
      }
    }
  );
});

test("callRoutedTextProviderJson auto-falls through to the next provider when Kimi only returns reasoning", async () => {
  await withEnv(
    {
      REWRITE_PROVIDER: "kimi",
      KIMI_API_KEY: "kimi-test",
      KIMI_BASE_URL: "https://api.moonshot.cn/v1/chat/completions",
      KIMI_TEXT_MODEL: "kimi-k2.6",
      DEEPSEEK_API_KEY: "deepseek-test",
      DEEPSEEK_FEEDBACK_MODEL: "deepseek-v4-flash",
      DMXAPI_API_KEY: "",
      GLM_API_KEY: ""
    },
    async () => {
      const calls = [];
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async (url, options = {}) => {
        const body = JSON.parse(String(options.body || "{}"));
        calls.push({ url: String(url), model: body.model });

        if (body.model === "kimi-k2.6") {
          return createJsonResponse(200, {
            model: "kimi-k2.6",
            choices: [
              {
                message: {
                  reasoning_content: "我先想一下",
                  content: ""
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
                  verdict: "pass",
                  confidence: 0.82
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
          model: "kimi-k2.6",
          messages: [{ role: "user", content: "hello" }],
          timeoutMs: 1000,
          selection: "auto"
        });

        assert.equal(result.model, "deepseek-v4-flash");
        assert.equal(result.route, "official");
        assert.equal(result.routeLabel, "官方");
        assert.equal(calls.at(-1)?.model, "deepseek-v4-flash");
        assert.equal(calls.some((item) => item.model === "kimi-k2.6"), true);
        assert.equal(calls.some((item) => item.model === "deepseek-v4-flash"), true);
      } finally {
        globalThis.fetch = originalFetch;
      }
    }
  );
});

test("callRoutedTextProviderJson re-normalizes temperature for fallback providers", async () => {
  await withEnv(
    {
      REWRITE_PROVIDER: "kimi",
      KIMI_API_KEY: "kimi-test",
      KIMI_BASE_URL: "https://api.moonshot.cn/v1/chat/completions",
      KIMI_TEXT_MODEL: "kimi-k2.6",
      DEEPSEEK_API_KEY: "deepseek-test",
      DEEPSEEK_FEEDBACK_MODEL: "deepseek-v4-flash",
      DMXAPI_API_KEY: "",
      GLM_API_KEY: ""
    },
    async () => {
      const calls = [];
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async (url, options = {}) => {
        const body = JSON.parse(String(options.body || "{}"));
        calls.push({ url: String(url), model: body.model, temperature: body.temperature });

        if (body.model === "kimi-k2.6") {
          return createJsonResponse(200, {
            model: "kimi-k2.6",
            choices: [
              {
                message: {
                  reasoning_content: "我先想一下",
                  content: ""
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
                  verdict: "pass",
                  confidence: 0.82
                })
              }
            }
          ]
        });
      };

      try {
        const { callRoutedTextProviderJson } = await importFresh("../src/glm.js");
        await callRoutedTextProviderJson({
          provider: "kimi",
          model: "kimi-k2.6",
          messages: [{ role: "user", content: "hello" }],
          timeoutMs: 1000,
          temperature: 0.7,
          selection: "auto"
        });

        const deepseekCall = calls.find((item) => item.model === "deepseek-v4-flash");
        assert.equal(deepseekCall?.temperature, 0.6);
      } finally {
        globalThis.fetch = originalFetch;
      }
    }
  );
});

test("runSemanticReview keeps Qwen on DMXAPI only after permission failure", async () => {
  await withEnv(
    {
      DMXAPI_API_KEY: "dmxapi-test",
      GLM_API_KEY: "",
      DEEPSEEK_API_KEY: "",
      QWEN_DMXAPI_MODEL: "qwen3.5-plus"
    },
    async () => {
      const calls = [];
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async (url, options = {}) => {
        const body = JSON.parse(String(options.body || "{}"));
        calls.push({ url: String(url), model: body.model });
        if (body.model === "glm-5.1") {
          return createJsonResponse(500, { error: { message: "glm dmxapi unavailable" } });
        }
        if (String(url) === "https://www.dmxapi.cn/v1/chat/completions") {
          return createJsonResponse(403, { error: { message: "forbidden: model access denied" } });
        }
        throw new Error(`unexpected url: ${String(url)}`);
      };

      try {
        const { runSemanticReview } = await importFresh("../src/semantic-review.js");
        const result = await runSemanticReview({
          input: { title: "测试标题", body: "测试正文", tags: ["关系"] },
          analysis: { verdict: "manual_review", hits: [], suggestions: [] }
        });

        assert.equal(result.status, "unavailable");
        assert.equal(result.review, undefined);
        assert.equal(result.providersTried[1].attemptedRoutes[0].routeLabel, "DMXAPI");
        assert.equal(result.providersTried[1].attemptedRoutes.length, 1);
        assert.ok(
          calls.some(
            (call) =>
              call.url === "https://www.dmxapi.cn/v1/chat/completions" &&
              call.model === "qwen3.5-plus"
          )
        );
        assert.equal(
          calls.some((call) => call.url === "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions"),
          false
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
      GLM_DMXAPI_MODEL: "glm-5.1"
    },
    async () => {
      const calls = [];
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async (url, options = {}) => {
        const body = JSON.parse(String(options.body || "{}"));
        calls.push({ url: String(url), model: body.model });

        return createJsonResponse(200, {
          model: "glm-5.1",
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
        assert.equal(result.review.model, "glm-5.1");
        assert.equal(result.review.route, "dmxapi");
        assert.equal(result.review.routeLabel, "DMXAPI");
        assert.equal(result.providersTried[0].routeLabel, "DMXAPI");
        assert.equal(calls[0].url, "https://www.dmxapi.cn/v1/chat/completions");
        assert.equal(calls[0].model, "glm-5.1");
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
      MINIMAX_DMXAPI_MODEL: "MiniMax-M2.5"
    },
    async () => {
      const calls = [];
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async (url, options = {}) => {
        const body = JSON.parse(String(options.body || "{}"));
        calls.push({ url: String(url), model: body.model });

        return createJsonResponse(200, {
          model: "MiniMax-M2.5",
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

        assert.equal(result.model, "MiniMax-M2.5");
        assert.equal(result.route, "dmxapi");
        assert.equal(result.routeLabel, "DMXAPI");
        assert.deepEqual(calls, [{ url: "https://www.dmxapi.cn/v1/chat/completions", model: "MiniMax-M2.5" }]);
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
      MINIMAX_DMXAPI_MODEL: "MiniMax-M2.5"
    },
    async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async (url, options = {}) => {
        const body = JSON.parse(String(options.body || "{}"));

        if (body.model === "glm-5.1" || body.model === "qwen3.5-plus") {
          return createJsonResponse(500, { error: { message: "upstream unavailable" } });
        }

        if (body.model === "MiniMax-M2.5") {
          return createJsonResponse(200, {
            model: "MiniMax-M2.5",
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
        assert.equal(result.review.model, "MiniMax-M2.5");
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
      GLM_DMXAPI_MODEL: "glm-5.1"
    },
    async () => {
      const calls = [];
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async (url, options = {}) => {
        const body = JSON.parse(String(options.body || "{}"));
        calls.push({ url: String(url), model: body.model, max_tokens: body.max_tokens });

        return createJsonResponse(200, {
          model: "glm-5.1",
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
        assert.equal(calls[0].model, "glm-5.1");
        assert.equal(calls[0].max_tokens, 900);
      } finally {
        globalThis.fetch = originalFetch;
      }
    }
  );
});

test("runSemanticReview includes analysis memory context in the semantic prompt", async () => {
  await withEnv(
    {
      GLM_API_KEY: "glm-test",
      DASHSCOPE_API_KEY: "",
      DEEPSEEK_API_KEY: "",
      DMXAPI_API_KEY: "dmxapi-test",
      GLM_SEMANTIC_MODEL: "glm-4.6v",
      GLM_DMXAPI_MODEL: "glm-5.1"
    },
    async () => {
      const calls = [];
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async (url, options = {}) => {
        const body = JSON.parse(String(options.body || "{}"));
        calls.push({ url: String(url), messages: body.messages });

        return createJsonResponse(200, {
          model: "glm-5.1",
          choices: [
            {
              message: {
                content: JSON.stringify({
                  verdict: "observe",
                  confidence: 0.7,
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
          analysis: {
            verdict: "manual_review",
            hits: [],
            suggestions: [],
            memoryContext: {
              referenceSamples: [
                {
                  title: "关系沟通练习",
                  body: "先讲边界感，再讲沟通方式。"
                }
              ],
              memoryCards: [{ summary: "相似内容里要弱化教程感和刺激感。" }],
              riskFeedback: [{ riskCategories: ["导流与私域"] }],
              falsePositiveHints: [{ title: "中性经验分享可保留" }]
            }
          }
        });

        const userPrompt = String(calls[0]?.messages?.[1]?.content || "");
        assert.match(userPrompt, /共享记忆提示/);
        assert.match(userPrompt, /关系沟通练习/);
        assert.match(userPrompt, /相似内容里要弱化教程感和刺激感/);
        assert.match(userPrompt, /导流与私域/);
        assert.match(userPrompt, /误报保护提示/);
      } finally {
        globalThis.fetch = originalFetch;
      }
    }
  );
});

test("suggestFeedbackCandidates keeps Qwen on DMXAPI only for 400 errors", async () => {
  await withEnv(
    {
      GLM_API_KEY: "",
      DEEPSEEK_API_KEY: "",
      DMXAPI_API_KEY: "dmxapi-test",
      QWEN_DMXAPI_MODEL: "qwen3.5-plus"
    },
    async () => {
      const calls = [];
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async (url) => {
        calls.push(String(url));
        return createJsonResponse(400, { error: { message: "invalid parameter: temperature" } });
      };

      try {
        const { suggestFeedbackCandidates } = await importFresh("../src/glm.js");
        await assert.rejects(
          () =>
            suggestFeedbackCandidates({
              noteContent: "测试文案",
              platformReason: "疑似导流"
            }),
          /DMXAPI|invalid parameter/
        );
        assert.deepEqual(calls, [
          "https://www.dmxapi.cn/v1/chat/completions",
          "https://www.dmxapi.cn/v1/chat/completions"
        ]);
      } finally {
        globalThis.fetch = originalFetch;
      }
    }
  );
});

test("suggestFeedbackCandidates reports Qwen unavailable when DMXAPI is not configured", async () => {
  await withEnv(
    {
      GLM_API_KEY: "",
      DEEPSEEK_API_KEY: "",
      DMXAPI_API_KEY: ""
    },
    async () => {
      const calls = [];
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async (url) => {
        calls.push(String(url));
        throw new Error(`unexpected url: ${String(url)}`);
      };

      try {
        const { suggestFeedbackCandidates } = await importFresh("../src/glm.js");
        await assert.rejects(
          () =>
            suggestFeedbackCandidates({
              noteContent: "测试文案",
              platformReason: "疑似导流"
            }),
          /DMXAPI_API_KEY/
        );
        assert.deepEqual(calls, []);
      } finally {
        globalThis.fetch = originalFetch;
      }
    }
  );
});

test("runCrossModelReview uses official DeepSeek directly for cross review", async () => {
  await withEnv(
    {
      GLM_API_KEY: "",
      DASHSCOPE_API_KEY: "",
      DEEPSEEK_API_KEY: "deepseek-test",
      DMXAPI_API_KEY: "dmxapi-test",
      DEEPSEEK_CROSS_REVIEW_MODEL: "deepseek-v4-flash"
    },
    async () => {
      const calls = [];
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async (url, options = {}) => {
        const body = JSON.parse(String(options.body || "{}"));
        calls.push({ url: String(url), model: body.model });

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

        const deepseekResult = result.providers.find((item) => item.provider === "deepseek");
        assert.equal(deepseekResult.status, "ok");
        assert.equal(deepseekResult.review.model, "deepseek-v4-flash");
        assert.ok(
          calls.some(
            (call) => call.url === "https://api.deepseek.com/chat/completions" && call.model === "deepseek-v4-flash"
          )
        );
        assert.equal(
          calls.some(
            (call) =>
              call.url === "https://www.dmxapi.cn/v1/chat/completions" &&
              call.model === "deepseek-v4-flash"
          ),
          false
        );
      } finally {
        globalThis.fetch = originalFetch;
      }
    }
  );
});

test("runCrossModelReview sends a larger default token budget to official DeepSeek", async () => {
  await withEnv(
    {
      GLM_API_KEY: "",
      DASHSCOPE_API_KEY: "",
      DEEPSEEK_API_KEY: "deepseek-test",
      DMXAPI_API_KEY: "dmxapi-test",
      DEEPSEEK_CROSS_REVIEW_MODEL: "deepseek-v4-flash"
    },
    async () => {
      const calls = [];
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async (url, options = {}) => {
        const body = JSON.parse(String(options.body || "{}"));
        calls.push({ url: String(url), model: body.model, max_tokens: body.max_tokens });

        return createJsonResponse(200, {
          model: "deepseek-v4-flash",
          choices: [
            {
              message: {
                content: JSON.stringify({
                  verdict: "observe",
                  confidence: 0.64,
                  categories: ["边界表达"],
                  reasons: ["dmxapi deepseek ok"],
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

        const deepseekOfficialCall = calls.find(
          (call) =>
            call.url === "https://api.deepseek.com/chat/completions" &&
            call.model === "deepseek-v4-flash"
        );
        assert.ok(deepseekOfficialCall);
        assert.equal(deepseekOfficialCall.max_tokens, 900);
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
