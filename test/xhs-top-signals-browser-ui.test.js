import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

test("top signals browser block sits below the content workbench as a standalone section", async () => {
  const [indexHtml, styles] = await Promise.all([
    fs.readFile(path.join(process.cwd(), "web/index.html"), "utf8"),
    fs.readFile(path.join(process.cwd(), "web/styles.css"), "utf8")
  ]);
  const mainWorkbenchIndex = indexHtml.indexOf('class="workspace dashboard-grid workspace-main"');
  const sidebarCloseIndex = indexHtml.indexOf("</aside>", mainWorkbenchIndex);
  const mainWorkbenchCloseIndex = indexHtml.indexOf("</section>", sidebarCloseIndex);
  const topSignalsIndex = indexHtml.indexOf('id="xhs-top-signals-panel"');
  const supportWorkspaceIndex = indexHtml.indexOf('id="support-workspace-panel"');

  assert.match(indexHtml, /id="xhs-top-signals-panel"/);
  assert.match(indexHtml, /id="xhs-top-signals-refresh"/);
  assert.match(indexHtml, /<select id="xhs-top-signals-track" name="xhsTopSignalsTrack">/);
  assert.match(indexHtml, /<option value="">自动匹配 \/ 综合全部<\/option>/);
  assert.match(indexHtml, /<option value="星座情感">星座情感<\/option>/);
  assert.match(indexHtml, /<option value="科学探索">科学探索<\/option>/);
  assert.match(indexHtml, /<option value="个人护理">个人护理<\/option>/);
  assert.match(indexHtml, /<option value="综合杂项">综合杂项<\/option>/);
  assert.match(indexHtml, /placeholder="例如 边界感，关系沟通"/);
  assert.match(indexHtml, /多个标签用中文逗号、英文逗号或顿号分隔/);
  assert.match(indexHtml, /小红书号（可选）/);
  assert.match(indexHtml, /填了会辅助匹配账号画像/);
  assert.match(indexHtml, /<button[^>]*data-xhs-top-signals-filter="daily"[^>]*>/);
  assert.match(indexHtml, /<button[^>]*data-xhs-top-signals-filter="weekly"[^>]*>/);
  assert.match(indexHtml, /<button[^>]*data-xhs-top-signals-filter="low"[^>]*>/);
  assert.match(indexHtml, /data-xhs-top-signals-filter="daily"[\s\S]*?aria-selected="true"/);
  assert.match(indexHtml, /data-xhs-top-signals-filter="weekly"[\s\S]*?aria-selected="false"/);
  assert.match(indexHtml, /data-xhs-top-signals-filter="low"[\s\S]*?aria-selected="false"/);
  assert.match(indexHtml, /data-xhs-top-signals-filter="daily"[\s\S]*?role="tab"/);
  assert.match(indexHtml, /data-xhs-top-signals-filter="weekly"[\s\S]*?role="tab"/);
  assert.match(indexHtml, /data-xhs-top-signals-filter="low"[\s\S]*?role="tab"/);
  assert.match(indexHtml, /id="xhs-top-signals-list"/);
  assert.match(indexHtml, /id="xhs-top-signals-detail"/);
  assert.match(indexHtml, /同类爆文专区/);
  assert.notEqual(mainWorkbenchIndex, -1);
  assert.notEqual(sidebarCloseIndex, -1);
  assert.notEqual(mainWorkbenchCloseIndex, -1);
  assert.notEqual(topSignalsIndex, -1);
  assert.notEqual(supportWorkspaceIndex, -1);
  assert.ok(sidebarCloseIndex < topSignalsIndex, "expected dashboard sidebar to close before top signals block starts");
  assert.ok(topSignalsIndex > mainWorkbenchCloseIndex, "expected top signals block after the main workbench section closes");
  assert.ok(topSignalsIndex < supportWorkspaceIndex, "expected top signals block before lower support content");
  assert.match(styles, /\.xhs-top-signals-panel\b/);
  assert.match(styles, /\.xhs-top-signals-toolbar\b/);
  assert.match(styles, /\.xhs-top-signals-list\b/);
  assert.match(styles, /\.xhs-top-signals-detail\b/);
  assert.match(styles, /@media \(max-width:\s*980px\)[\s\S]*?\.xhs-top-signals-toolbar\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\)/);
  assert.match(styles, /@media \(max-width:\s*980px\)[\s\S]*?\.xhs-top-signals-browser-layout\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\)/);
});

