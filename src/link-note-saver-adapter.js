/**
 * link-note-saver 适配器
 *
 * 用于从链接（文章、视频）提取内容并转换为项目的外部参考样本格式
 * 支持：
 * - 小红书笔记链接（文本 + 视频文案）
 * - 普通网页文章
 * - 视频链接（提取文案、字幕、评论）
 */

import crypto from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { projectRoot } from "./config.js";
import { normalizeExternalReferenceSample } from "./external-reference-samples.js";

const execFileAsync = promisify(execFile);
const XIAOHONGSHU_DOMAINS = ["xiaohongshu.com", "xhslink.com"];
const VIDEO_PLATFORMS = ["bilibili.com", "douyin.com", "kuaishou.com"];
const VIDEO_FILE_EXTENSIONS = new Set([".mp4", ".mov", ".m4v", ".webm", ".mkv", ".avi"]);
const AUDIO_FILE_EXTENSIONS = new Set([".mp3", ".m4a", ".aac", ".wav", ".ogg", ".flac"]);
const XIAOHONGSHU_NOISE_PATTERNS = [
  /创作中心\s*业务合作\s*发现\s*直播\s*发布\s*通知/g,
  /沪ICP备\d+号?/g,
  /营业执照/g,
  /20\d{2}沪公网安备\d+号?/g,
  /增值电信业务经营许可证[:：]?\s*沪B2[-—]\d+/g,
  /医疗器械网络交易服务第三方平台备案[:：]?\s*\(沪\)网械平台备字\[\d+\]第\d+号/g,
  /互联网药品信息服务资格证书[:：]?\s*\(沪\)[\s\S]*?性[-—]\d+[-—]\d+/g,
  /违法不良信息举报电话[:：]?\s*\d+/g,
  /上海市互联网举报中心/g,
  /网上有害信息举报专区/g,
  /自营经营者信息/g,
  /网络文化经营许可证[:：]?\s*沪网文\([^)]+\)\d+[-—]\d+号/g,
  /个性化推荐算法\s*网信算备\d+号/g,
  /©\s*20\d{2}[-—]20\d{2}\s*行吟信息科技（上海）有限公司/g,
  /地址[:：]\s*上海市[^电]+电话[:：]\s*[\d-]+/g,
  /更多\s*关于我们/g
];

function isXiaohongshuShortLink(url) {
  try {
    return new URL(url).hostname.toLowerCase().includes("xhslink.com");
  } catch {
    return false;
  }
}

async function resolveRedirectUrl(url) {
  const response = await fetch(url, {
    redirect: "follow",
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
    },
    signal: AbortSignal.timeout(15000)
  });

  return String(response?.url || url).trim() || url;
}

function decodeHtmlEntities(value = "") {
  return String(value || "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function normalizeExtractedText(value = "") {
  return decodeHtmlEntities(value).replace(/\s+/g, " ").trim();
}

function stripXiaohongshuPageNoise(value = "") {
  let text = normalizeExtractedText(value);

  for (const pattern of XIAOHONGSHU_NOISE_PATTERNS) {
    text = text.replace(pattern, " ");
  }

  return normalizeExtractedText(text);
}

function ensureVideoBody(body = "") {
  const normalized = String(body || "").trim();
  const videoHint = "[视频内容]\n（未提取视频字幕，仅保存文案）";

  return normalized.includes("[视频内容]") ? normalized : `${normalized}\n\n${videoHint}`.trim();
}

function ensureVideoBodyWithTranscript(body = "", transcript = "") {
  const normalized = String(body || "").trim();
  const normalizedTranscript = cleanSubtitleText(transcript);

  if (!normalizedTranscript) {
    return ensureVideoBody(normalized);
  }

  return `${normalized}\n\n[视频字幕/转写]\n${normalizedTranscript}`.trim();
}

function normalizeTagsWithVideo(tags = [], isVideo = false) {
  const normalizedTags = (Array.isArray(tags) ? tags : [])
    .map((tag) => String(tag || "").trim())
    .filter(Boolean);

  return [...new Set(isVideo ? [...normalizedTags, "视频"] : normalizedTags)];
}

function isXiaohongshuVideoPayload(data = {}) {
  const typeValues = [
    data.type,
    data.note_type,
    data.noteType,
    data.media_type,
    data.mediaType,
    data.model_type,
    data.modelType
  ].map((value) => String(value || "").trim().toLowerCase());

  return (
    typeValues.some((value) => ["video", "videos", "视频"].includes(value)) ||
    Boolean(data.video || data.video_url || data.videoUrl || data.video_id || data.videoId)
  );
}

function normalizeTranscriptValue(value) {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeTranscriptValue(item)).filter(Boolean).join("\n");
  }

  if (typeof value === "object") {
    return normalizeTranscriptValue(
      value.text ||
        value.content ||
        value.caption ||
        value.subtitle ||
        value.transcript ||
        value.sentence ||
        value.words ||
        value.segments
    );
  }

  return "";
}

