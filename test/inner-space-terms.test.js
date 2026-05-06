import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { filterInnerSpaceTerms, formatInnerSpaceTermsPrompt, sanitizeInnerSpaceTerm } from "../src/inner-space-terms.js";
import { paths } from "../src/config.js";
import { safeHandleRequest } from "../src/server.js";

async function withTempInnerSpaceTerms(t, run) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "inner-space-terms-"));
  const originals = {
    lexiconSeed: paths.lexiconSeed,
    lexiconCustom: paths.lexiconCustom,
    whitelist: paths.whitelist,
    feedbackLog: paths.feedbackLog,
    falsePositiveLog: paths.falsePositiveLog,
    reviewQueue: paths.reviewQueue,
    successSamples: paths.successSamples,
    styleProfile: paths.styleProfile,
    collectionTypes: paths.collectionTypes,
    noteLifecycle: paths.noteLifecycle,
    noteRecords: paths.noteRecords,
    analyzeTagOptions: paths.analyzeTagOptions,
    innerSpaceTerms: paths.innerSpaceTerms
  };

  Object.assign(paths, {
    lexiconSeed: path.join(tempDir, "lexicon.seed.json"),
    lexiconCustom: path.join(tempDir, "lexicon.custom.json"),
    whitelist: path.join(tempDir, "whitelist.json"),
    feedbackLog: path.join(tempDir, "feedback.log.json"),
    falsePositiveLog: path.join(tempDir, "false-positive-log.json"),
    reviewQueue: path.join(tempDir, "review-queue.json"),
    successSamples: path.join(tempDir, "success-samples.json"),
    styleProfile: path.join(tempDir, "style-profile.json"),
    collectionTypes: path.join(tempDir, "collection-types.json"),
    noteLifecycle: path.join(tempDir, "note-lifecycle.json"),
    noteRecords: path.join(tempDir, "note-records.json"),
    analyzeTagOptions: path.join(tempDir, "analyze-tag-options.json"),
    innerSpaceTerms: path.join(tempDir, "inner-space-terms.json")
  });

  await Promise.all([
    fs.writeFile(paths.lexiconSeed, "[]\n", "utf8"),
    fs.writeFile(paths.lexiconCustom, "[]\n", "utf8"),
    fs.writeFile(paths.whitelist, "[]\n", "utf8"),
    fs.writeFile(paths.feedbackLog, "[]\n", "utf8"),
    fs.writeFile(paths.falsePositiveLog, "[]\n", "utf8"),
    fs.writeFile(paths.reviewQueue, "[]\n", "utf8"),
    fs.writeFile(paths.successSamples, "[]\n", "utf8"),
    fs.writeFile(paths.styleProfile, "{}\n", "utf8"),
    fs.writeFile(paths.collectionTypes, `${JSON.stringify({ custom: [] }, null, 2)}\n`, "utf8"),
    fs.writeFile(paths.noteLifecycle, "[]\n", "utf8"),
    fs.writeFile(paths.noteRecords, "[]\n", "utf8"),
    fs.writeFile(paths.analyzeTagOptions, "[]\n", "utf8"),
    fs.writeFile(paths.innerSpaceTerms, "[]\n", "utf8")
  ]);

  t.after(async () => {
    Object.assign(paths, originals);
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  return run();
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

test("sanitizeInnerSpaceTerm normalizes aliases collection types and defaults", () => {
  const item = sanitizeInnerSpaceTerm({
    term: "小飞船",
    aliases: "装备, 快乐飞船",
    category: "equipment",
    collectionTypes: "关系表达，内太空世界观",
    literal: "震动棒",
    metaphor: "快乐星球交通工具",
    example: "驾驶快乐飞船",
    priority: "88"
  });

  assert.equal(item.term, "小飞船");
  assert.deepEqual(item.aliases, ["装备", "快乐飞船"]);
  assert.deepEqual(item.collectionTypes, ["关系表达", "内太空世界观"]);
  assert.equal(item.enabled, true);
  assert.equal(item.priority, 88);
});

test("filterInnerSpaceTerms prefers matching collection type and higher priority", () => {
  const filtered = filterInnerSpaceTerms(
    [
      {
        term: "小飞船",
        category: "equipment",
        collectionTypes: ["亲密关系"],
        priority: 95,
        enabled: true
      },
      {
        term: "发射授权",
        category: "protocol",
        collectionTypes: ["科普"],
        priority: 50,
        enabled: true
      },
      {
        term: "红色潮汐",
        category: "states",
        collectionTypes: [],
        priority: 70,
        enabled: true
      }
    ],
    { collectionType: "亲密关系", limit: 2 }
  );

  assert.deepEqual(
    filtered.map((item) => item.term),
    ["小飞船", "红色潮汐"]
  );
});

test("formatInnerSpaceTermsPrompt builds a compact prompt block for model context", () => {
  const prompt = formatInnerSpaceTermsPrompt([
    {
      term: "轨道对接",
      aliases: ["对接"],
      literal: "性行为",
      preferredUsage: "适合轻松隐喻表达",
      example: "虽然我也想轨道对接，但目前的队友质量堪忧。"
    }
  ]);

  assert.match(prompt, /内太空术语参考/);
  assert.match(prompt, /轨道对接/);
  assert.match(prompt, /性行为/);
  assert.match(prompt, /适合轻松隐喻表达/);
});

test("inner-space terms admin route can create and delete terminology entries", async (t) => {
  await withTempInnerSpaceTerms(t, async () => {
    const created = await invokeRoute("POST", "/api/admin/inner-space-terms", {
      entry: {
        term: "小飞船",
        category: "equipment",
        literal: "震动棒",
        metaphor: "快乐星球交通工具",
        collectionTypes: ["亲密关系"],
        example: "今晚想驾驶快乐飞船"
      }
    });

    assert.equal(created.status, 200);
    assert.equal(created.ok, true);
    assert.equal(created.entry.term, "小飞船");

    const listed = await invokeRoute("GET", "/api/admin/data");
    assert.equal(listed.status, 200);
    assert.equal(listed.innerSpaceTerms.length, 1);

    const deleted = await invokeRoute("DELETE", "/api/admin/inner-space-terms", {
      id: created.entry.id
    });

    assert.equal(deleted.status, 200);
    assert.equal(deleted.ok, true);
    assert.deepEqual(deleted.items, []);
  });
});
