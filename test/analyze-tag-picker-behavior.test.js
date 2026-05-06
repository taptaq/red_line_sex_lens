import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

test("analyze form source uses dropdown helpers for tag selection", async () => {
  const source = await fs.readFile(path.join(process.cwd(), "web/app.js"), "utf8");
  assert.match(source, /function setAnalyzeTagDropdownOpen\([\s\S]*?aria-expanded/);
  assert.match(source, /function toggleAnalyzePresetTag\(/);
  assert.match(source, /function renderAnalyzeTagOptions\(/);
});

test("analyze form source serializes tags through the hidden input", async () => {
  const source = await fs.readFile(path.join(process.cwd(), "web/app.js"), "utf8");
  assert.match(source, /function writeAnalyzeTags\([\s\S]*?hiddenInput\.value\s*=\s*joinCSV\(/);
  assert.match(source, /function writeAnalyzeTags\([\s\S]*?buildAnalyzeTagSelectionMarkup\(/);
  assert.doesNotMatch(source, /function writeAnalyzeTags\([\s\S]*?form\.get\("tags"\)/);
});

test("analyze form source restores custom option maintenance in the picker", async () => {
  const source = await fs.readFile(path.join(process.cwd(), "web/app.js"), "utf8");
  assert.match(source, /function removeAnalyzeTagOption\(/);
  assert.match(source, /data-tag-delete=/);
});
