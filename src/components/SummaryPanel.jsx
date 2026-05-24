const summaryLabels = {
  conclusion: '结论',
  reason: '原因',
  time: '时间',
  nextStep: '下一步'
};

export function SummaryPanel({ summary }) {
  return (
    <section className="panel" aria-labelledby="summary-title">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Step 3</p>
          <h2 id="summary-title">结构化理解</h2>
        </div>
      </div>

      <div className="summary-grid">
        {Object.entries(summaryLabels).map(([key, label]) => (
          <div className="summary-item" key={key}>
            <span>{label}</span>
            <strong>{summary[key]}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}
