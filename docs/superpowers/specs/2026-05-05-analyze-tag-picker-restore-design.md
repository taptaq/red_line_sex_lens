# Analyze Tag Picker Restore Design

## Goal

Restore the full analyze tag picker in the content detection form so the tag field once again supports:

- selecting and unselecting multiple preset tags from a dropdown
- adding custom tags inline
- clearing the current selection
- showing selected tags inside a compact trigger area

The restored experience should match the earlier behavior users were already relying on, while keeping the current simplified product scope elsewhere in the app.

## Current Context

The current analyze form in `web/index.html` uses a plain text input for `tags`.

- The visible dropdown trigger, preset option list, custom-tag add flow, and clear action are gone.
- `web/app.js` reads `tags` directly from the text field rather than maintaining hidden-input state for the picker.
- Existing tests now explicitly assert that the dropdown structure and helper functions do not exist.
- The product-reduction work intentionally removed visible tag-maintenance flows, but the underlying analyze tag option data path still exists and can support the picker again.

This means the current behavior is not a runtime failure. It is a product-scope reduction that removed a workflow the user still wants.

## Proposed Scope

Restore the full earlier analyze tag picker only in the analyze form.

Included:

- custom dropdown trigger for analyze tags
- multi-select preset tag options
- custom tag creation from the dropdown
- clear action
- selected-tag chip rendering inside the trigger
- persistence of added custom tags through the existing option storage path

Explicitly excluded:

- restoring separate tag-maintenance admin surfaces
- restoring removed benchmark, calibration, or collection-maintenance entry points beyond what the picker already depends on
- changing generation or sample-library tag inputs

## Interaction Design

### Closed state

The analyze form shows a single tag-picker trigger in place of the plain text input.

- If no tag is selected, the trigger shows an empty placeholder.
- If tags are selected, the trigger shows them as chips inline.
- The trigger remains visually compact and does not grow into a large always-open tag wall.

### Open state

Clicking the trigger opens a dropdown anchored to the control.

- Preset tags appear as selectable options.
- Clicking an option toggles it on or off.
- The dropdown closes when clicking outside the picker.
- `Escape` closes the dropdown and returns focus to the trigger when appropriate.

### Custom tags

The dropdown includes a custom tag input and add button.

- Entering a custom tag adds it to the saved option list if it is new.
- The added custom tag is immediately selected.
- If the custom tag already exists, it should still be selected without creating duplicates.

### Clear action

The dropdown includes a clear action that removes all selected tags while leaving the option list intact.

## Data and State

The analyze form should return to using a hidden `tags` input as the submitted source of truth.

- The picker UI maintains a normalized selected-tag array.
- Selected values are serialized into the hidden input using the existing CSV format.
- Preset and custom options continue to flow through the existing `analyze-tag-options` storage path.
- Existing tag normalization helpers should remain the single place for trimming, deduping, and empty filtering.

This preserves compatibility with the current form submission and server-side analyze handling.

## Implementation Areas

### `web/index.html`

Replace the current analyze `tags` text field with the full picker structure:

- hidden `tags` input
- trigger button
- selected-tag container
- dropdown
- preset option container
- custom-tag input
- add button
- clear button

### `web/app.js`

Restore the picker helpers and event wiring needed for:

- reading and writing selected tags
- rendering selected chips
- rendering preset options
- dropdown open and close state
- outside-click handling
- keyboard handling
- custom tag add and delete behavior
- loading and saving custom tag options through the existing API path

The restored logic should be scoped to the analyze form only and should not reintroduce broader maintenance UI.

### `web/styles.css`

Restore the tag-picker styles required for:

- compact trigger layout
- dropdown positioning and layering
- selected chips
- selected option states
- custom option delete affordance
- max-height and overflow behavior for dense option lists

## Testing Strategy

Update tests back to the restored-picker expectation before implementation.

Required regression coverage:

1. `web/index.html` contains the analyze picker structure again.
2. `web/styles.css` contains the picker and custom delete styles again.
3. `web/app.js` restores dropdown helpers and selected-tag rendering behavior.
4. analyze form submission still serializes the final tag selection through the hidden input.
5. custom tags can still be persisted into the option list and selected without duplication.
6. higher-level UI regression tests stop asserting that the picker is absent and instead assert that it is present.

## Risks and Guardrails

### Risk: unintentionally re-expanding removed product areas

Guardrail:

Restore only the analyze-form picker. Do not re-add standalone tag-maintenance panels or unrelated advanced tooling.

### Risk: conflicting with recent form simplification changes

Guardrail:

Reuse the older picker behavior, but integrate it into the current form structure and current helper layout instead of blindly reverting whole files.

### Risk: duplicated or stale test expectations

Guardrail:

Update the targeted picker tests and the broader success-generation UI expectations together so the suite reflects one consistent product state.

## Success Criteria

The work is successful when:

- the content detection form once again offers the full tag dropdown workflow the user expects
- selected tags submit correctly to the existing analyze flow
- custom tags remain persistable and reusable
- no removed maintenance surfaces are accidentally restored
- focused picker and UI regression tests pass against the restored behavior
