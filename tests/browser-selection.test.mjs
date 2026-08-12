import test from "node:test";
import assert from "node:assert/strict";
import { partitionMappedTargets, targetCheckboxSelector } from "../src/browser-selection.mjs";

test("partitions persistently missing videos instead of failing the whole batch", () => {
  assert.deepEqual(
    partitionMappedTargets(["1", "2", "3"], ["1", "3"]),
    { available: ["1", "3"], missing: ["2"] },
  );
});

test("targets the controlled checkbox input instead of its inert wrapper", () => {
  assert.equal(
    targetCheckboxSelector("7671222361748659611"),
    '[data-organizer-target="7671222361748659611"]',
  );
});
