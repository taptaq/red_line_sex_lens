# XHS Prohibited Words Integration Design

## Goal

Integrate the `multi-wordcheck` Xiaohongshu prohibited-words capability into the existing content detection flow so that:

- local rule analysis still runs as today
- an external prohibited-words check runs as a second evidence source
- both signals influence the final detection verdict
- external-check failure does not block local analysis, but the result is explicitly marked as incomplete

The first version is Xiaohongshu-only and text-only.

## Scope

This version adds:

- a dedicated backend integration for Xiaohongshu prohibited-word lookup
- result normalization into the existing `analyzePost()` payload
- verdict escalation based on external prohibited-word severity
- UI expansion inside the existing `规则检测` result card
- explicit incomplete-result signaling when the external check fails

This version does not add:

- WeChat / Douyin platform switching
- file, image, or link detection input
- automatic rewrite based directly on external replacement text
- persistence of external prohibited-word results into sample history
- any standalone prohibited-word dashboard

## Product Intent

This feature is not a replacement for the existing analyzer.

It is a second evidence layer.

The current local analyzer is still valuable because it already understands:

- custom lexicon
- seed lexicon
- whitelist softening
- false-positive evidence
- reference-sample support
- local contextual rules

The external prohibited-word service should complement that by catching vocabulary-level risk with an external official-style library.

## UX Shape

The external prohibited-word result should not become a separate new panel.

Instead, it should be merged into the existing `规则检测` result area because the user asked for a single consolidated rule judgment experience.

Within that card, add two new subsections:

1. `外部违禁词摘要`
   - external status
   - hit count
   - whether the result is complete or incomplete
   - whether the external result raised the overall verdict

2. `外部违禁词命中与建议`
   - hit words
   - replacement suggestions
   - optimized text if available

The local rule result remains primary in layout order; the external result is additional but clearly visible.

## Input Boundary

First version input is only:

- current Xiaohongshu title/body/cover/tags text already used by content detection

No new upload UI is needed for this version.

The external request should be built from the same current content payload already being analyzed.

## Backend Design

### New dedicated integration module

Add a focused integration module for prohibited-word checking.

Responsibilities:

- call the Redfox `sensitiveWordSearch` endpoint
- force platform = `xiaohongshu`
- normalize response shape into a stable internal structure
- surface failure state without throwing away the whole analysis

Suggested responsibility split:

- transport and auth handling
- response normalization
- severity mapping
- summary extraction for UI

This should stay separate from the main analyzer so the core analyzer logic does not become transport-heavy.

### Auth and endpoint rules

Default endpoint:

- `https://redfox.hk/story/api/cozeSkill/sensitiveWordSearch`

Auth source:

- `REDFOX_API_KEY`

Optional override:

- `PROHIBITED_WORD_API_URL`

This mirrors the skill contract and keeps the integration deployable behind a gateway later.

## Normalized Result Contract

The analyzer should receive a normalized payload like:

```json
{
  "status": "ok",
  "platform": "xiaohongshu",
  "hitCount": 2,
  "severity": "manual_review",
  "highlightedText": "...",
  "suggestions": [
    {
      "term": "绝对词",
      "replacement": "更稳表达",
      "reason": "避免极限化宣传"
    }
  ],
  "optimizedText": "...",
  "raw": {}
}
```

Error case:

```json
{
  "status": "error",
  "platform": "xiaohongshu",
  "message": "外部违禁词检测失败",
  "hitCount": 0,
  "severity": "unknown"
}
```

Unavailable-but-not-run is different from error. This feature should aim to run by default in content detection. If it cannot run, it should return `error`, not silently disappear.

## Severity Mapping

The external service likely returns word-level results rather than the project’s native verdicts.

We need a deterministic mapping into project severity.

Recommended first-version mapping:

- low-risk prohibited terms → `observe`
- medium-risk prohibited terms → `manual_review`
- high-risk / hard-banned terms → `hard_block`

If the upstream response already includes severity or category, map from that.

If it does not, define a small local severity mapper based on:

