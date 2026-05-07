function normalizeString(value = "") {
  return String(value || "").trim();
}

function buildAnalysisQueryText(input = {}) {
  return [
    normalizeString(input.title),
    normalizeString(input.body),
    normalizeString(input.coverText),
    (Array.isArray(input.tags) ? input.tags : []).map((tag) => normalizeString(tag)).filter(Boolean).join(" ")
  ]
    .filter(Boolean)
    .join("\n");
}

function buildGenerationQueryText(input = {}) {
  return [
    normalizeString(input.topic),
    normalizeString(input.collectionType),
    normalizeString(input.constraints),
    (Array.isArray(input.tags) ? input.tags : []).map((tag) => normalizeString(tag)).filter(Boolean).join(" ")
  ]
    .filter(Boolean)
    .join("\n");
}

function pickEmbeddingVersion(groups = []) {
  for (const group of groups) {
    for (const item of Array.isArray(group) ? group : []) {
      if (normalizeString(item.embeddingVersion)) {
        return normalizeString(item.embeddingVersion);
      }
    }
  }

  return "";
}

export function createMemoryRetrievalService({ vectorStore } = {}) {
  if (!vectorStore || typeof vectorStore.search !== "function") {
    throw new Error("Memory retrieval service requires a vector store with search().");
  }

  async function searchBuckets({ queryText = "", kinds = [], limit, collectionType = "" } = {}) {
    const result = await vectorStore.search({
      queryText,
      limit,
      filters: {
        kind: Array.isArray(kinds) ? kinds : [kinds],
        status: ["active"],
        collectionType
      }
    });

    return Array.isArray(result?.items) ? result.items : [];
  }

  return {
    async retrieveForAnalysis(input = {}) {
      const queryText = buildAnalysisQueryText(input);
      const [riskFeedback, falsePositiveHints, referenceSamples, memoryCards] = await Promise.all([
        searchBuckets({ queryText, kinds: ["violation_feedback"], limit: 4 }),
        searchBuckets({ queryText, kinds: ["false_positive"], limit: 4 }),
        searchBuckets({ queryText, kinds: ["reference_sample"], limit: 4 }),
        searchBuckets({ queryText, kinds: ["risk_pattern_card"], limit: 4 })
      ]);

      return {
        riskFeedback,
        falsePositiveHints,
        referenceSamples,
        memoryCards,
        retrievalMeta: {
          queryKind: "analysis",
          embeddingVersion: pickEmbeddingVersion([
            riskFeedback,
            falsePositiveHints,
            referenceSamples,
            memoryCards
          ]),
          candidateCount:
            riskFeedback.length +
            falsePositiveHints.length +
            referenceSamples.length +
            memoryCards.length
        }
      };
    },
    async retrieveForGeneration(input = {}) {
      const queryText = buildGenerationQueryText(input);
      const [referenceSamples, memoryCards] = await Promise.all([
        searchBuckets({
          queryText,
          kinds: ["reference_sample"],
          limit: 5,
          collectionType: normalizeString(input.collectionType)
        }),
        searchBuckets({ queryText, kinds: ["style_experience_card", "risk_boundary_card"], limit: 4 })
      ]);

      return {
        riskFeedback: [],
        falsePositiveHints: [],
        referenceSamples,
        memoryCards,
        retrievalMeta: {
          queryKind: "generation",
          embeddingVersion: pickEmbeddingVersion([referenceSamples, memoryCards]),
          candidateCount: referenceSamples.length + memoryCards.length
        }
      };
    },
    async retrieveForRewrite(input = {}) {
      const queryText = buildAnalysisQueryText(input);
      const [riskFeedback, falsePositiveHints, referenceSamples, memoryCards] = await Promise.all([
        searchBuckets({ queryText, kinds: ["violation_feedback"], limit: 4 }),
        searchBuckets({ queryText, kinds: ["false_positive"], limit: 3 }),
        searchBuckets({ queryText, kinds: ["reference_sample"], limit: 3 }),
        searchBuckets({ queryText, kinds: ["rewrite_strategy_card"], limit: 4 })
      ]);

      return {
        riskFeedback,
        falsePositiveHints,
        referenceSamples,
        memoryCards,
        retrievalMeta: {
          queryKind: "rewrite",
          embeddingVersion: pickEmbeddingVersion([
            riskFeedback,
            falsePositiveHints,
            referenceSamples,
            memoryCards
          ]),
          candidateCount:
            riskFeedback.length +
            falsePositiveHints.length +
            referenceSamples.length +
            memoryCards.length
        }
      };
    }
  };
}
