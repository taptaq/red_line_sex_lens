# XHS Top Signals Browser Design

## Goal

Add a standalone `同类爆文专区` block below the main `内容工作台` so the user can browse same-track Xiaohongshu winning posts without first running account diagnosis.

This block should help answer:

- "What is currently rising in my track today?"
- "What has stayed stable over the last 7 days?"
- "What are low-follower breakout examples I can still learn from?"

The browser is meant to be a practical evidence surface, not a report page and not a diagnostic modal.

## Scope

This first version adds:

- a new standalone block below the content workbench
- independent data loading and caching
- default account-based auto matching
- manual override filters
- manual refresh
- category filters for `今日`, `7日`, and `低粉爆文`
- list quick actions and expandable detail view

This first version does not add:

- dependency on account diagnosis
- historical warehouse / multi-run archive browsing
- scheduled background refresh
- multi-account mixed browsing
- advanced analytics or charting

## Product Shape

The new block lives:

- below `内容工作台`
- above lower supporting surfaces such as draft and long-tail study areas
- outside the account diagnosis modal
- outside the account planner panel

It is a first-class page section, not a tab inside another tool.

That is important because the intended usage is lightweight and frequent:

1. open the page
2. glance at current same-track signal candidates
3. switch between `今日 / 7日 / 低粉`
4. inspect one or two examples
5. send them into external references or inspiration flow

## Why It Must Be Independent

The current account diagnosis flow already exposes `matchedSignals`, but only as a byproduct of diagnosis.

That creates two problems for browsing:

1. the user must run diagnosis first
2. the browsing experience is trapped inside a diagnosis result surface

This feature removes both constraints.

The top-signals browser should be usable as a standalone discovery surface with its own refresh control and its own cached result.

## Core UX Requirements

### Placement

The block is rendered directly below the content workbench as a visually distinct section.

It should feel like:

- an always-available discovery surface
- easy to scan
- not hidden behind modal state

### Default Matching

The browser defaults to account-based matching.

The user can provide:

- a single Xiaohongshu account id

From that account, the system derives the default matching context.

### Manual Override

The user can override the auto match with manual filters such as:

- track / category
- keyword
- tags

Manual filters are not secondary diagnostics. They are part of the primary browsing surface.

### Refresh Model

The browser uses manual refresh only in v1.

The user explicitly clicks refresh to fetch the latest signals.

The block should also show:

- last refreshed time
- current effective match source
- result count

### Category Filters

The browser must support at least these filters:

- `全部`
- `今日`
- `7日`
- `低粉爆文`

The underlying groups map to:

- `dailyTop`
- `weeklyTop`
- `lowTop`

The `全部` view merges them into one list while preserving source type labels.

## Card Design

Each result card should show enough value in collapsed state to support quick browsing.

### Collapsed state

Display:

- title
- author
- track
- account tier
- core metrics
- why selected
- source category badge

Quick actions:

- `加入外部参考样本`
- `生成灵感草稿`

### Expanded state

Clicking the card expands a richer detail area.

Detail includes:

- fuller summary or excerpt
- why it qualifies as `今日 / 7日 / 低粉`
- reuse hint / angle hint
- source link when present
- optional publish time
- optional tag list

The user asked for both quick actions and inspectability, so expansion is additive rather than replacing list actions.

## Data Model

The browser should not depend on diagnosis cache.

Instead it gets its own store, for example:

- `data/xhs-top-signals.json`

Suggested stored shape:

```json
{
  "accountContext": {
    "redId": "",
    "nickname": "",
    "derivedTrack": "",
    "derivedTags": []
  },
  "filters": {
    "track": "",
    "keyword": "",
    "tags": []
  },
  "items": {
    "dailyTop": [],
    "weeklyTop": [],
    "lowTop": []
  },
  "generatedAt": "",
  "resultCount": 0
}
```

This cache is intentionally shallow. It stores the latest usable browser result, not a history database.

## Backend Design

### New read/write store

Add dedicated load/save helpers for the top-signals browser cache.

The browser cache should be isolated from:

- account diagnosis cache
- sample library cache
- theme inspiration cache

### New API

Add a standalone API family, for example:

- `POST /api/xhs/top-signals`
- `GET /api/xhs/top-signals`

`POST` runs or refreshes the fetch using current account id + manual filters.

`GET` returns the latest cached browser result.

### Fetch behavior

The backend should call the existing same-track signal fetch logic already used by account diagnosis, but without requiring diagnosis summary creation.

That means the browser reuses ranking logic, not diagnosis state.

### Error behavior

Errors must surface directly.

The browser should not:

- inject fake fallback items
- fabricate placeholder cards
- silently reuse stale data while pretending refresh succeeded

If refresh fails, the API returns a real error and the frontend shows it explicitly.

## Frontend State Design

Suggested browser state:

```js
{
  loading: false,
  message: "",
  redId: "",
  track: "",
  keyword: "",
  tags: "",
  activeFilter: "all",
  items: {
    dailyTop: [],
    weeklyTop: [],
    lowTop: []
  },
  generatedAt: "",
  selectedSignalId: ""
}
```

The selected card can drive expanded detail state.

## Merge and Filtering Rules

### `全部`

The all view merges:

- `dailyTop`
- `weeklyTop`
- `lowTop`

Cards must retain their source label so the user can still see where each one came from.

### Dedupe

If the same item appears in multiple buckets, the merged view should dedupe by stable id and preserve all matching source labels where possible.

### Sorting

Default sorting should prioritize the strongest current signal within the chosen bucket.

Exact sort weights can reuse the current signal ranking order already produced by backend ranking logic.

## Actions From Cards

Two list-level quick actions are required:

1. `加入外部参考样本`
   This sends the signal into the existing external sample flow.

2. `生成灵感草稿`
   This creates a draft-idea style entry or equivalent inspiration entry using the selected signal.

These actions already exist in the diagnosis signal cards, so the preferred approach is to reuse those serialization rules rather than invent a second payload format.

## Empty and Error States

### Empty state

When there is no cached result yet:

- explain that the block needs a manual refresh
- keep the refresh button visible

### No-match state

When refresh succeeds but returns no usable items:

- show that no same-track signals were found under the current filters
- suggest relaxing keyword / track filters

### Error state

When refresh fails:

- show the actual error message
- do not populate synthetic cards
- keep the previous cached result only if the user is explicitly viewing cached state rather than the failed refresh result

The UI should be honest about whether the visible data is cached or freshly refreshed.

## Testing Scope

Add coverage for:

- new block existence and placement below content workbench
- category filter controls
- manual refresh behavior
- standalone GET/POST API
- cache persistence
- merged `全部` view behavior
- dedupe across daily / weekly / low-top overlaps
- error path with no fake fallback cards
- quick actions for external sample and draft idea creation
- expanded detail rendering

## Risks

### Scope creep

This can easily turn into a full content-intelligence dashboard. v1 should stay focused on browsing and reuse.

### Hidden coupling with diagnosis

The implementation must reuse fetch/ranking logic without reintroducing runtime dependence on diagnosis state or diagnosis cache.

### Stale cache ambiguity

The UI must distinguish:

- cached result
- fresh result
- failed refresh

Otherwise users will believe they are seeing fresh data when they are not.

## Recommendation

Ship this as a standalone lightweight browser block below the workbench, backed by a dedicated cache and standalone API, while reusing existing same-track ranking logic and existing card actions.

That gives the user a real browsing surface now without forcing a much larger dashboard architecture too early.
