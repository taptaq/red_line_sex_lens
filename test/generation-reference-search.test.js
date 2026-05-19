import test from "node:test";
import assert from "node:assert/strict";

import {
  buildGenerationReferenceSearchQueries,
  buildGenerationReferenceMaterialSearchPrompt,
  generateReferenceMaterials,
  normalizeGenerationReferenceMaterialItems
} from "../src/generation-workbench.js";

test("normalizeGenerationReferenceMaterialItems keeps compact candidate fields", () => {
  const items = normalizeGenerationReferenceMaterialItems([
    {
      id: " card-1 ",
      title: " 参考标题 ",
      reason: " 适合当前选题 ",
      referenceText: " 一段可摘录的网页参考 ",
      sourceUrl: " https://example.com/reference ",
      ignored: "drop-me"
    }
  ]);

  assert.deepEqual(items, [
    {
      id: "card-1",
      title: "参考标题",
      reason: "适合当前选题",
      referenceText: "一段可摘录的网页参考",
      sourceUrl: "https://example.com/reference"
    }
  ]);
});

test("buildGenerationReferenceMaterialSearchPrompt includes current brief context and the search output requirements", () => {
  const prompt = buildGenerationReferenceMaterialSearchPrompt({
    brief: {
      briefing: "写经期能不能用玩具，轻松一点",
      collectionType: "科普"
    },
    draft: {
      title: "经期也想用？",
      body: "先别急着下结论。"
    }
  });

  assert.match(prompt, /原始一句话需求：写经期能不能用玩具，轻松一点/);
  assert.match(prompt, /全网检索/);
  assert.match(prompt, /referenceText/);
});

test("buildGenerationReferenceSearchQueries splits the brief into multiple search intents", () => {
  const queries = buildGenerationReferenceSearchQueries({
    brief: {
      briefing: "写本文自责（身体探索）后产生定伤、失落、空虚等情绪的正常性，帮助读者理解这是一种常见且正常的心理反应",
      collectionType: "科普",
      constraints: "语气自然，补足心理和安全边界"
    },
    draft: {
      title: "为什么结束后会突然很空？"
    }
  });

  assert.ok(Array.isArray(queries));
  assert.ok(queries.length >= 4);
  assert.ok(queries.length <= 8);
  assert.match(queries[0], /本文自责|身体探索/);
  assert.ok(
    queries.some((query) => /情绪|心理反应|失落|空虚/.test(query)),
    "expected one query to target emotional or psychological context"
  );
  assert.ok(
    queries.some((query) => /边界|提醒|注意|安全/.test(query)),
    "expected one query to target boundary or safety context"
  );
  assert.ok(
    queries.some((query) => /误区|常见误解|误判/.test(query)),
    "expected one query to target common misconceptions"
  );
  assert.ok(
    queries.some((query) => /场景|适合|不适合|暂停/.test(query)),
    "expected one query to target applicable or inapplicable scenarios"
  );
});

test("normalizeGenerationReferenceMaterialItems supports alias fields", () => {
  const items = normalizeGenerationReferenceMaterialItems([
    {
      id: "alias-1",
      title: "别名参考",
      reason: "字段别名也应可用",
      reference_text: "来自别名字段的摘要",
      source_url: "https://example.com/alias"
    }
  ]);

  assert.deepEqual(items, [
    {
      id: "alias-1",
      title: "别名参考",
      reason: "字段别名也应可用",
      referenceText: "来自别名字段的摘要",
      sourceUrl: "https://example.com/alias"
    }
  ]);
});

test("normalizeGenerationReferenceMaterialItems deduplicates near-identical search results with different source urls", () => {
  const items = normalizeGenerationReferenceMaterialItems([
    {
      id: "dup-1",
      title: "【自慰正常吗】 - 大众医疗",
      reason: "补充基础认知",
      referenceText: "自慰是一种正常的性行为，通常被认为是个人性健康的一部分。",
      sourceUrl: "https://www.cndzys.com/xshcore/quanwei_ztart/1es_2680286.html"
    },
    {
      id: "dup-2",
      title: "【自慰正常吗】 - 大众医疗",
      reason: "补充基础认知",
      referenceText: "自慰是一种正常的性行为，通常被认为是个人性健康的一部分。",
      sourceUrl: "https://www.cndzys.com/xshcore/quanwei_ztart/1es_3191023.html"
    },
    {
      id: "unique-1",
      title: "自慰后情绪低落是什么",
      reason: "补充情绪反应解释",
      referenceText: "情绪低落未必异常，可能与激素波动和心理因素有关。",
      sourceUrl: "https://example.com/pcd"
    }
  ]);

  assert.equal(items.length, 2);
  assert.deepEqual(
    items.map((item) => item.title),
    ["【自慰正常吗】 - 大众医疗", "自慰后情绪低落是什么"]
  );
});

