import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

test("sample-library workspace includes xhs connector panel anchors", async () => {
  const html = await fs.readFile(new URL("../web/index.html", import.meta.url), "utf8");
  assert.match(html, /id="sample-library-xhs-connector-panel"/);
  assert.match(html, /id="sample-library-xhs-connector-result"/);
});

test("app wires xhs connector api constants", async () => {
  const appJs = await fs.readFile(new URL("../web/app.js", import.meta.url), "utf8");
  assert.match(appJs, /const sampleLibraryXhsConnectorDiscoverApi = "\/api\/xhs-connector\/discover"/);
  assert.match(appJs, /const sampleLibraryXhsConnectorImportApi = "\/api\/xhs-connector\/import"/);
  assert.match(appJs, /const sampleLibraryXhsConnectorSyncPreviewApi = "\/api\/xhs-connector\/sync-preview"/);
  assert.match(appJs, /const sampleLibraryXhsConnectorSyncApplyApi = "\/api\/xhs-connector\/sync-apply"/);
});

test("styles define xhs connector panel blocks", async () => {
  const styles = await fs.readFile(new URL("../web/styles.css", import.meta.url), "utf8");
  assert.match(styles, /\.sample-library-xhs-connector-panel/);
  assert.match(styles, /\.sample-library-xhs-connector-list/);
});
