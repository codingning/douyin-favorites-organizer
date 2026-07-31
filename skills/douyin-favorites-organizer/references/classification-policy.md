# Classification policy

## Evidence priority

Use the strongest available evidence in this order:

1. Complete transcript or clear on-screen text.
2. Creator caption and hashtags.
3. Title and author context.
4. Visual inference only when the frame is unambiguous.

Record only evidence that is actually present. A plausible guess is not evidence.

## Taxonomy rules

- Prefer durable user-intent categories such as `AI工具与工作流` or `短视频创作`, not one-off event names.
- Keep categories mutually understandable even if some content could fit more than one.
- Assign one primary folder per video in the first version. Mention secondary themes only in `reason`.
- Merge categories that have fewer than three videos unless they represent a stable, clearly distinct need.
- Split a category when it exceeds roughly one third of the collection and contains two durable intents.
- Keep `待确认` for missing, conflicting, or low-confidence evidence.
- Never create a folder from the creator's private identity, account name, or other sensitive attribute.

## Plan editing contract

Preserve `schema_version`, `source_sha256`, and every source `aweme_id`.

After editing the plan, reset `approval` to pending and run validation again.
