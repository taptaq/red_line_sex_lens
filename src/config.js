import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const projectRoot = path.resolve(__dirname, "..");
export const dataDir = path.join(projectRoot, "data");
export const webDir = path.join(projectRoot, "web");

export const paths = {
  lexiconSeed: path.join(dataDir, "lexicon.seed.json"),
  lexiconCustom: path.join(dataDir, "lexicon.custom.json"),
  whitelist: path.join(dataDir, "whitelist.json"),
  feedbackLog: path.join(dataDir, "feedback.log.json"),
  reviewQueue: path.join(dataDir, "review-queue.json"),
  rewritePairs: path.join(dataDir, "rewrite-pairs.json")
};
