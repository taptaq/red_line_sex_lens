# Collection Type Unification Design

## Goal

Introduce a required single-select `collectionType` field as a first-class content attribute across the main workflow, so that detection, generation, sample curation, and benchmark maintenance all refer to the same collection label.

The feature should:

1. support the current predefined collection list
2. support lightweight custom collection creation
3. keep one shared source of truth for options
4. avoid turning every panel into a separate metadata system
5. slightly widen the main UI so long labels and content metadata can breathe
6. reduce unnecessary truncation so collection labels and related text are more fully visible

## Problem

The current workflow has no dedicated “collection / series” concept, even though the user’s content is clearly organized by recurring editorial collections.

That creates several issues:

- detection and generation cannot use collection context explicitly
- sample-library records cannot be grouped by collection
- benchmark samples cannot be tied back to the collection they represent
- any future style or performance analysis by collection would require retrofitting missing data

Because the user wants collection selection at content entry time, treating it as a later note or ad hoc tag would be too weak.

## Product Direction

`collectionType` should become a standard content field, similar in importance to `title`, `body`, `coverText`, and `tags`.

It should be:

- single-select
- required
- shared across the main workflow
- stored structurally, not hidden inside tags or notes

The product model becomes:

- each content item belongs to one primary collection
- collection options come from one shared option list
- downstream systems can display, filter, and use that field consistently

## In Scope

- add a required single-select `collectionType` field
- ship the user’s predefined collection list
- support custom collection creation
- add collection selection to:
  - content detection
  - generation workbench
  - sample-library create flow
  - sample-library base-content edit flow
  - benchmark sample create flow
- persist collection type in normalized content records
- display collection type in key list/detail views
- add lightweight collection filtering to sample-library and benchmark views
- pass collection type into analysis / generation context
- widen the main shell / key maintenance surfaces where needed so the added field does not worsen crowding
- improve text visibility for collection labels and nearby metadata instead of relying on aggressive clipping

## Out of Scope

- multi-select collections
- nested collection hierarchies
- per-collection style profiles
- per-collection benchmark harness routing
- bulk reclassification tools
- historical migration UI for old records beyond safe fallback normalization

## Canonical Collection Options

The initial predefined collection list is:

- `SBTI内太空愉悦档案`
- `双人联机计划`
- `内太空放映室`
- `脑洞+神评`
- `科普`
- `MBTI内太空愉悦档案`
- `疗愈指南`
- `身体探索`
- `伪装学大师`
- `造船手记`

Custom collections should be stored in the same shared options source and merged with the predefined list at read time.

## Data Model

## Field Definition

Introduce:

- `collectionType: string`

Rules:

- required for new form submissions in covered flows
- normalized as a trimmed string
- one content item can have only one collection type
- values must come from the merged collection options list

## Option Storage

Introduce one shared option store, such as `collection-types.json`, with this conceptual shape:

```json
{
  "custom": ["自定义合集A", "自定义合集B"]
}
```

The effective option list at runtime is:

- predefined collection list
- plus normalized custom collection list
- de-duplicated
- stable ordering with predefined items first

## Record Storage

The new field should be persisted wherever structured content is already stored, including:

- analyze payloads when saved downstream
- generated candidates / final drafts where relevant
- unified note-records based sample-library records
- benchmark samples

For older records without `collectionType`, the UI may display:

- `未分类合集`

But new writes through covered forms must require a valid collection selection.

## Global Layout Adjustment

Because this feature adds a new always-visible metadata field, the UI should gain a small amount of horizontal breathing room at the same time.

The intent is not a redesign. The intent is:

- a slightly wider overall working area
- better line fit for labels and meta pills
- fewer cases where text is clipped, squeezed, or wrapped too early

This should be treated as a supporting UX adjustment for the collection-type rollout.

## User Experience Design

## Detection Panel

Add a required collection selector to the content detection form.

Placement:

- alongside the main content inputs
- near tags / cover / other core metadata, not buried in advanced controls

Behavior:

- default placeholder such as `请选择合集类型`
- block submit when empty
- include a lightweight `新增合集` action next to the selector
- ensure the surrounding layout still reads comfortably after adding the new field

## Generation Workbench

Add a required collection selector to the generation form.

Placement:

