import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { paths } from "../src/config.js";
import { loadNoteRecords } from "../src/data-store.js";
import { safeHandleRequest } from "../src/server.js";

async function withTempSampleLibraryMarkdownImportApi(t, run) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "sample-library-markdown-import-"));
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

test("sample library Markdown parse returns draft errors and commit persists only confirmed items", async (t) => {
  await withTempSampleLibraryMarkdownImportApi(t, async () => {
    const parsed = await invokeRoute("POST", "/api/sample-library/markdown-import/parse", {
      files: [{ name: "a.md", contentBase64: "" }]
    });

    assert.equal(parsed.status, 200);
    assert.equal(parsed.ok, true);
    assert.equal(parsed.items.length, 1);
    assert.equal(parsed.items[0].fileName, "a.md");
    assert.equal(parsed.items[0].status, "error");
    assert.equal(parsed.items[0].title, "");
    assert.equal(parsed.items[0].body, "");

    const committed = await invokeRoute("POST", "/api/sample-library/markdown-import/commit", {
      items: [
        {
          selected: true,
          fileName: "a.md",
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
          fileName: "skip.md",
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

test("sample library Markdown parse strips heading titles and markdown syntax into plain body text", async (t) => {
  await withTempSampleLibraryMarkdownImportApi(t, async () => {
    const content = Buffer.from(
      [
        "# sample",
        "",
        "第一段 **正文**",
        "- 第二段正文",
        "[延伸阅读](https://example.com)"
      ].join("\n"),
      "utf8"
    ).toString("base64");

    const parsed = await invokeRoute("POST", "/api/sample-library/markdown-import/parse", {
      files: [{ name: "sample.md", contentBase64: content }]
    });

    assert.equal(parsed.status, 200);
    assert.equal(parsed.ok, true);
    assert.equal(parsed.items.length, 1);
    assert.equal(parsed.items[0].title, "sample");
    assert.equal(parsed.items[0].body, "第一段 正文\n第二段正文\n延伸阅读");
  });
});

test("sample library Markdown parse auto-skips drafts whose titles already exist in note records and returns a message", async (t) => {
  await withTempSampleLibraryMarkdownImportApi(t, async () => {
    await invokeRoute("POST", "/api/sample-library", {
      source: "manual",
      stage: "draft",
      note: {
        title: "重复标题",
        coverText: "旧封面",
        body: "旧正文",
        collectionType: "科普",
        tags: ["旧标签"]
      }
    });

    const duplicateContent = Buffer.from(["# 【批量导入】重复标题", "", "这条应该被自动跳过"].join("\n"), "utf8").toString("base64");
    const freshContent = Buffer.from(["# 新标题", "", "这条应该保留下来"].join("\n"), "utf8").toString("base64");

    const parsed = await invokeRoute("POST", "/api/sample-library/markdown-import/parse", {
      files: [
        { name: "duplicate.md", contentBase64: duplicateContent },
        { name: "fresh.md", contentBase64: freshContent }
      ]
    });

    assert.equal(parsed.status, 200);
    assert.equal(parsed.ok, true);
    assert.equal(parsed.items.length, 1);
    assert.equal(parsed.items[0].title, "新标题");
    assert.match(parsed.message, /已自动跳过 1 条重复的 Markdown 记录/);
    assert.match(parsed.message, /重复标题/);
    assert.doesNotMatch(parsed.message, /【批量导入】/);
  });
});

test("sample library Markdown parse auto-skips duplicate drafts within the same batch and keeps only one", async (t) => {
  await withTempSampleLibraryMarkdownImportApi(t, async () => {
    const firstContent = Buffer.from(["# 批次重复标题", "", "同一段正文内容"].join("\n"), "utf8").toString("base64");
    const secondContent = Buffer.from(["# 批次重复标题", "", "同一段正文内容"].join("\n"), "utf8").toString("base64");

    const parsed = await invokeRoute("POST", "/api/sample-library/markdown-import/parse", {
      files: [
        { name: "first.md", contentBase64: firstContent },
        { name: "second.md", contentBase64: secondContent }
      ]
    });

    assert.equal(parsed.status, 200);
    assert.equal(parsed.ok, true);
    assert.equal(parsed.items.length, 1);
    assert.equal(parsed.items[0].title, "批次重复标题");
    assert.match(parsed.message, /已自动跳过 1 条重复的 Markdown 记录/);
    assert.match(parsed.message, /批次重复标题/);
  });
});

test("sample library Markdown commit rejects selected incomplete items before writing anything", async (t) => {
  await withTempSampleLibraryMarkdownImportApi(t, async () => {
    const committed = await invokeRoute("POST", "/api/sample-library/markdown-import/commit", {
      items: [
        {
          selected: true,
          fileName: "valid.md",
          title: "先不要落库",
          body: "这条本来是有效的",
          collectionType: "科普"
        },
        {
          selected: true,
          fileName: "invalid.md",
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

test("sample library Markdown commit rejects mixed selected batches with invalid collection types before partial writes", async (t) => {
  await withTempSampleLibraryMarkdownImportApi(t, async () => {
    const committed = await invokeRoute("POST", "/api/sample-library/markdown-import/commit", {
      items: [
        {
          selected: true,
          fileName: "valid.md",
          title: "先不要落库",
          body: "这条本来是有效的",
          collectionType: "科普"
        },
        {
          selected: true,
          fileName: "invalid-type.md",
          title: "类型不合法",
          body: "这条会触发合集类型校验",
          collectionType: "未知类型"
        },
        {
          selected: false,
          fileName: "skip.md",
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

test("sample library Markdown commit rejects duplicate items against existing note records", async (t) => {
  await withTempSampleLibraryMarkdownImportApi(t, async () => {
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

    const committed = await invokeRoute("POST", "/api/sample-library/markdown-import/commit", {
      items: [
        {
          selected: true,
          fileName: "duplicate.md",
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

test("sample library Markdown commit rejects duplicate items within the same selected batch", async (t) => {
  await withTempSampleLibraryMarkdownImportApi(t, async () => {
    const committed = await invokeRoute("POST", "/api/sample-library/markdown-import/commit", {
      items: [
        {
          selected: true,
          fileName: "a.md",
          title: "批次重复标题",
          coverText: "批次重复封面",
          body: "批次重复正文",
          collectionType: "科普"
        },
        {
          selected: true,
          fileName: "b.md",
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

test("legacy sample library PDF import routes are no longer exposed at runtime", async (t) => {
  await withTempSampleLibraryMarkdownImportApi(t, async () => {
    const parsed = await invokeRoute("POST", "/api/sample-library/pdf-import/parse", {
      files: []
    });
    const committed = await invokeRoute("POST", "/api/sample-library/pdf-import/commit", {
      items: []
    });

    assert.equal(parsed.status, 404);
    assert.equal(committed.status, 404);
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
