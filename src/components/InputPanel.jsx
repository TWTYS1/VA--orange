export function InputPanel({
  rawText,
  error,
  speechState,
  interimTranscript,
  speechError,
  speechSupported,
  speechBusy,
  onRawTextChange,
  onUseExample,
  onClear,
  onGenerate,
  onStartSpeech,
  onStopSpeech
}) {
  const isListening = speechState === 'listening';
  const isStarting = speechState === 'starting';
  const isUnsupported = speechState === 'unsupported';
  const hasSpeechError = speechState === 'error';

  function renderSpeechButton() {
    if (isUnsupported) {
      return (
        <button className="speech-button speech-unsupported" type="button" disabled>
          语音输入不可用
        </button>
      );
    }

    if (isListening) {
      return (
        <button
          className="speech-button speech-listening"
          type="button"
          onClick={onStopSpeech}
        >
          停止录音
        </button>
      );
    }

    if (isStarting) {
      return (
        <button className="speech-button speech-idle" type="button" disabled>
          正在连接麦克风...
        </button>
      );
    }

    return (
      <button
        className="speech-button speech-idle"
        type="button"
        onClick={onStartSpeech}
        disabled={speechBusy}
      >
        开始语音输入
      </button>
    );
  }

  return (
    <section className="panel input-panel" aria-labelledby="input-title">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Step 1</p>
          <h2 id="input-title">说出意图</h2>
        </div>
        {speechSupported ? (
          <span className="status-pill">
            {isStarting ? '正在连接...' : isListening ? '正在听写...' : '语音输入可用'}
          </span>
        ) : (
          <span className="status-pill">Mock 语音输入</span>
        )}
      </div>

      <textarea
        value={rawText}
        onChange={(event) => onRawTextChange(event.target.value)}
        placeholder={
          speechSupported
            ? '例如：供应商还没确认，今天报价给不了，最快明天下午。也可点击下方按钮开始语音输入。'
            : '例如：供应商还没确认，今天报价给不了，最快明天下午'
        }
        rows={8}
        disabled={speechBusy}
      />

      {isListening && interimTranscript ? (
        <p className="interim-transcript">
          正在识别：{interimTranscript}
        </p>
      ) : null}

      {error ? <p className="error-text">{error}</p> : null}
      {hasSpeechError ? <p className="error-text">{speechError}</p> : null}

      {isUnsupported && (
        <p className="helper-text">
          你当前浏览器不支持语音识别。推荐使用 Chrome 或 Edge 演示语音输入，或继续使用文本输入和演示样例完成体验。
        </p>
      )}

      <div className="action-row">
        <button
          className="primary-button"
          type="button"
          onClick={onGenerate}
          disabled={speechBusy}
        >
          生成职场回复
        </button>
        {renderSpeechButton()}
        <button
          type="button"
          onClick={onUseExample}
          disabled={speechBusy}
        >
          使用演示样例
        </button>
        <button
          type="button"
          onClick={onClear}
          disabled={speechBusy}
        >
          清空
        </button>
      </div>

      <p className="helper-text">
        {speechSupported
          ? '点击「开始语音输入」使用浏览器语音识别口述内容，最终转写结果会追加到文本框。录音中部分按钮不可用。当前回复生成仍使用本地 Mock 规则。'
          : '首版不接真实 ASR，使用文本框和示例模拟口述输入，重点验证"意图到回复"的产品闭环。'}
      </p>
    </section>
  );
}
