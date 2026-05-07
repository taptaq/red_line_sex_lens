import fs from "node:fs/promises";
import path from "node:path";
import { paths } from "../config.js";
import { loadMemoryStoreSnapshot, saveMemoryStoreSnapshot } from "../data-store.js";

const rootWriteLocks = new Map();

function normalizeString(value = "") {
  return String(value || "").trim();
}

function normalizePositiveInteger(value, fallback = 5) {
  const normalized = Math.floor(Number(value));
  return Number.isFinite(normalized) && normalized > 0 ? normalized : fallback;
}

function cosineSimilarity(left = [], right = []) {
  const size = Math.max(left.length, right.length);
  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;

  for (let index = 0; index < size; index += 1) {
    const leftValue = Number(left[index] || 0);
    const rightValue = Number(right[index] || 0);
    dot += leftValue * rightValue;
    leftNorm += leftValue * leftValue;
    rightNorm += rightValue * rightValue;
  }

  if (!leftNorm || !rightNorm) {
    return 0;
  }

  return dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm));
}

function uniqueStrings(items = []) {
  return [...new Set((Array.isArray(items) ? items : [items]).map((item) => normalizeString(item)).filter(Boolean))];
}

function isMemoryCardKind(kind = "") {
  return normalizeString(kind).endsWith("_card");
}

function extractSearchUnits(value = "") {
  const normalized = normalizeString(value).toLowerCase();

  if (!normalized) {
    return [];
  }

  const whitespaceTokens = normalized.split(/\s+/u).filter(Boolean);

  if (whitespaceTokens.length > 1) {
    return uniqueStrings(whitespaceTokens);
  }

  const chars = [...normalized];
  const ngrams = [];

  if (chars.length >= 2) {
    for (let index = 0; index < chars.length - 1; index += 1) {
      ngrams.push(chars.slice(index, index + 2).join(""));
    }
  }

  return uniqueStrings([normalized, ...ngrams]);
}

function computeQuerySignalScore(queryText = "", searchText = "") {
  const query = normalizeString(queryText).toLowerCase();
  const candidate = normalizeString(searchText).toLowerCase();

  if (!query || !candidate) {
    return 0;
  }

  const units = extractSearchUnits(query);

  if (!units.length) {
    return candidate.includes(query) ? 1 : 0;
  }

  const matchedUnits = units.filter((unit) => candidate.includes(unit)).length;
  const exactMatchBonus = candidate.includes(query) ? 1 : 0;

  return matchedUnits / units.length + exactMatchBonus;
}

function scoreDocument({ queryEmbedding = [], queryText = "", document = {} } = {}) {
  const similarity = cosineSimilarity(queryEmbedding, document.embedding || []);
  const querySignal = computeQuerySignalScore(queryText, document.searchText);
  const retrievalWeight = Number(document.retrievalWeight || 0);

  return similarity + querySignal * 0.75 + retrievalWeight * 0.01;
}

function createStorePaths(rootDir) {
  return {
    documentsPath: path.join(rootDir, path.basename(paths.memoryDocuments)),
    cardsPath: path.join(rootDir, path.basename(paths.memoryCards)),
    embeddingsPath: path.join(rootDir, path.basename(paths.memoryEmbeddings)),
    metaPath: path.join(rootDir, path.basename(paths.memoryIndexMeta))
  };
}

