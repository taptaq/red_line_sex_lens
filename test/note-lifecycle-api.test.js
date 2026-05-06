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

async function withTempLifecycleApi(t, run) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "note-lifecycle-api-"));
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

test("note lifecycle compatibility routes are fully removed", async (t) => {
  await withTempLifecycleApi(t, async () => {
    const created = await invokeRoute("POST", "/api/note-lifecycle", {
      source: "analysis",
      note: {
        title: "亲密关系科普",
        body: "这是一篇偏科普的草稿。",
        tags: ["科普", "关系沟通"]
      },
      analysisSnapshot: {
        verdict: "observe",
        score: 18
      }
    });

    assert.equal(created.status, 404);

    const listed = await invokeRoute("GET", "/api/note-lifecycle");
    assert.equal(listed.status, 404);

    const patched = await invokeRoute("PATCH", "/api/note-lifecycle", {
      id: "missing-id",
      publishStatus: "positive_performance",
      metrics: {
        likes: 36,
        favorites: 12,
        comments: 4
      },
      notes: "发出后表现稳定"
    });

    assert.equal(patched.status, 404);

    const adminData = await loadAdminData();
    assert.equal(Object.hasOwn(adminData, "noteLifecycle"), false);
    const deleted = await invokeRoute("DELETE", "/api/note-lifecycle", {
      id: "missing-id"
    });
    assert.equal(deleted.status, 404);
    assert.equal((await loadNoteRecords()).length, 0);
  });
});

test("frontend marks the recommended candidate as final lifecycle source", async () => {
  const appJs = await fs.readFile(path.join(process.cwd(), "web/app.js"), "utf8");

  assert.match(appJs, /generation_final/);
  assert.match(appJs, /最终推荐稿/);
  assert.match(appJs, /generation_candidate/);
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
