import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { appendJournal } from "../src/journal.mjs";

test("journals only non-sensitive batch evidence", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "douyin-organizer-"));
  const result = appendJournal(directory, {
    folder: "AI视频工作流",
    ids: ["1", "2"],
    status: "verified",
    verifiedCount: 2,
    evidence: "visible success toast",
  });
  assert.equal(result.record.verified_count, 2);
  assert.equal(fs.readFileSync(result.file, "utf8").trim().length > 0, true);
});

test("rejects sensitive evidence", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "douyin-organizer-"));
  assert.throws(() => appendJournal(directory, {
    folder: "x",
    ids: ["1"],
    status: "failed",
    evidence: "Cookie=secret-value",
  }), /sensitive/u);
});
