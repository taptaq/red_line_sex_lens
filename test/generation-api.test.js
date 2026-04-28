import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { paths } from "../src/config.js";
import { buildGenerationReferenceSamples, handleRequest } from "../src/server.js";

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
    `${JSON.stringify(
      {
        current: { id: "profile-default", status: "active", topic: "默认", preferredTags: ["沟通"], tone: "温和" },
        versions: [
          { id: "profile-default", status: "active", topic: "默认", preferredTags: ["沟通"], tone: "温和" },
          { id: "profile-alt", status: "archived", topic: "体验", preferredTags: ["体验"], tone: "体验向" }
        ],
        draft: null
      },
      null,
      2
    )}\n`,
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

test("generation endpoint can use a selected style profile version", async (t) => {
  await withTempGenerationData(t, async () => {
    const result = await invokeRoute("POST", "/api/generate-note", {
      mode: "from_scratch",
      styleProfileId: "profile-alt",
      brief: { topic: "体验", constraints: "克制" },
      mockCandidates: [
        { variant: "safe", title: "体验标题", body: "完整正文".repeat(40), coverText: "封面", tags: ["体验"] }
      ]
    });

    assert.equal(result.status, 200);
    assert.equal(result.scoredCandidates[0].style.reasons.some((item) => /体验/.test(item)), true);
  });
});

test("published final generation drafts become weighted references for the next generation", () => {
  const references = buildGenerationReferenceSamples({
    successSamples: [{ id: "manual-passed", tier: "passed", title: "普通过审样本", body: "普通正文" }],
    noteLifecycle: [
      {
        id: "life-final",
        source: "generation_final",
        status: "positive_performance",
        note: {
          title: "最终推荐稿样本",
          body: "发布后表现好的最终推荐稿正文",
          tags: ["科普"]
        },
        publishResult: {
          status: "positive_performance",
          metrics: { likes: 120, favorites: 35, comments: 9 }
        },
        updatedAt: new Date().toISOString()
      },
      {
        id: "life-unpublished",
        source: "generation_final",
        status: "not_published",
        note: {
          title: "未发布最终稿",
          body: "未发布正文"
        }
      }
    ]
  });

  assert.equal(references[0].title, "最终推荐稿样本");
  assert.equal(references[0].source, "generation_final");
  assert.equal(references.some((item) => item.title === "未发布最终稿"), false);
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
