import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { paths } from "../src/config.js";
import { loadXhsTopSignalsBrowser, saveXhsTopSignalsBrowser } from "../src/data-store.js";
import { handleRequest } from "../src/server.js";
import { __resetXhsTopSignalsTestOverrides, __setXhsTopSignalsTestOverrides } from "../src/xhs-top-signals.js";

test("xhs top-signals browser store saves and loads the latest standalone cache", async (t) => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "xhs-top-signals-store-"));
  const originals = { xhsTopSignals: paths.xhsTopSignals };
  paths.xhsTopSignals = path.join(tempDir, "xhs-top-signals.json");

  t.after(async () => {
    Object.assign(paths, originals);
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  await saveXhsTopSignalsBrowser({
    accountContext: {
      redId: "26112666886",
      nickname: "测试号",
      derivedTrack: "情感",
      derivedTags: ["关系沟通"]
    },
    filters: { track: "情感", keyword: "边界", tags: ["关系沟通"] },
    items: {
      dailyTop: [{ id: "daily-1", title: "今日样本" }],
      weeklyTop: [],
      lowTop: []
    },
    generatedAt: "2026-05-30T10:00:00.000Z",
    resultCount: 1
  });

  const loaded = await loadXhsTopSignalsBrowser();
  const topSignalsCacheExists = await fs
    .access(paths.xhsTopSignals)
    .then(() => true)
    .catch(() => false);

  assert.equal(path.basename(paths.xhsTopSignals), "xhs-top-signals.json");
  assert.equal(topSignalsCacheExists, true);
  assert.equal(loaded.accountContext.redId, "26112666886");
  assert.equal(loaded.filters.keyword, "边界");
  assert.equal(loaded.items.dailyTop[0].title, "今日样本");
  assert.equal(loaded.resultCount, 1);
});

test("xhs top-signals browser POST rejects empty account and filters", async (t) => {
  await withTempTopSignalsApi(t, async ({ invokeRoute }) => {
    const result = await invokeRoute("POST", "/api/xhs/top-signals", {
      redId: "",
      track: "",
      keyword: "",
      tags: []
    });

    assert.equal(result.status, 400);
    assert.equal(result.ok, false);
    assert.match(result.error || "", /账号|筛选/);
  });
});

test("xhs top-signals browser POST with only redId derives topic from account lookup and refreshes standalone signals", async (t) => {
  await withTempTopSignalsApi(t, async ({ invokeRoute }) => {
    __setXhsTopSignalsTestOverrides({
      lookupAccountDiagnosis: async (redId) => ({
        account: {
          redId,
          nickname: "测试号",
          desc: "分享亲密关系和边界感话题",
          _raw: { tags: ["关系沟通"] }
        }
      }),
      fetchJson: async (_url, { params = {} } = {}) => ({
        code: 2000,
        data: [
          {
            id: `sample-${String(params.category || "")}`,
            title: "今日样本",
            desc: "关系内容",
            nickname: "作者",
            userAttribute: "腰部KOL",
            category: String(params.category || "")
          }
        ]
      })
    });

    const result = await invokeRoute("POST", "/api/xhs/top-signals", {
      redId: "26112666886"
    });

    assert.equal(result.status, 200);
    assert.equal(result.ok, true);
    assert.equal(Array.isArray(result.items.dailyTop), true);
    assert.equal(result.items.dailyTop[0].title, "今日样本");
    assert.equal(result.accountContext.redId, "26112666886");
    assert.equal(result.accountContext.nickname, "测试号");
    assert.equal(result.accountContext.derivedTrack, "星座情感");
    assert.deepEqual(result.accountContext.derivedTags, ["关系沟通"]);
    assert.equal(result.filters.track, "");
    assert.equal(result.items.dailyTop[0].track, "星座情感");
  });
});

test("xhs top-signals browser GET returns the latest cached standalone signals", async (t) => {
  await withTempTopSignalsApi(t, async ({ invokeRoute, saveBrowserState }) => {
    await saveBrowserState({
      accountContext: { redId: "26112666886" },
      filters: { track: "情感", keyword: "边界", tags: [] },
      items: {
        dailyTop: [{ id: "daily-1", title: "今日样本" }],
        weeklyTop: [],
        lowTop: []
      },
      generatedAt: "2026-05-30T10:00:00.000Z",
      resultCount: 1
    });

    const result = await invokeRoute("GET", "/api/xhs/top-signals");
    assert.equal(result.status, 200);
    assert.equal(result.ok, true);
    assert.equal(result.items.dailyTop[0].title, "今日样本");
  });
});

test("xhs top-signals browser returns refresh errors directly with no fallback cards", async (t) => {
  await withTempTopSignalsApi(t, async ({ invokeRoute }) => {
    __setXhsTopSignalsTestOverrides({
      lookupAccountDiagnosis: async (redId) => ({
        account: {
          redId,
          nickname: "测试号",
          desc: "分享亲密关系和边界感话题",
          _raw: { tags: ["关系沟通"] }
        }
      }),
      fetchJson: async () => {
        throw new Error("抓取失败");
      }
    });

    const result = await invokeRoute("POST", "/api/xhs/top-signals", {
      redId: "26112666886"
    });

    assert.equal(result.status, 500);
    assert.equal(result.ok, false);
    assert.match(result.error || "", /抓取失败/);
  });
});

async function withTempTopSignalsApi(t, run) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "xhs-top-signals-api-"));
  const originalPaths = {
    xhsTopSignals: paths.xhsTopSignals
  };
  paths.xhsTopSignals = path.join(tempDir, "xhs-top-signals.json");

  t.after(async () => {
    __resetXhsTopSignalsTestOverrides();
    Object.assign(paths, originalPaths);
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  return run({
    invokeRoute,
    saveBrowserState: saveXhsTopSignalsBrowser
  });
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
