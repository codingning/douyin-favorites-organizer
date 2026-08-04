import test from "node:test";
import assert from "node:assert/strict";
import { partitionMappedTargets } from "../src/browser-selection.mjs";

test("partitions persistently missing videos instead of failing the whole batch", () => {
  assert.deepEqual(
    partitionMappedTargets(["1", "2", "3"], ["1", "3"]),
    { available: ["1", "3"], missing: ["2"] },
  );
});
