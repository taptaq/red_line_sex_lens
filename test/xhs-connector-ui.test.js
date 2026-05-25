import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

test("sample-library workspace does not include xhs connector mount or panel", async () => {
  const html = await fs.readFile(new URL("../web/index.html", import.meta.url), "utf8");
  assert.doesNotMatch(html, /id="sample-library-xhs-connector-mount"/);
  assert.doesNotMatch(html, /id="sample-library-xhs-connector-panel"/);
  assert.doesNotMatch(html, /id="sample-library-xhs-connector-result"/);
});

test("app does not wire xhs connector UI state or actions", async () => {
  const appJs = await fs.readFile(new URL("../web/app.js", import.meta.url), "utf8");
  assert.doesNotMatch(appJs, /xhsConnector/);
  assert.doesNotMatch(appJs, /XhsConnector/);
  assert.doesNotMatch(appJs, /xhs-connector-view/);
  assert.doesNotMatch(appJs, /xhs-connector-form-helpers/);
  assert.doesNotMatch(appJs, /xhs-connector-discover/);
  assert.doesNotMatch(appJs, /xhs-connector-sync-preview/);
  assert.doesNotMatch(appJs, /runSampleLibraryXhsConnectorDiscovery/);
  assert.doesNotMatch(appJs, /runSampleLibraryXhsConnectorSyncPreview/);
});

test("app does not expose external xhs connector api calls", async () => {
  const appJs = await fs.readFile(new URL("../web/app.js", import.meta.url), "utf8");

  assert.doesNotMatch(appJs, /sampleLibraryXhsConnectorDiscoverApi/);
  assert.doesNotMatch(appJs, /sampleLibraryXhsConnectorImportApi/);
  assert.doesNotMatch(appJs, /sampleLibraryXhsConnectorSyncPreviewApi/);
  assert.doesNotMatch(appJs, /sampleLibraryXhsConnectorSyncApplyApi/);
});

test("styles do not keep xhs connector panel blocks", async () => {
  const styles = await fs.readFile(new URL("../web/styles.css", import.meta.url), "utf8");
  assert.doesNotMatch(styles, /sample-library-xhs-connector/);
});

test("xhs connector view and form helper modules are removed", async () => {
  await assert.rejects(
    fs.stat(new URL("../web/xhs-connector-view.js", import.meta.url)),
    /ENOENT/
  );

  await assert.rejects(
    fs.stat(new URL("../web/xhs-connector-form-helpers.js", import.meta.url)),
    /ENOENT/
  );
});
