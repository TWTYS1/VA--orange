export const scenarioLabels = {
  progress: '同步进展',
  request: '请求协作',
  negotiate: '拒绝协商',
  followup: '催促推进',
  confirm: '确认回应'
};

export const audienceLabels = {
  leader: '领导',
  peer: '同事',
  client: '客户',
  subordinate: '下属'
};

export const toneLabels = {
  concise: '简洁',
  polite: '礼貌',
  driving: '推进',
  formal: '正式'
};

// ─── helpers ───────────────────────────────────

function normalizeText(rawText) {
  return String(rawText || '').trim().replace(/\s+/g, ' ');
}

function hasAny(text, words) {
  return words.some((word) => text.includes(word));
}

function extractTime(text) {
  const patterns = [
    /最快[^，。；\s]*/,
    /明早/,
    /今晚/,
    /今早/,
    /今天(?:上午|下午|晚上)?[一二三四五六七八九十\d]+点(?:半)?/,
    /明天(?:上午|下午|晚上)?[一二三四五六七八九十\d]+点(?:半)?/,
    /今天(?:上午|下午|晚上)?/,
    /明天(?:上午|下午|晚上)?/,
    /本周(?:内|五|末)?/,
    /下周(?:一|二|三|四|五|内)?/,
    /延期[一二两三四五六七\d]+天/,
    /[一二两三四五六七\d]+天后/
  ];
  const match = patterns.map((pattern) => text.match(pattern)?.[0]).find(Boolean);
  return match || '需要补充明确时间';
}

function extractDeliveryTime(text) {
  const match = text.match(/(明早|今晚|今早|今天(?:上午|下午|晚上)?|明天(?:上午|下午|晚上)?)(?=[^，。；]*(?:发|提交|同步|给|交付))/);
  return match?.[1] || extractTime(text);
}

// ─── per-scenario inference ────────────────────

