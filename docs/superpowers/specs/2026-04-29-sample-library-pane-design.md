# Sample Library Pane Design

## Goal

Reduce the number of peer tabs in the data maintenance console by grouping `success-samples`, `note-lifecycle`, and `style-profile` under a single top-level pane named `样本库`, while keeping `review-benchmark` independent.

## Scope

This design only changes the frontend information architecture and page copy for the data maintenance console.

In scope:
- Replace the top-level tabs `成功样本`, `生命周期`, `风格画像` with one top-level tab `样本库`
- Add a second-level tab strip inside `样本库`
- Keep the existing forms, lists, render functions, and API endpoints intact
- Update UI tests to assert the new grouping

Out of scope:
- Changing unified `note-records` storage behavior
- Changing `review-benchmark` positioning or behavior
- Refactoring backend APIs
- Rewriting the existing form/list rendering into a new component system

## User Problem

The current data maintenance console mixes several kinds of low-frequency maintenance tasks into one flat tab row. Sample-related tasks are especially scattered:
- `成功样本`
- `生命周期`
- `风格画像`

These three entries belong to the same mental model: they are all part of sample accumulation, review, and reuse. Keeping them as separate top-level tabs makes the console feel wider and more fragmented than it needs to be.

## Design Choice

Chosen approach:
- One top-level pane: `样本库`
- Inside it, a second-level tab strip:
  - `参考样本`
  - `生命周期`
  - `风格画像`

Why this approach:
- Solves the “too many peer tabs” problem without changing data behavior
- Preserves current workflows and minimizes regression risk
- Keeps `基准评测` independent as a separate “exam set” rather than mixing it into training/reference material

Rejected alternatives:
- Stacking the three sections vertically in one long pane: simpler markup, but too tall and harder to scan
- Folding `基准评测` into the same pane: reduces tabs further, but mixes benchmark and sample-library concepts
- Full panel redesign: higher visual payoff, but too much risk for this phase

## Information Architecture

### Top-level tabs after change

Keep:
- `自定义词库`
- `种子词库`
- `反馈日志`
- `误报样本`
- `改写样本`
- `基准评测`
- `模型看板`

Replace:
- Remove top-level `成功样本`
- Remove top-level `生命周期`
- Remove top-level `风格画像`
- Add top-level `样本库`

### Sample library second-level tabs

Inside `样本库`, add:
- `参考样本`
- `生命周期`
- `风格画像`

Behavior:
- Default open tab: `参考样本`
- Only one second-level panel visible at a time
- Existing content blocks for success samples, lifecycle, and style profile move under these inner tabs without changing their business behavior

## Copy Changes

Top-level panel copy:
- `样本库`
- Supporting text: `把参考样本、生命周期记录和风格画像收在一个入口下，减少并列心智负担。`

Rename `成功样本` display copy to `参考样本` in the UI where it refers to the panel/section label.

Keep data/API names unchanged for now:
- `successSamples`
- `success-sample-form`
- `renderSuccessSamples`

This keeps implementation risk low while improving the user-facing structure.

## Interaction Model

### Top-level tab behavior

The existing top-level tab system stays in place. `样本库` becomes one additional top-level target handled by the same tab activation logic.

### Nested tab behavior

The nested tab strip inside `样本库` should:
- Maintain its own active state independent of the top-level tabs
- Default to `参考样本` on first render
- Not reset form state when switching second-level tabs
- Reuse the same active/inactive visual language as the top-level tabs, but with a lighter visual treatment so hierarchy is clear

## Implementation Shape

### HTML

In [web/index.html](/Users/taptaq/Documents/Original%20Heart%20Road/project/red_line_sex_lens/web/index.html):
- Update the top-level tab strip
- Introduce a new `sample-library-pane`
- Move the existing success-samples, note-lifecycle, and style-profile sections under that pane
- Wrap them in a nested tab strip and nested tab panels

### JavaScript

In [web/app.js](/Users/taptaq/Documents/Original%20Heart%20Road/project/red_line_sex_lens/web/app.js):
- Extend tab initialization to support nested tab groups
- Keep existing render functions:
  - `renderSuccessSamples`
  - `renderNoteLifecycle`
  - `renderStyleProfile`
- Keep existing fetch/submit handlers unchanged unless needed for DOM target updates

### CSS

In `web/styles.css`:
- Add styling for nested tab strip and nested tab panels
- Make the nested tab hierarchy visually subordinate to the top-level strip
- Preserve desktop and mobile usability

## Testing

Update [test/success-generation-ui.test.js](/Users/taptaq/Documents/Original%20Heart%20Road/project/red_line_sex_lens/test/success-generation-ui.test.js) to assert:
- The presence of top-level `样本库`
- The absence of `成功样本` / `生命周期` / `风格画像` as top-level tab targets
- The presence of nested sample-library targets
- Existing generation workbench controls still exist

No backend test updates are required for this task.

## Risks And Guards

Risk:
- Nested tab behavior could conflict with the existing top-level tab logic

Guard:
- Use separate selectors/state for top-level and nested groups

Risk:
- DOM ids used by existing JS handlers may accidentally change

Guard:
- Keep existing form/list/result ids unchanged where possible

Risk:
- The page could become harder to use on mobile if nested tabs wrap poorly

Guard:
- Add responsive styling and allow the nested strip to wrap cleanly

## Success Criteria

- The data maintenance console shows one top-level `样本库` tab instead of three separate sample-related top-level tabs
- `参考样本`, `生命周期`, and `风格画像` remain available within `样本库`
- `基准评测` remains independent
- Existing forms and list interactions still work
- The UI test for this area passes after the structure change
