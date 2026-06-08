import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { paths } from "../src/config.js";
import { loadNoteLifecycle, loadSuccessSamples } from "../src/data-store.js";
import { buildGenerationReferenceSamples, safeHandleRequest } from "../src/server.js";
import { buildGenerationMessages } from "../src/generation-workbench.js";
import { normalizeModelSelectionState } from "../src/model-selection.js";

async function withTempGenerationData(t, run) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "generation-api-"));
  const originals = {
    collectionTypes: paths.collectionTypes,
    noteRecords: paths.noteRecords,
    successSamples: paths.successSamples,
    styleProfile: paths.styleProfile,
    themeInspirations: paths.themeInspirations,
    xhsAccountDiagnosis: paths.xhsAccountDiagnosis,
    xhsAccountDiagnosisSubscriptions: paths.xhsAccountDiagnosisSubscriptions,
    xhsAccountDiagnosisReportData: paths.xhsAccountDiagnosisReportData,
    xhsAccountDiagnosisReportHtml: paths.xhsAccountDiagnosisReportHtml,
    externalReferenceSamples: paths.externalReferenceSamples,
    memoryRoot: paths.memoryRoot,
    memoryDocuments: paths.memoryDocuments,
    memoryCards: paths.memoryCards,
    memoryEmbeddings: paths.memoryEmbeddings,
    memoryIndexMeta: paths.memoryIndexMeta
  };
  paths.collectionTypes = path.join(tempDir, "collection-types.json");
  paths.noteRecords = path.join(tempDir, "note-records.json");
  paths.successSamples = path.join(tempDir, "success-samples.json");
  paths.styleProfile = path.join(tempDir, "style-profile.json");
  paths.themeInspirations = path.join(tempDir, "theme-inspirations.json");
  paths.xhsAccountDiagnosis = path.join(tempDir, "xhs-account-diagnosis.json");
  paths.xhsAccountDiagnosisSubscriptions = path.join(tempDir, "xhs-account-diagnosis-subscriptions.json");
  paths.xhsAccountDiagnosisReportData = path.join(tempDir, "xhs-account-diagnosis-report-data.json");
  paths.xhsAccountDiagnosisReportHtml = path.join(tempDir, "xhs-account-diagnosis-report.html");
  paths.externalReferenceSamples = path.join(tempDir, "external-reference-samples.json");
  paths.memoryRoot = path.join(tempDir, "memory");
  paths.memoryDocuments = path.join(paths.memoryRoot, "documents.jsonl");
  paths.memoryCards = path.join(paths.memoryRoot, "cards.jsonl");
  paths.memoryEmbeddings = path.join(paths.memoryRoot, "embeddings.jsonl");
  paths.memoryIndexMeta = path.join(paths.memoryRoot, "index-meta.json");
  await fs.writeFile(paths.collectionTypes, `${JSON.stringify({ custom: [] }, null, 2)}\n`, "utf8");
  await fs.writeFile(paths.noteRecords, "[]\n", "utf8");
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
          { id: "profile-default", status: "active", topic: "默认", preferredTags: ["沟通"], tone: "温和" }
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

test("withTempGenerationData isolates note records path", async (t) => {
  const originalNoteRecords = paths.noteRecords;

  await withTempGenerationData(t, async () => {
    assert.notEqual(paths.noteRecords, originalNoteRecords);
    assert.match(paths.noteRecords, /generation-api-.*\/note-records\.json$/);
  });
});

test("generation endpoint returns candidates with recommendation metadata", async (t) => {
  await withTempGenerationData(t, async () => {
    const result = await invokeRoute("POST", "/api/generate-note", {
      mode: "from_scratch",
      collectionType: "科普",
      brief: { topic: "沟通", constraints: "温和" },
      mockCandidates: [
        { variant: "safe", title: "沟通标题", body: "完整正文".repeat(40), coverText: "封面", tags: ["沟通", "关系"] }
      ]
    });

    assert.equal(result.status, 200);
    assert.equal(result.ok, true);
    assert.equal(result.memoryContext?.retrievalMeta?.queryKind, "generation");
    assert.equal(result.candidates.length, 1);
    assert.equal(result.scoredCandidates.length, 1);
    assert.equal(result.recommendedCandidateId, result.scoredCandidates[0].id);
  });
});

test("luna video script endpoint generates a script from the current draft and keeps the spec in prompt", async (t) => {
  await withTempGenerationData(t, async () => {
    const result = await invokeRoute("POST", "/api/generate-luna-video-script", {
      collectionType: "内太空探索",
      draft: {
        title: "小飞船第一次出发",
        body: "把身体探索讲成一次轻松的内太空旅行。",
        tags: ["治愈科普", "女性友好"]
      },
      mockLunaVideoScript: {
        script: [
          "Video Meta",
          "片名：小飞船第一次出发",
          "",
          "Scene 01 小飞船启动",
          "标题：小飞船启动",
          "时长：8s",
          "场景目标：建立治愈系内太空探索世界观",
          "景别：中景",
          "镜头运动：缓慢推进",
          "画面描述：Pixar 级 3D 柔和星云",
          "人物动作：Luna 检查小飞船",
          "人物表情：放松、好奇",
          "旁白：别急，我们只是先认识地图。",
          "字幕：先认识地图",
          "环境音：柔和舱内声",
          "动作音效：按钮轻响",
          "转场音效：星尘划过",
          "BGM：温暖轻快",
          "图片 Prompt：Pixar 级 3D，治愈科普，女性友好",
          "视频 Prompt：轻柔推进，非真人写实"
        ].join("\n")
      }
    });

    assert.equal(result.status, 200);
    assert.equal(result.ok, true);
    assert.match(result.script, /Video Meta/);
    assert.match(result.script, /Scene 01/);
    assert.equal(result.lunaPromptIncludesSpec, true);
    assert.equal(result.lunaPromptIncludesDraft, true);
    assert.deepEqual(result.modelTrace, {
      provider: "mock",
      model: "mock-luna-video-script",
      route: "mock",
      routeLabel: "Mock Luna Video Script",
      attemptedRoutes: ["mock-luna-video-script"]
    });
  });
});

test("generation endpoint returns hot-article formula and passes it into generation prompt", async (t) => {
  await withTempGenerationData(t, async () => {
    const result = await invokeRoute("POST", "/api/generate-note", {
      mode: "from_scratch",
      collectionType: "科普",
      brief: { topic: "关系沟通", constraints: "温和" },
      mockHotArticleFormula: {
        status: "ok",
        keyword: "关系沟通",
        formula: "数字型标题 + 痛点开场 + 分点干货 + 互动收尾",
        titlePatterns: ["数字型标题"],
        openingPatterns: ["痛点共鸣开场"],
        structurePatterns: ["分点干货结构"],
        highFrequencyKeywords: ["边界感", "安全感"],
        tagStrategies: ["1 个宽标签 + 2-4 个细分场景标签"],
        interactionPrompts: ["评论区告诉我"],
        references: [
          {
            title: "3个沟通技巧",
            noteLink: "https://example.com/note",
            authorNickname: "作者A",
            authorLink: "https://example.com/author",
            likedCount: 100,
            collectedCount: 80,
            commentsCount: 20,
            sharedCount: 10
          }
        ]
      },
      mockCandidates: [
        { variant: "safe", title: "沟通标题", body: "完整正文".repeat(40), coverText: "封面", tags: ["沟通", "关系"] }
      ]
    });

    assert.equal(result.status, 200);
    assert.equal(result.hotArticleFormula.status, "ok");
    assert.equal(result.hotArticleFormula.formula, "数字型标题 + 痛点开场 + 分点干货 + 互动收尾");
    assert.equal(result.generationPromptIncludesHotArticleFormula, true);
  });
});

