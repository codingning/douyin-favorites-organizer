const DOUYIN_FAVORITES_URL = "https://www.douyin.com/user/self?from_tab_name=main&showTab=favorite_collection";

export function douyinFavoritesUrl() {
  return DOUYIN_FAVORITES_URL;
}

export function browserWindowMode(command) {
  return command === "inspect-folders" || command === "close"
    ? "background"
    : "foreground";
}

export function browserSessionPolicy(command) {
  return {
    windowMode: browserWindowMode(command),
    resetExisting: command !== "inspect-folders" && command !== "close",
  };
}