test("normalizeGenerationReferenceMaterialItems drops incomplete and invalid candidates", () => {
  const items = normalizeGenerationReferenceMaterialItems([
    {
      id: "missing-reference",
      title: "缺少参考文本",
      reason: "不完整",
      sourceUrl: "https://example.com/a"
    },
    {
      id: "invalid-url",
      title: "链接不合法",
      reason: "不应保留",
      referenceText: "有内容",
      sourceUrl: "ftp://example.com/a"
    },
    {
      id: "valid-item",
      title: "有效候选",
      reason: "字段完整",
      referenceText: "可作为摘录参考",
      url: "https://example.com/valid"
    }
  ]);

  assert.deepEqual(items, [
    {
      id: "valid-item",
      title: "有效候选",
      reason: "字段完整",
      referenceText: "可作为摘录参考",
      sourceUrl: "https://example.com/valid"
    }
  ]);
});

test("normalizeGenerationReferenceMaterialItems drops malformed absolute urls", () => {
  const items = normalizeGenerationReferenceMaterialItems([
    {
      id: "empty-host",
      title: "空 host",
      reason: "格式不完整",
      referenceText: "无效链接",
      sourceUrl: "https://"
    },
    {
      id: "space-host",
      title: "空白 host",
      reason: "格式不完整",
      referenceText: "无效链接",
      sourceUrl: "https:// "
    },
    {
      id: "valid-item",
      title: "有效链接",
      reason: "格式完整",
      referenceText: "应当保留",
      sourceUrl: "https://example.com/ok"
    }
  ]);

  assert.deepEqual(items, [
    {
      id: "valid-item",
      title: "有效链接",
      reason: "格式完整",
      referenceText: "应当保留",
      sourceUrl: "https://example.com/ok"
    }
  ]);
});

test("generateReferenceMaterials falls back to payload.references", async () => {
  const result = await generateReferenceMaterials({
    brief: {
      briefing: "写经期能不能用玩具，轻松一点"
    },
    generateJson: async () => ({
      references: [
        {
          title: "参考回退项",
          reason: "兼容旧字段",
          referenceText: "从 references 字段读取",
          sourceUrl: "https://example.com/fallback"
        }
      ],
      provider: "mock",
      model: "mock-model"
    })
  });

  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].title, "参考回退项");
});

test("normalizeGenerationReferenceMaterialItems caps returned items at 10", () => {
  const items = normalizeGenerationReferenceMaterialItems(
    Array.from({ length: 11 }, (_, index) => ({
      id: `item-${index + 1}`,
      title: `标题${index + 1}`,
      reason: `原因${index + 1}`,
      referenceText: `摘要${index + 1}`,
      sourceUrl: `https://example.com/${index + 1}`
    }))
  );

  assert.equal(items.length, 10);
  assert.deepEqual(
    items.map((item) => item.id),
    ["item-1", "item-2", "item-3", "item-4", "item-5", "item-6", "item-7", "item-8", "item-9", "item-10"]
  );
});

test("generateReferenceMaterials runs the Kimi web-search tool loop and preserves metadata", async () => {
  const originalApiKey = process.env.KIMI_API_KEY;
  const originalBaseUrl = process.env.KIMI_BASE_URL;
  const originalModel = process.env.KIMI_TEXT_MODEL;
  process.env.KIMI_API_KEY = "test-kimi-key";
  process.env.KIMI_BASE_URL = "https://kimi.test/v1";
  process.env.KIMI_TEXT_MODEL = "kimi-test-model";

  const responses = [
    {
      ok: true,
      json: async () => ({
        data: [
          {
            type: "function",
            function: {
              name: "web_search",
              description: "Search the web for up-to-date information.",
              parameters: {
                type: "object",
                properties: {
                  query: {
                    type: "string"
                  }
                },
                required: ["query"]
              }
            }
          }
        ]
      })
    },
    {
      ok: true,
      json: async () => ({
        model: "kimi-test-model-live",
        choices: [
          {
            message: {
              role: "assistant",
              content: "",
              tool_calls: [
                {
                  id: "tool-call-1",
                  type: "function",
                  function: {
                    name: "web_search",
                    arguments: "{\"query\":\"经期能不能用玩具\"}"
                  }
                }
              ]
            }
          }
        ]
      })
    },
    {
      ok: true,
      json: async () => ({
        data: {
          results: [{ title: "网页结果" }],
          context: { encrypted_output: "cipher-text" }
        }
      })
    },
    {
      ok: true,
      json: async () => ({
        model: "kimi-test-model-live",
        choices: [
          {
            message: {
              role: "assistant",
              content: JSON.stringify({
                items: [
                  {
                    title: "官方网页参考",
                    reason: "补足安全边界",
                    referenceText: "经期使用前要结合身体状态、清洁和不适感判断。",
                    sourceUrl: "https://example.com/kimi-reference"
                  }
                ],
                message: "已完成全网检索"
              })
            }
          }
        ]
      })
    }
  ];
  const requests = [];
  const fetchImpl = async (url, options = {}) => {
    requests.push({
      url,
      method: options.method || "GET",
      body: options.body ? JSON.parse(options.body) : null
    });
    const next = responses.shift();

    if (!next) {
      throw new Error(`Unexpected fetch call: ${url}`);
    }

    return next;
  };

  try {
    const result = await generateReferenceMaterials({
      brief: {
        briefing: "写经期能不能用玩具，轻松一点"
      },
      generateJson: undefined,
      fetchImpl
    });

    assert.equal(result.items.length, 1);
    assert.equal(result.items[0].title, "官方网页参考");
    assert.equal(result.message, "已完成全网检索");
    assert.equal(result.provider, "kimi");
    assert.equal(result.model, "kimi-test-model-live");
    assert.equal(result.modelTrace.route, "official");
    assert.equal(result.modelTrace.routeLabel, "Kimi web search");
    assert.deepEqual(result.modelTrace.attemptedRoutes, ["kimi-official-web-search"]);
    assert.equal(requests[0].url, "https://kimi.test/v1/formulas/moonshot%2Fweb-search%3Alatest/tools");
    assert.equal(requests[1].url, "https://kimi.test/v1/chat/completions");
    assert.equal("temperature" in requests[1].body, false);
    assert.equal("response_format" in requests[1].body, false);
    assert.equal(requests[2].url, "https://kimi.test/v1/formulas/moonshot%2Fweb-search%3Alatest/fibers");
    assert.deepEqual(requests[2].body, {
      name: "web_search",
      arguments: "{\"query\":\"经期能不能用玩具\"}"
    });
    assert.equal(requests[3].url, "https://kimi.test/v1/chat/completions");
    assert.equal("temperature" in requests[3].body, false);
    assert.equal("response_format" in requests[3].body, false);
    assert.equal(requests[3].body.messages.at(-1).role, "tool");
    assert.equal(requests[3].body.messages.at(-1).tool_call_id, "tool-call-1");
    assert.equal(requests[3].body.messages.at(-1).content, "cipher-text");
  } finally {
    if (originalApiKey === undefined) {
      delete process.env.KIMI_API_KEY;
    } else {
      process.env.KIMI_API_KEY = originalApiKey;
    }

    if (originalBaseUrl === undefined) {
      delete process.env.KIMI_BASE_URL;
    } else {
      process.env.KIMI_BASE_URL = originalBaseUrl;
    }

    if (originalModel === undefined) {
      delete process.env.KIMI_TEXT_MODEL;
    } else {
      process.env.KIMI_TEXT_MODEL = originalModel;
    }
  }
});

