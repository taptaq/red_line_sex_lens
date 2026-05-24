# Web App Modularization Design

## Goal

Reduce the size and mixed responsibilities of [web/app.js](/Users/taptaq/Documents/Original%20Heart%20Road/project/red_line_sex_lens/web/app.js) without changing current behavior.

The first pass should improve readability, ownership boundaries, and testability while keeping risk low. We are not redesigning the frontend architecture, changing state management, or rewriting event wiring.

## Current Context

- `web/app.js` is about 12.5k lines and currently holds:
  - app state
  - DOM query helpers
  - request helpers
  - payload normalization
  - markup builders
  - modal renderers
  - action gating
  - click/change/submit handlers
  - orchestration across analysis, rewrite, generation, sample library, style profile, and theme inspiration
- The repo already has lightweight frontend modules:
  - [web/rewrite-result-view.js](/Users/taptaq/Documents/Original%20Heart%20Road/project/red_line_sex_lens/web/rewrite-result-view.js)
  - [web/false-positive-view.js](/Users/taptaq/Documents/Original%20Heart%20Road/project/red_line_sex_lens/web/false-positive-view.js)
- Those modules establish the local pattern we should preserve:
  - plain ES module exports
  - no framework adoption
  - view-focused helpers separated from the main orchestration file

## Non-Goals

- No migration to React, Vue, or another framework
- No app-wide state refactor
- No event delegation rewrite in the first pass
- No CSS redesign
- No opportunistic feature changes bundled into the refactor

## Recommended Approach

Use a low-risk modularization pass:

1. Move pure view/payload/helper functions into focused `web/*.js` modules.
2. Keep `appState`, top-level DOM bootstrapping, and global event listeners in `web/app.js`.
3. Keep imports shallow and explicit.
4. Preserve current public behavior and test coverage at each step.

This gives us a smaller and more legible `app.js` without destabilizing the parts most likely to create regressions.

## Alternatives Considered

### 1. Keep everything in `app.js` and only add comments

Pros:
- Lowest immediate risk

Cons:
- Does not improve ownership boundaries
- Makes future changes continue to pile into one file
- Leaves test targeting and navigation painful

### 2. Split pure functions first, keep orchestration centralized

Pros:
- Best behavior safety
- Matches current codebase pattern
- Lets us move in narrow, testable increments
- Keeps event flow easy to trace during the first refactor

Cons:
- `app.js` will still be large after the first pass
- Event handler complexity remains until later phases

### 3. Aggressively split views, handlers, and state together

Pros:
- Largest immediate size reduction
- Cleaner end-state if it lands perfectly

Cons:
- Much higher regression risk
- Harder to review and debug
- More likely to create circular dependencies or broken DOM assumptions

## Decision

Choose **Alternative 2**.

We will first split pure helpers and view builders while keeping orchestration in `web/app.js`.

## Target Module Layout

### `web/app.js`

Keep:

- `appState`
- generic DOM helpers such as `byId`
- request helpers such as `apiJson`
- top-level orchestration
- global event listeners
- wiring across modules

Role:

- the integration surface that coordinates the rest of the frontend

### `web/style-profile-view.js`

Move:

- style profile modal markup builders
- style profile payload readers
- style profile generation label / local formatting helpers closely tied to that modal

Role:

- render and serialize the style profile modal surface

### `web/sample-library-calibration-view.js`

Move:

- calibration evidence markup builders
- calibration editor section markup
- calibration retro chip markup helpers
- calibration suggestion helpers derived from prediction and comparison data

Role:

- render and serialize the publish prediction / retro calibration UI

### `web/theme-inspiration-view.js`

Move:

- theme inspiration modal rendering helpers
- theme inspiration detail rendering helpers
- theme inspiration selection/count UI helpers

Role:

- encapsulate theme inspiration modal presentation

### `web/sample-library-record-view.js`

Move:

- sample library record card builders
- sample pool card builders
- list-oriented sample library rendering helpers

Role:

- own repeated record and pool markup rendering

## Dependency Rules

- New modules may depend on small generic helpers passed in or imported from `app.js` only if needed.
- Prefer parameter injection for UI helpers that need `escapeHtml`, `formatDate`, or narrow configuration values.
- Avoid importing `appState` directly into extracted modules in this first pass.
- Avoid modules importing each other unless there is a clear one-way relationship.

## Extraction Strategy

### Phase 1: Style Profile + Calibration

Why first:

- Recently touched and actively evolving
- Clear modal boundaries
- High value, moderate scope

Success criteria:

- style profile and calibration rendering logic no longer lives inline in `app.js`
- existing UI tests remain green

### Phase 2: Theme Inspiration

Why second:

- Modal is already conceptually isolated
- Good candidate for view-only extraction

Success criteria:

- theme inspiration modal rendering is moved out
- action handlers in `app.js` continue calling the extracted helpers

### Phase 3: Sample Library Record / Pool Views

Why third:

- Larger footprint
- Benefits most after the smaller modal modules establish the extraction pattern

Success criteria:

- list/pool markup is extracted
- sample library workspace behavior remains unchanged

## Testing Strategy

Use focused regression coverage for each extraction step.

- Before moving a function, ensure there is a test covering its current rendered output or serialized payload.
- After extraction, keep behavior assertions identical where possible.
- Re-run at least:
  - `node --test test/success-generation-ui.test.js`
- Also run narrower suites when the extracted module has dedicated tests.

## Risks

### Hidden coupling through shared local helpers

Mitigation:

- extract helpers in groups with their closely related formatting helpers
- use explicit imports/parameters rather than relying on outer scope

### Event handlers depending on DOM structure created by moved functions

Mitigation:

- preserve markup structure and `data-action` attributes exactly during phase 1
- avoid markup cleanup mixed with extraction

### Circular module dependencies

Mitigation:

- keep `app.js` as the orchestrator
- prefer downward dependencies from `app.js` into view modules only

## Migration Constraints

- Preserve current file encoding and ES module format
- Do not change the backend contract during this refactor
- Do not bundle unrelated feature work into extraction commits
- Do not touch user data files in `data/`

## Expected Outcome

After the first pass:

- `web/app.js` is still the main orchestrator, but materially smaller
- modal/view code is easier to find and reason about
- future work on style profile, calibration, theme inspiration, and sample library views can happen in narrower files
- the repo stays on its existing frontend pattern rather than drifting into an ad hoc architecture rewrite
