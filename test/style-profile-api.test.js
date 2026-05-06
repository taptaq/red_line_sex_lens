import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";

import { handleRequest } from "../src/server.js";

test("style profile API routes are fully removed from the public surface", async () => {
  const listed = await invokeRoute("GET", "/api/style-profile");
  assert.equal(listed.status, 404);

  const refreshed = await invokeRoute("POST", "/api/style-profile/refresh", {
    topic: "自动沉淀画像"
  });
  assert.equal(refreshed.status, 404);

  const patched = await invokeRoute("PATCH", "/api/style-profile", {
    action: "update-draft",
    profile: {
      topic: "手动修订主题"
    }
  });
  assert.equal(patched.status, 404);
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
      this.body += chunk;
    }
  };

  const completion = handleRequest(request, response)
    .then(() => response)
    .catch((error) => {
      response.status = error.statusCode || 500;
      response.body = JSON.stringify({ ok: false, error: error.message });
      return response;
    });

  if (body) {
    request.emit("data", Buffer.from(JSON.stringify(body)));
  }
  request.emit("end");

  const finished = await completion;
  return {
    status: finished.status,
    rawBody: finished.body
  };
}
