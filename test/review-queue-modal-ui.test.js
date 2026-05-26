import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

test("manual review queue collapses into a modal entry instead of rendering the full list inline", async () => {
  const [indexHtml, appJs, styles] = await Promise.all([
    fs.readFile(path.join(process.cwd(), "web/index.html"), "utf8"),
    fs.readFile(path.join(process.cwd(), "web/app.js"), "utf8"),
    fs.readFile(path.join(process.cwd(), "web/styles.css"), "utf8")
  ]);

  const renderQueueMatch = appJs.match(/function\s+renderQueue\s*\(items\)\s*\{[\s\S]*?\n\}/);
  assert.ok(renderQueueMatch, "expected renderQueue implementation to exist");
  const renderQueueSource = renderQueueMatch[0];

  assert.match(indexHtml, /id="review-queue"/);
  assert.doesNotMatch(indexHtml, /<div id="review-queue" class="queue"><\/div>/);

  assert.match(renderQueueSource, /id="review-queue-open-button"/);
  assert.match(renderQueueSource, /打开复核队列/);
  assert.doesNotMatch(renderQueueSource, /人工复核工作台/);
  assert.doesNotMatch(renderQueueSource, /填入右侧表单/);
  assert.doesNotMatch(renderQueueSource, /加入白名单/);
  assert.doesNotMatch(renderQueueSource, /删除/);
  assert.match(appJs, /function\s+openReviewQueueModal\s*\(/);
  assert.match(appJs, /function\s+buildReviewQueueModalMarkup\s*\(/);
  assert.match(appJs, /kind:\s*"review-queue-list"/);
  assert.match(appJs, /if \(action === "open-review-queue-modal"\)/);
  assert.match(appJs, /if \(action === "open-review-queue"\)\s*\{[\s\S]*openReviewQueueModal\(\)/);

  assert.match(styles, /\.review-queue-entry-card/);
  assert.match(styles, /\.review-queue-entry-metrics/);
  assert.doesNotMatch(styles, /\.queue-panel\s*\{[\s\S]*min-height:\s*980px/);
});
