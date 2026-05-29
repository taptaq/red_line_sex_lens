function normalizeText(value = "") {
  return String(value || "").trim();
}

function countMatches(text = "", pattern) {
  return (String(text || "").match(pattern) || []).length;
}

function clampScore(value, min = 0, max = 10) {
  return Math.max(min, Math.min(max, value));
}

export function evaluateHumanizerSignals({ title = "", body = "", coverText = "", tags = [] } = {}) {
  const combined = [title, body, coverText, ...(Array.isArray(tags) ? tags : [])].map(normalizeText).filter(Boolean).join("\n");
  const jargonHits = countMatches(combined, /(赋能|闭环|生态|抓手|底层逻辑|路径|矩阵|协同|沉淀|势能)/g);
  const listToneHits = countMatches(combined, /(首先|其次|最后|总的来说|综上所述|值得注意的是)/g);
  const bigClaimHits = countMatches(combined, /(标志着|新时代|重大意义|深远影响|从更宏观层面看)/g);
  const emptyComfortHits = countMatches(combined, /(一切都会好起来|你一定要相信|你一定要接纳自己|不用太担心|慢慢都会好起来)/g);
  const overExplainHits = countMatches(combined, /(你要明白|其实是一个很正常的问题|本质上|换句话说|也就是说)/g);
  const pseudoEmpathyHits = countMatches(combined, /(我懂你|我完全理解|希望这能帮到你|先别怕，这很正常)/g);
  const lecturingHits = countMatches(combined, /(只要学会|一定要|必须学会|正确的做法是)/g);
  const counselorToneHits = countMatches(
    combined,
    /(先看见自己的需求|练习表达边界|课题分离|把注意力放回自己身上|先处理情绪，再处理事情|关系反而会慢慢松开|真正要练习的不是.+而是)/g
  );
  const overSafetyHits = countMatches(
    combined,
    /(不能替代专业意见|不代表所有人的真实体验|仅供参考|请以专业意见为准|不能一概而论|不一定适用于每个人|具体还是要结合自己的.+判断|结合自身情况|也别轻易对号入座|每个人的情况都不一样)/g
  );
  const flattenedEmotionHits = countMatches(
    combined,
    /(理性看待|更成熟、更客观的方式理解|统一理解成正常波动|不必过度放大|更适合把它看成.+阶段性波动|最后还是要用更稳定、更成熟的心态去接住|慢慢和自己和解|未必是什么严重问题)/g
  );
  const aphorismHits = countMatches(
    combined,
    /(你以为.+其实.+|你缺的不是.+而是.+|说到底|真正重要的，从来不是.+而是.+|最后都会提醒你|安全感不是别人给的，是自己一点点长出来的)/g
  );
  const firstPersonHits = countMatches(combined, /我/g);
  const concreteActionHits = countMatches(combined, /(今天|刚刚|后来|发现|试|买|问|聊|踩坑|下单)/g);
  const paragraphCount = combined.split(/\n\s*\n/).filter(Boolean).length || 1;

  const directness = clampScore(
    10 -
      jargonHits -
      Math.floor(bigClaimHits / 2) -
      Math.min(2, overExplainHits) -
      Math.min(2, overSafetyHits) -
      Math.min(2, counselorToneHits)
  );
  const rhythm = clampScore(
    8 -
      listToneHits -
      Math.min(2, lecturingHits) -
      Math.min(1, flattenedEmotionHits) -
      Math.min(2, aphorismHits) +
      Math.min(2, paragraphCount - 1)
  );
  const trust = clampScore(
    8 -
      bigClaimHits -
      Math.min(2, emptyComfortHits) -
      Math.min(2, overSafetyHits) -
      Math.min(2, aphorismHits) +
      Math.min(2, concreteActionHits > 0 ? 1 : 0)
  );
  const authenticity = clampScore(
    6 +
      Math.min(2, firstPersonHits) +
      Math.min(2, concreteActionHits > 0 ? 1 : 0) -
      Math.min(2, jargonHits) -
      Math.min(2, pseudoEmpathyHits) -
      Math.min(3, flattenedEmotionHits) -
      Math.min(2, counselorToneHits) -
      Math.min(2, aphorismHits)
  );
  const density = clampScore(
    7 + (combined.length >= 160 ? 1 : 0) - Math.min(2, listToneHits > 2 ? 2 : 0) - Math.min(2, overSafetyHits)
  );

  const issues = [];

  if (jargonHits) {
    issues.push("AI 常用词偏多");
  }
  if (listToneHits) {
    issues.push("清单腔 / 讲课腔偏重");
  }
  if (bigClaimHits) {
    issues.push("假大空或拔高意义的表达偏多");
  }
  if (emptyComfortHits) {
    issues.push("空洞安慰腔偏重");
  }
  if (overExplainHits) {
    issues.push("过度解释 / 正确答案口吻偏重");
  }
  if (pseudoEmpathyHits) {
    issues.push("伪共情表达偏多");
  }
  if (lecturingHits) {
    issues.push("说教口吻偏重");
  }
  if (counselorToneHits) {
    issues.push("关系建议 / 咨询师腔偏重");
  }
  if (overSafetyHits) {
    issues.push("过度安全说明偏多");
  }
  if (flattenedEmotionHits) {
    issues.push("复杂感受被讲得太平，像标准答案");
  }
  if (aphorismHits) {
    issues.push("太会总结，像套出来的人味金句");
  }
  if (!firstPersonHits && !concreteActionHits) {
    issues.push("真实场景和个人感受偏弱");
  }

  const dimensions = {
    directness,
    rhythm,
    trust,
    authenticity,
    density
  };
  const total = directness + rhythm + trust + authenticity + density;

  return {
    total,
    dimensions,
    issues
  };
}
