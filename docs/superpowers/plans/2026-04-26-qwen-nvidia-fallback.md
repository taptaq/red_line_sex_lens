# NVIDIA-First Text Provider Routing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make all GLM, Kimi, Qwen, and DeepSeek text helpers prefer NVIDIA first and fall back to official provider endpoints only when needed.

**Architecture:** Rework the shared text request layer in `src/glm.js` into a provider-aware router with `NVIDIA -> official` ordering. Route GLM, Kimi, Qwen, and DeepSeek text flows through that shared helper so current and future helpers inherit the same behavior.

**Tech Stack:** Node.js, built-in `fetch`, `node:test`, existing ESM modules

---

### Task 1: Lock NVIDIA-first behavior with failing tests

**Files:**
- Modify: `test/qwen-nvidia-fallback.test.js`
- Test: `test/qwen-nvidia-fallback.test.js`

- [ ] Step 1: Update existing tests to expect NVIDIA as the primary route and official provider fallback second.
- [ ] Step 2: Add at least one GLM, one Kimi, and one DeepSeek test covering NVIDIA-first routing.
- [ ] Step 3: Run `node --test test/qwen-nvidia-fallback.test.js` and confirm it fails before implementation.

### Task 2: Generalize the shared router in `src/glm.js`

**Files:**
- Modify: `src/glm.js`
- Test: `test/qwen-nvidia-fallback.test.js`

- [ ] Step 1: Add provider route config for `glm`, `kimi`, `qwen`, and `deepseek`.
- [ ] Step 2: Change the routing order to `NVIDIA -> official`, skipping NVIDIA when `NVIDIA_API_KEY` is absent.
- [ ] Step 3: Keep requests non-streaming and preserve current JSON parsing behavior.
- [ ] Step 4: Run `node --test test/qwen-nvidia-fallback.test.js` and confirm router-level tests pass.

### Task 3: Route existing flows through the shared helper

**Files:**
- Modify: `src/glm.js`
- Modify: `src/cross-review.js`
- Modify: `src/semantic-review.js`
- Test: `test/qwen-nvidia-fallback.test.js`

- [ ] Step 1: Route GLM, Kimi, Qwen, and DeepSeek feedback/text helper paths through the shared helper where appropriate.
- [ ] Step 2: Route Qwen and DeepSeek review flows through the shared helper while preserving result shape.
- [ ] Step 3: Re-run `node --test test/qwen-nvidia-fallback.test.js` and confirm flow coverage passes.

### Task 4: Verify regression safety

**Files:**
- Test: `test/qwen-nvidia-fallback.test.js`
- Test: `test/deepseek-default-model.test.js`
- Test: `test/rewrite-provider-config.test.js`

- [ ] Step 1: Run `node --test test/qwen-nvidia-fallback.test.js test/deepseek-default-model.test.js test/rewrite-provider-config.test.js`.
- [ ] Step 2: Confirm all targeted tests pass and no secrets were added to tracked files.
