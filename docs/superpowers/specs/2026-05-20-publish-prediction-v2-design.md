# Publish Prediction V2 Design

## Goal

Replace the current "publish prefill" behavior with a more evidence-driven prediction flow that feels meaningfully different across records instead of producing mostly template-like outputs.

The new version should still prefill the existing publish-prep fields, but it must also explain why the prediction was made by showing the historical evidence behind it.

## Scope

This version uses only data the project already owns:

- current draft / record content
- note records with actual publish outcomes
- existing calibration snapshots
- sample-library records
- existing approved reference samples
- existing feedback / retro outcomes where they help explain the record

This version does **not** introduce:

- a new external model
- scheduled prediction jobs
- a new standalone prediction service
- embeddings or vector search

The main change is the quality of the prediction and the explanation, not the presence of a brand-new AI feature.

## Current Problem

The current prefill behavior is useful for filling fields, but it often feels too similar across different records because it is mostly a rule-shaped mapping of the current draft state.

It tends to answer:

- "What are the fields?"
- not "What evidence supports this judgment?"

That means:

- two different records can end up with very similar prediction outputs
- the user cannot easily tell why the system judged a record as risky, safe, likely to pass, or likely to perform well
- the feature acts more like a form helper than a real prediction aid

## Design Summary

Prediction V2 has three layers:

1. **Historical sample layer**
   - use past records with known outcomes
   - use existing sample-library reference records
   - optionally use existing retro/feedback outcomes when they help explain the pattern

2. **Prediction layer**
   - compute the existing prediction fields more deliberately
   - use similarity and outcome evidence instead of only the current draft state

3. **Evidence layer**
   - show the user why the prediction was made
   - list matched historical samples
   - summarize key similar signals
   - call out the main risk or performance clues

The existing prefill behavior remains, but it becomes evidence-backed instead of purely template-backed.

## Data Sources

The prediction engine should use these signals in combination:

- title
- body
- cover text
- tags
- collection type
- current analysis verdict
- current rewrite result if available
- published outcome of historical note records
- existing calibration snapshots on records
- sample-library records that already passed validation
- reference samples that are considered qualified
- retro / feedback outcomes when they strengthen the explanation

## Prediction Pipeline

### 1. Build the current prediction target

Read the current working record or draft state and normalize:

- title
- body
- cover text
- tags
- collection type
- current risk signals
- current style / generation hints if already present

### 2. Gather historical candidates

Search the local data set for records that are similar enough to explain the current one.

Candidate matching should prefer:

- shared tags
- similar collection type
- similar title phrases
- similar body phrases
- similar publish-risk patterns
- similar outcome tiers

### 3. Score and rank evidence

Rank candidate evidence with a cheap deterministic scoring pass:

- title similarity
- body similarity
- tag overlap
- collection type match
- publish outcome match
- risk pattern match

The goal is not perfect classification. The goal is to surface the most convincing evidence that supports a stable prediction.

### 4. Emit the prediction

The prediction should still output the familiar fields:

- `predictedStatus`
- `predictedRiskLevel`
- `predictedPerformanceTier`
- `confidence`
- `reason`

In addition, it should output evidence fields:

- `evidenceSamples`
- `evidenceSignals`
- `evidenceSummary`

## Evidence Rules

The evidence layer should make the prediction explainable:

- `evidenceSamples`
  - short list of matched historical records
  - include title and ID

- `evidenceSignals`
  - the exact signals that matched
  - for example: title pattern, tag overlap, risk trigger, performance resemblance

- `evidenceSummary`
  - one short sentence explaining the overall judgment

If evidence is weak:

- confidence should stay low
- the system should avoid overconfident hard judgments
- the UI should show that the evidence is thin rather than pretending certainty

## UI

### Main panel

The existing publish-prep area remains the entry point.

The prefill controls should still populate the current prediction fields, but the UI should also show an evidence panel beside or below them.

### Evidence panel

The evidence panel should show:

- matched historical samples
- matching signals
- the main reason for the prediction
- a short confidence note

### UX expectation

The user should be able to answer:

- "Why did it predict this?"
- "Which old records did it match?"
- "What part of my draft caused the risk or performance guess?"

without leaving the current modal/page.

## Prefill Behavior

The existing prefill behavior should stay conservative:

- keep current values when the user already typed something useful
- only fill empty fields automatically
- do not overwrite user input blindly
- show a short confirmation when prefill happens

The prediction fields should still populate the publish-prep section, but now the prediction should feel grounded in evidence instead of just a rule outcome.

## Storage

The prediction payload may be stored alongside the existing calibration data on the record.

Recommended shape:

- keep `calibration.prediction` for the main prediction fields
- add `evidenceSamples`, `evidenceSignals`, and `evidenceSummary` to that prediction object, or a sibling evidence object if needed for clarity

The exact shape should remain backward-compatible with existing records.

## Implementation Boundaries

Likely module responsibilities:

- `src/calibration-replay.js`
  - reuse or extend the replay logic for historical comparison

- `src/note-records.js`
  - keep prediction data compatible with record merging / normalization

- `web/app.js`
  - render the evidence panel and keep the prefill UX

- `src/server.js`
  - expose any data needed for the evidence panel if the client cannot derive it locally

The feature should stay within the current sample-library / calibration flow instead of becoming a separate app area.

## Non-Goals

Not in this version:

- training a new classifier
- live scheduled auto-prediction
- external similarity services
- embeddings / vector DB
- a separate prediction page
- automatic overwrite of user-entered fields

## Testing

Add tests that prove:

- predictions prefer evidence from historical samples over generic template-like fallback
- low-evidence records stay low confidence
- evidence samples are preserved and surfaced
- existing prefill fields still populate safely without overwriting user input
- old records remain readable after the schema gains evidence fields

