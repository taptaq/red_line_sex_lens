import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

import {
  applySampleLibraryAccountPlannerPrefill,
  getSelectedSampleLibraryAccountPlannerCard,
  renderSampleLibraryAccountPlannerResult
} from "../web/account-planner-view.js";

test("sample library exposes account planner panel and app wiring", async () => {
  const [indexHtml, appJs, styles] = await Promise.all([
    fs.readFile(path.join(process.cwd(), "web/index.html"), "utf8"),
    fs.readFile(path.join(process.cwd(), "web/app.js"), "utf8"),
    fs.readFile(path.join(process.cwd(), "web/styles.css"), "utf8")
  ]);

  assert.match(indexHtml, /id="sample-library-account-planner-panel"/);
  assert.match(indexHtml, /id="sample-library-external-samples-button"/);
  assert.match(indexHtml, /id="sample-library-account-planner-import-input"/);
  assert.match(indexHtml, /id="sample-library-account-planner-run"/);
  assert.match(indexHtml, /id="sample-library-account-planner-result"/);
  assert.match(indexHtml, /id="sample-library-external-samples-modal"/);
  assert.match(indexHtml, /id="sample-library-external-samples-modal-content"/);
  assert.match(appJs, /sampleLibraryAccountPlannerParseApi/);
  assert.match(appJs, /sampleLibraryAccountPlannerAnalyzeApi/);
  assert.match(appJs, /sampleLibraryExternalSamplesApi/);
  assert.match(appJs, /from "\.\/account-planner-view\.js"/);
  assert.match(styles, /\.sample-library-account-planner\b/);
  assert.match(styles, /\.sample-library-external-samples-modal\b/);
  assert.match(styles, /\.sample-library-account-planner-card\b/);
});

test("getSelectedSampleLibraryAccountPlannerCard prefers explicit selection and falls back to first card", () => {
  const cards = [{ planId: "plan-1" }, { planId: "plan-2" }];

  assert.deepEqual(getSelectedSampleLibraryAccountPlannerCard(cards, "plan-2"), { planId: "plan-2" });
  assert.deepEqual(getSelectedSampleLibraryAccountPlannerCard(cards, ""), { planId: "plan-1" });
  assert.equal(getSelectedSampleLibraryAccountPlannerCard([], ""), null);
});

test("applySampleLibraryAccountPlannerPrefill keeps existing briefing and appends planner evidence safely", () => {
  const events = [];
  const fields = {
    briefing: { value: "已有一句话需求" },
    materialText: { value: "已有素材" },
    referenceTitle: { value: "" },
    collectionType: { value: "" },
    tagReferences: { value: "旧标签" }
  };

  applySampleLibraryAccountPlannerPrefill(
    {
      prefillBriefing: "新的复盘建议需求",
      prefillReferenceTitle: "为什么结束后会突然很空？",
      prefillMaterialText: "结构重点：反常识提问 -> 情绪解释 -> 正常化安抚。",
      prefillCollectionType: "科普",
      tags: ["情绪反应", "身体探索"],
      riskBoundary: ["避免病理化", "不做医疗诊断"],
      sourceSignals: ["本地高表现记录 1 条", "外部对照样本 1 条"]
    },
    {
      readFieldValue(fieldName) {
        return fields[fieldName]?.value || "";
      },
      writeFieldValue(fieldName, nextValue) {
        fields[fieldName].value = nextValue;
        events.push([fieldName, nextValue]);
      },
      appendMaterialText(nextText) {
        fields.materialText.value = `${fields.materialText.value}\n\n${nextText}`;
        events.push(["materialText", fields.materialText.value]);
      },
      splitCSV(value) {
        return String(value || "")
          .split(/[，,、]/)
          .map((item) => item.trim())
          .filter(Boolean);
      },
      joinCSV(items = []) {
        return items.join(", ");
      },
      uniqueStrings(items = []) {
        return [...new Set(items.map((item) => String(item || "").trim()).filter(Boolean))];
      }
    }
  );

  assert.equal(fields.briefing.value, "已有一句话需求");
  assert.equal(fields.referenceTitle.value, "为什么结束后会突然很空？");
  assert.equal(fields.collectionType.value, "科普");
  assert.equal(fields.tagReferences.value, "旧标签, 情绪反应, 身体探索");
  assert.match(fields.materialText.value, /结构重点：反常识提问/);
  assert.match(fields.materialText.value, /边界提醒：避免病理化；不做医疗诊断/);
  assert.match(fields.materialText.value, /参考来源：本地高表现记录 1 条；外部对照样本 1 条/);
  assert.equal(events.length > 0, true);
});

test("renderSampleLibraryAccountPlannerResult shows model trace when available", () => {
  const nodes = {
    "sample-library-account-planner-result": { innerHTML: "" },
    "sample-library-account-planner-detail": { innerHTML: "" }
  };

  renderSampleLibraryAccountPlannerResult(
    {
      loading: false,
      summary: {
        strengths: ["轻科普解释路线稳定"],
        gaps: ["关系沟通角度偏少"],
        nextMove: "先补一个关系沟通切口。"
      },
      cards: [
        {
          planId: "plan-1",
          planTitle: "继续放大情绪解释路线",
          estimatedValue: "high",
          whyThisWorks: "最近高表现内容更集中在轻解释路线。",
          titleFormula: "反常识提问 + 解释原因 + 安抚落点",
          bodyStructure: ["先抛问题", "解释原因"],
          riskBoundary: ["避免病理化"],
          sourceSignals: ["本地高表现记录 1 条"],
          tags: ["情绪反应"],
          prefillBriefing: "写一篇轻松科普，解释为什么结束后会突然很空。",
          prefillReferenceTitle: "为什么结束后会突然很空？",
          prefillMaterialText: "结构重点：反常识提问 -> 解释原因。",
          prefillCollectionType: "科普",
          prefillTone: "温和"
        }
      ],
      selectedPlanId: "plan-1",
      modelTrace: {
        provider: "mock",
        model: "mock-account-planner",
        route: "mock-route",
        routeLabel: "Mock Route",
        attemptedRoutes: ["mock-route"]
      }
    },
    {
      byId(id) {
        return nodes[id] || null;
      },
      escapeHtml(value) {
        return String(value || "");
      }
    }
  );

  assert.match(nodes["sample-library-account-planner-result"].innerHTML, /模型总结：mock \/ mock-account-planner/);
  assert.match(nodes["sample-library-account-planner-result"].innerHTML, /Mock Route/);
  assert.match(nodes["sample-library-account-planner-detail"].innerHTML, /继续放大情绪解释路线/);
});