test("top signals browser exposes isolated standalone rendering helpers", async () => {
  const modulePath = pathToFileURL(path.join(process.cwd(), "web/xhs-top-signals-view.js")).href;
  const viewModule = await import(modulePath);

  assert.equal(typeof viewModule.buildXhsTopSignalsCardsMarkup, "function");
  assert.equal(typeof viewModule.buildXhsTopSignalsDetailMarkup, "function");
  assert.equal(typeof viewModule.renderXhsTopSignalsBrowser, "function");

  const cardsMarkup = viewModule.buildXhsTopSignalsCardsMarkup([
    {
      id: "daily-1",
      title: "今日起量样本",
      author: "作者A",
      track: "情感",
      sourceType: "daily_top",
      body: "这是一段正文预览，用来确认卡片不是只有标题。",
      publish: { metrics: { likes: 120000, favorites: 10000, comments: 577, shares: 1623 } },
      analysis: { whySelected: "互动起量快" }
    }
  ]);
  const detailMarkup = viewModule.buildXhsTopSignalsDetailMarkup({
    id: "daily-1",
    title: "今日起量样本",
    body: "正文示例",
    workUrl: "https://example.com/note/1",
    publish: {
      publishedAt: "2026-05-29 21:19:29",
      metrics: { likes: 120000, favorites: 10000, comments: 577, shares: 1623 }
    },
    analysis: { whySelected: "互动起量快", reuseHint: "可借切口" }
  });

  assert.match(cardsMarkup, /data-action="select-xhs-top-signal"/);
  assert.match(cardsMarkup, /加入外部参考样本/);
  assert.match(cardsMarkup, /生成灵感草稿/);
  assert.match(cardsMarkup, /今日起量/);
  assert.match(cardsMarkup, /点赞 12万/);
  assert.match(cardsMarkup, /收藏 1万/);
  assert.match(cardsMarkup, /这是一段正文预览/);
  assert.match(detailMarkup, /互动起量快/);
  assert.match(detailMarkup, /可借切口/);
  assert.match(detailMarkup, /发布时间：2026-05-29 21:19:29/);
  assert.match(detailMarkup, /评论 577/);
  assert.match(detailMarkup, /查看原文/);
});

test("top signals browser shows account-based matching context when available", async () => {
  const modulePath = pathToFileURL(path.join(process.cwd(), "web/xhs-top-signals-view.js")).href;
  const viewModule = await import(modulePath);
  const nodes = {
    "xhs-top-signals-status": { innerHTML: "" },
    "xhs-top-signals-list": { innerHTML: "" },
    "xhs-top-signals-detail": { innerHTML: "" }
  };

  viewModule.renderXhsTopSignalsBrowser(
    {
      message: "",
      activeFilter: "daily",
      accountContext: {
        redId: "26112666886",
        nickname: "测试号",
        derivedTrack: "星座情感",
        derivedTags: ["关系沟通"]
      },
      items: {
        dailyTop: [{ id: "daily-1", title: "今日起量样本", author: "作者A", track: "星座情感", analysis: { whySelected: "互动起量快" } }],
        weeklyTop: [],
        lowTop: []
      }
    },
    {
      byId(id) {
        return nodes[id];
      },
      escapeHtml(value) {
        return String(value ?? "");
      }
    }
  );

  assert.match(nodes["xhs-top-signals-status"].innerHTML, /自动匹配赛道：星座情感/);
  assert.match(nodes["xhs-top-signals-status"].innerHTML, /测试号/);
  assert.match(nodes["xhs-top-signals-status"].innerHTML, /26112666886/);
  assert.match(nodes["xhs-top-signals-status"].innerHTML, /关系沟通/);
});

