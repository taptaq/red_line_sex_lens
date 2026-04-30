import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { paths } from "../src/config.js";
import { loadReviewBenchmarkSamples, saveReviewBenchmarkSamples } from "../src/data-store.js";

async function withTempBenchmarkPath(t, run) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "review-benchmark-store-"));
  const filePath = path.join(tempDir, "review-benchmark.json");
  const originalPath = paths.reviewBenchmark;
  paths.reviewBenchmark = filePath;

  t.after(async () => {
    paths.reviewBenchmark = originalPath;
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  return run(filePath);
}

test("loadReviewBenchmarkSamples returns an empty list when the file is missing", async (t) => {
  await withTempBenchmarkPath(t, async () => {
    const samples = await loadReviewBenchmarkSamples();
    assert.deepEqual(samples, []);
  });
});

test("saveReviewBenchmarkSamples normalizes expectedType and input content before writing", async (t) => {
  await withTempBenchmarkPath(t, async (filePath) => {
    await saveReviewBenchmarkSamples([
      {
        expectedType: "正常通过样本",
        input: {
          title: "  标题  ",
          body: "\n 正文内容 \t",
          coverText: "  封面文案  ",
          tags: ["沟通", "  ", "沟通", "关系", "", "关系"]
        }
      }
    ]);

    const raw = JSON.parse(await fs.readFile(filePath, "utf8"));
    assert.match(raw[0].id, /^review-benchmark-[a-f0-9]{12}$/);
    assert.match(raw[0].createdAt, /^\d{4}-\d{2}-\d{2}T/);
    assert.match(raw[0].updatedAt, /^\d{4}-\d{2}-\d{2}T/);
    assert.deepEqual(raw, [
      {
        id: raw[0].id,
        expectedType: "success",
        createdAt: raw[0].createdAt,
        updatedAt: raw[0].updatedAt,
        input: {
          title: "标题",
          body: "正文内容",
          coverText: "封面文案",
          tags: ["沟通", "关系"]
        }
      }
    ]);
  });
});

test("loadReviewBenchmarkSamples normalizes stored samples after reading", async (t) => {
  await withTempBenchmarkPath(t, async (filePath) => {
    await fs.writeFile(filePath, `${JSON.stringify([
      {
        id: " sample-2 ",
        expectedType: " 成功样本 ",
        createdAt: " 2026-04-28T10:00:00.000Z ",
        updatedAt: " 2026-04-28T12:00:00.000Z ",
        input: {
          title: "  经验分享 ",
          body: "  这是正文。  ",
          coverText: "  封面摘要 ",
          tags: ["经验", "", "经验", "科普", "  科普  "]
        }
      }
    ], null, 2)}\n`, "utf8");

    const samples = await loadReviewBenchmarkSamples();
    assert.deepEqual(samples, [
      {
        id: "sample-2",
        expectedType: "success",
        createdAt: "2026-04-28T10:00:00.000Z",
        updatedAt: "2026-04-28T12:00:00.000Z",
        input: {
          title: "经验分享",
          body: "这是正文。",
          coverText: "封面摘要",
          tags: ["经验", "科普"]
        }
      }
    ]);
  });
});

test("loadReviewBenchmarkSamples generates a stable id for records that do not provide one", async (t) => {
  await withTempBenchmarkPath(t, async (filePath) => {
    const storedSample = {
      expectedType: "误报样本",
      createdAt: "2026-04-27T10:00:00.000Z",
      updatedAt: "2026-04-27T10:30:00.000Z",
      input: {
        title: "  稳定标题 ",
        body: " 稳定正文 ",
        coverText: " 稳定封面 ",
        tags: ["标签A", "标签A", "标签B"]
      }
    };

    await fs.writeFile(filePath, `${JSON.stringify([storedSample], null, 2)}\n`, "utf8");

    const firstLoad = await loadReviewBenchmarkSamples();
    const secondLoad = await loadReviewBenchmarkSamples();

    assert.equal(firstLoad[0].id, secondLoad[0].id);

    await saveReviewBenchmarkSamples(firstLoad);
    const raw = JSON.parse(await fs.readFile(filePath, "utf8"));
    assert.equal(raw[0].id, firstLoad[0].id);
  });
});

test("loadReviewBenchmarkSamples keeps unknown expectedType from becoming success", async (t) => {
  await withTempBenchmarkPath(t, async (filePath) => {
    await fs.writeFile(filePath, `${JSON.stringify([
      {
        id: "unknown-type",
        expectedType: "未识别样本",
        input: {
          title: "标题",
          body: "正文",
          tags: ["标签"]
        }
      }
    ], null, 2)}\n`, "utf8");

    const samples = await loadReviewBenchmarkSamples();
    assert.equal(samples[0].expectedType, "");
  });
});

test("loadReviewBenchmarkSamples fills missing createdAt and updatedAt", async (t) => {
  await withTempBenchmarkPath(t, async (filePath) => {
    await fs.writeFile(filePath, `${JSON.stringify([
      {
        id: "missing-timestamps",
        expectedType: "误报样本",
        input: {
          title: "标题",
          body: "正文",
          tags: ["标签"]
        }
      }
    ], null, 2)}\n`, "utf8");

    const samples = await loadReviewBenchmarkSamples();
    assert.match(samples[0].createdAt, /^\d{4}-\d{2}-\d{2}T/);
    assert.match(samples[0].updatedAt, /^\d{4}-\d{2}-\d{2}T/);
  });
});

test("saveReviewBenchmarkSamples does not persist duplicate ids unchanged", async (t) => {
  await withTempBenchmarkPath(t, async (filePath) => {
    await saveReviewBenchmarkSamples([
      {
        id: "duplicate-id",
        expectedType: "success",
        input: {
          title: "标题一",
          body: "正文一",
          tags: ["标签一"]
        }
      },
      {
        id: "duplicate-id",
        expectedType: "success",
        input: {
          title: "标题二",
          body: "正文二",
          tags: ["标签二"]
        }
      }
    ]);

    const raw = JSON.parse(await fs.readFile(filePath, "utf8"));
    assert.equal(raw[0].id, "duplicate-id");
    assert.notEqual(raw[1].id, "duplicate-id");
    assert.match(raw[1].id, /^review-benchmark-[a-f0-9]{12}$/);
  });
});

test("saveReviewBenchmarkSamples normalizes source metadata", async (t) => {
  await withTempBenchmarkPath(t, async (filePath) => {
    await saveReviewBenchmarkSamples([
      {
        expectedType: "误报样本",
        source: {
          type: " false_positive_log ",
          recordId: " fp-001 "
        },
        input: {
          title: "来源样本",
          body: "这是一条用于验证来源字段的正文",
          tags: ["误报"]
        }
      }
    ]);

    const raw = JSON.parse(await fs.readFile(filePath, "utf8"));
    assert.deepEqual(raw[0].source, {
      type: "false_positive_log",
      recordId: "fp-001"
    });
  });
});
