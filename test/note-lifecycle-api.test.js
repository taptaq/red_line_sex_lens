import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { paths } from "../src/config.js";
import { loadAdminData } from "../src/admin.js";
import { handleRequest } from "../src/server.js";

async function withTempLifecycleApi(t, run) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "note-lifecycle-api-"));
  const originalPath = paths.noteLifecycle;
  paths.noteLifecycle = path.join(tempDir, "note-lifecycle.json");
  await fs.writeFile(paths.noteLifecycle, "[]\n", "utf8");

  t.after(async () => {
    paths.noteLifecycle = originalPath;
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  return run();
}

test("note lifecycle API creates, upserts, lists, and updates publish results", async (t) => {
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

    assert.equal(created.status, 200);
    assert.equal(created.ok, true);
    assert.equal(created.items.length, 1);
    assert.equal(created.item.publishResult.label, "未发布");

    const replaced = await invokeRoute("POST", "/api/note-lifecycle", {
      source: "rewrite",
      note: {
        title: "亲密关系科普",
        body: "这是一篇更稳的科普草稿。",
        tags: ["科普"]
      },
      rewriteSnapshot: {
        model: "glm-5.1-free"
      }
    });

    assert.equal(replaced.items.length, 1);
    assert.equal(replaced.items[0].source, "rewrite");
    assert.equal(replaced.items[0].note.body, "这是一篇更稳的科普草稿。");

    const listed = await invokeRoute("GET", "/api/note-lifecycle");
    assert.equal(listed.items.length, 1);

    const patched = await invokeRoute("PATCH", "/api/note-lifecycle", {
      id: listed.items[0].id,
      publishStatus: "positive_performance",
      metrics: {
        likes: 36,
        favorites: 12,
        comments: 4
      },
      notes: "发出后表现稳定"
    });

    assert.equal(patched.item.status, "positive_performance");
    assert.equal(patched.item.publishResult.label, "过审且表现好");
    assert.equal(patched.item.publishResult.metrics.likes, 36);

    const adminData = await loadAdminData();
    assert.equal(adminData.noteLifecycle.length, 1);
    assert.equal(adminData.noteLifecycle[0].publishResult.label, "过审且表现好");
  });
});

test("recommended generation final draft enters lifecycle and gains weight after publish feedback", async (t) => {
  await withTempLifecycleApi(t, async () => {
    const created = await invokeRoute("POST", "/api/note-lifecycle", {
      source: "generation_final",
      note: {
        title: "最终推荐稿标题",
        body: "这是一篇最终推荐稿正文。",
        coverText: "封面",
        tags: ["科普"]
      },
      generationSnapshot: {
        id: "candidate-safe-1",
        scores: { total: 92 }
      }
    });

    assert.equal(created.status, 200);
    assert.equal(created.item.source, "generation_final");
    assert.equal(created.item.stage, "generated");
    assert.ok(created.item.sampleWeight > 0);

    const patched = await invokeRoute("PATCH", "/api/note-lifecycle", {
      id: created.item.id,
      publishStatus: "positive_performance",
      metrics: {
        likes: 88,
        favorites: 21,
        comments: 6
      },
      notes: "最终推荐稿发布后表现好"
    });

    assert.equal(patched.item.source, "generation_final");
    assert.equal(patched.item.status, "positive_performance");
    assert.ok(patched.item.sampleWeight > created.item.sampleWeight);
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
    ...(response.body ? JSON.parse(response.body) : {})
  };
}
