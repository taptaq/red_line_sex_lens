import fs from "node:fs/promises";

import { paths, projectRoot } from "./config.js";

const reportTemplatePath = `${projectRoot}/skills/xiaohongshu-account-analyzer/assets/report_template.html`;
const multiReportTemplatePath = `${projectRoot}/skills/xiaohongshu-account-analyzer/assets/multi_report_template.html`;

function normalizeString(value = "") {
  return String(value || "").trim();
}

function normalizeMetric(value) {
  const number = Number(String(value ?? "").trim());
  return Number.isFinite(number) ? number : 0;
}

function formatMetric(value) {
  const number = normalizeMetric(value);
  if (number >= 10000) {
    return `${(number / 10000).toFixed(number >= 100000 ? 0 : 1)}w`;
  }
  return String(Math.round(number));
}

function formatPercent(value, digits = 0) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number.toFixed(digits) : "0";
}

function toDateLabel(value = "") {
  const timestamp = Number(value || 0);
  if (Number.isFinite(timestamp) && timestamp > 0) {
    return new Date(timestamp).toISOString().slice(0, 10);
  }
  const text = normalizeString(value);
  return text ? text.slice(0, 10) : "";
}

function getViralThreshold(account = {}) {
  const userAttribute = normalizeString(account?.userAttribute);
  if (userAttribute === "尾部kol" || userAttribute === "尾部KOL") return 5000;
  if (userAttribute === "腰部kol" || userAttribute === "腰部KOL") return 10000;
  if (userAttribute === "头部kol" || userAttribute === "头部KOL") return 20000;
  if (userAttribute === "明星") return 20000;
  if (userAttribute === "品牌" || userAttribute === "企业" || userAttribute === "品牌/企业") return 1000;
  return 1000;
}

function scoreBandLabel(value = 0, medium = 60, high = 80) {
  const score = Number(value || 0);
  if (score >= high) return "强";
  if (score >= medium) return "中";
  return "弱";
}

function buildDimensionScores(result = {}) {
  const account = result.account || {};
  const raw = account._raw || {};
  const metrics = account.metrics || {};
  const interactionRate = metrics.fans > 0 ? (metrics.interactiveCountThirty / metrics.fans) * 100 : 0;
  const collectRate = metrics.liked > 0 ? (metrics.collected / metrics.liked) * 100 : 0;
  const works = Array.isArray(account.works) ? account.works : [];
  const viralThreshold = getViralThreshold(account);
  const viralWorks = works.filter((item) => item.likedCount + item.collectedCount >= viralThreshold);
  const viralRate = works.length ? (viralWorks.length / works.length) * 100 : 0;

  const positioning = Math.min(10, 4 + (account.desc ? 2 : 0) + (account.userAttribute ? 2 : 0) + (metrics.fans >= 1000 ? 2 : 0));
  const fans = Math.min(15, 5 + (raw.topAges ? 2 : 0) + (raw.topProvinces ? 2 : 0) + (metrics.fans >= 1000 ? 2 : 0) + (collectRate >= 10 ? 4 : 2));
  const topic = Math.min(15, 5 + (works.length >= 3 ? 4 : works.length ? 2 : 0) + (metrics.noteCountThirty >= 8 ? 3 : 1) + 2);
  const cover = Math.min(10, works.length >= 3 ? 6 : 4);
  const viral = Math.min(15, 3 + (viralRate >= 30 ? 8 : viralRate >= 10 ? 5 : viralRate > 0 ? 2 : 0) + (works.length ? 2 : 0));
  const interactive = Math.min(20, 5 + (interactionRate >= 100 ? 8 : interactionRate >= 20 ? 5 : interactionRate > 0 ? 2 : 0) + (collectRate >= 10 ? 5 : 2));
  const update = Math.min(15, 5 + (metrics.noteCountThirty >= 20 ? 6 : metrics.noteCountThirty >= 8 ? 4 : metrics.noteCountThirty > 0 ? 2 : 0) + (works.length >= 3 ? 4 : 1));

  return {
    positioning,
    fans,
    topic,
    cover,
    viral,
    interactive,
    update
  };
}

