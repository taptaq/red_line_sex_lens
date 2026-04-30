import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { paths } from "../src/config.js";
import {
  buildModelPerformanceSummary,
  loadModelPerformanceLog,
  recordModelCall
} from "../src/model-performance.js";
import { handleRequest } from "../src/server.js";
import { EventEmitter } from "node:events";

async function withTempModelPerformance(t, run) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "model-performance-"));
  const originalPath = paths.modelPerformance;
  paths.modelPerformance = path.join(tempDir, "model-performance.json");
  await fs.writeFile(paths.modelPerformance, "[]\n", "utf8");

  t.after(async () => {
    paths.modelPerformance = originalPath;
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  return run();
}

test("model performance log records calls and summarizes model stability", async (t) => {
  await withTempModelPerformance(t, async () => {
    await recordModelCall({
      scene: "semantic_review",
      provider: "glm",
      route: "dmxapi",
      routeLabel: "DMXAPI",
      model: "glm-5.1-free",
      status: "ok",
      durationMs: 1200
    });
    await recordModelCall({
      scene: "semantic_review",
      provider: "glm",
      route: "dmxapi",
      routeLabel: "DMXAPI",
      model: "glm-5.1-free",
      status: "error",
      errorType: "timeout",
      message: "请求超时",
      durationMs: 60000
    });
    await recordModelCall({
      scene: "rewrite",
      provider: "qwen",
      route: "official",
      routeLabel: "官方",
      model: "qwen-plus",
      status: "error",
      errorType: "json_error",
      message: "不是有效 JSON",
      durationMs: 900
    });

    const log = await loadModelPerformanceLog();
    assert.equal(log.length, 3);
    assert.equal(log[0].provider, "glm");

    const summary = await buildModelPerformanceSummary();
    const glm = summary.items.find((item) => item.provider === "glm" && item.model === "glm-5.1-free");
    const qwen = summary.items.find((item) => item.provider === "qwen");

    assert.equal(summary.totalCalls, 3);
    assert.equal(glm.totalCalls, 2);
    assert.equal(glm.successRate, 0.5);
    assert.equal(glm.timeoutRate, 0.5);
    assert.equal(glm.averageDurationMs, 30600);
    assert.deepEqual(glm.scenes, ["semantic_review"]);
    assert.equal(qwen.jsonErrorRate, 1);
    assert.match(qwen.lastError, /不是有效 JSON/);
  });
});

test("model performance summary recommends stable models per scene without changing routing", async (t) => {
  await withTempModelPerformance(t, async () => {
    await recordModelCall({
      scene: "semantic_review",
      provider: "glm",
      route: "dmxapi",
      routeLabel: "DMXAPI",
      model: "glm-5.1-free",
      status: "ok",
      durationMs: 1400
    });
    await recordModelCall({
      scene: "semantic_review",
      provider: "glm",
      route: "dmxapi",
      routeLabel: "DMXAPI",
      model: "glm-5.1-free",
      status: "ok",
      durationMs: 1200
    });
    await recordModelCall({
      scene: "semantic_review",
      provider: "qwen",
      route: "dmxapi",
      routeLabel: "DMXAPI",
      model: "qwen3.5-plus-free",
      status: "error",
      errorType: "timeout",
      message: "请求超时",
      durationMs: 12000
    });
    await recordModelCall({
      scene: "rewrite",
      provider: "kimi",
      route: "dmxapi",
      routeLabel: "DMXAPI",
      model: "kimi-k2.6-free",
      status: "ok",
      durationMs: 2100
    });

    const summary = await buildModelPerformanceSummary();

    assert.equal(summary.recommendations.semantic_review.provider, "glm");
    assert.equal(summary.recommendations.semantic_review.model, "glm-5.1-free");
    assert.equal(summary.recommendations.semantic_review.reason, "历史调用更稳定");
    assert.equal(summary.recommendations.rewrite.provider, "kimi");
    assert.equal(typeof summary.recommendations.semantic_review.score, "number");
  });
});

test("model performance API returns summarized dashboard data", async (t) => {
  await withTempModelPerformance(t, async () => {
    await recordModelCall({
      scene: "generation",
      provider: "kimi",
      route: "dmxapi",
      routeLabel: "DMXAPI",
      model: "kimi-k2.6-free",
      status: "ok",
      durationMs: 1500
    });

    const result = await invokeRoute("GET", "/api/model-performance");
    assert.equal(result.status, 200);
    assert.equal(result.ok, true);
    assert.equal(result.summary.totalCalls, 1);
    assert.equal(result.summary.items[0].scene || result.summary.items[0].scenes[0], "generation");
  });
});

test("model performance summary falls back to empty data when log json is malformed", async (t) => {
  await withTempModelPerformance(t, async () => {
    await fs.writeFile(paths.modelPerformance, '{"broken": }\n', "utf8");

    const summary = await buildModelPerformanceSummary();
    const result = await invokeRoute("GET", "/api/model-performance");

    assert.equal(summary.totalCalls, 0);
    assert.deepEqual(summary.items, []);
    assert.deepEqual(summary.recommendations, {});
    assert.equal(result.status, 200);
    assert.equal(result.ok, true);
    assert.equal(result.summary.totalCalls, 0);
  });
});

test("frontend exposes model performance dashboard tab", async () => {
  const [indexHtml, appJs, styles] = await Promise.all([
    fs.readFile(path.join(process.cwd(), "web/index.html"), "utf8"),
    fs.readFile(path.join(process.cwd(), "web/app.js"), "utf8"),
    fs.readFile(path.join(process.cwd(), "web/styles.css"), "utf8")
  ]);

  assert.match(indexHtml, /id="model-performance-pane"/);
  assert.match(appJs, /\/api\/model-performance/);
  assert.match(appJs, /renderModelPerformance/);
  assert.match(appJs, /renderMainModelRecommendations/);
  assert.match(indexHtml, /id="semantic-model-recommendation"/);
  assert.match(styles, /\.model-performance-grid/);
  assert.match(styles, /\.model-recommendation-hint/);
});

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

  await handleRequest(request, response);
  return {
    status: response.status,
    ...(response.body ? JSON.parse(response.body) : {})
  };
}