function pickVideoTranscript(data = {}) {
  const candidates = [
    data.transcript,
    data.transcription,
    data.subtitles,
    data.subtitle,
    data.captions,
    data.caption,
    data.videoText,
    data.video_text,
    data.asr,
    data.speechText,
    data.speech_text,
    data.video?.transcript,
    data.video?.subtitles,
    data.video?.subtitle,
    data.video?.captions,
    data.video?.caption
  ];

  for (const candidate of candidates) {
    const transcript = normalizeTranscriptValue(candidate);

    if (transcript) {
      return transcript;
    }
  }

  return "";
}

function pickSubtitleUrl(data = {}) {
  const candidates = [
    data.subtitle_url,
    data.subtitleUrl,
    data.caption_url,
    data.captionUrl,
    data.captions_url,
    data.captionsUrl,
    data.transcript_url,
    data.transcriptUrl,
    data.video?.subtitle_url,
    data.video?.subtitleUrl,
    data.video?.caption_url,
    data.video?.captionUrl,
    data.video?.transcript_url,
    data.video?.transcriptUrl,
    data.subtitle?.url,
    data.caption?.url,
    data.captions?.url
  ];

  return String(candidates.find((candidate) => String(candidate || "").trim()) || "").trim();
}

function pickMediaUrl(data = {}) {
  const candidates = [
    data.audio_url,
    data.audioUrl,
    data.video_url,
    data.videoUrl,
    data.media_url,
    data.mediaUrl,
    data.video?.audio_url,
    data.video?.audioUrl,
    data.video?.video_url,
    data.video?.videoUrl,
    data.video?.media_url,
    data.video?.mediaUrl,
    data.audio?.url,
    data.video?.url,
    data.media?.url
  ];

  return String(candidates.find((candidate) => String(candidate || "").trim()) || "").trim();
}

function cleanSubtitleText(value = "") {
  return normalizeTranscriptValue(value)
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => normalizeExtractedText(line.replace(/<[^>]+>/g, " ")))
    .filter((line) => {
      if (!line) return false;
      if (/^WEBVTT$/i.test(line)) return false;
      if (/^\d+$/.test(line)) return false;
      if (/^\d{1,2}:\d{2}:\d{2}[.,]\d{3}\s*-->\s*\d{1,2}:\d{2}:\d{2}[.,]\d{3}/.test(line)) return false;
      if (/^NOTE\b/i.test(line)) return false;
      if (/^(Kind|Language):/i.test(line)) return false;
      return true;
    })
    .join("\n")
    .trim();
}

async function fetchSubtitleText(url = "") {
  const subtitleUrl = String(url || "").trim();

  if (!subtitleUrl) {
    return "";
  }

  const response = await fetch(subtitleUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
    },
    signal: AbortSignal.timeout(15000)
  });

  if (!response.ok) {
    throw new Error(`字幕抓取返回 ${response.status}`);
  }

  return cleanSubtitleText(await response.text());
}

function resolveWhisperBin() {
  return String(process.env.WHISPER_BIN || path.join(projectRoot, ".venv", "bin", "whisper")).trim();
}

function extensionFromUrl(url = "") {
  try {
    const extension = path.extname(new URL(url).pathname).toLowerCase();
    return extension || ".mp4";
  } catch {
    return ".mp4";
  }
}

function contentTypeFromHeaders(headers) {
  if (!headers) {
    return "";
  }

  if (typeof headers.get === "function") {
    return String(headers.get("content-type") || "").toLowerCase();
  }

  return String(headers["content-type"] || headers["Content-Type"] || "").toLowerCase();
}

function isBinaryMediaContentType(contentType = "") {
  const normalized = String(contentType || "").toLowerCase();
  return (
    normalized.startsWith("video/") ||
    normalized.startsWith("audio/") ||
    normalized.includes("application/octet-stream")
  );
}

function isDirectMediaUrl(url = "") {
  try {
    const extension = path.extname(new URL(url).pathname).toLowerCase();
    return VIDEO_FILE_EXTENSIONS.has(extension) || AUDIO_FILE_EXTENSIONS.has(extension);
  } catch {
    return false;
  }
}

