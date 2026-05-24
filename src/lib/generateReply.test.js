import { describe, expect, it } from 'vitest';
import { generateReply } from './generateReply';

describe('generateReply', () => {
  it('turns a client quote delay into a polite structured reply with time risk guidance', () => {
    const result = generateReply({
      rawText: '供应商还没确认，今天报价给不了，最快明天下午',
      audience: 'client',
      tone: 'polite'
    });

    expect(result.summary.reason).toContain('供应商');
    expect(result.summary.time).toContain('明天下午');
    expect(result.replies.recommended).toContain('您');
    expect(result.replies.recommended).toContain('明天下午');
    expect(result.risks.join('')).toContain('时间');
  });

  it('turns a data delay into a formal leader update', () => {
    const result = generateReply({
      rawText: '数据没跑完，方案要延期两天',
      audience: 'leader',
      tone: 'formal'
    });

    expect(result.summary.conclusion).toContain('延期');
    expect(result.summary.reason).toContain('数据');
    expect(result.replies.recommended).toContain('方案');
    expect(result.replies.recommended).toContain('同步');
    expect(result.risks.join('')).toContain('下一步');
  });

  it('returns a clear empty state for blank input', () => {
    const result = generateReply({
      rawText: '   ',
      audience: 'peer',
      tone: 'concise'
    });

    expect(result.summary.conclusion).toBe('等待输入口述内容');
    expect(result.replies.recommended).toBe('');
    expect(result.risks[0]).toContain('先输入');
  });
});
