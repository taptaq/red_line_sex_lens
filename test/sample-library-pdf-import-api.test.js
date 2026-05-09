import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { paths } from "../src/config.js";
import { loadNoteRecords } from "../src/data-store.js";
import { safeHandleRequest } from "../src/server.js";

async function withTempSampleLibraryPdfImportApi(t, run) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "sample-library-pdf-import-"));
  const originals = {
    collectionTypes: paths.collectionTypes,
    styleProfile: paths.styleProfile,
    successSamples: paths.successSamples,
    noteLifecycle: paths.noteLifecycle,
    noteRecords: paths.noteRecords
  };

  paths.collectionTypes = path.join(tempDir, "collection-types.json");
  paths.styleProfile = path.join(tempDir, "style-profile.json");
  paths.successSamples = path.join(tempDir, "success-samples.json");
  paths.noteLifecycle = path.join(tempDir, "note-lifecycle.json");
  paths.noteRecords = path.join(tempDir, "note-records.json");

  await Promise.all([
    fs.writeFile(paths.collectionTypes, `${JSON.stringify({ custom: [] }, null, 2)}\n`, "utf8"),
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
    fs.writeFile(paths.successSamples, "[]\n", "utf8"),
    fs.writeFile(paths.noteLifecycle, "[]\n", "utf8")
  ]);

  t.after(async () => {
    Object.assign(paths, originals);
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  return run();
}

test("sample library PDF parse returns draft errors and commit persists only confirmed items", async (t) => {
  await withTempSampleLibraryPdfImportApi(t, async () => {
    const parsed = await invokeRoute("POST", "/api/sample-library/pdf-import/parse", {
      files: [{ name: "a.pdf", contentBase64: "" }]
    });

    assert.equal(parsed.status, 200);
    assert.equal(parsed.ok, true);
    assert.equal(parsed.items.length, 1);
    assert.equal(parsed.items[0].fileName, "a.pdf");
    assert.equal(parsed.items[0].status, "error");
    assert.equal(parsed.items[0].title, "");
    assert.equal(parsed.items[0].body, "");

    const committed = await invokeRoute("POST", "/api/sample-library/pdf-import/commit", {
      items: [
        {
          selected: true,
          fileName: "a.pdf",
          title: "标题A",
          coverText: "封面A",
        body: "正文A第一段\n正文A第二段",
        collectionType: "科普",
        tags: "经验, 分享",
        referenceTier: "featured",
        referenceNotes: "适合作为批量导入参考样本",
        publishStatus: "positive_performance",
        publishedAt: "2026-05-06",
        platformReason: "发布后表现稳定",
        publishNotes: "24h 指标增长稳定",
        likes: "12",
        favorites: "5",
        comments: "1",
        views: "88"
      },
        {
          selected: false,
          fileName: "skip.pdf",
          title: "跳过",
          body: "跳过正文",
          collectionType: "科普"
        }
      ]
    });

    const records = await loadNoteRecords();

    assert.equal(committed.status, 200);
    assert.equal(committed.ok, true);
    assert.equal(committed.createdCount, 1);
    assert.equal(committed.styleProfile.current.topic, "旧画像");
    assert.deepEqual(committed.styleProfile.current.sourceSampleIds, [committed.item.id]);
    assert.equal(records.length, 1);
    assert.equal(records[0].note.title, "标题A");
    assert.equal(records[0].note.coverText, "封面A");
    assert.deepEqual(records[0].note.tags, ["经验", "分享"]);
    assert.equal(records[0].reference.enabled, true);
    assert.equal(records[0].reference.tier, "featured");
    assert.equal(records[0].reference.notes, "适合作为批量导入参考样本");
    assert.equal(records[0].publish.status, "positive_performance");
    assert.equal(records[0].publish.publishedAt, "2026-05-06");
    assert.equal(records[0].publish.platformReason, "发布后表现稳定");
    assert.equal(records[0].publish.notes, "24h 指标增长稳定");
    assert.equal(records[0].publish.metrics.likes, 12);
    assert.equal(records[0].publish.metrics.favorites, 5);
    assert.equal(records[0].publish.metrics.comments, 1);
    assert.equal(records[0].publish.metrics.views, 88);
  });
});

test("sample library PDF commit rejects selected incomplete items before writing anything", async (t) => {
  await withTempSampleLibraryPdfImportApi(t, async () => {
    const committed = await invokeRoute("POST", "/api/sample-library/pdf-import/commit", {
      items: [
        {
          selected: true,
          fileName: "valid.pdf",
          title: "先不要落库",
          body: "这条本来是有效的",
          collectionType: "科普"
        },
        {
          selected: true,
          fileName: "invalid.pdf",
          title: "缺正文",
          body: "",
          collectionType: "科普"
        }
      ]
    });

    const records = await loadNoteRecords();

    assert.equal(committed.status, 400);
    assert.equal(committed.ok, false);
    assert.match(committed.error, /标题|正文|合集类型/);
    assert.deepEqual(records, []);
  });
});

test("sample library PDF commit rejects mixed selected batches with invalid collection types before partial writes", async (t) => {
  await withTempSampleLibraryPdfImportApi(t, async () => {
    const committed = await invokeRoute("POST", "/api/sample-library/pdf-import/commit", {
      items: [
        {
          selected: true,
          fileName: "valid.pdf",
          title: "先不要落库",
          body: "这条本来是有效的",
          collectionType: "科普"
        },
        {
          selected: true,
          fileName: "invalid-type.pdf",
          title: "类型不合法",
          body: "这条会触发合集类型校验",
          collectionType: "未知类型"
        },
        {
          selected: false,
          fileName: "skip.pdf",
          title: "未勾选",
          body: "不应参与校验",
          collectionType: "科普"
        }
      ]
    });

    const records = await loadNoteRecords();

    assert.equal(committed.status, 400);
    assert.equal(committed.ok, false);
    assert.match(committed.error, /合集类型无效或未选择/);
    assert.deepEqual(records, []);
  });
});

test("sample library PDF commit rejects duplicate items against existing note records", async (t) => {
  await withTempSampleLibraryPdfImportApi(t, async () => {
    await invokeRoute("POST", "/api/sample-library", {
      source: "manual",
      stage: "draft",
      note: {
        title: "重复标题",
        coverText: "重复封面",
        body: "重复正文",
        collectionType: "科普",
        tags: ["旧标签"]
      }
    });

    const committed = await invokeRoute("POST", "/api/sample-library/pdf-import/commit", {
      items: [
        {
          selected: true,
          fileName: "duplicate.pdf",
          title: "重复标题",
          coverText: "重复封面",
          body: "重复正文",
          collectionType: "科普"
        }
      ]
    });

    const records = await loadNoteRecords();

    assert.equal(committed.status, 409);
    assert.equal(committed.ok, false);
    assert.match(committed.error, /重复/);
    assert.equal(records.length, 1);
  });
});

test("sample library PDF commit rejects duplicate items within the same selected batch", async (t) => {
  await withTempSampleLibraryPdfImportApi(t, async () => {
    const committed = await invokeRoute("POST", "/api/sample-library/pdf-import/commit", {
      items: [
        {
          selected: true,
          fileName: "a.pdf",
          title: "批次重复标题",
          coverText: "批次重复封面",
          body: "批次重复正文",
          collectionType: "科普"
        },
        {
          selected: true,
          fileName: "b.pdf",
          title: "批次重复标题",
          coverText: "批次重复封面",
          body: "批次重复正文",
          collectionType: "科普"
        }
      ]
    });

    const records = await loadNoteRecords();

    assert.equal(committed.status, 409);
    assert.equal(committed.ok, false);
    assert.match(committed.error, /重复/);
    assert.deepEqual(records, []);
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