function buildSimilarAccountAnalysis(similar = {}) {
  const items = [...(Array.isArray(similar.peer) ? similar.peer : []), ...(Array.isArray(similar.benchmark) ? similar.benchmark : [])].slice(0, 3);
  return items.map((item) => ({
    "账号名称": normalizeString(item.nickname || item.redId),
    "账号链接": normalizeString(item.url || (item.redId ? `https://www.xiaohongshu.com/user/profile/${item.redId}` : "")),
    "粉丝数": formatMetric(item.fans),
    "总互动": formatMetric(item.interactiveCountThirty || item.liked),
    "推荐理由": normalizeString(item.reason || "可作为同类账号参考。"),
    "发文特点": normalizeString(item.reason || "近期互动表现较好。"),
    "可学之处": normalizeString(item.reason || "可先学习它的选题与表达方式。")
  }));
}

function flatten(value = {}, path = "", target = {}) {
  Object.entries(value || {}).forEach(([key, entry]) => {
    const nextPath = path ? `${path}.${key}` : key;
    if (Array.isArray(entry)) {
      entry.forEach((item, index) => {
        if (item && typeof item === "object") {
          flatten(item, `${nextPath}[${index}]`, target);
        } else {
          target[`{{${nextPath}[${index}]}}`] = normalizeString(item);
        }
      });
      return;
    }
    if (entry && typeof entry === "object") {
      flatten(entry, nextPath, target);
      return;
    }
    target[`{{${nextPath}}}`] = normalizeString(entry);
    target[`{{${key}}}`] = normalizeString(entry);
  });
  return target;
}

