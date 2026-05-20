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
    successSamples: paths.successSamples,
    styleProfile: paths.styleProfile,
    memoryRoot: paths.memoryRoot,
    memoryDocuments: paths.memoryDocuments,
    memoryCards: paths.memoryCards,
    memoryEmbeddings: paths.memoryEmbeddings,
    memoryIndexMeta: paths.memoryIndexMeta
  };
  paths.collectionTypes = path.join(tempDir, "collection-types.json");
  paths.successSamples = path.join(tempDir, "success-samples.json");
  paths.styleProfile = path.join(tempDir, "style-profile.json");
  paths.memoryRoot = path.join(tempDir, "memory");
  paths.memoryDocuments = path.join(paths.memoryRoot, "documents.jsonl");
  paths.memoryCards = path.join(paths.memoryRoot, "cards.jsonl");
  paths.memoryEmbeddings = path.join(paths.memoryRoot, "embeddings.jsonl");
  paths.memoryIndexMeta = path.join(paths.memoryRoot, "index-meta.json");
  await fs.writeFile(paths.collectionTypes, `${JSON.stringify({ custom: [] }, null, 2)}\n`, "utf8");
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
          themeTitle: "自慰后空虚并不一定异常",
          hookAngle: "很多人以为这是问题，其实很常见。",
          whyNow: "这个主题兼具反差和科普价值。",
          discussionSignal: "多个高表现内容都反复命中。",
          sourceSignals: ["命中 2 条高表现内容"],
          expandAngles: ["从激素变化讲", "从羞耻感讲"],
          boundaryNotes: ["避免病理化表达"],
          confidenceScore: 0.92,
          tags: ["身体探索", "情绪反应"],
          prefillBriefing: "写一篇轻松科普，解释自慰后空虚为什么不一定异常。",
          prefillTopic: "自慰后空虚是不是异常",
          prefillConstraints: "避免病理化，不做医疗诊断。",
          prefillReferenceTitle: "为什么结束后会突然很空？",
          prefillMaterialText: "关键点：常见、正常、可自我接纳。"
        }
      ]
    });

    assert.equal(result.status, 200);
    assert.equal(result.ok, true);
    assert.equal(result.items.length, 2);
    assert.deepEqual(
      result.items.map((item) => item.themeTitle),
      ["从激素变化讲", "从羞耻感讲"]
    );
    assert.equal(result.items[0].sourceThemeTitle, "自慰后空虚并不一定异常");
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
          title: "自慰后空虚是不是异常",
          body: "不少人结束后会短暂失落或空虚，这并不一定意味着异常。",
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
          themeTitle: "自慰后空虚并不一定异常",
          hookAngle: "很多人以为空虚就是异常，其实很常见。",
          whyNow: "高表现内容反复命中这个问题。",
          discussionSignal: "容易引发“我是不是不正常”的讨论。",
          sourceSignals: ["命中 1 条高表现内容"],
          expandAngles: ["从激素波动讲", "从羞耻感讲"],
          boundaryNotes: ["避免病理化表达"],
          confidenceScore: 0.93,
          tags: ["身体探索", "情绪反应"],
          prefillBriefing: "写一篇轻松科普，解释自慰后空虚为什么不一定异常。",
          prefillReferenceTitle: "为什么结束后会突然很空？",
          prefillMaterialText: "关键点：常见、正常、可自我接纳。"
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
    ["从激素波动讲", "从羞耻感讲"]
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
          title: "自慰后空虚是不是异常",
          body: "不少人结束后会短暂失落或空虚，这并不一定意味着异常。",
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
          title: "自慰后空虚是不是异常",
          body: "不少人结束后会短暂失落或空虚，这并不一定意味着异常。",
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
          themeTitle: "从羞耻感讲",
          hookAngle: "很多人不是欲望太强，而是羞耻感太重。",
          whyNow: "旧缓存",
          discussionSignal: "旧缓存",
          sourceSignals: ["旧缓存"],
          expandAngles: [],
          boundaryNotes: ["避免病理化表达"],
          confidenceScore: 0.82,
          tags: ["身体探索", "情绪反应"],
          prefillBriefing: "写一篇从羞耻感角度展开的轻松科普。",
          prefillReferenceTitle: "从羞耻感讲",
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
  assert.deepEqual(cachedResult.items.map((item) => item.themeTitle), ["从羞耻感讲"]);

  const refreshedResult = await invokeRoute("POST", "/api/generate-theme-inspirations", {
    refresh: true,
    mockThemeInspirationSummary: {
      items: [
        {
          themeTitle: "自慰后空虚并不一定异常",
          hookAngle: "很多人以为空虚就是异常，其实很常见。",
          whyNow: "高表现内容反复命中这个问题。",
          discussionSignal: "容易引发“我是不是不正常”的讨论。",
          sourceSignals: ["命中 1 条高表现内容"],
          expandAngles: ["从新手试错讲", "从羞耻感讲"],
          boundaryNotes: ["避免病理化表达"],
          confidenceScore: 0.93,
          tags: ["身体探索", "情绪反应"],
          prefillBriefing: "写一篇轻松科普，解释自慰后空虚为什么不一定异常。",
          prefillReferenceTitle: "为什么结束后会突然很空？",
          prefillMaterialText: "关键点：常见、正常、可自我接纳。"
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
    ["从新手试错讲", "从羞耻感讲"]
  );

  const persisted = JSON.parse(await fs.readFile(paths.themeInspirations, "utf8"));
  assert.deepEqual(
    persisted.items.map((item) => item.themeTitle),
    ["从新手试错讲", "从羞耻感讲"]
  );
  assert.equal(Array.isArray(persisted.sourceRecordIds), true);
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
          title: "自慰后空虚是不是异常",
          body: "不少人结束后会短暂失落或空虚，这并不一定意味着异常。",
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
          themeTitle: "从羞耻感讲",
          hookAngle: "很多人不是欲望太强，而是羞耻感太重。",
          whyNow: "旧缓存",
          discussionSignal: "旧缓存",
          sourceSignals: ["旧缓存"],
          expandAngles: [],
          boundaryNotes: ["避免病理化表达"],
          confidenceScore: 0.82,
          tags: ["身体探索", "情绪反应"],
          prefillBriefing: "写一篇从羞耻感角度展开的轻松科普。",
          prefillReferenceTitle: "从羞耻感讲",
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
    ["从羞耻感讲"]
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
