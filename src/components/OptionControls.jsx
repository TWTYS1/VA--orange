export function OptionControls({
  audience,
  tone,
  audienceOptions,
  toneOptions,
  onAudienceChange,
  onToneChange
}) {
  return (
    <section className="panel" aria-labelledby="options-title">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Step 2</p>
          <h2 id="options-title">选择沟通语境</h2>
        </div>
      </div>

      <div className="control-group">
        <p className="control-label">沟通对象</p>
        <div className="segmented">
          {audienceOptions.map((option) => (
            <button
              className={audience === option.value ? 'is-active' : ''}
              key={option.value}
              type="button"
              onClick={() => onAudienceChange(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="control-group">
        <p className="control-label">回复风格</p>
        <div className="segmented">
          {toneOptions.map((option) => (
            <button
              className={tone === option.value ? 'is-active' : ''}
              key={option.value}
              type="button"
              onClick={() => onToneChange(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
