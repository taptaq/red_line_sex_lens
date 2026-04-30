# Sample Library Focus Refactor Design

## Goal

Reduce the mental overhead of the current sample-library area by collapsing multiple overlapping creation paths into one clear primary workflow, while also preparing the codebase for backend/frontend deduplication.

This refactor focuses on:

- one primary entry point for creating sample records
- a list-first maintenance layout that makes the current library state obvious
- treating `reference` and `lifecycle` as attributes of one unified note record
- reducing repeated backend CRUD patterns and repeated frontend rendering patterns around the sample-library flow

## Problem

Even after moving `参考样本 / 生命周期 / 风格画像` under one top-level `样本库` tab, the user still sees multiple concepts and entry points that feel like separate systems:

- `参考样本` still behaves like its own input system
- `生命周期` still behaves like a separate maintenance system
- the UI encourages users to think in terms of “which area do I go to?” instead of “which record am I updating?”
- backend handlers for `success-samples` and `note-lifecycle` still repeat the same list/create/delete structure with only small differences
- frontend rendering for sample-library lists is still split into several parallel implementations

The result is not just duplicated code. It also weakens the product focus:

- too many entry points
- too many parallel CRUD surfaces
- too much uncertainty about the intended operating path

## Product Direction

The sample-library area should shift from “multiple feature panels” to “one record workspace”.

The core mental model becomes:

1. Create one sample record
2. Save basic content first
3. Decide whether it should become:
   - a reference sample
   - a lifecycle-tracked record
   - both
4. Continue enriching the same record over time

This matches the current `note-records` storage model and gives the user a much clearer path.

## In Scope

- Refactor the `样本库` UI into a single primary workflow
- Replace separate creation-first patterns for `参考样本` and `生命周期` with one creation entry point
- Reorganize the sample-library page into list-first browsing plus detail editing
- Introduce shared server-side helpers for sample-library CRUD handlers
- Introduce shared frontend helpers for sample-library list rendering and selection flow
- Preserve existing API contracts for:
  - `/api/success-samples`
  - `/api/note-lifecycle`
- Keep `style-profile` attached to the sample-library area, but reposition it as a consumer of high-quality reference records rather than a peer data-entry mode

## Out of Scope

- Merging `review-benchmark` into `note-records`
- Changing false-positive log workflows
- Changing rewrite-pairs workflows
- Replacing the existing compatibility APIs with a brand-new canonical public API
- Adding bulk import, mass-edit, or advanced analytics to the sample-library area
- Reworking style-profile logic beyond the minimum UI adaptation needed for the new layout

## User Experience Design

## Top-Level Structure

`样本库` remains a top-level area in the data maintenance console.

Inside `样本库`, the page should no longer lead with three equal tab peers for `参考样本 / 生命周期 / 风格画像`.

Instead, the page should be organized as:

- primary action header
- left-side record list
- right-side record detail workspace
- separate style-profile block that consumes reference records

## Primary Action

The sample-library area should expose one dominant button:

- `新增样本记录`

This is the only primary creation entry point in the sample-library workspace.

Legacy helper actions such as “从当前检测填充” or “从当前改写填充” may remain, but they should conceptually mean:

- create a new sample record from the current content

They should no longer reinforce the idea that the user is creating a separate success-sample entity.

## Page Layout

The default layout should be list-first.

### Left Column

The left column is the library navigator. It should contain:

- a simple search input for `标题 / 标签`
- a compact status filter
- the record list

### Right Column

The right column is the active record workspace. It should show the currently selected record and allow the user to enrich it progressively.

This layout is preferred over a detail-first layout because the current problem is library sprawl and operational ambiguity, not insufficient focus on a single edit form.

## Left Column Filters

Keep filters intentionally small.

Required filters:

- `全部`
- `待补全`
- `已成参考`
- `已跟踪发布`

Definitions:

- `待补全`: record has base content but neither meaningful reference attributes nor lifecycle completion
- `已成参考`: record is enabled as a reference sample
- `已跟踪发布`: record has lifecycle/publish information beyond the initial empty state

Do not add advanced filters such as:

- only lifecycle
- both enabled
- high weight only
- date ranges
- custom multi-filter combinations

Those can be added later if real usage proves necessary. They are not part of the focus-restoration phase.

## Create Flow

The primary creation flow is intentionally minimal:

1. Click `新增样本记录`
2. Fill:
   - `标题`
   - `正文`
   - `标签`
   - optionally `封面文案`
3. Save
4. The new record appears in the left list and is auto-selected
5. The right detail workspace opens so the user can continue enriching it

This avoids a multi-step wizard and keeps creation lightweight.

## Record Detail Workspace

The right-side detail workspace should use a fixed section order:

1. `基础内容`
2. `参考属性`
3. `生命周期属性`

### Section 1: 基础内容

Fields:

- 标题
- 正文
- 标签
- 封面文案
- optional source/context notes if already available

Purpose:

- help the user first identify what the record actually is

### Section 2: 参考属性