- explicit upstream category labels
- fallback term categories
- whether the optimized suggestion implies ad law / extreme claim / medical / illegal guidance risk

This mapper should be conservative and explainable.

## Verdict Merge Rules

The final analysis verdict should be the stricter of:

- current local analyzer verdict
- external prohibited-word severity verdict

Examples:

- local = `pass`, external = `observe` → final = `observe`
- local = `manual_review`, external = `hard_block` → final = `hard_block`
- local = `hard_block`, external = `observe` → final = `hard_block`

External prohibited-word hits should not bypass existing hard-block logic.

The result should also expose whether the external layer changed the final verdict.

Suggested field:

```json
{
  "externalSensitiveWords": {
    "status": "ok",
    "raisedVerdict": true,
    "severity": "manual_review"
  }
}
```

## Failure Semantics

This part is critical because the user explicitly chose option 3.

When the external prohibited-word check fails:

- do not fail the entire `analyzePost()` request
- do not remove the local analysis result
- mark the overall rule analysis as incomplete
- clearly expose the failure message in the rule result card

Suggested flags in analysis payload:

```json
{
  "externalSensitiveWords": {
    "status": "error",
    "message": "外部违禁词检测失败：..."
  },
  "analysisCompleteness": {
    "localRules": "ok",
    "externalSensitiveWords": "error",
    "isComplete": false
  }
}
```

The UI should render this as:

- `结果不完整：外部违禁词检测失败`

This is better than pretending the result is complete.

## UI Integration in Rule Detection Card

Inside the existing `规则检测` result card, add:

### Summary row additions

- external status pill
- hit count pill
- incomplete-result pill when failed
- optional “外部检测抬高了结论” note

### New subsection 1: 外部违禁词摘要

Show:

- platform (`小红书`)
- hit count
- mapped severity
- incomplete reason if failed

### New subsection 2: 外部违禁词命中与建议

Show when available:

- highlighted source text or short excerpt
- table/list of hit term → replacement → reason
- optimized version if upstream returns one

If no hits:

- show `未命中外部违禁词`

If failed:

- show failure text, not fake success text

## Analyzer Integration Point

The integration belongs inside or immediately around `analyzePost()`.

Recommended sequence:

1. run existing local analyzer logic
2. run external prohibited-word check in parallel with retrieval where safe, or after local hit synthesis if simpler
3. normalize external result
4. merge verdicts and suggestions
5. annotate completeness state
6. return unified payload

Keep the existing analyzer output stable where possible so unrelated UI does not break.

## Data Contract Additions

Add fields to the analysis payload rather than replacing existing ones.

Suggested new top-level fields:

- `externalSensitiveWords`
- `analysisCompleteness`

Suggested additions to reasons/suggestions when external hits exist:

- include external sensitive-word reasons in the final reason list
- include replacement-direction suggestions in the suggestion list

This keeps downstream review panels and debug flows informative.

## Testing Scope

Add focused tests for:

- external prohibited-word success path merged into local analysis
- external prohibited-word severity raising final verdict
- local hard-block still winning when stricter
- external failure preserving local analysis while marking incompleteness
- no-hit path keeping local verdict unchanged
- UI rule-detection rendering of:
  - external summary
  - hit suggestions
  - incomplete-result message

Use mock transport results for the external service to keep tests stable.

## Risks

### Double-counted noise

If external term hits are naively appended to local hits, the UI may become repetitive. Keep local rule hits and external prohibited-word hits visually separated.

### Over-escalation

If severity mapping is too aggressive, the final verdict will become noisy. First version should err on conservative but explainable thresholds.

### User confusion on failure

If the external service fails and we do not clearly mark incompleteness, users will assume the result is fully trustworthy. The incomplete flag must be visible.

## Recommendation

Ship this as a Xiaohongshu-only external evidence layer inside the existing rule-detection card, with strict verdict merging and explicit incomplete-result semantics.

That gives immediate value without fragmenting the UI or destabilizing the current analyzer architecture.
