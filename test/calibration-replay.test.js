import test from "node:test";
import assert from "node:assert/strict";

import { replayCalibratedSamples } from "../src/calibration-replay.js";

test("replayCalibratedSamples summarizes calibrated history under the balanced baseline", () => {
  const result = replayCalibratedSamples([
    {
      note: {
        title: "稳定过审样本",
        body: "正文一"
      },
      publish: {
        status: "published_passed",
        metrics: {
          likes: 28,
          favorites: 6,
          comments: 3
        }
      },
      calibration: {
        prediction: {
          predictedStatus: "published_passed",
          predictedRiskLevel: "low",
          predictedPerformanceTier: "medium"
        },
        retro: {
          predictionMatched: true
        }
      }
    },
    {
      note: {
        title: "高风险误判样本",
        body: "正文二"
      },
      publish: {
        status: "violation",
        metrics: {
          likes: 0,
          favorites: 0,
          comments: 0
        }
      },
      calibration: {
        prediction: {
          predictedStatus: "published_passed",
          predictedRiskLevel: "high",
          predictedPerformanceTier: "medium"
        },
        retro: {
          predictionMatched: false
        }
      }
    },
    {
      note: {
        title: "高表现参考候选",
        body: "正文三"
      },
      publish: {
        status: "positive_performance",
        metrics: {
          likes: 180,
          favorites: 32,
          comments: 16
        }
      },
      reference: {
        enabled: false
      },
      calibration: {
        prediction: {
          predictedStatus: "published_passed",
          predictedRiskLevel: "low",
          predictedPerformanceTier: "medium"
        },
        retro: {
          predictionMatched: false,
          shouldBecomeReference: true
        }
      }
    }
  ]);

  assert.equal(result.total, 3);
  assert.equal(result.matched, 1);
  assert.equal(result.mismatched, 2);
  assert.equal(result.highRiskMisses, 1);
  assert.equal(result.referenceCandidatesAffected, 1);
  assert.equal(result.preview.length, 2);
  assert.equal(result.preview[0].title, "高风险误判样本");
  assert.equal(result.preview[1].title, "高表现参考候选");
});

test("replayCalibratedSamples can re-evaluate stored predictions with a stricter risk-first heuristic", () => {
  const records = [
    {
      note: {
        title: "高风险边界样本",
        body: "正文"
      },
      publish: {
        status: "violation",
        metrics: {
          likes: 0,
          favorites: 0,
          comments: 0
        }
      },
      calibration: {
        prediction: {
          predictedStatus: "published_passed",
          predictedRiskLevel: "high",
          predictedPerformanceTier: "medium"
        }
      }
    }
  ];

  const balanced = replayCalibratedSamples(records, { mode: "balanced" });
  const strictRisk = replayCalibratedSamples(records, { mode: "strict_risk" });

  assert.equal(balanced.matched, 0);
  assert.equal(balanced.mismatched, 1);
  assert.equal(strictRisk.matched, 1);
  assert.equal(strictRisk.mismatched, 0);
});
