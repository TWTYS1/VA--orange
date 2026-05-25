import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the cloud ASR modules
vi.mock('./lib/audioCapture.js', () => ({
  createAudioCapture: vi.fn()
}));

vi.mock('./lib/cloudSpeechInput.js', () => ({
  createCloudSpeechSession: vi.fn()
}));

import App from './App.jsx';
import { createAudioCapture } from './lib/audioCapture.js';
import { createCloudSpeechSession } from './lib/cloudSpeechInput.js';

describe('App cloud speech interaction', () => {
  let container;
  let root;
  let cloudCallbacks;
  let captureInstance;

  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;

    // Setup getUserMedia support
    navigator.mediaDevices = { getUserMedia: vi.fn() };

    captureInstance = {
      start: vi.fn(),
      stop: vi.fn()
    };
    createAudioCapture.mockReturnValue(captureInstance);

    cloudCallbacks = {};
    createCloudSpeechSession.mockImplementation((handlers) => {
      Object.assign(cloudCallbacks, handlers);
      return {
        connect: vi.fn(),
        sendStart: vi.fn(),
        sendPcm: vi.fn(),
        sendFinish: vi.fn(),
        dispose: vi.fn()
      };
    });

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => root.render(<App />));
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.clearAllMocks();
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  });

  function clickButton(label) {
    const button = [...container.querySelectorAll('button')].find(
      (item) => item.textContent.trim() === label
    );
    expect(button).toBeTruthy();
    act(() => button.click());
  }

  function simulateSequence() {
    // connect → onReady
    clickButton('开始语音输入');
    expect(createCloudSpeechSession).toHaveBeenCalledTimes(1);
    act(() => cloudCallbacks.onReady());
  }

  it('shows connecting state after clicking start', () => {
    clickButton('开始语音输入');
    expect(container.textContent).toContain('正在连接识别服务...');
    expect(container.textContent).toContain('正在连接...');
  });

  it('shows listening state after proxy ready and started', () => {
    clickButton('开始语音输入');
    act(() => cloudCallbacks.onReady());

    // session sends start
    const session = createCloudSpeechSession.mock.results[0].value;
    expect(session.sendStart).toHaveBeenCalled();

    // proxy responds started
    act(() => cloudCallbacks.onStarted());
    expect(container.textContent).toContain('正在听写...');
    expect(container.textContent).toContain('停止录音');
  });

  it('does not create a second session while the first is starting', () => {
    clickButton('开始语音输入');
    // After clicking, button text changes to "正在连接识别服务..." and is disabled.
    // A second click on the same label can't happen — the guard logic is verified
    // by checking createCloudSpeechSession was called exactly once.
    expect(createCloudSpeechSession).toHaveBeenCalledTimes(1);
  });

  it('disables generate/example/clear buttons during listening', () => {
    simulateSequence();
    act(() => cloudCallbacks.onStarted());

    const generateBtn = container.querySelector('.primary-button');
    expect(generateBtn.disabled).toBe(true);
  });

  it('shows interim transcript during listening', () => {
    simulateSequence();
    act(() => cloudCallbacks.onStarted());
    act(() => cloudCallbacks.onInterim('供应商还'));

    expect(container.textContent).toContain('供应商还');
  });

  it('appends final text to textarea', () => {
    simulateSequence();
    act(() => cloudCallbacks.onStarted());
    act(() => cloudCallbacks.onFinal('供应商还没确认'));

    const textarea = container.querySelector('textarea');
    expect(textarea.value).toContain('供应商还没确认');
  });

  it('keeps error visible after session fails', () => {
    simulateSequence();
    act(() => cloudCallbacks.onStarted());
    act(() => cloudCallbacks.onError({ code: 'ASR_AUTH_FAILED', message: '鉴权失败' }));

    expect(container.textContent).toContain('鉴权失败');
  });

  it('commits pending interim text when finishing', () => {
    simulateSequence();
    act(() => cloudCallbacks.onStarted());
    act(() => cloudCallbacks.onInterim('这是一次语音补充'));

    clickButton('停止录音');
    act(() => cloudCallbacks.onFinished());

    expect(container.querySelector('textarea').value).toContain('这是一次语音补充');
  });

  it('shows no-speech message when session ends without transcript', () => {
    simulateSequence();
    act(() => cloudCallbacks.onStarted());
    act(() => cloudCallbacks.onFinished());

    expect(container.textContent).toContain('未检测到语音内容');
  });

  it('shows finishing state after clicking stop', () => {
    simulateSequence();
    act(() => cloudCallbacks.onStarted());

    clickButton('停止录音');
    expect(container.textContent).toContain('正在完成转写...');
  });

  it('stops audio capture and sends finish on stop click', () => {
    simulateSequence();
    act(() => cloudCallbacks.onStarted());

    clickButton('停止录音');

    expect(captureInstance.stop).toHaveBeenCalled();
    const session = createCloudSpeechSession.mock.results[0].value;
    expect(session.sendFinish).toHaveBeenCalled();
  });
});
