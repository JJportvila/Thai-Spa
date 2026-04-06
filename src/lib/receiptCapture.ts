import { formatVT } from './utils';
import { buildNvrProxyFallbackUrl, buildNvrProxyUrl, isPrivateHost, shouldUseServerProxy } from './nvrProxy';
import { getNvrCaptureSettings, patchReceiptRecord } from './receiptStore';
const FALLBACK_HTTPS_PROXY = String((import.meta as any)?.env?.VITE_RTSP_PROXY_FALLBACK_HTTPS || '').trim().replace(/\/$/, '');

export interface ReceiptCaptureItem {
  title: string;
  quantity: number;
}

const shortenLine = (text: string, maxChars: number) => {
  const value = String(text || '');
  if (value.length <= maxChars) return value;
  return `${value.slice(0, Math.max(0, maxChars - 1))}…`;
};

const drawRoundedRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) => {
  const safeRadius = Math.max(0, Math.min(radius, width / 2, height / 2));
  const anyCtx = ctx as any;
  if (typeof anyCtx.roundRect === 'function') {
    ctx.beginPath();
    anyCtx.roundRect(x, y, width, height, safeRadius);
    return;
  }
  ctx.beginPath();
  ctx.moveTo(x + safeRadius, y);
  ctx.arcTo(x + width, y, x + width, y + height, safeRadius);
  ctx.arcTo(x + width, y + height, x, y + height, safeRadius);
  ctx.arcTo(x, y + height, x, y, safeRadius);
  ctx.arcTo(x, y, x + width, y, safeRadius);
  ctx.closePath();
};

const formatCaptureError = (error: any) => {
  const name = String(error?.name || '');
  const message = String(error?.message || 'unknown');
  if (message.includes('Target responded with 503')) {
    return '隧道离线（503），请先重新启动 HTTPS 隧道后再抓拍';
  }
  if (message.includes('Target responded with 408')) {
    return '隧道请求超时（408），请重试或检查本机网络与代理状态';
  }
  if (message === 'Failed to fetch') {
    return '网络请求失败：请检查当前域名/API 路由、摄像头 URL 可达性，或改用 RTSP 本地代理';
  }
  if (name === 'NotAllowedError') return '浏览器未授予摄像头权限';
  if (name === 'NotReadableError') return '摄像头被其他程序占用';
  if (name === 'OverconstrainedError') return '当前摄像头不支持所选参数';
  if (name === 'NotFoundError') return '未找到可用摄像头设备';
  if (name === 'AbortError') return '摄像头启动被中断';
  return message;
};

const getTunnelHeaders = (url: string) => {
  try {
    const parsed = new URL(url, window.location.origin);
    if (parsed.hostname.endsWith('.loca.lt')) {
      return { 'bypass-tunnel-reminder': '1' };
    }
  } catch {}
  return undefined;
};

