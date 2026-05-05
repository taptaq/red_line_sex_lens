import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

test("analyze form source uses dropdown helpers for tag selection", async () => {
  const source = await fs.readFile(path.join(process.cwd(), "web/app.js"), "utf8");
  const helperStart = source.indexOf("function setAnalyzeTagDropdownOpen(");
  const helperEnd = source.indexOf("function initializeAnalyzeTagPicker(", helperStart);

  assert.notEqual(helperStart, -1, "expected setAnalyzeTagDropdownOpen helper to exist");
  assert.notEqual(helperEnd, -1, "expected initializeAnalyzeTagPicker helper to exist");

  const helperSource = source.slice(helperStart, helperEnd);

  assert.match(source, /function setAnalyzeTagDropdownOpen\(/);
  assert.match(source, /function toggleAnalyzePresetTag\(/);
  assert.match(source, /function renderAnalyzeTagOptions\(/);
  assert.match(helperSource, /aria-expanded/);
});

test("analyze form source serializes tags through the hidden input", async () => {
  const source = await fs.readFile(path.join(process.cwd(), "web/app.js"), "utf8");
  const helperStart = source.indexOf("function setAnalyzeTagDropdownOpen(");
  const helperEnd = source.indexOf("function initializeAnalyzeTagPicker(", helperStart);

  assert.notEqual(helperStart, -1, "expected setAnalyzeTagDropdownOpen helper to exist");
  assert.notEqual(helperEnd, -1, "expected initializeAnalyzeTagPicker helper to exist");

  const helperSource = source.slice(helperStart, helperEnd);

  assert.match(helperSource, /hiddenInput\.value\s*=\s*joinCSV\(/);
  assert.match(helperSource, /buildAnalyzeTagSelectionMarkup\(/);
  assert.doesNotMatch(helperSource, /tags:\s*String\(form\.get\("tags"\) \|\| ""\)\.trim\(\)/);
});

test("analyze form source restores custom option maintenance in the picker", async () => {
  const source = await fs.readFile(path.join(process.cwd(), "web/app.js"), "utf8");
  const helperStart = source.indexOf("function setAnalyzeTagDropdownOpen(");
  const helperEnd = source.indexOf("function initializeAnalyzeTagPicker(", helperStart);

  assert.notEqual(helperStart, -1, "expected setAnalyzeTagDropdownOpen helper to exist");
  assert.notEqual(helperEnd, -1, "expected initializeAnalyzeTagPicker helper to exist");

  const helperSource = source.slice(helperStart, helperEnd);

  assert.match(helperSource, /function removeAnalyzeTagOption\(/);
  assert.match(helperSource, /data-tag-delete=/);
});
