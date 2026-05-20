# Theme Inspiration Modal Design

## Goal

Add a lightweight "主题灵感" modal to the generation workbench that automatically turns high-performing published content into clean, high-signal inspiration angle cards. Visible first-level inspiration should be the expandable angles themselves rather than broad parent themes, so the results feel fresher and less homogeneous with already-published posts.

## Scope

This first version does not depend on comment data, external trend scraping, or vector search. It uses only data the project already owns:

- published content with positive/high-performing outcome signals
- note title, body, tags, collection type, and publish metrics
- existing high-quality reference samples from the sample library

This first version is for ideation and generation prefill only. It does not create persistent sample-library records by itself.

## User Experience

### Entry

- Add a `主题灵感` button near the current generation-workbench controls, at the same level as `AI搜索参考资料`.
- Clicking the button opens a modal immediately.
- On first open, the modal auto-generates inspiration angle cards.
- On later opens, it shows the most recent result first and also exposes a `刷新灵感` action.

### Modal layout

The modal should feel editorial and calm rather than dashboard-heavy:

- warm off-white background
- light borders, minimal shadow
- spacious card rhythm
- desktop: two-pane layout
  - left: card list
  - right: selected-card detail
- mobile: stacked layout

### Loading and empty states

- Loading copy: `正在根据高表现已发布内容整理主题灵感...`
- Empty copy: `暂时还没整理出值得推荐的灵感角度。`
- Empty state should include a `重新生成` action.

### Card interaction

Each angle card exposes:

- quick summary in the list
- detail preview when selected
- `一键回填`
- `查看骨架`

`一键回填` should:

1. write prefill content into the existing generation form
2. close the modal
3. show a lightweight success hint near the generation form

## Data Pipeline

### Source selection

Only include notes that satisfy both:

- published positive status, such as `published_passed` or other already-accepted positive status used by current lifecycle logic
- performance above the existing or a dedicated "high-performing" threshold

The exact threshold can reuse the same metric language already used in the sample-library/reference qualification area so the system stays coherent.

### Theme aggregation

Use a two-stage process:

1. Keyword-first rough clustering
2. AI summarization and naming per cluster
3. Flatten each cluster's expansion angles into first-level inspiration angle cards

#### Stage 1: rough clustering

For each selected published note, extract:

- normalized title phrases
- normalized tags
- collection type
- high-frequency body phrases
- publish metrics

Group notes into rough topic buckets using shared keywords/tags/phrases. The rough clusters are intentionally cheap and deterministic.

#### Stage 2: AI refinement

For each rough cluster, call the text model to derive:

- parent theme title
- hook angle
- why this theme is worth writing
- discussion signal
- 3-5 standalone expansion angles that can each become a first-level inspiration card
- boundary notes
- prefill fields for the generation form

The model should be instructed to prefer:

- interesting tension
- strong contrast
- high discussion potential
- safe, non-sensational educational framing

The model should avoid:

- bland category labels
- repetitive restatements of existing note titles
- low-value rewrites that do not create a new writing direction

## Theme Quality Rules

Not every cluster should become a card. Each candidate theme should be scored or filtered on four axes:

1. Contrast
   - e.g. "以为异常，其实常见"
   - e.g. "以为是欲望问题，其实可能是羞耻感/生理波动"

2. Discussion potential
   - recurring across successful notes
   - broad enough to trigger multiple audience questions

3. Expandability
   - can produce multiple fresh posts, not just a reformulation of one existing post

4. Safety
   - still expressible as compliant science/education/body-exploration content

Only high-value candidates should become visible cards. Broad parent themes may still exist internally for clustering, but the visible first-level results should be angle cards derived from those themes.

## Card Schema

Each card should include two layers: display fields and prefill fields.

### Display fields

- `themeId`
- `themeTitle`
  This is the displayed angle title for the first-level card.
- `sourceThemeTitle`
  The broader parent theme this angle came from.
- `hookAngle`
- `whyNow`
- `discussionSignal`
- `sourceSignals`
- `expandAngles`
  On angle cards, this should be used for sibling or related angles rather than the first-level title itself.
- `boundaryNotes`
- `confidenceScore`
- `tags`

### Prefill fields

- `prefillBriefing`
- `prefillReferenceTitle`
- `prefillMaterialText`
- `prefillCollectionType`
- `prefillTone`

## Prefill Behavior

When the user applies a card, write into the existing generation form:

- `briefing` <= `prefillBriefing`
- `referenceTitle` <= `prefillReferenceTitle`
- `materialText` append `prefillMaterialText`
- `collectionType` optionally set from `prefillCollectionType`
- `tagReferences` can be augmented from the card tags when helpful

First version should only prefill fields that already exist as visible generation-workbench inputs. It should not require adding new dedicated `topic` or `constraints` form controls.

The prefill should not overwrite unrelated fields blindly if the user already typed content. The safest rule for first version:

- overwrite empty fields directly
- for `materialText`, append using the same newline-preserving helper style already used elsewhere
- if a non-empty core field is being replaced, surface a short confirmation or use a predictable replace behavior documented in the UI copy

## UI Composition

### Left list cards

Compact list-card content:

- angle title
- optional source-theme label
- one-line hook angle
- compact pills like `高讨论`, `高反差`, `身体探索`
- short `whyNow`
- actions: `查看骨架`, `一键回填`

### Right detail pane

Selected card detail should show:

- why this topic is worth writing
- expansion angles
- boundary reminders
- source basis
- preview of what will be written into the form

## API Shape

Add a dedicated route, for example:

- `POST /api/generate-theme-inspirations`

Input:

- optional current generation context if helpful for ranking
- optional filters (collection type, tag group, freshness)

Output:

- `items`: theme inspiration cards
- `generatedAt`
- `modelTrace`

This route should live beside the existing generation-workbench routes and reuse existing model routing helpers where sensible.

## Storage Strategy

First version can be request-generated plus cached in memory or a lightweight persisted JSON store.

Recommended first step:

- persist the latest generated theme cards in project data storage
- allow re-open without immediate re-generation
- allow explicit refresh

This keeps the first open responsive after initial generation and avoids rerunning expensive summarization unnecessarily.

## Reuse Opportunities

To keep implementation cost low, reuse:

- existing sample-library published outcome and metric structures
- current generation form payload structure
- current generation modal patterns
- current append-to-material-text helper
- existing routed text-model JSON generation flow

Do not introduce a vector database or external topic-service dependency in v1.

## Non-Goals

Not in first version:

- comment ingestion
- automatic scheduled regeneration
- external market/project scraping
- semantic embeddings or vector retrieval
- favorites/archive/history workflow for inspiration cards
- multi-source inspiration ranking beyond owned published content and sample-library data

## Testing

Add coverage for:

- selecting high-performing published content only
- deterministic rough clustering behavior
- AI theme-card parsing and normalization
- modal entry point and auto-load state
- card rendering and detail pane
- one-click prefill into the generation form
- safe append behavior for `materialText`
- reopen behavior using the latest generated result

## Risks

- Theme cards may be too generic if clustering is too shallow
- Theme cards may be too repetitive if quality filtering is too weak
- Aggressive prefill could feel destructive if it overwrites current draft context

Mitigations:

- explicit quality prompts for contrast/discussion/expandability
- strict deduping across generated theme titles and prefill briefings
- conservative field-overwrite policy
