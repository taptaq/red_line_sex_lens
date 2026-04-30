import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { paths } from "../src/config.js";
import { loadRewritePairs } from "../src/data-store.js";

async function withTempRewritePairsFile(t, initialValue, run) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "rewrite-pairs-store-"));
  const originalPath = paths.rewritePairs;
  paths.rewritePairs = path.join(tempDir, "rewrite-pairs.json");
  await fs.writeFile(paths.rewritePairs, `${JSON.stringify(initialValue, null, 2)}\n`, "utf8");

  t.after(async () => {
    paths.rewritePairs = originalPath;
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  return run();
}

test("loadRewritePairs filters out fully blank placeholder records", async (t) => {
  await withTempRewritePairsFile(
    t,
    [
      {
        id: "rewrite-pair-empty",
        source: "manual",
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
        },
        beforeAnalysis: {
          verdict: "pass",
          score: 0,
          categories: [],
          suggestions: []
        },
        afterAnalysis: {
          verdict: "pass",
          score: 0,
          categories: [],
          suggestions: []
        },
        createdAt: "2026-04-28T09:35:58.714Z"
      },
      {
        id: "rewrite-pair-real",
        source: "manual",
        before: {
          title: "原始标题",
          body: "",
          coverText: "",
          tags: []
        },
        after: {
          title: "改写标题",
          body: "",
          coverText: "",
          tags: []
        },
        beforeAnalysis: {
          verdict: "manual_review",
          score: 40,
          categories: ["低俗挑逗与擦边"],
          suggestions: ["改成更克制表达"]
        },
        afterAnalysis: {
          verdict: "pass",
          score: 8,
          categories: [],
          suggestions: []
        },
        createdAt: "2026-04-30T12:00:00.000Z"
      }
    ],
    async () => {
      const items = await loadRewritePairs();

      assert.equal(items.length, 1);
      assert.equal(items[0].id, "rewrite-pair-real");
    }
  );
});
