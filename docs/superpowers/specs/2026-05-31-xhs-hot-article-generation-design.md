# XHS Hot Article Generation Design

## Goal

Integrate the `xiaohongshu-write` skill into the existing `生成新内容` flow as a hot-article evidence layer.

The generation flow should be able to:

- derive a search keyword from the current generation brief
- fetch recent Xiaohongshu hot articles through Redfox
- summarize title, opening, structure, keyword, tag, and interaction patterns
- pass those patterns into the note generation prompt
- show a compact `爆款公式来源` summary with 2-3 reference notes in the generation result

This is not a replacement for the current generation workbench. It is an added context source alongside style profile, local reference samples, temporary materials, memory context, and inner-space terminology.

## Scope

This version adds:

- backend hot-article fetching for generation
- deterministic keyword extraction from generation brief fields
- time-window expansion from 7 days to 30 days when data is sparse
- pattern summarization from up to 50 hot articles
- generation prompt integration
- normalized result fields for `hotArticleFormula`
- frontend display inside the existing generation result
- focused tests for prompt contract, API result contract, and UI rendering

This version does not add:

- a new standalone writing page
- mandatory user interruption asking for style samples
- raw display of all 50 hot articles
- image/card generation
- unrelated web-search browsing in the local app
- historical archive of every hot-article fetch

## Product Intent

The current project already has stronger local style machinery than the standalone skill:

- style profile
- sample library
- external references
- temporary reference materials
- draft ideas
- memory context
- account-level signals

So the skill should not force a separate "send me your writing sample" step.

Instead, its best role is to make `生成新内容` more market-aware:

- what titles are currently working
- what openings are getting attention
- what content structures repeat among high-performing notes
- what tags and interaction prompts appear often
- which reference notes justify the formula

## UX Shape

No new top-level page is needed.

In the generation workflow:

1. user fills the existing generation brief
2. user clicks generate as usual
3. backend fetches and summarizes hot articles when a usable keyword exists
4. generation output remains in the current result panel
5. result panel adds a compact `爆款公式来源` section

The user should see:

- reference formula summary
- title pattern
- opening pattern
- content structure pattern
- tag strategy
- 2-3 core reference notes with title, link, author, author link, and interaction counts

The full raw hot-article list should not be rendered.

## Keyword Extraction

Use existing generation inputs to derive one keyword.

Priority:

1. `brief.topic`
2. `brief.referenceTitle`
3. `brief.briefing`
4. `brief.tagReferences`
5. draft title
6. draft tags

Rules:

- prefer specific phrases over broad category words
- trim filler words such as "帮我写", "生成", "小红书笔记"
- if no usable keyword exists, skip hot-article fetch and generate normally
- if a broad generic keyword is detected, v1 may still search it rather than blocking the workflow

This keeps the product smooth. The standalone skill's "ask the user to choose a subtopic first" is useful in chat, but too interruptive inside the app.

## Data Fetching

Add a backend module for Redfox hot-article lookup.

Default behavior:

- keyword: derived from the brief
- max items: 50
- page size: 50
- start date: current date minus 7 days

If too few usable items are returned:

- try 30 days
- do not silently change keyword

The Redfox API key source is:

- `REDFOX_API_KEY`

The endpoint should be configurable through an environment variable if the local script and API endpoint differ.

## Pattern Summary Contract

Normalize the hot-article evidence into a compact contract:

```json
{
  "status": "ok",
  "keyword": "关系沟通",
  "timeWindowDays": 7,
  "itemCount": 42,
  "formula": "数字型标题 + 痛点开场 + 分点干货 + 互动收尾",
  "titlePatterns": ["数字型标题", "反差疑问句"],
  "openingPatterns": ["痛点共鸣", "直接说结论"],
  "structurePatterns": ["分点说明", "误区解释", "行动建议"],
  "highFrequencyKeywords": ["边界感", "安全感", "沟通"],
  "tagStrategies": ["1 个宽标签 + 3 个细分场景标签"],
  "interactionPrompts": ["评论区告诉我", "你们遇到过吗"],
  "references": [
    {
      "title": "参考标题",
      "noteLink": "https://...",
      "authorNickname": "作者名",
      "authorLink": "https://...",
      "likedCount": 1000,
      "collectedCount": 500,
      "commentsCount": 80,
      "sharedCount": 60,
      "interactiveCount": 1640
    }
  ]
}
```

Failure or unavailable cases should not block generation:

```json
{
  "status": "skipped",
  "reason": "no_keyword"
}
```

```json
{
  "status": "error",
  "keyword": "关系沟通",
  "message": "爆文数据获取失败"
}
```

The generation prompt should include only the summarized contract, not the raw 50 records.

## Prompt Integration

`buildGenerationMessages()` should accept an optional `hotArticleFormula`.

When `status === "ok"`, the prompt should require the model to:

- follow the dominant title pattern where it fits the brief
- use the summarized opening pattern
- incorporate high-frequency keywords naturally
- borrow content structure rather than copying text
- use the tag strategy when producing `tags`
- include an interaction prompt when appropriate
- avoid copying reference-note wording directly

The existing compliance and style rules remain stronger than hot-article guidance.

If formula guidance conflicts with safety, style profile, user constraints, or inner-space terminology, safety and user constraints win.

## Output Contract

The generation API response should include the hot-article formula alongside candidates:

```json
{
  "ok": true,
  "items": [],
  "recommended": {},
  "hotArticleFormula": {}
}
```

Each normalized candidate may also carry a compact copy of the same formula metadata if that is easier for UI rendering.

The generation result UI should display the formula attached to the selected candidate or response-level result.

## UI Display

Add a small result section under the generated note:

- heading: `爆款公式来源`
- formula summary
- reference pattern chips or short text
- 2-3 reference note rows

Each reference row includes:

- title link
- author link
- liked / collected / comments / shared counts

Do not render all fetched notes.

## Error Handling

Hot-article failure should not fail generation.

Expected behavior:

- generation still proceeds
- response includes `hotArticleFormula.status = "error"`
- UI shows a muted message such as `爆文规律暂不可用，本次已按本地样本和风格画像生成`

This matches the app's current preference: optional external context enriches results, but core generation remains usable.

## Testing

Focused tests should cover:

- keyword derivation from generation brief fields
- time-window expansion when 7-day results are sparse
- normalization of Redfox hot-article records
- prompt inclusion in `buildGenerationMessages()`
- generation API response includes `hotArticleFormula`
- UI renders `爆款公式来源` without raw 50-record leakage
- generation continues when hot-article fetch fails

## Open Decisions Resolved

- Keep existing generation UI instead of creating a new writing page.
- Do not force an extra user question for writing samples.
- Use local style profile and temporary reference materials as the style-reference mechanism.
- Do not expose raw hot-article data.
- Treat hot-article lookup as non-blocking enrichment.
