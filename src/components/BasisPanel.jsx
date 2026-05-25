export function BasisPanel({ basis }) {
  return (
    <section className="panel basis-panel" aria-labelledby="basis-title">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Understanding</p>
          <h2 id="basis-title">生成依据</h2>
        </div>
      </div>

      <div className="basis-grid">
        <div className="basis-item">
          <span>意图场景</span>
          <strong>{basis.scenarioLabel}</strong>
        </div>
        <div className="basis-item">
          <span>沟通对象</span>
          <strong>{basis.audienceLabel}</strong>
        </div>
        <div className="basis-item">
          <span>回复风格</span>
          <strong>{basis.toneLabel}</strong>
        </div>
      </div>

      <p className="basis-explanation">{basis.explanation}</p>
    </section>
  );
}
