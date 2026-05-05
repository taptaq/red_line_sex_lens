# Analyze Tag Picker Visual Refresh Design

## Goal

Refresh the analyze tag picker so it feels native to the current warm beige / gold product theme and no longer reads like a cold gray list.

The updated picker should:

- use a compact warm-gold capsule visual language
- reduce the dropdown's perceived length and density
- preserve the existing picker behavior and information architecture

## Current Problem

The restored picker works, but its visual treatment is out of step with the rest of the interface.

- Option rows feel like long gray bars rather than lightweight tag choices.
- The dropdown reads too tall and too heavy.
- Selected-state styling does not feel integrated with the page's warm translucent cards and gold accents.

## Approved Direction

Use a `warm-gold capsule` direction.

- Preset options become compact rounded chips instead of full-width row buttons.
- The dropdown remains a card, but with a lighter warm-paper surface and softer elevation.
- Selected tags use a richer warm-gold fill and darker ink so they feel intentional without becoming loud.
- The whole control should visually compress vertically.

## Scope

Included:

- picker trigger visual refinement
- selected-tag chip refinement
- dropdown card styling refinement
- option layout change from stacked rows to compact wrapping capsules
- custom-tag delete affordance styling refinement
- custom input row density adjustment

Excluded:

- changing data flow
- changing tag picker behavior
- changing server APIs
- changing other form controls outside this picker

## Visual Design

### Trigger

The closed trigger should feel like a polished filter field rather than a generic dropdown.

- slightly tighter vertical padding
- warmer surface gradient aligned with existing panels
- stronger label hierarchy for `标签`
- selected area reads like inline chips rather than muted plain text
- caret remains subtle and secondary

### Dropdown

The dropdown should feel shorter, lighter, and more curated.

- reduce padding and internal gaps
- keep rounded warm-paper card styling
- soften border contrast
- use lighter shadow than modal-like overlays
- cap max height so it stays compact

### Option Layout

Preset options should become wrapping capsules.

- options flow horizontally and wrap naturally
- each capsule sizes to content rather than stretching full width
- selected state uses warm-gold fill / border treatment
- unselected state uses pale cream background with subtle gold outline
- hover and focus states brighten slightly rather than turning gray

### Custom Tags

Custom tags should share the same capsule family but remain identifiable.

- custom option row keeps delete affordance integrated at capsule edge
- delete control becomes a small quiet circular close button
- custom input row becomes denser and visually secondary to the option field

## Layout Rules

To keep the picker visually short:

- options use `flex-wrap` capsule layout instead of single-column list rows
- individual capsules stay compact in height
- custom input row sits below the option field with tighter spacing
- selected trigger area clips gracefully instead of expanding too tall

## Implementation Areas

### `web/styles.css`

Primary file for this change.

- refine `.tag-picker-trigger`
- refine `.tag-picker-selected`
- refine `.tag-picker-dropdown`
- change `.tag-picker-options` to a wrapping capsule layout
- restyle `.tag-picker-option-row`, `.tag-picker-option`, `.tag-picker-option-check`
- restyle `.tag-picker-option-delete`
- tighten `.tag-picker-custom`

### `web/index.html`

Only minor structural tweaks if needed for styling support.

Preferred approach:

- preserve current markup unless a very small wrapper or semantic hook is needed for the capsule layout

## Testing

Keep tests lightweight and structural.

- existing picker layout and behavior tests should continue to pass
- no behavior expectations should change
- if any test currently encodes the old long-row visual structure, update it only as needed to match the new capsule selectors

## Success Criteria

The refresh is successful when:

- the picker visually matches the current warm beige / gold theme
- the dropdown feels noticeably shorter and lighter
- options read as deliberate tag choices instead of generic list rows
- existing picker interactions still work unchanged
