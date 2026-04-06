const json = (res, status, payload) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.status(status).send(JSON.stringify(payload));
};

const REQUIRED_ENV = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
const AGENT_TOKEN_KEY = 'merchant_proxy_agent_token';
const PRODUCT_STATE_KEY = 'warehouse_products';

const ensureEnv = () => REQUIRED_ENV.filter((key) => !process.env[key]);

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

const defaultProducts = [
  { code: 'P-001', barcode: '678123456789', title: 'Vanuatu Water 500ml', price: 200, stock: 240 },
  { code: 'P-002', barcode: '678987654321', title: 'Biscuits 100g', price: 180, stock: 120 },
  { code: 'P-003', barcode: '678555444333', title: 'Tusker Beer', price: 350, stock: 500 },
];

const normalizeProducts = (list) =>
  (Array.isArray(list) ? list : [])
    .map((item) => ({
      code: String(item.id || item.code || '').trim(),
      barcode: String(item.barcode || '').trim(),
      title: String(item.title || item.name || '').trim(),
      price: Math.max(0, Number(item.price || item.sellingPrice || item.unitPrice || 0)),
      stock: Math.max(0, Number(item.stock || 0)),
    }))
    .filter((item) => item.code && item.title)
    .slice(0, 2000);

export default async function handler(req, res) {
  const missing = ensureEnv();
  if (missing.length > 0) {
    json(res, 500, { ok: false, message: `Missing env: ${missing.join(', ')}` });
    return;
  }
  if (req.method !== 'GET') {
    json(res, 405, { ok: false, message: 'Method not allowed' });
    return;
  }

  const accountId = String(req.query.accountId || '').trim().toUpperCase();
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
    const row = await getState(accountId, PRODUCT_STATE_KEY);
    const normalized = normalizeProducts(row?.payload);
    json(res, 200, {
      ok: true,
      products: normalized.length > 0 ? normalized : defaultProducts,
      source: normalized.length > 0 ? 'cloud' : 'fallback',
      updatedAt: row?.updated_at || new Date().toISOString(),
    });
  } catch (error) {
    json(res, 200, {
      ok: true,
      products: defaultProducts,
      source: 'fallback',
      message: String(error?.message || 'fallback'),
      updatedAt: new Date().toISOString(),
    });
  }
}