test("generateReferenceMaterials normalizes a KIMI_BASE_URL ending in /chat/completions", async () => {
  const originalApiKey = process.env.KIMI_API_KEY;
  const originalBaseUrl = process.env.KIMI_BASE_URL;
  const originalModel = process.env.KIMI_TEXT_MODEL;
  process.env.KIMI_API_KEY = "test-kimi-key";
  process.env.KIMI_BASE_URL = "https://kimi.test/v1/chat/completions";
  process.env.KIMI_TEXT_MODEL = "kimi-test-model";

  const responses = [
    {
      ok: true,
      json: async () => ({
        data: [
          {
            type: "function",
            function: {
              name: "web_search",
              description: "Search the web for up-to-date information.",
              parameters: {
                type: "object",
                properties: {
                  query: {
                    type: "string"
                  }
                },
                required: ["query"]
              }
            }
          }
        ]
      })
    },
    {
      ok: true,
      json: async () => ({
        model: "kimi-test-model-live",
        choices: [
          {
            message: {
              role: "assistant",
              content: "",
              tool_calls: [
                {
                  id: "tool-call-1",
                  type: "function",
                  function: {
                    name: "web_search",
                    arguments: "{\"query\":\"经期能不能用玩具\"}"
                  }
                }
              ]
            }
          }
        ]
      })
    },
    {
      ok: true,
      json: async () => ({
        data: {
          results: [{ title: "网页结果" }],
          context: { encrypted_output: "cipher-text" }
        }
      })
    },
    {
      ok: true,
      json: async () => ({
        model: "kimi-test-model-live",
        choices: [
          {
            message: {
              role: "assistant",
              content: JSON.stringify({
                items: [
                  {
                    title: "官方网页参考",
                    reason: "补足安全边界",
                    referenceText: "经期使用前要结合身体状态、清洁和不适感判断。",
                    sourceUrl: "https://example.com/kimi-reference"
                  }
                ],
                message: "已完成全网检索"
              })
            }
          }
        ]
      })
    }
  ];
  const requests = [];
  const fetchImpl = async (url, options = {}) => {
    requests.push({
      url,
      method: options.method || "GET",
      body: options.body ? JSON.parse(options.body) : null
    });
    const next = responses.shift();

    if (!next) {
      throw new Error(`Unexpected fetch call: ${url}`);
    }

    return next;
  };

  try {
    const result = await generateReferenceMaterials({
      brief: {
        briefing: "写经期能不能用玩具，轻松一点"
      },
      generateJson: undefined,
      fetchImpl
    });

    assert.equal(result.items.length, 1);
    assert.equal(requests[0].url, "https://kimi.test/v1/formulas/moonshot%2Fweb-search%3Alatest/tools");
    assert.equal(requests[1].url, "https://kimi.test/v1/chat/completions");
    assert.equal("temperature" in requests[1].body, false);
    assert.equal("response_format" in requests[1].body, false);
    assert.equal(requests[2].url, "https://kimi.test/v1/formulas/moonshot%2Fweb-search%3Alatest/fibers");
    assert.deepEqual(requests[2].body, {
      name: "web_search",
      arguments: "{\"query\":\"经期能不能用玩具\"}"
    });
    assert.equal(requests[3].url, "https://kimi.test/v1/chat/completions");
    assert.equal("temperature" in requests[3].body, false);
    assert.equal("response_format" in requests[3].body, false);
    assert.equal(requests[3].body.messages.at(-1).content, "cipher-text");
  } finally {
    if (originalApiKey === undefined) {
      delete process.env.KIMI_API_KEY;
    } else {
      process.env.KIMI_API_KEY = originalApiKey;
    }

    if (originalBaseUrl === undefined) {
      delete process.env.KIMI_BASE_URL;
    } else {
      process.env.KIMI_BASE_URL = originalBaseUrl;
    }

    if (originalModel === undefined) {
      delete process.env.KIMI_TEXT_MODEL;
    } else {
      process.env.KIMI_TEXT_MODEL = originalModel;
    }
  }
});

