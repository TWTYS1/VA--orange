import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { createAudioCapture } from './audioCapture';

describe('audioCapture', () => {
  let mockStream;
  let mockAudioContext;
  let mockProcessor;

  beforeEach(() => {
    mockProcessor = {
      connect: vi.fn(),
      disconnect: vi.fn(),
      onaudioprocess: null
    };

    mockAudioContext = {
      sampleRate: 16000,
      createMediaStreamSource: vi.fn(() => ({
        connect: vi.fn(),
        disconnect: vi.fn()
      })),
      createScriptProcessor: vi.fn(() => mockProcessor),
      close: vi.fn()
    };

    mockStream = {
      getTracks: vi.fn(() => [{ stop: vi.fn() }])
    };

    const ctx = mockAudioContext;
    globalThis.AudioContext = function () { return ctx; };

    globalThis.navigator = {
      mediaDevices: {
        getUserMedia: vi.fn().mockResolvedValue(mockStream)
      }
    };
  });

  afterEach(() => {
    delete globalThis.AudioContext;
  });

  it('requests mono audio at 16000 Hz with echo cancellation', async () => {
    const capture = createAudioCapture({});
    await capture.start();
    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
      audio: expect.objectContaining({
        channelCount: 1,
        sampleRate: 16000,
        echoCancellation: true,
        noiseSuppression: true
      })
    });
    capture.stop();
  });

  it('delivers PCM frames via onPcmFrame callback', async () => {
    const frames = [];
    const capture = createAudioCapture({ onPcmFrame: (buf) => frames.push(buf) });
    await capture.start();

    // Simulate audio processing
    const inputBuffer = {
      getChannelData: vi.fn(() => new Float32Array(128).fill(0.5))
    };
    mockProcessor.onaudioprocess({ inputBuffer });

    expect(frames.length).toBeGreaterThan(0);
    expect(frames[0]).toBeInstanceOf(ArrayBuffer);
    capture.stop();
  });

  it('converts Float32 to Int16 PCM with int16 range', async () => {
    const frames = [];
    const capture = createAudioCapture({ onPcmFrame: (buf) => frames.push(buf) });
    await capture.start();

    // Float32 0.5 → Int16 approx 16383 (0.5 * 32767)
    const float32 = new Float32Array(4).fill(0.5);
    mockProcessor.onaudioprocess({
      inputBuffer: { getChannelData: vi.fn(() => float32) }
    });

    expect(frames.length).toBeGreaterThan(0);
    const view = new Int16Array(frames[0]);
    // 0.5 * 32767 = 16383.5, truncated to 16383
    expect(view[0]).toBeGreaterThan(16000);
    expect(view[0]).toBeLessThan(16500);
    capture.stop();
  });

  it('handles microphone permission denied', async () => {
    const errors = [];
    navigator.mediaDevices.getUserMedia = vi.fn().mockRejectedValue(
      Object.assign(new Error('Permission denied'), { name: 'NotAllowedError' })
    );

    const capture = createAudioCapture({
      onError: (err) => errors.push(err)
    });
    await capture.start();

    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('MIC_PERMISSION_DENIED');
  });

  it('releases resources on stop', async () => {
    const capture = createAudioCapture({});
    await capture.start();
    capture.stop();

    expect(mockAudioContext.close).toHaveBeenCalled();
  });

  it('does not start twice', async () => {
    const capture = createAudioCapture({});
    await capture.start();
    await capture.start();
    // getUserMedia should only be called once
    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledTimes(1);
    capture.stop();
  });
});
