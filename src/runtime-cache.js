export function createRuntimeCache() {
  const values = new Map();
  const inflight = new Map();
  const tagIndex = new Map();

  return {
    async getOrLoad(key, loader, { ttlMs = 0, tags = [] } = {}) {
      const current = values.get(key);

      if (current && current.expiresAt > Date.now()) {
        return current.value;
      }

      if (inflight.has(key)) {
        return inflight.get(key);
      }

      const promise = Promise.resolve()
        .then(loader)
        .then((value) => {
          values.set(key, {
            value,
            expiresAt: Date.now() + ttlMs
          });

          tags.forEach((tag) => {
            const keys = tagIndex.get(tag) || new Set();
            keys.add(key);
            tagIndex.set(tag, keys);
          });

          inflight.delete(key);
          return value;
        })
        .catch((error) => {
          inflight.delete(key);
          throw error;
        });

      inflight.set(key, promise);
      return promise;
    },
    invalidateKey(key) {
      values.delete(key);
      inflight.delete(key);
    },
    invalidateTag(tag) {
      const keys = tagIndex.get(tag) || new Set();
      keys.forEach((key) => {
        values.delete(key);
        inflight.delete(key);
      });
      tagIndex.delete(tag);
    },
    clear() {
      values.clear();
      inflight.clear();
      tagIndex.clear();
    }
  };
}
