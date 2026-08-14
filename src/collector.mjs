import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import { ensureDirectory, sha256, timestampId, writeJson } from "./io.mjs";

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LOCAL_OPENCLI = path.join(PROJECT_ROOT, "node_modules", "@jackwener", "opencli", "dist", "src", "main.js");

export function hasDouyinSavedCommand(output) {
  return /^\s{2}saved(?:\s|\[)/mu.test(String(output || ""));
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd || PROJECT_ROOT,
      env: { ...process.env, ...options.env },
      windowsHide: true,
      shell: false,
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", chunk => { stdout += chunk; });
    child.stderr.on("data", chunk => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", code => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`OpenCLI exited ${code}: ${stderr.trim() || stdout.trim()}`));
    });
  });
}

export function sanitizeFavorite(row, rank) {
  return {
    rank: Number(row.rank || rank),
    aweme_id: String(row.aweme_id || ""),
    title: String(row.title || "").trim(),
    author: String(row.author || "").trim(),
    duration: Number(row.duration || 0),
    create_time: Number(row.create_time || 0),
    source_url: String(row.source_url || ""),
  };
}

export async function collectFavorites({ limit = 200, outputDirectory } = {}) {
  const normalizedLimit = Number(limit);
  if (!Number.isInteger(normalizedLimit) || normalizedLimit < 1 || normalizedLimit > 200) {
    throw new Error("limit must be an integer between 1 and 200");
  }
  if (!fs.existsSync(LOCAL_OPENCLI)) {
    throw new Error("Project-local OpenCLI is missing. Run npm install first.");
  }
  const help = await run(process.execPath, [LOCAL_OPENCLI, "douyin", "--help"]);
  if (!hasDouyinSavedCommand(`${help.stdout}\n${help.stderr}`)) {
    throw new Error(
      "OpenCLI command `douyin saved` is unavailable. Run `npm run setup` from the project root, then retry.",
    );
  }
  const { stdout, stderr } = await run(process.execPath, [
    LOCAL_OPENCLI,
    "douyin",
    "saved",
    "--limit",
    String(normalizedLimit),
    "-f",
    "json",
  ]);
  const parsed = JSON.parse(stdout.replace(/^\uFEFF/u, ""));
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("No favorites were returned. Confirm Browser Bridge and Douyin login first.");
  }
  const favorites = parsed.map(sanitizeFavorite).filter(item => item.aweme_id);
  const ids = new Set(favorites.map(item => item.aweme_id));
  if (ids.size !== favorites.length) throw new Error("Duplicate aweme_id values were returned");

  const directory = outputDirectory || path.join(PROJECT_ROOT, "var", "runs", timestampId());
  ensureDirectory(directory);
  const sourceHash = sha256(favorites);
  const source = {
    schema_version: 1,
    captured_at: new Date().toISOString(),
    source: "opencli douyin saved",
    requested_limit: normalizedLimit,
    count: favorites.length,
    coverage_warning: favorites.length === normalizedLimit,
    source_sha256: sourceHash,
    favorites,
  };
  writeJson(path.join(directory, "favorites.json"), source);
  writeJson(path.join(directory, "classification-input.json"), {
    schema_version: 1,
    source_sha256: sourceHash,
    guidance: {
      target_folder_count: "8-15 when content diversity supports it",
      folder_name_max_characters: 15,
      one_primary_folder_per_video: true,
      low_confidence_destination: "待确认",
      preserve_existing_folders: true,
    },
    videos: favorites.map(({ aweme_id, title, author, duration, source_url }) => ({
      aweme_id, title, author, duration, source_url,
    })),
  });
  return { directory, source, stderr: stderr.trim() };
}