async function readJsonLines(filePath) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return raw
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  } catch (error) {
    if (error.code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

async function writeJsonLines(filePath, items) {
  const lines = (Array.isArray(items) ? items : []).map((item) => JSON.stringify(item));
  await fs.writeFile(filePath, lines.length ? `${lines.join("\n")}\n` : "", "utf8");
}

async function writeJson(filePath, value) {
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function createMemoryVectorStore({
  rootDir = paths.memoryRoot,
  embeddingProvider
} = {}) {
  if (!embeddingProvider || typeof embeddingProvider.embedTexts !== "function") {
    throw new Error("Memory vector store requires an explicit embedding provider.");
  }

  const resolvedRootDir = path.resolve(rootDir);
  const storePaths = createStorePaths(rootDir);
  const usesDefaultStorage = resolvedRootDir === path.resolve(paths.memoryRoot);

  async function ensureRoot() {
    await fs.mkdir(rootDir, { recursive: true });
  }

  async function readState() {
    if (usesDefaultStorage) {
      const { documents, cards, embeddings } = await loadMemoryStoreSnapshot();
      return mergeDocumentsWithEmbeddings([...documents, ...cards], embeddings);
    }

    return readStateFromFiles();
  }

  async function readStateFromFiles() {
    const [documents, cards, embeddings] = await Promise.all([
      readJsonLines(storePaths.documentsPath),
      readJsonLines(storePaths.cardsPath),
      readJsonLines(storePaths.embeddingsPath)
    ]);
    return mergeDocumentsWithEmbeddings([...documents, ...cards], embeddings);
  }

  function mergeDocumentsWithEmbeddings(documents = [], embeddings = []) {
    const embeddingMap = new Map(
      embeddings
        .filter((entry) => normalizeString(entry.id))
        .map((entry) => [
          normalizeString(entry.id),
          {
            embedding: Array.isArray(entry.embedding) ? entry.embedding : [],
            embeddingVersion: normalizeString(entry.embeddingVersion)
          }
        ])
    );

    return documents.map((document) => {
      const embedded = embeddingMap.get(normalizeString(document.id));

      if (!embedded) {
        return { ...document, embedding: [], embeddingVersion: normalizeString(document.embeddingVersion) };
      }

      return {
        ...document,
        embedding: embedded.embedding,
        embeddingVersion: embedded.embeddingVersion || normalizeString(document.embeddingVersion)
      };
    });
  }

  async function writeState(items) {
    const flattened = items.map(({ embedding, ...document }) => document);
    const documents = flattened.filter((item) => !isMemoryCardKind(item.kind));
    const cards = flattened.filter((item) => isMemoryCardKind(item.kind));
    const embeddings = items.map((item) => ({
      id: item.id,
      embedding: Array.isArray(item.embedding) ? item.embedding : [],
      embeddingVersion: normalizeString(item.embeddingVersion)
    }));
    const meta = {
      updatedAt: new Date().toISOString(),
      documentCount: items.length,
      embeddingVersion: normalizeString(embeddingProvider.version)
    };

    if (usesDefaultStorage) {
      await saveMemoryStoreSnapshot({ documents, cards, embeddings, meta });
      return;
    }

    await ensureRoot();
    await Promise.all([
      writeJsonLines(storePaths.documentsPath, documents),
      writeJsonLines(storePaths.cardsPath, cards),
      writeJsonLines(storePaths.embeddingsPath, embeddings),
      writeJson(storePaths.metaPath, meta)
    ]);
  }

  function matchesActiveEmbeddingVersion(item = {}) {
    return normalizeString(item.embeddingVersion) === normalizeString(embeddingProvider.version);
  }

  async function withWriteLock(operation) {
    const currentChain = rootWriteLocks.get(resolvedRootDir) || Promise.resolve();
    const pending = currentChain.then(operation);
    rootWriteLocks.set(resolvedRootDir, pending.catch(() => {}));
    return pending;
  }

  return {
    async replaceAllDocuments(documents = []) {
      return withWriteLock(async () => {
        const incoming = Array.isArray(documents) ? documents.filter(Boolean) : [];
        const embeddings = await embeddingProvider.embedTexts(incoming.map((item) => item.searchText || ""));
        const next = incoming
          .map((document, index) => {
            const normalizedId = normalizeString(document.id);

            if (!normalizedId) {
              return null;
            }

            return {
              ...document,
              id: normalizedId,
              embedding: Array.isArray(embeddings[index]) ? embeddings[index] : [],
              embeddingVersion: normalizeString(embeddingProvider.version)
            };
          })
          .filter(Boolean);

        await writeState(next);
        return next;
      });
    },
    async upsertDocuments(documents = []) {
      return withWriteLock(async () => {
        const incoming = Array.isArray(documents) ? documents.filter(Boolean) : [];
        const current = await readState();
        const nextById = new Map(current.map((item) => [normalizeString(item.id), item]));
        const embeddings = await embeddingProvider.embedTexts(incoming.map((item) => item.searchText || ""));

        incoming.forEach((document, index) => {
          const normalizedId = normalizeString(document.id);

          if (!normalizedId) {
            return;
          }

          nextById.set(normalizedId, {
            ...nextById.get(normalizedId),
            ...document,
            id: normalizedId,
            embedding: Array.isArray(embeddings[index]) ? embeddings[index] : [],
            embeddingVersion: normalizeString(embeddingProvider.version)
          });
        });

        const next = [...nextById.values()];
        await writeState(next);
        return next;
      });
    },
    async search({ queryText = "", limit = 5, filters = {} } = {}) {
      const current = await readState();
      const [queryEmbedding] = await embeddingProvider.embedTexts([queryText]);
      const items = current
        .filter((item) => {
          if (!matchesActiveEmbeddingVersion(item)) {
            return false;
          }

          if (Array.isArray(filters.kind) && filters.kind.length && !filters.kind.includes(item.kind)) {
            return false;
          }

          if (Array.isArray(filters.status) && filters.status.length && !filters.status.includes(item.status)) {
            return false;
          }

          if (normalizeString(filters.collectionType) && item.collectionType !== filters.collectionType) {
            return false;
          }

          return true;
        })
        .map((item) => {
          const score = scoreDocument({ queryEmbedding, queryText, document: item });
          return {
            ...item,
            score,
            similarity: cosineSimilarity(queryEmbedding, item.embedding || [])
          };
        })
        .sort((left, right) => right.score - left.score || right.similarity - left.similarity || left.id.localeCompare(right.id))
        .slice(0, normalizePositiveInteger(limit, 5));

      return { items };
    }
  };
}
