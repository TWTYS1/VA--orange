export const examples = [
  {
    scenario: 'progress',
    title: '客户报价延期',
    text: '供应商还没确认，今天报价给不了，最快明天下午',
    audience: 'client',
    tone: 'polite'
  },
  {
    scenario: 'request',
    title: '请假交接协作',
    text: '我明天下午需要请假，客户资料我上午整理好，麻烦小王帮我跟一下群消息',
    audience: 'leader',
    tone: 'formal'
  },
  {
    scenario: 'negotiate',
    title: '需求排期协商',
    text: '这个需求这周做不完，下周再排，可以先把优先级确认一下',
    audience: 'peer',
    tone: 'concise'
  },
  {
    scenario: 'followup',
    title: '催促报价反馈',
    text: '报价单还没收到，麻烦今天下午五点前确认一下，不然会影响明天提报',
    audience: 'client',
    tone: 'polite'
  },
  {
    scenario: 'confirm',
    title: '确认客户方案',
    text: '收到客户确认了新方案，我今天整理合同版本，明早发过去',
    audience: 'peer',
    tone: 'concise'
  }
];
