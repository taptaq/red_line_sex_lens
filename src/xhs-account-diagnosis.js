function normalizeString(value = "") {
  return String(value || "").trim();
}

function normalizeMetric(value) {
  const number = Number(String(value ?? "").trim());
  return Number.isFinite(number) && number >= 0 ? number : 0;
}

function createXhsAccountNotFoundError(message = "没查到这个账号的数据。请确认小红书号是否正确，或稍后再试。") {
  const error = new Error(message);
  error.code = "XHS_ACCOUNT_NOT_FOUND";
  error.statusCode = 404;
  return error;
}

function formatMetric(value) {
  const number = normalizeMetric(value);

  if (number >= 10000) {
    return `${(number / 10000).toFixed(number >= 100000 ? 0 : 1)}w`;
  }

  return String(Math.round(number));
}

function summarizeStrengths(account = {}) {
  const strengths = [];
  const metrics = account.metrics || {};

  if (metrics.interactiveCountThirty >= 5000) {
    strengths.push("近30天互动规模稳定");
  }
  if (metrics.noteCountThirty >= 8) {
    strengths.push("近30天更新频率不错");
  }
  if (metrics.collected > 0 && metrics.liked > 0 && metrics.collected / metrics.liked >= 0.1) {
    strengths.push("收藏意愿不弱，内容有留存价值");
  }

  return strengths.length ? strengths : ["账号基础数据已形成可分析样本"];
}

function summarizeRisks(account = {}) {
  const risks = [];
  const metrics = account.metrics || {};

  if (metrics.noteCountThirty <= 2) {
    risks.push("近30天更新偏少，样本还不够稳定");
  }
  if (metrics.interactiveCountThirty > 0 && metrics.fans > 0 && metrics.interactiveCountThirty / metrics.fans < 0.1) {
    risks.push("近30天互动和粉丝规模相比还不算突出");
  }
  if (!risks.length) {
    risks.push("还需要结合封面和选题进一步看差异化");
  }

  return risks;
}

function summarizeNextActions(account = {}, similar = {}) {
  const actions = ["先放大最近互动更好的内容角度"];

  if ((similar.peer || []).length) {
    actions.push("补一个同阶对标观察位，拆他们最近30天的重复选题");
  }
  if ((similar.benchmark || []).length) {
    actions.push("从高阶标杆里只挑一个动作学，不要一次抄太多");
  }

  return actions;
}

function normalizeWork(item = {}) {
  return {
    id: normalizeString(item.id),
    title: normalizeString(item.title),
    likedCount: normalizeMetric(item.likedCount),
    collectedCount: normalizeMetric(item.collectedCount),
    workUrl: normalizeString(item.workUrl)
  };
}

function normalizeSimilarAccount(item = {}) {
  const works = Array.isArray(item.works) ? item.works : [];
  const noteCountSeven = normalizeMetric(item.noteCountSeven);
  const interactiveCountSeven = normalizeMetric(item.interactiveCountSeven);
  const fans = normalizeMetric(item.fans || item.followerCount || item.fansCount);
  const liked = normalizeMetric(item.liked || item.totalLikeCount);
  const collected = normalizeMetric(item.collected);
  const totalInteractive = liked + collected;
  const contentText = works
    .map((work) => `${normalizeString(work?.title)} ${normalizeString(work?.desc)}`.trim())
    .filter(Boolean)
    .join(" ");
  const reasons = [];

  if (fans >= 100000) {
    reasons.push(`粉丝 ${formatMetric(fans)}，账号已比较成熟`);
  } else if (fans >= 10000) {
    reasons.push(`粉丝 ${formatMetric(fans)}，已经有稳定基础`);
  } else if (fans > 0) {
    reasons.push(`粉丝 ${formatMetric(fans)}，还在成长期`);
  }

  if (noteCountSeven >= 4) {
    reasons.push("近7天更新比较稳定");
  } else if (noteCountSeven >= 1) {
    reasons.push("近期还有持续更新");
  }

  if (interactiveCountSeven >= 1000) {
    reasons.push(`近7天互动 ${formatMetric(interactiveCountSeven)}，活跃度不错`);
  } else if (totalInteractive >= 10000) {
    reasons.push(`累计互动 ${formatMetric(totalInteractive)}，内容反馈不弱`);
  }

  if (/测评|评测/.test(contentText)) {
    reasons.push("内容方向偏测评，适合拆解表达方法");
  } else if (/教程|干货|攻略/.test(contentText)) {
    reasons.push("内容里有教程感，适合看结构");
  } else if (/平价|学生党|便宜/.test(contentText)) {
    reasons.push("更偏平价推荐，容易承接种草");
  }

  return {
    redId: normalizeString(item.redId || item.accountId || item.userId),
    nickname: normalizeString(item.nickname || item.accountName || item.name),
    fans,
    interactiveCountThirty: normalizeMetric(item.interactiveCountThirty),
    liked,
    reason: reasons.join("，") || "可以先从它的选题和互动表现入手观察。"
  };
}

