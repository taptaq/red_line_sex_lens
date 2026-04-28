import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { paths } from "../src/config.js";
import { handleRequest } from "../src/server.js";

async function withTempGenerationData(t, run) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "generation-api-"));
  const originals = {
    successSamples: paths.successSamples,
    styleProfile: paths.styleProfile
  };
  paths.successSamples = path.join(tempDir, "success-samples.json");
  paths.styleProfile = path.join(tempDir, "style-profile.json");
  await fs.writeFile(
    paths.successSamples,
    `${JSON.stringify([{ id: "sample-1", tier: "featured", title: "参考标题", body: "参考正文", tags: ["沟通"] }], null, 2)}\n`,
    "utf8"
  );
  await fs.writeFile(
    paths.styleProfile,
    `${JSON.stringify({ current: { status: "active", preferredTags: ["沟通"], tone: "温和" }, draft: null }, null, 2)}\n`,
    "utf8"
  );

  t.after(async () => {
    Object.assign(paths, originals);
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  return run();
}

test("generation endpoint returns candidates with recommendation metadata", async (t) => {
  await withTempGenerationData(t, async () => {
    const result = await invokeRoute("POST", "/api/generate-note", {
      mode: "from_scratch",
      brief: { topic: "沟通", constraints: "温和" },
      mockCandidates: [
        { variant: "safe", title: "沟通标题", body: "完整正文".repeat(40), coverText: "封面", tags: ["沟通", "关系"] }
      ]
    });

    assert.equal(result.status, 200);
    assert.equal(result.ok, true);
    assert.equal(result.candidates.length, 1);
    assert.equal(result.scoredCandidates.length, 1);
    assert.equal(result.recommendedCandidateId, result.scoredCandidates[0].id);
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

  await handleRequest(request, response);
  return {
    status: response.status,
    ...(response.body ? JSON.parse(response.body) : {})
  };
}