test("top signals browser falls back to the first available item when stale selection no longer matches", async () => {
  const modulePath = pathToFileURL(path.join(process.cwd(), "web/xhs-top-signals-view.js")).href;
  const viewModule = await import(modulePath);
  const nodes = {
    "xhs-top-signals-status": { innerHTML: "" },
    "xhs-top-signals-list": { innerHTML: "" },
    "xhs-top-signals-detail": { innerHTML: "" }
  };

  viewModule.renderXhsTopSignalsBrowser(
    {
      message: "",
      selectedSignalId: "missing-id",
      items: [
        {
          id: "daily-1",
          title: "今日起量样本",
          author: "作者A",
          track: "情感",
          analysis: { whySelected: "互动起量快", reuseHint: "可借切口" }
        },
        {
          id: "daily-2",
          title: "第二条样本",
          author: "作者B",
          track: "情感",
          analysis: { whySelected: "收藏增长快" }
        }
      ]
    },
    {
      byId(id) {
        return nodes[id];
      },
      escapeHtml(value) {
        return String(value ?? "");
      }
    }
  );

  assert.match(nodes["xhs-top-signals-list"].innerHTML, /xhs-top-signals-card is-selected/);
  assert.match(nodes["xhs-top-signals-list"].innerHTML, /今日起量样本/);
  assert.match(nodes["xhs-top-signals-detail"].innerHTML, /今日起量样本/);
  assert.doesNotMatch(nodes["xhs-top-signals-detail"].innerHTML, /选择一条同类爆文后/);
});