test("generateReferenceMaterials retries Kimi once and falls back to Tencent-Search when no web search tool call occurred", async () => {
  const originalApiKey = process.env.KIMI_API_KEY;
  const originalBaseUrl = process.env.KIMI_BASE_URL;
  const originalModel = process.env.KIMI_TEXT_MODEL;
  const originalDmxApiKey = process.env.DMXAPI_API_KEY;
  process.env.KIMI_API_KEY = "test-kimi-key";
  process.env.KIMI_BASE_URL = "https://kimi.test/v1";
  process.env.KIMI_TEXT_MODEL = "kimi-test-model";
  process.env.DMXAPI_API_KEY = "test-dmx-key";

  const responses = [
    {
      ok: true,
      json: async () => ({
        data: [
          {
            type: "function",
            function: {
              name: "web_search",
              description: "Search the web for up-to-date information.",
              parameters: {
                type: "object",
                properties: {
                  query: {
                    type: "string"
                  }
                },
                required: ["query"]
              }
            }
          }
        ]
      })
    },
    {
      ok: true,
      json: async () => ({
        model: "kimi-test-model-live",
        choices: [
          {
            message: {
              role: "assistant",
              content: JSON.stringify({
                items: [
                  {
                    title: "模型自说自话的参考",
                    reason: "没有检索也给了答案",
                    referenceText: "这条结果不该被接受。",
                    sourceUrl: "https://example.com/not-allowed"
                  }
                ]
              })
            }
          }
        ]
      })
    },
    {
      ok: true,
      json: async () => ({
        model: "kimi-test-model-live",
        choices: [
          {
            message: {
              role: "assistant",
              content: JSON.stringify({
                items: [
                  {
                    title: "仍未搜索的参考",
                    reason: "第二次也没调工具",
                    referenceText: "这条结果也不该被接受。",
                    sourceUrl: "https://example.com/not-allowed-twice"
                  }
                ]
              })
            }
          }
        ]
      })
    },
    {
      ok: true,
      json: async () => ({
        Response: {
          Pages: [
            {
              title: "腾讯联网搜索结果",
              passage: "经期是否适合使用需要结合身体状态、清洁和不适感来判断。",
              url: "https://example.com/tencent-search",
              site: "示例站点",
              date: "2026-05-18 10:00:00"
            }
          ]
        }
      })
    },
    {
      ok: true,
      json: async () => ({
        Response: {
          Pages: [
            {
              title: "经期使用时的边界提醒",
              passage: "如果有明显不适、疼痛或感染风险提示，应优先暂停并关注身体反馈。",
              url: "https://example.com/tencent-search-safety",
              site: "第二示例站点",
              date: "2026-05-18 11:00:00"
            }
          ]
        }
      })
    },
    {
      ok: true,
      json: async () => ({
        Response: {
          Pages: []
        }
      })
    },
    {
      ok: true,
      json: async () => ({
        Response: {
          Pages: []
        }
      })
    },
    {
      ok: true,
      json: async () => ({
        Response: {
          Pages: []
        }
      })
    },
    {
      ok: true,
      json: async () => ({
        Response: {
          Pages: []
        }
      })
    },
    {
      ok: true,
      json: async () => ({
        Response: {
          Pages: []
        }
      })
    },
    {
      ok: true,
      json: async () => ({
        Response: {
          Pages: []
        }
      })
    }
  ];
  const requests = [];

  const fetchImpl = async (url, options = {}) => {
    requests.push({
      url,
      method: options.method || "GET",
      body: options.body ? JSON.parse(options.body) : null,
      headers: options.headers || {}
    });
    const next = responses.shift();

    if (!next) {
      throw new Error(`Unexpected fetch call: ${url}`);
    }

    return next;
  };

  try {
    const result = await generateReferenceMaterials({
      brief: {
        briefing: "写经期能不能用玩具，轻松一点"
      },
      generateJson: undefined,
      fetchImpl
    });

    assert.equal(result.provider, "tencent-search");
    assert.equal(result.model, "Tencent-Search");
    assert.equal(result.items.length, 2);
    assert.deepEqual(result.modelTrace.attemptedRoutes, ["kimi-official-web-search", "dmxapi-tencent-search"]);
    assert.equal(requests[1].url, "https://kimi.test/v1/chat/completions");
    assert.equal(requests[2].url, "https://kimi.test/v1/chat/completions");
    assert.match(String(requests[2].body.messages.at(-1).content || ""), /请先调用 web search 工具/);
    assert.equal(requests[3].url, "https://www.dmxapi.cn/v1/responses");
    assert.equal(requests[4].url, "https://www.dmxapi.cn/v1/responses");
    assert.equal(requests[5].url, "https://www.dmxapi.cn/v1/responses");
    assert.equal(requests[6].url, "https://www.dmxapi.cn/v1/responses");
    assert.equal(requests[7].url, "https://www.dmxapi.cn/v1/responses");
    assert.equal(requests[8].url, "https://www.dmxapi.cn/v1/responses");
    assert.equal(requests[9].url, "https://www.dmxapi.cn/v1/responses");
    assert.equal(requests[10].url, "https://www.dmxapi.cn/v1/responses");
    assert.equal(requests[3].body.model, "Tencent-Search");
    assert.equal(result.message, "已基于拆分后的检索意图整理参考资料候选。");
  } finally {
    if (originalApiKey === undefined) {
      delete process.env.KIMI_API_KEY;
    } else {
      process.env.KIMI_API_KEY = originalApiKey;
    }

    if (originalBaseUrl === undefined) {
      delete process.env.KIMI_BASE_URL;
    } else {
      process.env.KIMI_BASE_URL = originalBaseUrl;
    }

    if (originalModel === undefined) {
      delete process.env.KIMI_TEXT_MODEL;
    } else {
      process.env.KIMI_TEXT_MODEL = originalModel;
    }

    if (originalDmxApiKey === undefined) {
      delete process.env.DMXAPI_API_KEY;
    } else {
      process.env.DMXAPI_API_KEY = originalDmxApiKey;
    }
  }
});

