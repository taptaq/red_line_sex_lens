import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { paths } from "../src/config.js";
import { handleRequest } from "../src/server.js";

async function withTempStyleProfileRouteData(t, run) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "style-profile-api-"));
  const originalPath = paths.styleProfile;
  paths.styleProfile = path.join(tempDir, "style-profile.json");
  await fs.writeFile(
    paths.styleProfile,
    `${JSON.stringify(
      {
        draft: {
          id: "style-profile-draft-1",
          status: "draft",
          topic: "原始主题",
          tone: "原始语气",
          titleStyle: "原始标题风格",
          bodyStructure: "原始正文结构",
          preferredTags: ["沟通"],
          avoidExpressions: ["强导流"],
          sourceSampleIds: ["sample-1"],
          createdAt: "2026-04-29T00:00:00.000Z",
          updatedAt: "2026-04-29T00:00:00.000Z"
        },
        current: null,
        versions: []
      },
      null,
      2
    )}\n`,
    "utf8"
  );

  t.after(async () => {
    paths.styleProfile = originalPath;
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  return run();
}

test("style profile API updates only editable draft fields", async (t) => {
  await withTempStyleProfileRouteData(t, async () => {
    const result = await invokeRoute("PATCH", "/api/style-profile", {
      action: "update-draft",
      profile: {
        topic: "手动修订主题",
        tone: "更温和克制",
        titleStyle: "先场景后建议",
        bodyStructure: "先结论后拆解",
        preferredTags: "沟通, 关系, 沟通",
        avoidExpressions: ["客户端不应覆盖"]
      }
    });

    assert.equal(result.status, 200);
    assert.equal(result.ok, true);
    assert.equal(result.profile.draft.topic, "手动修订主题");
    assert.equal(result.profile.draft.tone, "更温和克制");
    assert.equal(result.profile.draft.titleStyle, "先场景后建议");
    assert.equal(result.profile.draft.bodyStructure, "先结论后拆解");
    assert.deepEqual(result.profile.draft.preferredTags, ["沟通", "关系"]);
    assert.deepEqual(result.profile.draft.avoidExpressions, ["强导流"]);
    assert.notEqual(result.profile.draft.updatedAt, "2026-04-29T00:00:00.000Z");
  });
});

test("style profile API returns 400 when updating draft without an existing draft", async (t) => {
  await withTempStyleProfileRouteData(t, async () => {
    await fs.writeFile(paths.styleProfile, `${JSON.stringify({ draft: null, current: null, versions: [] }, null, 2)}\n`, "utf8");

    const result = await invokeRoute("PATCH", "/api/style-profile", {
      action: "update-draft",
      profile: {
        topic: "手动修订主题"
      }
    });

    assert.equal(result.status, 400);
    assert.match(result.error || "", /待确认的风格画像/);
  });
});

test("style profile draft route auto-confirms profile from current success samples", async (t) => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "style-profile-api-autogen-"));
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

  await fs.writeFile(paths.styleProfile, "{}\n", "utf8");
  await fs.writeFile(
    paths.noteRecords,
    `${JSON.stringify(
      [
        {
          id: "record-featured",
          source: "generation_final",
          stage: "published_reference",
          note: {
            title: "高权重参考样本",
            body: "这是一篇更完整的经验正文。".repeat(8),
            tags: ["关系", "科普"]
          },
          reference: {
            enabled: true,
            tier: "featured",
            selectedBy: "auto"
          },
          publish: {
            status: "positive_performance"
          }
        }
      ],
      null,
      2
    )}\n`,
    "utf8"
  );

  t.after(async () => {
    Object.assign(paths, originals);
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  const result = await invokeRoute("POST", "/api/style-profile/draft", {
    topic: "自动沉淀画像"
  });

  assert.equal(result.status, 200);
  assert.equal(result.ok, true);
  assert.equal(result.profile.current.status, "active");
  assert.equal(result.profile.current.topic, "自动沉淀画像");
  assert.equal(result.profile.draft, null);
});

test("style profile draft route does not append duplicate versions when semantic content is unchanged", async (t) => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "style-profile-api-dedupe-"));
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

  await fs.writeFile(paths.styleProfile, "{}\n", "utf8");
  await fs.writeFile(
    paths.noteRecords,
    `${JSON.stringify(
      [
        {
          id: "record-featured",
          source: "generation_final",
          stage: "published_reference",
          note: {
            title: "高权重参考样本",
            body: "这是一篇更完整的经验正文。".repeat(8),
            tags: ["关系", "科普"]
          },
          reference: {
            enabled: true,
            tier: "featured",
            selectedBy: "auto"
          },
          publish: {
            status: "positive_performance"
          }
        }
      ],
      null,
      2
    )}\n`,
    "utf8"
  );

  t.after(async () => {
    Object.assign(paths, originals);
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  const first = await invokeRoute("POST", "/api/style-profile/draft", {
    topic: "自动沉淀画像"
  });
  const second = await invokeRoute("POST", "/api/style-profile/draft", {
    topic: "自动沉淀画像"
  });

  assert.equal(first.status, 200);
  assert.equal(second.status, 200);
  assert.equal(second.profile.versions.length, 1);
  assert.equal(second.profile.current.topic, "自动沉淀画像");
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
    ...JSON.parse(finished.body)
  };
}
