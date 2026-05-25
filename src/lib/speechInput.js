function getSpeechRecognitionCtor() {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

export function isSpeechRecognitionSupported() {
  return getSpeechRecognitionCtor() !== null;
}

function errorCodeToMessage(code) {
  switch (code) {
    case 'not-allowed':
    case 'service-not-allowed':
      return '麦克风权限未授予，请在浏览器设置中允许使用麦克风后重试。';
    case 'no-speech':
      return '未检测到语音内容，请确认麦克风正常并再次尝试。';
    case 'network':
      return '语音识别服务连接失败，请检查网络后重试。';
    default:
      return '语音识别暂时失败，请重试或改用文本输入。';
  }
}

export function createSpeechRecognizer({ onStart, onTranscript, onEnd, onError } = {}) {
  const Ctor = getSpeechRecognitionCtor();
  if (!Ctor) {
    throw new Error('SpeechRecognition is not supported in this browser');
  }

  const recognition = new Ctor();
  recognition.lang = 'zh-CN';
  recognition.interimResults = true;
  recognition.continuous = true;

  recognition.onstart = () => {
    onStart?.();
  };

  recognition.onresult = (event) => {
    let finalText = '';
    let interimText = '';

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      if (result.isFinal) {
        finalText += result[0].transcript;
      } else {
        interimText += result[0].transcript;
      }
    }

    onTranscript?.({ finalText, interimText });
  };

  recognition.onerror = (event) => {
    onError?.({
      code: event.error,
      message: errorCodeToMessage(event.error)
    });
  };

  recognition.onend = () => {
    onEnd?.();
  };

  return {
    start() {
      recognition.start();
    },
    stop() {
      recognition.stop();
    },
    dispose() {
      recognition.abort();
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognition.onstart = null;
    }
  };
}
