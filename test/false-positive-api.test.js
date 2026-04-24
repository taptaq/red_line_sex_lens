import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { paths } from "../src/config.js";
import { handleRequest, buildFalsePositivePayload } from "../src/server.js";

async function withTempFalsePositiveLog(t, run) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "false-positive-api-"));
  const tempFile = path.join(tempDir, "false-positive-log.json");
  const originalPath = paths.falsePositiveLog;
  paths.falsePositiveLog = tempFile;

  t.after(async () => {
    paths.falsePositiveLog = originalPath;
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  return run();
}

test("buildFalsePositivePayload attaches analysis snapshot and audit", () => {
  const payload = buildFalsePositivePayload({
    title: "标题",
    body: "正文",
    status: "platform_passed_pending",
    analysis: { verdict: "manual_review", score: 40, hits: [], suggestions: [] }
  });

  assert.equal(payload.status, "platform_passed_pending");
  assert.equal(payload.analysisSnapshot.verdict, "manual_review");
  assert.equal(payload.falsePositiveAudit.signal, "strict_pending");
});

test("false positive log endpoints create, read, and patch samples", async (t) => {
  await withTempFalsePositiveLog(t, async () => {
    const createdAt = "2026-04-20T00:00:00.000Z";
    const created = await invokeRoute("POST", "/api/false-positive-log", {
      id: "fp-1",
      createdAt,
      title: "标题",
      body: "正文",
      status: "platform_passed_pending",
      tags: ["关系沟通", "关系沟通"],
      analysis: { verdict: "manual_review", score: 40, hits: [], suggestions: [] }
    });

    assert.equal(created.status, 200);
    assert.equal(created.ok, true);
    assert.equal(created.items.length, 1);
    assert.equal(created.items[0].analysisSnapshot.verdict, "manual_review");
    assert.equal(created.items[0].falsePositiveAudit.signal, "strict_pending");
    assert.deepEqual(created.items[0].tags, ["关系沟通"]);
    assert.equal(created.items[0].createdAt, createdAt);

    const listed = await invokeRoute("GET", "/api/false-positive-log");

    assert.equal(listed.status, 200);
    assert.equal(listed.ok, true);
    assert.equal(listed.items.length, 1);
    assert.equal(listed.items[0].id, "fp-1");

    const patched = await invokeRoute("PATCH", "/api/false-positive-log", {
      id: "fp-1",
      status: "platform_passed_confirmed",
      userNotes: "观察期结束"
    });

    assert.equal(patched.status, 200);
    assert.equal(patched.ok, true);
    assert.equal(patched.items[0].status, "platform_passed_confirmed");
    assert.equal(patched.items[0].userNotes, "观察期结束");
    assert.equal(patched.items[0].analysisSnapshot.verdict, "manual_review");
    assert.equal(patched.items[0].falsePositiveAudit.signal, "strict_confirmed");
    assert.equal(patched.items[0].createdAt, createdAt);
  });
});

test("false positive log rejects duplicate sample IDs on create", async (t) => {
  await withTempFalsePositiveLog(t, async () => {
    const firstCreate = await invokeRoute("POST", "/api/false-positive-log", {
      id: "fp-dup",
      title: "标题一",
      body: "正文一",
      status: "platform_passed_pending",
      analysis: { verdict: "manual_review", score: 40, hits: [], suggestions: [] }
    });
    const duplicateCreate = await invokeRoute("POST", "/api/false-positive-log", {
      id: "fp-dup",
      title: "标题二",
      body: "正文二",
      status: "platform_passed_pending",
      analysis: { verdict: "manual_review", score: 40, hits: [], suggestions: [] }
    });

    assert.equal(firstCreate.status, 200);
    assert.equal(firstCreate.items.length, 1);
    assert.equal(duplicateCreate.status, 409);
    assert.match(duplicateCreate.error, /duplicate|重复|存在/i);

    const listed = await invokeRoute("GET", "/api/false-positive-log");
    assert.equal(listed.items.length, 1);
    assert.equal(listed.items[0].id, "fp-dup");
    assert.equal(listed.items[0].title, "标题一");
  });
});

test("false positive log patch updates only one matching duplicate record", async (t) => {
  await withTempFalsePositiveLog(t, async () => {
    const seeded = [
      {
        id: "fp-dup",
        createdAt: "2026-04-20T00:00:00.000Z",
        updatedAt: "2026-04-20T00:00:00.000Z",
        status: "platform_passed_pending",
        title: "标题一",
        body: "正文一",
        coverText: "",
        tags: ["关系沟通"],
        userNotes: "原始备注一",
        analysisSnapshot: { verdict: "manual_review", score: 40, categories: [], hitCount: 0, topHits: [], suggestions: [] },
        falsePositiveAudit: { signal: "strict_pending", label: "规则偏严待确认", analyzerVerdict: "manual_review", notes: "示例" }
      },
      {
        id: "fp-dup",
        createdAt: "2026-04-20T00:01:00.000Z",
        updatedAt: "2026-04-20T00:01:00.000Z",
        status: "platform_passed_pending",
        title: "标题二",
        body: "正文二",
        coverText: "",
        tags: ["关系沟通"],
        userNotes: "原始备注二",
        analysisSnapshot: { verdict: "manual_review", score: 40, categories: [], hitCount: 0, topHits: [], suggestions: [] },
        falsePositiveAudit: { signal: "strict_pending", label: "规则偏严待确认", analyzerVerdict: "manual_review", notes: "示例" }
      }
    ];
    await fs.writeFile(paths.falsePositiveLog, `${JSON.stringify(seeded, null, 2)}\n`, "utf8");

    const patched = await invokeRoute("PATCH", "/api/false-positive-log", {
      id: "fp-dup",
      status: "platform_passed_confirmed",
      userNotes: "观察期结束"
    });

    assert.equal(patched.status, 200);
    assert.equal(patched.items.length, 2);
    assert.equal(patched.items.filter((item) => item.status === "platform_passed_confirmed").length, 1);
    assert.equal(patched.items.filter((item) => item.status === "platform_passed_pending").length, 1);
    assert.equal(patched.items[0].status, "platform_passed_confirmed");
    assert.equal(patched.items[0].userNotes, "观察期结束");
    assert.equal(patched.items[1].status, "platform_passed_pending");
    assert.equal(patched.items[1].userNotes, "原始备注二");

    const listed = await invokeRoute("GET", "/api/false-positive-log");
    assert.equal(listed.items.filter((item) => item.status === "platform_passed_confirmed").length, 1);
    assert.equal(listed.items.filter((item) => item.status === "platform_passed_pending").length, 1);
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

  try {
    await handleRequest(request, response);
  } catch (error) {
    response.writeHead(Number(error?.statusCode) || 500, { "Content-Type": "application/json; charset=utf-8" });
    response.end(
      JSON.stringify(
        {
          ok: false,
          error: error instanceof Error ? error.message : "Unknown server error"
        },
        null,
        2
      )
    );
  }

  const result = response;
  const parsedBody = result.body ? JSON.parse(result.body) : {};
  return {
    status: result.status,
    ...parsedBody
  };
}
