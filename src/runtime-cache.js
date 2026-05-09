export function createRuntimeCache() {
  const values = new Map();
  const inflight = new Map();
  const tagIndex = new Map();
  const keyTags = new Map();
  const keyVersions = new Map();
  let clearVersion = 0;

  function getKeyVersion(key) {
    return keyVersions.get(key) || 0;
  }

  function bumpKeyVersion(key) {
    keyVersions.set(key, getKeyVersion(key) + 1);
  }

  function rememberKeyTags(key, tags = []) {
    if (!tags.length) {
      return;
    }

    const knownTags = keyTags.get(key) || new Set();

    tags.forEach((tag) => {
      knownTags.add(tag);
      const keys = tagIndex.get(tag) || new Set();
      keys.add(key);
      tagIndex.set(tag, keys);
    });

    keyTags.set(key, knownTags);
  }

  function forgetKeyTags(key) {
    const knownTags = keyTags.get(key) || new Set();

    knownTags.forEach((tag) => {
      const keys = tagIndex.get(tag);

      if (!keys) {
        return;
      }

      keys.delete(key);

      if (!keys.size) {
        tagIndex.delete(tag);
      }
    });

    keyTags.delete(key);
  }

  return {
    async getOrLoad(key, loader, { ttlMs = 0, tags = [] } = {}) {
      rememberKeyTags(key, tags);
      const current = values.get(key);

      if (current && current.expiresAt > Date.now()) {
        return current.value;
      }

      if (inflight.has(key)) {
        return inflight.get(key);
      }

      const keyVersionAtStart = getKeyVersion(key);
      const clearVersionAtStart = clearVersion;

      const promise = Promise.resolve()
        .then(loader)
        .then((value) => {
          if (getKeyVersion(key) === keyVersionAtStart && clearVersion === clearVersionAtStart) {
            values.set(key, {
              value,
              expiresAt: Date.now() + ttlMs
            });
            rememberKeyTags(key, tags);
          }

          if (inflight.get(key) === promise) {
            inflight.delete(key);
          }

          return value;
        })
        .catch((error) => {
          if (inflight.get(key) === promise) {
            inflight.delete(key);
          }

          throw error;
        });

      inflight.set(key, promise);
      return promise;
    },
    invalidateKey(key) {
      bumpKeyVersion(key);
      values.delete(key);
      inflight.delete(key);
      forgetKeyTags(key);
    },
    invalidateTag(tag) {
      const keys = tagIndex.get(tag) || new Set();
      keys.forEach((key) => {
        bumpKeyVersion(key);
        values.delete(key);
        inflight.delete(key);
        const tags = keyTags.get(key);

        if (tags) {
          tags.delete(tag);

          if (!tags.size) {
            keyTags.delete(key);
          }
        }
      });
      tagIndex.delete(tag);
    },
    clear() {
      clearVersion += 1;
      values.clear();
      inflight.clear();
      tagIndex.clear();
      keyTags.clear();
      keyVersions.clear();
    }
  };
}
