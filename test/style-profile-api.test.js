import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { paths } from "../src/config.js";
import { handleRequest } from "../src/server.js";

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

test("admin style profile routes expose current profile and persist manual edits", async (t) => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "style-profile-api-"));
  const originals = {
    styleProfile: paths.styleProfile,
    noteRecords: paths.noteRecords
  };
  paths.styleProfile = path.join(tempDir, "style-profile.json");
  paths.noteRecords = path.join(tempDir, "note-records.json");
  await fs.writeFile(
    paths.styleProfile,
    `${JSON.stringify(
      {
        current: {
          id: "style-profile-current",
          status: "active",
          topic: "通用风格",
          name: "通用风格画像",
          sourceSampleIds: ["note-1"],
          titleStyle: "自动标题风格",
          bodyStructure: "自动正文结构",
          tone: "自动语气",
          preferredTags: ["科普"],
          avoidExpressions: ["绝对化承诺"],
          generationGuidelines: ["先结论后建议"],
          createdAt: "2026-05-08T00:00:00.000Z",
          updatedAt: "2026-05-08T00:00:00.000Z"
        }
      },
      null,
      2
    )}\n`,
    "utf8"
  );
  await fs.writeFile(
    paths.noteRecords,
    `${JSON.stringify(
      [
        {
          id: "note-reference-a",
          source: "manual",
          stage: "published_reference",
          note: {
            title: "光明正大放桌上，让别人猜去！",
            body: "正文 A".repeat(40),
            tags: ["伪装学大师", "快乐的大人"]
          },
          reference: {
            enabled: true,
            tier: "performed"
          },
          publish: {
            status: "positive_performance",
            metrics: { likes: 27, favorites: 8, comments: 47, views: 4594 }
          }
        },
        {
          id: "note-reference-b",
          source: "manual",
          stage: "published_reference",
          note: {
            title: "说实话，你们都管“那个”叫什么",
            body: "正文 B".repeat(40),
            tags: ["伪装学大师", "抽象"]
          },
          reference: {
            enabled: true,
            tier: "passed"
          },
          publish: {
            status: "published_passed",
            metrics: { likes: 7, favorites: 1, comments: 10, views: 983 }
          }
        },
        {
          id: "note-regular-only",
          source: "manual",
          stage: "published_reference",
          note: {
            title: "普通样本",
            body: "普通正文",
            tags: ["普通"]
          },
          reference: {
            enabled: true,
            tier: "passed"
          },
          publish: {
            status: "published_passed",
            metrics: { likes: 0, favorites: 0, comments: 0, views: 20 }
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

  const listed = await invokeRoute("GET", "/api/admin/style-profile");
  assert.equal(listed.status, 200);
  assert.equal(listed.body.ok, true);
  assert.equal(listed.body.profile.current.topic, "通用风格");
  assert.deepEqual(listed.body.profile.current.sourceSampleIds, ["note-reference-a", "note-reference-b"]);
  assert.deepEqual(
    listed.body.profile.current.sourceSamples.map((item) => item.title),
    ["光明正大放桌上，让别人猜去！", "说实话，你们都管“那个”叫什么"]
  );
  assert.equal(listed.body.profile.current.generationMeta.method, "local_rule_fallback");

  const patched = await invokeRoute("PATCH", "/api/admin/style-profile", {
    profile: {
      topic: "手动修订主题",
      tone: "更像朋友提醒",
      preferredTags: ["关系沟通", "科普"],
      generationGuidelines: ["减少标题党", "多给具体建议"]
    }
  });

  assert.equal(patched.status, 200);
  assert.equal(patched.body.ok, true);
  assert.equal(patched.body.profile.current.topic, "手动修订主题");
  assert.equal(patched.body.profile.current.tone, "更像朋友提醒");
  assert.deepEqual(patched.body.profile.current.preferredTags, ["关系沟通", "科普"]);
  assert.equal(patched.body.profile.current.manualOverrides.tone, "更像朋友提醒");
  assert.deepEqual(patched.body.profile.current.sourceSampleIds, ["note-reference-a", "note-reference-b"]);

  const listedAgain = await invokeRoute("GET", "/api/admin/style-profile");
  assert.equal(listedAgain.status, 200);
  assert.equal(listedAgain.body.profile.current.topic, "手动修订主题");
  assert.equal(listedAgain.body.profile.current.manualOverrides.tone, "更像朋友提醒");
});

test("admin data returns the latest refreshed style profile instead of stale stored snapshot", async (t) => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "style-profile-admin-data-"));
  const originals = {
    styleProfile: paths.styleProfile,
    noteRecords: paths.noteRecords
  };
  paths.styleProfile = path.join(tempDir, "style-profile.json");
  paths.noteRecords = path.join(tempDir, "note-records.json");
  await fs.writeFile(
    paths.styleProfile,
    `${JSON.stringify(
      {
        current: {
          id: "style-profile-current",
          status: "active",
          topic: "旧画像",
          name: "旧画像名称",
          sourceSampleIds: ["note-legacy"],
          titleStyle: "旧标题风格",
          bodyStructure: "旧正文结构",
          tone: "旧语气",
          preferredTags: ["旧标签"],
          avoidExpressions: ["旧禁用项"],
          generationGuidelines: ["旧指导"],
          createdAt: "2026-05-08T00:00:00.000Z",
          updatedAt: "2026-05-08T00:00:00.000Z"
        }
      },
      null,
      2
    )}\n`,
    "utf8"
  );
  await fs.writeFile(
    paths.noteRecords,
    `${JSON.stringify(
      [
        {
          id: "note-reference-a",
          source: "manual",
          stage: "published_reference",
          note: {
            title: "光明正大放桌上，让别人猜去！",
            body: "正文 A".repeat(40),
            tags: ["伪装学大师", "快乐的大人"]
          },
          reference: {
            enabled: true,
            tier: "performed"
          },
          publish: {
            status: "positive_performance",
            metrics: { likes: 27, favorites: 8, comments: 47, views: 4594 }
          }
        },
        {
          id: "note-reference-b",
          source: "manual",
          stage: "published_reference",
          note: {
            title: "说实话，你们都管“那个”叫什么",
            body: "正文 B".repeat(40),
            tags: ["伪装学大师", "抽象"]
          },
          reference: {
            enabled: true,
            tier: "passed"
          },
          publish: {
            status: "published_passed",
            metrics: { likes: 7, favorites: 1, comments: 10, views: 983 }
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

  const listed = await invokeRoute("GET", "/api/admin/data");
  assert.equal(listed.status, 200);
  assert.equal(listed.body.styleProfile.current.topic, "旧画像");
  assert.deepEqual(listed.body.styleProfile.current.sourceSampleIds, ["note-reference-a", "note-reference-b"]);
});

test("admin style profile refresh clears stale source sample ids when the reference pool becomes empty", async (t) => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "style-profile-empty-reference-"));
  const originals = {
    styleProfile: paths.styleProfile,
    noteRecords: paths.noteRecords
  };
  paths.styleProfile = path.join(tempDir, "style-profile.json");
  paths.noteRecords = path.join(tempDir, "note-records.json");
  await fs.writeFile(
    paths.styleProfile,
    `${JSON.stringify(
      {
        current: {
          id: "style-profile-current",
          status: "active",
          topic: "旧画像",
          name: "旧画像名称",
          sourceSampleIds: ["note-reference-a", "note-reference-b"],
          titleStyle: "旧标题风格",
          bodyStructure: "旧正文结构",
          tone: "旧语气",
          preferredTags: ["旧标签"],
          avoidExpressions: ["旧禁用项"],
          generationGuidelines: ["旧指导"],
          createdAt: "2026-05-08T00:00:00.000Z",
          updatedAt: "2026-05-08T00:00:00.000Z"
        }
      },
      null,
      2
    )}\n`,
    "utf8"
  );
  await fs.writeFile(paths.noteRecords, "[]\n", "utf8");

  t.after(async () => {
    Object.assign(paths, originals);
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  const listed = await invokeRoute("GET", "/api/admin/style-profile");
  assert.equal(listed.status, 200);
  assert.deepEqual(listed.body.profile.current.sourceSampleIds, []);
  assert.deepEqual(listed.body.profile.current.sourceSamples, []);
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
