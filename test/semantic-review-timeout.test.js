import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

test("semantic review default timeout is raised to 60000ms", async () => {
  const source = await fs.readFile(path.join(process.cwd(), "src/semantic-review.js"), "utf8");

  assert.match(source, /SEMANTIC_REVIEW_TIMEOUT_MS \|\| 60000/);
});

test("cross review default timeout is raised to 30000ms", async () => {
  const source = await fs.readFile(path.join(process.cwd(), "src/cross-review.js"), "utf8");

  assert.match(source, /CROSS_REVIEW_TIMEOUT_MS \|\| 30000/);
});
