export function createXhsConnectorProvider({ kind = "stub" } = {}) {
  if (kind !== "stub") {
    throw new Error(`Unsupported XHS connector provider: ${kind}`);
  }

  return {
    kind: "stub",
    async discover() {
      return [];
    },
    async fetchPublishedPerformance() {
      return [];
    }
  };
}
