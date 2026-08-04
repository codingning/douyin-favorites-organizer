export function browserWindowMode(command) {
  return command === "inspect-folders" || command === "close"
    ? "background"
    : "foreground";
}
