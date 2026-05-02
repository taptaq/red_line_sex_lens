import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { paths } from "../src/config.js";
import { buildNoteRecord } from "../src/note-records.js";
import {
  safeHandleRequest,
  setReviewBenchmarkHarnessRunnerForTests
} from "../src/server.js";

async function withTempReviewBenchmarkApi(t, run) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "review-benchmark-api-"));
  const originals = {
    collectionTypes: paths.collectionTypes,
    reviewBenchmark: paths.reviewBenchmark
  };
  const originalRunner = setReviewBenchmarkHarnessRunnerForTests(null);
  paths.collectionTypes = path.join(tempDir, "collection-types.json");
  paths.reviewBenchmark = path.join(tempDir, "review-benchmark.json");
  await fs.writeFile(paths.collectionTypes, `${JSON.stringify({ custom: [] }, null, 2)}\n`, "utf8");
  await fs.mkdir(path.dirname(paths.reviewBenchmark), { recursive: true });
  await fs.writeFile(paths.reviewBenchmark, "[]\n", "utf8");

  t.after(async () => {
    setReviewBenchmarkHarnessRunnerForTests(originalRunner);
    Object.assign(paths, originals);
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  return run();
}

test("review benchmark API creates, lists, deletes, and runs samples", async (t) => {
  await withTempReviewBenchmarkApi(t, async () => {
    const created = await invokeRoute("POST", "/api/review-benchmark", {
      title: "关系沟通提醒",
      body: "这是一条容易误报的正文",
      collectionType: "科普",
      tags: "关系, 沟通, 关系",
      expectedType: "误报样本"
    });

    assert.equal(created.status, 200);
    assert.equal(created.ok, true);
    assert.equal(created.items.length, 1);
    assert.equal(created.item.id, created.items[0].id);
    assert.equal(created.items[0].expectedType, "false_positive");
    assert.deepEqual(created.items[0].input, {
      title: "关系沟通提醒",
      body: "这是一条容易误报的正文",
      coverText: "",
      collectionType: "科普",
      tags: ["关系", "沟通"]
    });

    const listed = await invokeRoute("GET", "/api/review-benchmark");
    assert.equal(listed.status, 200);
    assert.equal(listed.ok, true);
    assert.equal(listed.items.length, 1);
    assert.deepEqual(listed.items, created.items);

    let receivedFilePath = "";
    setReviewBenchmarkHarnessRunnerForTests(async ({ filePath, samples }) => {
      receivedFilePath = filePath;
      assert.equal(samples[0].expectedType, "false_positive");
      return {
        ok: true,
        sampleFile: filePath,
        summary: {
          total: 1,
          passed: 1,
          failed: 0,
          byExpectedType: { false_positive: 1 },
          byVerdict: { manual_review: 1 }
        },
        results: [
          {
            id: listed.items[0].id,
            expectedType: "false_positive",
            expectedVerdictGroup: "flagged",
            actualVerdict: "manual_review",
            matchedExpectation: true,
            score: 42,
            input: listed.items[0].input,
            analysis: { finalVerdict: "manual_review", score: 42 }
          }
        ]
      };
    });

    const run = await invokeRoute("POST", "/api/review-benchmark/run", {});
    assert.equal(run.status, 200);
    assert.equal(run.ok, true);
    assert.equal(receivedFilePath, paths.reviewBenchmark);
    assert.equal(run.sampleFile, paths.reviewBenchmark);
    assert.equal(run.summary.total, 1);
    assert.equal(run.results[0].matchedExpectation, true);

    const deleted = await invokeRoute("DELETE", "/api/review-benchmark", { id: listed.items[0].id });
    assert.equal(deleted.status, 200);
    assert.equal(deleted.ok, true);
    assert.deepEqual(deleted.items, []);
  });
});

test("review benchmark API rejects unknown expectedType and returns 404 when deleting a missing sample", async (t) => {
  await withTempReviewBenchmarkApi(t, async () => {
    const created = await invokeRoute("POST", "/api/review-benchmark", {
      title: "未知类型样本",
      body: "正文",
      tags: ["标签A"],
      expectedType: "未识别样本"
    });

    assert.equal(created.status, 400);
    assert.equal(created.ok, false);
    assert.match(created.error, /预期类型无效/);

    const missingDelete = await invokeRoute("DELETE", "/api/review-benchmark", { id: "missing-id" });
    assert.equal(missingDelete.status, 404);
    assert.equal(missingDelete.ok, false);
    assert.match(missingDelete.error, /未找到要删除的基准样本/);
  });
});

test("review benchmark API does not create duplicate samples and preserves source metadata", async (t) => {
  await withTempReviewBenchmarkApi(t, async () => {
    const first = await invokeRoute("POST", "/api/review-benchmark", {
      title: "重复样本标题",
      body: "重复样本正文",
      collectionType: "疗愈指南",
      tags: ["关系", "沟通"],
      expectedType: "正常通过样本",
      source: {
        type: "sample_library",
        recordId: "note-001"
      }
    });

    const duplicate = await invokeRoute("POST", "/api/review-benchmark", {
      title: " 重复样本标题 ",
      body: "重复样本正文",
      collectionType: "疗愈指南",
      tags: ["沟通", "关系", "关系"],
      expectedType: "success",
      source: {
        type: "sample_library",
        recordId: "note-001"
      }
    });

    assert.equal(first.status, 200);
    assert.equal(first.items.length, 1);
    assert.deepEqual(first.item.source, {
      type: "sample_library",
      recordId: "note-001"
    });

    assert.equal(duplicate.status, 200);
    assert.equal(duplicate.ok, true);
    assert.equal(duplicate.duplicate, true);
    assert.equal(duplicate.items.length, 1);
    assert.equal(duplicate.item.id, first.item.id);
    assert.deepEqual(duplicate.item.source, {
      type: "sample_library",
      recordId: "note-001"
    });
  });
});

test("review benchmark API can create a sample directly from a canonical note record payload", async (t) => {
  await withTempReviewBenchmarkApi(t, async () => {
    const created = await invokeRoute("POST", "/api/review-benchmark", {
      expectedType: "误报样本",
      noteRecord: buildNoteRecord({
        id: "note-bridge-001",
        note: {
          title: "桥接标题",
          body: "桥接正文",
          coverText: "桥接封面",
          collectionType: "科普",
          tags: ["关系", "沟通"]
        }
      }),
      source: {
        type: "sample_library",
        recordId: "note-bridge-001"
      }
    });

    assert.equal(created.status, 200);
    assert.equal(created.ok, true);
    assert.equal(created.item.expectedType, "false_positive");
    assert.deepEqual(created.item.source, {
      type: "sample_library",
      recordId: "note-bridge-001"
    });
    assert.deepEqual(created.item.input, {
      title: "桥接标题",
      body: "桥接正文",
      coverText: "桥接封面",
      collectionType: "科普",
      tags: ["关系", "沟通"]
    });
  });
});

test("review benchmark run rejects stored samples whose expectedType is invalid", async (t) => {
  await withTempReviewBenchmarkApi(t, async () => {
    await fs.writeFile(paths.reviewBenchmark, `${JSON.stringify([
      {
        id: "broken-sample",
        expectedType: "",
        input: {
          title: "无效样本",
          body: "正文",
          tags: ["标签A"]
        }
      }
    ], null, 2)}\n`, "utf8");

    const run = await invokeRoute("POST", "/api/review-benchmark/run", {});
    assert.equal(run.status, 400);
    assert.equal(run.ok, false);
    assert.match(run.error, /预期类型无效/);
  });
});

test("review benchmark run normalizes legacy Chinese expectedType before invoking harness", async (t) => {
  await withTempReviewBenchmarkApi(t, async () => {
    await fs.writeFile(paths.reviewBenchmark, `${JSON.stringify([
      {
        id: "legacy-chinese-type",
        expectedType: "误报样本",
        input: {
          title: "旧格式样本",
          body: "正文",
          tags: ["标签A"]
        }
      }
    ], null, 2)}\n`, "utf8");

    let receivedSamples = [];
    setReviewBenchmarkHarnessRunnerForTests(async ({ samples }) => {
      receivedSamples = samples;
      return {
        ok: true,
        sampleFile: paths.reviewBenchmark,
        summary: {
          total: 1,
          passed: 1,
          failed: 0,
          byExpectedType: { false_positive: 1 },
          byVerdict: { manual_review: 1 }
        },
        results: []
      };
    });

    const run = await invokeRoute("POST", "/api/review-benchmark/run", {});
    assert.equal(run.status, 200);
    assert.equal(receivedSamples[0].expectedType, "false_positive");
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
    if (body !== null) {
      request.emit("data", Buffer.from(JSON.stringify(body)));
    }
    request.emit("end");
  });

  await safeHandleRequest(request, response);
  return {
    status: response.status,
    ...(response.body ? JSON.parse(response.body) : {})
  };
}
