# NVIDIA-First Text Provider Routing Design

## Goal

Standardize all GLM, Qwen, DeepSeek, and Kimi text helpers to prefer NVIDIA's OpenAI-compatible
endpoint first and fall back to each provider's official endpoint only when needed.

## Scope

This applies to all current and future GLM, Qwen, DeepSeek, and Kimi text flows, including:

- text rewrite and related GLM helper calls in `src/glm.js`
- feedback suggestion in `src/glm.js`
- cross review in `src/cross-review.js`
- semantic review in `src/semantic-review.js`

The routing rule must live in shared helper logic so new helpers inherit it by default.

## Provider Behavior

### Primary path

GLM, Qwen, DeepSeek, and Kimi text helpers should call NVIDIA first when `NVIDIA_API_KEY` exists.

- endpoint: `https://integrate.api.nvidia.com/v1/chat/completions`
- auth env: `NVIDIA_API_KEY`
- qwen model env: `QWEN_NVIDIA_MODEL`
- qwen default model: `qwen/qwen3.5-397b-a17b`
- glm model env: `GLM_NVIDIA_MODEL`
- glm default model: `z-ai/glm-5.1`
- kimi model env: `KIMI_NVIDIA_MODEL`
- kimi default model: `moonshotai/kimi-k2.5`
- deepseek model env: `DEEPSEEK_NVIDIA_MODEL`
- deepseek default model: `deepseek-ai/deepseek-v4-pro`

Requests must stay non-streaming. Do not set `stream: true`.

### Fallback path

If NVIDIA is not configured, skip it and use the official provider directly.

If NVIDIA is configured but the request fails with a recoverable error, retry once
through the provider's official endpoint:

- GLM official endpoint: `https://open.bigmodel.cn/api/paas/v4/chat/completions`
- GLM auth env: `GLM_API_KEY`
- Kimi official endpoint: `https://api.moonshot.cn/v1/chat/completions` or `KIMI_BASE_URL`
- Kimi auth env: `KIMI_API_KEY`
- Qwen official endpoint: `https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions`
- Qwen auth env: `DASHSCOPE_API_KEY`
- DeepSeek official endpoint: `https://api.deepseek.com/chat/completions`
- DeepSeek auth env: `DEEPSEEK_API_KEY`

## Recoverable Errors

Official fallback is allowed for these NVIDIA failures:

- request timeout / `AbortError`
- HTTP `400`
- HTTP `429`
- HTTP `5xx`
- HTTP `403` when the message indicates permission, forbidden access, or missing model access
- model missing / unknown model style errors

If NVIDIA is skipped because `NVIDIA_API_KEY` is missing, that is not an error. The
helper should proceed directly to the official endpoint.

## Shared Abstraction

Implement shared provider routing in `src/glm.js` for OpenAI-compatible chat calls with:

- provider route config (`glm`, `kimi`, `qwen`, `deepseek`)
- NVIDIA-first / official-second ordering
- env-backed auth and model lookup
- non-streaming request body assembly
- timeout handling
- JSON parsing
- recoverable error classification

`src/cross-review.js` and `src/semantic-review.js` should reuse the shared helper
instead of embedding provider-specific route ordering.

## Model Selection

Existing business env vars still define official endpoint model names:

- `GLM_TEXT_MODEL`
- `GLM_FEEDBACK_MODEL`
- `GLM_CROSS_REVIEW_MODEL`
- `GLM_SEMANTIC_MODEL`
- `KIMI_TEXT_MODEL`
- `QWEN_FEEDBACK_MODEL`
- `QWEN_CROSS_REVIEW_MODEL`
- `QWEN_SEMANTIC_MODEL`
- `DEEPSEEK_FEEDBACK_MODEL`
- `DEEPSEEK_CROSS_REVIEW_MODEL`
- `DEEPSEEK_SEMANTIC_MODEL`

NVIDIA route models are separate:

- `GLM_NVIDIA_MODEL`
- `KIMI_NVIDIA_MODEL`
- `QWEN_NVIDIA_MODEL`
- `DEEPSEEK_NVIDIA_MODEL`

The returned `model` field should reflect the actual serving model from the route that
ultimately succeeded.

## Testing

Add or update regression tests that prove:

1. GLM uses NVIDIA first when available.
2. GLM falls back to the official GLM endpoint when NVIDIA fails with a recoverable error.
3. Kimi uses NVIDIA first when available.
4. Kimi falls back to the official Kimi endpoint when NVIDIA fails with a recoverable error.
5. Qwen uses NVIDIA first when available.
6. Qwen falls back to DashScope when NVIDIA fails with a recoverable error.
7. Qwen skips NVIDIA and uses DashScope when `NVIDIA_API_KEY` is absent.
8. DeepSeek uses NVIDIA first when available.
9. DeepSeek falls back to the official DeepSeek endpoint when NVIDIA fails with a recoverable error.
10. Existing provider-config and DeepSeek default-model tests still pass.
