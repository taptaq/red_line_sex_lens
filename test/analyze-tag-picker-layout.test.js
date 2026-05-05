import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

test("analyze form uses a custom dropdown picker instead of a plain text tag input", async () => {
  const source = await fs.readFile(path.join(process.cwd(), "web/index.html"), "utf8");

  assert.match(source, /id="analyze-tag-picker"/);
  assert.match(source, /id="analyze-tags-value"/);
  assert.match(source, /id="analyze-tag-trigger"/);
  assert.match(source, /id="analyze-tag-dropdown"/);
  assert.match(source, /id="analyze-tag-options"/);
  assert.match(source, /id="analyze-tag-custom"/);
  assert.match(source, /id="analyze-tag-add"/);
  assert.doesNotMatch(source, /<input(?=[^>]*name="tags")(?![^>]*type="hidden")[^>]*>/);
});

test("analyze tag picker styles exist for trigger and dropdown layout", async () => {
  const source = await fs.readFile(path.join(process.cwd(), "web/styles.css"), "utf8");

  assert.match(source, /\.tag-picker-trigger\s*\{/);
  assert.match(source, /\.tag-picker-dropdown\s*\{/);
  assert.match(source, /\.tag-picker-dropdown\[hidden\]\s*\{/);
});

test("custom tag delete affordance styles exist for custom picker options", async () => {
  const source = await fs.readFile(path.join(process.cwd(), "web/styles.css"), "utf8");

  assert.match(source, /\.tag-picker-option-delete\s*\{/);
  assert.match(source, /\.tag-picker-option-row\.is-custom:hover \.tag-picker-option-delete/);
  assert.match(source, /\.tag-picker-option-row\.is-custom:focus-within \.tag-picker-option-delete/);
});
