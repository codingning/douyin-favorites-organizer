import { sha256 } from "./io.mjs";

export function planFingerprint(plan) {
  const copy = structuredClone(plan);
  copy.approval = { status: "pending", token: null, approved_at: null };
  return sha256(copy);
}

export function approvalToken(plan) {
  return `APPROVE:${planFingerprint(plan).slice(0, 12)}`;
}

export function validatePlan(plan, source) {
  const errors = [];
  const warnings = [];
  if (plan?.schema_version !== 1) errors.push("plan.schema_version must be 1");
  if (!Array.isArray(plan?.folders) || plan.folders.length === 0) errors.push("plan.folders must not be empty");
  if (!Array.isArray(plan?.assignments)) errors.push("plan.assignments must be an array");

  const folderNames = new Set();
  for (const folder of plan?.folders || []) {
    const name = String(folder?.name || "").trim();
    if (!name) errors.push("folder name must not be empty");
    if ([...name].length > 15) errors.push(`folder name exceeds 15 characters: ${name}`);
    if (folderNames.has(name)) errors.push(`duplicate folder name: ${name}`);
    folderNames.add(name);
    if (folder?.visibility !== "private") warnings.push(`folder will not be private: ${name}`);
  }
  if (folderNames.size > 15) errors.push("at most 15 folders may be proposed in one plan");

  const sourceItems = new Map((source?.favorites || []).map(item => [String(item.aweme_id), item]));
  const assignedIds = new Set();
  for (const assignment of plan?.assignments || []) {
    const id = String(assignment?.aweme_id || "");
    if (!sourceItems.has(id)) errors.push(`assignment references unknown aweme_id: ${id}`);
    if (assignedIds.has(id)) errors.push(`aweme_id assigned more than once: ${id}`);
    assignedIds.add(id);
    if (!folderNames.has(String(assignment?.folder || ""))) errors.push(`assignment references unknown folder: ${assignment?.folder}`);
    const confidence = Number(assignment?.confidence);
    if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) errors.push(`invalid confidence for ${id}`);
    if (!String(assignment?.reason || "").trim()) warnings.push(`assignment has no reason: ${id}`);
  }
  for (const id of sourceItems.keys()) {
    if (!assignedIds.has(id)) errors.push(`source video is not assigned: ${id}`);
  }
  if (source?.source_sha256 && plan?.source_sha256 !== source.source_sha256) errors.push("plan source_sha256 does not match favorites.json");
  if (source?.coverage_warning) warnings.push("collection count reached the configured limit; all-favorites coverage is not proven");
  return { ok: errors.length === 0, errors, warnings };
}

export function approvePlan(plan, token, now = new Date()) {
  const expected = approvalToken(plan);
  if (token !== expected) throw new Error(`Approval token mismatch. Expected ${expected}`);
  return {
    ...plan,
    approval: { status: "approved", token: expected, approved_at: now.toISOString() },
  };
}

export function buildApplyManifest(plan, source) {
  if (plan?.approval?.status !== "approved" || plan.approval.token !== approvalToken(plan)) {
    throw new Error("Plan is not approved with the current fingerprint");
  }
  const sourceById = new Map(source.favorites.map(item => [String(item.aweme_id), item]));
  const grouped = new Map();
  for (const assignment of plan.assignments) {
    if (!grouped.has(assignment.folder)) grouped.set(assignment.folder, []);
    grouped.get(assignment.folder).push({
      aweme_id: assignment.aweme_id,
      title: sourceById.get(String(assignment.aweme_id))?.title || "",
      source_url: sourceById.get(String(assignment.aweme_id))?.source_url || "",
    });
  }
  return {
    schema_version: 1,
    generated_at: new Date().toISOString(),
    plan_fingerprint: planFingerprint(plan),
    dry_run_only: true,
    safety_notice: "This manifest does not modify Douyin. Run the Skill's browser apply phase only after a separate action-time confirmation.",
    create_folders: plan.folders
      .filter(folder => !(plan.existing_folders || []).includes(folder.name))
      .map(folder => ({ name: folder.name, visibility: folder.visibility })),
    add_to_folders: [...grouped.entries()].map(([folder, videos]) => ({ folder, videos })),
  };
}
