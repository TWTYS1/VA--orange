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

const audienceOpeners = {
  leader: '我这边同步一个进展：',
  peer: '我这边先跟你同步下：',
  client: '您好，这边向您同步一下当前进展：',
  subordinate: '这件事我先明确一下：'
};

const toneEndings = {
  concise: '我会尽快处理并同步结果。',
  polite: '后续我会继续跟进，并及时同步最新进展。',
  driving: '我会继续推进，也会把关键节点及时同步出来。',
  formal: '我会持续跟进该事项，并在有明确结果后第一时间同步。'
};

function normalizeText(rawText) {
  return String(rawText || '').trim().replace(/\s+/g, ' ');
}

function hasAny(text, words) {
  return words.some((word) => text.includes(word));
}

function extractTime(text) {
  const patterns = [
    /最快[^，。；\s]*/,
    /明天(?:上午|下午|晚上)?/,
    /今天(?:上午|下午|晚上)?/,
    /本周(?:内|五|末)?/,
    /下周(?:一|二|三|四|五|内)?/,
    /延期[一二两三四五六七\d]+天/,
    /[一二两三四五六七\d]+天后/
  ];
  const match = patterns.map((pattern) => text.match(pattern)?.[0]).find(Boolean);
  return match || '需要补充明确时间';
}

function inferReason(text) {
  if (hasAny(text, ['供应商'])) return '供应商信息尚未确认';
  if (hasAny(text, ['数据', '跑完'])) return '数据结果尚未完成';
  if (hasAny(text, ['需求', '排期', '做不完'])) return '当前排期或资源不足';
  if (hasAny(text, ['临时', '有事', '请假'])) return '临时事项影响原计划';
  if (hasAny(text, ['客户', '反馈', '确认'])) return '外部反馈或确认仍在进行';
  return '当前条件尚未完全具备';
}

function inferConclusion(text) {
  if (hasAny(text, ['报价'])) return '最终报价暂时无法在今天给出';
  if (hasAny(text, ['方案']) && hasAny(text, ['延期', '推迟'])) return '方案需要延期同步';
  if (hasAny(text, ['延期', '推迟'])) return '事项需要延期处理';
  if (hasAny(text, ['做不完', '来不及'])) return '当前任务无法按原节奏完成';
  if (hasAny(text, ['请假'])) return '需要申请临时调整安排';
  if (hasAny(text, ['催', '推进'])) return '需要推动对方尽快反馈';
  return '需要对当前事项进行同步说明';
}

function inferNextStep(text, time) {
  if (hasAny(text, ['报价'])) return `${time}前同步报价进展`;
  if (hasAny(text, ['方案'])) return `${time}前同步方案更新`;
  if (hasAny(text, ['需求'])) return '重新确认排期并同步可交付时间';
  if (hasAny(text, ['请假'])) return '提前交接受影响事项';
  return `${time}前同步下一步进展`;
}

function buildCoreSentence(summary) {
  return `${summary.conclusion}，主要原因是${summary.reason}，下一步会在${summary.nextStep}。`;
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

function buildRisks(text, summary, audience, tone) {
  const risks = [];

  if (summary.time === '需要补充明确时间') {
    risks.push('缺少明确时间：建议补充预计完成或再次同步的时间点。');
  } else {
    risks.push(`时间表达已识别：建议确认“${summary.time}”是否可以作为对外承诺。`);
  }

  if (!hasAny(text, ['下一步', '同步', '跟进', '确认', '推进'])) {
    risks.push('下一步不清：建议明确后续动作，避免对方只收到原因但不知道进展。');
  }

  if (hasAny(text, ['肯定', '一定', '保证'])) {
    risks.push('承诺偏强：建议避免过度承诺，改成预计、争取、会持续推进。');
  }

  if (audience === 'client' || tone === 'formal') {
    risks.push('表达对象较正式：建议保留礼貌收束，并避免使用过多内部口语。');
  }

  return risks;
}

export function generateReply(input) {
  const rawText = normalizeText(input?.rawText);
  const audience = input?.audience || 'peer';
  const tone = input?.tone || 'polite';

  if (!rawText) {
    return {
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

  const time = extractTime(rawText);
  const summary = {
    conclusion: inferConclusion(rawText),
    reason: inferReason(rawText),
    time,
    nextStep: inferNextStep(rawText, time)
  };

  const coreSentence = buildCoreSentence(summary);
  const recommended = adaptForAudience(coreSentence, audience, tone);

  return {
    summary,
    replies: {
      recommended,
      short: `${summary.conclusion}，原因是${summary.reason}。我会在${summary.nextStep}。`,
      assertive: `${recommended}为避免影响整体节奏，我会优先确认关键阻塞点，并推动相关方给出明确反馈。`
    },
    risks: buildRisks(rawText, summary, audience, tone)
  };
}
