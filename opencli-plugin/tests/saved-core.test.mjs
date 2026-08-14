import test from "node:test";
import assert from "node:assert/strict";
import {
  extractSelfUser,
  firstHttpUrl,
  mapSavedAweme,
  mergeCapturedSavedPages,
  normalizeLimit,
  pageSizeFor,
} from "../lib/saved-core.mjs";

test("normalizes limits and page sizes", () => {
  assert.equal(normalizeLimit(undefined), 20);
  assert.equal(normalizeLimit(200), 200);
  assert.equal(pageSizeFor(50), 18);
  assert.equal(pageSizeFor(4), 4);
  assert.throws(() => normalizeLimit(0), /between 1 and 200/u);
  assert.throws(() => normalizeLimit(201), /between 1 and 200/u);
});

test("extracts the logged-in self user only from the expected render path", () => {
  assert.deepEqual(extractSelfUser({
    app: { user: { info: { uid: "1", secUid: "MS4wLjABAAAAfixture", nickname: "Me" } } },
  }), { uid: "1", secUid: "MS4wLjABAAAAfixture", nickname: "Me" });
  assert.equal(extractSelfUser({ app: { user: { info: { secUid: "bad" } } } }), null);
});

test("maps saved aweme metadata and keeps signed URLs opt-in", () => {
  const fixture = {
    aweme_id: "7000000000000000001",
    desc: "Example",
    create_time: 123,
    author: { nickname: "Author", sec_uid: "MS4wLjABauthor" },
    statistics: { digg_count: 5, collect_count: 6, comment_count: 7, share_count: 8 },
    video: {
      duration: 221216,
      cover: { url_list: ["https://img.example/cover.jpg"] },
      play_addr: { url_list: ["https://video.example/signed.mp4?token=secret"] },
    },
  };
  const safe = mapSavedAweme(fixture, 1);
  assert.equal(safe.duration, 221);
  assert.equal(safe.source_url, "https://www.douyin.com/video/7000000000000000001");
  assert.equal("play_url" in safe, false);
  const download = mapSavedAweme(fixture, 1, { includePlayUrl: true });
  assert.match(download.play_url, /^https:\/\/video\.example/u);
  assert.equal(firstHttpUrl([{ src: "https://a.example/x" }]), "https://a.example/x");
});

test("merges only saved-video collection responses across pages", () => {
  const pages = [
    { endpoint: "/aweme/v1/web/aweme/favorite/", items: [{ aweme_id: "999" }] },
    { endpoint: "/aweme/v1/web/aweme/listcollection/", items: [{ aweme_id: "101" }, { aweme_id: "102" }] },
    { endpoint: "/aweme/v1/web/aweme/listcollection/", items: [{ aweme_id: "102" }, { aweme_id: "103" }] },
    { endpoint: "/aweme/v1/web/collects/video/list/", items: [{ aweme_id: "104" }] },
  ];
  assert.deepEqual(mergeCapturedSavedPages(pages, 10).map(item => item.aweme_id), ["101", "102", "103", "104"]);
});
