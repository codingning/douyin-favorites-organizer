import { approvalToken, planFingerprint } from "./plan.mjs";

export function renderPreview(plan, source, validation) {
  const counts = new Map();
  for (const assignment of plan.assignments || []) counts.set(assignment.folder, (counts.get(assignment.folder) || 0) + 1);
  const lowConfidence = (plan.assignments || []).filter(item => Number(item.confidence) < 0.58);
  const lines = [
    "# 抖音收藏夹整理预览",
    "",
    `- 收藏视频：${source.count ?? source.favorites?.length ?? 0} 条`,
    `- 拟创建或复用收藏夹：${plan.folders?.length || 0} 个`,
    `- 低置信度：${lowConfidence.length} 条`,
    `- 校验：${validation.ok ? "通过" : "失败"}`,
    `- 计划指纹：${planFingerprint(plan)}`,
    "- 当前阶段：只读预览，不会修改抖音账号",
    "",
    "## 分类汇总",
    "",
    "| 收藏夹 | 视频数 | 可见性 |",
    "| --- | ---: | --- |",
  ];
  const orderedFolders = [...(plan.folders || [])]
    .sort((a, b) => (counts.get(b.name) || 0) - (counts.get(a.name) || 0)
      || a.name.localeCompare(b.name, "zh-CN"));
  for (const folder of orderedFolders) {
    lines.push(`| ${folder.name} | ${counts.get(folder.name) || 0} | ${folder.visibility === "private" ? "私密" : folder.visibility} |`);
  }
  if (validation.warnings.length) {
    lines.push("", "## 警告", "", ...validation.warnings.map(item => `- ${item}`));
  }
  if (validation.errors.length) {
    lines.push("", "## 阻断错误", "", ...validation.errors.map(item => `- ${item}`));
  }
  lines.push(
    "",
    "## 审批门禁",
    "",
    `只有在用户明确确认该预览后，才能运行：\`${approvalToken(plan)}\`。`,
    "审批仅生成执行清单；真正操作抖音前仍需一次动作时确认。",
    "",
  );
  return `${lines.join("\n")}\n`;
}
