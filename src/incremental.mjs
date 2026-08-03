import fs from "node:fs";
import path from "node:path";
import { ensureDirectory, readJson, sha256, writeJson } from "./io.mjs";

function readJsonIfExists(file) {
  return fs.existsSync(file) ? readJson(file) : null;
}

function readJournal(file) {
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, "utf8")
    .split(/\r?\n/u)
    .filter(Boolean)
    .map(line => JSON.parse(line));
}

function emptyState() {
  return {
    schema_version: 1,
    updated_at: null,
    folders: [],
    videos: {},
  };
}

function mergeFolder(state, folder) {
  const name = String(folder?.name || folder || "").trim();
  if (!name) return;
  const existing = state.folders.find(item => item.name === name);
  const next = {
    name,
    description: String(folder?.description || existing?.description || "").trim(),
    visibility: ["private", "public"].includes(folder?.visibility)
      ? folder.visibility
      : (existing?.visibility || "public"),
  };
  if (existing) Object.assign(existing, next);
  else state.folders.push(next);
}

function applyRunToState(state, runDirectory) {
  const source = readJsonIfExists(path.join(runDirectory, "favorites.json"));
  if (!source?.favorites) return state;
  const plan = readJsonIfExists(path.join(runDirectory, "classification-plan.json"));
  const assignments = new Map((plan?.assignments || []).map(item => [String(item.aweme_id), item]));
  const latestStatus = new Map();
  for (const entry of readJournal(path.join(runDirectory, "apply-journal.jsonl"))) {
    for (const id of entry.aweme_ids || []) latestStatus.set(String(id), entry.status);
  }
  for (const folder of plan?.folders || []) mergeFolder(state, folder);
  for (const folderName of plan?.existing_folders || []) mergeFolder(state, folderName);
  for (const favorite of source.favorites) {
    const id = String(favorite.aweme_id);
    const assignment = assignments.get(id);
    const previous = state.videos[id] || {};
    state.videos[id] = {
      aweme_id: id,
      first_seen_at: previous.first_seen_at || source.captured_at || null,
      last_seen_at: source.captured_at || previous.last_seen_at || null,
      title_sha256: sha256(String(favorite.title || "")),
      folder: assignment?.folder || previous.folder || null,
      status: latestStatus.get(id) || previous.status || "seen",
    };
  }
  return state;
}

export function buildHistoricalState(runsRoot, { excludeRun } = {}) {
  const state = emptyState();
  if (!fs.existsSync(runsRoot)) return state;
  const excluded = excludeRun ? path.resolve(excludeRun) : null;
  const directories = fs.readdirSync(runsRoot, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => path.join(runsRoot, entry.name))
    .filter(directory => path.resolve(directory) !== excluded)
    .sort();
  for (const directory of directories) applyRunToState(state, directory);
  state.updated_at = new Date().toISOString();
  return state;
}

export function prepareIncrementalRun(runDirectory, { stateFile } = {}) {
  const run = path.resolve(runDirectory);
  const source = readJson(path.join(run, "favorites.json"));
  const resolvedStateFile = path.resolve(stateFile || path.join(path.dirname(path.dirname(run)), "state", "organizer-state.json"));
  const state = fs.existsSync(resolvedStateFile)
    ? readJson(resolvedStateFile)
    : buildHistoricalState(path.dirname(run), { excludeRun: run });
  const newFavorites = source.favorites.filter(item => !state.videos[String(item.aweme_id)]);
  const incrementalSource = {
    ...source,
    source: `${source.source}; incremental new favorites`,
    count: newFavorites.length,
    full_count: source.favorites.length,
    coverage_warning: source.coverage_warning,
    source_sha256: sha256(newFavorites),
    favorites: newFavorites,
  };
  const existingFolders = (state.folders || []).map(folder => folder.name).filter(Boolean);
  writeJson(path.join(run, "incremental-favorites.json"), incrementalSource);
  writeJson(path.join(run, "classification-input.json"), {
    schema_version: 1,
    source_sha256: incrementalSource.source_sha256,
    existing_folders: state.folders || [],
    guidance: {
      mode: "recurring-incremental",
      prefer_existing_folders: true,
      create_new_folder_when_no_durable_fit: true,
      new_folder_visibility: "public",
      max_new_folders_per_run: 2,
      folder_name_max_characters: 15,
      one_primary_folder_per_video: true,
      low_confidence_destination: "待确认",
    },
    videos: newFavorites.map(({ aweme_id, title, author, duration, source_url }) => ({
      aweme_id, title, author, duration, source_url,
    })),
  });
  const summary = {
    schema_version: 1,
    prepared_at: new Date().toISOString(),
    state_file: resolvedStateFile,
    full_count: source.favorites.length,
    new_count: newFavorites.length,
    new_aweme_ids: newFavorites.map(item => item.aweme_id),
    existing_folders: existingFolders,
  };
  writeJson(path.join(run, "incremental-summary.json"), summary);
  return { stateFile: resolvedStateFile, source: incrementalSource, summary };
}

export function commitIncrementalRun(runDirectory, { stateFile } = {}) {
  const run = path.resolve(runDirectory);
  const summary = readJson(path.join(run, "incremental-summary.json"));
  const source = readJson(path.join(run, "favorites.json"));
  const incrementalSource = readJson(path.join(run, "incremental-favorites.json"));
  const resolvedStateFile = path.resolve(stateFile || summary.state_file);
  const state = fs.existsSync(resolvedStateFile)
    ? readJson(resolvedStateFile)
    : buildHistoricalState(path.dirname(run), { excludeRun: run });
  const plan = incrementalSource.favorites.length
    ? readJson(path.join(run, "classification-plan.json"))
    : { assignments: [], folders: [], existing_folders: [] };
  const assignments = new Map((plan.assignments || []).map(item => [String(item.aweme_id), item]));
  const latestStatus = new Map();
  for (const entry of readJournal(path.join(run, "apply-journal.jsonl"))) {
    for (const id of entry.aweme_ids || []) latestStatus.set(String(id), entry.status);
  }
  const incomplete = [];
  for (const favorite of incrementalSource.favorites) {
    const id = String(favorite.aweme_id);
    const status = latestStatus.get(id);
    if (!assignments.has(id) || !["verified", "unavailable"].includes(status)) incomplete.push(id);
  }
  if (incomplete.length) {
    throw new Error(`Cannot commit incremental state; incomplete aweme_id values: ${incomplete.join(",")}`);
  }
  for (const folder of plan.folders || []) mergeFolder(state, folder);
  for (const folderName of plan.existing_folders || []) mergeFolder(state, folderName);
  const assignmentById = new Map((plan.assignments || []).map(item => [String(item.aweme_id), item]));
  for (const favorite of source.favorites) {
    const id = String(favorite.aweme_id);
    const previous = state.videos[id] || {};
    const assignment = assignmentById.get(id);
    state.videos[id] = {
      aweme_id: id,
      first_seen_at: previous.first_seen_at || source.captured_at || null,
      last_seen_at: source.captured_at || previous.last_seen_at || null,
      title_sha256: sha256(String(favorite.title || "")),
      folder: assignment?.folder || previous.folder || null,
      status: latestStatus.get(id) || previous.status || "seen",
    };
  }
  state.updated_at = new Date().toISOString();
  state.last_run = {
    run_directory: run,
    captured_at: source.captured_at,
    full_count: source.favorites.length,
    new_count: incrementalSource.favorites.length,
  };
  ensureDirectory(path.dirname(resolvedStateFile));
  writeJson(resolvedStateFile, state);
  return { stateFile: resolvedStateFile, state, committed: incrementalSource.favorites.length };
}
