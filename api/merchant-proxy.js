const json = (res, status, payload) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.status(status).send(JSON.stringify(payload));
};

const REQUIRED_ENV = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
const STATUS_KEY = 'merchant_proxy_status';
const NVR_KEY = 'nvr_capture_settings';
const AGENT_TOKEN_KEY = 'merchant_proxy_agent_token';

const ensureEnv = () => REQUIRED_ENV.filter((key) => !process.env[key]);

const parseBody = (req) => {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string' && req.body.trim()) {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return {};
};

const supabaseHeaders = () => ({
  apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'resolution=merge-duplicates,return=representation',
});

const upsertSharedState = async (accountId, stateKey, payload) => {
  const url = `${process.env.SUPABASE_URL}/rest/v1/app_shared_state?on_conflict=account_id,state_key`;
  const response = await fetch(url, {
    method: 'POST',
    headers: supabaseHeaders(),
    body: JSON.stringify([
      {
        account_id: accountId,
        state_key: stateKey,
        payload,
        updated_at: new Date().toISOString(),
      },
    ]),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(detail || `supabase upsert failed: ${response.status}`);
  }
};

const getSharedState = async (accountId, stateKey) => {
  const params = new URLSearchParams({
    account_id: `eq.${accountId}`,
    state_key: `eq.${stateKey}`,
    select: 'payload,updated_at',
    limit: '1',
  });
  const url = `${process.env.SUPABASE_URL}/rest/v1/app_shared_state?${params.toString()}`;
  const response = await fetch(url, {
    headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
    },
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(detail || `supabase read failed: ${response.status}`);
  }
  const rows = await response.json().catch(() => []);
  return Array.isArray(rows) && rows[0] ? rows[0] : null;
};

const isApiKeyAuthOk = (req) => {
  if (!process.env.MERCHANT_PROXY_API_KEY) return false;
  const token = String(req.headers['x-api-key'] || req.headers['authorization'] || '').replace(/^Bearer\s+/i, '');
  return Boolean(token) && token === process.env.MERCHANT_PROXY_API_KEY;
};

const isEnrollTokenAuthOk = async (req, accountId) => {
  const provided = String(req.headers['x-enroll-token'] || '').trim();
  if (!provided || !accountId) return false;
  const row = await getSharedState(accountId, AGENT_TOKEN_KEY);
  const saved = String((row?.payload && row.payload.token) || '').trim();
  return Boolean(saved) && provided === saved;
};

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,x-api-key,authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.status(204).end();
    return;
  }

  const missing = ensureEnv();
  if (missing.length > 0) {
    json(res, 500, { ok: false, message: `Missing env: ${missing.join(', ')}` });
    return;
  }

  if (req.method === 'GET') {
    const accountId = String(req.query.accountId || '').trim().toUpperCase();
    if (!accountId) {
      json(res, 400, { ok: false, message: 'Missing accountId' });
      return;
    }
    try {
      const row = await getSharedState(accountId, STATUS_KEY);
      json(res, 200, {
        ok: true,
        accountId,
        data: row?.payload || null,
        updatedAt: row?.updated_at || null,
      });
    } catch (error) {
      json(res, 500, { ok: false, message: String(error?.message || 'status lookup failed') });
    }
    return;
  }

  if (req.method !== 'POST') {
    json(res, 405, { ok: false, message: 'Method not allowed' });
    return;
  }

  const body = parseBody(req);
  const accountId = String(body.accountId || '').trim().toUpperCase();
  const proxyUrl = String(body.proxyUrl || '').trim().replace(/\/$/, '');
  const mode = String(body.mode || 'register').trim().toLowerCase();
  const source = String(body.source || 'NVR').trim().toUpperCase();
  const rtspUrl = String(body.rtspUrl || '').trim();
  const vendor = String(body.vendor || 'GENERIC').trim().toUpperCase();

  if (!accountId || !proxyUrl) {
    json(res, 400, { ok: false, message: 'Missing accountId or proxyUrl' });
    return;
  }

  const keyAuthOk = isApiKeyAuthOk(req);
  const enrollAuthOk = keyAuthOk ? false : await isEnrollTokenAuthOk(req, accountId);
  if (!keyAuthOk && !enrollAuthOk) {
    json(res, 401, { ok: false, message: 'Unauthorized' });
    return;
  }

  let normalizedProxy;
  try {
    normalizedProxy = new URL(proxyUrl).toString().replace(/\/$/, '');
  } catch {
    json(res, 400, { ok: false, message: 'Invalid proxyUrl' });
    return;
  }

  const now = new Date().toISOString();
  const statusPayload = {
    accountId,
    proxyUrl: normalizedProxy,
    online: true,
    source,
    vendor,
    tunnelProvider: normalizedProxy.includes('trycloudflare.com')
      ? 'cloudflared'
      : normalizedProxy.includes('.loca.lt')
      ? 'localtunnel'
      : 'custom',
    agentId: String(body.agentId || ''),
    host: String(body.host || ''),
    mode,
    lastHeartbeatAt: now,
    message: 'ok',
  };

  try {
    await upsertSharedState(accountId, STATUS_KEY, statusPayload);

    const nvrState = await getSharedState(accountId, NVR_KEY);
    const prev = (nvrState?.payload && typeof nvrState.payload === 'object') ? nvrState.payload : {};
    const nextNvr = {
      ...prev,
      enabled: true,
      protocol: 'RTSP_PROXY',
      source: source === 'USB' || source === 'BUILTIN' ? source : 'NVR',
      vendor,
      rtspProxyBaseUrl: normalizedProxy,
      rtspUrl: rtspUrl || String(prev?.rtspUrl || ''),
      snapshotUrl: '',
    };
    await upsertSharedState(accountId, NVR_KEY, nextNvr);

    json(res, 200, { ok: true, accountId, proxyUrl: normalizedProxy, lastHeartbeatAt: now });
  } catch (error) {
    json(res, 500, { ok: false, message: String(error?.message || 'register failed') });
  }
}
