# Browser apply contract

The apply phase changes the user's Douyin account. Perform it only after both plan approval and an immediate action-time confirmation.

## Preflight

1. Confirm the browser is signed in to the intended account without inspecting Cookies or storage.
2. Open `https://www.douyin.com/user/self?showSubTab=favorite_folder&showTab=favorite_collection`.
3. Verify the page exposes `收藏夹`, `视频`, `批量管理`, and `新建收藏夹`.
4. Verify the manifest fingerprint matches the approved plan.
5. If the UI or labels differ, stop and report drift.

## Create folders

For each missing folder:

1. Open the `收藏夹` tab and click the unique `新建收藏夹` button.
2. Fill the exact folder name, at most 15 characters.
3. Ensure `设置为公开` is off. The verified 2026-07-31 web form defaulted this switch to on, so explicitly verify the final state before submission.
4. Submit once and verify the exact folder name is visible.

Do not rename, delete, merge, or change visibility of existing folders.

## Add videos

Process one folder at a time and use bounded batches.

1. Open the `视频` tab and click the unique `批量管理` control.
2. Match cards by the numeric ID in their `/video/<aweme_id>` link, not by title alone. In management mode, map each checkbox to the nearest ancestor whose markup contains exactly one distinct `/video/<aweme_id>`; do not use a broad grid ancestor because it contains many IDs.
3. Scroll incrementally until every intended ID for the bounded batch is mapped, or the list becomes stable. Stop if an intended ID cannot be found.
4. Select only IDs listed for the current folder and verify the selected count.
5. Click `加入收藏夹`. Never click the adjacent `取消收藏` action.
6. Select the exact folder name and confirm once.
7. Require an authoritative visible success signal before journaling the batch.
8. Exit management mode before the next batch.

## Failure handling

- Stop on ambiguous selectors, mismatched counts, missing IDs, unknown modals, CAPTCHA, or verification failure.
- Do not repeat a submit action whose result is unknown.
- Resume from the local journal only after checking the visible current state.
- Hand CAPTCHA handling to the user; do not bypass it.
- Never use private undocumented endpoints as a fallback for a failed UI action.
