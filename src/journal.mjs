import fs from "node:fs";
import path from "node:path";
import { ensureDirectory } from "./io.mjs";

const ALLOWED_STATUS = new Set(["started", "verified", "failed", "unknown"]);
const SENSITIVE_PATTERN = /cookie|token|authorization|password|二维码|request.?signature|x-bogus|msToken/iu;

export function appendJournal(runDirectory, entry) {
  const status = String(entry.status || "");
  if (!ALLOWED_STATUS.has(status)) throw new Error(`Invalid journal status: ${status}`);
  const folder = String(entry.folder || "").trim();
  if (!folder) throw new Error("journal folder is required");
  const ids = [...new Set((entry.ids || []).map(String).filter(Boolean))];
  if (ids.length === 0) throw new Error("journal ids must not be empty");
  const evidence = String(entry.evidence || "").trim();
  if (SENSITIVE_PATTERN.test(evidence)) throw new Error("journal evidence may contain sensitive browser or authentication data");
  const record = {
    schema_version: 1,
    recorded_at: new Date().toISOString(),
    folder,
    aweme_ids: ids,
    intended_count: ids.length,
    verified_count: Number(entry.verifiedCount || 0),
    status,
    evidence_type: evidence || "not-recorded",
  };
  const file = path.join(runDirectory, "apply-journal.jsonl");
  ensureDirectory(path.dirname(file));
  fs.appendFileSync(file, `${JSON.stringify(record)}\n`, "utf8");
  return { file, record };
}