export function buildXhsAccountDiagnosisReportData(result = {}, { generatedAt = new Date().toISOString() } = {}) {
  const account = result.account || {};
  const raw = account._raw || {};
  const metrics = account.metrics || {};
  const works = Array.isArray(account.works) ? account.works : [];
  const similarAccounts = buildSimilarAccountAnalysis(result.similarAccounts || {});
  const dimensions = buildDimensionScores(result);
  const totalScore = dimensions.positioning + dimensions.fans + dimensions.topic + dimensions.cover + dimensions.viral + dimensions.interactive + dimensions.update;
  const interactionRate = metrics.fans > 0 ? (metrics.interactiveCountThirty / metrics.fans) * 100 : 0;
  const collectRate = metrics.liked > 0 ? (metrics.collected / metrics.liked) * 100 : 0;
  const viralThreshold = getViralThreshold(account);
  const viralWorks = works
    .map((item) => ({ ...item, interactive: item.likedCount + item.collectedCount }))
    .filter((item) => item.interactive >= viralThreshold);
  const viralRate = works.length ? (viralWorks.length / works.length) * 100 : 0;
  const femaleRatio = Number(raw?.fansGender?.female_ratio || account?.fansGender?.female_ratio || 0) * 100;
  const maleRatio = Number(raw?.fansGender?.male_ratio || account?.fansGender?.male_ratio || 0) * 100;
  const userAttribute = normalizeString(account.userAttribute || raw.userAttribute || "素人");

  const report = {
    header: {
      "账号名": normalizeString(account.nickname),
      "账号标识": userAttribute,
      "数据获取时间": generatedAt
    },
    scores: {
      "综合评分": String(totalScore),
      "账号定位得分": String(dimensions.positioning),
      "账号定位简述原因": `${account.desc ? "简介清楚" : "简介偏弱"}，账号识别度${scoreBandLabel(dimensions.positioning, 6, 8)}`,
      "粉丝画像与需求得分": String(dimensions.fans),
      "粉丝画像与需求简述原因": `粉丝画像${raw.topAges || raw.topProvinces ? "有基础" : "较少"}，收藏率 ${formatPercent(collectRate)}%`,
      "选题体系得分": String(dimensions.topic),
      "选题体系简述原因": `近30天发文 ${metrics.noteCountThirty} 篇，选题稳定性${scoreBandLabel(dimensions.topic, 8, 12)}`,
      "封面风格得分": String(dimensions.cover),
      "封面风格简述原因": works.length ? "有样本可观察封面表达" : "样本不足，先保守评估",
      "爆文能力得分": String(dimensions.viral),
      "爆文能力简述原因": `爆文率 ${formatPercent(viralRate)}%，爆文阈值 ${viralThreshold}`,
      "互动规模得分": String(dimensions.interactive),
      "互动规模简述原因": `互动率 ${formatPercent(interactionRate)}%，收藏率 ${formatPercent(collectRate)}%`,
      "更新产能得分": String(dimensions.update),
      "更新产能简述原因": `近30天更新 ${metrics.noteCountThirty} 篇，更新节奏${scoreBandLabel(dimensions.update, 8, 12)}`
    },
    conclusion: {
      "综合诊断结论内容":
        totalScore >= 60
          ? `${account.nickname || "该账号"} 已经有稳定内容信号，当前更适合继续放大已有高互动方向，再用同阶对标修标题与封面。`
          : `${account.nickname || "该账号"} 当前更像起步阶段，问题主要集中在粉丝规模、内容样本和互动承接，还需要先补稳定内容。`,
      "可借鉴的优点": (result.diagnosis?.strengths || []).join("；"),
      "可成长的地方": (result.diagnosis?.risks || []).join("；")
    },
    positioning: {
      "TA是谁": `${account.nickname || "该账号"}是一个以${account.desc ? "个人表达" : "基础分享"}为主的${userAttribute || "账号"}`,
      "心智占位": metrics.fans >= 1000 ? "已形成初步识别度" : "还在建立基础认知",
      "核心身份": userAttribute || "素人",
      "价值观锚点": account.desc || "以持续分享和个人表达为主",
      "吸引力类型": metrics.interactiveCountThirty >= 5000 ? "内容价值 + 情绪共鸣" : "人格感 + 轻分享",
      "赛道痛点": metrics.fans < 1000 ? "粉丝规模偏小，账号还未形成稳定收录优势" : "需要把已有表达再结构化一点",
      "你的优势": (result.diagnosis?.strengths || [])[0] || "已经有基础互动沉淀",
      "可强化": (result.diagnosis?.nextActions || [])[0] || "",
      "显示可强化": dimensions.positioning < 8
    },
    fans_insight: {
      "粉丝构成": `${formatMetric(metrics.fans)}粉丝 | 女性${formatPercent(femaleRatio)}% | 男性${formatPercent(maleRatio)}% | ${raw.topAges || account.topAges || ""} | ${raw.topProvinces || account.topProvinces || ""}`,
      "核心需求反推": [
        { "画像特征": raw.topAges || "年龄分布未明确", "推断需求": "希望快速找到更贴自己处境的内容", "内容匹配度": "中" },
        { "画像特征": raw.topProvinces || "地域分布未明确", "推断需求": "偏好更真实、可代入的表达", "内容匹配度": "中" },
        { "画像特征": femaleRatio >= 60 ? "女性占比较高" : "画像还在形成", "推断需求": "需要更明确的内容收益点", "内容匹配度": "中" }
      ]
    },
    topic_system: {
      "选题方向": works.map((item) => item.title).filter(Boolean).slice(0, 3).join(" / ") || "近期选题样本不足",
      "表达风格": metrics.interactiveCountThirty >= 5000 ? "偏轻科普 + 个人表达" : "偏个人分享",
      "叙事手法": works.length >= 3 ? "标题切口 + 结果导向" : "以单点表达为主",
      "人格一致性": works.length >= 3 ? "中等偏稳定" : "样本不足，暂按中等处理"
    },
    cover_style: {
      "视觉特征": works.length ? "有统一感，但还需要更强的首屏识别" : "当前样本不足，无法稳定判断",
      "信息层级": "建议继续强化标题主信息和视觉焦点",
      "一致性": works.length >= 3 ? "中" : "低"
    },
    viral: {
      "爆文率": formatPercent(viralRate),
      "爆文数": String(viralWorks.length),
      "近7天发作品数": String(works.length),
      "爆文标准": String(viralThreshold),
      "标题规律": works.length ? "更适合直接问题切口或明确结论" : "",
      "爆文内容规律": works.length ? "更容易被互动承接的内容往往更具体" : "",
      "情绪特点": works.length ? "有情绪落点时更容易产生反馈" : "",
      "爆文列表": viralWorks.slice(0, 2).map((item) => ({
        "标题": item.title,
        "发布时间": toDateLabel(item.id || ""),
        "互动数": String(item.interactive),
        "超标准倍数": formatPercent(item.interactive / Math.max(1, viralThreshold), 1)
      })),
      "非爆文平均互动": String(
        Math.round(
          works.filter((item) => item.likedCount + item.collectedCount < viralThreshold).reduce((sum, item) => sum + item.likedCount + item.collectedCount, 0) /
            Math.max(1, works.filter((item) => item.likedCount + item.collectedCount < viralThreshold).length)
        )
      ),
      "爆文放大倍数": viralWorks.length ? formatPercent((viralWorks[0].interactive || 0) / Math.max(1, metrics.interactiveCountThirty / Math.max(1, works.length)), 1) : "0",
      "爆文放大倍数判断": viralWorks.length ? "说明单条内容有明显放大潜力" : "当前还没看到明显爆文放大"
    },
    interactive_scale: {
      "近30天互动量": String(metrics.interactiveCountThirty),
      "总收藏数": String(metrics.collected),
      "官方等级": normalizeString(account.level || raw.level || ""),
      "互动率": formatPercent(interactionRate),
      "收藏率": formatPercent(collectRate),
      "互动结构_点赞占比": formatPercent(metrics.liked > 0 ? (metrics.liked / Math.max(1, metrics.liked + metrics.collected)) * 100 : 0),
      "互动结构_收藏占比": formatPercent(metrics.collected > 0 ? (metrics.collected / Math.max(1, metrics.liked + metrics.collected)) * 100 : 0),
      "类型判断": collectRate >= 10 ? "实用价值型" : "情绪共鸣型",
      "水平衡量_互动数等级": interactionRate >= 20 ? "优秀" : interactionRate >= 5 ? "良好" : "待提升",
      "水平衡量_互动数中位数参考": String(raw?.accountAvgList?.find?.((item) => item?.name?.includes("近30天作品互动量"))?.value || ""),
      "水平衡量_互动数优秀值参考": String(raw?.accountExcellentList?.find?.((item) => item?.name?.includes("近30天作品互动量"))?.value || ""),
      "水平衡量_收藏数等级": collectRate >= 15 ? "优秀" : collectRate >= 8 ? "良好" : "待提升",
      "水平衡量_收藏数中位数参考": String(raw?.accountAvgList?.find?.((item) => item?.name?.includes("总收藏数"))?.value || ""),
      "水平衡量_收藏数优秀值参考": String(raw?.accountExcellentList?.find?.((item) => item?.name?.includes("总收藏数"))?.value || "")
    },
    update_rhythm: {
      "近30天发作品数": String(metrics.noteCountThirty),
      "周更频率": formatPercent(metrics.noteCountThirty / 4, 1),
      "频率分析": metrics.noteCountThirty >= 20 ? "更新很密，产能充足" : metrics.noteCountThirty >= 8 ? "更新稳定" : "更新偏少，需要提高稳定性",
      "水平衡量_周更频率等级": metrics.noteCountThirty / 4 >= 5 ? "优秀" : metrics.noteCountThirty / 4 >= 2 ? "良好" : "待提升",
      "水平衡量_周更频率中位数参考": String(raw?.accountAvgList?.find?.((item) => item?.name?.includes("近30天发作品数"))?.value ? Number(raw.accountAvgList.find((item) => item.name.includes("近30天发作品数")).value) / 4 : ""),
      "水平衡量_周更频率优秀值参考": String(raw?.accountExcellentList?.find?.((item) => item?.name?.includes("近30天发作品数"))?.value ? Number(raw.accountExcellentList.find((item) => item.name.includes("近30天发作品数")).value) / 4 : "")
    },
    action: {
      "问题归因1": (result.diagnosis?.risks || [])[0] || "当前账号还缺稳定内容承接",
      "问题归因2": (result.diagnosis?.risks || [])[1] || "需要继续观察标题和互动承接",
      "具体动作1": (result.diagnosis?.nextActions || [])[0] || "先继续放大近期互动更高的内容方向。",
      "具体动作2": (result.diagnosis?.nextActions || [])[1] || "从同阶对标里挑 1-2 个账号拆标题与更新节奏。",
      "具体动作3": (result.diagnosis?.nextActions || [])[2] || "下一轮重点看互动率和收藏率是否一起上升。",
      "反常识发现1": metrics.interactiveCountThirty > metrics.fans ? "当前账号互动量并不差，问题未必只在粉丝数。" : "粉丝数小并不代表没有内容潜力，先看内容承接。",
      "反常识发现2": collectRate >= 10 ? "收藏率不错时，往往先该强化结构，而不是盲目追热点。" : "如果收藏率偏低，先补价值感比追爆文更重要。"
    },
    similar_accounts: similarAccounts
  };

  return report;
}

