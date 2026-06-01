# Qnaigc Priority Routing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Route `minimax/minimax-m3`, `qwen/qwen3.6-plus`, and `z-ai/glm-5.1` through 七牛云 first, then fall back to DMXAPI, then keep the existing official fallback behavior.

**Architecture:** Add a small reusable routing helper in `src/glm.js` that knows how to call 七牛云's chat completions endpoint and then reuse the existing DMXAPI + official fallback chain. Keep provider selection and UI labels mostly unchanged so the behavior change stays concentrated in the transport layer. Add focused tests that lock down the new route order and the exact model mapping for the three affected model names.

**Tech Stack:** Node.js, `node:test`, existing OpenAI-compatible chat request helpers, environment-variable based config.

---

### Task 1: Add a 七牛云-first routing helper for the three targeted models

**Files:**
- Modify: `src/glm.js`

- [ ] **Step 1: Write the failing test**

Add a new `node:test` case in `test/qwen-nvidia-fallback.test.js` that imports `callRoutedTextProviderJson`, sets `QNAIGC_API_KEY`, `DMXAPI_API_KEY`, and the provider-specific model env vars, then stubs `globalThis.fetch` to record request URLs and models. The test should assert that a `qwen` call for `qwen3.6-plus` hits `https://api.qnaigc.com/v1/chat/completions` first with `model: "qwen/qwen3.6-plus"`, then falls back to `https://www.dmxapi.cn/v1/chat/completions` with `model: "qwen3.6-plus"` when the 七牛云 call returns a recoverable failure, and finally preserves the existing attempted route metadata.

```js
test("callRoutedTextProviderJson uses 七牛云 first for qwen3.6-plus and falls back to DMXAPI", async () => {
  await withEnv(
    {
      QNAIGC_API_KEY: "qnaigc-test",
      DMXAPI_API_KEY: "dmxapi-test",
      QWEN_DMXAPI_MODEL: "qwen3.6-plus"
    },
    async () => {
      const calls = [];
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async (url, options = {}) => {
        const body = JSON.parse(String(options.body || "{}"));
        calls.push({ url: String(url), model: body.model });

        if (String(url) === "https://api.qnaigc.com/v1/chat/completions") {
          return createJsonResponse(500, { error: { message: "qnaigc unavailable" } });
        }

        return createJsonResponse(200, {
          model: "qwen3.6-plus",
          choices: [
            {
              message: {
                content: JSON.stringify({ verdict: "pass", confidence: 0.9 })
              }
            }
          ]
        });
      };

      try {
        const { callRoutedTextProviderJson } = await importFresh("../src/glm.js");
        const result = await callRoutedTextProviderJson({
          provider: "qwen",
          model: "qwen3.6-plus",
          messages: [{ role: "user", content: "hello" }],
          timeoutMs: 1000
        });

        assert.equal(result.route, "dmxapi");
        assert.equal(result.routeLabel, "DMXAPI");
        assert.deepEqual(calls, [
          { url: "https://api.qnaigc.com/v1/chat/completions", model: "qwen/qwen3.6-plus" },
          { url: "https://www.dmxapi.cn/v1/chat/completions", model: "qwen3.6-plus" }
        ]);
      } finally {
        globalThis.fetch = originalFetch;
      }
    }
  );
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npx tsx --test test/qwen-nvidia-fallback.test.js
```

Expected: the new test fails because `qwen3.6-plus` still routes only through DMXAPI and does not call 七牛云.

- [ ] **Step 3: Implement the minimal routing helper**

In `src/glm.js`, add a small qnaigc endpoint constant plus a helper that can:
- recognize the three targeted models by normalized model name:
  - `minimax/minimax-m3`
  - `qwen/qwen3.6-plus`
  - `z-ai/glm-5.1`
- map them to the 七牛云 request model exactly as:
  - `minimax/minimax-m3`
  - `qwen/qwen3.6-plus`
  - `z-ai/glm-5.1`
- try 七牛云 first when `QNAIGC_API_KEY` is present
- on recoverable 七牛云 failure, call the existing DMXAPI route next
- preserve the existing official fallback behavior after DMXAPI

