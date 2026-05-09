import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { paths } from "../src/config.js";
import { handleRequest } from "../src/server.js";

async function withTempStyleProfileApi(t, run) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "style-profile-api-"));
  const originals = {
    styleProfile: paths.styleProfile,
    noteRecords: paths.noteRecords,
    successSamples: paths.successSamples,
    noteLifecycle: paths.noteLifecycle
  };

  paths.styleProfile = path.join(tempDir, "style-profile.json");
  paths.noteRecords = path.join(tempDir, "note-records.json");
  paths.successSamples = path.join(tempDir, "success-samples.json");
  paths.noteLifecycle = path.join(tempDir, "note-lifecycle.json");

  await Promise.all([
    fs.writeFile(
      paths.styleProfile,
      `${JSON.stringify(
        {
          current: {
            id: "style-profile-current",
            status: "active",
            topic: "旧画像",
            name: "旧画像",
            sourceSampleIds: ["note-reference-a", "note-reference-b"],
            titleStyle: "旧标题风格",
            bodyStructure: "旧正文结构",
            tone: "旧语气",
            preferredTags: ["旧标签"],
            createdAt: "2026-05-01T00:00:00.000Z",
            updatedAt: "2026-05-01T00:00:00.000Z"
          }
        },
        null,
        2
      )}\n`,
      "utf8"
    ),
    fs.writeFile(
      paths.noteRecords,
      `${JSON.stringify(
        [
          {
            id: "note-reference-new-a",
            note: {
              title: "新参考样本 A",
              body: "新参考样本正文 A".repeat(20),
              tags: ["新标签"]
            },
            reference: {
              enabled: true,
              tier: "featured"
            },
            publish: {
              status: "published_passed"
            }
          },
          {
            id: "note-reference-new-b",
            note: {
              title: "新参考样本 B",
              body: "新参考样本正文 B".repeat(20),
              tags: ["新标签"]
            },
            reference: {
              enabled: true,
              tier: "featured"
            },
            publish: {
              status: "published_passed"
            }
          }
        ],
        null,
        2
      )}\n`,
      "utf8"
    ),
    fs.writeFile(paths.successSamples, "[]\n", "utf8"),
    fs.writeFile(paths.noteLifecycle, "[]\n", "utf8")
  ]);

  t.after(async () => {
    Object.assign(paths, originals);
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  return run();
}

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

test("admin style profile read returns current profile without queuing or regenerating it", async (t) => {
  await withTempStyleProfileApi(t, async () => {
    const listed = await invokeRoute("GET", "/api/admin/style-profile");

    assert.equal(listed.status, 200);
    assert.equal(listed.body.styleProfile.current.topic, "旧画像");
    assert.deepEqual(listed.body.styleProfile.current.sourceSampleIds, ["note-reference-a", "note-reference-b"]);
    assert.equal(listed.body.styleProfileRefreshQueued, undefined);
  });
});

test("style profile refresh scheduler reruns once when marked dirty during an active refresh", async () => {
  const { scheduleStyleProfileRefresh } = await import("../src/server.js");
  let refreshCalls = 0;
  let invalidations = 0;
  let releaseFirstRefresh;
  const firstRefreshStarted = new Promise((resolve) => {
    releaseFirstRefresh = resolve;
  });
  let unblockFirstRefresh;
  const firstRefreshBlocker = new Promise((resolve) => {
    unblockFirstRefresh = resolve;
  });

  const refresh = async () => {
    refreshCalls += 1;

    if (refreshCalls === 1) {
      releaseFirstRefresh();
      await firstRefreshBlocker;
    }
  };

  const invalidate = () => {
    invalidations += 1;
  };

  const first = scheduleStyleProfileRefresh("first-test-refresh", { refresh, invalidate });

  try {
    await firstRefreshStarted;
    const second = scheduleStyleProfileRefresh("second-test-refresh", { refresh, invalidate });
    assert.equal(second, first);
    unblockFirstRefresh();
    await first;

    assert.equal(refreshCalls, 2);
    assert.equal(invalidations, 2);
  } finally {
    unblockFirstRefresh();
    await first.catch(() => {});
  }
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
  let parsedBody = null;
  if (finished.body) {
    try {
      parsedBody = JSON.parse(finished.body);
    } catch {
      parsedBody = null;
    }
  }

  return {
    status: finished.status,
    rawBody: finished.body,
    body: parsedBody
  };
}
