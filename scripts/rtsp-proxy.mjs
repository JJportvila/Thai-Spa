import http from 'node:http';
import { spawn } from 'node:child_process';
import { URL } from 'node:url';
import ffmpegPath from 'ffmpeg-static';

const HOST = process.env.RTSP_PROXY_HOST || '127.0.0.1';
const PORT = Number.parseInt(process.env.RTSP_PROXY_PORT || '9194', 10);

if (!ffmpegPath) {
  console.error('[rtsp-proxy] ffmpeg binary not found');
  process.exit(1);
}

const sendJson = (res, status, payload) => {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,bypass-tunnel-reminder',
    'Access-Control-Allow-Private-Network': 'true',
  });
  res.end(JSON.stringify(payload));
};

const captureRtspFrame = (rtspUrl) =>
  new Promise((resolve, reject) => {
    const args = [
      '-hide_banner',
      '-loglevel',
      'error',
      '-rtsp_transport',
      'tcp',
      '-i',
      rtspUrl,
      '-frames:v',
      '1',
      '-f',
      'image2pipe',
      '-vcodec',
      'mjpeg',
      'pipe:1',
    ];
    const ffmpeg = spawn(ffmpegPath, args, { windowsHide: true });
    const chunks = [];
    let stderr = '';
    const timer = setTimeout(() => {
      ffmpeg.kill('SIGKILL');
      reject(new Error('RTSP proxy timeout'));
    }, 8000);

    ffmpeg.stdout.on('data', (chunk) => chunks.push(chunk));
    ffmpeg.stderr.on('data', (chunk) => {
      stderr += String(chunk || '');
    });
    ffmpeg.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    ffmpeg.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0 && chunks.length > 0) {
        resolve(Buffer.concat(chunks));
        return;
      }
      reject(new Error(stderr.trim() || `ffmpeg exited with code ${code}`));
    });
  });

const server = http.createServer(async (req, res) => {
  if (!req.url) {
    sendJson(res, 400, { ok: false, message: 'Missing URL' });
    return;
  }

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,bypass-tunnel-reminder',
      'Access-Control-Allow-Private-Network': 'true',
    });
    res.end();
    return;
  }

  const parsed = new URL(req.url, `http://${req.headers.host || '127.0.0.1'}`);

  if (parsed.pathname === '/health') {
    sendJson(res, 200, { ok: true, service: 'rtsp-proxy', ffmpeg: Boolean(ffmpegPath), at: new Date().toISOString() });
    return;
  }

  if (parsed.pathname !== '/snapshot') {
    sendJson(res, 404, { ok: false, message: 'Not found' });
    return;
  }

  const rtspUrl = parsed.searchParams.get('rtsp') || '';
  if (!rtspUrl.trim()) {
    sendJson(res, 400, { ok: false, message: 'Missing rtsp parameter' });
    return;
  }

  if (!/^rtsp:\/\//i.test(rtspUrl)) {
    sendJson(res, 400, { ok: false, message: 'Only rtsp:// URLs are supported' });
    return;
  }

  try {
    const jpeg = await captureRtspFrame(rtspUrl.trim());
    res.writeHead(200, {
      'Content-Type': 'image/jpeg',
      'Content-Length': jpeg.length,
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Private-Network': 'true',
    });
    res.end(jpeg);
  } catch (error) {
    sendJson(res, 502, { ok: false, message: String(error?.message || error || 'RTSP capture failed') });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`[rtsp-proxy] listening on http://${HOST}:${PORT}`);
  console.log('[rtsp-proxy] health check: /health');
  console.log('[rtsp-proxy] snapshot: /snapshot?rtsp=rtsp://...');
});
