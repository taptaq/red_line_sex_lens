# 发布后复盘 Chips 选择化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the publish-retro free-text fields into preset multi-select chips plus manual supplement inputs, while keeping the saved field format backward-compatible with existing text records.

**Architecture:** Keep this as a frontend-only enhancement inside the existing sample-library calibration modal. The core logic will live in small browser-side helpers that (1) define chip presets, (2) parse existing text into selected chips plus leftover notes, and (3) merge user selections back into the current text fields when saving. The modal UI will remain in `web/app.js` and `web/styles.css`, following the existing calibration modal patterns.

**Tech Stack:** Vanilla JavaScript frontend, existing sample-library calibration modal flow, existing `node:test` UI regression suite

---

## File Structure

- Modify: `web/app.js`
  - Add chip preset definitions.
  - Add parse/serialize helpers for retro fields.
  - Render chip groups and supplement inputs in the calibration modal.
  - Read chip selections back into the existing payload fields on save.
- Modify: `web/styles.css`
  - Add chip group layout, selected state, and compact helper styling.
- Modify: `test/success-generation-ui.test.js`
  - Lock rendering, selection state, text-to-chip parsing, and save serialization behavior.

## Task 1: Add retro chip parsing and serialization helpers

**Files:**
- Modify: `web/app.js`
- Test: `test/success-generation-ui.test.js`

- [ ] **Step 1: Write the failing test**

Add a targeted regression that proves an existing text value can be split into selected chips plus leftover notes.

```js
test("retro chip helpers split existing text into selected chips and supplement text", async () => {
  const { appJs } = await readFrontendFiles();
  const helperSource = appJs.match(/function\s+parseSampleLibraryRetroChipField\s*\([\s\S]*?\n}\n/)?.[0] || "";

  const helpers = new Function(
    `${helperSource}
return { parseSampleLibraryRetroChipField };`
  )();

  const parsed = helpers.parseSampleLibraryRetroChipField(
    "标题偏弱、合集不匹配、标签不准\n\n补充：封面与正文承接太弱。",
    ["标题偏弱", "合集不匹配", "标签不准", "风险判断偏差"]
  );

  assert.deepEqual(parsed.selected, ["标题偏弱", "合集不匹配", "标签不准"]);
  assert.match(parsed.supplement, /封面与正文承接太弱/);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
node --test test/success-generation-ui.test.js
```

Expected: fail because the helper does not exist yet.

- [ ] **Step 3: Implement the minimal helper logic**

Add focused helpers in `web/app.js`:

