function normalizeString(value = "") {
  return String(value || "");
}

export function createDeterministicEmbeddingProvider({ version = "deterministic-v1" } = {}) {
  return {
    version,
    async embedTexts(texts = []) {
      return (Array.isArray(texts) ? texts : []).map((text) => {
        const value = normalizeString(text);
        const chars = [...value];
        const sum = chars.reduce((total, char) => total + char.charCodeAt(0), 0);
        const whitespace = chars.filter((char) => /\s/u.test(char)).length;

        return [
          chars.length,
          whitespace,
          sum % 997,
          value.includes("导流") ? 1 : 0,
          value.includes("沟通") ? 1 : 0,
          value.includes("误报") ? 1 : 0
        ];
      });
    }
  };
}
