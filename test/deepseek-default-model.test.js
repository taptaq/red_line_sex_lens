import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

const files = ["src/glm.js", "src/cross-review.js", "src/semantic-review.js"];

for (const file of files) {
  test(`${file} defaults DeepSeek to deepseek-v4-flash`, async () => {
    const source = await fs.readFile(new URL(`../${file}`, import.meta.url), "utf8");

    assert.match(source, /deepseek-v4-flash/);
  });
}
