import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  isSpeechRecognitionSupported,
  createSpeechRecognizer
} from './speechInput';

function makeMockRecognition() {
  const mock = {
    lang: '',
    interimResults: false,
    continuous: false,
    start: vi.fn(),
    stop: vi.fn(),
    abort: vi.fn(),
    onresult: null,
    onerror: null,
    onend: null,
    onstart: null
  };
  return mock;
}

describe('isSpeechRecognitionSupported', () => {
  it('returns true when window.SpeechRecognition is present', () => {
    const mock = vi.fn();
    globalThis.window = { SpeechRecognition: mock };
    expect(isSpeechRecognitionSupported()).toBe(true);
    delete globalThis.window.SpeechRecognition;
  });

  it('returns true when only window.webkitSpeechRecognition is present', () => {
    const mock = vi.fn();
    globalThis.window = { webkitSpeechRecognition: mock };
    expect(isSpeechRecognitionSupported()).toBe(true);
    delete globalThis.window.webkitSpeechRecognition;
  });

  it('returns false when neither constructor is present', () => {
    globalThis.window = {};
    expect(isSpeechRecognitionSupported()).toBe(false);
  });

  it('returns false when window is undefined (SSR)', () => {
    const savedWindow = globalThis.window;
    delete globalThis.window;
    expect(isSpeechRecognitionSupported()).toBe(false);
    globalThis.window = savedWindow;
  });
});

describe('createSpeechRecognizer', () => {
  let mockRecognition;

  beforeEach(() => {
    mockRecognition = makeMockRecognition();
    const mock = mockRecognition; // capture for closure
    globalThis.window = {
      SpeechRecognition: function () {
        return mock;
      }
    };
  });

  afterEach(() => {
    delete globalThis.window.SpeechRecognition;
    delete globalThis.window.webkitSpeechRecognition;
  });

  it('throws when SpeechRecognition is unavailable', () => {
    globalThis.window = {};
    expect(() => createSpeechRecognizer({})).toThrow();
  });

  it('configures lang to zh-CN', () => {
    createSpeechRecognizer({});
    expect(mockRecognition.lang).toBe('zh-CN');
  });

  it('enables interimResults and continuous', () => {
    createSpeechRecognizer({});
    expect(mockRecognition.interimResults).toBe(true);
    expect(mockRecognition.continuous).toBe(true);
  });

  it('calls onStart when recognition starts', () => {
    const onStart = vi.fn();
    createSpeechRecognizer({ onStart });
    mockRecognition.onstart();
    expect(onStart).toHaveBeenCalledOnce();
  });

  it('start() calls recognition.start()', () => {
    const recognizer = createSpeechRecognizer({});
    recognizer.start();
    expect(mockRecognition.start).toHaveBeenCalledOnce();
  });

  it('stop() calls recognition.stop()', () => {
    const recognizer = createSpeechRecognizer({});
    recognizer.stop();
    expect(mockRecognition.stop).toHaveBeenCalledOnce();
  });

  it('dispose() stops recognition and nullifies handlers', () => {
    const recognizer = createSpeechRecognizer({});
    recognizer.dispose();
    expect(mockRecognition.abort).toHaveBeenCalledOnce();
    expect(mockRecognition.onresult).toBeNull();
    expect(mockRecognition.onerror).toBeNull();
    expect(mockRecognition.onend).toBeNull();
  });

  it('distinguishes interim from final results', () => {
    const onTranscript = vi.fn();
    createSpeechRecognizer({ onTranscript });

    // Simulate interim result (result.isFinal is falsy by default)
    const interimResult = [{ transcript: '供应商还' }];
    mockRecognition.onresult({
      results: [interimResult],
      resultIndex: 0
    });
    expect(onTranscript).toHaveBeenCalledWith({
      finalText: '',
      interimText: '供应商还'
    });

    // Clear and simulate final-only result with result.isFinal = true
    onTranscript.mockClear();
    const finalResult = [{ transcript: '供应商还没确认' }];
    finalResult.isFinal = true;
    mockRecognition.onresult({
      results: [finalResult],
      resultIndex: 0
    });

    expect(onTranscript).toHaveBeenCalledTimes(1);
    const finalCall = onTranscript.mock.calls[0][0];
    expect(finalCall.finalText).toBe('供应商还没确认');
    expect(finalCall.interimText).toBe('');
  });

  it('passes error codes through onError', () => {
    const onError = vi.fn();
    const onEnd = vi.fn();
    createSpeechRecognizer({ onError, onEnd });

    mockRecognition.onerror({ error: 'not-allowed' });
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'not-allowed' })
    );
  });

  it('calls onEnd when recognition ends naturally', () => {
    const onEnd = vi.fn();
    createSpeechRecognizer({ onEnd });
    mockRecognition.onend();
    expect(onEnd).toHaveBeenCalledOnce();
  });
});
