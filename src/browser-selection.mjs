export function partitionMappedTargets(targetIds, mappedIds) {
  const mapped = new Set([...mappedIds].map(String));
  const normalized = targetIds.map(String);
  return {
    available: normalized.filter(id => mapped.has(id)),
    missing: normalized.filter(id => !mapped.has(id)),
  };
}
