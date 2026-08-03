# Browser apply contract

## Preflight

1. Confirm the intended Douyin account is signed in without inspecting authentication data.
2. Open `https://www.douyin.com/user/self?showSubTab=favorite_folder&showTab=favorite_collection`.
3. Verify `收藏夹`, `视频`, `批量管理`, and `新建收藏夹` are present.
4. Run `inspect-folders` before classification and use the returned current names.
5. Verify the approved plan fingerprint matches the manifest.
6. Stop on UI drift, CAPTCHA, or ambiguous state.

## Create folders

For each missing manifest folder:

1. Open `收藏夹` and click the unique `新建收藏夹` control.
2. Fill the exact name, at most 15 characters.
3. Set `设置为公开` to the manifest visibility. Recurring adaptive folders are public.
4. Submit once.
5. Verify the dialog closed, the exact name is visible, and the private-lock indicator agrees with the requested visibility.

Never rename, delete, merge, or change visibility of an existing folder.

## Add videos

Process one folder at a time.

1. Record the target folder's baseline `共 N 作品` count.
2. Open `视频` → `批量管理`.
3. Match cards by the exact numeric `/video/<aweme_id>` link, not title.
4. Scroll bounded internal containers until every intended ID is mapped or the list stabilizes.
5. Record persistently absent IDs as `unavailable`; never use a private endpoint to force a write.
6. Select only the intended IDs and verify the selected count.
7. Click `加入收藏夹`; never click `取消收藏`.
8. Select the exact folder and submit once.
9. Verify the final folder count equals baseline plus the verified batch size.
10. Journal baseline, final count, IDs, and status before moving to the next folder.

An exact batch already marked `verified` in the journal may be skipped. Do not infer success from count alone after an unknown submit.

## Failure handling

- Stop on ambiguous selectors, count mismatches, unknown dialogs, CAPTCHA, missing IDs, or uncertain submit results.
- Do not repeat a submit until visible state proves the first attempt did not apply.
- Resume only from current page state plus the local journal.
- Hand CAPTCHA and login recovery to the user.
- Never use undocumented private endpoints as a fallback.
