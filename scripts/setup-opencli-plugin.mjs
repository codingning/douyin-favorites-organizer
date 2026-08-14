import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LOCAL_OPENCLI = path.join(
  PROJECT_ROOT,
  "node_modules",
  "@jackwener",
  "opencli",
  "dist",
  "src",
  "main.js",
);
const BUNDLED_PLUGIN = path.join(PROJECT_ROOT, "opencli-plugin");

function runOpencli(args) {
  return spawnSync(process.execPath, [LOCAL_OPENCLI, ...args], {
    cwd: PROJECT_ROOT,
    env: process.env,
    encoding: "utf8",
    windowsHide: true,
    shell: false,
  });
}

export function hasDouyinSavedCommand(output) {
  return /^\s{2}saved(?:\s|\[)/mu.test(String(output || ""));
}

function commandIsAvailable() {
  const result = runOpencli(["douyin", "--help"]);
  return result.status === 0 && hasDouyinSavedCommand(`${result.stdout}\n${result.stderr}`);
}

function resultMessage(result) {
  return String(result.stderr || result.stdout || `exit code ${result.status}`).trim();
}

export function setupOpencliPlugin() {
  if (!fs.existsSync(LOCAL_OPENCLI)) {
    throw new Error("Project-local OpenCLI is missing. Run `npm install` first.");
  }
  if (!fs.existsSync(path.join(BUNDLED_PLUGIN, "opencli-plugin.json"))) {
    throw new Error("The bundled douyin-saved plugin is missing. Download the complete repository again.");
  }
  if (commandIsAvailable()) {
    return { installed: false, message: "OpenCLI command `douyin saved` is already available." };
  }

  const result = runOpencli(["plugin", "install", pathToFileURL(BUNDLED_PLUGIN).href]);
  if (result.status !== 0) {
    const home = process.env.HOME || process.env.USERPROFILE || os.homedir();
    const pluginPath = path.join(home, ".opencli", "plugins", "douyin-saved");
    throw new Error(
      `Could not install the bundled douyin-saved plugin: ${resultMessage(result)}\n`
      + `If another plugin already occupies this name, inspect it at ${pluginPath}; this setup will not overwrite it.`,
    );
  }
  if (!commandIsAvailable()) {
    throw new Error("The plugin installer completed, but `opencli douyin saved` is still unavailable.");
  }
  return { installed: true, message: "Installed and verified OpenCLI command `douyin saved`." };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = setupOpencliPlugin();
    console.log(result.message);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
