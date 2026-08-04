import test from "node:test";
import assert from "node:assert/strict";
import { browserWindowMode } from "../src/browser-session-policy.mjs";

test("account-write browser commands require a foreground window", () => {
  assert.equal(browserWindowMode("inspect-folders"), "background");
  assert.equal(browserWindowMode("preflight"), "foreground");
  assert.equal(browserWindowMode("create-folders"), "foreground");
  assert.equal(browserWindowMode("add-folder"), "foreground");
});
