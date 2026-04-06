import React, { useState } from 'react';
import {
  Calculator,
  ArrowRightLeft,
  Percent,
  Landmark,
  ShieldCheck,
  Building2,
  ChevronRight,
  Receipt,
  AlertCircle,
  FileCheck,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { formatVT } from '../lib/utils';

interface SplitRule {
  id: string;
  label: string;
  source: string;
  distribution: {
    target: string;
    percentage: number;
    label: string;
  }[];
  active: boolean;
}

const AutoSplitRulesPage: React.FC = () => {
  const [rules] = useState<SplitRule[]>([
    {
      id: 'R-001',
      label: '标准销售分账',
      source: '外部零售订单',
      active: true,
      distribution: [
        { target: '批发商（货品成本）', percentage: 80, label: '货品成本' },
        { target: '瓦努阿图税务（增值税）', percentage: 15, label: '增值税 15%' },
        { target: '平台服务费', percentage: 5, label: '服务费' },
      ],
    },
    {
      id: 'R-002',
      label: '直营门店内部调拨',
      source: '直营门店内部订单',
      active: true,
      distribution: [
        { target: '批发商（货品成本）', percentage: 85, label: '内部调拨' },
        { target: '平台中心', percentage: 15, label: '综合利润' },
      ],
    },
    {
      id: 'R-003',
      label: '退货退款分摊',
      source: '货损索赔审批',
      active: true,
      distribution: [
        { target: '零售商信用额', percentage: 100, label: '全额退款' },
        { target: '平台准备金', percentage: -100, label: '负债冲减' },
      ],
    },
  ]);

  const [simAmount, setSimAmount] = useState<number>(10000);

  const calculateSplit = (rule: SplitRule, amount: number) =>
    rule.distribution.map((d) => ({
      ...d,
      value: (amount * d.percentage) / 100,
    }));

  return (
    <div className="space-y-8 pb-20">
      <div className="ui-card bg-white rounded-[24px] sm:rounded-[40px] p-5 sm:p-8 lg:p-10 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
            <Calculator className="text-[#1a237e]" /> 自动分账结算引擎
          </h2>
          <p className="text-slate-500 text-sm font-medium tracking-tight">基于瓦努阿图增值税规则的自动财务分账引擎。</p>
        </div>

        <div className="bg-slate-50 p-6 rounded-[24px] border border-slate-100 flex items-center gap-6">
          <div className="space-y-1">
            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">模拟金额</div>
            <div className="flex gap-2 items-center">
              <span className="text-xl font-black text-slate-800">VT</span>
              <input
                type="number"
                value={simAmount}
                onChange={(e) => setSimAmount(Number(e.target.value))}
                className="bg-transparent border-none p-0 text-xl font-black text-[#1a237e] focus:ring-0 w-24"
              />
            </div>
          </div>
          <ArrowRightLeft className="text-slate-500" size={24} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-xs font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
              <Landmark size={14} /> 当前分账规则
            </h3>
            <button className="text-[10px] font-black text-[#1a237e] uppercase hover:underline">新增规则</button>
          </div>

          {rules.map((rule) => (
            <motion.div
              key={rule.id}
              className={`ui-card bg-white rounded-[24px] sm:rounded-[32px] p-5 sm:p-8 border ${
                rule.active ? 'border-[#dbe7ff]' : 'border-slate-100'
              } shadow-sm space-y-6 group cursor-pointer hover:shadow-xl transition-all`}
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[#1a237e] rounded-2xl flex items-center justify-center text-[#1a237e] group-hover:bg-[#1a237e] group-hover:text-[#1a237e] transition-all">
                    <Percent size={20} />
                  </div>
                  <div>
                    <div className="text-sm font-black text-slate-800">{rule.label}</div>
                    <div className="text-[10px] font-bold text-slate-500">触发条件：{rule.source}</div>
                  </div>
                </div>
                <div className="bg-[#1a237e] text-[#1a237e] px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">
                  启用中
                </div>
              </div>

              <div className="space-y-3">
                {calculateSplit(rule, simAmount).map((calc, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase">
                      <ChevronRight size={10} className="text-[#1a237e]" /> {calc.target}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-[10px] font-black text-slate-400 tracking-tighter">{calc.percentage}%</div>
                      <div className="w-px h-3 bg-slate-100" />
                      <div className="text-xs font-black text-slate-800">{formatVT(calc.value)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        <div className="ui-panel bg-white rounded-[24px] sm:rounded-[40px] p-5 sm:p-8 lg:p-10 text-[#1a237e] space-y-10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-[#1a237e] blur-[100px] rounded-full" />

          <div className="space-y-4">
            <h3 className="text-sm font-black uppercase tracking-[0.2em] flex items-center gap-2">
              <ShieldCheck className="text-[#1a237e]" /> 结算网络
            </h3>
            <p className="text-slate-500 text-[10px] font-bold leading-relaxed uppercase pr-12">
              实时校验分账节点。每一笔销售都会自动拆分到目标子账户。
            </p>
          </div>

          <div className="relative">
            <div className="absolute left-[36px] top-10 bottom-10 w-0.5 bg-gradient-to-b from-[#eef4ff] via-indigo-500 to-slate-800" />

            <div className="space-y-12">
              {[
                { label: '平台中心', icon: ShieldCheck, value: 500, color: 'text-[#1a237e]', sub: '平台运营账户' },
                { label: '税务清算', icon: Receipt, value: 1500, color: 'text-[#1a237e]', sub: 'VAT / VNPF 清算' },
                { label: '批发商结算', icon: Building2, value: 8000, color: 'text-[#1a237e]', sub: '厂家货品成本' },
              ].map((node, i) => (
                <div key={i} className="flex items-start gap-6 relative">
                  <div className="w-18 h-18 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-center p-4 shadow-xl z-10">
                    <node.icon size={28} className={node.color} />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex justify-between items-end">
                      <div className="text-xs font-black uppercase tracking-widest">{node.label}</div>
                      <div className={`text-xl font-black ${node.color}`}>{formatVT((simAmount * node.value) / 10000)}</div>
                    </div>
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">{node.sub}</div>
                    <div className="h-1 bg-white/5 rounded-full mt-2 overflow-hidden">
                      <div
                        className={`h-full bg-current ${node.color}`}
                        style={{ width: `${(node.value / 10000) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white/5 rounded-[28px] p-6 border border-white/10 flex items-center gap-4 group hover:bg-white/10 transition-all cursor-pointer">
            <AlertCircle className="text-[#1a237e]" />
            <div className="flex-1">
              <div className="text-[10px] font-black uppercase text-slate-500">合规校验</div>
              <div className="text-xs font-bold text-[#1a237e]">规则 R-001 已匹配瓦努阿图 2026 增值税规则。</div>
            </div>
            <FileCheck className="text-[#1a237e] group-hover:scale-110 transition-transform" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AutoSplitRulesPage;

