import test from "node:test";
import assert from "node:assert/strict";
import { buildDraftPlan, classifyFavorite } from "../src/classifier.mjs";

test("classifies AI workflow content", () => {
  const result = classifyFavorite({ title: "Codex Skill 自动化工作流实战", author: "测试" });
  assert.equal(result.folder, "AI工具与自动化");
  assert.ok(result.confidence >= 0.58);
});

test("routes evidence-poor content to review", () => {
  const result = classifyFavorite({ title: "今天聊一件事", author: "测试" });
  assert.equal(result.folder, "待确认");
});

test("draft assigns every source video exactly once", () => {
  const source = {
    source_sha256: "abc",
    favorites: [
      { aweme_id: "1", title: "GitHub 开源项目", author: "a" },
      { aweme_id: "2", title: "短视频剪辑教程", author: "b" },
    ],
  };
  const plan = buildDraftPlan(source);
  assert.equal(plan.assignments.length, 2);
  assert.equal(new Set(plan.assignments.map(item => item.aweme_id)).size, 2);
});
