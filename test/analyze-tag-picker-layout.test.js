import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

test("analyze tag picker uses a custom dropdown trigger instead of a native preset select", async () => {
  const source = await fs.readFile(path.join(process.cwd(), "web/index.html"), "utf8");

  assert.doesNotMatch(source, /<select id="analyze-tag-select"/);
  assert.match(source, /id="analyze-tag-trigger"/);
  assert.match(source, /id="analyze-tag-dropdown"/);
  assert.match(source, /id="analyze-tag-options"/);
});

test("analyze tag picker styles bound the closed trigger and dropdown overflow", async () => {
  const source = await fs.readFile(path.join(process.cwd(), "web/styles.css"), "utf8");

  assert.match(source, /\.tag-picker-trigger \{/);
  assert.match(source, /\.tag-picker-trigger \{[\s\S]*max-height:/);
  assert.match(source, /\.tag-picker-trigger \{[\s\S]*overflow: hidden;/);
  assert.match(source, /\.tag-picker-dropdown \{[\s\S]*overflow: auto;/);
});
