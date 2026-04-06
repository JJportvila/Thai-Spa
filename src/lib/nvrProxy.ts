export const isPrivateHost = (hostname: string) => {
  const host = String(hostname || '').toLowerCase();
  if (host === 'localhost' || host === '127.0.0.1') return true;
  if (/^10\./.test(host)) return true;
  if (/^192\.168\./.test(host)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) return true;
  return false;
};

export const buildNvrProxyUrl = (rawUrl: string) => {
  const normalized = String(rawUrl || '').trim();
  if (!normalized) return '';
  return `/api/nvr-proxy?url=${encodeURIComponent(normalized)}`;
};

export const buildNvrProxyFallbackUrl = (rawUrl: string) => {
  const normalized = String(rawUrl || '').trim();
  if (!normalized) return '';
  const base = String((import.meta as any)?.env?.VITE_NVR_PROXY_BASE || '').trim().replace(/\/$/, '');
  if (!base) return '';
  if (typeof window !== 'undefined' && base === window.location.origin.replace(/\/$/, '')) return '';
  return `${base}/api/nvr-proxy?url=${encodeURIComponent(normalized)}`;
};

export const shouldUseServerProxy = (rawUrl: string) => {
  if (typeof window === 'undefined') return false;
  const normalized = String(rawUrl || '').trim();
  if (!normalized) return false;
  try {
    const parsed = new URL(normalized);
    if (isPrivateHost(parsed.hostname)) return false;
    return true;
  } catch {
    return false;
  }
};
