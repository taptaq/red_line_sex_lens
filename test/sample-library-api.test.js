import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { paths } from "../src/config.js";
import { loadNoteRecords } from "../src/data-store.js";
import { safeHandleRequest } from "../src/server.js";

async function withTempSampleLibraryApi(t, run) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "sample-library-api-"));
  const originals = {
    collectionTypes: paths.collectionTypes,
    successSamples: paths.successSamples,
    noteLifecycle: paths.noteLifecycle,
    noteRecords: paths.noteRecords
  };

  paths.collectionTypes = path.join(tempDir, "collection-types.json");
  paths.successSamples = path.join(tempDir, "success-samples.json");
  paths.noteLifecycle = path.join(tempDir, "note-lifecycle.json");
  paths.noteRecords = path.join(tempDir, "note-records.json");

  await Promise.all([
    fs.writeFile(paths.collectionTypes, `${JSON.stringify({ custom: [] }, null, 2)}\n`, "utf8"),
    fs.writeFile(paths.successSamples, "[]\n", "utf8"),
    fs.writeFile(paths.noteLifecycle, "[]\n", "utf8")
  ]);

  t.after(async () => {
    Object.assign(paths, originals);
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  return run();
}

test("sample library API supports GET POST PATCH for canonical note records", async (t) => {
  await withTempSampleLibraryApi(t, async () => {
    const initial = await invokeRoute("GET", "/api/sample-library");
    assert.equal(initial.status, 200);
    assert.equal(initial.ok, true);
    assert.deepEqual(initial.items, []);

    const created = await invokeRoute("POST", "/api/sample-library", {
      source: "manual",
      stage: "draft",
      note: {
        title: "统一样本标题",
        body: "统一样本正文",
        collectionType: "科普",
        tags: ["科普", "沟通"]
      }
    });

    assert.equal(created.status, 200);
    assert.equal(created.ok, true);
    assert.equal(created.items.length, 1);
    assert.equal(created.item.note.title, "统一样本标题");
    assert.equal(created.item.note.collectionType, "科普");
    assert.equal(created.item.reference.enabled, false);
    assert.equal(created.item.publish.status, "not_published");

    const patched = await invokeRoute("PATCH", "/api/sample-library", {
      id: created.item.id,
      reference: {
        enabled: true,
        tier: "featured",
        selectedBy: "manual",
        notes: "补充精选属性"
      },
      note: {
        collectionType: "疗愈指南"
      },
      publish: {
        status: "published_passed",
        publishedAt: "2026-04-30",
        notes: "补充发布属性"
      }
    });

    assert.equal(patched.status, 200);
    assert.equal(patched.ok, true);
    assert.equal(patched.item.id, created.item.id);
    assert.equal(patched.item.reference.enabled, true);
    assert.equal(patched.item.reference.tier, "featured");
    assert.equal(patched.item.note.collectionType, "疗愈指南");
    assert.equal(patched.item.publish.status, "published_passed");
    assert.equal(patched.item.publish.publishedAt, "2026-04-30");

    const listed = await invokeRoute("GET", "/api/sample-library");
    const records = await loadNoteRecords();

    assert.equal(listed.items.length, 1);
    assert.equal(listed.items[0].id, created.item.id);
    assert.equal(listed.items[0].reference.tier, "featured");
    assert.equal(records.length, 1);
    assert.equal(records[0].id, created.item.id);
    assert.equal(records[0].note.collectionType, "疗愈指南");
    assert.equal(records[0].publish.status, "published_passed");
  });
});

test("sample library POST ignores client-provided ids so different notes cannot share one canonical id", async (t) => {
  await withTempSampleLibraryApi(t, async () => {
    const first = await invokeRoute("POST", "/api/sample-library", {
      id: "client-shared-id",
      createdAt: "2000-01-01T00:00:00.000Z",
      updatedAt: "2000-01-01T00:00:00.000Z",
      note: {
        title: "第一条标题",
        body: "第一条正文"
      }
    });

    const second = await invokeRoute("POST", "/api/sample-library", {
      id: "client-shared-id",
      createdAt: "2001-01-01T00:00:00.000Z",
      updatedAt: "2001-01-01T00:00:00.000Z",
      note: {
        title: "第二条标题",
        body: "第二条正文"
      }
    });

    const listed = await invokeRoute("GET", "/api/sample-library");
    const ids = listed.items.map((item) => item.id);

    assert.equal(first.status, 200);
    assert.equal(second.status, 200);
    assert.equal(listed.items.length, 2);
    assert.notEqual(first.item.id, "client-shared-id");
    assert.notEqual(second.item.id, "client-shared-id");
    assert.notEqual(first.item.id, second.item.id);
    assert.equal(new Set(ids).size, 2);
  });
});

test("sample library PATCH can roll back reference and publish fields with true patch semantics", async (t) => {
  await withTempSampleLibraryApi(t, async () => {
    const created = await invokeRoute("POST", "/api/sample-library", {
      source: "manual",
      stage: "draft",
      note: {
        title: "可回退样本标题",
        body: "可回退样本正文",
        tags: ["科普", "回退"]
      }
    });

    const upgraded = await invokeRoute("PATCH", "/api/sample-library", {
      id: created.item.id,
      reference: {
        enabled: true,
        tier: "featured",
        selectedBy: "manual",
        notes: "先标成精选"
      },
      publish: {
        status: "positive_performance",
        metrics: {
          likes: 120,
          favorites: 24,
          comments: 8
        },
        notes: "先记录高表现",
        publishedAt: "2026-04-30"
      }
    });

    assert.equal(upgraded.status, 200);
    assert.equal(upgraded.item.reference.enabled, true);
    assert.equal(upgraded.item.reference.tier, "featured");
    assert.equal(upgraded.item.publish.status, "positive_performance");
    assert.equal(upgraded.item.publish.metrics.likes, 120);
    assert.equal(upgraded.item.publish.notes, "先记录高表现");
    assert.equal(upgraded.item.publish.publishedAt, "2026-04-30");

    const rolledBack = await invokeRoute("PATCH", "/api/sample-library", {
      id: created.item.id,
      reference: {
        enabled: false,
        notes: ""
      },
      publish: {
        status: "violation",
        metrics: {
          likes: 3,
          favorites: 0,
          comments: 1
        },
        notes: "",
        publishedAt: ""
      }
    });

    assert.equal(rolledBack.status, 200);
    assert.equal(rolledBack.ok, true);
    assert.equal(rolledBack.item.reference.enabled, false);
    assert.equal(rolledBack.item.reference.tier, "");
    assert.equal(rolledBack.item.reference.notes, "");
    assert.equal(rolledBack.item.publish.status, "violation");
    assert.equal(rolledBack.item.publish.metrics.likes, 3);
    assert.equal(rolledBack.item.publish.metrics.favorites, 0);
    assert.equal(rolledBack.item.publish.metrics.comments, 1);
    assert.equal(rolledBack.item.publish.notes, "");
    assert.equal(rolledBack.item.publish.publishedAt, "");

    const listed = await invokeRoute("GET", "/api/sample-library");
    assert.equal(listed.items[0].reference.enabled, false);
    assert.equal(listed.items[0].publish.status, "violation");
    assert.equal(listed.items[0].publish.metrics.likes, 3);
  });
});

test("sample library PATCH returns the merged canonical record when note changes collapse two records", async (t) => {
  await withTempSampleLibraryApi(t, async () => {
    const first = await invokeRoute("POST", "/api/sample-library", {
      note: {
        title: "合并目标标题",
        body: "合并目标正文",
        tags: ["科普"]
      }
    });

    const second = await invokeRoute("POST", "/api/sample-library", {
      note: {
        title: "待合并标题",
        body: "待合并正文",
        tags: ["草稿"]
      }
    });

    const patched = await invokeRoute("PATCH", "/api/sample-library", {
      id: second.item.id,
      note: {
        title: "合并目标标题",
        body: "合并目标正文",
        tags: ["科普"]
      }
    });

    const listed = await invokeRoute("GET", "/api/sample-library");

    assert.equal(patched.status, 200);
    assert.equal(patched.ok, true);
    assert.notEqual(patched.item, null);
    assert.equal(patched.item.id, first.item.id);
    assert.equal(patched.item.note.title, "合并目标标题");
    assert.equal(listed.items.length, 1);
    assert.equal(listed.items[0].id, first.item.id);
  });
});

test("sample library PATCH returns 404 when the canonical record does not exist", async (t) => {
  await withTempSampleLibraryApi(t, async () => {
    const patched = await invokeRoute("PATCH", "/api/sample-library", {
      id: "note-missing",
      publish: { status: "published_passed" }
    });

    assert.equal(patched.status, 404);
    assert.equal(patched.ok, false);
    assert.match(patched.error, /未找到/);
  });
});

test("sample library DELETE removes an existing canonical record", async (t) => {
  await withTempSampleLibraryApi(t, async () => {
    const created = await invokeRoute("POST", "/api/sample-library", {
      note: {
        title: "待删除样本标题",
        body: "待删除样本正文"
      }
    });

    const deleted = await invokeRoute("DELETE", "/api/sample-library", {
      id: created.item.id
    });

    assert.equal(deleted.status, 200);
    assert.equal(deleted.ok, true);
    assert.deepEqual(deleted.items, []);

    const listed = await invokeRoute("GET", "/api/sample-library");
    assert.deepEqual(listed.items, []);
  });
});

test("sample library DELETE returns 404 when the canonical record does not exist", async (t) => {
  await withTempSampleLibraryApi(t, async () => {
    const deleted = await invokeRoute("DELETE", "/api/sample-library", {
      id: "note-missing"
    });

    assert.equal(deleted.status, 404);
    assert.equal(deleted.ok, false);
    assert.match(deleted.error, /未找到/);
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