test("generateReferenceMaterials accepts Kimi tool definitions returned under tools", async () => {
  const originalApiKey = process.env.KIMI_API_KEY;
  const originalBaseUrl = process.env.KIMI_BASE_URL;
  const originalModel = process.env.KIMI_TEXT_MODEL;
  process.env.KIMI_API_KEY = "test-kimi-key";
  process.env.KIMI_BASE_URL = "https://kimi.test/v1";
  process.env.KIMI_TEXT_MODEL = "kimi-test-model";

  const responses = [
    {
      ok: true,
      json: async () => ({
        tools: [
          {
            type: "function",
            function: {
              name: "web_search",
              description: "Search the web for up-to-date information.",
              parameters: {
                type: "object",
                properties: {
                  query: {
                    type: "string"
                  }
                },
                required: ["query"]
              }
            }
          }
        ]
      })
    },
    {
      ok: true,
      json: async () => ({
        model: "kimi-test-model-live",
        choices: [
          {
            message: {
              role: "assistant",
              content: "",
              tool_calls: [
                {
                  id: "tool-call-1",
                  type: "function",
                  function: {
                    name: "web_search",
                    arguments: "{\"query\":\"经期能不能用玩具\"}"
                  }
                }
              ]
            }
          }
        ]
      })
    },
    {
      ok: true,
      json: async () => ({
        data: {
          context: { output: "plain-tool-output" }
        }
      })
    },
    {
      ok: true,
      json: async () => ({
        model: "kimi-test-model-live",
        choices: [
          {
            message: {
              role: "assistant",
              content: JSON.stringify({
                items: [
                  {
                    title: "官方网页参考",
                    reason: "补足安全边界",
                    referenceText: "经期使用前要结合身体状态、清洁和不适感判断。",
                    sourceUrl: "https://example.com/kimi-reference"
                  }
                ]
              })
            }
          }
        ]
      })
    }
  ];
  const requests = [];

  const fetchImpl = async (url, options = {}) => {
    requests.push({
      url,
      method: options.method || "GET",
      body: options.body ? JSON.parse(options.body) : null
    });
    const next = responses.shift();

    if (!next) {
      throw new Error(`Unexpected fetch call: ${url}`);
    }

    return next;
  };

  try {
    const result = await generateReferenceMaterials({
      brief: {
        briefing: "写经期能不能用玩具，轻松一点"
      },
      generateJson: undefined,
      fetchImpl
    });

    assert.equal(result.items.length, 1);
    assert.equal(result.provider, "kimi");
    assert.equal(requests[2].url, "https://kimi.test/v1/formulas/moonshot%2Fweb-search%3Alatest/fibers");
    assert.deepEqual(requests[2].body, {
      name: "web_search",
      arguments: "{\"query\":\"经期能不能用玩具\"}"
    });
    assert.equal(requests[3].body.messages.at(-1).content, "plain-tool-output");
  } finally {
    if (originalApiKey === undefined) {
      delete process.env.KIMI_API_KEY;
    } else {
      process.env.KIMI_API_KEY = originalApiKey;
    }

    if (originalBaseUrl === undefined) {
      delete process.env.KIMI_BASE_URL;
    } else {
      process.env.KIMI_BASE_URL = originalBaseUrl;
    }

    if (originalModel === undefined) {
      delete process.env.KIMI_TEXT_MODEL;
    } else {
      process.env.KIMI_TEXT_MODEL = originalModel;
    }
  }
});

