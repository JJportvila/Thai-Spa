import React, { useState } from 'react';
import {
  Grid3X3,
  Layers,
  Map as MapIcon, 
  Info, 
  Package, 
  AlertCircle,
  Search,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { extendedVanuatuProducts } from '../lib/mockDataFull';
import { StretProduct } from '../lib/productLogic';

const VirtualShelfPage: React.FC = () => {
  const [selectedZone, setSelectedZone] = useState<'Green' | 'Red' | 'Blue' | 'Yellow'>('Green');
  const [selectedShelf, setSelectedShelf] = useState('A1');
  const zoneNameMap: Record<'Green' | 'Red' | 'Blue' | 'Yellow', string> = {
    Green: '绿区',
    Red: '红区',
    Blue: '蓝区',
    Yellow: '黄区',
  };
  
  // Grid config
  const rows = [1, 2, 3, 4, 5];
  const cols = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  const zones = [
    { id: 'Green', name: zoneNameMap.Green, color: 'bg-emerald-500', shadow: 'shadow-emerald-200' },
    { id: 'Red', name: zoneNameMap.Red, color: 'bg-rose-500', shadow: 'shadow-rose-200' },
    { id: 'Blue', name: zoneNameMap.Blue, color: 'bg-sky-500', shadow: 'shadow-sky-200' },
    { id: 'Yellow', name: zoneNameMap.Yellow, color: 'bg-amber-500', shadow: 'shadow-amber-200' },
  ];

  const getProductAt = (row: number, col: number) => {
    return extendedVanuatuProducts.find(p => 
      p.zoneColor === selectedZone && 
      p.shelfId === selectedShelf && 
      p.rowNum === row && 
      p.colNum === col
    );
  };

  const calculateOccupancy = () => {
    const zoneProducts = extendedVanuatuProducts.filter(p => p.zoneColor === selectedZone && p.shelfId === selectedShelf);
    return ((zoneProducts.length / (rows.length * cols.length)) * 100).toFixed(1);
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header & Controls */}
      <div className="ui-card bg-white rounded-[24px] sm:rounded-[32px] p-5 sm:p-8 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
             <Grid3X3 className="text-sky-500" /> 虚拟货架地图
          </h2>
          <p className="text-slate-400 text-sm font-medium">实时查看仓库分区占用率与库存分布。</p>
        </div>

        <div className="flex flex-wrap gap-3">
          {zones.map(zone => (
            <button
              key={zone.id}
              onClick={() => setSelectedZone(zone.id as any)}
              className={`px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2 ${
                selectedZone === zone.id 
                ? `${zone.color} text-white shadow-xl ${zone.shadow}` 
                : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${selectedZone === zone.id ? 'bg-white' : zone.color}`} />
              {zone.name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Left Stats/Selector */}
        <div className="lg:col-span-1 space-y-6">
          <div className="ui-panel bg-slate-900 rounded-[24px] sm:rounded-[32px] p-5 sm:p-8 text-white space-y-8">
             <div className="space-y-2">
                <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">当前货架</div>
                <div className="flex items-center justify-between bg-slate-800 p-4 rounded-2xl border border-slate-700">
                   <div className="text-2xl font-black">{selectedShelf}</div>
                   <ChevronDown className="text-slate-500" />
                </div>
             </div>

             <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-800 p-4 rounded-2xl space-y-1">
                   <div className="text-[9px] font-black uppercase text-slate-500">占用率</div>
                   <div className="text-xl font-black text-sky-400">{calculateOccupancy()}%</div>
                </div>
                <div className="bg-slate-800 p-4 rounded-2xl space-y-1">
                   <div className="text-[9px] font-black uppercase text-slate-500">商品总数</div>
                   <div className="text-xl font-black text-emerald-400">{extendedVanuatuProducts.filter(p => p.zoneColor === selectedZone).length}</div>
                </div>
             </div>

             <div className="p-5 bg-gradient-to-br from-sky-500 to-indigo-600 rounded-3xl space-y-4 shadow-xl shadow-sky-500/20">
                <div className="flex items-center gap-3">
                   <Info size={18} className="text-white/80" />
                   <span className="text-xs font-black uppercase tracking-widest text-white">网格说明</span>
                </div>
                <div className="text-xs text-white/70 font-medium leading-relaxed">
                   每个格子代表实际库位坐标（行-列）。点击已占用格子可查看库存详情。
                </div>
             </div>
          </div>
        </div>

        {/* Right Grid Map */}
        <div className="lg:col-span-3">
          <div className="ui-card bg-white rounded-[24px] sm:rounded-[40px] p-5 sm:p-8 lg:p-10 border border-slate-200 shadow-xl overflow-x-auto">
            <div className="min-w-[800px] space-y-8">
               {/* Column Labels */}
               <div className="flex gap-4 pl-12">
                  {cols.map(c => (
                    <div key={c} className="flex-1 text-center text-[10px] font-black text-slate-300 uppercase">列 {String.fromCharCode(64 + c)}</div>
                  ))}
               </div>

               {/* Grid Body */}
               <div className="space-y-4">
                  {rows.map(r => (
                    <div key={r} className="flex items-center gap-4">
                       <div className="w-8 text-[10px] font-black text-slate-300 uppercase">行 {r}</div>
                       <div className="flex-1 flex gap-4">
                          {cols.map(c => {
                            const product = getProductAt(r, c);
                            return (
                              <motion.div 
                                key={c} 
                                whileHover={{ scale: 1.05 }}
                                className={`flex-1 aspect-square rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-1 cursor-pointer group relative ${
                                  product 
                                  ? `${selectedZone === 'Green' ? 'bg-emerald-500 border-emerald-600' : 
                                      selectedZone === 'Red' ? 'bg-rose-500 border-rose-600' : 
                                      selectedZone === 'Blue' ? 'bg-sky-500 border-sky-600' : 
                                      'bg-amber-500 border-amber-600'} text-white shadow-lg` 
                                  : 'bg-slate-50 border-slate-100 hover:border-slate-300'
                                }`}
                              >
                                {product ? (
                                  <>
                                    <Package size={20} strokeWidth={2.5} />
                                    <div className="text-[8px] font-black text-white/50">{product.stock}</div>
                                    
                                    {/* Tooltip */}
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-slate-900 text-white p-3 rounded-xl text-[10px] font-bold opacity-0 group-hover:opacity-100 pointer-events-none transition-all z-50 shadow-2xl">
                                       <div className="text-sky-400 mb-1">{product.title}</div>
                                       <div className="text-white/50">{product.barcode}</div>
                                    </div>
                                  </>
                                ) : (
                                  <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                                )}
                              </motion.div>
                            );
                          })}
                       </div>
                    </div>
                  ))}
               </div>
            </div>
          </div>

          <div className="mt-8 flex items-center justify-center gap-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
             <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-slate-100 border border-slate-200" /> 空位
             </div>
             <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-emerald-500 shadow-md" /> 已占用
             </div>
             <div className="flex items-center gap-2 text-rose-500">
                <AlertCircle size={14} /> 低库存预警（{"<5"}）
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VirtualShelfPage;