export async function saveXhsAccountDiagnosisReportArtifacts(result = {}, { generatedAt = new Date().toISOString() } = {}) {
  const reportData = buildXhsAccountDiagnosisReportData(result, { generatedAt });
  const template = await fs.readFile(reportTemplatePath, "utf8");
  const replacements = flatten(reportData);
  replacements["{{similar_accounts_cards}}"] = (reportData.similar_accounts || [])
    .map(
      (item) => `
        <div class="similar-card-row" style="padding:12px 0;border-bottom:1px solid #f0f0f0;">
          <div style="margin-bottom:6px;"><strong><a href="${item["账号链接"] || "#"}" target="_blank">${item["账号名称"] || ""}</a></strong> | 粉丝：${item["粉丝数"] || ""} | 总互动：${item["总互动"] || ""}</div>
          <div style="font-size:13px;color:#666;margin-bottom:4px;"><strong>推荐理由：</strong>${item["推荐理由"] || ""}</div>
          <div style="font-size:13px;color:#666;margin-bottom:4px;"><strong>发文特点：</strong>${item["发文特点"] || ""}</div>
          <div style="font-size:13px;color:#666;"><strong>可学之处：</strong>${item["可学之处"] || ""}</div>
        </div>
      `
    )
    .join("");

  let html = template;
  for (const [token, value] of Object.entries(replacements)) {
    html = html.split(token).join(normalizeString(value));
  }
  html = html.replace(/<!-- SECTION_CAN_ENHANCE_START -->[\s\S]*?<!-- SECTION_CAN_ENHANCE_END -->/g, reportData.positioning["显示可强化"] ? (html.match(/<!-- SECTION_CAN_ENHANCE_START -->[\s\S]*?<!-- SECTION_CAN_ENHANCE_END -->/g)?.[0] || "").replace(/<!-- SECTION_CAN_ENHANCE_START -->|<!-- SECTION_CAN_ENHANCE_END -->/g, "") : "");
  if (!Number(reportData.viral["爆文数"] || 0)) {
    html = html.replace(/<!-- SECTION_VIRAL_START -->[\s\S]*?<!-- SECTION_VIRAL_END -->/g, "");
  } else {
    html = html.replace(/<!-- SECTION_VIRAL_START -->|<!-- SECTION_VIRAL_END -->/g, "");
  }
  html = html.replace(/<!-- SIMILAR_START -->|<!-- SIMILAR_END -->/g, "");
  html = html.replace(/\{\{[^}]+\}\}/g, "");

  await fs.writeFile(paths.xhsAccountDiagnosisReportData, `${JSON.stringify(reportData, null, 2)}\n`, "utf8");
  await fs.writeFile(paths.xhsAccountDiagnosisReportHtml, html, "utf8");

  return {
    reportData,
    htmlPath: paths.xhsAccountDiagnosisReportHtml,
    reportDataPath: paths.xhsAccountDiagnosisReportData
  };
}