async function downloadMediaFile(url = "", directory = "") {
  const mediaUrl = String(url || "").trim();

  if (!mediaUrl) {
    return "";
  }

  const response = await fetch(mediaUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
    },
    signal: AbortSignal.timeout(Number(process.env.WHISPER_MEDIA_DOWNLOAD_TIMEOUT_MS || 60000))
  });

  if (!response.ok) {
    throw new Error(`视频下载返回 ${response.status}`);
  }

  const filePath = path.join(directory, `source${extensionFromUrl(mediaUrl)}`);
  await fs.writeFile(filePath, Buffer.from(await response.arrayBuffer()));
  return filePath;
}

async function transcribeMediaWithWhisper(mediaUrl = "") {
  const sourceUrl = String(mediaUrl || "").trim();

  if (!sourceUrl) {
    return "";
  }

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "link-note-whisper-"));

  try {
    const mediaPath = await downloadMediaFile(sourceUrl, tempDir);
    const whisperBin = resolveWhisperBin();
    const model = String(process.env.WHISPER_MODEL || "turbo").trim();
    const language = String(process.env.WHISPER_LANGUAGE || "zh").trim();
    const timeout = Number(process.env.WHISPER_TIMEOUT_MS || 10 * 60 * 1000);
    const args = [
      mediaPath,
      "--model",
      model,
      "--language",
      language,
      "--output_format",
      "txt",
      "--output_dir",
      tempDir,
      "--verbose",
      "False"
    ];

    await execFileAsync(whisperBin, args, {
      timeout,
      maxBuffer: 1024 * 1024 * 8
    });

    const transcriptPath = path.join(tempDir, `${path.basename(mediaPath, path.extname(mediaPath))}.txt`);
    return cleanSubtitleText(await fs.readFile(transcriptPath, "utf8"));
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

async function resolveVideoTranscript(data = {}) {
  const inlineTranscript = cleanSubtitleText(pickVideoTranscript(data));

  if (inlineTranscript) {
    return inlineTranscript;
  }

  const subtitleUrl = pickSubtitleUrl(data);

  if (!subtitleUrl) {
    const mediaUrl = pickMediaUrl(data);

    if (!mediaUrl) {
      return "";
    }

    try {
      return await transcribeMediaWithWhisper(mediaUrl);
    } catch (error) {
      console.warn(`Whisper 转写失败: ${error.message}`);
      return "";
    }
  }

  try {
    return await fetchSubtitleText(subtitleUrl);
  } catch (error) {
    console.warn(`视频字幕抓取失败: ${error.message}`);
    return "";
  }
}

/**
 * 判断链接类型
 */
function detectLinkType(url) {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();

    if (XIAOHONGSHU_DOMAINS.some((domain) => hostname.includes(domain))) {
      return "xiaohongshu";
    }

    if (VIDEO_PLATFORMS.some((domain) => hostname.includes(domain))) {
      return "video";
    }

    if (isDirectMediaUrl(url)) {
      return "video";
    }

    return "webpage";
  } catch {
    return "unknown";
  }
}

/**
 * 抓取网页内容（轻量级实现）
 */
async function fetchWebpageContent(url) {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
      },
      signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const contentType = contentTypeFromHeaders(response.headers);

    if (isBinaryMediaContentType(contentType)) {
      throw new Error(`链接返回媒体文件（${contentType || "unknown"}），不能按网页正文解析`);
    }

    const html = await response.text();

    // 简单提取 title 和 meta 标签
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = normalizeExtractedText(titleMatch?.[1] || "");

    const descriptionMatch =
      html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i);
    const description = normalizeExtractedText(descriptionMatch?.[1] || "");

    // 提取正文（简化版，去除 script、style 标签）
    let bodyText = normalizeExtractedText(
      html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
    ).slice(0, 8000);
    const isVideo =
      /<meta[^>]*property=["']og:type["'][^>]*content=["'][^"']*video[^"']*["']/i.test(html) ||
      /<meta[^>]*property=["']og:video/i.test(html);

    return {
      title,
      description,
      body: bodyText || description,
      source: new URL(url).hostname,
      sourceUrl: url,
      isVideo
    };
  } catch (error) {
    throw new Error(`抓取网页失败: ${error.message}`);
  }
}

