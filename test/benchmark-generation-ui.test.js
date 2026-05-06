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

test("frontend no longer renders benchmark maintenance UI", async () => {
  const { indexHtml, appJs, styles } = await readFrontendFiles();

  assert.match(indexHtml, /系统校准/);
  assert.doesNotMatch(indexHtml, /id="review-benchmark-pane"/);
  assert.doesNotMatch(indexHtml, /id="review-benchmark-form"/);
  assert.doesNotMatch(indexHtml, /id="review-benchmark-run-button"/);
  assert.doesNotMatch(indexHtml, /id="review-benchmark-result"/);
  assert.doesNotMatch(indexHtml, /id="review-benchmark-list"/);
  assert.doesNotMatch(indexHtml, /id="review-benchmark-collection-filter"/);
  assert.doesNotMatch(indexHtml, /id="review-benchmark-type-filter"/);
  assert.doesNotMatch(indexHtml, /id="review-benchmark-source-filter"/);
  assert.doesNotMatch(indexHtml, /id="review-benchmark-view-filter"/);
  assert.doesNotMatch(indexHtml, /id="review-benchmark-action-hint"/);
  assert.doesNotMatch(indexHtml, />保存基准样本</);
  assert.doesNotMatch(indexHtml, />运行阶段性检查</);

  assert.doesNotMatch(appJs, /const reviewBenchmarkApi = "\/api\/review-benchmark"/);
  assert.doesNotMatch(appJs, /function renderReviewBenchmarkSamples/);
  assert.doesNotMatch(appJs, /function expectedTypeLabel/);
  assert.doesNotMatch(appJs, /function filterReviewBenchmarkSamples/);
  assert.doesNotMatch(appJs, /function buildReviewBenchmarkMismatchSummary/);
  assert.doesNotMatch(appJs, /function getReviewBenchmarkSubmitRequirementMessage\(/);
  assert.doesNotMatch(appJs, /function getReviewBenchmarkRunRequirementMessage\(/);
  assert.doesNotMatch(appJs, /function syncReviewBenchmarkActions\(/);
  assert.doesNotMatch(appJs, /data-action="delete-review-benchmark"/);
  assert.doesNotMatch(appJs, /send-review-benchmark-to-sample-library/);
  assert.doesNotMatch(appJs, /send-review-benchmark-to-false-positive/);
  assert.doesNotMatch(appJs, /review-benchmark-pane/);

  assert.doesNotMatch(styles, /\.review-benchmark-toolbar/);
  assert.doesNotMatch(styles, /\.review-benchmark-toolbar-filters/);
  assert.doesNotMatch(styles, /\.review-benchmark-result-grid/);
  assert.doesNotMatch(styles, /\.review-benchmark-mismatch-list/);
});
