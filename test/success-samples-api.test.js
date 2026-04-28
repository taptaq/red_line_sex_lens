import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { paths } from "../src/config.js";
import { loadAdminData } from "../src/admin.js";
import { handleRequest } from "../src/server.js";

async function withTempSuccessSampleApi(t, run) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "success-samples-api-"));
  const originalPath = paths.successSamples;
  paths.successSamples = path.join(tempDir, "success-samples.json");
  await fs.writeFile(paths.successSamples, "[]\n", "utf8");

  t.after(async () => {
    paths.successSamples = originalPath;
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  return run();
}

test("success sample API creates, lists, upserts, and deletes samples", async (t) => {
  await withTempSuccessSampleApi(t, async () => {
    const created = await invokeRoute("POST", "/api/success-samples", {
      title: "成功标题",
      body: "成功正文",
      tags: ["科普"],
      tier: "performed",
      metrics: { likes: 9, favorites: 4, comments: 2 }
    });

    assert.equal(created.status, 200);
    assert.equal(created.ok, true);
    assert.equal(created.items.length, 1);
    assert.equal(created.items[0].tier, "performed");

    const replaced = await invokeRoute("POST", "/api/success-samples", {
      title: "成功标题",
      body: "成功正文",
      tier: "featured",
      metrics: { likes: 20 }
    });

    assert.equal(replaced.items.length, 1);
    assert.equal(replaced.items[0].tier, "featured");
    assert.equal(replaced.items[0].metrics.likes, 20);

    const listed = await invokeRoute("GET", "/api/success-samples");
    assert.equal(listed.items.length, 1);
    assert.equal(listed.items[0].title, "成功标题");

    const adminData = await loadAdminData();
    assert.equal(adminData.successSamples.length, 1);

    const deleted = await invokeRoute("DELETE", "/api/success-samples", { id: listed.items[0].id });
    assert.equal(deleted.items.length, 0);
  });
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
