import fs from "node:fs";
import path from "node:path";
import { readJson, sha256, writeJson } from "./io.mjs";

export const DEFAULT_TAXONOMY = [
  { name: "AI视频工作流", description: "AI 视频生成、导演 Skill、程序化剪辑与成片工作流", keywords: ["hyperframes", "remotion", "seedance", "comfyui", "ai剪辑", "ai视频", "视频生成", "导演skill", "导演 skill", "codex剪视频", "codex剪辑", "vibe video", "短片生成"] },
  { name: "AI工具与自动化", description: "通用 AI 工具、智能体、提示词和自动化工作流", keywords: ["ai", "codex", "agent", "skill", "智能体", "大模型", "提示词", "自动化", "工作流", "gpt", "claude"] },
  { name: "剪辑与视觉包装", description: "人工剪辑、字幕、排版、音效、封面和画面包装", keywords: ["剪辑", "口播剪辑", "字幕", "排版", "音效", "封面", "剪映", "画面处理", "构图", "文字动画", "网感"] },
  { name: "内容策划与表达", description: "选题、脚本、内容结构、表达方法和创意手法", keywords: ["选题", "脚本", "内容创作", "内容之", "喜剧", "反转", "口播", "推文", "表达", "创作方法", "赛道"] },
  { name: "运营获客与流量", description: "账号运营、获客、流量、涨粉、热门和增长", keywords: ["运营", "获客", "流量", "涨粉", "账号", "营销", "投流", "私域", "增长", "播放量", "上热门", "自媒体"] },
  { name: "商业创业与变现", description: "创业、商业模式、销售、副业和变现", keywords: ["创业", "商业", "赚钱", "搞钱", "变现", "副业", "销售", "生意", "收入", "老板", "开店"] },
  { name: "编程开源与数据", description: "编程、开发、GitHub、开源项目和数据工具", keywords: ["github", "开源", "编程", "代码", "开发", "程序员", "爬虫", "数据爬取", "部署", "api", "git"] },
  { name: "学习与成长", description: "学习方法、教育、考试、职场和个人成长", keywords: ["学习", "教育", "考试", "学历", "职场", "成长", "读书", "课程", "学校", "技能"] },
  { name: "财经与投资", description: "宏观经济、理财、投资、房产和消费", keywords: ["财经", "经济", "投资", "理财", "股票", "基金", "房产", "买房", "消费", "金融"] },
  { name: "健康与生活", description: "健康、运动、饮食、旅行和生活技巧", keywords: ["健康", "运动", "健身", "饮食", "减肥", "旅行", "生活", "美食", "收纳", "养生"] },
  { name: "关系与情绪", description: "亲密关系、家庭、人际沟通和情绪管理", keywords: ["关系", "情绪", "家庭", "孩子", "婚姻", "恋爱", "沟通", "心理", "父母", "人际"] },
  { name: "审美与创意", description: "设计、摄影、艺术、写作和创意表达", keywords: ["设计", "摄影", "艺术", "审美", "创意", "写作", "字体", "绘画", "音乐", "喜剧"] },
];

function keywordScore(text, category, index) {
  const normalized = text.toLowerCase();
  const matches = category.keywords.filter(keyword => normalized.includes(keyword.toLowerCase()));
  return { score: matches.length, matches, index };
}

export function classifyFavorite(favorite, { minimumConfidence = 0.58, uncertainFolder = "待确认" } = {}) {
  const text = `${favorite.title || ""} ${favorite.author || ""}`;
  const ranked = DEFAULT_TAXONOMY
    .map((category, index) => ({ category, ...keywordScore(text, category, index) }))
    .map(candidate => {
      const normalized = text.toLowerCase();
      const hasAi = /\bai\b|codex|skill|agent|大模型|提示词|comfyui|remotion|hyperframes|seedance/iu.test(normalized);
      const hasVideo = /video|视频|剪辑|导演|短片|字幕|画面|成片/iu.test(normalized);
      const comboBonus = candidate.category.name === "AI视频工作流" && hasAi && hasVideo ? 4 : 0;
      return { ...candidate, score: candidate.score + comboBonus };
    })
    .sort((a, b) => b.score - a.score || a.index - b.index);
  const best = ranked[0];
  const second = ranked[1];
  if (!best || best.score === 0) {
    return { folder: uncertainFolder, confidence: 0.3, reason: "标题和作者信息不足，需人工或转录后判断", evidence: [] };
  }
  const margin = best.score - (second?.score || 0);
  const confidence = Math.min(0.96, 0.56 + best.score * 0.12 + Math.max(0, margin) * 0.06);
  if (confidence < minimumConfidence) {
    return { folder: uncertainFolder, confidence, reason: `候选分类接近：${best.category.name}`, evidence: best.matches };
  }
  return {
    folder: best.category.name,
    confidence,
    reason: `命中内容线索：${best.matches.join("、")}`,
    evidence: best.matches,
  };
}

export function buildDraftPlan(source, options = {}) {
  const uncertainFolder = options.uncertainFolder || "待确认";
  const folderVisibility = options.folderVisibility || "private";
  const assignments = source.favorites.map(item => ({
    aweme_id: item.aweme_id,
    ...classifyFavorite(item, {
      minimumConfidence: options.minimumConfidence,
      uncertainFolder,
    }),
  }));
  const used = new Set(assignments.map(item => item.folder));
  const folders = DEFAULT_TAXONOMY
    .filter(category => used.has(category.name))
    .map(({ name, description }) => ({ name, description, visibility: folderVisibility }));
  if (used.has(uncertainFolder)) {
    folders.push({ name: uncertainFolder, description: "证据不足或分类置信度较低，等待人工确认", visibility: folderVisibility });
  }
  const plan = {
    schema_version: 1,
    generated_at: new Date().toISOString(),
    generator: "deterministic-seed-v1; refine with the Codex Skill before approval",
    source_sha256: source.source_sha256 || sha256(source.favorites),
    existing_folders: options.existingFolders || [],
    folders,
    assignments,
    approval: { status: "pending", token: null, approved_at: null },
  };
  return plan;
}

export function writeDraftPlan(runDirectory, options = {}) {
  const incrementalFile = path.join(runDirectory, "incremental-favorites.json");
  const source = readJson(fs.existsSync(incrementalFile) ? incrementalFile : path.join(runDirectory, "favorites.json"));
  const summaryFile = path.join(runDirectory, "incremental-summary.json");
  const summary = fs.existsSync(summaryFile) ? readJson(summaryFile) : null;
  const plan = buildDraftPlan(source, {
    ...options,
    existingFolders: options.existingFolders || summary?.existing_folders || [],
  });
  const file = path.join(runDirectory, "classification-plan.json");
  writeJson(file, plan);
  return { file, plan };
}
