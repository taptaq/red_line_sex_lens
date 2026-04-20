import { normalizeText } from "./normalizer.js";

const minorWords = ["未成年", "18岁以下", "小学生", "初中生", "高中生", "学生情侣"];
const intimacyWords = ["两性", "性", "亲密", "自我愉悦", "身体探索", "敏感"];
const contactWords = ["微信", "vx", "二维码", "私信", "小窗", "联系"];
const conversionWords = ["加我", "主页", "获取", "完整版", "咨询", "下单", "购买", "链接"];
const processWords = ["教程", "步骤", "实操", "怎么做", "完整流程", "亲测过程"];
const bodyWords = ["敏感部位", "私密", "身体", "器官"];
const claimWords = ["最好", "最佳", "永久", "根治", "见效", "安全", "修复", "治疗"];
const scienceWords = ["科普", "教育", "边界", "同意", "沟通", "心理", "健康"];

function hasAny(text, words) {
  const normalized = normalizeText(text);
  return words.some((word) => normalized.includes(normalizeText(word)));
}

export function evaluateContextRules(post) {
  const joined = [post.title, post.body, post.coverText, post.tags, post.comments].join(" ");
  const findings = [];

  if (hasAny(joined, minorWords) && hasAny(joined, intimacyWords)) {
    findings.push({
      id: "rule-minor-intimacy",
      category: "未成年人边界",
      riskLevel: "hard_block",
      reason: "未成年人线索与敏感亲密话题同现",
      evidence: "内容同时出现未成年人身份与亲密/性相关表达"
    });
  }

  if (hasAny(joined, contactWords) && hasAny(joined, conversionWords)) {
    findings.push({
      id: "rule-private-traffic",
      category: "导流与私域",
      riskLevel: "hard_block",
      reason: "存在明显导流和站外联系组合",
      evidence: "联系方式与获取/咨询/完整版等转化语境同现"
    });
  }

  if (hasAny(joined, processWords) && hasAny(joined, intimacyWords) && hasAny(joined, bodyWords)) {
    findings.push({
      id: "rule-instructional-intimacy",
      category: "步骤化敏感内容",
      riskLevel: "manual_review",
      reason: "敏感亲密话题出现步骤化或教程化表达",
      evidence: "教学/步骤语言与亲密敏感语境同现"
    });
  }

  if (hasAny(joined, claimWords) && hasAny(joined, intimacyWords)) {
    findings.push({
      id: "rule-intimacy-claim",
      category: "绝对化与功效承诺",
      riskLevel: "manual_review",
      reason: "敏感亲密话题叠加功效或安全承诺",
      evidence: "功效承诺语言与亲密敏感语境同现"
    });
  }

  if (hasAny(joined, scienceWords) && findings.length === 0) {
    findings.push({
      id: "rule-science-context",
      category: "教育语境",
      riskLevel: "observe",
      reason: "检测到较强的科普或关系教育语境",
      evidence: "内容包含边界、同意、健康、教育等表达"
    });
  }

  return findings;
}
