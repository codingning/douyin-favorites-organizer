import test from "node:test";
import assert from "node:assert/strict";
import { browserSessionPolicy, browserWindowMode } from "../src/browser-session-policy.mjs";

test("account-write browser commands require a foreground window", () => {
  assert.equal(browserWindowMode("inspect-folders"), "background");
  assert.equal(browserWindowMode("preflight"), "foreground");
  assert.equal(browserWindowMode("create-folders"), "foreground");
  assert.equal(browserWindowMode("add-folder"), "foreground");
});

test("account-write commands replace a possibly background inspection session", () => {
  assert.deepEqual(browserSessionPolicy("inspect-folders"), {
    windowMode: "background",
    resetExisting: false,
  });
  assert.deepEqual(browserSessionPolicy("preflight"), {
    windowMode: "foreground",
    resetExisting: true,
  });
  assert.deepEqual(browserSessionPolicy("create-folders"), {
    windowMode: "foreground",
    resetExisting: true,
  });
  assert.deepEqual(browserSessionPolicy("add-folder"), {
    windowMode: "foreground",
    resetExisting: true,
  });
});
