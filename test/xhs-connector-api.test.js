import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { paths } from "../src/config.js";
import { loadNoteRecords } from "../src/data-store.js";
import { safeHandleRequest } from "../src/server.js";

async function withTempXhsConnectorApi(t, run) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "xhs-connector-api-"));
  const originals = {
    collectionTypes: paths.collectionTypes,
    successSamples: paths.successSamples,
    noteLifecycle: paths.noteLifecycle,
    noteRecords: paths.noteRecords,
    styleProfile: paths.styleProfile
  };

  paths.collectionTypes = path.join(tempDir, "collection-types.json");
  paths.successSamples = path.join(tempDir, "success-samples.json");
  paths.noteLifecycle = path.join(tempDir, "note-lifecycle.json");
  paths.noteRecords = path.join(tempDir, "note-records.json");
  paths.styleProfile = path.join(tempDir, "style-profile.json");

  await Promise.all([
    fs.writeFile(paths.collectionTypes, `${JSON.stringify({ custom: [] }, null, 2)}\n`, "utf8"),
    fs.writeFile(paths.successSamples, "[]\n", "utf8"),
    fs.writeFile(paths.noteLifecycle, "[]\n", "utf8"),
    fs.writeFile(paths.styleProfile, "{}\n", "utf8")
  ]);

  t.after(async () => {
    Object.assign(paths, originals);
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
    if (body !== null) {
      request.emit("data", Buffer.from(JSON.stringify(body)));
    }
    request.emit("end");
  });

  await safeHandleRequest(request, response);

  return {
    status: response.status,
    ...JSON.parse(response.body || "{}")
  };
}

test("xhs connector discover API returns normalized preview items", async (t) => {
  await withTempXhsConnectorApi(t, async () => {
    const result = await invokeRoute("POST", "/api/xhs-connector/discover", {
      sourceType: "keyword",
      keyword: "AI效率"
    });

    assert.equal(result.status, 200);
    assert.equal(result.ok, true);
    assert.equal(Array.isArray(result.items), true);
  });
});

test("xhs connector import API persists selected items into sample library", async (t) => {
  await withTempXhsConnectorApi(t, async () => {
    const result = await invokeRoute("POST", "/api/xhs-connector/import", {
      items: [
        {
          provider: "stub",
          noteId: "note-001",
          url: "https://xhs.example.com/note-001",
          title: "导入标题",
          bodyPreview: "导入正文预览",
          authorName: "作者A",
          authorId: "author-001",
          tags: ["效率", "AI"],
          metrics: {
            likes: 10,
            favorites: 2,
            comments: 1,
            views: 88
          }
        }
      ]
    });

    const records = await loadNoteRecords();

    assert.equal(result.status, 200);
    assert.equal(result.ok, true);
    assert.equal(result.createdCount, 1);
    assert.equal(Array.isArray(result.items), true);
    assert.equal(result.items.length, 1);
    assert.equal(result.items[0].externalSource.noteId, "note-001");
    assert.equal(records.length, 1);
    assert.equal(records[0].externalSource.noteId, "note-001");
    assert.equal(records[0].note.title, "导入标题");
  });
});

test("xhs connector sync preview API returns matched and unmatched summaries", async (t) => {
  await withTempXhsConnectorApi(t, async () => {
    await invokeRoute("POST", "/api/sample-library", {
      source: "manual",
      stage: "draft",
      note: {
        title: "已同步样本",
        body: "已同步样本正文",
        collectionType: "科普"
      },
      externalSource: {
        provider: "stub",
        noteId: "sync-note-001",
        url: "https://xhs.example.com/sync-note-001",
        authorName: "作者B",
        authorId: "author-002",
        fetchedAt: "2026-05-24T00:00:00.000Z"
      }
    });

    const result = await invokeRoute("POST", "/api/xhs-connector/sync-preview", {});

    assert.equal(result.status, 200);
    assert.equal(result.ok, true);
    assert.equal(Array.isArray(result.matched), true);
    assert.equal(Array.isArray(result.unmatched), true);
    assert.ok(result.summary);
    assert.equal(result.summary.matchedCount, result.matched.length);
    assert.equal(result.summary.unmatchedCount, result.unmatched.length);
    assert.equal(result.unmatched.length >= 1, true);
  });
});
