import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import {
  buildXhsConnectorPanelMarkup,
  buildXhsConnectorDiscoveryResultMarkup,
  buildXhsConnectorSyncPreviewMarkup,
  buildXhsConnectorItemKey
} from "../web/xhs-connector-view.js";
import { readXhsConnectorSelectedKeys } from "../web/xhs-connector-form-helpers.js";

test("sample-library workspace includes xhs connector mount only", async () => {
  const html = await fs.readFile(new URL("../web/index.html", import.meta.url), "utf8");
  assert.match(html, /id="sample-library-xhs-connector-mount"/);
  assert.doesNotMatch(html, /id="sample-library-xhs-connector-panel"/);
  assert.doesNotMatch(html, /id="sample-library-xhs-connector-result"/);
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

test("buildXhsConnectorPanelMarkup renders the shell and result region", () => {
  const markup = buildXhsConnectorPanelMarkup();

  assert.match(markup, /sample-library-xhs-connector-panel/);
  assert.match(markup, /sample-library-xhs-connector-result/);
});

test("buildXhsConnectorDiscoveryResultMarkup uses stable item keys for selection", () => {
  const markup = buildXhsConnectorDiscoveryResultMarkup([
    {
      noteId: "note-1",
      title: "一号样本",
      selected: true
    },
    {
      url: "https://www.xiaohongshu.com/explore/note-2",
      title: "二号样本"
    },
    {
      title: "三号样本"
    }
  ]);

  assert.match(markup, /value="note:note-1"/);
  assert.match(markup, /value="url:https:\/\/www\.xiaohongshu\.com\/explore\/note-2"/);
  assert.match(markup, /value="fallback:/);
  assert.match(markup, /checked/);
});

test("buildXhsConnectorSyncPreviewMarkup renders counts", () => {
  const markup = buildXhsConnectorSyncPreviewMarkup({
    summary: {
      selectedCount: 2,
      totalCount: 3
    },
    matched: [{ id: 1 }, { id: 2 }],
    unmatched: [{ id: 3 }]
  });

  assert.match(markup, /匹配 2/);
  assert.match(markup, /未匹配 1/);
  assert.match(markup, /总计 3/);
  assert.match(markup, /已选择 2 \/ 3 条候选样本/);
});

test("readXhsConnectorSelectedKeys returns checked keys", () => {
  const root = {
    querySelectorAll(selector) {
      assert.equal(selector, '[name="xhsConnectorSelectedItem"]:checked');
      return [{ value: "note:note-1" }, { value: "url:https://example.com/note-2" }];
    }
  };

  assert.deepEqual(readXhsConnectorSelectedKeys(root), [
    "note:note-1",
    "url:https://example.com/note-2"
  ]);
});

test("buildXhsConnectorItemKey prefers noteId then url then fallback", () => {
  assert.equal(buildXhsConnectorItemKey({ noteId: "note-1", url: "https://example.com" }), "note:note-1");
  assert.equal(buildXhsConnectorItemKey({ url: "https://example.com" }), "url:https://example.com");
  assert.match(buildXhsConnectorItemKey({ title: "三号样本" }, "fallback-3"), /^fallback:/);
});