test("generation endpoint keeps candidates when hot-article formula is unavailable", async (t) => {
  await withTempGenerationData(t, async () => {
    const result = await invokeRoute("POST", "/api/generate-note", {
      mode: "from_scratch",
      collectionType: "科普",
      brief: {},
      mockHotArticleFormula: {
        status: "error",
        keyword: "关系沟通",
        message: "爆文数据获取失败：接口超时"
      },
      mockCandidates: [
        { variant: "safe", title: "兜住正文", body: "完整正文".repeat(40), coverText: "封面", tags: ["沟通"] }
      ]
    });

    assert.equal(result.status, 200);
    assert.equal(result.ok, true);
    assert.equal(result.hotArticleFormula.status, "error");
    assert.equal(result.candidates.length, 1);
  });
});

test("generation endpoint always uses the current active style profile", async (t) => {
  await withTempGenerationData(t, async () => {
    const result = await invokeRoute("POST", "/api/generate-note", {
      mode: "from_scratch",
      collectionType: "疗愈指南",
      brief: { topic: "体验", constraints: "克制" },
      mockCandidates: [
        { variant: "safe", title: "体验标题", body: "完整正文".repeat(40), coverText: "封面", tags: ["体验"] }
      ]
    });

    assert.equal(result.status, 200);
    assert.equal(result.scoredCandidates[0].style.score > 0, true);
  });
});

test("generation endpoint normalizes temporary text references even when no images are provided", async (t) => {
  await withTempGenerationData(t, async () => {
    const result = await invokeRoute("POST", "/api/generate-note", {
      mode: "from_scratch",
      collectionType: "科普",
      brief: { topic: "沟通", constraints: "温和" },
      referenceAssets: {
        images: [],
        textFiles: [
          {
            name: "notes.md",
            contentBase64: Buffer.from("临时文本参考内容", "utf8").toString("base64")
          }
        ]
      },
      mockCandidates: [
        { variant: "safe", title: "沟通标题", body: "完整正文".repeat(40), coverText: "封面", tags: ["沟通", "关系"] }
      ]
    });

    assert.equal(result.status, 200);
    assert.equal(result.ok, true);
    assert.equal(result.referenceAssets.mergedText, "临时文本参考内容");
    assert.deepEqual(result.referenceAssets.imageSummaries, []);
  });
});

test("generation endpoint merges referenceAssets materialText into normalized mergedText", async (t) => {
  await withTempGenerationData(t, async () => {
    const result = await invokeRoute("POST", "/api/generate-note", {
      mode: "from_scratch",
      collectionType: "科普",
      brief: { topic: "沟通", constraints: "温和" },
      referenceAssets: {
        materialText: "手写补充说明",
        images: [],
        textFiles: [
          {
            name: "notes.md",
            contentBase64: Buffer.from("临时文本参考内容", "utf8").toString("base64")
          }
        ]
      },
      mockCandidates: [
        { variant: "safe", title: "沟通标题", body: "完整正文".repeat(40), coverText: "封面", tags: ["沟通", "关系"] }
      ]
    });

    assert.equal(result.status, 200);
    assert.equal(result.ok, true);
    assert.match(result.referenceAssets.mergedText, /手写补充说明/);
    assert.match(result.referenceAssets.mergedText, /临时文本参考内容/);
  });
});

test("generation endpoint keeps uploaded text content when materialText is very long", async (t) => {
  await withTempGenerationData(t, async () => {
    const result = await invokeRoute("POST", "/api/generate-note", {
      mode: "from_scratch",
      collectionType: "科普",
      brief: { topic: "沟通", constraints: "温和" },
      referenceAssets: {
        materialText: "手写".repeat(7000),
        images: [],
        textFiles: [
          {
            name: "notes.md",
            contentBase64: Buffer.from("临时文本保留标记", "utf8").toString("base64")
          }
        ]
      },
      mockCandidates: [
        { variant: "safe", title: "沟通标题", body: "完整正文".repeat(40), coverText: "封面", tags: ["沟通", "关系"] }
      ]
    });

    assert.equal(result.status, 200);
    assert.equal(result.ok, true);
    assert.equal(result.referenceAssets.mergedText.length <= 12000, true);
    assert.match(result.referenceAssets.mergedText, /临时文本保留标记/);
  });
});

test("generation endpoint attaches scoped context with compact relevant records", async (t) => {
  await withTempGenerationData(t, async () => {
    const originalNoteRecords = await fs.readFile(paths.noteRecords, "utf8");
    const records = JSON.parse(originalNoteRecords);

    records.push({
      id: "record-relevant-history",
      source: "manual",
      stage: "published_reference",
      note: {
        title: "怎么表达拒绝又不伤人",
        body: "很多人表达拒绝时会担心关系变差，这并不等于做错了。".repeat(10),
        tags: ["身体探索", "情绪反应"],
        collectionType: "科普"
      },
      publish: {
        status: "positive_performance",
        metrics: { likes: 88, favorites: 20, comments: 10, views: 4000, shares: 22 }
      },
      reference: {
        enabled: true,
        tier: "featured",
        selectedBy: "manual"
      }
    });

    await fs.writeFile(paths.noteRecords, `${JSON.stringify(records, null, 2)}\n`, "utf8");

    const result = await invokeRoute("POST", "/api/generate-note", {
      mode: "from_scratch",
      collectionType: "科普",
      brief: {
        briefing: "写边界感是不是冷淡，轻松一点",
        collectionType: "科普"
      },
      draft: {
        title: "",
        body: "",
        tags: ["身体探索", "情绪反应"]
      },
      mockCandidates: [
        {
          variant: "final",
          title: "标题",
          body: "正文".repeat(400),
          coverText: "封面",
          tags: ["身体探索", "情绪反应"]
        }
      ]
    });

    assert.equal(result.status, 200);
    assert.equal(Array.isArray(result.memoryContext?.scopedContext?.relevantRecords), true);
    assert.equal(result.memoryContext.scopedContext.relevantRecords[0]?.id, "record-relevant-history");
    assert.equal(result.memoryContext.scopedContext.relevantRecords[0]?.summary.length < 220, true);
  });
});

test("generation endpoint skips over-limit temporary reference assets server-side and returns warnings", async (t) => {
  await withTempGenerationData(t, async () => {
    const result = await invokeRoute("POST", "/api/generate-note", {
      mode: "from_scratch",
      collectionType: "科普",
      brief: { topic: "沟通", constraints: "温和" },
      referenceAssets: {
        images: [
          {
            name: "too-big-image.png",
            mimeType: "image/png",
            dataUrl: `data:image/png;base64,${"A".repeat(6 * 1024 * 1024)}`
          }
        ],
        textFiles: [
          {
            name: "too-big-text.txt",
            contentBase64: "A".repeat(700 * 1024)
          }
        ]
      },
      mockCandidates: [
        { variant: "safe", title: "沟通标题", body: "完整正文".repeat(40), coverText: "封面", tags: ["沟通", "关系"] }
      ]
    });

    assert.equal(result.status, 200);
    assert.deepEqual(result.referenceAssets.imageSummaries, []);
    assert.equal(result.referenceAssets.mergedText, "");
    assert.equal(result.referenceAssets.warnings.length, 2);
    assert.match(result.referenceAssets.warnings[0], /too-big-image\.png|too-big-text\.txt/);
    assert.match(result.referenceAssets.warnings[1], /too-big-image\.png|too-big-text\.txt/);
  });
});

