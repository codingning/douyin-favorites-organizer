import test from "node:test";
import assert from "node:assert/strict";
import { approvePlan, approvalToken, buildApplyManifest, validatePlan } from "../src/plan.mjs";

function fixture() {
  const source = { source_sha256: "hash", count: 1, favorites: [{ aweme_id: "1", title: "x", source_url: "https://www.douyin.com/video/1" }] };
  const plan = {
    schema_version: 1,
    source_sha256: "hash",
    existing_folders: [],
    folders: [{ name: "待确认", description: "x", visibility: "private" }],
    assignments: [{ aweme_id: "1", folder: "待确认", confidence: 0.3, reason: "证据不足", evidence: [] }],
    approval: { status: "pending", token: null, approved_at: null },
  };
  return { source, plan };
}

test("validates a complete plan", () => {
  const { source, plan } = fixture();
  assert.equal(validatePlan(plan, source).ok, true);
});

test("rejects unknown folders", () => {
  const { source, plan } = fixture();
  plan.assignments[0].folder = "不存在";
  assert.equal(validatePlan(plan, source).ok, false);
});

test("approval token binds to plan contents", () => {
  const { plan } = fixture();
  const token = approvalToken(plan);
  const approved = approvePlan(plan, token, new Date("2026-07-31T00:00:00Z"));
  assert.equal(approved.approval.status, "approved");
  const { source } = fixture();
  const manifest = buildApplyManifest(approved, source);
  assert.equal(manifest.dry_run_only, true);
  assert.equal(manifest.add_to_folders[0].videos.length, 1);
});

test("allows explicitly public folders in a valid plan", () => {
  const { source, plan } = fixture();
  plan.folders[0].visibility = "public";
  assert.equal(validatePlan(plan, source).ok, true);
  const approved = approvePlan(plan, approvalToken(plan));
  const manifest = buildApplyManifest(approved, source);
  assert.equal(manifest.create_folders[0].visibility, "public");
});