Fields:

- whether the record is reference-enabled
- reference tier: `passed / performed / featured`
- reference notes
- current computed weight display

Purpose:

- decide whether the record should influence future generation and style-profile work

### Section 3: 生命周期属性

Fields:

- publish status
- likes
- favorites
- comments
- publish notes
- updated timestamp / summary

Purpose:

- track the “after publishing” outcome on the same record

## Default Expansion Behavior

After a record is created:

- `基础内容` is open by default
- `参考属性` and `生命周期属性` may be collapsed, but must show a one-line summary

Examples:

- `参考属性：未启用`
- `生命周期属性：未回填`

If a section already contains meaningful data, it may reopen expanded when revisiting that record.

## Style Profile Positioning

`风格画像` should remain in `样本库`, but it is no longer a peer entry mode for data entry.

Its role becomes:

- consume high-quality reference-enabled records
- summarize them into one or more style-profile versions
- remain available as an output/control block tied to the sample library

It should not compete visually with record creation and record maintenance.

## Data Model Alignment

This design aligns with the existing unified `note-records` model:

- one note record is the canonical entity
- `reference` data is one attribute group
- `publish/lifecycle` data is one attribute group

The UI should expose that shape directly instead of re-creating separate entity mental models.

## Backend Design

## Desired End State

`/api/success-samples` and `/api/note-lifecycle` remain externally available, but their handler implementations should be reduced to thin compatibility routes around shared sample-library CRUD helpers.

## Shared Handler Pattern

Introduce a small server-side helper layer for sample-library compatibility routes.

The helper layer should cover repeated patterns such as:

- load current compatibility view
- build/normalize incoming record
- upsert or patch the view
- save through the unified store
- reload the compatibility view
- select the target item for response
- return `{ ok, item, items }`

Candidate helpers may include responsibilities such as:

- `handleCompatList`
- `handleCompatCreate`
- `handleCompatDelete`
- `handleCompatPatch`

Exact helper names are flexible. The goal is to remove route-template duplication without changing behavior.

## Backend Boundaries

The shared helper layer should only absorb the truly repeated mechanics.

Keep route-specific logic separate where behavior actually differs:

- benchmark run logic
- lifecycle publish-result patch semantics
- style-profile activation/draft behavior

This refactor is about removing repetitive scaffolding, not flattening every route into one generic abstraction.

## Frontend Design

## Desired End State

The frontend should stop thinking in terms of three unrelated sample-library panels and start thinking in terms of:

- one selected sample record
- one list renderer family
- one record workspace flow

## Shared Frontend Helpers

Introduce small shared helpers for repetitive sample-library rendering tasks.

Expected reuse targets:

- rendering list cards with title, summary, meta pills, and optional actions
- empty-state rendering
- selection-state rendering
- summary badge formatting

The goal is not to force every list into identical markup. The goal is to centralize the repeated shell and let item-specific details plug into it.

## Record Selection State

Frontend state should explicitly track:

- selected sample-library record id
- current search term
- current lightweight filter
- current mode for creating a record versus editing an existing record

This state should drive both:

- the left list
- the right detail workspace

## Compatibility and Migration

The refactor should preserve compatibility in three ways:

1. existing sample-library data remains in `note-records`
2. existing compatibility API endpoints remain callable
3. existing generation/style-profile logic continues to read through compatibility views unless and until a later phase deliberately changes that contract

This is a focus refactor, not a storage migration phase.

## Testing Strategy

Add or update tests to cover:

- one-primary-entry-point sample-library UI expectations
- list-first layout structure
- create-minimal-record then enrich behavior
- compatibility API behavior remaining intact after server refactor
- frontend selection and detail rendering expectations
- style-profile still consuming high-quality reference records after the UI restructuring

Testing should continue to favor:

- small API tests
- focused UI structure tests
- no dependence on browser automation for this phase

## Recommended Execution Order

1. Lock the UI expectations with tests
2. Refactor backend compatibility route scaffolding
3. Refactor frontend state and shared rendering helpers
4. Replace the old sample-library tabbed creation flow with the new list/detail workspace
5. Re-verify style-profile and generation compatibility paths
6. Update README if the user-facing workflow wording changes materially

## Acceptance Criteria

- `样本库` exposes one clear dominant creation action: `新增样本记录`
- users can create a record with minimal content first and enrich it afterward
- `参考属性` and `生命周期属性` are presented as attributes of one record, not parallel creation systems
- the sample-library page is list-first and makes the current library state easy to scan
- `style-profile` remains available but is visually and conceptually secondary to record maintenance
- duplicated backend handler scaffolding for sample-library compatibility routes is meaningfully reduced
- duplicated frontend sample-library rendering scaffolding is meaningfully reduced
- existing compatibility APIs keep working
- existing generation/style-profile flows keep working

## Notes

This phase is intentionally about focus and deduplication, not feature growth.

If this refactor succeeds, the sample-library area should feel like one coherent workspace instead of several adjacent mini-tools.
