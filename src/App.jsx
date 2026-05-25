import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { InputPanel } from './components/InputPanel.jsx';
import { OptionControls } from './components/OptionControls.jsx';
import { BasisPanel } from './components/BasisPanel.jsx';
import { ReplyCards } from './components/ReplyCards.jsx';
import { RiskPanel } from './components/RiskPanel.jsx';
import { SummaryPanel } from './components/SummaryPanel.jsx';
import { examples } from './data/examples.js';
import {
  audienceLabels,
  generateReply,
  scenarioLabels,
  toneLabels
} from './lib/generateReply.js';
import {
  createSpeechRecognizer,
  isSpeechRecognitionSupported
} from './lib/speechInput.js';

const scenarioOptions = Object.entries(scenarioLabels).map(([value, label]) => ({ value, label }));
const audienceOptions = Object.entries(audienceLabels).map(([value, label]) => ({ value, label }));
const toneOptions = Object.entries(toneLabels).map(([value, label]) => ({ value, label }));

const emptyResult = generateReply({
  rawText: '',
  scenario: 'progress',
  audience: 'peer',
  tone: 'polite'
});

function App() {
  const [rawText, setRawText] = useState(examples[0].text);
  const [scenario, setScenario] = useState(examples[0].scenario);
  const [audience, setAudience] = useState(examples[0].audience);
  const [tone, setTone] = useState(examples[0].tone);
  const [result, setResult] = useState(() =>
    generateReply({
      rawText: examples[0].text,
      scenario: examples[0].scenario,
      audience: examples[0].audience,
      tone: examples[0].tone
    })
  );
  const [editableReply, setEditableReply] = useState(result.replies.recommended);
  const [error, setError] = useState('');
  const [copiedKey, setCopiedKey] = useState('');
  const [exampleIndex, setExampleIndex] = useState(0);

  // Track the params that were used for the last generation
  const [generatedParams, setGeneratedParams] = useState({
    rawText: examples[0].text,
    scenario: examples[0].scenario,
    audience: examples[0].audience,
    tone: examples[0].tone
  });

  // ── speech state ──────────────────────────────
  const speechSupported = useRef(isSpeechRecognitionSupported());
  const recognizerRef = useRef(null);
  const speechSessionActiveRef = useRef(false);
  const speechFailedRef = useRef(false);
  const receivedTranscriptRef = useRef(false);
  const pendingInterimRef = useRef('');
  const [speechState, setSpeechState] = useState(
    speechSupported.current ? 'idle' : 'unsupported'
  );
  const [interimTranscript, setInterimTranscript] = useState('');
  const [speechError, setSpeechError] = useState('');

  const isSpeechBusy = speechState === 'starting' || speechState === 'listening';

  const contextDirty =
    rawText.trim() !== '' &&
    (rawText.trim() !== generatedParams.rawText.trim() ||
      scenario !== generatedParams.scenario ||
      audience !== generatedParams.audience ||
      tone !== generatedParams.tone);

  const contextLine = useMemo(
    () => `${scenarioLabels[scenario]} · ${audienceLabels[audience]} · ${toneLabels[tone]}语气`,
    [scenario, audience, tone]
  );

  // ── speech handlers ───────────────────────────
  const appendSpeechText = useCallback((text) => {
    const segment = text.trim();
    if (!segment) return;
    setRawText((prev) => {
      const trimmed = prev.trim();
      return trimmed ? `${trimmed}，${segment}` : segment;
    });
  }, []);

  const handleStartSpeech = useCallback(() => {
    if (!speechSupported.current || speechSessionActiveRef.current) return;

    speechSessionActiveRef.current = true;
    speechFailedRef.current = false;
    receivedTranscriptRef.current = false;
    pendingInterimRef.current = '';
    setSpeechError('');
    setInterimTranscript('');
    setSpeechState('starting');

    const recognizer = createSpeechRecognizer({
      onStart: () => {
        setSpeechState('listening');
      },
      onTranscript: ({ finalText, interimText }) => {
        if (finalText.trim()) {
          receivedTranscriptRef.current = true;
          appendSpeechText(finalText);
        }
        pendingInterimRef.current = interimText.trim();
        if (interimText.trim()) receivedTranscriptRef.current = true;
        setInterimTranscript(interimText);
      },
      onEnd: () => {
        recognizerRef.current = null;
        speechSessionActiveRef.current = false;

        if (speechFailedRef.current) return;

        if (pendingInterimRef.current) {
          appendSpeechText(pendingInterimRef.current);
          pendingInterimRef.current = '';
          setInterimTranscript('');
          setSpeechState('idle');
          return;
        }

        setInterimTranscript('');
        if (!receivedTranscriptRef.current) {
          setSpeechState('error');
          setSpeechError('未检测到语音内容，请确认麦克风正常并再次尝试。');
          return;
        }

        setSpeechState('idle');
      },
      onError: (err) => {
        speechFailedRef.current = true;
        setSpeechState('error');
        setSpeechError(err.message);
        setInterimTranscript('');
        pendingInterimRef.current = '';
      }
    });

    recognizerRef.current = recognizer;
    try {
      recognizer.start();
    } catch {
      speechSessionActiveRef.current = false;
      recognizerRef.current = null;
      setSpeechState('error');
      setSpeechError('无法启动语音识别，请重试或改用文本输入。');
    }
  }, [appendSpeechText]);

  const handleStopSpeech = useCallback(() => {
    if (recognizerRef.current) {
      recognizerRef.current.stop();
    }
  }, []);

  // cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognizerRef.current) {
        recognizerRef.current.dispose();
      }
      speechSessionActiveRef.current = false;
    };
  }, []);

  // ── existing handlers ─────────────────────────
  function handleGenerate() {
    if (!rawText.trim()) {
      const nextResult = generateReply({ rawText, scenario, audience, tone });
      setResult(nextResult);
      setEditableReply('');
      setError('请先输入一段职场口述内容。');
      setGeneratedParams({ rawText, scenario, audience, tone });
      return;
    }

    const nextResult = generateReply({ rawText, scenario, audience, tone });
    setResult(nextResult);
    setEditableReply(nextResult.replies.recommended);
    setError('');
    setCopiedKey('');
    setGeneratedParams({ rawText, scenario, audience, tone });
  }

  function handleUseExample() {
    const nextIndex = (exampleIndex + 1) % examples.length;
    const example = examples[nextIndex];
    const nextResult = generateReply({
      rawText: example.text,
      scenario: example.scenario,
      audience: example.audience,
      tone: example.tone
    });

    setExampleIndex(nextIndex);
    setRawText(example.text);
    setScenario(example.scenario);
    setAudience(example.audience);
    setTone(example.tone);
    setResult(nextResult);
    setEditableReply(nextResult.replies.recommended);
    setError('');
    setCopiedKey('');
    setGeneratedParams({
      rawText: example.text,
      scenario: example.scenario,
      audience: example.audience,
      tone: example.tone
    });
  }

  function handleClear() {
    setRawText('');
    setResult(emptyResult);
    setEditableReply('');
    setError('');
    setCopiedKey('');
    setGeneratedParams({ rawText: '', scenario, audience, tone });
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

  function handleParamChange(setter, value) {
    setter(value);
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
          <span>场景化生成</span>
          <span>风险提示</span>
        </div>
      </header>

      <section className="demo-banner" aria-label="当前生成语境">
        <span>当前语境</span>
        <strong>{contextLine}</strong>
      </section>

      {contextDirty ? (
        <section className="context-dirty-banner" aria-live="polite">
          语境已变化，请重新生成回复
        </section>
      ) : null}

      <div className="workspace">
        <div className="left-column">
          <InputPanel
            rawText={rawText}
            error={error}
            speechState={speechState}
            interimTranscript={interimTranscript}
            speechError={speechError}
            speechSupported={speechSupported.current}
            speechBusy={isSpeechBusy}
            onRawTextChange={setRawText}
            onUseExample={handleUseExample}
            onClear={handleClear}
            onGenerate={handleGenerate}
            onStartSpeech={handleStartSpeech}
            onStopSpeech={handleStopSpeech}
          />
          <OptionControls
            scenario={scenario}
            scenarioOptions={scenarioOptions}
            audience={audience}
            tone={tone}
            audienceOptions={audienceOptions}
            toneOptions={toneOptions}
            onScenarioChange={(value) => handleParamChange(setScenario, value)}
            onAudienceChange={(value) => handleParamChange(setAudience, value)}
            onToneChange={(value) => handleParamChange(setTone, value)}
          />
        </div>

        <div className="right-column">
          <BasisPanel basis={result.basis} />
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