test("generation briefing improve endpoint expands the current one-line request", async (t) => {
  await withTempGenerationData(t, async () => {
    const result = await invokeRoute("POST", "/api/generate-note-briefing", {
      mode: "from_scratch",
      collectionType: "科普",
      brief: {
        briefing: "写经期能不能用玩具，轻松一点"
      },
      mockImprovedBriefing: {
        briefing: "写一篇给新手女生看的轻松科普，重点回答经期能不能用玩具、什么情况下要先暂停，语气自然，不要营销感。",
        notes: ["补足了目标人群", "补足了语气要求"]
      }
    });

    assert.equal(result.status, 200);
    assert.equal(result.ok, true);
    assert.equal(
      result.briefing,
      "写一篇给新手女生看的轻松科普，重点回答经期能不能用玩具、什么情况下要先暂停，语气自然，不要营销感。"
    );
    assert.deepEqual(result.notes, ["补足了目标人群", "补足了语气要求"]);
  });
});

test("generation reference material endpoint returns normalized candidate cards", async (t) => {
  await withTempGenerationData(t, async () => {
    const result = await invokeRoute("POST", "/api/generate-reference-materials", {
      brief: {
        briefing: "写经期能不能用玩具，轻松一点"
      },
      draft: {
        title: "经期也想用？"
      },
      mockReferenceMaterials: [
        {
          title: "经期使用玩具前先看这几点",
          reason: "能补足安全边界",
          referenceText: "经期是否适合使用需要结合清洁、身体状态和不适感来判断。",
          sourceUrl: "https://example.com/reference"
        }
      ]
    });

    assert.equal(result.status, 200);
    assert.equal(result.ok, true);
    assert.equal(result.items.length, 1);
    assert.equal(result.items[0].title, "经期使用玩具前先看这几点");
  });
});

test("account planner parse endpoint normalizes markdown and csv external samples", async (t) => {
  await withTempGenerationData(t, async () => {
    const result = await invokeRoute("POST", "/api/sample-library/account-planner/parse", {
      files: [
        {
          name: "external.csv",
          contentBase64: Buffer.from(
            [
              "title,body,tags,collectionType,likes,favorites,comments,views,shares",
              '"高表现外部样本","外部正文摘要","情绪反应,身体探索","科普",88,20,6,3200,12'
            ].join("\n"),
            "utf8"
          ).toString("base64")
        },
        {
          name: "external-note.md",
          contentBase64: Buffer.from(
            [
              "---",
              "title: 外部 Markdown 样本",
              "tags: 关系沟通, 情绪反应",
              "collectionType: 科普",
              "likes: 66",
              "views: 2400",
              "---",
              "",
              "# 外部 Markdown 样本",
              "",
              "这是一段可用于账号复盘的外部正文。"
            ].join("\n"),
            "utf8"
          ).toString("base64")
        }
      ]
    });

    assert.equal(result.status, 200);
    assert.equal(result.ok, true);
    assert.equal(Array.isArray(result.items), true);
    assert.equal(result.items.length, 2);
    assert.equal(result.items[0].title, "高表现外部样本");
    assert.deepEqual(result.items[0].tags, ["情绪反应", "身体探索"]);
    assert.equal(result.items[0].publish.metrics.likes, 88);
    assert.equal(result.items[1].title, "外部 Markdown 样本");
    assert.equal(result.items[1].publish.metrics.views, 2400);
    assert.deepEqual(result.diagnostics, {
      fileCount: 2,
      importedCount: 2
    });
  });
});

test("external reference sample import endpoint persists parsed markdown and csv samples", async (t) => {
  await withTempGenerationData(t, async () => {
    const result = await invokeRoute("POST", "/api/sample-library/external-reference-samples/import", {
      files: [
        {
          name: "external.csv",
          contentBase64: Buffer.from(
            [
              "title,body,tags,collectionType,likes,views",
              '"外部 CSV 样本","CSV 正文","情绪反应,身体探索","科普",88,3200'
            ].join("\n"),
            "utf8"
          ).toString("base64")
        },
        {
          name: "external-note.md",
          contentBase64: Buffer.from(
            [
              "---",
              "title: 外部 Markdown 样本",
              "tags: 关系沟通, 情绪反应",
              "collectionType: 科普",
              "likes: 66",
              "views: 2400",
              "---",
              "",
              "# 外部 Markdown 样本",
              "",
              "这是一段可用于账号复盘的外部正文。"
            ].join("\n"),
            "utf8"
          ).toString("base64")
        }
      ]
    });

    const loaded = await invokeRoute("GET", "/api/sample-library/external-reference-samples");

    assert.equal(result.status, 200);
    assert.equal(result.ok, true);
    assert.equal(result.items.length, 2);
    assert.equal(loaded.status, 200);
    assert.equal(loaded.items.length, 2);
    assert.equal(loaded.items[0].title, "外部 CSV 样本");
    assert.equal(loaded.items[1].title, "外部 Markdown 样本");
  });
});

test("external reference sample delete endpoint removes a single stored sample", async (t) => {
  await withTempGenerationData(t, async () => {
    const imported = await invokeRoute("POST", "/api/sample-library/external-reference-samples/import", {
      files: [
        {
          name: "external.csv",
          contentBase64: Buffer.from(
            [
              "title,body,tags,collectionType,likes,views",
              '"外部 CSV 样本","CSV 正文","情绪反应,身体探索","科普",88,3200'
            ].join("\n"),
            "utf8"
          ).toString("base64")
        }
      ]
    });

    const deleted = await invokeRoute("DELETE", "/api/sample-library/external-reference-samples", {
      id: imported.items[0].id
    });

    assert.equal(deleted.status, 200);
    assert.equal(deleted.ok, true);
    assert.deepEqual(deleted.items, []);
  });
});

test("external reference sample patch endpoint updates a stored sample", async (t) => {
  await withTempGenerationData(t, async () => {
    const imported = await invokeRoute("POST", "/api/sample-library/external-reference-samples", {
      items: [
        {
          id: "external-edit-1",
          title: "原标题",
          body: "原正文",
          tags: ["旧标签"],
          collectionType: "科普",
          notes: "原备注",
          publish: {
            metrics: {
              likes: 3,
              views: 9
            }
          }
        }
      ]
    });

    const patched = await invokeRoute("PATCH", "/api/sample-library/external-reference-samples", {
      id: imported.items[0].id,
      title: "编辑后的标题",
      body: "编辑后的正文",
      tags: ["新标签", "视频"],
      collectionType: "案例",
      notes: "编辑后的备注"
    });

    assert.equal(patched.status, 200);
    assert.equal(patched.ok, true);
    assert.equal(patched.item.title, "编辑后的标题");
    assert.equal(patched.item.body, "编辑后的正文");
    assert.deepEqual(patched.item.tags, ["新标签", "视频"]);
    assert.equal(patched.item.collectionType, "案例");
    assert.equal(patched.item.notes, "编辑后的备注");
    assert.equal(patched.item.publish.metrics.likes, 3);
    assert.equal(patched.items.length, 1);
  });
});