test("generateReferenceMaterials falls back to Tencent-Search when Kimi web search fails", async () => {
  const originalKimiApiKey = process.env.KIMI_API_KEY;
  const originalKimiBaseUrl = process.env.KIMI_BASE_URL;
  const originalKimiModel = process.env.KIMI_TEXT_MODEL;
  const originalDmxApiKey = process.env.DMXAPI_API_KEY;
  process.env.KIMI_API_KEY = "test-kimi-key";
  process.env.KIMI_BASE_URL = "https://kimi.test/v1";
  process.env.KIMI_TEXT_MODEL = "kimi-test-model";
  process.env.DMXAPI_API_KEY = "test-dmx-key";

  const requests = [];
  const responses = [
    {
      ok: false,
      status: 500,
      json: async () => ({
        error: {
          message: "Kimi search unavailable"
        }
      })
    },
    {
      ok: true,
      json: async () => ({
        Response: {
          RequestId: "req-1",
          Pages: [
            {
              title: "腾讯联网搜索结果",
              passage: "经期是否适合使用需要结合身体状态、清洁和不适感来判断。",
              url: "https://example.com/tencent-search",
              site: "示例站点",
              date: "2026-05-18 10:00:00"
            }
          ]
        }
      })
    },
    {
      ok: true,
      json: async () => ({
        Response: {
          RequestId: "req-2",
          Pages: [
            {
              title: "经期使用时的边界提醒",
              passage: "如果有明显不适、疼痛或感染风险提示，应优先暂停并关注身体反馈。",
              url: "https://example.com/tencent-search-safety",
              site: "第二示例站点",
              date: "2026-05-18 11:00:00"
            }
          ]
        }
      })
    },
    {
      ok: true,
      json: async () => ({
        Response: {
          RequestId: "req-2",
          Pages: [
            {
              title: "经期使用时的边界提醒",
              passage: "如果有明显不适、疼痛或感染风险提示，应优先暂停并关注身体反馈。",
              url: "https://example.com/tencent-search-safety",
              site: "第二示例站点",
              date: "2026-05-18 11:00:00"
            }
          ]
        }
      })
    },
    {
      ok: true,
      json: async () => ({
        Response: {
          RequestId: "req-3",
          Pages: []
        }
      })
    },
    {
      ok: true,
      json: async () => ({
        Response: {
          RequestId: "req-4",
          Pages: []
        }
      })
    },
    {
      ok: true,
      json: async () => ({
        Response: {
          RequestId: "req-5",
          Pages: []
        }
      })
    },
    {
      ok: true,
      json: async () => ({
        Response: {
          RequestId: "req-6",
          Pages: []
        }
      })
    },
    {
      ok: true,
      json: async () => ({
        Response: {
          RequestId: "req-7",
          Pages: []
        }
      })
    },
    {
      ok: true,
      json: async () => ({
        Response: {
          RequestId: "req-8",
          Pages: []
        }
      })
    }
  ];

  const fetchImpl = async (url, options = {}) => {
    requests.push({
      url,
      method: options.method || "GET",
      body: options.body ? JSON.parse(options.body) : null,
      headers: options.headers || {}
    });
    const next = responses.shift();

    if (!next) {
      throw new Error(`Unexpected fetch call: ${url}`);
    }

    return next;
  };

  try {
    const result = await generateReferenceMaterials({
      brief: {
        briefing: "经期能不能用玩具"
      },
      generateJson: undefined,
      fetchImpl
    });

    assert.equal(result.provider, "tencent-search");
    assert.equal(result.model, "Tencent-Search");
    assert.equal(result.modelTrace.route, "dmxapi");
    assert.equal(result.modelTrace.routeLabel, "Tencent-Search fallback");
    assert.deepEqual(result.modelTrace.attemptedRoutes, ["kimi-official-web-search", "dmxapi-tencent-search"]);
    assert.equal(result.items.length, 2);
    assert.equal(result.items[0].title, "腾讯联网搜索结果");
    assert.equal(result.items[1].title, "经期使用时的边界提醒");
    assert.match(result.items[0].reason, /联网搜索|示例站点/);
    assert.equal(result.message, "已基于拆分后的检索意图整理参考资料候选。");
    assert.equal(requests[0].url, "https://kimi.test/v1/formulas/moonshot%2Fweb-search%3Alatest/tools");
    assert.equal(requests[1].url, "https://www.dmxapi.cn/v1/responses");
    assert.equal(requests[2].url, "https://www.dmxapi.cn/v1/responses");
    assert.equal(requests[3].url, "https://www.dmxapi.cn/v1/responses");
    assert.equal(requests[4].url, "https://www.dmxapi.cn/v1/responses");
    assert.equal(requests[5].url, "https://www.dmxapi.cn/v1/responses");
    assert.equal(requests[6].url, "https://www.dmxapi.cn/v1/responses");
    assert.equal(requests[7].url, "https://www.dmxapi.cn/v1/responses");
    assert.equal(requests[8].url, "https://www.dmxapi.cn/v1/responses");
    assert.equal(requests[1].body.model, "Tencent-Search");
    assert.notEqual(requests[1].body.input, "经期能不能用玩具");
    assert.notEqual(requests[2].body.input, "经期能不能用玩具");
    assert.match(requests[1].body.input, /经期|玩具/);
    assert.ok(
      [requests[1], requests[2], requests[3], requests[4]].some((request) =>
        /边界|提醒|暂停|不适|安全/.test(String(request?.body?.input || ""))
      )
    );
    assert.equal(requests[1].headers.Authorization, "test-dmx-key");
  } finally {
    if (originalKimiApiKey === undefined) {
      delete process.env.KIMI_API_KEY;
    } else {
      process.env.KIMI_API_KEY = originalKimiApiKey;
    }

    if (originalKimiBaseUrl === undefined) {
      delete process.env.KIMI_BASE_URL;
    } else {
      process.env.KIMI_BASE_URL = originalKimiBaseUrl;
    }

    if (originalKimiModel === undefined) {
      delete process.env.KIMI_TEXT_MODEL;
    } else {
      process.env.KIMI_TEXT_MODEL = originalKimiModel;
    }

    if (originalDmxApiKey === undefined) {
      delete process.env.DMXAPI_API_KEY;
    } else {
      process.env.DMXAPI_API_KEY = originalDmxApiKey;
    }
  }
});