export const captureReceiptPhoto = async ({
  accountId,
  invoiceNo,
  items,
  amount,
  nvrSettings,
}: {
  accountId?: string;
  invoiceNo: string;
  items: ReceiptCaptureItem[];
  amount: number;
  nvrSettings?: ReturnType<typeof getNvrCaptureSettings>;
}): Promise<{ ok: boolean; message: string; imageUrl?: string } | null> => {
  if (!accountId) return null;
  const nvr = nvrSettings || getNvrCaptureSettings(accountId);
  if (!nvr.enabled) return null;

  const applyTemplate = (template: string) => {
    const encodedDate = encodeURIComponent(new Date().toISOString());
    return String(template || '')
      .replaceAll('{receiptNo}', encodeURIComponent(invoiceNo))
      .replaceAll('{amount}', encodeURIComponent(Math.abs(amount).toFixed(2)))
      .replaceAll('{datetime}', encodedDate)
      .replaceAll('{accountId}', encodeURIComponent(accountId || ''))
      .replaceAll('{itemCount}', encodeURIComponent(String(items.reduce((sum, item) => sum + item.quantity, 0))))
      .replaceAll('{username}', encodeURIComponent(String(nvr.username || '')))
      .replaceAll('{password}', encodeURIComponent(String(nvr.password || '')));
  };

    const buildRtspSnapshotUrl = () => {
      const rawProxyBase = String(nvr.rtspProxyBaseUrl || 'http://127.0.0.1:9194').trim().replace(/\/$/, '');
      if (!rawProxyBase) return '';
      const proxyBase =
        typeof window !== 'undefined' &&
        window.location.protocol === 'https:' &&
        /^http:\/\/(127\.0\.0\.1|localhost|192\.168\.)/i.test(rawProxyBase) &&
        FALLBACK_HTTPS_PROXY
          ? FALLBACK_HTTPS_PROXY
          : rawProxyBase;
      const rtspTarget = applyTemplate(String(nvr.rtspUrl || ''));
      if (!rtspTarget) return '';
      return `${proxyBase}/snapshot?rtsp=${encodeURIComponent(rtspTarget)}`;
    };

    const buildFetchUrl = () => {
      if (nvr.protocol === 'RTSP_PROXY') {
        const snapshotUrl = buildRtspSnapshotUrl();
        if (!snapshotUrl) return '';
        return shouldUseServerProxy(snapshotUrl) ? buildNvrProxyUrl(snapshotUrl) : snapshotUrl;
      }
      const targetUrl = applyTemplate(nvr.snapshotUrl);
      return shouldUseServerProxy(targetUrl) ? buildNvrProxyUrl(targetUrl) : targetUrl;
    };

  try {
    let stage = 'init';
    await patchReceiptRecord(accountId, invoiceNo, {
      nvrCaptureStatus: 'PENDING',
      nvrCaptureMessage: `正在抓拍（${nvr.protocol === 'RTSP_PROXY' ? 'RTSP本地代理' : nvr.source || 'NVR'}）...`,
      nvrCaptureSource: nvr.source || 'NVR',
      nvrCaptureAt: new Date().toISOString(),
    });

    const drawBlobToCanvas = async (blob: Blob) => {
      stage = 'decode';
      const objectUrl = URL.createObjectURL(blob);
      try {
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
          const el = new Image();
          el.onload = () => resolve(el);
          el.onerror = () => reject(new Error('image decode failed'));
          el.src = objectUrl;
        });
        const canvas = document.createElement('canvas');
        const srcWidth = img.naturalWidth || img.width || 1280;
        const srcHeight = img.naturalHeight || img.height || 720;
        const maxWidth = 1280;
        const scale = srcWidth > maxWidth ? maxWidth / srcWidth : 1;
        canvas.width = Math.max(640, Math.round(srcWidth * scale));
        canvas.height = Math.max(360, Math.round(srcHeight * scale));
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('canvas failed');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        return canvas;
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    };

    const captureFromCamera = async (constraints: MediaStreamConstraints) => {
      if (!window.isSecureContext) {
        throw new Error('当前环境不是安全上下文，请使用 HTTPS 或 localhost 访问');
      }
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }
      try {
        const video = document.createElement('video');
        video.srcObject = stream;
        video.muted = true;
        video.playsInline = true;
        await video.play();
        if (!video.videoWidth || !video.videoHeight) {
          await new Promise<void>((resolve, reject) => {
            const timer = window.setTimeout(() => reject(new Error('camera metadata timeout')), 1800);
            video.onloadedmetadata = () => {
              window.clearTimeout(timer);
              resolve();
            };
          });
        }
        await new Promise((resolve) => window.setTimeout(resolve, 120));
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 1280;
        canvas.height = video.videoHeight || 720;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('camera frame failed');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        return canvas;
      } finally {
        stream.getTracks().forEach((track) => track.stop());
      }
    };

    let canvas: HTMLCanvasElement;
    if (nvr.source === 'BUILTIN' || nvr.source === 'USB') {
      stage = 'camera';
      const constraints: MediaStreamConstraints =
        nvr.source === 'USB'
          ? {
              video: nvr.usbDeviceId ? { deviceId: { exact: nvr.usbDeviceId } } : true,
              audio: false,
            }
          : {
              video: { facingMode: { ideal: 'environment' } },
              audio: false,
            };
      canvas = await captureFromCamera(constraints);
    } else {
      stage = 'fetch';
      const nvrUrl = buildFetchUrl();
      if (!nvrUrl) {
        throw new Error(nvr.protocol === 'RTSP_PROXY' ? '未配置 RTSP 地址或本地代理地址' : '未配置 NVR 抓图 URL');
      }
      if (!shouldUseServerProxy(nvrUrl)) {
        const parsed = new URL(nvrUrl, window.location.origin);
        const appHost = window.location.hostname.toLowerCase();
        const appIsLocal =
          appHost === 'localhost' || appHost === '127.0.0.1' || /^192\.168\./.test(appHost);
        if (!appIsLocal && isPrivateHost(parsed.hostname)) {
          throw new Error('当前为线上域名，直连内网摄像头容易失败，请改用 RTSP 本地代理或公网抓图地址');
        }
        if (window.isSecureContext && parsed.protocol === 'http:' && isPrivateHost(parsed.hostname)) {
          throw new Error('HTTPS 页面无法直接访问内网 HTTP 摄像头，请改用 RTSP 本地代理或公网 HTTPS 抓图地址');
        }
      }
      const doFetch = async (url: string) => {
        const controller = new AbortController();
        const timer = window.setTimeout(() => controller.abort(), 10000);
        return fetch(url, { cache: 'no-store', signal: controller.signal, headers: getTunnelHeaders(url) }).finally(() => {
          window.clearTimeout(timer);
        });
      };

      let response = await doFetch(nvrUrl);
      if (
        !response.ok &&
        nvr.protocol === 'RTSP_PROXY' &&
        nvrUrl.startsWith('/api/nvr-proxy?') &&
        [408, 500, 502, 503, 504].includes(response.status)
      ) {
        const directRtspUrl = buildRtspSnapshotUrl();
        if (directRtspUrl) {
          response = await doFetch(directRtspUrl);
        }
      }
      if (!response.ok && shouldUseServerProxy(applyTemplate(nvr.snapshotUrl))) {
        const fallbackUrl = buildNvrProxyFallbackUrl(applyTemplate(nvr.snapshotUrl));
        if (fallbackUrl) {
          response = await fetch(fallbackUrl, { cache: 'no-store', headers: getTunnelHeaders(fallbackUrl) });
        }
      }
      if (!response.ok) {
        let detail = '';
        try {
          detail = await response.text();
        } catch {}
        throw new Error(detail || `NVR ${response.status}`);
      }
      const blob = await response.blob();
      canvas = await drawBlobToCanvas(blob);
    }

    stage = 'compose';
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas failed');

    let composeHint = '';
    try {
      const summaryItems = items.slice(0, 2).map((item) => `${shortenLine(item.title, 14)} x${item.quantity}`);
      const lines = [
        `单号 ${invoiceNo}`,
        `${new Date().toLocaleString()}`,
        ...summaryItems,
        `合计 ${formatVT(Math.abs(amount))}`,
      ];
      const fontSize = Math.max(13, Math.round(canvas.width * 0.013));
      const lineHeight = Math.max(20, Math.round(fontSize * 1.28));
      const paddingX = Math.max(10, Math.round(canvas.width * 0.009));
      const paddingTop = 12;
      const paddingBottom = 10;
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${fontSize}px sans-serif`;

      const textWidths = lines.map((line) => ctx.measureText(line).width);
      const panelWidth = Math.min(
        canvas.width * 0.28,
        Math.max(...textWidths) + paddingX * 2
      );
      const panelHeight = paddingTop + paddingBottom + lineHeight * lines.length;
      const panelX = Math.max(10, Math.round(canvas.width * 0.012));
      const panelY = canvas.height - panelHeight - Math.max(10, Math.round(canvas.height * 0.012));

      ctx.fillStyle = 'rgba(15,23,42,0.58)';
      drawRoundedRect(ctx, panelX, panelY, panelWidth, panelHeight, 12);
      ctx.fill();

      ctx.strokeStyle = 'rgba(255,255,255,0.18)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      lines.forEach((line, idx) => {
        const y = panelY + paddingTop + idx * lineHeight + fontSize;
        ctx.fillText(line, panelX + paddingX, y);
      });
    } catch {
      composeHint = '（信息卡兼容降级）';
    }

    stage = 'encode';
    let dataUrl = '';
    for (const quality of [0.72, 0.62, 0.52]) {
      try {
        dataUrl = canvas.toDataURL('image/jpeg', quality);
        if (dataUrl && dataUrl.length > 32) break;
      } catch {}
    }
    if (!dataUrl) {
      throw new Error('图片编码失败');
    }
    stage = 'persist';
    const patched = await patchReceiptRecord(accountId, invoiceNo, {
      nvrPhotoDataUrl: dataUrl,
      nvrCaptureStatus: 'SUCCESS',
      nvrCaptureMessage: `抓拍成功${composeHint}（${Math.round(dataUrl.length / 1024)}KB）`,
      nvrCaptureSource: nvr.source || 'NVR',
      nvrCaptureAt: new Date().toISOString(),
    });
    if (!patched) {
      return {
        ok: true,
        message: `抓拍成功${composeHint}（临时预览，写库稍后重试）`,
        imageUrl: dataUrl,
      };
    }
    return { ok: true, message: '已完成小票抓拍留档', imageUrl: dataUrl };
  } catch (error: any) {
    const msg = `抓拍失败: ${formatCaptureError(error)}`;
    await patchReceiptRecord(accountId, invoiceNo, {
      nvrCaptureStatus: 'FAILED',
      nvrCaptureMessage: msg,
      nvrCaptureSource: nvr.source || 'NVR',
      nvrCaptureAt: new Date().toISOString(),
    });
    return { ok: false, message: msg };
  }
};


