import React, { useEffect, useMemo, useState } from 'react';
import {
  Copy,
  ExternalLink,
  Globe,
  Link2,
  LoaderCircle,
  Plus,
  Power,
  Store,
  WandSparkles,
} from 'lucide-react';
import {
  MerchantDefinition,
  MerchantType,
  getMerchantAccountId,
  getMerchantBrandName,
  getMerchantLogoText,
  getMerchantPublicUrl,
  getMerchantRoutePath,
  getMerchantTypeLabel,
  normalizeMerchantDomain,
  savePlatformMerchants,
  syncPlatformMerchants,
} from '../lib/merchantStore';

const DEFAULT_PROJECT_NAME = 'stret-pos';
const DEFAULT_RECORD_TYPE = 'A';
const DEFAULT_RECORD_CONTENT = '76.76.21.21';
const PROJECT_OPTIONS = [
  { value: 'stret-pos', label: 'stret-pos（主系统）' },
  { value: 'solar-sales-system', label: 'solar-sales-system（太阳能项目）' },
  { value: 'mobile-repair-shop', label: 'mobile-repair-shop（维修项目）' },
];

type BindState = Record<string, boolean>;

const MerchantManagementPage: React.FC = () => {
  const [merchants, setMerchants] = useState<MerchantDefinition[]>([]);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [type, setType] = useState<MerchantType>('retail');
  const [customDomain, setCustomDomain] = useState('');
  const [brandName, setBrandName] = useState('');
  const [logoText, setLogoText] = useState('');
  const [saveHint, setSaveHint] = useState('');
  const [bindHint, setBindHint] = useState('');
  const [bindingMap, setBindingMap] = useState<BindState>({});
  const [bindDomain, setBindDomain] = useState('');
  const [bindProjectName, setBindProjectName] = useState(DEFAULT_PROJECT_NAME);

  useEffect(() => {
    void (async () => {
      setMerchants(await syncPlatformMerchants());
    })();
  }, []);

  const normalizedSlug = useMemo(
    () =>
      slug
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-'),
    [slug]
  );

  const normalizedDomain = useMemo(() => normalizeMerchantDomain(customDomain), [customDomain]);

  const flashHint = (text: string) => {
    setSaveHint(text);
    window.setTimeout(() => setSaveHint(''), 2000);
  };

  const flashBindHint = (text: string) => {
    setBindHint(text);
    window.setTimeout(() => setBindHint(''), 3000);
  };

  const updateMerchantRecord = async (
    merchant: MerchantDefinition,
    patch: Partial<MerchantDefinition>
  ) => {
    const next = merchants.map(item =>
      item.type === merchant.type && item.slug === merchant.slug ? { ...item, ...patch } : item
    );
    setMerchants(next);
    await savePlatformMerchants(next);
  };

  const copyValue = async (value: string, successText: string) => {
    try {
      await navigator.clipboard.writeText(value);
      flashHint(successText);
    } catch {
      flashHint(value);
    }
  };

  const checkDomainStatus = async (domain: string, merchant?: MerchantDefinition) => {
    const normalized = normalizeMerchantDomain(domain);
    if (!normalized) return;

    try {
      const response = await fetch(`/api/domain-status?domain=${encodeURIComponent(normalized)}`, {
        cache: 'no-store',
      });
      const payload = await response.json().catch(() => ({
        ok: false,
        message: '域名状态检测失败',
      }));

      if (merchant) {
        await updateMerchantRecord(merchant, {
          domainBindingStatus: payload.httpsReady ? 'success' : payload.ok ? 'binding' : 'failed',
          domainBindingMessage: payload.message || '域名状态未知',
        });
      }

      if (payload.message) {
        flashBindHint(payload.message);
      }
    } catch (error: any) {
      if (merchant) {
        await updateMerchantRecord(merchant, {
          domainBindingStatus: 'failed',
          domainBindingMessage: `域名状态检测失败：${String(error?.message || 'unknown')}`,
        });
      }
      flashBindHint(`域名状态检测失败：${String(error?.message || 'unknown')}`);
    }
  };

  const runDomainBinding = async (
    domain: string,
    projectName = DEFAULT_PROJECT_NAME,
    merchant?: MerchantDefinition
  ) => {
    const normalized = normalizeMerchantDomain(domain);
    if (!normalized) {
      flashBindHint('请先填写需要绑定的域名');
      return;
    }

    const bindKey = `${projectName}:${normalized}`;
    setBindingMap(prev => ({ ...prev, [bindKey]: true }));

    if (merchant) {
      await updateMerchantRecord(merchant, {
        domainProjectName: projectName,
        domainBindingStatus: 'binding',
        domainBindingMessage: '绑定中...',
      });
    }

    try {
      const response = await fetch('/api/domain-bind', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: normalized,
          projectName,
          recordType: DEFAULT_RECORD_TYPE,
          recordContent: DEFAULT_RECORD_CONTENT,
        }),
      });

      const payload = await response.json().catch(() => ({
        ok: false,
        message: '域名绑定接口返回异常',
      }));

      if (!response.ok || !payload.ok) {
        if (merchant) {
          await updateMerchantRecord(merchant, {
            domainProjectName: projectName,
            domainBindingStatus: 'failed',
            domainBindingMessage: payload.message || '域名绑定失败',
          });
        }
        flashBindHint(payload.message || '域名绑定失败');
        return;
      }

      if (merchant) {
        await updateMerchantRecord(merchant, {
          domainProjectName: projectName,
          domainBindingStatus: 'binding',
          domainBindingMessage: payload.message || '已提交绑定，等待证书签发',
        });
      }
      flashBindHint(payload.message || `${normalized} 已提交到 ${projectName}`);
      if (merchant) {
        await checkDomainStatus(normalized, merchant);
      }
    } catch (error: any) {
      const message = `域名绑定失败：${String(error?.message || 'unknown')}`;
      if (merchant) {
        await updateMerchantRecord(merchant, {
          domainProjectName: projectName,
          domainBindingStatus: 'failed',
          domainBindingMessage: message,
        });
      }
      flashBindHint(message);
    } finally {
      setBindingMap(prev => ({ ...prev, [bindKey]: false }));
    }
  };

  const addMerchant = async () => {
    if (!name.trim() || !normalizedSlug) {
      flashHint('请先填写商户名称和访问标识');
      return;
    }

    const slugExists = merchants.some(item => item.type === type && item.slug === normalizedSlug);
    if (slugExists) {
      flashHint('该商户标识已存在，请更换');
      return;
    }

    const domainExists = normalizedDomain
      ? merchants.some(item => normalizeMerchantDomain(item.customDomain) === normalizedDomain)
      : false;
    if (domainExists) {
      flashHint('该自定义域名已被其他商户使用');
      return;
    }

    const merchant: MerchantDefinition = {
      name: name.trim(),
      brandName: brandName.trim() || name.trim(),
      logoText: (logoText.trim() || normalizedSlug.slice(0, 3)).toUpperCase(),
      slug: normalizedSlug,
      type,
      accountId: getMerchantAccountId(type, normalizedSlug),
      customDomain: normalizedDomain,
      status: 'active',
      domainProjectName: DEFAULT_PROJECT_NAME,
      domainBindingStatus: normalizedDomain ? 'binding' : 'idle',
      domainBindingMessage: normalizedDomain ? '已提交自动绑定' : '',
    };

    const next = [merchant, ...merchants];
    setMerchants(next);
    await savePlatformMerchants(next);

    if (normalizedDomain) {
      await runDomainBinding(normalizedDomain, DEFAULT_PROJECT_NAME, merchant);
    }

    setName('');
    setSlug('');
    setCustomDomain('');
    setBrandName('');
    setLogoText('');
    setType('retail');
    flashHint(normalizedDomain ? '商户已创建，并已提交域名自动绑定' : '商户已创建');
  };

  const toggleMerchantStatus = async (merchant: MerchantDefinition) => {
    const next = merchants.map(item =>
      item.type === merchant.type && item.slug === merchant.slug
        ? { ...item, status: item.status === 'disabled' ? 'active' : 'disabled' }
        : item
    );
    setMerchants(next);
    await savePlatformMerchants(next);
    flashHint(merchant.status === 'disabled' ? '商户已重新启用' : '商户已停用');
  };

  const currentBindKey = `${bindProjectName}:${normalizeMerchantDomain(bindDomain)}`;

  return (
    <div className="space-y-4 sm:space-y-6 pb-12">
      <div className="ui-card rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
        <h2 className="flex items-center gap-3 text-xl font-black text-slate-900 sm:text-2xl">
          <Store className="text-[#1a237e]" /> 商户管理
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          平台可在这里开通零售商、批发商入口，并为每个商户配置独立路径、品牌信息和域名。
        </p>
        {bindHint && (
          <div className="mt-3 rounded-2xl border border-[#dbe7ff] bg-[#1a237e] px-4 py-3 text-sm font-bold text-[#1a237e]">
            {bindHint}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="ui-card overflow-x-auto rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="min-w-[1380px]">
            <div className="grid grid-cols-[100px_160px_150px_130px_170px_220px_1fr_160px_210px] gap-2 border-b border-slate-200 pb-2 text-[11px] font-black uppercase tracking-widest text-slate-500">
              <div>类型</div>
              <div>商户名称</div>
              <div>品牌</div>
              <div>账号</div>
              <div>默认路径</div>
              <div>访问地址</div>
              <div>自定义域名</div>
              <div>域名状态</div>
              <div className="text-right">操作</div>
            </div>

            <div className="divide-y divide-slate-100">
              {merchants.map(merchant => {
                const bindKey = `${DEFAULT_PROJECT_NAME}:${normalizeMerchantDomain(merchant.customDomain)}`;
                const binding = bindingMap[bindKey];
                return (
                  <div
                    key={`${merchant.type}-${merchant.slug}`}
                    className="grid grid-cols-[100px_160px_150px_130px_170px_220px_1fr_160px_210px] items-center gap-2 py-3 text-sm"
                  >
                    <div className="font-black text-slate-700">{getMerchantTypeLabel(merchant.type)}</div>
                    <div className="font-black text-slate-900">{merchant.name}</div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#1a237e] text-xs font-black text-white">
                        {getMerchantLogoText(merchant)}
                      </span>
                      <span className="text-slate-600">{getMerchantBrandName(merchant)}</span>
                    </div>
                    <div className="text-slate-600">{merchant.accountId}</div>
                    <div className="font-bold text-[#1a237e]">{getMerchantRoutePath(merchant)}</div>
                    <button
                      onClick={() => void copyValue(getMerchantPublicUrl(merchant), '访问地址已复制')}
                      className="truncate text-left text-slate-600 transition-colors hover:text-[#1a237e]"
                      title={getMerchantPublicUrl(merchant)}
                    >
                      {getMerchantPublicUrl(merchant)}
                    </button>
                    <div className="break-all text-slate-500">{merchant.customDomain || '未绑定'}</div>
                    <div>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-black ${
                          merchant.domainBindingStatus === 'success'
                            ? 'bg-[#1a237e] text-[#1a237e]'
                            : merchant.domainBindingStatus === 'failed'
                              ? 'bg-[#1a237e] text-[#1a237e]'
                              : merchant.domainBindingStatus === 'binding'
                                ? 'bg-[#1a237e] text-[#1a237e]'
                                : 'bg-slate-100 text-slate-500'
                        }`}
                        title={merchant.domainBindingMessage || ''}
                      >
                        {merchant.domainBindingStatus === 'success'
                          ? '已绑定'
                          : merchant.domainBindingStatus === 'failed'
                            ? '绑定失败'
                            : merchant.domainBindingStatus === 'binding'
                              ? '绑定中'
                              : '未绑定'}
                      </span>
                      {merchant.domainBindingMessage && (
                        <div className="mt-1 line-clamp-2 text-[11px] text-slate-500">
                          {merchant.domainBindingMessage}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() =>
                          merchant.customDomain &&
                          window.open(
                            `https://${normalizeMerchantDomain(merchant.customDomain)}`,
                            '_blank',
                            'noopener,noreferrer'
                          )
                        }
                        disabled={!merchant.customDomain}
                        className="ui-btn inline-flex h-8 items-center gap-1 rounded-lg bg-[#1a237e] px-2.5 text-[11px] font-black text-[#1a237e] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <ExternalLink size={12} /> 打开域名
                      </button>
                      <button
                        onClick={() => void copyValue(getMerchantRoutePath(merchant), '默认路径已复制')}
                        className="ui-btn inline-flex h-8 items-center gap-1 rounded-lg bg-[#1a237e] px-2.5 text-[11px] font-black text-[#1a237e]"
                      >
                        <Copy size={12} /> 路径
                      </button>
                      <button
                        onClick={() => void toggleMerchantStatus(merchant)}
                        className="ui-btn inline-flex h-8 items-center gap-1 rounded-lg bg-slate-100 px-2.5 text-[11px] font-black text-slate-700"
                      >
                        <Power size={12} /> {merchant.status === 'disabled' ? '启用' : '停用'}
                      </button>
                      <button
                        onClick={() =>
                          void runDomainBinding(
                            merchant.customDomain || '',
                            merchant.domainProjectName || DEFAULT_PROJECT_NAME,
                            merchant
                          )
                        }
                        disabled={!merchant.customDomain || binding}
                        className="ui-btn inline-flex h-8 items-center gap-1 rounded-lg bg-[#1a237e] px-2.5 text-[11px] font-black text-[#1a237e] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {binding ? (
                          <LoaderCircle size={12} className="animate-spin" />
                        ) : (
                          <WandSparkles size={12} />
                        )}
                        自动绑定
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="ui-panel space-y-4 rounded-3xl bg-slate-900 p-5 text-white sm:p-6">
            <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest">
              <Plus size={16} /> 新建商户
            </h3>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="商户名称，例如 ESS 零售店"
              className="w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2.5 text-sm outline-none"
            />
            <select
              value={type}
              onChange={e => setType(e.target.value as MerchantType)}
              className="w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2.5 text-sm outline-none"
            >
              <option value="retail">零售商</option>
              <option value="wholesale">批发商</option>
            </select>
            <input
              value={slug}
              onChange={e => setSlug(e.target.value)}
              placeholder="访问标识，例如 ess / tianyi"
              className="w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2.5 text-sm outline-none"
            />
            <input
              value={brandName}
              onChange={e => setBrandName(e.target.value)}
              placeholder="品牌名称，例如 ESS Retail"
              className="w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2.5 text-sm outline-none"
            />
            <input
              value={logoText}
              onChange={e => setLogoText(e.target.value)}
              placeholder="Logo 文字，例如 ESS"
              className="w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2.5 text-sm outline-none"
              maxLength={4}
            />
            <input
              value={customDomain}
              onChange={e => setCustomDomain(e.target.value)}
              placeholder="自定义域名，例如 ess.essvu.com"
              className="w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2.5 text-sm outline-none"
            />
            <div className="space-y-1 rounded-2xl border border-white/10 bg-white/10 p-3 text-xs text-slate-200">
              <div className="inline-flex items-center gap-2 font-black">
                <Globe size={13} /> 默认路径
              </div>
              <div>{normalizedSlug ? `${type === 'retail' ? '/retail' : '/wholesale'}/${normalizedSlug}` : '--'}</div>
              <div className="inline-flex items-center gap-2 pt-1">
                <Link2 size={13} /> 保存后会自动尝试绑定自定义域名到 Vercel 和 Cloudflare
              </div>
            </div>
            <button
              onClick={() => void addMerchant()}
              className="ui-btn ui-btn-primary w-full rounded-xl py-3 text-sm"
            >
              创建商户
            </button>
            {saveHint && <div className="text-xs font-black text-[#1a237e]">{saveHint}</div>}
          </div>

          <div className="ui-card space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#1a237e] text-[#1a237e]">
                <WandSparkles size={18} />
              </div>
              <div>
                <div className="font-black text-slate-900">域名绑定助手</div>
                <div className="text-xs text-slate-500">
                  适合平台后台、独立项目或任意子域名的一键绑定。
                </div>
              </div>
            </div>
            <input
              value={bindDomain}
              onChange={e => setBindDomain(e.target.value)}
              placeholder="域名，例如 admin.essvu.com"
              className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-[#dbe7ff]"
            />
            <select
              value={bindProjectName}
              onChange={e => setBindProjectName(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-[#dbe7ff]"
            >
              {PROJECT_OPTIONS.map(project => (
                <option key={project.value} value={project.value}>
                  {project.label}
                </option>
              ))}
            </select>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
              自动写入：
              <div className="mt-1 font-black text-slate-800">
                {DEFAULT_RECORD_TYPE} {normalizeMerchantDomain(bindDomain) || '--'} {DEFAULT_RECORD_CONTENT}
              </div>
            </div>
            <button
              onClick={() => void runDomainBinding(bindDomain, bindProjectName || DEFAULT_PROJECT_NAME)}
              disabled={!normalizeMerchantDomain(bindDomain) || !bindProjectName.trim() || bindingMap[currentBindKey]}
              className="ui-btn w-full rounded-xl bg-[#1a237e] py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {bindingMap[currentBindKey] ? '绑定中...' : '一键自动绑定域名'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MerchantManagementPage;