test("generateReferenceMaterials parses Tencent-Search pages when each page is a JSON string", async () => {
  const originalKimiApiKey = process.env.KIMI_API_KEY;
  const originalKimiBaseUrl = process.env.KIMI_BASE_URL;
  const originalKimiModel = process.env.KIMI_TEXT_MODEL;
  const originalDmxApiKey = process.env.DMXAPI_API_KEY;
  process.env.KIMI_API_KEY = "test-kimi-key";
  process.env.KIMI_BASE_URL = "https://kimi.test/v1";
  process.env.KIMI_TEXT_MODEL = "kimi-test-model";
  process.env.DMXAPI_API_KEY = "test-dmx-key";

  const responses = [
    {
      ok: false,
      status: 500,
      json: async () => ({
        error: {
          message: "Kimi search unavailable"
        }
      })
    },
    {
      ok: true,
      json: async () => ({
        Response: {
          RequestId: "req-1",
          Pages: [
            JSON.stringify({
              title: "腾讯联网搜索结果",
              passage: "经期是否适合使用需要结合身体状态、清洁和不适感来判断。",
              url: "https://example.com/tencent-search",
              site: "示例站点",
              date: "2026-05-18 10:00:00"
            })
          ]
        }
      })
    },
    {
      ok: true,
      json: async () => ({
        Response: {
          RequestId: "req-2",
          Pages: []
        }
      })
    },
    {
      ok: true,
      json: async () => ({
        Response: {
          RequestId: "req-3",
          Pages: []
        }
      })
    },
    {
      ok: true,
      json: async () => ({
        Response: {
          RequestId: "req-4",
          Pages: []
        }
      })
    },
    {
      ok: true,
      json: async () => ({
        Response: {
          RequestId: "req-5",
          Pages: []
        }
      })
    },
    {
      ok: true,
      json: async () => ({
        Response: {
          RequestId: "req-6",
          Pages: []
        }
      })
    },
    {
      ok: true,
      json: async () => ({
        Response: {
          RequestId: "req-7",
          Pages: []
        }
      })
    },
    {
      ok: true,
      json: async () => ({
        Response: {
          RequestId: "req-8",
          Pages: []
        }
      })
    }
  ];

  const fetchImpl = async (url) => {
    const next = responses.shift();

    if (!next) {
      throw new Error(`Unexpected fetch call: ${url}`);
    }

    return next;
  };

  try {
    const result = await generateReferenceMaterials({
      brief: {
        briefing: "经期能不能用玩具"
      },
      generateJson: undefined,
      fetchImpl
    });

    assert.equal(result.provider, "tencent-search");
    assert.equal(result.items.length, 1);
    assert.equal(result.items[0].title, "腾讯联网搜索结果");
    assert.equal(result.items[0].sourceUrl, "https://example.com/tencent-search");
  } finally {
    if (originalKimiApiKey === undefined) {
      delete process.env.KIMI_API_KEY;
    } else {
      process.env.KIMI_API_KEY = originalKimiApiKey;
    }

    if (originalKimiBaseUrl === undefined) {
      delete process.env.KIMI_BASE_URL;
    } else {
      process.env.KIMI_BASE_URL = originalKimiBaseUrl;
    }

    if (originalKimiModel === undefined) {
      delete process.env.KIMI_TEXT_MODEL;
    } else {
      process.env.KIMI_TEXT_MODEL = originalKimiModel;
    }

    if (originalDmxApiKey === undefined) {
      delete process.env.DMXAPI_API_KEY;
    } else {
      process.env.DMXAPI_API_KEY = originalDmxApiKey;
    }
  }
});

