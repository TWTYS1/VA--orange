import { describe, expect, it } from 'vitest';
import { generateReply, scenarioLabels } from './generateReply';

describe('generateReply with scenario parameter', () => {
  // ── 1. progress + client + polite ─────────────────────
  it('progress + client + polite: generates professional reply with time commitment risk', () => {
    const result = generateReply({
      rawText: '供应商还没确认，今天报价给不了，最快明天下午',
      scenario: 'progress',
      audience: 'client',
      tone: 'polite'
    });

    expect(result.basis.scenarioLabel).toBe(scenarioLabels.progress);
    expect(result.basis.audienceLabel).toBe('客户');
    expect(result.basis.toneLabel).toBe('礼貌');
    expect(result.basis.explanation).toContain('同步进展');
    expect(result.basis.explanation).not.toContain('识别为');

    expect(result.summary.reason).toContain('供应商');
    expect(result.summary.time).toContain('明天下午');
    expect(result.replies.recommended).toContain('您');
    expect(result.replies.recommended).toContain('明天下午');
    expect(result.replies.recommended).not.toContain('最快明天下午前');

    const riskText = result.risks.join('');
    expect(riskText).toContain('时间承诺');
  });

  // ── 2. progress + leader + formal ────────────────────
  it('progress + leader + formal: generates report-style reply for delay', () => {
    const result = generateReply({
      rawText: '数据没跑完，方案要延期两天',
      scenario: 'progress',
      audience: 'leader',
      tone: 'formal'
    });

    expect(result.basis.scenarioLabel).toBe(scenarioLabels.progress);
    expect(result.summary.conclusion).toContain('延期');
    expect(result.summary.reason).toContain('数据');
    expect(result.replies.recommended).toContain('方案');
    expect(result.replies.recommended).toContain('同步');
    expect(result.risks.join('')).toContain('时间');
    expect(result.basis.explanation).toContain('正式');
  });

  // ── 3a. request: handover info present — no handover warning ─
  it('request: with handover info, does not warn about missing handover', () => {
    const result = generateReply({
      rawText: '我明天下午需要请假，客户资料我上午整理好，麻烦小王帮我跟一下群消息',
      scenario: 'request',
      audience: 'leader',
      tone: 'formal'
    });

    expect(result.basis.scenarioLabel).toBe(scenarioLabels.request);
    expect(result.summary.conclusion).toContain('调整');

    const riskText = result.risks.join('');
    expect(riskText).not.toContain('缺少交接');
  });

  // ── 3b. request: without handover — warns ────────────
  it('request: without handover info, warns about missing handover arrangement', () => {
    const result = generateReply({
      rawText: '我明天下午需要请假',
      scenario: 'request',
      audience: 'leader',
      tone: 'formal'
    });

    expect(result.summary.conclusion).toContain('调整');
    const riskText = result.risks.join('');
    expect(riskText).toContain('缺少交接');
  });

  // ── 4a. negotiate: with alternative ─────────────────
  it('negotiate: with alternative, generates negotiation expression', () => {
    const result = generateReply({
      rawText: '这个需求这周做不完，下周再排，可以先把优先级确认一下',
      scenario: 'negotiate',
      audience: 'peer',
      tone: 'concise'
    });

    expect(result.basis.scenarioLabel).toBe(scenarioLabels.negotiate);
    expect(result.summary.conclusion).toContain('排期');
    expect(result.replies.recommended).toContain('先确认优先级再重新评估排期');
    expect(result.replies.recommended).not.toContain('会在先');
  });

  // ── 4b. negotiate: no alternative — warns ────────────
  it('negotiate: without alternative, warns about missing alternative', () => {
    const result = generateReply({
      rawText: '这个需求这周做不完',
      scenario: 'negotiate',
      audience: 'peer',
      tone: 'concise'
    });

    const riskText = result.risks.join('');
    expect(riskText).toContain('替代方案');
  });

  // ── 5. followup: no deadline — warns ────────────────
  it('followup: without deadline, warns about missing feedback time', () => {
    const result = generateReply({
      rawText: '报价单还没收到，麻烦尽快确认一下',
      scenario: 'followup',
      audience: 'client',
      tone: 'polite'
    });

    expect(result.basis.scenarioLabel).toBe(scenarioLabels.followup);
    const riskText = result.risks.join('');
    expect(riskText).toContain('截止时间');
  });

  // ── 6. confirm: only "收到" — warns ─────────────────
  it('confirm: only acknowledgement without next step, warns about missing next action', () => {
    const result = generateReply({
      rawText: '收到',
      scenario: 'confirm',
      audience: 'peer',
      tone: 'concise'
    });

    expect(result.basis.scenarioLabel).toBe(scenarioLabels.confirm);
    const riskText = result.risks.join('');
    expect(riskText).toContain('下一步');
  });

  // ── 7. confirm: with next step — no warning ─────────
  it('confirm: with follow-up action, does not warn about missing next step', () => {
    const result = generateReply({
      rawText: '收到客户确认了新方案，我今天整理合同版本，明早发过去',
      scenario: 'confirm',
      audience: 'peer',
      tone: 'concise'
    });

    expect(result.summary.conclusion).toContain('已收到');
    expect(result.summary.nextStep).toContain('明早');
    expect(result.replies.recommended).toContain('明早');
    expect(result.replies.recommended).not.toContain('需要补充明确时间前');
    const riskText = result.risks.join('');
    expect(riskText).not.toContain('缺少下一步');
  });

  // ── 8. empty input ─────────────────────────────────
  it('returns a clear empty state for blank input', () => {
    const result = generateReply({
      rawText: '   ',
      scenario: 'progress',
      audience: 'peer',
      tone: 'concise'
    });

    expect(result.summary.conclusion).toBe('等待输入口述内容');
    expect(result.replies.recommended).toBe('');
    expect(result.risks[0]).toContain('先输入');
    expect(result.basis.explanation).toContain('等待输入');
  });

  // ── 9. followup + client + polite with deadline ─────
  it('followup + client + polite: with clear deadline, generates proper follow-up', () => {
    const result = generateReply({
      rawText: '报价单还没收到，麻烦今天下午五点前确认一下，不然会影响明天提报',
      scenario: 'followup',
      audience: 'client',
      tone: 'polite'
    });

    expect(result.summary.time).toContain('今天下午');
    expect(result.summary.time).toContain('五点');
    expect(result.replies.recommended).toContain('您');
    expect(result.replies.recommended).toContain('今天下午五点前');
    expect(result.replies.short.length).toBeGreaterThan(10);
  });

  // ── 10. basis is always present ────────────────────
  it('always returns basis with labels and explanation', () => {
    const scenarios = ['progress', 'request', 'negotiate', 'followup', 'confirm'];
    for (const s of scenarios) {
      const result = generateReply({
        rawText: '测试输入内容需要十个字以上才能有合理输出',
        scenario: s,
        audience: 'peer',
        tone: 'concise'
      });
      expect(result.basis.scenarioLabel).toBeTruthy();
      expect(result.basis.audienceLabel).toBeTruthy();
      expect(result.basis.toneLabel).toBeTruthy();
      expect(result.basis.explanation.length).toBeGreaterThan(10);
    }
  });

  // ── 11. defaults for missing params ────────────────
  it('uses progress/peer/polite defaults when optional params are missing', () => {
    const result = generateReply({ rawText: '一些需要同步的进展内容' });
    expect(result.basis.scenarioLabel).toBe(scenarioLabels.progress);
    expect(result.basis.audienceLabel).toBe('同事');
    expect(result.summary.conclusion.length).toBeGreaterThan(0);
  });
});
