import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { paths } from "../src/config.js";
import { safeHandleRequest } from "../src/server.js";

async function withTempAnalyzeTagOptionsApi(t, run) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "analyze-tag-options-api-"));
  const originalPath = paths.analyzeTagOptions;
  paths.analyzeTagOptions = path.join(tempDir, "analyze-tag-options.json");

  await fs.writeFile(paths.analyzeTagOptions, "[]\n", "utf8");

  t.after(async () => {
    paths.analyzeTagOptions = originalPath;
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  return run();
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

  let parsed = {};
  if (response.body) {
    try {
      parsed = JSON.parse(response.body);
    } catch {
      parsed = { rawBody: response.body };
    }
  }

  return {
    status: response.status,
    ...parsed
  };
}

test("analyze tag options API supports GET and POST persistence", async (t) => {
  await withTempAnalyzeTagOptionsApi(t, async () => {
    const initial = await invokeRoute("GET", "/api/analyze-tag-options");
    assert.equal(initial.status, 200);
    assert.equal(initial.ok, true);
    assert.deepEqual(initial.options, []);

    const saved = await invokeRoute("POST", "/api/analyze-tag-options", {
      options: ["沟通", "关系", "沟通", "  科普  "]
    });
    assert.equal(saved.status, 200);
    assert.equal(saved.ok, true);
    assert.deepEqual(saved.options, ["沟通", "关系", "科普"]);

    const listed = await invokeRoute("GET", "/api/analyze-tag-options");
    assert.equal(listed.status, 200);
    assert.equal(listed.ok, true);
    assert.deepEqual(listed.options, ["沟通", "关系", "科普"]);
  });
});
