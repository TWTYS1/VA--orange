import crypto from 'node:crypto';
import WebSocket from 'ws';

const DASHSCOPE_WS = 'wss://dashscope.aliyuncs.com/api-ws/v1/inference';

export function createDashScopeSession({ apiKey, onEvent }) {
  let upstream = null;
  let started = false;
  let closed = false;

  function emit(type, payload = {}) {
    if (onEvent) {
      onEvent({ type, ...payload });
    }
  }

  function connect() {
    return new Promise((resolve, reject) => {
      upstream = new WebSocket(DASHSCOPE_WS, {
        headers: { Authorization: `Bearer ${apiKey}` }
      });

      upstream.on('open', () => {
        const taskId = crypto.randomUUID();
        upstream.send(
          JSON.stringify({
            header: {
              action: 'run-task',
              task_id: taskId,
              streaming: 'duplex'
            },
            payload: {
              task_group: 'audio',
              task: 'asr',
              function: 'recognition',
              model: 'paraformer-realtime-v2',
              parameters: {
                format: 'pcm',
                sample_rate: 16000,
                language_hints: ['zh']
              },
              input: {}
            }
          })
        );
        resolve(taskId);
      });

      upstream.on('message', (raw) => {
        if (closed) return;
        try {
          const msg = JSON.parse(raw.toString());
          const { header, payload } = msg;

          switch (header?.event) {
            case 'task-started':
              started = true;
              emit('started');
              break;

            case 'result-generated':
              if (payload?.output?.text) {
                const text = payload.output.text;
                if (header.is_final) {
                  emit('final', { text });
                } else {
                  emit('interim', { text });
                }
              }
              break;

            case 'task-finished':
              emit('finished');
              cleanup();
              break;

            case 'task-failed':
              emit('error', {
                code: mapUpstreamError(payload?.error),
                message: payload?.error?.message || '识别服务返回错误'
              });
              cleanup();
              break;

            default:
              break;
          }
        } catch {
          // ignore parse errors on binary frames
        }
      });

      upstream.on('error', () => {
        if (!started && !closed) {
          reject(new Error('ASR_UPSTREAM_NETWORK'));
        } else if (!closed) {
          emit('error', { code: 'ASR_UPSTREAM_NETWORK', message: '与识别服务的连接中断' });
          cleanup();
        }
      });

      upstream.on('close', () => {
        if (!started && !closed) {
          reject(new Error('ASR_UPSTREAM_NETWORK'));
        }
      });
    });
  }

  function sendAudio(pcmBuffer) {
    if (upstream && upstream.readyState === WebSocket.OPEN && started) {
      upstream.send(pcmBuffer);
    }
  }

  function finish() {
    if (upstream && upstream.readyState === WebSocket.OPEN) {
      upstream.send(
        JSON.stringify({
          header: { action: 'finish-task', task_id: '' },
          payload: {}
        })
      );
    }
  }

  function cleanup() {
    closed = true;
    started = false;
    if (upstream) {
      upstream.removeAllListeners();
      if (upstream.readyState === WebSocket.OPEN || upstream.readyState === WebSocket.CONNECTING) {
        upstream.close();
      }
      upstream = null;
    }
  }

  return { connect, sendAudio, finish, cleanup };
}

function mapUpstreamError(error) {
  if (!error) return 'ASR_UNKNOWN';
  const code = error.code || error.message || '';
  if (/auth/i.test(code)) return 'ASR_AUTH_FAILED';
  if (/rate|quota/i.test(code)) return 'ASR_RATE_LIMITED';
  return 'ASR_UNKNOWN';
}
