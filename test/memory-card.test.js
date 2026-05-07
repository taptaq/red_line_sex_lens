import test from "node:test";
import assert from "node:assert/strict";

import {
  activateMemoryCards,
  buildCandidateRiskPatternCards
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
