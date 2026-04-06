const isPrivateHost = (hostname) => {
  const host = String(hostname || '').toLowerCase();
  if (host === 'localhost' || host === '127.0.0.1') return true;
  if (/^10\./.test(host)) return true;
  if (/^192\.168\./.test(host)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) return true;
  return false;
};

const RETRYABLE_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const isLocalTunnelHost = (hostname) => String(hostname || '').toLowerCase().endsWith('.loca.lt');

const fetchWithTimeout = async (url, init = {}, timeoutMs = 12000) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,bypass-tunnel-reminder');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  const rawUrl = String(req.query.url || '').trim();
  if (!rawUrl) {
    res.status(400).json({ ok: false, message: 'Missing url parameter' });
    return;
  }

  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    res.status(400).json({ ok: false, message: 'Invalid target URL' });
    return;
  }

  if (!/^https?:$/i.test(parsed.protocol)) {
    res.status(400).json({ ok: false, message: 'Only http/https URLs are supported by server proxy' });
    return;
  }

  if (isPrivateHost(parsed.hostname)) {
    res.status(400).json({
      ok: false,
      message:
        'Vercel server cannot access 192.168.x.x/localhost. Use local RTSP proxy or a public snapshot URL.',
    });
    return;
  }

  try {
    const requestHeaders = {};
    if (isLocalTunnelHost(parsed.hostname)) {
      requestHeaders['bypass-tunnel-reminder'] = '1';
    }
    let response = null;
    for (let attempt = 0; attempt < 6; attempt += 1) {
      response = await fetchWithTimeout(
        parsed.toString(),
        {
          cache: 'no-store',
          headers: requestHeaders,
        },
        12000
      );
      if (response.ok || !RETRYABLE_STATUSES.has(response.status) || attempt === 5) break;
      await sleep(400 * (attempt + 1));
    }

    if (!response || !response.ok) {
      const code = response?.status || 502;
      res.status(code).json({ ok: false, message: `Target responded with ${code}` });
      return;
    }

    const arrayBuffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    res.status(200).send(Buffer.from(arrayBuffer));
  } catch (error) {
    res.status(502).json({ ok: false, message: String(error?.message || 'Proxy fetch failed') });
  }
}
