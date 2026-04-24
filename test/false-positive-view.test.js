import test from "node:test";
import assert from "node:assert/strict";

import { buildFalsePositiveActionMarkup, buildFalsePositiveCaptureSources } from "../web/false-positive-view.js";

test("buildFalsePositiveActionMarkup renders capture controls and source summary", () => {
  const html = buildFalsePositiveActionMarkup({
    sourceType: "analysis",
    title: "示例标题",
    body: "示例正文",
    coverText: "示例封面",
    tags: ["关系沟通", "亲密关系"],
    analysisSnapshot: {
      verdict: "manual_review",
      score: 48
    }
  });

  assert.match(html, /记录为误报样本/);
  assert.match(html, /已发出，目前正常/);
  assert.match(html, /观察期后仍正常/);
  assert.match(html, /示例标题/);
  assert.match(html, /示例正文/);
  assert.match(html, /关系沟通/);
  assert.match(html, /分析结果|规则检测/);
});

test("buildFalsePositiveActionMarkup labels rewrite sources distinctly", () => {
  const html = buildFalsePositiveActionMarkup({
    sourceType: "rewrite",
    title: "原始标题",
    body: "原始正文",
    rewriteSnapshot: {
      title: "改写标题",
      body: "改写正文",
      coverText: "改写封面",
      tags: ["科普", "关系沟通"]
    },
    analysisSnapshot: {
      verdict: "observe",
      score: 12
    }
  });

  const sourceJson = html.match(/data-false-positive-source="([^"]+)"/)?.[1];
  const source = JSON.parse(
    sourceJson
      .replaceAll("&quot;", '"')
      .replaceAll("&amp;", "&")
      .replaceAll("&lt;", "<")
      .replaceAll("&gt;", ">")
      .replaceAll("&#39;", "'")
  );

  assert.match(html, /改写结果/);
  assert.match(html, /改写标题/);
  assert.match(html, /改写正文/);
  assert.match(html, /改写封面/);
  assert.match(html, /科普/);
  assert.equal(source.title, "改写标题");
  assert.equal(source.body, "改写正文");
  assert.equal(source.coverText, "改写封面");
  assert.deepEqual(source.tags, ["科普", "关系沟通"]);
  assert.match(html, /已发出，目前正常/);
  assert.match(html, /观察期后仍正常/);
});

test("buildFalsePositiveCaptureSources keeps analysis and rewrite panel sources separate", () => {
  const sources = buildFalsePositiveCaptureSources({
    analyzePayload: {
      title: "原始标题",
      body: "原始正文",
      coverText: "原始封面",
      tags: ["两性", "关系沟通"]
    },
    analysisSnapshot: {
      verdict: "manual_review",
      score: 44
    },
    rewriteSnapshot: {
      title: "改写标题",
      body: "改写正文",
      coverText: "改写封面",
      tags: ["科普", "关系沟通"]
    }
  });

  assert.equal(sources.analysis.sourceType, "analysis");
  assert.equal(sources.analysis.title, "原始标题");
  assert.equal(sources.analysis.body, "原始正文");
  assert.equal(sources.analysis.coverText, "原始封面");
  assert.deepEqual(sources.analysis.tags, ["两性", "关系沟通"]);
  assert.equal(sources.rewrite.sourceType, "rewrite");
  assert.equal(sources.rewrite.title, "改写标题");
  assert.equal(sources.rewrite.body, "改写正文");
  assert.equal(sources.rewrite.coverText, "改写封面");
  assert.deepEqual(sources.rewrite.tags, ["科普", "关系沟通"]);

  const analysisHtml = buildFalsePositiveActionMarkup(sources.analysis);
  const rewriteHtml = buildFalsePositiveActionMarkup(sources.rewrite);

  assert.match(analysisHtml, /原始标题/);
  assert.match(analysisHtml, /原始正文/);
  assert.doesNotMatch(analysisHtml, /改写标题/);
  assert.match(rewriteHtml, /改写标题/);
  assert.match(rewriteHtml, /改写正文/);
  assert.doesNotMatch(rewriteHtml, /原始标题/);
});
