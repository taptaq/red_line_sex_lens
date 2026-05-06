# Generation Model Selection Design

## Goal

Give "生成新内容" its own model selector without mixing it with the rewrite workflow.

## Scope

This change only affects the generation workflow:

- Add a dedicated model selector in the "生成新内容" area
- Send `modelSelection.generation` to `/api/generate-note`
- Normalize and expose `generation` as a first-class model-selection scope
- Keep generation prompt building, candidate scoring, and repair flow on the existing generation path

This change does not:

- Re-route generation through the rewrite API
- Reuse rewrite prompts for generation
- Change semantic review or cross-review selectors

## Design

### UI

Add a new `generation-model-selection` control near the generation form. Its label should make clear that it only affects "生成新内容".

### Model options

Extend `/api/model-options` and client-side model option normalization so there is a `generation` option list. For now, `generation` can reuse the same provider list as `rewrite`, but it must remain a separate field and separate control.

### Request payload

Extend the selected-model state payload to include:

```json
{
  "semantic": "...",
  "rewrite": "...",
  "generation": "...",
  "crossReview": "..."
}
```

### Backend behavior

`/api/generate-note` must always stay on the generation pipeline:

- generation prompt/messages
- generation candidate building
- generation scoring
- generation repair

If `modelSelection.generation` is present, use it as the generation model selection.

If `modelSelection.generation` is absent, fall back only to the `rewrite` model value as a compatibility default.

Important: this fallback only reuses the model value, not the rewrite workflow, not the rewrite prompt, and not the rewrite endpoint.

## Compatibility rule

Older requests without `generation` should continue to work. They should behave exactly like current generation, except the generation model value may be sourced from `rewrite` when `generation` is missing.

## Tests

Add or update tests to verify:

- the generation UI exposes its own model selector
- `/api/model-options` includes `generation`
- `/api/generate-note` forwards `generation` when provided
- `/api/generate-note` falls back to `rewrite` only as a model value
- generation still uses the generation workflow, not rewrite prompts

## Risks

- UI confusion if the label is too close to rewrite wording
- accidental reuse of `rewrite` state in the generation request builder
- accidental use of rewrite prompt helpers during fallback handling

## Acceptance

- Users can choose a dedicated generation model in the generation area
- Generation output still comes from the generation-specific pipeline
- Missing `generation` stays backward-compatible
- Rewrite model selection no longer implicitly controls generation when `generation` is set
