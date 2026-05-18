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

test("summarizeGenerationReferenceAssets merges direct materialText with uploaded text files", async () => {
  const result = await summarizeGenerationReferenceAssets({
    referenceAssets: {
      materialText: "手写参考要点",
      images: [],
      textFiles: [
        {
          name: "brief.txt",
          contentBase64: Buffer.from("上传文本参考内容", "utf8").toString("base64")
        }
      ]
    }
  });

  assert.match(result.mergedText, /手写参考要点/);
  assert.match(result.mergedText, /上传文本参考内容/);
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

test("summarizeGenerationReferenceAssets keeps valid decoded text and warns for one bad text file", async () => {
  const result = await summarizeGenerationReferenceAssets({
    referenceAssets: {
      images: [],
      textFiles: [
        {
          name: "good.txt",
          contentBase64: " Rmlyc3QgdGV4dCBjaHVuay4 \n"
        },
        {
          name: "bad.txt",
          contentBase64: ""
        },
        {
          name: "padded-later.txt",
          contentBase64: "U2Vjb25kIHRleHQgY2h1bmsu"
        }
      ]
    }
  });

  assert.match(result.mergedText, /First text chunk\./);
  assert.match(result.mergedText, /Second text chunk\./);
  assert.equal(result.warnings.length, 1);
  assert.match(result.warnings[0], /bad\.txt/);
  assert.match(result.warnings[0], /empty base64 content/);
});

test("summarizeGenerationReferenceAssets falls back for blank and whitespace-only file names", async () => {
  const result = await summarizeGenerationReferenceAssets({
    referenceAssets: {
      textFiles: [
        {
          name: "   ",
          contentBase64: Buffer.from("Named by fallback", "utf8").toString("base64")
        }
      ],
      images: [
        {
          name: "",
          mimeType: "image/png",
          dataUrl: "data:image/png;base64,AAAA"
        }
      ]
    },
    summarizeImage: async () => ({ summary: "usable framing" })
  });

  assert.deepEqual(result.textFileNames, ["text-1"]);
  assert.deepEqual(result.imageFileNames, ["image-1"]);
  assert.deepEqual(result.imageSummaries, [{ name: "image-1", summary: "usable framing" }]);
});

test("summarizeGenerationReferenceAssets skips over-limit assets with warnings before processing them", async () => {
  const summarizeCalls = [];
  const result = await summarizeGenerationReferenceAssets({
    referenceAssets: {
      images: [
        {
          name: "keep.png",
          mimeType: "image/png",
          dataUrl: `data:image/png;base64,${"A".repeat(1024)}`
        },
        {
          name: "too-big.png",
          mimeType: "image/png",
          dataUrl: `data:image/png;base64,${"A".repeat(6 * 1024 * 1024)}`
        },
        ...Array.from({ length: 5 }, (_, index) => ({
          name: `overflow-${index + 1}.png`,
          mimeType: "image/png",
          dataUrl: `data:image/png;base64,${"A".repeat(1024)}`
        }))
      ],
      textFiles: [
        {
          name: "keep.txt",
          contentBase64: Buffer.from("kept text", "utf8").toString("base64")
        },
        {
          name: "too-big.txt",
          contentBase64: "A".repeat(700 * 1024)
        }
      ]
    },
    summarizeImage: async ({ fileName }) => {
      summarizeCalls.push(fileName);
      return { summary: `${fileName} summary` };
    }
  });

  assert.deepEqual(summarizeCalls, ["keep.png", "overflow-1.png", "overflow-2.png", "overflow-3.png", "overflow-4.png"]);
  assert.deepEqual(result.imageFileNames, ["keep.png", "overflow-1.png", "overflow-2.png", "overflow-3.png", "overflow-4.png"]);
  assert.deepEqual(result.textFileNames, ["keep.txt"]);
  assert.deepEqual(
    result.imageSummaries,
    ["keep.png", "overflow-1.png", "overflow-2.png", "overflow-3.png", "overflow-4.png"].map((fileName) => ({
      name: fileName,
      summary: `${fileName} summary`
    }))
  );
  assert.match(result.mergedText, /kept text/);
  assert.equal(result.warnings.length >= 3, true);
  assert.match(result.warnings.join("\n"), /too-big\.png/);
  assert.match(result.warnings.join("\n"), /too-big\.txt/);
  assert.match(result.warnings.join("\n"), /overflow-5\.png/);
});

test("summarizeGenerationReferenceAssets enforces the total raw-equivalent limit across accepted assets", async () => {
  const fourMbBase64 = Buffer.alloc(4 * 1024 * 1024).toString("base64");
  const result = await summarizeGenerationReferenceAssets({
    referenceAssets: {
      images: [
        {
          name: "first.png",
          mimeType: "image/png",
          dataUrl: `data:image/png;base64,${fourMbBase64}`
        },
        {
          name: "second.png",
          mimeType: "image/png",
          dataUrl: `data:image/png;base64,${fourMbBase64}`
        },
        {
          name: "third.png",
          mimeType: "image/png",
          dataUrl: `data:image/png;base64,${fourMbBase64}`
        },
        {
          name: "fourth-over-total.png",
          mimeType: "image/png",
          dataUrl: `data:image/png;base64,${Buffer.from("overflow", "utf8").toString("base64")}`
        }
      ],
      textFiles: []
    },
    summarizeImage: async ({ fileName }) => ({ summary: `${fileName} summary` })
  });

  assert.deepEqual(
    result.imageSummaries,
    [
      { name: "first.png", summary: "first.png summary" },
      { name: "second.png", summary: "second.png summary" },
      { name: "third.png", summary: "third.png summary" }
    ]
  );
  assert.deepEqual(result.imageFileNames, ["first.png", "second.png", "third.png"]);
  assert.equal(result.warnings.length, 1);
  assert.match(result.warnings[0], /fourth-over-total\.png/);
});
