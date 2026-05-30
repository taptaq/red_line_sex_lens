import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

import {
  applySampleLibraryAccountPlannerPrefill,
  getSelectedSampleLibraryAccountPlannerCard,
  renderSampleLibraryAccountPlannerResult
} from "../web/account-planner-view.js";
import { backfillPlannerSummaries, summarizeAccountPlanner } from "../src/account-planner.js";
import { buildXhsAccountDiagnosisModalMarkup } from "../web/xhs-account-diagnosis-view.js";

function extractSourceBetween(source, startMarker, endMarker) {
  const startIndex = source.indexOf(startMarker);
  assert.notEqual(startIndex, -1, `expected ${startMarker} to exist`);

  const endIndex = source.indexOf(endMarker, startIndex);
  assert.notEqual(endIndex, -1, `expected ${endMarker} after ${startMarker}`);

  return source.slice(startIndex, endIndex);
}

test("sample library exposes account planner panel and app wiring", async () => {
  const [indexHtml, appJs, styles, accountPlannerSource, serverSource, configSource, dataStoreSource] = await Promise.all([
    fs.readFile(path.join(process.cwd(), "web/index.html"), "utf8"),
    fs.readFile(path.join(process.cwd(), "web/app.js"), "utf8"),
    fs.readFile(path.join(process.cwd(), "web/styles.css"), "utf8"),
    fs.readFile(path.join(process.cwd(), "src/account-planner.js"), "utf8"),
    fs.readFile(path.join(process.cwd(), "src/server.js"), "utf8"),
    fs.readFile(path.join(process.cwd(), "src/config.js"), "utf8"),
    fs.readFile(path.join(process.cwd(), "src/data-store.js"), "utf8")
  ]);

  assert.match(indexHtml, /id="sample-library-account-planner-panel"/);
  assert.match(indexHtml, /id="sample-library-external-samples-button"/);
  assert.match(indexHtml, /id="sample-library-account-planner-import-input"/);
  assert.match(indexHtml, /id="sample-library-account-planner-run"/);
  assert.match(indexHtml, /id="sample-library-account-planner-result"/);
  assert.match(indexHtml, /id="xhs-account-diagnosis-panel"/);
  assert.match(indexHtml, /id="xhs-account-diagnosis-run"/);
  assert.match(indexHtml, /id="xhs-account-diagnosis-red-id"/);
  assert.match(indexHtml, /id="xhs-account-diagnosis-red-ids"/);
  assert.match(indexHtml, /id="xhs-account-diagnosis-open-latest"/);
  assert.doesNotMatch(indexHtml, /id="xhs-account-diagnosis-result"/);
  assert.match(indexHtml, /id="sample-library-external-samples-modal"/);
  assert.match(indexHtml, /id="sample-library-external-samples-modal-content"/);
  assert.match(indexHtml, /优先参考样本、效果好样本与外部样本/);
  assert.match(indexHtml, /参考样本用于长期参考，效果好样本表示发布结果已回填为“效果好”/);
  assert.match(appJs, /sampleLibraryAccountPlannerParseApi/);
  assert.match(appJs, /sampleLibraryAccountPlannerAnalyzeApi/);
  assert.match(appJs, /xhsAccountDiagnosisApi/);
  assert.match(appJs, /runXhsAccountDiagnosisAnalysis/);
  assert.match(appJs, /refreshXhsAccountDiagnosisState/);
  assert.match(appJs, /openXhsAccountDiagnosisModal/);
  assert.match(appJs, /followSimilarXhsAccountDiagnosis/);
  assert.match(appJs, /sampleLibraryExternalSamplesApi/);
  assert.match(appJs, /from "\.\/xhs-account-diagnosis-view\.js"/);
  assert.match(appJs, /from "\.\/account-planner-view\.js"/);
  assert.match(styles, /\.sample-library-account-planner\b/);
  assert.match(styles, /\.sample-library-external-samples-modal\b/);
  assert.match(styles, /\.sample-library-account-planner-card\b/);
  assert.match(styles, /\.xhs-account-diagnosis\b/);
  assert.match(styles, /\.xhs-account-diagnosis-modal-stack\b/);
  assert.doesNotMatch(accountPlannerSource, /外部参考样本还不够多，建议继续补充对照内容/);
  assert.match(accountPlannerSource, /maxTokens:\s*5200/);
  assert.match(serverSource, /summarize:\s*payload\?\.mockAccountPlannerSummary\s*\?\s*async\s*\(\)\s*=>\s*payload\.mockAccountPlannerSummary\s*:\s*undefined/);
  assert.match(configSource, /accountPlannerSummary:\s*path\.join\(dataDir,\s*"account-planner-summary\.json"\)/);
  assert.match(configSource, /xhsAccountDiagnosis:\s*path\.join\(dataDir,\s*"xhs-account-diagnosis\.json"\)/);
  assert.match(dataStoreSource, /export async function loadXhsAccountDiagnosis\(/);
  assert.match(dataStoreSource, /export async function saveXhsAccountDiagnosis\(/);
  assert.match(dataStoreSource, /export async function loadAccountPlannerSummary\(/);
  assert.match(dataStoreSource, /export async function saveAccountPlannerSummary\(/);
});

test("summarizeAccountPlanner throws when summarize handler is missing", async () => {
  await assert.rejects(
    () =>
      summarizeAccountPlanner({
        localRecords: [],
        externalSamples: [],
        summarize: null
      }),
    /账号级复盘当前不可用/
  );
});

test("buildXhsAccountDiagnosisModalMarkup renders overview, diagnosis summary, and similar accounts", () => {
  const markup = buildXhsAccountDiagnosisModalMarkup(
    {
      result: {
        account: {
          nickname: "测试号",
          redId: "26112666886",
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
          strengths: ["互动规模稳定"],
          risks: ["封面风格还不够统一"],
          nextActions: ["先继续放大高互动选题"]
        },
        similarAccounts: {
          peer: [{ redId: "peer-1", nickname: "同阶号", fans: 10000, interactiveCountThirty: 3000, reason: "同阶参考" }],
          benchmark: [{ redId: "benchmark-1", nickname: "高阶号", fans: 45000, interactiveCountThirty: 9000, reason: "高阶参考" }]
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
        },
        similarFollowups: [
          {
            account: {
              nickname: "相似账号1",
              redId: "peer-1",
              desc: "相似账号简介1",
              metrics: { fans: 9000, liked: 60000, collected: 8000, noteCountThirty: 8, interactiveCountThirty: 12000 }
            },
            diagnosis: {
              score: 70,
              summary: "相似账号1 的节奏更稳。",
              strengths: ["更新稳定"],
              risks: ["封面还能更统一"],
              nextActions: ["继续观察标题结构"]
            }
          }
        ]
      }
    },
    {
      escapeHtml(value) {
        return String(value || "");
      }
    }
  );

  assert.match(markup, /测试号/);
  assert.match(markup, /78/);
  assert.match(markup, /近30天互动强/);
  assert.match(markup, /同阶号/);
  assert.match(markup, /高阶号/);
  assert.match(markup, /同阶参考/);
  assert.match(markup, /继续分析/);
  assert.match(markup, /自动延伸分析/);
  assert.match(markup, /相似账号1/);
  assert.match(markup, /同类今日起量/);
  assert.match(markup, /同类今日起量样本/);
  assert.match(markup, /加入外部参考样本/);
  assert.match(markup, /生成灵感草稿/);
});

test("buildXhsAccountDiagnosisModalMarkup can render empty-state fallback", () => {
  const markup = buildXhsAccountDiagnosisModalMarkup(
    {
      result: null,
      report: {
        resultAvailable: false,
        htmlPath: "/api/xhs/account-diagnosis/report",
        reportDataPath: "/api/xhs/account-diagnosis/report-data"
      }
    },
    {
      escapeHtml(value) {
        return String(value || "");
      }
    }
  );

  assert.match(markup, /还没有可展示的账号诊断结果/);
  assert.doesNotMatch(markup, /查看 HTML 报告/);
  assert.doesNotMatch(markup, /查看报告 JSON/);
});

test("buildXhsAccountDiagnosisModalMarkup only shows report actions when result exists", () => {
  const markup = buildXhsAccountDiagnosisModalMarkup(
    {
      result: {
        account: { nickname: "测试号", redId: "1", desc: "", metrics: {} },
        diagnosis: { score: 10, summary: "摘要", strengths: [], risks: [], nextActions: [] },
        similarAccounts: { peer: [], benchmark: [] }
      },
      report: {
        resultAvailable: true,
        htmlPath: "/api/xhs/account-diagnosis/report",
        reportDataPath: "/api/xhs/account-diagnosis/report-data"
      }
    },
    {
      escapeHtml(value) {
        return String(value || "");
      }
    }
  );

  assert.match(markup, /查看 HTML 报告/);
  assert.match(markup, /查看报告 JSON/);
});

test("buildXhsAccountDiagnosisModalMarkup formats subscription timestamps for display", () => {
  const markup = buildXhsAccountDiagnosisModalMarkup(
    {
      result: null,
      subscription: {
        status: "scheduled",
        scheduledAt: "2026-05-29T14:49:33.752Z",
        retryCount: 0,
        nextRetryAt: ""
      }
    },
    {
      escapeHtml(value) {
        return String(value || "");
      }
    }
  );

  assert.match(markup, /2026-05-29 \d{2}:\d{2}/);
  assert.doesNotMatch(markup, /T14:49:33\.752Z/);
});

test("getSelectedSampleLibraryAccountPlannerCard prefers explicit selection and falls back to first card", () => {
  const cards = [{ planId: "plan-1" }, { planId: "plan-2" }];

  assert.deepEqual(getSelectedSampleLibraryAccountPlannerCard(cards, "plan-2"), { planId: "plan-2" });
  assert.deepEqual(getSelectedSampleLibraryAccountPlannerCard(cards, ""), { planId: "plan-1" });
  assert.equal(getSelectedSampleLibraryAccountPlannerCard([], ""), null);
});

test("applySampleLibraryAccountPlannerPrefill keeps existing briefing and appends planner evidence safely", () => {
  const events = [];
  const fields = {
    briefing: { value: "已有一句话需求" },
    materialText: { value: "已有素材" },
    referenceTitle: { value: "" },
    collectionType: { value: "" },
    tagReferences: { value: "旧标签" }
  };

  applySampleLibraryAccountPlannerPrefill(
    {
      prefillBriefing: "新的复盘建议需求",
      prefillReferenceTitle: "怎么表达拒绝又不伤人？",
      prefillMaterialText: "结构重点：反常识提问 -> 情绪解释 -> 正常化安抚。",
      prefillCollectionType: "科普",
      tags: ["情绪反应", "身体探索"],
      riskBoundary: ["避免病理化", "不做医疗诊断"],
      sourceSignals: ["本地高表现记录 1 条", "外部对照样本 1 条"]
    },
    {
      readFieldValue(fieldName) {
        return fields[fieldName]?.value || "";
      },
      writeFieldValue(fieldName, nextValue) {
        fields[fieldName].value = nextValue;
        events.push([fieldName, nextValue]);
      },
      appendMaterialText(nextText) {
        fields.materialText.value = `${fields.materialText.value}\n\n${nextText}`;
        events.push(["materialText", fields.materialText.value]);
      },
      splitCSV(value) {
        return String(value || "")
          .split(/[，,、]/)
          .map((item) => item.trim())
          .filter(Boolean);
      },
      joinCSV(items = []) {
        return items.join(", ");
      },
      uniqueStrings(items = []) {
        return [...new Set(items.map((item) => String(item || "").trim()).filter(Boolean))];
      }
    }
  );

  assert.equal(fields.briefing.value, "已有一句话需求");
  assert.equal(fields.referenceTitle.value, "怎么表达拒绝又不伤人？");
  assert.equal(fields.collectionType.value, "科普");
  assert.equal(fields.tagReferences.value, "旧标签, 情绪反应, 身体探索");
  assert.match(fields.materialText.value, /结构重点：反常识提问/);
  assert.match(fields.materialText.value, /边界提醒：避免病理化；不做医疗诊断/);
  assert.match(fields.materialText.value, /参考来源：本地高表现记录 1 条；外部对照样本 1 条/);
  assert.equal(events.length > 0, true);
});

test("renderSampleLibraryAccountPlannerResult shows model trace when available", () => {
  const nodes = {
    "sample-library-account-planner-result": { innerHTML: "" },
    "sample-library-account-planner-detail": { innerHTML: "" }
  };

  renderSampleLibraryAccountPlannerResult(
    {
      loading: false,
      summary: {
        strengths: ["轻科普解释路线稳定"],
        gaps: ["关系沟通角度偏少"],
        nextMove: "先补一个关系沟通切口。"
      },
      cards: [
        {
          planId: "plan-1",
          planTitle: "继续放大情绪解释路线",
          estimatedValue: "high",
          whyThisWorks: "最近高表现内容更集中在轻解释路线。",
          titleFormula: "反常识提问 + 解释原因 + 安抚落点",
          bodyStructure: ["先抛问题", "解释原因"],
          riskBoundary: ["避免病理化"],
          sourceSignals: ["本地高表现记录 1 条"],
          tags: ["情绪反应"],
          prefillBriefing: "写一篇轻松科普，解释怎么表达拒绝又不伤人。",
          prefillReferenceTitle: "怎么表达拒绝又不伤人？",
          prefillMaterialText: "结构重点：反常识提问 -> 解释原因。",
          prefillCollectionType: "科普",
          prefillTone: "温和"
        }
      ],
      selectedPlanId: "plan-1",
      modelTrace: {
        provider: "mock",
        model: "mock-account-planner",
        route: "mock-route",
        routeLabel: "Mock Route",
        attemptedRoutes: ["mock-route"]
      }
    },
    {
      byId(id) {
        return nodes[id] || null;
      },
      escapeHtml(value) {
        return String(value || "");
      }
    }
  );

  assert.match(nodes["sample-library-account-planner-result"].innerHTML, /模型总结：mock \/ mock-account-planner/);
  assert.match(nodes["sample-library-account-planner-result"].innerHTML, /Mock Route/);
  assert.match(nodes["sample-library-account-planner-result"].innerHTML, /可补充视角：关系沟通角度偏少/);
  assert.match(nodes["sample-library-account-planner-result"].innerHTML, /价值 高优先/);
  assert.match(nodes["sample-library-account-planner-detail"].innerHTML, /价值 高优先/);
  assert.match(nodes["sample-library-account-planner-detail"].innerHTML, /继续放大情绪解释路线/);
});

test("renderSampleLibraryAccountPlannerResult hides trace label when model trace is absent", () => {
  const nodes = {
    "sample-library-account-planner-result": { innerHTML: "" },
    "sample-library-account-planner-detail": { innerHTML: "" }
  };

  renderSampleLibraryAccountPlannerResult(
    {
      loading: false,
      summary: {
        strengths: ["悦己相关内容最近更稳定"],
        gaps: ["当前暂无稳定高表现样本，已自动退到已发布内容的观察型建议；若后续补充外部对照，可继续验证选题边界。"],
        nextMove: "先从“继续放大悦己路线”开始。"
      },
      cards: [
        {
          planId: "plan-1",
          planTitle: "继续放大悦己路线",
          estimatedValue: "medium",
          whyThisWorks: "这条建议来自账号本地高表现记录。",
          titleFormula: "问题切口 + 情绪解释 + 安抚落点",
          bodyStructure: ["先抛问题"],
          riskBoundary: ["避免病理化"],
          sourceSignals: ["本地高表现记录 1 条"],
          tags: ["悦己"],
          prefillBriefing: "写一篇围绕悦己路线的内容。",
          prefillReferenceTitle: "继续放大悦己路线",
          prefillMaterialText: "结构重点：问题切口 -> 解释原因。",
          prefillCollectionType: "科普",
          prefillTone: "温和"
        }
      ],
      selectedPlanId: "plan-1",
      modelTrace: {}
    },
    {
      byId(id) {
        return nodes[id] || null;
      },
      escapeHtml(value) {
        return String(value || "");
      }
    }
  );

  assert.doesNotMatch(nodes["sample-library-account-planner-result"].innerHTML, /分析来源：本地兜底/);
  assert.match(nodes["sample-library-account-planner-detail"].innerHTML, /价值 可尝试/);
});

test("buildFallbackAccountPlannerSummary produces concrete next-topic cards instead of duplicated route slogans", async () => {
  const accountPlannerSource = await fs.readFile(path.join(process.cwd(), "src/account-planner.js"), "utf8");
  const helperSource = extractSourceBetween(
    accountPlannerSource,
    "function normalizeString(",
    "function normalizeCard("
  );

  const { buildFallbackAccountPlannerSummary } = new Function(
    `${helperSource}; return { buildFallbackAccountPlannerSummary };`
  )();

  const summary = buildFallbackAccountPlannerSummary({
    localRecords: [
      {
        note: {
          title: "如果有天我突然die了，请务必帮我清理一下床头柜",
          body: "从关系沟通到亲密边界，重点解释为什么明确拒绝不等于疏远。",
          tags: ["悦己", "深夜话题"],
          collectionType: "科普"
        },
        publish: {
          status: "positive_performance",
          metrics: { views: 35000, likes: 520, favorites: 280, comments: 120, shares: 60 }
        }
      },
      {
        note: {
          title: "表达边界时总怕伤人，是我太冷淡吗？",
          body: "继续补一个情绪解释和正常化安抚的切口。",
          tags: ["愉悦", "情绪反应"],
          collectionType: "科普"
        },
        publish: {
          status: "positive_performance",
          metrics: { views: 28000, likes: 430, favorites: 210, comments: 88, shares: 44 }
        }
      }
    ],
    externalSamples: []
  });

  assert.equal(summary.cards.length, 1);
  assert.doesNotMatch(summary.cards[0].planTitle, /继续放大/);
  assert.match(summary.cards[0].planTitle, /为什么|怎么|哪些|是不是|能不能|该/);
  assert.match(summary.cards[0].prefillBriefing, /解释|正常|边界|安抚/);
  assert.match(summary.summary.nextMove, /先从“.+”开始/);
});

test("account planner summarize payload prioritizes reference and high-performance samples while keeping only brief summaries", async () => {
  const accountPlannerSource = await fs.readFile(path.join(process.cwd(), "src/account-planner.js"), "utf8");
  assert.match(accountPlannerSource, /const prioritizedLocalSamples = \[\.\.\.localSamples\]/);
  assert.match(accountPlannerSource, /const leftReference = left\?\.reference\?\.enabled === true \? 1 : 0/);
  assert.match(accountPlannerSource, /referenceEnabled: sample\.reference\?\.enabled === true/);
  assert.match(accountPlannerSource, /referenceTier: sample\.reference\?\.tier \|\| ""/);
  assert.match(accountPlannerSource, /publishedAt: sample\.publish\.publishedAt \|\| ""/);
  assert.match(accountPlannerSource, /publishRecencyLabel: derivePublishRecencyLabel\(sample\)/);
  assert.match(accountPlannerSource, /plannerSummary: sample\.plannerSummary \|\| null/);
  assert.match(accountPlannerSource, /body: sample\.plannerSummary\?\.summary \|\| sample\.body\.slice\(0, 220\)/);
});

test("account planner analyze request strips local note bodies and keeps publish time plus stored summaries", async () => {
  const appJs = await fs.readFile(path.join(process.cwd(), "web/app.js"), "utf8");
  const helperSource = extractSourceBetween(
    appJs,
    "function buildSampleLibraryAccountPlannerAnalyzePayload(",
    "async function runSampleLibraryAccountPlannerAnalysis("
  );
  const { buildSampleLibraryAccountPlannerAnalyzePayload } = new Function(
    `${helperSource}; return { buildSampleLibraryAccountPlannerAnalyzePayload };`
  )();

  const payload = buildSampleLibraryAccountPlannerAnalyzePayload({
    records: [
      {
        id: "record-1",
        note: {
          title: "样本一",
          body: "这是不应该继续从浏览器传给账号复盘接口的全文内容。",
          tags: ["悦己"],
          collectionType: "科普"
        },
        publish: {
          status: "positive_performance",
          publishedAt: "2026-05-20T08:00:00.000Z",
          metrics: { views: 12000, likes: 99 }
        },
        reference: { enabled: true, tier: "featured" },
        calibration: {
          plannerSummary: {
            summary: "这篇主要解释边界表达是在保护关系。",
            keyPoints: ["边界表达", "正常化安抚"]
          },
          retro: {
            outcome: "平台正常通过"
          }
        }
      }
    ],
    externalSamples: [
      {
        id: "external-1",
        title: "外部对照",
        body: "外部样本也不该原封不动带整篇全文，所以这里至少要被收短。".repeat(12),
        tags: ["悦己"],
        collectionType: "科普",
        publish: {
          status: "published_passed",
          publishedAt: "2026-05-10T08:00:00.000Z",
          metrics: { views: 9000 }
        }
      }
    ]
  });

  assert.equal("body" in payload.records[0].note, false);
  assert.equal(payload.records[0].publish.publishedAt, "2026-05-20T08:00:00.000Z");
  assert.equal(payload.records[0].calibration.plannerSummary.summary, "这篇主要解释边界表达是在保护关系。");
  assert.deepEqual(payload.records[0].calibration.retro, { outcome: "平台正常通过" });
  assert.equal(payload.externalSamples[0].body.length <= 180, true);
  assert.doesNotMatch(JSON.stringify(payload), /不应该继续从浏览器传给账号复盘接口的全文内容/);
});

test("summarizeAccountPlanner only sends reference and high-performing local samples into the planner summarizer", async () => {
  let capturedLocalRecords = [];
  let capturedExternalSamples = [];

  await summarizeAccountPlanner({
    localRecords: [
      {
        id: "record-ref",
        note: { title: "参考样本", body: "参考正文", tags: ["悦己"], collectionType: "科普" },
        publish: { status: "published_passed", metrics: { views: 12000, likes: 80, favorites: 40, comments: 18, shares: 12 } },
        reference: { enabled: true, tier: "featured" }
      },
      {
        id: "record-high",
        note: { title: "高表现样本", body: "高表现正文", tags: ["情绪反应"], collectionType: "科普" },
        publish: { status: "positive_performance", metrics: { views: 30000, likes: 320, favorites: 180, comments: 96, shares: 48 } },
        reference: { enabled: false, tier: "" }
      },
      {
        id: "record-normal",
        note: { title: "普通样本", body: "普通正文", tags: ["关系沟通"], collectionType: "科普" },
        publish: { status: "published_passed", metrics: { views: 1800, likes: 12, favorites: 4, comments: 2, shares: 1 } },
        reference: { enabled: false, tier: "" }
      }
    ],
    externalSamples: [{ id: "external-1", title: "外部对照", body: "外部正文", tags: ["悦己"], collectionType: "科普", publish: { status: "published_passed", metrics: { views: 9000 } } }],
    summarize: async ({ localRecords, externalSamples }) => {
      capturedLocalRecords = localRecords;
      capturedExternalSamples = externalSamples;
      return {
        summary: { strengths: [], gaps: [], nextMove: "先看参考样本。" },
        cards: [
          {
            planTitle: "下一篇先看参考样本",
            estimatedValue: "high",
            whyThisWorks: "用于验证筛选后的输入。",
            titleFormula: "问题切口 + 解释",
            bodyStructure: ["先讲问题", "再讲解释"],
            riskBoundary: ["避免病理化"],
            sourceSignals: ["测试桩"],
            tags: ["悦己"],
            prefillBriefing: "写一篇解释类内容。",
            prefillReferenceTitle: "下一篇先看参考样本",
            prefillMaterialText: "测试材料",
            prefillCollectionType: "科普",
            prefillTone: "温和"
          }
        ],
        modelTrace: {}
      };
    }
  });

  assert.deepEqual(
    capturedLocalRecords.map((item) => item.id),
    ["record-ref", "record-high"]
  );
  assert.deepEqual(capturedExternalSamples.map((item) => item.id), ["external-1"]);
});

test("summarizeAccountPlanner passes stored planner summary into the summarizer payload when available", async () => {
  let capturedLocalRecords = [];

  await summarizeAccountPlanner({
    localRecords: [
      {
        id: "record-ref",
        note: { title: "参考样本", body: "这是一段很长的正文，会被摘要替代。", tags: ["悦己"], collectionType: "科普" },
        publish: { status: "positive_performance", metrics: { views: 20000, likes: 160, favorites: 90, comments: 40, shares: 22 } },
        reference: { enabled: true, tier: "featured" },
        calibration: {
          plannerSummary: {
            summary: "这篇主要解释边界表达是在保护关系。",
            keyPoints: ["边界表达", "情绪解释"],
            suggestedTopic: "怎么把边界说清楚？"
          }
        }
      }
    ],
    externalSamples: [],
    summarize: async ({ localRecords }) => {
      capturedLocalRecords = localRecords;
      return {
        summary: { strengths: [], gaps: [], nextMove: "先看摘要样本。" },
        cards: [
          {
            planTitle: "下一篇先看摘要样本",
            estimatedValue: "high",
            whyThisWorks: "用于验证 plannerSummary 已传入模型层。",
            titleFormula: "问题切口 + 解释",
            bodyStructure: ["先讲问题", "再讲解释"],
            riskBoundary: ["避免病理化"],
            sourceSignals: ["测试桩"],
            tags: ["悦己"],
            prefillBriefing: "写一篇解释类内容。",
            prefillReferenceTitle: "下一篇先看摘要样本",
            prefillMaterialText: "测试材料",
            prefillCollectionType: "科普",
            prefillTone: "温和"
          }
        ],
        modelTrace: {}
      };
    }
  });

  assert.equal(capturedLocalRecords[0].calibration.plannerSummary.summary, "这篇主要解释边界表达是在保护关系。");
});

test("summarizeAccountPlanner throws when model returns no usable cards", async () => {
  await assert.rejects(
    () =>
      summarizeAccountPlanner({
        localRecords: [
          {
            id: "record-passed",
            note: {
              title: "表达边界后是不是会显得很冷淡？",
              body: "最近连续几篇都在试关系沟通和边界表达，虽然还没有高表现，但评论里有稳定互动。",
              tags: ["关系沟通", "边界表达"],
              collectionType: "科普"
            },
            publish: {
              status: "published_passed",
              publishedAt: "2026-05-24T08:00:00.000Z",
              metrics: { views: 1800, likes: 22, favorites: 9, comments: 6, shares: 2 }
            },
            reference: { enabled: false, tier: "" },
            calibration: {
              plannerSummary: {
                summary: "这篇在解释明确表达边界不等于冷淡，适合继续观察沟通类选题。",
                keyPoints: ["边界表达", "关系沟通"],
                suggestedTopic: "怎么把拒绝说清楚又不伤人？"
              }
            }
          }
        ],
        externalSamples: [],
        summarize: async () => ({
          summary: {
            strengths: ["暂无近期高表现内容，先观察最近已发布主题。"],
            gaps: ["当前还缺少稳定爆样本，建议先做小步验证。"],
            nextMove: "先继续观察最近已发布的关系沟通内容。"
          },
          cards: [],
          modelTrace: {
            provider: "mock",
            model: "mock-account-planner",
            route: "mock-route",
            routeLabel: "Mock Route",
            attemptedRoutes: ["mock-route"]
          }
        })
      }),
    /模型没有返回可用的复盘卡/
  );
});

test("summarizeAccountPlanner throws even when stored planner summaries exist but model returns no cards", async () => {
  await assert.rejects(
    () =>
      summarizeAccountPlanner({
        localRecords: [
          {
            id: "record-passed",
            note: {
              title: "表达边界后是不是会显得很冷淡？",
              tags: ["关系沟通", "边界表达"],
              collectionType: "科普"
            },
            publish: {
              status: "published_passed",
              publishedAt: "2026-05-24T08:00:00.000Z",
              metrics: { views: 1800, likes: 22, favorites: 9, comments: 6, shares: 2 }
            },
            reference: { enabled: false, tier: "" },
            calibration: {
              plannerSummary: {
                summary: "这篇在解释明确表达边界不等于冷淡，适合继续观察关系沟通方向。",
                keyPoints: ["边界表达", "关系沟通"],
                suggestedTopic: "怎么把拒绝说清楚又不伤人？"
              }
            }
          }
        ],
        externalSamples: [],
        summarize: async () => ({
          summary: {
            strengths: ["近期已发布样本开始集中到关系沟通方向。"],
            gaps: ["暂时还没有稳定高表现样本，建议继续小步验证。"],
            nextMove: "先围绕边界表达继续做一轮观察型选题。"
          },
          cards: [],
          modelTrace: {
            provider: "mock",
            model: "mock-account-planner",
            route: "mock-route",
            routeLabel: "Mock Route",
            attemptedRoutes: ["mock-route"]
          }
        })
      }),
    /模型没有返回可用的复盘卡/
  );
});

test("backfillPlannerSummaries stores generated planner summaries on matching note records", async () => {
  const records = [
    {
      id: "record-1",
      note: { title: "样本一", body: "正文一", tags: ["悦己"], collectionType: "科普" },
      publish: { status: "positive_performance", metrics: { views: 20000 } },
      reference: { enabled: true, tier: "featured" },
      calibration: {}
    },
    {
      id: "record-2",
      note: { title: "样本二", body: "正文二", tags: ["情绪反应"], collectionType: "科普" },
      publish: { status: "published_passed", metrics: { views: 2000 } },
      reference: { enabled: false, tier: "" },
      calibration: {
        plannerSummary: {
          summary: "已有摘要",
          keyPoints: ["旧要点"],
          riskBoundary: [],
          suggestedTopic: "已有选题",
          provider: "deepseek",
          model: "deepseek-v4-flash",
          createdAt: "2026-05-26T09:00:00.000Z"
        }
      }
    }
  ];

  const result = await backfillPlannerSummaries({
    records,
    summarizeRecord: async (record) => ({
      summary: `为${record.note.title}生成的摘要`,
      keyPoints: ["情绪解释", "正常化安抚"],
      riskBoundary: ["避免病理化"],
      suggestedTopic: `为什么${record.note.title}会这样？`,
      provider: "deepseek",
      model: "deepseek-v4-flash",
      createdAt: "2026-05-26T10:00:00.000Z"
    })
  });

  assert.equal(result.updatedCount, 1);
  assert.equal(result.items[0].calibration.plannerSummary.summary, "为样本一生成的摘要");
  assert.equal(result.items[1].calibration.plannerSummary.summary, "已有摘要");
});

test("cli exposes a planner summary backfill command", async () => {
  const cliSource = await fs.readFile(path.join(process.cwd(), "src/cli.js"), "utf8");

  assert.match(cliSource, /if \(command === "planner:backfill-summaries"\)/);
  assert.match(cliSource, /await runPlannerSummaryBackfill\(args\);/);
  assert.match(cliSource, /loadNoteRecords\(\)/);
  assert.match(cliSource, /saveNoteRecords\(/);
  assert.match(cliSource, /backfillPlannerSummaries\(/);
  assert.match(cliSource, /if \(command === "planner:check-summaries"\)/);
  assert.match(cliSource, /await runPlannerSummaryCheck\(args\);/);
});
