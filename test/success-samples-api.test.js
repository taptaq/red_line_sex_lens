import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { paths } from "../src/config.js";
import { loadNoteRecords } from "../src/data-store.js";
import { loadAdminData } from "../src/admin.js";
import { handleRequest } from "../src/server.js";

async function withTempSuccessSampleApi(t, run) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "success-samples-api-"));
  const originals = {
    successSamples: paths.successSamples,
    noteLifecycle: paths.noteLifecycle,
    noteRecords: paths.noteRecords
  };
  paths.successSamples = path.join(tempDir, "success-samples.json");
  paths.noteLifecycle = path.join(tempDir, "note-lifecycle.json");
  paths.noteRecords = path.join(tempDir, "note-records.json");
  await Promise.all([
    fs.writeFile(paths.successSamples, "[]\n", "utf8"),
    fs.writeFile(paths.noteLifecycle, "[]\n", "utf8")
  ]);

  t.after(async () => {
    Object.assign(paths, originals);
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  return run();
}

test("success sample compatibility routes are fully removed", async (t) => {
  await withTempSuccessSampleApi(t, async () => {
    const created = await invokeRoute("POST", "/api/success-samples", {
      title: "成功标题",
      body: "成功正文",
      tags: ["科普"],
      tier: "performed",
      metrics: { likes: 9, favorites: 4, comments: 2 }
    });

    assert.equal(created.status, 404);

    const listed = await invokeRoute("GET", "/api/success-samples");
    assert.equal(listed.status, 404);

    const adminData = await loadAdminData();
    assert.equal(Object.hasOwn(adminData, "successSamples"), false);

    const deleted = await invokeRoute("DELETE", "/api/success-samples", { id: "missing-id" });
    assert.equal(deleted.status, 404);
    assert.equal((await loadNoteRecords()).length, 0);
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
    ...(response.headers["Content-Type"]?.includes("application/json") && response.body ? JSON.parse(response.body) : {}),
    rawBody: response.body
  };
}
