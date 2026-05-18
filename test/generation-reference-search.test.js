import test from "node:test";
import assert from "node:assert/strict";

import {
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

test("normalizeGenerationReferenceMaterialItems caps returned items at 5", () => {
  const items = normalizeGenerationReferenceMaterialItems(
    Array.from({ length: 6 }, (_, index) => ({
      id: `item-${index + 1}`,
      title: `标题${index + 1}`,
      reason: `原因${index + 1}`,
      referenceText: `摘要${index + 1}`,
      sourceUrl: `https://example.com/${index + 1}`
    }))
  );

  assert.equal(items.length, 5);
  assert.deepEqual(
    items.map((item) => item.id),
    ["item-1", "item-2", "item-3", "item-4", "item-5"]
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
        data: [{ type: "function", function: { name: "web_search" } }]
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
    assert.equal(requests[2].url, "https://kimi.test/v1/formulas/moonshot%2Fweb-search%3Alatest/fibers");
    assert.equal(requests[3].url, "https://kimi.test/v1/chat/completions");
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
        data: [{ type: "function", function: { name: "web_search" } }]
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
    assert.equal(requests[2].url, "https://kimi.test/v1/formulas/moonshot%2Fweb-search%3Alatest/fibers");
    assert.equal(requests[3].url, "https://kimi.test/v1/chat/completions");
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

test("generateReferenceMaterials rejects Kimi final JSON when no web search tool call occurred", async () => {
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
        data: [{ type: "function", function: { name: "web_search" } }]
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
    await assert.rejects(
      () =>
        generateReferenceMaterials({
          brief: {
            briefing: "写经期能不能用玩具，轻松一点"
          },
          generateJson: undefined,
          fetchImpl
        }),
      /必须使用 web search 工具完成全网检索/
    );
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
