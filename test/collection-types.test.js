import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { paths } from "../src/config.js";
import { loadCollectionTypes, saveCollectionTypes } from "../src/data-store.js";
import {
  predefinedCollectionTypes,
  buildCollectionTypeOptions,
  normalizeCollectionType,
  assertValidCollectionType
} from "../src/collection-types.js";

async function withTempCollectionTypesPath(t, run) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "collection-types-"));
  const originalPath = paths.collectionTypes;
  paths.collectionTypes = path.join(tempDir, "collection-types.json");

  t.after(async () => {
    paths.collectionTypes = originalPath;
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  return run();
}

test("collection type helpers merge predefined and custom options in stable order", () => {
  const options = buildCollectionTypeOptions(["自定义合集", "科普", " 自定义合集 "]);

  assert.deepEqual(options.slice(0, 4), predefinedCollectionTypes.slice(0, 4));
  assert.equal(options.includes("科普"), true);
  assert.equal(options.includes("自定义合集"), true);
  assert.equal(options.filter((item) => item === "自定义合集").length, 1);
});

test("collection type validation trims and rejects unknown values", () => {
  const options = buildCollectionTypeOptions(["自定义合集"]);

  assert.equal(normalizeCollectionType(" 科普 "), "科普");
  assert.equal(assertValidCollectionType("自定义合集", options), "自定义合集");
  assert.throws(() => assertValidCollectionType("不存在的合集", options), /合集类型/);
});

test("collection type store saves and loads normalized custom options", async (t) => {
  await withTempCollectionTypesPath(t, async () => {
    await saveCollectionTypes({
      custom: [" 新系列实验室 ", "自定义合集", "新系列实验室", ""]
    });

    const stored = await loadCollectionTypes();
    assert.deepEqual(stored, {
      custom: ["新系列实验室", "自定义合集"]
    });
  });
});