export function buildXhsAccountDiagnosisComparison(accounts = []) {
  const items = Array.isArray(accounts) ? accounts : [];
  const sorted = [...items].sort((left, right) => Number(right?.diagnosis?.score || 0) - Number(left?.diagnosis?.score || 0));
  return {
    核心差异: sorted.map((item) => ({
      账号名: normalizeString(item?.account?.nickname || item?.account?.redId),
      内容:
        Number(item?.diagnosis?.score || 0) >= 70
          ? `${normalizeString(item?.account?.nickname || "该账号")} 当前整体更稳，适合继续放大已有优势。`
          : `${normalizeString(item?.account?.nickname || "该账号")} 还在补稳定性，优先补节奏和互动承接。`
    })),
    共同问题: ["都还可以继续强化标题、封面和稳定更新的协同。"],
    发展建议: sorted.map((item) => ({
      账号名: normalizeString(item?.account?.nickname || item?.account?.redId),
      内容: (Array.isArray(item?.diagnosis?.nextActions) ? item.diagnosis.nextActions[0] : "") || "先从最近更有效的内容角度继续放大。"
    }))
  };
}

export function buildXhsMultiAccountDiagnosisReportData(results = [], { generatedAt = new Date().toISOString(), comparison = null } = {}) {
  const accounts = (Array.isArray(results) ? results : []).map((item) => buildXhsAccountDiagnosisReportData(item, { generatedAt }));
  return {
    header: {
      数据获取时间: generatedAt
    },
    accounts,
    comparison: comparison || buildXhsAccountDiagnosisComparison(results)
  };
}

