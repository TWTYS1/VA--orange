/**
 * Captures mono Int16 PCM 16000 Hz from getUserMedia.
 * MVP implementation using ScriptProcessorNode; upgrade to AudioWorklet for production.
 */
export function createAudioCapture({ onPcmFrame, onError } = {}) {
  let stream = null;
  let audioContext = null;
  let processor = null;
  let source = null;
  let active = false;

  async function start() {
    if (active) return;

    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true
        }
      });
    } catch (err) {
      const code =
        err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError'
          ? 'MIC_PERMISSION_DENIED'
          : 'MIC_INIT_FAILED';
      onError?.({ code, message: '无法访问麦克风，请检查权限设置。' });
      return;
    }

    audioContext = new AudioContext({ sampleRate: 16000 });
    source = audioContext.createMediaStreamSource(stream);

    // Resample to 16000 Hz mono if needed via a simple processor
    const bufferSize = 4096;
    processor = audioContext.createScriptProcessor(bufferSize, 1, 1);

    processor.onaudioprocess = (event) => {
      if (!active) return;
      const inputData = event.inputBuffer.getChannelData(0);
      const pcm = float32ToInt16(inputData);
      onPcmFrame?.(pcm.buffer.slice(pcm.byteOffset, pcm.byteOffset + pcm.byteLength));
    };

    source.connect(processor);
    processor.connect(audioContext.destination);
    active = true;
  }

  function stop() {
    active = false;
    try { processor?.disconnect(); } catch {}
    try { source?.disconnect(); } catch {}
    try { audioContext?.close(); } catch {}
    try { stream?.getTracks().forEach((t) => t.stop()); } catch {}
    processor = null;
    source = null;
    audioContext = null;
    stream = null;
  }

  return { start, stop };
}

function float32ToInt16(float32Array) {
  const length = float32Array.length;
  const int16 = new Int16Array(length);
  for (let i = 0; i < length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return int16;
}
