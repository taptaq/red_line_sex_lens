import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";

import { safeHandleRequest } from "../src/server.js";

function createJsonResponse(payload, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() {
      return payload;
    }
  };
}

async function invokeRoute(method, pathname, body = null) {
  const request = new EventEmitter();
  request.method = method;
  request.url = pathname;
  request.headers = { host: "127.0.0.1" };

  const response = {
    status: 0,
    headers: {},
    body: "",
    writeHead(statusCode, headers = {}) {
      this.status = statusCode;
      this.headers = headers;
    },
    end(chunk = "") {
      this.body += Buffer.isBuffer(chunk) ? chunk.toString("utf8") : String(chunk || "");
    }
  };

  queueMicrotask(() => {
    if (body !== null) request.emit("data", Buffer.from(JSON.stringify(body)));
    request.emit("end");
  });

  await safeHandleRequest(request, response);

  return {
    status: response.status,
    ...JSON.parse(response.body || "{}")
  };
}

test("analyze compare API returns per-model semantic results plus merged verdicts without overwriting the shared rule analysis", async () => {
  const originalFetch = global.fetch;
  const originalEnv = {
    GLM_API_KEY: process.env.GLM_API_KEY,
    DMXAPI_API_KEY: process.env.DMXAPI_API_KEY,
    DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY
  };
  const calls = [];

  process.env.GLM_API_KEY = "glm-key";
  process.env.DMXAPI_API_KEY = "dmxapi-key";
  process.env.DEEPSEEK_API_KEY = "";

  global.fetch = async (url, options = {}) => {
    const requestBody = JSON.parse(String(options.body || "{}"));
    calls.push({
      url: String(url),
      model: requestBody.model
    });

    if (requestBody.model === (process.env.GLM_SEMANTIC_MODEL || process.env.GLM_CROSS_REVIEW_MODEL || process.env.GLM_TEXT_MODEL || "glm-4.6v")) {
      return createJsonResponse({
        model: requestBody.model,
        choices: [
          {
            message: {
              content: JSON.stringify({
                verdict: "observe",
                confidence: 0.82,
                categories: ["soft-risk"],
                reasons: ["glm 认为语气仍需观察"],
                implicitSignals: ["存在轻微引导感"],
                safeSignals: ["整体是科普语境"],
                summary: "glm 判为需观察",
                suggestion: "弱化引导性措辞"
              })
            }
          }
        ]
      });
    }

    if (requestBody.model === (process.env.QWEN_DMXAPI_MODEL || "qwen3.5-plus")) {
      return createJsonResponse({
        model: requestBody.model,
        choices: [
          {
            message: {
              content: JSON.stringify({
                verdict: "pass",
                confidence: 0.76,
                categories: ["safe"],
                reasons: ["qwen 认为表达偏科普"],
                implicitSignals: [],
                safeSignals: ["健康沟通", "无导流"],
                summary: "qwen 判为通过",
                suggestion: ""
              })
            }
          }
        ]
      });
    }

    return createJsonResponse(
      {
        error: {
          message: "unexpected model"
        }
      },
      500
    );
  };

  try {
    const result = await invokeRoute("POST", "/api/analyze/compare", {
      title: "普通沟通提醒",
      body: "这是一段偏健康沟通和关系建议的科普内容。",
      coverText: "关系建议",
      tags: ["沟通", "科普"],
      collectionType: "科普",
      compareSelections: ["glm", "qwen", "deepseek"]
    });

    assert.equal(result.status, 200);
    assert.equal(result.ok, true);
    assert.ok(result.ruleAnalysis);
    assert.equal(Array.isArray(result.comparisons), true);
    assert.deepEqual(
      result.comparisons.map((item) => item.selection),
      ["glm", "qwen", "deepseek"]
    );

    const glmComparison = result.comparisons.find((item) => item.selection === "glm");
    const qwenComparison = result.comparisons.find((item) => item.selection === "qwen");
    const deepseekComparison = result.comparisons.find((item) => item.selection === "deepseek");

    assert.equal(glmComparison.semanticReview.status, "ok");
    assert.equal(glmComparison.mergedAnalysis.finalVerdict, "observe");
    assert.equal(glmComparison.mergedAnalysis.semanticReview.review.summary, "glm 判为需观察");
    assert.equal(glmComparison.durationMs >= 0, true);

    assert.equal(qwenComparison.semanticReview.status, "ok");
    assert.equal(qwenComparison.mergedAnalysis.finalVerdict, result.ruleAnalysis.verdict);
    assert.equal(qwenComparison.mergedAnalysis.semanticReview.review.summary, "qwen 判为通过");
    assert.equal(qwenComparison.durationMs >= 0, true);

    assert.equal(deepseekComparison.semanticReview.status, "unavailable");
    assert.equal(deepseekComparison.mergedAnalysis.finalVerdict, result.ruleAnalysis.verdict);
    assert.match(String(deepseekComparison.semanticReview.message || ""), /未配置|不可用/);

    assert.equal(result.summary.totalModels, 3);
    assert.equal(result.summary.completedModels, 2);
    assert.equal(result.summary.disagreementCount, 0);
    assert.equal(Array.isArray(result.summary.finalVerdicts), true);
    assert.equal(result.summary.semanticVerdicts.includes("observe"), true);
    assert.equal(result.summary.semanticVerdicts.includes("pass"), true);
    const calledModels = calls.map((item) => item.model);
    assert.equal(calledModels.includes(process.env.GLM_DMXAPI_MODEL || "glm-5.1"), true);
    assert.equal(
      calledModels.includes(process.env.GLM_SEMANTIC_MODEL || process.env.GLM_CROSS_REVIEW_MODEL || process.env.GLM_TEXT_MODEL || "glm-4.6v"),
      true
    );
    assert.equal(calledModels.includes(process.env.QWEN_DMXAPI_MODEL || "qwen3.5-plus-2026-02-15"), true);
    assert.equal(
      calls.some(
        (item) =>
          item.url === "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions" &&
          item.model === (process.env.QWEN_DMXAPI_MODEL || "qwen3.5-plus")
      ),
      false
    );
  } finally {
    global.fetch = originalFetch;
    Object.assign(process.env, originalEnv);
  }
});
