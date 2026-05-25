# Sample Library Account Planner Design

## Goal

Add an account-level retrospective and next-post planning flow inside `sample library` that turns:

- local note records the project already owns
- publish / calibration / retro outcomes already stored on those records
- manually imported external Markdown / CSV comparison samples

into:

- a short account retrospective summary
- 3-5 `Next Post Planner` cards
- direct prefill actions into the existing generation workbench

This feature should help answer two practical questions in one place:

- "Why did some recent content perform better than others?"
- "What should the next post be, and how should it be framed?"

## Scope

This version is intentionally local-first and non-automated.

It uses:

- `sample library` note records
- existing publish metrics and lifecycle states
- existing calibration / retro data
- manual Markdown / CSV imports for external comparison samples
- an optional text-model summary layer

It does **not** use:

- automatic Xiaohongshu browsing
- scheduled scraping
- login-state collection
- background polling
- automated platform interaction of any kind

The feature is designed to stay on the "manual evidence in, structured planning out" side of the boundary.

## Product Shape

The feature lives inside `sample library`, not as a standalone dashboard and not inside generation as a first-class root flow.

The user journey is:

1. open `sample library`
2. optionally import external comparison samples with Markdown / CSV
3. run account-level retrospective
4. review a short summary of strengths, gaps, and next move
5. inspect 3-5 planner cards
6. choose one card and prefill the generation workbench

The output is intentionally biased toward action rather than long-form reporting.

## Why This Lives In Sample Library

This feature is much closer to learning, calibration, and reference accumulation than to pure generation.

`sample library` already owns:

- the canonical learning-sample records
- publish outcome history
- calibration predictions and retro fields
- the reference and evidence layer used by related flows

That makes it the natural home for retrospective logic.

The generation workbench remains the execution surface for writing, but `sample library` remains the evidence surface for deciding what to write next.

## Core Design

### Two-layer evidence model

The planner uses two evidence layers with different priority:

1. **Local account evidence**
   - records already saved in `sample library`
   - publish metrics
   - publish status
   - calibration / retro outcomes

2. **External comparison evidence**
   - manually imported Markdown / CSV samples
   - used only as supporting comparison material

Local account evidence should always dominate the conclusion. External samples widen perspective, but should not overwrite the account’s own signals.

### Summary-first, cards-second

The planner produces:

- a compact retrospective summary
- planner cards derived from that summary and evidence base

The cards are the primary output because they can immediately feed the next stage of work.

### Model summary with heuristic fallback

The planner uses a hybrid strategy:

- try to generate a structured retrospective summary and planner cards through a text model
- if the model returns partial output or no usable cards, keep the summary when possible
- fill missing cards from deterministic local heuristics

This prevents the feature from failing hard when model output is incomplete while still letting the model add real synthesis value.

## Analysis Dimensions

The current retrospective logic is organized around five stable dimensions:

1. **Performance layering**
   - separate stronger recent posts from weaker or average ones using current publish-state and metric logic

2. **Topic / angle distribution**
   - identify which topic lines and angles appear repeatedly in stronger records

3. **Title and structure patterns**
   - infer reusable title formulas and body shapes from strong samples

4. **Strategy gaps**
   - highlight underused or weakly performing areas

5. **Next-move opportunity**
   - compress the above into a short next-step summary and planner cards

The first version keeps these dimensions compact rather than trying to build a full analytics dashboard.

## Planner Card Contract

Each planner card is designed for direct handoff into generation.

### Display fields

- `planId`
- `planTitle`
- `estimatedValue`
- `whyThisWorks`
- `titleFormula`
- `bodyStructure`
- `riskBoundary`
- `sourceSignals`
- `tags`

### Prefill fields

- `prefillBriefing`
- `prefillReferenceTitle`
- `prefillMaterialText`
- `prefillCollectionType`
- `prefillTone`

The contract intentionally mirrors the existing generation prefill style already used by theme inspiration cards.

## Prefill Behavior

Planner cards prefill the existing generation workbench instead of introducing a second writing surface.

The current rules are conservative:

- only write `briefing` when it is empty
- only write `referenceTitle` when it is empty
- only write `collectionType` when it is empty
- append `prefillMaterialText` instead of replacing material text
- merge planner tags into `tagReferences`
- append risk boundaries and source signals into material text as lightweight planning context

This keeps the planner aligned with the user’s existing draft rather than destructively replacing it.

## External Import Design

The first version supports:

- `.md`
- `.markdown`
- `.csv`

Markdown imports are treated as lightweight note-like examples.

CSV imports are treated as structured comparison rows and can include fields such as:

- `title`
- `body`
- `tags`
- `collectionType`
- `likes`
- `favorites`
- `comments`
- `views`
- `shares`

The import layer is intentionally permissive and aimed at quick manual comparison rather than perfect schema enforcement.

## UI Design

The planner panel sits above the existing daily sample-library controls.

It contains:

- an external import button
- a run-analysis button
- a short import summary
- a retrospective result area
- a detail area for the selected planner card

The result area shows:

- retrospective next-move line
- top strengths
- top gaps
- when available, model trace information such as provider / model / route label

The detail area shows:

- title formula
- structure
- risk boundaries
- source signals
- one-click prefill

The layout follows the same editorial card language already used by sample library and theme inspiration surfaces.

## Model Trace

When a model produces the retrospective summary, the UI should show a light, non-dominant trace such as:

- provider
- model
- route label

This is not meant as a user-facing analytics feature. It exists to help trust, debugging, and iterative prompt tuning without turning the feature into a model dashboard.

## Non-Automation Boundary

This feature is intentionally designed to avoid the automated-platform boundary that earlier connector work risked crossing.

It does not:

- browse Xiaohongshu automatically
- scrape recommendation feeds
- collect account metrics unattended
- log into any external platform

Instead, it assumes that:

- local records are already present in the project
- any external examples are manually imported

That boundary is part of the design, not just an implementation shortcut.

## References / Inspirations

### External inspirations

- `xiaohongshu-ops-skill`
  - inspired the overall task split of account analysis leading directly into next-content planning

- `redbook`
  - inspired the idea of comparing higher-performing and lower-performing content patterns and turning them into reusable planning signals

- general social-media-agent / prompt-workflow repositories
  - inspired the structured input / structured JSON output approach instead of a monolithic free-form prompt

### Internal inspirations

- existing `sample library` record model
  - provides the strongest evidence base through publish, calibration, and retro fields

- existing `theme inspiration` flow
  - inspired the architecture of model summary -> normalized cards -> selection -> prefill

- existing generation workbench prefill logic
  - inspired the planner card contract and conservative merge behavior

## What Is Custom Here

The current implementation is not a direct port of an external repo.

The most custom parts are:

- local-records-first, external-samples-second weighting
- model-summary-plus-heuristic-fallback architecture
- planner cards specialized for this project’s `sample library -> generation workbench` loop
- explicit non-automation boundary as part of the feature definition

## Future Extensions

Natural future iterations include:

- richer account-level pattern summaries
- better CSV / Markdown field tolerance and error messages
- stronger card scoring logic
- more explicit evidence breakdown in the UI
- optional ranking of planner cards against current generation context

The first version should stay focused on helping the user choose the next post direction and move directly into writing.
