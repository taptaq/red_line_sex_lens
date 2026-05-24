import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeXhsConnectorDiscoveryItem,
  buildSampleLibraryPayloadFromConnectorItem,
  buildLifecyclePatchFromConnectorSyncItem
} from "../src/xhs-connector-normalizer.js";

test("normalizeXhsConnectorDiscoveryItem maps provider content into project preview shape", () => {
  const result = normalizeXhsConnectorDiscoveryItem({
    provider: "stub-provider",
    note_id: "note-1",
    xsec_token: "token-1",
    url: "https://www.xiaohongshu.com/explore/note-1",
    title: "标题",
    desc: "正文摘要",
    author_name: "作者",
    author_id: "author-1",
    type: "normal",
    publish_time: "2026-05-20T10:00:00.000Z",
    tags: ["AI", "效率"],
    metrics: {
      likes: 12,
      favorites: 3,
      comments: 1,
      views: 88,
      shares: 2
    }
  });

  assert.deepEqual(result, {
    provider: "stub-provider",
    noteId: "note-1",
    xsecToken: "token-1",
    url: "https://www.xiaohongshu.com/explore/note-1",
    title: "标题",
    bodyPreview: "正文摘要",
    coverText: "",
    authorName: "作者",
    authorId: "author-1",
    noteType: "image",
    publishedAt: "2026-05-20T10:00:00.000Z",
    metrics: {
      likes: 12,
      favorites: 3,
      comments: 1,
      views: 88,
      shares: 2
    },
    tags: ["AI", "效率"]
  });
});

test("buildSampleLibraryPayloadFromConnectorItem produces conservative imported sample payload", () => {
  const result = buildSampleLibraryPayloadFromConnectorItem({
    provider: "stub-provider",
    noteId: "note-1",
    xsecToken: "token-1",
    url: "https://www.xiaohongshu.com/explore/note-1",
    title: "标题",
    bodyPreview: "正文摘要",
    coverText: "",
    authorName: "作者",
    authorId: "author-1",
    noteType: "image",
    publishedAt: "2026-05-20T10:00:00.000Z",
    metrics: {
      likes: 12,
      favorites: 3,
      comments: 1,
      views: 88,
      shares: 2
    },
    tags: ["AI", "效率"]
  }, {
    fetchedAt: "2026-05-24T00:00:00.000Z"
  });

  assert.equal(result.source, "imported");
  assert.equal(result.stage, "draft");
  assert.equal(result.sampleType, "");
  assert.equal(result.note.title, "标题");
  assert.equal(result.note.body, "正文摘要");
  assert.deepEqual(result.publish.metrics, {
    likes: 12,
    favorites: 3,
    comments: 1,
    views: 88,
    shares: 2
  });
  assert.equal(result.externalSource.provider, "stub-provider");
  assert.equal(result.externalSource.noteId, "note-1");
  assert.equal(result.externalSource.fetchedAt, "2026-05-24T00:00:00.000Z");
});

test("buildLifecyclePatchFromConnectorSyncItem produces lifecycle-only patch", () => {
  const result = buildLifecyclePatchFromConnectorSyncItem({
    recordId: "record-1",
    externalSource: {
      provider: "stub-provider",
      noteId: "note-1",
      url: "https://www.xiaohongshu.com/explore/note-1"
    },
    publishedAt: "2026-05-20T10:00:00.000Z",
    status: "published_passed",
    metrics: {
      likes: 120,
      favorites: 25,
      comments: 5,
      views: 3200,
      shares: 12
    }
  });

  assert.deepEqual(result, {
    id: "record-1",
    publish: {
      status: "published_passed",
      publishedAt: "2026-05-20T10:00:00.000Z",
      metrics: {
        likes: 120,
        favorites: 25,
        comments: 5,
        views: 3200,
        shares: 12
      }
    }
  });
});

test("buildLifecyclePatchFromConnectorSyncItem normalizes unknown status to published_passed", () => {
  const result = buildLifecyclePatchFromConnectorSyncItem({
    recordId: "record-2",
    status: "mystery-state",
    publishedAt: "2026-05-20T10:00:00.000Z"
  });

  assert.equal(result.publish.status, "published_passed");
});

test("normalizeXhsConnectorDiscoveryItem dedupes tags, clamps invalid metrics, and preserves unknown note types", () => {
  const result = normalizeXhsConnectorDiscoveryItem({
    tags: ["AI", "AI", "  ", "效率", "效率"],
    metrics: {
      likes: "12",
      favorites: "oops",
      comments: undefined,
      views: null,
      shares: "3.5"
    },
    type: "carousel"
  });

  assert.deepEqual(result.tags, ["AI", "效率"]);
  assert.deepEqual(result.metrics, {
    likes: 12,
    favorites: 0,
    comments: 0,
    views: 0,
    shares: 3.5
  });
  assert.equal(result.noteType, "unknown");
});
