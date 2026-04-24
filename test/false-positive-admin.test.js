import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { paths } from "../src/config.js";
import { loadAdminData } from "../src/admin.js";
import { handleRequest } from "../src/server.js";

async function withTempFalsePositiveLog(t, run) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "false-positive-admin-"));
  const tempFile = path.join(tempDir, "false-positive-log.json");
  const originalPath = paths.falsePositiveLog;
  paths.falsePositiveLog = tempFile;

  t.after(async () => {
    paths.falsePositiveLog = originalPath;
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  return run();
}

test("loadAdminData includes false positive samples for maintenance", async (t) => {
  await withTempFalsePositiveLog(t, async () => {
    const seeded = [
      {
        id: "fp-admin-1",
        createdAt: "2026-04-20T00:00:00.000Z",
        updatedAt: "2026-04-20T00:00:00.000Z",
        status: "platform_passed_pending",
        title: "待确认样本",
        body: "这是一段很长的正文，用来确认管理面板不会只展示两行就没了，而是至少能看到状态和审核结论。",
        coverText: "封面文案",
        tags: ["两性", "关系沟通"],
        userNotes: "待观察",
        analysisSnapshot: {
          verdict: "manual_review",
          score: 41,
          categories: ["关系沟通"],
          suggestions: ["继续观察"],
          summary: "样本摘要"
        },
        falsePositiveAudit: {
          signal: "strict_pending",
          label: "规则偏严待确认",
          analyzerVerdict: "manual_review",
          notes: "先观察"
        }
      }
    ];
    await fs.writeFile(paths.falsePositiveLog, `${JSON.stringify(seeded, null, 2)}\n`, "utf8");

    const data = await loadAdminData();

    assert.equal(Array.isArray(data.falsePositiveLog), true);
    assert.equal(data.falsePositiveLog.length, 1);
    assert.equal(data.falsePositiveLog[0].id, "fp-admin-1");
    assert.equal(data.falsePositiveLog[0].status, "platform_passed_pending");
    assert.equal(data.falsePositiveLog[0].falsePositiveAudit.label, "规则偏严待确认");
    assert.match(data.falsePositiveLog[0].body, /很长的正文/);
  });
});

test("admin false positive endpoints confirm and delete samples", async (t) => {
  await withTempFalsePositiveLog(t, async () => {
    const seeded = [
      {
        id: "fp-admin-1",
        createdAt: "2026-04-20T00:00:00.000Z",
        updatedAt: "2026-04-20T00:00:00.000Z",
        status: "platform_passed_pending",
        title: "待确认样本",
        body: "第一条待确认样本",
        coverText: "",
        tags: ["两性"],
        userNotes: "待观察",
        analysisSnapshot: { verdict: "manual_review", score: 41, categories: [], suggestions: [] },
        falsePositiveAudit: { signal: "strict_pending", label: "规则偏严待确认", analyzerVerdict: "manual_review", notes: "先观察" }
      },
      {
        id: "fp-admin-2",
        createdAt: "2026-04-20T00:01:00.000Z",
        updatedAt: "2026-04-20T00:01:00.000Z",
        status: "platform_passed_pending",
        title: "要删除的样本",
        body: "第二条待确认样本",
        coverText: "",
        tags: ["关系沟通"],
        userNotes: "待删除",
        analysisSnapshot: { verdict: "manual_review", score: 41, categories: [], suggestions: [] },
        falsePositiveAudit: { signal: "strict_pending", label: "规则偏严待确认", analyzerVerdict: "manual_review", notes: "先观察" }
      }
    ];
    await fs.writeFile(paths.falsePositiveLog, `${JSON.stringify(seeded, null, 2)}\n`, "utf8");

    const patched = await invokeRoute("PATCH", "/api/admin/false-positive-log", {
      id: "fp-admin-1",
      status: "platform_passed_confirmed",
      userNotes: "观察期结束"
    });

    assert.equal(patched.status, 200);
    assert.equal(patched.ok, true);
    assert.equal(patched.items.length, 2);
    assert.equal(patched.items[0].status, "platform_passed_confirmed");
    assert.equal(patched.items[0].falsePositiveAudit.signal, "strict_confirmed");
    assert.equal(patched.items[0].userNotes, "观察期结束");
    assert.equal(patched.items[1].status, "platform_passed_pending");

    const deleted = await invokeRoute("DELETE", "/api/admin/false-positive-log", {
      id: "fp-admin-2"
    });

    assert.equal(deleted.status, 200);
    assert.equal(deleted.ok, true);
    assert.equal(deleted.items.length, 1);
    assert.equal(deleted.items[0].id, "fp-admin-1");

    const listed = await invokeRoute("GET", "/api/admin/false-positive-log");

    assert.equal(listed.status, 200);
    assert.equal(listed.ok, true);
    assert.equal(listed.items.length, 1);
    assert.equal(listed.items[0].status, "platform_passed_confirmed");
  });
});

test("admin page exposes a false positive samples tab and pane", async () => {
  const [indexHtml, appJs] = await Promise.all([
    fs.readFile(path.join(process.cwd(), "web/index.html"), "utf8"),
    fs.readFile(path.join(process.cwd(), "web/app.js"), "utf8")
  ]);

  assert.match(indexHtml, /data-tab-target="false-positive-log-pane"/);
  assert.match(indexHtml, /id="false-positive-log-list"/);
  assert.match(appJs, /renderFalsePositiveLog|false-positive-log-list/);
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

  const parsedBody = response.body ? JSON.parse(response.body) : {};
  return {
    status: response.status,
    ...parsedBody
  };
}
