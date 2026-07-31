import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export function ensureDirectory(directory) {
  fs.mkdirSync(directory, { recursive: true });
  return directory;
}

export function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8").replace(/^\uFEFF/u, ""));
}

export function writeJson(file, value) {
  ensureDirectory(path.dirname(file));
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  return file;
}

export function writeText(file, value) {
  ensureDirectory(path.dirname(file));
  fs.writeFileSync(file, String(value), "utf8");
  return file;
}

export function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function sha256(value) {
  return crypto.createHash("sha256").update(typeof value === "string" ? value : stableJson(value)).digest("hex");
}

export function timestampId(date = new Date()) {
  return date.toISOString().replace(/[:.]/gu, "-");
}
