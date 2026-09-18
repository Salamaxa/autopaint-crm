import React from 'react';
import {
  Database,
  RefreshCw,
  Plus,
  SlidersHorizontal,
  Bell,
  Sparkles,
} from 'lucide-react';
import { ActiveTab } from '../types';
import { isSupabaseConfigured } from '../lib/supabase';

interface HeaderProps {
  activeTab: ActiveTab;
  onOpenNewOrder: () => void;
  onOpenNewClient: () => void;
  onOpenNewVehicle: () => void;
  onOpenNewInventory: () => void;
  onOpenNewTransaction: () => void;
  openSupabaseModal: () => void;
  activeOrdersCount: number;
  lowStockCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onOpenNewOrder,
  onOpenNewClient,
  onOpenNewVehicle,
  onOpenNewInventory,
  onOpenNewTransaction,
  openSupabaseModal,
  activeOrdersCount,
  lowStockCount,
}) => {
  const isSupabaseLive = isSupabaseConfigured();

  const getTabTitle = () => {
    switch (activeTab) {
      case 'dashboard':
        return 'Головна панель';
      case 'orders':
        return 'Замовлення та наряди';
      case 'clients':
        return 'Клієнти';
      case 'vehicles':
        return 'Автомобілі';
      case 'inventory':
        return 'Склад матеріалів';
      case 'finances':
        return 'Фінанси та борги';
      default:
        return 'AutoPaint CRM';
    }
  };

  const handleQuickAdd = () => {
    switch (activeTab) {
      case 'clients':
        onOpenNewClient();
        break;
      case 'vehicles':
        onOpenNewVehicle();
        break;
      case 'inventory':
        onOpenNewInventory();
        break;
      case 'finances':
        onOpenNewTransaction();
        break;
      case 'dashboard':
      case 'orders':
      default:
        onOpenNewOrder();
        break;
    }
  };

  return (
    <header className="hidden md:flex items-center justify-between px-6 py-4 bg-[#0d131f]/90 backdrop-blur border-b border-slate-800/80 sticky top-0 z-20">
      {/* Tab Title */}
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-extrabold text-white tracking-tight">{getTabTitle()}</h2>
        {activeTab === 'orders' && activeOrdersCount > 0 && (
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
            {activeOrdersCount} в роботі
          </span>
        )}
        {activeTab === 'inventory' && lowStockCount > 0 && (
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
            {lowStockCount} дефіцит
          </span>
        )}
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-3">
        {/* Cloud Firestore status badge button */}
        <button
          onClick={openSupabaseModal}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-emerald-500/50 text-xs text-slate-300 transition-all group"
          title="Хмарна база даних Firebase Firestore"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-emerald-400" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="font-medium text-slate-200">
            База даних
          </span>
          <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
            Firestore
          </span>
        </button>

        {/* Dynamic Contextual Create Button */}
        <button
          onClick={handleQuickAdd}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all shadow-md shadow-amber-500/20 active:scale-95"
        >
          <Plus className="w-3.5 h-3.5 text-slate-950" />
          <span>Створити</span>
        </button>
      </div>
    </header>
  );
};