- near `风格画像` and `主题`

Reason:

- collection choice is part of generation intent, not a post-hoc annotation

Behavior:

- required before generation
- passed into generation prompt context
- `新增合集` action available here too
- avoid narrowing existing `风格画像 / 主题 / 约束` fields more than necessary

## Sample Library

### Create Form

Add required collection selection to the sample-library create form.

### Base Content Detail Section

Add collection selection to the editable base content block.

### List and Detail Display

Display collection type in:

- left-side record cards
- detail header meta row

Collection labels should prefer full display over aggressive truncation whenever the container has room.

### Filtering

Add one lightweight `合集类型` filter to the sample-library toolbar.

This should be a compact single-select filter, not a complex faceted system.

## Benchmark Panel

### Create Form

Add required collection selection to the benchmark sample form.

### List Display

Display collection type in each benchmark sample card and mismatch summary where useful.

### Filtering

Add one `合集类型` filter to the benchmark toolbar.

This allows the user to inspect benchmark coverage by collection without adding a new reporting page.

The benchmark toolbar and cards should be allowed a bit more horizontal room if needed so the extra filter and collection labels do not create new overflow.

## Custom Collection Creation

## Interaction Model

Use one shared lightweight pattern:

- selector
- adjacent `新增合集` action
- inline small input when invoked
- save to shared collection options store
- refresh selectors after save

Do not create a separate admin page for collection management in this phase.

## Validation

- custom collection names are trimmed
- empty names are rejected
- duplicate names are ignored or treated as already existing
- saving a custom collection should immediately make it selectable in the current form

## Backend Design

## Shared Collection Options API

Add a small shared API for collection options:

- `GET /api/collection-types`
- `POST /api/collection-types`

Expected behavior:

- `GET` returns merged predefined + custom options
- `POST` validates and appends one custom option if new

## Request Payload Updates

Update relevant request handlers so that covered flows accept and persist `collectionType`.

At minimum:

- analyze-related downstream saves
- generate-note request payload
- sample-library create / patch
- review-benchmark create / patch if applicable

## Normalization

Collection type should be normalized early in request handling:

- trim string
- verify against available collection options
- reject missing or invalid values for required write paths

## Frontend Design

## Shared State

Introduce a single frontend source for available collection options, similar to the tag option pattern but simpler.

State should include:

- loaded option list
- current inline “add custom collection” visibility/input state where needed

## Shared Helpers

Add shared helpers for:

- rendering `<select>` options
- validating selection
- creating a custom collection
- refreshing option-dependent controls

## Width and Text Visibility Rules

When adjusting the UI for this feature:

- prefer widening shared containers over adding more truncation
- prefer `min-width: 0` and flexible grid tracks over fixed-width crowding
- allow collection labels to wrap naturally where appropriate
- avoid introducing new horizontal overflow in maintenance panels
- revisit meta rows, toolbar filters, and list cards touched by the new field so they remain readable

## Prompt / Model Context

## Detection Context

Pass `collectionType` into analysis / semantic review / cross-review input context where the system currently bundles content fields.

The first phase goal is contextual awareness, not model branching.

## Generation Context

Pass `collectionType` into generation prompt construction as part of the content brief.

This allows the model to understand editorial framing such as:

- whether the content belongs to a diary-like archive
- a dual-person interaction theme
- a science / education framing
- a commentary / reaction framing

## Display and Labeling

Where content cards already show meta pills or compact summaries, add collection type there if space allows.

Priority display points:

- sample-library record card
- sample-library detail header
- benchmark sample card
- generation result summary where relevant

Avoid cluttering every old legacy card in this phase.

## Testing

Add coverage for:

- collection option normalization and deduplication
- custom collection API behavior
- required validation on covered forms / endpoints
- sample-library persistence of `collectionType`
- benchmark persistence of `collectionType`
- frontend presence of collection selectors in detection / generation / sample-library / benchmark
- frontend filter wiring for sample-library and benchmark
- generation payload including `collectionType`
- layout assertions for widened/flexible containers touched by the new collection field where practical

## Rollout Notes

Older records may lack collection type. The UI should tolerate that and show a fallback label, but any new saves through updated forms should write a valid collection value.

This keeps the rollout safe while ensuring the dataset becomes consistently structured going forward.
