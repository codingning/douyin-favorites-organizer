import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SKIP = new Set([".git", ".skill-init", "node_modules", "var"]);
const PATTERNS = [
  ["private key", /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/u],
  ["OpenAI-style key", /\bsk-[A-Za-z0-9_-]{20,}\b/u],
  ["GitHub token", /\bgh[opurs]_[A-Za-z0-9]{30,}\b/u],
  ["Bearer token", /\bBearer\s+[A-Za-z0-9._~+\/-]{20,}/iu],
  ["Cookie assignment", /\b(?:cookie|msToken)\s*[:=]\s*["'][^"']{12,}["']/iu],
];

function files(directory, result = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && SKIP.has(entry.name)) continue;
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) files(full, result);
    else result.push(full);
  }
  return result;
}

const findings = [];
let scanned = 0;
for (const file of files(ROOT)) {
  if (path.relative(ROOT, file).replaceAll("\\", "/") === "scripts/security-scan.mjs") continue;
  if (fs.statSync(file).size > 2_000_000) continue;
  const text = fs.readFileSync(file, "utf8");
  scanned += 1;
  for (const [name, pattern] of PATTERNS) {
    if (pattern.test(text)) findings.push({ file: path.relative(ROOT, file), pattern: name });
  }
}

if (findings.length) {
  process.stderr.write(`${JSON.stringify({ ok: false, scanned, findings }, null, 2)}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(`${JSON.stringify({ ok: true, scanned, findings: [] }, null, 2)}\n`);
}
