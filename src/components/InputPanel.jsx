export function InputPanel({
  rawText,
  error,
  onRawTextChange,
  onUseExample,
  onClear,
  onGenerate
}) {
  return (
    <section className="panel input-panel" aria-labelledby="input-title">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Step 1</p>
          <h2 id="input-title">说出意图</h2>
        </div>
        <span className="status-pill">Mock 语音输入</span>
      </div>

      <textarea
        value={rawText}
        onChange={(event) => onRawTextChange(event.target.value)}
        placeholder="例如：供应商还没确认，今天报价给不了，最快明天下午"
        rows={8}
      />

      {error ? <p className="error-text">{error}</p> : null}

      <div className="action-row">
        <button className="primary-button" type="button" onClick={onGenerate}>
          生成职场回复
        </button>
        <button type="button" onClick={onUseExample}>
          模拟语音输入
        </button>
        <button type="button" onClick={onClear}>
          清空
        </button>
      </div>

      <p className="helper-text">
        首版不接真实 ASR，使用文本框和示例模拟口述输入，重点验证“意图到回复”的产品闭环。
      </p>
    </section>
  );
}
