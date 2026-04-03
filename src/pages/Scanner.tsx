import React, { useState, useEffect } from 'react';
import { 
  Scan, 
  MapPin, 
  Volume2, 
  X, 
  CheckCircle2, 
  ChevronRight,
  Map as MapIcon,
  Circle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { getFullLocation, StretProduct } from '../lib/productLogic';
import { speakProductLocation, speakAlert } from '../lib/voiceModule';
import { extendedVanuatuProducts } from '../lib/mockDataFull';

const WarehouseScannerPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [isScanning, setIsScanning] = useState(false);
  const [scannedProduct, setScannedProduct] = useState<StretProduct | null>(null);
  const [showResult, setShowResult] = useState(false);

  const simulateScan = () => {
    setIsScanning(true);
    // Simulate camera delay
    setTimeout(() => {
      // Randomly pick one from the 100+ products
      const randomProduct = extendedVanuatuProducts[Math.floor(Math.random() * extendedVanuatuProducts.length)];
      setScannedProduct(randomProduct);
      setIsScanning(false);
      setShowResult(true);
      
      // Advanced Voice Routing
      speakProductLocation(randomProduct, i18n.language);
    }, 1500);
  };

  const closeResult = () => {
    setShowResult(false);
    setScannedProduct(null);
  };

  const getZoneGradient = (color: string) => {
    switch(color) {
      case 'Green': return 'from-emerald-600 to-teal-500';
      case 'Red': return 'from-rose-600 to-orange-500';
      case 'Blue': return 'from-sky-600 to-indigo-500';
      case 'Yellow': return 'from-amber-600 to-yellow-500';
      default: return 'from-slate-600 to-slate-400';
    }
  };

  return (
    <div className="ui-panel max-w-md mx-auto h-[calc(100vh-120px)] flex flex-col relative overflow-hidden bg-slate-950 rounded-[24px] sm:rounded-[48px] border-[8px] border-slate-900 shadow-2xl">
      {/* Scanner Viewport */}
      <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
        {/* Animated Scan Lines */}
        <AnimatePresence>
          {isScanning && (
            <motion.div 
              initial={{ top: '10%' }}
              animate={{ top: '90%' }}
              transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
              className="absolute left-0 right-0 h-1 bg-sky-400/50 blur-sm z-10 shadow-[0_0_15px_rgba(56,189,248,0.8)]"
            />
          )}
        </AnimatePresence>

        {/* Camera Mask */}
        <div className="absolute inset-0 border-[40px] border-black/60 pointer-events-none">
          <div className="w-full h-full border-2 border-slate-800 rounded-3xl relative">
            {/* Corner Bracket Decorations */}
            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-sky-500 rounded-tl-xl" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-sky-500 rounded-tr-xl" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-sky-500 rounded-bl-xl" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-sky-500 rounded-br-xl" />
          </div>
        </div>

        {/* Initial UI */}
        {!isScanning && !showResult && (
          <div className="text-center space-y-6 px-8 relative z-20">
            <div className="w-24 h-24 bg-sky-500/20 rounded-full flex items-center justify-center mx-auto border border-sky-500/50 animate-pulse">
               <Scan size={48} className="text-sky-400" />
            </div>
            <div className="space-y-2">
              <h2 className="text-white font-black text-xl uppercase tracking-widest">准备扫码</h2>
              <p className="text-slate-400 text-sm font-medium">将镜头对准商品条码，立即定位库位。</p>
            </div>
            <button 
              onClick={simulateScan}
              className="ui-btn ui-btn-primary text-white px-10 py-5 rounded-3xl uppercase tracking-widest shadow-xl shadow-sky-500/30"
            >
              开始扫码
            </button>
          </div>
        )}

        {/* Scanning Text */}
        {isScanning && (
          <div className="absolute bottom-12 left-0 right-0 text-center z-20">
             <div className="text-white font-black uppercase tracking-[0.3em] flex items-center justify-center gap-3">
               <div className="w-2 h-2 bg-sky-400 rounded-full animate-bounce" />
               识别中...
             </div>
          </div>
        )}
      </div>

      {/* Result Overlay */}
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
                 <div className="flex flex-col items-center gap-4">
                   {scannedProduct.imageUrl && (
                     <div className="w-32 h-32 bg-white rounded-3xl overflow-hidden shadow-2xl p-2 border-4 border-white/20">
                        <img src={scannedProduct.imageUrl} alt={scannedProduct.title} className="w-full h-full object-contain" />
                     </div>
                   )}
                   <h1 className="text-5xl font-black text-white leading-tight">{scannedProduct.title}</h1>
                   <div className="bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full flex items-center gap-2 border border-white/30">
                      <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                      <span className="text-sm font-black text-white">{scannedProduct.stock} {t('bottles')}</span>
                   </div>
                 </div>
               </div>

               <div className="py-12 relative">
                  <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-0.5 bg-white/20" />
                  <div className="relative bg-white text-slate-900 rounded-[32px] p-8 shadow-2xl space-y-2">
                     <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">目标库位</div>
                     <div className="text-2xl font-black">{getFullLocation(scannedProduct, t)}</div>
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 border border-white/20 flex flex-col items-center gap-2">
                     <Circle className="text-emerald-400 fill-emerald-400" size={12} />
                     <div className="text-[10px] font-black uppercase text-white/60">{t('row')}</div>
                     <div className="text-3xl font-black text-white">{String(scannedProduct.rowNum).padStart(2, '0')}</div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 border border-white/20 flex flex-col items-center gap-2">
                     <div className="text-sky-400 font-black text-xs">货架</div>
                     <div className="text-[10px] font-black uppercase text-white/60">{t('shelf')}</div>
                     <div className="text-3xl font-black text-white">{scannedProduct.shelfId}</div>
                  </div>
               </div>
            </div>

            <div className="mt-8 flex gap-4">
               <button 
                  onClick={() => scannedProduct && speakProductLocation(scannedProduct, i18n.language)}
                  className="ui-btn ui-btn-secondary flex-1 py-6 rounded-[20px] sm:rounded-[28px] uppercase tracking-widest flex items-center justify-center gap-3 shadow-2xl"
               >
                  <Volume2 /> 播报位置
               </button>
               <button onClick={closeResult} className="w-20 bg-white/20 backdrop-blur-md text-white py-6 rounded-[28px] font-black flex items-center justify-center">
                  <CheckCircle2 />
               </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default WarehouseScannerPage;

