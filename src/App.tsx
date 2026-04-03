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
  Users
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
import RetailPOSPage from './pages/RetailPOS';
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

type UserRole = 'PLATFORM' | 'WHOLESALER' | 'RETAILER';
type View = 'dashboard' | 'supplier-entry' | 'driver-app' | 'finance-board' | 'scanner' | 'virtual-shelf' | 'warehouse-mgmt' | 'inventory-mgmt' | 'management-menu' | 'supply-chain' | 'ecosystem' | 'auto-split' | 'retail-pos' | 'wholesale-pos' | 'artery' | 'global-wholesale' | 'customs-docs' | 'digital-archive' | 'fleet-mgmt' | 'wholesaler-home' | 'retailer-home' | 'customer-mgmt' | 'supplier-mgmt' | 'warehouse-shelf';
const SESSION_KEY_PREFIX = 'stretpos.session.';
const VIEW_KEY_PREFIX = 'stretpos.activeView.';
const ACTIVE_ROLE_KEY = 'stretpos.activeRole';
const VIEW_IDS: View[] = ['dashboard', 'supplier-entry', 'driver-app', 'finance-board', 'scanner', 'virtual-shelf', 'warehouse-mgmt', 'inventory-mgmt', 'management-menu', 'supply-chain', 'ecosystem', 'auto-split', 'retail-pos', 'wholesale-pos', 'artery', 'global-wholesale', 'customs-docs', 'digital-archive', 'fleet-mgmt', 'wholesaler-home', 'retailer-home', 'customer-mgmt', 'supplier-mgmt', 'warehouse-shelf'];