```js
const sampleLibraryRetroChipPresets = {
  missReason: ["低表现", "标题偏弱", "开头不够抓人", "正文过长", "正文信息密度不稳", "标签不准", "合集不匹配", "风险判断偏差", "参考样本不够贴", "发布时间影响"],
  validatedSignals: ["标题结构", "开头切口", "合集匹配", "标签匹配", "风格稳定", "情绪共鸣", "互动点明确", "风险预判准确", "参考样本有效"],
  invalidatedSignals: ["标题判断失准", "标签判断失准", "合集判断失准", "风险偏高估", "风险偏低估", "表现高估", "表现低估", "正文长度失准", "互动预期失准"],
  ruleImprovementCandidate: ["同类标题结构可提权", "同类合集可提权", "情绪共鸣标签可提权", "风险词权重需上调", "风险词权重需下调", "正文长度阈值需调整", "标签映射需补充", "参考样本权重需调整"]
};

function parseSampleLibraryRetroChipField(value = "", presetOptions = []) {
  const raw = String(value || "").trim();
  const selected = [];
  let remaining = raw;

  for (const option of presetOptions) {
    if (remaining.includes(option)) {
      selected.push(option);
      remaining = remaining.replaceAll(option, "");
    }
  }

  remaining = remaining
    .replace(/[、,，]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return {
    selected: [...new Set(selected)],
    supplement: remaining
  };
}

function serializeSampleLibraryRetroChipField(selected = [], supplement = "") {
  const chipText = (Array.isArray(selected) ? selected : []).map((item) => String(item || "").trim()).filter(Boolean).join("、");
  const noteText = String(supplement || "").trim();

  if (chipText && noteText) {
    return `${chipText}\n\n${noteText}`;
  }

  return chipText || noteText;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run:

```bash
node --test test/success-generation-ui.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/app.js test/success-generation-ui.test.js
git commit -m "feat: add retro chip parsing helpers"
```

## Task 2: Render chip groups in the calibration modal

**Files:**
- Modify: `web/app.js`
- Modify: `web/styles.css`
- Test: `test/success-generation-ui.test.js`

- [ ] **Step 1: Write the failing UI test**

Add a regression that proves the calibration modal now renders chip groups for the four target retro fields.

```js
test("calibration modal renders retro multi-select chip groups", async () => {
  const { appJs, styles } = await readFrontendFiles();

  assert.match(appJs, /sampleLibraryRetroChipPresets/);
  assert.match(appJs, /偏差原因/);
  assert.match(appJs, /被验证信号/);
  assert.match(appJs, /被推翻信号/);
  assert.match(appJs, /规则优化候选/);
  assert.match(styles, /\.sample-library-retro-chip-group/);
  assert.match(styles, /\.sample-library-retro-chip/);
  assert.match(styles, /\.sample-library-retro-chip\.is-selected/);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
node --test test/success-generation-ui.test.js
```

Expected: fail because the modal still uses plain free-text-only inputs.

- [ ] **Step 3: Implement the modal rendering**

Replace the four plain text-only sections with:

- chip row / chip grid
- supplement textarea or text input below each group

Keep labels and field meaning unchanged. The chip UI should be calm and compact, not dashboard-heavy.

- [ ] **Step 4: Run the test to verify it passes**

Run:

```bash
node --test test/success-generation-ui.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/app.js web/styles.css test/success-generation-ui.test.js
git commit -m "feat: render retro chip selectors in calibration modal"
```

## Task 3: Preserve backward-compatible save behavior

**Files:**
- Modify: `web/app.js`
- Test: `test/success-generation-ui.test.js`

- [ ] **Step 1: Write the failing save-behavior test**

Add a regression that proves selected chips and supplement text serialize back into the existing text fields with stable formatting.

```js
test("retro chip selections serialize back into the existing text fields", async () => {
  const { appJs } = await readFrontendFiles();
  const helperSource = appJs.match(/function\s+serializeSampleLibraryRetroChipField\s*\([\s\S]*?\n}\n/)?.[0] || "";

  const helpers = new Function(
    `${helperSource}
return { serializeSampleLibraryRetroChipField };`
  )();

  const serialized = helpers.serializeSampleLibraryRetroChipField(
    ["标题偏弱", "合集不匹配"],
    "补充：封面与正文承接太弱。"
  );

  assert.equal(serialized, "标题偏弱、合集不匹配\n\n补充：封面与正文承接太弱。");
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
node --test test/success-generation-ui.test.js
```

Expected: fail until save serialization is wired.

- [ ] **Step 3: Implement the save wiring**

When reading calibration modal payload:

- gather selected chips for each of the four target fields
- gather supplement text
- serialize back to the existing field values
- keep backward compatibility for records that never use chips

- [ ] **Step 4: Run the test to verify it passes**

Run:

```bash
node --test test/success-generation-ui.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/app.js test/success-generation-ui.test.js
git commit -m "feat: save retro chip selections back to existing fields"
```

## Self-Review

- Spec coverage:
  - chip-based multi-select for the four target fields: covered in Task 2
  - manual supplement input: covered in Task 2 and Task 3
  - old text compatibility: covered in Task 1 and Task 3
  - stable save formatting: covered in Task 3

- Placeholder scan:
  - no TBD / TODO / later placeholders
  - each task includes concrete file paths, commands, and expected behavior

- Type consistency:
  - the same preset names and field names are used across helper parsing, modal rendering, and serialization
  - all persistence still targets the existing text fields instead of inventing a parallel schema

