import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

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

function runNode(args, home) {
  return spawnSync(process.execPath, args, {
    cwd: PROJECT_ROOT,
    env: { ...process.env, HOME: home, USERPROFILE: home },
    encoding: "utf8",
    windowsHide: true,
    shell: false,
  });
}

test("a clean user profile can install and discover the bundled douyin saved plugin", () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "douyin-favorites-opencli-"));
  try {
    const before = runNode([LOCAL_OPENCLI, "douyin", "saved"], home);
    assert.notEqual(before.status, 0);
    assert.match(`${before.stdout}\n${before.stderr}`, /unknown command ['‘’]?saved/u);

    const collectBeforeSetup = runNode([path.join(PROJECT_ROOT, "src", "cli.mjs"), "collect", "--limit", "1"], home);
    assert.notEqual(collectBeforeSetup.status, 0);
    assert.match(`${collectBeforeSetup.stdout}\n${collectBeforeSetup.stderr}`, /Run `npm run setup`/u);
    assert.doesNotMatch(`${collectBeforeSetup.stdout}\n${collectBeforeSetup.stderr}`, /unknown command ['‘’]?saved/u);

    const setup = runNode([path.join(PROJECT_ROOT, "scripts", "setup-opencli-plugin.mjs")], home);
    assert.equal(setup.status, 0, `${setup.stdout}\n${setup.stderr}`);
    assert.match(setup.stdout, /Installed and verified/u);

    const after = runNode([LOCAL_OPENCLI, "douyin", "--help"], home);
    assert.equal(after.status, 0, `${after.stdout}\n${after.stderr}`);
    assert.match(after.stdout, /^\s{2}saved(?:\s|\[)/mu);
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
  }
});
