import React, { useEffect, useMemo, useState } from 'react';
import {
  Scan,
  MapPin,
  Volume2,
  X,
  CheckCircle2,
  Circle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { getFullLocation, StretProduct } from '../lib/productLogic';
import { speakProductLocation } from '../lib/voiceModule';
import { extendedVanuatuProducts } from '../lib/mockDataFull';
import { getWarehouseProducts } from '../lib/procurementStore';

interface WarehouseScannerPageProps {
  accountId?: string;
}

const LOW_STOCK_THRESHOLD = 20;

const WarehouseScannerPage: React.FC<WarehouseScannerPageProps> = ({ accountId = 'R-001' }) => {
  const { t, i18n } = useTranslation();
  const [isScanning, setIsScanning] = useState(false);
  const [scannedProduct, setScannedProduct] = useState<StretProduct | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [products, setProducts] = useState<StretProduct[]>(extendedVanuatuProducts);

  useEffect(() => {
    let mounted = true;
    const loadProducts = async () => {
      try {
        const rows = await getWarehouseProducts(accountId);
        if (!mounted) return;
        if (rows && rows.length > 0) setProducts(rows as StretProduct[]);
      } catch {
        if (!mounted) return;
      }
    };
    loadProducts();
    return () => {
      mounted = false;
    };
  }, [accountId]);

  const simulateScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      const source = products.length > 0 ? products : extendedVanuatuProducts;
      const randomProduct = source[Math.floor(Math.random() * source.length)];
      setScannedProduct(randomProduct);
      setIsScanning(false);
      setShowResult(true);
      speakProductLocation(randomProduct, i18n.language);
    }, 1200);
  };

  const closeResult = () => {
    setShowResult(false);
    setScannedProduct(null);
  };

  const getZoneGradient = (color: string) => {
    switch (color) {
      case 'Green':
        return 'from-[#eef4ff] to-teal-500';
      case 'Red':
        return 'from-[#eef4ff] to-[#f8f9fa]';
      case 'Blue':
        return 'from-[#eef4ff] to-[#f8f9fa]';
            default:
        return 'from-slate-600 to-slate-400';
    }
  };

  const stats = useMemo(() => {
    const total = products.length;
    let low = 0;
    let out = 0;
    products.forEach((p) => {
      const stock = Number(p.stock || 0);
      if (stock <= 0) out += 1;
      else if (stock <= LOW_STOCK_THRESHOLD) low += 1;
    });
    return { total, low, out };
  }, [products]);

  const getStockStatus = (stock: number) => {
    if (stock <= 0) return '无货';
    if (stock <= LOW_STOCK_THRESHOLD) return '低库存';
    return '有库存';
  };

  return (
    <div className="ui-panel h-[calc(100vh-120px)] grid grid-cols-1 xl:grid-cols-[420px,1fr] gap-6">
      <div className="h-full flex flex-col relative overflow-hidden bg-slate-950 rounded-[24px] border-[8px] border-slate-900 shadow-2xl">
        <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
          <AnimatePresence>
            {isScanning && (
              <motion.div
                initial={{ top: '10%' }}
                animate={{ top: '90%' }}
                transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                className="absolute left-0 right-0 h-1 bg-[#1a237e] blur-sm z-10 shadow-[0_0_15px_rgba(56,189,248,0.8)]"
              />
            )}
          </AnimatePresence>

          <div className="absolute inset-0 border-[40px] border-black/60 pointer-events-none">
            <div className="w-full h-full border-2 border-slate-800 rounded-3xl relative">
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-[#dbe7ff] rounded-tl-xl" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-[#dbe7ff] rounded-tr-xl" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-[#dbe7ff] rounded-bl-xl" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-[#dbe7ff] rounded-br-xl" />
            </div>
          </div>

          {!isScanning && !showResult && (
            <div className="text-center space-y-6 px-8 relative z-20">
              <div className="w-24 h-24 bg-[#1a237e] rounded-full flex items-center justify-center mx-auto border border-[#dbe7ff] animate-pulse">
                <Scan size={48} className="text-[#1a237e]" />
              </div>
              <div className="space-y-2">
                <h2 className="text-white font-black text-xl uppercase tracking-widest">准备扫码</h2>
                <p className="text-slate-400 text-sm font-medium">将镜头对准商品条码，立即定位库位。</p>
              </div>
              <button
                onClick={simulateScan}
                className="ui-btn ui-btn-primary text-white px-10 py-5 rounded-3xl uppercase tracking-widest shadow-xl shadow-slate-200"
              >
                开始扫码
              </button>
            </div>
          )}

          {isScanning && (
            <div className="absolute bottom-12 left-0 right-0 text-center z-20">
              <div className="text-white font-black uppercase tracking-[0.3em] flex items-center justify-center gap-3">
                <div className="w-2 h-2 bg-[#1a237e] rounded-full animate-bounce" />
                识别中...
              </div>
            </div>
          )}
        </div>

        <AnimatePresence>
          {showResult && scannedProduct && (
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 20 }}
              className={`absolute inset-0 bg-gradient-to-b ${getZoneGradient(scannedProduct.zoneColor)} z-30 flex flex-col p-8`}
            >
              <div className="flex justify-between items-center mb-8">
                <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
                  <MapPin className="text-white" size={24} />
                </div>
                <button onClick={closeResult} className="p-3 bg-white/10 rounded-2xl hover:bg-white/20 transition-all">
                  <X className="text-white" size={24} />
                </button>
              </div>

              <div className="flex-1 space-y-8 flex flex-col justify-center text-center">
                <div className="space-y-4">
                  <div className="text-white/70 text-xs font-black uppercase tracking-[0.4em]">{scannedProduct.barcode}</div>
                  <h1 className="text-4xl font-black text-white leading-tight">{scannedProduct.title}</h1>
                  <div className="bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full flex items-center gap-2 border border-white/30 mx-auto w-fit">
                    <div className="w-1.5 h-1.5 bg-[#1a237e] rounded-full animate-pulse" />
                    <span className="text-sm font-black text-white">{scannedProduct.stock} {t('bottles')}</span>
                  </div>
                </div>

                <div className="py-6 relative">
                  <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-0.5 bg-white/20" />
                  <div className="relative bg-white text-slate-900 rounded-[28px] p-6 shadow-2xl space-y-2">
                    <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">目标库位</div>
                    <div className="text-2xl font-black">{getFullLocation(scannedProduct, t)}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 border border-white/20 flex flex-col items-center gap-2">
                    <Circle className="text-[#1a237e] fill-emerald-400" size={12} />
                    <div className="text-[10px] font-black uppercase text-white/60">{t('row')}</div>
                    <div className="text-3xl font-black text-white">{String(scannedProduct.rowNum).padStart(2, '0')}</div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 border border-white/20 flex flex-col items-center gap-2">
                    <div className="text-[#1a237e] font-black text-xs">货架</div>
                    <div className="text-[10px] font-black uppercase text-white/60">{t('shelf')}</div>
                    <div className="text-3xl font-black text-white">{scannedProduct.shelfId}</div>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex gap-4">
                <button
                  onClick={() => scannedProduct && speakProductLocation(scannedProduct, i18n.language)}
                  className="ui-btn ui-btn-secondary flex-1 py-5 rounded-[20px] uppercase tracking-widest flex items-center justify-center gap-3 shadow-2xl"
                >
                  <Volume2 /> 播报位置
                </button>
                <button onClick={closeResult} className="w-20 bg-white/20 backdrop-blur-md text-white py-5 rounded-[20px] font-black flex items-center justify-center">
                  <CheckCircle2 />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="h-full flex flex-col min-h-0 rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200">
          <h3 className="text-lg font-bold text-slate-900">库存管理（右侧镜像）</h3>
          <p className="text-xs text-slate-500 mt-1">已复制库存管理页右侧信息区到扫码器右侧。</p>
        </div>

        <div className="px-5 py-4 grid grid-cols-3 gap-3 border-b border-slate-100 bg-slate-50">
          <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
            <div className="text-[11px] text-slate-500">商品总数</div>
            <div className="text-xl font-black text-slate-900">{stats.total}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
            <div className="text-[11px] text-slate-500">低库存</div>
            <div className="text-xl font-black text-[#1a237e]">{stats.low}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
            <div className="text-[11px] text-slate-500">无货</div>
            <div className="text-xl font-black text-[#1a237e]">{stats.out}</div>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500">商品</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500">条码</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500">库存</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500">状态</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {products.slice(0, 120).map((p) => {
                const stock = Number(p.stock || 0);
                const status = getStockStatus(stock);
                const isHit = scannedProduct?.id === p.id;
                return (
                  <tr key={p.id} className={isHit ? 'bg-[#1a237e]' : ''}>
                    <td className="px-4 py-3 font-medium text-slate-900">{p.title}</td>
                    <td className="px-4 py-3 text-slate-500">{p.barcode || '-'}</td>
                    <td className="px-4 py-3 text-slate-700">{stock}</td>
                    <td className="px-4 py-3">
                      <span className={
                        status === '无货'
                          ? 'text-xs font-semibold text-[#1a237e]'
                          : status === '低库存'
                          ? 'text-xs font-semibold text-[#1a237e]'
                          : 'text-xs font-semibold text-[#1a237e]'
                      }>
                        {status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default WarehouseScannerPage;


