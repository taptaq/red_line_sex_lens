import crypto from "node:crypto";
import { normalizeText } from "./normalizer.js";

function normalizeSource(value = "") {
  return String(value || "xiaohongshu").trim().toLowerCase();
}

function normalizeField(value = "") {
  return normalizeText(String(value || ""));
}

export function buildFeedbackIdentityKey(item = {}) {
  const source = normalizeSource(item.source);
  const title = normalizeField(item.title);
  const noteContent = normalizeField(item.noteContent || item.body);

  if (!title && !noteContent) {
    return "";
  }

  return `${source}|${title}|${noteContent}`;
}

export function deriveFeedbackNoteId(item = {}, fallbackSuffix = "0") {
  const explicitNoteId = String(item.noteId || "").trim();

  if (explicitNoteId) {
    return explicitNoteId;
  }

  const identityKey = buildFeedbackIdentityKey(item);

  if (identityKey) {
    return `feedback-${crypto.createHash("sha1").update(identityKey).digest("hex").slice(0, 16)}`;
  }

  return `feedback-${Date.now()}-${fallbackSuffix}`;
}

export function isSameFeedbackNote(left = {}, right = {}) {
  const leftNoteId = String(left.noteId || "").trim();
  const rightNoteId = String(right.noteId || "").trim();

  if (leftNoteId && rightNoteId && leftNoteId === rightNoteId) {
    return true;
  }

  const leftIdentityKey = buildFeedbackIdentityKey(left);
  const rightIdentityKey = buildFeedbackIdentityKey(right);

  return Boolean(leftIdentityKey && rightIdentityKey && leftIdentityKey === rightIdentityKey);
}