function cleanXiaohongshuWebContent(content = {}) {
  const description = stripXiaohongshuPageNoise(content.description || "");
  const body = stripXiaohongshuPageNoise(content.body || "");
  const isVideo = content.isVideo === true;

  return {
    ...content,
    body: isVideo ? ensureVideoBody(description || body) : description || body,
    description,
    tags: normalizeTagsWithVideo(content.tags || [], isVideo),
    isVideo
  };
}

/**
 * 提取小红书笔记内容
 * 如果配置了 REDFOX_API_KEY，可以调用 API 获取详细内容
 */
async function fetchXiaohongshuNote(url) {
  const resolvedUrl = isXiaohongshuShortLink(url) ? await resolveRedirectUrl(url) : url;
  const noteIdMatch = url.match(/\/explore\/([a-f0-9]+)/i);
  const resolvedNoteIdMatch = resolvedUrl.match(/\/explore\/([a-f0-9]+)/i);
  const sourceUrl = resolvedUrl || url;
  const noteId = noteIdMatch?.[1] || resolvedNoteIdMatch?.[1];

  if (!noteId) {
    throw new Error("无法从链接中提取小红书笔记 ID");
  }

  const redfoxApiKey = process.env.REDFOX_API_KEY;

  if (redfoxApiKey) {
    // 使用 Redfox API 获取笔记详情
    try {
      const response = await fetch(`https://redfox.xiaohongshu.com/api/note/${noteId}`, {
        headers: {
          Authorization: `Bearer ${redfoxApiKey}`,
          "Content-Type": "application/json"
        },
        signal: AbortSignal.timeout(15000)
      });

      if (!response.ok) {
        throw new Error(`Redfox API 返回 ${response.status}`);
      }

      const data = await response.json();
      const isVideo = isXiaohongshuVideoPayload(data);
      const body = data.desc || data.content || "";
      const transcript = isVideo ? await resolveVideoTranscript(data) : "";

      return {
        title: data.title || "",
        body: isVideo ? ensureVideoBodyWithTranscript(body, transcript) : body,
        tags: normalizeTagsWithVideo(data.topics || data.tags || [], isVideo),
        metrics: {
          likes: data.liked_count || 0,
          favorites: data.collected_count || 0,
          comments: data.comment_count || 0,
          shares: data.share_count || 0
        },
        source: "小红书",
        sourceUrl,
        isVideo,
        authorName: data.user?.nickname || data.nickname || "",
        publishedAt: data.time ? new Date(data.time * 1000).toISOString() : ""
      };
    } catch (error) {
      console.warn(`Redfox API 调用失败，回退到网页抓取: ${error.message}`);
    }
  }

  // 回退到网页抓取
  const webContent = cleanXiaohongshuWebContent(await fetchWebpageContent(sourceUrl));
  return {
    ...webContent,
    sourceUrl,
    source: "小红书",
    tags: []
  };
}

/**
 * 提取视频内容（文案、字幕、评论）
 *
 * 策略：
 * 1. 优先抓取页面中的视频标题、描述、标签
 * 2. 如果配置了 GLM_API_KEY，调用视频转文字 API
 * 3. 否则只保存视频元信息
 */
async function fetchVideoContent(url) {
  const linkType = detectLinkType(url);

  if (isDirectMediaUrl(url)) {
    const transcript = await resolveVideoTranscript({
      type: "video",
      video_url: url
    });

    return {
      title: "视频素材",
      body: ensureVideoBodyWithTranscript("视频链接已保存。", transcript),
      source: new URL(url).hostname,
      sourceUrl: url,
      tags: ["视频"],
      isVideo: true
    };
  }

  const webContent = await fetchWebpageContent(url);

  // 尝试从页面提取视频相关信息
  let videoTranscript = "";
  const glmApiKey = process.env.GLM_API_KEY;

  // 如果配置了 GLM API，可以调用视频转文字（这里是占位逻辑，实际需要视频 URL）
  if (glmApiKey && linkType === "video") {
    try {
      // 注意：这里需要实际的视频 URL 或视频流地址
      // 当前只是占位实现，实际需要根据平台 API 获取视频地址
      console.log("视频转文字功能需要视频流地址，当前仅抓取页面文案");
    } catch (error) {
      console.warn(`视频转文字失败: ${error.message}`);
    }
  }

  return {
    ...webContent,
    body: `${webContent.body}\n\n[视频内容]\n${videoTranscript || "（未提取视频字幕，仅保存文案）"}`,
    tags: ["视频"],
    isVideo: true
  };
}

/**
 * 从链接提取内容
 */
