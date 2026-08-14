import assert from "node:assert/strict";
import test from "node:test";
import { hasDouyinSavedCommand } from "../src/collector.mjs";

test("detects the required douyin saved command in OpenCLI help", () => {
  assert.equal(hasDouyinSavedCommand("  collections [options]\n  saved [options]  [read] List saved videos\n"), true);
});

test("rejects the stock OpenCLI command list without douyin saved", () => {
  assert.equal(hasDouyinSavedCommand("  collections [options]\n  videos [options]\n"), false);
});
