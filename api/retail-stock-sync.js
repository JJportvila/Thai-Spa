const json = (res, status, payload) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.status(status).send(JSON.stringify(payload));
};

const REQUIRED_ENV = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
const AGENT_TOKEN_KEY = 'merchant_proxy_agent_token';
const PRODUCT_STATE_KEY = 'warehouse_products';
const APPLIED_KEY = 'retail_stock_applied_receipts';

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

const keyText = (v) => String(v || '').trim().toLowerCase();

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
  const receiptNo = String(body.receiptNo || '').trim();
  const mode = String(body.mode || 'SALE').toUpperCase() === 'REFUND' ? 'REFUND' : 'SALE';
  const items = Array.isArray(body.items) ? body.items : [];
  if (!accountId || !receiptNo) {
    json(res, 400, { ok: false, message: 'Missing accountId or receiptNo' });
    return;
  }

  const keyAuthOk = isApiKeyAuthOk(req);
  const enrollAuthOk = keyAuthOk ? false : await isEnrollTokenAuthOk(req, accountId);
  if (!keyAuthOk && !enrollAuthOk) {
    json(res, 401, { ok: false, message: 'Unauthorized' });
    return;
  }

  try {
    const appliedRow = await getState(accountId, APPLIED_KEY);
    const appliedList = Array.isArray(appliedRow?.payload) ? appliedRow.payload : [];
    if (appliedList.includes(receiptNo)) {
      json(res, 200, { ok: true, alreadyApplied: true });
      return;
    }

    const productRow = await getState(accountId, PRODUCT_STATE_KEY);
    const products = Array.isArray(productRow?.payload) ? productRow.payload : [];
    const nextProducts = products.map((product) => ({ ...product }));

    const findMatch = (item) =>
      nextProducts.find((p) => {
        const pid = keyText(p.id || p.code);
        const pbc = keyText(p.barcode);
        const ptitle = keyText(p.title || p.name);
        return (
          (keyText(item.code || item.productId || item.id) && keyText(item.code || item.productId || item.id) === pid) ||
          (keyText(item.barcode) && keyText(item.barcode) === pbc) ||
          (keyText(item.title || item.name) && keyText(item.title || item.name) === ptitle)
        );
      });

    for (const item of items) {
      const qty = Math.max(0, Number(item.quantity || 0));
      if (qty <= 0) continue;
      const matched = findMatch(item);
      if (!matched) continue;
      if (mode === 'REFUND') {
        matched.stock = Math.max(0, Number(matched.stock || 0) + qty);
      } else {
        matched.stock = Math.max(0, Number(matched.stock || 0) - qty);
      }
    }

    await upsertState(accountId, PRODUCT_STATE_KEY, nextProducts);
    await upsertState(accountId, APPLIED_KEY, [receiptNo, ...appliedList].slice(0, 5000));
    json(res, 200, { ok: true, alreadyApplied: false });
  } catch (error) {
    json(res, 500, { ok: false, message: String(error?.message || error) });
  }
}
