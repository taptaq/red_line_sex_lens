import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { paths } from "../src/config.js";
import { handleRequest } from "../src/server.js";

async function withTempRewritePairsRouteData(t, run) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "rewrite-pairs-api-"));
  const originals = {
    rewritePairs: paths.rewritePairs,
    lexiconSeed: paths.lexiconSeed,
    lexiconCustom: paths.lexiconCustom,
    whitelist: paths.whitelist,
    falsePositiveLog: paths.falsePositiveLog
  };

  paths.rewritePairs = path.join(tempDir, "rewrite-pairs.json");
  paths.lexiconSeed = path.join(tempDir, "lexicon.seed.json");
  paths.lexiconCustom = path.join(tempDir, "lexicon.custom.json");
  paths.whitelist = path.join(tempDir, "whitelist.json");
  paths.falsePositiveLog = path.join(tempDir, "false-positive-log.json");

  await Promise.all([
    fs.writeFile(paths.rewritePairs, "[]\n", "utf8"),
    fs.writeFile(paths.lexiconSeed, "[]\n", "utf8"),
    fs.writeFile(paths.lexiconCustom, "[]\n", "utf8"),
    fs.writeFile(paths.whitelist, "[]\n", "utf8"),
    fs.writeFile(paths.falsePositiveLog, "[]\n", "utf8")
  ]);

  t.after(async () => {
    Object.assign(paths, originals);
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  return run();
}

test("rewrite pairs API rejects fully blank placeholder samples", async (t) => {
  await withTempRewritePairsRouteData(t, async () => {
    const result = await invokeRoute("POST", "/api/rewrite-pairs", {
      name: "",
      before: {
        title: "",
        body: "",
        coverText: "",
        tags: []
      },
      after: {
        title: "",
        body: "",
        coverText: "",
        tags: []
      }
    });

    assert.equal(result.status, 400);
    assert.match(result.error || "", /改写样本不能为空|至少填写/);

    const persisted = JSON.parse(await fs.readFile(paths.rewritePairs, "utf8"));
    assert.deepEqual(persisted, []);
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
