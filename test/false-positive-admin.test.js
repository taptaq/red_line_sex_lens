import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { paths } from "../src/config.js";
import { loadAdminData } from "../src/admin.js";
import { handleRequest } from "../src/server.js";

function extractSourceBetween(source, startMarker, endMarker) {
  const startIndex = source.indexOf(startMarker);
  assert.notEqual(startIndex, -1, `expected ${startMarker} to exist`);

  const endIndex = source.indexOf(endMarker, startIndex);
  assert.notEqual(endIndex, -1, `expected ${endMarker} after ${startMarker}`);

  return source.slice(startIndex, endIndex);
}

async function withTempFalsePositiveLog(t, run) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "false-positive-admin-"));
  const tempFile = path.join(tempDir, "false-positive-log.json");
  const originalPaths = {
    falsePositiveLog: paths.falsePositiveLog,
    reviewQueue: paths.reviewQueue,
    whitelist: paths.whitelist,
    lexiconCustom: paths.lexiconCustom
  };
  paths.falsePositiveLog = tempFile;
  paths.reviewQueue = path.join(tempDir, "review-queue.json");
  paths.whitelist = path.join(tempDir, "whitelist.json");
  paths.lexiconCustom = path.join(tempDir, "lexicon.custom.json");
  await Promise.all([
    fs.writeFile(paths.reviewQueue, "[]\n", "utf8"),
    fs.writeFile(paths.whitelist, "[]\n", "utf8"),
    fs.writeFile(paths.lexiconCustom, "[]\n", "utf8")
  ]);

  t.after(async () => {
    Object.assign(paths, originalPaths);
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  return run();
}

test("loadAdminData includes false positive samples for maintenance", async (t) => {
  await withTempFalsePositiveLog(t, async () => {
    const seeded = [
      {
        id: "fp-admin-1",
        createdAt: "2026-04-20T00:00:00.000Z",
        updatedAt: "2026-04-20T00:00:00.000Z",
        status: "platform_passed_pending",
        title: "待确认样本",
        body: "这是一段很长的正文，用来确认管理面板不会只展示两行就没了，而是至少能看到状态和审核结论。",
        coverText: "封面文案",
        tags: ["两性", "关系沟通"],
        userNotes: "待观察",
        analysisSnapshot: {
          verdict: "manual_review",
          score: 41,
          categories: ["关系沟通"],
          suggestions: ["继续观察"],
          summary: "样本摘要"
        },
        falsePositiveAudit: {
          signal: "strict_pending",
          label: "规则偏严待确认",
          analyzerVerdict: "manual_review",
          notes: "先观察"
        }
      }
    ];
    await fs.writeFile(paths.falsePositiveLog, `${JSON.stringify(seeded, null, 2)}\n`, "utf8");

    const data = await loadAdminData();

    assert.equal(Array.isArray(data.falsePositiveLog), true);
    assert.equal(data.falsePositiveLog.length, 1);
    assert.equal(data.falsePositiveLog[0].id, "fp-admin-1");
    assert.equal(data.falsePositiveLog[0].status, "platform_passed_pending");
    assert.equal(data.falsePositiveLog[0].falsePositiveAudit.label, "规则偏严待确认");
    assert.match(data.falsePositiveLog[0].body, /很长的正文/);
  });
});

test("admin false positive endpoints confirm and delete samples", async (t) => {
  await withTempFalsePositiveLog(t, async () => {
    const seeded = [
      {
        id: "fp-admin-1",
        createdAt: "2026-04-20T00:00:00.000Z",
        updatedAt: "2026-04-20T00:00:00.000Z",
        status: "platform_passed_pending",
        title: "待确认样本",
        body: "第一条待确认样本",
        coverText: "",
        tags: ["两性"],
        userNotes: "待观察",
        analysisSnapshot: { verdict: "manual_review", score: 41, categories: [], suggestions: [] },
        falsePositiveAudit: { signal: "strict_pending", label: "规则偏严待确认", analyzerVerdict: "manual_review", notes: "先观察" }
      },
      {
        id: "fp-admin-2",
        createdAt: "2026-04-20T00:01:00.000Z",
        updatedAt: "2026-04-20T00:01:00.000Z",
        status: "platform_passed_pending",
        title: "要删除的样本",
        body: "第二条待确认样本",
        coverText: "",
        tags: ["关系沟通"],
        userNotes: "待删除",
        analysisSnapshot: { verdict: "manual_review", score: 41, categories: [], suggestions: [] },
        falsePositiveAudit: { signal: "strict_pending", label: "规则偏严待确认", analyzerVerdict: "manual_review", notes: "先观察" }
      }
    ];
    await fs.writeFile(paths.falsePositiveLog, `${JSON.stringify(seeded, null, 2)}\n`, "utf8");

    const patched = await invokeRoute("PATCH", "/api/admin/false-positive-log", {
      id: "fp-admin-1",
      status: "platform_passed_confirmed",
      userNotes: "观察期结束"
    });

    assert.equal(patched.status, 200);
    assert.equal(patched.ok, true);
    assert.equal(patched.items.length, 2);
    assert.equal(patched.items[0].status, "platform_passed_confirmed");
    assert.equal(patched.items[0].falsePositiveAudit.signal, "strict_confirmed");
    assert.equal(patched.items[0].userNotes, "观察期结束");
    assert.equal(patched.items[1].status, "platform_passed_pending");

    const deleted = await invokeRoute("DELETE", "/api/admin/false-positive-log", {
      id: "fp-admin-2"
    });

    assert.equal(deleted.status, 200);
    assert.equal(deleted.ok, true);
    assert.equal(deleted.items.length, 1);
    assert.equal(deleted.items[0].id, "fp-admin-1");

    const listed = await invokeRoute("GET", "/api/admin/false-positive-log");

    assert.equal(listed.status, 200);
    assert.equal(listed.ok, true);
    assert.equal(listed.items.length, 1);
    assert.equal(listed.items[0].status, "platform_passed_confirmed");
  });
});

test("confirming a false positive sample creates a whitelist counterexample candidate that can be promoted", async (t) => {
  await withTempFalsePositiveLog(t, async () => {
    const seeded = [
      {
        id: "fp-whitelist-1",
        createdAt: "2026-04-20T00:00:00.000Z",
        updatedAt: "2026-04-20T00:00:00.000Z",
        status: "platform_passed_pending",
        title: "健康表达误报",
        body: "这是一条健康表达误报样本。",
        coverText: "",
        tags: ["健康表达"],
        userNotes: "待观察",
        analysisSnapshot: { verdict: "manual_review", score: 41, categories: ["健康表达"], suggestions: [] },
        falsePositiveAudit: { signal: "strict_pending", label: "规则偏严待确认", analyzerVerdict: "manual_review", notes: "先观察" }
      }
    ];
    await fs.writeFile(paths.falsePositiveLog, `${JSON.stringify(seeded, null, 2)}\n`, "utf8");

    const patched = await invokeRoute("PATCH", "/api/admin/false-positive-log", {
      id: "fp-whitelist-1",
      status: "platform_passed_confirmed"
    });

    assert.equal(patched.status, 200);
    const adminData = await loadAdminData();
    const candidate = adminData.reviewQueue.find((item) => item.candidateType === "whitelist");
    assert.equal(candidate.phrase, "健康表达");
    assert.equal(candidate.recommendedLexiconDraft.targetScope, "whitelist");

    const promoted = await invokeRoute("POST", "/api/admin/review-queue/promote", {
      id: candidate.id
    });

    assert.equal(promoted.status, 200);
    assert.equal(promoted.ok, true);
    assert.equal(promoted.item.targetScope, "whitelist");
    assert.deepEqual(JSON.parse(await fs.readFile(paths.whitelist, "utf8")), ["健康表达"]);
  });
});

test("admin page exposes false positive maintenance inside the sample library pane", async () => {
  const [indexHtml, appJs] = await Promise.all([
    fs.readFile(path.join(process.cwd(), "web/index.html"), "utf8"),
    fs.readFile(path.join(process.cwd(), "web/app.js"), "utf8")
  ]);

  assert.match(indexHtml, /id="feedback-advanced-panel"/);
  assert.match(indexHtml, /快速回流/);
  assert.match(indexHtml, /高级识别/);
  assert.match(indexHtml, /data-tab-target="sample-library-pane"/);
  assert.doesNotMatch(indexHtml, /data-tab-target="feedback-center-pane"/);
  assert.doesNotMatch(indexHtml, /data-tab-target="false-positive-log-pane"[^>]*>误报样本</);
  assert.doesNotMatch(indexHtml, /data-tab-target="feedback-log-pane"[^>]*>反馈日志</);
  assert.doesNotMatch(indexHtml, /id="feedback-center-pane"/);
  assert.match(indexHtml, /id="sample-library-pane"/);
  assert.match(indexHtml, /id="sample-library-reflow-panel"/);
  assert.match(indexHtml, /回流待处理区/);
  assert.match(indexHtml, /违规反馈/);
  assert.match(indexHtml, /误报案例/);
  assert.match(indexHtml, /待优先处理/);
  assert.match(indexHtml, /feedback-priority-pill/);
  assert.match(indexHtml, /id="feedback-priority-list"/);
  assert.match(indexHtml, /id="feedback-log-secondary-list"/);
  assert.match(indexHtml, /id="false-positive-summary"/);
  assert.doesNotMatch(indexHtml, /id="false-positive-pending-list"/);
  assert.doesNotMatch(indexHtml, /id="false-positive-history-list"/);
  assert.match(indexHtml, /id="feedback-log-list"/);
  assert.match(indexHtml, /id="false-positive-log-list"/);
  assert.doesNotMatch(indexHtml, /id="rules-maintenance-shortcuts"/);
  assert.match(indexHtml, /扩展维护/);
  assert.match(appJs, /renderFalsePositiveLog|false-positive-log-list/);
  assert.match(appJs, /renderFeedbackLog|feedback-log-list/);
  assert.match(appJs, /feedback-item-status/);
  assert.match(appJs, /false_positive_reflow/);
  assert.match(appJs, /send-feedback-to-review-queue/);
  assert.match(appJs, /send-feedback-to-false-positive/);
  assert.match(appJs, /function\s+buildFeedbackRuleQueueModalMarkup\s*\(/);
  assert.match(appJs, /function\s+openFeedbackRuleQueueModal\s*\(/);
  assert.match(appJs, /function\s+saveFeedbackRuleQueueModal\s*\(/);
  assert.match(appJs, /function\s+buildFeedbackFalsePositiveModalMarkup\s*\(/);
  assert.match(appJs, /function\s+openFeedbackFalsePositiveModal\s*\(/);
  assert.match(appJs, /function\s+saveFeedbackFalsePositiveModal\s*\(/);
  assert.match(appJs, /function\s+buildSampleLibraryModalTagPickerMarkup\s*\(/);
  assert.match(appJs, /class="tag-picker field-wide sample-library-modal-tag-picker"/);
  assert.match(appJs, /name="tags" type="hidden"/);
  assert.match(appJs, /sample-library-modal-tag-trigger/);
  assert.match(appJs, /sample-library-modal-tag-dropdown/);
  assert.match(appJs, /buildFeedbackFalsePositiveModalMarkup[\s\S]*buildSampleLibraryModalTagPickerMarkup\(modalState\.tags \|\| \[\]\)/);
  assert.match(appJs, /加入规则复核/);
  assert.match(appJs, /记录为误报案例/);
  assert.match(appJs, /反馈推荐动作/);
  assert.match(appJs, /推荐沉淀规则/);
  assert.match(appJs, /推荐记为误报/);
  assert.match(appJs, /先人工判断/);
  assert.match(appJs, /feedback-priority-list/);
  assert.match(appJs, /feedback-log-secondary-list/);
  assert.match(appJs, /false-positive-summary/);
});

test("sample library reflow area exposes false positive summary and modal launch controls", async () => {
  const [indexHtml, appJs] = await Promise.all([
    fs.readFile(path.join(process.cwd(), "web/index.html"), "utf8"),
    fs.readFile(path.join(process.cwd(), "web/app.js"), "utf8")
  ]);

  assert.match(indexHtml, /id="false-positive-summary"/);
  assert.match(indexHtml, /id="false-positive-preview-open-button"/);
  assert.match(indexHtml, /查看全部误报案例/);
  assert.doesNotMatch(indexHtml, /id="false-positive-pending-list"/);
  assert.doesNotMatch(indexHtml, /id="false-positive-history-list"/);
  assert.match(appJs, /function\s+buildFalsePositiveSummaryText\s*\(/);
  assert.match(appJs, /summaryNode\.textContent = buildFalsePositiveSummaryText\(\{ pendingItems, historyItems \}\)/);
  assert.match(appJs, /previewButton\.hidden = appState\.falsePositiveLog\.length === 0/);
  assert.match(appJs, /function\s+openFalsePositiveListModal\s*\(/);
  assert.match(appJs, /function\s+buildFalsePositiveListModalMarkup\s*\(/);
  assert.match(appJs, /buildFalsePositiveListSectionMarkup\(\s*"待确认误报"/);
  assert.match(appJs, /buildFalsePositiveListSectionMarkup\(\s*"已沉淀误报案例"/);
  assert.match(appJs, /buildFalsePositiveEntryMarkup\(\{/);
  assert.match(appJs, /body:\s*buildFalsePositiveListModalMarkup\(\)/);
  assert.match(appJs, /hideSaveButton:\s*true/);
  assert.match(appJs, /cancelLabel:\s*"关闭"/);
  assert.match(appJs, /function\s+renderFalsePositiveListModal\s*\(/);
  assert.match(appJs, /saveButton\.hidden = hideSaveButton/);
  assert.match(appJs, /hideCancelButton = false/);
  assert.match(appJs, /cancelButton\.hidden = hideCancelButton/);
  assert.match(appJs, /saveButton\.disabled = false/);
  assert.match(appJs, /saveButton\.dataset\.busy = ""/);
  assert.match(appJs, /saveButton\.title = ""/);
  assert.match(appJs, /if \(appState\.sampleLibraryModal\?\.kind === "false-positive-list"[\s\S]*renderFalsePositiveListModal\(\)/);
  assert.doesNotMatch(appJs, /modalState\?\.kind === "false-positive-list"/);
  assert.match(appJs, /if \(action === "open-false-positive-list-modal"\)/);
});

test("false positive homepage summary runtime updates summary text button visibility and visible modal refresh", async () => {
  const appJs = await fs.readFile(path.join(process.cwd(), "web/app.js"), "utf8");
  const summarySource = extractSourceBetween(
    appJs,
    "function buildFalsePositiveSummaryText(",
    "function renderFalsePositiveLog("
  );
  const renderSource = extractSourceBetween(
    appJs,
    "function renderFalsePositiveLog(",
    "function successTierLabel("
  );

  const buildFalsePositiveSummaryText = new Function(
    `${summarySource}; return buildFalsePositiveSummaryText;`
  )();

  assert.equal(
    buildFalsePositiveSummaryText({ pendingItems: [], historyItems: [] }),
    "当前没有误报样本"
  );
  assert.equal(
    buildFalsePositiveSummaryText({ pendingItems: [{ id: "fp-1" }, { id: "fp-2" }], historyItems: [] }),
    "当前有 2 条待确认误报，暂时还没有已沉淀历史案例。"
  );
  assert.equal(
    buildFalsePositiveSummaryText({ pendingItems: [{ id: "fp-1" }], historyItems: [{ id: "fp-2" }, { id: "fp-3" }] }),
    "当前有 1 条待确认误报，已沉淀 2 条历史案例。"
  );

  const appState = {
    falsePositiveLog: [],
    adminDataLoading: {
      phase: "initial",
      error: ""
    },
    sampleLibraryModal: {
      kind: "false-positive-list"
    }
  };
  const nodes = {
    "false-positive-preview-open-button": { hidden: true },
    "false-positive-summary": {
      textContent: "",
      classList: {
        states: new Map(),
        toggle(name, value) {
          this.states.set(name, Boolean(value));
        }
      }
    },
    "false-positive-log-list": { hidden: true, innerHTML: "" },
    "sample-library-modal": { hidden: false }
  };
  const modalRenderCalls = [];
  const getSortedFalsePositiveGroups = (items = []) => ({
    pendingItems: items.filter((item) => item.status !== "platform_passed_confirmed"),
    historyItems: items.filter((item) => item.status === "platform_passed_confirmed")
  });
  const byId = (id) => nodes[id] || null;
  const renderFalsePositiveListModal = () => {
    modalRenderCalls.push("rendered");
  };

  const renderFalsePositiveLog = new Function(
    "appState",
    "isAdminDataInitialLoading",
    "getSortedFalsePositiveGroups",
    "byId",
    "buildFalsePositiveSummaryText",
    "buildAdminDataLoadingBlockMarkup",
    "renderFalsePositiveListModal",
    `${renderSource}; return renderFalsePositiveLog;`
  )(
    appState,
    () => appState.adminDataLoading?.phase === "initial",
    getSortedFalsePositiveGroups,
    byId,
    buildFalsePositiveSummaryText,
    (message = "加载中...") => `<div class="result-card muted">${message}</div>`,
    renderFalsePositiveListModal
  );

  renderFalsePositiveLog([]);
  assert.equal(nodes["false-positive-summary"].textContent, "加载中...");
  assert.equal(nodes["false-positive-summary"].classList.states.get("muted"), true);
  assert.equal(nodes["false-positive-preview-open-button"].hidden, true);
  assert.equal(nodes["false-positive-log-list"].hidden, false);
  assert.match(nodes["false-positive-log-list"].innerHTML, /加载中/);
  assert.equal(modalRenderCalls.length, 1);

  appState.adminDataLoading.phase = "idle";

  renderFalsePositiveLog([
    { id: "fp-1", status: "platform_passed_pending" },
    { id: "fp-2", status: "platform_passed_confirmed" }
  ]);
  assert.equal(nodes["false-positive-summary"].textContent, "当前有 1 条待确认误报，已沉淀 1 条历史案例。");
  assert.equal(nodes["false-positive-summary"].classList.states.get("muted"), false);
  assert.equal(nodes["false-positive-preview-open-button"].hidden, false);
  assert.equal(nodes["false-positive-log-list"].hidden, true);
  assert.equal(nodes["false-positive-log-list"].innerHTML, "");
  assert.equal(modalRenderCalls.length, 2);
});

test("recording a false positive sample refreshes the sample library reflow area and keeps false positive list visible", async () => {
  const appJs = await fs.readFile(path.join(process.cwd(), "web/app.js"), "utf8");

  assert.match(appJs, /data-action="send-feedback-to-false-positive"[\s\S]*data-note-id="\$\{escapeHtml\(item\.noteId\)\}"[\s\S]*data-created-at="\$\{escapeHtml\(item\.createdAt\)\}"/);
  assert.match(appJs, /if \(action === "send-feedback-to-false-positive"\) \{[\s\S]*openFeedbackFalsePositiveModal\(\{/);
  assert.match(appJs, /function\s+saveFeedbackFalsePositiveModal\s*\([\s\S]*apiJson\("\/api\/false-positive-log"/);
  assert.match(
    appJs,
    /function\s+saveFeedbackFalsePositiveModal\s*\([\s\S]*await apiJson\("\/api\/admin\/feedback", \{[\s\S]*method: "DELETE"[\s\S]*noteId: modalState\.noteId[\s\S]*createdAt: modalState\.createdAt[\s\S]*\}\);/
  );
  assert.match(appJs, /function\s+saveFeedbackFalsePositiveModal\s*\([\s\S]*await refreshAll\(\);/);
  assert.match(appJs, /renderFalsePositiveLog\(response\.items \|\| \[\]\)/);
  assert.match(appJs, /ensureSupportWorkspaceOpen\(\)/);
  assert.match(appJs, /activateTab\("data-maintenance", "sample-library-pane"\)/);
  assert.match(appJs, /false-positive-summary"\)\?\.scrollIntoView\(\{ behavior: "smooth", block: "start" \}\)/);
});

test("feedback rule-review action now opens a confirmation modal before jumping into rules maintenance", async () => {
  const appJs = await fs.readFile(path.join(process.cwd(), "web/app.js"), "utf8");

  assert.match(appJs, /if \(action === "send-feedback-to-review-queue"\) \{[\s\S]*openFeedbackRuleQueueModal\(\{/);
  assert.match(appJs, /function\s+saveFeedbackRuleQueueModal\s*\([\s\S]*openLexiconWorkspaceModal\("custom"/);
  assert.match(appJs, /function\s+saveFeedbackRuleQueueModal\s*\([\s\S]*source:\s*payload\.source \|\| ""/);
  assert.match(appJs, /function\s+saveFeedbackRuleQueueModal\s*\([\s\S]*category:\s*payload\.category \|\| "待人工判断"/);
  assert.match(appJs, /function\s+saveFeedbackRuleQueueModal\s*\([\s\S]*riskLevel:\s*"manual_review"/);
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
    if (body !== null) {
      request.emit("data", Buffer.from(JSON.stringify(body)));
    }
    request.emit("end");
  });

  try {
    await handleRequest(request, response);
  } catch (error) {
    response.writeHead(Number(error?.statusCode) || 500, { "Content-Type": "application/json; charset=utf-8" });
    response.end(
      JSON.stringify(
        {
          ok: false,
          error: error instanceof Error ? error.message : "Unknown server error"
        },
        null,
        2
      )
    );
  }

  const parsedBody = response.body ? JSON.parse(response.body) : {};
  return {
    status: response.status,
    ...parsedBody
  };
}
