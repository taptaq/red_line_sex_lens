# Style Profile Draft Editing Design

## Goal

Allow the user to manually refine an auto-generated `待确认风格画像` before confirming it, without turning the sample-library area into a second heavy configuration console.

The main workflow should remain:

1. Generate draft from reference samples
2. Manually adjust a few core fields if needed
3. Confirm the edited draft as the active style profile

## Problem

The current style-profile flow is useful but too binary:

- the system can generate a draft
- the user can only `确认生效`
- there is no low-friction way to correct wording, tighten tone, or replace weak summaries before activation

That creates two product risks:

- users may hesitate to activate a profile that is “almost right”
- users may stop trusting the draft because there is no human correction step

## Product Direction

The draft style profile should become an editable proposal, not a locked machine summary.

The product should treat the draft as:

- machine-generated first pass
- human-adjustable
- activation-ready after a quick manual review

This keeps the human in control while preserving the speed benefit of automatic draft generation.

## In Scope

- Add a light manual editing step for `draft` style profiles
- Keep editing inside the current style-profile card area
- Allow editing only the highest-value content fields:
  - `topic`
  - `tone`
  - `titleStyle`
  - `bodyStructure`
  - `preferredTags`
- Let `确认生效` use the edited draft values
- Add a backend path to persist draft edits before confirmation

## Out of Scope

- Editing active style-profile versions
- Editing archived history versions
- Editing `avoidExpressions`
- Editing `generationGuidelines`
- Editing referenced sample IDs from the UI
- Adding a separate style-profile management page
- Adding diff comparison between generated draft and edited draft

## User Experience Design

## Placement

The new edit affordance should live directly inside the current `待确认风格画像` card.

Do not introduce:

- a modal
- a new tab
- a separate side panel

The user already understands this area as a compact support tool under `样本库`, so the edit experience should stay local and inline.

## Draft-State Actions

When the current profile is in `draft` state, the card should show:

- `人工编辑`
- `确认生效`

After the user enters edit mode, the card should switch to an inline form with:

- `保存修改`
- `取消`
- `确认生效`

`确认生效` should remain available in edit mode so the user can review and activate in one pass.

## Editable Fields

Only expose the following fields in the inline editor:

### 1. 主题

Maps to `topic`

Purpose:

- lets the user rename or sharpen the profile framing

### 2. 语气画像

Maps to `tone`

Purpose:

- lets the user soften, narrow, or better align the emotional voice

### 3. 标题风格

Maps to `titleStyle`

Purpose:

- lets the user replace generic title guidance with a more useful summary

### 4. 正文结构

Maps to `bodyStructure`

Purpose:

- lets the user make the structure guidance more operational

### 5. 偏好标签

Maps to `preferredTags`

UI form should use a simple comma-separated text input.

Purpose:

- keeps the interaction lightweight without introducing another tag-picker flow

## Interaction Model

## Default View Mode

In normal draft view:

- show the generated profile summary as today
- show `人工编辑` as a secondary action
- keep the card readable at a glance

## Edit Mode

In edit mode:

- replace the static profile summary fields with form inputs
- preserve the same card container instead of opening a new surface
- keep the metadata row visible so the user still understands that this is a draft and how many samples were referenced

## Cancel Behavior

If the user clicks `取消`:

- discard unsaved local edits
- return to the non-editing draft card
- keep the last persisted draft unchanged

## Save Behavior

If the user clicks `保存修改`:

- persist the edited draft to the existing style-profile state
- keep the profile in `draft` status
- re-render the card in non-editing view with updated content

This gives the user a safe “save first, confirm later” step.

## Confirm Behavior

If the user clicks `确认生效`:

- confirm the latest persisted draft
- if the card is currently in edit mode, submit the edited values first as part of the same request path
- then promote the draft into the active profile version

The user should not need to remember to click `保存修改` before `确认生效`.

## Data Model and API Design

## Data Shape

No new resource type is needed.

The existing `style-profile` state already distinguishes:

- `draft`
- `current`
- `versions`

We only need to support updating selected fields on `draft`.

## API Adjustment

Extend the existing `PATCH /api/style-profile` behavior:

- default action with no explicit mode continues to mean `confirm draft`
- add support for a draft update action, for example:
  - `action: "update-draft"`
  - `profile: { ...editable fields... }`

Expected behavior:

- validate that a draft exists
- merge only allowed editable fields into `draft`
- normalize `preferredTags`
- update `draft.updatedAt`
- save and return the new profile state

## Validation Rules

- `topic`, `tone`, `titleStyle`, `bodyStructure` should be trimmed strings
- `preferredTags` should be normalized into a unique string array
- empty values are allowed, but the server should fall back to existing normalization patterns where appropriate
- non-editable fields from the client should be ignored rather than trusted blindly

## Frontend Structure

## State

Add a small local UI state for style-profile editing, for example:

- whether the draft card is in edit mode
- the local form values for the five editable fields

This state should stay frontend-local and should not affect the persisted profile until save or confirm.

## Rendering

Update `renderStyleProfile(...)` so that:

- draft + view mode renders summary text
- draft + edit mode renders inputs
- active profile continues to render read-only
- history versions continue to render read-only

## Event Handling

Add three new action branches:

- enter edit mode
- cancel edit mode
- save draft edits

The existing confirm branch should be updated so it can submit edited values when needed.

## Error Handling

- If saving draft edits fails, keep edit mode open and show the error in the style-profile area
- If confirming fails, keep the user on the same card and preserve current input values
- If there is no draft anymore when editing or confirming, show the server error and exit edit mode

## Testing

Add coverage for:

- rendering draft edit controls only for draft profiles
- rendering the inline edit form in edit mode
- saving edited draft values through the new API action
- confirming a draft after manual edits
- ensuring active and archived versions remain read-only

Focus on lightweight behavior tests and API tests rather than snapshot-heavy UI testing.
