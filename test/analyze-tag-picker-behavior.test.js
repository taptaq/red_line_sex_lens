import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

test("analyze tag picker source includes dropdown state and preset tag toggle helpers", async () => {
  const source = await fs.readFile(path.join(process.cwd(), "web/app.js"), "utf8");
  const helperStartAnchor = "function setAnalyzeTagDropdownOpen(";
  const helperEndAnchor = "function toggleAnalyzePresetTag(";
  const helperStart = source.indexOf(helperStartAnchor);
  const helperEnd = source.indexOf(helperEndAnchor);

  assert.notEqual(helperStart, -1, "expected setAnalyzeTagDropdownOpen helper to exist");
  assert.notEqual(helperEnd, -1, "expected toggleAnalyzePresetTag helper to exist");
  assert.ok(helperStart < helperEnd, "expected helper slice to run from dropdown setter to preset toggle");

  const helperSource = source.slice(helperStart, helperEnd);

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