test("generateReferenceMaterials expands Tencent fallback queries to improve result coverage", async () => {
  const originalKimiApiKey = process.env.KIMI_API_KEY;
  const originalKimiBaseUrl = process.env.KIMI_BASE_URL;
  const originalKimiModel = process.env.KIMI_TEXT_MODEL;
  const originalDmxApiKey = process.env.DMXAPI_API_KEY;
  process.env.KIMI_API_KEY = "test-kimi-key";
  process.env.KIMI_BASE_URL = "https://kimi.test/v1";
  process.env.KIMI_TEXT_MODEL = "kimi-test-model";
  process.env.DMXAPI_API_KEY = "test-dmx-key";

  const requests = [];
  const responses = [
    {
      ok: false,
      status: 500,
      json: async () => ({
        error: {
          message: "Kimi search unavailable"
        }
      })
    },
    {
      ok: true,
      json: async () => ({
        Response: {
          RequestId: "req-1",
          Pages: [
            {
              title: "结果 1",
              passage: "资料 1",
              url: "https://example.com/1",
              site: "站点 1",
              date: "2026-05-19 10:00:00"
            }
          ]
        }
      })
    },
    {
      ok: true,
      json: async () => ({
        Response: {
          RequestId: "req-2",
          Pages: [
            {
              title: "结果 2",
              passage: "资料 2",
              url: "https://example.com/2",
              site: "站点 2",
              date: "2026-05-19 10:01:00"
            }
          ]
        }
      })
    },
    {
      ok: true,
      json: async () => ({
        Response: {
          RequestId: "req-3",
          Pages: [
            {
              title: "结果 3",
              passage: "资料 3",
              url: "https://example.com/3",
              site: "站点 3",
              date: "2026-05-19 10:02:00"
            }
          ]
        }
      })
    },
    {
      ok: true,
      json: async () => ({
        Response: {
          RequestId: "req-4",
          Pages: [
            {
              title: "结果 4",
              passage: "资料 4",
              url: "https://example.com/4",
              site: "站点 4",
              date: "2026-05-19 10:03:00"
            }
          ]
        }
      })
    },
    {
      ok: true,
      json: async () => ({
        Response: {
          RequestId: "req-5",
          Pages: [
            {
              title: "结果 5",
              passage: "资料 5",
              url: "https://example.com/5",
              site: "站点 5",
              date: "2026-05-19 10:04:00"
            }
          ]
        }
      })
    },
    {
      ok: true,
      json: async () => ({
        Response: {
          RequestId: "req-6",
          Pages: [
            {
              title: "结果 6",
              passage: "资料 6",
              url: "https://example.com/6",
              site: "站点 6",
              date: "2026-05-19 10:05:00"
            }
          ]
        }
      })
    },
    {
      ok: true,
      json: async () => ({
        Response: {
          RequestId: "req-7",
          Pages: []
        }
      })
    },
    {
      ok: true,
      json: async () => ({
        Response: {
          RequestId: "req-8",
          Pages: []
        }
      })
    }
  ];

  const fetchImpl = async (url, options = {}) => {
    requests.push({
      url,
      method: options.method || "GET",
      body: options.body ? JSON.parse(options.body) : null
    });
    const next = responses.shift();

    if (!next) {
      throw new Error(`Unexpected fetch call: ${url}`);
    }

    return next;
  };

  try {
    const result = await generateReferenceMaterials({
      brief: {
        briefing: "写本文自责（身体探索）后产生定伤、失落、空虚等情绪的正常性"
      },
      draft: {
        title: "为什么结束后会突然很空？"
      },
      generateJson: undefined,
      fetchImpl
    });

    assert.equal(result.provider, "tencent-search");
    assert.equal(result.items.length, 6);
    assert.equal(requests.length, 9);
    assert.ok(
      requests.slice(1).some((request) => /误区|常见误解|误判/.test(String(request?.body?.input || "")))
    );
    assert.ok(
      requests.slice(1).some((request) => /场景|适合|不适合|暂停/.test(String(request?.body?.input || "")))
    );
  } finally {
    if (originalKimiApiKey === undefined) {
      delete process.env.KIMI_API_KEY;
    } else {
      process.env.KIMI_API_KEY = originalKimiApiKey;
    }

    if (originalKimiBaseUrl === undefined) {
      delete process.env.KIMI_BASE_URL;
    } else {
      process.env.KIMI_BASE_URL = originalKimiBaseUrl;
    }

    if (originalKimiModel === undefined) {
      delete process.env.KIMI_TEXT_MODEL;
    } else {
      process.env.KIMI_TEXT_MODEL = originalKimiModel;
    }

    if (originalDmxApiKey === undefined) {
      delete process.env.DMXAPI_API_KEY;
    } else {
      process.env.DMXAPI_API_KEY = originalDmxApiKey;
    }
  }
});
