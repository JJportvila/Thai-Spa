import React, { useMemo } from 'react';
import { ArrowRight, Menu, Package, ShoppingBag, Star, Truck, User } from 'lucide-react';
import { extendedVanuatuProducts, mockCustomers, mockSuppliers } from '../lib/mockDataFull';
import { formatVT } from '../lib/utils';

interface Props {
  onNavigate?: (view: string) => void;
}

export default function CustomerHomePage({ onNavigate }: Props) {
  const featured = useMemo(() => extendedVanuatuProducts.slice(0, 6), []);
  const hero = featured[0];
  const favorites = featured.slice(1, 4);
  const services = [
    { title: '零售购物', desc: '浏览商品、查看库存、快速下单。', view: 'retail-pos', icon: ShoppingBag },
    { title: '批发订单', desc: '批发报价、配送与到店自提。', view: 'wholesale-pos', icon: Truck },
    { title: '店铺信息', desc: '门店资料、客服和营业状态。', view: 'dashboard', icon: User },
  ];

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-slate-900">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-3 py-3 sm:px-4 sm:py-4 lg:px-6 lg:py-6">
        <header className="ui-card rounded-[28px] border border-slate-200 bg-white px-4 py-4 shadow-sm sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#eef4ff] text-[#1a237e]">
                <Menu size={20} />
              </button>
              <div>
                <div className="text-lg font-black leading-none text-[#1a237e] sm:text-xl">瓦努阿图 POS 系统</div>
                <div className="mt-1 text-[10px] font-black tracking-[0.24em] text-slate-500 uppercase">零售卓越 · 顾客主页</div>
              </div>
            </div>
            <div className="hidden max-w-xl flex-1 items-center rounded-full border border-slate-200 bg-[#f8f9fa] px-4 py-2 lg:flex">
              <input
                readOnly
                value="搜索商品 / Search products / Lukaotem samting..."
                className="w-full bg-transparent text-sm font-semibold text-slate-500 outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => onNavigate?.('retail-pos')} className="rounded-full border border-[#dbe7ff] bg-[#eef4ff] px-4 py-2 text-xs font-black text-[#1a237e]">
                进入商店
              </button>
              <button onClick={() => onNavigate?.('dashboard')} className="ui-btn ui-btn-secondary rounded-full px-4 py-2 text-xs font-black">
                后台登录
              </button>
            </div>
          </div>
        </header>

        <main className="mt-4 grid gap-4 lg:grid-cols-[1.15fr_0.85fr] lg:gap-5">
          <section className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:p-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#dbe7ff] bg-[#eef4ff] px-3 py-1 text-[10px] font-black tracking-[0.24em] text-[#1a237e]">
              <ShoppingBag size={12} /> The Curated Horizon
            </div>
            <div className="mt-4 space-y-3">
              <h1 className="text-4xl font-black tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">Escape to Serenity.</h1>
              <p className="max-w-2xl text-sm font-semibold leading-7 text-slate-500 sm:text-base">
                用顾客视角打开门店主页：先看今日精选、热门商品和店铺服务，再决定购物或查看批发入口。
              </p>
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              <button onClick={() => onNavigate?.('retail-pos')} className="ui-btn rounded-xl bg-[#1a237e] px-4 py-3 text-sm font-black text-white">
                立即购物
              </button>
              <button onClick={() => onNavigate?.('wholesale-pos')} className="ui-btn ui-btn-secondary rounded-xl px-4 py-3 text-sm font-black">
                批发入口
              </button>
              <button onClick={() => onNavigate?.('inventory-mgmt')} className="ui-btn ui-btn-secondary rounded-xl px-4 py-3 text-sm font-black">
                查看门店
              </button>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-[#f8f9fa] p-4">
                <div className="text-[10px] font-black tracking-[0.22em] text-slate-400 uppercase">可购商品</div>
                <div className="mt-2 text-2xl font-black text-slate-900">{extendedVanuatuProducts.length}</div>
                <div className="mt-1 text-xs font-semibold text-slate-500">门店商品目录</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-[#f8f9fa] p-4">
                <div className="text-[10px] font-black tracking-[0.22em] text-slate-400 uppercase">热销精选</div>
                <div className="mt-2 text-2xl font-black text-slate-900">{featured.length}</div>
                <div className="mt-1 text-xs font-semibold text-slate-500">首页推荐商品</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-[#f8f9fa] p-4">
                <div className="text-[10px] font-black tracking-[0.22em] text-slate-400 uppercase">合作供应商</div>
                <div className="mt-2 text-2xl font-black text-slate-900">{mockSuppliers.length}</div>
                <div className="mt-1 text-xs font-semibold text-slate-500">门店供货网络</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-[#f8f9fa] p-4">
                <div className="text-[10px] font-black tracking-[0.22em] text-slate-400 uppercase">会员客户</div>
                <div className="mt-2 text-2xl font-black text-slate-900">{mockCustomers.length}</div>
                <div className="mt-1 text-xs font-semibold text-slate-500">顾客档案</div>
              </div>
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm">
              <div className="relative aspect-[1.4/1] overflow-hidden bg-[#f8f9fa]">
                <img src={hero?.imageUrl} alt={hero?.title} className="h-full w-full object-cover" />
                <div className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-[10px] font-black text-[#1a237e] shadow-sm">
                  今日推荐
                </div>
                <div className="absolute right-4 top-4 rounded-full bg-[#1a237e] px-3 py-1 text-[10px] font-black text-white shadow-sm">
                  {hero ? formatVT(hero.stock * 10) : 'VT'}
                </div>
              </div>
              <div className="space-y-3 p-5">
                <div>
                  <h2 className="text-2xl font-black text-slate-900">{hero?.title || '今日精选'}</h2>
                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                    {hero ? `货架位 ${hero.shelfId} · 库存 ${hero.stock} · 分类 ${hero.category || '商品'}` : '精选商品会自动根据门店数据更新。'}
                  </p>
                </div>
                {hero && (
                  <div className="flex items-center justify-between rounded-[22px] border border-slate-200 bg-[#f8f9fa] px-4 py-3">
                    <div>
                      <div className="text-[10px] font-black tracking-[0.22em] text-slate-400 uppercase">条码</div>
                      <div className="mt-1 text-sm font-black text-slate-900">{hero.barcode}</div>
                    </div>
                    <button onClick={() => onNavigate?.('retail-pos')} className="rounded-full border border-[#dbe7ff] bg-[#eef4ff] px-4 py-2 text-xs font-black text-[#1a237e]">
                      去购买
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-[32px] border border-slate-200 bg-[#f8f9fa] p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] font-black tracking-[0.24em] text-slate-400 uppercase">店铺服务</div>
                  <h3 className="mt-1 text-xl font-black text-slate-900">像顾客一样浏览</h3>
                </div>
                <div className="rounded-full border border-[#dbe7ff] bg-white px-3 py-1 text-[10px] font-black text-[#1a237e]">首页入口</div>
              </div>
              <div className="mt-4 space-y-2">
                {services.map((service) => (
                  <button
                    key={service.view}
                    type="button"
                    onClick={() => onNavigate?.(service.view)}
                    className="flex w-full items-center justify-between gap-3 rounded-[22px] border border-slate-200 bg-white p-4 text-left transition-all hover:border-[#1a237e]/30"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#eef4ff] text-[#1a237e]">
                        <service.icon size={18} />
                      </div>
                      <div>
                        <div className="text-sm font-black text-slate-900">{service.title}</div>
                        <div className="mt-1 text-xs font-semibold text-slate-500">{service.desc}</div>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-slate-300" />
                  </button>
                ))}
              </div>
            </div>
          </section>
        </main>

        <section className="mt-4 rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[10px] font-black tracking-[0.24em] text-slate-400 uppercase">Signature Rituals</div>
              <h3 className="mt-1 text-xl font-black text-slate-900">今日热门推荐</h3>
            </div>
            <button onClick={() => onNavigate?.('retail-pos')} className="inline-flex items-center gap-1 rounded-full border border-[#dbe7ff] bg-[#eef4ff] px-3 py-1.5 text-[10px] font-black text-[#1a237e]">
              查看全部 <ArrowRight size={12} />
            </button>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {favorites.map((product) => (
              <div key={product.id} className="overflow-hidden rounded-[24px] border border-slate-200 bg-[#f8f9fa] shadow-sm">
                <div className="relative aspect-[1.45/1] overflow-hidden bg-white">
                  <img src={product.imageUrl} alt={product.title} className="h-full w-full object-cover" />
                  <div className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-[10px] font-black text-[#1a237e] shadow-sm">
                    {product.category || '商品'}
                  </div>
                </div>
                <div className="space-y-2 p-4">
                  <div className="text-lg font-black text-slate-900 leading-tight">{product.title}</div>
                  <div className="text-xs font-semibold text-slate-500">条码 {product.barcode}</div>
                  <div className="flex items-center justify-between">
                    <div className="rounded-full border border-[#dbe7ff] bg-[#eef4ff] px-3 py-1 text-[10px] font-black text-[#1a237e]">
                      库存 {product.stock}
                    </div>
                    <button onClick={() => onNavigate?.('retail-pos')} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-black text-slate-700">
                      去购买
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};
