import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

test("runtime no longer keeps model performance logging infrastructure", async () => {
  const [configSource, glmSource] = await Promise.all([
    fs.readFile(path.join(process.cwd(), "src/config.js"), "utf8"),
    fs.readFile(path.join(process.cwd(), "src/glm.js"), "utf8")
  ]);

  assert.doesNotMatch(configSource, /modelPerformance:/);
  assert.doesNotMatch(glmSource, /from "\.\/model-performance\.js"/);
  assert.doesNotMatch(glmSource, /recordModelCallSafe/);
  assert.doesNotMatch(glmSource, /recordModelCall\(/);
});

test("frontend no longer exposes model performance dashboard or dynamic recommendation panel", async () => {
  const [indexHtml, appJs, styles] = await Promise.all([
    fs.readFile(path.join(process.cwd(), "web/index.html"), "utf8"),
    fs.readFile(path.join(process.cwd(), "web/app.js"), "utf8"),
    fs.readFile(path.join(process.cwd(), "web/styles.css"), "utf8")
  ]);

  assert.doesNotMatch(indexHtml, /id="model-performance-pane"/);
  assert.doesNotMatch(appJs, /\/api\/model-performance/);
  assert.doesNotMatch(appJs, /renderModelPerformance/);
  assert.doesNotMatch(appJs, /renderMainModelRecommendations/);
  assert.doesNotMatch(appJs, /当前建议：/);
  assert.doesNotMatch(indexHtml, /id="semantic-model-recommendation"/);
  assert.doesNotMatch(indexHtml, /id="rewrite-model-recommendation"/);
  assert.doesNotMatch(indexHtml, /id="cross-review-model-recommendation"/);
  assert.doesNotMatch(indexHtml, /模型建议加载中/);
  assert.doesNotMatch(indexHtml, /默认自动 \/ 加载中\.\.\./);
  assert.doesNotMatch(indexHtml, /默认模型组 \/ 加载中\.\.\./);
  assert.doesNotMatch(styles, /\.model-performance-grid/);
  assert.doesNotMatch(styles, /\.model-performance-section-head/);
  assert.doesNotMatch(styles, /\.model-recommendation-hint/);
});