const scenarioDefs = {
  progress: {
    label: '同步进展',
    inferConclusion(text) {
      if (hasAny(text, ['报价'])) return '最终报价暂时无法在今天给出';
      if (hasAny(text, ['方案'])) return '方案需要延期同步';
      if (hasAny(text, ['延期', '推迟'])) return '事项需要延期处理';
      if (hasAny(text, ['数据', '跑完'])) return '数据结果尚未完成，进度需要更新';
      return '当前进展需要同步说明';
    },
    inferReason(text) {
      if (hasAny(text, ['供应商'])) return '供应商信息尚未确认';
      if (hasAny(text, ['数据', '跑完'])) return '数据结果尚未完成';
      if (hasAny(text, ['客户', '反馈'])) return '等待外部反馈或确认';
      return '当前条件尚未完全具备';
    },
    inferNextStep(text, time) {
      if (hasAny(text, ['报价']) && time.startsWith('最快')) return `预计${time}同步报价进展`;
      if (hasAny(text, ['报价'])) return `${time}前同步报价进展`;
      if (hasAny(text, ['方案'])) return `${time}前同步方案更新`;
      return `${time}前同步下一步进展`;
    },
    buildRiskEntries(text, summary, audience) {
      const risks = [];
      if (summary.time === '需要补充明确时间') {
        risks.push('缺少更新时间：建议补充预计完成或再次同步的时间点。');
      }
      if (hasAny(text, ['最快', '预计', '明天', '延期']) || summary.time !== '需要补充明确时间') {
        risks.push('时间承诺提示：请确认所提及的时间是否可以作为对外承诺。');
      }
      return risks;
    }
  },

  request: {
    label: '请求协作',
    inferConclusion(text) {
      if (hasAny(text, ['请假'])) return '需要申请临时调整安排';
      if (hasAny(text, ['帮忙', '帮', '麻烦', '协助'])) return '需要请求对方配合或协助';
      if (hasAny(text, ['资源', '支持'])) return '需要申请资源或支持';
      return '需要请求协作或调整安排';
    },
    inferReason(text) {
      if (hasAny(text, ['请假', '临时', '有事'])) return '临时个人事项影响原计划';
      if (hasAny(text, ['客户', '项目'])) return '外部事项需要协调内部资源';
      return '当前工作需要协调或配合';
    },
    inferNextStep(text, time) {
      if (hasAny(text, ['请假']) && hasAny(text, ['整理', '交接', '资料'])) return `${time}前完成交接，期间保持联系`;
      if (hasAny(text, ['请假'])) return `${time}前确认交接安排`;
      if (hasAny(text, ['帮忙', '帮', '配合'])) return `${time}前同步配合进展`;
      return `${time}前协调确认`;
    },
    buildRiskEntries(text, summary, audience) {
      const risks = [];
      if (hasAny(text, ['请假']) && !hasAny(text, ['整理', '交接', '资料', '小王', '同事', '帮忙', '帮', '跟'])) {
        risks.push('缺少交接信息：请假或调整安排时建议明确交接事项和接手人。');
      }
      if (hasAny(text, ['帮忙', '帮', '配合', '协助']) && !hasAny(text, ['麻烦', '请', '帮忙'])) {
        risks.push('请求不明确：建议补充需要对方配合的具体动作。');
      }
      return risks;
    }
  },

  negotiate: {
    label: '拒绝协商',
    inferConclusion(text) {
      if (hasAny(text, ['排期', '下周', '再排'])) return '需要重新确认排期和优先级';
      if (hasAny(text, ['做不完', '来不及'])) return '当前任务无法按原节奏完成';
      return '需要协商当前事项的安排';
    },
    inferReason(text) {
      if (hasAny(text, ['需求', '排期', '做不完'])) return '当前排期或资源不足';
      if (hasAny(text, ['临时', '紧急'])) return '临时任务影响原计划节奏';
      return '当前条件或资源限制';
    },
    inferNextStep(text, time) {
      if (hasAny(text, ['优先级', '确认'])) return '先确认优先级再重新评估排期';
      if (hasAny(text, ['排期', '下周'])) return `${time}前确认新的可交付时间`;
      return `${time}前提供替代方案或确认新时间`;
    },
    buildRiskEntries(text, summary, audience) {
      const risks = [];
      const hasAlternative = hasAny(text, ['优先级', '排期', '下周', '再排', '确认', '替代', '方案', '调整']);
      if (!hasAlternative) {
        risks.push('缺少替代方案：拒绝时建议同时给出可行路径或替代时间，避免只留下否定。');
      }
      if (hasAny(text, ['不可能', '做不了', '别催', '不关我'])) {
        risks.push('语气过硬：当前表达可能引起对方抵触，建议用事实说明限制而非直接否定。');
      }
      return risks;
    }
  },

  followup: {
    label: '催促推进',
    inferConclusion(text) {
      if (hasAny(text, ['报价'])) return '需要推动对方尽快反馈报价信息';
      if (hasAny(text, ['确认', '反馈'])) return '需要对方尽快给出明确反馈';
      if (hasAny(text, ['影响'])) return '当前阻塞可能影响后续节点';
      return '需要推动相关方给出反馈或推进';
    },
    inferReason(text) {
      if (hasAny(text, ['影响', '提报', '节点'])) return '进展阻塞可能影响后续节点';
      if (hasAny(text, ['还没', '没收', '没给'])) return '对方尚未给出所需信息或物料';
      return '当前事项缺乏推进所需的关键反馈';
    },
    inferNextStep(text, time) {
      if (time !== '需要补充明确时间') return `请于${time}前反馈，以便推进后续事项`;
      return '请尽快给出明确反馈，以免影响后续节点';
    },
    buildRiskEntries(text, summary, audience) {
      const risks = [];
      if (summary.time === '需要补充明确时间') {
        risks.push('缺少截止时间：催促时建议给出明确的期望反馈时间，对方才能判断优先级。');
      }
      if (audience === 'client' || audience === 'leader') {
        risks.push('催促对象较敏感：建议保持礼貌和事实表达，用影响说明替代施压用语。');
      }
      return risks;
    }
  },

  confirm: {
    label: '确认回应',
    inferConclusion(text) {
      if (hasAny(text, ['收到']) && hasAny(text, ['确认'])) return '已收到并确认对方信息';
      if (hasAny(text, ['收到', '好的']) && hasAny(text, ['整理', '准备', '发', '写'])) return '已确认收到并安排后续动作';
      if (hasAny(text, ['收到', '好的', 'OK', '知道了'])) return '已收到信息';
      return '需要确认收到并回应';
    },
    inferReason(text) {
      if (hasAny(text, ['客户', '方案', '确认'])) return '收到对方关于方案/事项的确认';
      if (hasAny(text, ['反馈', '通知'])) return '收到对方的通知或反馈信息';
      return '需要明确收到并安排后续';
    },
    inferNextStep(text, time) {
      const deliveryTime = extractDeliveryTime(text);
      if (hasAny(text, ['发', '提交', '同步', '交付'])) return `${deliveryTime}发送或同步相应内容`;
      if (hasAny(text, ['整理', '准备', '写'])) return `${time}前完成相应准备工作`;
      if (hasAny(text, ['收到', '好的', 'OK']) && !hasAny(text, ['整理', '准备', '发', '写', '跟进'])) {
        return '需要补充具体后续动作';
      }
      return `${time}前同步后续进展`;
    },
    buildRiskEntries(text, summary, audience) {
      const risks = [];
      const onlyAcknowledge = hasAny(text, ['收到', '好的', 'OK', '知道了', '1', '嗯']) &&
        !hasAny(text, ['整理', '准备', '发', '写', '跟进', '处理', '确认', '安排', '会']);
      if (onlyAcknowledge) {
        risks.push('缺少下一步动作：仅确认收到但没有后续安排，建议补充具体动作或跟进时间。');
      }
      if (hasAny(text, ['合同', '报价', '方案', '交付', '版本']) && !hasAny(text, ['确认', '核对', '检查'])) {
        risks.push('交付物未确认范围：回复中包含重要交付内容时，建议核对并明确交付范围。');
      }
      return risks;
    }
  }
};