function normalizeAccount(raw = {}) {
  return {
    redId: normalizeString(raw.redId),
    nickname: normalizeString(raw.nickname),
    desc: normalizeString(raw.desc),
    avatar: normalizeString(raw.avatar),
    userAttribute: normalizeString(raw.userAttribute),
    level: normalizeString(raw.level),
    topAges: normalizeString(raw.topAges),
    topProvinces: normalizeString(raw.topProvinces),
    url: normalizeString(raw.url),
    fansGender:
      raw?.fansGender && typeof raw.fansGender === "object"
        ? {
            male_ratio: Number(raw.fansGender.male_ratio || 0) || 0,
            female_ratio: Number(raw.fansGender.female_ratio || 0) || 0
          }
        : { male_ratio: 0, female_ratio: 0 },
    metrics: {
      fans: normalizeMetric(raw.fans),
      liked: normalizeMetric(raw.liked),
      collected: normalizeMetric(raw.collected),
      totalWork: normalizeMetric(raw.totalWork),
      noteCountThirty: normalizeMetric(raw.noteCountThirty),
      interactiveCountThirty: normalizeMetric(raw.interactiveCountThirty),
      recentIndex: normalizeMetric(raw.recentIndex)
    },
    works: (Array.isArray(raw.works) ? raw.works : []).map(normalizeWork).filter((item) => item.title || item.id),
    _raw: raw && typeof raw === "object" ? structuredClone(raw) : {}
  };
}

function buildDiagnosis(account = {}, similarAccounts = {}) {
  const metrics = account.metrics || {};
  const collectRate = metrics.liked > 0 ? Math.round((metrics.collected / metrics.liked) * 100) : 0;
  const score = Math.max(
    1,
    Math.min(
      100,
      35 +
        Math.min(20, Math.floor(metrics.fans / 2000)) +
        Math.min(20, Math.floor(metrics.interactiveCountThirty / 1500)) +
        Math.min(10, metrics.noteCountThirty)
    )
  );
  const summary = [
    account.nickname ? `${account.nickname} 当前已经有比较完整的账号信号。` : "当前账号已经有比较完整的账号信号。",
    metrics.noteCountThirty ? `近30天发了 ${metrics.noteCountThirty} 篇内容，` : "",
    metrics.interactiveCountThirty ? `近30天互动约 ${formatMetric(metrics.interactiveCountThirty)}，` : "",
    collectRate ? `收藏率大约 ${collectRate}% 。` : "",
    (similarAccounts.peer || []).length ? "同阶对标也已经补齐，适合直接开始看差距。" : "当前还可以继续补对标样本。"
  ]
    .join("")
    .trim();

  return {
    score,
    summary,
    strengths: summarizeStrengths(account),
    risks: summarizeRisks(account),
    nextActions: summarizeNextActions(account, similarAccounts)
  };
}

async function queryRedfoxAccount(redId = "") {
  const apiKey = normalizeString(process.env.REDFOX_API_KEY);

  if (!apiKey) {
    throw new Error("缺少 REDFOX_API_KEY，暂时无法查询账号诊断。");
  }

  let response;

  try {
    // Primary account lookup: this matches the analyzer skill's api_guide.md
    // (`POST /story/api/xhsUser/query` with `userIds`).
    response = await fetch("https://redfox.hk/story/api/xhsUser/query", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey
      },
      body: JSON.stringify({
        userIds: [redId],
        source: "red-line-sex-lens"
      })
    });
  } catch (error) {
    throw new Error(`账号查询网络异常：${error?.message || "无法连接到 Redfox 接口"}`);
  }

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(`账号查询失败（${response.status}）${message ? `：${message}` : ""}`);
  }

  return response.json();
}

async function queryRedfoxAccountDetail(redId = "") {
  const apiKey = normalizeString(process.env.REDFOX_API_KEY);

  if (!apiKey) {
    throw new Error("缺少 REDFOX_API_KEY，暂时无法查询账号诊断。");
  }

  let response;

  try {
    // Secondary fallback: this follows the public Redfox site naming
    // (`POST /story/api/xhsUser/queryAccountDetail`), but can return 500
    // for accounts where `query` still works.
    response = await fetch("https://redfox.hk/story/api/xhsUser/queryAccountDetail", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey
      },
      body: JSON.stringify({
        userIds: [redId],
        source: "red-line-sex-lens"
      })
    });
  } catch (error) {
    throw new Error(`账号查询网络异常：${error?.message || "无法连接到 Redfox 接口"}`);
  }

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(`账号查询失败（${response.status}）${message ? `：${message}` : ""}`);
  }

  return response.json();
}

