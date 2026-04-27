import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

test("analyze tag picker source includes dropdown state and preset tag toggle helpers", async () => {
  const source = await fs.readFile(path.join(process.cwd(), "web/app.js"), "utf8");
  const helperStart = source.indexOf("function setAnalyzeTagDropdownOpen(");
  const helperEnd = source.indexOf("\nfunction ", helperStart + 1);
  const helperSource = helperStart === -1
    ? ""
    : source.slice(helperStart, helperEnd === -1 ? source.length : helperEnd);

  assert.match(source, /function setAnalyzeTagDropdownOpen\(/);
  assert.match(source, /function toggleAnalyzePresetTag\(/);
  assert.match(source, /function renderAnalyzeTagOptions\(/);
  assert.match(helperSource, /aria-expanded/);
});

test("analyze tag picker source still serializes tags through the hidden input", async () => {
  const source = await fs.readFile(path.join(process.cwd(), "web/app.js"), "utf8");

  assert.match(source, /hiddenInput\.value = joinCSV\(normalized\)/);
  assert.match(source, /buildAnalyzeTagSelectionMarkup\(normalized\)/);
  assert.match(source, /addAnalyzeTagOption\(customInput\.value\)/);
});
