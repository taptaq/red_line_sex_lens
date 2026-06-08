import { describe, it } from "node:test";
import assert from "node:assert";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { saveLinkAsReferenceSample, generateMarkdownNote } from "../src/link-note-saver-adapter.js";

describe("link-note-saver-adapter", () => {
  it("应该能够检测小红书链接类型", async () => {
    const url = "https://www.xiaohongshu.com/explore/test123";

    try {
      // 注意：这个测试会尝试实际抓取，可能失败，但不应该抛出类型错误
      await saveLinkAsReferenceSample(url, {
        notes: "测试笔记",
        collectionType: "科普",
        additionalTags: ["测试"]
      });
    } catch (error) {
      // 预期会失败（因为是测试链接），但应该是网络错误或解析错误，不是类型错误
      assert.ok(error.message.includes("抓取") || error.message.includes("提取") || error.message.includes("HTTP"));
    }
  });

  it("应该能够生成 Markdown 笔记", () => {
    const sample = {
      id: "test-1",
      title: "测试标题",
      body: "测试正文内容",
      tags: ["标签1", "标签2"],
      collectionType: "科普",
      notes: "来源: 测试\n链接: https://example.com\n\n小红书传播拆解:\n- 3秒钩子: 测试钩子",
      createdAt: new Date().toISOString(),
      publish: {
        status: "positive_performance",
        metrics: {
          likes: 100,
          favorites: 50,
          comments: 20,
          shares: 10
        }
      }
    };

    const markdown = generateMarkdownNote(sample);

    assert.ok(markdown.includes("# 测试标题"));
    assert.ok(markdown.includes("测试正文内容"));
    assert.ok(markdown.includes("标签1, 标签2"));
    assert.ok(markdown.includes("点赞：100"));
    assert.ok(markdown.includes("小红书传播拆解"));
  });

  it("应该先展开小红书短链再保存真实链接", async () => {
    const originalFetch = globalThis.fetch;
    const calls = [];

    globalThis.fetch = async (url) => {
      calls.push(String(url));

      if (String(url).includes("xhslink.com")) {
        return {
          ok: true,
          url: "https://www.xiaohongshu.com/explore/abc123",
          text: async () => ""
        };
      }

      return {
        ok: true,
        text: async () => `
          <html>
            <head>
              <title>真实小红书标题</title>
              <meta name="description" content="真实小红书摘要">
            </head>
            <body>真实小红书正文内容，适合作为外部参考样本。</body>
          </html>
        `
      };
    };

    try {
      const sample = await saveLinkAsReferenceSample("https://xhslink.com/a/short", {
        additionalTags: ["短链"]
      });

      assert.equal(sample.title, "真实小红书标题");
      assert.ok(sample.notes.includes("链接: https://www.xiaohongshu.com/explore/abc123"));
      assert.deepEqual(calls, ["https://xhslink.com/a/short", "https://www.xiaohongshu.com/explore/abc123"]);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("小红书网页回退抓取应该过滤备案和页脚噪音", async () => {
    const originalFetch = globalThis.fetch;

    globalThis.fetch = async () => ({
      ok: true,
      text: async () => `
        <html>
          <head>
            <title>女生如何避免紫薇后的那些不良反应？ - 小红书</title>
            <meta name="description" content="芝士解结 关注 女生如何避免紫薇后的那些不良反应？ #科普 #两性 #女性健康">
          </head>
          <body>
            女生如何避免紫薇后的那些不良反应？ - 小红书 创作中心 业务合作 发现 直播 发布 通知
            沪ICP备13030189号 | 营业执照 | 2024沪公网安备31010102002533号 |
            违法不良信息举报电话：4006676810 | 更多 关于我们
            芝士解结 关注 女生如何避免紫薇后的那些不良反应？ #科普 #两性 #女性健康
          </body>
        </html>
      `
    });

    try {
      const sample = await saveLinkAsReferenceSample("https://www.xiaohongshu.com/explore/69ce2e7f000000001a030d51");

      assert.ok(sample.body.includes("芝士解结"));
      assert.ok(sample.body.includes("女性健康"));
      assert.ok(!sample.body.includes("沪ICP备"));
      assert.ok(!sample.body.includes("营业执照"));
      assert.ok(!sample.body.includes("违法不良信息"));
      assert.ok(!sample.body.includes("更多 关于我们"));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("小红书视频笔记应该保留视频类型提示", async () => {
    const originalFetch = globalThis.fetch;
    const originalRedfoxApiKey = process.env.REDFOX_API_KEY;
    process.env.REDFOX_API_KEY = "test-redfox-key";

    globalThis.fetch = async (url) => {
      assert.ok(String(url).includes("redfox.xiaohongshu.com/api/note/abc123"));
      return {
        ok: true,
        json: async () => ({
          title: "视频笔记标题",
          desc: "视频笔记正文文案",
          type: "video",
          tags: ["女性健康"],
          liked_count: 12,
          collected_count: 7,
          comment_count: 3,
          share_count: 1
        })
      };
    };

    try {
      const sample = await saveLinkAsReferenceSample("https://www.xiaohongshu.com/explore/abc123");

      assert.equal(sample.title, "视频笔记标题");
      assert.ok(sample.body.includes("视频笔记正文文案"));
      assert.ok(sample.body.includes("未提取视频字幕"));
      assert.ok(sample.tags.includes("视频"));
      assert.ok(sample.notes.includes("类型: 视频"));
      assert.equal(sample.publish.metrics.likes, 12);
    } finally {
      if (originalRedfoxApiKey === undefined) {
        delete process.env.REDFOX_API_KEY;
      } else {
        process.env.REDFOX_API_KEY = originalRedfoxApiKey;
      }
      globalThis.fetch = originalFetch;
    }
  });

  it("小红书视频笔记应该保存 Redfox 返回的字幕文本", async () => {
    const originalFetch = globalThis.fetch;
    const originalRedfoxApiKey = process.env.REDFOX_API_KEY;
    process.env.REDFOX_API_KEY = "test-redfox-key";

    globalThis.fetch = async () => ({
      ok: true,
      json: async () => ({
        title: "带字幕的视频笔记",
        desc: "视频正文文案",
        type: "video",
        transcript: "第一句字幕。\n第二句字幕。",
        tags: ["视频笔记"]
      })
    });

    try {
      const sample = await saveLinkAsReferenceSample("https://www.xiaohongshu.com/explore/abc123");

      assert.ok(sample.body.includes("[视频字幕/转写]"));
      assert.ok(sample.body.includes("第一句字幕。"));
      assert.ok(sample.body.includes("第二句字幕。"));
      assert.ok(!sample.body.includes("未提取视频字幕"));
      assert.ok(sample.notes.includes("类型: 视频"));
    } finally {
      if (originalRedfoxApiKey === undefined) {
        delete process.env.REDFOX_API_KEY;
      } else {
        process.env.REDFOX_API_KEY = originalRedfoxApiKey;
      }
      globalThis.fetch = originalFetch;
    }
  });

  it("小红书视频笔记应该抓取并清洗字幕 URL", async () => {
    const originalFetch = globalThis.fetch;
    const originalRedfoxApiKey = process.env.REDFOX_API_KEY;
    const calls = [];
    process.env.REDFOX_API_KEY = "test-redfox-key";

    globalThis.fetch = async (url) => {
      calls.push(String(url));

      if (String(url).includes("redfox.xiaohongshu.com")) {
        return {
          ok: true,
          json: async () => ({
            title: "字幕 URL 视频笔记",
            desc: "视频正文文案",
            type: "video",
            subtitle_url: "https://example.com/captions.vtt",
            tags: ["视频笔记"]
          })
        };
      }

      return {
        ok: true,
        text: async () => `WEBVTT

1
00:00:00.000 --> 00:00:01.200
第一句字幕

2
00:00:01.200 --> 00:00:02.400
第二句字幕
`
      };
    };

    try {
      const sample = await saveLinkAsReferenceSample("https://www.xiaohongshu.com/explore/abc123");

      assert.deepEqual(calls, [
        "https://redfox.xiaohongshu.com/api/note/abc123",
        "https://example.com/captions.vtt"
      ]);
      assert.ok(sample.body.includes("[视频字幕/转写]"));
      assert.ok(sample.body.includes("第一句字幕"));
      assert.ok(sample.body.includes("第二句字幕"));
      assert.ok(!sample.body.includes("00:00:00.000"));
      assert.ok(!sample.body.includes("WEBVTT"));
    } finally {
      if (originalRedfoxApiKey === undefined) {
        delete process.env.REDFOX_API_KEY;
      } else {
        process.env.REDFOX_API_KEY = originalRedfoxApiKey;
      }
      globalThis.fetch = originalFetch;
    }
  });

  it("小红书视频笔记缺少字幕源时应该用本地 Whisper 转写视频 URL", async () => {
    const originalFetch = globalThis.fetch;
    const originalRedfoxApiKey = process.env.REDFOX_API_KEY;
    const originalWhisperBin = process.env.WHISPER_BIN;
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "link-note-whisper-test-"));
    const fakeWhisperBin = path.join(tempDir, "fake-whisper.mjs");
    const calls = [];
    process.env.REDFOX_API_KEY = "test-redfox-key";
    process.env.WHISPER_BIN = fakeWhisperBin;

    await fs.writeFile(
      fakeWhisperBin,
      `#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
const args = process.argv.slice(2);
const audio = args[0];
const outputDir = args[args.indexOf("--output_dir") + 1];
await fs.writeFile(path.join(outputDir, path.basename(audio, path.extname(audio)) + ".txt"), "Whisper 转写第一句\\nWhisper 转写第二句");
`
    );
    await fs.chmod(fakeWhisperBin, 0o755);

    globalThis.fetch = async (url) => {
      calls.push(String(url));

      if (String(url).includes("redfox.xiaohongshu.com")) {
        return {
          ok: true,
          json: async () => ({
            title: "Whisper 视频笔记",
            desc: "视频正文文案",
            type: "video",
            video_url: "https://example.com/video.mp4",
            tags: ["视频笔记"]
          })
        };
      }

      return {
        ok: true,
        arrayBuffer: async () => new TextEncoder().encode("fake video bytes").buffer
      };
    };

    try {
      const sample = await saveLinkAsReferenceSample("https://www.xiaohongshu.com/explore/abc123");

      assert.deepEqual(calls, [
        "https://redfox.xiaohongshu.com/api/note/abc123",
        "https://example.com/video.mp4"
      ]);
      assert.ok(sample.body.includes("[视频字幕/转写]"));
      assert.ok(sample.body.includes("Whisper 转写第一句"));
      assert.ok(sample.body.includes("Whisper 转写第二句"));
      assert.ok(!sample.body.includes("未提取视频字幕"));
    } finally {
      if (originalRedfoxApiKey === undefined) {
        delete process.env.REDFOX_API_KEY;
      } else {
        process.env.REDFOX_API_KEY = originalRedfoxApiKey;
      }

      if (originalWhisperBin === undefined) {
        delete process.env.WHISPER_BIN;
      } else {
        process.env.WHISPER_BIN = originalWhisperBin;
      }

      globalThis.fetch = originalFetch;
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });

  it("视频 CDN 直链不应该把 mp4 二进制内容当成正文", async () => {
    const originalFetch = globalThis.fetch;
    const originalWhisperBin = process.env.WHISPER_BIN;
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "link-note-direct-video-test-"));
    const fakeWhisperBin = path.join(tempDir, "fake-whisper.mjs");
    const calls = [];
    process.env.WHISPER_BIN = fakeWhisperBin;

    await fs.writeFile(
      fakeWhisperBin,
      `#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
const args = process.argv.slice(2);
const media = args[0];
const outputDir = args[args.indexOf("--output_dir") + 1];
await fs.writeFile(path.join(outputDir, path.basename(media, path.extname(media)) + ".txt"), "直链视频转写内容");
`
    );
    await fs.chmod(fakeWhisperBin, 0o755);

    globalThis.fetch = async (url) => {
      calls.push(String(url));
      return {
        ok: true,
        headers: new Map([["content-type", "video/mp4"]]),
        arrayBuffer: async () => new TextEncoder().encode("ftypisom fake mp4 bytes").buffer,
        text: async () => {
          throw new Error("不应该把视频响应读取为文本");
        }
      };
    };

    try {
      const url = "https://sns-video-v6.xhscdn.com/stream/1/110/115/video_115.mp4?sign=test&t=abc";
      const sample = await saveLinkAsReferenceSample(url);

      assert.equal(sample.title, "视频素材");
      assert.ok(sample.body.includes("[视频字幕/转写]"));
      assert.ok(sample.body.includes("直链视频转写内容"));
      assert.ok(!sample.body.includes("ftypisom"));
      assert.ok(sample.tags.includes("视频"));
      assert.ok(sample.notes.includes("来源: sns-video-v6.xhscdn.com"));
      assert.ok(sample.notes.includes("类型: 视频"));
      assert.deepEqual(calls, [url]);
    } finally {
      if (originalWhisperBin === undefined) {
        delete process.env.WHISPER_BIN;
      } else {
        process.env.WHISPER_BIN = originalWhisperBin;
      }

      globalThis.fetch = originalFetch;
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });
});
