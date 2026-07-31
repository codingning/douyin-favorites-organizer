---
name: douyin-favorites-organizer
description: Analyze the currently logged-in user's Douyin saved videos, propose stable content categories, generate a reviewable collection-folder plan, and after explicit approval create private folders and add the matching videos through the Douyin web UI. Use when a user asks to 整理/分类/归档抖音收藏夹、批量创建收藏夹、把收藏视频按内容放入文件夹、检查新增收藏，or resume a previously approved organizer run on Windows. Keep all account writes behind preview and action-time approval gates.
---

# Douyin Favorites Organizer

Use the repository's deterministic workflow. Keep this Skill thin: let the scripts collect, hash, validate, preview, approve, and journal the plan; use model judgment only to refine the taxonomy and individual classifications.

## Resolve the project

Treat the directory two levels above this Skill as `PROJECT_ROOT`. Run all Node commands from that directory.

## Safety contract

- Reuse the user's browser login. Never request, print, copy, export, or persist passwords, QR contents, Cookies, Tokens, browser storage, request signatures, or transient media URLs.
- Default every proposed folder to private. A public folder requires separate explicit approval.
- Never click or invoke `取消收藏`. Adding a video to a collection folder must not remove its saved state.
- Preserve existing folders. Do not rename or delete them automatically.
- Treat collection, classification, approval, and account mutation as separate stages.
- Stop after generating `preview.md` until the user explicitly approves that exact plan.
- Even after plan approval, obtain an action-time confirmation immediately before the first Douyin write.
- If the source reaches the 200-item collection ceiling, report that complete coverage is unproven and do not claim “all favorites”.

## Set up

1. Verify Node.js `>=22.13` and run `npm install` in `PROJECT_ROOT`.
2. Run `opencli --version` and require `1.8.6` for the current adapter contract.
3. Ensure the verified read-only `douyin saved` adapter is installed. Prefer the existing adapter from the sibling `douyin-obsidian-knowledge` checkout on this machine; do not copy its dirty working tree.
4. If Browser Bridge or login is unavailable, ask the user to connect the browser and sign in themselves. Resume after they confirm.

## Build the preview

1. Run `npm run collect -- --limit 200`. Record the returned run directory.
2. Run `npm run draft -- --run <RUN_DIR>` to create a deterministic seed plan.
3. Read `<RUN_DIR>/classification-input.json`, `<RUN_DIR>/classification-plan.json`, and [references/classification-policy.md](references/classification-policy.md).
4. Refine the seed plan:
   - Aim for 8–15 stable categories only when content diversity supports them.
   - Keep folder names within 15 characters.
   - Assign exactly one primary folder per video.
   - Use title, author, hashtags, transcript, and OCR evidence when available.
   - Put ambiguous items in `待确认`; never invent evidence.
   - Keep `source_sha256` unchanged and reset `approval` to pending after any edit.
5. Run `npm run validate -- --run <RUN_DIR>` until it returns `ok: true`.
6. Run `npm run preview -- --run <RUN_DIR>` and present the summary, warnings, category counts, and approval token to the user. Do not expose the private full favorites list unless requested.
7. Stop and wait for explicit approval of that exact preview.

## Approve and prepare actions

After the user explicitly approves the preview:

1. Run `npm run approve -- --run <RUN_DIR> --token <APPROVAL_TOKEN>`.
2. Run `npm run manifest -- --run <RUN_DIR>`.
3. Read `<RUN_DIR>/apply-manifest.json` and [references/browser-apply.md](references/browser-apply.md).
4. Summarize the number of folders and videos that would be changed.
5. Ask for the final action-time confirmation before touching Douyin.

Approval never authorizes deleting favorites, deleting folders, making folders public, outreach, publishing, or changing unrelated account settings.

## Apply through the web UI

Use a browser surface that reuses the user's signed-in Douyin session. Follow [references/browser-apply.md](references/browser-apply.md) exactly.

Use the deterministic wrapper when the current web contract matches:

1. Run `npm run browser-apply -- preflight --run <RUN_DIR>`.
2. Derive the execution token as `EXECUTE:<first 12 characters of plan_fingerprint>`.
3. After action-time confirmation, run `npm run browser-apply -- create-folders --run <RUN_DIR> --execute --confirmation <TOKEN>`.
4. Run one bounded folder batch at a time with `npm run browser-apply -- add-folder --run <RUN_DIR> --folder <NAME> --execute --confirmation <TOKEN>`.
5. Run `npm run browser-apply -- close --run <RUN_DIR>` after final verification or on a stopped run.

For each folder:

1. Create it only if it does not already exist; keep `设置为公开` off.
2. Enter the 收藏 → 视频 tab and open 批量管理.
3. Select only video cards whose `/video/<aweme_id>` matches the manifest.
4. Click `加入收藏夹`, choose the exact folder, and confirm.
5. Verify the visible success state or resulting folder membership before journaling the batch.
6. Exit management mode before moving to a different operation.

Fail closed when selectors, counts, folder names, video IDs, confirmation state, or success evidence are ambiguous. Do not guess or fall back to `取消收藏`.

## Incremental runs

Keep run artifacts under `var/runs/`. On a later run, compare `aweme_id` values against the latest approved manifest and propose only new or previously unresolved videos. Do not silently reclassify already applied videos; place changed recommendations in the preview for review.

## Verify completion

Require all of the following before reporting completion:

- The collected set did not hit an unacknowledged coverage ceiling.
- Plan validation passes.
- The approved plan fingerprint matches the manifest.
- Every planned folder has a verified final state.
- Every batch has success evidence and a journal entry.
- Every source video is either verified in a folder or explicitly recorded as unavailable in the current Douyin management UI.
- No `取消收藏`, delete, public-folder, or unrelated account action occurred.

Use `scripts/run-organizer.ps1` as the Windows wrapper when a direct npm command is inconvenient.
