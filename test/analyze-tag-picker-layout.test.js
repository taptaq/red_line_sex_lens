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
  assert.match(source, /\.tag-picker-trigger \{[^}]*max-height:/);
  assert.match(source, /\.tag-picker-trigger \{[^}]*overflow: hidden;/);
  assert.match(source, /\.tag-picker-dropdown \{[^}]*max-height:/);
  assert.match(source, /\.tag-picker-dropdown \{[^}]*overflow: auto;/);
  assert.match(source, /\.tag-picker-dropdown\[hidden\] \{[^}]*display: none;/);
});

test("custom tag delete affordance only appears on hover or focus", async () => {
  const source = await fs.readFile(path.join(process.cwd(), "web/styles.css"), "utf8");

  assert.match(source, /\.tag-picker-option-delete \{[^}]*opacity: 0;/);
  assert.match(source, /\.tag-picker-option-delete \{[^}]*pointer-events: none;/);
  assert.match(source, /\.tag-picker-option-row\.is-custom:hover \.tag-picker-option-delete/);
  assert.match(source, /\.tag-picker-option-row\.is-custom:focus-within \.tag-picker-option-delete/);
});
