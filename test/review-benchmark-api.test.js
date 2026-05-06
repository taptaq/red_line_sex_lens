import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { safeHandleRequest } from "../src/server.js";

test("review benchmark API routes are fully removed", async () => {
  const created = await invokeRoute("POST", "/api/review-benchmark", {
    title: "关系沟通提醒",
    body: "这是一条容易误报的正文",
    collectionType: "科普",
    tags: "关系, 沟通, 关系",
    expectedType: "误报样本"
  });

  assert.equal(created.status, 404);

  const listed = await invokeRoute("GET", "/api/review-benchmark");
  assert.equal(listed.status, 404);

  const run = await invokeRoute("POST", "/api/review-benchmark/run", {});
  assert.equal(run.status, 404);

  const missingDelete = await invokeRoute("DELETE", "/api/review-benchmark", { id: "missing-id" });
  assert.equal(missingDelete.status, 404);
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
    if (body !== null) {
      request.emit("data", Buffer.from(JSON.stringify(body)));
    }
    request.emit("end");
  });

  await safeHandleRequest(request, response);
  return {
    status: response.status,
    ...(response.headers["Content-Type"]?.includes("application/json") && response.body ? JSON.parse(response.body) : {}),
    rawBody: response.body
  };
}
