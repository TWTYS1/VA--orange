import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { createCloudSpeechSession } from './cloudSpeechInput';

describe('createCloudSpeechSession', () => {
  let mockWs;
  let wsConstructedUrl;
  let sessions;

  beforeEach(() => {
    sessions = [];
    wsConstructedUrl = null;
    mockWs = {
      onopen: null,
      onmessage: null,
      onerror: null,
      onclose: null,
      send: vi.fn(),
      close: vi.fn(),
      readyState: 1 // WebSocket.OPEN
    };
    const capturedWs = mockWs;
    globalThis.WebSocket = function (url) {
      wsConstructedUrl = url;
      return capturedWs;
    };
    globalThis.WebSocket.OPEN = 1;
    globalThis.WebSocket.CONNECTING = 0;
    globalThis.WebSocket.CLOSING = 2;
    globalThis.WebSocket.CLOSED = 3;
  });

  afterEach(() => {
    delete globalThis.WebSocket;
  });

  function simulateMessage(msg) {
    if (mockWs.onmessage) {
      mockWs.onmessage({ data: JSON.stringify(msg) });
    }
  }

  function createSession(handlers = {}) {
    const session = createCloudSpeechSession(handlers);
    sessions.push(session);
    return session;
  }

  it('connects to the local proxy WebSocket', () => {
    const session = createSession();
    session.connect();
    expect(wsConstructedUrl).toBe('ws://localhost:3001/asr');
  });

  it('emits onReady when WebSocket opens', () => {
    const onReady = vi.fn();
    const session = createSession({ onReady });
    session.connect();
    mockWs.onopen();
    expect(onReady).toHaveBeenCalledOnce();
  });

  it('sends start command via JSON after ready', () => {
    const onReady = vi.fn();
    const session = createSession({ onReady });
    session.connect();
    mockWs.onopen();

    session.sendStart();
    expect(mockWs.send).toHaveBeenCalledWith(JSON.stringify({ type: 'start' }));
  });

  it('forwards PCM as binary', () => {
    const onReady = vi.fn();
    const session = createSession({ onReady });
    session.connect();
    mockWs.onopen();

    const buffer = new ArrayBuffer(8);
    session.sendPcm(buffer);
    expect(mockWs.send).toHaveBeenCalledWith(buffer);
  });

  it('sends finish command', () => {
    const onReady = vi.fn();
    const session = createSession({ onReady });
    session.connect();
    mockWs.onopen();

    session.sendFinish();
    expect(mockWs.send).toHaveBeenCalledWith(JSON.stringify({ type: 'finish' }));
  });

  it('routes started event to onStarted', () => {
    const onStarted = vi.fn();
    const session = createSession({ onStarted });
    session.connect();
    mockWs.onopen();
    simulateMessage({ type: 'started' });
    expect(onStarted).toHaveBeenCalledOnce();
  });

  it('routes interim event to onInterim with text', () => {
    const onInterim = vi.fn();
    const session = createSession({ onInterim });
    session.connect();
    mockWs.onopen();
    simulateMessage({ type: 'interim', text: '供应商还' });
    expect(onInterim).toHaveBeenCalledWith('供应商还');
  });

  it('routes final event to onFinal with text', () => {
    const onFinal = vi.fn();
    const session = createSession({ onFinal });
    session.connect();
    mockWs.onopen();
    simulateMessage({ type: 'final', text: '供应商还没确认' });
    expect(onFinal).toHaveBeenCalledWith('供应商还没确认');
  });

  it('routes finished event to onFinished and disposes', () => {
    const onFinished = vi.fn();
    const session = createSession({ onFinished });
    session.connect();
    mockWs.onopen();
    simulateMessage({ type: 'finished' });
    expect(onFinished).toHaveBeenCalledOnce();
    expect(mockWs.close).toHaveBeenCalled();
  });

  it('routes error event to onError and disposes', () => {
    const onError = vi.fn();
    const session = createSession({ onError });
    session.connect();
    mockWs.onopen();
    simulateMessage({ type: 'error', code: 'ASR_CONFIG_MISSING', message: '未配置 API Key' });
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'ASR_CONFIG_MISSING' })
    );
    expect(mockWs.close).toHaveBeenCalled();
  });

  it('emits proxy unreachable error on WebSocket error', () => {
    const onError = vi.fn();
    const session = createSession({ onError });
    session.connect();
    mockWs.onerror({});
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'ASR_PROXY_UNREACHABLE' })
    );
  });

  it('dispose cleans up all handlers and closes socket', () => {
    const session = createSession({});
    session.connect();
    mockWs.onopen();
    session.dispose();

    expect(mockWs.onopen).toBeNull();
    expect(mockWs.onmessage).toBeNull();
    expect(mockWs.onerror).toBeNull();
    expect(mockWs.onclose).toBeNull();
  });

  it('ignores events after dispose', () => {
    const onInterim = vi.fn();
    const session = createSession({ onInterim });
    session.connect();
    mockWs.onopen();
    session.dispose();

    simulateMessage({ type: 'interim', text: '不应该收到' });
    expect(onInterim).not.toHaveBeenCalled();
  });
});
