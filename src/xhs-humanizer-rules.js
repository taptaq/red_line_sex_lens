const systemRules = [
  "你现在执行 humanizer 技能，对中文文本做去 AI 腔润色。",
  "你的任务不是改意思，也不是重新创作，而是去掉明显的 AI 写作痕迹，让文字更像真人写的。",
  "最终风格要更贴近小红书平台分享感，自然、轻口语、像真人在认真分享自己的体验和判断。",
  "重点处理这些问题：过度拔高意义、假大空、宣传腔、过于整齐的排比、僵硬的提纲感、过量 AI 常用词、套话、空洞总结、无聊的安全说明、过分平均的句式。",
  "优先保留内容里的真实场景、亲身体验、轻微情绪和个人判断，不要润色成统一模板腔。",
  "保留作者原本的语气、分享感、口语感、节奏、人设和情绪。",
  "原始笔记就是你的风格样本，必须向它靠拢，不要把文本润色成统一模板腔。",
  "如果原文开头已经有抓人感、好奇感或真实事件感，要尽量保留这种起手方式，不要改成平铺直叙的总结开头。",
  "不要引入新的风险内容，不要恢复已经删掉的高风险表达。",
  "不要把已经写好的正文缩成短版，不要删掉大段信息量，不要把全文改成摘要。",
  "不要编造新的经历，不要虚构“有一次”“之前我还试过”之类的假设性例子；没有真实细节就沿用现有表达。",
  "请做一次 final anti-AI pass：先在心里判断哪里还像 AI 文，再把它改得更自然，但不要把这个思考过程写出来。",
  "输出必须是 JSON。"
];

const userRequirements = [
  "1. 保留内容含义和合规方向，不要把风险点写回去。",
  "2. 尽量贴近原笔记的表达习惯，让它像同一个人写的。",
  "3. 去掉明显 AI 味，包括模板化科普腔、说明书腔、假大空总结、过于工整的排比。",
  "4. 可以让句子更自然、更口语一点，但不要油腻，不要过度发挥。",
  "5. 如果某一段已经自然，就尽量少改。",
  "6. 不要明显缩短正文篇幅，尽量保留当前正文的段落数和信息量。",
  "7. 风格上要自然、幽默风趣、说人话，更像朋友聊天式分享，但不要刻意抖机灵，更不要浮夸尬聊。",
  "8. 不要写成老师讲课、编辑发稿或品牌官号的口气，要保留真人聊天感和轻松分享感。",
  "9. 优先保留真实场景和亲身体验，能写“我刚刚试了什么”就不要改成空泛结论。",
  "10. 不要写假设性例子，不要编造“有一次”“之前我遇到过”这类原文里没有的经历。",
  "11. 开头尽量保留抓人感，第一句要让人想继续看，不要改成总结汇报式开头。",
  "12. 可以使用口语化转场，比如“说实话”“回到这件事”“顺着上面的再说一句”，但要自然，不要堆砌。",
  "13. 如果涉及读者顾虑，先理解读者处境，再表达建议，避免居高临下说教。"
];

export function buildXhsHumanizerSystemRules() {
  return [...systemRules];
}

export function buildXhsHumanizerUserRequirements() {
  return [...userRequirements];
}

const benchmarkRubric = [
  {
    id: "hook_opening",
    label: "开头有抓力",
    description: "第一眼更像真实分享起手，而不是总结汇报。",
    test(text = "", input = {}) {
      const opening = String(input.title || text.split(/\n+/)[0] || "").trim();
      return /今天|最近|这两天|刚刚|前天|昨天|故事是这样的|我|？|\?|！|!|。。。/.test(opening);
    }
  },
  {
    id: "concrete_scene",
    label: "有真实场景",
    description: "正文里能看到亲身体验、动作或具体场景。",
    test(text = "") {
      return /我/.test(text) && /今天|最近|刚刚|前天|昨天|试|买|刷到|发现|用|看|问|聊/.test(text);
    }
  },
  {
    id: "no_hypothetical_example",
    label: "不编假设例子",
    description: "避免用原文里没有的假设性经历硬造人味。",
    test(text = "") {
      return !/比如有一次|有一次我|假如|想象一下|设想一下|如果你是|试想/.test(text);
    }
  },
  {
    id: "non_lecturing_tone",
    label: "没有说教腔",
    description: "避免教程汇报式连接词和老师讲课口气。",
    test(text = "") {
      return !/首先|其次|最后|总的来说|综上所述|值得注意的是|让我们来看看|接下来让我们|在当今.+时代|随着.+发展/.test(text);
    }
  }
];

export function buildXhsHumanizerBenchmarkRubric() {
  return benchmarkRubric.map((item) => ({
    id: item.id,
    label: item.label,
    description: item.description
  }));
}

export function evaluateXhsHumanizerSignals(input = {}) {
  const text = [input.title, input.body, input.coverText, ...(Array.isArray(input.tags) ? input.tags : [])]
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .join("\n");

  const checks = benchmarkRubric.map((item) => ({
    id: item.id,
    label: item.label,
    description: item.description,
    passed: item.test(text, input)
  }));
  const passedCount = checks.filter((item) => item.passed).length;

  return {
    passed: passedCount >= 3,
    passedCount,
    failedCount: checks.length - passedCount,
    checks
  };
}
