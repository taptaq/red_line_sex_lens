import test from "node:test";
import assert from "node:assert/strict";

import { summarizeGenerationReferenceAssets } from "../src/generation-reference-assets.js";

test("summarizeGenerationReferenceAssets merges text files and skips image summarization when there are no images", async () => {
  const summarizeCalls = [];
  const result = await summarizeGenerationReferenceAssets({
    referenceAssets: {
      images: [],
      textFiles: [
        {
          name: "brief-1.txt",
          contentBase64: Buffer.from("First reference chunk.\n\n\nShared detail.", "utf8").toString("base64")
        },
        {
          name: "brief-2.md",
          contentBase64: Buffer.from("Second reference chunk.\n\n\nAnother detail.", "utf8").toString("base64")
        }
      ]
    },
    summarizeImage: async (input) => {
      summarizeCalls.push(input);
      return { summary: "should not run" };
    }
  });

  assert.deepEqual(summarizeCalls, []);
  assert.deepEqual(result.imageSummaries, []);
  assert.deepEqual(result.textFileNames, ["brief-1.txt", "brief-2.md"]);
  assert.match(result.mergedText, /First reference chunk\./);
  assert.match(result.mergedText, /Shared detail\./);
  assert.match(result.mergedText, /Second reference chunk\./);
  assert.match(result.mergedText, /Another detail\./);
  assert.doesNotMatch(result.mergedText, /\n{3,}/);
  assert.deepEqual(result.warnings, []);
});

test("summarizeGenerationReferenceAssets keeps successful image summaries and downgrades failures to warnings", async () => {
  const summarizeCalls = [];
  const result = await summarizeGenerationReferenceAssets({
    referenceAssets: {
      images: [
        {
          name: "pose-1.png",
          mimeType: "image/png",
          dataUrl: "data:image/png;base64,AAAA"
        },
        {
          name: "pose-2.jpg",
          mimeType: "image/jpeg",
          dataUrl: "data:image/jpeg;base64,BBBB"
        }
      ],
      textFiles: []
    },
    summarizeImage: async ({ fileName }) => {
      summarizeCalls.push(fileName);

      if (fileName === "pose-2.jpg") {
        throw new Error("vision unavailable");
      }

      return { summary: "front-facing pose with soft lighting" };
    }
  });

  assert.deepEqual(summarizeCalls, ["pose-1.png", "pose-2.jpg"]);
  assert.deepEqual(result.imageFileNames, ["pose-1.png", "pose-2.jpg"]);
  assert.deepEqual(result.imageSummaries, [{ name: "pose-1.png", summary: "front-facing pose with soft lighting" }]);
  assert.equal(result.mergedText, "");
  assert.equal(result.warnings.length, 1);
  assert.match(result.warnings[0], /pose-2\.jpg/);
});
