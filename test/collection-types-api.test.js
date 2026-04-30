import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { paths } from "../src/config.js";
import { safeHandleRequest } from "../src/server.js";

async function withTempCollectionTypesApi(t, run) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "collection-types-api-"));
  const originalPath = paths.collectionTypes;
  paths.collectionTypes = path.join(tempDir, "collection-types.json");
  await fs.writeFile(paths.collectionTypes, `${JSON.stringify({ custom: [] }, null, 2)}\n`, "utf8");

  t.after(async () => {
    paths.collectionTypes = originalPath;
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  return run();
}

test("collection type API returns predefined plus saved custom options", async (t) => {
  await withTempCollectionTypesApi(t, async () => {
    await fs.writeFile(paths.collectionTypes, `${JSON.stringify({ custom: ["新系列实验室"] }, null, 2)}\n`, "utf8");
    const result = await invokeRoute("GET", "/api/collection-types");

    assert.equal(result.status, 200);
    assert.equal(result.ok, true);
    assert.equal(result.options.includes("科普"), true);
    assert.equal(result.options.includes("新系列实验室"), true);
  });
});

test("collection type API saves a new custom option once", async (t) => {
  await withTempCollectionTypesApi(t, async () => {
    const created = await invokeRoute("POST", "/api/collection-types", {
      name: "新系列实验室"
    });
    const duplicated = await invokeRoute("POST", "/api/collection-types", {
      name: " 新系列实验室 "
    });

    assert.equal(created.status, 200);
    assert.equal(created.ok, true);
    assert.equal(created.options.includes("新系列实验室"), true);
    assert.equal(duplicated.options.filter((item) => item === "新系列实验室").length, 1);
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

  const completion = safeHandleRequest(request, response).then(() => response);

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
