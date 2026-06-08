import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { normalizeExternalReferenceSample } from "../src/external-reference-samples.js";

describe("external-reference-samples", () => {
  it("应该清洗已经保存进样本库的 mp4 二进制乱码", () => {
    const sample = normalizeExternalReferenceSample({
      id: "bad-video-sample",
      title: "（无标题）",
      body: "\u0000\u0000\u0000\u001cftypisom\u0000\u0000\u0002\u0000isomiso2mp41\u0000\u0002a�moov",
      tags: ["悦己"],
      notes: [
        "来源: sns-video-v6.xhscdn.com",
        "链接: https://sns-video-v6.xhscdn.com/stream/video.mp4?sign=test",
        "小红书传播拆解:",
        "- 3秒钩子: \u0000\u0000\u0000\u001cftypisom",
        "- 封面标题: \u0000\u0000\u0000\u001cftypisom",
        "- 笔记标题: \u0000\u0000\u0000\u001cftypisom"
      ].join("\n")
    });

    assert.equal(sample.title, "视频素材");
    assert.ok(sample.body.includes("视频链接已保存"));
    assert.ok(sample.body.includes("未提取视频字幕"));
    assert.ok(!sample.body.includes("ftypisom"));
    assert.ok(sample.tags.includes("视频"));
    assert.ok(sample.notes.includes("来源: sns-video-v6.xhscdn.com"));
    assert.ok(sample.notes.includes("类型: 视频"));
    assert.ok(!sample.notes.includes("ftypisom"));
  });
});
