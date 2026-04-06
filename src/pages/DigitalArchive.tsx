import React, { useState } from 'react';
import { 
  FolderOpen, 
  FileText, 
  Scan, 
  Archive, 
  Search, 
  Filter, 
  UploadCloud, 
  Clock, 
  CheckCircle2, 
  MoreVertical,
  Download,
  Eye,
  Trash2,
  Tag,
  Hash
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';

interface AutoArchiveDoc {
  id: string;
  name: string;
  type: 'INVOICE' | 'RECEIPT' | 'SCAN' | 'CONTRACT';
  category: 'PURCHASE' | 'LOGISTICS' | 'VAT_CLAIM';
  status: 'ARCHIVED' | 'EXTRACTING' | 'PENDING';
  timestamp: string;
  size: string;
  tags: string[];
}

const DigitalArchivePage: React.FC = () => {
  const { t } = useTranslation();
  const [isScanning, setIsScanning] = useState(false);
  const [filter, setFilter] = useState('ALL');

  // Mock Archived Data
  const archiveDocs: AutoArchiveDoc[] = [
    { id: 'ARC-001', name: 'INV_VanuatuBev_MAR2026.pdf', type: 'INVOICE', category: 'PURCHASE', status: 'ARCHIVED', timestamp: '2026-03-21 14:20', size: '1.2 MB', tags: ['VAT_CLAIM', 'BEVERAGE'] },
    { id: 'ARC-002', name: 'MANIFEST_AU_SHIP_112.jpg', type: 'SCAN', category: 'LOGISTICS', status: 'ARCHIVED', timestamp: '2026-03-21 09:15', size: '4.5 MB', tags: ['OVERSEAS', 'PORT_VILA'] },
    { id: 'ARC-003', name: 'FUEL_REC_EFATE_TRUCK.png', type: 'RECEIPT', category: 'LOGISTICS', status: 'EXTRACTING', timestamp: '2026-03-21 17:45', size: '890 KB', tags: ['OPEX', 'TRUCKING'] },
    { id: 'ARC-004', name: 'RETAIL_WHOLESALE_AGREEMENT.pdf', type: 'CONTRACT', category: 'PURCHASE', status: 'ARCHIVED', timestamp: '2026-03-15 11:00', size: '3.1 MB', tags: ['LEGAL', 'DIRECT_STORE'] },
  ];

  const handleScanSimulation = () => {
    setIsScanning(true);
    setTimeout(() => setIsScanning(false), 3000);
  };

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8 pb-24">
      {/* 1. Header & AI Archive Control */}
      <div className="ui-panel bg-white rounded-[24px] sm:rounded-[48px] p-5 sm:p-8 lg:p-12 text-[#1a237e] relative overflow-hidden shadow-2xl">
         <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#1a237e] blur-[120px] rounded-full -mr-32 -mt-32" />
         
         <div className="flex flex-col md:flex-row justify-between items-center gap-10 relative">
            <div className="space-y-6">
               <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-[#1a237e] rounded-3xl flex items-center justify-center shadow-xl shadow-slate-200">
                     <Archive size={32} />
                  </div>
                  <div>
                    <h2 className="text-4xl font-black uppercase tracking-tighter">智能数字档案库</h2>
                    <p className="text-slate-500 text-xs font-black uppercase tracking-[0.3em] mt-1">AI 自动识别与分类归档</p>
                  </div>
               </div>
               
               <div className="flex gap-4">
                  <div className="flex items-center gap-3 bg-white/5 py-3 px-6 rounded-2xl border border-white/10">
                    <Hash className="text-[#1a237e]" size={16} />
                    <span className="text-xs font-black uppercase tracking-widest text-slate-400">共 1,280 份档案</span>
                  </div>
                  <div className="flex items-center gap-3 bg-white/5 py-3 px-6 rounded-2xl border border-white/10">
                    <Database className="text-[#1a237e]" size={16} />
                    <span className="text-xs font-black uppercase tracking-widest text-slate-400">已用 4.2 GB / 100 GB</span>
                  </div>
               </div>
            </div>
            
            <div className="flex flex-col gap-3 sm:gap-4 min-w-[240px] w-full md:w-auto">
               <button 
                 onClick={handleScanSimulation}
                 disabled={isScanning}
                 className={`ui-btn w-full py-5 rounded-[24px] sm:rounded-[32px] text-xs uppercase tracking-[0.3em] flex items-center justify-center gap-3 transition-all ${
                   isScanning ? 'bg-white text-slate-500' : 'bg-[#1a237e] text-[#1a237e] hover:bg-[#1a237e] shadow-2xl shadow-slate-200'
                 }`}
               >
                  {isScanning ? (
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
                       <Scan size={20} />
                    </motion.div>
                  ) : <Scan size={20} />}
                  {isScanning ? '识别提取中...' : '扫描新资料'}
               </button>
               <button className="ui-btn w-full py-5 border border-white/10 rounded-[24px] sm:rounded-[32px] text-xs uppercase tracking-[0.3em] text-[#1a237e] hover:bg-white/5 flex items-center justify-center gap-3">
                  <UploadCloud size={20} /> 批量导入
               </button>
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
         {/* 2. Side Filter */}
         <div className="space-y-6">
            <div className="ui-card bg-white rounded-[24px] sm:rounded-[32px] p-5 sm:p-8 border border-slate-200 shadow-sm space-y-6 sm:space-y-8">
               <div className="space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">分类筛选</h3>
                  <div className="space-y-2">
                     {['ALL', 'PURCHASE', 'LOGISTICS', 'VAT_CLAIM', 'LEGAL'].map(cat => (
                        <button 
                          key={cat}
                          onClick={() => setFilter(cat)}
                          className={`w-full text-left px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                            filter === cat ? 'bg-white text-[#1a237e] shadow-lg' : 'text-slate-500 hover:bg-slate-50'
                          }`}
                        >
                           {cat === 'ALL' ? '全部' : cat === 'PURCHASE' ? '采购单据' : cat === 'LOGISTICS' ? '物流资料' : cat === 'VAT_CLAIM' ? '税务申报' : '法务文件'}
                        </button>
                     ))}
                  </div>
               </div>

               <div className="pt-6 border-t border-slate-100 space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">快捷标签</h3>
                  <div className="flex flex-wrap gap-2">
                     {['MAR2026', 'EFATE', 'SANTO', 'TAXABLE'].map(tag => (
                        <span key={tag} className="px-3 py-1.5 bg-slate-50 rounded-lg text-[9px] font-bold text-slate-500 border border-slate-100 hover:border-[#dbe7ff] cursor-pointer transition-all">
                           #{tag}
                        </span>
                     ))}
                  </div>
               </div>
            </div>
         </div>

         {/* 3. Document Grid */}
         <div className="lg:col-span-3 space-y-6">
            <div className="ui-card flex items-center gap-4 bg-white px-4 sm:px-8 py-4 rounded-[24px] sm:rounded-[40px] border border-slate-200 shadow-sm">
               <Search className="text-slate-400" size={20} />
               <input 
                 type="text" 
                 placeholder="按文件名、标签或货运单号搜索..." 
                 className="flex-1 bg-transparent border-none outline-none text-[10px] font-black uppercase tracking-widest placeholder:text-slate-400"
               />
               <Filter className="text-slate-400 cursor-pointer hover:text-[#1a237e] transition-all" size={20} />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
               <AnimatePresence>
                  {archiveDocs
                    .filter(d => filter === 'ALL' || d.category === filter)
                    .map(doc => (
                    <motion.div 
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      key={doc.id}
                      className="ui-card bg-white rounded-[24px] sm:rounded-[40px] p-5 sm:p-8 border border-slate-100 shadow-sm hover:shadow-2xl hover:border-[#dbe7ff] transition-all group"
                    >
                       <div className="flex justify-between items-start mb-6">
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                             doc.type === 'INVOICE' ? 'bg-[#1a237e] text-[#1a237e]' :
                             doc.type === 'SCAN' ? 'bg-[#1a237e] text-[#1a237e]' :
                             'bg-[#1a237e] text-[#1a237e]'
                          }`}>
                             {doc.type === 'INVOICE' ? <FileText size={24} /> : doc.type === 'SCAN' ? <Scan size={24} /> : <Archive size={24} />}
                          </div>
                          <div className="flex items-center gap-2">
                             <div className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${
                                doc.status === 'ARCHIVED' ? 'bg-[#1a237e] text-[#1a237e]' : 'bg-[#1a237e] text-[#1a237e]'
                             }`}>
                                {doc.status === 'ARCHIVED' ? '已归档' : doc.status === 'EXTRACTING' ? '提取中' : '待处理'}
                             </div>
                             <button className="p-2 text-slate-400 hover:text-slate-900 transition-all"><MoreVertical size={16} /></button>
                          </div>
                       </div>

                       <div className="space-y-4">
                          <div>
                             <div className="flex items-center gap-2 mb-1">
                               <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">#{doc.id}</span>
                               <span className="text-[8px] font-black text-[#1a237e] uppercase tracking-widest">
                                 • {doc.category === 'PURCHASE' ? '采购' : doc.category === 'LOGISTICS' ? '物流' : '税务'}
                               </span>
                             </div>
                             <h4 className="text-base font-black text-slate-800 tracking-tight leading-none group-hover:text-[#1a237e] transition-colors truncate">{doc.name}</h4>
                          </div>

                          <div className="flex items-center gap-6 text-[9px] font-black text-slate-500 uppercase tracking-widest">
                             <div className="flex items-center gap-1"><Clock size={12} /> {doc.timestamp}</div>
                             <div className="flex items-center gap-1"><Database size={12} /> {doc.size}</div>
                          </div>

                          <div className="pt-6 border-t border-slate-50 flex items-center justify-between">
                             <div className="flex gap-1">
                                {doc.tags.slice(0, 2).map(tag => (
                                   <span key={tag} className="px-2 py-0.5 bg-slate-100 rounded text-[7.5px] font-black text-slate-500">#{tag}</span>
                                ))}
                             </div>
                             <div className="flex items-center gap-2">
                                <button className="w-10 h-10 bg-white text-[#1a237e] rounded-xl flex items-center justify-center hover:bg-[#1a237e] transition-all shadow-lg"><Eye size={16} /></button>
                                <button className="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center hover:bg-[#1a237e] text-[#1a237e] transition-all"><Download size={16} /></button>
                             </div>
                          </div>
                       </div>
                    </motion.div>
                  ))}
               </AnimatePresence>
            </div>
         </div>
      </div>
    </div>
  );
};

const Database: React.FC<any> = ({ className, size }) => <FolderOpen className={className} size={size} />;

export default DigitalArchivePage;

