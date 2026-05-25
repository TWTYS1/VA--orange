const PROXY_URL = 'ws://localhost:3001/asr';

export function createCloudSpeechSession({ onReady, onStarted, onInterim, onFinal, onFinished, onError } = {}) {
  let ws = null;
  let closed = false;

  function connect() {
    if (closed) return;
    ws = new WebSocket(PROXY_URL);

    ws.onopen = () => {
      onReady?.();
    };

    ws.onmessage = (event) => {
      if (closed) return;
      try {
        const msg = JSON.parse(event.data);
        switch (msg.type) {
          case 'started':
            onStarted?.();
            break;
          case 'interim':
            onInterim?.(msg.text);
            break;
          case 'final':
            onFinal?.(msg.text);
            break;
          case 'finished':
            onFinished?.();
            dispose();
            break;
          case 'error':
            onError?.({ code: msg.code, message: msg.message });
            dispose();
            break;
        }
      } catch {
        // ignore
      }
    };

    ws.onerror = () => {
      if (!closed) {
        onError?.({ code: 'ASR_PROXY_UNREACHABLE', message: '无法连接本地语音处理服务，请确认已执行 npm run dev。' });
        dispose();
      }
    };

    ws.onclose = () => {
      if (!closed) {
        onFinished?.();
      }
      ws = null;
    };
  }

  function sendStart() {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'start' }));
    }
  }

  function sendPcm(arrayBuffer) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(arrayBuffer);
    }
  }

  function sendFinish() {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'finish' }));
    }
  }

  function dispose() {
    closed = true;
    if (ws) {
      ws.onopen = null;
      ws.onmessage = null;
      ws.onerror = null;
      ws.onclose = null;
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
      ws = null;
    }
  }

  return { connect, sendStart, sendPcm, sendFinish, dispose };
}
