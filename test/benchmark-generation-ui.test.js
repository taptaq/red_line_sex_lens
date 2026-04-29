import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

async function readFrontendFiles() {
  const [indexHtml, appJs, styles] = await Promise.all([
    fs.readFile(path.join(process.cwd(), "web/index.html"), "utf8"),
    fs.readFile(path.join(process.cwd(), "web/app.js"), "utf8"),
    fs.readFile(path.join(process.cwd(), "web/styles.css"), "utf8")
  ]);

  return { indexHtml, appJs, styles };
}

function sliceBetween(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = endMarker ? source.indexOf(endMarker, start) : source.length;

  if (start === -1 || end === -1 || end <= start) {
    return "";
  }

  return source.slice(start, end);
}

test("frontend exposes review benchmark maintenance tab and form skeleton", async () => {
  const { indexHtml, appJs } = await readFrontendFiles();
  const panelStart = indexHtml.indexOf('<section class="tab-panel" id="review-benchmark-pane">');
  const panelEnd = indexHtml.indexOf('<section class="tab-panel" id="note-lifecycle-pane">', panelStart);
  const benchmarkPanel = indexHtml.slice(panelStart, panelEnd);

  assert.match(indexHtml, /data-tab-target="review-benchmark-pane"[^>]*>基准评测</);
  assert.match(indexHtml, /id="review-benchmark-pane"/);
  assert.match(benchmarkPanel, /id="review-benchmark-form"/);
  assert.match(benchmarkPanel, /name="title"/);
  assert.match(benchmarkPanel, /name="body"/);
  assert.match(benchmarkPanel, /name="tags"/);
  assert.match(benchmarkPanel, /name="expectedType"/);
  assert.doesNotMatch(benchmarkPanel, /name="coverText"/);
  assert.match(indexHtml, />保存基准样本</);
  assert.match(indexHtml, /id="review-benchmark-run-button"/);
  assert.match(indexHtml, />运行基准评测</);
  assert.match(indexHtml, /id="review-benchmark-result"/);
  assert.match(indexHtml, /id="review-benchmark-list"/);
  assert.match(appJs, /const reviewBenchmarkApi = "\/api\/review-benchmark"/);
  assert.match(appJs, /function renderReviewBenchmarkSamples/);
  assert.match(appJs, /function expectedTypeLabel/);
  assert.match(appJs, /data-action="delete-review-benchmark"/);
});

test("review benchmark submit handler prevents native reload and posts to benchmark API", async () => {
  const { appJs } = await readFrontendFiles();
  const submitHandler = sliceBetween(
    appJs,
    'byId("review-benchmark-form").addEventListener("submit"',
    'byId("review-benchmark-run-button").addEventListener("click"'
  );

  assert.match(submitHandler, /byId\("review-benchmark-form"\)\.addEventListener\("submit", async \(event\) => \{/);
  assert.match(submitHandler, /event\.preventDefault\(\)/);
  assert.match(submitHandler, /new FormData\(formElement\)/);
  assert.match(submitHandler, /await apiJson\(reviewBenchmarkApi, \{/);
  assert.match(submitHandler, /method: "POST"/);
  assert.match(submitHandler, /renderReviewBenchmarkSamples\(response\.items \|\| \[\]\)/);
  assert.match(submitHandler, /基准样本已保存/);
  assert.match(submitHandler, /formElement\.reset\(\)/);
});

test("review benchmark run button uses dedicated run endpoint and renders summary details", async () => {
  const { appJs } = await readFrontendFiles();
  const runHandler = sliceBetween(
    appJs,
    'byId("review-benchmark-run-button").addEventListener("click"',
    'byId("style-profile-draft-button").addEventListener("click"'
  );

  assert.match(runHandler, /byId\("review-benchmark-run-button"\)\.addEventListener\("click", async \(\) => \{/);
  assert.match(runHandler, /reviewBenchmarkApi}\/run/);
  assert.match(runHandler, /renderReviewBenchmarkResult\(/);
  assert.match(appJs, /summary\.total/);
  assert.match(appJs, /matchedExpectation/);
  assert.match(appJs, /未匹配样本/);
});

test("review benchmark refresh chain is independent from admin aggregate data", async () => {
  const { appJs } = await readFrontendFiles();

  const refreshAllStart = appJs.indexOf("async function refreshAll()");
  const refreshAllEnd = appJs.indexOf("async function fileToDataUrl", refreshAllStart);
  const refreshAllSource = appJs.slice(refreshAllStart, refreshAllEnd);

  assert.match(appJs, /async function refreshReviewBenchmark\(\)/);
  assert.match(appJs, /await apiJson\(reviewBenchmarkApi\)/);
  assert.match(appJs, /renderReviewBenchmarkSamples\(payload\.items \|\| \[\]\)/);
  assert.doesNotMatch(refreshAllSource, /reviewBenchmark/);
});

test("review benchmark delete action has a live branch and refreshes list with feedback", async () => {
  const { appJs } = await readFrontendFiles();
  const deleteBranch = sliceBetween(
    appJs,
    'if (action === "delete-review-benchmark") {',
    'if (action === "confirm-style-profile") {'
  );

  assert.match(deleteBranch, /if \(action === "delete-review-benchmark"\) \{/);
  assert.match(deleteBranch, /method: "DELETE"/);
  assert.match(deleteBranch, /id: button\.dataset\.id/);
  assert.match(deleteBranch, /renderReviewBenchmarkSamples\(response\.items \|\| \[\]\)/);
  assert.match(deleteBranch, /基准样本已删除/);
  assert.match(deleteBranch, /return;/);
});

test("review benchmark result renderer shows totals, matched counts, and unmatched sample list", async () => {
  const { appJs, styles } = await readFrontendFiles();
  const start = appJs.indexOf("function renderReviewBenchmarkResult(");
  const end = appJs.indexOf("function renderNoteLifecycle(", start);
  const renderSource = appJs.slice(start, end);

  assert.equal(start > -1, true);
  assert.equal(end > start, true);
  assert.match(renderSource, /总样本/);
  assert.match(renderSource, /匹配/);
  assert.match(renderSource, /未匹配/);
  assert.match(renderSource, /matchedExpectation/);
  assert.match(renderSource, /actualVerdict/);
  assert.match(renderSource, /review-benchmark-result-grid/);
  assert.match(styles, /\.review-benchmark-result-grid/);
  assert.match(styles, /\.review-benchmark-mismatch-list/);
});
