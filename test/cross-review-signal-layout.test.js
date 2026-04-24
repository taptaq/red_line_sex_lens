import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

test("cross review signal styles allow long text to wrap inside cards", async () => {
  const source = await fs.readFile(path.join(process.cwd(), "web/styles.css"), "utf8");

  assert.match(source, /\.cross-review-signal-card \.meta-row \{[\s\S]*display: grid;/);
  assert.match(source, /\.meta-pill \{[\s\S]*max-width: 100%;/);
  assert.match(source, /\.meta-pill \{[\s\S]*white-space: normal;/);
  assert.match(source, /\.meta-pill \{[\s\S]*overflow-wrap: anywhere;/);
});
