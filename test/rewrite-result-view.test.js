import test from "node:test";
import assert from "node:assert/strict";

import { buildRewriteBodyMarkup } from "../web/rewrite-result-view.js";

test("renders rewrite body in full-text details view", () => {
  const body = "第一段\n\n第二段\n\n第三段";
  const html = buildRewriteBodyMarkup(body);

  assert.match(html, /<details/);
  assert.match(html, /全文/);
  assert.match(html, /第一段/);
  assert.match(html, /第三段/);
});
