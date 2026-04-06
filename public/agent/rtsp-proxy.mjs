import http from 'node:http';
import { spawn } from 'node:child_process';
import { URL } from 'node:url';

const HOST = process.env.RTSP_PROXY_HOST || '127.0.0.1';
const PORT = Number.parseInt(process.env.RTSP_PROXY_PORT || '9194', 10);
const FFMPEG_BIN = process.env.FFMPEG_BIN || 'ffmpeg';

const sendJson = (res, status, body) => {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,bypass-tunnel-reminder',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(body));
};

const captureRtspFrame = (rtspUrl) =>
  new Promise((resolve, reject) => {
    const ff = spawn(FFMPEG_BIN, [
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
      'image2',
      '-vcodec',
      'mjpeg',
      'pipe:1',
    ]);

    const chunks = [];
    const errs = [];
    const timer = setTimeout(() => {
      try { ff.kill('SIGKILL'); } catch {}
      reject(new Error('RTSP proxy timeout'));
    }, 10000);

    ff.stdout.on('data', (chunk) => chunks.push(chunk));
    ff.stderr.on('data', (chunk) => errs.push(Buffer.from(chunk).toString('utf8')));
    ff.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
    ff.on('close', (code) => {
      clearTimeout(timer);
      const buffer = Buffer.concat(chunks);
      if (code === 0 && buffer.length > 16) {
        resolve(buffer);
        return;
      }
      reject(new Error(errs.join(' ').trim() || `ffmpeg exited with ${code}`));
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
      'Cache-Control': 'no-store',
    });
    res.end();
    return;
  }

  const parsed = new URL(req.url, `http://${HOST}:${PORT}`);
  if (parsed.pathname === '/health') {
    sendJson(res, 200, { ok: true, service: 'rtsp-proxy', ffmpeg: FFMPEG_BIN, at: new Date().toISOString() });
    return;
  }
  if (parsed.pathname !== '/snapshot') {
    sendJson(res, 404, { ok: false, message: 'Not found' });
    return;
  }

  const rtspUrl = String(parsed.searchParams.get('rtsp') || '').trim();
  if (!rtspUrl) {
    sendJson(res, 400, { ok: false, message: 'Missing rtsp parameter' });
    return;
  }
  if (!/^rtsp:\/\//i.test(rtspUrl)) {
    sendJson(res, 400, { ok: false, message: 'Only rtsp:// URLs are supported' });
    return;
  }

  try {
    const jpeg = await captureRtspFrame(rtspUrl);
    res.writeHead(200, {
      'Content-Type': 'image/jpeg',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(jpeg);
  } catch (error) {
    sendJson(res, 502, { ok: false, message: String(error?.message || 'RTSP capture failed') });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`[rtsp-proxy] listening on http://${HOST}:${PORT}`);
});