Use the existing `executeChatRequest`, `parseJsonChatResult`, and route metadata helpers so the new path stays consistent with the current transport logic.

```js
const defaultQnaigcEndpoint = "https://api.qnaigc.com/v1/chat/completions";

function normalizeQnaigcTargetModel(model = "") {
  const normalized = String(model || "").trim().toLowerCase();

  if (normalized === "minimax/minimax-m3") return "minimax/minimax-m3";
  if (normalized === "qwen/qwen3.6-plus") return "qwen/qwen3.6-plus";
  if (normalized === "z-ai/glm-5.1") return "z-ai/glm-5.1";

  return "";
}

async function callQnaigcThenDmxapiThenOfficialJson(options) {
  // Try 七牛云 first for the mapped model names, then fall back to the existing routed flow.
}
```

- [ ] **Step 4: Run the focused test again**

Run:

```bash
npx tsx --test test/qwen-nvidia-fallback.test.js
```

Expected: the new routing test passes, and existing DMXAPI-first tests still pass.

- [ ] **Step 5: Commit**

```bash
git add src/glm.js test/qwen-nvidia-fallback.test.js
git commit -m "feat: add qnaigc-first routing for selected models"
```

### Task 2: Make rewrite/selection paths use the new model names without breaking existing UI labels

**Files:**
- Modify: `src/model-selection.js`
- Modify: `src/glm.js`
- Modify: `test/model-selection.test.js`

- [ ] **Step 1: Write the failing test**

Add a small assertion to `test/model-selection.test.js` that verifies the model selection payload can expose the new model names where appropriate, while still keeping the existing `provider` value for the affected families. Use the current helpers already imported in the file and assert that the generated labels include the exact model strings users will route to, especially for the `qwen` and `glm` provider rows.

```js
test("buildModelSelectionOptionsPayload exposes the qnaigc-routed model names", async () => {
  const { buildModelSelectionOptionsPayload: buildPayload } = await importFresh("../src/model-selection.js");
  const payload = buildPayload();
  const qwenOption = payload.semantic.find((item) => item.value === "qwen");
  const glmOption = payload.semantic.find((item) => item.value === "glm");

  assert.match(String(qwenOption?.label || ""), /qwen3\.6-plus/);
  assert.match(String(glmOption?.label || ""), /glm-5\.1/);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npx tsx --test test/model-selection.test.js
```

Expected: the new assertion fails because the payload still reflects the old DMXAPI-specific naming.

- [ ] **Step 3: Update the model selection helpers**

In `src/model-selection.js`, keep the provider values stable, but make the displayed/routed model names line up with the new qnaigc-first behavior for the three affected families. Keep the existing DMXAPI defaults as the fallback path so users can still see and select the same providers, but make sure the label text does not obscure the actual first-hop model name.

```js
function getQwenDmxapiModel() {
  return String(process.env.QWEN_DMXAPI_MODEL || "qwen3.6-plus").trim();
}
```

- [ ] **Step 4: Re-run the model-selection test**

Run:

```bash
npx tsx --test test/model-selection.test.js
```

Expected: the new assertion passes and the existing label assertions stay green.

- [ ] **Step 5: Commit**

```bash
git add src/model-selection.js src/glm.js test/model-selection.test.js
git commit -m "feat: align model selection with qnaigc routing"
```

### Task 3: Verify the full affected test surface

**Files:**
- No code changes

- [ ] **Step 1: Run the targeted test suites**

Run:

```bash
npx tsx --test test/qwen-nvidia-fallback.test.js test/model-selection.test.js test/rewrite-provider-config.test.js
```

Expected: all three suites pass, with the new qnaigc-first routes visible in the recorded calls and no regressions in existing DMXAPI or official fallback behavior.

- [ ] **Step 2: Inspect git status**

Run:

```bash
git status --short
```

Expected: only the intended source and test files are modified or staged.

- [ ] **Step 3: Commit the remaining verification-only work if needed**

If there are any follow-up test fixes or tiny routing cleanups from the verification pass, commit them with a focused message such as:

```bash
git add <files>
git commit -m "test: verify qnaigc-first routing"
```

