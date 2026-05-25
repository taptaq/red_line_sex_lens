# Sample Library Account Planner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an account-level retrospective planner inside sample library that analyzes local records plus manually imported Markdown/CSV external samples and outputs 3-5 next-post planner cards that can prefill the generation workbench.

**Architecture:** Reuse the existing sample-library and generation-theme-inspiration patterns. Add one backend planner service and route, a small import parser for Markdown/CSV external samples, and a frontend planner panel in sample library that stores imported external samples in browser state and applies planner card prefills into the existing generation form.

**Tech Stack:** Node.js ESM server, vanilla JavaScript frontend, existing `node:test` suites, local JSON data store

---

## References / Inspirations

- External product-direction references:
  - `xiaohongshu-ops-skill`: inspired the overall task split of `account analysis -> content planning -> next-post suggestion`, especially the idea that retrospective output should lead directly into planning instead of ending as a static report.
  - `redbook`: inspired the high-level analysis dimensions such as high/low-performing pattern comparison, content planning from prior winners, and summarizing reusable topic/structure signals from strong posts.
  - General social-media-agent / prompt-workflow repos: inspired the structured-input / structured-output pattern rather than a free-form single prompt.

- Internal project references:
  - Existing `sample library` record model (`publish`, `calibration`, `retro`) is the primary evidence layer for account retrospective signals.
  - Existing `theme inspiration` backend flow inspired the planner architecture: model summary first, normalized card output second, frontend card selection third.
  - Existing generation workbench prefill flow inspired the planner-card contract (`prefillBriefing`, `prefillReferenceTitle`, `prefillMaterialText`, `prefillCollectionType`, `prefillTone`).

- What is custom in this implementation:
  - Local-records-first plus external-samples-second weighting.
  - `model summary + heuristic fallback cards` so missing model card output does not block planning.
  - Planner cards designed specifically for this project’s `sample library -> generation workbench` loop instead of generic “marketing idea cards”.
