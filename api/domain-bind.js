const DEFAULT_RECORD_TYPE = 'A';
const DEFAULT_RECORD_CONTENT = '76.76.21.21';

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

const vercelHeaders = () => ({
  Authorization: `Bearer ${process.env.VERCEL_API_TOKEN}`,
  'Content-Type': 'application/json',
});

const cloudflareHeaders = () => ({
  Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
  'Content-Type': 'application/json',
});

const ensureEnv = () => {
  const required = [
    'VERCEL_API_TOKEN',
    'VERCEL_TEAM_ID',
    'CLOUDFLARE_API_TOKEN',
    'CLOUDFLARE_ZONE_ID',
  ];
  const missing = required.filter((key) => !process.env[key]);
  return missing;
};

const addDomainToVercelProject = async (domain, projectName) => {
  const response = await fetch(
    `https://api.vercel.com/v10/projects/${encodeURIComponent(projectName)}/domains?teamId=${encodeURIComponent(process.env.VERCEL_TEAM_ID)}`,
    {
      method: 'POST',
      headers: vercelHeaders(),
      body: JSON.stringify({ name: domain }),
    }
  );

  if (response.ok) {
    return { ok: true, data: await response.json() };
  }

  const payload = await response.json().catch(() => ({}));
  const message = payload?.error?.message || payload?.message || `Vercel API ${response.status}`;

  if (response.status === 409 && /already/i.test(message)) {
    return { ok: true, data: payload, alreadyExists: true };
  }

  return { ok: false, message };
};

const upsertCloudflareRecord = async (domain, type, content) => {
  const search = await fetch(
    `https://api.cloudflare.com/client/v4/zones/${encodeURIComponent(process.env.CLOUDFLARE_ZONE_ID)}/dns_records?type=${encodeURIComponent(type)}&name=${encodeURIComponent(domain)}`,
    {
      headers: cloudflareHeaders(),
    }
  );

  const searchPayload = await search.json().catch(() => ({}));
  if (!search.ok || searchPayload?.success === false) {
    return {
      ok: false,
      message: searchPayload?.errors?.[0]?.message || `Cloudflare search failed (${search.status})`,
    };
  }

  const existing = Array.isArray(searchPayload.result) ? searchPayload.result[0] : null;
  const body = {
    type,
    name: domain,
    content,
    ttl: 1,
    proxied: false,
  };

  const response = await fetch(
    existing
      ? `https://api.cloudflare.com/client/v4/zones/${encodeURIComponent(process.env.CLOUDFLARE_ZONE_ID)}/dns_records/${existing.id}`
      : `https://api.cloudflare.com/client/v4/zones/${encodeURIComponent(process.env.CLOUDFLARE_ZONE_ID)}/dns_records`,
    {
      method: existing ? 'PUT' : 'POST',
      headers: cloudflareHeaders(),
      body: JSON.stringify(body),
    }
  );

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    return {
      ok: false,
      message: payload?.errors?.[0]?.message || `Cloudflare write failed (${response.status})`,
    };
  }

  return { ok: true, data: payload.result, updated: Boolean(existing) };
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    json(res, 405, { ok: false, message: 'Method not allowed' });
    return;
  }

  const missing = ensureEnv();
  if (missing.length > 0) {
    json(res, 500, {
      ok: false,
      message: `缺少服务端环境变量：${missing.join(', ')}`,
    });
    return;
  }

  const domain = normalizeDomain(req.body?.domain);
  const projectName = String(req.body?.projectName || '').trim();
  const recordType = String(req.body?.recordType || DEFAULT_RECORD_TYPE).trim().toUpperCase();
  const recordContent = String(req.body?.recordContent || DEFAULT_RECORD_CONTENT).trim();

  if (!domain || !projectName) {
    json(res, 400, { ok: false, message: '缺少域名或目标项目名' });
    return;
  }

  if (!['A', 'CNAME'].includes(recordType)) {
    json(res, 400, { ok: false, message: '仅支持 A 或 CNAME 记录' });
    return;
  }

  try {
    const vercelResult = await addDomainToVercelProject(domain, projectName);
    if (!vercelResult.ok) {
      json(res, 502, { ok: false, message: `Vercel 绑定失败：${vercelResult.message}` });
      return;
    }

    const cloudflareResult = await upsertCloudflareRecord(domain, recordType, recordContent);
    if (!cloudflareResult.ok) {
      json(res, 502, { ok: false, message: `Cloudflare 记录写入失败：${cloudflareResult.message}` });
      return;
    }

    json(res, 200, {
      ok: true,
      message: '域名已提交绑定，等待证书签发与验证',
      domain,
      projectName,
      dns: {
        type: recordType,
        content: recordContent,
        updated: cloudflareResult.updated,
      },
      vercelAlreadyBound: Boolean(vercelResult.alreadyExists),
    });
  } catch (error) {
    json(res, 500, { ok: false, message: String(error?.message || '域名绑定失败') });
  }
}
