import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

function extractElementInnerHtml(html, marker) {
  const startIndex = html.indexOf(marker);
  assert.notEqual(startIndex, -1, `expected ${marker} to exist`);

  const tagStart = html.lastIndexOf("<", startIndex);
  assert.notEqual(tagStart, -1, `expected opening tag for ${marker}`);

  const openTagEnd = html.indexOf(">", startIndex);
  assert.notEqual(openTagEnd, -1, `expected end of opening tag for ${marker}`);

  const tagMatch = html.slice(tagStart, openTagEnd).match(/^<([a-z0-9-]+)/i);
  assert.ok(tagMatch, `expected tag name for ${marker}`);

  const tagName = tagMatch[1];
  let depth = 1;
  let cursor = openTagEnd + 1;
  let closeIndex = -1;

  while (cursor < html.length) {
    const nextOpen = html.indexOf(`<${tagName}`, cursor);
    const nextClose = html.indexOf(`</${tagName}>`, cursor);

    if (nextClose === -1) break;

    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth += 1;
      cursor = nextOpen + tagName.length + 1;
      continue;
    }

    depth -= 1;

    if (depth === 0) {
      closeIndex = nextClose;
      break;
    }

    cursor = nextClose + tagName.length + 3;
  }

  assert.notEqual(closeIndex, -1, `expected closing tag for ${marker}`);
  return html.slice(openTagEnd + 1, closeIndex);
}

test("homepage uses a clearer dashboard grid hierarchy", async () => {
  const [indexHtml, styles] = await Promise.all([
    fs.readFile(path.join(process.cwd(), "web/index.html"), "utf8"),
    fs.readFile(path.join(process.cwd(), "web/styles.css"), "utf8")
  ]);
  const workspaceSupportBlockMatch = styles.match(/\.workspace-support\s*\{[^}]*\}/);
  const dashboardMainCardBlockMatch = styles.match(/\.dashboard-main-card\s*\{[^}]*\}/);

  assert.match(indexHtml, /class="[^"]*\bdashboard-grid\b[^"]*\bworkspace-main\b/);
  assert.match(indexHtml, /class="[^"]*\bdashboard-secondary-grid\b/);
  assert.match(indexHtml, /class="[^"]*\bdashboard-main-card\b/);
  assert.match(indexHtml, /class="[^"]*\bdashboard-side-card\b/);
  assert.match(indexHtml, /class="[^"]*\bdashboard-planner-card\b/);
  assert.match(indexHtml, /class="[^"]*\bdashboard-assets-card\b/);

  const sampleLibraryPaneHtml = extractElementInnerHtml(indexHtml, 'id="sample-library-pane"');
  assert.doesNotMatch(sampleLibraryPaneHtml, /id="sample-library-account-planner-panel"/);
  assert.doesNotMatch(sampleLibraryPaneHtml, /id="sample-library-reflow-panel"/);
  assert.match(indexHtml, /id="sample-library-account-planner-panel"/);
  assert.match(indexHtml, /class="[^"]*\bsupport-review-card\b/);
  assert.match(indexHtml, /class="[^"]*\bsupport-feedback-card\b/);
  assert.match(indexHtml, /class="[^"]*\bsupport-samples-card\b/);
  assert.match(indexHtml, /id="sample-library-reflow-panel"/);

  assert.match(styles, /\.dashboard-grid\b/);
  assert.match(styles, /\.dashboard-secondary-grid\b/);
  assert.match(styles, /\.dashboard-main-card\b/);
  assert.match(styles, /\.dashboard-side-card\b/);
  assert.match(styles, /\.dashboard-assets-card\b/);
  assert.ok(dashboardMainCardBlockMatch, "expected dashboard-main-card block to exist");
  assert.doesNotMatch(dashboardMainCardBlockMatch[0], /min-height:\s*100%/);
  assert.match(styles, /\.support-review-card\s+\.section-heading h2,/);
  assert.match(styles, /\.support-feedback-card\s+\.sample-library-reflow-panel\s*\{/);
  assert.ok(workspaceSupportBlockMatch, "expected workspace-support block to exist");
  assert.match(workspaceSupportBlockMatch[0], /grid-template-columns:\s*1fr;/);
  assert.match(workspaceSupportBlockMatch[0], /align-items:\s*start;/);
  assert.doesNotMatch(workspaceSupportBlockMatch[0], /align-items:\s*stretch;/);
  assert.match(styles, /\.support-feedback-card\s+\.sample-library-reflow-panel\s*\{[\s\S]*padding:\s*0;/);
  assert.match(styles, /\.support-feedback-card\s+\.sample-library-reflow-panel\s*\{[\s\S]*border:\s*0;/);
  assert.match(styles, /\.support-feedback-card\s+\.sample-library-reflow-panel\s*\{[\s\S]*background:\s*transparent;/);
  assert.match(indexHtml, /id="sample-library-filter"/);
  assert.match(indexHtml, /id="sample-library-collection-filter"/);
  assert.match(indexHtml, /id="rewrite-model-selection"/);
  assert.doesNotMatch(styles, /\.dashboard-main-card\s*\{[^}]*min-height:\s*100%/);
  assert.match(styles, /@media \(max-width:\s*1240px\)[\s\S]*?\.dashboard-grid,[\s\S]*?\.dashboard-secondary-grid/);
});

test("frontend startup guards optional DOM bindings so missing controls do not crash the workbench", async () => {
  const appJs = await fs.readFile(path.join(process.cwd(), "web/app.js"), "utf8");

  assert.match(appJs, /byId\("rewrite-model-selection"\)\?\./);
  assert.match(appJs, /byId\("sample-library-filter"\)\?\./);
  assert.match(appJs, /byId\("sample-library-collection-filter"\)\?\./);
});
