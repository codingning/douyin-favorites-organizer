# Classification policy

## Evidence priority

Use evidence in this order:

1. Complete transcript or clear on-screen text.
2. Creator caption and hashtags.
3. Title and author context.
4. Visual inference only when unambiguous.

Never invent evidence.

## Adaptive taxonomy

For each new video, decide in this order:

1. Reuse an existing folder if its durable meaning directly covers the video's main intent.
2. Create a new folder if there is no honest fit and the topic represents a reusable intent likely to receive future videos.
3. Use `待确认` when evidence is weak, the idea is too narrow, or several categories are equally plausible.

Do not force content into one of the original eight folders merely to avoid change.

## New-folder gate

A new folder must:

- Describe content, not a creator identity or one-off event.
- Be understandable without opening the videos.
- Be distinct from every existing folder.
- Use at most 15 characters.
- Be useful for future retrieval, even if the current run contains only one exceptionally clear example.
- Default to public in the user-authorized recurring workflow.

Create at most two new folders per recurring run. Route additional proposed categories to `待确认` and report them for later review.

## Maintenance rules

- Assign one primary folder per video.
- Do not reclassify old videos during an incremental run.
- Do not automatically rename, merge, delete, or change visibility of existing folders.
- Consider splitting an oversized folder only as a future proposal; never perform the split in recurring mode.
- Preserve `schema_version`, `source_sha256`, and every source `aweme_id` when editing a plan.
- Reset approval to pending and validate after every plan edit.
