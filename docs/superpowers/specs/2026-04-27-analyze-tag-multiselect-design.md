# Analyze Tag Multi-Select Design

## Goal

Replace the current single-pick analyze tag control with a custom dropdown multi-select that:

- supports selecting and unselecting multiple preset tags
- keeps custom tag entry
- looks more polished than the current native select + chip row
- stays compact even when many tags exist

## Current Context

The current analyze form uses:

- a native `select` for preset tags
- a custom text input for adding custom tags
- a selected-tag chip row rendered below the controls

This works functionally, but the preset selection interaction is single-step and not well suited
to bulk multi-select. It also looks closer to a raw form control than a finished product surface.

## Proposed Interaction

### Closed state

The tag picker becomes a single custom trigger area inside the form.

- It shows selected tags inline as chips.
- It tries to show the selected tags as completely as possible.
- If the content exceeds the available width, the trigger area clips naturally instead of growing into a very tall block.
- If nothing is selected, it shows a placeholder.

### Open state

Clicking the trigger opens a dropdown panel.

- The panel lists preset tags as selectable items.
- Clicking an item toggles it on or off.
- Selected items have a clear active state.
- The panel closes when clicking outside the picker.

### Custom tags

Custom tag entry remains available inside the dropdown flow.

- Users can type a custom tag and add it immediately.
- Added custom tags are persisted into the saved option list, as today.
- A newly added custom tag is also auto-selected.

## Visual Direction

The control should feel like a compact filter picker rather than a raw form input.

- closed trigger: rounded container, subtle warm background, light border, clear focus ring
- selected tags: small chips with stronger contrast than the container
- dropdown panel: attached to the trigger, layered with border/shadow, visually part of the same component
- option states: clear `hover`, `selected`, and keyboard `focus` states

The design should stay aligned with the existing web app visual language instead of introducing a new design system.

## Density Rules

To avoid the layout becoming crowded when tag counts grow:

- preset tags live inside the dropdown, not permanently expanded in the form
- the dropdown panel gets a max height and scrolls internally
- the closed trigger has a bounded height and overflow handling
- selected chips remain readable, but the control should not continuously expand the page

## Component Behavior

Suggested internal behavior:

- trigger button toggles open / closed
- dropdown state reflected with an `is-open` class and `aria-expanded`
- each option uses a button-like row or chip-like selectable item
- hidden input still stores the final CSV string so existing form submission can remain stable
- selected state continues to flow through the existing tag normalization helpers

## Accessibility

Minimum accessibility expectations:

- trigger is keyboard focusable
- `Enter` / `Space` can open the dropdown
- `Escape` closes it
- option rows are keyboard reachable
- active and selected states are visible without relying only on color

## Implementation Areas

- `web/index.html`
  - replace the current preset `select` block with a custom dropdown structure
- `web/app.js`
  - update picker rendering and event wiring for open/close and multi-select behavior
  - preserve existing hidden-input serialization and custom-tag persistence
- `web/styles.css`
  - add trigger, dropdown, option, and selected-chip styling

## Non-Goals

This change does not add:

- tag grouping
- tag search
- drag reordering
- server-side API changes

## Testing

Add or update regression checks for:

1. analyze tag picker still serializes selected tags into the hidden input
2. toggling a preset tag adds and removes it correctly
3. custom tags are still persisted into the option list and auto-selected
4. empty state and selected state both render correctly
5. layout-oriented tests cover the new dropdown classes and overflow constraints
