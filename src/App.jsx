import { useMemo, useState } from 'react';
import { InputPanel } from './components/InputPanel.jsx';
import { OptionControls } from './components/OptionControls.jsx';
import { ReplyCards } from './components/ReplyCards.jsx';
import { RiskPanel } from './components/RiskPanel.jsx';
import { SummaryPanel } from './components/SummaryPanel.jsx';
import { examples } from './data/examples.js';
import { audienceLabels, generateReply, toneLabels } from './lib/generateReply.js';

const audienceOptions = Object.entries(audienceLabels).map(([value, label]) => ({ value, label }));
const toneOptions = Object.entries(toneLabels).map(([value, label]) => ({ value, label }));

const emptyResult = generateReply({ rawText: '', audience: 'peer', tone: 'polite' });

function App() {
  const [rawText, setRawText] = useState(examples[0].text);
  const [audience, setAudience] = useState(examples[0].audience);
  const [tone, setTone] = useState(examples[0].tone);
  const [result, setResult] = useState(() =>
    generateReply({
      rawText: examples[0].text,
      audience: examples[0].audience,
      tone: examples[0].tone
    })
  );
  const [editableReply, setEditableReply] = useState(result.replies.recommended);
  const [error, setError] = useState('');
  const [copiedKey, setCopiedKey] = useState('');
  const [exampleIndex, setExampleIndex] = useState(0);

  const contextLine = useMemo(
    () => `${audienceLabels[audience]} · ${toneLabels[tone]}语气`,
    [audience, tone]
  );

  function handleGenerate() {
    if (!rawText.trim()) {
      const nextResult = generateReply({ rawText, audience, tone });
      setResult(nextResult);
      setEditableReply('');
      setError('请先输入一段职场口述内容。');
      return;
    }

    const nextResult = generateReply({ rawText, audience, tone });
    setResult(nextResult);
    setEditableReply(nextResult.replies.recommended);
    setError('');
    setCopiedKey('');
  }

  function handleUseExample() {
    const nextIndex = (exampleIndex + 1) % examples.length;
    const example = examples[nextIndex];
    const nextResult = generateReply({
      rawText: example.text,
      audience: example.audience,
      tone: example.tone
    });

    setExampleIndex(nextIndex);
    setRawText(example.text);
    setAudience(example.audience);
    setTone(example.tone);
    setResult(nextResult);
    setEditableReply(nextResult.replies.recommended);
    setError('');
    setCopiedKey('');
  }

  function handleClear() {
    setRawText('');
    setResult(emptyResult);
    setEditableReply('');
    setError('');
    setCopiedKey('');
  }

  async function handleCopy(text, key) {
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
    } catch {
      setCopiedKey('');
    }
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">VoiceFlow MVP</p>
          <h1>职场语音意图输入助手</h1>
          <p>
            不是把声音机械转成文字，而是把口述意图整理成可发送的职场回复。
            当前版本使用 Mock 规则验证产品闭环。
          </p>
        </div>
        <div className="metric-strip" aria-label="产品定位指标">
          <span>意图输入</span>
          <span>对象感回复</span>
          <span>风险提示</span>
        </div>
      </header>

      <section className="demo-banner" aria-label="当前生成语境">
        <span>当前语境</span>
        <strong>{contextLine}</strong>
      </section>

      <div className="workspace">
        <div className="left-column">
          <InputPanel
            rawText={rawText}
            error={error}
            onRawTextChange={setRawText}
            onUseExample={handleUseExample}
            onClear={handleClear}
            onGenerate={handleGenerate}
          />
          <OptionControls
            audience={audience}
            tone={tone}
            audienceOptions={audienceOptions}
            toneOptions={toneOptions}
            onAudienceChange={setAudience}
            onToneChange={setTone}
          />
        </div>

        <div className="right-column">
          <SummaryPanel summary={result.summary} />
          <ReplyCards
            replies={result.replies}
            editableReply={editableReply}
            copiedKey={copiedKey}
            onEditableReplyChange={setEditableReply}
            onCopy={handleCopy}
          />
          <RiskPanel risks={result.risks} />
        </div>
      </div>
    </main>
  );
}

export default App;
