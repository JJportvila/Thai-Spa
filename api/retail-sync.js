const json = (res, status, payload) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.status(status).send(JSON.stringify(payload));
};

const REQUIRED_ENV = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
const RECEIPTS_KEY = 'receipt_records';
const AGENT_TOKEN_KEY = 'merchant_proxy_agent_token';

const ensureEnv = () => REQUIRED_ENV.filter((key) => !process.env[key]);

const supabaseHeaders = () => ({
  apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'resolution=merge-duplicates,return=representation',
});

const getState = async (accountId, stateKey) => {
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
  if (!response.ok) throw new Error(`supabase read failed: ${response.status}`);
  const rows = await response.json().catch(() => []);
  return Array.isArray(rows) && rows[0] ? rows[0] : null;
};

const upsertState = async (accountId, stateKey, payload) => {
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

const isApiKeyAuthOk = (req) => {
  if (!process.env.MERCHANT_PROXY_API_KEY) return false;
  const token = String(req.headers['x-api-key'] || req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  return Boolean(token) && token === process.env.MERCHANT_PROXY_API_KEY;
};

const isEnrollTokenAuthOk = async (req, accountId) => {
  const provided = String(req.headers['x-enroll-token'] || '').trim();
  if (!provided || !accountId) return false;
  const row = await getState(accountId, AGENT_TOKEN_KEY);
  const saved = String((row?.payload && row.payload.token) || '').trim();
  return Boolean(saved) && saved === provided;
};

const normalizePayment = (v) => {
  const x = String(v || '').toUpperCase();
  if (x === 'CARD' || x === 'CHECK' || x === 'STRET_PAY') return x;
  return 'CASH';
};

export default async function handler(req, res) {
  const missing = ensureEnv();
  if (missing.length > 0) {
    json(res, 500, { ok: false, message: `Missing env: ${missing.join(', ')}` });
    return;
  }
  if (req.method !== 'POST') {
    json(res, 405, { ok: false, message: 'Method not allowed' });
    return;
  }

  const body = parseBody(req);
  const accountId = String(body.accountId || '').trim().toUpperCase();
  if (!accountId) {
    json(res, 400, { ok: false, message: 'Missing accountId' });
    return;
  }

  const keyAuthOk = isApiKeyAuthOk(req);
  const enrollAuthOk = keyAuthOk ? false : await isEnrollTokenAuthOk(req, accountId);
  if (!keyAuthOk && !enrollAuthOk) {
    json(res, 401, { ok: false, message: 'Unauthorized' });
    return;
  }

  const receiptNo = String(body.receiptNo || '').trim();
  const printedAt = String(body.printedAt || new Date().toISOString());
  if (!receiptNo) {
    json(res, 400, { ok: false, message: 'Missing receiptNo' });
    return;
  }

  const row = await getState(accountId, RECEIPTS_KEY);
  const list = Array.isArray(row?.payload) ? row.payload : [];
  const itemCount = Math.max(0, Number(body.itemCount || 0));
  const total = Math.max(0, Number(body.total || 0));
  const items = Array.isArray(body.items) ? body.items : [];
  const patch = {
    receiptNo,
    printedAt,
    paymentMethod: normalizePayment(body.paymentMethod),
    total,
    itemCount,
    items,
    kind: body.kind === 'REFUND' ? 'REFUND' : 'SALE',
    status: body.status === 'VOID' ? 'VOID' : body.status === 'REFUNDED' ? 'REFUNDED' : 'NORMAL',
    nvrPhotoDataUrl: String(body.nvrPhotoDataUrl || ''),
    nvrCaptureStatus: body.nvrCaptureStatus === 'FAILED' ? 'FAILED' : body.nvrCaptureStatus === 'PENDING' ? 'PENDING' : 'SUCCESS',
    nvrCaptureMessage: String(body.nvrCaptureMessage || 'EXE offline sync'),
    nvrCaptureSource: body.nvrCaptureSource === 'USB' || body.nvrCaptureSource === 'BUILTIN' ? body.nvrCaptureSource : 'NVR',
    nvrCaptureAt: String(body.nvrCaptureAt || new Date().toISOString()),
  };

  const next = [patch, ...list.filter((item) => item && item.receiptNo !== receiptNo)].slice(0, 2000);
  await upsertState(accountId, RECEIPTS_KEY, next);
  json(res, 200, { ok: true, receiptNo });
}

