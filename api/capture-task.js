const json = (res, status, payload) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.status(status).send(JSON.stringify(payload));
};

const REQUIRED_ENV = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
const JOBS_KEY = 'receipt_capture_jobs';
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

const patchReceiptCapture = async (accountId, receiptNo, patch) => {
  const receiptRow = await getState(accountId, RECEIPTS_KEY);
  const list = Array.isArray(receiptRow?.payload) ? receiptRow.payload : [];
  const next = list.map((item) =>
    item.receiptNo === receiptNo
      ? {
          ...item,
          ...patch,
          nvrCaptureAt: new Date().toISOString(),
        }
      : item
  );
  await upsertState(accountId, RECEIPTS_KEY, next);
};

const listReceiptRecords = async (accountId, query) => {
  const receiptRow = await getState(accountId, RECEIPTS_KEY);
  const list = Array.isArray(receiptRow?.payload) ? receiptRow.payload : [];
  const keyword = String(query.keyword || query.q || '').trim().toLowerCase();
  const withImageOnly = String(query.withImage || '').toLowerCase() === 'true';
  const limitRaw = Number(query.limit || 30);
  const limit = Number.isFinite(limitRaw) ? Math.min(100, Math.max(1, Math.floor(limitRaw))) : 30;

  return list
    .filter((item) => {
      if (!item || typeof item !== 'object') return false;
      if (withImageOnly && !item.nvrPhotoDataUrl) return false;
      if (!keyword) return true;
      return [item.receiptNo, item.cashier, item.note, item.nvrCaptureMessage]
        .map((v) => String(v || '').toLowerCase())
        .some((v) => v.includes(keyword));
    })
    .sort((a, b) => String(b.printedAt || b.createdAt || '').localeCompare(String(a.printedAt || a.createdAt || '')))
    .slice(0, limit)
    .map((item) => ({
      receiptNo: String(item.receiptNo || ''),
      printedAt: item.printedAt || item.createdAt || '',
      cashier: item.cashier || '',
      total: Number(item.total || 0),
      itemCount: Number(item.itemCount || 0),
      nvrCaptureStatus: item.nvrCaptureStatus || '',
      nvrCaptureMessage: item.nvrCaptureMessage || '',
      hasImage: Boolean(item.nvrPhotoDataUrl),
      nvrPhotoDataUrl: item.nvrPhotoDataUrl || '',
    }));
};

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,x-api-key,authorization,x-enroll-token');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.status(204).end();
    return;
  }

  const missing = ensureEnv();
  if (missing.length > 0) {
    json(res, 500, { ok: false, message: `Missing env: ${missing.join(', ')}` });
    return;
  }

  const accountId =
    String(req.query.accountId || '').trim().toUpperCase() ||
    String(parseBody(req).accountId || '').trim().toUpperCase();
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

  try {
    if (req.method === 'GET' && String(req.query.mode || '').toLowerCase() === 'records') {
      const records = await listReceiptRecords(accountId, req.query || {});
      json(res, 200, { ok: true, records });
      return;
    }

    if (req.method === 'GET') {
      const row = await getState(accountId, JOBS_KEY);
      const jobs = Array.isArray(row?.payload) ? row.payload : [];
      const now = new Date().toISOString();
      const target = jobs
        .filter((j) => j && j.status === 'PENDING')
        .sort((a, b) => String(a.createdAt || '').localeCompare(String(b.createdAt || '')))[0];
      if (!target) {
        json(res, 200, { ok: true, job: null });
        return;
      }
      const nextJobs = jobs.map((j) =>
        j.id === target.id ? { ...j, status: 'PROCESSING', updatedAt: now, message: 'EXE处理中' } : j
      );
      await upsertState(accountId, JOBS_KEY, nextJobs);
      json(res, 200, { ok: true, job: { ...target, status: 'PROCESSING', updatedAt: now } });
      return;
    }

    if (req.method !== 'POST') {
      json(res, 405, { ok: false, message: 'Method not allowed' });
      return;
    }

    const body = parseBody(req);
    const jobId = String(body.jobId || '').trim();
    const receiptNo = String(body.receiptNo || '').trim();
    const success = Boolean(body.success);
    const message = String(body.message || '').trim();
    const imageDataUrl = String(body.imageDataUrl || '').trim();
    if (!jobId || !receiptNo) {
      json(res, 400, { ok: false, message: 'Missing jobId or receiptNo' });
      return;
    }
    const row = await getState(accountId, JOBS_KEY);
    const jobs = Array.isArray(row?.payload) ? row.payload : [];
    const now = new Date().toISOString();
    const nextJobs = jobs.map((j) =>
      j.id === jobId
        ? {
            ...j,
            status: success ? 'SUCCESS' : 'FAILED',
            updatedAt: now,
            message: message || (success ? '抓拍成功' : '抓拍失败'),
          }
        : j
    );
    await upsertState(accountId, JOBS_KEY, nextJobs);
    await patchReceiptCapture(accountId, receiptNo, {
      nvrCaptureStatus: success ? 'SUCCESS' : 'FAILED',
      nvrCaptureMessage: message || (success ? '已由本地EXE抓拍' : '本地EXE抓拍失败'),
      nvrCaptureSource: 'NVR',
      nvrPhotoDataUrl: success ? imageDataUrl : undefined,
    });
    json(res, 200, { ok: true });
  } catch (error) {
    json(res, 500, { ok: false, message: String(error?.message || 'capture task error') });
  }
}