test("external reference link import returns duplicate review instead of auto-saving same source", async (t) => {
  await withTempGenerationData(t, async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => ({
      ok: true,
      headers: new Map([["content-type", "text/html"]]),
      text: async () => `
        <html>
          <head><title>重复素材标题</title><meta name="description" content="新解析摘要"></head>
          <body>新解析正文，可以和旧素材手动比较。</body>
        </html>
      `
    });

    try {
      await invokeRoute("POST", "/api/sample-library/external-reference-samples", {
        items: [
          {
            id: "existing-duplicate",
            title: "重复素材标题",
            body: "旧素材正文",
            tags: ["旧标签"],
            collectionType: "科普",
            notes: "来源: example.com\n链接: https://example.com/article\n小红书传播拆解:"
          }
        ]
      });

      const result = await invokeRoute("POST", "/api/sample-library/external-reference-samples/from-link", {
        url: "https://example.com/article",
        collectionType: "科普",
        tags: ["新标签"]
      });

      assert.equal(result.status, 200);
      assert.equal(result.ok, true);
      assert.equal(result.items.length, 1);
      assert.equal(result.diagnostics.importedCount, 0);
      assert.equal(result.diagnostics.duplicateCount, 1);
      assert.equal(result.pendingDuplicates.length, 1);
      assert.equal(result.pendingDuplicates[0].existing.id, "existing-duplicate");
      assert.equal(result.pendingDuplicates[0].incoming.title, "重复素材标题");
      assert.equal(result.pendingDuplicates[0].matchReason, "source_url");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

test("external reference sample clear endpoint removes all stored samples", async (t) => {
  await withTempGenerationData(t, async () => {
    await invokeRoute("POST", "/api/sample-library/external-reference-samples/import", {
      files: [
        {
          name: "external.csv",
          contentBase64: Buffer.from(
            [
              "title,body,tags,collectionType,likes,views",
              '"外部 CSV 样本","CSV 正文","情绪反应,身体探索","科普",88,3200'
            ].join("\n"),
            "utf8"
          ).toString("base64")
        }
      ]
    });

    const cleared = await invokeRoute("DELETE", "/api/sample-library/external-reference-samples", {
      clear: true
    });

    assert.equal(cleared.status, 200);
    assert.equal(cleared.ok, true);
    assert.deepEqual(cleared.items, []);
  });
});

test("account planner analyze endpoint returns planner cards with prefills from local and external evidence", async (t) => {
  await withTempGenerationData(t, async () => {
    const result = await invokeRoute("POST", "/api/sample-library/account-planner/analyze", {
      records: [
        {
          id: "record-1",
          note: {
            title: "怎么表达拒绝又不伤人？",
            body: "最近高表现内容更偏轻科普和情绪解释。",
            tags: ["情绪反应", "身体探索"],
            collectionType: "科普"
          },
          publish: {
            status: "positive_performance",
            metrics: {
              likes: 120,
              favorites: 40,
              comments: 15,
              views: 5200,
              shares: 21
            }
          },
          calibration: {
            retro: {
              predictionMatched: true,
              shouldBecomeReference: true
            }
          }
        }
      ],
      externalSamples: [
        {
          title: "外部对照样本",
          body: "外部样本更强调具体场景和轻解释结构。",
          tags: ["关系沟通"],
          collectionType: "科普",
          publish: {
            status: "positive_performance",
            metrics: { likes: 90, favorites: 18, comments: 5, views: 3000, shares: 8 }
          }
        }
      ],
      mockAccountPlannerSummary: {
        summary: {
          strengths: ["轻科普 + 情绪解释更稳定"],
          gaps: ["近期关系沟通角度偏少"],
          nextMove: "继续放大轻科普解释路线，并补一个关系沟通切角。"
        },
        cards: [
          {
            planId: "plan-1",
            planTitle: "把高表现的情绪解释路线继续做深",
            estimatedValue: "high",
            whyThisWorks: "本地高表现记录稳定命中情绪解释结构，外部样本补充了更具体的场景切口。",
            titleFormula: "反常识提问 + 情绪解释 + 安抚落点",
            bodyStructure: ["先抛问题", "解释原因", "给正常化结论"],
            riskBoundary: ["避免病理化", "不做医疗诊断"],
            sourceSignals: ["本地高表现记录 1 条", "外部对照样本 1 条"],
            tags: ["情绪反应", "身体探索"],
            prefillBriefing: "写一篇轻松科普，解释边界感为什么不等于冷淡。",
            prefillReferenceTitle: "怎么表达拒绝又不伤人？",
            prefillMaterialText: "结构重点：反常识提问 -> 情绪解释 -> 正常化安抚。",
            prefillCollectionType: "科普",
            prefillTone: "温和"
          }
        ]
      }
    });

    assert.equal(result.status, 200);
    assert.equal(result.ok, true);
    assert.deepEqual(result.summary.strengths, ["轻科普 + 情绪解释更稳定"]);
    assert.equal(result.cards.length, 1);
    assert.equal(result.cards[0].planTitle, "把高表现的情绪解释路线继续做深");
    assert.equal(result.cards[0].prefillBriefing, "写一篇轻松科普，解释边界感为什么不等于冷淡。");
    assert.deepEqual(result.modelTrace, {
      provider: "",
      model: "",
      route: "",
      routeLabel: "",
      attemptedRoutes: []
    });
    assert.deepEqual(result.diagnostics, {
      localRecordCount: 1,
      externalSampleCount: 1,
      cardCount: 1
    });
  });
});

test("account planner analyze endpoint returns an error when model omits planner cards", async (t) => {
  await withTempGenerationData(t, async () => {
    const result = await invokeRoute("POST", "/api/sample-library/account-planner/analyze", {
      records: [
        {
          id: "record-1",
          note: {
            title: "怎么表达拒绝又不伤人？",
            body: "最近高表现内容更偏轻科普和情绪解释。",
            tags: ["情绪反应", "身体探索"],
            collectionType: "科普"
          },
          publish: {
            status: "positive_performance",
            metrics: {
              likes: 120,
              favorites: 40,
              comments: 15,
              views: 5200,
              shares: 21
            }
          }
        }
      ],
      externalSamples: [],
      mockAccountPlannerSummary: {
        summary: {
          strengths: ["模型判断：情绪解释路线最稳"],
          gaps: ["模型判断：最近关系沟通切角偏少"],
          nextMove: "模型判断：继续围绕情绪解释，补一个关系沟通切口。"
        },
        provider: "mock",
        model: "mock-account-planner",
        route: "mock-route",
        routeLabel: "Mock Route",
        attemptedRoutes: ["mock-route"]
      }
    });

    assert.equal(result.status, 500);
    assert.equal(result.ok, false);
    assert.match(result.error || "", /模型没有返回可用的复盘卡/);
  });
});

test("account planner analyze endpoint returns an error when only published-passed samples are available and model omits cards", async (t) => {
  await withTempGenerationData(t, async () => {
    const result = await invokeRoute("POST", "/api/sample-library/account-planner/analyze", {
      records: [
        {
          id: "record-1",
          note: {
            title: "表达边界后是不是会显得很冷淡？",
            body: "最近几篇都在试关系沟通和边界表达，虽然没有明显爆发，但互动方向比较稳定。",
            tags: ["关系沟通", "边界表达"],
            collectionType: "科普"
          },
          publish: {
            status: "published_passed",
            publishedAt: "2026-05-24T08:00:00.000Z",
            metrics: {
              likes: 22,
              favorites: 9,
              comments: 6,
              views: 1800,
              shares: 2
            }
          },
          calibration: {
            plannerSummary: {
              summary: "这篇主要在解释边界表达不等于冷淡，适合继续观察关系沟通方向。",
              keyPoints: ["边界表达", "关系沟通"],
              suggestedTopic: "怎么把拒绝说清楚又不伤人？"
            }
          }
        }
      ],
      externalSamples: [],
      mockAccountPlannerSummary: {
        summary: {
          strengths: ["近期已发布样本开始集中到关系沟通方向。"],
          gaps: ["暂时还没有稳定高表现样本，建议继续小步验证。"],
          nextMove: "先围绕边界表达继续做一轮观察型选题。"
        },
        cards: [],
        provider: "mock",
        model: "mock-account-planner",
        route: "mock-route",
        routeLabel: "Mock Route",
        attemptedRoutes: ["mock-route"]
      }
    });

    assert.equal(result.status, 500);
    assert.equal(result.ok, false);
    assert.match(result.error || "", /模型没有返回可用的复盘卡/);
  });
});

test("xhs account diagnosis endpoint returns normalized diagnosis and similar accounts", async (t) => {
  await withTempGenerationData(t, async () => {
    const result = await invokeRoute("POST", "/api/xhs/account-diagnosis", {
      redId: "26112666886",
      mockXhsAccountDiagnosis: {
        account: {
          redId: "26112666886",
          nickname: "测试号",
          desc: "主页简介",
          metrics: {
            fans: 12000,
            liked: 217035,
            collected: 24745,
            noteCountThirty: 12,
            interactiveCountThirty: 133547
          }
        },
        diagnosis: {
          score: 78,
          summary: "近30天互动强，适合继续放大稳定选题。",
          strengths: ["互动规模稳定", "近30天有持续更新"],
          risks: ["封面风格还不够统一"],
          nextActions: ["先继续放大高互动选题", "补一个同阶对标观察位"]
        },
        similarAccounts: {
          peer: [{ redId: "peer-1", nickname: "同阶号" }],
          benchmark: [{ redId: "benchmark-1", nickname: "高阶号" }]
        },
        matchedSignals: {
          dailyTop: [
            {
              id: "daily-1",
              sourceType: "daily_top",
              title: "同类今日起量样本",
              body: "同类今日正文",
              author: "作者A",
              authorRedId: "author-a",
              accountTier: "尾部KOL",
              track: "星座情感",
              tags: ["关系沟通"],
              publish: { status: "positive_performance", publishedAt: "2026-05-30", metrics: { likes: 900, favorites: 200, comments: 50, views: 9000, shares: 30 } },
              analysis: { whySelected: "今天起量快", reuseHint: "适合借题切入" }
            }
          ],
          weeklyTop: [],
          lowTop: []
        }
      }
    });

    assert.equal(result.status, 200);
    assert.equal(result.ok, true);
    assert.equal(result.account.nickname, "测试号");
    assert.equal(result.diagnosis.score, 78);
    assert.match(result.diagnosis.summary, /近30天互动强/);
    assert.equal(result.similarAccounts.peer.length, 1);
    assert.equal(result.similarAccounts.benchmark.length, 1);
    assert.equal(result.matchedSignals.dailyTop.length, 1);
    assert.equal(typeof result.report?.htmlPath, "string");
    assert.equal(typeof result.report?.reportDataPath, "string");

    const loaded = await invokeRoute("GET", "/api/xhs/account-diagnosis");
    assert.equal(loaded.status, 200);
    assert.equal(loaded.ok, true);
    assert.equal(loaded.result.account.nickname, "测试号");
    assert.equal(loaded.result.diagnosis.score, 78);
    assert.equal(typeof loaded.report?.htmlPath, "string");
    assert.equal(typeof loaded.report?.reportDataPath, "string");

    const reportHtml = await invokeRouteRaw("GET", "/api/xhs/account-diagnosis/report");
    assert.equal(reportHtml.status, 200);
    assert.match(reportHtml.body, /账号诊断报告|测试号/);
  });
});

test("xhs account diagnosis subscription endpoint persists a retry task", async (t) => {
  await withTempGenerationData(t, async () => {
    const result = await invokeRoute("POST", "/api/xhs/account-diagnosis/subscribe", {
      redId: "4344616558",
      nickname: "内太空的X"
    });

    assert.equal(result.status, 200);
    assert.equal(result.ok, true);
    assert.equal(result.subscription.redId, "4344616558");
    assert.equal(result.subscription.status, "scheduled");

    const loaded = await invokeRoute("GET", "/api/xhs/account-diagnosis");
    assert.equal(loaded.status, 200);
    assert.equal(loaded.ok, true);
    assert.equal(loaded.subscription.redId, "4344616558");
    assert.equal(loaded.subscription.status, "scheduled");
  });
});

test("xhs account diagnosis endpoint supports multi-account comparison", async (t) => {
  await withTempGenerationData(t, async () => {
    const result = await invokeRoute("POST", "/api/xhs/account-diagnosis", {
      redIds: ["id-1", "id-2"],
      mockXhsAccountDiagnosis: {
        mode: "multi",
        accounts: [
          {
            account: {
              redId: "id-1",
              nickname: "账号A",
              desc: "A简介",
              metrics: { fans: 12000, liked: 50000, collected: 8000, noteCountThirty: 10, interactiveCountThirty: 15000 }
            },
            diagnosis: {
              score: 76,
              summary: "A 账号更稳。",
              strengths: ["更新稳定"],
              risks: ["封面还可以再统一"],
              nextActions: ["继续放大A的稳定切口"]
            },
            similarAccounts: { peer: [], benchmark: [] }
          },
          {
            account: {
              redId: "id-2",
              nickname: "账号B",
              desc: "B简介",
              metrics: { fans: 8000, liked: 22000, collected: 4000, noteCountThirty: 6, interactiveCountThirty: 7000 }
            },
            diagnosis: {
              score: 62,
              summary: "B 账号还在补稳定性。",
              strengths: ["有初步内容信号"],
              risks: ["近30天样本偏少"],
              nextActions: ["先把更新节奏稳定下来"]
            },
            similarAccounts: { peer: [], benchmark: [] }
          }
        ],
        comparison: {
          核心差异: [{ 账号名: "账号A", 内容: "A更新更稳定" }, { 账号名: "账号B", 内容: "B还在起量" }],
          共同问题: ["都还可以继续强化封面和标题一致性"],
          发展建议: [{ 账号名: "账号A", 内容: "继续做强优势" }, { 账号名: "账号B", 内容: "先补节奏" }]
        }
      }
    });

    assert.equal(result.status, 200);
    assert.equal(result.ok, true);
    assert.equal(result.mode, "multi");
    assert.equal(result.result.accounts.length, 2);
    assert.match(result.result.comparison.共同问题[0], /封面/);

    const reportHtml = await invokeRouteRaw("GET", "/api/xhs/account-diagnosis/report");
    assert.equal(reportHtml.status, 200);
    assert.match(reportHtml.body, /多账号对比诊断报告|账号A/);
  });
});

test("generation reference material endpoint returns 400 when briefing is missing", async (t) => {
  await withTempGenerationData(t, async () => {
    const result = await invokeRoute("POST", "/api/generate-reference-materials", {
      brief: {
        briefing: "   "
      }
    });

    assert.equal(result.status, 400);
    assert.equal(result.ok, false);
    assert.match(result.error, /一句话需求/);
  });
});

test("theme inspiration endpoint returns normalized cards from high-performing published content", async (t) => {
  await withTempGenerationData(t, async () => {
    const result = await invokeRoute("POST", "/api/generate-theme-inspirations", {
      mockThemeInspirations: [
        {
          themeTitle: "边界感不是冷淡",
          hookAngle: "很多人以为这是问题，其实很常见。",
          whyNow: "这个主题兼具反差和科普价值。",
          discussionSignal: "多个高表现内容都反复命中。",
          sourceSignals: ["命中 2 条高表现内容"],
          expandAngles: ["从表达方式讲", "从关系安全感讲"],
          boundaryNotes: ["避免病理化表达"],
          confidenceScore: 0.92,
          tags: ["身体探索", "情绪反应"],
          prefillBriefing: "写一篇轻松科普，解释边界感为什么不一定异常。",
          prefillTopic: "边界感是不是冷淡",
          prefillConstraints: "避免病理化，不做医疗诊断。",
          prefillReferenceTitle: "怎么表达拒绝又不伤人？",
          prefillMaterialText: "关键点：先共情、再说明边界、最后给替代沟通方式。"
        }
      ]
    });

    assert.equal(result.status, 200);
    assert.equal(result.ok, true);
    assert.equal(result.items.length, 2);
    assert.deepEqual(
      result.items.map((item) => item.themeTitle),
      ["从表达方式讲", "从关系安全感讲"]
    );
    assert.equal(result.items[0].sourceThemeTitle, "边界感不是冷淡");
    assert.deepEqual(result.modelTrace, {
      provider: "mock",
      model: "mock-theme-inspirations",
      route: "mock",
      routeLabel: "Mock Theme Inspirations",
      attemptedRoutes: ["mock-theme-inspirations"]
    });
  });
});

test("theme inspiration endpoint returns a stable contract from existing high-performing published records", async (t) => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "theme-inspirations-route-"));
  const originals = {
    noteRecords: paths.noteRecords
  };

  paths.noteRecords = path.join(tempDir, "note-records.json");

  t.after(async () => {
    Object.assign(paths, originals);
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  await fs.writeFile(
    paths.noteRecords,
    `${JSON.stringify([
      {
        id: "record-high-performing",
        source: "manual",
        stage: "published_reference",
        note: {
          title: "边界感是不是冷淡",
          body: "不少人表达拒绝时会担心关系变差，这并不等于做错了。",
          tags: ["身体探索", "情绪反应"],
          collectionType: "科普"
        },
        publish: {
          status: "published_passed",
          metrics: { likes: 60, favorites: 30, comments: 12, views: 3500, shares: 25 }
        },
        reference: {
          enabled: true,
          tier: "featured",
          selectedBy: "manual"
        }
      },
      {
        id: "record-unqualified",
        source: "manual",
        stage: "published_reference",
        note: {
          title: "普通记录",
          body: "数据不够高。",
          tags: ["日常"],
          collectionType: "科普"
        },
        publish: {
          status: "published_passed",
          metrics: { likes: 2, favorites: 0, comments: 0, views: 10, shares: 0 }
        },
        reference: {
          enabled: true,
          tier: "passed",
          selectedBy: "manual"
        }
      }
    ], null, 2)}\n`,
    "utf8"
  );

  const result = await invokeRoute("POST", "/api/generate-theme-inspirations", {
    mockThemeInspirationSummary: {
      items: [
        {
          themeTitle: "边界感不是冷淡",
          hookAngle: "很多人把边界误解成冷淡，其实是在保护关系。",
          whyNow: "高表现内容反复命中这个问题。",
          discussionSignal: "容易引发“我是不是不正常”的讨论。",
          sourceSignals: ["命中 1 条高表现内容"],
          expandAngles: ["从表达方式讲", "从关系安全感讲"],
          boundaryNotes: ["避免病理化表达"],
          confidenceScore: 0.93,
          tags: ["身体探索", "情绪反应"],
          prefillBriefing: "写一篇轻松科普，解释边界感为什么不一定异常。",
          prefillReferenceTitle: "怎么表达拒绝又不伤人？",
          prefillMaterialText: "关键点：先共情、再说明边界、最后给替代沟通方式。"
        }
      ],
      provider: "mock",
      model: "mock-theme-inspiration-summary",
      route: "mock-route",
      routeLabel: "Mock Route",
      attemptedRoutes: ["mock-route"]
    }
  });

  assert.equal(result.status, 200);
  assert.equal(result.ok, true);
  assert.equal(result.items.length, 2);
  assert.equal(result.diagnostics.sourceRecordCount, 1);
  assert.equal(result.diagnostics.clusterCount, 1);
  assert.equal(result.diagnostics.rawThemeItemCount, 2);
  assert.equal(result.diagnostics.normalizedThemeItemCount, 2);
  assert.deepEqual(
    result.items.map((item) => item.themeTitle),
    ["从表达方式讲", "从关系安全感讲"]
  );
  assert.deepEqual(result.modelTrace, {
    provider: "mock",
    model: "mock-theme-inspiration-summary",
    route: "mock-route",
    routeLabel: "Mock Route",
    attemptedRoutes: ["mock-route"]
  });
  assert.equal(Object.prototype.hasOwnProperty.call(result, "sourceRecords"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(result, "clusters"), false);
});

test("theme inspiration endpoint surfaces summarizer diagnostics when no usable cards are generated", async (t) => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "theme-inspirations-empty-"));
  const originals = {
    noteRecords: paths.noteRecords
  };

  paths.noteRecords = path.join(tempDir, "note-records.json");

  t.after(async () => {
    Object.assign(paths, originals);
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  await fs.writeFile(
    paths.noteRecords,
    `${JSON.stringify([
      {
        id: "record-high-performing",
        source: "manual",
        stage: "published_reference",
        note: {
          title: "边界感是不是冷淡",
          body: "不少人表达拒绝时会担心关系变差，这并不等于做错了。",
          tags: ["身体探索", "情绪反应"],
          collectionType: "科普"
        },
        publish: {
          status: "published_passed",
          metrics: { likes: 60, favorites: 30, comments: 12, views: 3500, shares: 25 }
        },
        reference: {
          enabled: true,
          tier: "featured",
          selectedBy: "manual"
        }
      }
    ], null, 2)}\n`,
    "utf8"
  );

  const result = await invokeRoute("POST", "/api/generate-theme-inspirations", {
    mockThemeInspirationSummary: {
      items: [],
      provider: "mock",
      model: "mock-empty-theme-inspirations",
      route: "mock-route",
      routeLabel: "Mock Route",
      attemptedRoutes: ["mock-route"],
      rawText: "{\"items\":[]}",
      parsedKeys: ["items"],
      message: "模型没有生成可用主题卡。"
    }
  });

  assert.equal(result.status, 200);
  assert.equal(result.ok, true);
  assert.deepEqual(result.items, []);
  assert.equal(result.diagnostics.sourceRecordCount, 1);
  assert.equal(result.diagnostics.clusterCount, 1);
  assert.equal(result.diagnostics.rawThemeItemCount, 0);
  assert.equal(result.diagnostics.normalizedThemeItemCount, 0);
  assert.equal(result.diagnostics.rawModelTextLength > 0, true);
  assert.deepEqual(result.diagnostics.parsedKeys, ["items"]);
  assert.equal(result.diagnostics.summarizerMessage, "模型没有生成可用主题卡。");
  assert.deepEqual(result.modelTrace, {
    provider: "mock",
    model: "mock-empty-theme-inspirations",
    route: "mock-route",
    routeLabel: "Mock Route",
    attemptedRoutes: ["mock-route"]
  });
});

test("theme inspiration endpoint persists cached inspirations and prepends new refresh results", async (t) => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "theme-inspirations-cache-"));
  const originals = {
    noteRecords: paths.noteRecords,
    themeInspirations: paths.themeInspirations
  };

  paths.noteRecords = path.join(tempDir, "note-records.json");
  paths.themeInspirations = path.join(tempDir, "theme-inspirations.json");

  t.after(async () => {
    Object.assign(paths, originals);
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  await fs.writeFile(
    paths.noteRecords,
    `${JSON.stringify([
      {
        id: "record-high-performing",
        source: "manual",
        stage: "published_reference",
        note: {
          title: "边界感是不是冷淡",
          body: "不少人表达拒绝时会担心关系变差，这并不等于做错了。",
          tags: ["身体探索", "情绪反应"],
          collectionType: "科普"
        },
        publish: {
          status: "published_passed",
          metrics: { likes: 60, favorites: 30, comments: 12, views: 3500, shares: 25 }
        },
        reference: {
          enabled: true,
          tier: "featured",
          selectedBy: "manual"
        }
      }
    ], null, 2)}\n`,
    "utf8"
  );

  await fs.writeFile(
    paths.themeInspirations,
    `${JSON.stringify({
      items: [
        {
          themeId: "cached-1",
          themeTitle: "从关系安全感讲",
          hookAngle: "很多人不是欲望太强，而是羞耻感太重。",
          whyNow: "旧缓存",
          discussionSignal: "旧缓存",
          sourceSignals: ["旧缓存"],
          expandAngles: [],
          boundaryNotes: ["避免病理化表达"],
          confidenceScore: 0.82,
          tags: ["身体探索", "情绪反应"],
          prefillBriefing: "写一篇从羞耻感角度展开的轻松科普。",
          prefillReferenceTitle: "从关系安全感讲",
          prefillMaterialText: "旧缓存内容",
          prefillCollectionType: "科普",
          prefillTone: "温和"
        }
      ],
      generatedAt: "2026-05-19T12:00:00.000Z",
      sourceFingerprint: "record-high-performing",
      sourceRecordIds: ["record-high-performing"]
    }, null, 2)}\n`,
    "utf8"
  );

  const cachedResult = await invokeRoute("POST", "/api/generate-theme-inspirations", {});
  assert.equal(cachedResult.status, 200);
  assert.deepEqual(cachedResult.items.map((item) => item.themeTitle), ["从关系安全感讲"]);

  const refreshedResult = await invokeRoute("POST", "/api/generate-theme-inspirations", {
    refresh: true,
    mockThemeInspirationSummary: {
      items: [
        {
          themeTitle: "边界感不是冷淡",
          hookAngle: "很多人把边界误解成冷淡，其实是在保护关系。",
          whyNow: "高表现内容反复命中这个问题。",
          discussionSignal: "容易引发“我是不是不正常”的讨论。",
          sourceSignals: ["命中 1 条高表现内容"],
          expandAngles: ["从新手试错讲", "从关系安全感讲"],
          boundaryNotes: ["避免病理化表达"],
          confidenceScore: 0.93,
          tags: ["身体探索", "情绪反应"],
          prefillBriefing: "写一篇轻松科普，解释边界感为什么不一定异常。",
          prefillReferenceTitle: "怎么表达拒绝又不伤人？",
          prefillMaterialText: "关键点：先共情、再说明边界、最后给替代沟通方式。"
        }
      ],
      provider: "mock",
      model: "mock-theme-inspiration-summary",
      route: "mock-route",
      routeLabel: "Mock Route",
      attemptedRoutes: ["mock-route"]
    }
  });

  assert.equal(refreshedResult.status, 200);
  assert.deepEqual(
    refreshedResult.items.map((item) => item.themeTitle),
    ["从新手试错讲", "从关系安全感讲"]
  );

  const persisted = JSON.parse(await fs.readFile(paths.themeInspirations, "utf8"));
  assert.deepEqual(
    persisted.items.map((item) => item.themeTitle),
    ["从新手试错讲", "从关系安全感讲"]
  );
  assert.equal(Array.isArray(persisted.sourceRecordIds), true);
});

test("theme inspiration endpoint reuses cached inspirations even when source fingerprint has changed unless refresh is requested", async (t) => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "theme-inspirations-cache-reuse-"));
  const originals = {
    noteRecords: paths.noteRecords,
    themeInspirations: paths.themeInspirations
  };

  paths.noteRecords = path.join(tempDir, "note-records.json");
  paths.themeInspirations = path.join(tempDir, "theme-inspirations.json");

  t.after(async () => {
    Object.assign(paths, originals);
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  await fs.writeFile(
    paths.noteRecords,
    `${JSON.stringify([
      {
        id: "record-new-high-performing",
        source: "manual",
        stage: "published_reference",
        note: {
          title: "新的高表现内容",
          body: "新的内容数据。",
          tags: ["身体探索"],
          collectionType: "科普"
        },
        publish: {
          status: "published_passed",
          metrics: { likes: 60, favorites: 30, comments: 12, views: 3500, shares: 25 }
        },
        reference: {
          enabled: true,
          tier: "featured",
          selectedBy: "manual"
        }
      }
    ], null, 2)}\n`,
    "utf8"
  );

  await fs.writeFile(
    paths.themeInspirations,
    `${JSON.stringify({
      items: [
        {
          themeId: "cached-1",
          themeTitle: "从关系安全感讲",
          hookAngle: "很多人不是欲望太强，而是羞耻感太重。",
          whyNow: "旧缓存",
          discussionSignal: "旧缓存",
          sourceSignals: ["旧缓存"],
          expandAngles: [],
          boundaryNotes: ["避免病理化表达"],
          confidenceScore: 0.82,
          tags: ["身体探索", "情绪反应"],
          prefillBriefing: "写一篇从羞耻感角度展开的轻松科普。",
          prefillReferenceTitle: "从关系安全感讲",
          prefillMaterialText: "旧缓存内容",
          prefillCollectionType: "科普",
          prefillTone: "温和"
        }
      ],
      generatedAt: "2026-05-19T12:00:00.000Z",
      sourceFingerprint: "old-fingerprint",
      sourceRecordIds: ["record-old-high-performing"],
      sourceRecordCount: 1,
      clusterCount: 1
    }, null, 2)}\n`,
    "utf8"
  );

  const result = await invokeRoute("POST", "/api/generate-theme-inspirations", {});

  assert.equal(result.status, 200);
  assert.deepEqual(result.items.map((item) => item.themeTitle), ["从关系安全感讲"]);
  assert.equal(result.diagnostics.sourceRecordCount, 1);
  assert.equal(result.diagnostics.clusterCount, 1);
});

test("theme inspiration endpoint keeps existing cache file when refresh produces no usable items", async (t) => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "theme-inspirations-preserve-"));
  const originals = {
    noteRecords: paths.noteRecords,
    themeInspirations: paths.themeInspirations
  };

  paths.noteRecords = path.join(tempDir, "note-records.json");
  paths.themeInspirations = path.join(tempDir, "theme-inspirations.json");

  t.after(async () => {
    Object.assign(paths, originals);
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  await fs.writeFile(
    paths.noteRecords,
    `${JSON.stringify([
      {
        id: "record-high-performing",
        source: "manual",
        stage: "published_reference",
        note: {
          title: "边界感是不是冷淡",
          body: "不少人表达拒绝时会担心关系变差，这并不等于做错了。",
          tags: ["身体探索", "情绪反应"],
          collectionType: "科普"
        },
        publish: {
          status: "published_passed",
          metrics: { likes: 60, favorites: 30, comments: 12, views: 3500, shares: 25 }
        },
        reference: {
          enabled: true,
          tier: "featured",
          selectedBy: "manual"
        }
      }
    ], null, 2)}\n`,
    "utf8"
  );

  await fs.writeFile(
    paths.themeInspirations,
    `${JSON.stringify({
      items: [
        {
          themeId: "cached-1",
          themeTitle: "从关系安全感讲",
          hookAngle: "很多人不是欲望太强，而是羞耻感太重。",
          whyNow: "旧缓存",
          discussionSignal: "旧缓存",
          sourceSignals: ["旧缓存"],
          expandAngles: [],
          boundaryNotes: ["避免病理化表达"],
          confidenceScore: 0.82,
          tags: ["身体探索", "情绪反应"],
          prefillBriefing: "写一篇从羞耻感角度展开的轻松科普。",
          prefillReferenceTitle: "从关系安全感讲",
          prefillMaterialText: "旧缓存内容",
          prefillCollectionType: "科普",
          prefillTone: "温和"
        }
      ],
      generatedAt: "2026-05-19T12:00:00.000Z",
      sourceFingerprint: "record-high-performing",
      sourceRecordIds: ["record-high-performing"]
    }, null, 2)}\n`,
    "utf8"
  );

  const result = await invokeRoute("POST", "/api/generate-theme-inspirations", {
    refresh: true,
    mockThemeInspirationSummary: {
      items: [],
      provider: "mock",
      model: "mock-empty-theme-inspirations",
      route: "mock-route",
      routeLabel: "Mock Route",
      attemptedRoutes: ["mock-route"],
      rawText: "{\"items\":[]}",
      parsedKeys: ["items"],
      message: "模型没有生成可用主题卡。"
    }
  });

  assert.equal(result.status, 200);
  assert.deepEqual(result.items, []);
  const persisted = JSON.parse(await fs.readFile(paths.themeInspirations, "utf8"));
  assert.deepEqual(
    persisted.items.map((item) => item.themeTitle),
    ["从关系安全感讲"]
  );
  assert.equal(persisted.generatedAt, "2026-05-19T12:00:00.000Z");
});

