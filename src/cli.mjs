import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { collectFavorites } from "./collector.mjs";
import { writeDraftPlan } from "./classifier.mjs";
import { approvePlan, approvalToken, buildApplyManifest, validatePlan } from "./plan.mjs";
import { readJson, writeJson, writeText } from "./io.mjs";
import { renderPreview } from "./preview.mjs";
import { appendJournal } from "./journal.mjs";

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function parseArgs(values) {
  const args = { _: [] };
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (!value.startsWith("--")) { args._.push(value); continue; }
    const key = value.slice(2).replaceAll("-", "_");
    const next = values[index + 1];
    if (!next || next.startsWith("--")) args[key] = true;
    else { args[key] = next; index += 1; }
  }
  return args;
}

function resolveRun(args) {
  if (!args.run) throw new Error("--run <directory> is required");
  return path.resolve(args.run);
}

function loadRun(run) {
  return {
    source: readJson(path.join(run, "favorites.json")),
    plan: readJson(path.join(run, "classification-plan.json")),
  };
}

async function main() {
  const [command, ...rest] = process.argv.slice(2);
  const args = parseArgs(rest);
  if (command === "collect") {
    const result = await collectFavorites({
      limit: args.limit ? Number(args.limit) : 200,
      outputDirectory: args.out ? path.resolve(args.out) : undefined,
    });
    process.stdout.write(`${JSON.stringify({ ok: true, run: result.directory, count: result.source.count, coverage_warning: result.source.coverage_warning }, null, 2)}\n`);
    return;
  }
  if (command === "draft") {
    const run = resolveRun(args);
    const result = writeDraftPlan(run, {
      minimumConfidence: args.minimum_confidence ? Number(args.minimum_confidence) : 0.58,
      uncertainFolder: args.uncertain_folder || "待确认",
    });
    process.stdout.write(`${JSON.stringify({ ok: true, plan: result.file, assignments: result.plan.assignments.length }, null, 2)}\n`);
    return;
  }
  if (command === "journal") {
    const run = resolveRun(args);
    const result = appendJournal(run, {
      folder: args.folder,
      ids: String(args.ids || "").split(","),
      status: args.status,
      verifiedCount: args.verified_count,
      evidence: args.evidence,
    });
    process.stdout.write(`${JSON.stringify({ ok: true, journal: result.file, record: result.record }, null, 2)}\n`);
    return;
  }
  if (["validate", "preview", "approve", "manifest"].includes(command)) {
    const run = resolveRun(args);
    const { source, plan } = loadRun(run);
    const validation = validatePlan(plan, source);
    if (command === "validate") {
      process.stdout.write(`${JSON.stringify(validation, null, 2)}\n`);
      if (!validation.ok) process.exitCode = 1;
      return;
    }
    if (command === "preview") {
      const output = path.join(run, "preview.md");
      writeText(output, renderPreview(plan, source, validation));
      process.stdout.write(`${JSON.stringify({ ok: validation.ok, preview: output, approval_token: approvalToken(plan), warnings: validation.warnings }, null, 2)}\n`);
      if (!validation.ok) process.exitCode = 1;
      return;
    }
    if (!validation.ok) throw new Error(`Plan validation failed: ${validation.errors.join("; ")}`);
    if (command === "approve") {
      if (!args.token) throw new Error(`--token is required. Expected ${approvalToken(plan)}`);
      const approved = approvePlan(plan, String(args.token));
      writeJson(path.join(run, "classification-plan.json"), approved);
      process.stdout.write(`${JSON.stringify({ ok: true, status: "approved", token: approved.approval.token }, null, 2)}\n`);
      return;
    }
    const manifest = buildApplyManifest(plan, source);
    const output = path.join(run, "apply-manifest.json");
    writeJson(output, manifest);
    process.stdout.write(`${JSON.stringify({ ok: true, manifest: output, dry_run_only: true }, null, 2)}\n`);
    return;
  }
  const commands = ["collect", "draft", "validate", "preview", "approve", "manifest", "journal"];
  throw new Error(`Unknown command. Use one of: ${commands.join(", ")}`);
}

main().catch(error => {
  process.stderr.write(`${error?.stack || error}\n`);
  process.exitCode = 1;
});
