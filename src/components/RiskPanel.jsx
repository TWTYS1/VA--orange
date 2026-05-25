export function RiskPanel({ risks }) {
  return (
    <section className="panel risk-panel" aria-labelledby="risk-title">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Review</p>
          <h2 id="risk-title">沟通风险提示</h2>
        </div>
      </div>

      <ul>
        {risks.map((risk) => (
          <li key={risk}>{risk}</li>
        ))}
      </ul>
    </section>
  );
}