export async function saveXhsMultiAccountDiagnosisReportArtifacts(results = [], { generatedAt = new Date().toISOString(), comparison = null } = {}) {
  const reportData = buildXhsMultiAccountDiagnosisReportData(results, { generatedAt, comparison });
  const template = await fs.readFile(multiReportTemplatePath, "utf8");
  let html = template;
  html = html.replaceAll("{{账号数量}}", String(reportData.accounts.length));
  html = html.replaceAll("{{数据获取时间}}", generatedAt);
  html = html.replaceAll("{{对比表头}}", reportData.accounts.map((item) => `<th>${normalizeString(item?.header?.账号名)}</th>`).join(""));
  html = html.replaceAll(
    "{{对比表格行}}",
    [
      ["综合评分", (item) => item?.scores?.综合评分 || ""],
      ["近30天互动量", (item) => item?.interactive_scale?.近30天互动量 || ""],
      ["周更频率", (item) => item?.update_rhythm?.周更频率 || ""],
      ["爆文率", (item) => item?.viral?.爆文率 || ""]
    ]
      .map(
        ([label, getter]) =>
          `<tr><td>${label}</td>${reportData.accounts.map((item) => `<td>${normalizeString(getter(item))}</td>`).join("")}</tr>`
      )
      .join("")
  );
  html = html.replaceAll(
    "{{对比总结_核心差异}}",
    `<div class="summary-module summary-diff"><div class="module-title"><span class="icon">⚡</span> 核心差异</div>${(reportData.comparison?.核心差异 || [])
      .map((item) => `<div><strong>${normalizeString(item?.账号名)}</strong><p>${normalizeString(item?.内容)}</p></div>`)
      .join("")}</div>`
  );
  html = html.replaceAll(
    "{{对比总结_共同问题}}",
    `<div class="summary-module summary-common"><div class="module-title"><span class="icon">🔗</span> 共同问题</div><ul>${(reportData.comparison?.共同问题 || [])
      .map((item) => `<li>${normalizeString(item)}</li>`)
      .join("")}</ul></div>`
  );
  html = html.replaceAll(
    "{{对比总结_发展建议}}",
    `<div class="summary-module summary-advice"><div class="module-title"><span class="icon">🚀</span> 发展建议</div>${(reportData.comparison?.发展建议 || [])
      .map((item) => `<div><strong>${normalizeString(item?.账号名)}</strong><p>${normalizeString(item?.内容)}</p></div>`)
      .join("")}</div>`
  );
  html = html.replaceAll(
    "{{各账号详情}}",
    reportData.accounts
      .map(
        (item) => `
          <div class="account-detail">
            <div class="account-detail-header">
              <div class="name">${normalizeString(item?.header?.账号名)}</div>
              <div class="score">综合分 ${normalizeString(item?.scores?.综合评分)}</div>
            </div>
            <div class="account-detail-body">
              <div class="info-row"><span class="label">诊断结论</span><span class="value">${normalizeString(item?.conclusion?.综合诊断结论内容)}</span></div>
              <div class="info-row"><span class="label">问题</span><span class="value">${normalizeString(item?.action?.问题归因1)}</span></div>
            </div>
          </div>
        `
      )
      .join("")
  );
  html = html.replace(/\{\{[^}]+\}\}/g, "");

  await fs.writeFile(paths.xhsAccountDiagnosisReportData, `${JSON.stringify(reportData, null, 2)}\n`, "utf8");
  await fs.writeFile(paths.xhsAccountDiagnosisReportHtml, html, "utf8");

  return {
    reportData,
    htmlPath: paths.xhsAccountDiagnosisReportHtml,
    reportDataPath: paths.xhsAccountDiagnosisReportData
  };
}