async function extractContentFromLink(url) {
  const linkType = detectLinkType(url);

  switch (linkType) {
    case "xiaohongshu":
      return await fetchXiaohongshuNote(url);
    case "video":
      return await fetchVideoContent(url);
    case "webpage":
      return await fetchWebpageContent(url);
    default:
      throw new Error("不支持的链接类型");
  }
}

/**
 * 生成小红书传播拆解（简化版）
 */
function generateXhsBreakdown(content) {
  const { title, body } = content;

  return {
    hook: title.slice(0, 30) || body.slice(0, 30),
    coverTitle: title.slice(0, 18) || body.slice(0, 18),
    noteTitle: title || body.slice(0, 25),
    structure: "开头钩子 → 关键发现 → 操作清单 → 结尾提问",
    tags: content.tags || [],
    commentGuide: "你有遇到类似的情况吗？"
  };
}

/**
 * 保存链接为外部参考样本
 *
 * @param {string} url - 链接地址
 * @param {object} options - 可选配置
 * @param {string} options.notes - 人工备注
 * @param {string} options.collectionType - 合集类型
 * @param {string[]} options.additionalTags - 额外标签
 * @returns {Promise<object>} 标准化后的外部参考样本
 */
export async function saveLinkAsReferenceSample(url, options = {}) {
  const { notes = "", collectionType = "科普", additionalTags = [] } = options;

  console.log(`[link-note-saver] 开始提取链接内容: ${url}`);

  // 提取链接内容
  const content = await extractContentFromLink(url);
  const sourceUrl = content.sourceUrl || url;

  // 生成小红书传播拆解
  const xhsBreakdown = generateXhsBreakdown(content);

  // 构建外部参考样本
  const sample = {
    id: `link-${crypto.randomUUID()}`,
    title: content.title || "（无标题）",
    body: content.body || "",
    tags: [...new Set([...(content.tags || []), ...additionalTags])],
    collectionType,
    notes: [
      notes,
      `来源: ${content.source || "未知"}`,
      `链接: ${sourceUrl}`,
      content.authorName ? `作者: ${content.authorName}` : "",
      content.isVideo ? "类型: 视频" : "",
      "",
      "小红书传播拆解:",
      `- 3秒钩子: ${xhsBreakdown.hook}`,
      `- 封面标题: ${xhsBreakdown.coverTitle}`,
      `- 笔记标题: ${xhsBreakdown.noteTitle}`,
      `- 正文结构: ${xhsBreakdown.structure}`,
      `- 话题标签: ${xhsBreakdown.tags.map((t) => `#${t}`).join(" ")}`,
      `- 评论区引导: ${xhsBreakdown.commentGuide}`
    ]
      .filter(Boolean)
      .join("\n"),
    publish: {
      status: "positive_performance",
      publishedAt: content.publishedAt || new Date().toISOString(),
      metrics: content.metrics || {
        likes: 0,
        favorites: 0,
        comments: 0,
        views: 0,
        shares: 0
      }
    }
  };

  // 标准化
  const normalizedSample = normalizeExternalReferenceSample(sample);

  console.log(`[link-note-saver] ✓ 链接内容提取成功: ${normalizedSample.title}`);

  return normalizedSample;
}

/**
 * 批量保存链接为外部参考样本
 */
export async function saveLinkBatch(urls, options = {}) {
  const results = [];
  const errors = [];

  for (const url of urls) {
    try {
      const sample = await saveLinkAsReferenceSample(url, options);
      results.push(sample);
    } catch (error) {
      errors.push({ url, error: error.message });
      console.error(`[link-note-saver] 处理链接失败 ${url}: ${error.message}`);
    }
  }

  return { results, errors };
}

/**
 * 生成 Markdown 笔记（兼容 link-note-saver 格式）
 */
export function generateMarkdownNote(sample) {
  const { title, body, tags, notes, publish, createdAt } = sample;

  return `# ${title}

- 保存时间：${new Date(createdAt).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}
- 标签：${tags.join(", ")}

## 摘要

${body.slice(0, 500)}${body.length > 500 ? "..." : ""}

## 小红书传播拆解

${notes.split("\n").filter((line) => line.includes("小红书传播拆解:") || line.startsWith("- ")).join("\n")}

## 表现数据

- 点赞：${publish?.metrics?.likes || 0}
- 收藏：${publish?.metrics?.favorites || 0}
- 评论：${publish?.metrics?.comments || 0}
- 分享：${publish?.metrics?.shares || 0}

## 原文内容

${body}

## 备注

${notes}
`;
}
