const replyLabels = {
  recommended: '推荐版',
  short: '简短版',
  assertive: '增强推进版'
};

export function ReplyCards({
  replies,
  editableReply,
  copiedKey,
  onEditableReplyChange,
  onCopy
}) {
  return (
    <section className="panel result-panel" aria-labelledby="reply-title">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Step 4</p>
          <h2 id="reply-title">可发送回复</h2>
        </div>
      </div>

      <div className="reply-card featured">
        <div className="reply-card-header">
          <strong>{replyLabels.recommended}</strong>
          <button type="button" onClick={() => onCopy(editableReply, 'recommended')}>
            {copiedKey === 'recommended' ? '已复制' : '复制'}
          </button>
        </div>
        <textarea
          value={editableReply}
          onChange={(event) => onEditableReplyChange(event.target.value)}
          rows={6}
        />
      </div>

      <div className="reply-list">
        {['short', 'assertive'].map((key) => (
          <article className="reply-card" key={key}>
            <div className="reply-card-header">
              <strong>{replyLabels[key]}</strong>
              <button type="button" onClick={() => onCopy(replies[key], key)}>
                {copiedKey === key ? '已复制' : '复制'}
              </button>
            </div>
            <p>{replies[key]}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