test("generation selection normalization keeps generation separate and allows value-only fallback to rewrite", () => {
  const explicitGeneration = normalizeModelSelectionState({
    rewrite: "glm",
    generation: "kimi"
  });
  const fallbackGeneration = normalizeModelSelectionState({
    rewrite: "deepseek"
  });

  assert.equal(explicitGeneration.generation, "kimi");
  assert.equal(fallbackGeneration.rewrite, "deepseek");
  assert.equal(fallbackGeneration.generation, "auto");
});

test("generation prompt context includes collection type", () => {
  const messages = buildGenerationMessages({
    mode: "from_scratch",
    brief: {
      collectionType: "科普",
      lengthMode: "long",
      topic: "沟通",
      constraints: "温和"
    }
  });

  assert.match(messages[1].content, /合集类型：科普/);
  assert.match(messages[1].content, /长文档/);
  assert.match(messages[1].content, /1100-1600 个中文字符/);
  assert.match(messages[1].content, /按中文字符数理解/);
});

test("generation prompt includes compact hot-article formula when available", () => {
  const messages = buildGenerationMessages({
    mode: "from_scratch",
    brief: {
      collectionType: "科普",
      topic: "关系沟通"
    },
    hotArticleFormula: {
      status: "ok",
      keyword: "关系沟通",
      formula: "数字型标题 + 痛点开场 + 分点干货 + 互动收尾",
      titlePatterns: ["数字型标题"],
      openingPatterns: ["痛点共鸣开场"],
      structurePatterns: ["分点干货结构"],
      highFrequencyKeywords: ["边界感", "安全感"],
      tagStrategies: ["1 个宽标签 + 2-4 个细分场景标签"],
      interactionPrompts: ["评论区告诉我"],
      references: [
        {
          title: "3个沟通技巧",
          noteLink: "https://example.com/note",
          authorNickname: "作者A",
          authorLink: "https://example.com/author",
          likedCount: 100,
          collectedCount: 80,
          commentsCount: 20,
          sharedCount: 10
        }
      ]
    }
  });

  const userPrompt = String(messages[1].content || "");

  assert.match(userPrompt, /爆款公式来源/);
  assert.match(userPrompt, /数字型标题 \+ 痛点开场 \+ 分点干货 \+ 互动收尾/);
  assert.match(userPrompt, /边界感、?安全感|边界感.*安全感/);
  assert.match(userPrompt, /3个沟通技巧/);
  assert.match(userPrompt, /借结构和规律，不要照抄参考笔记原文/);
});

