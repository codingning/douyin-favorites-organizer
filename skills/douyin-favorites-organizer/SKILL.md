---
name: douyin-favorites-organizer
description: Analyze and organize the currently logged-in user's Douyin saved videos into content-based collection folders on Windows. Use for one-time sorting, incremental checks of newly saved videos, adaptive taxonomy updates, safe creation of new durable folders, or an explicitly authorized recurring organizer. Preserve saved videos and existing folders; never delete or cancel favorites.
---

# Douyin Favorites Organizer

Use the repository scripts for collection, incremental state, validation, approval fingerprints, browser application, and journaling. Use model judgment only for taxonomy and classification.

## Resolve the project

Treat the directory two levels above this Skill as `PROJECT_ROOT`. Run Node commands there.

## Bootstrap the collector dependency

Before the first collection on a machine, run `npm install` and then `npm run setup` from `PROJECT_ROOT`.
The OpenCLI npm package does not provide `douyin saved` by itself; `npm run setup` installs and verifies the repository's bundled read-only plugin.
Do not continue when setup reports a conflicting plugin source. Inspect the reported path and ask before replacing or uninstalling anything.

## Non-negotiable safety

- Reuse the user's signed-in browser. Never read, print, export, or persist passwords, QR contents, Cookies, Tokens, browser storage, request signatures, or transient media URLs.
- Never click or invoke `取消收藏`. Folder assignment must not remove the original favorite.
- Never delete, rename, merge, or hide an existing folder automatically.
- Stop on login loss, CAPTCHA, changed selectors, ambiguous video IDs, unknown submit results, or count mismatches.
- Treat the 200-item collection ceiling as incomplete coverage unless explicitly acknowledged.

## Choose the authorization mode

### One-time mode

Generate `preview.md`, wait for approval of its token, and obtain action-time confirmation before the first account write. Default new folders to private unless the user explicitly approves public visibility.

### Recurring incremental mode

Use only when the user explicitly authorizes a recurring schedule and its account-write scope. The standing authorization may replace per-run preview and action-time confirmation only while every run stays inside all of these limits:

- Process only previously unseen `aweme_id` values.
- Prefer existing folders when they are a genuine content fit.
- Create a public folder when the content represents a durable user intent that does not reasonably fit an existing folder.
- Create at most two new folders per run; route excess or low-confidence cases to `待确认`.
- Do not silently reclassify previously processed videos.
- Do not change visibility of existing folders.
- Perform no writes when there are no new favorites.

Any action outside this scope requires fresh user approval.

## One-time workflow

1. Run `npm run collect -- --limit 200` and record `RUN_DIR`.
2. Run `npm run draft -- --run <RUN_DIR>`.
3. Refine the plan using [references/classification-policy.md](references/classification-policy.md).
4. Run `npm run validate -- --run <RUN_DIR>` and `npm run preview -- --run <RUN_DIR>`.
5. Wait for the user to approve the exact token.
6. Run `approve`, `manifest`, browser `preflight`, and the bounded apply commands described in [references/browser-apply.md](references/browser-apply.md).

## Recurring incremental workflow

1. Confirm `git status -sb` has no unexpected code changes. Runtime files under ignored `var/` are allowed.
2. Run `npm run browser-apply -- inspect-folders` and record the current folder names, counts, and visibility.
3. Run `npm run collect -- --limit 200` and record `RUN_DIR`.
4. Run `npm run incremental -- --run <RUN_DIR>`.
5. Read `incremental-summary.json`:
   - If `new_count` is `0`, make no account changes and stop quietly.
   - Otherwise read `classification-input.json`, `incremental-favorites.json`, and [references/classification-policy.md](references/classification-policy.md).
6. Run `npm run draft -- --run <RUN_DIR> --folder-visibility public`, then refine `classification-plan.json`:
   - Replace stale `existing_folders` with the current inspected names.
   - Assign every new video exactly once.
   - Reuse a current folder only when its meaning genuinely matches.
   - Add a new public folder for a strong, reusable category that has no good existing home.
   - Keep names at most 15 characters and create no more than two new folders in one run.
   - Use `待确认` for weak, conflicting, or overly narrow evidence.
   - Keep `source_sha256` unchanged and reset approval to pending after editing.
7. Run `validate` and `preview`. Under a valid standing authorization, verify the preview against the recurring limits, then use its token with `approve` without asking again.
8. Run `manifest`, browser `preflight`, `create-folders`, and one `add-folder` batch at a time.
9. Require verified journal coverage for every new ID or an explicit `unavailable` record.
10. Run `npm run commit-state -- --run <RUN_DIR>` only after all planned new IDs are verified or unavailable.
11. Close the automation browser session. Report changes and failures; a no-op run may stay quiet.

## Apply and verification

Follow [references/browser-apply.md](references/browser-apply.md). Derive the execution token as `EXECUTE:<first 12 characters of plan_fingerprint>`.

Completion requires:

- Plan validation passed and its fingerprint matches the manifest.
- Every new folder has the requested visibility and a visible final state.
- Existing-folder counts increased by the exact verified batch size.
- Every new video is journaled as `verified` or `unavailable`.
- Incremental state committed successfully.
- No delete, rename, visibility change, `取消收藏`, or unrelated account action occurred.

Use `scripts/run-organizer.ps1` when direct npm commands are inconvenient.