// ─── audience openers ─────────────────────────

const audienceOpeners = {
  leader: '我这边同步一个进展：',
  peer: '我这边先跟你同步下：',
  client: '您好，这边向您同步一下当前进展：',
  subordinate: '这件事我先明确一下：'
};

// ─── tone endings ─────────────────────────────

const toneEndings = {
  concise: '我会尽快处理并同步结果。',
  polite: '后续我会继续跟进，并及时同步最新进展。',
  driving: '我会继续推进，也会把关键节点及时同步出来。',
  formal: '我会持续跟进该事项，并在有明确结果后第一时间同步。'
};

// ─── sentence + adapter ───────────────────────

function buildCoreSentence(summary) {
  return `${summary.conclusion}，主要原因是${summary.reason}。下一步：${summary.nextStep}。`;
}

function adaptForAudience(sentence, audience, tone) {
  const opener = audienceOpeners[audience] || audienceOpeners.peer;
  const ending = toneEndings[tone] || toneEndings.polite;

  if (audience === 'client') {
    return `${opener}${sentence}给您带来的等待还请理解，${ending}`;
  }
  if (audience === 'leader') {
    return `${opener}${sentence}${ending}`;
  }
  if (audience === 'subordinate') {
    return `${opener}${sentence}请你先按这个方向推进，有变化我会再同步。`;
  }
  return `${opener}${sentence}${ending}`;
}

// ─── basis explanation ────────────────────────

function buildBasisExplanation(scenario, audience, tone, risks) {
  const scenarioName = scenarioLabels[scenario];
  const audName = audienceLabels[audience];
  const toneName = toneLabels[tone];

  let explanation = `基于你选择的「${scenarioName}」职场意图，面向「${audName}」采用「${toneName}」表达策略。`;

  if (risks.length > 0) {
    explanation += '当前风险提示原因：输出中存在需用户确认或补充的信息点。';
  } else {
    explanation += '当前未检测到明显沟通风险。';
  }

  return explanation;
}

// ─── main export ──────────────────────────────

export function generateReply(input) {
  const rawText = normalizeText(input?.rawText);
  const scenario = input?.scenario || 'progress';
  const audience = input?.audience || 'peer';
  const tone = input?.tone || 'polite';

  if (!rawText) {
    return {
      basis: {
        scenarioLabel: scenarioLabels[scenario],
        audienceLabel: audienceLabels[audience],
        toneLabel: toneLabels[tone],
        explanation: '等待输入口述内容，生成后将在此展示理解依据。'
      },
      summary: {
        conclusion: '等待输入口述内容',
        reason: '暂无可分析信息',
        time: '暂无时间信息',
        nextStep: '输入口述内容后生成'
      },
      replies: {
        recommended: '',
        short: '',
        assertive: ''
      },
      risks: ['请先输入一段职场口述内容，再生成可发送回复。']
    };
  }

  const def = scenarioDefs[scenario] || scenarioDefs.progress;

  const time = extractTime(rawText);
  const summary = {
    conclusion: def.inferConclusion(rawText),
    reason: def.inferReason(rawText),
    time,
    nextStep: def.inferNextStep(rawText, time)
  };

  const coreSentence = buildCoreSentence(summary);
  const recommended = adaptForAudience(coreSentence, audience, tone);

  // base risks from scenario rules
  const scenarioRisks = def.buildRiskEntries(rawText, summary, audience);

  // common risks
  const commonRisks = [];
  if (!hasAny(rawText, ['下一步', '同步', '跟进', '确认', '推进']) && summary.time === '需要补充明确时间') {
    commonRisks.push('下一步不清：建议明确后续动作，避免对方只收到原因但不知道进展。');
  }
  if (hasAny(rawText, ['肯定', '一定', '保证'])) {
    commonRisks.push('承诺偏强：建议避免过度承诺，改成预计、争取、会持续推进。');
  }
  if (audience === 'client' || tone === 'formal') {
    commonRisks.push('表达对象较正式：建议保留礼貌收束，并避免使用过多内部口语。');
  }

  // deduplicate risks
  const seen = new Set();
  const risks = [];
  for (const r of [...scenarioRisks, ...commonRisks]) {
    if (!seen.has(r)) {
      seen.add(r);
      risks.push(r);
    }
  }

  const basis = {
    scenarioLabel: scenarioLabels[scenario],
    audienceLabel: audienceLabels[audience],
    toneLabel: toneLabels[tone],
    explanation: buildBasisExplanation(scenario, audience, tone, risks)
  };

  return {
    basis,
    summary,
    replies: {
      recommended,
      short: `${summary.conclusion}，原因是${summary.reason}。下一步：${summary.nextStep}。`,
      assertive: `${recommended}为避免影响整体节奏，我会优先确认关键阻塞点，并推动相关方给出明确反馈。`
    },
    risks
  };
}
