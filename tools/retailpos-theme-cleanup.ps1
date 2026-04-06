$ErrorActionPreference = 'Stop'

$p = 'E:\Github\Stret-POS\src\pages\RetailPOS.tsx'
$c = Get-Content -Raw -Path $p

$replacements = @(
  @{ Old = '鍏ㄩ儴鍒嗙被'; New = '全部分类' },
  @{ Old = '脳'; New = 'x' },
  @{ Old = 'bg-sky-500 text-white shadow-lg shadow-sky-100'; New = 'bg-[#1a237e] text-white border-[#1a237e] shadow-lg shadow-[#1a237e]/10' },
  @{ Old = 'bg-slate-100 text-slate-500 hover:bg-slate-200'; New = 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50' },
  @{ Old = 'text-sky-500 uppercase tracking-widest'; New = 'text-[#1a237e] uppercase tracking-widest' },
  @{ Old = 'ui-panel bg-slate-900 rounded-[24px] sm:rounded-[40px] p-4 sm:p-6 lg:p-8 text-white flex-1 min-h-0 flex flex-col shadow-2xl relative overflow-hidden'; New = 'ui-card bg-white rounded-[24px] sm:rounded-[40px] p-4 sm:p-6 lg:p-8 text-slate-900 flex-1 min-h-0 flex flex-col shadow-sm relative overflow-hidden' },
  @{ Old = 'absolute top-0 right-0 w-64 h-64 bg-sky-500/10 blur-[100px] rounded-full -mr-32 -mt-32'; New = 'absolute top-0 right-0 w-64 h-64 bg-[#1a237e]/5 blur-[100px] rounded-full -mr-32 -mt-32' },
  @{ Old = 'w-10 h-10 bg-sky-500 rounded-2xl flex items-center justify-center shadow-lg shadow-sky-500/20'; New = 'w-10 h-10 bg-[#1a237e] rounded-2xl flex items-center justify-center text-white shadow-lg shadow-[#1a237e]/10' },
  @{ Old = 'bg-white/10 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest text-sky-400 whitespace-nowrap'; New = 'bg-[#eef4ff] text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest text-[#1a237e] whitespace-nowrap' },
  @{ Old = 'w-12 h-12 rounded-xl bg-slate-800 overflow-hidden shrink-0 border border-white/5'; New = 'w-12 h-12 rounded-xl bg-slate-100 overflow-hidden shrink-0 border border-slate-200' },
  @{ Old = 'w-6 h-6 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 transition-all'; New = 'w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-all' },
  @{ Old = 'w-6 h-6 rounded-lg bg-sky-500 hover:bg-sky-400 flex items-center justify-center text-white shadow-lg shadow-sky-500/20 transition-all'; New = 'w-6 h-6 rounded-lg bg-[#1a237e] hover:bg-[#24308f] flex items-center justify-center text-white shadow-lg shadow-[#1a237e]/10 transition-all' },
  @{ Old = 'ml-2 text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity'; New = 'ml-2 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity' },
  @{ Old = 'mt-5 sm:mt-8 pt-5 sm:pt-8 border-t border-white/10 space-y-3 sm:space-y-4 relative'; New = 'mt-auto pt-5 sm:pt-8 border-t border-slate-200 space-y-3 sm:space-y-4 relative bg-white' },
  @{ Old = '<span className="text-amber-400">+{formatVT(vat)}</span>'; New = '<span className="text-[#1a237e]">+{formatVT(vat)}</span>' },
  @{ Old = '<div className="text-3xl font-black text-white">{formatVT(total)}</div>'; New = '<div className="text-3xl font-black text-[#1a237e]">{formatVT(total)}</div>' },
  @{ Old = 'bg-sky-500 text-white hover:bg-sky-600 active:scale-95'; New = 'bg-[#1a237e] text-white hover:bg-[#24308f] active:scale-95' },
  @{ Old = 'fixed right-4 bottom-6 z-[80] w-16 h-16 rounded-full bg-sky-500 text-white shadow-2xl shadow-sky-500/40 flex flex-col items-center justify-center'; New = 'fixed right-4 bottom-6 z-[80] w-16 h-16 rounded-full bg-[#1a237e] text-white shadow-2xl shadow-[#1a237e]/20 flex flex-col items-center justify-center' },
  @{ Old = "scanToast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'"; New = "scanToast.type === 'success' ? 'bg-[#1a237e] text-white' : 'bg-[#24308f] text-white'" },
  @{ Old = 'bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center'; New = 'bg-slate-900/30 backdrop-blur-sm flex items-end sm:items-center justify-center' },
  @{ Old = 'w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl p-4 sm:p-6 space-y-4 max-h-[85dvh] overflow-y-auto'; New = 'w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl p-4 sm:p-6 space-y-4 max-h-[85dvh] overflow-y-auto shadow-2xl' },
  @{ Old = 'bg-sky-500 text-white border-sky-500'; New = 'bg-[#1a237e] text-white border-[#1a237e]' },
  @{ Old = 'rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-1 text-sm'; New = 'rounded-xl border border-slate-200 bg-white p-3 space-y-1 text-sm' },
  @{ Old = 'bg-sky-500 p-6 sm:p-12 text-center text-white relative'; New = 'bg-white p-6 sm:p-12 text-center text-slate-900 relative border-b border-slate-200' },
  @{ Old = 'absolute top-6 right-6 p-2 bg-white/10 rounded-full hover:bg-white/20 transition-all'; New = 'absolute top-6 right-6 p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-all text-slate-600' },
  @{ Old = 'w-20 h-20 bg-white rounded-[32px] flex items-center justify-center mx-auto mb-6 text-sky-500 shadow-2xl'; New = 'w-20 h-20 bg-[#1a237e] rounded-[32px] flex items-center justify-center mx-auto mb-6 text-white shadow-2xl' },
  @{ Old = 'text-sky-100 text-xs font-bold uppercase tracking-wider mt-2 opacity-80'; New = 'text-slate-500 text-xs font-bold uppercase tracking-wider mt-2' },
  @{ Old = 'bg-white/10 backdrop-blur inline-block px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest text-white'; New = 'bg-[#eef4ff] inline-block px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest text-[#1a237e]' },
  @{ Old = 'text-white/90'; New = 'text-slate-500' },
  @{ Old = 'rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs font-bold text-slate-600 space-y-2'; New = 'rounded-2xl border border-slate-200 bg-white p-4 text-xs font-bold text-slate-600 space-y-2' },
  @{ Old = 'text-sky-600'; New = 'text-[#1a237e]' },
  @{ Old = 'bg-slate-900 text-white py-6 rounded-[32px] font-black text-[10px] uppercase tracking-[0.4em] hover:bg-sky-500 transition-all shadow-xl shadow-slate-200'; New = 'bg-[#1a237e] text-white py-6 rounded-[32px] font-black text-[10px] uppercase tracking-[0.4em] hover:bg-[#24308f] transition-all shadow-xl shadow-slate-200' }
)

foreach ($item in $replacements) {
  $c = $c.Replace($item.Old, $item.New)
}

Set-Content -Path $p -Value $c -Encoding utf8
