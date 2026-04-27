import test from "node:test";
import assert from "node:assert/strict";

async function importFresh(modulePath) {
  return import(`${modulePath}?test=${Date.now()}-${Math.random()}`);
}

async function withEnv(overrides, run) {
  const previous = new Map();

  for (const [key, value] of Object.entries(overrides)) {
    previous.set(key, process.env[key]);
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  try {
    return await run();
  } finally {
    for (const [key, value] of previous.entries()) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

test("resolveDisplayProvider prefers MIMO_DMXAPI_MODEL for mimo display mapping", async () => {
  await withEnv(
    {
      MIMO_DMXAPI_MODEL: "mimo-custom-free",
      DEEPSEEK_DMXAPI_MODEL: "mimo-legacy-free"
    },
    async () => {
      const { resolveDisplayProvider } = await importFresh("../src/provider-display.js");
      const result = resolveDisplayProvider({
        provider: "deepseek",
        route: "dmxapi",
        model: "mimo-custom-free"
      });

      assert.equal(result.provider, "mimo");
    }
  );
});

test("resolveDisplayProvider still supports legacy DEEPSEEK_DMXAPI_MODEL as fallback", async () => {
  await withEnv(
    {
      MIMO_DMXAPI_MODEL: undefined,
      DEEPSEEK_DMXAPI_MODEL: "mimo-legacy-free"
    },
    async () => {
      const { resolveDisplayProvider } = await importFresh("../src/provider-display.js");
      const result = resolveDisplayProvider({
        provider: "deepseek",
        route: "dmxapi",
        model: "mimo-legacy-free"
      });

      assert.equal(result.provider, "mimo");
    }
  );
});