test("generation prompt omits hot-article formula when skipped or unavailable", () => {
  const messages = buildGenerationMessages({
    mode: "from_scratch",
    brief: {
      topic: "关系沟通"
    },
    hotArticleFormula: {
      status: "skipped",
      reason: "no_keyword"
    }
  });

  assert.doesNotMatch(String(messages[1].content || ""), /爆款公式来源/);
});

test("generation references only keep qualified manual reference samples", () => {
  const references = buildGenerationReferenceSamples({
    successSamples: [
      {
        id: "manual-qualified",
        tier: "featured",
        title: "高质量参考样本",
        body: "高质量参考正文",
        source: "manual",
        metrics: { likes: 68, favorites: 14, comments: 3 }
      },
      {
        id: "manual-unqualified",
        tier: "passed",
        title: "低数据参考样本",
        body: "低数据参考正文",
        source: "manual",
        metrics: { likes: 2, favorites: 0, comments: 0 }
      },
      {
        id: "manual-qualified-by-views",
        tier: "performed",
        title: "高浏览补足参考样本",
        body: "高浏览补足参考正文",
        source: "manual",
        metrics: { likes: 18, favorites: 4, comments: 1, views: 5600 }
      },
      {
        id: "manual-high-views-only",
        tier: "performed",
        title: "高浏览直达参考样本",
        body: "高浏览直达参考正文",
        source: "manual",
        metrics: { likes: 1, favorites: 0, comments: 0, views: 12800 }
      }
    ],
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

  assert.equal(references.some((item) => item.title === "低数据参考样本"), false);
  assert.equal(references.some((item) => item.title === "高质量参考样本"), true);
  assert.equal(references.some((item) => item.title === "高浏览补足参考样本"), true);
  assert.equal(references.some((item) => item.title === "高浏览直达参考样本"), true);
  assert.equal(references[0].title, "高质量参考样本");
  assert.equal(references[0].source, "manual");
  assert.equal(references.some((item) => item.title === "最终推荐稿样本"), false);
  assert.equal(references.some((item) => item.title === "未发布最终稿"), false);
});

test("unified note records only feed qualified reference samples into generation references", async (t) => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "generation-note-records-"));
  const originals = {
    noteRecords: paths.noteRecords,
    successSamples: paths.successSamples,
    noteLifecycle: paths.noteLifecycle
  };

  paths.noteRecords = path.join(tempDir, "note-records.json");
  paths.successSamples = path.join(tempDir, "success-samples.json");
  paths.noteLifecycle = path.join(tempDir, "note-lifecycle.json");

  t.after(async () => {
    Object.assign(paths, originals);
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  await fs.writeFile(
    paths.noteRecords,
    `${JSON.stringify([
      {
        id: "record-reference",
        source: "manual",
        stage: "published_reference",
        note: {
          title: "手工参考样本",
          body: "参考正文",
          tags: ["沟通"]
        },
        reference: {
          enabled: true,
          tier: "featured",
          selectedBy: "manual"
        },
        publish: {
          status: "published_passed",
          metrics: { likes: 36, favorites: 8, comments: 2 }
        }
      },
      {
        id: "record-final",
        source: "generation_final",
        stage: "published",
        note: {
          title: "发布后表现好的最终稿",
          body: "发布后表现好的最终稿正文",
          tags: ["科普"]
        },
        publish: {
          status: "positive_performance",
          metrics: { likes: 120, favorites: 35, comments: 9 }
        },
        reference: {
          enabled: false
        }
      },
      {
        id: "record-low-data-reference",
        source: "manual",
        stage: "published_reference",
        note: {
          title: "低数据参考样本",
          body: "低数据参考正文",
          tags: ["科普"]
        },
        publish: {
          status: "published_passed",
          metrics: { likes: 2, favorites: 0, comments: 0 }
        },
        reference: {
          enabled: true,
          tier: "passed",
          selectedBy: "manual"
        }
      },
      {
        id: "record-unpublished",
        source: "generation_final",
        stage: "generated",
        note: {
          title: "未发布最终稿",
          body: "未发布正文"
        },
        publish: {
          status: "not_published"
        },
        reference: {
          enabled: false
        }
      }
    ], null, 2)}\n`,
    "utf8"
  );

  const successSamples = await loadSuccessSamples();
  const noteLifecycle = await loadNoteLifecycle();
  const references = buildGenerationReferenceSamples({ successSamples, noteLifecycle });

  assert.deepEqual(successSamples.map((item) => item.id).sort(), ["record-low-data-reference", "record-reference"]);
  assert.equal(noteLifecycle.length, 2);
  assert.deepEqual(
    noteLifecycle.map((item) => item.note?.title).sort(),
    ["发布后表现好的最终稿", "未发布最终稿"]
  );
  assert.equal(references.some((item) => item.title === "手工参考样本"), true);
  assert.equal(references.some((item) => item.title === "低数据参考样本"), false);
  assert.equal(references.some((item) => item.title === "发布后表现好的最终稿"), false);
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

  await safeHandleRequest(request, response);
  return {
    status: response.status,
    ...(response.body ? JSON.parse(response.body) : {})
  };
}

async function invokeRouteRaw(method, pathname, body = null) {
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
  return response;
}
