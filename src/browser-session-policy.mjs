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
