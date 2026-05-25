import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";

import { safeHandleRequest } from "../src/server.js";

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

  let payload = {};
  try {
    payload = JSON.parse(response.body || "{}");
  } catch {
    payload = { body: response.body };
  }

  return {
    status: response.status,
    ...payload
  };
}

test("automated xhs connector API routes are not exposed", async () => {
  const paths = [
    "/api/xhs-connector/discover",
    "/api/xhs-connector/import",
    "/api/xhs-connector/sync-preview",
    "/api/xhs-connector/sync-apply"
  ];

  for (const pathname of paths) {
    const result = await invokeRoute("POST", pathname, {});

    assert.equal(result.status, 404);
    assert.equal(result.body, "Not found");
  }
});
