import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { handleRequest } from "../src/server.js";

test("rewrite pairs compatibility routes are fully removed", async () => {
  const createResult = await invokeRoute("POST", "/api/rewrite-pairs", {
    name: "",
    before: {
      title: "",
      body: "",
      coverText: "",
      tags: []
    },
    after: {
      title: "",
      body: "",
      coverText: "",
      tags: []
    }
  });

  assert.equal(createResult.status, 404);

  const deleteResult = await invokeRoute("DELETE", "/api/admin/rewrite-pairs", {
    id: "rewrite-pair-1",
    createdAt: "2026-05-04T00:00:00.000Z"
  });

  assert.equal(deleteResult.status, 404);
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
  if (!finished.body) {
    return { status: finished.status };
  }

  return {
    status: finished.status,
    ...(finished.headers["Content-Type"]?.includes("application/json") ? JSON.parse(finished.body) : {}),
    rawBody: finished.body
  };
}