test("top signals browser app wiring hydrates cache, refreshes explicitly, and syncs filters plus selection", async () => {
  const appJs = await fs.readFile(path.join(process.cwd(), "web/app.js"), "utf8");

  assert.match(appJs, /renderXhsTopSignalsBrowser\s*\}\s*from\s*"\.\/xhs-top-signals-view\.js"/);
  assert.match(appJs, /const xhsTopSignalsApi = "\/api\/xhs\/top-signals";/);
  assert.match(appJs, /xhsTopSignals:\s*\{[\s\S]*loading:\s*false,[\s\S]*activeFilter:\s*"daily",[\s\S]*selectedSignalId:\s*""/);
  assert.match(appJs, /function buildXhsTopSignalsRequestPayload\(\)/);
  assert.match(appJs, /keyword:\s*joinCSV\(splitCSV\(byId\("xhs-top-signals-keyword"\)\?\.value \|\| ""\)\)/);
  assert.match(appJs, /tags:\s*splitCSV\(byId\("xhs-top-signals-tags"\)\?\.value \|\| ""\)/);
  assert.doesNotMatch(appJs, /xhs-top-signals-keyword"\)\?\.value \|\| appState\.xhsTopSignals\?\.keyword/);
  assert.doesNotMatch(appJs, /xhs-top-signals-tags"\)\?\.value \|\| appState\.xhsTopSignals\?\.tags/);
  assert.match(appJs, /function syncXhsTopSignalsPanel\(\)/);
  assert.match(appJs, /function extractXhsAccountDiagnosisTopSignalDefaults\(result = \{\}\)/);
  assert.match(appJs, /function applyXhsTopSignalsDefaultsFromAccountDiagnosis\(\{\s*force\s*=\s*false\s*\} = \{\}\)/);
  assert.match(appJs, /function bindXhsTopSignalsInputEditTracking\(\)/);
  assert.match(appJs, /field\.dataset\.xhsTopSignalsUserEdited = "true";/);
  assert.match(appJs, /field\.addEventListener\("change",\s*\(\) => \{[\s\S]*?field\.dataset\.xhsTopSignalsUserEdited = "true";[\s\S]*?\}\);/);
  assert.match(appJs, /maybeApply\(trackField, "track", defaults\.track\);/);
  assert.doesNotMatch(appJs, /maybeApply\(redIdField, "redId", defaults\.redId\);/);
  assert.match(appJs, /redId:\s*String\(byId\("xhs-top-signals-red-id"\)\?\.value \|\| ""\)\.trim\(\)/);
  assert.doesNotMatch(appJs, /redId:\s*String\(byId\("xhs-top-signals-red-id"\)\?\.value \|\| appState\.xhsTopSignals\?\.redId/);
  assert.match(appJs, /track:\s*String\(byId\("xhs-top-signals-track"\)\?\.value \|\| ""\)\.trim\(\)/);
  assert.match(appJs, /track:\s*String\(requestPayload\?\.track \|\| byId\("xhs-top-signals-track"\)\?\.value \|\| ""\)\.trim\(\)/);
  assert.doesNotMatch(appJs, /track:\s*String\(response\?\.filters\?\.track \|\| ""\)\.trim\(\)/);
  assert.match(appJs, /if \(redIdField && redIdField\.dataset\.xhsTopSignalsUserEdited === "true"\)/);
  assert.match(appJs, /if \(trackField && trackField\.dataset\.xhsTopSignalsUserEdited === "true"\)/);
  assert.match(appJs, /if \(keywordField && keywordField\.dataset\.xhsTopSignalsUserEdited === "true"\)/);
  assert.match(appJs, /if \(tagsField && tagsField\.dataset\.xhsTopSignalsUserEdited === "true"\)/);
  assert.match(appJs, /applyXhsTopSignalsDefaultsFromAccountDiagnosis\(\);[\s\S]*?syncXhsTopSignalsInputs\(\);/);
  assert.match(appJs, /applyXhsTopSignalsDefaultsFromAccountDiagnosis\(\{\s*force:\s*true\s*\}\);[\s\S]*?syncXhsTopSignalsInputs\(\);/);
  assert.match(appJs, /async function refreshXhsTopSignalsState\(\{\s*useCache\s*=\s*false\s*\}\s*=\s*\{\}\)/);
  assert.match(appJs, /useCache\s*\?\s*await apiJson\(xhsTopSignalsApi\)\s*:\s*await apiJson\(xhsTopSignalsApi,\s*\{/);
  assert.match(appJs, /message:\s*error\?\.message\s*\|\|\s*"同类爆文刷新失败"/);
  assert.match(appJs, /byId\("xhs-top-signals-refresh"\)\?\.addEventListener\("click",\s*async\s*\(\)\s*=>\s*\{[\s\S]*await refreshXhsTopSignalsState\(\);[\s\S]*\}\);/);
  assert.match(appJs, /refreshXhsTopSignalsState\(\{\s*useCache:\s*true\s*\}\)\.catch\(\(\)\s*=>\s*\{\}\);/);
  assert.match(appJs, /activeFilter:\s*String\(topSignalsFilter\.dataset\.xhsTopSignalsFilter\s*\|\|\s*"daily"\)/);
  assert.match(appJs, /selectedSignalId:\s*String\(button\.dataset\.signalId\s*\|\|\s*""\)/);
  assert.match(appJs, /function findXhsTopSignalById\(signalId = ""\)/);
  assert.match(appJs, /function addXhsTopSignalToExternalSamples\(signalId = ""\)/);
  assert.match(appJs, /function addXhsTopSignalToDraftIdeas\(signalId = ""\)/);
  assert.match(appJs, /if \(action === "save-xhs-top-signal-external-sample"\)\s*\{[\s\S]*await addXhsTopSignalToExternalSamples\(button\.dataset\.signalId \|\| ""\);[\s\S]*return;[\s\S]*\}/);
  assert.match(appJs, /if \(action === "save-xhs-top-signal-draft-idea"\)\s*\{[\s\S]*await addXhsTopSignalToDraftIdeas\(button\.dataset\.signalId \|\| ""\);[\s\S]*return;[\s\S]*\}/);
  assert.match(appJs, /const signal = findXhsTopSignalById\(signalId\);[\s\S]*await apiJson\(sampleLibraryExternalSamplesApi,\s*\{[\s\S]*method:\s*"POST"/);
  assert.match(appJs, /appState\.externalReferenceSamples = Array\.isArray\(response\?\.items\) \? response\.items : appState\.externalReferenceSamples;[\s\S]*syncSampleLibraryAccountPlannerPanel\(\);[\s\S]*renderSampleLibraryExternalSamplesModal\(\);/);
  assert.match(appJs, /const explicitSignalId = String\(signalId \|\| ""\)\.trim\(\);/);
  assert.match(appJs, /const selectedSignalId = String\(appState\.xhsTopSignals\?\.selectedSignalId \|\| ""\)\.trim\(\);/);
  assert.match(appJs, /if \(explicitMatch\)\s*\{[\s\S]*return explicitMatch;[\s\S]*\}/);
  assert.match(appJs, /return selectedMatch \|\| visibleItems\[0\] \|\| null;/);
  assert.match(appJs, /const signal = findXhsTopSignalById\(signalId\);[\s\S]*await saveDraftIdea\(/);
  assert.match(appJs, /async function saveDraftIdea\(payload = \{\}\)\s*\{[\s\S]*appState\.draftIdeas = \{[\s\S]*\.\.\.appState\.draftIdeas,[\s\S]*loading:\s*false,[\s\S]*message:\s*"",[\s\S]*items:\s*Array\.isArray\(response\?\.items\) \? response\.items : \[\][\s\S]*\};/);
  assert.match(appJs, /async function markDraftIdeaUsed\(id = ""\)\s*\{[\s\S]*appState\.draftIdeas = \{[\s\S]*\.\.\.appState\.draftIdeas,[\s\S]*loading:\s*false,[\s\S]*message:\s*"",[\s\S]*items:\s*Array\.isArray\(response\?\.items\) \? response\.items : \[\][\s\S]*\};/);
  assert.match(appJs, /async function removeDraftIdea\(id = ""\)\s*\{[\s\S]*appState\.draftIdeas = \{[\s\S]*\.\.\.appState\.draftIdeas,[\s\S]*loading:\s*false,[\s\S]*message:\s*"",[\s\S]*items:\s*Array\.isArray\(response\?\.items\) \? response\.items : \[\][\s\S]*\};/);
  assert.match(appJs, /await saveDraftIdea\([\s\S]*sourceLabel:\s*"同类爆文信号"[\s\S]*\);[\s\S]*setSampleLibraryModalMessage\("已生成灵感草稿。"\);/);
  const topSignalsDraftHelperMatch = appJs.match(
    /async function addXhsTopSignalToDraftIdeas\(signalId = ""\)\s*\{[\s\S]*?\n\}/
  );
  assert.ok(topSignalsDraftHelperMatch, "expected top-signals draft helper to exist");
  assert.doesNotMatch(topSignalsDraftHelperMatch[0], /renderDraftIdeasList\(\);/);
});

test("top signals browser re-render keeps in-progress filter input while syncing tabs and selection", async () => {
  const modulePath = pathToFileURL(path.join(process.cwd(), "web/xhs-top-signals-view.js")).href;
  const viewModule = await import(modulePath);
  const filterButtons = [
    createFilterButton("daily"),
    createFilterButton("weekly"),
    createFilterButton("low")
  ];
  const nodes = {
    "xhs-top-signals-red-id": { value: "draft-red-id" },
    "xhs-top-signals-track": { value: "draft-track" },
    "xhs-top-signals-keyword": { value: "draft-keyword" },
    "xhs-top-signals-tags": { value: "draft-tags" },
    "xhs-top-signals-refresh": { disabled: false, dataset: {}, textContent: "手动刷新" },
    "xhs-top-signals-status": { innerHTML: "" },
    "xhs-top-signals-list": { innerHTML: "" },
    "xhs-top-signals-detail": { innerHTML: "" }
  };

  viewModule.renderXhsTopSignalsBrowser(
    {
      message: "已载入 1 条同类爆文信号",
      activeFilter: "weekly",
      selectedSignalId: "weekly-1",
      items: {
        dailyTop: [{ id: "daily-1", title: "日榜样本", author: "作者A", track: "情感", analysis: { whySelected: "日榜说明" } }],
        weeklyTop: [{ id: "weekly-1", title: "周榜样本", author: "作者B", track: "情感", analysis: { whySelected: "周榜说明" } }],
        lowTop: []
      }
    },
    {
      byId(id) {
        return nodes[id];
      },
      escapeHtml(value) {
        return String(value ?? "");
      },
      queryTopSignalsFilterButtons() {
        return filterButtons;
      }
    }
  );

  assert.equal(nodes["xhs-top-signals-red-id"].value, "draft-red-id");
  assert.equal(nodes["xhs-top-signals-track"].value, "draft-track");
  assert.equal(nodes["xhs-top-signals-keyword"].value, "draft-keyword");
  assert.equal(nodes["xhs-top-signals-tags"].value, "draft-tags");
  assert.match(nodes["xhs-top-signals-list"].innerHTML, /周榜样本/);
  assert.doesNotMatch(nodes["xhs-top-signals-list"].innerHTML, /日榜样本/);
  assert.match(nodes["xhs-top-signals-detail"].innerHTML, /周榜样本/);
  assert.deepEqual(
    filterButtons.map((button) => [button.dataset.xhsTopSignalsFilter, button.attributes["aria-selected"], button.tabIndex]),
    [
      ["daily", "false", -1],
      ["weekly", "true", 0],
      ["low", "false", -1]
    ]
  );
});

function pathToFileURL(filePath) {
  return new URL(`file://${filePath}`);
}

function createFilterButton(filter) {
  return {
    dataset: { xhsTopSignalsFilter: filter },
    attributes: {},
    tabIndex: 0,
    setAttribute(name, value) {
      this.attributes[name] = value;
    }
  };
}
