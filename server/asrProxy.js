import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { WebSocketServer } from 'ws';
import { createDashScopeSession } from './dashscopeSession.js';

function loadEnv() {
  const envPath = resolve(process.cwd(), '.env.local');
  try {
    const content = readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const value = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch {
    // .env.local is optional — errors are handled per-session
  }
}

loadEnv();

const API_KEY = process.env.DASHSCOPE_API_KEY;
const PORT = parseInt(process.env.ASR_PROXY_PORT || '3001', 10);

const wss = new WebSocketServer({ port: PORT });

console.log(`ASR proxy listening on ws://localhost:${PORT}/asr`);

wss.on('connection', (clientWs) => {
  let session = null;
  let clientOpen = true;

  function sendToClient(message) {
    if (clientOpen && clientWs.readyState === 1) {
      clientWs.send(JSON.stringify(message));
    }
  }

  clientWs.on('message', async (data) => {
    // Text messages are commands
    if (typeof data === 'string' || (data instanceof Buffer && data[0] !== 0x00)) {
      let msg;
      try {
        msg = JSON.parse(data.toString());
      } catch {
        // Not valid JSON — might be binary audio sent as text
        return;
      }

      if (msg.type === 'start') {
        if (!API_KEY) {
          sendToClient({ type: 'error', code: 'ASR_CONFIG_MISSING', message: '未配置 DashScope API Key，请参照 README 创建 .env.local。' });
          return;
        }

        if (session) {
          session.cleanup();
        }

        session = createDashScopeSession({
          apiKey: API_KEY,
          onEvent: (event) => {
            if (event.type === 'started') {
              sendToClient({ type: 'started' });
            } else if (event.type === 'interim') {
              sendToClient({ type: 'interim', text: event.text });
            } else if (event.type === 'final') {
              sendToClient({ type: 'final', text: event.text });
            } else if (event.type === 'finished') {
              sendToClient({ type: 'finished' });
            } else if (event.type === 'error') {
              sendToClient({ type: 'error', code: event.code, message: event.message });
            }
          }
        });

        try {
          await session.connect();
          sendToClient({ type: 'ready' });
        } catch (err) {
          const code = err.message === 'ASR_UPSTREAM_NETWORK' ? 'ASR_UPSTREAM_NETWORK' : 'ASR_UNKNOWN';
          sendToClient({ type: 'error', code, message: code === 'ASR_UPSTREAM_NETWORK' ? '无法连接阿里云识别服务，请检查网络。' : '识别服务初始化失败。' });
          if (session) {
            session.cleanup();
            session = null;
          }
        }
      } else if (msg.type === 'finish') {
        if (session) {
          session.finish();
        }
      }
      return;
    }

    // Binary message — PCM audio frame
    if (session) {
      const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
      session.sendAudio(buf);
    }
  });

  clientWs.on('close', () => {
    clientOpen = false;
    if (session) {
      session.cleanup();
      session = null;
    }
  });

  clientWs.on('error', () => {
    clientOpen = false;
    if (session) {
      session.cleanup();
      session = null;
    }
  });
});

wss.on('error', (err) => {
  console.error('ASR proxy error:', err.message);
  process.exit(1);
});

process.on('SIGTERM', () => { wss.close(); process.exit(0); });
process.on('SIGINT', () => { wss.close(); process.exit(0); });
