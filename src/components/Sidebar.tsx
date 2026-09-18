import React from 'react';
import {
  LayoutDashboard,
  Users,
  Car,
  ClipboardList,
  Boxes,
  Wallet,
  Paintbrush,
  Database,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';
import { ActiveTab } from '../types';
import { isSupabaseConfigured } from '../lib/supabase';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  activeOrdersCount: number;
  lowStockCount: number;
  openSupabaseModal: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  activeOrdersCount,
  lowStockCount,
  openSupabaseModal,
}) => {
  const isSupabaseLive = isSupabaseConfigured();

  const navItems = [
    {
      id: 'dashboard' as ActiveTab,
      label: 'Головна панель',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'orders' as ActiveTab,
      label: 'Замовлення',
      icon: ClipboardList,
      badge: activeOrdersCount > 0 ? activeOrdersCount : null,
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    },
    {
      id: 'clients' as ActiveTab,
      label: 'Клієнти',
      icon: Users,
      badge: null,
    },
    {
      id: 'vehicles' as ActiveTab,
      label: 'Автомобілі',
      icon: Car,
      badge: null,
    },
    {
      id: 'inventory' as ActiveTab,
      label: 'Склад матеріалів',
      icon: Boxes,
      badge: lowStockCount > 0 ? lowStockCount : null,
      badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
      badgeIcon: lowStockCount > 0 ? AlertTriangle : null,
    },
    {
      id: 'finances' as ActiveTab,
      label: 'Фінанси',
      icon: Wallet,
      badge: null,
    },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 bg-[#0d131f] border-r border-slate-800/80 shrink-0 select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/10 text-slate-950 font-black">
            <Paintbrush className="w-5 h-5 text-slate-950" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-base tracking-tight text-white">AutoPaint</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                CRM
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">Облік автомаляра</p>
          </div>
        </div>
      </div>

      {/* Navigation items */}
      <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                isActive
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                    isActive ? 'text-slate-950' : 'text-slate-400 group-hover:text-slate-200'
                  }`}
                />
                <span>{item.label}</span>
              </div>

              {item.badge !== null && (
                <span
                  className={`px-2 py-0.5 text-[11px] font-bold rounded-full border flex items-center gap-1 ${
                    isActive
                      ? 'bg-slate-950/20 text-slate-950 border-slate-950/30'
                      : item.badgeColor || 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                >
                  {item.badgeIcon && <item.badgeIcon className="w-3 h-3 inline" />}
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Cloud Firestore status footer */}
      <div className="p-3 border-t border-slate-800/80">
        <button
          onClick={openSupabaseModal}
          className="w-full p-3 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-emerald-500/40 transition-all text-left group"
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              <span>База даних</span>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Firestore
            </span>
          </div>
          <p className="text-[11px] text-slate-400 line-clamp-1 group-hover:text-emerald-300 transition-colors">
            Синхронізовано з Google Cloud
          </p>
        </button>
      </div>
    </aside>
  );
};
