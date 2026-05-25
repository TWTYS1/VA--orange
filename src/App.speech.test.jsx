import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App.jsx';

function createMockRecognition() {
  return {
    lang: '',
    interimResults: false,
    continuous: false,
    start: vi.fn(),
    stop: vi.fn(),
    abort: vi.fn(),
    onstart: null,
    onresult: null,
    onerror: null,
    onend: null
  };
}

function interimResult(text) {
  return { resultIndex: 0, results: [[{ transcript: text }]] };
}

describe('App speech interaction', () => {
  let container;
  let root;
  let instances;

  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    instances = [];
    window.SpeechRecognition = function MockSpeechRecognition() {
      const instance = createMockRecognition();
      instances.push(instance);
      return instance;
    };
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => root.render(<App />));
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    delete window.SpeechRecognition;
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  });

  function clickButton(label) {
    const button = [...container.querySelectorAll('button')].find(
      (item) => item.textContent.trim() === label
    );
    expect(button).toBeTruthy();
    act(() => button.click());
  }

  it('keeps a microphone error visible after the recognition session ends', () => {
    clickButton('开始语音输入');
    act(() => {
      instances[0].onerror({ error: 'not-allowed' });
      instances[0].onend();
    });

    expect(container.textContent).toContain('麦克风权限未授予');
  });

  it('does not create a second recognizer while the first is starting', () => {
    const button = [...container.querySelectorAll('button')].find(
      (item) => item.textContent.trim() === '开始语音输入'
    );
    act(() => {
      button.click();
      button.click();
    });

    expect(instances).toHaveLength(1);
  });

  it('commits pending interim text when a stopped session ends without a final result', () => {
    clickButton('开始语音输入');
    act(() => instances[0].onstart());
    act(() => instances[0].onresult(interimResult('这是一次语音补充')));

    clickButton('停止录音');
    act(() => instances[0].onend());

    expect(container.querySelector('textarea').value).toContain('这是一次语音补充');
  });

  it('shows a recoverable message when a session ends without transcript events', () => {
    clickButton('开始语音输入');
    act(() => instances[0].onstart());
    act(() => instances[0].onend());

    expect(container.textContent).toContain('未检测到语音内容');
  });
});