async function queryRedfoxSimilar(redId = "") {
  const apiKey = normalizeString(process.env.REDFOX_API_KEY);

  if (!apiKey) {
    throw new Error("缺少 REDFOX_API_KEY，暂时无法查询对标账号。");
  }

  let response;

  try {
    // Similar-account lookup comes from the separate xiaohongshu-similar-account
    // skill contract, not from analyzer/api_guide.md.
    response = await fetch("https://redfox.hk/story/api/xhsUser/querySimilarAccounts", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey
      },
      body: JSON.stringify({
        redId,
        source: "red-line-sex-lens"
      })
    });
  } catch (error) {
    throw new Error(`对标账号查询网络异常：${error?.message || "无法连接到 Redfox 接口"}`);
  }

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(`对标账号查询失败（${response.status}）${message ? `：${message}` : ""}`);
  }

  return response.json();
}

export async function requestRedfoxSyncNotes(redId = "", nickname = "") {
  const apiKey = normalizeString(process.env.REDFOX_API_KEY);

  if (!apiKey) {
    throw new Error("缺少 REDFOX_API_KEY，暂时无法发起补采。");
  }

  let response;

  try {
    response = await fetch("https://redfox.hk/story/api/xhsUser/syncUserNotes", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey
      },
      body: JSON.stringify({
        redId,
        source: "red-line-sex-lens"
      })
    });
  } catch (error) {
    throw new Error(`补采请求网络异常：${error?.message || "无法连接到 Redfox 接口"}`);
  }

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(`补采请求失败（${response.status}）${message ? `：${message}` : ""}`);
  }

  let payload = {};
  try {
    payload = await response.json();
  } catch {
    payload = {};
  }

  return {
    ok: true,
    redId: normalizeString(redId),
    nickname: normalizeString(nickname),
    payload
  };
}

function pickFirstAccount(payload = {}) {
  const items = Array.isArray(payload?.items)
    ? payload.items
    : Array.isArray(payload?.data)
      ? payload.data
      : Array.isArray(payload?.accounts)
        ? payload.accounts
        : [];

  return items[0] || payload?.account || payload?.data?.[0] || {};
}

function normalizeSimilarGroups(payload = {}) {
  const peer = Array.isArray(payload?.peerAccounts)
    ? payload.peerAccounts
    : Array.isArray(payload?.sameLevelAccounts)
      ? payload.sameLevelAccounts
      : Array.isArray(payload?.directAccounts)
        ? payload.directAccounts
        : [];
  const benchmark = Array.isArray(payload?.benchmarkAccounts)
    ? payload.benchmarkAccounts
    : Array.isArray(payload?.highLevelAccounts)
      ? payload.highLevelAccounts
    : Array.isArray(payload?.higherLevelAccounts)
      ? payload.higherLevelAccounts
      : Array.isArray(payload?.targetAccounts)
        ? payload.targetAccounts
        : [];

  return {
    peer: peer.map(normalizeSimilarAccount).filter((item) => item.redId || item.nickname),
    benchmark: benchmark.map(normalizeSimilarAccount).filter((item) => item.redId || item.nickname)
  };
}

export async function summarizeXhsAccountDiagnosis({
  redId = "",
  queryAccount = async (normalizedId) => {
    try {
      // Prefer the analyzer skill's documented query endpoint first.
      return await queryRedfoxAccount(normalizedId);
    } catch (primaryError) {
      try {
        // Only fall back to the public-site account-detail endpoint when needed.
        return await queryRedfoxAccountDetail(normalizedId);
      } catch (fallbackError) {
        throw new Error(
          [
            `主查询接口失败：${primaryError?.message || "未知错误"}`,
            `详情接口失败：${fallbackError?.message || "未知错误"}`
          ].join("；")
        );
      }
    }
  },
  querySimilar = queryRedfoxSimilar
} = {}) {
  const normalizedId = normalizeString(redId);

  if (!normalizedId) {
    throw new Error("请先填写小红书号。");
  }

  const accountPayload = await queryAccount(normalizedId);
  const account = normalizeAccount(pickFirstAccount(accountPayload));
  let similarAccounts = { peer: [], benchmark: [] };

  try {
    similarAccounts = normalizeSimilarGroups(await querySimilar(normalizedId));
  } catch {
    similarAccounts = normalizeSimilarGroups({
      peerAccounts: Array.isArray(pickFirstAccount(accountPayload)?.similarAccounts) ? pickFirstAccount(accountPayload).similarAccounts : [],
      benchmarkAccounts: []
    });
  }

  if (!account.redId && !account.nickname) {
    throw createXhsAccountNotFoundError();
  }

  return {
    account,
    diagnosis: buildDiagnosis(account, similarAccounts),
    similarAccounts
  };
}
