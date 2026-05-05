import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

test("analyze form uses a custom dropdown picker instead of a plain text tag input", async () => {
  const source = await fs.readFile(path.join(process.cwd(), "web/index.html"), "utf8");
  const formStart = source.indexOf('id="analyze-form"');
  const formEnd = source.indexOf("</form>", formStart);

  assert.notEqual(formStart, -1, "expected analyze form markup to exist");
  assert.notEqual(formEnd, -1, "expected analyze form closing tag to exist");

  const formSource = source.slice(formStart, formEnd);

  assert.match(formSource, /id="analyze-tag-picker"/);
  assert.match(formSource, /id="analyze-tags-value"/);
  assert.match(formSource, /id="analyze-tag-trigger"/);
  assert.match(formSource, /id="analyze-tag-dropdown"/);
  assert.match(formSource, /id="analyze-tag-options"/);
  assert.match(formSource, /id="analyze-tag-custom"/);
  assert.match(formSource, /id="analyze-tag-add"/);
  assert.doesNotMatch(formSource, /<input(?=[^>]*name="tags")(?![^>]*type="hidden")[^>]*>/);
});

test("analyze tag picker styles use a compact wrapping capsule layout", async () => {
  const source = await fs.readFile(path.join(process.cwd(), "web/styles.css"), "utf8");

  assert.match(source, /\.tag-picker-options\s*\{[\s\S]*?display:\s*flex[\s\S]*?flex-wrap:\s*wrap/);
  assert.match(source, /\.tag-picker-option-row\s*\{[\s\S]*?display:\s*inline-flex/);
  assert.match(
    source,
    /\.tag-picker-option\s*\{[\s\S]*?border-radius:\s*999px[\s\S]*?border:\s*1px solid rgba\(199,\s*154,\s*69,[\s\S]*?background:\s*rgba\(255,\s*251,\s*244,/
  );
  assert.match(
    source,
    /\.tag-picker-dropdown\s*\{[\s\S]*?background:[\s\S]*?rgba\(255,\s*252,\s*247,[\s\S]*?max-height:\s*15rem/
  );
});

test("custom tag delete affordance styles exist for custom picker options", async () => {
  const source = await fs.readFile(path.join(process.cwd(), "web/styles.css"), "utf8");

  assert.match(source, /\.tag-picker-option-delete\s*\{/);
  assert.match(source, /\.tag-picker-option-row\.is-custom:hover \.tag-picker-option-delete/);
  assert.match(source, /\.tag-picker-option-row\.is-custom:focus-within \.tag-picker-option-delete/);
});
