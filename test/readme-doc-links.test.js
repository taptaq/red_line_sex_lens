import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

test("README links to the system flow and seed lexicon tiered checklist docs", async () => {
  const source = await fs.readFile(path.join(process.cwd(), "README.md"), "utf8");

  assert.match(source, /\[SYSTEM_FLOW\.md\]\(\.\/SYSTEM_FLOW\.md\)/);
  assert.match(source, /\[docs\/seed-lexicon-tiered-checklist\.md\]\(\.\/docs\/seed-lexicon-tiered-checklist\.md\)/);
});
