import React from 'react';
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  Car,
  Boxes,
  Wallet,
  Paintbrush,
  Database,
  Menu,
} from 'lucide-react';
import { ActiveTab } from '../types';
import { isSupabaseConfigured } from '../lib/supabase';

interface MobileNavProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  activeOrdersCount: number;
  lowStockCount: number;
  openSupabaseModal: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  activeTab,
  setActiveTab,
  activeOrdersCount,
  lowStockCount,
  openSupabaseModal,
}) => {
  const isSupabaseLive = isSupabaseConfigured();

  const navItems = [
    { id: 'dashboard' as ActiveTab, label: 'Головна', icon: LayoutDashboard },
    { id: 'orders' as ActiveTab, label: 'Замовлення', icon: ClipboardList, badge: activeOrdersCount },
    { id: 'clients' as ActiveTab, label: 'Клієнти', icon: Users },
    { id: 'vehicles' as ActiveTab, label: 'Авто', icon: Car },
    { id: 'inventory' as ActiveTab, label: 'Склад', icon: Boxes, badge: lowStockCount },
    { id: 'finances' as ActiveTab, label: 'Фінанси', icon: Wallet },
  ];

  return (
    <>
      {/* Mobile Top Bar */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 bg-[#0d131f] border-b border-slate-800/80 sticky top-0 z-30">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-slate-950 font-bold shadow-md shadow-amber-500/10">
            <Paintbrush className="w-4 h-4 text-slate-950" />
          </div>
          <div>
            <span className="font-extrabold text-sm text-white tracking-tight">AutoPaint CRM</span>
            <span className="block text-[10px] text-slate-400 font-medium">Облік автомаляра</span>
          </div>
        </div>

        <button
          onClick={openSupabaseModal}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-emerald-500/30 text-xs font-semibold text-slate-300"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11px] text-emerald-300 font-bold">Firestore</span>
        </button>
      </header>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0d131f]/95 backdrop-blur-md border-t border-slate-800/90 px-1 py-1 flex justify-around items-center">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`relative flex flex-col items-center justify-center min-w-[50px] py-1.5 px-2 rounded-xl transition-all ${
                isActive ? 'text-amber-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
                {item.badge && item.badge > 0 ? (
                  <span className="absolute -top-1 -right-2 px-1 min-w-[15px] h-[15px] bg-amber-500 text-slate-950 font-black text-[9px] rounded-full flex items-center justify-center">
                    {item.badge}
                  </span>
                ) : null}
              </div>
              <span className={`text-[10px] mt-1 font-semibold ${isActive ? 'text-amber-400' : 'text-slate-400'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </>
  );
};
