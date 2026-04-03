import React, { useState } from 'react';
import { 
  FileText, 
  ShieldCheck, 
  Download, 
  Printer, 
  Info, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  FileSearch,
  Scale,
  Building,
  UserCheck,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { formatVT } from '../lib/utils';

interface CustomsDocument {
  id: string;
  type: 'IMPORT_DECLARATION' | 'BILL_OF_LADING' | 'PHYTOSANITARY' | 'DUTY_INVOICE';
  shipmentId: string;
  status: 'PENDING_APPROVAL' | 'VERIFIED' | 'REJECTED';
  expiryDate: string;
  verifier: string;
}

const DigitalCustomsDocsPage: React.FC = () => {
  const { t } = useTranslation();
  const [selectedDoc, setSelectedDoc] = useState<CustomsDocument | null>(null);

  // Mock Active Customs Documents
  const docs: CustomsDocument[] = [
     { id: 'DOC-VU-901', type: 'IMPORT_DECLARATION', shipmentId: 'SHIP-CN-202', status: 'VERIFIED', expiryDate: '2026-12-31', verifier: 'Vanuatu Customs Dept' },
     { id: 'DOC-VU-905', type: 'BILL_OF_LADING', shipmentId: 'SHIP-AU-085', status: 'PENDING_APPROVAL', expiryDate: '2026-06-15', verifier: 'TBC' },
     { id: 'DOC-VU-112', type: 'DUTY_INVOICE', shipmentId: 'SHIP-CN-202', status: 'VERIFIED', expiryDate: 'N/A', verifier: 'Ministry of Finance' },
  ];

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-10 pb-24">
      {/* 1. Customs Status Hero */}
      <div className="ui-panel bg-slate-900 rounded-[24px] sm:rounded-[48px] p-5 sm:p-8 lg:p-12 text-white relative overflow-hidden shadow-2xl">
         <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-emerald-500/10 blur-[100px] rounded-full -mr-32 -mt-32" />
         
         <div className="flex flex-col md:flex-row justify-between items-center gap-8 relative">
            <div className="space-y-4">
               <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                     <ShieldCheck size={28} />
                  </div>
                  <div>
                    <h2 className="text-3xl font-black uppercase tracking-tighter">Digital Customs Clearance</h2>
                    <div className="flex items-center gap-2 text-emerald-400 text-[10px] font-black uppercase tracking-widest mt-1">
                       <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                       Vanuatu ASYCUDA Sync Active
                    </div>
                  </div>
               </div>
            </div>
            
            <div className="flex gap-4">
               <button className="ui-btn px-6 sm:px-8 py-4 bg-slate-100 border border-slate-200 rounded-2xl text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center gap-2 text-slate-600">
                  <FileSearch size={16} /> Audit History
               </button>
               <button className="ui-btn px-6 sm:px-8 py-4 bg-emerald-500 rounded-2xl text-[10px] uppercase tracking-widest hover:bg-emerald-600 transition-all text-white shadow-xl shadow-emerald-500/20">
                  Submit NEW Entry
               </button>
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
         {/* 2. Document Repository */}
         <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            <div className="flex items-center justify-between px-2">
               <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Validated Document Vault</h3>
               <div className="flex items-center gap-2 text-[10px] font-black text-slate-500">
                  <Scale size={14} /> Compliance Rate: 100%
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {docs.map(doc => (
                 <motion.div 
                   key={doc.id}
                   whileHover={{ y: -4 }}
                   onClick={() => setSelectedDoc(doc)}
                   className={`ui-card bg-white rounded-[24px] sm:rounded-[32px] p-5 sm:p-8 border-2 cursor-pointer transition-all ${
                     selectedDoc?.id === doc.id ? 'border-emerald-500 shadow-xl' : 'border-slate-50 shadow-sm hover:border-slate-200'
                   }`}
                 >
                    <div className="flex justify-between items-start mb-6">
                       <div className={`p-4 rounded-xl ${
                         doc.status === 'VERIFIED' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                       }`}>
                          <FileText size={24} />
                       </div>
                       <div className={`px-3 py-1 rounded text-[8px] font-black uppercase ${
                         doc.status === 'VERIFIED' ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'
                       }`}>
                          {doc.status.replace('_', ' ')}
                       </div>
                    </div>
                    
                    <div className="space-y-4">
                       <div>
                          <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{doc.type.replace('_', ' ')}</div>
                          <div className="text-xl font-black text-slate-800 tracking-tighter uppercase leading-none mt-1">{doc.id}</div>
                       </div>
                       
                       <div className="flex justify-between items-center text-[10px] font-black">
                          <span className="text-slate-400 uppercase tracking-widest">Shipment</span>
                          <span className="text-slate-600">{doc.shipmentId}</span>
                       </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-slate-50 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                           <UserCheck size={14} className="text-slate-300" />
                           <span className="text-[9px] font-black text-slate-400 uppercase truncate max-w-[120px]">{doc.verifier}</span>
                        </div>
                        <ChevronRight size={16} className="text-slate-200" />
                    </div>
                 </motion.div>
               ))}
            </div>
         </div>

         {/* 3. Document Preview / ACTION Pannel */}
         <div className="space-y-4 sm:space-y-8">
            <AnimatePresence mode="wait">
               {selectedDoc ? (
                 <motion.div 
                   key="preview"
                   initial={{ opacity: 0, x: 20 }}
                   animate={{ opacity: 1, x: 0 }}
                   exit={{ opacity: 0, x: 20 }}
                   className="ui-card bg-white rounded-[24px] sm:rounded-[40px] p-5 sm:p-8 lg:p-10 border border-slate-200 shadow-2xl space-y-6 sm:space-y-8 sticky top-6"
                 >
                    <div className="p-10 bg-slate-50 rounded-[32px] border-2 border-dashed border-slate-200 flex flex-col items-center text-center space-y-4">
                       <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center text-slate-300">
                          <FileText size={32} />
                       </div>
                       <div className="space-y-1">
                          <div className="text-lg font-black text-slate-800 uppercase tracking-tighter">Digital Preview</div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Signed & Verified by VANGOV</div>
                       </div>
                    </div>

                    <div className="space-y-4">
                       <div className="flex items-center justify-between px-2">
                          <span className="text-[10px] font-black text-slate-400 uppercase">Document Hash</span>
                          <span className="text-[10px] font-mono text-slate-800 underline">88A1...F902</span>
                       </div>
                       <div className="grid grid-cols-2 gap-4">
                          <button className="bg-slate-900 text-white rounded-2xl py-5 flex flex-col items-center gap-2 group hover:bg-emerald-500 transition-all">
                             <Download size={20} className="group-hover:translate-y-1 transition-transform" />
                             <span className="text-[9px] font-black uppercase tracking-widest">Download PDF</span>
                          </button>
                          <button 
                            onClick={() => window.print()}
                            className="bg-slate-100 text-slate-400 rounded-2xl py-5 flex flex-col items-center gap-2 hover:bg-slate-200 hover:text-slate-800 transition-all font-black uppercase tracking-widest"
                          >
                             <Printer size={20} />
                             <span className="text-[9px]">Print Physical</span>
                          </button>
                       </div>
                    </div>

                    <div className="p-6 bg-emerald-50 rounded-3xl border border-emerald-100 flex items-start gap-4">
                       <CheckCircle2 size={20} className="text-emerald-500 shrink-0" />
                       <div className="space-y-1">
                          <div className="text-xs font-black text-emerald-800 uppercase">Compliance Active</div>
                          <div className="text-[9px] font-bold text-emerald-600 uppercase leading-relaxed">
                             This document matches the ASYCUDA manifest for shipment {selectedDoc.shipmentId}.
                          </div>
                       </div>
                    </div>
                 </motion.div>
               ) : (
                 <div className="ui-panel bg-slate-50 rounded-[24px] sm:rounded-[40px] p-8 sm:p-12 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center space-y-4 h-[420px] sm:h-[500px]">
                    <FileSearch size={64} className="text-slate-200" />
                    <div className="space-y-2">
                       <div className="text-sm font-black text-slate-400 uppercase tracking-widest">No Document Selected</div>
                       <p className="text-[10px] font-bold text-slate-300 uppercase leading-relaxed max-w-[200px]">Select a document from the vault to view details and compliance status.</p>
                    </div>
                 </div>
               )}
            </AnimatePresence>

            <div className="ui-panel bg-amber-50 rounded-[24px] sm:rounded-[32px] p-5 sm:p-8 border border-amber-100 space-y-4">
               <div className="flex items-center gap-3">
                  <AlertTriangle className="text-amber-500" size={20} />
                  <div className="text-xs font-black text-amber-800 uppercase tracking-tighter">Regulatory Notice</div>
               </div>
               <p className="text-[9px] font-bold text-amber-700 uppercase leading-relaxed">
                  Import declarations must be filed 48 hours prior to port arrival. Late filing may incur VT 50,000 penalty.
               </p>
            </div>
         </div>
      </div>
    </div>
  );
};

export default DigitalCustomsDocsPage;
