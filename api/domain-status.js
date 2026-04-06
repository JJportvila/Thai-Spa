const json = (res, status, payload) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.status(status).send(JSON.stringify(payload));
};

const normalizeDomain = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/\.+$/, '');

const probe = async (url) => {
  const response = await fetch(url, {
    method: 'GET',
    redirect: 'follow',
    cache: 'no-store',
    signal: AbortSignal.timeout(8000),
  });
  return {
    ok: response.ok,
    status: response.status,
    finalUrl: response.url,
  };
};

export default async function handler(req, res) {
  const domain = normalizeDomain(req.query.domain);
  if (!domain) {
    json(res, 400, { ok: false, message: '缺少域名参数' });
    return;
  }

  try {
    const httpsResult = await probe(`https://${domain}`);
    json(res, 200, {
      ok: true,
      httpsReady: true,
      message: `HTTPS 可访问，证书已生效（${httpsResult.status}）`,
      finalUrl: httpsResult.finalUrl,
    });
    return;
  } catch (httpsError) {
    try {
      const httpResult = await probe(`http://${domain}`);
      json(res, 200, {
        ok: true,
        httpsReady: false,
        message: `域名已解析，但 HTTPS 证书可能仍在签发中（HTTP ${httpResult.status}）`,
        finalUrl: httpResult.finalUrl,
      });
      return;
    } catch (httpError) {
      json(res, 200, {
        ok: false,
        httpsReady: false,
        message: `域名暂时不可访问：${String(httpsError?.message || httpError?.message || 'unknown')}`,
      });
    }
  }
}
