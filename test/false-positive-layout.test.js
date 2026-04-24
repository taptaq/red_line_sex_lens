import test from "node:test";
import assert from "node:assert/strict";

import { buildFalsePositiveEntryMarkup, buildLongTextDetails } from "../web/false-positive-view.js";

test("buildLongTextDetails renders an explicit full-text disclosure block", () => {
  const html = buildLongTextDetails("正文", "第一段\n\n第二段", "未提供正文");

  assert.match(html, /<details class="false-positive-text-details"/);
  assert.match(html, /<summary class="false-positive-text-summary">正文全文 · 2 段<\/summary>/);
  assert.match(html, /第一段/);
  assert.match(html, /第二段/);
});

test("buildFalsePositiveEntryMarkup keeps body, cover, and notes fully readable", () => {
  const html = buildFalsePositiveEntryMarkup({
    id: "fp-layout-1",
    title: "长文本样本",
    status: "platform_passed_pending",
    body: "这是正文的第一段。\n\n这是正文的第二段，包含更多细节，必须完整展示。",
    coverText: "封面文案也要完整展示，不允许只看见截断。",
    userNotes: "这里是备注，内容很长，需要完整查看。",
    tags: ["两性", "关系沟通"],
    updatedAt: "2026-04-20T00:00:00.000Z",
    analysisSnapshot: {
      verdict: "manual_review",
      score: 41
    },
    falsePositiveAudit: {
      signal: "strict_pending",
      label: "规则偏严待确认",
      notes: "观察中"
    }
  });

  assert.match(html, /<article class="admin-item false-positive-admin-item"/);
  assert.match(html, /class="false-positive-admin-layout"/);
  assert.match(html, /class="false-positive-admin-details"/);
  assert.match(html, /正文全文/);
  assert.match(html, /封面全文/);
  assert.match(html, /备注全文/);
  assert.match(html, /这是正文的第一段。/);
  assert.match(html, /这是正文的第二段，包含更多细节，必须完整展示。/);
  assert.match(html, /封面文案也要完整展示，不允许只看见截断。/);
  assert.match(html, /这里是备注，内容很长，需要完整查看。/);
  assert.match(html, /class="false-positive-admin-state"/);
  assert.match(html, /class="false-positive-admin-actions"/);
  assert.match(html, /标记已确认|已确认/);
  assert.match(html, /删除无效样本/);
});
