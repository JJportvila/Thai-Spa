import React, { useState, useEffect } from 'react';
import {
  Package,
  Truck,
  BarChart3,
  Settings,
  ChevronRight,
  LogOut,
  LayoutDashboard,
  Wallet,
  Menu,
  X,
  Scan,
  Layers,
  Box,
  ClipboardList,
  History,
  Globe,
  Calculator,
  ShoppingCart,
  Activity,
  Plane,
  ShieldCheck,
  Archive,
  Users,
  Tags
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import './lib/i18n';
import { getAccountProgramSettings, patchAccountProgramSettings } from './lib/accountScopedStore';
import DashboardPage from './pages/Dashboard';
import SupplierEntryPage from './pages/SupplierEntry';
import FinanceBoardPage from './pages/FinanceBoard';
import DriverAppPage from './pages/DriverApp';
import WarehouseScannerPage from './pages/Scanner';
import VirtualShelfPage from './pages/VirtualShelf';
import WarehouseManagementPage from './pages/WarehouseManagement';
import SupplierWorkflowPage from './pages/SupplierWorkflow';
import UnifiedEcosystemPage from './pages/UnifiedEcosystem';
import AutoSplitRulesPage from './pages/AutoSplitRules';
import VatReturnsPage from './pages/VatReturns';
import RetailPOSPage from './pages/RetailPOS';
import RetailToolsCenterPage from './pages/RetailToolsCenter';
import LabelPrintCenterPage from './pages/LabelPrintCenter';
import LogisticsArteryPage from './pages/LogisticsArtery';
import GlobalWholesalePage from './pages/GlobalWholesaleLogistics';
import DigitalCustomsDocsPage from './pages/DigitalCustomsDocs';
import DigitalArchivePage from './pages/DigitalArchive';
import FleetManagementPage from './pages/FleetManagement';
import WholesalePOSPage from './pages/WholesalePOS';
import CustomerManagementPage from './pages/CustomerManagement';
import SupplierManagementPage from './pages/SupplierManagement';
import WarehouseShelfManagementPage from './pages/WarehouseShelfManagement';
import ManagementMenuPage from './pages/ManagementMenu';
import EmployeeAccountManagementPage from './pages/EmployeeAccountManagement';
import MyInventoryPage from './pages/MyInventory';
import CustomerHomePage from './pages/CustomerHomePage';

type UserRole = 'PLATFORM' | 'WHOLESALER' | 'RETAILER';
type View = 'customer_home' | 'customer-home' | 'dashboard' | 'supplier-entry' | 'driver-app' | 'finance-board' | 'vat-returns' | 'scanner' | 'virtual-shelf' | 'warehouse-mgmt' | 'inventory-mgmt' | 'my-inventory' | 'management-menu' | 'employee-mgmt' | 'supply-chain' | 'ecosystem' | 'auto-split' | 'retail-pos' | 'retail-tools' | 'label-print' | 'wholesale-pos' | 'artery' | 'global-wholesale' | 'customs-docs' | 'digital-archive' | 'fleet-mgmt' | 'wholesaler-home' | 'retailer-home' | 'customer-mgmt' | 'supplier-mgmt' | 'warehouse-shelf';
const SESSION_KEY_PREFIX = 'stretpos.session.';
const VIEW_KEY_PREFIX = 'stretpos.activeView.';
const ACTIVE_ROLE_KEY = 'stretpos.activeRole';
const HOME_VIEW: View = 'customer_home';
const VIEW_IDS: View[] = ['customer_home', 'customer-home', 'dashboard', 'supplier-entry', 'driver-app', 'finance-board', 'vat-returns', 'scanner', 'virtual-shelf', 'warehouse-mgmt', 'inventory-mgmt', 'my-inventory', 'management-menu', 'employee-mgmt', 'supply-chain', 'ecosystem', 'auto-split', 'retail-pos', 'retail-tools', 'label-print', 'wholesale-pos', 'artery', 'global-wholesale', 'customs-docs', 'digital-archive', 'fleet-mgmt', 'wholesaler-home', 'retailer-home', 'customer-mgmt', 'supplier-mgmt', 'warehouse-shelf'];

const getSessionKey = (userRole: UserRole) => `${SESSION_KEY_PREFIX}${userRole}`;
const getViewKey = (userRole: UserRole) => `${VIEW_KEY_PREFIX}${userRole}`;
const isValidView = (value: string | null): value is View => !!value && VIEW_IDS.includes(value as View);
const isValidRole = (value: string | null): value is UserRole => value === 'PLATFORM' || value === 'WHOLESALER' || value === 'RETAILER';
const VIEW_TITLE_MAP: Partial<Record<View, string>> = {
  dashboard: '主仪表盘',
  customer_home: '顾客主页',
  'supply-chain': '供应链流转控制',
  scanner: '库存扫码器',
  'retail-pos': '零售收银系统',
  'virtual-shelf': '虚拟货架',
  'vat-returns': '增值税申报',
  'supplier-mgmt': '供应商管理',
  'inventory-mgmt': '库存管理',
  'my-inventory': '库存管理',
  'retail-tools': '零售功能中心',
  'label-print': '标签打印',
  'management-menu': '后台设置',
  'employee-mgmt': '员工账号管理',
};
const normalizeView = (value: string | null): View | null => {
  if (!value) return null;
  if (value === 'customer-home') return HOME_VIEW;
  if (value === 'customer_home') return HOME_VIEW;
  return isValidView(value) ? value : null;
};
const getSavedView = (userRole: UserRole): View => {
  try {
    const saved = localStorage.getItem(getViewKey(userRole));
    return normalizeView(saved) ?? HOME_VIEW;
  } catch {
    return HOME_VIEW;
  }
};

const getViewFromLocation = (): View | null => {
  const hash = window.location.hash.replace(/^#\/?/, '').trim();
  const normalizedHash = normalizeView(hash);
  if (normalizedHash) return normalizedHash;
  try {
    const view = new URLSearchParams(window.location.search).get('view');
    const normalizedView = normalizeView(view);
    if (normalizedView) return normalizedView;
  } catch {}
  return null;
};

const buildUser = (userRole: UserRole) => ({
  id: userRole === 'PLATFORM' ? 'P-001' : userRole === 'WHOLESALER' ? 'W-001' : 'R-001',
  name: userRole === 'PLATFORM' ? 'Stret Admin' : userRole === 'WHOLESALER' ? 'Vanuatu Bev' : 'Sunrise Retail',
  role: userRole,
  balance: userRole === 'PLATFORM' ? 1250000 : userRole === 'WHOLESALER' ? 4500000 : -45000,
  credit_limit: 5000000
});

const App: React.FC = () => {
  const { t, i18n } = useTranslation();
  
  const getInitialRole = (): UserRole => {
    try {
      const savedRole = localStorage.getItem(ACTIVE_ROLE_KEY);
      if (isValidRole(savedRole)) return savedRole;
    } catch {}
    const port = window.location.port;
    if (port === '5181') return 'WHOLESALER';
    if (port === '5182') return 'RETAILER';
    return 'PLATFORM';
  };

  const initialRole = getInitialRole();
  const [role, setRole] = useState<UserRole>(initialRole);
  const [activeView, setActiveView] = useState<View>(() => getViewFromLocation() || HOME_VIEW);
  const [retailPosSearch, setRetailPosSearch] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    try {
      return localStorage.getItem(getSessionKey(initialRole)) === '1';
    } catch {
      return false;
    }
  });
  const [showLoginScreen, setShowLoginScreen] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(() => {
    try {
      return localStorage.getItem(getSessionKey(initialRole)) === '1' ? buildUser(initialRole) : null;
    } catch {
      return null;
    }
  });
  const roleBadgeLabel =
    role === 'PLATFORM' ? '平台门户' : role === 'WHOLESALER' ? '批发门户' : '零售门户';

  const handleLogin = (userRole: UserRole) => {
    setRole(userRole);
    setIsLoggedIn(true);
    setCurrentUser(buildUser(userRole));
    setActiveView(getSavedView(userRole) === HOME_VIEW ? 'dashboard' : getSavedView(userRole));
    setShowLoginScreen(false);
    try {
      localStorage.setItem(getSessionKey(userRole), '1');
      localStorage.setItem(ACTIVE_ROLE_KEY, userRole);
    } catch {}
  };

  const handleSwitchAccount = () => {
    setIsLoggedIn(false);
    setShowLoginScreen(false);
    setCurrentUser(null);
    setIsProfileMenuOpen(false);
    try {
      localStorage.removeItem(getSessionKey(role));
      localStorage.removeItem(ACTIVE_ROLE_KEY);
    } catch {}
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setShowLoginScreen(false);
    setCurrentUser(null);
    setIsProfileMenuOpen(false);
    try {
      localStorage.removeItem(getSessionKey(role));
    } catch {}
  };

  const handlePublicNavigate = (view: string) => {
    if (view === 'dashboard' || view === 'retail-pos' || view === 'retail-tools' || view === 'label-print' || view === 'inventory-mgmt' || view === 'my-inventory' || view === 'vat-returns' || view === 'wholesale-pos') {
      setShowLoginScreen(true);
      return;
    }
    if (view === 'customer-home' || view === 'customer_home') {
      setShowLoginScreen(false);
      setActiveView(HOME_VIEW);
      return;
    }
    setActiveView(view as View);
  };

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    if (currentUser?.id) {
      void patchAccountProgramSettings(currentUser.id, { language: lng });
    }
  };

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) setIsSidebarOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!isLoggedIn) return;
    setCurrentUser(buildUser(role));
  }, [role, isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn || !currentUser?.id) return;
    let mounted = true;
    (async () => {
      const settings = await getAccountProgramSettings(currentUser.id);
      if (!mounted) return;
      if (settings.language && settings.language !== i18n.language) {
        i18n.changeLanguage(settings.language);
      }
      if (typeof settings.retailPosSearch === 'string') {
        setRetailPosSearch(settings.retailPosSearch);
      } else {
        setRetailPosSearch('');
      }
    })();
    return () => {
      mounted = false;
    };
  }, [isLoggedIn, currentUser?.id]);

  useEffect(() => {
    if (!isLoggedIn) return;
    try {
      localStorage.setItem(getViewKey(role), activeView);
    } catch {}
  }, [activeView, role, isLoggedIn]);

  useEffect(() => {
    setIsProfileMenuOpen(false);
  }, [activeView, isLoggedIn]);

  useEffect(() => {
    if (activeView === 'inventory-mgmt') {
      setActiveView('my-inventory');
    }
  }, [activeView]);

  useEffect(() => {
    const syncViewFromLocation = () => {
      const nextView = getViewFromLocation();
      if (nextView) setActiveView(nextView);
    };
    window.addEventListener('hashchange', syncViewFromLocation);
    window.addEventListener('popstate', syncViewFromLocation);
    return () => {
      window.removeEventListener('hashchange', syncViewFromLocation);
      window.removeEventListener('popstate', syncViewFromLocation);
    };
  }, []);

  useEffect(() => {
    const nextHash = `#${activeView}`;
    if (window.location.hash !== nextHash) {
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}${nextHash}`);
    }
  }, [activeView]);

  const allNavItems = [
    { id: 'dashboard', label: '主仪表盘', icon: LayoutDashboard, roles: ['PLATFORM', 'WHOLESALER', 'RETAILER'] },
    { id: 'retail-pos', label: '零售收银系统', icon: ShoppingCart, roles: ['PLATFORM', 'RETAILER', 'WHOLESALER'] },
    { id: 'supplier-entry', label: t('supplierEntry'), icon: Package, roles: ['PLATFORM', 'WHOLESALER'] },
    { id: 'supply-chain', label: '供应链流转控制', icon: ClipboardList, roles: ['PLATFORM', 'WHOLESALER', 'RETAILER'] },
    { id: 'global-wholesale', label: t('globalLogistics'), icon: Plane, roles: ['PLATFORM', 'WHOLESALER'] },
    { id: 'customs-docs', label: t('customsDocs'), icon: ShieldCheck, roles: ['PLATFORM', 'WHOLESALER'] },
    { id: 'digital-archive', label: t('digitalArchive'), icon: Archive, roles: ['PLATFORM', 'WHOLESALER'] },
    { id: 'fleet-mgmt', label: t('fleetMgmt'), icon: Users, roles: ['PLATFORM', 'WHOLESALER'] },
    { id: 'warehouse-mgmt', label: t('warehouseMgmt'), icon: Box, roles: ['PLATFORM'] },
    { id: 'my-inventory', label: '库存管理', icon: Box, roles: ['PLATFORM', 'WHOLESALER', 'RETAILER'] },
    { id: 'management-menu', label: '后台设置', icon: Settings, roles: ['PLATFORM', 'WHOLESALER', 'RETAILER'] },
    { id: 'vat-returns', label: '增值税申报', icon: Wallet, roles: ['PLATFORM', 'WHOLESALER', 'RETAILER'] },
    { id: 'retail-tools', label: '零售功能中心', icon: BarChart3, roles: ['PLATFORM', 'RETAILER'] },
    { id: 'label-print', label: '标签打印', icon: Tags, roles: ['PLATFORM', 'RETAILER'] },
    { id: 'scanner', label: '库存扫码器', icon: Scan, roles: ['PLATFORM', 'RETAILER'] },
    { id: 'wholesale-pos', label: t('wholesalePOS'), icon: Layers, roles: ['PLATFORM', 'WHOLESALER'] },
    { id: 'warehouse-shelf', label: '货架管理', icon: Layers, roles: ['PLATFORM', 'WHOLESALER'] },
    { id: 'virtual-shelf', label: '虚拟货架', icon: Layers, roles: ['PLATFORM', 'RETAILER'] },
    { id: 'finance-board', label: t('financeBoard'), icon: Wallet, roles: ['PLATFORM', 'WHOLESALER'] },
    { id: 'driver-app', label: t('driverApp'), icon: Truck, roles: ['PLATFORM'] },
    { id: 'ecosystem', label: t('ecosystem'), icon: Globe, roles: ['PLATFORM'] },
    { id: 'auto-split', label: t('autoSplit'), icon: Calculator, roles: ['PLATFORM'] },
    { id: 'customer-mgmt', label: '客户管理', icon: Users, roles: ['PLATFORM', 'WHOLESALER'] },
    { id: 'supplier-mgmt', label: '供应商管理', icon: Truck, roles: ['PLATFORM', 'RETAILER'] },
    { id: 'artery', label: t('artery'), icon: Activity, roles: ['PLATFORM'] },
  ];

  const navItems = allNavItems.filter(item => item.roles.includes(role));

  const languages = [
    { code: 'en', name: 'English', flag: 'EN' },
    { code: 'zh_CN', name: '简体中文', flag: 'ZH' },
    { code: 'bi', name: 'Bislama', flag: 'BI' },
    { code: 'fr', name: 'Francais', flag: 'FR' },
    { code: 'ja', name: 'Japanese', flag: 'JA' },
    { code: 'ko', name: 'Korean', flag: 'KO' },
    { code: 'vi', name: 'Vietnamese', flag: 'VI' },
  ];

  return (
    <div className="min-h-screen bg-[#f8f9fa] font-sans text-slate-900 md:flex">
      {/* Desktop Sidebar */}
      {isLoggedIn && !isMobile && (
        <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-slate-200 bg-white shadow-[0_10px_30px_rgba(26,35,126,0.06)]">
          <div className="p-5 border-b border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center text-[#1a237e] shadow-sm">
                <span className="font-black text-xl">V</span>
              </div>
              <div>
                <div className="text-lg font-black text-[#1a237e] leading-none">瓦努阿图 POS 系统</div>
                <div className="text-[10px] font-bold tracking-[0.24em] text-slate-500 uppercase mt-1">零售卓越</div>
              </div>
            </div>
            <div className={`inline-flex items-center rounded-full px-3 py-1 text-[10px] font-black tracking-[0.22em] uppercase ${
              role === 'PLATFORM' ? 'bg-[#eef4ff] text-[#1a237e] border border-[#dbe7ff]' :
              role === 'WHOLESALER' ? 'bg-[#eef4ff] text-[#1a237e] border border-[#dbe7ff]' :
              'bg-[#eef4ff] text-[#1a237e] border border-[#dbe7ff]'
            }`}>
              {roleBadgeLabel}
            </div>
          </div>

          <nav className="mt-4 flex-1 px-3 space-y-1 overflow-y-auto no-scrollbar">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id as View)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all border ${
                  activeView === item.id
                    ? 'bg-[#eef4ff] text-[#1a237e] border-[#dbe7ff] shadow-sm'
                    : 'bg-white text-slate-600 border-transparent hover:bg-[#f4f7ff] hover:text-[#1a237e]'
                }`}
              >
                <item.icon size={18} />
                <span className="truncate text-sm font-semibold">{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="p-4 border-t border-white/10 space-y-2">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-600 hover:bg-[#f4f7ff] transition-all"
            >
              <LogOut size={18} />
              <span>退出登录</span>
            </button>
            <button
              onClick={handleSwitchAccount}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-600 hover:bg-[#f4f7ff] transition-all"
            >
              <X size={18} />
              <span>切换账号</span>
            </button>
          </div>
        </aside>
      )}

      {/* Sidebar Drawer */}
      {isLoggedIn && isSidebarOpen && isMobile && (
        <div className="fixed inset-0 z-40">
            <button
              aria-label="关闭菜单"
              onClick={() => setIsSidebarOpen(false)}
              className="absolute inset-0 bg-white/60 backdrop-blur-[1px]"
            />
          <aside className="absolute left-0 top-0 h-full w-60 xl:w-64 bg-white text-slate-700 flex flex-col shadow-2xl border-r border-slate-200">
          <div className="p-4 xl:p-6 border-b border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shrink-0 text-[#1a237e]">
                <span className="font-bold text-lg">S</span>
              </div>
              <span className="font-bold text-lg xl:text-xl tracking-tight text-[#1a237e]">瓦努阿图 POS 系统</span>
            </div>
            <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest inline-block ${
                role === 'PLATFORM' ? 'bg-[#eef4ff] text-[#1a237e] border border-[#dbe7ff]' :
                role === 'WHOLESALER' ? 'bg-[#eef4ff] text-[#1a237e] border border-[#dbe7ff]' :
                'bg-[#eef4ff] text-[#1a237e] border border-[#dbe7ff]'
              }`}>
                {roleBadgeLabel}
            </div>
          </div>

          <nav className="mt-4 xl:mt-6 flex-1 px-2 xl:px-3 space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id as View)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 xl:py-3 rounded-xl transition-all ${
                  activeView === item.id 
                  ? 'bg-[#eef4ff] text-[#1a237e] font-medium' 
                  : 'text-slate-600 hover:text-[#1a237e] hover:bg-[#f4f7ff]'
                }`}
              >
                <item.icon size={20} />
                {isSidebarOpen && <span className="truncate text-sm">{item.label}</span>}
              </button>
            ))}
          </nav>

          <div className="p-3 xl:p-4 border-t border-white/10 space-y-1">
            <button 
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-slate-600 hover:bg-[#f4f7ff] transition-all"
            >
              <LogOut size={20} />
              {isSidebarOpen && <span>退出登录</span>}
            </button>
            <button 
              onClick={handleSwitchAccount} 
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-slate-600 hover:bg-[#f4f7ff] transition-all"
            >
              <X size={20} />
              {isSidebarOpen && <span>切换账号</span>}
            </button>
          </div>
          
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="absolute -right-3 top-20 bg-white p-1.5 rounded-full border-4 border-slate-200 text-[#1a237e] hover:scale-110 active:scale-90 transition-all shadow-sm"
          >
            <ChevronRight size={12} className={isSidebarOpen ? 'rotate-180' : ''} />
          </button>
        </aside>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {isLoggedIn && (
          <header className="h-14 sm:h-16 bg-white border-b border-slate-200 flex items-center justify-between px-3 sm:px-4 lg:px-6 sticky top-0 z-20">
            <div className="flex items-center gap-4">
              <button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-2 text-slate-500 md:hidden">
                <Menu />
              </button>
              <h1 className="text-base sm:text-lg font-bold text-slate-800 capitalize truncate max-w-[42vw] sm:max-w-none">
                {VIEW_TITLE_MAP[activeView] ?? t(activeView.replace(/-([a-z])/g, g => g[1].toUpperCase()))}
              </h1>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              {activeView === 'retail-pos' && (
                <input
                  type="text"
                  placeholder="搜索商品 / 扫码"
                  value={retailPosSearch}
                  onChange={(e) => {
                    const value = e.target.value;
                    setRetailPosSearch(value);
                    if (currentUser?.id) {
                      void patchAccountProgramSettings(currentUser.id, { retailPosSearch: value });
                    }
                  }}
                  className="hidden md:block w-52 lg:w-72 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs sm:text-sm font-medium outline-none focus:ring-2 focus:ring-[#1a237e]/20 focus:border-[#1a237e]"
                />
              )}
              <select 
                onChange={(e) => changeLanguage(e.target.value)}
                value={i18n.language}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold outline-none max-w-[120px] sm:max-w-none"
              >
                {languages.map(lang => (
                  <option key={lang.code} value={lang.code}>{lang.flag} {lang.name}</option>
                ))}
              </select>
              <div className="hidden md:flex flex-col items-end">
                <span className="text-xs text-slate-400 font-medium">UTC+11 Port Vila</span>
                <span className="text-sm font-bold text-slate-600">
                  {new Intl.DateTimeFormat('en-VU', { 
                    timeZone: 'Pacific/Efate',
                    hour: '2-digit', 
                    minute: '2-digit' 
                  }).format(new Date())}
                </span>
              </div>
              <div className="hidden sm:flex min-w-[64px] px-3 py-1 bg-slate-100 rounded-lg text-[10px] font-black text-slate-400 uppercase items-center justify-center whitespace-nowrap leading-none">
                {currentUser?.id}
              </div>
              <div className="relative">
                <button
                  onClick={() => setIsProfileMenuOpen((v) => !v)}
                  className="w-8 h-8 rounded-full bg-[#1a237e] border-2 border-white shadow-sm flex items-center justify-center text-white text-[10px] font-black"
                >
                  {currentUser?.name?.slice(0, 2).toUpperCase()}
                </button>
                {isProfileMenuOpen && (
                  <div className="absolute right-0 top-11 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl p-4 z-50 space-y-3">
                    <div>
                      <div className="text-sm font-black text-slate-900">{currentUser?.name}</div>
                      <div className="text-xs text-slate-500">{currentUser?.id} 路 {role}</div>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-600 space-y-1">
                      <div>余额：{currentUser?.balance?.toLocaleString?.() ?? '--'}</div>
                      <div>额度：{currentUser?.credit_limit?.toLocaleString?.() ?? '--'}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={handleSwitchAccount}
                        className="ui-btn ui-btn-secondary px-3 py-2 rounded-lg text-xs"
                      >
                        切换账号
                      </button>
                      <button
                        onClick={handleLogout}
                        className="ui-btn px-3 py-2 rounded-lg text-xs bg-[#1a237e] text-white hover:bg-[#1a237e]"
                      >
                        退出登录
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </header>
        )}

        <section className={`px-3 py-4 sm:px-4 sm:py-5 lg:p-6 pb-24 lg:pb-6 overflow-x-hidden ${!isLoggedIn ? 'h-screen flex items-center justify-center p-0' : ''}`}>
          <AnimatePresence mode="wait">
            {isLoggedIn ? (
              <motion.div
                key={activeView}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="w-full"
              >
                {activeView === 'dashboard' && <DashboardPage userAccount={currentUser} onNavigate={(view) => setActiveView(view as View)} />}
                {activeView === 'supplier-entry' && <SupplierEntryPage />}
                {activeView === 'finance-board' && <FinanceBoardPage />}
                {activeView === 'vat-returns' && <VatReturnsPage accountId={currentUser?.id} />}
                {activeView === 'driver-app' && <DriverAppPage />}
                {activeView === 'scanner' && <WarehouseScannerPage />}
                {activeView === 'virtual-shelf' && <VirtualShelfPage />}
                {activeView === 'warehouse-mgmt' && <WarehouseManagementPage />}
                {activeView === 'inventory-mgmt' && <WarehouseManagementPage />}
                {activeView === 'my-inventory' && <MyInventoryPage />}
                {activeView === 'management-menu' && <ManagementMenuPage onNavigate={(v) => setActiveView(v as View)} accountId={currentUser?.id} />}
                {activeView === 'employee-mgmt' && <EmployeeAccountManagementPage accountId={currentUser?.id} />}
                {activeView === 'supply-chain' && <SupplierWorkflowPage />}
                {activeView === 'ecosystem' && <UnifiedEcosystemPage />}
                {activeView === 'auto-split' && <AutoSplitRulesPage />}
                {activeView === 'retail-pos' && <RetailPOSPage headerSearchQuery={retailPosSearch} accountId={currentUser?.id} />}
                {activeView === 'retail-tools' && <RetailToolsCenterPage accountId={currentUser?.id} />}
                {activeView === 'label-print' && <LabelPrintCenterPage accountId={currentUser?.id} />}
                {activeView === 'wholesale-pos' && <WholesalePOSPage userAccount={currentUser} />}
                {activeView === 'artery' && <LogisticsArteryPage />}
                {activeView === 'global-wholesale' && <GlobalWholesalePage />}
                {activeView === 'customs-docs' && <DigitalCustomsDocsPage />}
                {activeView === 'digital-archive' && <DigitalArchivePage />}
                {activeView === 'fleet-mgmt' && <FleetManagementPage role={role as 'PLATFORM' | 'WHOLESALER'} />}
                {activeView === 'customer-mgmt' && <CustomerManagementPage />}
                {activeView === 'supplier-mgmt' && <SupplierManagementPage />}
                {activeView === 'warehouse-shelf' && <WarehouseShelfManagementPage />}
              </motion.div>
            ) : showLoginScreen ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] bg-[#f8f9fa] flex items-center justify-center p-3 sm:p-6"
              >
                 <div className="absolute inset-0 overflow-hidden opacity-20">
                    <div className="absolute top-0 left-0 w-96 h-96 bg-[#1a237e] blur-[150px] rounded-full -mt-48 -ml-48" />
                    <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#24308f] blur-[150px] rounded-full -mb-48 -mr-48" />
                 </div>
                 
                 <motion.div 
                   initial={{ scale: 0.9, y: 20 }}
                   animate={{ scale: 1, y: 0 }}
                   className="bg-white rounded-[28px] sm:rounded-[48px] p-6 sm:p-12 max-w-md w-full shadow-2xl relative z-10 space-y-6 sm:space-y-10 border border-slate-100"
                 >
                    <div className="text-center space-y-4">
                       <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#1a237e] rounded-[24px] sm:rounded-[32px] flex items-center justify-center mx-auto shadow-2xl shadow-[#1a237e]/20">
                          <span className="text-white font-black text-4xl italic">S</span>
                       </div>
                       <div>
                         <h2 className="text-2xl sm:text-3xl font-black text-slate-800 uppercase tracking-tighter">Stret POS</h2>
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mt-1 italic">????????</p>
                       </div>
                    </div>
    
                    <div className="space-y-4">
                       <p className="text-[10px] font-black text-center text-slate-500 uppercase tracking-widest">{t('login')}</p>
                       <div className="grid grid-cols-1 gap-3">
                          {(['PLATFORM', 'WHOLESALER', 'RETAILER'] as UserRole[]).map(r => (
                            <button 
                              key={r}
                              onClick={() => handleLogin(r)}
                              className="group w-full p-4 sm:p-5 rounded-2xl border-2 border-slate-100 hover:border-[#1a237e] hover:bg-[#f8f9fa] transition-all flex items-center justify-between"
                            >
                               <div className="flex items-center gap-4">
                                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                    r === 'PLATFORM' ? 'bg-[#1a237e] text-white' : r === 'WHOLESALER' ? 'bg-[#24308f] text-white' : 'bg-[#5060bf] text-white'
                                  }`}>
                                     {r === 'PLATFORM' ? <ShieldCheck size={20} /> : r === 'WHOLESALER' ? <Plane size={20} /> : <ShoppingCart size={20} />}
                                  </div>
                                  <span className="font-black text-xs uppercase tracking-widest text-slate-700">{t(r.toLowerCase())}</span>
                               </div>
                               <ChevronRight size={18} className="text-slate-200 group-hover:text-[#1a237e] transition-colors" />
                            </button>
                          ))}
                       </div>
                    </div>
    
                    <div className="text-center pt-4 border-t border-slate-50">
                       <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest leading-relaxed">
                         ? Stret ?????? ? ??? 2026<br/>
                         ??????
                       </p>
                    </div>
                 </motion.div>
              </motion.div>
            ) : (
              <CustomerHomePage onNavigate={handlePublicNavigate} />
            )}
          </AnimatePresence>
        </section>
      </main>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {isMobile && isSidebarOpen && isLoggedIn && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-white/85 backdrop-blur-sm z-40"
            />
            <motion.aside 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              className="fixed top-0 left-0 bottom-0 w-[85vw] max-w-72 bg-white text-slate-700 z-50 p-5 sm:p-6 flex flex-col border-r border-slate-200 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-8">
                <span className="font-bold text-xl text-[#1a237e]">瓦努阿图 POS 系统</span>
                <button onClick={() => setIsSidebarOpen(false)} className="text-[#1a237e]"><X /></button>
              </div>
              <nav className="space-y-2 flex-1">
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => { setActiveView(item.id as View); setIsSidebarOpen(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                      activeView === item.id 
                      ? 'bg-[#eef4ff] text-[#1a237e]' 
                      : 'text-slate-600 hover:bg-[#f4f7ff]'
                    }`}
                  >
                    <item.icon size={20} />
                    <span>{item.label}</span>
                  </button>
                ))}
              </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;