const getSessionKey = (userRole: UserRole) => `${SESSION_KEY_PREFIX}${userRole}`;
const getViewKey = (userRole: UserRole) => `${VIEW_KEY_PREFIX}${userRole}`;
const isValidView = (value: string | null): value is View => !!value && VIEW_IDS.includes(value as View);
const isValidRole = (value: string | null): value is UserRole => value === 'PLATFORM' || value === 'WHOLESALER' || value === 'RETAILER';
const VIEW_TITLE_MAP: Partial<Record<View, string>> = {
  dashboard: '主仪表盘',
  'supply-chain': '供应链流转控制',
  scanner: '库存扫码器',
  'retail-pos': '零售收银系统',
  'virtual-shelf': '虚拟货架',
  'supplier-mgmt': '供应商管理',
  'inventory-mgmt': '库存管理',
  'management-menu': '管理菜单',
};
const getSavedView = (userRole: UserRole): View => {
  try {
    const saved = localStorage.getItem(getViewKey(userRole));
    return isValidView(saved) ? saved : 'dashboard';
  } catch {
    return 'dashboard';
  }
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
  const [activeView, setActiveView] = useState<View>(() => getSavedView(initialRole));
  const [retailPosSearch, setRetailPosSearch] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    try {
      return localStorage.getItem(getSessionKey(initialRole)) === '1';
    } catch {
      return false;
    }
  });
  const [currentUser, setCurrentUser] = useState<any>(() => {
    try {
      return localStorage.getItem(getSessionKey(initialRole)) === '1' ? buildUser(initialRole) : null;
    } catch {
      return null;
    }
  });

  const handleLogin = (userRole: UserRole) => {
    setRole(userRole);
    setIsLoggedIn(true);
    setCurrentUser(buildUser(userRole));
    setActiveView(getSavedView(userRole));
    try {
      localStorage.setItem(getSessionKey(userRole), '1');
      localStorage.setItem(ACTIVE_ROLE_KEY, userRole);
    } catch {}
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUser(null);
    try {
      localStorage.removeItem(getSessionKey(role));
      localStorage.removeItem(ACTIVE_ROLE_KEY);
    } catch {}
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

  const allNavItems = [
    { id: 'dashboard', label: '主仪表盘', icon: LayoutDashboard, roles: ['PLATFORM', 'WHOLESALER', 'RETAILER'] },
    { id: 'supplier-entry', label: t('supplierEntry'), icon: Package, roles: ['PLATFORM', 'WHOLESALER'] },
    { id: 'supply-chain', label: '供应链流转控制', icon: ClipboardList, roles: ['PLATFORM', 'WHOLESALER', 'RETAILER'] },
    { id: 'global-wholesale', label: t('globalLogistics'), icon: Plane, roles: ['PLATFORM', 'WHOLESALER'] },
    { id: 'customs-docs', label: t('customsDocs'), icon: ShieldCheck, roles: ['PLATFORM', 'WHOLESALER'] },
    { id: 'digital-archive', label: t('digitalArchive'), icon: Archive, roles: ['PLATFORM', 'WHOLESALER'] },
    { id: 'fleet-mgmt', label: t('fleetMgmt'), icon: Users, roles: ['PLATFORM', 'WHOLESALER'] },
    { id: 'warehouse-mgmt', label: t('warehouseMgmt'), icon: Box, roles: ['PLATFORM'] },
    { id: 'inventory-mgmt', label: '库存管理', icon: Box, roles: ['PLATFORM', 'WHOLESALER', 'RETAILER'] },
    { id: 'management-menu', label: '管理菜单', icon: Settings, roles: ['PLATFORM', 'WHOLESALER', 'RETAILER'] },
    { id: 'scanner', label: '库存扫码器', icon: Scan, roles: ['PLATFORM', 'RETAILER'] },
    { id: 'retail-pos', label: '零售收银系统', icon: ShoppingCart, roles: ['PLATFORM', 'RETAILER', 'WHOLESALER'] },
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
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'zh_CN', name: '简体中文', flag: '🇨🇳' },
    { code: 'bi', name: 'Bislama', flag: '🇻🇺' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'ja', name: '日本語', flag: '🇯🇵' },
    { code: 'ko', name: '한국어', flag: '🇰🇷' },
    { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
  ];

  return (
    <div className="flex bg-slate-50 min-h-screen font-sans text-slate-800">
      {/* Sidebar - Desktop */}
      {!isMobile && isLoggedIn && (
        <aside className={`${isSidebarOpen ? 'w-60 xl:w-64' : 'w-16 xl:w-20'} bg-slate-900 text-white flex flex-col transition-all duration-300 relative z-30`}>
          <div className="p-4 xl:p-6 border-b border-white/10 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-sky-500 rounded-lg flex items-center justify-center shrink-0">
                <span className="font-bold text-lg">S</span>
              </div>
              {isSidebarOpen && <span className="font-bold text-lg xl:text-xl tracking-tight">Stret POS</span>}
            </div>
            {isSidebarOpen && (
              <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest inline-block ${
                role === 'PLATFORM' ? 'bg-sky-500 text-white' :
                role === 'WHOLESALER' ? 'bg-indigo-500 text-white' :
                'bg-emerald-500 text-white'
              }`}>
                {t(role.toLowerCase())} {t('portal')}
              </div>
            )}
          </div>

          <nav className="mt-4 xl:mt-6 flex-1 px-2 xl:px-3 space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id as View)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 xl:py-3 rounded-xl transition-all ${
                  activeView === item.id 
                  ? 'bg-sky-500/20 text-sky-400 font-medium' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <item.icon size={20} />
                {isSidebarOpen && <span className="truncate text-sm">{item.label}</span>}
              </button>
            ))}
          </nav>

          <div className="p-3 xl:p-4 border-t border-slate-800 space-y-1">
            <button 
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
            >
              <LogOut size={20} />
              {isSidebarOpen && <span>{t('logout')}</span>}
            </button>
            <button 
              onClick={handleLogout} 
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-rose-400 hover:bg-rose-500/10 transition-all"
            >
              <X size={20} />
              {isSidebarOpen && <span>{t('switchAccount')}</span>}
            </button>
          </div>
          
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="absolute -right-3 top-20 bg-sky-500 p-1.5 rounded-full border-4 border-slate-50 text-white hover:scale-110 active:scale-90 transition-all"
          >
            <ChevronRight size={12} className={isSidebarOpen ? 'rotate-180' : ''} />
          </button>
        </aside>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {isLoggedIn && (
          <header className="h-14 sm:h-16 bg-white border-b border-slate-200 flex items-center justify-between px-3 sm:px-4 lg:px-6 sticky top-0 z-20">
            <div className="flex items-center gap-4">
              {isMobile && (
                <button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-2 text-slate-500">
                  <Menu />
                </button>
              )}
              <h1 className="text-base sm:text-lg font-bold text-slate-800 capitalize truncate max-w-[42vw] sm:max-w-none">
                {VIEW_TITLE_MAP[activeView] ?? t(activeView.replace(/-([a-z])/g, g => g[1].toUpperCase()))}
              </h1>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              {activeView === 'retail-pos' && (
                <input
                  type="text"
                  placeholder="搜索货品 / 扫码"
                  value={retailPosSearch}
                  onChange={(e) => {
                    const value = e.target.value;
                    setRetailPosSearch(value);
                    if (currentUser?.id) {
                      void patchAccountProgramSettings(currentUser.id, { retailPosSearch: value });
                    }
                  }}
                  className="hidden md:block w-52 lg:w-72 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs sm:text-sm font-medium outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
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
              <div className="w-8 h-8 rounded-full bg-sky-500 border-2 border-white shadow-sm flex items-center justify-center text-white text-[10px] font-black">
                {currentUser?.name?.slice(0, 2).toUpperCase()}
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
                {activeView === 'dashboard' && <DashboardPage userAccount={currentUser} />}
                {activeView === 'supplier-entry' && <SupplierEntryPage />}
                {activeView === 'finance-board' && <FinanceBoardPage />}
                {activeView === 'driver-app' && <DriverAppPage />}
                {activeView === 'scanner' && <WarehouseScannerPage />}
                {activeView === 'virtual-shelf' && <VirtualShelfPage />}
                {activeView === 'warehouse-mgmt' && <WarehouseManagementPage />}
                {activeView === 'inventory-mgmt' && <WarehouseManagementPage />}
                {activeView === 'management-menu' && <ManagementMenuPage onNavigate={(v) => setActiveView(v as View)} />}
                {activeView === 'supply-chain' && <SupplierWorkflowPage />}
                {activeView === 'ecosystem' && <UnifiedEcosystemPage />}
                {activeView === 'auto-split' && <AutoSplitRulesPage />}
                {activeView === 'retail-pos' && <RetailPOSPage headerSearchQuery={retailPosSearch} accountId={currentUser?.id} />}
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
            ) : (
                <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] bg-slate-900 flex items-center justify-center p-3 sm:p-6"
              >
                 <div className="absolute inset-0 overflow-hidden opacity-20">
                    <div className="absolute top-0 left-0 w-96 h-96 bg-sky-500 blur-[150px] rounded-full -mt-48 -ml-48" />
                    <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-500 blur-[150px] rounded-full -mb-48 -mr-48" />
                 </div>
                 
                 <motion.div 
                   initial={{ scale: 0.9, y: 20 }}
                   animate={{ scale: 1, y: 0 }}
                   className="bg-white rounded-[28px] sm:rounded-[48px] p-6 sm:p-12 max-w-md w-full shadow-2xl relative z-10 space-y-6 sm:space-y-10 border border-slate-100"
                 >
                    <div className="text-center space-y-4">
                       <div className="w-16 h-16 sm:w-20 sm:h-20 bg-sky-500 rounded-[24px] sm:rounded-[32px] flex items-center justify-center mx-auto shadow-2xl shadow-sky-200">
                          <span className="text-white font-black text-4xl italic">S</span>
                       </div>
                       <div>
                         <h2 className="text-2xl sm:text-3xl font-black text-slate-800 uppercase tracking-tighter">Stret POS</h2>
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mt-1 italic">统一物流生态系统</p>
                       </div>
                    </div>
    
                    <div className="space-y-4">
                       <p className="text-[10px] font-black text-center text-slate-500 uppercase tracking-widest">{t('login')}</p>
                       <div className="grid grid-cols-1 gap-3">
                          {(['PLATFORM', 'WHOLESALER', 'RETAILER'] as UserRole[]).map(r => (
                            <button 
                              key={r}
                              onClick={() => handleLogin(r)}
                              className="group w-full p-4 sm:p-5 rounded-2xl border-2 border-slate-50 hover:border-sky-500 hover:bg-sky-50 transition-all flex items-center justify-between"
                            >
                               <div className="flex items-center gap-4">
                                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                    r === 'PLATFORM' ? 'bg-sky-500 text-white' : r === 'WHOLESALER' ? 'bg-indigo-500 text-white' : 'bg-emerald-500 text-white'
                                  }`}>
                                     {r === 'PLATFORM' ? <ShieldCheck size={20} /> : r === 'WHOLESALER' ? <Plane size={20} /> : <ShoppingCart size={20} />}
                                  </div>
                                  <span className="font-black text-xs uppercase tracking-widest text-slate-700">{t(r.toLowerCase())}</span>
                               </div>
                               <ChevronRight size={18} className="text-slate-200 group-hover:text-sky-500 transition-colors" />
                            </button>
                          ))}
                       </div>
                    </div>
    
                    <div className="text-center pt-4 border-t border-slate-50">
                       <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest leading-relaxed">
                         由 Stret 物流网络提供 · 维拉港 2026<br/>
                         加密安全会话
                       </p>
                    </div>
                 </motion.div>
              </motion.div>
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
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40"
            />
            <motion.aside 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              className="fixed top-0 left-0 bottom-0 w-[85vw] max-w-72 bg-slate-900 text-white z-50 p-5 sm:p-6 flex flex-col"
            >
              <div className="flex items-center justify-between mb-8">
                <span className="font-bold text-xl">Stret POS</span>
                <button onClick={() => setIsSidebarOpen(false)}><X /></button>
              </div>
              <nav className="space-y-2 flex-1">
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => { setActiveView(item.id as View); setIsSidebarOpen(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                      activeView === item.id 
                      ? 'bg-sky-500 text-white' 
                      : 'text-slate-400 hover:bg-slate-800'
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
