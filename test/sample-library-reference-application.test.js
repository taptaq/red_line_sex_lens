import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

import { deriveSampleLibraryReferenceApplication } from "../web/sample-library-reference-application.js";

test("reference application requires explicit retro confirmation before enabling a sample", () => {
  const result = deriveSampleLibraryReferenceApplication({
    record: {
      reference: { enabled: false, tier: "" },
      publish: { status: "published_passed", metrics: { likes: 12 } }
    },
    calibration: {
      retro: {
        shouldBecomeReference: false,
        actualPerformanceTier: "medium"
      }
    }
  });

  assert.equal(result.canApply, false);
  assert.match(result.requirementMessage, /请先勾选.*应转参考样本/);
  assert.match(result.statusSummary, /当前参考状态：未启用/);
});

test("reference application blocks negative lifecycle outcomes from being upgraded into references", () => {
  const result = deriveSampleLibraryReferenceApplication({
    record: {
      reference: { enabled: false, tier: "" },
      publish: { status: "violation", metrics: { likes: 88, favorites: 30, comments: 12 } }
    },
    calibration: {
      retro: {
        shouldBecomeReference: true,
        actualPerformanceTier: "high"
      }
    }
  });

  assert.equal(result.canApply, false);
  assert.match(result.requirementMessage, /不是正向样本/);
});

test("reference application upgrades strong positive retro results to performed tier without auto-promoting to featured", () => {
  const result = deriveSampleLibraryReferenceApplication({
    record: {
      reference: { enabled: false, tier: "", notes: "" },
      publish: { status: "positive_performance", metrics: { likes: 64, favorites: 22, comments: 11, shares: 21, views: 3200 } }
    },
    calibration: {
      retro: {
        shouldBecomeReference: true,
        actualPerformanceTier: "high"
      }
    }
  });

  assert.equal(result.canApply, true);
  assert.equal(result.reference.enabled, true);
  assert.equal(result.reference.tier, "performed");
  assert.equal(result.reference.selectedBy, "calibration_retro");
  assert.match(result.successMessage, /过审且表现好/);
  assert.doesNotMatch(result.successMessage, /人工精选标杆/);
  assert.match(result.statusSummary, /当前参考状态：未启用/);
});

test("reference application preserves an already higher manual featured tier", () => {
  const result = deriveSampleLibraryReferenceApplication({
    record: {
      reference: { enabled: true, tier: "featured", notes: "原有精选备注", selectedBy: "manual" },
      publish: { status: "published_passed", metrics: { likes: 12, favorites: 2, comments: 1, views: 500 } }
    },
    calibration: {
      retro: {
        shouldBecomeReference: true,
        actualPerformanceTier: "medium"
      }
    }
  });

  assert.equal(result.canApply, true);
  assert.equal(result.reference.tier, "featured");
  assert.equal(result.reference.notes, "原有精选备注");
  assert.equal(result.reference.selectedBy, "manual");
  assert.match(result.statusSummary, /当前参考状态：已启用 · 人工精选标杆/);
});

test("sample library calibration UI shows current reference status and wires retro reference application as an explicit action", async () => {
  const appJs = await fs.readFile(path.join(process.cwd(), "web/app.js"), "utf8");

  assert.match(appJs, /deriveSampleLibraryReferenceApplication/);
  assert.match(appJs, /function getSampleLibraryReferenceApplicationState\(/);
  assert.match(appJs, /data-action="apply-sample-library-reference-from-retro"/);
  assert.match(appJs, /data-role="sample-library-reference-application-status"/);
  assert.match(appJs, /referenceAction\?\.statusSummary/);
  assert.match(appJs, /if \(action === "apply-sample-library-reference-from-retro"\)/);
  assert.match(appJs, /applySampleLibraryReferenceFromRetro\(\)/);
  assert.match(appJs, /reference: applyState\.reference/);
});
