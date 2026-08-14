const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 200;
const PAGE_SIZE = 18;
const SAVED_VIDEO_ENDPOINTS = [
  "/aweme/v1/web/aweme/listcollection/",
  "/aweme/v1/web/collects/video/list/",
];

export function normalizeLimit(value) {
  const numeric = Number(value ?? DEFAULT_LIMIT);
  if (!Number.isInteger(numeric) || numeric <= 0 || numeric > MAX_LIMIT) {
    throw new Error(`limit must be an integer between 1 and ${MAX_LIMIT}`);
  }
  return numeric;
}

export function pageSizeFor(remaining) {
  return Math.min(PAGE_SIZE, Math.max(1, Number(remaining) || 1));
}

export function unwrapEvaluateResult(payload) {
  if (payload && !Array.isArray(payload) && typeof payload === "object"
    && "session" in payload && "data" in payload) {
    return payload.data;
  }
  return payload;
}

export function extractSelfUser(renderData) {
  const user = renderData?.app?.user?.info;
  const secUid = String(user?.secUid || "");
  if (!secUid.startsWith("MS4wLjAB")) return null;
  return {
    uid: String(user?.uid || ""),
    secUid,
    nickname: String(user?.nickname || ""),
  };
}

export function firstHttpUrl(value) {
  const values = Array.isArray(value)
    ? value
    : Array.isArray(value?.url_list)
      ? value.url_list
      : Array.isArray(value?.urlList)
        ? value.urlList
        : [];
  for (const candidate of values) {
    const url = typeof candidate === "string" ? candidate : candidate?.src;
    if (/^https?:\/\//iu.test(String(url || ""))) return String(url);
  }
  return "";
}

function capturedItems(page) {
  if (Array.isArray(page?.items)) return page.items;
  if (Array.isArray(page?.aweme_list)) return page.aweme_list;
  if (Array.isArray(page?.awemeList)) return page.awemeList;
  if (Array.isArray(page?.data?.aweme_list)) return page.data.aweme_list;
  if (Array.isArray(page?.data?.awemeList)) return page.data.awemeList;
  return [];
}

export function mergeCapturedSavedPages(pages, limit = MAX_LIMIT) {
  const maxItems = normalizeLimit(limit);
  const items = [];
  const seenIds = new Set();

  for (const page of Array.isArray(pages) ? pages : []) {
    const endpoint = String(page?.endpoint || "");
    if (!SAVED_VIDEO_ENDPOINTS.some(candidate => endpoint.includes(candidate))) continue;
    for (const item of capturedItems(page)) {
      const id = String(item?.aweme_id || item?.awemeId || "");
      if (!id || seenIds.has(id)) continue;
      seenIds.add(id);
      items.push(item);
      if (items.length >= maxItems) return items;
    }
  }
  return items;
}

export function mapSavedAweme(aweme, rank, { includePlayUrl = false } = {}) {
  const video = aweme?.video || {};
  const statistics = aweme?.statistics || aweme?.stats || {};
  const author = aweme?.author || {};
  const awemeId = String(aweme?.aweme_id || aweme?.awemeId || "");
  const row = {
    rank,
    aweme_id: awemeId,
    title: String(aweme?.desc || "").trim(),
    author: String(author?.nickname || "").trim(),
    author_sec_uid: String(author?.sec_uid || author?.secUid || ""),
    duration: Math.round(Number(video?.duration || 0) / 1000),
    create_time: Number(aweme?.create_time || aweme?.createTime || 0),
    likes: Number(statistics?.digg_count || statistics?.diggCount || 0),
    collects: Number(statistics?.collect_count || statistics?.collectCount || 0),
    comments: Number(statistics?.comment_count || statistics?.commentCount || 0),
    shares: Number(statistics?.share_count || statistics?.shareCount || 0),
    cover_url: firstHttpUrl(video?.cover?.url_list || video?.cover?.urlList || video?.cover),
    source_url: awemeId ? `https://www.douyin.com/video/${awemeId}` : "",
  };
  if (includePlayUrl) {
    row.play_url = firstHttpUrl(
      video?.play_addr?.url_list
      || video?.playAddr?.urlList
      || video?.playAddr
    );
  }
  return row;
}

export const limits = {
  default: DEFAULT_LIMIT,
  max: MAX_LIMIT,
  pageSize: PAGE_SIZE,
};
