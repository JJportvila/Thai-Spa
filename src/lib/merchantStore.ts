import { getCachedSharedState, loadSharedState, saveSharedState } from './sharedStateStore';

export type MerchantType = 'retail' | 'wholesale';
export type MerchantStatus = 'active' | 'disabled';
export type MerchantDomainBindingStatus = 'idle' | 'binding' | 'success' | 'failed';

export interface MerchantDefinition {
  slug: string;
  type: MerchantType;
  name: string;
  accountId: string;
  customDomain?: string;
  status?: MerchantStatus;
  brandName?: string;
  logoText?: string;
  domainProjectName?: string;
  domainBindingStatus?: MerchantDomainBindingStatus;
  domainBindingMessage?: string;
}

const MERCHANTS_STATE_KEY = 'platform_merchants';
const PLATFORM_ACCOUNT_ID = 'P-001';

const BUILTIN_MERCHANTS: MerchantDefinition[] = [
  {
    slug: 'ess',
    type: 'retail',
    name: 'ESS 零售店',
    brandName: 'ESS Retail',
    logoText: 'ESS',
    accountId: 'R-ESS',
    customDomain: 'ess.essvu.com',
    status: 'active',
  },
  {
    slug: 'cc',
    type: 'wholesale',
    name: 'CC 批发店',
    brandName: 'CC Wholesale',
    logoText: 'CC',
    accountId: 'W-CC',
    status: 'active',
  },
  {
    slug: 'tianyi',
    type: 'wholesale',
    name: 'TIANYI 批发店',
    brandName: 'TIANYI Wholesale',
    logoText: 'TY',
    accountId: 'W-TIANYI',
    customDomain: 'tianyi.essvu.com',
    status: 'active',
  },
];

export const getMerchantTypeLabel = (type: MerchantType) =>
  type === 'retail' ? '零售商' : '批发商';

export const getMerchantPathPrefix = (type: MerchantType) =>
  type === 'retail' ? '/retail' : '/wholesale';

export const getMerchantRoutePath = (merchant: MerchantDefinition) =>
  `${getMerchantPathPrefix(merchant.type)}/${merchant.slug}`;

export const normalizeMerchantDomain = (value?: string) =>
  value
    ?.trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/\.+$/, '') || '';

export const getMerchantBrandName = (merchant: MerchantDefinition) =>
  merchant.brandName?.trim() || merchant.name;

export const getMerchantLogoText = (merchant: MerchantDefinition) =>
  merchant.logoText?.trim() || merchant.slug.slice(0, 3).toUpperCase();

export const getMerchantAccountId = (type: MerchantType, slug: string) =>
  `${type === 'retail' ? 'R' : 'W'}-${slug.trim().toUpperCase()}`;

export const getMerchantStatusLabel = (status?: MerchantStatus) =>
  status === 'disabled' ? '已停用' : '启用中';

export const getMerchantPublicUrl = (merchant: MerchantDefinition, origin?: string) => {
  const domain = normalizeMerchantDomain(merchant.customDomain);
  if (domain) return `https://${domain}`;
  const base = (origin || window.location.origin).replace(/\/$/, '');
  return `${base}${getMerchantRoutePath(merchant)}`;
};

export const sortMerchants = (merchants: MerchantDefinition[]) =>
  [...merchants].sort((a, b) => {
    if (a.type !== b.type) return a.type === 'retail' ? -1 : 1;
    return a.slug.localeCompare(b.slug);
  });

export const getPlatformMerchantsCached = () => {
  const cached = getCachedSharedState<MerchantDefinition[]>(
    PLATFORM_ACCOUNT_ID,
    MERCHANTS_STATE_KEY,
    BUILTIN_MERCHANTS
  );
  return cached.length ? sortMerchants(cached) : BUILTIN_MERCHANTS;
};

const mergeBuiltinMerchantDefaults = (merchants: MerchantDefinition[]) =>
  sortMerchants(
    merchants.map((merchant) => {
      const builtin = BUILTIN_MERCHANTS.find(
        item => item.type === merchant.type && item.slug === merchant.slug
      );
      return builtin
        ? { ...builtin, ...merchant, customDomain: merchant.customDomain || builtin.customDomain }
        : merchant;
    })
  );

export const syncPlatformMerchants = async () => {
  const local = getPlatformMerchantsCached();
  const synced = await loadSharedState(PLATFORM_ACCOUNT_ID, MERCHANTS_STATE_KEY, local);
  if (synced.length > 0) {
    const merged = mergeBuiltinMerchantDefaults(synced);
    await saveSharedState(PLATFORM_ACCOUNT_ID, MERCHANTS_STATE_KEY, merged);
    return merged;
  }
  await saveSharedState(PLATFORM_ACCOUNT_ID, MERCHANTS_STATE_KEY, BUILTIN_MERCHANTS);
  return BUILTIN_MERCHANTS;
};

export const savePlatformMerchants = async (merchants: MerchantDefinition[]) => {
  await saveSharedState(PLATFORM_ACCOUNT_ID, MERCHANTS_STATE_KEY, sortMerchants(merchants));
};

const matchMerchantByHost = (hostname: string, merchants: MerchantDefinition[]) => {
  const cleanHost = normalizeMerchantDomain(hostname);
  if (
    !cleanHost ||
    cleanHost === 'localhost' ||
    cleanHost.startsWith('127.') ||
    cleanHost.startsWith('192.168.')
  ) {
    return null;
  }
  return merchants.find(item => normalizeMerchantDomain(item.customDomain) === cleanHost) || null;
};

export const getMerchantByRoute = (pathname: string, hostname?: string): MerchantDefinition | null => {
  const merchants = getPlatformMerchantsCached();
  if (hostname) {
    const hostMatch = matchMerchantByHost(hostname, merchants);
    if (hostMatch) return hostMatch;
  }
  const normalized = pathname.replace(/\/+$/, '') || '/';
  const parts = normalized.split('/').filter(Boolean);
  if (parts.length < 2) return null;
  const [prefix, slug] = parts;
  const type = prefix === 'retail' ? 'retail' : prefix === 'wholesale' ? 'wholesale' : null;
  if (!type || !slug) return null;
  return (
    merchants.find(item => item.type === type && item.slug.toLowerCase() === slug.toLowerCase()) || {
      slug: slug.toLowerCase(),
      type,
      name: `${slug.toUpperCase()} ${getMerchantTypeLabel(type)}`,
      brandName: `${slug.toUpperCase()} ${getMerchantTypeLabel(type)}`,
      logoText: slug.slice(0, 3).toUpperCase(),
      accountId: getMerchantAccountId(type, slug),
      status: 'active',
    }
  );
};

export const listBuiltinMerchants = () => BUILTIN_MERCHANTS;
