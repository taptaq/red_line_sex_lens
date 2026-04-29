import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { runReviewBenchmarkHarness } from "../src/evals/review-benchmark-harness.js";

async function withTempBenchmarkFile(t, samples, run) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "review-benchmark-"));
  const filePath = path.join(tempDir, "review-benchmark.json");
  await fs.writeFile(filePath, `${JSON.stringify(samples, null, 2)}\n`, "utf8");

  t.after(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  return run(filePath);
}

test("review benchmark harness summarizes expected sample types and actual verdicts", async (t) => {
  await withTempBenchmarkFile(
    t,
    [
      {
        id: "violation-1",
        expectedType: "violation",
        input: {
          title: "导流标题",
          body: "加我私信领取完整版",
          tags: ["沟通"]
        }
      },
      {
        id: "false-positive-1",
        expectedType: "false_positive",
        input: {
          title: "关系沟通",
          body: "这是一篇温和讨论关系边界的内容。",
          tags: ["沟通", "关系"]
        }
      },
      {
        id: "success-1",
        expectedType: "success",
        input: {
          title: "经验分享",
          body: "这是一篇完整的经验分享内容。".repeat(12),
          tags: ["经验", "科普"]
        }
      }
    ],
    async (filePath) => {
      const result = await runReviewBenchmarkHarness({
        filePath,
        analyzeCandidate: async (candidate) => {
          if (String(candidate.body || "").includes("私信领取")) {
            return { verdict: "hard_block", finalVerdict: "hard_block", score: 95 };
          }

          if (String(candidate.title || "").includes("关系沟通")) {
            return { verdict: "manual_review", finalVerdict: "manual_review", score: 42 };
          }

          return { verdict: "pass", finalVerdict: "pass", score: 4 };
        }
      });

      assert.equal(result.ok, true);
      assert.equal(result.summary.total, 3);
      assert.deepEqual(result.summary.byExpectedType, {
        violation: 1,
        false_positive: 1,
        success: 1
      });
      assert.deepEqual(result.summary.byVerdict, {
        hard_block: 1,
        manual_review: 1,
        pass: 1
      });
      assert.equal(result.results[0].matchedExpectation, true);
      assert.equal(result.results[1].matchedExpectation, true);
      assert.equal(result.results[2].matchedExpectation, true);
    }
  );
});

test("review benchmark harness marks mismatched verdict expectations as failures", async (t) => {
  await withTempBenchmarkFile(
    t,
    [
      {
        id: "success-expected",
        expectedType: "success",
        input: {
          title: "经验分享",
          body: "这是一篇完整的经验分享内容。".repeat(10),
          tags: ["经验"]
        }
      }
    ],
    async (filePath) => {
      const result = await runReviewBenchmarkHarness({
        filePath,
        analyzeCandidate: async () => ({ verdict: "manual_review", finalVerdict: "manual_review", score: 50 })
      });

      assert.equal(result.ok, false);
      assert.equal(result.summary.failed, 1);
      assert.equal(result.results[0].matchedExpectation, false);
      assert.equal(result.results[0].expectedVerdictGroup, "accepted");
      assert.equal(result.results[0].actualVerdict, "manual_review");
    }
  );
});
