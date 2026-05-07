import test from "node:test";
import assert from "node:assert/strict";

import {
  activateMemoryCards,
  buildCandidateRiskBoundaryCards,
  buildCandidateRewriteStrategyCards,
  buildMemoryAuditSummary,
  buildCandidateRiskPatternCards,
  finalizeMemoryCards
} from "../src/memory/memory-card.js";

test("candidate risk pattern card keeps multiple supporting source ids", () => {
  const cards = buildCandidateRiskPatternCards([
    {
      id: "feedback-1",
      platformReason: "疑似导流",
      feedbackModelSuggestion: {
        contextCategories: ["导流与私域"]
      },
      suspiciousPhrases: ["二维码"]
    },
    {
      id: "feedback-2",
      platformReason: "疑似导流",
      feedbackModelSuggestion: {
        contextCategories: ["导流与私域"]
      },
      suspiciousPhrases: ["私信"]
    }
  ]);

  assert.equal(cards.length, 1);
  assert.equal(cards[0].kind, "risk_pattern_card");
  assert.deepEqual(cards[0].sourceIds, ["feedback-1", "feedback-2"]);
  assert.equal(cards[0].status, "candidate");
});

test("activation only promotes cards with enough support or manual confirmation", () => {
  const cards = activateMemoryCards([
    {
      id: "card-1",
      kind: "risk_pattern_card",
      status: "candidate",
      confidence: 0.82,
      sourceIds: ["feedback-1", "feedback-2"]
    },
    {
      id: "card-2",
      kind: "rewrite_strategy_card",
      status: "candidate",
      confidence: 0.7,
      sourceIds: ["feedback-3"]
    }
  ]);

  assert.equal(cards[0].status, "active");
  assert.equal(cards[1].status, "candidate");
});

test("rewrite strategy cards summarize repeated risk categories into conservative rewrite guidance", () => {
  const cards = buildCandidateRewriteStrategyCards([
    {
      id: "feedback-1",
      platformReason: "疑似导流",
      feedbackModelSuggestion: {
        contextCategories: ["导流与私域"]
      },
      suspiciousPhrases: ["加我", "私信"]
    },
    {
      id: "feedback-2",
      platformReason: "疑似导流",
      feedbackModelSuggestion: {
        contextCategories: ["导流与私域"]
      },
      suspiciousPhrases: ["拉群"]
    }
  ]);

  assert.equal(cards.length, 1);
  assert.equal(cards[0].kind, "rewrite_strategy_card");
  assert.equal(cards[0].status, "candidate");
  assert.deepEqual(cards[0].riskCategories, ["导流与私域"]);
  assert.match(cards[0].summary, /局部弱化|动作感/);
  assert.match(cards[0].searchText, /导流与私域/);
});

test("risk boundary cards are generated from confirmed false positives and preserve safe-side reminders", () => {
  const cards = buildCandidateRiskBoundaryCards([
    {
      id: "fp-1",
      status: "platform_passed_confirmed",
      title: "经验分享标题",
      body: "这是一段比较克制的经验分享。",
      falsePositiveAudit: {
        signal: "strict_confirmed",
        analyzerVerdict: "manual_review"
      },
      analysisSnapshot: {
        categories: ["两性用品宣传与展示"]
      }
    }
  ]);

  assert.equal(cards.length, 1);
  assert.equal(cards[0].kind, "risk_boundary_card");
  assert.equal(cards[0].status, "candidate");
  assert.deepEqual(cards[0].riskCategories, ["两性用品宣传与展示"]);
  assert.match(cards[0].summary, /中性经验分享|过度改写/);
});

test("finalizeMemoryCards preserves manual suppression and archive governance during rebuild", () => {
  const cards = finalizeMemoryCards(
    [
      {
        id: "risk-pattern:导流与私域",
        kind: "risk_pattern_card",
        status: "candidate",
        confidence: 0.82,
        sourceIds: ["feedback-1", "feedback-2"]
      },
      {
        id: "risk-boundary:两性用品宣传与展示",
        kind: "risk_boundary_card",
        status: "candidate",
        confidence: 0.78,
        sourceIds: ["fp-1"]
      }
    ],
    [
      {
        id: "risk-pattern:导流与私域",
        kind: "risk_pattern_card",
        manualSuppressed: true
      },
      {
        id: "risk-boundary:两性用品宣传与展示",
        kind: "risk_boundary_card",
        archivedAt: "2026-05-07T08:00:00.000Z"
      }
    ]
  );

  assert.equal(cards[0].status, "suppressed");
  assert.equal(cards[0].manualSuppressed, true);
  assert.equal(cards[1].status, "archived");
  assert.equal(cards[1].archivedAt, "2026-05-07T08:00:00.000Z");
});

test("memory audit summary reports status distribution and orphan cards", () => {
  const audit = buildMemoryAuditSummary({
    documents: [
      { id: "feedback:feedback-1", kind: "violation_feedback", status: "active", sourceIds: ["feedback-1"] },
      { id: "false-positive:fp-1", kind: "false_positive", status: "active", sourceIds: ["fp-1"] }
    ],
    cards: [
      {
        id: "risk-pattern:导流与私域",
        kind: "risk_pattern_card",
        status: "active",
        sourceIds: ["feedback-1"]
      },
      {
        id: "risk-boundary:两性用品宣传与展示",
        kind: "risk_boundary_card",
        status: "suppressed",
        sourceIds: ["missing-source"]
      },
      {
        id: "rewrite-strategy:导流与私域",
        kind: "rewrite_strategy_card",
        status: "candidate",
        sourceIds: []
      }
    ]
  });

  assert.equal(audit.ok, true);
  assert.equal(audit.documents, 2);
  assert.equal(audit.cards, 3);
  assert.equal(audit.byStatus.active, 1);
  assert.equal(audit.byStatus.suppressed, 1);
  assert.equal(audit.byStatus.candidate, 1);
  assert.equal(audit.byKind.risk_pattern_card, 1);
  assert.equal(audit.byKind.risk_boundary_card, 1);
  assert.equal(audit.byKind.rewrite_strategy_card, 1);
  assert.deepEqual(audit.missingSourceIdCards, ["rewrite-strategy:导流与私域"]);
  assert.deepEqual(audit.orphanCards, ["risk-boundary:两性用品宣传与展示"]);
});
